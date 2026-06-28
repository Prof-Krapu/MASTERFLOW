import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import {recordDecisionTrace} from '../src/services/decision_trace.ts';

beforeAll(async () => {
  await seedAll();
});

describe('decision trace', () => {
  it('conserve alternatives, sources et état d’approbation dans l’audit existant', () => {
    const trace = recordDecisionTrace({
      scope: 'project:test',
      trace: {
        decision_id: 'decision-test',
        category: 'mode_handoff',
        subject: 'Passer du projet au workbench narratif',
        options_considered: [
          {
            option_id: 'stay',
            label: 'Rester en projet',
            score: 0.4,
            reason: 'Le projet peut continuer sans narration.',
            rejected_because: 'La structure narrative est demandée.',
          },
          {
            option_id: 'story',
            label: 'Ouvrir Story',
            score: 0.9,
            reason: 'Le brief contient personnages, enjeux et progression.',
            rejected_because: null,
          },
        ],
        selected_option_id: 'story',
        reason: 'Le passage crée seulement un candidat et conserve les sources.',
        confidence: 0.9,
        human_approval: 'pending',
        source_refs: ['project:test', 'brief:test'],
      },
    });
    expect(trace.human_approval).toBe('pending');

    const row = getDb()
      .prepare(
        `SELECT detail_json FROM audit_logs
         WHERE event_type = 'decision.recorded'
         ORDER BY created_at DESC LIMIT 1`,
      )
      .get() as {detail_json: string};
    expect(JSON.parse(row.detail_json)).toMatchObject({
      decision_id: 'decision-test',
      selected_option_id: 'story',
      human_approval: 'pending',
    });
  });
});
