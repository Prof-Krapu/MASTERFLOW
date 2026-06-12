# Architecture And Boundaries

## Runtime Flow

```text
user request
-> authentication
-> role, room, project and owner resolution
-> intent routing
-> pinned contracts and safety gates
-> metadata permission filter
-> hybrid retrieval
-> reranking
-> authority and freshness review
-> context-pack compilation
-> LLM/tool/action
-> provenance and token telemetry
```

## Storage Ownership

### Canon Files

Own:

- contracts;
- canon bibles;
- validated decisions;
- manifests;
- approved visual references;
- long-form source material.

They are never replaced by embeddings.

### SQLite

Own:

- identities and roles;
- resource and source records;
- projects and rooms;
- permissions;
- indexing jobs and status;
- compiled context-pack manifests;
- audit logs and deletion state.

### Qdrant

Own:

- derived dense vectors;
- derived sparse vectors;
- chunk search payloads;
- source identifiers and filtering metadata.

Qdrant is rebuildable. It is not sovereign storage.

### Cache

Own:

- query embeddings;
- recent retrieval results;
- compiled context packs;
- document hashes;
- provider-ready prompt fragments.

Cache entries require TTL and invalidation keys.

## Pinned Context Outside RAG

Never depend on semantic retrieval for:

- role and permission policy;
- injection and safety policy;
- human validation policy;
- tool contracts;
- `ACTION_READY` and image-generation gates;
- minimum canon invariants of an active named entity;
- output schema required by the active action.

## Retrieval Domains

Keep separate collections or mandatory domain filters:

```text
resources
pedagogy
visual_da
narrative_lore
personas
projects
inventory
corrections
backend_docs
```

Do not create one unscoped “everything” index.

## Provider Boundary

The RAG service returns fragments and scores. It does not:

- decide permissions;
- mutate canon;
- choose final truth;
- call generation APIs;
- send student data to a remote provider;
- execute actions.
