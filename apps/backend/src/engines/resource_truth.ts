import type {ProposeResource, Resource} from '@masterflow/shared';
import {getDb} from '../db/schema.ts';
import type {ResourceRow} from '../db/schema.ts';
import {uuid} from '../lib/uuid.ts';

/**
 * Resource Truth Engine — registre des ressources contre l'hallucination.
 *
 * Invariant produit : l'IA ne renvoie JAMAIS de ressource inventée. Toute ressource
 * exposée par défaut a `status = 'validated'` (le canon). Une proposition (humaine ou IA)
 * entre en `'candidate'` et doit être validée explicitement avant d'être servie.
 * Le taux de tolérance à l'hallucination est littéralement 0.
 *
 * Une seule responsabilité : la persistance et le cycle de vie des ressources
 * (recherche, proposition, validation, dépréciation). Pas de logique de permission ici.
 */

/** Façonne une rangée BDD en DTO de contrat (subjects parsé depuis le JSON). */
export function toResourceDTO(row: ResourceRow): Resource {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    url: row.url,
    source: row.source,
    status: row.status,
    subjects: JSON.parse(row.subjects_json ?? 'null') as string[] | null,
  };
}

/**
 * Recherche de ressources.
 *
 * Par défaut, ne renvoie que `status = 'validated'` (anti-hallucination) ;
 * `includeAll = true` lève ce filtre (usage admin / inbox de validation).
 * `q` filtre sur le titre (LIKE) ou les sujets (subjects_json LIKE), insensible à la casse.
 */
export function searchResources(q?: string, includeAll?: boolean): Resource[] {
  const db = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (!includeAll) {
    conditions.push(`status = 'validated'`);
  }

  const term = q?.trim();
  if (term) {
    conditions.push('(title LIKE ? OR subjects_json LIKE ?)');
    const like = `%${term}%`;
    params.push(like, like);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db
    .prepare(`SELECT * FROM resources ${where} ORDER BY created_at DESC`)
    .all(...params) as ResourceRow[];

  return rows.map(toResourceDTO);
}

/**
 * Enregistre une proposition de ressource en `'candidate'`.
 * Une proposition n'est jamais servie par défaut : elle attend une validation humaine.
 */
export function proposeResource(body: ProposeResource): Resource {
  const db = getDb();
  const now = Date.now();
  const id = uuid();

  db.prepare(
    `INSERT INTO resources (id, type, title, url, source, status, subjects_json, created_at)
     VALUES (?, ?, ?, ?, ?, 'candidate', ?, ?)`,
  ).run(id, body.type, body.title, body.url ?? null, body.source, JSON.stringify(body.subjects), now);

  return getResourceOrThrow(id);
}

/** Promeut une ressource au canon (`status = 'validated'`). */
export function validateResource(id: string): Resource {
  return setStatus(id, 'validated');
}

/** Retire une ressource du canon (`status = 'deprecated'`). */
export function deprecateResource(id: string): Resource {
  return setStatus(id, 'deprecated');
}

// ───────────────────────── Helpers internes ─────────────────────────

/** Change le status d'une ressource et renvoie le DTO à jour. */
function setStatus(id: string, status: ResourceRow['status']): Resource {
  const db = getDb();
  db.prepare('UPDATE resources SET status = ? WHERE id = ?').run(status, id);
  return getResourceOrThrow(id);
}

/** Relit une ressource par id ; lève si absente (incohérence à signaler tôt). */
function getResourceOrThrow(id: string): Resource {
  const db = getDb();
  const row = db.prepare('SELECT * FROM resources WHERE id = ?').get(id) as ResourceRow | undefined;
  if (!row) throw new Error(`Ressource introuvable: ${id}`);
  return toResourceDTO(row);
}
