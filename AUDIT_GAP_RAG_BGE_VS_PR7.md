# Audit — Écarts handoff RAG BGE ↔ couche PR-7 implémentée

**Statut :** `PROPOSITION / OPEN` — audit lecture seule, aucun code. Réponse à l'action
demandée de l'item inbox `PR-7 RAG permissionné livré` (point 6 : « comparer ton handoff Local
RAG BGE a ces contrats et signaler les champs manquants utiles »).

**Auteur :** agent_ouighour · **Date :** 2026-06-13
**`SYNC_PROOF` :** `local_head = origin/main = e03b53b`, delta `0 0`. Sources lues :
`MASTERFLOW_LOCAL_RAG_BGE_HANDOFF/` (OpenAPI, `rag-document.schema.json`,
`rag-search-request.schema.json`, `docs/01..04`, `manifests/masterflow-rag-capability.json`) et
contrats PR-7 réels (`packages/shared/src/index.ts` § RAG, `apps/backend/src/services/rag.ts`,
`routers/rag.ts`, `db/schema.ts`).

> Rappel : le handoff BGE décrit un **microservice runner** (`status: planned`, port `:8091`)
> qui s'intercale derrière les jobs `rag_reindex` et la route `/rag/query`. PR-7 est la couche
> **app** déjà livrée (autorité permissions/scope/trust/citations). Les deux sont **complémentaires**,
> non concurrents : PR-7 reste maître du contrat et des permissions ; BGE est un provider
> d'embeddings/reranking branché via le job `rag_reindex` existant.

---

## 1. Synthèse exécutive

PR-7 couvre déjà : permissions (owner/project scope), cycle de vie ressource (candidate/validated/
deprecated/revoked/archived), trust, citations obligatoires, refus explicite, secret detection,
revoke admin avec invalidation des context packs, job `rag_reindex` compatible runners.

**Ce que BGE ajoute réellement (le cœur du raccord) :**
1. **Embeddings denses** (`embedding_ref` est `NULL` en PR-7 → BGE-M3 le remplit) ;
2. **Reranking** (BGE-reranker-v2-m3) avec un entonnoir `candidate_limit → result_limit` ;
3. **Budget de tokens** du context pack (`context_token_budget`) ;
4. **Champ `sensitivity`** absent de PR-7 ;
5. **Détection d'injection prompt** plus large que le seul `SECRET_PATTERN` actuel.

**Verdict :** le raccord BGE est faisable **sans nouvel engine** et **sans casser le contrat PR-7**.
Il se brancherait sur `requestRagReindex` (écrit embeddings via le runner) et `queryRag` (délègue
le score au runner, conserve le filtrage permission/trust PR-7 en amont). Les écarts ci-dessous
sont des **ajouts additifs** ou des **tables de mapping**, jamais des refactors cassants.

---

## 2. Mapping des endpoints

| Surface BGE (runner `:8091`, interne) | Surface PR-7 (app `/api/v1`, live) | Relation |
|---|---|---|
| `POST /v1/documents/upsert` | `POST /rag/resources` + job `rag_reindex` | **Complémentaire** : l'app reste la porte d'entrée (validations PR-7) ; le runner reçoit les chunks validés à vectoriser. |
| `POST /v1/documents/delete` | `POST /rag/resources/:id/revoke` | **Complémentaire** : revoke PR-7 marque `revoked` + stale les packs ; le runner doit aussi supprimer les points Qdrant. ⚠️ **GAP** : PR-7 n'appelle pas la suppression Qdrant aujourd'hui (pas de Qdrant). |
| `POST /v1/search` | `POST /rag/query` | **Complémentaire** : PR-7 garde le filtrage permission/trust/revoked en amont, puis peut déléguer le score lexical au score vectoriel+rerank du runner. |
| `GET /v1/index/stats` | (aucun) | **GAP mineur** : pas de route stats côté app. À exposer gated admin/godmode si monitoring voulu. |
| `GET /health` | `GET /health` (app, déjà) | Le health app pourrait agréger le health runner BGE. |

**Aucune route BGE ne doit être exposée publiquement** (cohérent manifest `ui_enabled: false`).
Le runner reste derrière le réseau interne, joignable uniquement par le backend.

---

## 3. Écarts de champs — Document BGE ↔ `RagResource`/`RagResourceChunk` PR-7

