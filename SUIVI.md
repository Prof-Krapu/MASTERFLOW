# SUIVI — MasterFlow

Journal de construction. Le quoi/pourquoi, daté et concis.

---

## 2026-06-13 — PR-INV-3 Inventory RAG — PRET A PUSH

Projection RAG explicite des items Inventory valides :

- `POST /inventory/items/:id/rag-index` ;
- candidat refuse, item `validated` obligatoire ;
- projection `resources` + `rag_resources` source `inventory_item` ;
- provenance `inventory://item/:id`, metadata item/collection/projet ;
- owner ou editor+ projet requis pour indexer ;
- archive Inventory -> projection RAG `archived`, chunks `stale`, context packs cites `stale` ;
- Inventory reste proprietaire de verite ; RAG reste derive.

Recette : Inventory/RAG **17/17**, backend complet **241/241**, backend/frontend TypeScript OK,
frontend build OK, `git diff --check` OK.

---

## 2026-06-13 — Queue Inventory backend — LANCEE

**GO QUEUE humain MALEX recu.**

Ordre : Inventory RAG -> Collection Graph -> Search/Needs -> bridge Room/context ->
observabilite -> recette end-to-end -> handoff Vincent.

Garde-fous :

- Drive canon relu avant chaque couche ;
- aucun BGE/Qdrant reel, aucune UI finale, aucun merge `main` ;
- un commit/push par intention apres recette verte ;
- arret sur conflit distant, ambiguite canon ou fuite de permission.

Baseline : `HEAD = origin/codex/frontend-masterflow = c1e3486`, `origin/main = 141ab68`,
worktree propre au lancement.

---

## 2026-06-13 — PR-INV-2 OCR vers candidates Inventory — POUSSEE

**Livrable MALEX/Codex. GO humain MALEX recu pour commit/push.**

But : raccorder les sorties OCR existantes a Inventory sans lancer d'OCR reel et sans creer de
verite automatique.

Ajouts :

- contrat `IngestInventoryOcrCandidatesRequest` ;
- service/router `POST /inventory/ocr-candidates` ;
- ingestion seulement depuis job `ocr_prepare` en `needs_review` ou `completed` ;
- chaque entree devient un `inventory_item` en `candidate` avec `source_refs` vers le job OCR ;
- aucune validation automatique, aucun chunk RAG, aucun runner BGE.

Invariant : OCR candidate != Inventory validated != Resource Truth != RAG authoritative.

Recette avant commit : backend complet **239/239**, test Inventory cible **6/6**,
backend/frontend TypeScript OK, frontend build OK, `git diff --check` OK.

---

## 2026-06-13 — PR-INV-1 Inventory Core — POUSSEE

**Livrable MALEX/Codex. GO humain MALEX recu pour commit/push.**

But : poser l'inventaire comme source de verite minimale avant OCR, RAG Inventory, UI et
MasterStory props.

Sources canon Drive relues :

- `03_APPS/INVENTORY_APP_RUNTIME.md`
- `04_ENGINES/INVENTORY_ENGINE.md`
- `02_CONTRACTS/REFERENCE_INVENTORY_OCR_COLLECTION_GRAPH_CONTRACT.md`
- `02_CONTRACTS/RESOURCE_TRUTH_LOCK_AND_CANONICAL_ROUTING_CONTRACT.md`

Ajouts :

- contrats shared `InventoryItem`, `InventoryCollection`, payloads create/list ;
- tables `inventory_items`, `inventory_collections`, `collection_matches`, `inventory_visibility` ;
- service et router `/inventory/*` ;
- cycle minimal candidat -> validation explicite -> archive ;
- permissions : inventaire personnel prive par defaut ; inventaire projet cree/valide par editor+ ;
  les membres projet ne voient que les items `validated` en visibility `project` ;
- invariant : aucune ressource RAG n'est creee automatiquement depuis un item Inventory.

Hors scope volontaire : OCR photo, matching avance, mouvements de stock, reservations, prix,
BGE/Qdrant, UI Inventory.

Recette avant commit : backend complet **238/238**, test Inventory cible **5/5**,
backend/frontend TypeScript OK, frontend build OK, `git diff --check` OK.

---

## 2026-06-13 — PR-RAG-1 contrat transversal — POUSSEE

**Livrable MALEX/Codex. GO humain MALEX recu pour commit/push.**

But : stabiliser le RAG comme couche derivee commune avant Inventory, Rooms, MasterStory et
BGE/Qdrant.

Ajouts en cours :

- `MATRICE_CANON_GITHUB_NEXT_MOVES_2026-06-13.md` : matrice Drive canon -> GitHub -> gap -> PR ;
- correction du statut `CTX_RUNTIME_IMPLEMENTATION_HANDOFF_2026-06-13.md` : CTX est bien pousse
  sur `codex/frontend-masterflow` et attend revue Vincent ;
- contrat RAG additif : filtres transversaux (`active_app`, `zoom_level`, `entity_refs`,
  `allowed_statuses`, `spoiler_policy`, `context_token_budget`, `sensitivity`) portes par les
  context packs ;
- refusal `unsafe_query` pour requetes de type prompt-injection ;
- invariant conserve : meme si la requete demande des statuts candidats, le retrieval ne lit que
  les ressources validees et verifiees.

Recette avant commit : backend complet **233/233**, RAG cible **14/14**, backend/frontend
TypeScript OK, frontend build OK, `git diff --check` OK.

---

## 2026-06-13 — Audit cloture canon/GitHub + sync CTX poussee

**Livrable MALEX/Codex.** Correction du diagnostic de sync apres audit GitHub complet et
relecture des audits canon Drive embarques.

Fichier a lire :

`AUDIT_CLOTURE_CANON_GITHUB_SYNC_2026-06-13.md`

Constat : Vincent avait bien integre une grosse tranche backend sur `main` : admin/invitations,
roles sensibles, token usage, settings, Project/Scope multi-utilisateur, Template/Guided Runtime,
RAG shell, jobs/runners, workflow observability, correction/OCR/calibration/feedback/export et
securite Vite. La confusion venait d'une lecture du delta recent au lieu d'une synthese globale
de l'historique GitHub.

MALEX/Codex a pousse la pile CTX sur `codex/frontend-masterflow` :

`875a7908e17359b31b14f57ddcde27efdada2b25`

Contenu : context compiler, user runtime loadout, room checkpoints, memory cards, RAG enrichi,
injection WS bornee, surfaces frontend contexte et protocole sync `gh`.

Validation avant push : backend **231/231**, backend/frontend TypeScript OK, build frontend OK
(warning chunk Vite historique), `git diff --check` OK.

Suite : revue Vincent de `875a790`, comparaison avec ses modules, puis integration courte. Ne pas
attaquer l'UI finale avant stabilisation du contexte/runtime.

---

## 2026-06-13 — PR-HARD-1 à 7 — IMPLÉMENTÉES LOCALEMENT, RECETTE VERTE

**Livrable MALEX/Codex, non commit/push en attente du GO humain.**

Les raccords P0/P1 de `AUDIT_POST_PUSH_CANON_GAPS_2026-06-13.md` ont été traités par
couches bornées, après contrôle inbox et comparaison au canon Drive :

- **HARD-1 Auth** : identité effective relue en BDD pour REST/WS, révocation, compte actif,
  rôle courant et `auth_version`; changement de rôle = invalidation immédiate des anciens JWT.
- **HARD-2 Rooms** : `project_id` additif, resolver owner/public/membre projet, masquage des
  Rooms privées et ownership exact de `room_instance` au handshake WS.
- **HARD-3 Actions** : owner/scope persistés, lecture/preflight/exécution bornés, inbox filtrée,
  registre non `live` refusé et absence d'exécuteur = `not_implemented`, jamais faux succès.
- **HARD-4 Resource Truth** : seules les ressources `validated` sont partageables/lisibles
  dans un projet; le RAG projet exige validation et `resource_scope`.
- **HARD-5 Guided Runtime** : snapshots immuables guide/schéma/consentement, preview owner
  explicite, validation guide, types/options/schéma vérifiés et route participants privée.
- **HARD-6 Jobs** : séparation lecture/gestion; owner, admin projet ou override global tracé
  peuvent cancel/retry; un editor lecteur ne le peut pas.
- **HARD-7 Ownership projet** : owner unique, promotion directe interdite, transfert atomique
  via l'action sensible `transfer_project_ownership` validée admin.

Références canon appliquées :

- `01_CORE/PERMISSION_RUNTIME_GUARDRAILS.md`
- `01_CORE/PERMISSION_AND_ACCESS_GOVERNANCE_SYSTEM.md`
- `01_CORE/MASTERFLOW_RUNTIME_CONTEXT_ISOLATION.md`
- `02_CONTRACTS/RUNTIME_ACCESS_CONTROL_AND_SYSTEM_PERMISSION_MATRIX.md`
- `02_CONTRACTS/PERSONA_PERMISSION_FIREWALL_AND_ROLE_SCOPE_CONTRACT.md`
- `02_CONTRACTS/RESOURCE_TRUTH_LOCK_AND_CANONICAL_ROUTING_CONTRACT.md`
- `02_CONTRACTS/ACTION_PREFLIGHT_DECISION_LOG_AND_VALIDATION_INBOX_CONTRACT.md`

Recette :

- backend TypeScript : OK;
- backend Vitest : **213/213**, 46 fichiers;
- frontend TypeScript : OK;
- frontend build Vite : OK, warning historique chunk > 500 kB;
- `git diff --check` : OK.

Étape suivante après revue/push : **PR-CTX-1 context compiler**, sans brancher BGE/Qdrant à
la sémantique des Rooms avant stabilisation du contrat.

---

## 2026-06-13 — Audit post-push canon / raccords transversaux — PRÊT

**Livrable MALEX/Codex.**

`AUDIT_POST_PUSH_CANON_GAPS_2026-06-13.md`

Les derniers pushes rendent désormais Project/Scope, jobs/runners, RAG, Guided Runtime,
correction et admin partiellement exécutables. L'audit complet du 12 juin doit donc être
actualisé.

Écarts P0 trouvés : rôle JWT non rafraîchi après rétrogradation, révocation absente du handshake
WS, Rooms/instances non isolées, actions non bornées par owner/scope/statut live et Resource
Truth contournable via les ressources projet.

Écarts P1 : version Guided Runtime non figée, validation JSON Schema/consentement incomplète,
lecture de job confondue avec cancel/retry, ownership projet ambigu et inscription invitation
non transactionnelle.

Dernier delta distant `141ab68` lu : l'observabilité workflow est maintenant raccordée au
lifecycle jobs. Cela ne ferme pas les écarts ci-dessus. Son mapping Templates stocke bien
`guide_version`, mais surestime le freeze effectif : le runtime relit encore le guide courant.

Ordre conseillé : hardening auth/WS, Rooms, actions, Resource Truth, Guided Runtime, jobs et
ownership, puis reprise du `context_compiler`.

---

## 2026-06-13 — Audit déploiement du contexte / Rooms / loadout / mémoire — PRÊT

**Livrable MALEX/Codex.** Audit ciblé du canon Drive contre le runtime Git :

`AUDIT_DEPLOIEMENT_CONTEXTE_ROOMS_LOADOUT_MEMORY_2026-06-13.md`

Conclusion : le Git sait stocker un `room_instance`, mais ne possède pas encore le
`context_compiler` qui résout permissions, loadout, projet, checkpoint, ressources, tier et
provenance en un paquet borné pour l'UI et les personas.

Ordre recommandé : contrats et compilateur T1/T2, loadout resolver, checkpoints, raccord RAG,
injection WebSocket, transitions/bridges, mémoire compressée et payloads, teamspaces/surfaces,
UI de contexte puis observabilité. La passe canon couvre aussi maturité projet, activation
progressive des Rooms et isolation inter-projets. BGE/Qdrant peut avancer en parallèle comme
runner générique, sans devenir propriétaire de la sémantique du contexte.

---

## 2026-06-13 — Audit RAG transversal canon / Inventory / Rooms / MasterStory — PRÊT

**Livrable MALEX/Codex.** Audit ciblé du canon Drive contre le Git :

`AUDIT_RAG_TRANSVERSAL_CANON_INVENTORY_ROOMS_MASTERSTORY_2026-06-13.md`

Conclusion : le RAG doit devenir la couche dérivée de chargement contextuel pour les ressources,
l'inventaire, les Rooms et MasterStory, sans remplacer Resource Truth, ownership, validation
Inventory, checkpoints Room ou canon narratif.

Écart principal : le Git possède le shell RAG, les jobs OCR, Project/Scope, `room_instances` et
les seeds UI, mais pas encore le vrai Inventory Core, les checkpoints Room ni le graphe
MasterStory. L'ordre recommandé commence par le contrat RAG transversal, puis Inventory Core,
OCR candidat, Inventory RAG, Rooms, MasterStory, UI et enfin BGE/Qdrant.

---

## 2026-06-13 — Audit PR-4..9 + actions bornées traitées (agent_ouighour)

`SYNC_PROOF` : `local_head = origin/main = e03b53b`, delta `0 0`. Constat : les 6 couches
PR-4→PR-9 sont **déjà implémentées** par MALEX/Codex (tables + services + routes + tests, 81 tests
au total). Les items inbox étaient des directives d'intégration pour Vincent, pas des TODO.

### Livrés ce tour (signé agent_ouighour)

- **`AUDIT_GAP_RAG_BGE_VS_PR7.md`** (PR-7, lecture seule) : écarts handoff BGE ↔ contrats PR-7.
  Champs manquants signalés : `sensitivity`, statut chunk `quarantined`, entonnoir
  `candidate_limit→result_limit`, `context_token_budget`, détection injection prompt (au-delà du
  seul `SECRET_PATTERN`). Plan de raccord BGE/Qdrant borné : runner interne `:8091` jamais public,
  branché sur `requestRagReindex` (embeddings) et `queryRag` (score), `revoke` supprime les points
  Qdrant, score lexical conservé en fallback. **0 code.**
- **`MAPPING_CANON_PROJECT_SCOPE_TEMPLATES.md`** (PR-4/PR-5, lecture seule) : table objet canon →
  obligations `project_id` + `template_id+version`. PR-6 (`guided_sessions`) cité comme modèle à
  reproduire (freeze `guide_version + target_schema_id + target_schema_version`). Proposition
  `classe = project + membres`, mini-contrat `TemplateFrozenRef` factorisé. **0 code.**
- **PR-9 observabilité active** (code borné, `services/jobs.ts`) : `recordWorkflowEvent` câblé sur
  4 transitions du lifecycle jobs — `claimNextJob`→`workflow_started`,
  `markJobNeedsReview`→`validation_requested`, `completeJob`→`workflow_completed`,
  `failJob`→`workflow_failed` (blocker = erreur). Helper `emitJobWorkflowEvent` best-effort :
  l'observabilité ne peut pas casser le cycle job ; aucun payload privé inscrit ; `job_events` et
  `audit` inchangés ; 1 job = 1 workflow (`workflow_id = job.id`, `capability_id = workflow_type =
  job.type`, `project_id` dérivé du scope). Nouveau test `jobs_workflow_observability.test.ts`.

### Vérifs

| Verif | Résultat |
|---|---|
| Backend `tsc --noEmit` | 0 erreur |
| Backend vitest | **207/207** (44 fichiers) |
| `git diff --check` | OK |

### Reste `open`

PR-6 (directive intégration MOTH/CDC future, non exécutée). Décisions MALEX attendues :
champ `sensitivity` (impact contrat `shared`), `classe = project`, `TemplateFrozenRef` factorisé,
route `GET /rag/stats` gated admin. **Gate** : aucun câblage BGE réel, migration, endpoint public
ou changement de périmètre avant validation humaine MALEX.

— agent_ouighour

---

## 2026-06-13 — RAG coordination : gate vérifié + décision raccord BGE/Qdrant

Réponse de **agent_ouighour** à l'item inbox « RAG de coordination livré ». Lecture seule,
aucun code modifié. `local_head = origin/main = c7c2426`, delta `0 0`.

### Vérification du gate `POST /api/v1/rag/coordination/sync`

- Montage correct : `index.ts:75` routeur RAG à la racine `/api/v1`, chemin complet
  `/api/v1/rag/coordination/sync`.
- `requireUser` au niveau routeur → 401 sans token ; `assertAdmin` dans le handler
  (`syncCoordinationRagResources`) → 403 pour teacher/student, OK admin/godmode.
- Test `rag_router.test.ts` : student → 403, admin → 200.
- Pas de piège gate-ordering : le gate admin est dans le handler, pas en `router.use` sans path
  (contrairement au bug corrigé sur `diagnostics`/`admin`). Aucune fuite vers les routeurs traversants.

### Décision

Raccord embeddings réels **BGE-M3 + Qdrant** sur le shell RAG existant via **PR-7** : travail
séparé, gated admin/godmode. Le scoring lexical reste fallback ; BGE remplace le `embedding_ref`
NULL et le score, sans modifier les permissions, Resource Truth ou le cycle preflight/validation.
L'auto-sync post-pull est différée — priorité au runner embeddings cité.

— agent_ouighour

---

## 2026-06-13 — RAG de coordination Git/inbox — LIVRÉ

**Livrable MALEX/Codex.** Première exploitation concrète du RAG permissionné pour accélérer la
synchronisation MALEX/Vincent sans remplacer le protocole Git.

Ajouts :

- route admin/godmode `POST /api/v1/rag/coordination/sync` ;
- synchronisation des fichiers `SUIVI.md`, `SYNC_THREAD_MALEX_VINCENT.md`,
  `INBOX_MALEX.md` et `INBOX_VINCENT.md` en ressources RAG `validated/canonical` ;
- scope `owner` par acteur admin/godmode, pour éviter toute exposition aux comptes non autorisés ;
- chunks reconstruits depuis les sections Markdown, citations conservées par `RagContextPack` ;
- surface frontend `Memoire coordination` pour synchroniser puis interroger l'historique avec citations ;
- aucun contournement du protocole : le RAG aide à retrouver les passages, le Git reste source de vérité.

À brancher plus tard côté Vincent si utile :

- automatisation post-commit / post-pull de cette sync ;
- raccord au runner BGE/Qdrant via `rag_reindex` ;
- éventuel scope projet privé partagé MALEX/Vincent si plusieurs comptes doivent interroger la même mémoire.

Verification prévue : lint frontend, build frontend, tests backend, lint backend, `git diff --check`.

---

## 2026-06-13 — Frontend : surface projets multi-utilisateur — LIVRÉE

