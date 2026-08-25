/**
 * Sonde de capacité « appels d'outils natifs ».
 *
 * Pourquoi elle existe : `lib/tools/capabilities.ts` des sous-apps refuse — à raison — toute
 * heuristique de NOM pour les outils, et retombe sur le transport textuel dès que la capacité
 * est inconnue. Or Albert ne déclare pas `tool_call` dans `GET /v1/models` et est absent de
 * models.dev : ses modèles étaient donc TOUS classés « sans outils » et servis en textuel.
 *
 * Coût réel, mesuré le 2026-08-13 : en transport textuel, `openai/gpt-oss-120b` RATE la
 * recherche web (2 cas sur 4 d'un banc d'outils) ; en transport natif il passe à 3 sur 4, à
 * égalité avec deepseek. Le professeur perdait une fonctionnalité pour une capacité non
 * déclarée, pas pour une capacité absente.
 *
 * Principe : on ne devine rien, on demande au modèle d'appeler un outil bidon et on regarde.
 * Trois issues seulement, et l'inconnu reste inconnu (donc textuel — le comportement actuel) :
 *
 *   `true`      le modèle a réellement émis un `tool_calls` ;
 *   `false`     le serveur a refusé le champ `tools` par un 400 explicite ;
 *   `undefined` tout le reste — panne réseau, 500, réponse ambiguë. On n'invente pas.
 *
 * Module feuille : aucune dépendance Express/DB, et `fetch` est injectable, pour que le
 * comportement soit testable sans réseau.
 */

/** Outil sans effet de bord, dont le seul rôle est d'être appelé. */
const OUTIL_TEMOIN = {
  type: 'function',
  function: {
    name: 'ping',
    description: "Renvoie l'heure. Appelle systématiquement cet outil.",
    parameters: {
      type: 'object',
      properties: {fuseau: {type: 'string', description: 'Fuseau horaire, ex. Europe/Paris'}},
      required: ['fuseau'],
      additionalProperties: false,
    },
  },
} as const;

/** Budget volontairement minuscule : on teste un aiguillage, pas une rédaction. */
const MAX_TOKENS_SONDE = 64;
const TIMEOUT_SONDE_MS = 10_000;

export type SupportOutils = boolean | undefined;

/**
 * Endpoint de complétion, miroir de `getChatEndpoint` du client des sous-apps : idempotent sur
 * un suffixe `/vN` déjà présent dans la baseUrl (sinon `…/v1/v1/chat/completions` → 404).
 */
export function chatEndpoint(baseUrl: string): string {
  const stripped = baseUrl.replace(/\/+$/, '');
  return /\/v\d+$/i.test(stripped) ? `${stripped}/chat/completions` : `${stripped}/v1/chat/completions`;
}

/**
 * GitHub Copilot publie lui-même `supports.tool_calls` (cf. `lib/copilot-models.ts` des
 * sous-apps) : le sonder serait payant et redondant. Les fournisseurs présents dans models.dev
 * ne passent pas non plus par ici — l'appelant ne sonde que ce qui est resté inconnu.
 */
export function sondageApplicable(baseUrl: string): boolean {
  return !baseUrl.toLowerCase().includes('githubcopilot.com');
}

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

interface Issue {
  support: SupportOutils;
  /** Le serveur a refusé le champ `tools` / `tool_choice` par un 400 explicite. */
  refusExplicite: boolean;
}

