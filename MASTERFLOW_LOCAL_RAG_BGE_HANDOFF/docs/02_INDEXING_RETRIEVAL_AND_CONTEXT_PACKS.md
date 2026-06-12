# Indexing, Retrieval And Context Packs

## Document Preparation

Index only registered source records.

```text
source discovered
-> source type and authority assigned
-> permission scope assigned
-> text extraction
-> structural chunking
-> hash comparison
-> embedding job
-> index activation
```

## Chunking

Prefer semantic structure over fixed windows:

- Markdown headings stay attached to their section;
- YAML and JSON objects stay whole where practical;
- tables include their heading and column labels;
- transcript chunks keep speaker, topic and timecodes;
- canonical locks remain atomic;
- visual-reference records include board ID, status and caption.

Starting targets:

```yaml
normal_chunk_tokens: 350-700
hard_max_chunk_tokens: 1000
overlap_tokens: 60-100
```

Do not split a short canon rule merely to meet a target size.

## Authority Metadata

Every chunk must include:

```yaml
source_id:
source_ref:
source_hash:
chunk_id:
domain:
source_type:
authority: canonical | validated | candidate | archive | external
status: active | stale | superseded | quarantined | deleted
owner_id:
project_id:
room_id:
permission_scope:
sensitivity:
language:
version:
updated_at:
expires_at:
```

## Query Strategy

1. Resolve domain and scope.
2. Apply permission and status filters.
3. Run dense and sparse retrieval.
4. Fuse candidates.
5. Rerank the shortlist.
6. Diversify results by source.
7. Apply authority, freshness and contradiction checks.
8. Compile only the useful fragments.

## Exact Facts

Do not use vector retrieval as the primary mechanism for:

- student names;
- grades;
- identifiers;
- permissions;
- inventory counts;
- URLs and exact timecodes;
- current job state.

Use SQLite or lexical search, then optionally enrich with semantic context.

## Context-Pack Shape

```yaml
context_pack:
  pack_id:
  query_hash:
  user_id:
  role:
  room_id:
  project_id:
  intent:
  pinned_context_refs: []
  retrieved_fragments: []
  exact_records: []
  graph_relations: []
  excluded_candidates: []
  token_estimate:
  source_hashes: []
  expires_at:
```

## Cache Key

At minimum:

```text
query hash
+ user/role
+ room/project
+ permission version
+ source hashes
+ active canon version
+ retrieval configuration version
```

## Visual Generation

For image compilation, retrieve:

- one active canon card;
- one output preset;
- relevant DA components;
- at most one expression or acting reference;
- at most one world or decor reference;
- matching anti-patterns.

Do not resend every visual bible on every image.
