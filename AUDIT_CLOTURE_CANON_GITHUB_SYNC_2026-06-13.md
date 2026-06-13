# Audit de cloture — canon Drive, GitHub a jour et sync MALEX/Vincent

Date : 2026-06-13  
Branche audit : `codex/frontend-masterflow`  
SHA branche : `875a7908e17359b31b14f57ddcde27efdada2b25`  
`origin/main` : `141ab6864ac5bbe5fe4c8b846c0702a55d2d1e1b`

## Objet

Clore le malentendu de sync : Vincent avait bien pousse et integre beaucoup de backend sur
`main`. La confusion venait d'une lecture du delta recent au lieu d'une synthese complete de
l'historique GitHub et des inbox.

Ce document recale :

- ce que GitHub contient vraiment;
- ce que la branche MALEX/Codex ajoute au-dessus de `main`;
- ce que le canon Drive exige encore;
- ce que Vincent doit relire avant de poursuivre.

## Sources relues

GitHub :

- `SUIVI.md`
- `INBOX_MALEX.md`
- `INBOX_VINCENT.md`
- `SYNC_THREAD_MALEX_VINCENT.md`
- `CLAUDE.md`
- `apps/backend/src/index.ts`
- `apps/backend/src/db/schema.ts`
- `packages/shared/src/index.ts`
- routeurs, services, tests et registry de `origin/main`
- commit `875a790` sur `codex/frontend-masterflow`

Canon Drive, via audits deja embarques dans Git :

- `AUDIT_DEPLOIEMENT_CONTEXTE_ROOMS_LOADOUT_MEMORY_2026-06-13.md`
- `AUDIT_RAG_TRANSVERSAL_CANON_INVENTORY_ROOMS_MASTERSTORY_2026-06-13.md`
- `AUDIT_POST_PUSH_CANON_GAPS_2026-06-13.md`

Contrats Drive cites par ces audits :

- `SESSION_BOOTSTRAP_CONTEXT_PACK_AND_USER_LOADOUT_CONTRACT`
- `PROGRESSIVE_CONTEXT_LOADING_AND_ANTI_HALLUCINATION_POLICY`
- `ROOM_STATE_OVERLAY_AND_CHECKPOINT_CONTRACT`
- `USEFUL_CONTEXT_COMPILATION_AND_PERSISTENCE_CONTRACT`
- `MEMORY_CARD_COMPRESSION_AND_CONTEXT_PAYLOAD_STORAGE_CONTRACT`
- `REFERENCE_INVENTORY_OCR_COLLECTION_GRAPH_CONTRACT`
- `MASTERSTORY_APP_RUNTIME`
- `INVENTORY_APP_RUNTIME`
- `MULTI_APP_CONTEXT_ROUTING`
- `PERSONA_PERMISSION_FIREWALL_AND_ROLE_SCOPE_CONTRACT`

## Correction du diagnostic precedent

Erreur de lecture a corriger :

```txt
pas de nouveau delta apres fetch
!=
Vincent n'a rien pousse ou rien implante
```

`origin/main` contient deja une grosse tranche backend. Notre branche `codex/frontend-masterflow`
etait alignee avec `origin/main` avant le commit CTX, donc le delta paraissait vide. Il fallait
relire l'historique et les fichiers, pas seulement le delta.

## Ce que Vincent / GitHub a deja implante

### Auth, admin et comptes

- inscription sur invitation uniquement;
- table et engine `invitations`;
- routes admin `GET /admin/users`, `GET|POST /admin/invitations`, revoke;
- action sensible `set_user_role`;
- validation `godmode` pour changement de role;
- garde-fous : pas d'auto-changement, pas de retrogradation du dernier godmode;
- frontend PoC admin : users, invitations, roles, monitoring.

### Settings et action engine

- `set_global_setting` comme action sensible;
- `validator_role` dans le registre;
- dispatcher `ACTION_EXECUTORS`;
- allowlist stricte des settings modifiables;
- echec d'execution audite.

### Diagnostics et couts

- suivi token reel/fallback;
- `GET /diagnostics/token-usage` gated admin/godmode;
- couts par modele/tache/user/jour;
- seeds demo usage;
- dataviz PoC via Recharts.

### Project / Scope / multi-utilisateur

- tables `projects`, `project_members`, `ownership_edges`, `resource_scopes`;
- routes projets et membres;
- partage de ressources par projet;
- `GET /projects/:id/resources`;
- `POST /projects/:id/resources`;
- bug gate-ordering corrige : les routeurs `admin` et `diagnostics` ne bloquent plus les routeurs
  racine pour les comptes non-admin.

### Template, Guided Runtime et RAG

- `schema_templates` et routes associees;
- `conversation_guides`, `guided_sessions`, participants et contributions;
- RAG permissionne : ressources, chunks, context packs, query events, citations, revoke/stale;
- route de coordination `POST /rag/coordination/sync`;
- point de raccord `rag_reindex`.

### Jobs, runners et observabilite

