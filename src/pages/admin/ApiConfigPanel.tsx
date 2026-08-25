import {useEffect, useRef, useState, type ReactNode} from 'react';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  Github,
  Loader2,
  PlugZap,
  Plus,
  Trash2,
  UserCog,
  XCircle,
} from 'lucide-react';

import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {
  DEFAULT_TASK_MODEL,
  EMPTY_TASK_OVERRIDES,
  MODEL_TASKS,
  PROVIDER_PRESETS,
  buildEffectiveRouting,
  buildFlatRouting,
  detectTaskOverrides,
  hostFragment,
  inferPresetKey,
  normalizeRouting,
  policy,
  type ModelRouting,
  type ModelTaskKey,
  type ModelTaskPolicy,
} from '@/lib/model-routing';
import type {ModelInfo, ProviderCatalog} from '@/lib/model-catalog';

interface TestResult {
  ok: boolean;
  status?: number;
  latency?: number;
  modelCount?: number | null;
  /**
   * Liste des IDs de modèles renvoyés par GET /v1/models côté fournisseur.
   * Utilisée pour peupler les <datalist> des champs OCR/chat (saisie assistée).
   * Vide si le test a échoué ou si l'endpoint ne renvoie pas de liste.
   */
  models?: string[];
  detail?: string;
}

/** Catalogue live du fournisseur, tel que renvoyé par la console (`GET|POST …/models`). */
type CatalogResponse = ProviderCatalog & {applied?: Array<{task: string; from: string; to: string}>};

/**
 * Portée de la configuration éditée.
 * - `users` : le preset fourni aux professeurs invités de cette matière (comportement historique).
 * - `admin` : la configuration personnelle de l'admin connecté, sur cette seule matière.
 */
type Portee = 'users' | 'admin';

/** Suffixe d'URL de portée — vide côté utilisateurs, pour ne rien changer aux appels existants. */
function q(scope: Portee): string {
  return scope === 'admin' ? '?scope=admin' : '';
}

/**
 * Catalogue des modèles réellement servis par le fournisseur de l'app.
 * `force` déclenche une nouvelle sonde ; sinon le serveur répond depuis la base et ne
 * re-sonde que si le TTL est dépassé.
 */
async function fetchCatalog(app: string, force: boolean, scope: Portee): Promise<CatalogResponse> {
  const url = `/api/v1/admin/global-settings/${app}/models${force ? '/refresh' : ''}${q(scope)}`;
  const r = await fetch(url, {method: force ? 'POST' : 'GET', credentials: 'include'});
  if (!r.ok) {
    const body = (await r.json().catch(() => ({}))) as {error?: string; detail?: string};
    throw new Error(body.detail ?? body.error ?? `HTTP ${r.status}`);
  }
  return (await r.json()) as CatalogResponse;
}

/** État de la configuration perso de l'admin sur une matière. */
interface EtatPerso {
  /** Elle est ACTIVE : c'est elle que sert le correcteur à cet admin. */
  actif: boolean;
  /** Des clés y ont déjà été saisies — donc « réactiver la mienne », pas « en créer une ». */
  existe: boolean;
}

