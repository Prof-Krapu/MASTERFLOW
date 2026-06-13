import {createHash} from 'node:crypto';

import {
  ROLE_RANK,
  RagContextPackSchema,
  RagQueryRequestSchema,
  RagQueryResponseSchema,
  RagResourceChunkSchema,
  RagResourceSchema,
  RegisterRagResourceRequestSchema,
  type Job,
  type RagCitation,
  type RagContextPack,
  type RagQueryRequest,
  type RagQueryResponse,
  type RagResource,
  type RagResourceChunk,
  type RegisterRagResourceRequest,
} from '@masterflow/shared';

import {
  getDb,
  type RagContextPackRow,
  type RagResourceChunkRow,
  type RagResourceRow,
  type ResourceRow,
} from '../db/schema.ts';
import {audit} from '../lib/audit.ts';
import {uuid} from '../lib/uuid.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {createRagReindexJob} from './jobs.ts';
import {decideScopedPermission} from './projects.ts';

const SECRET_PATTERN =
  /(\.env|api[_-]?key|access[_-]?token|refresh[_-]?token|password|passwd|private[_-]?key|credential|authorization|begin [a-z ]*private key)/i;
const PACK_TTL_MS = 15 * 60 * 1000;

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function isAdmin(actor: AuthUser): boolean {
  return ROLE_RANK[actor.role] >= ROLE_RANK.admin;
}

function assertTeacher(actor: AuthUser): void {
  if (ROLE_RANK[actor.role] < ROLE_RANK.teacher) throw new Error('permission_denied');
}

