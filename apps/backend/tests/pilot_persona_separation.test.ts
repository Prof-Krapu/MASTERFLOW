import {beforeAll, describe, expect, it} from 'vitest';

import {getDb, type RoomRow} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';

const talentsRoomId = 'talents-creatifs-pilot-room-v1';

function activePersonaForTalents(): unknown {
  const row = getDb()
    .prepare<[string], RoomRow>('SELECT * FROM rooms WHERE id = ?')
    .get(talentsRoomId);
  const context = JSON.parse(row?.context_json ?? '{}') as Record<string, unknown>;
  return context['active_persona'];
}

describe('séparation pilote Talents Créatifs / identité Vincent', () => {
  beforeAll(async () => {
    await seedAll();
  });

  it('utilise l’assistant système neutre plutôt que ProfKrapu', () => {
    expect(activePersonaForTalents()).toBe('masterflow-system-001');
  });

  it('réconcilie idempotemment une ancienne Room encore liée à ProfKrapu', async () => {
    const db = getDb();
    const row = db
      .prepare<[string], RoomRow>('SELECT * FROM rooms WHERE id = ?')
      .get(talentsRoomId)!;
    const context = JSON.parse(row.context_json ?? '{}') as Record<string, unknown>;
    db.prepare('UPDATE rooms SET context_json = ? WHERE id = ?').run(
      JSON.stringify({...context, active_persona: 'profkrapu-001'}),
      talentsRoomId,
    );

    await seedAll();

    expect(activePersonaForTalents()).toBe('masterflow-system-001');
  });
});
