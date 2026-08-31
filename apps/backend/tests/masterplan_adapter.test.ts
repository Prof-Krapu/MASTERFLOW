import {describe, expect, it} from 'vitest';
import {MasterPlanCalendarSourceSchema} from '@masterflow/shared';

import {
  adaptMasterPlanPrivateBundle,
  compareMasterPlanParity,
  getMasterPlanAdapterStatus,
  inspectMasterPlanBundle,
} from '../src/services/masterplan_adapter.ts';

const bundle = {
  schema: 'masterplan.ui_bundle.v1',
  engine_version: '1.1.3',
  generated_at: '2026-08-31T00:00:00Z',
  school_year: '2026-2027',
  calendars: {
    iscom: {
      events: [{
        id: 'event-1',
        session_id: 'event-1',
        date: '2026-09-01',
        start: '09:00',
        end: '12:00',
        module: 'Privé',
        source_ref: '/private/source.json',
      }],
    },
  },
  classes: {classes: []},
  groups: {groups: []},
  students: {students: []},
  course_context: {modules: []},
  notifications: {notifications: []},
};

const publicProjection = {
  schema: 'masterplan.public_availability.v1',
  generated_at: '2026-08-31T00:00:00Z',
  school_year: '2026-2027',
  timezone: 'Europe/Paris',
  privacy: {
    anonymous: true,
    contains_course_titles: false,
    contains_schools: false,
    contains_classes: false,
    contains_rooms: false,
    contains_students: false,
  },
  busy: [{date: '2026-09-01', start: '09:00', end: '12:00', status: 'busy'}],
};

describe('MasterPlan Data-First adapter', () => {
  it('inspecte la 1.1.3 sans persister ni exposer les détails privés', () => {
    const inspection = inspectMasterPlanBundle(bundle);
    expect(inspection).toMatchObject({
      compatible: true,
      event_count: 1,
      source_mode: 'read_only',
      persisted: false,
      original_unchanged: true,
    });
    expect(JSON.stringify(inspection)).not.toContain('/private/source.json');
    expect(JSON.stringify(inspection)).not.toContain('Privé');
  });

  it('reproduit le bundle privé sans mutation et prouve la projection publique', () => {
    const adapted = adaptMasterPlanPrivateBundle(bundle);
    expect(adapted).not.toBe(bundle);
    expect(adapted).toEqual(bundle);
    expect(compareMasterPlanParity(bundle, publicProjection)).toMatchObject({
      server_local_mobile_hash_equal: true,
      public_subset_valid: true,
      privacy_contract_valid: true,
      ui_contract_unchanged: true,
    });
  });

  it('interdit une URL ICS en clair dans le contrat de source', () => {
    expect(MasterPlanCalendarSourceSchema.parse({
      source_id: 'calendar-iscom',
      label: 'ISCOM',
      secret_ref: 'secret:keychain/masterplan/iscom',
      status: 'candidate',
    }).secret_ref).toBe('secret:keychain/masterplan/iscom');
    expect(() => MasterPlanCalendarSourceSchema.parse({
      source_id: 'calendar-iscom',
      label: 'ISCOM',
      secret_ref: 'secret:keychain/masterplan/iscom',
      url: 'https://calendar.example/private.ics',
      status: 'candidate',
    })).toThrow();
  });

  it('maintient le Drive et les applications actuelles comme autorité pendant la parité', () => {
    expect(getMasterPlanAdapterStatus()).toMatchObject({
      drive_remains_authoritative: true,
      ui_contract_unchanged: true,
      legacy_retirement_allowed: false,
      imported_bundle_ref: null,
      execution_policy: 'inspect_and_adapt_only',
    });
  });
});
