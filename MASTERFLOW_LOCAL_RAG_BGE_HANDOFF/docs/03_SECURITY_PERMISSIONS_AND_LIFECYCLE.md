# Security, Permissions And Lifecycle

## Permission-First Retrieval

The backend must create an allow-list filter before calling the RAG service.

Forbidden flow:

```text
retrieve everything
-> remove unauthorized hits afterward
```

Required flow:

```text
resolve grants
-> build mandatory filters
-> retrieve only authorized records
```

The RAG service should reject searches without a scope filter outside explicit
godmode diagnostics.

## Prompt Injection

Indexed documents are untrusted content, even when stored locally.

Retrieval output must be wrapped as quoted evidence and must never override:

- system policy;
- permissions;
- tool schemas;
- active canon;
- human validation.

Flag chunks containing patterns such as:

- instructions to ignore policy;
- requests to reveal hidden prompts or secrets;
- tool-call syntax inside ordinary resources;
- encoded or obfuscated command blocks;
- ownership or role escalation claims.

Suspicious chunks may still be available for an explicit security audit, but they
must not enter an ordinary context pack.

## Sensitive Data

Recommended defaults:

| Data | Vectorize? |
|---|---|
| public/validated resources | yes |
| canon and contracts | yes, restricted by project if needed |
| personal preferences | distilled fields only |
| student work | project/class scoped, opt-in policy |
| grades and medical data | no semantic index by default |
| secrets, tokens, credentials | never |

## Deletion And Revocation

Each indexed record must be deletable by:

- `source_id`;
- `owner_id`;
- `project_id`;
- `room_id`;
- account closure job.

Deletion workflow:

```text
source revoked/deleted
-> mark inactive in SQLite
-> delete Qdrant points
-> invalidate context-pack cache
-> append audit event
```

## Audit

Log:

- query domain and filters;
- selected chunk IDs;
- rejected chunk IDs and reason;
- retrieval and reranking latency;
- context token estimate;
- cache hit/miss;
- model and index version;
- final action using the context pack.

Do not log raw sensitive document content by default.
