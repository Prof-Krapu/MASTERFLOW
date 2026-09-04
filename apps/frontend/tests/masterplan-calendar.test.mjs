import assert from 'node:assert/strict';
import test from 'node:test';

import {addDays, dateKey, groupMonths, isoWeekInfo, mondayOf} from '../src/masterplan-calendar.ts';

test('le planning conserve les numéros ISO de l’année civile', () => {
  assert.deepEqual(isoWeekInfo(new Date(2026, 7, 31)), {week: 36, year: 2026});
  assert.deepEqual(isoWeekInfo(new Date(2026, 11, 28)), {week: 53, year: 2026});
  assert.deepEqual(isoWeekInfo(new Date(2027, 0, 4)), {week: 1, year: 2027});
});

test('la navigation s’aligne toujours sur le lundi civil', () => {
  assert.equal(dateKey(mondayOf(new Date(2026, 8, 3))), '2026-08-31');
  assert.equal(dateKey(addDays(new Date(2026, 7, 31), 7)), '2026-09-07');
});

test('les mois du ruban suivent le jeudi majoritaire de chaque semaine', () => {
  const starts = [new Date(2026, 7, 31), new Date(2026, 8, 7), new Date(2026, 8, 14), new Date(2026, 8, 21), new Date(2026, 8, 28)];
  assert.deepEqual(groupMonths(starts).map(({label, weeks}) => ({label, weeks})), [
    {label: 'SEPT 26', weeks: 4},
    {label: 'OCT 26', weeks: 1},
  ]);
});
