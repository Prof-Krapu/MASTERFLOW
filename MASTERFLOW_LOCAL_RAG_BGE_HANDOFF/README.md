# MasterFlow Local RAG BGE Handoff

This folder is a repository-ready implementation specification for a local,
permission-aware RAG layer.

## Why This Shape

The current MasterFlow technical baseline uses:

- TypeScript / Express;
- SQLite for live state;
- Drive / Markdown / JSON for canon and long-form specifications;
- role and validation gates;
- an action registry and provider routing.

Therefore the recommended solution is a separate local retrieval service instead
of forcing vector storage into SQLite.

## Components

| Component | Responsibility |
|---|---|
| SQLite | users, permissions, rooms, projects, jobs, source records |
| Drive / Git files | readable canon and validated source documents |
| Qdrant | dense and sparse retrieval index |
| `BAAI/bge-m3` | multilingual dense and sparse embeddings |
| `BAAI/bge-reranker-v2-m3` | reranking shortlisted fragments |
| MasterFlow backend | authorization, orchestration, context compilation |
| LLM provider | response, reasoning or generation after retrieval |

## Default Retrieval Budget

```yaml
candidate_retrieval:
  dense_limit: 20
  sparse_limit: 20
  fused_limit: 20
rerank:
  input_limit: 20
  output_limit: 6
context_pack:
  target_tokens: 3500
  hard_max_tokens: 6000
```

These are starting values, not permanent truth.

## Expected Benefit

The objective is not merely lower token use. It is:

- less irrelevant context;
- faster repeated operations;
- stronger permission isolation;
- explicit source provenance;
- reusable compiled context packs;
- fewer canon and resource hallucinations.

## Source Documents Already Present In MasterFlow

This proposal implements existing product doctrine rather than inventing a new
memory system:

- `08_DATASETS/MEMORY_AND_KNOWLEDGE_GOVERNANCE_SYSTEM.md`
- `08_DATASETS/CONTEXTUAL_RECALL_AND_SCOPE_FILTERING.md`
- `08_DATASETS/DATASET_SYSTEM_ARCHITECTURE.md`
- `02_CONTRACTS/USEFUL_CONTEXT_COMPILATION_AND_PERSISTENCE_CONTRACT.md`
- `02_CONTRACTS/PROGRESSIVE_CONTEXT_LOADING_AND_ANTI_HALLUCINATION_POLICY.md`
- `02_CONTRACTS/SESSION_BOOTSTRAP_CONTEXT_PACK_AND_USER_LOADOUT_CONTRACT.md`

## Upstream References

- BGE-M3: https://huggingface.co/BAAI/bge-m3
- BGE reranker v2 M3: https://huggingface.co/BAAI/bge-reranker-v2-m3
- FlagEmbedding: https://github.com/FlagOpen/FlagEmbedding
- Qdrant hybrid queries: https://qdrant.tech/documentation/concepts/hybrid-queries/
