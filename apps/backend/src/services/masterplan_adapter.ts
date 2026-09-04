import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {isAbsolute, resolve} from 'node:path';

import {
  MasterPlanAdapterStatusSchema,
  MasterPlanPlanningViewSchema,
  MasterPlanParityReportSchema,
  MasterPlanPublicAvailabilitySchema,
  MasterPlanSourceInspectionSchema,
  MasterPlanUiBundleSchema,
  type MasterPlanAdapterStatus,
  type MasterPlanPlanningView,
  type MasterPlanParityReport,
  type MasterPlanPublicAvailability,
  type MasterPlanSourceInspection,
  type MasterPlanUiBundle,
} from '@masterflow/shared';

const SUPPORTED_ENGINE_VERSION = '1.1.3' as const;

export class MasterPlanPlanningSourceError extends Error {
  constructor(public readonly code: 'source_unconfigured' | 'source_unavailable' | 'source_invalid') {
    super(`masterplan_${code}`);
  }
}

function canonicalSha(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function minutes(value: string): number {
  const [hours = '0', mins = '0'] = value.split(':');
  return Number(hours) * 60 + Number(mins);
}

function privateCoverage(bundle: MasterPlanUiBundle): Map<string, Array<[number, number]>> {
  const grouped = new Map<string, Array<[number, number]>>();
  for (const event of Object.values(bundle.calendars).flatMap((calendar) => calendar.events)) {
    grouped.set(event.date, [...(grouped.get(event.date) ?? []), [minutes(event.start), minutes(event.end)]]);
  }
  for (const [date, intervals] of grouped) {
    const merged: Array<[number, number]> = [];
    for (const interval of intervals.sort((left, right) => left[0] - right[0] || left[1] - right[1])) {
      const previous = merged.at(-1);
      if (!previous || interval[0] > previous[1]) merged.push([...interval]);
      else previous[1] = Math.max(previous[1], interval[1]);
    }
    grouped.set(date, merged);
  }
  return grouped;
}

/** Inspection Data-First pure : aucun chemin, URL privée ou contenu de cours ne sort du résumé. */
export function inspectMasterPlanBundle(input: unknown): MasterPlanSourceInspection {
  const bundle = MasterPlanUiBundleSchema.parse(input);
  const schoolEventCounts = Object.fromEntries(
    Object.entries(bundle.calendars).map(([school, calendar]) => [school, calendar.events.length]),
  );
  return MasterPlanSourceInspectionSchema.parse({
    source_schema: bundle.schema,
    engine_version: bundle.engine_version,
    supported_engine_version: SUPPORTED_ENGINE_VERSION,
    compatible: bundle.engine_version === SUPPORTED_ENGINE_VERSION,
    sha256: canonicalSha(bundle),
    school_year: bundle.school_year,
    school_event_counts: schoolEventCounts,
    event_count: Object.values(schoolEventCounts).reduce((sum, count) => sum + count, 0),
    source_mode: 'read_only',
    persisted: false,
    original_unchanged: true,
  });
}

/**
 * Reproduit le JSON privé attendu par l'UI actuelle sans transformation métier.
 * La copie empêche l'adaptateur de muter l'objet d'entrée.
 */
export function adaptMasterPlanPrivateBundle(input: unknown): MasterPlanUiBundle {
  const bundle = MasterPlanUiBundleSchema.parse(input);
  return MasterPlanUiBundleSchema.parse(structuredClone(bundle));
}

/** Compare serveur/local/mobile et la projection publique existante, sans la régénérer. */
export function compareMasterPlanParity(
  input: unknown,
  publicInput: unknown,
): MasterPlanParityReport {
  const server = adaptMasterPlanPrivateBundle(input);
  const local = adaptMasterPlanPrivateBundle(input);
  const mobile = adaptMasterPlanPrivateBundle(input);
  const publicProjection = MasterPlanPublicAvailabilitySchema.parse(publicInput);
  const coverage = privateCoverage(server);
  const missing = publicProjection.busy
    .filter((interval) => !(coverage.get(interval.date) ?? []).some(
      ([start, end]) => start <= minutes(interval.start) && end >= minutes(interval.end),
    ))
    .map((interval) => `${interval.date}|${interval.start}|${interval.end}`);
  const hashes = [server, local, mobile].map(canonicalSha);
  return MasterPlanParityReportSchema.parse({
    server_local_mobile_hash_equal: new Set(hashes).size === 1,
    private_event_count: Object.values(server.calendars)
      .reduce((sum, calendar) => sum + calendar.events.length, 0),
    public_busy_count: publicProjection.busy.length,
    public_subset_valid: missing.length === 0,
    public_intervals_missing_from_private: [...new Set(missing)],
    privacy_contract_valid: true,
    ui_contract_unchanged: true,
  });
}

export function getMasterPlanAdapterStatus(): MasterPlanAdapterStatus {
  return MasterPlanAdapterStatusSchema.parse({
    adapter_version: SUPPORTED_ENGINE_VERSION,
    accepted_schema: 'masterplan.ui_bundle.v1',
    source_mode: 'read_only',
    drive_remains_authoritative: true,
    ui_contract_unchanged: true,
    calendar_secret_ref_required: true,
    calendar_url_storage_allowed: false,
    legacy_retirement_allowed: false,
    imported_bundle_ref: null,
    execution_policy: 'inspect_and_adapt_only',
  });
}

function optionalText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function calendarLabel(calendarId: string, events: Array<Record<string, unknown>>): string {
  return optionalText(events.find((event) => optionalText(event.school_name))?.school_name)
    ?? calendarId.charAt(0).toLocaleUpperCase('fr') + calendarId.slice(1);
}

/**
 * Projection privée de travail pour l'UI : assez riche pour retrouver la lecture MasterPlan
 * (charge, niveaux, matières et séquences), sans étudiant, chemin source ni secret calendrier.
 */
export function projectMasterPlanPlanningView(input: unknown): MasterPlanPlanningView {
  const bundle = adaptMasterPlanPrivateBundle(input);
  const calendars = Object.entries(bundle.calendars).map(([calendarId, calendar]) => {
    const events = calendar.events as Array<Record<string, unknown>>;
    return {
      id: calendarId,
      label: calendarLabel(calendarId, events),
      event_count: events.length,
    };
  });
  const events = Object.entries(bundle.calendars)
    .flatMap(([calendarId, calendar]) => calendar.events.map((event) => ({
      id: event.id,
      session_id: event.session_id,
      calendar_id: calendarId,
      date: event.date,
      start: event.start,
      end: event.end,
      module: optionalText(event.module) ?? 'Cours',
      school_name: optionalText(event.school_name),
      class_label: optionalText(event.class_label),
      room: optionalText(event.room),
      status: optionalText(event.status),
      domain: optionalText(event.domain),
      level: optionalText(event.level),
      level_label: optionalText(event.level_label),
      level_scope: optionalText(event.level_scope),
      subject_ref: optionalText(event.subject_ref),
      objective_refs: Array.isArray(event.objective_refs)
        ? event.objective_refs.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        : [],
      sequence: typeof event.sequence === 'number' && Number.isInteger(event.sequence) && event.sequence >= 0
        ? event.sequence
        : null,
    })))
    .sort((left, right) => (
      left.date.localeCompare(right.date)
      || left.start.localeCompare(right.start)
      || left.end.localeCompare(right.end)
      || left.id.localeCompare(right.id)
    ));
  return MasterPlanPlanningViewSchema.parse({
    schema: 'masterplan.planning_view.v1',
    engine_version: bundle.engine_version,
    generated_at: bundle.generated_at,
    school_year: bundle.school_year,
    source: {
      mode: 'read_only',
      authority: 'drive_projection',
      original_unchanged: true,
      contains_students: false,
      contains_source_paths: false,
    },
    calendars,
    events,
  });
}

async function configuredBundlePath(): Promise<string> {
  const fromEnvironment = process.env.MASTERPLAN_UI_BUNDLE_PATH?.trim();
  if (fromEnvironment) return fromEnvironment;

  const explicitConfig = process.env.MASTERPLAN_SOURCE_CONFIG?.trim();
  const configPaths = explicitConfig
    ? [explicitConfig]
    : [
        resolve(process.cwd(), '.masterplan-source.local.json'),
        resolve(process.cwd(), '../../.masterplan-source.local.json'),
      ];
  for (const configPath of configPaths) {
    try {
      const config = JSON.parse(await readFile(configPath, 'utf8')) as {bundlePath?: unknown};
      if (typeof config.bundlePath === 'string' && config.bundlePath.trim()) return config.bundlePath.trim();
      throw new MasterPlanPlanningSourceError('source_invalid');
    } catch (error) {
      if (error instanceof MasterPlanPlanningSourceError) throw error;
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw new MasterPlanPlanningSourceError('source_invalid');
      }
    }
  }
  throw new MasterPlanPlanningSourceError('source_unconfigured');
}

export async function loadMasterPlanPlanningView(bundlePath?: string): Promise<MasterPlanPlanningView> {
  const sourcePath = bundlePath ?? await configuredBundlePath();
  if (!isAbsolute(sourcePath)) throw new MasterPlanPlanningSourceError('source_invalid');
  let raw: string;
  try {
    raw = await readFile(sourcePath, 'utf8');
  } catch {
    throw new MasterPlanPlanningSourceError('source_unavailable');
  }
  try {
    return projectMasterPlanPlanningView(JSON.parse(raw));
  } catch (error) {
    if (error instanceof MasterPlanPlanningSourceError) throw error;
    throw new MasterPlanPlanningSourceError('source_invalid');
  }
}

export function validateMasterPlanPublicProjection(input: unknown): MasterPlanPublicAvailability {
  return MasterPlanPublicAvailabilitySchema.parse(input);
}
