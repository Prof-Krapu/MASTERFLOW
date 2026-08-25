import 'dotenv/config';

import {getDb, type UserRow} from '../server/db.ts';
import {decryptValueJson, encryptIfSensitive} from '../server/secrets-at-rest.ts';

/**
 * Comble les `fallbacks: []` des routes `profile` et `structure` déjà en base.
 *
 * Pourquoi un script à part de `patch-routing-fallbacks.ts` : ce dernier déduit le repli du
 * FOURNISSEUR (règles écrites en dur pour Mistral et Albert), et sa règle Albert pour `profile`
 * s'est révélée fausse — elle proposait gpt-oss-120b, qui ne peut structurellement pas répondre
 * dans les 800 à 3 000 tokens de ces routes (raisonnement décompté de `max_tokens`, mesuré 0/3,
 * contenu VIDE). Ces deux routes en ont donc été retirées le 2026-07-30.
 *
 * Ici, aucune règle par fournisseur : le repli est pris parmi les modèles que l'admin utilise
 * DÉJÀ dans cette app (primaire de `correction`, puis de `ocr`). Un modèle déjà en production
 * sur le même compte est un secours plus sûr qu'un nom deviné, et la logique marche pour
 * n'importe quel fournisseur — y compris ceux qu'aucun préréglage ne connaît.
 *
 * Ne touche QUE les listes VIDES : un repli choisi par un admin n'est jamais remplacé, et le
 * primaire n'est jamais modifié (sur `pc`, `kimi-for-coding` en primaire est un choix délibéré
 * — il préserve le quota de k3-256k).
 *
 * Usage (depuis la racine de API_manage) :
 *   npx tsx scripts/patch-profile-structure-fallbacks.ts            # simulation
 *   npx tsx scripts/patch-profile-structure-fallbacks.ts --apply    # applique
 */

type Policy = {primary: string; fallbacks: string[]};
type Routing = Record<string, Policy>;

/** Les deux routes visées : les plus petits budgets de sortie de la suite. */
const CIBLES = ['profile', 'structure'] as const;
/** Où puiser un secours, dans l'ordre : des modèles déjà en service dans cette app. */
const SOURCES = ['correction', 'ocr', 'bareme', 'assistant'] as const;

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

async function main(): Promise<void> {
  const applique = process.argv.includes('--apply');
  const db = getDb();

  const admin = db
    .prepare<[], UserRow>(
      "SELECT * FROM users WHERE role = 'admin' AND active = 1 ORDER BY created_at ASC LIMIT 1",
    )
    .get();
  if (!admin) throw new Error('Aucun admin actif — exécuter `npm run seed:admin` avant.');

  const apps = db
    .prepare<[], {app: string}>(
      "SELECT DISTINCT app FROM global_settings WHERE key = 'corrector_model_routing' ORDER BY app",
    )
    .all()
    .map((r) => r.app);

  console.log(
    applique
      ? '[patch-profile-structure] MODE ÉCRITURE'
      : '[patch-profile-structure] simulation (--apply pour écrire)',
  );
  console.log('---');

  const aEcrire: Array<{app: string; routing: Routing}> = [];
  let changements = 0;

  for (const app of apps) {
    const routing = lire(app, 'corrector_model_routing') as Routing | undefined;
    if (!routing) continue;
    const suivant: Routing = {...routing};
    let touche = false;

    for (const cible of CIBLES) {
      const p = suivant[cible];
      if (!p) {
        console.log(`${app} · ${cible} absente — laissée à normalizeRouting().`);
        continue;
      }
      if (p.fallbacks.length > 0) {
        console.log(`${app} · ${cible} a déjà un secours (${p.fallbacks.join(', ')}) — inchangée.`);
        continue;
      }
      const candidat = SOURCES.map((s) => suivant[s]?.primary?.trim())
        .find((m): m is string => Boolean(m) && m !== p.primary);
      if (!candidat) {
        console.log(
          `${app} · ${cible} SANS secours et aucun autre modèle en service dans cette app — ` +
            'rien à proposer sans deviner un nom.',
        );
        continue;
      }
      suivant[cible] = {primary: p.primary, fallbacks: [candidat]};
      console.log(`${app} · ${cible} : ${p.primary} [sans repli] → repli ${candidat}`);
      touche = true;
      changements += 1;
    }

    if (touche) aEcrire.push({app, routing: suivant});
  }

  console.log('---');
  if (changements === 0) {
    console.log('[patch-profile-structure] toutes les routes ont un secours, rien à faire.');
    return;
  }
  if (!applique) {
    console.log(`[patch-profile-structure] ${changements} repli(s) à poser (--apply).`);
    return;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `data/api-manage.db.bak-${stamp}`;
  await db.backup(backupPath);
  console.log(`[patch-profile-structure] backup : ${backupPath}`);

  db.transaction(() => {
    for (const {app, routing} of aEcrire) {
      db.prepare(
        `INSERT INTO global_settings (app, key, value_json, updated_at, updated_by)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(app, key) DO UPDATE SET
           value_json = excluded.value_json,
           updated_at = excluded.updated_at,
           updated_by = excluded.updated_by`,
      ).run(
        app,
        'corrector_model_routing',
        encryptIfSensitive('corrector_model_routing', JSON.stringify(routing)),
        Date.now(),
        admin.id,
      );
    }
  })();

  console.log(`[patch-profile-structure] ${changements} repli(s) posé(s) sur ${aEcrire.length} app(s).`);
}

void main().catch((e: unknown) => {
  console.error('[patch-profile-structure]', e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