async function fetchPerso(app: string): Promise<EtatPerso> {
  const r = await fetch(`/api/v1/admin/global-settings/${app}/config-perso`, {
    credentials: 'include',
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const body = (await r.json()) as {actif?: boolean; existe?: boolean};
  return {actif: body.actif === true, existe: body.existe === true};
}

async function setPersoActif(app: string, actif: boolean): Promise<void> {
  const r = await fetch(`/api/v1/admin/global-settings/${app}/config-perso`, {
    method: 'PUT',
    credentials: 'include',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({actif}),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
}

async function deletePerso(app: string): Promise<void> {
  const r = await fetch(`/api/v1/admin/global-settings/${app}/config-perso`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
}

/** « il y a 4 min », « il y a 3 h »… pour dater le dernier rafraîchissement du catalogue. */
function formatAge(ms: number): string {
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.floor(h / 24)} j`;
}

/** Étiquette d'une option : l'id, puis ses capacités quand le catalogue les connaît. */
function modelOptionLabel(id: string, info: ModelInfo | undefined): string {
  if (!info) return id;
  const tags: string[] = [];
  if (info.vision) tags.push('vision');
  if (info.reasoning) tags.push('raisonnement');
  if (info.contextLimit) tags.push(`${Math.round(info.contextLimit / 1000)}k ctx`);
  if (info.cost) tags.push(`$${info.cost.input}/$${info.cost.output}`);
  return tags.length > 0 ? `${id} — ${tags.join(' · ')}` : id;
}

async function testKey(app: string, baseUrl: string, apiKey: string): Promise<TestResult> {
  const r = await fetch(`/api/v1/admin/global-settings/${app}/test`, {
    method: 'POST',
    credentials: 'include',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({baseUrl, apiKey}),
  });
  if (!r.ok) {
    const body = (await r.json().catch(() => ({}))) as {error?: string; hint?: string};
    throw new Error(body.hint ?? body.error ?? `HTTP ${r.status}`);
  }
  return (await r.json()) as TestResult;
}

/** Apps gérables par l'admin. */
const APPS = [
  {slug: 'pc' as const, title: 'Physique-Chimie'},
  {slug: 'fr' as const, title: 'Français'},
  {slug: 'nl' as const, title: 'Néerlandais'},
  {slug: 'es' as const, title: 'Espagnol'},
  {slug: 'svt' as const, title: 'SVT'},
  {slug: 'maths' as const, title: 'Mathématiques'},
  {slug: 'ses' as const, title: 'Sciences Économiques et Sociales'},
  {slug: 'tech' as const, title: 'Technologie'},
  {slug: 'en' as const, title: 'Anglais'},
  {slug: 'philo' as const, title: 'Philosophie'},
  {slug: 'hg' as const, title: 'Histoire-Géographie'},
];

type ReasoningEffort = 'none' | 'low' | 'medium' | 'high';

/** Subset des clés `global_settings` exposées dans le formulaire v1. */
interface AppConfig {
  corrector_base_url?: string;
  corrector_api_key?: string;
  corrector_ocr_model?: string;
  corrector_chat_model?: string;
  corrector_stt_model?: string;
  corrector_reasoning_effort?: ReasoningEffort;
  /**
   * Routage par tâche (3 voies sur Albert : OCR vision Mistral-Small / correction gpt-oss /
   * CSV deepseek-v4-flash — Qwen3-Coder est déprécié par DINUM).
   * Les sous-apps lisent ce routing EN PRIORITÉ sur les champs OCR/chat. On le garde donc
   * TOUJOURS synchronisé avec les deux champs (voir setOcrModel/setChatModel) pour qu'aucun
   * modèle ne soit « gelé » : modifier le champ chat met à jour bareme/correction/studentChat
   * (et profil, sauf si un vrai split 3-voies comme celui d'Albert est en place).
   */
  corrector_model_routing?: ModelRouting;
}

async function loadConfig(app: string, scope: Portee): Promise<AppConfig> {
  const r = await fetch(`/api/v1/admin/global-settings/${app}${q(scope)}`, {credentials: 'include'});
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const body = (await r.json()) as {settings: Record<string, unknown>};
  const s = body.settings;
  const re = s.corrector_reasoning_effort;
  return {
    corrector_base_url: typeof s.corrector_base_url === 'string' ? s.corrector_base_url : undefined,
    corrector_api_key: typeof s.corrector_api_key === 'string' ? s.corrector_api_key : undefined,
    corrector_ocr_model: typeof s.corrector_ocr_model === 'string' ? s.corrector_ocr_model : undefined,
    corrector_chat_model: typeof s.corrector_chat_model === 'string' ? s.corrector_chat_model : undefined,
    corrector_stt_model: typeof s.corrector_stt_model === 'string' ? s.corrector_stt_model : undefined,
    corrector_reasoning_effort:
      re === 'none' || re === 'low' || re === 'medium' || re === 'high' ? re : undefined,
    corrector_model_routing:
      s.corrector_model_routing && typeof s.corrector_model_routing === 'object'
        ? (s.corrector_model_routing as ModelRouting)
        : undefined,
  };
}

async function saveOne(app: string, key: string, value: unknown, scope: Portee): Promise<void> {
  const r = await fetch(`/api/v1/admin/global-settings/${app}/${encodeURIComponent(key)}${q(scope)}`, {
    method: 'PUT',
    credentials: 'include',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({value}),
  });
  if (!r.ok) throw new Error(`PUT ${key} -> HTTP ${r.status}`);
}

export function ApiConfigPanel() {
  const [activeApp, setActiveApp] = useState<'pc' | 'fr' | 'nl' | 'es' | 'svt' | 'maths' | 'ses' | 'tech' | 'en' | 'philo' | 'hg'>('pc');
  /** Portée éditée. `users` au chargement : c'est la config qui engage tout le monde. */
  const [scope, setScope] = useState<Portee>('users');
  /** État de ma config perso sur la matière courante — lu dans les DEUX portées : côté
   *  utilisateurs il alimente le bandeau « ta config perso est active ici ». */
  const [perso, setPerso] = useState<EtatPerso | null>(null);
  const [persoBusy, setPersoBusy] = useState(false);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  // Mode « saisie manuelle d'un ID » pour chaque champ modèle (sinon = choix dans la liste).
  const [ocrCustom, setOcrCustom] = useState(false);
  const [chatCustom, setChatCustom] = useState(false);
  const [sttCustom, setSttCustom] = useState(false);
  /**
   * Quelles tâches portent une surcharge (modèle propre et/ou replis) plutôt que d'hériter
   * du champ OCR/chat. Déduit du routage chargé, puis piloté par l'éditeur par tâche.
   */
  const [taskOverrides, setTaskOverrides] = useState<Record<ModelTaskKey, boolean>>({
    ...EMPTY_TASK_OVERRIDES,
  });
  const [routingOpen, setRoutingOpen] = useState(false);
  /** Champ « Autre (saisir un ID) » actif pour un champ de l'éditeur par tâche. */
  const [customTaskFields, setCustomTaskFields] = useState<Record<string, boolean>>({});
  /**
   * Cache des IDs de modèles obtenus via le dernier "Tester la clé" réussi.
   * Reset quand on change d'app (sinon on propose les modèles Mistral pour PC…).
   */
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  /**
   * Catalogue live du fournisseur (modèles réellement servis + capacités), chargé à
   * l'ouverture de l'onglet. C'est ce qui permet de CHOISIR un modèle sans avoir à tester
   * la clé d'abord, et de voir arriver ceux qu'un fournisseur ajoute entre deux versions.
   */
  const [catalog, setCatalog] = useState<ProviderCatalog | null>(null);
  const [catalogBusy, setCatalogBusy] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogApplied, setCatalogApplied] = useState<Array<{task: string; from: string; to: string}>>([]);
  // Device-flow GitHub Copilot (mint d'un token gho_ valide depuis la console admin).
  const [copilotStatus, setCopilotStatus] = useState<'idle' | 'starting' | 'waiting' | 'success' | 'error'>('idle');
  const [copilotCode, setCopilotCode] = useState('');
  const [copilotUri, setCopilotUri] = useState('');
  const [copilotUser, setCopilotUser] = useState<{login?: string; name?: string | null} | null>(null);
  const [copilotError, setCopilotError] = useState<string | null>(null);
  // Annule une boucle de polling en cours (changement d'app / démontage).
  const copilotAbort = useRef(false);

  useEffect(() => {
    copilotAbort.current = true; // coupe un device-flow resté en cours sur l'app précédente.
    setLoading(true);
    setError(null);
    setSavedAt(null);
    setTestResult(null);
    setAvailableModels([]);
    setCatalog(null);
    setCatalogError(null);
    setCatalogApplied([]);
    setOcrCustom(false);
    setChatCustom(false);
    setSttCustom(false);
    setTaskOverrides({...EMPTY_TASK_OVERRIDES});
    setCustomTaskFields({});
    setRoutingOpen(false);
    setCopilotStatus('idle');
    setCopilotCode('');
    setCopilotUri('');
    setCopilotUser(null);
    setCopilotError(null);
    setPerso(null);
    // L'état de la config perso conditionne l'affichage du formulaire en portée admin : on
    // l'attend, sinon on afficherait une fraction de seconde la carte « créer » sur une config
    // qui existe déjà.
    fetchPerso(activeApp)
      .then((p) => {
        setPerso(p);
        // Portée admin sans config perso active : rien à charger, la carte d'activation prend
        // la place du formulaire. Charger la config des utilisateurs ici donnerait l'illusion
        // d'éditer la sienne alors qu'on écrirait dans la leur.
        if (scope === 'admin' && !p.actif) {
          setConfig(null);
          setLoading(false);
          return;
        }
        return loadConfig(activeApp, scope).then((c) => {
          setConfig(c);
          // Le menu reflète d'emblée le fournisseur déjà configuré (ex. PC → GitHub Copilot),
          // sans rien écraser : l'admin voit son choix actuel au lieu de « Aucun ».
          setSelectedPreset(inferPresetKey(c.corrector_base_url));
          // Rouvrir dans l'état laissé : une tâche dont le primaire diffère du champ par défaut
          // (ou qui a des replis) est affichée comme surchargée, pas réinitialisée en silence.
          const overrides = detectTaskOverrides(c.corrector_model_routing, {
            ocrModel: c.corrector_ocr_model ?? '',
            chatModel: c.corrector_chat_model ?? '',
          });
          setTaskOverrides(overrides);
          setRoutingOpen(Object.values(overrides).some(Boolean));
          setLoading(false);
          // Catalogue en tâche de fond : la config est déjà affichable sans lui.
          void loadCatalog(false);
        });
      })
      .catch((e) => {
        setError((e as Error).message);
        setLoading(false);
      });
    return () => {
      copilotAbort.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeApp, scope]);

  /**
   * Charge le catalogue du fournisseur de l'app courante.
   * Un rafraîchissement peut avoir réaligné la config (modèle retiré par le fournisseur) :
   * dans ce cas on recharge la config, sinon l'écran afficherait encore le modèle mort.
   */
  async function loadCatalog(force: boolean) {
    const app = activeApp;
    const portee = scope;
    setCatalogBusy(true);
    setCatalogError(null);
    try {
      const res = await fetchCatalog(app, force, portee);
      if (app !== activeApp) return; // l'admin a changé d'onglet entre-temps
      setCatalog(res);
      setCatalogApplied(res.applied ?? []);
      if ((res.applied?.length ?? 0) > 0) {
        const fresh = await loadConfig(app, portee);
        if (app !== activeApp) return;
        setConfig(fresh);
        setTaskOverrides(
          detectTaskOverrides(fresh.corrector_model_routing, {
            ocrModel: fresh.corrector_ocr_model ?? '',
            chatModel: fresh.corrector_chat_model ?? '',
          }),
        );
      }
    } catch (e) {
      if (app === activeApp) setCatalogError((e as Error).message);
    } finally {
      setCatalogBusy(false);
    }
  }

  /**
   * Connexion GitHub Copilot par device-flow (relais serveur `/api/v1/admin/copilot`).
   * À la fin, remplit `corrector_api_key` avec le token `gho_…` valide ; l'admin n'a plus
   * qu'à Enregistrer. C'est la même auth que les sous-apps (cf. GitHubLogin), mais via ADMIN.
   */
  async function startCopilotLogin() {
    copilotAbort.current = false;
    setCopilotError(null);
    setCopilotUser(null);
    setCopilotStatus('starting');
    try {
      const sr = await fetch('/api/v1/admin/copilot/device/start', {
        method: 'POST',
        credentials: 'include',
      });
      if (!sr.ok) throw new Error(`device/start HTTP ${sr.status}`);
      const d = (await sr.json()) as {
        device_code: string;
        user_code: string;
        verification_uri: string;
        interval?: number;
      };
      setCopilotCode(d.user_code);
      setCopilotUri(d.verification_uri);
      setCopilotStatus('waiting');
      // Pas d'ouverture auto de l'onglet GitHub : ça volerait le focus AVANT que l'admin ait
      // lu/copié le code (GitHub n'expose pas de verification_uri_complete pré-rempli). Le code
      // reste affiché ici ; l'admin clique le lien quand il l'a copié.
      let intervalMs = (d.interval ?? 5) * 1000;
      // Le code expire ~15 min côté GitHub ; on borne le polling par sécurité.
      for (let i = 0; i < 180; i++) {
        await new Promise((res) => setTimeout(res, intervalMs));
        if (copilotAbort.current) return;
        const pr = await fetch('/api/v1/admin/copilot/device/poll', {
          method: 'POST',
          credentials: 'include',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({device_code: d.device_code}),
        });
        const pd = (await pr.json().catch(() => ({}))) as {
          status?: string;
          access_token?: string;
          user?: {login?: string; name?: string | null} | null;
          detail?: string;
        };
        if (copilotAbort.current) return;
        if (pd.status === 'ok' && pd.access_token) {
          update('corrector_api_key', pd.access_token);
          setCopilotUser(pd.user ?? null);
          setCopilotStatus('success');
          setTestResult(null);
          return;
        }
        if (pd.status === 'pending') continue;
        if (pd.status === 'slow_down') {
          intervalMs += 5000;
          continue;
        }
        if (pd.status === 'expired') {
          setCopilotError('Le code a expiré. Relance la connexion.');
          setCopilotStatus('error');
          return;
        }
        if (pd.status === 'denied') {
          setCopilotError('Autorisation refusée sur GitHub.');
          setCopilotStatus('error');
          return;
        }
        setCopilotError(pd.detail ?? 'Erreur inconnue côté GitHub.');
        setCopilotStatus('error');
        return;
      }
      setCopilotError('Délai dépassé. Relance la connexion.');
      setCopilotStatus('error');
    } catch (e) {
      if (copilotAbort.current) return;
      setCopilotError((e as Error).message);
      setCopilotStatus('error');
    }
  }

  async function onTest() {
    if (!config) return;
    const baseUrl = (config.corrector_base_url ?? '').trim();
    const apiKey = (config.corrector_api_key ?? '').trim();
    if (!baseUrl || !apiKey) {
      setTestResult({ok: false, detail: 'baseUrl et clé API requis pour tester'});
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testKey(activeApp, baseUrl, apiKey);
      setTestResult(result);
      // On ne peuple les suggestions QUE sur test réussi — sinon on risque de
      // proposer des modèles d'un ancien fournisseur après un changement de clé.
      setAvailableModels(result.ok && result.models ? result.models : []);
    } catch (e) {
      setTestResult({ok: false, detail: (e as Error).message});
      setAvailableModels([]);
    } finally {
      setTesting(false);
    }
  }

  async function onSave() {
    if (!config) return;
    setSaving(true);
    setError(null);
    try {
      // On normalise AVANT d'écrire : garantit les six tâches en base (une config seedée
      // avant l'ajout d'`assistant` serait sinon réenregistrée incomplète) et purge les
      // replis vides laissés par un « Ajouter un secours » non renseigné.
      const effective: AppConfig = {
        ...config,
        corrector_model_routing: buildEffectiveRouting(
          config.corrector_ocr_model ?? '',
          config.corrector_chat_model ?? '',
          routing,
          taskOverrides,
        ),
      };
      const entries = Object.entries(effective) as [keyof AppConfig, AppConfig[keyof AppConfig]][];
      for (const [key, value] of entries) {
        if (value === undefined || value === '') continue;
        await saveOne(activeApp, key, value, scope);
      }
      setSavedAt(Date.now());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  /** Recharge portée + config après une bascule, sans dupliquer l'effet de montage. */
  async function rechargerPortee() {
    setLoading(true);
    setError(null);
    setSavedAt(null);
    setTestResult(null);
    setAvailableModels([]);
    setCatalog(null);
    setCatalogError(null);
    setCatalogApplied([]);
    try {
      const p = await fetchPerso(activeApp);
      setPerso(p);
      if (scope === 'admin' && !p.actif) {
        setConfig(null);
        return;
      }
      const c = await loadConfig(activeApp, scope);
      setConfig(c);
      setSelectedPreset(inferPresetKey(c.corrector_base_url));
      const overrides = detectTaskOverrides(c.corrector_model_routing, {
        ocrModel: c.corrector_ocr_model ?? '',
        chatModel: c.corrector_chat_model ?? '',
      });
      setTaskOverrides(overrides);
      setRoutingOpen(Object.values(overrides).some(Boolean));
      void loadCatalog(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Active ou désactive ma config perso sur cette matière. La désactivation CONSERVE les clés
   * saisies : on retombe sur la config des utilisateurs, et réactiver rend la sienne telle
   * quelle. Pour l'effacer vraiment, il y a « Supprimer ma configuration ».
   */
  async function basculerPerso(actif: boolean) {
    setPersoBusy(true);
    setError(null);
    try {
      await setPersoActif(activeApp, actif);
      await rechargerPortee();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPersoBusy(false);
    }
  }

  async function supprimerPerso() {
    setPersoBusy(true);
    setError(null);
    try {
      await deletePerso(activeApp);
      await rechargerPortee();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPersoBusy(false);
    }
  }

  function update<K extends keyof AppConfig>(key: K, value: AppConfig[K]) {
    setConfig((c) => ({...(c ?? {}), [key]: value}));
  }

  /**
   * Recalcule le routage après un changement de modèle par défaut. Les tâches SANS surcharge
   * suivent le nouveau modèle (rien n'est « gelé ») ; celles qui en portent une sont laissées
   * intactes — c'est tout l'intérêt de la surcharge.
   */
  function syncRouting(base: AppConfig, ocr: string, chat: string): ModelRouting {
    return buildEffectiveRouting(
      ocr,
      chat,
      normalizeRouting(base.corrector_model_routing, {ocrModel: ocr, chatModel: chat}),
      taskOverrides,
    );
  }

  /** Routage courant, toujours complet (les six tâches) même si la config n'en stocke pas. */
  function currentRouting(base: AppConfig | null): ModelRouting {
    return normalizeRouting(base?.corrector_model_routing, {
      ocrModel: base?.corrector_ocr_model ?? '',
      chatModel: base?.corrector_chat_model ?? '',
    });
  }

  /** Applique une transformation à la politique d'une tâche. */
  function editTask(key: ModelTaskKey, fn: (p: ModelTaskPolicy) => ModelTaskPolicy) {
    setConfig((c) => {
      const routing = currentRouting(c);
      return {...(c ?? {}), corrector_model_routing: {...routing, [key]: fn(routing[key])}};
    });
    setSavedAt(null);
  }

  /** Passe une tâche en surcharge, pré-remplie avec le modèle dont elle héritait. */
  function enableTaskOverride(key: ModelTaskKey) {
    setTaskOverrides((o) => ({...o, [key]: true}));
    setConfig((c) => {
      const routing = currentRouting(c);
      const inherited =
        DEFAULT_TASK_MODEL[key] === 'ocr' ? c?.corrector_ocr_model : c?.corrector_chat_model;
      return {
        ...(c ?? {}),
        corrector_model_routing: {
          ...routing,
          [key]: policy(routing[key].primary || inherited || '', routing[key].fallbacks),
        },
      };
    });
    setSavedAt(null);
  }

  /** Retire la surcharge : la tâche redevient un alias du champ OCR/chat, sans replis. */
  function resetTaskToDefault(key: ModelTaskKey) {
    setTaskOverrides((o) => ({...o, [key]: false}));
    setConfig((c) => {
      const routing = currentRouting(c);
      const inherited =
        DEFAULT_TASK_MODEL[key] === 'ocr' ? c?.corrector_ocr_model : c?.corrector_chat_model;
      return {
        ...(c ?? {}),
        corrector_model_routing: {...routing, [key]: policy(inherited ?? '')},
      };
    });
    setCustomTaskFields((f) => {
      const next = {...f};
      for (const id of Object.keys(next)) if (id.startsWith(`${key}-`)) delete next[id];
      return next;
    });
    setSavedAt(null);
  }

  const addFallback = (key: ModelTaskKey) =>
    editTask(key, (p) => ({...p, fallbacks: [...p.fallbacks, '']}));

  const updateFallbackAt = (key: ModelTaskKey, index: number, value: string) =>
    editTask(key, (p) => ({...p, fallbacks: p.fallbacks.map((f, i) => (i === index ? value : f))}));

  const removeFallback = (key: ModelTaskKey, index: number) =>
    editTask(key, (p) => ({...p, fallbacks: p.fallbacks.filter((_, i) => i !== index)}));

  const moveFallback = (key: ModelTaskKey, index: number, direction: -1 | 1) =>
    editTask(key, (p) => {
      const target = index + direction;
      if (target < 0 || target >= p.fallbacks.length) return p;
      const next = [...p.fallbacks];
      const moved = next[index]!;
      next[index] = next[target]!;
      next[target] = moved;
      return {...p, fallbacks: next};
    });

  /** Édite le modèle OCR + resynchronise les tâches non surchargées. */
  function setOcrModel(v: string) {
    setConfig((c) => {
      const base = c ?? {};
      return {
        ...base,
        corrector_ocr_model: v,
        corrector_model_routing: syncRouting(base, v, base.corrector_chat_model ?? ''),
      };
    });
  }

  /** Édite le modèle chat/correction + resynchronise les tâches non surchargées. */
  function setChatModel(v: string) {
    setConfig((c) => {
      const base = c ?? {};
      return {
        ...base,
        corrector_chat_model: v,
        corrector_model_routing: syncRouting(base, base.corrector_ocr_model ?? '', v),
      };
    });
  }

  /**
   * Applique un preset fournisseur. Si on est DÉJÀ sur ce fournisseur (même host) avec des
   * modèles renseignés, on les CONSERVE (ne pas écraser le gpt-5.4 de l'admin par gpt-4o) et
   * on préserve le routage tel quel — y compris les surcharges par tâche posées ici ou dans
   * les Réglages d'un correcteur. On rafraîchit juste baseUrl, reasoning et le catalogue.
   *
   * En revanche, CHANGER de fournisseur réinitialise le routage : les IDs de l'ancien
   * fournisseur n'existent pas chez le nouveau, les conserver donnerait des 404 silencieux.
   * La clé API n'est jamais touchée.
   */
  function applyPreset(provider: string) {
    const preset = PROVIDER_PRESETS[provider];
    if (!preset) return;
    let nextOverrides: Record<ModelTaskKey, boolean> | null = null;
    setConfig((c) => {
      const base = c ?? {};
      const sameProvider = (base.corrector_base_url ?? '').includes(hostFragment(preset.baseUrl));
      const keepModels = sameProvider && !!base.corrector_ocr_model && !!base.corrector_chat_model;

      if (keepModels) {
        // Même fournisseur : on ne touche ni aux modèles ni au routage existant.
        nextOverrides = taskOverrides;
        return {
          ...base,
          corrector_base_url: preset.baseUrl,
          corrector_reasoning_effort: preset.reasoningEffort ?? base.corrector_reasoning_effort,
        };
      }

      if (preset.routing) {
        // Fournisseur à routage intrinsèque (Mistral/Albert/Kimi) : on pose son split complet,
        // replis compris, et on en déduit quelles tâches comptent comme surchargées.
        nextOverrides = detectTaskOverrides(preset.routing, {
          ocrModel: preset.ocrModel,
          chatModel: preset.chatModel,
        });
        return {
          ...base,
          corrector_base_url: preset.baseUrl,
          corrector_ocr_model: preset.ocrModel,
          corrector_chat_model: preset.chatModel,
          corrector_stt_model: preset.sttModel ?? base.corrector_stt_model,
          corrector_reasoning_effort: preset.reasoningEffort ?? base.corrector_reasoning_effort,
          corrector_model_routing: preset.routing,
        };
      }

      // Fournisseur sans routage intrinsèque : routage à plat dérivé des deux champs
      // (mis à jour ensuite par setOcrModel/setChatModel ou par l'éditeur par tâche).
      nextOverrides = {...EMPTY_TASK_OVERRIDES};
      return {
        ...base,
        corrector_base_url: preset.baseUrl,
        corrector_ocr_model: preset.ocrModel,
        corrector_chat_model: preset.chatModel,
        corrector_stt_model: preset.sttModel ?? base.corrector_stt_model,
        corrector_reasoning_effort: preset.reasoningEffort ?? base.corrector_reasoning_effort,
        corrector_model_routing: buildFlatRouting(preset.ocrModel, preset.chatModel),
      };
    });
    if (nextOverrides) setTaskOverrides(nextOverrides);
    setSelectedPreset(provider);
    setOcrCustom(false);
    setChatCustom(false);
    setSttCustom(false);
    setTestResult(null);
    setSavedAt(null);
  }

  // Routage affiché : toujours les six tâches, même si la config stockée est partielle ou
  // héritée d'une version antérieure du schéma (cas des apps seedées avant `assistant`).
  const routing = currentRouting(config);
  const overrideCount = Object.values(taskOverrides).filter(Boolean).length;

  // Liste proposée = catalogue live ∪ « Tester la clé » ∪ amorçage du preset, dédupliqués.
  // Le catalogue vient en tête : c'est la seule des trois sources qui dise ce que le
  // fournisseur sert RÉELLEMENT aujourd'hui.
  const catalogModels = (catalog?.models ?? []).map((m) => m.id);
  const presetModels = (selectedPreset && PROVIDER_PRESETS[selectedPreset]?.models) || [];
  const knownModels = Array.from(new Set([...catalogModels, ...availableModels, ...presetModels]));
  const modelInfoById = new Map((catalog?.models ?? []).map((m) => [m.id, m]));
  /** Modèles configurés que le fournisseur ne sert plus (catalogue fiable uniquement). */
  const deadModels =
    catalog && !catalog.degraded && catalogModels.length > 0
      ? [
          config?.corrector_ocr_model,
          config?.corrector_chat_model,
          ...MODEL_TASKS.map(({key}) => routing[key]?.primary),
        ]
          .filter((m): m is string => !!m && m.trim().length > 0)
          .filter((m, i, arr) => arr.indexOf(m) === i)
          .filter((m) => !modelInfoById.has(m))
      : [];
  const currentSttPreset = selectedPreset ? PROVIDER_PRESETS[selectedPreset]?.sttModel : undefined;
  // GitHub Copilot exige une auth OAuth (gho_…) ; on propose la connexion device-flow.
  const isCopilot = !!config && (config.corrector_base_url ?? '').includes('githubcopilot.com');

  const fieldCls =
    'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring';

  /**
   * Champ de sélection de modèle : un <select> fiable (liste tout le catalogue + le modèle
   * courant même s'il n'y est pas) plus une option « Autre » qui révèle un champ texte libre.
   * Remplace l'ancien <input list> (datalist filtrait sur la valeur déjà saisie → impossible
   * de changer de modèle sans tout effacer).
   */
  function renderModelField(opts: {
    id: string;
    label: string;
    value: string;
    onPick: (v: string) => void;
    custom: boolean;
    setCustom: (b: boolean) => void;
    placeholder: string;
    help: ReactNode;
  }) {
    const options = Array.from(new Set([...knownModels, ...(opts.value ? [opts.value] : [])]));
    return (
      <div className="space-y-1">
        <Label htmlFor={opts.id}>{opts.label}</Label>
        <select
          id={opts.id}
          className={fieldCls}
          value={opts.custom ? '__custom__' : opts.value}
          onChange={(e) => {
            const v = e.target.value;
            if (v === '__custom__') {
              opts.setCustom(true);
            } else {
              opts.setCustom(false);
              opts.onPick(v);
            }
          }}
        >
          <option value="">— choisir un modèle —</option>
          {options.map((m) => (
            <option key={m} value={m}>
              {modelOptionLabel(m, modelInfoById.get(m))}
            </option>
          ))}
          <option value="__custom__">— Autre (saisir un ID) —</option>
        </select>
        {opts.custom && (
          <input
            className={fieldCls}
            placeholder={opts.placeholder}
            value={opts.value}
            onChange={(e) => opts.onPick(e.target.value)}
            autoComplete="off"
            autoFocus
          />
        )}
        <p className="text-xs text-muted-foreground">{opts.help}</p>
      </div>
    );
  }

  /**
   * Variante compacte de `renderModelField` pour l'éditeur par tâche : pas de label ni
   * d'aide (portés par la carte de la tâche), et l'état « saisie libre » est mutualisé
   * dans `customTaskFields` puisqu'il y a un champ par repli.
   */
  function renderTaskModelSelect(
    id: string,
    value: string,
    onPick: (v: string) => void,
    exclude: string[] = [],
  ) {
    const custom = customTaskFields[id] ?? false;
    const options = Array.from(
      new Set([...knownModels, ...(value ? [value] : [])]),
    ).filter((m) => m === value || !exclude.includes(m));
    return (
      <div className="space-y-1">
        <select
          id={id}
          className={fieldCls}
          value={custom ? '__custom__' : value}
          onChange={(e) => {
            const v = e.target.value;
            if (v === '__custom__') {
              setCustomTaskFields((f) => ({...f, [id]: true}));
            } else {
              setCustomTaskFields((f) => ({...f, [id]: false}));
              onPick(v);
            }
          }}
        >
          <option value="">— choisir un modèle —</option>
          {options.map((m) => (
            <option key={m} value={m}>
              {modelOptionLabel(m, modelInfoById.get(m))}
            </option>
          ))}
          <option value="__custom__">— Autre (saisir un ID) —</option>
        </select>
        {custom && (
          <input
            className={fieldCls}
            placeholder="Identifiant du modèle"
            value={value}
            onChange={(e) => onPick(e.target.value)}
            autoComplete="off"
            autoFocus
          />
        )}
      </div>
    );
  }

  return (
    <Card className="rounded-sm border border-border border-t-2 border-t-primary">
      <CardHeader>
        <div className="text-[10px] font-bold uppercase tracking-wider text-primary">
          {scope === 'admin' ? 'Ma configuration' : 'Clé partagée'}
        </div>
        <CardTitle>Configuration API</CardTitle>
        <p className="text-sm text-muted-foreground">
          {scope === 'admin' ? (
            <>
              Fournisseur, clé et modèles qui ne s'appliquent <strong>qu'à toi</strong>, matière
              par matière. Les invités continuent de recevoir la configuration « Les
              utilisateurs ».
            </>
          ) : (
            <>
              Clé API, baseUrl et modèles partagés avec tous les invités. Sans cette config,
              aucun invité ne peut corriger.
            </>
          )}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-1 overflow-x-auto border-b">
          {APPS.map((a) => (
            <button
              key={a.slug}
              type="button"
              onClick={() => setActiveApp(a.slug)}
              className={`-mb-px flex-shrink-0 whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                activeApp === a.slug
                  ? 'text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              style={
                activeApp === a.slug
                  ? {borderBottomColor: `var(--${a.slug}-color)`, color: `var(--${a.slug}-color)`}
                  : undefined
              }
            >
              {a.title}
            </button>
          ))}
        </div>

        {/*
          Bascule de portée. Deux configurations coexistent pour une même matière : celle
          servie aux professeurs invités, et celle de l'admin. Sans ce sélecteur, l'admin ne
          pouvait pas essayer un fournisseur sans embarquer tout le monde avec lui.
        */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium">Configuration appliquée à :</span>
            <div className="inline-flex rounded-sm border border-border p-0.5">
              {([
                {key: 'users' as const, label: 'Les utilisateurs'},
                {key: 'admin' as const, label: 'Moi (admin)'},
              ]).map((o) => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => setScope(o.key)}
                  disabled={saving || persoBusy}
                  className={`rounded-sm px-3 py-1 text-sm font-medium transition-colors ${
                    scope === o.key
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {scope === 'admin' && perso?.actif && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                Active
              </span>
            )}
          </div>

          {/*
            Le bandeau est indispensable côté utilisateurs : sans lui, l'admin ouvrirait son
            correcteur, y verrait un autre fournisseur que celui affiché ici, et chercherait
            la panne au mauvais endroit.
          */}
          {scope === 'users' && perso?.actif && (
            <div className="rounded-sm border border-l-4 border-l-primary bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              Ta configuration personnelle est <strong>active</strong> sur cette matière : c'est
              elle que tu utilises dans le correcteur, pas celle affichée ci-dessous. Ce que tu
              modifies ici ne concerne que les invités.
            </div>
          )}
        </div>

        {loading && <div className="text-sm text-muted-foreground">Chargement…</div>}

        {/* Portée admin sans config perso active : on propose de la créer plutôt que
            d'afficher un formulaire qui écrirait ailleurs que là où l'admin le croit. */}
        {!loading && scope === 'admin' && !perso?.actif && (
          <div className="space-y-3 rounded-sm border border-border bg-muted/30 p-4">
            <p className="text-sm">
              Tu utilises actuellement la <strong>configuration des utilisateurs</strong> pour
              cette matière.
            </p>
            <p className="text-xs text-muted-foreground">
              {perso?.existe
                ? 'Une configuration personnelle existe déjà ici : la réactiver la rend telle que tu l’avais laissée.'
                : 'La créer part d’une copie de la configuration des utilisateurs — donc d’un état qui fonctionne. Tu pourras ensuite changer de fournisseur, coller ta propre clé et choisir tes modèles, sans que rien ne change pour les invités.'}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => void basculerPerso(true)} disabled={persoBusy}>
                {persoBusy ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <UserCog className="mr-1 h-4 w-4" />
                )}
                {perso?.existe
                  ? 'Réactiver ma configuration personnelle'
                  : 'Créer ma configuration personnelle'}
              </Button>
              {perso?.existe && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => void supprimerPerso()}
                  disabled={persoBusy}
                  className="text-xs"
                >
                  Supprimer ma configuration
                </Button>
              )}
            </div>
            {error && (
              <div className="rounded-sm border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>
        )}

        {!loading && config && !(scope === 'admin' && !perso?.actif) && (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="preset">Fournisseur</Label>
              <select
                id="preset"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                value={selectedPreset}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v) applyPreset(v);
                  else setSelectedPreset('');
                }}
              >
                <option value="">— Personnalisé (saisie manuelle) —</option>
                {Object.entries(PROVIDER_PRESETS).map(([key, p]) => (
                  <option key={key} value={key}>
                    {p.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Reflète le fournisseur actuel et pré-remplit baseUrl + modèles. Sélectionner ton
                fournisseur actuel <strong>conserve</strong> tes modèles déjà choisis (ex.{' '}
                <code>gpt-5.4</code>). Tu restes libre de changer de LLM dans les champs ci-dessous.{' '}
                <strong>Albert</strong> = souverain DINUM (gratuit). Colle la clé, puis « Tester la
                clé » et « Enregistrer ».
              </p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="baseUrl">Base URL</Label>
              <Input
                id="baseUrl"
                placeholder="https://api.mistral.ai  ·  https://albert.api.etalab.gouv.fr"
                value={config.corrector_base_url ?? ''}
                onChange={(e) => {
                  update('corrector_base_url', e.target.value);
                  setSelectedPreset(inferPresetKey(e.target.value));
                }}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="apiKey">{scope === 'admin' ? 'Clé API (la mienne)' : 'Clé API (partagée)'}</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="••••••••"
                value={config.corrector_api_key ?? ''}
                onChange={(e) => update('corrector_api_key', e.target.value)}
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Chiffrée au repos (AES-256-GCM) ;{' '}
                {scope === 'admin'
                  ? "utilisée par toi seul sur cette matière. Changer de fournisseur sans coller la clé correspondante donne des 404 : les deux vont ensemble."
                  : 'partagée avec tous les invités de cette app.'}
              </p>
            </div>

            {isCopilot && (
              <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">
                  GitHub Copilot exige une connexion OAuth : un token <code>github_pat_…</code> est
                  refusé (« invalid token »). Connecte-toi pour générer un token <code>gho_…</code>{' '}
                  valide — il remplit automatiquement le champ « Clé API » ci-dessus.
                </p>
                {copilotStatus === 'success' ? (
                  <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                    Connecté{copilotUser?.login ? ` — @${copilotUser.login}` : ''}. Clique
                    « Enregistrer » pour propager le token aux invités.
                  </div>
                ) : copilotStatus === 'waiting' ? (
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-foreground">
                      Le code est ici, sur cette page — pas sur GitHub. Reste sur cet onglet.
                    </p>
                    <div className="flex flex-col items-center gap-1 rounded-md border-2 border-dashed border-primary/40 bg-primary/5 p-3">
                      <span className="text-xs text-muted-foreground">1. Copie ce code :</span>
                      <div className="flex items-center gap-2">
                        <code className="select-all text-2xl font-bold tracking-[0.25em]">
                          {copilotCode}
                        </code>
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(copilotCode)}
                          className="rounded p-1.5 hover:bg-muted"
                          title="Copier le code"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <a
                      href={copilotUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      2. Ouvrir github.com/login/device et coller le code
                    </a>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      3. En attente de ton autorisation sur GitHub…
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={startCopilotLogin}
                    disabled={copilotStatus === 'starting'}
                    className="gap-2"
                  >
                    {copilotStatus === 'starting' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Github className="h-4 w-4" />
                    )}
                    Se connecter à GitHub Copilot
                  </Button>
                )}
                {copilotStatus === 'error' && copilotError && (
                  <div className="flex items-center gap-2 text-xs text-destructive">
                    <XCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    {copilotError}
                  </div>
                )}
              </div>
            )}

            {/*
              Catalogue live : les fournisseurs changent périodiquement de LLM (OpenCode Go
              en tête). Sans lui, les menus ci-dessous se limitaient à une liste écrite en dur
              dans le code, qui pourrissait entre deux versions.
            */}
            <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {catalogBusy
                    ? 'Catalogue du fournisseur : sonde en cours…'
                    : catalog
                      ? `Catalogue du fournisseur : ${catalog.models.length} modèle${catalog.models.length > 1 ? 's' : ''} · rafraîchi ${formatAge(Date.now() - catalog.fetchedAt)}`
                      : 'Catalogue du fournisseur : non chargé.'}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void loadCatalog(true)}
                  disabled={catalogBusy}
                >
                  {catalogBusy ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <PlugZap className="mr-1 h-3.5 w-3.5" />
                  )}
                  Rafraîchir le catalogue
                </Button>
              </div>

              {catalogError && (
                <p className="flex items-start gap-2 text-xs text-destructive">
                  <XCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                  {catalogError}
                </p>
              )}

              {catalog?.degraded && !catalogBusy && (
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Sonde indisponible (clé absente, fournisseur injoignable ou hôte non autorisé) :
                  les modèles proposés viennent d'une liste de secours et leurs capacités sont
                  devinées d'après leur nom. Rien n'est bloqué — la saisie libre reste possible.
                </p>
              )}

              {catalogApplied.length > 0 && (
                <div className="text-xs text-amber-700 dark:text-amber-300">
                  <p className="font-medium">
                    Modèle(s) retiré(s) par le fournisseur — configuration réalignée automatiquement :
                  </p>
                  <ul className="ml-4 list-disc">
                    {catalogApplied.map((s) => (
                      <li key={`${s.task}-${s.from}`}>
                        <code>{s.task}</code> : {s.from} → <strong>{s.to}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {deadModels.length > 0 && catalogApplied.length === 0 && (
                <p className="text-xs text-destructive">
                  Modèle(s) configuré(s) que le fournisseur ne sert plus :{' '}
                  <code>{deadModels.join(', ')}</code>. Choisis un remplaçant ci-dessous.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {renderModelField({
                id: 'ocrModel',
                label: 'Modèle OCR',
                value: config.corrector_ocr_model ?? '',
                onPick: setOcrModel,
                custom: ocrCustom,
                setCustom: setOcrCustom,
                placeholder: 'mistral-ocr-2512',
                help: (
                  <>
                    Modèle qui lit les copies : il lui faut la <strong>vision</strong>, indiquée
                    à côté de chaque id. La liste est celle que le fournisseur sert réellement,
                    rafraîchie toute seule.
                  </>
                ),
              })}
              {renderModelField({
                id: 'chatModel',
                label: 'Modèle chat/correction',
                value: config.corrector_chat_model ?? '',
                onPick: setChatModel,
                custom: chatCustom,
                setCustom: setChatCustom,
                placeholder: 'gpt-5.4',
                help: (
                  <>
                    Modèle qui corrige (barème + copies + chat élève). Choisis n'importe quel LLM :{' '}
                    <code>gpt-5.4</code>, <code>gpt-5</code>, <code>claude-sonnet-4</code>…
                  </>
                ),
              })}
            </div>

            {currentSttPreset && (
              <div className="space-y-1">
                <Label htmlFor="sttModel">Modèle de transcription vocale (STT)</Label>
                <select
                  id="sttModel"
                  className={fieldCls}
                  value={sttCustom ? '__custom__' : (config.corrector_stt_model ?? '')}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === '__custom__') {
                      setSttCustom(true);
                    } else {
                      setSttCustom(false);
                      update('corrector_stt_model', v);
                    }
                  }}
                >
                  <option value="">{currentSttPreset} (défaut fournisseur)</option>
                  {config.corrector_stt_model && config.corrector_stt_model !== currentSttPreset && (
                    <option value={config.corrector_stt_model}>{config.corrector_stt_model}</option>
                  )}
                  <option value="__custom__">— Autre (saisir un ID) —</option>
                </select>
                {sttCustom && (
                  <input
                    className={fieldCls}
                    placeholder={currentSttPreset}
                    value={config.corrector_stt_model ?? ''}
                    onChange={(e) => update('corrector_stt_model', e.target.value)}
                    autoComplete="off"
                    autoFocus
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  Modèle de reconnaissance vocale pour la dictée (endpoint{' '}
                  <code>/v1/audio/transcriptions</code>). Laissez le défaut du fournisseur ou
                  saisissez un ID personnalisé.
                </p>
              </div>
            )}

            {/*
              Éditeur par tâche — transposition de la section « Surcharges par tâche » des
              Réglages des sous-apps (components/SettingsDialog.tsx). Les six tâches doivent y
              figurer : une tâche absente d'ici n'est pas seulement inconfigurable, le routage
              écrit à l'enregistrement ÉCRASE la surcharge posée dans un correcteur.
            */}
            <div className="rounded-sm border border-border bg-muted/30">
              <button
                type="button"
                onClick={() => setRoutingOpen((o) => !o)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
              >
                <span className="text-sm font-medium">
                  Modèles par tâche{' '}
                  <span className="text-muted-foreground">(avancé)</span>
                </span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  {overrideCount > 0
                    ? `${overrideCount} surcharge${overrideCount > 1 ? 's' : ''}`
                    : 'tout par défaut'}
                  {routingOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </span>
              </button>

              {routingOpen && (
                <div className="space-y-3 border-t border-border px-3 py-3">
                  <p className="text-xs text-muted-foreground">
                    Par défaut, chaque tâche suit les deux champs ci-dessus. Définis une
                    surcharge seulement pour les cas particuliers — par exemple confier
                    l'Assistant pédagogique à un autre modèle que la correction, ou donner un
                    modèle de secours à la correction pour qu'un 429 ne la fasse pas échouer.
                  </p>
                  {MODEL_TASKS.map((task) => {
                    const p = routing[task.key];
                    const inherited =
                      DEFAULT_TASK_MODEL[task.key] === 'ocr'
                        ? (config.corrector_ocr_model ?? '')
                        : (config.corrector_chat_model ?? '');
                    const usesDefault = !taskOverrides[task.key];
                    return (
                      <div
                        key={task.key}
                        className="space-y-3 rounded-sm border border-border/60 bg-background p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium">{task.label}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{task.helper}</p>
                          </div>
                          <span
                            className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                              usesDefault
                                ? 'bg-muted text-muted-foreground'
                                : 'bg-primary text-primary-foreground'
                            }`}
                          >
                            {usesDefault ? 'Par défaut' : 'Surcharge'}
                          </span>
                        </div>

                        {usesDefault ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              Hérite de <code>{inherited || '—'}</code>
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              onClick={() => enableTaskOverride(task.key)}
                            >
                              Définir une surcharge
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div className="space-y-1">
                              <Label htmlFor={`${task.key}-primary`} className="text-xs">
                                Modèle pour cette tâche
                              </Label>
                              {renderTaskModelSelect(`${task.key}-primary`, p.primary, (v) =>
                                editTask(task.key, (cur) => ({...cur, primary: v})),
                              )}
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-xs font-medium">Si ce modèle échoue, essayer :</p>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="gap-1 text-xs"
                                  onClick={() => addFallback(task.key)}
                                >
                                  <Plus className="h-3 w-3" />
                                  Ajouter un secours
                                </Button>
                              </div>
                              {p.fallbacks.length === 0 ? (
                                <p className="rounded-sm border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                                  Aucun secours : la tâche échoue si le modèle principal est
                                  indisponible (429, timeout, réponse vide).
                                </p>
                              ) : (
                                p.fallbacks.map((fb, i) => (
                                  <div
                                    key={`${task.key}-fb-${i}`}
                                    className="flex items-start gap-1"
                                  >
                                    <div className="flex-1">
                                      {renderTaskModelSelect(
                                        `${task.key}-fallback-${i}`,
                                        fb,
                                        (v) => updateFallbackAt(task.key, i, v),
                                        [p.primary],
                                      )}
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      title="Monter"
                                      disabled={i === 0}
                                      onClick={() => moveFallback(task.key, i, -1)}
                                    >
                                      <ArrowUp className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      title="Descendre"
                                      disabled={i === p.fallbacks.length - 1}
                                      onClick={() => moveFallback(task.key, i, 1)}
                                    >
                                      <ArrowDown className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      title="Supprimer ce secours"
                                      onClick={() => removeFallback(task.key, i)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))
                              )}
                            </div>

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-xs"
                              onClick={() => resetTaskToDefault(task.key)}
                            >
                              Retirer la surcharge
                            </Button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="reasoning">Reasoning effort</Label>
              <select
                id="reasoning"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                value={config.corrector_reasoning_effort ?? ''}
                onChange={(e) =>
                  update(
                    'corrector_reasoning_effort',
                    (e.target.value || undefined) as AppConfig['corrector_reasoning_effort'],
                  )
                }
              >
                <option value="">— (défaut sous-app)</option>
                <option value="none">none (désactivé)</option>
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
              </select>
            </div>

            {error && (
              <div className="rounded-sm border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            {savedAt && (
              <div className="rounded-sm border border-l-4 border-l-[#00A95F] bg-[#E3FDEB] px-3 py-2 text-sm text-green-900 dark:bg-[#1F3D2C] dark:text-green-200">
                Enregistré à {new Date(savedAt).toLocaleTimeString('fr-FR')}.
              </div>
            )}
            {testResult && (
              <div
                className={
                  testResult.ok
                    ? 'flex items-start gap-2 rounded-sm border border-l-4 border-l-[#00A95F] bg-[#E3FDEB] px-3 py-2 text-sm text-green-900 dark:bg-[#1F3D2C] dark:text-green-200'
                    : 'flex items-start gap-2 rounded-sm border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive'
                }
              >
                {testResult.ok ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                )}
                <div className="min-w-0">
                  {testResult.ok ? (
                    <span>
                      Clé valide
                      {typeof testResult.modelCount === 'number' && ` — ${testResult.modelCount} modèles listés`}
                      {typeof testResult.latency === 'number' && ` (${testResult.latency} ms)`}.
                    </span>
                  ) : (
                    <span>
                      Échec
                      {typeof testResult.status === 'number' && ` (HTTP ${testResult.status})`}
                      {' : '}
                      <span className="break-all font-mono text-xs">{testResult.detail}</span>
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                {scope === 'admin' && perso?.actif && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => void basculerPerso(false)}
                      disabled={persoBusy || saving || testing}
                    >
                      Revenir à la configuration des utilisateurs
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => void supprimerPerso()}
                      disabled={persoBusy || saving || testing}
                    >
                      Supprimer ma configuration
                    </Button>
                  </>
                )}
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={onTest} disabled={testing || saving}>
                  {testing ? (
                    <>
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      Test en cours…
                    </>
                  ) : (
                    <>
                      <PlugZap className="mr-1 h-4 w-4" />
                      Tester la clé API
                    </>
                  )}
                </Button>
                <Button onClick={onSave} disabled={saving || testing}>
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
