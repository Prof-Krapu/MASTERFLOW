import assert from 'node:assert/strict';
import {test} from 'node:test';

import Database from 'better-sqlite3';

/**
 * Garde-fou de DELETE /api/v1/admin/users/:id — « il doit rester au moins un admin
 * actif APRES la suppression ».
 *
 * La requête est rejouée telle quelle sur une base mémoire : la version d'origine
 * comptait les admins actifs SANS exclure la cible, ce qui refusait de supprimer un
 * admin *désactivé* dès qu'il ne restait qu'un seul admin actif — alors que supprimer
 * un compte inactif ne retire aucun admin actif.
 *
 * Rappel : requireAdmin (server/auth.ts) ne vérifie que le rôle en session, pas
 * `active`. L'appelant peut donc lui-même être inactif — le comptage doit rester
 * une vraie requête, pas un raccourci « il y a forcément moi ».
 */

const REQUETE = "SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND active = 1 AND id <> ?";

function baseAvec(comptes: Array<{id: string; role: 'admin' | 'user'; active: 0 | 1}>) {
  const db = new Database(':memory:');
  db.exec(`CREATE TABLE users (
    id TEXT PRIMARY KEY,
    role TEXT NOT NULL CHECK (role IN ('admin','user')),
    active INTEGER NOT NULL DEFAULT 1
  );`);
  const ins = db.prepare('INSERT INTO users (id, role, active) VALUES (?, ?, ?)');
  for (const c of comptes) ins.run(c.id, c.role, c.active);
  return db;
}

/** true = la suppression est refusée. */
function bloque(db: Database.Database, cibleId: string): boolean {
  const row = db.prepare(REQUETE).get(cibleId) as {n: number} | undefined;
  return !row || row.n === 0;
}

test('supprimer un admin DESACTIVE reste possible tant qu un admin actif subsiste', () => {
  const db = baseAvec([
    {id: 'moi', role: 'admin', active: 1},
    {id: 'vieil-admin', role: 'admin', active: 0},
  ]);
  assert.equal(bloque(db, 'vieil-admin'), false,
    'un admin inactif ne compte pour aucun admin actif : le supprimer ne peut rien casser');
});

test('supprimer le SEUL admin actif est refuse', () => {
  const db = baseAvec([
    {id: 'moi', role: 'admin', active: 0},
    {id: 'seul-actif', role: 'admin', active: 1},
  ]);
  assert.equal(bloque(db, 'seul-actif'), true);
});

test('supprimer un admin actif parmi deux est autorise', () => {
  const db = baseAvec([
    {id: 'moi', role: 'admin', active: 1},
    {id: 'autre', role: 'admin', active: 1},
  ]);
  assert.equal(bloque(db, 'autre'), false);
});

test('les comptes non-admin ne comptent jamais comme filet de securite', () => {
  const db = baseAvec([
    {id: 'seul-admin', role: 'admin', active: 1},
    {id: 'prof1', role: 'user', active: 1},
    {id: 'prof2', role: 'user', active: 1},
  ]);
  assert.equal(bloque(db, 'seul-admin'), true,
    'dix enseignants actifs ne remplacent pas un administrateur');
});

test('la version d origine (sans exclusion de la cible) refusait a tort', () => {
  const db = baseAvec([
    {id: 'moi', role: 'admin', active: 1},
    {id: 'vieil-admin', role: 'admin', active: 0},
  ]);
  const origine = db
    .prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND active = 1")
    .get() as {n: number};
  assert.equal(origine.n <= 1, true, 'reproduit le refus injustifie corrige par ce commit');
  assert.equal(bloque(db, 'vieil-admin'), false, 'la version corrigee autorise');
});
