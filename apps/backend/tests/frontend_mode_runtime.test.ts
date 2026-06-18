import {describe, expect, it} from 'vitest';

import {canUseMode, WORK_MODES} from '../../frontend/src/mode-runtime.ts';

describe('frontend mode runtime', () => {
  it('reserve Teaching aux professeurs et au godmode', () => {
    const teaching = WORK_MODES.find((mode) => mode.id === 'teaching');
    expect(teaching).toBeDefined();
    if (!teaching) return;

    expect(canUseMode(teaching, 'student')).toBe(false);
    expect(canUseMode(teaching, 'teacher')).toBe(true);
    expect(canUseMode(teaching, 'admin')).toBe(false);
    expect(canUseMode(teaching, 'godmode')).toBe(true);
  });
});
