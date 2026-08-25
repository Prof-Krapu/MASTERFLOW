/**
 * Balayage périodique du catalogue de modèles.
 *
 * Pourquoi un troisième déclencheur, à côté de la sonde de démarrage et du TTL paresseux :
 *   - la sonde de démarrage (`server/index.ts`) ne couvre qu'un service qu'on redémarre —
 *     en production `corrector-manage` tourne des semaines d'affilée ;
 *   - le TTL de 6 h (`DEFAULT_CATALOG_TTL_MS`) n'est évalué que si quelqu'un OUVRE la console.
 * Sans balayage de fond, un fournisseur qui retire un modèle — OpenCode Go le fait
 * périodiquement — casse les corrections jusqu'à ce qu'un utilisateur le signale.
 *
 * Module feuille : aucun import de DB ni d'Express, le travail à faire est INJECTÉ. C'est ce
 * qui rend la planification testable en millisecondes au lieu d'une semaine.
 */

/** 7 jours. Cadence de fond ; le TTL de 6 h reste celui de la console, les deux se complètent. */
export const DEFAULT_SWEEP_MS = 7 * 24 * 60 * 60_000;

/** Une seconde sonde ne doit jamais se superposer à la précédente encore en vol. */
const MIN_SWEEP_MS = 60_000;

/**
 * Intervalle effectif. Une valeur d'env absurde (0, négative, texte, vide) retombe sur le
 * défaut ; une valeur trop petite est relevée à 1 min, pour qu'une faute de frappe dans
 * `MODEL_CATALOG_SWEEP_MS` ne transforme pas le balayage en martèlement des API fournisseurs.
 */
export function resolveSweepMs(raw: string | undefined): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_SWEEP_MS;
  return Math.max(MIN_SWEEP_MS, n);
}

export interface SweepHandle {
  stop: () => void;
  /** Intervalle réellement retenu — exposé pour le journal de démarrage et les tests. */
  intervalMs: number;
}

export interface SweepOptions {
  intervalMs?: number;
  /** Appelé quand le balayage a réaligné la configuration d'au moins une app. */
  onDrift?: (apps: string[]) => void;
  onError?: (e: Error) => void;
}

/**
 * Démarre le balayage. Ne déclenche PAS de sonde immédiate : l'appelant s'en charge déjà au
 * démarrage, et sonder deux fois de suite n'apprend rien.
 *
 * @param run travail d'un passage — en pratique `refreshAllCatalogs`, dont les clés du résultat
 *            sont les apps dont la configuration a dû être réalignée.
 */
export function startCatalogSweep(
  run: () => Promise<Record<string, unknown>>,
  opts: SweepOptions = {},
): SweepHandle {
  const intervalMs = opts.intervalMs ?? resolveSweepMs(process.env.MODEL_CATALOG_SWEEP_MS);
  // Un passage qui traîne (fournisseur lent, plusieurs clés à sonder) ne doit pas voir le
  // suivant démarrer par-dessus : on saute le tour plutôt que d'empiler les requêtes.
  let enCours = false;

  const tick = async (): Promise<void> => {
    if (enCours) return;
    enCours = true;
    try {
      const drift = await run();
      const apps = Object.keys(drift ?? {});
      if (apps.length > 0) opts.onDrift?.(apps);
    } catch (e) {
      opts.onError?.(e as Error);
    } finally {
      enCours = false;
    }
  };

  const timer = setInterval(() => void tick(), intervalMs);
  // Ne jamais retenir la boucle d'événements : un balayage en attente ne doit pas empêcher le
  // process de se terminer (arrêt de service, fin d'un test).
  timer.unref?.();

  return {stop: () => clearInterval(timer), intervalMs};
}