| Champ BGE (`rag-document.schema.json`) | PR-7 | Écart & recommandation |
|---|---|---|
| `source_id` / `source_ref` / `source_hash` | `resource_id` / `source_uri` / `content_hash` | Équivalents sémantiquement. **Mapper** `source_id→resource_id`, `source_hash→content_hash`. |
| `chunk_id` | `chunk_id` | OK. |
| `text` | `content_excerpt` (≤2000) | OK (même borne). |
| `domain` (enum 9 : resources, pedagogy, visual_da, narrative_lore, personas, projects, inventory, corrections, backend_docs) | **Absent** | **GAP** : PR-7 n'a pas de `domain`. La ressource source porte `subjects_json`. Recommandation : dériver `domain` côté runner depuis `subjects_json`/`source_type`, sans ajouter de colonne app (le filtre par domaine reste un souci runner). |
| `authority` (canonical/validated/candidate/archive/external) | `trust_status` (unverified/source_verified/canonical/private_reference) + `status` | **GAP de vocabulaire**. Table de mapping à figer : `canonical→canonical`, `validated→source_verified`, `candidate→unverified`, `archive→(status=archived)`, `external→unverified` (ou nouveau trust si besoin). À valider MALEX. |
| `status` (active/stale/superseded/quarantined/deleted) | chunk `status` (active/stale/revoked) + resource `status` | `quarantined`/`superseded` BGE n'ont pas d'équivalent PR-7. **GAP** : `quarantined` est utile pour le contenu suspect (cf. injection prompt). Recommandation : ajouter `quarantined` au `status` chunk lors du raccord (additif). |
| `owner_id` / `project_id` | `owner_id` / `project_id` | OK. |
| `room_id` | **Absent** de `RagResource` | **GAP** : BGE supporte le scope room. PR-7 est owner/project uniquement. Reporté (PR-7 se concentre sur owner/project). |
| `permission_scope[]` (tableau) | `scope_type` + `scope_id` (single) | **GAP structurel** : BGE autorise plusieurs scopes ; PR-7 est mono-scope par ressource. Conserver PR-7 mono-scope (plus simple, prévisible) ; le runner dérive son `permission_scope[]` depuis scope_type/scope_id. |
| `sensitivity` (public/internal/private/restricted/secret_forbidden) | **Absent** | **GAP significatif** : BGE gate sur `max_sensitivity`. PR-7 n'a aucune notion de sensibilité. **Champ à ajouter** (additif, nullable, défaut `internal`) si on veut activer le gate sensibilité. À valider MALEX. |
| `language` / `version` / `expires_at` | Absents | **GAP mineur**. `version` existe côté resource source (`schema_templates`). `expires_at` utile pour TTL contenu. Reportés. |
| `metadata` | `metadata` (chunk) | OK. |

---

## 4. Écarts — Requête de recherche

`RagQueryRequestSchema` PR-7 est **minimal** : `query`, `project_id?`, `limit` (≤10).
`rag-search-request.schema.json` BGE est **riche** :

| Champ BGE | PR-7 | Recommandation |
|---|---|---|
| `query` | `query` | OK. |
| `domains[]` | Absent | Dériver côté runner (cf. §3). Pas d'ajout app. |
| `permission_filter{user_id,role,allowed_scopes,owner_ids,project_ids,room_ids,max_sensitivity}` | Dérivé serveur depuis `actor` + `decideScopedPermission` | PR-7 fait déjà ce travail côté service (`canReadResource`, `decideScopedPermission`). **Le runner ne doit JAMAIS recevoir ce filtre du client** : le backend le construit. ✅ conforme. |
| `authority_allow` | Filtre trust PR-7 (`source_verified`/`canonical`/`private_reference`) | Mapping via table §3. |
| `candidate_limit` (1..100, défaut 20) / `result_limit` (1..20, défaut 6) | `limit` (1..10, défaut 5) | **GAP** : entonnoir candidate→result (retrieve 20, rerank 6) absent de PR-7. À ajouter côté runner uniquement ; PR-7 garde son `limit` publique. |
| `context_token_budget` (500..12000, défaut 3500) | Absent | **GAP** : pas de budget token côté app. Le runner peut l'appliquer en interne. Optionnel côté app. |
| `include_debug` | Absent (debug godmode ailleurs) | Reporté. |

---

## 5. Écarts — Sécurité & cycle de vie (`docs/03_SECURITY`)