**Livrable MALEX/Codex.** Première consommation frontend de la couche Project/Scope multi-utilisateur livrée par Vincent.

Ajouts :

- client API pour `GET /projects`, `GET /projects/:id/members`,
  `GET /projects/:id/resources` et `POST /projects/:id/resources` ;
- panneau `Projet` dans le mode Project ;
- lecture des projets accessibles à l'utilisateur connecté ;
- lecture des membres et ressources partagées du projet ;
- rattachement d'une ressource validée à un projet quand le backend l'autorise ;
- aucun changement backend, aucune création de projet/membre, aucune action sensible ajoutée.

Verification :

- `npm run lint:frontend` ;
- `npm run build:frontend` ;
- `npm test` : 42 fichiers / 190 tests ;
- `npm run lint` ;
- `git diff --check`.

---

## 2026-06-13 — Multi-utilisateur RÉEL : partage de ressources par projet + fix gate-ordering — LIVRÉE

**GO Vincent (« rendre l'application multi-utilisateur »).** Construit SUR la fondation Project/Scope de Codex
(pas reconstruit) : l'accès vient de l'appartenance au projet, plus de `owner = teacher`.

### Livré
- **`packages/shared`** : `AttachProjectResourceRequestSchema {resource_id, access_level}` (additif).
- **`services/projects.ts`** : `listProjectResources(actor, projectId)` — lisible par **tout membre** (join
  `resources` ↔ `resource_scopes`). Réutilise `attachResourceScope`/`decideScopedPermission` existants.
- **`routers/projects.ts`** : `GET /projects/:id/resources` (membres) + `POST /projects/:id/resources`
  (owner/admin projet ; le service `attachResourceScope` existait mais **n'avait aucune route** — comblé).
- **🐛 FIX gate-ordering (régression latente exposée par le merge)** : `diagnostics` et `admin` faisaient
  `router.use(requireRole('admin'))` **sans path**. Montés à la racine `/api/v1` AVANT les routeurs de Codex
  (`projects`/`jobs`/`schema_templates`/`guided_runtime`/`rag`), ce gate bloquait **toute** requête non-admin
  traversante → un teacher recevait `403 forbidden` sur `POST /projects`. Corrigé en scopant les gates à
  `/diagnostics` et `/admin`. **Tous les routeurs verticaux de Codex étaient impactés** côté serveur réel.

### Tests `vitest` **200/200** ✓ (+5 : `project_resources_sharing` ×3, `router_gating_integration` ×2 —
ce dernier monte diagnostics+admin+projects dans l'ordre de `index.ts`, ce que les tests isolés ne faisaient pas) ·
`tsc` back+front ✓ · `vite build` ✓.
Smoke runtime ✓ : teacher crée projet+ressource, ajoute un élève membre, rattache la ressource → **l'élève (autre
utilisateur) voit la ressource partagée** ; non-membre 404 ; membre non-admin attach 403 ; gates admin toujours 403
pour student.

### Invariants / périmètre
- Accès par membership + scope explicite (`PERMISSION > PREFERENCE` respecté). Audit `resource.scope_attached`.
- Rien de cassé : les surfaces admin (token-usage, /admin/*) restent gated admin/godmode.
- Frontend (UI projets) = territoire MALEX, non touché ici.

---

## 2026-06-13 — Protocole anti-desynchronisation Git/inbox + validation graduée — LIVRÉ

Objectif : éviter qu'un agent rate des commits déjà poussés en lisant une branche locale ou une
inbox obsolète, tout en gardant un système d'échange moins verrouillé et plus prudent.

Ajouts :

- ajout de `PROTOCOLE_SYNC_GIT_INBOX.md` ;
- référence obligatoire depuis `CLAUDE.md`, `SYNC_THREAD_MALEX_VINCENT.md`,
  `INBOX_MALEX.md` et `INBOX_VINCENT.md` ;
- rituel `git fetch --all --prune` + comparaison `HEAD...origin/main` avant lecture ;
- bloc `SYNC_PROOF` attendu pour toute réponse de coordination ;
- règle explicite : si un message semble absent, citer le commit lu avant toute conclusion.
- clarification de `POLITIQUE_VALIDATION_GRADUEE.md` : moins de double validation, plus de
  proportionnalite entre risque, effet, scope et gate ;
- separation nette entre lecture/proposition fluide et execution/publication sous validation.

Verification :

- `npm ci --cache /private/tmp/masterflow-npm-cache` : 0 vulnérabilité ;
- `npm test` : 42 fichiers / 190 tests ;
- `npm run lint` ;
- `npm run lint:frontend` ;
- `npm run build:frontend` ;
- `git diff --check`.

---

## 2026-06-13 — INTÉGRATION : merge `codex/frontend-masterflow` → `main` (fondations PR-1→9 + PR-3 admin) — LIVRÉE

**GO Vincent (« intègre tout sur main »).** Plutôt que reconstruire Project/Scope (déjà codé par Codex), on
fusionne sa branche fondations dans `main`. Le merge porte les deux mondes : mon **PR-3 admin `API_manage`**
(invitations, `set_user_role`, monitoring, register invite-only, vite 8/0-vuln) + les **fondations PR-1→9** de
Codex (projects/scopes/ownership, jobs/runners, schema templates, guided runtime, RAG shell, workflow
observability, dépréciation non destructive de Corrector).

### Conflits résolus (6, tous additifs — les deux côtés conservés)
- `apps/backend/src/db/schema.ts` : tables `invitations` **et** `projects`/`project_members`/`ownership_edges`/
  `resource_scopes`/`rag_*`/… coexistent ; types `InvitationRow` + tous les Row de Codex.
- `apps/backend/src/db/seed.ts` : `seedDemoUsage` (token_events démo) **et** `SCHEMA_TEMPLATE_SEEDS` ; signature
  `seedAll` étendue (`schemaTemplates`).
- `apps/backend/src/index.ts` : montage de tous les routeurs (admin + jobs/projects/schema_templates/
  guided_runtime/rag).
- `SUIVI.md` / `INBOX_MALEX.md` / `SYNC_THREAD_MALEX_VINCENT.md` : journaux unionés (entrées des deux côtés).
- `packages/shared/src/index.ts` : auto-mergé proprement (contrats additifs des deux côtés).

### Vérifs (arbre intégré)
`vitest` **185/185** ✓ (40 fichiers : 55 Claude + 130 Codex) · `tsc --noEmit` back ✓ · `tsc` front ✓ ·
`vite build` ✓ (rolldown) · `npm audit` **0 vuln**.

### Invariants / périmètre
- Rien de nouveau n'est « live » en UI (les fondations PR-1→7 restent specs ; PR-8/9 backend gated admin/godmode).
- `corrector-001` reste en base `status=deprecated` (non destructif). `POST /register` reste invite-only.
- Prochain chantier réel ouvert : **Project/Scope réel** (memberships/scopes explicites) — à construire sur ces
  fondations, pas re-créé.

---

## 2026-06-13 — Coordination : réponse à la clôture fondations PR-1→9 de Codex (axe + consigne rebase)

**Contexte.** Codex/Malex a livré sur `origin/codex/frontend-masterflow` (non mergée) un chantier « Fondations
PR-1→9 » (≠ ma numérotation PR-1/2/3). PR-1→7 = packs/specs ; PR-8 `jobs_shell` + PR-9 `workflow_observability` =
backend livré. Branché après ma PR-1 → divergence `main` +6 / codex +59.

**Décisions (Vincent : « oui à tout, traite ce que Codex demande sans empiéter sur le récent ») :**
- Réponse écrite dans `SYNC_THREAD_MALEX_VINCENT.md` + pointeur `INBOX_MALEX.md`.
- **Axe retenu = ③ Project/Scope réel** (reco Codex).
- **PR-C0 (Corrector déprécié, non destructif) accepté** : `corrector-001` reste en base `status=deprecated` ;
  vérifié qu'aucune feature backend récente n'en dépend.
- **Consigne d'intégration (protège PR-2/3 + vite) :** Codex doit **rebaser sa branche sur `main` (`be04d77`)**
  avant tout merge ; conflits additifs attendus sur 6 fichiers (schema/seed/index/shared + SUIVI/INBOX_MALEX) ;
  l'observabilité workflow est dans un routeur séparé → pas de conflit avec `diagnostics.ts` (token-usage).

**Non fait volontairement :** pas de merge des 59 commits sur `main` (chantier hors MVP : jobs/runners/OCR/RAG/
project-scope ; Codex lui-même : « les fondations ne sont pas une invitation à brancher large »). Le chantier
Project/Scope reste à démarrer (pas lancé sur une décision de fin de session fatiguée).

---

## 2026-06-13 — Durcissement sécu : vite 6→8 + esbuild 0.28.1 → `npm audit` 0 vuln — LIVRÉE + poussée (MALEX ok)

**GO Malex + Vincent reçu.** Résout les 3 high dev-only laissées par PR-3 (advisories `esbuild` GHSA-gv7w-rqvm-qjhr
+ GHSA-g7r4-m6w7-qqqr, via la chaîne `vite`).

### Livré
- **`apps/frontend/package.json`** : `vite` `^6.0.0 → ^8.0.16`, `@vitejs/plugin-react` `^4.3.0 → ^6.0.2`
  (peer vite ^8). Le `vite@6.4.3` du front (seule copie vulnérable) dédupe désormais sur `vite@8.0.16` —
  comme vitest qui était déjà sur 8.
- **`npm audit fix`** (non-`--force`) : `esbuild 0.28.0 → 0.28.1` (correctif), partagé tsx + vite. **0 vuln.**
- Node 22.22.3 satisfait l'exigence vite 8 (`^20.19 || >=22.12`). `vite.config.ts` inchangé (n'utilise que
  `server.{port,host,allowedHosts,proxy}` + `react()` — stables 6→8).

### Vérifs
`npm audit` **0 vuln** · `vitest` 55/55 ✓ · `tsc` front ✓ · `vite build` ✓ (rolldown, 305 ms ; bundle 598 KB,
warning chunk recharts attendu) · **dev server vite 8 boote** (config OK, sert HTTP 200, `allowedHosts` accepté).

### Gate
Intégrée sur `main` + poussée sur `origin/main`. Aucun changement fonctionnel runtime (outil de build uniquement).

---

## 2026-06-13 — PR-3 : admin API_manage (invitations + comptes/rôles) + monitoring usage/coût (API_corrector) — LIVRÉE + intégrée sur `main`

**GO Vincent reçu 2026-06-13 : push `main` autorisé.** Merge fast-forward `main` `1bac470` → `cf5cfcb`, poussé sur
`origin/main`. **Décision humaine Vincent : avancer sans le GO téléphonique de Malex.** Choix tranchés avec Vincent :
(1) changement de rôle = **action sensible** (validator godmode) ; (2) inscription **sur invitation uniquement**
(register ouvert fermé) ; (3) dataviz = **Recharts**.

### Livré
- **Backend — invitations (codes d'accès)** : table `invitations` (`db/schema.ts`), engine `engines/invitations.ts`
  (create/list/revoke/redeem, code base32 CSPRNG, garde-fou **rôle ≤ rang du créateur**), router
  `routers/admin.ts` (`GET /admin/users`, `GET|POST /admin/invitations`, `POST /admin/invitations/:code/revoke`,
  gated `requireRole('admin')`).
- **Backend — inscription sur invitation** : `POST /register` exige désormais un `invite_code` valide (sinon 403),
  le rôle du compte = celui porté par le code (plus de 'student' codé en dur). ⚠️ **changement de comportement.**
- **Backend — changement de rôle = action sensible** `set_user_role` (registre `high`, `validator_role: godmode`),
  engine `engines/users_admin.ts` (`executeSetUserRole` + `listAdminUsers`), dispatcher recomposé dans
  `engines/executors.ts` (`{set_global_setting, set_user_role}` ; `action_engine` importe d'ici). Garde-fous :
  assert godmode à l'exécution, interdit de changer son propre rôle, interdit de rétrograder le dernier godmode.
- **Backend — registre** : entrées `set_user_role` / `view_users` / `create_invitation` (status `live`).
- **Backend — seed démo usage** : `token_events` de démonstration (~41, tâches chat/correction/ocr/bareme,
  coût via `llm_pricing`) si table vide et `MASTERFLOW_SEED_DEMO_USAGE !== '0'` ; **jamais en test**.
- **Contrat `packages/shared`** (additif) : `InvitationSchema`, `CreateInvitationSchema`, `AdminUserSchema`,
  `SetUserRoleSchema`.
- **Frontend PoC** (territoire MALEX) : `recharts` ajouté ; `admin-console.tsx` (invitations / comptes+rôles avec
  flux d'action sensible déroulé à l'écran / monitoring Recharts : coût&tokens par jour, par modèle, par tâche,
  par utilisateur) ; `register-form.tsx` (inscription sur code) ; `api.ts` (+5 fonctions) ; intégration minimale
  `App.tsx` (`canAdmin`, montage gated `≥ admin`).

### Tests `vitest` 55/55 ✓ (37 → +18 : `invitations.test.ts`, `users_admin.test.ts`) · `tsc --noEmit` backend ✓ ·
`tsc --noEmit` frontend ✓ · `vite build` ✓ (607 modules — recharts).
Smoke runtime (DB jetable) ✓ : login godmode, GET users, création/redemption de code, register 403 sans code /
201 au rôle du code / 400 si épuisé, cycle `set_user_role` create→preflight(pending,godmode)→validate→execute
(teacher→admin), gating student→403, dataviz peuplée.

### Invariants tenus
- Aucune action sensible sans validation humaine (`set_user_role` : `pending_validation` obligatoire, execute refuse
  ≠ approved, validator godmode + assert à l'exécution).
- Permissions jamais inférées ; codes capés au rang du créateur (admin ≠ code godmode).
- Trace `audit_logs` : invitation_created/revoked, auth.register (+ code/rôle), changement de rôle.
- Contrat additif rétro-compatible ; secrets hors BDD (inchangé).

### ⚠️ Points d'attention
- ~~`npm audit` : 3 high (chaîne dev `esbuild`/`vite`)~~ **→ RÉSOLU** (entrée 2026-06-13 vite 6→8 + esbuild 0.28.1, 0 vuln).
- Bundle front ~598 KB (recharts) > 500 KB : warning de chunk attendu pour un PoC.

### Gate
**Intégrée sur `main` + poussée sur `origin/main`** (GO Vincent 2026-06-13). MALEX prévenu via `INBOX_MALEX.md`
(notif `done` — pas une auto-validation ; à lui de revoir/reprendre le PoC frontend, son territoire).

---

## 2026-06-13 — PR-2 : écriture global_settings via action sensible — LIVRÉE + intégrée sur `main`

**GO Vincent reçu 2026-06-13.** Merge fast-forward `main` `1b08b38` → `7b32573`.

### Livré (`claude/pr2-settings-action`, commits `92741ae` + `7b32573`)
- **`packages/shared/src/index.ts`** : `validator_role?: Role` additif dans `ActionRegistryEntrySchema`
  (rétro-compatible ; entrées existantes inchangées) + `SetGlobalSettingSchema {app, key, value}`.
- **`seeds/action_registry_seed.v1.json`** : entrée `set_global_setting` (medium_high, preflight+validation,
  `validator_role: admin`, `ui_surface: admin_settings_cockpit`, `status: live`).
- **`engines/permission_runtime.ts`** : `validatorRoleFor` lit `entry.validator_role ?? 'teacher'` — généralise
  sans casser l'existant (`approve_validation_item` reste `teacher`).
- **`engines/settings.ts`** (nouveau) : allowlist `ADMIN_CONTROLLED_KEYS` (`llm::provider/model/base_url/temperature`,
  `app::maintenance_mode/max_tokens_per_request`), exécuteur `executeSetGlobalSetting` (assert `role ≥ admin` en
  défense en profondeur, validation payload, vérif allowlist, UPSERT `global_settings`, retour diff
  `{previous, new}`), map `ACTION_EXECUTORS`.
- **`engines/action_engine.ts`** : dispatcher `ACTION_EXECUTORS` par `registry_id` (défaut = mock MVP conservé) +
  try/catch → `status: failed` + audit `execute_refused` si l'exécuteur lève.
- **`tests/settings_action.test.ts`** (nouveau) : 6 cas couverts.

### Tests `vitest` 37/37 ✓ · `tsc --noEmit` ✓ · `vite build` ✓ (32 modules)

### Invariants tenus
- Aucune action sensible sans validation humaine explicite (`pending_validation` obligatoire ; `execute` refuse ≠ `approved`).
- Écriture settings = action sensible, gate double : validation admin + assert admin à l'exécution.
- Secrets jamais en BDD ; `global_settings` = config non-secrète uniquement.
- Contrat additif rétro-compatible.
## 2026-06-13 — Bridge Project/Scope des deltas professeur

**Livrable MALEX/Codex.** Fermeture du dernier scope pedagogique encore porte uniquement par une
reference texte.

Ajouts :

- `project_id` nullable dans `TeacherDecisionDelta` ;
- colonne et index projet idempotents sur `teacher_decision_deltas` ;
- delta projet reserve au professeur auteur, membre `editor+` du projet ;
- `context_refs[0] === project_id` pour rendre le contexte canonique non ambigu ;
- admin/godmode limites a la supervision : aucune signature a la place du professeur ;
- fallback legacy sans `project_id` conserve pour les deltas historiques ;
- aucun enrichissement, score ou changement de methode applique automatiquement.

Verification :

- `npm test` : 37 fichiers / 161 tests ;
- `npm run lint` ;
- `npm run lint:frontend` ;
- `npm run build:frontend` ;
- `git diff --check`.

---

## 2026-06-13 — Bridge Project/Scope du handoff OCR

**Livrable MALEX/Codex.** Rattachement des intentions `ocr_prepare` aux vrais projets, avec
separation explicite entre copies pedagogiques et references morphologiques personnelles.

Ajouts :

- `project_id` nullable dans `OcrPrepareRequest` ;
- `project_scope === project_id` pour les nouvelles intentions OCR projet ;
- OCR copie projet limite aux teachers membres `editor+` ;
- manifest de pre-correction existant, valide, du meme projet et du meme owner ;
- `validation_ref` du job obligatoirement identique a celle du manifest ;
- jobs de copie projet visibles aux editeurs du projet ;
- OCR morphologique projet reserve a l'utilisateur owner avec consentement et membership ;
- job morphologique invisible aux autres membres du projet, y compris teachers editeurs ;
- fallback legacy sans `project_id` conserve ;
- aucun upload, OCR reel, extraction, promotion canon ou runner ajoute.

Verification :

- `npm test` : 37 fichiers / 160 tests ;
- `npm run lint` ;
- `npm run lint:frontend` ;
- `npm run build:frontend` ;
- `git diff --check`.

---

## 2026-06-13 — Bridge Project/Scope calibration et revue qualite

**Livrable MALEX/Codex.** Rattachement du diagnostic de cohorte au vrai projet, sans ajouter
d'application automatique du delta.

Ajouts :

- `project_id` nullable dans `CohortCalibrationReview` ;
- colonne et index projet idempotents sur `cohort_calibration_reviews` ;
- batch, profil institutionnel et runs sources obligatoirement alignes sur le meme projet ;
- `project_scope === project_id` pour les nouveaux diagnostics projet ;
- creation et lecture accessibles aux membres `editor+` du projet ;
- items de controle qualite heritent du projet par leur review, sans duplication de scope ;
- fallback legacy sans `project_id` conserve avec les permissions historiques ;
- tests de diagnostic cree par un editeur, lecture owner/editor, mismatch et immutabilite des
  scores ;
- aucun delta applique, aucune note finale, aucun profilage durable et aucune validation
  automatique.

Verification :

- `npm test` : 37 fichiers / 158 tests ;
- `npm run lint` ;
- `npm run lint:frontend` ;
- `npm run build:frontend` ;
- `git diff --check`.

---

## 2026-06-13 — Bridge Project/Scope des feedbacks et exports

**Livrable MALEX/Codex.** Troisieme tranche de migration progressive vers les vrais projets,
jusqu'au handoff `export_prepare`.

Ajouts :

- `project_id` nullable dans `FeedbackDraft`, `CorrectionExportPreview` et
  `ExportPrepareRequest` ;
- colonnes et index projet idempotents sur feedbacks et previews ;
- feedback projet aligne sur son run et ses preuves ;
- preview projet alignee sur son batch, ses feedbacks approuves et ses runs sources ;
- preparation et lecture des brouillons limitees aux membres `editor+` ;
- un teacher editeur peut preparer feedback, preview et job export pour l'owner du projet ;
- validation pedagogique du feedback et approbation de la preview toujours reservees a l'owner ;
- admin/godmode restent en supervision lecture et ne valident pas a la place du professeur ;
- job `export_prepare` projet lisible par les editeurs du projet, invisible aux non-membres ;
- fallback legacy sans `project_id` conserve en owner-only ;
- aucune publication, livraison externe, note finale ou rendu automatique ajoute.

Verification :

- `npm test` : 37 fichiers / 157 tests ;
- `npm run lint` ;
- `npm run lint:frontend` ;
- `npm run build:frontend` ;
- `git diff --check`.

---

## 2026-06-13 — Bridge Project/Scope de la chaine de correction

**Livrable MALEX/Codex.** Deuxieme migration progressive des scopes libres vers un vrai
`project_id`, cette fois sur les objets de reference et de preparation de correction.

Ajouts :

- `project_id` nullable dans les contrats rubriques, profils institutionnels, batches,
  submissions, manifests, runs de pre-correction et requetes `correction_prepare` ;
- colonnes et index projet idempotents sur toute cette chaine ;
- nouveaux runs projet : `project_scope` doit egaler `project_id` ;
- manifest, batch, submission, rubrique, profil et preuves doivent tous viser ce meme projet ;
- ecriture et lecture d'un run projet exige membership `editor+` ;
- preuves multi-auteurs autorisees seulement lorsqu'elles appartiennent toutes au meme projet ;
- un editeur projet peut preparer et relire le job `correction_prepare` du projet ;
- anciens objets sans `project_id` conserves avec les gates owner-only historiques ;
- aucune note finale, validation automatique, publication ou export ajoute.

Cette passe ne migre pas encore les feedbacks et previews/exports. Ils restent owner/scope legacy
jusqu'a une tranche dediee avec leurs propres tests de confidentialite et validation.

Verification :

- `npm test` : 37 fichiers / 155 tests ;
- `npm run lint` ;
- `npm run lint:frontend` ;
- `npm run build:frontend` ;
- `git diff --check`.

---

## 2026-06-13 — Consolidation Project/Scope vers Evidence et signaux

**Livrable MALEX/Codex.** Premier remplacement progressif des `project_scope` libres par un
`project_id` reel, sans casser les donnees et tests legacy.

Ajouts :

- `project_id` nullable dans `EvidenceEvent` et `PedagogicalSignal` ;
- colonnes/migrations idempotentes `project_id` sur `evidence_events` et
  `pedagogical_signals` ;
- index projet dedies ;
- nouveaux objets projet : `project_scope` doit egaler `project_id` pendant la transition ;
- ecriture preuve/signal projet exige membership `editor+` ;
- lecture projet exige membership reel et peut agreger les preuves des owners membres ;
- un signal projet peut citer plusieurs owners uniquement si toutes les preuves appartiennent
  au meme `project_id` ;
- objets legacy sans `project_id` conserves en mode teacher owner-only ;
- tests membership, lecture projet, multi-owner et mismatch scope/id.

Cette tranche ne migre pas encore les rubriques, batches, correction, feedback ou exports. Elle
pose le pattern de migration retrocompatible qui pourra etre applique progressivement.

Verification :

- `npm test` : 37 fichiers / 153 tests ;
- `npm run lint` ;
- `npm run lint:frontend` ;
- `npm run build:frontend` ;
- `git diff --check`.

---

## 2026-06-13 — PR-7 RAG permissionne

**Livrable MALEX/Codex.** Shell RAG scope, cite, revoke-aware et branche sur Resource Truth et
Jobs, sans pretendre livrer BGE/Qdrant.

Ajouts :

- contrats partages `RagResource`, `RagResourceChunk`, `RagContextPack`, `RagCitation`,
  `RagQueryRequest/Response`, statuts et raisons de refus ;
- tables `rag_resources`, `rag_resource_chunks`, `rag_context_packs`, `rag_query_events` ;
- routes auth `POST /rag/query`, `GET/POST /rag/resources`,
  `POST /rag/resources/:id/reindex`, `POST /rag/resources/:id/revoke`,
  `GET /rag/context-packs/:id` ;
- chaque manifeste RAG reference une ressource Resource Truth existante et herite de son statut ;
- permission scope/owner avant retrieval et avant scoring ;
- retrieval lexical borne pour valider le contrat sans moteur vectoriel fictif ;
- seules les ressources `validated` et fiables alimentent les context packs ;
- citations obligatoires avec source, statut, trust, scope, score et extrait court ;
- query sans source fiable = refus explicite, sans reponse brodee ;
- query stockee uniquement sous forme de hash ;
- detection de secrets avant creation des chunks ;
- revoke admin/godmode, chunks revoques et context packs existants marques `stale` ;
- reindex raccorde au shell jobs par un job `rag_reindex`, chunks marques `stale` en attente ;
- tests service + router.

Le moteur local BGE-M3/reranker/Qdrant reste a raccorder par Vincent derriere le job
`rag_reindex`. Le contrat de permission, provenance, citation et revocation est deja en place.

Verification :

- `npm test` : 37 fichiers / 152 tests ;
- `npm run lint` ;
- `npm run lint:frontend` ;
- `npm run build:frontend` ;
- `git diff --check`.

---

## 2026-06-13 — PR-6 Guided Runtime prive

**Livrable MALEX/Codex.** Premier runtime guide prive, testable sans LLM, branche sur
Project/Scope et Template Registry.

Ajouts :

- contrats partages `ConversationGuide`, `GuidedSession`, `GuidedSessionParticipant`,
  `GuidedContribution`, `GuidedProgress`, `GuidedQuestion`, `GuidedContradiction` ;
- tables `conversation_guides`, `guided_sessions`, `guided_session_participants`,
  `guided_contributions` ;
- routes auth `GET/POST /guides`, `GET/PATCH /guides/:id`,
  `POST /guided-sessions`, `GET /guided-sessions/:id`,
  `POST /guided-sessions/:id/answers`, `/advance`, `/complete` ;
- guides draft crees par teacher+, owner-prives et rattachables a un `project_id` ;
- sessions privees qui figent `guide_version`, `target_schema_id` et `target_schema_version` ;
- progression deterministe depuis les champs requis du template ;
- contradictions conservees et visibles, sans ecrasement silencieux ;
- participants de session distincts des lecteurs du guide brut ;
- `complete` marque uniquement la session privee comme terminee, sans publication, email,
  devis, inscription, export ou asset ;
- audit creation/update guide, creation session, participant, answer, advance et complete ;
- tests service + router.

Cette couche rend possible MOTH/CDC en atelier prive. Elle ne livre pas encore de lien public,
bot externe, inscription Ours d'Or, devis, badge, email, analytics nominatives ou UI finale.

Verification :

- `npm test` : 35 fichiers / 142 tests ;
- `npm run lint` ;
- `npm run lint:frontend` ;
- `npm run build:frontend` ;
- `git diff --check`.

---

## 2026-06-13 — PR-5 Template / Schema Registry

**Livrable MALEX/Codex.** Registre backend minimal des templates versionnes, candidats ou
valides, sans moteur conversationnel ni marketplace.

Ajouts :

- contrats partages `SchemaTemplate`, `CreateSchemaTemplateRequest`, domaines et statuts ;
- table `schema_templates` ;
- seeds candidats non canoniques :
  `cdc-template-candidate-v1`, `quote-intake-candidate-v1`,
  `event-registration-candidate-v1`, `asset-manifest-candidate-v1` ;
- service interne `listSchemaTemplates`, `getSchemaTemplate`, `createSchemaTemplate`,
  `validateSchemaTemplate` ;
- routes auth `GET /schema-templates`, `GET /schema-templates/:id`,
  `POST /schema-templates`, `POST /schema-templates/:id/validate` ;
- creation limitee teacher+ en statut `candidate` ;
- validation limitee admin/godmode ;
- templates owner-prives masques aux autres owners ;
- templates `deprecated` et `archived` masques par defaut ;
- validation basique : schema objet, `properties` non vide, `required_fields` coherents ;
- doublon `domain/name/version/owner` refuse pour forcer une nouvelle version explicite ;
- audit `schema_template.created` et `schema_template.validated` ;
- tests service + router.

Cette couche ne livre pas MOTH/CDC, devis, event ou asset pipeline : elle donne seulement le
support versionne que ces verticales devront figer en session ou en objet consommateur.

Verification :

- `npm test` : 33 fichiers / 133 tests ;
- `npm run lint` ;
- `npm run lint:frontend` ;
- `npm run build:frontend` ;
- `git diff --check`.

---

## 2026-06-13 — PR-4 Project/Scope reel

**Livrable MALEX/Codex.** Socle projets prives, memberships et premiers scopes ressources.

Ajouts :

- contrats partages `Project`, `ProjectMember`, `OwnershipEdge`, `ResourceScope` et
  `ScopedPermissionDecision` ;
- tables `projects`, `project_members`, `ownership_edges`, `resource_scopes` ;
- service interne `createProject`, `listProjects`, `getProject`, `addProjectMember`,
  `listProjectMembers`, `attachResourceScope` et `decideScopedPermission` ;
- routes auth `GET/POST /projects`, `GET /projects/:id`,
  `GET/POST /projects/:id/members` ;
- anti-enumeration : un non-membre recoit `project_not_found` ;
- creation projet limitee teacher+ ;
- memberships projet `viewer/participant/editor/admin/owner` ;
- audit `project.created`, `project.member_upserted`, `resource.scope_attached` ;
- tests service + router.

Cette couche remplace le scope texte libre pour les prochains raccords : ressources, jobs,
correction, MOTH/CDC et UI doivent se brancher sur un `project_id` reel quand la verticale
travaille dans un contexte projet.

Verification :

- `npm test` : 31 fichiers / 122 tests ;
- `npm run lint` ;
- `npm run lint:frontend` ;
- `npm run build:frontend` ;
- `git diff --check`.

---

## 2026-06-13 — Clôture fondations PR-1 à PR-9

**Livrable MALEX/Codex.** Rapport de clôture du plan fondations post-audit.

Ajout :

- `FONDATIONS_PR1_PR9_CLOSURE_REPORT.md`.

Clarification importante :

- PR-1 à PR-7 sont cadrées par packs/specs/recettes et doivent rester non deceptive tant que
  leurs runtimes réels ne sont pas livrés ;
- PR-8 est backend-livrée et renforcée côté jobs/runners ;
- PR-9 est backend-livrée côté workflow observability ;
- les runners réels Vincent doivent maintenant se brancher par les gates PR-8/PR-C7→PR-C11 ;
- toute prochaine verticale doit choisir explicitement entre Project/Scope réel, runner réel ou
  Guided Runtime privé.

Cette clôture évite de continuer à empiler des couches runner et remet le projet sur un choix
produit clair avant UI finale.

---

## 2026-06-13 — PR-9 workflow observability

**Livrable MALEX/Codex.** Observabilité workflow admin/godmode, sans payload brut ni action
runtime.

Ajouts :

- `SPEC_WORKFLOW_OBSERVABILITY.md` passé en implemented ;
- contrat partagé `WorkflowEvent` ;
- table `workflow_events` ;
- service interne `recordWorkflowEvent` ;
- `getWorkflowDiagnostics` avec agrégats ;
- `getWorkflowTrace` par workflow ;
- routes `GET /diagnostics/workflows` et `GET /diagnostics/workflows/:id` ;
- filtres période, capability et workflow type ;
- métriques : workflows, events, completion rate, failed, blocked, validations, p50/p95,
  coût nullable, tokens nullable, friction blockers ;
- gate admin/godmode via router diagnostics existant ;
- tests service + router.

Cette passe termine le plan fondations PR-1→PR-9 côté socle. Elle observe les workflows ; elle
ne lance aucun runner, ne publie rien, ne corrige rien et n'expose pas de contenu personnel brut.

---

## 2026-06-13 — PR-C11 gates famille/type runner

**Livrable MALEX/Codex.** Cohérence stricte entre `runner_family` et types de jobs claimés.

Ajouts :

- `SPEC_PR_C11_RUNNER_FAMILY_GATES.md` ;
- mapping interne `job_type -> runner_family` ;
- `claimNextJob` refuse une famille incompatible ;
- `claimNextJob` refuse les claims multi-types mélangeant plusieurs familles ;
- erreur `runner_family_not_allowed` ;
- tests mis à jour pour exiger `runner_family = asset` sur `asset_prepare` ;
- test refusant un runner `ocr_multimodal` qui tente de claim `asset_prepare`.

Mapping actif : OCR = `ocr_multimodal`, correction = `correction`, export = `export`, asset =
`asset`, RAG = `rag`, resource revoke = `resource`. Cette couche évite qu'un runner spécialisé
absorbe un job qui n'est pas de sa famille technique.

---

## 2026-06-13 — PR-C10 gates de claim runner

**Livrable MALEX/Codex.** Le heartbeat runner devient obligatoire avant claim.

Ajouts :

- `SPEC_PR_C10_RUNNER_CLAIM_GATES.md` ;
- `claimNextJob` refuse les runners inconnus ;
- `claimNextJob` refuse `draining` et `offline` ;
- `claimNextJob` refuse les heartbeats stale ;
- `claimNextJob` refuse les types de jobs non déclarés par le runner ;
- les tests PR-C8 exigent maintenant un heartbeat online avant claim ;
- test dédié inconnu/draining/stale/mauvais type.

Cette couche empêche un runner OCR de prendre un export, un runner en arrêt propre de reprendre
du travail, ou un processus inconnu de consommer la queue. Aucun droit utilisateur n'est déduit
du runner : il s'agit seulement d'un gate technique d'exécution.

---

## 2026-06-13 — PR-C9 heartbeats internes des runners

**Livrable MALEX/Codex.** Observabilité interne des runners avant activation réelle, sans route
publique.

Ajouts :

- `SPEC_PR_C9_RUNNER_HEARTBEATS.md` ;
- contrat `RunnerHeartbeat` partagé ;
- table `runner_heartbeats` ;
- `recordRunnerHeartbeat(input)` ;
- `getRunnerHeartbeat(runner_id)` ;
- `listRunnerHeartbeats()` ;
- `listClaimableRunnerHeartbeats(job_type, now?, stale_ms?)` ;
- statuts `online`, `draining`, `offline` ;
- filtrage des runners claimables par fraîcheur, statut et type de job ;
- audit sobre sans host secret ni contenu métier ;
- tests upsert, filtrage, secrets, colonnes et audit.

Vincent doit faire battre ses runners avant claim : `online` pour prendre du travail, `draining`
pour arrêter proprement sans nouveau job, `offline` pour maintenance. Les heartbeats ne créent
aucun droit utilisateur et n'activent aucune route publique.

---

## 2026-06-13 — PR-C8 claim et lease internes des runners

**Livrable MALEX/Codex.** Attribution sûre des jobs aux runners, sans broker externe, route
publique ou polling SQL direct.

Ajouts :

- `SPEC_PR_C8_RUNNER_CLAIM_AND_LEASE.md` ;
- colonnes nullable `runner_id`, `claimed_at`, `lease_expires_at` sur `jobs` ;
- migration idempotente par `ALTER TABLE` si colonnes absentes ;
- `claimNextJob(runner_id, types, lease_ms?)` ;
- `extendJobLease(job_id, runner_id, lease_ms?)` ;
- reprise d'un job `running` seulement si son lease est expiré ;
- vérification optionnelle du `runner_id` sur progress/review/complete/fail ;
- nettoyage du lease sur cancel, retry et finalisation ;
- aucun nouvel event type pour rester compatible avec les contraintes SQLite existantes ;
- tests claim, concurrence, expiration, extension, finalisation et mauvais runner.

Vincent doit faire consommer ses runners par `claimNextJob`, prolonger le lease pendant les
traitements longs, puis finaliser avec le même `runner_id`. Aucun runner ne doit scanner ou
modifier `jobs` directement.

---

## 2026-06-13 — PR-C7 lifecycle interne des runners jobs

**Livrable MALEX/Codex.** Transitions runner-only pour terminer proprement les jobs, sans route
publique ni écriture directe table.

Ajouts :

- `SPEC_PR_C7_RUNNER_JOB_LIFECYCLE.md` ;
- `markJobNeedsReview(job_id, result, review_reason)` ;
- `completeJob(job_id, result)` ;
- `failJob(job_id, error, detail?)` ;
- statut finalisable limité à `queued/running` ;
- progression finale forcée à `100` sur review/completion ;
- events `job_needs_review`, `job_completed`, `job_failed` ;
- audit sobre sans contenu privé ;
- refus des payloads/resultats/détails contenant des libellés de secrets ;
- tests runner lifecycle : review, complete, fail/retry, cancel et secrets.

Vincent peut brancher ses runners sans écrire directement `jobs`/`job_events`. Pour OCR,
correction et export sensibles, la sortie attendue reste `needs_review`, jamais une note finale
ou une publication.

---

## 2026-06-13 — PR-C6 handoffs jobs correction/export

**Livrable MALEX/Codex.** Sas interne entre objets validés et futurs runners correction/export,
sans runner, sans route publique et sans publication.

Ajouts :

- `SPEC_PR_C6_CORRECTION_EXPORT_JOB_HANDOFFS.md` ;
- contrats `CorrectionPrepareRequest` et `ExportPrepareRequest` ;
- service `createCorrectionPrepareJob` depuis manifest pré-correction validé ;
- service `createExportPrepareJob` depuis preview `approved_for_export` ;
- création owner-only professeur, admin/godmode en supervision lecture seulement ;
- alignement obligatoire owner/scope/batch/validation/workflow ;
- jobs `correction_prepare` et `export_prepare` créés en `queued` ;
- payloads réduits aux refs utiles, sans contenu privé ni `storage://private` pour export ;
- tests de refus manifest draft, preview non approuvée, validation incohérente et owner mismatch.

Cette couche donne à Vincent le point d'ancrage propre pour ses runners : ils doivent consommer
ces jobs uniquement, avancer en progression monotone, puis sortir en `needs_review`. La correction
ne crée toujours aucune note finale ; l'export ne publie toujours rien.

---

## 2026-06-13 — PR-C5 feedback student-safe et previews d'export

**Livrable MALEX/Codex.** Cycle interne supervisé du feedback pédagogique à la preview privée,
sans rendu final ni publication.

Ajouts :

- `SPEC_PR_C5_FEEDBACK_AND_EXPORT_PREVIEWS.md` ;
- contrats stricts `FeedbackDraft` et `CorrectionExportPreview` ;
- tables `feedback_drafts` et `correction_export_previews` ;
- feedback structuré : force, problème, preuves, impact, axe, action et critère de progression ;
- provenance par version de méthode et profil modèle `feedback_draft` validé optionnel ;
- validation pédagogique réservée à l'owner professeur ;
- formats preview `CSV`, `XLSX`, `PDF` et `report` ;
- sources limitées aux feedbacks approuvés et aux runs exacts du batch ;
- validation d'export distincte, réservée à l'owner ;
- `publication_allowed = false` imposé par contrat et BDD ;
- supervision admin/godmode en lecture et audits sans contenu privé.

`approved_for_export` n'engendre aucun job, fichier final, lien de livraison ou publication.
Vincent doit comparer les champs aux feedbacks et exports de ses phases P1–P4 et signaler les
formats ou contrôles qualité réellement manquants avant raccord renderer.

---

## 2026-06-13 — PR-C4 calibration et contrôle qualité

**Livrable MALEX/Codex.** Diagnostic interne de cohorte et échantillon de relecture, sans
modification des scores.

Ajouts :

- `SPEC_PR_C4_CALIBRATION_AND_QUALITY_REVIEW.md` ;
- contrats stricts `CohortCalibrationReview` et `QualityReviewItem` ;
- tables `cohort_calibration_reviews` et `quality_review_items` ;
- méthode versionnée `cohort-quality-review-v1` ;
- statistiques brutes sur l'échelle du profil institutionnel ;
- position sous/dans/au-dessus de la bande attendue ;
- aucun delta si moins de trois copies ;
- delta diagnostic borné vers le bord de bande, jamais appliqué ;
- détection des franchissements de seuils protégés ;
- échantillonnage des extrêmes, frontières, écarts statistiques et faibles confiances ;
- permission teacher owner, supervision admin/godmode et audit agrégé.

Aucune moyenne n'est forcée. Aucun score PR-C3 n'est modifié et aucune note finale, validation,
étiquette étudiante, route publique ou UI n'est ajoutée. Vincent doit comparer l'échantillonnage
et les métriques à ses contrôles qualité historiques avant tout raccord runner.

---

## 2026-06-13 — PR-C3 pré-correction explicable

**Livrable MALEX/Codex.** Fondation interne du scoring brouillon par critère, sans runner ni
note finale.

Ajouts :

- `SPEC_PR_C3_PRE_CORRECTION_EXPLICABLE.md` ;
- contrats `PreCorrectionRunDraft` et `CriterionScoreDraft` stricts ;
- tables `pre_correction_runs` et `criterion_score_drafts` ;
- dépôt interne `recordPreCorrectionDraft` sans route publique ;
- alignement obligatoire manifest/batch/copie/rubrique/profil/owner/scope ;
- manifest et rubrique validés avant écriture ;
- couverture exacte des critères de la rubrique ;
- preuves utilisables et confiance bornée pour chaque proposition ;
- éventuel profil modèle validé pour `criterion_analysis` ;
- sortie forcée en `needs_review`, scores forcés en `candidate` ;
- audit sans contenu pédagogique sensible.

Aucun total, `final_score`, calibration, feedback, validation professeur, export ou règle de
sujet codée en dur n'est livré. Vincent doit comparer ce contrat à son `scoring_trace` réel et
signaler les métadonnées de provenance manquantes avant tout raccord runner.

---

## 2026-06-13 — PR-C2 ingestion OCR et jobs shell

**Livrable MALEX/Codex.** Fondation observable pour les traitements OCR longs, sans runner réel.

Ajouts :

- `SPEC_PR_C2_OCR_INGESTION_AND_JOBS_SHELL.md` ;
- contrats `Job`, `JobEvent`, statuts/types et `OcrPrepareRequest` ;
- tables `jobs` et `job_events` avec index owner/scope ;
- création interne `ocr_prepare` pour copie ou référence morphologique ;
- manifest obligatoire pour copie, consentement obligatoire pour morphologie ;
- références `storage://` seulement et détection de payload secret ;
- isolation owner, supervision admin/godmode ;
- progression monotone, cancel/retry et historique ;
- routes de suivi sans route générique de création ;
- tests service et HTTP.

Aucun upload, worker, watcher, OCR, score ou canon n'est livré. Le job `queued` représente une
intention vérifiée en attente d'un runner. Vincent doit raccorder son OCR derrière ce service et
terminer les extractions en `needs_review`.

---

## 2026-06-13 — PR-C1 objets de référence correction

**Livrable MALEX/Codex.** Fondation versionnée de la correction, sans exécution.

Ajouts :

- `SPEC_PR_C1_RUBRICS_GRADING_BATCHES_MANIFESTS.md` ;
- `RubricTemplate` et `RubricVersion` avec cohérence poids/points ;
- `InstitutionalGradingProfile` avec bandes bornées et validation professeur ;
- `CorrectionBatch` ;
- `SubmissionRecord` privé relié à une preuve ;
- `PreCorrectionManifest` exigeant une validation pour tout état utilisable ;
- six tables SQLite, index et tests.

La zone 13–14 reste un repère institutionnel de cohérence et ne force aucune moyenne. Aucun
score, feedback, export, route ou runner n'est ajouté. PR-C2 devra consommer ces références pour
les jobs d'ingestion et ne jamais reprendre les heuristiques historiques en dur.

Vincent doit comparer ses correction sheets et manifests P1–P4 aux contrats et répondre avec les
champs manquants réellement nécessaires.

---

## 2026-06-13 — Décision : socle OCR Vincent absorbé et adapter morphologique déclaré

**Décision MALEX.** Le protocole OCR multimodal de Vincent est conservé comme apport transversal.

Architecture :

```text
runner ocr_multimodal commun
-> adapters métier indépendants
-> contrats, privacy, permissions et sorties séparés
```

Ajouts :

- `DECISION_ABSORPTION_OCR_COMMUN_ET_ADAPTER_MORPHOLOGIQUE.md` ;
- champ `runner_family` dans le registre ;
- contrat de sortie et gates explicites par adapter ;
- adapter `morphological-reference-v1` raccordé au canon Drive ;
- classification `sensitive_private`, consentement et validation utilisateur obligatoires ;
- tests prouvant que copies et morphologie partagent le runner sans partager leur contrat.

Aucun OCR n'est activé. Vincent doit auditer et découpler son runner existant avant branchement.
Le futur adapter morphologique produira des hints stylisés privés, jamais une identification,
une biométrie ou un canon automatique.

---

## 2026-06-13 — PR-C0 Corrector déprécié sans destruction

**Livrable MALEX/Codex.** Application runtime de la décision d'absorption de Corrector.

Ajouts :

- statut partagé de persona borné à `active | deprecated` ;
- migration seed de `corrector-001` vers `deprecated`, y compris sur base existante ;
- permissions historiques explicitement non autoritaires ;
- listes et contexte limités aux personas actifs ;
- activation et nouveaux blends Corrector refusés ;
- détail et blends historiques toujours relisibles ;
- tests moteur et HTTP de non-régression.

Cette migration ne retire aucune capacité de correction. OCR, scoring, calibration, feedback,
contrôle qualité et exports doivent être absorbés dans leurs engines et contrats canoniques.
Corrector cesse seulement d'être un persona métier souverain.

Vincent doit maintenant préparer PR-C1 à partir de ses features existantes : rubriques, profils
institutionnels, batches, submissions et manifests, sans recréer un persona Corrector.

---

## 2026-06-13 — PR-CB2 routage LLM par tâche et egress gated

**Livrable MALEX/Codex.** Le runner LLM ne route plus un provider externe sur la seule base de
variables globales.

Ajouts :

- contrat partagé `LLMTaskSchema` ;
- résolution d'un profil `task_model_profiles` validé et unique ;
- vérification du provider autorisé et du fallback déclaré ;
- blocage des configurations incomplètes ;
- allowlist d'origines réseau `LLM_EGRESS_ALLOWLIST` ;
- HTTPS obligatoire hors loopback, credentials/query/fragment interdits dans l'URL ;
- respect de `privacy_mode=local_only` ;
- branchement du gate avant tout `fetch` du runner ;
- tests du mock, du profil validé, des refus provider/tâche et de l'anti-SSRF.

Le mode mock reste sans réseau. Cette tranche ne prétend pas livrer un fallback multi-provider :
une seule configuration serveur est active. Budgets coût/latence, timeout/retry, administration
et validation sensible des profils restent à construire.

Vincent doit challenger le gate contre ses implémentations `API_corrector` / `vibe`, sans ajouter
de secret en BDD ni rendre un fallback fictivement disponible.

---

## 2026-06-13 — PR-CB1 adapter registry read-only

**Livrable MALEX/Codex.** Ajout d'un registre statique et versionné pour les entrées pédagogiques
OCR, WooClap, transcription et note professeur.

Ajouts :

- `SPEC_ADAPTER_REGISTRY_PR_CB1.md` ;
- contrat partagé `AdapterRegistryEntrySchema` ;
- seed `adapter_registry_seed.v1.json` ;
- moteur de lecture filtré par rôle ;
- gate défensif refusant tout adapter sans statut `live`, executor et UI `actionable` ;
- tests des statuts, de la visibilité professeur/étudiant et de la non-exécution.

Les adapters OCR, WooClap et transcription restent `shell/locked`. La note professeur est
`partial/readonly` : le socle EvidenceEvent existe, mais aucune route ni surface de saisie n'est
livrée. Aucune donnée pédagogique, aucun secret et aucun runner ne sont ajoutés.

Vincent doit comparer ces déclarations à ses runners existants et signaler les écarts, sans
activation avant Project/Scope, Jobs, stockage, permission/preflight, tests et recette.

---

## 2026-06-13 — Pont canon x features Vincent et terrain PR-CB0

**Livrable MALEX/Codex.** Le canon pedagogique a ete recroise avec les fonctions deja construites
dans `API_corrector`, `API_manage`, `vibe`, le pipeline Corrector local et les anciennes sources.

Constat : les owners existaient deja dans MasterFlow. Les fonctions Vincent apportent surtout
des implementations terrain et des adapters. Il ne faut creer aucun engine parallele.

Ajouts :

- `BRIDGE_CANON_FEATURES_VINCENT_CORRECTION_PEDAGOGIE.md` ;
- `SPEC_PEDAGOGICAL_EVIDENCE_SIGNAL_AND_TEACHER_DELTA.md` ;
- insertion de `PR-CB0` dans le plan de fondations.
- premiere implementation additive PR-CB0 dans `packages/shared` :
  `EvidenceEvent`, `PedagogicalSignal`, `TeacherDecisionDelta`, `TaskModelProfile` ;
- tests de garde des preuves, confiances, deltas IA/humain et profils de tache.
- migrations SQLite idempotentes des quatre objets, avec privacy privee par defaut, statuts
  fermes, confiances bornees et separation obligatoire proposition IA / decision humaine ;
- indexes scope/statut/date et tests de persistance, sans route publique.
- depot interne permissionne : teacher limite a ses propres preuves/deltas, signaux obligatoirement
  relies a des preuves accessibles, profils de modele reserves admin et forces en `draft` ;
- audits `evidence.captured`, `signal.observed`, `teacher_delta.recorded` et
  `model_profile.proposed`, sans payload pedagogique sensible dans les logs.

Le terrain partage prepare :

- evidence events normalises ;
- signaux pedagogiques prudents ;
- deltas entre proposition IA et decision professeur ;
- profils de routing modele par tache ;
- boucle d'amelioration sujet/rubrique/methode sous validation humaine.

Cette fondation est reutilisable par correction, cours, WooClap, suivi, MOTH/CDC, Ours d'Or,
devis et integration LMS. Elle reste `future` tant que routes, permissions, tests et recettes ne
sont pas livres.

---

## 2026-06-13 — Decision Corrector : absorption fonctionnelle, persona deprecie

**Decision MALEX.** Ajout de
`DECISION_ABSORPTION_CORRECTOR_ET_CALIBRATION_INSTITUTIONNELLE.md`.

Corrector n'est pas supprime fonctionnellement : les fonctions utiles des projets Vincent
doivent etre auditees puis absorbees dans le moteur de correction, les jobs, les rubriques,
les controles qualite, les feedbacks et les exports.

Cette absorption rend le systeme plus puissant : les capacites de correction deviennent
transversales et utilisables par tout persona, cours, sujet, classe ou integration autorisee.
Les composants OCR, scoring brouillon, calibration, feedback, controle qualite et export peuvent
evoluer independamment, et chaque amelioration profite a toutes les surfaces MasterFlow.

La modelisation de `corrector-001` comme persona primaire autonome est en revanche rejetee :
elle confond voix, methode, moteur, permissions et souverainete pedagogique. Migration demandee :
deprecation non destructive, retrait des nouveaux parcours, eventuel profil de methode, puis
adaptateur pour les references historiques.

La `moyenne_cible` est clarifiee comme referentiel institutionnel de MALEX :

- moins de 10 = minimum non atteint ;
- 13-14 = niveau normalement attendu ;
- notes superieures = niveaux forts ou exceptionnels.

Le lissage automatique doit devenir une calibration explicable :
`raw_score -> institutional_grading_profile -> cohort diagnostic -> teacher validation ->
final_score`. La plage 13-14 reste une zone de coherence, jamais une moyenne forcee.

Vincent doit repondre avec un audit de ses features Corrector et proposer PR-C0/PR-C1 avant toute
implementation large.

---

## 2026-06-13 — Correction protocole Vincent : features propres + canon embarque

**Correction MALEX.** Vincent ne doit pas checker directement le Drive canon par defaut.

Le canon utile doit etre embarque dans Git par MALEX/Codex. Vincent doit surtout checker ses
propres features/projets/branches/PRs/workflows pour trouver les bonnes opportunites
d'implementation et ne rien oublier.

Ajout de `PROTOCOLE_VINCENT_FEATURE_OPPORTUNITY_CHECK.md` et correction de `INBOX_VINCENT.md` /
`SYNC_THREAD_MALEX_VINCENT.md`.

Objectif : ne rien perdre du canon et ne rien perdre des features deja construites cote Vincent.

---

## 2026-06-13 — Regle de travail : check canon Drive avant spec Git

**Decision MALEX.** Avant de traiter une idee comme nouvelle, Codex doit verifier le
Drive canon MasterFlow. Si le sujet existe deja, le Git doit absorber et relier le canon, pas
reinventer une version parallele.

Ajout dans `CLAUDE.md` d'une procedure obligatoire :

- recherche `rg` dans le Drive canon ;
- lecture des fichiers sources ;
- references canon citees dans les specs/handoffs ;
- distinction `deja canonique` / `partiellement implemente` / `absent backend` ;
- aucune spec Git hors-sol.

Constat du check : le modele persona principal + personas contextuels + sous-personas conditionnels
est bien canonique. MasterStory est aussi richement canonique, mais cote Git il reste surtout au
stade capability candidate / audit absent, pas moteur backend livre.

---

## 2026-06-13 — Precision multi-personas type RPG pedagogique

**Decision MALEX.** La decision persona/bots est precisee : l'utilisateur garde son persona
principal, puis une activite peut ajouter des personas contextuels bornes, par exemple persona du
prof, methode, jury, expert, MOTH pour check CDC ou Incubator pour Ours d'Or.

Regle : 1 a 3 personas contextuels maximum par defaut, orchestration des tours de parole, voix
identifiees, aucune elevation de droits par persona. Objectif : croiser methodes, graphs
pedagogiques et ressources sans creer une conversation confuse.

---

## 2026-06-13 — Persona utilisateur par defaut vs bots contextuels + pack PR-8 jobs

**Decision MALEX.** Ajout de `DECISION_PERSONA_USER_ET_BOTS_CONTEXTUELS.md` et mise a jour de
la spec Guided Runtime : MOTH n'est pas le persona par defaut de tous les utilisateurs. Chaque
user peut avoir son persona personnel ; MOTH et les autres bots sont des guides contextuels
assignes a une activite, classe, projet, event ou tunnel.

**Livrable MALEX/Codex.** Ajout du paquet operationnel pour `jobs_shell` :

- `HANDOFF_VINCENT_PR8_JOBS_QUEUES_RUNNERS.md` ;
- `CHECKLIST_PR8_JOBS_QUEUES_RUNNERS.md` ;
- `RECETTE_PR8_JOBS_QUEUES_RUNNERS.md`.

Objectif : encadrer les operations longues via jobs owner/scope, progress, cancel/retry, audit et
gates, sans runner brut appele depuis l'UI.

---

## 2026-06-13 — Pack PR-7 RAG permissionne

**Livrable MALEX/Codex.** Ajout du paquet operationnel pour `rag_capability_shell` :

- `HANDOFF_VINCENT_PR7_RAG_PERMISSIONNE.md` ;
- `CHECKLIST_PR7_RAG_PERMISSIONNE.md` ;
- `RECETTE_PR7_RAG_PERMISSIONNE_DETAILLEE.md`.

Objectif : poser un RAG permissionne, cite et revoke-aware, qui aide MasterFlow a retrouver des
sources sans devenir une autorite ni fuiter des ressources hors scope.

---

## 2026-06-13 — Pack PR-6 Guided Runtime prive

**Livrable MALEX/Codex.** Ajout du paquet operationnel pour `guided_runtime_pr1` :

- `HANDOFF_VINCENT_PR6_GUIDED_RUNTIME.md` ;
- `CHECKLIST_PR6_GUIDED_RUNTIME.md` ;
- `RECETTE_PR6_GUIDED_RUNTIME_DEPENDENCIES.md`.

Objectif : cadrer MOTH/CDC comme runtime prive testable, dependant de scopes et templates
versionnes, sans lien public, email, devis, badge, event ou effet externe implicite.

---

## 2026-06-13 — Pack PR-4/PR-5 Project Scope + Template Registry

**Livrable MALEX/Codex.** Ajout du handoff et des checklists pour les deux fondations suivantes :

- `HANDOFF_VINCENT_PR4_PR5_SCOPE_TEMPLATES.md` ;
- `CHECKLIST_PR4_PROJECT_SCOPE_OWNERSHIP.md` ;
- `CHECKLIST_PR5_TEMPLATE_SCHEMA_REGISTRY.md` ;
- `RECETTE_PROJECT_SCOPE_TEMPLATES.md`.

Objectif : donner a Vincent un chantier court et testable pour poser ownership/scope puis
templates versionnes, avant MOTH/CDC, Ours d'Or, devis, event, DA/assets ou RAG avance.

---

## 2026-06-13 — Pack PR-2/PR-3 Capability Registry + Status Taxonomy

**Livrable MALEX/Codex.** Ajout du handoff et des checklists pour les PRs suivant
`autonomy_step1_shell` :

- `HANDOFF_VINCENT_PR2_PR3_CAPABILITY_STATUS.md` ;
- `CHECKLIST_PR2_CAPABILITY_REGISTRY.md` ;
- `CHECKLIST_PR3_STATUS_TAXONOMY.md` ;
- `RECETTE_CAPABILITY_STATUS.md`.

Objectif : preparer le registry et les statuts pour empecher les features fantomes, les statuts
canon pris pour du runtime et les UI actionnables sans endpoint reel.

---

## 2026-06-13 — Big chantier Vincent : revue PRs + checklist autonomie

**Livrable MALEX/Codex.** Ajout du pack operationnel pour Vincent :

- `HANDOFF_VINCENT_BIG_CHANTIER_FONDATIONS_2026-06-13.md` ;
- `PROTOCOLE_REVUE_PRS_VINCENT.md` ;
- `CHECKLIST_PR1_AUTONOMY_STEP1.md`.

Objectif : permettre a Vincent de se reveiller avec un chantier backend complet, priorise et
verifiable, en commencant par `autonomy_step1_shell`.

---

## 2026-06-13 — Matrice features vs fondations

**Livrable MALEX/Codex.** Ajout de `MATRICE_FEATURES_VS_FONDATIONS_MASTERFLOW.md`.

La matrice relie les verticales produit aux fondations techniques :

- autonomie step 1 ;
- capability registry ;
- MOTH/CDC ;
- Ours d'Or ;
- devis ;
- DA/assets ;
- correction ;
- cours/classe ;
- RAG ;
- jobs ;
- observabilite ;
- MasterStory ;
- HelpLab ;
- marketplace et connecteurs repousses.

Objectif : prioriser les features selon leurs dependances reelles, pas selon leur attrait immediat.

---

## 2026-06-13 — Pack specs fondations post-audit

**Livrable MALEX/Codex.** Deroulement de la chaine de specs et recettes priorisees apres audit :

- `RECETTE_AUTONOMY_STEP1_SHELL.md` ;
- `SPEC_CAPABILITY_REGISTRY.md` ;
- `SPEC_STATUS_TAXONOMY.md` ;
- `SPEC_PROJECT_SCOPE_OWNERSHIP.md` ;
- `SPEC_TEMPLATE_SCHEMA_REGISTRY.md` ;
- `RECETTE_RAG_PERMISSIONNE.md` ;
- `SPEC_JOBS_QUEUES_RUNNERS.md` ;
- `SPEC_WORKFLOW_OBSERVABILITY.md` ;
- `PLAN_PRS_FONDATIONS_MASTERFLOW.md`.

Objectif : donner a Vincent une sequence backend claire et testable avant implementation large.

---

## 2026-06-13 — Spec autonomie encadree step 1

**Livrable MALEX/Codex.** Ajout de `SPEC_AUTONOMY_STEP1_SHELL.md`.

La spec transforme la priorite `autonomy_step1_shell` en PR bornable :

- `autonomy_runs` ;
- `autonomy_findings` ;
- `improvement_candidates` ;
- `decision_queue` ;
- checks read-only ;
- endpoints admin+ ;
- recette A1-A8 ;
- tests minimum ;
- interdiction explicite d'executer une action sensible.

Cette couche doit permettre a MasterFlow d'observer, preparer et proposer avant les connecteurs
puissants ou l'automatisation d'execution.

---

## 2026-06-13 — Autonomie encadree step 1 avant connecteurs

**Decision MALEX.** Correction du plan post-audit : les connecteurs/plugins ne sont pas un
chantier step 1. La priorite devient un systeme autonome encadre capable d'observer, preparer et
proposer sans executer d'action sensible.

`MASTERFLOW_POST_AUDIT_FOUNDATION_UPGRADES.md` est mis a jour :

- ajout de `F0 — Autonomie encadree step 1` ;
- objets proposes : `autonomy_runs`, `autonomy_findings`, `improvement_candidates`,
  `decision_queue` ;
- gateway connecteurs repoussee en phase ulterieure ;
- ordre de PRs mis a jour avec `autonomy_step1_shell` en premier.

---

## 2026-06-12 — Fondations post-audit a mettre en place

**Livrable MALEX/Codex.** Ajout de `MASTERFLOW_POST_AUDIT_FOUNDATION_UPGRADES.md` dans Git et
miroir prevu dans le Drive canon `01_CORE`.

Objectif : transformer les failles evidentes de l'audit complet en fondations transversales :

- Capability Registry reel ;
- statuts canon/runtime normalises ;
- Project / Scope / Ownership ;
- RAG local permissionne + Resource Truth ;
- jobs/queues/runners ;
- Template / Schema Registry ;
- autonomie encadree step 1 ;
- Tool / Connector Gateway plus tard ;
- observabilite workflow ;
- recettes d'acceptation systematiques ;
- validation graduee.

Priorite : mettre ces multiplicateurs en place avant d'empiler des features isolees ou une UI
finale.

---

## 2026-06-12 — Recette UI post-PR-1 Guided Runtime

**Livrable MALEX/Codex.** Ajout de `RECETTE_UI_PR1_GUIDED_RUNTIME.md` pour cadrer la future
surface atelier MOTH/CDC apres livraison backend PR-1.

Objectif : prevenir une UI deceptive. Le frontend devra consommer les objets reels
guide/session/progression/question/contributions/contradictions, ou afficher des etats vides.
Aucun public, export, email, badge, devis ou publication en PR-1.

---

## 2026-06-12 — Recette PR-1 Guided Runtime

**Livrable MALEX/Codex.** Ajout de `RECETTE_PR1_GUIDED_RUNTIME.md` pour cadrer l'acceptation
de la premiere tranche MOTH/CDC.

La recette couvre :

- endpoints attendus ;
- payloads de reference ;
- scenarios A1-A12 ;
- tests minimum ;
- criteres de refus immediat ;
- application de la validation graduee.

Objectif : permettre a Vincent de livrer une PR-1 verifiable avant toute UI finale ou acces public.

---

## 2026-06-12 — Validation graduee au lieu de double validation systematique

**Decision MALEX/Vincent.** MasterFlow assouplit la validation : ne pas exiger une double
validation humaine systematique pour les operations bas risque, privees ou reversibles.

Nouvelle reference : `POLITIQUE_VALIDATION_GRADUEE.md`.

Regle :

- permission check toujours ;
- preflight selon l'action ;
- audit des mutations ;
- validation humaine pour actions sensibles ;
- validation renforcee seulement pour actions critiques.

Impact PR-1 Guided Runtime : drafts, sessions privees, contributions et progression interne
passent par permission/scope/audit. Publication, public, email, event, devis, asset, export,
settings globaux, suppression definitive ou cout eleve restent soumis a validation humaine.

---

## 2026-06-12 — GO PR-1 Guided Runtime prive

**Decision humaine MALEX.** MOTH/CDC est retenu comme premiere verticale de preuve pour exercer
plusieurs fondations MasterFlow, sans le confondre avec une priorite absolue du produit.

Perimetre valide :

- `GUIDANCE_ENGINE` owner de la prochaine question ;
- guides owners par user, room optionnelle ;
- sessions uniquement authentifiees ;
- usage prive d'un guide draft par son teacher owner ;
- retention 30 jours inactive / 90 jours apres cloture ;
- premier template CDC versionne en `candidate` ;
- contrats, migrations, progression deterministe, permissions, audit et tests.

Restent interdits dans cette PR : public/invite, LLM obligatoire, email, event, devis, assets,
publication, analytics nominatifs et UI finale.

Demande transmise a Vincent dans `INBOX_VINCENT.md` et `SYNC_THREAD_MALEX_VINCENT.md`.

---

## 2026-06-12 — Audit exhaustif du Drive MasterFlow complet

**Perimetre :** audit documentaire et technique, sans modification runtime.

### Fait

- Inventorie les 4 508 fichiers du Drive canon :
  - 791 fichiers dans le corpus fonctionnel primaire ;
  - 3 686 fichiers secondaires (audits, deployment, factories) ;
  - 31 fichiers racine.
- Normalise le systeme en 42 familles, dont 41 dans le perimetre produit actuel et factories
  suivies separement comme `OUT_OF_SCOPE`.
- Compare chaque famille aux contrats, tables, endpoints, engines, UI et tests GitHub.
- Corrige la portee du premier audit : 15-20 % concernait le noyau actif ; la couverture de
  MasterFlow complet est estimee prudemment a **10-13 %**.
- Ajoute :
  - `AUDIT_MASTERFLOW_COMPLET_CANON_VS_GITHUB_2026-06-12.md` ;
  - `AUDIT_MASTERFLOW_CANON_INVENTORY.json` ;
  - `scripts/audit-masterflow-canon.mjs`.
- Message de revue depose pour Vincent dans `INBOX_VINCENT.md` et
  `SYNC_THREAD_MALEX_VINCENT.md`.

### Decision

- Ne pas reduire le canon au MVP et ne pas convertir chaque document en feature.
- Fermer d'abord core multi-user, permissions objet, execution/jobs et Sentinel minimal.
- Utiliser ensuite MOTH/CDC comme premiere verticale privee, puis Ours d'Or et devis.
- Terminer chaque verticale par sa surface UI, pas commencer par une UI globale.

---

## 2026-06-12 — Audit profond canon Drive vs GitHub

**Audit MALEX/Codex.** Rapport :
`AUDIT_PROFOND_CANON_VS_GITHUB_2026-06-12.md`.

L'audit compare l'index canonique des owners actifs, les grands contrats transversaux, les
objets BDD, les endpoints, les schemas partages, le frontend et les tests.

Conclusion :

- aucun des 19 owners actifs de l'index JSON n'est implemente a profondeur canonique ;
- 8 possedent une tranche de code executable identifiable ;
- la couverture brute par presence d'une tranche de code est d'environ 42 % ;
- la couverture fonctionnelle ponderee est estimee entre 15 et 20 % ;
- le socle auth/rooms/personas/actions/resources est coherent, mais les domaines metier,
  jobs, projets, assets, scopes et runners restent majoritairement absents.

Priorite recommandee : fermer scopes/ownership/privacy, projects, jobs et dispatcher d'actions,
puis utiliser le pilote MOTH/CDC comme premiere verticale multi-owner.

Validation technique du baseline : backend 27/27, lint backend/frontend et build frontend OK.

---

## 2026-06-12 — PR-0 Bot Studio / Guided Runtime

**Decision MALEX.** L'audit global du Drive canon est transforme en specification d'assemblage :
`SPEC_BOT_STUDIO_GUIDED_RUNTIME.md`.

Le Bot Studio n'est pas un nouvel engine. Il compose `GUIDANCE_ENGINE`, personas fonctionnelle
et lore, engine metier, UI manifest, permissions, cycle d'action, Resource Truth, analytics et
opportunity detector.

La spec couvre :

- guides conversationnels versionnes ;
- sessions privees, classe, invitees ou publiques ;
- contributions sourcees et contradictions ;
- manifestes de deploiement des bots ;
- permissions, consentements, preflight et validation ;
- cas MOTH/CDC, Ours d'Or, devis et creation guidee d'un bot ;
- plan de PRs progressives et tests minimum.

### Gate

- Ce commit est une PR-0 documentaire, sans code ni migration.
- La premiere implementation proposee reste privee et authentifiee, sans LLM obligatoire.
- Vincent doit auditer le mapping, repondre aux questions ouvertes et proposer le diff exact
  de PR-1.
- Acces public, email, devis, assets et analytics godmode exigent chacun un GO MALEX separe.

---

## 2026-06-12 — Dimensionnement propose pour le runtime Local RAG BGE

**Information transmise a Vincent.** Palier de depart recommande :

```text
RTX 4060 Ti 16 Go + CPU 8-12 coeurs + 64 Go RAM + NVMe 1-2 To
```

Le CPU seul reste possible pour un PoC, tandis qu'une RTX 4090 24 Go et 128 Go RAM
correspondent plutot a une charge lourde ou multi-utilisateur.

Cette recommandation n'est pas une decision d'achat. Le choix final dependra d'un benchmark
sur le corpus pilote : latence, debit, consommation VRAM/RAM et volume Qdrant.

---

## 2026-06-12 — Audit et durcissement PR-1 token tracking

**Audit MALEX/Codex du commit `1b08b38`.** Le gate admin/godmode, la whitelist SQL,
la lecture seule et le contrat partage sont conformes.

Correctifs appliques :

- index composite token par utilisateur et periode rendu deterministe ;
- rejet des periodes invalides ou inversees ;
- fallback local sur compteurs provider invalides ;
- neutralisation des couts negatifs ;
- couverture de test etendue a la tarification.

Rapport complet : `AUDIT_PR1_TOKEN_TRACKING.md`.

Validation : backend 27/27, lint backend/frontend, build frontend et `git diff --check` OK.

Risques conserves et explicites : tarification indicative non exploitable pour billing ;
appels provider echoues ou streams interrompus potentiellement absents de la telemetrie.

---

## 2026-06-12 — Dépôt du handoff Local RAG BGE pour Vincent

**Dépôt MALEX.** Le dossier `MASTERFLOW_LOCAL_RAG_BGE_HANDOFF/` est transmis à Vincent
comme spécification d'implémentation progressive d'une couche de retrieval locale et
permissionnée.

Contenu :

- point d'entrée obligatoire `00_START_HERE_VINCENT.md` ;
- architecture et limites de responsabilité ;
- indexation, retrieval hybride et context packs ;
- sécurité, permissions, révocation et audit ;
- plan de cinq PRs progressives ;
- contrat OpenAPI, schémas JSON, manifeste, compose et jeu d'évaluation.

Contrôles avant dépôt : JSON/JSONL valides, YAML valides, aucun secret détecté.

### Gate

- Première étape : audit du repo et proposition exacte de la PR-1 `Capability Shell`.
- Aucun code, modèle, Qdrant, indexation, migration, endpoint ou UI avant validation humaine.
- Permissions avant retrieval ; chaque hit doit conserver une source lisible.
- Le RAG reste dérivé, optionnel et non souverain.

Demande transmise dans `INBOX_VINCENT.md` et le fil de synchronisation.

---

## 2026-06-12 — GO humain MALEX sur PR-2 global settings

**Décision MALEX.** Vincent peut implémenter la PR-2 décrite dans
`SPEC_PR_PRIORITAIRES.md`.

Périmètre validé :

- action sensible `set_global_setting` ;
- passage obligatoire par permission check et preflight ;
- validation humaine admin avant exécution ;
- allowlist explicite des clés administrables ;
- secrets interdits dans `global_settings` ;
- audit et erreurs lisibles ;
- tests du cycle preflight, validation et exécution.

Pas de nouvel engine, pas de billing, pas d'extension des rôles et pas de refactor global.
Le résultat doit revenir dans Git pour revue avant toute surface frontend associée.

---

## 2026-06-12 — GO humain MALEX sur PR-1 suivi token

**Décision MALEX, confirmée directement avec Vincent.** Le commit backend `1b08b38`
« suivi token réel + endpoint diagnostic gated admin/godmode » est approuvé et conservé sur
`main`.

- instrumentation du `usage` provider avec fallback ;
- coût estimé centralisé ;
- granularité par tâche ;
- endpoint diagnostic réservé admin/godmode ;
- tests backend dédiés.

Ce GO clôt le gate de la PR-1. La PR-2 sur l'écriture sensible de `global_settings` a reçu
son GO humain séparé dans l'entrée ci-dessus.

---

## 2026-06-12 — Proposition packs et tarifs d'abonnement

**Décision MALEX.** Une première grille commerciale est déposée dans
`PROPOSITION_PACKS_ET_TARIFS_ABONNEMENT.md` pour être challengée par Vincent.

- Student : gratuit ;
- Student Pro / Portfolio : 8,90 EUR TTC/mois ;
- Teacher : 24,90 EUR TTC/mois ;
- Studio / Creator : 49 EUR TTC/mois ;
- School / Campus : à partir de 199 EUR HT/mois ;
- White Label : 990 à 2 500 EUR HT/mois + installation ;
- Godmode / Owner Ops : non commercialisé.

La proposition inclut un modèle de crédits IA et sépare strictement pack, rôle, permission,
quota et validation.

### Gate

- Statut `PROPOSAL / NON_CANONICAL`.
- Aucun billing, quota, endpoint, permission ou feature flag à implémenter dans ce tour.
- Vincent doit challenger coûts réels, marges, quotas et faisabilité à partir du suivi token.
- Toute implémentation ou canonisation exige une validation humaine MALEX séparée.

---

## 2026-06-12 — Spec détaillée des 2 PRs prioritaires (audit-only)

**Périmètre.** Spec des 2 features resserrées (suivi token, écriture settings admin), ancrée sur le code réel
de `apps/backend`. **Aucun code appliqué** — proposition pour validation humaine MALEX.

### Livré
- `SPEC_PR_PRIORITAIRES.md` :
  - **PR-1 suivi token** (`IMPROVE`) : (A) instrumentation `services/llm.ts` — `task` paramétrable,
    `stream_options.include_usage` pour consommer le `usage` réel (fallback estimation), coût via
    `llm_pricing.ts` ; (B) endpoint `GET /diagnostics/token-usage` **gated `requireRole('admin')`** (admin+
    godmode), registre `view_token_usage`. Migration : aucune (table existe).
  - **PR-2 écriture `global_settings`** (`ABSORB`) : action sensible `set_global_setting` (medium_high,
    `validator_role: admin`), ajout additif `validator_role` au schéma registre, `validatorRoleFor` le lit,
    dispatcher d'exécution réel (remplace le mock pour cette action) + allowlist `ADMIN_CONTROLLED_KEYS`,
    secrets jamais en BDD. Cycle complet preflight→validation(admin)→execute, 423 maintenu.
- Invariants tenus (validation humaine, privé par défaut, secrets hors BDD, contrat additif rétro-compatible).
  Ordre : PR-1 d'abord (indépendante), PR-2 ensuite (dépend du contrat `validator_role`).

### Gate
Spec = proposition. **`BLOCKED_BY_HUMAN_VALIDATION`** : rien implémenté/mergé/migré avant GO MALEX.

---

## 2026-06-12 — Audit d'absorption : PILOTE 3 projets livré (côté Vincent)

**Périmètre.** Réponse au gate MALEX. Décision Vincent : pilote `API_corrector` + `API_manage` + `vibe`
pour calibrer le format, extension aux ~17 autres sur GO. **Audit only, aucun code.**

### Livré
- `AUDIT_ABSORPTION_PILOTE_3PROJETS.md` : matrice sourcée par workflow (besoin, owner+type, contrats,
  données, permissions/preflight, UI, écart, classement, statut canonique, risque, tests, PR), + 5 sections
  transverses (top absorptions, incompat bloquantes, améliorations, à écarter, plan PRs courtes).
- INBOX_VINCENT entrée passée `open → answered` ; réponse dans `SYNC_THREAD` (entrée pilote audit).

### Constats clés
- Pépites faible-risque : transport Tauri desktop↔remote (`vibe`), egress LLM gated (`vibe`+`API_corrector`,
  proxy allowlisté = fausse alerte « relais ouvert » levée par contre-vérification), allowlist storage
  admin/privé (`API_manage`), garde-fous notation + `coherenceAudit` invisible → prolonge la couche 14.
- Incompat bloquantes : objets `classes/élèves` sans owner (retirés couche 13), CSP `default-src *`,
  tunnel QR brut, landing page-routing (anti-scope). Doublon correction `API_corrector` ↔ module `vibe`.
- ⚠️ Protocole canonique `PROTOCOLE_AUDIT_VINCENT_MASTERFLOW_A_LIRE_EN_PREMIER.md` introuvable en local →
  compilé sur CONTRACT_INDEX + canon `05_BACKEND_REBUILD_SOURCE_TRUTH` + registre d'actions de `main`.

### Gate
Rapport = proposition, **retour pour validation humaine MALEX**. Rien codé/mergé/migré/déployé.

---

## 2026-06-12 — Gate strategique : audit d'absorption des workflows Vincent

**Decision MALEX.** Avant toute nouvelle integration structurante, le systeme de Vincent doit
comparer les workflows et features deja construits dans ses projets avec le MasterFlow canon.
Le risque actuel n'est pas le manque de features, mais l'ajout tardif de briques utiles sous une
forme incompatible, doublonnee ou mal gatee.

### Autorites et ordre de lecture

1. Canon produit : Drive `MASTERFLOW`.
2. Point d'entree : `PROTOCOLE_AUDIT_VINCENT_MASTERFLOW_A_LIRE_EN_PREMIER.md`.
3. Resolution MasterFlow :
   - `START_HERE_FOR_AI_AND_DEVS_MASTERFLOW.md` ;
   - `01_CORE/MASTERFLOW_ACTIVE_CONTRACT_INDEX.md` ;
   - `01_CORE/MASTERFLOW_ENGINE_CONTRACTS.md` ;
   - `01_CORE/MASTERFLOW_SCOPE_AND_PERMISSION_MODEL.md` ;
   - `04_ENGINES/MASTERFLOW_RUNTIME_WIRING_AND_INTER_SYSTEM_CONNECTION_MAP.md`.
4. Implementation actuelle : GitHub `main`, `CLAUDE.md`, `packages/shared`, backend, frontend
   et registre d'actions.
5. Projets/workflows Vincent : sources candidates a inventorier et comparer, jamais nouvelle
   autorite canonique implicite.

### Methode obligatoire

Pour chaque workflow ou feature Vincent :

- decrire le besoin reel, les entrees, etats, sorties et condition d'arret ;
- identifier l'owner MasterFlow existant et son type : APP, ENGINE, CONTRACT, DATASET, EVENT,
  WIDGET ou AUDIT ;
- relier engine, contrats actifs, donnees/BDD, endpoints/toolcalls, permissions, preflight,
  validation humaine, traces, surface UI et tests ;
- verifier les doublons semantiques et les incompatibilites ;
- classer la proposition :
  - `KEEP_AS_IS` : deja compatible et reutilisable ;
  - `ABSORB_AND_ADAPT` : valeur utile, adaptation aux owners/contrats MasterFlow ;
  - `ADD_MISSING_CAPABILITY` : besoin nouveau confirme, a mapper avant code ;
  - `IMPROVE_EXISTING_OWNER` : meilleur pattern a injecter dans une brique existante ;
  - `SKIP_OR_QUARANTINE` : redondant, trop couple, premature ou contraire aux invariants.

Le verdict d'architecture doit aussi reprendre les statuts du protocole canonique :
`OK`, `PATCH_EXISTING_OWNER`, `AUDIT_ONLY`, `FUTURE_READY`, `QUARANTINE` ou
`BLOCKED_BY_HUMAN_VALIDATION`. `NEW_ENGINE` reste interdit sans impossibilite demontree.

### Livrable attendu avant code

Une matrice sourcee, un item par workflow :

```txt
Projet/source | workflow | valeur | owner MasterFlow | contrats | donnees
permissions/preflight | UI | ecart actuel | decision | risque | tests | PR proposee
```

Puis :

1. top des absorptions a forte valeur / faible risque ;
2. incompatibilites bloquantes ;
3. ameliorations MasterFlow suggerees par ses projets ;
4. briques a ecarter ;
5. plan de PRs courtes avec dependances et migrations explicites.

### Gate

- Audit et proposition seulement.
- Aucun code, merge, migration, endpoint, permission, deploiement ou changement de perimetre
  avant retour dans Git et validation humaine explicite de MALEX.
- Ne pas scanner tout le Drive sans ciblage : utiliser les index actifs, retrouver l'owner,
  puis charger seulement les contrats et engines necessaires.
- Conserver les invariants : permission check, preflight sensible, validation humaine,
  Resource Truth, donnees privees par defaut, UI non deceptive et auditabilite.

Demande transmise dans `INBOX_VINCENT.md` et `SYNC_THREAD_MALEX_VINCENT.md`.

---

## 2026-06-12 — Frontend couche 14 : auditabilite des actions

**Perimetre.** Rendre le cycle d'action et ses decisions lisibles depuis les donnees deja
retournees par le backend, sans nouveau contrat ni modification backend.

### Construit

- Ajout d'un composant `ActionAudit` isole du widget principal.
- Trace visuelle du cycle reel :
  - creation ;
  - preflight ;
  - validation, ou etape explicitement non requise ;
  - execution ;
  - resultat.
- Affichage des champs contractuels disponibles : risque, permission check, validateur,
  timestamp de mise a jour, note de validation, warnings, erreur backend et resultat technique
  repliable.
- Ajout d'une note libre dans l'inbox avant approbation ou rejet. Une note vide reste vide :
  aucun commentaire automatique n'est invente par l'UI.
- Distinction visuelle entre rejet humain, echec de preflight et echec d'execution.

### Invariant

Validation et execution restent deux gestes separes. L'UI ne reconstruit pas un audit log :
elle affiche uniquement l'etat courant et les metadonnees presentes dans le contrat `Action`.

### Validation

| Verif | Resultat |
|---|---|
| `npm run lint:frontend` | OK |
| `npm run build:frontend` | OK, 32 modules |
| `npm test` | OK, backend 16/16 |
| `git diff --check` | OK |
| Browser local mobile 390 px | aucun debordement, aucune erreur console |

### Run restant

Le panneau authentifie doit etre confirme sur le runtime public apres integration par Vincent,
le backend restant human-in-the-loop.

---

## 2026-06-12 — Revue + intégration couche 14 (côté Vincent)

**Périmètre.** Revue et intégration de la couche 14 frontend de MALEX (auditabilité des
actions, `action-audit.tsx`), sans modification backend ni contrat.

### Revue & intégration
- Fast-forward propre : `6f96de5` a pour parent exact `0016b6c` (MALEX déjà rebasé sur `main`).
  `main` : `0016b6c` → `6f96de5`.
- `ActionAudit` lit **uniquement** des champs présents dans le contrat `@masterflow/shared`
  `Action` (vérifié : `preflight.{risk_level,permission_check,requires_validation,warnings}`,
  `validator_id`, `updated_at`, `validation_note`, `result`, `error`, `status`). Aucun champ
  inventé, aucun audit log reconstruit côté UI — état courant + métadonnées du contrat.
- **Anti-hallucination renforcée** : l'ancien `handleValidationDecision` injectait d'office
  `'validation UI MasterFlow'` / `'rejet UI MasterFlow'`. Désormais la note n'est transmise que
  si non-vide (`note?.trim() ? {note} : {}`) → note vide = note absente. Bonne correction.
- Invariant tenu : validation et exécution restent **deux gestes séparés** (message
  « execution separee requise »). Aucun backend touché, aucun contrat modifié.

### Validation (côté Vincent, sur `main` fast-forwardé)
| Vérif | Résultat |
|---|---|
| `npm run lint:frontend` (`tsc --noEmit`) | ✓ |
| `npm run build:frontend` | ✓ 32 modules |
| backend `npm test` (vitest) | ✓ 16/16 |
| `git diff --check` | ✓ |

Pas de smoke public ici : couche front pure, zéro changement backend. Le panneau authentifié
reste à confirmer sur le runtime public (run human-in-the-loop, backend lancé par Vincent).

---

## 2026-06-12 — Revue + intégration couche 13 (côté Vincent)

**Périmètre.** Revue et intégration de la couche 13 frontend de MALEX (modes fondés sur le
runtime réel), sans modification backend.

### Revue & intégration

- `main` fast-forwardé `69979cb` → `1e7bbdd` (clôture rebase `3860f2f` + refactor `1e7bbdd`).
- Extraction `apps/frontend/src/mode-runtime.ts` (types, `WORK_MODES`, `DEFAULT_WORK_MODE`,
  `canUseMode`, `buildModeView`) hors `App.tsx`, comportement préservé.
- Doctrine : suppression des objets fictifs (classes, élèves, sujets, histoires, arcs, scènes,
  timeline, tâches) ; Teaching/Story signalent l'absence d'objets métier backend. Conforme
  « app visible ≠ engine active » + anti-hallucination.
- Invariants : aucun backend, candidates Resource Truth gated admin/godmode (deck Admin),
  sources par défaut `validated`, `canUseMode` inchangé.

### Validation

| Vérif | Résultat |
|---|---|
| `npm run lint:frontend` (`tsc --noEmit`) | OK |
| `npm run build:frontend` (`vite build`) | OK, 31 modules |
| `npm test` (backend vitest) | OK 16/16 |
| `git diff --check` | OK |

Réponse à MALEX dans `SYNC_THREAD_MALEX_VINCENT.md` + `INBOX_MALEX.md` (rebase avant prochaine couche).

---

## 2026-06-12 — Frontend couche 13 : modes fondes sur le runtime reel

**Perimetre.** Retirer les objets d'interface prospectifs des modes et isoler leur mapping,
sans modification backend ni nouveau contrat.

### Construit

- Extraction de la definition des modes et de leur projection dans `apps/frontend/src/mode-runtime.ts`.
- Les cartes de mode proviennent uniquement du contexte reel :
  - room instance ;
  - ressources validees ;
  - registre d'actions live ;
  - validations en attente ;
  - candidates Resource Truth, reservees admin/godmode ;
  - etat WebSocket.
- Suppression des objets fictifs affiches comme s'ils existaient deja : classes, eleves,
  sujets compiles, histoires, arcs, scenes, timeline et taches.
- Les modes Teaching et Story signalent explicitement l'absence d'objets metier backend au lieu
  de simuler une fonctionnalite.

### Invariant

L'interface ne presente comme disponible que ce que le runtime et les permissions exposent
reellement. Aucun ajout backend, aucune donnee canon modifiee.

### Validation

| Verif | Resultat |
|---|---|
| `npm run lint:frontend` | OK |
| `npm run build:frontend` | OK |
| `git diff --check` | OK |

---

## 2026-06-10 — Couches 5-12 validées + run réel godmode + fix backend rooms

**Périmètre.** Côté Vincent : revue + intégration de la tranche frontend couches 5-12 de MALEX
(`16340c8`), exécution du run réel godmode demandé, et correction d'un bug backend découvert
pendant ce run.

### Revue & intégration

- Revue complète `App.tsx` (1221 lignes), `api.ts`, `styles.css`, `smoke-public-runtime.mjs`,
  `FRONTEND_UI_DOCTRINE.md` : conforme au contrat `@masterflow/shared` et aux invariants
  (cycle create → preflight → validation → exécution **explicite et séparée**, inbox gated
  teacher+, candidates ressources gated admin/godmode, sources par défaut = `validated` only,
  1 speaker via `message.speaker`, debug godmode only, **pré-remplissage login retiré** —
  point sécu de la dernière revue traité par MALEX).
- Fast-forward `main` → `16340c8`, live sur le funnel `:10000`.
- Checks : backend vitest **16/16**, `tsc` backend + frontend 0 erreur, `vite build` OK,
  `npm run smoke:public` **7/7 OK** avec credentials (login godmode, context, personas,
  resources, WebSocket pong à travers le funnel).

### Bug backend trouvé et corrigé (`3e34213`)

Le run réel a révélé que le router `rooms` supposait `requireUser` « monté en amont » alors
qu'`index.ts` ne le montait pas :

- `GET /rooms` répondait **sans authentification** sur le funnel public (fuite) ;
- `GET/PUT /rooms/:id/instance` renvoyaient **401 même avec un token valide** (`req.user`
  jamais posé) → la couche 12 de MALEX (sync room instance) ne pouvait pas fonctionner.

Fix : `router.use(requireUser)` dans le router lui-même (pattern des autres routers) + nouveau
test HTTP éphémère `rooms_auth.test.ts` (401 sans token sur les 4 routes, cycle PUT/GET
instance avec token). Vérifié en live : `GET /rooms` sans auth → 401, `PUT instance` → 200.

### Run réel godmode (les 7 étapes demandées par MALEX) — tout passe

| Étape | Résultat |
|---|---|
| 1. Login `:10000` | 200, rôle godmode |
| 2. Sas d'entrée → `PUT instance` | 200 après fix ; surface/densité/`entry_profile` persistés et relus |
| 3. Home Room surface + densité + sync | `learning`/`low`/`active_mode` confirmés en relecture |
| 4. Action live → preflight | non-sensible auto-`approved` ; sensible (`approve_validation_item`) → `pending_validation`, `execute` avant validation refusé **423** |
| 5. Inbox validation | 1 item pending → `approved` via `POST validate`, exécution séparée → `completed` |
| 6. Proposer ressource candidate | 201 `candidate`, invisible liste par défaut, visible `include_all` (godmode) |
| 7. Valider candidate | `validated`, apparaît ensuite dans les sources par défaut |

Note : la ressource de test « Test run réel couches 5-12 » reste dans le runtime (BDD vivante,
pas le canon Drive) comme trace visible du run.

---

## 2026-06-08 — Frontend couche 12 : sync room instance

**Perimetre.** Persister le choix d'entree et le mode courant dans la room instance existante.

### Construit

- Client frontend `PUT /rooms/:id/instance`.
- Le sas d'entree persiste :
  - `active_surface` = intention choisie ;
  - `cognitive_density` = densite choisie ;
  - `widget_state.entry_profile`.
- Le rail de modes persiste `active_surface` et `widget_state.active_mode`.
- La Home Room affiche surface active, densite et etat de synchronisation.

### Invariant

Pas de nouveau backend : on consomme le contrat Room OS deja expose. Le localStorage reste un
fallback d'entree, mais la room instance devient le runtime partage.

### Validation

| Vérif | Résultat |
|---|---|
| `npm run lint:frontend` | OK |
| `npm run build:frontend` | OK |
| `npm run smoke:public` | OK health/front public ; auth skip car secrets non fournis |

---

## 2026-06-08 — Frontend couche 11 : validation Resource Truth

**Perimetre.** Boucler le cycle ressource candidate -> canon valide cote UI.

### Construit

- Client frontend `GET /resources?include_all=1` reserve admin/godmode.
- Client frontend `POST /resources/:id/validate`.
- Affichage separe des ressources candidates dans le panneau `Sources`, visible uniquement
  admin/godmode.
- Bouton `Valider` pour promouvoir une candidate au canon.
- Refresh du canon `validated` apres validation.

### Invariant

Les candidates restent separees des sources validees ; seuls admin/godmode chargent la vue
`include_all`.

### Validation

| Vérif | Résultat |
|---|---|
| `npm run lint:frontend` | OK |
| `npm run build:frontend` | OK |
| `npm run smoke:public` | OK health/front public ; auth skip car secrets non fournis |

---

## 2026-06-08 — Frontend couche 10 : proposition Resource Truth

**Perimetre.** Permettre au front de proposer une source sans l'ajouter au canon affiche.

### Construit

- Client frontend `POST /resources`.
- Formulaire compact dans le panneau `Sources` : titre, URL optionnelle, sujets.
- Une proposition cree une ressource `candidate`.
- La liste `Sources` continue d'afficher uniquement `GET /resources` par defaut, donc uniquement
  les ressources `validated`.
- Retour d'etat lisible avec id de candidate.

### Invariant

Une ressource candidate n'est jamais presentee comme source validee tant qu'un humain ne l'a pas
promue cote backend.

### Validation

| Vérif | Résultat |
|---|---|
| `npm run lint:frontend` | OK |
| `npm run build:frontend` | OK |
| `npm run smoke:public` | OK health/front public ; auth skip car secrets non fournis |

---

## 2026-06-08 — Frontend couche 9 : execution explicite apres validation

**Perimetre.** Fermer le cycle action cote UI sans transformer la validation humaine en
execution automatique.

### Construit

- Extraction d'un handler d'execution pour action deja `approved`.
- Les actions non sensibles continuent le cycle apres preflight `approved`.
- Les actions sensibles approuvees depuis l'inbox affichent un bouton `Executer` distinct.
- L'etat d'action garde le statut, le message et l'id de l'action courante.

### Invariant

Validation humaine et execution restent deux gestes separes pour les actions sensibles.

### Validation

| Vérif | Résultat |
|---|---|
| `npm run lint:frontend` | OK |
| `npm run build:frontend` | OK |
| `npm run smoke:public` | OK health/front public ; auth skip car secrets non fournis |

---

## 2026-06-08 — Frontend couche 8 : validation inbox

**Perimetre.** Brancher la surface de validation V1 sur le contrat backend existant.

### Construit

- Client frontend pour :
  - `GET /actions/pending` ;
  - `POST /actions/:id/validate`.
- Panneau `Validation` visible uniquement pour les roles `teacher`, `admin`, `godmode`.
- Rafraichissement de l'inbox apres chargement, creation d'une action en attente, approbation
  ou rejet.
- Decisions explicites : `Approuver` / `Rejeter`, avec note UI courte.
- Une action approuvee reste separee de l'execution : pas d'auto-run cache apres validation.

### Invariant

Les comptes sans role teacher+ ne chargent pas et ne voient pas l'inbox de validation.

### Validation

| Vérif | Résultat |
|---|---|
| `npm run lint:frontend` | OK |
| `npm run build:frontend` | OK |
| `npm run smoke:public` | OK health/front public ; auth skip car secrets non fournis |

---

## 2026-06-08 — Frontend couche 7 : cycle actions live

**Perimetre.** Brancher les chips d'actions live sur le contrat backend existant, sans action
sensible directe.

### Construit

- Client frontend pour :
  - `POST /actions` ;
  - `POST /actions/:id/preflight` ;
  - `POST /actions/:id/execute`.
- Clic action = creation d'une action `draft`, puis preflight obligatoire.
- Execution seulement si le backend renvoie `approved`.
- Si le backend renvoie `pending_validation`, l'UI s'arrete et affiche le role validateur requis.
- Retour d'etat lisible dans le widget principal : creation, preflight, attente validation,
  execution, completed ou failed.

### Invariant

Aucun chip n'execute directement une action sensible. Le backend reste l'autorite du cycle.

### Validation

| Vérif | Résultat |
|---|---|
| `npm run lint:frontend` | OK |
| `npm run build:frontend` | OK |
| `npm run smoke:public` | OK health/front public ; auth skip car secrets non fournis |

---

## 2026-06-08 — Frontend couche 6 : sas d'entree utilisateur

**Perimetre.** Ajouter l'entree runtime avant la Home Room, sans backend delta et sans ecriture canon.

### Construit

- Apres login, un utilisateur sans profil d'entree local passe par un sas court :
  - intention du jour ;
  - densite cognitive ;
  - preference de presence/persona.
- Le choix est persiste en `localStorage`, scope par `user.id`.
- L'intention choisie ouvre directement le mode correspondant dans la Home Room.
- Aucune action sensible, aucune ecriture backend, aucun secret.

### Note backend

La table `users` contient deja `preferences_json`, mais `UserSchema` / `CurrentContext` ne
l'exposent pas encore. Cette couche prepare le futur contrat sans l'inventer cote frontend.

### Validation

| Vérif | Résultat |
|---|---|
| `npm run lint:frontend` | OK |
| `npm run build:frontend` | OK |
| `npm run smoke:public` | OK health/front public ; auth skip car secrets non fournis |

---

## 2026-06-08 — Frontend couche 5 : Home Room situationnelle

**Perimetre.** Premier refactor UI depuis la doctrine MALEX, sans backend delta et sans action sensible.

### Construit

- Home Room recentree sur une situation lisible : modes disponibles, sources, actions live, persona.
- Rail de modes : Home, Teaching, Story, Project, Learning, Inventory, Admin selon role.
- Widget principal dynamique par mode, avec signal court et 1-3 actions utiles.
- Object deck contextuel par mode au lieu d'un catalogue de personas/features.
- Actions futures/verrouillees retirees de l'experience normale ; consultables seulement en godmode/debug.

### Intention

Cette couche reste volontairement sobre : elle pose la navigation canon `situation -> mode -> objet`
avant d'ouvrir les rooms specialisees ou les flows d'onboarding.

### Validation

| Vérif | Résultat |
|---|---|
| `npm run lint:frontend` | OK |
| `npm run build:frontend` | OK |
| `npm run smoke:public` | OK health/front public ; auth skip car secrets non fournis |
| Vite local `http://127.0.0.1:5174/` | HTTP 200 |

Note : capture Playwright non realisee car `playwright` n'est pas installe dans le workspace.

---

## 2026-06-08 — Synthese UI MALEX : situation avant fonctionnalites

**Contexte.** MALEX fournit une synthese UI issue d'un debrief : le frontend fonctionne
techniquement, mais ne doit pas devenir une interface deceptive ou un catalogue de boutons.

### Doctrine actee

- MasterFlow doit montrer la **situation**, pas les fonctionnalites disponibles.
- Premiere connexion : tunnel unique type mini Akinator -> profil -> preferences -> avatar /
  personnage canon si souhaite -> interface personnalisee.
- Navigation par zoom : accueil -> mode -> room -> objet -> detail.
- Les modes sont des univers : Teaching, Story, Project, Learning, Inventory, Admin/Godmode.
- Le widget principal est dynamique, choisi par le contexte actif.
- Les IA/engines doivent etre majoritairement invisibles.
- Clic et chat pilotent tous les deux l'interface.

### Patch

- Ajout `FRONTEND_UI_DOCTRINE.md`.
- Handoff Home Room recadre : situation summary, main widget dynamique, mode rail, object deck,
  1-3 actions.
- Login frontend : retrait du mot de passe pre-rempli obsolète.

---

## 2026-06-07 — Accès MALEX : bascule Funnel PUBLIC + durcissement secrets + intégration front

**Contexte.** Déblocage de l'accès distant de MALEX (toutes les voies privées Tailscale ont
échoué), puis validation + intégration du frontend Home Room de MALEX sur `main`.

### Diagnostic accès (voies privées épuisées)

- **Serve ne sert pas les nœuds partagés** (sharee) → `:8443`/`:10000` timeout pour MALEX.
- **IP tailnet directe** échoue aussi : `tailscale ping` OK mais TCP jamais établi ; `tcpdump`
  host = **0 paquet** de l'IP MALEX sur `tailscale0`, 0 conntrack. **Firewall écarté** (`ts-input`
  accepte tout le trafic tailscale, compteurs ; `netcheck` host sain). Cause = **plan de données
  Tailscale KO entre le NAT FAI de MALEX et la box** (les machines qui marchaient étaient toutes
  sur le LAN ; MALEX seul est distant, via DERP Paris).

### Décision (validée humainement par Vincent)

- **Exposer en Tailscale Funnel PUBLIC** : `:8443` (backend) + `:10000` (frontend). **`443` =
  Funnel API_manage, intact.** + **partage du compte godmode** avec MALEX (le classifier auto
  avait bloqué la génération de creds sans validation explicite → confirmée).

### Durcissement sécu (obligatoire avant ouverture publique, fait)

- `JWT_SECRET` **régénéré** : l'ancien fallback codé en dur (`dev-…-change-me`) permettait de
  **forger un token godmode** — prouvé par forge HS256 (`/me` 200 avant, 401 après) puis fermé.
- **Mot de passe godmode tourné** (défaut public `vincent/masterflow`).
- Les deux dans `apps/backend/.env` (gitignoré, `dotenv` chargé ; ⚠️ `tsx watch` ne recharge pas
  `.env` → **redémarrage backend requis**). Identifiants transmis **hors-bande** (jamais dans Git).
- Risque résiduel noté : `POST /auth/register` ouvert (crée rôle `student`).
- Nettoyage : 6 process backend orphelins (vieux `tsx` détachés) supprimés.

### Intégration frontend MALEX (couches 2-4) — validé + mergé

- Revue Home Room cockpit + chat WS + couche personas/registry (`App.tsx`, `api.ts`,
  `styles.css`) : conforme `@masterflow/shared`, invariants OK (buckets `status`, **1 speaker**,
  `method_attribution`, ressources `validated` only, `preflight_required` désactive le chip),
  `wss` derrière le funnel. Fast-forward `main` ← `codex` (pas de divergence), **live sur le
  funnel `:10000`** sans erreur. Note : login pré-remplit l'ancien mdp (mort) → à vider (public).

### Validation (run réel)

| Vérif | Résultat |
|---|---|
| Backend public `:8443/health` | 200 |
| Frontend public `:10000/` | MasterFlow servi |
| `:10000/api/v1/personas` (proxy) | 401 (backend joint) |
| `443` API_manage | 200 (intact) |
| Login godmode public (nouveau mdp) | 200 |
| Token forgé **ancien** JWT secret → `/me` | 401 (rotation OK) |
| Frontend `tsc --noEmit` + `vite build` | OK (30 modules) |

Refs : `ee77878` (funnel + secrets), `7da3a90` (fix doc risques), `f14509d` (validation front),
`b006df3` (clôture items inbox).

---

## 2026-06-07 — Runtime public : smoke test reproductible

**Périmètre :** réduire les tests manuels MALEX avant ouverture de l'interface.

### Ajouté

- Script `npm run smoke:public`.
- Vérifie sans secret :
  - backend public `/health` ;
  - frontend public `:10000`.
- Si `MASTERFLOW_USERNAME` et `MASTERFLOW_PASSWORD` sont fournis via l'environnement, vérifie aussi :
  - login via proxy frontend ;
  - `GET /context/current` ;
  - `GET /personas` ;
  - `GET /resources` ;
  - WebSocket `ping -> pong`.

### Règle sécurité

Le script ne contient aucun identifiant et n'affiche jamais le token. Les secrets restent hors Git.

### Validation 2026-06-07

| Vérif | Résultat |
|---|---|
| Smoke public sans secret | OK (`/health` + frontend `:10000`) |
| Smoke public authentifié | OK |
| Login | 200 · rôle `godmode` |
| `GET /context/current` | 200 · Home Room |
| `GET /personas` | 200 · 3 personas |
| `GET /resources` | 200 · 2 ressources validées |
| WebSocket | `ping -> pong` |

---

## 2026-06-07 — Frontend couche 4 : chat compact + WebSocket

**Périmètre :** ajouter la surface chat Home Room sans action sensible, sans écriture canon et
sans backend delta.

### Construit

- Client WebSocket frontend vers `/ws/{room_instance_id}?token=...`.
- États de connexion : `idle`, `connecting`, `connected`, `closed`, `error`.
- Support des messages backend existants :
  - `chat_start` ;
  - `chat_chunk` ;
  - `chat_end` ;
  - `pong` ;
  - `error`.
- Chat compact dans la Home Room :
  - tours utilisateur ;
  - streaming assistant ;
  - attribution système courte si une méthode secondaire est prêtée ;
  - formulaire désactivé tant que WS non connecté.

### Validation

| Vérif | Résultat |
|---|---|
| `npm run lint:frontend` | OK |
| `npm run build:frontend` | OK |
| Vite local `http://localhost:5174/` | HTTP 200 |

Note : test WS réel en attente d'un backend joignable (`localhost:8000` ou tailnet
`100.100.128.63:8000`).

---

## 2026-06-07 — Frontend couche 3 : Home Room canon compacte

**Périmètre :** recadrer l'écran connecté selon le handoff Home Room, sans backend delta et sans
exécuter d'action sensible.

### Construit

- Home Room recentrée sur :
  - room active ;
  - rôle/mode courant ;
  - persona porte-parole ;
  - 1 à 3 actions `live` utiles ;
  - sources validées depuis `GET /resources`.
- Les actions `future` restent visibles comme verrouillées ; les actions `out_of_scope` ne sont
  plus exposées dans l'expérience normale.
- Le panneau debug n'apparaît qu'en rôle `godmode` et sert à compter `live` / `future` /
  `out_of_scope`, sans ouvrir Owner Ops fonctionnel.
- Ajout client frontend `GET /resources` pour amorcer le `source_truth_strip`.

### Validation

| Vérif | Résultat |
|---|---|
| `npm run lint:frontend` | OK |
| `npm run build:frontend` | OK |
| Vite local `http://localhost:5174/` | HTTP 200 |

Note : screenshot Playwright non réalisé car `playwright` n'est pas installé dans le workspace.

---

## 2026-06-07 — Inbox MALEX : rebase main clôturé

**Contexte.** Vérification après audit Drive canon avant reprise frontend.

- `origin/main` est bien ancêtre de `codex/frontend-masterflow`.
- La demande inbox « rebaser sur main à jour » est donc traitée, pas bloquante.
- `INBOX_MALEX.md` passe l'entrée correspondante de `open` à `done`.
- Prochaine étape : frontend couche 3, Home Room canon compacte.

---

## 2026-06-07 — Audit Drive canon + verrouillage cohérence V1

**Contexte.** MALEX demande un audit du MASTERFLOW canon sur Drive avant de continuer les
opérations GitHub/frontend.

### Lu côté Drive

- `START_HERE_FOR_AI_AND_DEVS_MASTERFLOW.md`
- `START_HERE_VINCENT_CLAUDE_UI_MASTERFLOW.md`
- `PROTOCOLE_AUDIT_VINCENT_MASTERFLOW_A_LIRE_EN_PREMIER.md`
- `01_CORE/MASTERFLOW_ACTIVE_CONTRACT_INDEX.md`
- contrats clés UI/permissions/Owner Ops/sync/runtime action surface

### Verdict

- Drive MASTERFLOW reste la source canon produit ; GitHub reste la source technique du code.
- Le Drive décrit MasterFlow complet. La V1 GitHub doit rester en couches courtes : contrat,
  endpoint, permission gate, UI surface et validation avant toute feature.
- Factories/backflows existent dans le canon global mais restent **hors scope V1 backend/frontend**
  dans cette version.
- Godmode / Owner Ops est cohérent si gate strict `godmode`, jamais teacher/student/client, et
  sans bypass audit/preflight.
- Prochaine UI : traiter l'état actuel comme couche d'intégration/debug et évoluer vers une
  Home Room contextuelle compacte, pas un dashboard permanent.

### Patch documentaire

- `CLAUDE.md` : clarification Drive canon vs V1 GitHub + port frontend `5174`.
- `BACKEND_INTEGRATION_MAP.md` : retrait des mentions périmées PoC/seed/vulnérabilités/Owner Ops.
- `FRONTEND_SCREEN_HANDOFF_HOME_ROOM.md` : handoff minimal avant couche UI suivante.

---

## 2026-06-07 — Sync GitHub + Q6 tranchée : godmode étendu (confirmé humainement)

**Contexte.** Sync depuis GitHub : `main` fast-forward sur `claude/gitlab-audit-suivi-6PjDS`
(frontend MALEX `apps/frontend`, infra sync, seed + champ `status`, PoC retiré, sécu vitest
4.1.8 / `npm audit` 0 vuln). Réponse à **la question clé backend** de MALEX (`VINCENT_BACKEND_SYNC_2026-06-06.md`, Q6).

### Aller-retour Q6 (tracé honnêtement)

1. Première validation humaine de Vincent : **Owner Ops strict** → commit `7322e61`, poussé.
2. Découverte : `codex/frontend-masterflow` avait poussé du contenu non lu (demande Tailscale +
   réassertion **godmode étendu** s'attribuant la validation de Vincent).
3. Vincent **tranche à nouveau, en connaissance de cause : godmode étendu** (position MALEX/codex
   retenue). → `git revert 7322e61` + sceau « confirmé humainement 2026-06-07 ».

### Décision finale (validée humainement)

- **Q6 = godmode étendu.** En rôle `godmode`, l'UI peut **exécuter des actions** ET
  `owner_ops_private_diagnostic` est **exposé** (quand le backend l'implémentera). **Gate strict
  `godmode`**, jamais teacher/student. Lève le cloisonnement strict Owner Ops de la 1re carte.
  L'UI ne présente rien comme fonctionnel avant contrat + endpoint réels. Owner Ops pas encore
  codé backend.
- Q1–Q5 inchangées et confirmées (champ `status` ; seed aligné sur les endpoints réels ;
  `user_runtime_loadout` hors V1 ; `GET /actions/pending` teacher+ ; endpoints lourds `future`).
- **Tailscale** : accès tailnet **accordé** à MALEX (Serve, pas de Funnel/port public) ; entrée
  de confirmation dans `SYNC_THREAD_MALEX_VINCENT.md` (hostname MagicDNS à compléter par Vincent).
- Branches distantes `claude/*` et `codex/*` : **conservées** (pas de suppression, sur consigne
  Vincent) ; codex porte des entrées doc à rebaser sur le `main` à jour.
- Gouvernance inbox précisée : Vincent peut déposer des demandes dans `INBOX_MALEX.md`, mais
  MALEX conserve la validation humaine obligatoire avant toute application ou exécution.
- Rebase MALEX sur `main` + node-share `95faee7` reçus. Test Tailscale : DNS tailnet OK
  (`100.100.128.63`) mais ports Serve `8443`/`10000` en timeout depuis MALEX ; demande ouverte
  dans `INBOX_VINCENT.md`.
- Push `070688e` reçu : test IP directe. `tailscale ping 100.100.128.63` OK (22 ms), mais
  `http://100.100.128.63:8000/health` et `:5174` timeout ; demande host/bind/firewall ouverte
  dans `INBOX_VINCENT.md`.
- Règle de sync renforcée : avant toute réponse MALEX sur état Vincent/backend/Tailscale,
  Codex doit refaire un check distant (`git fetch origin` + dernier `origin/main`) pour éviter
  les réponses caduques si Vincent pousse pendant le tour.

### Validation (état synchronisé, run réel)

| Vérif | Résultat |
|---|---|
| `npm install` | OK · **0 vulnérabilité** |
| Backend Vitest (v4.1.8) | **13/13** |
| Backend `tsc --noEmit` | 0 erreur |
| Frontend MALEX `vite build` | OK · 30 modules / 198 KB |

---

## 2026-06-07 — Frontend couche 2 : personas, actions, états réseau

**Périmètre :** avancer côté MALEX sans dépendre du backend distant encore bloqué sur les ports
tailnet. Aucun backend delta, aucune action sensible déclenchée.

### Construit

- Client frontend enrichi avec `GET /personas` et `GET /actions/available`.
- Home Room affiche maintenant :
  - contexte courant ;
  - personas disponibles ;
  - porte-parole actif si un blend est présent ;
  - registre d'actions groupé `live` / `future` / `out_of_scope` ;
  - état réseau avec retry manuel.
- Les actions `out_of_scope` restent masquées visuellement ; les actions `future` sont affichées
  comme non fonctionnelles.

### Note

- Le test réel `login → context/personas/actions` attend toujours que `100.100.128.63:8000`
  et `:5174` répondent depuis MALEX.

---

## 2026-06-06 — Intégration MALEX : réconciliation, alignement seed, réponses de sync

**Contexte.** MALEX a poussé `codex/frontend-masterflow` (6 commits) : workspace `apps/frontend`,
carte d'intégration, protocole d'inbox/sync, modif `CLAUDE.md`. Branche basée sur le commit
initial → divergente de `main`. Intégration et réponses faites sur `claude/gitlab-audit-suivi-6PjDS`.

### Fait

- **Réconciliation** : merge de `origin/codex/frontend-masterflow` (auto-merge propre, aucun
  marqueur de conflit ; `SUIVI.md` et `CLAUDE.md` fusionnés sans perte).
- **PoC retiré** (décision Vincent : frontend prioritaire à MALEX). Suppression de
  `packages/poc-frontend`, retrait du workspace + script `dev:poc`, nettoyage `CLAUDE.md`/`README.md`.
  `apps/frontend` (MALEX) devient le **seul** frontend.
- **Alignement seed ↔ endpoints réels** (question MALEX #2) : `preflight_action` →
  `POST /actions/{action_id}/preflight`, `approve_validation_item` → `POST /actions/{action_id}/validate`.
- **Flag de capacité** (question MALEX #1) : champ `status` (`live`/`future`/`out_of_scope`)
  ajouté à `ActionRegistryEntrySchema` (`packages/shared`) + tagué dans le seed. L'UI sait quoi
  afficher comme fonctionnel / verrouillé / masqué. Default prudent `future`.
- **Réponses de sync** : feu vert couche 1 + réponses aux 6 questions backend rédigées dans
  `INBOX_VINCENT.md`, `SYNC_THREAD_MALEX_VINCENT.md`, `INBOX_MALEX.md` (brouillons via Claude ;
  lancement backend = acte humain de Vincent).
- **Réponses validées par Vincent (QCM)** : Q1 = champ `status` seul ; Q2 = aligner le seed
  sur le réel ; Q3 = `user_runtime_loadout` hors V1 ; Q4 = `GET /actions/pending` suffit ;
  Q5 = endpoints lourds plus tard (`future`) ; Q6 = **godmode étendu** (cf. ci-dessous).
- **Sécu** : montée `vitest` `^2.1.0` → `^4.1.8` (corrige l'advisory critique vitest `<4.1.0`
  + chaîne esbuild/vite dev-server, **dev-only**), puis `npm audit fix` non destructif →
  **`npm audit` = 0 vulnérabilité**. Aucun `npm audit fix --force`.

### Validation

| Vérif | Résultat |
|---|---|
| Backend `tsc --noEmit` | 0 erreur |
| Frontend MALEX `tsc --noEmit` | 0 erreur |
| Backend Vitest (v4.1.8) | 13/13 |
| `npm audit` | 0 vulnérabilité |
| Merge `codex/frontend-masterflow` | auto-merge propre, sans conflit |

### Décisions / notes

- `user_runtime_loadout`, validation inbox dédiée, endpoints `/da` `/assets` `/inventory`
  `/subjects` : **hors V1** (anti-scope). Backflow/factories : `out_of_scope`.
- **godmode étendu** (décision Vincent, QCM) : en rôle godmode l'UI peut exécuter des actions
  **et** `owner_ops_private_diagnostic` est exposé — gated rôle godmode uniquement (jamais
  teacher/student). Lève le cloisonnement strict Owner Ops de la 1re carte d'intégration.
- Le contrat REST réel reste l'autorité ; on aligne les métadonnées descriptives du seed dessus.

---

## 2026-06-06 — Frontend couche 1 : shell MALEX minimal

**Périmètre :** création du vrai workspace frontend MALEX, sans backend delta, sans lancement du backend, sans UI finale.

### Construit

- Ajout de `apps/frontend` comme workspace npm.
- Ajout des scripts root :
  - `dev:frontend` ;
  - `lint:frontend` ;
  - `build:frontend`.
- Frontend React/Vite/TypeScript minimal :
  - écran login ;
  - client REST typé vers `/api/v1` ;
  - stockage du token en mémoire ;
  - appel `GET /context/current` ;
  - affichage sobre du user, rôle, room, surface active et nombre d'actions disponibles.

### Validation

| Vérif | Résultat |
|---|---|
| Frontend `tsc --noEmit` | 0 erreur |
| Frontend `vite build` | OK · 30 modules / 198 KB JS |
| Backend Vitest | 13/13 |
| Backend `tsc --noEmit` | 0 erreur |

### Décisions / notes

- Cette couche prouve l'intégration workspace + contrat REST sans présumer des endpoints futurs.
- Aucun backend lancé et aucune modification backend.
- Les widgets chat, personas, actions, validation inbox et ressources seront ajoutés un par un.

---

## 2026-06-06 — Sync MALEX/Codex : baseline + carte d'intégration

**Périmètre :** reprise côté MALEX sur la branche `codex/frontend-masterflow`, sans modification backend ni lancement du serveur.

### Fait

- Relu `CLAUDE.md` et `SUIVI.md` avant action.
- Installé les dépendances du repo.
- Vérifié la baseline locale :
  - `npm test` OK : 13/13 ;
  - `npm run lint` OK ;
  - backend non lancé, conformément à la consigne human-in-the-loop.
- Créé `BACKEND_INTEGRATION_MAP.md` : carte pré-code des modules, tables, endpoints réels, gates, risques et plan de PRs courtes.
- Créé `VINCENT_BACKEND_SYNC_2026-06-06.md` : note courte à envoyer à Vincent pour clarifier les besoins backend avant frontend complet.
- Mis en place par MALEX : un système de conversation asynchrone via Git et fichiers suivis, initialisé dans `SYNC_THREAD_MALEX_VINCENT.md`.
- Ajout du protocole inbox systématique pour Vincent/MALEX : `CLAUDE.md`, `INBOX_VINCENT.md`, `INBOX_MALEX.md` et `SYNC_THREAD_MALEX_VINCENT.md`.
- Commit + push de la branche `codex/frontend-masterflow`.

### Décisions / notes

- Les factories / bots extraits sont hors scope de cette version.
- Le frontend complet doit avancer par couches : contrat/backend vérifié d'abord, intégration minimale ensuite, UI finale en dernier.
- Toute retouche backend éventuelle doit passer par mapping engine / contrat / données / permissions / gates avant code.
- Les échanges structurants MALEX / Vincent / Codex doivent être tracés dans Git quand ils impactent le run, le backend, le frontend ou les décisions de périmètre.
- Règle opérationnelle : avant toute reprise ou action structurante, checker `SUIVI.md`, `SYNC_THREAD_MALEX_VINCENT.md`, puis l'inbox dédiée.

### Points à clarifier avec Vincent

- Alignement entre le seed d'actions et les endpoints réellement exposés.
- Existence souhaitée d'un `capabilities` endpoint ou de champs `implemented/status/locked/ui_enabled`.
- Forme minimale éventuelle de `user_runtime_loadout`.
- Suffisance de `GET /actions/pending` comme validation inbox V1.
- Frontière exacte entre `godmode` visible dans l'UI et diagnostics privés Owner Ops.

---

## 2026-06-06 — MVP backend + PoC : livrés et validés

**Périmètre :** backend (livrable principal) + PoC frontend de démonstration. Le frontend complet reste à MALEX.

### Construit

**Phase 0 — Squelette.** Monorepo npm workspaces (`apps/backend`, `packages/shared`, `packages/poc-frontend`). SQLite via better-sqlite3 (singleton WAL+FK, migrations idempotentes). Schéma MVP : `users`, `revoked_tokens`, `rooms`, `room_instances`, `personas`, `persona_blends`, `actions`, `audit_logs`, `resources`, `global_settings`, `token_events`. Seed idempotent (godmode `vincent`, 3 personas, room Home, ressources). `GET /health`.

**Phase 1 — Auth + Contexte.** JWT Bearer (`signToken`/`verifyToken`, `requireUser`/`requireRole`, révocation par `jti`). `POST /auth/{register,login,logout}`, `GET /auth/me`. `GET /context/current` (user+room+instance+personas+blend actif+actions dispo). Rooms + room_instances (création paresseuse).

**Phase 2 — Personas + Chat + Blend.** `GET /personas`, `POST /personas/{id}/activate`, `POST/PUT/DELETE /personas/blend`. **Chimère** = fusion visuelle + 1 porte-parole (primaire) ; `computeHybridVoice` (overlay de méthode attribué) ; `methodAttribution`. **WebSocket chat streaming** (`routers/ws/chat.ts`) : auth à l'upgrade, `chat_start → chat_chunk → chat_end`. `services/llm.ts` (mock + OpenAI-compat SSE).

**Phase 3 — Action router.** Cycle `draft→preflight→pending_validation→approved→executing→completed` (`action_engine`). `GET /actions/available` (depuis le seed), `POST /actions`, `/preflight`, `/validate` (teacher+), `/execute`, `GET /actions/pending`. `risk_level` statique. Tout tracé dans `audit_logs`.

**Phase 4 — Anti-hallucination.** `resource_truth` : `GET /resources` ne sert que les `validated` ; `POST /resources` → `candidate` ; `POST /resources/{id}/validate` (teacher+). `include_all=1` réservé admin/godmode.

**Contrat MALEX.** `packages/shared` (Zod) : tous les payloads REST + messages WS. Ajout de `SearchResourcesResponseSchema` (`{results,total}`), seule réponse non typée.

**PoC front.** React 19 + Vite 6. `BlendCanvas` (métaballs WebGL `smoothMin`, creep Zerg, respecte `prefers-reduced-motion`), `api.ts` (REST typé), `useChatWs.ts` (hook streaming), `App.tsx` (harness login → contexte → chat streaming → slider de fusion ProfKrapu⇄Corrector).

**Tests.** Vitest niveau engine (`:memory:`) : auth/rôles, cycle de vie action (dont 423 avant validation, rejet, rôle insuffisant), anti-hallucination, invariant blend. **13/13.**

### Corrections de ce tour (reprise après workflow interrompu)

- Écrit le **router WS `ws/chat.ts`** (manquait) + recâblé `index.ts` (http server + montage REST + WS).
- Corrigé **10 erreurs `tsc`** (`noUncheckedIndexedAccess` sur `req.params.id`) dans `personas.ts`/`rooms.ts`.
- **Réconcilié les contrats du PoC** : `App.tsx` (généré en parallèle) attendait des signatures différentes de `api.ts`/`useChatWs.ts` → aligné (`api` agrégé, `login` positionnel, `updateBlend` poids bruts, `currentSpeaker`/`status`/`role:'assistant'`/`method_attribution`, `import App` default).

### Validation (run réel, pas seulement compilation)

| Vérif | Résultat |
|---|---|
| Backend `tsc --noEmit` | 0 erreur |
| Backend Vitest | 13/13 |
| PoC `tsc` + `vite build` | 0 erreur · 32 modules / 209 KB |
| Boot + `/health` | `users:1 personas:3 rooms:1 resources:3` |
| Login godmode → JWT | OK |
| Cycle action complet | draft→preflight→pending→approve→execute→completed |
| **Invariant** execute avant validation | **HTTP 423 `not_approved`** |
| Trace audit | `action_created→preflight→validation→execute_start→execute_completed` |
| Anti-hallucination `/resources` | 2 `validated` ; `include_all` (godmode) → 3 ; proposition → `candidate` |
| WS streaming | `chat_start` → 127 chunks → `chat_end` |
| Chimère via WS | speaker = **ProfKrapu** + `method_attribution = "méthode inspirée de Corrector"` |

### Décisions / notes

- Le **seed** (`action_registry_seed.v1.json`) prime sur `API_DESIGN.md` pour `action_id`/surfaces/risk.
- « SIMULATION PURE » traité comme dry-run (preflight actif, exécution mockée).
- Exécution d'action **mockée** au V1 (pas de runner réel).
- LLM `mock` par défaut.

### Reste à faire (hors MVP, selon souhait de Vincent)

Tauri shell (`apps/desktop`) · brancher un vrai LLM · phases 2+ des specs (multi-room, correction, ComfyUI, OCR) — **explicitement hors MVP**.

---

## 2026-06-06 (suite) — Lancement & corrections du rendu PoC

**Contexte.** Lancement effectif : backend (`:8000`) + PoC Vite (`:5173`) exposés sur le tailnet (`vite --host 0.0.0.0`), accès `http://100.100.128.63:5173` (le PoC proxifie REST `/api` + WS `/ws` vers le backend local → un seul port à partager). Démo testée **en conditions réelles** avec Vincent (navigateur sur Mac). Une chaîne de bugs d'intégration du PoC, invisibles à la compilation, a été trouvée et corrigée en run.

### Bugs trouvés & corrigés (PoC frontend)

1. **CSS désynchronisé.** `styles.css` ciblait d'anciennes classes (`.mf-canvas`/`.mf-harness`/`.mf-panel`) absentes du DOM réel d'`App.tsx` → aucune mise en page, canvas à 0 px → écran noir. **Fix :** `styles.css` réécrit pour le vrai arbre (`.screen--room`, `.room-overlay`, `.speaker-banner`, `.blend-control`, `.chat*`) + canvas plein écran (`position:fixed`).

2. **Shader WebGL — `fwidth()` sans extension.** Le fragment shader appelait `fwidth()` sans déclarer `GL_OES_standard_derivatives` → rejeté par les compilateurs GLSL stricts. **Fix :** anti-aliasing recalculé depuis `u_resolution` (1 px ≈ `1/min(res)`), retrait de `#version 100`, `highp`→`mediump` (compat max).

3. **StrictMode + `loseContext` (cause racine du « log vide / inconnue »).** Le cleanup appelait `WEBGL_lose_context.loseContext()`. Or `canvas.getContext('webgl')` rend toujours le **même** contexte ; sous React StrictMode (double montage en dev), le remontage récupérait un contexte **détruit** → compilation impossible, info-log vide. **Fix :** plus de `loseContext` au cleanup (le GC libère le contexte) ; `display:block` + reset d'erreur à chaque montage.

4. **Dégradation propre.** Si WebGL indisponible/échoue : canvas masqué + **fond CSS dégradé** (halos vert ProfKrapu / violet Corrector) au lieu de noir, et **bandeau d'erreur visible à l'écran** (diagnostic sans console). Un disjoncteur localStorage a été testé puis **retiré** (bloquait à tort une fois le shader réparé).

5. **Bruit console.** Favicon inline (`<link rel="icon" href="data:,">`) → fin du 404. Warning CSP `eval` identifié comme **externe** (extension navigateur) : aucun header CSP côté serveur, aucun `eval` dans le PoC.

### Vérifs
`tsc --noEmit` PoC : 0 erreur. Backend `/health` vert via Tailscale. Login godmode + modules (shader) servis OK via le proxy.

### Note exploitation
Lancement du backend = **human in the loop** (Vincent). Backend bind `*:8000`, Vite `--host 0.0.0.0`.

---

## 2026-06-13 — CTX-1 a CTX-7 : fondations de contexte runtime (local, non pousse)

**Statut :** implementation locale terminee sur `codex/frontend-masterflow`. Aucun commit ni
push sans nouveau GO humain. Handoff detaille :
`CTX_RUNTIME_IMPLEMENTATION_HANDOFF_2026-06-13.md`.

### Construit

- `RuntimeContextEnvelope` T0-T5, compile au maximum en T2 par defaut, avec budget, provenance,
  refs chargees/rejetees, contexte manquant et incertitude.
- `user_runtime_loadout` derive de la Room, du role et des permissions. Actions/personas/modes
  absents du loadout absents de l'UI et du chat. Capacites futures visibles uniquement en
  diagnostic admin autorise.
- `room_checkpoints` prives, bornes a 20 par instance. Sauvegarde explicite et auto-checkpoint
  uniquement lors d'un changement de mode significatif.
- RAG ancre a `purpose`, `room_instance_id`, tier et strategie de retrieval. Le fallback lexical
  est declare ; les packs restent derives, cites, expirables et invalidables.
- WebSocket : speaker limite au loadout, prompt borne a 8 000 caracteres, citations et
  incertitudes injectees, aucune permission ou execution accordee au LLM.
- Persona fallback canonique `masterflow-system-001`; MasterFlex n'est plus le fallback global.
- Cartes memoire L2 candidates, promotion humaine explicite en L3, invalidation et isolation
  private/project. Aucun chat brut sauvegarde automatiquement.
- Frontend branche sur `GET /context/current` filtre : context card, tier, sources, reprise,
  incertitude et modes/actions issus du loadout. Suppression du bootstrap par catalogues globaux.

### Validation locale

- `npm test` : **51 fichiers, 231/231 tests OK**.
- `npm run lint` : backend TypeScript OK.
- `npm run lint:frontend` : frontend TypeScript OK.
- `npm run build:frontend` : build Vite OK (warning de taille de chunk non bloquant).
- `git diff --check` : OK.

### Reste avant integration

- Relecture Vincent des migrations, contrats partages et gates de scope.
- Run reel backend + frontend : login, context/current, checkpoint, RAG, WS et carte memoire.
- Commit/push seulement apres GO MALEX et dernier check distant.