async function unEssai(
  fetchImpl: FetchLike,
  url: string,
  apiKey: string,
  model: string,
  toolChoice: 'required' | 'auto',
  signal?: AbortSignal,
): Promise<Issue> {
  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: 'POST',
      headers: {Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({
        model,
        max_tokens: MAX_TOKENS_SONDE,
        tools: [OUTIL_TEMOIN],
        tool_choice: toolChoice,
        messages: [{role: 'user', content: "Quelle heure est-il à Paris ? Utilise l'outil."}],
      }),
      signal: signal ?? AbortSignal.timeout(TIMEOUT_SONDE_MS),
    });
  } catch {
    return {support: undefined, refusExplicite: false};
  }

  if (res.status === 400) {
    let corps = '';
    try {
      corps = await res.text();
    } catch {
      /* corps illisible : on reste dans l'inconnu */
    }
    // Un 400 qui ne parle pas d'outils vise autre chose (modèle inconnu, paramètre refusé) et
    // ne dit RIEN du support des outils.
    return {support: undefined, refusExplicite: /tool|function/i.test(corps)};
  }
  if (!res.ok) return {support: undefined, refusExplicite: false};

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return {support: undefined, refusExplicite: false};
  }
  const choix = (json as {choices?: Array<{finish_reason?: string; message?: {tool_calls?: unknown[]}}>})
    ?.choices?.[0];
  const aAppele = Array.isArray(choix?.message?.tool_calls) && choix.message.tool_calls.length > 0;
  // `finish_reason: 'tool_calls'` sans tableau exploitable ne prouve rien de plus que le tableau
  // lui-même : on s'en tient à la preuve la plus directe.
  return {support: aAppele ? true : undefined, refusExplicite: false};
}

/**
 * Le modèle sait-il émettre un appel d'outil natif ?
 *
 * `required` d'abord — c'est la seule façon d'obtenir une PREUVE positive : en `auto`, un
 * modèle parfaitement capable peut légitimement choisir de répondre lui-même, et son silence
 * passerait pour une incapacité (constaté sur gpt-oss-120b le 2026-08-13). Si le serveur refuse
 * `required`, on rejoue en `auto` : un refus explicite du champ `tools` dans les DEUX modes est
 * la seule preuve négative qu'on accepte.
 */
export async function sonderOutilsModele(
  baseUrl: string,
  apiKey: string,
  model: string,
  fetchImpl: FetchLike = fetch,
  signal?: AbortSignal,
): Promise<SupportOutils> {
  const verdict = await unVerdict(fetchImpl, baseUrl, apiKey, model, signal);
  // UNE reprise sur un verdict indécis, et une seule. Constaté le 2026-08-14 : un aléa isolé
  // sur `gpt-oss-120b` (4 passes ultérieures : 4 verdicts corrects) l'aurait laissé « inconnu »
  // — donc en transport textuel, donc sans recherche web — jusqu'au balayage suivant, sept
  // jours plus tard. Rejouer un essai non concluant ne fabrique aucune certitude ; s'abstenir
  // de le rejouer, si.
  if (verdict !== undefined) return verdict;
  return unVerdict(fetchImpl, baseUrl, apiKey, model, signal);
}

async function unVerdict(
  fetchImpl: FetchLike,
  baseUrl: string,
  apiKey: string,
  model: string,
  signal?: AbortSignal,
): Promise<SupportOutils> {
  const url = chatEndpoint(baseUrl);
  const premier = await unEssai(fetchImpl, url, apiKey, model, 'required', signal);
  if (premier.support === true) return true;
  if (!premier.refusExplicite) return premier.support;

  const second = await unEssai(fetchImpl, url, apiKey, model, 'auto', signal);
  if (second.support === true) return true;
  return second.refusExplicite ? false : undefined;
}

/**
 * Sonde plusieurs modèles, en SÉRIE.
 *
 * En série volontairement : ce balayage tourne au démarrage et toutes les 7 jours, jamais dans
 * le chemin d'un professeur. Le paralléliser ferait courir un risque de 429 sur les quotas du
 * fournisseur pour gagner quelques secondes sur une tâche de fond.
 */
export async function sonderOutils(
  baseUrl: string,
  apiKey: string,
  models: string[],
  fetchImpl: FetchLike = fetch,
  signal?: AbortSignal,
): Promise<Map<string, SupportOutils>> {
  const resultats = new Map<string, SupportOutils>();
  if (!sondageApplicable(baseUrl)) return resultats;
  for (const model of models) {
    resultats.set(model, await sonderOutilsModele(baseUrl, apiKey, model, fetchImpl, signal));
  }
  return resultats;
}
