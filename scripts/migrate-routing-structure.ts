import 'dotenv/config';

import {PROVIDER_PRESETS, type ModelRouting, type ModelTaskPolicy} from '../lib/model-routing.ts';
import {getDb, type UserRow} from '../server/db.ts';
import {decryptValueJson, encryptIfSensitive} from '../server/secrets-at-rest.ts';

/**
 * Sépare la route `profile` en `profile` (textes rédactionnels) + `structure` (JSON court).
 *
 * Pourquoi : jusqu'au 2026-07-30, UNE seule route portait quatre consommateurs aux
 * contraintes opposées — la normalisation CSV de `roster.ts` (JSON court, tâche « code ») ET
 * les appréciations de bulletin, les synthèses de classe et le profil du chat élève (textes
 * lus par des collègues et des familles). Impossible de router correctement les deux à la
 * fois : c'est ce qui a mis les appréciations sur `deepseek-v4-flash`, alors que DINUM écrit
 * « nous ne recommandons pas d'utiliser ce modèle pour d'autres usages que le code ».
 *
 * Ce que fait ce script, dans cet ordre et dans une seule transaction :
 *
 *   1. `structure` ← copie EXACTE de la `profile` en place. Invariant central : `roster.ts`
 *      bascule sur `structure`, donc la normalisation CSV doit continuer à parler au modèle
 *      qui l'a validée (30/30 alignées positionnellement, mesuré 2026-07-28). Sur TOUT
 *      fournisseur — Mistral, Copilot, custom — cette étape seule suffit : comportement
 *      identique à la minute d'avant, la scission est neutre.
 *
 *   2. `profile` → primaire du préréglage, UNIQUEMENT sur Albert et UNIQUEMENT si le primaire
 *      en place est encore `deepseek-v4-flash`. C'est la seule écriture qui change un
 *      comportement, elle est donc la plus étroite possible : un admin qui a choisi autre
 *      chose n'est jamais écrasé (motif journalisé), et les autres fournisseurs ne sont pas
 *      concernés (leur `profile` n'a jamais pointé sur deepseek).
 *
 * Idempotent : une fois `structure` présente, le script ne touche plus rien. Simulation par
 * défaut, backup de la DB avant toute écriture.
 *
 * Usage (depuis la racine de API_manage) :
 *   npx tsx scripts/migrate-routing-structure.ts            # simulation, n'écrit RIEN
 *   npx tsx scripts/migrate-routing-structure.ts --apply    # applique
 */

const ALBERT_HOST = 'albert.api.etalab.gouv.fr';

/**
 * Formes sous lesquelles `deepseek-v4-flash` peut être stocké. DINUM sert l'id canonique et
 * l'ancien nom préfixé comme alias fonctionnel ; `openweight-code-2` est l'alias de RÔLE.
 * Les trois désignent le même modèle, donc les trois doivent déclencher l'étape 2.
 */
const DEEPSEEK_FORMES = new Set([
  'deepseek-v4-flash',
  'deepseek-ai/deepseek-v4-flash',
  'openweight-code-2',
]);

const estDeepseek = (m: string): boolean => DEEPSEEK_FORMES.has(m.trim().toLowerCase());

function lire(app: string, key: string): unknown {
  const row = getDb()
    .prepare<[string, string], {value_json: string}>(
      'SELECT value_json FROM global_settings WHERE app = ? AND key = ?',
    )
    .get(app, key);
  if (!row) return undefined;
  try {
    return JSON.parse(decryptValueJson(row.value_json));
  } catch {
    return undefined;
  }
}

function ecrire(app: string, key: string, value: unknown, userId: string): void {
  getDb()
    .prepare(
      `INSERT INTO global_settings (app, key, value_json, updated_at, updated_by)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(app, key) DO UPDATE SET
         value_json = excluded.value_json,
         updated_at = excluded.updated_at,
         updated_by = excluded.updated_by`,
    )
    .run(app, key, encryptIfSensitive(key, JSON.stringify(value)), Date.now(), userId);
}

/**
 * `primaire [repli: a, b]` — et surtout PAS de flèches à l'intérieur : le journal enchaîne
 * « ancien → nouveau », et une flèche servant aussi de séparateur de replis rend la ligne
 * illisible (`a → b → c → d` : où est la bascule ?).
 */
