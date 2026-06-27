import {beforeAll, describe, expect, it} from 'vitest';

import {seedAll} from '../src/db/seed.ts';
import {listSignals} from '../src/services/weather_engine.ts';

beforeAll(async () => {
  await seedAll();
});

describe('PedagogicalSignals', () => {
  it('listSignals returns array for valid project scope', () => {
    const result = listSignals('MASTERFLOW_narrative');
    expect(Array.isArray(result)).toBe(true);
  });

  it('listSignals returns empty array for unknown scope', () => {
    const result = listSignals('nonexistent_scope');
    expect(result).toEqual([]);
  });
});
