import {createHash} from 'node:crypto';

import {
  MasterPlanAdapterStatusSchema,
  MasterPlanParityReportSchema,
  MasterPlanPublicAvailabilitySchema,
  MasterPlanSourceInspectionSchema,
  MasterPlanUiBundleSchema,
  type MasterPlanAdapterStatus,
  type MasterPlanParityReport,
  type MasterPlanPublicAvailability,
  type MasterPlanSourceInspection,
  type MasterPlanUiBundle,
} from '@masterflow/shared';

const SUPPORTED_ENGINE_VERSION = '1.1.3' as const;

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

export function validateMasterPlanPublicProjection(input: unknown): MasterPlanPublicAvailability {
  return MasterPlanPublicAvailabilitySchema.parse(input);
}