const montre = (p: ModelTaskPolicy): string =>
  p.fallbacks.length === 0 ? `${p.primary} [sans repli]` : `${p.primary} [repli: ${p.fallbacks.join(', ')}]`;

async function main(): Promise<void> {
  const applique = process.argv.includes('--apply');
  const db = getDb();

  const admin = db
    .prepare<[], UserRow>(
      "SELECT * FROM users WHERE role = 'admin' AND active = 1 ORDER BY created_at ASC LIMIT 1",
    )
    .get();
  if (!admin) throw new Error('Aucun admin actif — exécuter `npm run seed:admin` avant.');

  const apps = db
    .prepare<[], {app: string}>(
      "SELECT DISTINCT app FROM global_settings WHERE key = 'corrector_model_routing' ORDER BY app",
    )
    .all()
    .map((r) => r.app);

  if (apps.length === 0) {
    console.log('[migrate-routing-structure] aucun routage stocké — rien à faire.');
    return;
  }

  console.log(
    applique
      ? '[migrate-routing-structure] MODE ÉCRITURE'
      : '[migrate-routing-structure] simulation (--apply pour écrire)',
  );
  console.log(`[migrate-routing-structure] ${apps.length} app(s) avec un routage stocké.`);
  console.log('---');

  const presetProfile = PROVIDER_PRESETS.albert!.routing!.profile;
  const aEcrire: Array<{app: string; routage: ModelRouting}> = [];
  let changements = 0;

  for (const app of apps) {
    const routage = lire(app, 'corrector_model_routing') as Partial<ModelRouting> | undefined;
    if (!routage) continue;

    if (routage.structure) {
      console.log(`${app} · déjà scindée (structure = ${montre(routage.structure)}) — ignorée.`);
      continue;
    }

    const profile = routage.profile;
    if (!profile?.primary) {
      // Routage antérieur incomplet : `normalizeRouting()` remplira les deux clés depuis le
      // modèle chat au prochain chargement. Rien à préserver, donc rien à écrire ici.
      console.log(`${app} · pas de route profile exploitable — laissée à normalizeRouting().`);
      continue;
    }

    const suivant: Partial<ModelRouting> = {...routage};

    // Étape 1 — préserver le CSV à l'identique.
    suivant.structure = {primary: profile.primary, fallbacks: [...profile.fallbacks]};
    console.log(`${app} · structure ← ${montre(profile)} (reprise de profile, CSV inchangé)`);
    changements += 1;

    // Étape 2 — sortir les textes rédactionnels de deepseek, sur Albert seulement.
    const surAlbert = String(lire(app, 'corrector_base_url') ?? '').includes(ALBERT_HOST);
    if (!surAlbert) {
      console.log(`${app} · profile inchangé (fournisseur non-Albert) — scission neutre.`);
    } else if (!estDeepseek(profile.primary)) {
      console.log(
        `${app} · profile inchangé : primaire « ${profile.primary} » ≠ deepseek, ` +
          "c'est un choix admin qu'une migration n'écrase pas.",
      );
    } else {
      suivant.profile = {primary: presetProfile.primary, fallbacks: [...presetProfile.fallbacks]};
      console.log(`${app} · profile : ${montre(profile)} → ${montre(suivant.profile)}`);
      changements += 1;
    }

    aEcrire.push({app, routage: suivant as ModelRouting});
  }

  console.log('---');

  if (changements === 0) {
    console.log('[migrate-routing-structure] déjà à jour, aucun changement.');
    return;
  }

  if (!applique) {
    console.log(`[migrate-routing-structure] ${changements} changement(s) à appliquer (--apply).`);
    return;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `data/api-manage.db.bak-${stamp}`;
  await db.backup(backupPath);
  console.log(`[migrate-routing-structure] backup : ${backupPath}`);

  db.transaction(() => {
    for (const {app, routage} of aEcrire) ecrire(app, 'corrector_model_routing', routage, admin.id);
  })();

  console.log(`[migrate-routing-structure] ${changements} changement(s) appliqué(s) sur ${aEcrire.length} app(s).`);
  console.log('[migrate-routing-structure] penser à redémarrer les services : systemctl --user restart corrector-*');
}

void main().catch((e: unknown) => {
  console.error('[migrate-routing-structure]', e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
