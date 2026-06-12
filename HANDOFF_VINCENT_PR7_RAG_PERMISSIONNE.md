# HANDOFF VINCENT — PR-7 RAG permissionne

Statut : `HANDOFF BACKEND / 2026-06-13`

## Objectif

Livrer un shell RAG permissionne pour MasterFlow : retrouver des sources autorisees, construire
des context packs cites, et refuser de repondre quand la source manque.

Le RAG n'est pas une autorite. Il est un index derive au service de Resource Truth.

## References

- `RECETTE_RAG_PERMISSIONNE.md`
- `SPEC_PROJECT_SCOPE_OWNERSHIP.md`
- `SPEC_CAPABILITY_REGISTRY.md`
- `SPEC_STATUS_TAXONOMY.md`
- `MATRICE_FEATURES_VS_FONDATIONS_MASTERFLOW.md`

## Perimetre PR-7

Livrer uniquement :

- registre minimal des ressources indexables ;
- manifestes de documents/chunks ;
- permission check avant retrieval ;
- context packs cites ;
- audit des queries ;
- revoke/reindex minimal ;
- refus explicite quand aucune source fiable n'existe.

Ne pas livrer :

- index massif de tout le Drive ;
- ingestion automatique de secrets ;
- reponse LLM autonome non citee ;
- connecteurs externes puissants ;
- UI finale ;
- pipelines lourds d'embeddings en prod sans gate.

## Principe d'ordre

Chaque query doit suivre cet ordre :

```text
auth user
resolve scope
filter resources by permission
filter status / trust
retrieve chunks
build cited context pack
answer only from context or refuse
audit query
```

Un resultat hors scope ne doit pas fuiter par titre, snippet, score ou metadata.

## Objets proposes

- `rag_resources`
- `rag_resource_chunks`
- `rag_context_packs`
- `rag_query_events`
- `rag_reindex_jobs` ou rattachement au futur `jobs_shell`

PR-7 peut rester compatible avec PR-8 : si le runner jobs n'existe pas encore, fournir une action
admin de reindex bornée ou un statut `pending_reindex`, sans inventer une queue complete.

## Endpoints minimaux

```text
POST /api/v1/rag/query
GET /api/v1/rag/resources
POST /api/v1/rag/resources
POST /api/v1/rag/resources/:id/reindex
POST /api/v1/rag/resources/:id/revoke
GET /api/v1/rag/context-packs/:id
```

Les endpoints admin/diagnostic doivent rester gates admin/godmode.

## Donnees sensibles

Interdictions :

- indexer secrets, tokens, credentials, `.env`, cles privees ;
- servir une ressource `private` hors owner/scope ;
- traiter `candidate` comme source fiable ;
- conserver une ressource revoquee comme resultat actif ;
- masquer l'absence de source avec une reponse assuree.

## Acceptation

La PR est acceptee si `RECETTE_RAG_PERMISSIONNE.md` passe, avec tests sur permission, statut,
citations, revoke, no-secret et refusal.

Elle est refusee si le RAG devient une boule de cristal : joli, confiant, et incapable de montrer
d'ou vient ce qu'il raconte.
