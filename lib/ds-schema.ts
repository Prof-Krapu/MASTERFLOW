/**
 * Schéma défensif pour inspecter le contenu d'un DS (`corrector_ds_data_<id>`)
 * côté admin, SANS coupler `API_manage` au code source des sous-apps.
 *
 * ⚠️ Ce fichier est un **miroir local** du schéma défini dans
 * `lib/history.ts` (et implicitement dans `lib/pipeline.ts`) des sous-apps
 * `API_corrector_*`. Il ne peut pas importer directement ce code car les
 * projets sont indépendants (pas de npm workspace). Si le schéma sous-app
 * évolue, ce miroir doit être resynchronisé — d'où le test
 * `tests/ds-schema.test.ts` qui valide tous les DS réels en DB.
 *
 * Les accesseurs ci-dessous tolèrent l'absence ou le renommage des champs :
 * ils renvoient des valeurs par défaut sûres (tableau vide, null) plutôt
 * que de throw. Comportement voulu : un champ sous-app renommé doit
 * dégrader silencieusement l'affichage admin (cellule vide), pas crasher
 * le panneau UsersPanel.
 */

/** Entrée de `corrector_ds_index` (metadata légère d'un DS). */
export interface DsIndexEntry {
  id?: string;
  titre?: string;
  niveau?: string;
  matiere?: string;
  severite?: string;
  totalPoints?: number;
  date?: number;
  studentCount?: number;
  moyenne?: number;
  hasAiSummary?: boolean;
  status?: string;
  archivedAt?: number | null;
  trashedAt?: number | null;
  updatedAt?: number;
  searchText?: string;
}

/** Payload complet `corrector_ds_data_<id>` — on reste large sur les champs. */
export interface DsPayload {
  id?: string;
  titre?: string;
  niveau?: string;
  matiere?: string;
  severite?: string;
  totalPoints?: number;
  date?: number;
  status?: string;
  archivedAt?: number | null;
  trashedAt?: number | null;
  updatedAt?: number;
  bareme?: unknown;
  corrigeText?: string;
  // Historiquement `results` ; on accepte aussi `students` si renommage futur.
  results?: unknown;
  students?: unknown;
  // Champs additionnels tolérés (aiSummary, etc.) — non typés explicitement.
  [k: string]: unknown;
}

export interface BaremeSousQuestion {
  id?: string;
  points?: number;
  critere?: string;
  [k: string]: unknown;
}

export interface BaremeExercice {
  titre?: string;
  points?: number;
  groupeChoix?: string;
  sousQuestions?: unknown;
  // Alias anglais possible côté sous-app (ex. PC historiquement) :
  subQuestions?: unknown;
  [k: string]: unknown;
}

export interface Bareme {
  exercices?: unknown;
  exercises?: unknown; // alias possible
  totalPoints?: number;
  [k: string]: unknown;
}

export interface StudentResult {
  id?: string;
  studentName?: string;
  timestamp?: number;
  grade?: number;
  reasoning?: string;
  appreciation?: string;
  exercises?: unknown;
  acquis?: unknown;
  difficultes?: unknown;
  conseils?: unknown;
  ocrText?: string;
  [k: string]: unknown;
}

/* -------------------------------------------------------------------------- */
/*                              Accesseurs                                    */
/* -------------------------------------------------------------------------- */

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function asNum(v: unknown, def = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : def;
}

function asStr(v: unknown, def = ''): string {
  return typeof v === 'string' ? v : def;
}

/** Liste des exercices du barème, tolérante à l'alias `exercises`. */
export function getExercices(ds: DsPayload | null | undefined): BaremeExercice[] {
  const bareme = (ds?.bareme ?? {}) as Bareme;
  const list = Array.isArray(bareme.exercices) ? bareme.exercices : bareme.exercises;
  return asArray(list) as BaremeExercice[];
}

/** Sous-questions d'un exercice, tolérantes à l'alias `subQuestions`. */
export function getSousQuestions(ex: BaremeExercice | null | undefined): BaremeSousQuestion[] {
  if (!ex) return [];
  const list = Array.isArray(ex.sousQuestions) ? ex.sousQuestions : ex.subQuestions;
  return asArray(list) as BaremeSousQuestion[];
}

/** Liste des élèves — tolérante au renommage `results` → `students`. */
export function getResults(ds: DsPayload | null | undefined): StudentResult[] {
  if (!ds) return [];
  const list = Array.isArray(ds.results) ? ds.results : ds.students;
  return asArray(list) as StudentResult[];
}

/** `acquis` d'un élève — alias possibles futurs : `strengths`. */
export function getAcquis(s: StudentResult | null | undefined): unknown[] {
  if (!s) return [];
  return asArray(s.acquis ?? (s as Record<string, unknown>).strengths);
}

/** `difficultes` d'un élève — alias possibles futurs : `weaknesses`. */
export function getDifficultes(s: StudentResult | null | undefined): unknown[] {
  if (!s) return [];
  return asArray(s.difficultes ?? (s as Record<string, unknown>).weaknesses);
}

/** `conseils` d'un élève — alias possibles futurs : `tips`. */
export function getConseils(s: StudentResult | null | undefined): unknown[] {
  if (!s) return [];
  return asArray(s.conseils ?? (s as Record<string, unknown>).tips);
}

/**
 * Indique si la correction d'un élève est incomplète : pas d'exercices notés
 * ET (note = 0 OU appréciation contient une mention d'erreur API).
 * Sert à afficher le badge « Correction incomplète » dans la UI admin.
 */
export function isCorrectionIncomplete(s: StudentResult | null | undefined): boolean {
  if (!s) return true;
  const ex = asArray(s.exercises);
  if (ex.length > 0) return false;
  const note = asNum(s.grade, -1);
  const appr = asStr(s.appreciation).toLowerCase();
  if (note === 0) return true;
  if (/erreur (api|lors de la correction)|rate limit|429|5\d{2}/.test(appr)) return true;
  return false;
}

/** Helper pour formater une note : `grade/totalPoints` avec tolérance. */
export function formatNote(grade: unknown, totalPoints: unknown): string {
  const g = asNum(grade, -1);
  const t = asNum(totalPoints, 0);
  if (g < 0 || t <= 0) return '—';
  return `${g.toFixed(2)} / ${t}`;
}

/** Helper pour formater un timestamp (ms epoch) en date FR. */
export function formatDate(ts: unknown): string {
  const n = asNum(ts, 0);
  if (!n) return '—';
  try {
    return new Date(n).toLocaleString('fr-FR', {dateStyle: 'short', timeStyle: 'short'});
  } catch {
    return '—';
  }
}

/**
 * Valide qu'un payload inconnu (venant de la DB) peut être lu sans throw par
 * les accesseurs ci-dessus. Utilisé par le test de contrat `ds-schema.test.ts`
 * pour détecter un renommage côté sous-app avant qu'il ne casse la UI admin.
 *
 * Retourne la liste des champs attendus manquants (vide = OK).
 */
export function validatePayload(raw: unknown): string[] {
  const missing: string[] = [];
  if (!raw || typeof raw !== 'object') return ['__root__'];
  const ds = raw as DsPayload;
  // Champs critiques pour l'affichage admin. Un champ manquant n'est pas
  // fatal (l'accesseur renvoie une valeur par défaut) MAIS il signale un
  // potentiel drift du schéma sous-app.
  if (ds.titre === undefined) missing.push('titre');
  if (ds.bareme === undefined) missing.push('bareme');
  if (ds.results === undefined && ds.students === undefined) missing.push('results/students');
  return missing;
}