| Exigence BGE | PR-7 | Statut |
|---|---|---|
| Permission-first retrieval (filtre avant recherche) | ✅ `canReadResource` + `decideScopedPermission` + filtre SQL `scope_type/scope_id` | **Conforme.** |
| Rejeter les recherches sans scope hors diag godmode | ✅ scope owner/project obligatoire | **Conforme.** |
| Détection injection prompt (ignore-policy, reveal-secret, tool-call syntax, escalation) | ❌ seul `SECRET_PATTERN` (api_key/password/credential/…) | **GAP** : PR-7 ne détecte que les secrets, pas l'injection prompt. Le runner BGE prévoit de flaguer ces chunks en `quarantined`. Recommandation : étendre la détection côté runner (pas app) et exposer le statut `quarantined`. |
| Sensibilité des données (notes/données médicales non indexées par défaut) | ❌ pas de champ sensibilité | **GAP** (cf. §3 `sensitivity`). |
| Suppression par source_id / owner_id / project_id / room_id / account-closure | revoke par id (admin) ; stale packs | **GAP** : PR-7 ne supprime pas les points Qdrant (pas de Qdrant) ni par owner/account-closure. À câbler lors du raccord runner. |
| Audit riche (domaine, chunks sélectionnés/rejetés+raison, latence retrieve/rerank, token estimate, cache hit/miss, version modèle/index) | `rag.query` logge `query_hash`, `result_count`, `refusal_reason` | **GAP** : audit PR-7 plus fin que les chunks sélectionnés mais moins riche que BGE côté latence/rejet/model version. À compléter côté runner. |
| Ne pas logger le contenu sensible brut | ✅ seul le `query_hash` est persisté | **Conforme.** |

---

## 6. Capability manifest ↔ registre d'actions

`manifests/masterflow-rag-capability.json` déclare la capability `local_rag` (`status: planned`,
`ui_enabled: false`, `requires_role: authenticated`, `debug_requires_role: godmode`, gates :
authentication, permission_scope, source_status, authority, sensitivity, token_budget, provenance).

Côté app, le job `rag_reindex` existe déjà (créé par `requestRagReindex`) et le registre d'actions
porte `rag_reindex` (runner family `rag`, cf. `SPEC_PR_C11`). **GAP** : la capability `local_rag`
n'est pas encore déclarée dans le `action_registry_seed` ni dans l'`adapter_registry` (PR-CB1).
Recommandation : à recenser lors du raccord, sans la passer `live` avant tests + recette.

---

## 7. Plan de raccord proposé (borné, sans nouvel engine)

1. **Runner BGE interne** (port `:8091`, jamais public) : embeddings BGE-M3 + reranker v2-m3 +
   Qdrant. Consomme les jobs `rag_reindex` (claim via `claimNextJob` family `rag`).
2. **`requestRagReindex` → runner `/v1/documents/upsert`** : le runner reçoit les chunks actifs,
   vectorise, persiste `embedding_ref` (non-NULL après succès), remet `status='active'` seulement
   si succès (conforme action inbox PR-7 point 3).
3. **`queryRag` → runner `/v1/search`** : PR-7 garde le filtrage permission/trust/revoked **en
   amont** (SQL), envoie au runner uniquement les chunks autorisés + la query ; le runner renvoie
   score vectoriel + rerank. PR-7 reconstruit le `RagContextPack` avec citations (score remplacé).
4. **`revoke` → runner `/v1/documents/delete`** : supprime les points Qdrant + garde stale packs.
5. **Ajouts additifs au contrat** (à valider MALEX, rétro-compatibles) :
   - `sensitivity` nullable sur `RagResource` (défaut `internal`) ;
   - `quarantined` dans le `status` chunk ;
   - table de mapping `authority ↔ trust_status` figée côté runner.
6. **Aucune route publique BGE** ; stats/health runner exposés uniquement gated admin/godmode.
7. **Fallback** : si runner down, PR-7 conserve son score lexical actuel (`scoreExcerpt`) — déjà
   en place. Cohérent manifest `fallback: pinned_context_plus_exact_resource_truth`.

---

## 8. Points nécessitant une décision MALEX avant code

- Ajout du champ `sensitivity` (impact contrat `shared` — additif, mais périmètre) ;
- Vocabulaire `authority` BGE ↔ `trust_status` PR-7 (faut-il un nouveau trust `external` ?) ;
- Exposition d'une route `GET /rag/stats` (ou dans `/diagnostics`) gated admin/godmode ;
- Détection injection prompt : côté runner uniquement, ou aussi un pré-filtre app ?

**Gate : audit et proposition uniquement.** Aucun code, migration, endpoint, téléchargement de
modèle, conteneur ou changement de périmètre avant validation humaine MALEX séparée.

— agent_ouighour
