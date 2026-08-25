import 'dotenv/config';

import {MODEL_TASKS} from '../lib/model-routing.ts';
import {getDb} from '../server/db.ts';
import {decryptValueJson} from '../server/secrets-at-rest.ts';

/** Lecture seule : affiche le routage par tâche effectivement stocké, par app. */
function lire(app: string, key: string): unknown {
  const row = getDb()
    .prepare<[string, string], {value_json: string}>(
      'SELECT value_json FROM global_settings WHERE app = ? AND key = ?',
    )
    .get(app, key);
  if (!row) return undefined;
  try {
    return JSON.parse(decryptValueJson(row.value_json));
  } catch {
    return undefined;
  }
}

const apps = getDb()
  .prepare<[], {app: string}>(
    "SELECT DISTINCT app FROM global_settings WHERE key = 'corrector_model_routing' ORDER BY app",
  )
  .all()
  .map((r) => r.app);

const cles = MODEL_TASKS.map((t) => t.key);
for (const app of apps) {
  const r = lire(app, 'corrector_model_routing') as Record<string, {primary: string; fallbacks: string[]}>;
  const albert = String(lire(app, 'corrector_base_url') ?? '').includes('albert');
  const manquantes = cles.filter((k) => !r?.[k]);
  console.log(`${albert ? 'ALBERT' : '      '} ${app.padEnd(7)} ${manquantes.length ? 'CLES MANQUANTES: ' + manquantes.join(',') : 'les 7 tâches présentes'}`);
  if (albert) {
    for (const k of cles) {
      const p = r[k]!;
      console.log(`         ${k.padEnd(12)} ${p.primary}${p.fallbacks.length ? '  [repli: ' + p.fallbacks.join(', ') + ']' : '  [sans repli]'}`);
    }
  } else {
    const p = r.profile!, s = r.structure!;
    console.log(`         profile=${p.primary}   structure=${s.primary}`);
  }
}