function toResource(row: RagResourceRow): RagResource {
  return RagResourceSchema.parse({
    rag_resource_id: row.id,
    resource_id: row.resource_id,
    owner_id: row.owner_id,
    project_id: row.project_id,
    source_type: row.source_type,
    source_uri: row.source_uri,
    title: row.title,
    status: row.status,
    trust_status: row.trust_status,
    scope_type: row.scope_type,
    scope_id: row.scope_id,
    content_hash: row.content_hash,
    indexed_at: row.indexed_at,
    revoked_at: row.revoked_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
}

function toChunk(row: RagResourceChunkRow): RagResourceChunk {
  return RagResourceChunkSchema.parse({
    chunk_id: row.id,
    resource_id: row.resource_id,
    chunk_index: row.chunk_index,
    content_excerpt: row.content_excerpt,
    embedding_ref: row.embedding_ref,
    token_count: row.token_count,
    metadata: JSON.parse(row.metadata_json) as unknown,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
}

function toPack(row: RagContextPackRow): RagContextPack {
  return RagContextPackSchema.parse({
    pack_id: row.id,
    query_hash: row.query_hash,
    user_id: row.user_id,
    scope_type: row.scope_type,
    scope_id: row.scope_id,
    citations: JSON.parse(row.citations_json) as unknown,
    status: row.status,
    refusal_reason: row.refusal_reason,
    created_at: row.created_at,
    expires_at: row.expires_at,
  });
}

function getRagResourceRow(id: string): RagResourceRow | undefined {
  return getDb().prepare('SELECT * FROM rag_resources WHERE id = ?').get(id) as
    | RagResourceRow
    | undefined;
}

function canReadResource(actor: AuthUser, row: RagResourceRow): boolean {
  if (isAdmin(actor) || row.owner_id === actor.id) return true;
  if (row.scope_type !== 'project' || !row.project_id) return false;
  return decideScopedPermission({actor, projectId: row.project_id}).allowed;
}

function assertCanManageResource(actor: AuthUser, row: RagResourceRow): void {
  if (isAdmin(actor) || row.owner_id === actor.id) return;
  throw new Error('rag_resource_not_found');
}

function assertNoSecret(input: RegisterRagResourceRequest): void {
  if (SECRET_PATTERN.test(JSON.stringify(input))) throw new Error('rag_secret_detected');
}

function statusFromTruth(status: ResourceRow['status']): RagResourceRow['status'] {
  if (status === 'validated') return 'validated';
  if (status === 'deprecated') return 'deprecated';
  return 'candidate';
}

function trustFromTruth(status: ResourceRow['status']): RagResourceRow['trust_status'] {
  return status === 'validated' ? 'source_verified' : 'unverified';
}

function queryTerms(query: string): string[] {
  return [
    ...new Set(
      query
        .toLocaleLowerCase('fr')
        .split(/[^\p{L}\p{N}]+/u)
        .filter((term) => term.length >= 2),
    ),
  ];
}

function scoreExcerpt(terms: string[], excerpt: string): number {
  if (terms.length === 0) return 0;
  const normalized = excerpt.toLocaleLowerCase('fr');
  const hits = terms.filter((term) => normalized.includes(term)).length;
  return hits / terms.length;
}

function recordQuery(input: {
  actor: AuthUser;
  queryHash: string;
  scopeType: 'owner' | 'project';
  scopeId: string;
  resultCount: number;
  refusalReason: string | null;
}): void {
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO rag_query_events
         (id, user_id, query_hash, scope_type, scope_id, result_count, refusal_reason, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      uuid(),
      input.actor.id,
      input.queryHash,
      input.scopeType,
      input.scopeId,
      input.resultCount,
      input.refusalReason,
      now,
    );
  audit({
    event_type: 'rag.query',
    user_id: input.actor.id,
    scope: input.scopeId,
    detail: {
      query_hash: input.queryHash,
      result_count: input.resultCount,
      refusal_reason: input.refusalReason,
    },
  });
}

function createPack(input: {
  actor: AuthUser;
  queryHash: string;
  scopeType: 'owner' | 'project';
  scopeId: string;
  citations: RagCitation[];
  refusalReason: 'no_authorized_source' | 'no_reliable_source' | 'scope_denied' | null;
}): RagContextPack {
  const now = Date.now();
  const id = uuid();
  getDb()
    .prepare(
      `INSERT INTO rag_context_packs
         (id, query_hash, user_id, scope_type, scope_id, citations_json, status,
          refusal_reason, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.queryHash,
      input.actor.id,
      input.scopeType,
      input.scopeId,
      JSON.stringify(input.citations),
      input.refusalReason ? 'refused' : 'active',
      input.refusalReason,
      now,
      now + PACK_TTL_MS,
    );
  const row = getDb().prepare('SELECT * FROM rag_context_packs WHERE id = ?').get(id) as
    | RagContextPackRow
    | undefined;
  if (!row) throw new Error('rag_context_pack_not_found');
  return toPack(row);
}

export function registerRagResource(
  actor: AuthUser,
  input: RegisterRagResourceRequest,
): RagResource {
  assertTeacher(actor);
  const request = RegisterRagResourceRequestSchema.parse(input);
  assertNoSecret(request);
  if (request.project_id) {
    const allowed = decideScopedPermission({
      actor,
      projectId: request.project_id,
      minimumProjectRole: 'editor',
    }).allowed;
    if (!allowed) throw new Error('project_not_found');
  }
  const source = getDb().prepare('SELECT * FROM resources WHERE id = ?').get(request.resource_id) as
    | ResourceRow
    | undefined;
  if (!source) throw new Error('resource_not_found');

  const now = Date.now();
  const id = uuid();
  const scopeType = request.project_id ? 'project' : 'owner';
  const scopeId = request.project_id ?? actor.id;
  const contentHash = hash(request.chunks.join('\n'));
  try {
    getDb()
      .prepare(
        `INSERT INTO rag_resources
           (id, resource_id, owner_id, project_id, source_type, source_uri, title, status,
            trust_status, scope_type, scope_id, content_hash, indexed_at, revoked_at,
            created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
      )
      .run(
        id,
        source.id,
        actor.id,
        request.project_id ?? null,
        request.source_type,
        request.source_uri,
        source.title,
        statusFromTruth(source.status),
        trustFromTruth(source.status),
        scopeType,
        scopeId,
        contentHash,
        now,
        now,
        now,
      );
  } catch {
    throw new Error('rag_resource_exists');
  }

  const insertChunk = getDb().prepare(
    `INSERT INTO rag_resource_chunks
       (id, resource_id, chunk_index, content_excerpt, embedding_ref, token_count,
        metadata_json, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, NULL, ?, '{}', 'active', ?, ?)`,
  );
  request.chunks.forEach((excerpt, index) => {
    insertChunk.run(uuid(), id, index, excerpt, excerpt.split(/\s+/).length, now, now);
  });
  audit({
    event_type: 'rag.resource_registered',
    user_id: actor.id,
    scope: scopeId,
    detail: {rag_resource_id: id, resource_id: source.id, status: statusFromTruth(source.status)},
  });
  return getRagResource(actor, id);
}

export function listRagResources(actor: AuthUser): RagResource[] {
  const rows = getDb().prepare('SELECT * FROM rag_resources ORDER BY updated_at DESC').all() as RagResourceRow[];
  return rows.filter((row) => canReadResource(actor, row)).map(toResource);
}

export function getRagResource(actor: AuthUser, id: string): RagResource {
  const row = getRagResourceRow(id);
  if (!row || !canReadResource(actor, row)) throw new Error('rag_resource_not_found');
  return toResource(row);
}

export function listRagResourceChunks(actor: AuthUser, id: string): RagResourceChunk[] {
  getRagResource(actor, id);
  const rows = getDb()
    .prepare('SELECT * FROM rag_resource_chunks WHERE resource_id = ? ORDER BY chunk_index')
    .all(id) as RagResourceChunkRow[];
  return rows.map(toChunk);
}

export function queryRag(
  actor: AuthUser,
  input: Omit<RagQueryRequest, 'limit'> & {limit?: number},
): RagQueryResponse {
  const request = RagQueryRequestSchema.parse(input);
  const queryHash = hash(request.query.trim().toLocaleLowerCase('fr'));
  const scopeType = request.project_id ? 'project' : 'owner';
  const scopeId = request.project_id ?? actor.id;

  if (
    request.project_id &&
    !decideScopedPermission({actor, projectId: request.project_id}).allowed
  ) {
    const contextPack = createPack({
      actor,
      queryHash,
      scopeType,
      scopeId,
      citations: [],
      refusalReason: 'scope_denied',
    });
    recordQuery({actor, queryHash, scopeType, scopeId, resultCount: 0, refusalReason: 'scope_denied'});
    return RagQueryResponseSchema.parse({context_pack: contextPack, refusal_reason: 'scope_denied'});
  }

  const rows = getDb()
    .prepare(
      `SELECT c.*, r.title, r.source_uri, r.status AS resource_status,
              r.trust_status, r.scope_type, r.scope_id
       FROM rag_resource_chunks c
       INNER JOIN rag_resources r ON r.id = c.resource_id
       WHERE r.scope_type = ? AND r.scope_id = ?
         AND r.status = 'validated'
         AND r.trust_status IN ('source_verified','canonical','private_reference')
         AND r.revoked_at IS NULL
         AND r.indexed_at IS NOT NULL
         AND c.status = 'active'`,
    )
    .all(scopeType, scopeId) as Array<
    RagResourceChunkRow & {
      title: string;
      source_uri: string;
      resource_status: RagResourceRow['status'];
      trust_status: RagResourceRow['trust_status'];
      scope_type: RagResourceRow['scope_type'];
      scope_id: string;
    }
  >;
  const terms = queryTerms(request.query);
  const citations = rows
    .map((row) => ({row, score: scoreExcerpt(terms, row.content_excerpt)}))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, request.limit)
    .map(({row, score}) => ({
      resource_id: row.resource_id,
      chunk_id: row.id,
      title: row.title,
      source_uri: row.source_uri,
      status: row.resource_status,
      trust_status: row.trust_status,
      scope_type: row.scope_type,
      scope_id: row.scope_id,
      score,
      excerpt: row.content_excerpt.slice(0, 500),
    })) satisfies RagCitation[];
  const refusalReason = citations.length === 0 ? 'no_reliable_source' : null;
  const contextPack = createPack({
    actor,
    queryHash,
    scopeType,
    scopeId,
    citations,
    refusalReason,
  });
  recordQuery({actor, queryHash, scopeType, scopeId, resultCount: citations.length, refusalReason});
  return RagQueryResponseSchema.parse({context_pack: contextPack, refusal_reason: refusalReason});
}

export function getRagContextPack(actor: AuthUser, id: string): RagContextPack {
  const row = getDb().prepare('SELECT * FROM rag_context_packs WHERE id = ?').get(id) as
    | RagContextPackRow
    | undefined;
  if (!row || (row.user_id !== actor.id && !isAdmin(actor))) {
    throw new Error('rag_context_pack_not_found');
  }
  if (row.expires_at !== null && row.expires_at <= Date.now() && row.status === 'active') {
    getDb().prepare("UPDATE rag_context_packs SET status = 'expired' WHERE id = ?").run(id);
    return toPack({...row, status: 'expired'});
  }
  return toPack(row);
}

export function requestRagReindex(actor: AuthUser, id: string): Job {
  const row = getRagResourceRow(id);
  if (!row) throw new Error('rag_resource_not_found');
  assertCanManageResource(actor, row);
  if (row.status === 'revoked' || row.status === 'archived') {
    throw new Error('rag_resource_not_reindexable');
  }
  const now = Date.now();
  getDb()
    .prepare("UPDATE rag_resources SET indexed_at = NULL, updated_at = ? WHERE id = ?")
    .run(now, id);
  getDb()
    .prepare("UPDATE rag_resource_chunks SET status = 'stale', updated_at = ? WHERE resource_id = ?")
    .run(now, id);
  return createRagReindexJob(actor, {
    rag_resource_id: row.id,
    owner_id: row.owner_id,
    scope_type: row.scope_type,
    scope_id: row.scope_id,
    content_hash: row.content_hash,
  });
}

export function revokeRagResource(actor: AuthUser, id: string): RagResource {
  if (!isAdmin(actor)) throw new Error('permission_denied');
  const row = getRagResourceRow(id);
  if (!row) throw new Error('rag_resource_not_found');
  const now = Date.now();
  getDb()
    .prepare(
      `UPDATE rag_resources
       SET status = 'revoked', revoked_at = ?, indexed_at = NULL, updated_at = ?
       WHERE id = ?`,
    )
    .run(now, now, id);
  getDb()
    .prepare("UPDATE rag_resource_chunks SET status = 'revoked', updated_at = ? WHERE resource_id = ?")
    .run(now, id);

  const packs = getDb()
    .prepare("SELECT * FROM rag_context_packs WHERE status = 'active'")
    .all() as RagContextPackRow[];
  const staleIds = packs
    .filter((pack) => {
      const citations = JSON.parse(pack.citations_json) as Array<{resource_id?: string}>;
      return citations.some((citation) => citation.resource_id === id);
    })
    .map((pack) => pack.id);
  const stale = getDb().prepare("UPDATE rag_context_packs SET status = 'stale' WHERE id = ?");
  staleIds.forEach((packId) => stale.run(packId));
  audit({
    event_type: 'rag.resource_revoked',
    user_id: actor.id,
    scope: row.scope_id,
    detail: {rag_resource_id: id, stale_context_pack_count: staleIds.length},
  });
  return getRagResource(actor, id);
}
