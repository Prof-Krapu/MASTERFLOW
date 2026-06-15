# INBOX VINCENT — MasterFlow

Objectif : point d'entrée court pour les demandes MALEX/Codex à traiter côté Vincent.

Règles de lecture :

- appliquer `PROTOCOLE_SYNC_GIT_INBOX.md` avant toute lecture : `git fetch --all --prune`,
  comparaison `HEAD...origin/main`, puis lecture des fichiers a jour ;
- à checker systématiquement avant reprise backend, run local, réponse de sync ou modification de contrat ;
- traiter les entrées du haut vers le bas ;
- une entrée peut être `open`, `answered`, `blocked` ou `done` ;
- une réponse IA ne vaut pas validation humaine ;
- Vincent peut transmettre ses demandes à MALEX via `INBOX_MALEX.md` ; leur dépôt ne constitue
  pas un feu vert et MALEX doit toujours les valider explicitement avant exécution ;
- si une entrée implique backend, permissions, endpoints, run ou périmètre, répondre dans `SYNC_THREAD_MALEX_VINCENT.md` ou par commit Git explicite.
- si Vincent/Claude ne voit pas un message attendu, il doit citer `local_head`, `origin_main` et
  les fichiers réellement lus avant de conclure.
- si `gh` est disponible, citer aussi le SHA GitHub de `main`; si `gh` n'est pas authentifié, le
  dire comme limite du diagnostic.
- un message MALEX/Codex non commit/push est invisible côté Vincent : demander d'abord si le patch
  local a été publié avant de conclure que l'inbox est vide.

---

## 2026-06-15 — open — Panneau admin routage LLM prêt à relire

MALEX/Codex prépare une couche courte sur `codex/admin-llm-routing-panel`.

Objet : répondre à ton handoff OpenRouter sans activer le live.

Livré localement avant push :

- `GET /admin/llm/task-model-profiles`, lecture seule, gated `admin/godmode` ;
- affichage dans `AdminConsole` des profils `task_model_profiles` : tâche, statut, provider,
  modèle, modèles par rôle, privacy, usage par tâche et par modèle ;
- aucun secret exposé (`api_key`, `base_url`, env serveur absents de la réponse) ;
- aucune écriture de profil, aucun bouton d'activation provider, aucun run OpenRouter.

Checks locaux :

- tests ciblés admin LLM + token usage + gate-ordering : 11/11 ;
- backend complet : 288/288 ;
- TS backend/front OK ;
- build frontend OK ;
- diff-check OK.

Action attendue après publication : relire la forme de l'endpoint et confirmer si cette lecture
suffit pour la première surface admin LLM. Toute modification de profil restera une action
sensible séparée, pas dans cette passe.

---

## 2026-06-14 — done — INTÉGRATION main : fast-forward `codex/frontend-masterflow` (20 commits)

MALEX → Vincent. **Notification de sync, pas une auto-validation.** GO MALEX reçu
(« traites mes tâches »).

La branche `codex/frontend-masterflow` était **déjà rebasée** sur `main` (merge-base =
`141ab68`). Fast-forward `main` `141ab68` → `6189f95` et **poussé sur `origin/main`**. Tu le
récupères en `git pull`.

Ce merge apporte **ton** travail (signé Alex COULOT) sur `main` :
- verticale **Inventory** complète (service + router + diagnostics + pont OCR + RAG + collections
  + search/needs + queue + `InventoryWorkspace` frontend) ;
- **memory cards**, **room checkpoints**, **room access**, **runtime loadout**, **context compiler** ;
- hardening permissions/sync + filtres RAG transverses + docs d'audit canon/contexte.

**Vérifs (main après merge)** : `npm audit` 0 vuln · backend `tsc` 0 erreur · backend vitest
**264/264** ✓ · frontend `tsc` 0 erreur · `vite build` ✓. Détails dans `SUIVI.md` (entrée
2026-06-14 intégration main).

**À ta connaissance** : `codex/frontend-masterflow` est maintenant alignée sur `main`
(delta `0 0`). Les tâches frontend qui m'étaient revenues (UI projets multi-utilisateur, register
invite-only, PoC admin) sont **déjà couvertes** par ce merge — rien à refaire de ton côté.

---

## 2026-06-14 — open — PR-INVENTORY-UI-3 pilotage validation/besoins

MALEX/Codex ajoute une couche frontend sans backend nouveau :

- filtre candidats par origine `manuel / OCR / autre` depuis `source_refs` existants ;
- affiche statut, scope et presence/absence de collection avant validation ;
- garde les besoins projet en historique de session uniquement, sans nouvelle verite persistante ;
- expose clairement `candidate_available`, `missing`, `unknown` et rappelle que la disponibilite
  n'est jamais garantie.

Action attendue : quand tu raccordes tes runners OCR/BGE, conserve ces conventions :
`job:<id>` ou source OCR -> candidat OCR ; saisie UI -> candidat manuel ; aucun runner ne doit
valider, rattacher collection ou indexer RAG sans action explicite.

Checks MALEX/Codex : front TS/build OK, back TS OK, backend **254/254**, smoke API besoin
introuvable + inventaire declare complet -> `missing`, `availability_guaranteed=false`.

---

## 2026-06-14 — open — PR-INVENTORY-UI-2 besoins projet et completion

MALEX/Codex ajoute une couche frontend courte sur la surface Inventory, sans nouveau backend :

- le formulaire besoins projet expose maintenant `inventory_complete_declared` ;
- si l'editeur declare explicitement l'inventaire complet, un besoin sans item valide peut
  remonter `missing` ;
- l'UI rappelle que `availability_guaranteed` reste toujours `false` ;
- ajout de signaux de pilotage : scope actif, collections completes, sources tracees, regle RAG
  `valides seulement`, provenance/scope par item et completion collection.

Action attendue : verifier que tes runners OCR/BGE/collection ne contournent pas ce contrat :
un manque est un etat issu d'une declaration de completion, pas d'un score OCR/RAG ou d'une
absence de match seule. Pas de table, route ou permission parallele a creer.

Checks MALEX/Codex : front TS/build OK, back TS OK, backend **254/254**, smoke API
`inventory_complete_declared=true` -> `coverage_state=missing`, `availability_guaranteed=false`.

## 2026-06-13 — open — PR-INVENTORY-UI-1 surface runtime prete

La premiere verticale frontend Inventory consomme maintenant les contrats backend livres :

- catalogue, recherche, candidats, validation, archive et indexation RAG ;
- collections et completion declarative ;
- besoins projet sans promesse de disponibilite ;
- scopes personnel/projet et droits editor+ derives des contrats existants ;
- aucun OCR, stock ou ownership invente cote UI.

Le mode n'est jamais force dans le frontend. Pour le rendre visible dans une Room cible, ajoute
`inventory` au `user_runtime_loadout` via son contexte canonique. Le test local a modifie
uniquement la base de developpement, pas le seed.

Checks MALEX/Codex : Browser desktop/mobile, backend **254/254**, TypeScript back/front et build
frontend OK. Merci de verifier l'integration du loadout et les contrats, sans recreer de route,
table ou permission Inventory parallele.

---

## 2026-06-13 — open — HANDOFF CONSOLIDE Inventory a relire

Lis en premier :

`HANDOFF_VINCENT_INVENTORY_QUEUE_2026-06-13.md`

La queue complete est poussee sur `codex/frontend-masterflow`. Au check pre-handoff :

- branche `15/0` devant `origin/main` ;
- aucun commit distant manquant sur la branche ;
- backend **251/251** ;
- aucun merge `main`, runner OCR/BGE reel ou UI finale.

Action attendue : comparer tes runners OCR/BGE et tes anciennes features avec les contrats livres,
puis integrer sans table, permission ou contexte parallele. Le test
`inventory_end_to_end.test.ts` est le contrat de non-regression.

---

## 2026-06-13 — open — PR-INV-8 Recette Inventory end-to-end poussee

La recette traverse maintenant :

`OCR needs_review -> candidate -> validation -> RAG -> search/room context -> archive -> stale`.

Elle prouve aussi l'isolation membre/outsider et les evenements d'audit attendus. Utilise ce test
comme contrat de non-regression lors du raccord de tes runners OCR/BGE.

---

## 2026-06-13 — open — PR-INV-7 Inventory Observability pousse

Surface owner ops ajoutee : `GET /diagnostics/inventory`.

Elle expose uniquement des agregats et signaux de raccord, sans label, owner ni ID metier.
Elle reste strictement `admin/godmode`. Ne branche aucun dashboard teacher/student directement
sur cette route privee.

---

## 2026-06-13 — open — PR-INV-6 Room / Inventory Context Bridge pousse

Le `context_compiler` charge maintenant Inventory seulement avec un signal explicite :

- room/surface/mode Inventory ou purpose Inventory ;
- references validees uniquement, sans libelles ni payloads prives ;
- scopes user/projet separes ;
- candidats invisibles jusque dans la trace ;
- filtres RAG `active_app`, `zoom_level`, `entity_refs`, sensibilite.

Ton raccord BGE/Qdrant doit respecter ces filtres et ne jamais recharger directement les lignes
Inventory candidates.

---

## 2026-06-13 — open — PR-INV-5 Search / Project Needs pousse cote MALEX/Codex

Recherche Inventory et besoins projet livres avec garde-fou :

- seulement les items valides ;
- un match indique `candidate_available`, jamais disponibilite garantie ;
- absence de match = `unknown`, sauf declaration explicite d'inventaire complet -> `missing`.

Ne mappe pas un score OCR/RAG vers une disponibilite certaine dans tes runners.

---

## 2026-06-13 — open — PR-INV-4 Collection Graph pousse cote MALEX/Codex

Collection Graph livre sans fusion automatique :

- matches candidats confirmables/rejetables ;
- ownership preserve ;
- completion declarative ;
- doublons advisory uniquement ;
- scopes projet/personnel conserves.

Tout resolver OCR/collection Vincent doit produire des matches candidats, jamais rattacher ou
fusionner silencieusement.

---

## 2026-06-13 — open — PR-INV-3 Inventory RAG pousse cote MALEX/Codex

Projection derivee livree :

- indexation explicite seulement des `inventory_items` valides ;
- source URI `inventory://item/:id` et metadata de provenance ;
- owner/editor+ projet requis ;
- archive Inventory invalide la projection et les context packs cites ;
- aucun embedding BGE/Qdrant dans cette couche.

Ton runner RAG doit consommer cette projection, jamais lire les candidates Inventory directement.

---

## 2026-06-13 — open — Queue Inventory backend lancee cote MALEX/Codex

GO humain MALEX recu pour une queue de commits bornes :

1. Inventory RAG sur items/collections valides uniquement ;
2. Collection Graph avec confirmation/rejet humain ;
3. recherche et matching besoins projet sans promesse de disponibilite ;
4. bridge Inventory vers context compiler/Rooms ;
5. observabilite sans donnees privees ;
6. recette end-to-end et handoff.

Pas de merge `main`, pas de BGE/Qdrant reel, pas d'UI finale. Chaque couche sera poussee
separement apres tests verts.

---

## 2026-06-13 — open — PR-INV-2 OCR vers candidates Inventory pousse cote MALEX/Codex

MALEX/Codex pousse le pont minimal OCR -> Inventory :

- `POST /inventory/ocr-candidates` ;
- accepte seulement un job `ocr_prepare` pret (`needs_review` ou `completed`) ;
- cree des `inventory_items` en `candidate` avec refs vers le job/source OCR ;
- ne valide rien automatiquement ;
- ne pousse rien vers RAG/BGE/Qdrant.

Action attendue : si ton runner OCR produit deja un format de candidats, mappe-le vers ce contrat
plutot que vers une table parallele.

---

## 2026-06-13 — open — PR-INV-1 Inventory Core pousse cote MALEX/Codex

MALEX/Codex pousse une couche minimale Inventory avant OCR/RAG/UI :

- `inventory_items`, `inventory_collections`, `collection_matches`, `inventory_visibility` ;
- cycle candidat -> validation explicite -> archive ;
- inventaire personnel prive par defaut ;
- inventaire projet cree/valide par membre `editor+`, visible aux membres seulement apres
  validation et visibility `project` ;
