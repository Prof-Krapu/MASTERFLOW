import {beforeAll, describe, expect, it} from 'vitest';

import {getRegistryEntry} from '../src/engines/action_registry.ts';
import {getDb, type RoomRow} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';

beforeAll(async () => {
  await seedAll();
});

describe('Learning mode — exposition progressive', () => {
  it('ajoute Learning aux Home seedées sans retirer les modes existants', () => {
    const homes = getDb()
      .prepare("SELECT * FROM rooms WHERE type = 'home'")
      .all() as RoomRow[];

    expect(homes.length).toBeGreaterThanOrEqual(2);
    for (const room of homes) {
      const context = JSON.parse(room.context_json ?? '{}') as {
        active_mode_cycle?: string[];
      };
      expect(context.active_mode_cycle).toEqual(
        expect.arrayContaining(['home', 'teaching', 'learning', 'inventory']),
      );
    }
  });

  it('n’élargit que la lecture Learning au rôle student', () => {
    expect(getRegistryEntry('view_learning_profile')?.minimum_role).toBe('student');
    expect(getRegistryEntry('manage_learning_profile')?.minimum_role).toBe('teacher');
    expect(getRegistryEntry('record_help_context')?.minimum_role).toBe('teacher');
  });
});
