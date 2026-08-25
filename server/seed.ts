import 'dotenv/config';

import {hashPassword} from './auth.ts';
import {getDb, type UserRow} from './db.ts';
import {uuid} from '@/lib/utils.ts';

/**
 * Crée ou met à jour le compte admin à partir des variables d'environnement.
 *
 * Comportement :
 * - ADMIN_USERNAME absent : ne rien faire (utile pour tests).
 * - User absent : créer avec rôle 'admin', actif, password hashé.
 * - User présent : forcer role='admin' + active=1, re-hasher le password si fourni
 *   (permet de changer ADMIN_PASSWORD dans .env et redémarrer).
 *
 * Appelée :
 * - automatiquement au boot d'Express (server/index.ts),
 * - manuellement via `npm run seed:admin` pour reset de mdp ponctuel.
 */
export async function seedAdmin(): Promise<{action: 'created' | 'updated' | 'skipped'; username: string | null}> {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username) {
    return {action: 'skipped', username: null};
  }
  if (!password) {
    throw new Error('ADMIN_PASSWORD requis quand ADMIN_USERNAME est défini.');
  }

  const db = getDb();
  const existing = db
    .prepare<[string], UserRow>('SELECT * FROM users WHERE username = ?')
    .get(username);

  const hash = await hashPassword(password);
  const now = Date.now();

  if (!existing) {
    db.prepare(
      `INSERT INTO users (id, username, password_hash, role, active, created_at) VALUES (?, ?, ?, 'admin', 1, ?)`,
    ).run(uuid(), username, hash, now);
    return {action: 'created', username};
  }

  db.prepare(`UPDATE users SET password_hash = ?, role = 'admin', active = 1 WHERE username = ?`).run(hash, username);
  return {action: 'updated', username};
}

// Permet `npm run seed:admin` (tsx server/seed.ts)
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  seedAdmin()
    .then((r) => {
      console.log(`[seed] admin ${r.action}: ${r.username ?? '(none)'}`);
      process.exit(0);
    })
    .catch((e) => {
      console.error('[seed] failed:', e);
      process.exit(1);
    });
}