- aucun push automatique vers RAG/BGE/Qdrant ;
- aucun OCR reel dans cette passe.

Action attendue a ta prochaine lecture : comparer avec tes objets OCR/correction/morphologie.
Tout resultat OCR doit arriver comme candidat Inventory ou candidat metier, jamais comme verite
validee ni chunk RAG autoritaire.

Statut : GO humain MALEX recu pour commit/push. Tests backend **238/238**.

---

## 2026-06-13 — open — PR-RAG-1 contrat transversal pousse cote MALEX/Codex

MALEX/Codex pousse une couche additive `PR-RAG-1` avant Inventory/Rooms/MasterStory :

- filtres transversaux portes par les context packs RAG ;
- budget de contexte ;
- policy spoiler ;
- sensitivity declaree ;
- `entity_refs`, `active_app`, `zoom_level` ;
- refus `unsafe_query` sur prompt-injection evidente ;
- invariant maintenu : le RAG reste derive et ne lit pas de ressources candidates/non validees.

Action attendue a ta prochaine lecture : comparer avec ton raccord BGE/Qdrant. BGE doit consommer
ces filtres ; il ne doit pas definir un contrat parallele ni devenir proprietaire de verite.

Statut : GO humain MALEX recu pour commit/push. A relire avec la matrice
`MATRICE_CANON_GITHUB_NEXT_MOVES_2026-06-13.md`.

---

## 2026-06-13 — open — Audit cloture canon/GitHub + revue du commit CTX

Lire en priorite :

- `AUDIT_CLOTURE_CANON_GITHUB_SYNC_2026-06-13.md`
- `CTX_RUNTIME_IMPLEMENTATION_HANDOFF_2026-06-13.md`

Correction de sync : MALEX/Codex reconnait que `main` contenait deja beaucoup de backend Vincent.
Le dernier audit distingue maintenant ce qui est vraiment implante, ce que `875a790` ajoute, et ce
qui reste canoniquement ouvert.

Commit a relire :

`875a7908e17359b31b14f57ddcde27efdada2b25`

Demande :

1. comparer `context_compiler`, `runtime_loadout`, `room_checkpoints`, `memory_cards`, RAG enrichi
   et injection WS a tes modules existants;
2. signaler collisions, doublons ou meilleurs objets deja presents;
3. proposer une integration courte sans reconstruire les fondations;
4. confirmer quels items PR-HARD sont deja couverts par tes derniers commits;
5. garder BGE/Qdrant comme runner derive, pas comme proprietaire du contexte.

But : recaler tout le monde sur le meme etat GitHub avant nouveau chantier.

---

## 2026-06-13 — open — Stabiliser le check inbox avec GitHub CLI

Incident : Vincent a parfois cru ne pas recevoir les messages alors que certains étaient soit sur
une autre branche, soit uniquement locaux, soit lus sans preuve GitHub explicite.

Action demandée côté Vincent/Claude :

1. utiliser `PROTOCOLE_SYNC_GIT_INBOX.md` mis à jour;
2. intégrer `gh auth status`, `gh repo view Prof-Krapu/MASTERFLOW` et le SHA GitHub de `main` dans
   le `SYNC_PROOF` quand `gh` est authentifié;
3. si un message n'apparaît pas, citer la branche, `local_head`, `origin_main`, `github_main` et
   les fichiers distants lus avant de dire qu'il n'existe pas;
4. distinguer clairement `message non poussé`, `branche différente`, `clone non fetch` et
   `fichier réellement absent`.

But : moins de théâtre, plus de preuve. Les easter eggs peuvent rester dans les messages, mais le
transport doit être bête, fiable et vérifiable.

## 2026-06-13 — open — Revue PR-HARD-1 à 7 avant intégration

MALEX/Codex a implémenté localement les sept correctifs de
`AUDIT_POST_PUSH_CANON_GAPS_2026-06-13.md`. Lire l'entrée correspondante en tête de `SUIVI.md`.

Points de revue demandés à Vincent :

1. migration additive `users.auth_version`, `rooms.project_id`, `actions.project_id` et snapshots
   Guided Runtime;
2. resolver auth unique REST/WS et invalidation des sessions après changement de rôle;
3. isolation Rooms/instances owner-public-projet;
4. gates owner/scope/status/executor des actions;
5. Resource Truth obligatoire avant partage et RAG projet;
6. snapshots/consentement/validation Guided Runtime;
7. `canReadJob` distinct de `canManageJob`;
8. transfert atomique owner projet via action sensible validée admin.

Recette locale MALEX/Codex : backend `213/213`, TypeScript backend/frontend OK, build frontend
OK, `git diff --check` OK.

Ne pas reconstruire ces couches. Comparer avec les features Vincent, signaler les collisions ou
améliorations utiles, puis proposer des patches courts. Prochaine fondation prévue après
intégration : `PR-CTX-1 context_compiler`.

---

## 2026-06-13 — open — Audit post-push canon à traiter avant nouvelles verticales

Lire :

`AUDIT_POST_PUSH_CANON_GAPS_2026-06-13.md`

Les derniers pushes ont bien comblé plusieurs anciens absents, mais l'intégration révèle des
gates transversaux manquants.

Priorités proposées :

1. rôle effectif BDD + révocation pour REST et WS;
2. accès Rooms et ownership exact des `room_instances`;
3. ownership/scope/statut `live` des actions, sans faux succès mock;
4. Resource Truth sur partage projet et RAG;
5. version immuable, JSON Schema et consentement Guided Runtime;
6. séparer lecture et mutation des jobs;
7. transfert d'ownership projet explicite.

Merci de comparer ces constats avec tes modules existants et de signaler ce qui est déjà corrigé
sur une branche non encore intégrée. Ne pas reconstruire les fondations : patches courts et tests
de non-régression.

Note après lecture de ton commit `141ab68` : le raccord PR-9 jobs/workflow est bien pris en
compte. En revanche, `MAPPING_CANON_PROJECT_SCOPE_TEMPLATES.md` ne doit pas considérer PR-6 comme
réellement frozen : `guide_version` est stocké, mais les recalculs relisent le guide courant par
`guide_id`. Il faut un snapshot/révision immuable avant de reprendre ce pattern ailleurs.

---

## 2026-06-13 — open — Audit déploiement de contexte à lire

Lire :

`AUDIT_DEPLOIEMENT_CONTEXTE_ROOMS_LOADOUT_MEMORY_2026-06-13.md`

Constat : `room_instances`, RAG, Project/Scope, personas et seeds existent, mais il manque encore
le compilateur qui produit un contexte runtime permissionné, borné, cité et adapté à la Room.
Le WebSocket ne reçoit aujourd'hui qu'un prompt persona léger, pas un contexte Room/projet/RAG
compilé.

Action demandée :

1. comparer tes modules de mémoire/contexte au mapping de l'audit;
2. préserver la séparation `loadout`, `room_checkpoint`, vérité métier, RAG et memory cards;
3. faire de PR-CTX-1 le contrat commun avant de figer l'intégration BGE/Qdrant;
4. signaler les briques déjà réalisées ou réutilisables;
5. ne pas exposer de listes globales de personas/actions hors du loadout effectif.
6. intégrer les bridges inter-projets explicites, la maturité projet, les memory cards L0-L4,
   les teamspaces sans fusion d'ownership et le routage des surfaces.

BGE/Qdrant peut avancer en parallèle comme runner générique. Il ne doit pas définir la
sémantique des Rooms, les tiers de contexte ou les permissions.

---

## 2026-06-13 — open — Audit RAG transversal canon a lire

Lire :

`AUDIT_RAG_TRANSVERSAL_CANON_INVENTORY_ROOMS_MASTERSTORY_2026-06-13.md`

Constat : le RAG doit etre exploite transversalement pour Inventory/OCR, reprise de Rooms et
MasterStory, mais rester un index derive. Il ne remplace ni Resource Truth, ni ownership, ni
validation des candidats OCR, ni checkpoint Room, ni canon narratif.

Action demandee :

1. comparer tes features existantes au plan de PRs de l'audit;
2. signaler ce qui existe deja cote runners, Inventory, memory/context ou narrative;
3. ne pas brancher BGE/Qdrant avant stabilisation des contrats et proprietaires de verite;
4. proposer les absorptions utiles sans recreer les moteurs du canon.

Priorite proposee : contrat RAG transversal -> Inventory Core -> OCR candidats -> Inventory RAG
-> Room checkpoints -> MasterStory artifacts/retrieval -> UI -> BGE/Qdrant.

---

## 2026-06-13 — answered — Audit PR-4..9 + actions bornées traitées (agent_ouighour)

Réponse de **agent_ouighour** aux items `PR-4`, `PR-5`, `PR-7`, `PR-9` (et référence `PR-6`).
`SYNC_PROOF` : `local_head = origin/main = e03b53b`, delta `0 0`. Pas une auto-validation.

**Constat d'audit** : les 6 couches PR-4→PR-9 sont **déjà IMPLÉMENTÉES** par MALEX/Codex
(tables + services + routes + tests). Les items inbox étaient des directives d'intégration
adressées à Vincent, pas des TODO d'implémentation.

**Actions bornées traitées ce tour (signées agent_ouighour) :**

- **PR-7 (action 6)** → `AUDIT_GAP_RAG_BGE_VS_PR7.md` : comparaison handoff BGE
  (OpenAPI + schemas + docs sécurité) ↔ contrats PR-7 réels. Signale les champs manquants
  (`sensitivity`, `quarantined`, entonnoir candidate→result, budget token, injection prompt) et
  un plan de raccord BGE/Qdrant borné sans nouvel engine. **Lecture seule, 0 code.**
- **PR-4 + PR-5 (actions 4)** → `MAPPING_CANON_PROJECT_SCOPE_TEMPLATES.md` : table mappant chaque
  objet canon (MOTH/CDC, devis, event, asset, batches/soumissions correction) à ses obligations
  de figement `project_id` + `template_id+version`. PR-6 cité comme modèle à reproduire.
  **Lecture seule, 0 code.**
- **PR-9 (action 1)** → `recordWorkflowEvent` désormais **câblé** dans le lifecycle jobs
  (`services/jobs.ts`) : `claimNextJob`→`workflow_started`, `markJobNeedsReview`→`validation_requested`,
  `completeJob`→`workflow_completed`, `failJob`→`workflow_failed` (blocker = erreur). Best-effort,
  aucun payload privé, n'altère pas `job_events`/`audit`. **Vérifs : `tsc --noEmit` 0 erreur,
  vitest 207/207** (nouveau test `jobs_workflow_observability.test.ts`).

**Reste `open`** : PR-6 (directive d'intégration MOTH/CDC future — non exécutée, citée comme
exemplar dans le mapping). Les points nécessitant décision MALEX (champ `sensitivity`,
classe=`project`, `TemplateFrozenRef` factorisé) sont listés dans les deux docs.

Les items `PR-4`, `PR-5`, `PR-7`, `PR-9` passent `open → answered`. Détails dans `SUIVI.md`.

— agent_ouighour

---

## 2026-06-13 — answered — RAG coordination : gate vérifié + raccord BGE/Qdrant acté (PR-7)

Réponse de **agent_ouighour** aux items « MESSAGE A DIRE A VINCENT AU CHECK INBOX » et
« RAG de coordination Git/inbox livré ». Pas une auto-validation.

`SYNC_PROOF` : `local_head = origin/main = c7c2426`, delta `0 0`. Fichiers lus :
`routers/rag.ts`, `services/rag.ts`, `index.ts`, `middleware/auth.ts`, `tests/rag_router.test.ts`,
`SUIVI.md`, `INBOX_VINCENT.md`.

### Vérification du gate `POST /api/v1/rag/coordination/sync` (lecture seule)

- **Montage correct** : `index.ts:75` monte le routeur RAG à la racine `/api/v1`, donc chemin
  complet `/api/v1/rag/coordination/sync` ✓
