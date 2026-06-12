# CHECKLIST PR-7 — RAG permissionne

Statut : `BACKEND CHECKLIST / 2026-06-13`

## Intention

Ajouter une capacite de retrieval utile a MasterFlow sans contourner permissions, statuts,
Resource Truth ni provenance.

## Tables / migrations

### `rag_resources`

```text
id
owner_id
project_id nullable
source_type
source_uri
title
status
trust_status
scope_type
scope_id
content_hash
indexed_at nullable
revoked_at nullable
created_at
updated_at
```

### `rag_resource_chunks`

```text
id
resource_id
chunk_index
content_excerpt
embedding_ref nullable
token_count nullable
metadata_json
status
created_at
updated_at
```

### `rag_context_packs`

```text
id
query_hash
user_id
scope_type
scope_id
citations_json
status
created_at
expires_at nullable
```

### `rag_query_events`

```text
id
user_id
query_hash
scope_type
scope_id
result_count
refusal_reason nullable
created_at
```

## Statuts

Resource status :

```text
candidate | validated | deprecated | revoked | archived
```

Trust status :

```text
unverified | source_verified | canonical | private_reference
```

## Contrats partages

Exposer ou ajouter :

- `RagResource`
- `RagResourceChunk`
- `RagContextPack`
- `RagCitation`
- `RagQueryRequest`
- `RagQueryResponse`
- `RagRefusalReason`

## Routes minimales

```text
POST /api/v1/rag/query
GET /api/v1/rag/resources
POST /api/v1/rag/resources
POST /api/v1/rag/resources/:id/reindex
POST /api/v1/rag/resources/:id/revoke
GET /api/v1/rag/context-packs/:id
```

## Permissions

- retrieval : toujours apres `permission_check` ;
- user : voit seulement ressources autorisees par scope/projet/owner ;
- teacher+ : peut enregistrer une ressource dans son scope ;
- admin/godmode : diagnostics et revoke selon policy ;
- aucun persona ne donne un droit de lecture ;
- ressource `revoked` ou hors scope : aucun titre/snippet/score ne fuite.

## Regles de retrieval

- filtrer permissions avant scoring ;
- filtrer status/trust avant construction du contexte ;
- citation obligatoire par chunk retenu ;
- excerpt court, pas de dump documentaire ;
- context pack expire ou se regenere apres revoke ;
- query sans source fiable => refusal explicite ;
- index = derive, la source reste canonique.

## Tests minimum

- membre projet trouve une ressource du projet ;
- non-membre ne voit aucun hit ni metadata ;
- ressource `candidate` non servie comme source fiable ;
- ressource `revoked` disparait apres revoke/reindex ;
- query sans source retourne refusal ;
- chaque hit contient citation chemin/titre/statut/scope/score/extrait ;
- secret pattern refuse a l'ingestion ;
- audit query emis.

## Refus immediat

- retrieval avant permission ;
- index global non scope ;
- secrets indexables ;
- reponse sans citation ;
- hallucination presentee comme source ;
- ressource revoquee encore visible ;
- endpoint diagnostic expose a teacher/student.
