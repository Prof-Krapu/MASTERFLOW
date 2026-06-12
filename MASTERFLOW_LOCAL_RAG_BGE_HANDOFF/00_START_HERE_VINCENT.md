# MASTERFLOW LOCAL RAG BGE - START HERE

Date: 2026-06-12
Status: implementation handoff
Target: Vincent / backend repository

## Goal

Add local semantic retrieval to MasterFlow without replacing:

- SQLite as live application state;
- Drive / Markdown / JSON as readable canon;
- permission and validation gates;
- graph data for explicit relations;
- the current Express action runtime.

Canonical rule:

```text
Vectorize to retrieve.
Graph to understand.
Validate to believe.
```

## Recommended Runtime

```text
MasterFlow backend
  -> permission and scope prefilter
  -> local RAG service
      -> BAAI/bge-m3 embeddings
      -> Qdrant hybrid index
      -> BAAI/bge-reranker-v2-m3
  -> compact context pack
  -> selected LLM/provider
```

BGE is not the response LLM. It is the local retrieval and reranking layer.

## Read In This Order

1. `README.md`
2. `docs/01_ARCHITECTURE_AND_BOUNDARIES.md`
3. `docs/02_INDEXING_RETRIEVAL_AND_CONTEXT_PACKS.md`
4. `docs/03_SECURITY_PERMISSIONS_AND_LIFECYCLE.md`
5. `docs/04_IMPLEMENTATION_AND_TEST_PLAN.md`
6. `contracts/rag-api.openapi.yaml`
7. `schemas/*.json`
8. `PROMPT_RELANCE_CLAUDE_CODE.md`

## First Decision

Do not implement everything at once.

Start with one read-only corpus:

```text
validated internal resources
```

Then validate retrieval quality before indexing canons, personas, student data or
private project memory.

## Non-Negotiable Gates

- Permissions are applied before retrieval, not after.
- Every vector record points to a readable source.
- A vector hit is evidence candidate, never canon.
- Canon, permissions, safety and `ACTION_READY` remain pinned outside RAG.
- Deletion or permission revocation invalidates the matching vectors.
- No full Drive scan on a user request.
- No external network dependency is required at query time.

## Suggested First PR

Add only:

- capability flag `local_rag`;
- service health check;
- typed API client;
- no indexing;
- no UI claim that RAG is operational until the health check and evaluation pass.