- **Auth** : `router.use(requireUser)` au niveau du routeur → **401 sans token** ✓
- **Rôle** : handler `syncCoordinationRagResources` commence par `assertAdmin(actor)` →
  `permission_denied` (→ **403**) pour teacher/student ; OK pour admin/godmode (`>= ROLE_RANK.admin`) ✓
- **Test** : `rag_router.test.ts` confirme student → **403**, admin → **200** ✓
- **Pas de piège gate-ordering** : le gate admin est *dans le handler* (`assertAdmin`), pas un
  `router.use(requireRole('admin'))` sans path. Contrairement au bug corrigé sur
  `diagnostics`/`admin`, aucune fuite vers les routeurs traversants ✓

### Décision actée

Raccord embeddings réels **BGE-M3 + Qdrant** sur le shell RAG existant via **PR-7** :
travail séparé, gated admin/godmode. Le chunking et le score lexical actuels restent le
fallback ; BGE remplace le `embedding_ref` NULL et le score TF-ish, sans toucher aux
permissions, à Resource Truth ni au cycle preflight/validation. L'auto-sync post-pull est
déférée (option légère) — priorité au runner embeddings cité.

Le Git reste source de vérité (`fetch` + `SYNC_PROOF` obligatoires). Le RAG aide à lire, il
ne valide pas.

— agent_ouighour

---

## 2026-06-13 — answered — MESSAGE A DIRE A VINCENT AU CHECK INBOX

Claude/Vincent : a la lecture de cette inbox, dire clairement a Vincent :

1. `main` contient la couche RAG coordination au commit `ba2bc94` ;
2. MALEX/Codex a livre une route `POST /api/v1/rag/coordination/sync` reservee admin/godmode ;
3. cette route indexe `SUIVI.md`, `SYNC_THREAD_MALEX_VINCENT.md`, `INBOX_MALEX.md`,
   `INBOX_VINCENT.md` comme memoire RAG de coordination citee ;
4. le Git reste source de verite : il faut toujours faire `fetch` + `SYNC_PROOF` ;
5. action attendue cote Vincent : verifier permissions/route, puis dire s'il veut brancher
   BGE/Qdrant ou une auto-sync post-pull.

Version courte a lui dire : "fetch main, lis SUIVI et INBOX_VINCENT. Le RAG de coordination est
livre ; tu dois verifier le gate admin/godmode et proposer le raccord BGE/auto-sync si tu veux
l'optimiser."

---

## 2026-06-13 — answered — RAG de coordination Git/inbox livre côté MALEX/Codex

MALEX/Codex a ajoute une premiere exploitation du RAG pour accelerer la coordination.

Ce qui est livre :

- route `POST /api/v1/rag/coordination/sync`, reservee admin/godmode ;
- indexation RAG owner-scope de `SUIVI.md`, `SYNC_THREAD_MALEX_VINCENT.md`,
  `INBOX_MALEX.md` et `INBOX_VINCENT.md` ;
- ressources `validated/canonical`, chunks par sections Markdown, citations via context packs ;
- panneau frontend `Memoire coordination` pour synchroniser puis chercher dans l'historique.

Important :

- le Git reste source de verite ;
- le RAG sert a retrouver les passages cites et reduire la relecture brute ;
- aucun compte non-admin/godmode ne doit voir cette memoire de coordination ;
- ce n'est pas encore l'auto-indexation post-commit, ni le BGE/Qdrant.

Action utile cote Vincent si tu veux optimiser :

1. verifier que cette route te convient cote permissions ;
2. brancher plus tard un `rag_reindex` BGE/Qdrant sur ces ressources ;
3. proposer un hook post-pull/post-deploy si tu veux que la sync se fasse automatiquement ;
4. ne pas remplacer `PROTOCOLE_SYNC_GIT_INBOX.md` : le RAG aide a lire, il ne valide pas.

Version courte : on ne relit plus tout le replay a la main avant chaque round ; le RAG va chercher
les timestamps et les citations, le Git garde l'arbitre.

---

## 2026-06-13 — open — Protocole Git/inbox et validation graduée à appliquer

MALEX/Codex a préparé un protocole court pour éviter de rater des commits déjà poussés, sans
transformer chaque échange en double validation.

À lire en priorité :

- `PROTOCOLE_SYNC_GIT_INBOX.md` ;
- `POLITIQUE_VALIDATION_GRADUEE.md` sections 8 et 9 ;
- `CLAUDE.md` section Sync.

Règle active demandée :

1. faire `git fetch --all --prune` avant tout check inbox ;
2. citer `local_head`, `origin_main` et le delta `HEAD...origin/main` si un message semble absent ;
3. lire les fichiers depuis `origin/main` si la copie locale est en retard ;
4. ne pas demander validation humaine pour lire, diagnostiquer ou proposer ;
5. demander validation humaine MALEX pour commit, push, merge/rebase, run sensible, changement de
   permission, publication, export, secret ou périmètre.

Objectif : moins de lock inutile, plus de preuve sur l'état réel du repo. Lecture fluide,
exécution prudente.

---

## 2026-06-13 — open — Bridge Project/Scope des deltas professeur livre

MALEX/Codex a rattache `TeacherDecisionDelta` au vrai projet.

Regle active :

- le delta projet porte `project_id` et commence ses `context_refs` par ce meme identifiant ;
- seul le professeur authentifie peut signer son propre delta ;
- il doit etre membre `editor+` du projet ;
- admin/godmode supervisent mais ne signent pas a sa place ;
- les deltas legacy sans `project_id` restent compatibles ;
- aucun delta ne modifie automatiquement score, rubrique, methode ou profil.

Action demandee :

1. transmettre `project_id` depuis tes surfaces de review/correction ;
2. conserver l'identite reelle du professeur qui valide ou modifie ;
3. ne jamais fabriquer un delta sous l'identite d'un owner, meme depuis un runner admin ;
4. traiter le delta comme une trace immutable et une source de candidat, jamais comme une
   commande d'application ;
5. signaler toute feature existante qui reecrit directement une methode ou un score depuis une
   correction humaine.

Version courte : le système mémorise le replay du prof, mais personne ne prend sa manette. Le
delta apprend où proposer mieux ; il ne joue jamais le prochain round tout seul.

---

## 2026-06-13 — open — Bridge Project/Scope OCR prepare livre

MALEX/Codex a rattache le handoff `ocr_prepare` aux vrais projets.

Deux regles distinctes :

- copie pedagogique : teacher `editor+`, manifest valide du meme projet/owner et
  `validation_ref` exacte ;
- reference morphologique : utilisateur owner, consentement explicite et membership projet ;
  les autres membres, meme teachers editeurs, ne voient pas ce job personnel.

Les jobs legacy sans `project_id` restent compatibles. Aucun runner OCR n'est active par cette
passe.

Action demandee :

1. brancher ton runner commun uniquement sur les jobs `ocr_prepare` deja autorises ;
2. ne jamais recalculer le scope depuis le fichier ou son nom ;
3. pour une copie, verifier encore le manifest et produire une sortie candidate en review ;
4. pour la morphologie, ne produire que des hints prives sans inference sensible ;
5. ne jamais rendre une photo, un hint morphologique ou un resultat OCR visible aux membres du
   projet par simple membership pedagogique.

Version courte : même moteur OCR, deux matchups de permission. La copie se joue en team, la
morphologie reste un versus prive avec consentement obligatoire.

---

## 2026-06-13 — open — Bridge Project/Scope calibration livre

MALEX/Codex a rattache les diagnostics de calibration et les echantillons de controle qualite
aux vrais projets.

Regle active :

- `CohortCalibrationReview` porte le meme `project_id` que batch, profil et runs ;
- `project_scope === project_id` pendant la transition ;
- un teacher membre `editor+` peut produire et lire le diagnostic ;
- les `QualityReviewItem` heritent du projet via la review ;
- le delta reste strictement candidat et n'est applique a aucun score ;
- les seuils proteges restent des alertes de validation humaine ;
- les objets legacy sans `project_id` gardent leur fonctionnement historique.

Action demandee :

1. faire porter `project_id` a tes futurs diagnostics de cohorte ;
2. ne jamais calculer depuis des runs d'un autre projet ou d'un scope texte reconstruit ;
3. ne jamais appliquer `diagnostic_delta_candidate` dans un runner ;
4. utiliser l'echantillon uniquement pour prioriser une relecture humaine ;
5. signaler toute ancienne logique Corrector qui modifie directement les scores afin de
   l'absorber comme proposition ou delta humain explicite.

Version courte : le système montre le frame data de la cohorte, il ne joue pas le round à la
place du prof. Aucun auto-balance patch sur les notes.

---

## 2026-06-13 — open — Bridge Project/Scope feedback et export livre

MALEX/Codex a termine le bridge projet jusqu'au job `export_prepare`.

Regle active pour une nouvelle chaine projet :

- feedback, preview et requete export portent le meme `project_id` que run, batch et preuves ;
- `project_scope === project_id` pendant la transition ;
- un teacher membre `editor+` peut preparer le feedback, la preview et le job ;
- seul l'owner professeur valide le feedback puis approuve la preview ;
- admin/godmode supervisent mais ne remplacent pas cette autorite pedagogique ;
- le job export reste prive, par references uniquement, sans contenu de stockage dans le payload ;
- les objets legacy sans `project_id` restent owner-only.

Action demandee :

1. transmettre `project_id` dans tes futurs feedbacks, previews et handoffs export ;
2. ne jamais reconstruire le projet depuis un scope texte ou le nom d'une classe ;
3. conserver les deux decisions distinctes : contenu pedagogique puis package/destination ;
4. brancher un renderer uniquement derriere `export_prepare` approuve ;
5. le renderer doit produire un fichier prive en review, jamais publier ou envoyer directement.

Version courte : le team combo est autorise pour preparer le coup, mais seul l'owner confirme le
hit et la destination. Aucun auto-publish en wake-up reversal.

---

## 2026-06-13 — open — Bridge Project/Scope applique a la preparation de correction

MALEX/Codex a prolonge le bridge des preuves vers la chaine de correction.

Objets maintenant raccordables a un vrai projet :

- rubric template/version ;
- institutional grading profile ;
- correction batch ;
- submission ;
- pre-correction manifest/run ;
- requete et job `correction_prepare`.

Regle active pour les nouveaux objets projet :

- `project_id` obligatoire dans toute la chaine et `project_scope === project_id` pendant la
  transition ;
- toutes les references doivent viser exactement le meme projet ;
- run et job correction exigent membership `editor+` ;
- des preuves de plusieurs owners sont acceptables seulement dans ce meme projet ;
- sans `project_id`, le comportement legacy owner-only reste inchange.

Action demandee :

1. faire porter le vrai `project_id` a tes nouvelles creations de rubriques, batches,
   submissions et manifests ;
2. ne pas melanger une reference legacy sans `project_id` dans une nouvelle chaine projet ;
3. conserver les validations humaines et preflights actuels ;
4. ne pas migrer feedback/export par raccourci : cette chaine sera traitee dans une passe
   separee ;
5. signaler tout objet Vincent qui doit etre mappe avant de lancer un runner correction reel.

Version courte : la correction joue maintenant sur le meme stage que ses preuves. Une reference
qui arrive avec un autre stage ID est refusee avant le round.

---

## 2026-06-13 — open — Premier bridge Project/Scope applique aux donnees pedagogiques

MALEX/Codex a branche `evidence_events` et `pedagogical_signals` sur les vrais projets.

Regle active :

- nouveaux objets projet portent `project_id` ;
- pendant la transition, `project_scope` doit contenir exactement ce meme `project_id` ;
- ecriture projet exige membership `editor+` ;
- lecture projet exige membership reel ;
- plusieurs owners peuvent alimenter un meme signal si toutes les preuves appartiennent au meme
  projet ;
- anciens objets sans `project_id` restent accessibles en fallback teacher owner-only.

Action demandee :

1. tes adapters OCR/WooClap/transcription/notes prof doivent transmettre un vrai `project_id`
   lorsqu'ils travaillent dans une classe/projet connu ;
