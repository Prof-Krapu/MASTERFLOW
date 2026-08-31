#!/usr/bin/env node

import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';

const [bundlePath, publicPath] = process.argv.slice(2);
if (!bundlePath) {
  console.error('usage: npm run masterplan:inspect -- <masterplan_UI_CURRENT.json> [availability.json]');
  process.exit(2);
}

const bundle = JSON.parse(await readFile(bundlePath, 'utf8'));
if (bundle?.schema !== 'masterplan.ui_bundle.v1') throw new Error('masterplan_bundle_schema_invalid');
const calendars = bundle.calendars && typeof bundle.calendars === 'object' ? bundle.calendars : {};
const eventCounts = Object.fromEntries(
  Object.entries(calendars).map(([school, calendar]) => [school, Array.isArray(calendar?.events) ? calendar.events.length : 0]),
);
const toMinutes = (value) => {
  const [hours = '0', minutes = '0'] = value.split(':');
  return Number(hours) * 60 + Number(minutes);
};
const privateCoverage = new Map();
for (const event of Object.values(calendars).flatMap((calendar) => Array.isArray(calendar?.events) ? calendar.events : [])) {
  privateCoverage.set(event.date, [...(privateCoverage.get(event.date) || []), [toMinutes(event.start), toMinutes(event.end)]]);
}
for (const [date, intervals] of privateCoverage) {
  const merged = [];
  for (const interval of intervals.sort((left, right) => left[0] - right[0] || left[1] - right[1])) {
    const previous = merged.at(-1);
    if (!previous || interval[0] > previous[1]) merged.push([...interval]);
    else previous[1] = Math.max(previous[1], interval[1]);
  }
  privateCoverage.set(date, merged);
}
const report = {
  schema: bundle.schema,
  engine_version: bundle.engine_version,
  supported_engine_version: '1.1.3',
  compatible: bundle.engine_version === '1.1.3',
  sha256: createHash('sha256').update(JSON.stringify(bundle)).digest('hex'),
  school_year: bundle.school_year,
  school_event_counts: eventCounts,
  event_count: Object.values(eventCounts).reduce((sum, count) => sum + count, 0),
  source_mode: 'read_only',
  persisted: false,
  original_unchanged: true,
};
if (publicPath) {
  const projection = JSON.parse(await readFile(publicPath, 'utf8'));
  const busy = Array.isArray(projection?.busy) ? projection.busy : [];
  const missing = busy.filter((event) => !(privateCoverage.get(event.date) || []).some(
    ([start, end]) => start <= toMinutes(event.start) && end >= toMinutes(event.end),
  )).map((event) => `${event.date}|${event.start}|${event.end}`);
  report.parity = {
    public_schema: projection?.schema,
    public_busy_count: busy.length,
    public_subset_valid: missing.length === 0,
    missing_interval_count: new Set(missing).size,
    privacy_contract_valid: projection?.privacy?.anonymous === true
      && projection?.privacy?.contains_course_titles === false
      && projection?.privacy?.contains_schools === false
      && projection?.privacy?.contains_classes === false
      && projection?.privacy?.contains_rooms === false
      && projection?.privacy?.contains_students === false,
  };
}
console.log(JSON.stringify(report, null, 2));