- jobs OCR, correction, export, RAG;
- claim/lease;
- heartbeats runners;
- gates par famille de runner;
- lifecycle runner : needs_review, completed, failed;
- `workflow_events`;
- diagnostics workflow admin/godmode;
- raccord `recordWorkflowEvent` sur transitions jobs.

### Correction / OCR / calibration / feedback / export

- Corrector deprecie non destructivement;
- contrats et stockage pour pedagogical evidence, signals, teacher deltas;
- routing LLM par tache et egress gated;
- objets correction : rubriques, profils institutionnels, batches, submissions, manifests;
- jobs OCR et morphologie separes par permissions;
- pre-correction explicable;
- calibration de cohorte et controle qualite;
- feedback student-safe;
- preview export et handoff export_prepare.

### Securite et exploitation

- Vite 8 / esbuild corrige / audit npm a 0 vulnerabilite;
- historique Tailscale/Funnel documente;
- `/health` public a la racine;
- secrets tournes hors Git.

## Ce que MALEX/Codex vient d'ajouter au-dessus

Commit : `875a790 Add runtime context foundations and sync hardening`

Apports :

- `RuntimeContextEnvelope` et `CompileRuntimeContextRequest`;
- `context_compiler` T1/T2, borne, cite, trace;
- `user_runtime_loadout` minimal : actions, personas, modes, locked capabilities;
- role minimum par action dans le registry;
- `room_checkpoints`;
- `memory_cards` candidates/active/stale, refs only, private par defaut;
- RAG enrichi avec `purpose`, `room_instance_id`, `context_tier`, `retrieval_strategy`;
- injection WebSocket bornee par contexte runtime;
- frontend : carte contexte, resume checkpoint, loadout effectif, locked capabilities;
- protocole sync renforce par `gh` et distinction explicite local/non pousse.

Validation du commit :

- backend tests : 231/231;
- backend TypeScript : OK;
- frontend TypeScript : OK;
- build frontend : OK, warning chunk Vite historique;
- `git diff --check` : OK.

## Couverture canon actuelle

| Domaine canon | Etat GitHub apres `875a790` | Reste |
|---|---|---|
| auth / roles / invitations | executable | durcir auth_version si PR-HARD non absorbee par Vincent |
| actions / preflight / validation graduee | executable | verifier scopes owner/project sur toutes actions sensibles |
| Project / Scope | executable | teamspaces, bridges explicites inter-projets |
| Resource Truth | partiel executable | inventaire reel, ownership fin, candidats OCR |
| Template registry | executable prive/admin | versions immuables a verifier pour tous consommateurs |
| Guided Runtime | executable prive | lien public, event/devis/badge hors scope |
| Jobs / runners | executable interne | brancher vrais runners sans SQL direct |
| RAG | executable lexical + coordination | BGE/Qdrant, sensitivity, quarantined, budgets, injection prompt |
| contexte runtime / loadout | fondation ajoutee | merge/revue Vincent, context tiers avances, bridges |
| memory cards | fondation ajoutee | UX validation, retention, promotion vers L3/L4 |
| Inventory / OCR collections | manquant comme app complete | tables inventory, candidat -> validation -> index RAG |
| MasterStory | manquant comme app complete | artifact registry, spoiler policy, narrative RAG |
| UI finale | PoC/surfaces partielles | refonte ergonomique apres stabilisation runtime |

## Points a traiter avant UI finale

1. Revue Vincent de `875a790`, en particulier collisions avec son backend existant.
2. Decider si les PR-HARD locales doivent etre mergees telles quelles ou remappees sur les
   correctifs deja presents.
3. Stabiliser le contrat `context_compiler` avant BGE/Qdrant.
4. Brancher BGE/Qdrant uniquement comme runner derive, pas comme autorite.
5. Fermer les gaps Inventory et MasterStory par specs courtes avant UI.
6. Prevoir run reel sur stack publique quand Vincent confirme le backend pret.

## Message a Vincent

Vincent doit lire :

1. ce document;
2. `CTX_RUNTIME_IMPLEMENTATION_HANDOFF_2026-06-13.md`;
3. `AUDIT_POST_PUSH_CANON_GAPS_2026-06-13.md`;
4. `AUDIT_DEPLOIEMENT_CONTEXTE_ROOMS_LOADOUT_MEMORY_2026-06-13.md`;
5. `AUDIT_RAG_TRANSVERSAL_CANON_INVENTORY_ROOMS_MASTERSTORY_2026-06-13.md`.

Demande :

- confirmer ce qui est deja couvert par ses commits;
- signaler les collisions;
- proposer une integration courte de `875a790`;
- ne pas reconstruire le contexte, le RAG, les jobs ou les permissions en parallele.

## Verdict

GitHub est beaucoup plus avance que l'ancien audit brut du Drive ne le laissait entendre. En
revanche, le canon complet reste loin d'etre termine : Inventory, MasterStory, teamspaces,
bridges inter-projets avances, autonomie encadree complete, DA/assets et UI finale restent des
chantiers separes.

La prochaine etape raisonnable n'est pas de commencer l'UI finale. C'est de faire relire et
absorber `875a790`, puis de choisir un seul chantier court : `context merge`, `Inventory Core`,
ou `BGE/Qdrant runner`.