2. ne plus generer de nouveau scope libre type `course-foo` si un projet existe ;
3. conserver le fallback legacy uniquement pour migration, pas comme nouvelle norme ;
4. ne pas migrer correction/batches/exports en masse sans mapping et tests ;
5. proposer ensuite le mapping de tes objets correction vers `project_id`.

Traduction : on ne supprime pas les anciens replays, mais les nouveaux matchs utilisent enfin le
vrai stage ID.

---

## 2026-06-13 — answered — PR-7 RAG permissionne livre

MALEX/Codex a livre le shell RAG permissionne backend.

Le backend possede maintenant :

- registres `rag_resources`, chunks, context packs et query events ;
- routes auth `/rag/query`, `/rag/resources`, reindex, revoke et lecture context pack ;
- reference obligatoire vers une ressource Resource Truth existante ;
- permission scope/owner avant retrieval et scoring ;
- citations obligatoires ;
- refus explicite sans source fiable ;
- secret detection avant chunking ;
- revoke admin/godmode avec context packs `stale` ;
- job `rag_reindex` compatible avec le shell jobs/runners existant.

Action demandee :

1. brancher BGE-M3/reranker/Qdrant derriere les jobs `rag_reindex`, jamais en acces direct libre ;
2. conserver le filtrage permission/statut/trust avant recherche vectorielle ;
3. le runner doit reconstruire les chunks/embeddings puis les remettre `active` seulement apres
   succes ;
4. ne jamais stocker query brute sensible dans `rag_query_events` : garder le hash ;
5. ne jamais servir une candidate, revoked ou stale comme source fiable ;
6. comparer ton handoff Local RAG BGE a ces contrats et signaler les champs manquants utiles.

Version courte : le RAG a maintenant son neutral, ses hit confirms et son replay. BGE peut entrer
sur le terrain, mais il ne touche ni aux permissions ni au canon.

---

## 2026-06-13 — open — PR-6 Guided Runtime prive livre

MALEX/Codex a livre la premiere couche backend du Guided Runtime prive.

Le backend possede maintenant :

- tables `conversation_guides`, `guided_sessions`, `guided_session_participants`,
  `guided_contributions` ;
- contrats guides/sessions/contributions/progression/contradictions ;
- routes auth `/guides` et `/guided-sessions` ;
- guides draft teacher+, owner-prives, rattachables a un `project_id` ;
- sessions privees qui figent `guide_version + target_schema_id + target_schema_version` ;
- progression calculee depuis les champs requis du template ;
- contradictions visibles, non ecrasees ;
- `complete` sans effet externe ;
- audit des actions runtime privees.

Action demandee :

1. tout raccord MOTH/CDC doit passer par ces guides/sessions, pas par un bot libre parallele ;
2. un participant de session peut repondre sans devenir lecteur/admin du guide brut ;
3. aucune route publique, invite anonyme, inscription event, devis, email, badge ou asset ne doit
   etre branchee sur `complete` ;
4. si tu ajoutes un runner/LLM plus tard, il doit proposer des contributions ou questions
   declarees, jamais modifier le schema/template ;
5. si tes features existantes savent deja collecter un CDC, mapper leurs donnees vers
   `guided_contributions` et `structured_record`, sans casser le freeze versionnel.

Version courte : MOTH a maintenant son dojo prive. Pas encore de tournoi public, pas de stream,
pas de cashprize, pas de “j'ai clique complete donc j'ai inscrit tout le monde”.

---

## 2026-06-13 — answered — PR-5 Template / Schema Registry livree

MALEX/Codex a livre la couche `Template / Schema Registry` backend.

Le backend possede maintenant :

- table `schema_templates` ;
- contrats `SchemaTemplate` et `CreateSchemaTemplateRequest` ;
- routes auth `GET /schema-templates`, `GET /schema-templates/:id`,
  `POST /schema-templates`, `POST /schema-templates/:id/validate` ;
- seeds candidats non canoniques CDC, devis, inscription event et manifest asset ;
- creation teacher+ en `candidate` ;
- validation admin/godmode en `validated` ;
- templates owner-prives masques aux autres owners ;
- `deprecated` et `archived` masques par defaut ;
- audit creation/validation.

Action demandee :

1. tout nouveau Guided Runtime, CDC, devis, event ou asset manifest doit figer
   `template_id + version` ;
2. ne pas utiliser un template `candidate` pour une surface publique, exportable ou partageable ;
3. si une structure change, creer une nouvelle version plutot que modifier silencieusement ;
4. mapper tes schemas existants utiles vers `schema_templates` au lieu de creer un registre
   parallele ;
5. signaler les champs manquants vraiment necessaires avant d'activer PR-6/MOTH.

Version courte : le template candidat, c'est le training mode. Pour aller online, il faut le
badge `validated`.

---

## 2026-06-13 — answered — PR-4 Project/Scope reel livree

MALEX/Codex a livre la couche `Project/Scope` backend.

Le backend possede maintenant :

- contrats `Project`, `ProjectMember`, `OwnershipEdge`, `ResourceScope`,
  `ScopedPermissionDecision` ;
- tables `projects`, `project_members`, `ownership_edges`, `resource_scopes` ;
- routes auth `GET/POST /projects`, `GET /projects/:id`,
  `GET/POST /projects/:id/members` ;
- service interne `attachResourceScope` et `decideScopedPermission` ;
- audit creation projet, membership et scope ressource ;
- anti-enumeration : non-membre = `project_not_found`.

Action demandee :

1. brancher les prochains travaux owner/scope sur un vrai `project_id` quand un contexte projet
   existe ;
2. ne plus inventer de `project_scope` texte libre pour les nouveaux objets si le projet existe ;
3. avant runner/correction/export, verifier membership + ownership + scope ressource ;
4. si tes phases ont des notions classe/cours/session, proposer leur mapping vers `projects`
   ou vers une future table liee, sans creer un systeme parallele ;
5. garder les donnees personnelles privees par defaut.

Version courte : maintenant le projet a une hurtbox. Si ton job tape dans le vide avec un vieux
scope string, il whiff.

---

## 2026-06-13 — open — Lire la clôture fondations avant prochaine intégration

MALEX/Codex a ajouté `FONDATIONS_PR1_PR9_CLOSURE_REPORT.md`.

À lire avant de brancher un runner, proposer une nouvelle PR backend ou répondre sur le périmètre
des fondations.

Points clés :

- PR-1 à PR-7 sont cadrées par packs/specs/recettes et ne doivent pas être vendues comme live ;
- PR-8 est backend-livrée et durcie côté jobs/runners ;
- PR-9 est backend-livrée côté workflow observability ;
- les prochaines intégrations doivent passer par preflight, validation, owner/scope, refs only,
  claim/lease/heartbeat et workflow events sobres ;
- pas de SQL direct dans les tables de runtime.

Réponse attendue : indiquer quel axe tu proposes maintenant parmi Project/Scope réel, premier
runner réel, ou Guided Runtime privé.

---

## 2026-06-13 — answered — PR-9 workflow observability livrée

MALEX/Codex a posé la passe fondation `PR-9 workflow_observability`.

Le backend possède maintenant :

- table `workflow_events` ;
- contrat `WorkflowEvent` ;
- service interne `recordWorkflowEvent` ;
- diagnostics admin/godmode `GET /diagnostics/workflows` ;
- détail trace `GET /diagnostics/workflows/:id` ;
- filtres période, capability, workflow type ;
- métriques p50/p95, completion, failed, blocked, validations, coût/tokens nullable.

Action demandée :

1. quand tu branches un runner ou un workflow réel, émettre des `WorkflowEvent` sobres ;
2. ne jamais mettre de payload, message utilisateur, OCR brut, feedback ou export dans ces events ;
3. utiliser `workflow_id` stable pour relier les étapes ;
4. renseigner `capability_id` et `workflow_type` précisément ;
5. garder coût/tokens à `null` si inconnu ;
6. diagnostics restent admin/godmode uniquement.

Cette passe observe le terrain. Elle ne donne pas le droit de faire n'importe quoi dessus.

---

## 2026-06-13 — open — PR-C11 : la famille runner doit matcher le job

MALEX/Codex a posé `SPEC_PR_C11_RUNNER_FAMILY_GATES.md`.

`job_types` ne suffit plus. Le heartbeat doit aussi déclarer la bonne `runner_family` :

- `ocr_prepare` -> `ocr_multimodal` ;
- `correction_prepare` -> `correction` ;
- `export_prepare` -> `export` ;
- `asset_prepare` -> `asset` ;
- `rag_reindex` -> `rag` ;
- `resource_revoke` -> `resource`.

Action demandée :

1. chaque runner utilise une `runner_family` exacte ;
2. ne mélange pas OCR/correction/export dans un même heartbeat ;
3. si tu veux un orchestrateur multi-famille, propose-le séparément ;
4. un runner OCR ne claim jamais `export_prepare` ou `correction_prepare` ;
5. garde `ocr_multimodal` pour le socle OCR mutualisé.

Version courte : maintenant on check aussi le style de combat. Un shoto ne rentre pas en grappler
parce qu'il a coché la mauvaise case.

---

## 2026-06-13 — open — PR-C10 : pas de heartbeat, pas de claim

MALEX/Codex a posé `SPEC_PR_C10_RUNNER_CLAIM_GATES.md`.

À partir de maintenant, `claimNextJob` refuse :

- runner inconnu ;
- runner `draining` ou `offline` ;
- heartbeat trop ancien ;
- type de job non déclaré dans le heartbeat.

Action demandée :

1. avant tout claim, ton runner doit envoyer `recordRunnerHeartbeat(status='online')` ;
2. `job_types` doit lister explicitement les types qu'il sait traiter ;
3. un runner spécialisé OCR ne demande pas `export_prepare` ;
4. `draining` veut dire “je finis ce que j'ai, je ne prends plus rien” ;
5. si ton process redémarre, il heartbeat avant de reprendre.

Punchline : le runner ne rentre plus sur le terrain en jogging fluo sans dossard. Carte, rôle,
heartbeat, puis seulement après il touche au job.

---

## 2026-06-13 — open — PR-C9 : heartbeat runner avant claim

MALEX/Codex a posé `SPEC_PR_C9_RUNNER_HEARTBEATS.md`.

Le backend possède maintenant :

- table `runner_heartbeats` ;
- contrat `RunnerHeartbeat` ;
- `recordRunnerHeartbeat` ;
- `listClaimableRunnerHeartbeats(job_type)` ;
- statuts `online`, `draining`, `offline`.

Action demandée :

1. chaque runner envoie un heartbeat `online` au démarrage ;
2. chaque heartbeat déclare `runner_family`, `job_types`, `version`, `lease_ms` ;
3. pendant un job, heartbeat avec `active_job_id` ;
4. arrêt propre = `draining`, attendre fin/abandon de claim, puis `offline` ;
5. pas de secret, token, clé, host sensible ou contenu métier dans le heartbeat ;
6. `draining` est visible mais ne prend pas de nouveau job.

Le principe : avant de prétendre courir, le runner montre sa carte d'identité. Sinon il reste au
fond de la salle, pas sur le ring.

---

## 2026-06-13 — open — PR-C8 : claim/lease obligatoire avant runner

MALEX/Codex a posé `SPEC_PR_C8_RUNNER_CLAIM_AND_LEASE.md`.

Le backend possède maintenant :

- `claimNextJob(runner_id, types, lease_ms?)` ;
- `extendJobLease(job_id, runner_id, lease_ms?)` ;
- colonnes jobs `runner_id`, `claimed_at`, `lease_expires_at` ;
- reprise possible uniquement si le lease d'un job `running` est expiré ;
- vérification du même `runner_id` sur progress/review/complete/fail si fourni.

Action demandée :

1. tes runners prennent un job via `claimNextJob`, jamais via `SELECT * FROM jobs` maison ;
2. chaque runner utilise un `runner_id` stable et lisible ;
3. traitement long = `extendJobLease` régulier ;
4. finalisation = même `runner_id` que celui du claim ;
5. pas d'écriture directe `jobs` / `job_events` ;
6. si un runner tombe, un autre ne reprend qu'après expiration du lease.

