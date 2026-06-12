# Implementation And Test Plan

## PR 1 - Capability Shell

- Add `local_rag` capability flag.
- Add configuration and health status.
- Add typed backend client.
- Add no index and no user-visible promise.

Acceptance:

- backend starts if RAG is disabled;
- backend reports unavailable cleanly if enabled but unreachable;
- no request bypasses existing auth.

## PR 2 - Read-Only Resource Corpus

- Add source registry fields in SQLite.
- Index only validated resource documents.
- Implement upsert, delete and search.
- Expose retrieval in godmode debug only.

Acceptance:

- unauthorized project resources never appear;
- every hit links to a readable source;
- exact links remain handled by resource truth/lexical lookup.

## PR 3 - Reranking And Context Packs

- Add BGE reranker.
- Add context-pack compiler and token budget.
- Add provenance output.
- Add cache with source-hash invalidation.

Acceptance:

- context pack stays under hard budget;
- duplicate source fragments are limited;
- stale or superseded records are excluded.

## PR 4 - Agent Integration

Enable only for selected actions:

- resource discovery;
- tutorial and timecode routing;
- visual DA compilation;
- backend documentation assistant.

Do not enable globally.

## PR 5 - Additional Domains

Add one domain at a time:

- pedagogy;
- visual DA;
- narrative lore;
- project memory;
- inventory.

Each domain gets its own evaluation set and permission tests.

## Evaluation Set

Start with at least:

- 20 exact-resource queries;
- 20 semantic/paraphrased queries;
- 10 ambiguous name queries;
- 10 permission-isolation queries;
- 10 canon-versus-archive conflicts;
- 10 injection-bearing document tests.

Metrics:

```yaml
retrieval_recall_at_10:
reranked_recall_at_5:
mean_reciprocal_rank:
permission_leaks: 0
stale_source_leaks: 0
missing_provenance: 0
median_retrieval_ms:
p95_retrieval_ms:
average_context_tokens:
```

## Rollback

The RAG layer must remain optional:

```text
RAG unavailable
-> exact data and pinned context still work
-> action can fall back or ask
-> never silently broaden search scope
```
