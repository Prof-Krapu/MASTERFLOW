#!/usr/bin/env node

import {createHash} from 'node:crypto';
import {chmodSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';

const [inputArg, outputArg] = process.argv.slice(2);
if (!inputArg || !outputArg) {
  throw new Error(
    'usage: npm run masterplan:project-runtime -- <masterplan_UI_CURRENT.json> <output.json>',
  );
}

const input = JSON.parse(readFileSync(resolve(inputArg), 'utf8'));
if (input?.schema !== 'masterplan.ui_bundle.v1' || input?.engine_version !== '1.1.3') {
  throw new Error('masterplan_runtime_projection_source_incompatible');
}
if (!input.calendars || typeof input.calendars !== 'object' || Array.isArray(input.calendars)) {
  throw new Error('masterplan_runtime_projection_calendars_invalid');
}

function requiredText(value, field) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`masterplan_runtime_projection_${field}_invalid`);
  }
  return value;
}

function optionalText(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

let eventCount = 0;
const calendars = Object.fromEntries(Object.entries(input.calendars).map(([calendarId, calendar]) => {
  if (!calendar || !Array.isArray(calendar.events)) {
    throw new Error(`masterplan_runtime_projection_calendar_invalid:${calendarId}`);
  }
  const events = calendar.events.map((event) => {
    eventCount += 1;
    return Object.fromEntries(Object.entries({
      id: requiredText(event?.id, 'event_id'),
      session_id: requiredText(event?.session_id, 'session_id'),
      date: requiredText(event?.date, 'date'),
      start: requiredText(event?.start, 'start'),
      end: requiredText(event?.end, 'end'),
      module: optionalText(event?.module),
      school_name: optionalText(event?.school_name),
      class_label: optionalText(event?.class_label),
      room: optionalText(event?.room),
      status: optionalText(event?.status),
    }).filter(([, value]) => value !== undefined));
  });
  return [calendarId, {events}];
}));

const projection = {
  schema: 'masterplan.ui_bundle.v1',
  engine_version: input.engine_version,
  generated_at: input.generated_at,
  school_year: input.school_year,
  calendars,
  classes: [],
  groups: [],
  students: [],
  course_context: {},
  notifications: [],
};

const serialized = `${JSON.stringify(projection, null, 2)}\n`;
const output = resolve(outputArg);
mkdirSync(dirname(output), {recursive: true});
writeFileSync(output, serialized, {mode: 0o600});
chmodSync(output, 0o600);

console.log(JSON.stringify({
  schema: projection.schema,
  engine_version: projection.engine_version,
  event_count: eventCount,
  calendar_count: Object.keys(calendars).length,
  contains_students: false,
  contains_groups: false,
  contains_source_paths: false,
  contains_calendar_urls: false,
  sha256: createHash('sha256').update(serialized).digest('hex'),
}, null, 2));