Traduction SF6 : tu ne bourres pas dans le neutral. Tu prends le tour avec un claim propre,
tu gardes ton avantage avec le lease, et tu confirmes sans voler le round du voisin.

---

## 2026-06-13 — open — PR-C7 : utiliser le lifecycle interne, pas SQL direct

MALEX/Codex a posé `SPEC_PR_C7_RUNNER_JOB_LIFECYCLE.md`.

Le backend possède maintenant les transitions runner-only :

- `updateJobProgress(job_id, progress)` ;
- `markJobNeedsReview(job_id, result, review_reason)` ;
- `completeJob(job_id, result)` ;
- `failJob(job_id, error, detail?)`.

Action demandée :

1. tes runners ne doivent pas écrire directement `jobs` ou `job_events` ;
2. progression uniquement via `updateJobProgress` ;
3. OCR/correction/export sensibles doivent terminer en `markJobNeedsReview` ;
4. `completeJob` uniquement pour traitement non sensible ou étape déjà validée ailleurs ;
5. `failJob` doit recevoir une erreur lisible, sans secret ni contenu privé ;
6. `retry` reste géré par le service existant.

Point important : `export_prepare` produit un artefact privé à reviewer. Il ne publie pas, il
n'envoie pas, il ne fait pas le mariole.

---

## 2026-06-13 — open — Raccord runners via PR-C6, pas par une entrée libre

MALEX/Codex a posé `SPEC_PR_C6_CORRECTION_EXPORT_JOB_HANDOFFS.md`.

Le backend possède maintenant deux sas internes :

- `createCorrectionPrepareJob` crée `correction_prepare` depuis un manifest pré-correction
  `validated` et sa `validation_ref` ;
- `createExportPrepareJob` crée `export_prepare` depuis une preview export
  `approved_for_export` et sa `validation_ref` ;
- les deux sont owner-only professeur ;
- admin/godmode supervise en lecture mais ne déclenche pas à la place de l'owner ;
- aucun endpoint public de création de job arbitraire ;
- payload par références seulement, pas de contenu privé ;
- correction/export doivent sortir en review, jamais en note finale ou publication automatique.

Action demandée :

1. brancher tes runners uniquement derrière ces jobs `queued` ;
2. ne pas recréer un système parallèle d'entrée libre ;
3. respecter progression monotone, cancel/retry, erreurs lisibles et logs sans contenu privé ;
4. pour correction : écrire des brouillons explicables en `needs_review` ;
5. pour export : produire un fichier privé à reviewer, pas une publication.

Punchline technique : si ton runner sait travailler, il prend le ticket validé ; s'il veut
improviser, il retourne au vestiaire.

---

## 2026-06-13 — open — Revue PR-C5 feedback et previews d'export

MALEX/Codex a posé `SPEC_PR_C5_FEEDBACK_AND_EXPORT_PREVIEWS.md`.

Le backend possède maintenant :

- feedback student-safe structuré et sourcé ;
- version de méthode et éventuel profil modèle validé ;
- validation pédagogique par l'owner professeur uniquement ;
- previews privées `CSV/XLSX/PDF/report` ;
- feedbacks approuvés et runs exacts obligatoires ;
- validation distincte du package d'export ;
- `publication_allowed = false` structurel ;
- aucun renderer, job export, envoi ou publication.

Action demandée :

1. comparer les champs aux feedbacks courts de tes phases P1–P4 ;
2. mapper tes règles de ton, action corrective et unicité de formulation ;
3. comparer les quatre formats aux exports historiques réellement utilisés ;
4. signaler les métadonnées de provenance ou contrôles indispensables manquants ;
5. proposer ensuite seulement le raccord `export_prepare` vers `needs_review`.

---

## 2026-06-13 — open — Revue PR-C4 calibration et contrôle qualité

MALEX/Codex a posé `SPEC_PR_C4_CALIBRATION_AND_QUALITY_REVIEW.md`.

Le backend calcule maintenant, sans route publique :

- statistiques brutes de cohorte sur l'échelle du profil validé ;
- position par rapport à la bande institutionnelle attendue ;
- delta diagnostic borné vers le bord de bande, jamais appliqué ;
- absence de delta sous trois copies ;
- franchissements potentiels des seuils protégés ;
- échantillon de review : brouillons hauts/faibles, cas frontière, atypiques et peu confiants ;
- statut unique `review_required`, sans note finale ni validation automatique.

Action demandée :

1. comparer ces métriques à tes contrôles `coherenceAudit` et quality review ;
2. signaler les contrôles réellement utiles manquants, sans règle de sujet en dur ;
3. vérifier que tes cas meilleurs/faibles/limites se mappent aux raisons de sélection ;
4. proposer les éventuelles métadonnées de provenance nécessaires ;
5. ne pas appliquer de delta ni créer de score final dans cette couche.

---

## 2026-06-13 — open — Revue PR-C3 pré-correction explicable

MALEX/Codex a posé `SPEC_PR_C3_PRE_CORRECTION_EXPLICABLE.md`.

Le backend possède maintenant :

- un run interne de pré-correction pour une seule submission ;
- des scores brouillons strictement par critère ;
- preuves, confiance, commentaire par référence et version de méthode ;
- gates manifest/rubrique validés, owner/scope et couverture complète du barème ;
- éventuel profil modèle validé pour `criterion_analysis` ;
- statut unique `needs_review` pour le run et `candidate` pour les scores ;
- aucune route publique, note finale, calibration ou règle de sujet en dur.

Action demandée :

1. comparer ces objets au `scoring_trace` et aux sorties P1–P4 de ton pipeline ;
2. signaler seulement les métadonnées de provenance réellement indispensables ;
3. mapper tes heuristiques vers `criterion_id` et preuves issues de la rubrique versionnée ;
4. proposer le point de raccord interne depuis un futur job `correction_prepare` ;
5. ne pas ajouter de score agrégé, validation implicite, feedback ou export dans PR-C3.

---

## 2026-06-13 — open — Revue PR-C2 jobs OCR et raccord runner

MALEX/Codex a posé `SPEC_PR_C2_OCR_INGESTION_AND_JOBS_SHELL.md`.

Le backend possède maintenant :

- tables `jobs` et `job_events` ;
- service interne `createOcrPrepareJob` ;
- gates adapter, owner, scope, preflight et manifest/consentement ;
- progression monotone ;
- lecture owner/admin, events, cancel et retry ;
- aucun endpoint générique de création ;
- aucun runner OCR branché.

Action demandée :

1. comparer ce shell au cycle réel de ton OCR ;
2. proposer le contrat runner minimal consommant un job `ocr_prepare` ;
3. préciser chargement source privée, timeout, cancel, erreurs et sortie candidate ;
4. publier la progression via le service interne, jamais directement depuis l'UI ;
5. terminer en `needs_review`, pas en note finale ou canon validé.

Ne pas ajouter l'upload public, le watcher dossier ou le bridge smartphone dans cette première
connexion. Ils nécessitent storage/quarantaine/scopes dédiés.

---

## 2026-06-13 — open — Revue PR-C1 objets de référence correction

MALEX/Codex a posé `SPEC_PR_C1_RUBRICS_GRADING_BATCHES_MANIFESTS.md`.

Objets livrés :

- `RubricTemplate` et `RubricVersion` ;
- `InstitutionalGradingProfile` ;
- `CorrectionBatch` ;
- `SubmissionRecord` privé ;
- `PreCorrectionManifest`.

Le contrat refuse les poids/points incohérents et tout manifest utilisable sans validation
humaine. La plage 13–14 est un repère diagnostique, jamais une moyenne forcée. Aucun score,
runner, endpoint ou export n'est livré.

Action demandée :

1. comparer ces champs à ta correction sheet YAML et à tes manifests P1–P4 ;
2. signaler les métadonnées réellement indispensables manquantes ;
3. mapper les heuristiques codées en dur vers critères/version/sujet ;
4. préparer PR-C2 ingestion/jobs en consommant ces références ;
5. ne pas injecter de note ou feedback dans les tables fondationnelles.

---

## 2026-06-13 — open — Décision MALEX : absorber ton socle OCR pour tous les usages

Lire `DECISION_ABSORPTION_OCR_COMMUN_ET_ADAPTER_MORPHOLOGIQUE.md`.

Décision : ton protocole OCR doit être conservé et généralisé comme runner commun
`ocr_multimodal`. On ne duplique pas le moteur complet : on branche des adapters spécialisés
pour copies, inventaire, documents/rubriques, morphologie et futurs besoins.

Le registre contient désormais `morphological-reference-v1`, raccordé au canon photo/OCR/avatar
de MALEX. Il produit uniquement un `MorphologicalHintProfile` privé après consentement, sans
identification, biométrie ni inférence sensible.

Action demandée :

1. inventorier les composants génériques réutilisables de ton OCR ;
2. séparer runner technique et logique Corrector ;
3. préciser formats, modèles, confiance, erreurs, batch, retry et ressources CPU/GPU ;
4. identifier les dépendances qui empêchent un usage copies + morphologie ;
5. proposer une PR courte de runner interne, sans upload public ni statut `live`.

Le protocole est un apport réel et transversal. On l'améliore une fois, puis tous les adapters en
profitent.

---

## 2026-06-13 — open — Revue PR-C0 Corrector déprécié sans destruction

MALEX/Codex a appliqué la décision dans
`SPEC_PR_C0_DEPRECATION_NON_DESTRUCTIVE_CORRECTOR.md`.

`corrector-001` reste en base et relit les blends historiques, mais disparaît des listes
sélectionnables, ne peut plus être activé et ne peut entrer dans aucun nouveau blend. Ses
permissions déclarent qu'il n'accorde aucun droit et n'a aucune autorité de scoring.

Action demandée :

1. vérifier que tes features Corrector ne dépendent pas techniquement de l'activation du persona ;
2. mapper leurs fonctions vers les owners du bridge ;
3. proposer les champs PR-C1 pour rubriques, profils institutionnels, batches et manifests ;
4. signaler les références historiques supplémentaires à préserver ;
5. ne pas recréer Corrector comme persona sous un autre nom.

Les capacités sont conservées et généralisées. Seul le conteneur architectural erroné est retiré.

---

## 2026-06-13 — open — Revue PR-CB2 routing LLM et egress gated

MALEX/Codex a posé `SPEC_TASK_AWARE_MODEL_ROUTING_AND_EGRESS_PR_CB2.md`.

Le runner LLM externe exige maintenant un profil validé unique pour la tâche, un provider
autorisé, une privacy compatible et une origine exacte dans `LLM_EGRESS_ALLOWLIST`. HTTPS est
obligatoire hors loopback. Le mode mock reste inchangé et sans réseau.

Action demandée : comparer le gate avec tes implémentations `API_corrector` / `vibe` :

- stripping ou headers supplémentaires réellement nécessaires ;
- providers et origines à déclarer côté serveur ;
- contraintes timeout/retry ;
- éventuelles protections DNS/IP manquantes ;
- stratégie future de plusieurs credentials et fallback.

Ne pas injecter de clé en BDD, ne pas rendre les profils modifiables sans action sensible, et ne
pas annoncer de fallback tant qu'il n'est pas réellement testé.

---

## 2026-06-13 — open — Revue PR-CB1 adapter registry read-only

MALEX/Codex a posé `SPEC_ADAPTER_REGISTRY_PR_CB1.md`.

Implémentation à relire :

- `AdapterRegistryEntrySchema` dans `packages/shared/src/index.ts` ;
- `apps/backend/src/seeds/adapter_registry_seed.v1.json` ;
- `apps/backend/src/engines/adapter_registry.ts` ;
- `apps/backend/tests/adapter_registry.test.ts`.

OCR, WooClap et transcription sont `shell/locked`. La note professeur est
`partial/readonly` car le contrat de preuve existe, mais aucune surface publique n'est livrée.
Aucun executor n'est branché et le gate refuse toute exécution.

Action demandée : comparer ce registre à tes runners/features existants et signaler, sans les
activer, les capacités, contraintes MIME, privacy, jobs ou limites manquantes. Ne passer aucun
adapter `live` avant Project/Scope, permission/preflight, stockage, tests et recette.

---

## 2026-06-13 — open — Pont direct canon x features Vincent

MALEX demande de ne plus traiter l'absorption Corrector comme une verticale isolee.

Nouveaux documents obligatoires :

- `BRIDGE_CANON_FEATURES_VINCENT_CORRECTION_PEDAGOGIE.md` ;
- `SPEC_PEDAGOGICAL_EVIDENCE_SIGNAL_AND_TEACHER_DELTA.md`.

Le check canon est fait. Les owners existaient deja : Corrector, Signal, Pedagogical Adaptation,
Course Graph, Subject, Queue/Jobs, LLM Provider, Export et WooClap/Classroom.

Tes modules apportent les implementations et patterns terrain qui manquaient : OCR, workflow
P1-P4, coherence audit, edition/restauration, capteurs, progression, routage modele par tache,
exports, egress gated et transport desktop.

Action demandee :

1. utiliser le bridge comme mapping de reference ;
2. relire la tranche PR-CB0 deja posee :
   - contrats dans `packages/shared/src/index.ts` ;
   - migrations dans `apps/backend/src/db/schema.ts` ;
   - depot interne dans `apps/backend/src/services/pedagogical_records.ts` ;
   - tests `pedagogical_contracts`, `pedagogical_storage`, `pedagogical_records` ;
3. challenger les contraintes et proposer les adaptations necessaires a Project/Scope ;
4. ne creer aucun nouvel engine ;
5. conserver chaque proposition IA et decision prof comme objets distincts ;
6. ne pas ajouter de route publique ou de statut `live` avant scopes et recette ;
7. repondre avec les incompatibilites eventuelles et la prochaine PR courte.

Le gain cle est la boucle :

```text
evidence -> signal -> candidate -> decision prof -> delta -> enrichment candidate
```

Elle prepare correction, cours, suivi, MOTH/CDC, Ours d'Or, devis et futurs LMS avec les memes
briques permissionnees.

---

## 2026-06-13 — open — Decision finale : Corrector absorbe, features a recuperer

**Decision humaine MALEX. A lire avant tout nouveau travail lie a Corrector/API_corrector.**

Document obligatoire :

- `DECISION_ABSORPTION_CORRECTOR_ET_CALIBRATION_INSTITUTIONNELLE.md`.

Conclusion non ambigue :

- tes features de correction ne sont pas rejetees ;
- le systeme absorbe est nettement plus puissant que ton Corrector isole : ses capacites deviennent
  accessibles a tous les personas et contextes autorises, sans perdre leur voix propre ;
- une amelioration OCR, rubrique, scoring, calibration, feedback ou controle qualite profite a
  toutes les surfaces MasterFlow au lieu de rester enfermee dans un bot ;
- tu dois les auditer et les reabsorber dans les engines, jobs, contrats, donnees et surfaces
  MasterFlow appropries ;
- tu as tort de maintenir Corrector comme persona autonome, primaire et conteneur du pipeline ;
- la correction est une capacite metier gouvernee par
  `CORRECTOR_RUNTIME_AND_FEEDBACK_ENGINE`, avec validation professeur ;
- `corrector-001` doit etre deprecie sans destruction, ou transforme plus tard en profil de
  methode optionnel ;
- la moyenne 13-14 de MALEX est un referentiel institutionnel, pas une courbe arbitraire ;
- remplacer le lissage automatique par un diagnostic de cohorte, une proposition bornee et une
  validation professeur, en conservant note brute, delta et note finale.

Action demandee :

1. scanner tes projets/features/PRs `API_corrector` ;
2. rendre la matrice d'absorption demandee dans le document ;
3. proposer PR-C0 puis PR-C1, sans exposer de pipeline fictif comme `live` ;
4. repondre dans `SYNC_THREAD_MALEX_VINCENT.md`.

Tu peux challenger l'implementation. La decision engine/persona est tranchee.

---

## 2026-06-13 — open — Correction : check features Vincent + canon embarque Git

Correction MALEX : Vincent ne doit pas checker directement le Drive canon par defaut.

Le protocole correct est documente ici :

- `PROTOCOLE_VINCENT_FEATURE_OPPORTUNITY_CHECK.md`.

Regle :

1. Codex/MALEX embarque le canon utile dans Git ;
2. Vincent checke les specs/handoffs Git ;
3. Vincent checke surtout ses propres features/projets/PRs/workflows deja crees ;
4. Vincent mappe les opportunites vers owners, engines, contrats, tables, endpoints, permissions,
   gates, UI et tests ;
5. si une reference canon manque, Vincent le signale et Codex/MALEX l'importe dans Git.

Action demandee : avant chaque PR d'absorption ou de fondation, verifier aussi les features
Vincent existantes pour ne rien oublier et ne pas recoder une version appauvrie.

---

## 2026-06-13 — open — Precision multi-personas pedagogiques

Precision MALEX a integrer a PR-6 / Guided Runtime :

- cette logique est deja canonique dans MasterFlow, pas une feature nouvelle ;
- sources : `PERSONAL_PERSONA_ASSIGNMENT_AND_CHATBOT_CONTRACT`,
  `CONDITIONAL_SUB_PERSONA_RUNTIME_AND_CLASS_INSTANCE_CONTRACT`, `PERSONA_RUNTIME_SYSTEM`,
  `CONVERSATION_SURFACE_AND_SPEAKER_ROUTING_CONTRACT` ;
- l'utilisateur garde son persona principal ;
- une activite peut ajouter des personas contextuels : prof, sujet, methode, jury, expert ;
- MOTH sert surtout de check/friction/cadrage CDC quand il est assigne ;
- Incubator peut jouer le meme role pour Ours d'Or ;
- 1 a 3 personas contextuels maximum par defaut ;
- un orchestrateur choisit les voix utiles ;
- chaque message doit identifier sa voix si plusieurs personas sont actifs ;
- aucune assignation persona/bot/lore ne donne de droit.

Action demandee : prevoir les champs/contrats sans sur-implementer. Si PR-6 reste mono-guide,
garder une extension compatible `conversation_roster` / `contextual_persona_assignments`.

---

## 2026-06-13 — open — Decision persona utilisateur + pack PR-8 Jobs

Decision a prendre en compte :

- `DECISION_PERSONA_USER_ET_BOTS_CONTEXTUELS.md`.

MOTH n'est pas le persona par defaut de tous les utilisateurs. Chaque user peut avoir un persona
personnel ; MOTH et les autres bots sont des guides contextuels assignes a une activite, classe,
projet, event ou tunnel. Aucun persona/bot/lore ne donne de droits.

Pack suivant pour `jobs_shell` :

- `HANDOFF_VINCENT_PR8_JOBS_QUEUES_RUNNERS.md` ;
- `CHECKLIST_PR8_JOBS_QUEUES_RUNNERS.md` ;
- `RECETTE_PR8_JOBS_QUEUES_RUNNERS.md`.

Action demandee : challenger la separation persona/bot dans PR-6 si besoin, puis proposer une PR-8
courte pour jobs, events, progress, cancel/retry et gates.

---

## 2026-06-13 — open — Pack PR-7 RAG permissionne

Pack suivant pour `rag_capability_shell` :

- `HANDOFF_VINCENT_PR7_RAG_PERMISSIONNE.md` ;
- `CHECKLIST_PR7_RAG_PERMISSIONNE.md` ;
- `RECETTE_PR7_RAG_PERMISSIONNE_DETAILLEE.md`.

But : fournir un retrieval permissionne, cite, revoke-aware, sans index massif ni fuite de
metadata. Le RAG doit servir Resource Truth, pas le remplacer.

Action demandee : challenger les tables/routes/tests, puis proposer une PR courte. Si la queue
jobs n'est pas encore prete, garder le reindex borne et compatible avec PR-8.

---

## 2026-06-13 — open — Pack PR-6 Guided Runtime prive

Pack suivant pour la tranche `guided_runtime_pr1` :

- `HANDOFF_VINCENT_PR6_GUIDED_RUNTIME.md` ;
- `CHECKLIST_PR6_GUIDED_RUNTIME.md` ;
- `RECETTE_PR6_GUIDED_RUNTIME_DEPENDENCIES.md`.

But : livrer MOTH/CDC comme runtime prive et testable, pas comme bot public ou verticale complete.
Le runtime doit consommer ou preparer l'accrochage a project/scope et template/schema registry.

Action demandee : challenger le perimetre, puis proposer une PR courte avec migrations, routes,
contrats partages et tests. Tout public/export/email/event/devis/badge reste hors PR-6.

---

## 2026-06-13 — open — Pack PR-4/PR-5 Project Scope + Template Registry

Pack suivant pour apres capability/status :

- `HANDOFF_VINCENT_PR4_PR5_SCOPE_TEMPLATES.md` ;
- `CHECKLIST_PR4_PROJECT_SCOPE_OWNERSHIP.md` ;
- `CHECKLIST_PR5_TEMPLATE_SCHEMA_REGISTRY.md` ;
- `RECETTE_PROJECT_SCOPE_TEMPLATES.md`.

But : poser ownership/scope puis templates versionnes, afin que MOTH/CDC, Ours d'Or, devis,
event, DA/assets, correction et RAG ne recreent pas chacun leur permission/schema local.

Action demandee : challenger les tables/routes/tests, puis proposer deux PRs courtes separees.
PR-4 avant PR-5 est recommande, sauf contrainte backend explicite.

---

## 2026-06-13 — open — Pack PR-2/PR-3 Capability Registry + Status Taxonomy

Pack suivant pour apres `autonomy_step1_shell` :

- `HANDOFF_VINCENT_PR2_PR3_CAPABILITY_STATUS.md` ;
- `CHECKLIST_PR2_CAPABILITY_REGISTRY.md` ;
- `CHECKLIST_PR3_STATUS_TAXONOMY.md` ;
- `RECETTE_CAPABILITY_STATUS.md`.

But : rendre impossible une UI deceptive ou une feature marquee live sans preuve runtime.

Action demandee : challenger PR-2/PR-3, puis proposer deux PRs courtes separees.

---

## 2026-06-13 — open — Big chantier backend fondations

Pack operationnel a lire au reveil :

- `HANDOFF_VINCENT_BIG_CHANTIER_FONDATIONS_2026-06-13.md` ;
- `PROTOCOLE_REVUE_PRS_VINCENT.md` ;
- `CHECKLIST_PR1_AUTONOMY_STEP1.md`.

But : transformer les specs post-audit en PRs courtes, en commencant par
`autonomy_step1_shell`.

Action demandee : soit repondre avec le diff backend exact de PR-1, soit livrer une branche
courte PR-1 avec tests. Ne pas attaquer plusieurs fondations dans la meme PR.

---

## 2026-06-13 — open — Matrice features vs fondations

Nouveau document :

- `MATRICE_FEATURES_VS_FONDATIONS_MASTERFLOW.md`

Il relie les cas d'usage MasterFlow aux fondations techniques requises : autonomie, registry,
statuts, scopes, templates, RAG, jobs, observabilite, recettes et validation graduee.

Action demandee : utiliser cette matrice pour challenger l'ordre produit/backend. Signaler toute
dependance manquante ou verticale qui devrait remonter/descendre.

---

## 2026-06-13 — open — Pack specs fondations post-audit

MALEX/Codex a deroule les specs/recettes suivantes pour cadrer les prochaines PRs :

- `RECETTE_AUTONOMY_STEP1_SHELL.md` ;
- `SPEC_CAPABILITY_REGISTRY.md` ;
- `SPEC_STATUS_TAXONOMY.md` ;
- `SPEC_PROJECT_SCOPE_OWNERSHIP.md` ;
- `SPEC_TEMPLATE_SCHEMA_REGISTRY.md` ;
- `RECETTE_RAG_PERMISSIONNE.md` ;
- `SPEC_JOBS_QUEUES_RUNNERS.md` ;
- `SPEC_WORKFLOW_OBSERVABILITY.md` ;
- `PLAN_PRS_FONDATIONS_MASTERFLOW.md`.

Action demandee : challenger l'ordre, signaler les conflits backend, puis proposer les PRs
courtes correspondantes. Ne pas tout implementer d'un bloc.

---

## 2026-06-13 — open — Spec PR autonomy_step1_shell

La specification de la premiere couche d'autonomie encadree est disponible :

- `SPEC_AUTONOMY_STEP1_SHELL.md`

But : observer, preparer, proposer. Pas executer.

Perimetre propose :

- `autonomy_runs` ;
- `autonomy_findings` ;
- `improvement_candidates` ;
- `decision_queue` ;
- checks read-only sur sync, inbox, recettes, registry et coherence canon/Git ;
- endpoints admin+ ;
- audit ;
- tests.

Interdit en PR-1 : publication, export, email, deploy, tool externe puissant, modification Drive,
modification Git, execution sensible ou exposition de secrets.

Action demandee : challenger le diff backend exact et proposer une PR courte compatible avec
les gates MasterFlow.

---

## 2026-06-13 — open — Reprioriser : autonomie encadree avant connecteurs

MALEX corrige la projection post-audit : les connecteurs/plugins ne sont pas step 1.

Reference mise a jour :

- `MASTERFLOW_POST_AUDIT_FOUNDATION_UPGRADES.md`

Nouvelle priorite :

1. `autonomy_step1_shell` : observer, preparer, proposer ;
2. capability registry + statuts ;
3. project/scope/ownership ;
4. template registry ;
5. RAG permissionne ;
6. jobs/queues ;
7. observabilite workflow.

Le systeme autonome step 1 ne doit jamais publier, envoyer, deployer ou modifier une ressource
sensible seul. Il produit des findings, candidates et decisions a valider.

Action demandee : tenir compte de cette priorisation dans la sequence de PRs backend.

---

## 2026-06-12 — open — Fondations post-audit a integrer au plan backend

Nouveau document de cadrage :

- `MASTERFLOW_POST_AUDIT_FOUNDATION_UPGRADES.md`

Il formalise les multiplicateurs systeme a mettre en place apres l'audit complet :
Capability Registry, statuts normalises, project/scope/ownership, RAG permissionne,
jobs/queues/runners, template registry, tool gateway, observabilite workflow et recettes
d'acceptation.

Action demandee : utiliser ce document pour challenger l'ordre des prochaines PRs backend.
Ne pas tout coder d'un bloc. Repondre avec une sequence de PRs courtes et les dependances.

---

## 2026-06-12 — open — Recette UI post-PR-1 Guided Runtime

La recette UI minimale pour consommer la PR-1 Guided Runtime est disponible :

- `RECETTE_UI_PR1_GUIDED_RUNTIME.md`

Elle ne demande pas a Vincent de coder l'UI, mais elle precise les donnees que le backend doit
exposer proprement pour eviter une interface deceptive : progression, contradictions, session,
question courante, gates et etats.

Point cle : l'UI ne doit pas compenser un backend incomplet avec des objets fictifs.

---

## 2026-06-12 — open — Recette d'acceptation PR-1 Guided Runtime

La recette MALEX pour accepter/refuser la PR-1 MOTH/CDC est disponible :

- `RECETTE_PR1_GUIDED_RUNTIME.md`

Elle fixe les endpoints attendus, payloads de reference, scenarios A1-A12, tests minimum et
criteres de refus immediat.

Important : cette recette applique la validation graduee. Les operations privees/reversibles
passent par permission, scope et audit ; publication, public, export, email, event, devis et
asset restent hors PR-1 ou sous validation humaine.

Utilise cette recette comme banc d'essai avant de deposer ton commit. Si tu changes un nom de
route ou un champ, fournis une table d'equivalence et conserve les garanties.

---

## 2026-06-12 — open — Assouplir la validation systematique

MALEX valide le principe propose par Vincent : ne pas imposer une double validation humaine
systematique partout.

Nouvelle reference :

- `POLITIQUE_VALIDATION_GRADUEE.md`

Regle :

```text
permission_check toujours
preflight selon action
validation humaine selon risque / effet / scope
validation renforcee seulement pour critique
```

Impact PR-1 Guided Runtime :

- creer/modifier guide draft, session privee, contribution et progression interne : permission,
  scope et audit suffisent ;
- `complete` prive sans publication : preflight simple + audit ;
- publication, public, email, event, devis, asset, export et settings globaux : validation
  humaine conservee ;
- critique / irreversible / couteux / donnees personnelles en masse : validation renforcee.

Objectif : moins de friction, pas moins de securite. Ne pas confondre `validation_required=false`
avec absence de permission ou absence d'audit.

---

## 2026-06-12 — open — GO MALEX pour PR-1 Guided Runtime prive

MALEX confirme que MOTH/CDC est pertinent comme premiere verticale de preuve et donne son
**GO humain** pour la PR-1 `Capability Shell privee` de
`SPEC_BOT_STUDIO_GUIDED_RUNTIME.md`.

Arbitrages obligatoires :

1. `GUIDANCE_ENGINE` est confirme comme owner de la selection de question.
2. Un guide appartient d'abord a un `user`; `room_id` reste optionnel. Organisation reportee.
3. PR-1 accepte uniquement des comptes authentifies. Aucun invite, token public ou inscription.
4. Un teacher owner peut utiliser son guide `draft` en session privee. `validated/published`
   reste admin+ et n'est pas implemente dans PR-1.
5. Retention par defaut : session active 30 jours sans activite, puis expiration ; session
   terminee et contributions 90 jours, avec suppression explicite par owner/admin.
6. Aucun template CDC n'est declare canonique sans source verifiee. PR-1 utilise un template
   candidat versionne dans un seed dedie, clairement marque `candidate`.

Perimetre autorise :

- schemas partages ;
- migrations explicites pour guides, sessions, participants authentifies et contributions ;
- engine/service de progression deterministe ;
- routes privees de la section 5 ;
- permission owner/participant ;
- audit ;
- tests engine et permission.

Interdictions maintenues :

- aucun LLM requis ;
- aucun acces public ou invite ;
- aucun email, analytics nominatif, devis, event, asset ou publication ;
- aucune action `live` sans endpoint et tests reels ;
- aucun nouveau super-engine ;
- aucune UI finale dans cette PR.

Avant code, repondre avec le diff exact et signaler tout conflit avec le backend actuel. Ensuite,
implementer sur une branche courte et deposer tests + commit pour revue MALEX.

---

## 2026-06-12 — open — Relire l'audit exhaustif MasterFlow complet

Le premier audit portait sur les owners actifs. La couverture de tout le Drive est maintenant
documentee dans :

- `AUDIT_MASTERFLOW_COMPLET_CANON_VS_GITHUB_2026-06-12.md` ;
- `AUDIT_MASTERFLOW_CANON_INVENTORY.json`.

Le scan couvre 4 508 fichiers et normalise 41 familles produit hors factories. Conclusion
prudente : 0 famille complete, 11 avec une tranche executable partielle, couverture globale
estimee a 10-13 %.

Action demandee :

1. contredire les statuts avec chemin de code et test lorsqu'une implementation existe ailleurs ;
2. verifier les fondations proposees : projets/scopes, handlers reels, jobs, assets, sessions,
   Sentinel et capability registry ;
3. signaler les owners canoniques a fusionner ou renommer ;
4. proposer uniquement une sequence de PRs courtes.

**Revue uniquement.** Aucun code, migration, deploiement ou changement de perimetre sans GO
humain explicite de MALEX.

---

## 2026-06-12 — open — Relire l'audit profond canon vs GitHub

Rapport a lire :
`AUDIT_PROFOND_CANON_VS_GITHUB_2026-06-12.md`.

Le rapport conclut a 0/19 owner actif complet, 8/19 avec une tranche de code executable et une couverture
fonctionnelle ponderee estimee entre 15 et 20 %.

Action demandee :

1. contredire toute ligne dont le backend reel possede deja une implementation non reperee ;
2. confirmer les ecarts P0 : scopes/ownership/privacy, dispatcher reel, exposition publique ;
3. signaler les travaux deja en cours qui changent l'ordre recommande ;
4. proposer une sequence de PRs courtes pour fermer le core avant les verticales metier.

**Audit/revue uniquement.** Aucun changement de perimetre ni implementation implicite.

---

## 2026-06-12 — open — Auditer la PR-0 Bot Studio / Guided Runtime

MALEX valide la formalisation du Guided Runtime dans :
`SPEC_BOT_STUDIO_GUIDED_RUNTIME.md`.

Mission de ce tour :

1. relire la spec contre le backend reel et les owners canoniques ;
2. confirmer ou corriger le rattachement a `GUIDANCE_ENGINE` ;
3. repondre aux six questions de la section 11 ;
4. identifier tout schema, table ou contrat deja present dans tes projets ;
5. proposer le diff exact de PR-1 : shared, migrations, engines/services, routes et tests.

Le Guided Runtime doit rester une composition. Pas de `NEW_ENGINE` sans impossibilite demontree.

**Gate : audit et proposition uniquement.** Aucun code, migration, endpoint, action `live`,
acces public, email, devis, asset ou UI avant validation humaine MALEX separee.

---

## 2026-06-12 — open — Dimensionnement machine Local RAG BGE

Recommandation materielle pour faire tourner localement BGE-M3,
`bge-reranker-v2-m3` et Qdrant :

| Palier | CPU | Memoire | GPU | Stockage |
|---|---:|---:|---|---|
| PoC minimal | 8 coeurs | 32 Go | CPU seul | NVMe 500 Go+ |
| Equilibre recommande | 8-12 coeurs | 64 Go | RTX 4060 Ti 16 Go | NVMe 1-2 To |
| Confort | 12-16 coeurs | 64 Go | RTX 4070 Ti Super / 4080 16 Go | NVMe 2 To |
| Charge lourde | 16 coeurs+ | 128 Go | RTX 4090 24 Go | NVMe 2 To+ |

Apple Silicon M2/M3/M4 Pro ou Max avec 24-36 Go de memoire unifiee convient au
developpement. Pour un serveur Linux stable et reproductible, NVIDIA/CUDA reste preferable.

Choix de depart conseille pour MasterFlow :

```text
RTX 4060 Ti 16 Go + 64 Go RAM + NVMe 1 a 2 To
```

Eviter 8 Go de VRAM sauf PoC contraint : petits batchs et chargement sequentiel obligatoire.
Commencer avec des chunks de 512-1024 tokens, batch 4-8, retrieval de 20 candidats puis
reranking vers 6 resultats. Ne pas utiliser les 8192 tokens maximaux par defaut.

Ordres de grandeur Qdrant pour des vecteurs denses 1024 dimensions, hors payloads :

- 100 000 vecteurs : environ 0,6 Go RAM ;
- 1 million de vecteurs : environ 5,7 Go RAM.

Ces valeurs sont des estimations de capacite, pas un GO d'achat. Avant choix final, benchmarker
le corpus pilote, la latence p50/p95, le debit d'indexation et le pic VRAM/RAM.

Sources : model cards officielles BGE-M3 et reranker v2-m3, documentation Qdrant Capacity
Planning.

---

## 2026-06-12 — open — Revue des correctifs d'audit PR-1 token tracking

MALEX/Codex a audite le commit `1b08b38`. Rapport :
`AUDIT_PR1_TOKEN_TRACKING.md`.

Correctifs bornes disponibles sur la branche `codex/frontend-masterflow` :

- index composite `(user_id, ts)` rendu stable ;
- validation stricte de `from` / `to` ;
- compteurs provider invalides neutralises ;
- tests de tarification et de regression ajoutes.

Tests : backend 27/27, lint backend/frontend et build frontend OK.

Action demandee : relire et integrer ces correctifs avant de construire une surface frontend
de diagnostic. Les prix restent indicatifs et ne doivent pas alimenter billing ou marges.

---

## 2026-06-12 — open — Handoff prioritaire Local RAG BGE

MALEX dépose le dossier complet `MASTERFLOW_LOCAL_RAG_BGE_HANDOFF/`.

**À lire en premier et intégralement :**

`MASTERFLOW_LOCAL_RAG_BGE_HANDOFF/00_START_HERE_VINCENT.md`

Le pack propose un RAG local permissionné fondé sur BGE-M3, un reranker BGE et Qdrant,
sans remplacer SQLite, le canon lisible, Resource Truth, les permissions ni les validations
humaines.

Mission de ce tour :

1. auditer la compatibilité avec le backend réel et `CLAUDE.md` ;
2. cartographier les fichiers, types, variables, migrations, endpoints et tests concernés ;
3. comparer le contrat OpenAPI et le manifeste au registre d'actions réel ;
4. proposer le diff exact de la PR-1 `Capability Shell` ;
5. signaler toute contradiction ou dépendance risquée.

**Gate : audit et proposition uniquement.** Aucun service, index, téléchargement de modèle,
conteneur, endpoint, migration ou UI à implémenter avant validation humaine MALEX séparée.
Répondre dans Git selon le format demandé par `PROMPT_RELANCE_CLAUDE_CODE.md`.

---

## 2026-06-12 — open — Challenger la proposition packs et tarifs

MALEX dépose `PROPOSITION_PACKS_ET_TARIFS_ABONNEMENT.md`.

Demande : relire cette hypothèse commerciale à la lumière de tes audits et du futur suivi token,
puis répondre avec :

- coût mensuel réaliste par type d'usage ;
- marge et quotas soutenables ;
- risques techniques ou de sécurité ;
- distinction billing / pack / rôle / permission / feature flag ;
- recommandations de simplification ;
- éléments impossibles à promettre tant que le backend ne les expose pas.

**Audit uniquement.** Ne pas implémenter billing, quotas, endpoints, migrations, permissions ou
feature flags. Ne pas considérer les prix comme canoniques. Retour attendu dans Git pour décision
humaine MALEX.

---

## 2026-06-12 — answered — Auditer les workflows Vincent pour absorption MasterFlow

> **RÉPONSE Vincent (humaine), 2026-06-12 — pilote 3 projets livré.** Décision Vincent : faire d'abord
> un **pilote sur 3 projets** (`API_corrector`, `API_manage`, `vibe`) pour **calibrer le format** de la
> matrice, puis étendre aux ~17 autres sur GO. Livrable : **`AUDIT_ABSORPTION_PILOTE_3PROJETS.md`**
> (matrice sourcée par item, incompatibilités, améliorations, plan de PRs courtes). **Audit only, aucun
> code.** ⚠️ Le protocole d'entrée `PROTOCOLE_AUDIT_VINCENT_MASTERFLOW_A_LIRE_EN_PREMIER.md` est
> **introuvable en local** → compilé sur `CONTRACT_INDEX` + canon `05_BACKEND_REBUILD_SOURCE_TRUTH` +
> registre d'actions de `main` ; **à confirmer par MALEX** si un protocole canonique doit primer.
> Top absorptions valeur/risque : transport Tauri desktop↔remote (vibe), egress LLM gated
> (vibe+API_corrector), allowlist storage admin/privé (API_manage), garde-fous notation + `coherenceAudit`
> surfacé (prolonge couche 14). Incompat bloquantes : objets `classes/élèves` sans owner (retirés couche 13),
> CSP `default-src *` (vibe), tunnel QR brut, landing page-routing (anti-scope). **Retour pour validation
> humaine MALEX.** Détails dans `SYNC_THREAD_MALEX_VINCENT.md` (entrée 2026-06-12 pilote audit).

MALEX valide le lancement d'un **audit comparatif sans implementation**.

**Correction 2026-06-13 :** la demande ci-dessous est conservee comme historique, mais la lecture
directe du Drive canon par Vincent n'est plus la charge par defaut. Utiliser maintenant
`PROTOCOLE_VINCENT_FEATURE_OPPORTUNITY_CHECK.md` : Git embarque le canon utile, Vincent checke ses
propres features/projets/PRs/workflows et signale les besoins de canon manquant.

Contexte : tes projets contiennent deja beaucoup de workflows et de features potentiellement
utiles. Avant de poursuivre l'integration, ton systeme doit les comparer au MasterFlow canon pour
eviter doublons, incompatibilites, permissions contournees ou features tardivement recodees.

Action demandee :

1. Lire en premier les sources Git de coordination et d'absorption.
2. Utiliser les references canon deja embarquees dans Git ; demander un import canon si une
   source manque.
3. Inventorier les workflows reels de tes projets.
4. Mapper chaque workflow vers :
   owner MasterFlow, engine, contrats actifs, donnees/BDD, endpoints/toolcalls, permissions,
   preflight, validation humaine, audit, UI et tests.
5. Classer chaque item : `KEEP_AS_IS`, `ABSORB_AND_ADAPT`, `ADD_MISSING_CAPABILITY`,
   `IMPROVE_EXISTING_OWNER` ou `SKIP_OR_QUARANTINE`.
6. Retourner la matrice, les incompatibilites et un plan de PRs courtes dans Git.

**Interdit a ce stade :** coder, merger, migrer, deployer, ajouter un endpoint/engine ou modifier
permissions/perimetre. Le rapport doit revenir `answered` pour validation humaine MALEX.

Le but n'est pas de faire rentrer MasterFlow dans tes projets. Le but est d'utiliser MasterFlow
comme compilateur d'architecture pour absorber leur meilleure valeur sans casser son runtime.

---

## 2026-06-07 — done — IP directe joignable en ping, ports bruts time-out

> **RÉSOLU (Vincent, 2026-06-07).** Diagnostiqué côté host : `tcpdump` sur `tailscale0` = **0
> paquet** de l'IP MALEX (ses curls n'arrivaient pas), firewall **écarté** (`ts-input` accepte
> tout, `netcheck` host sain) → plan de données Tailscale KO entre le NAT FAI de MALEX et la box.
> **Décision humaine : bascule en Funnel PUBLIC** (`:8443` backend, `:10000` frontend) +
> durcissement secrets. Voir `SYNC_THREAD` « RÉSOLU pour de bon : bascule en Funnel PUBLIC ».

Push `070688e` reçu : on ne teste plus Tailscale Serve pour MALEX, mais l'IP tailnet directe.

Tests côté MALEX :

- `tailscale ping --timeout=10s 100.100.128.63`
  → `pong from profkrapu-ms-7971 (100.100.128.63) via 2.12.241.244:41641 in 22ms` ;
- `curl -sS --max-time 12 http://100.100.128.63:8000/health`
  → timeout ;
- `curl -I --max-time 12 http://100.100.128.63:5174/`
  → timeout ;
- `curl -i --max-time 12 http://100.100.128.63:5174/api/v1/personas`
  → timeout.

Conclusion : le chemin Tailscale est bien ouvert jusqu'à la machine, mais les ports bruts `8000`
et `5174` ne répondent pas depuis MALEX. Ce n'est plus DNS ni Serve ; il reste exposition des
services sur l'interface tailnet, firewall local, bind effectif, ou ACL de ports.

Action demandée à Vincent :

- vérifier que le backend écoute bien sur `0.0.0.0:8000` ou `100.100.128.63:8000` ;
- vérifier que Vite écoute bien sur `0.0.0.0:5174` ou `100.100.128.63:5174` ;
- vérifier firewall macOS / pf / éventuel filtre host ;
- tester depuis la machine host :
  - `curl http://100.100.128.63:8000/health` ;
  - `curl http://100.100.128.63:5174/` ;
  - `lsof -nP -iTCP:8000 -sTCP:LISTEN` ;
  - `lsof -nP -iTCP:5174 -sTCP:LISTEN`.

Punchline réseau :

> Le ping touche la hurtbox : `profkrapu-ms-7971` est bien dans le ring. Mais `8000` et `5174`
> ne prennent aucun hit. Là ce n'est plus le tunnel, c'est le bind ou le firewall qui campe.

---

## 2026-06-07 — done — Node-share vu, ports Serve toujours injoignables

> **RÉSOLU (Vincent, 2026-06-07).** Cause : Tailscale **Serve ne sert pas les nœuds partagés**
> (sharee). Tenté ensuite l'IP tailnet directe (échec aussi, cf. item ci-dessus) → bascule
> **Funnel PUBLIC**. ACL OK (MALEX dans le packet-filter), ce n'était ni l'ACL ni le DNS.

MALEX a bien récupéré le push `95faee7` annonçant le node-share réel de
`profkrapu-ms-7971` vers `malexcoulot@gmail.com` et la correction du chemin health en `/health`.

Tests relancés côté MALEX après reconnexion Tailscale macOS :

- VPN Tailscale : **Connected** ;
- DNS `profkrapu-ms-7971.tail8d8b1f.ts.net` : résout désormais vers `100.100.128.63`
  (plus vers les IP publiques) ;
- `curl -sS --max-time 12 https://profkrapu-ms-7971.tail8d8b1f.ts.net:8443/health`
  → timeout ;
- `curl -I --max-time 12 https://profkrapu-ms-7971.tail8d8b1f.ts.net:10000/`
  → timeout ;
- `curl -i --max-time 12 https://profkrapu-ms-7971.tail8d8b1f.ts.net:10000/api/v1/personas`
  → timeout.

Conclusion : le problème n'est plus le DNS public. Depuis MALEX, le node répond en DNS tailnet,
mais aucun des ports Serve annoncés ne répond.

Action demandée à Vincent :

- vérifier côté host `profkrapu-ms-7971` :
  - `tailscale status` ;
  - `tailscale serve status` ;
  - `curl http://localhost:8000/health` ;
  - `curl http://localhost:5174/` ;
- confirmer que les ACL autorisent `malexcoulot@gmail.com` à joindre les ports Serve `8443`
  et `10000` ;
- transmettre si besoin l'adresse Tailscale directe de la machine et/ou un test `tailscale ping`
  attendu depuis MALEX.

Punchline réseau :

> Le DNS a enfin choisi le bon stage (`100.100.128.63`), mais les ports sont encore en parry
> infini. Serve ou ACL garde la porte, pas le client MALEX.

---

## 2026-06-06 — answered — Feu vert backend pour test frontend couche 1

Demande : autoriser le lancement du backend pour tester uniquement l'intégration réelle :

- `POST /auth/login`
- `GET /context/current`

Contexte :

- branche : `codex/frontend-masterflow`
- frontend shell ajouté dans `apps/frontend`
- aucun backend modifié
- tests/lint/build OK

Commande backend attendue :

```bash
npm run dev
```

But du run : valider auth + context current avec le frontend MALEX minimal, pas lancer un run large.

### Réponse Vincent — 2026-06-06

**Feu vert accordé**, périmètre strict couche 1 : `POST /auth/login` + `GET /context/current`
uniquement (pas de run large, pas d'écriture canon). Le lancement effectif du backend
(`npm run dev`) est fait **par Vincent** (human in the loop) — il dira « clé tournée » dans le
fil de sync au moment du run. Détails + réponses aux 6 questions backend dans
`SYNC_THREAD_MALEX_VINCENT.md`.

> *Brouillon rédigé via Claude pour Vincent ; le lancement réel reste l'acte humain de Vincent.*

---

## 2026-06-13 — open — Revue CTX-1 a CTX-7 avant integration

MALEX a valide la preparation locale des fondations de contexte runtime. Rien n'est encore
commit/push au moment de cette entree.

Merci de relire en priorite :

- `CTX_RUNTIME_IMPLEMENTATION_HANDOFF_2026-06-13.md` ;
- les migrations `room_checkpoints`, `memory_cards` et les nouveaux champs RAG ;
- `RuntimeContextEnvelope`, `user_runtime_loadout` et les roles minimum du registre ;
- l'isolation private/project, y compris pour godmode ;
- l'injection WS bornee et le fallback `masterflow-system-001`.

Baseline locale annoncee : 231/231 tests, backend/frontend TypeScript verts, build frontend vert.
Le run reel reste a faire ensemble apres integration.
