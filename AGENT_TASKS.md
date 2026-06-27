# AGENT_TASKS — MasterFlow

Board unique pour Codex, Claude Code, Claude/Vincent, assistants.
Chacun lit les tâches `target:` qui le concernent, exécute, et reporte dans l'entrée.

## Règles

- `target:` = un ou plusieurs agents (`codex` | `claude-code` | `claude-vincent` | `assistant` | `all`)
- `status:` = `open` → `claimed` → `done` | `blocked` | `superseded` → `verified`
- `frozen_by:` = SHA du commit où la décision a été figée
- Chaque agent **ajoute** sa ligne signée sous `### updates` (ne réécrit pas l'entête)
- Une tâche `verified` peut être archivée en bas du fichier
- `alert:` dans un update = signale un problème qui mérite décision avant la suite

---

## TASK-303 — Storage fichier réel D07/D08
target: codex
status: verified
frozen_by: MALEX « toutes » 2026-06-27

### scope
- Upload privé multipart et base64 vers `storage://`.
- Persistance couplée fichier + ligne `generated_assets`, avec nettoyage en cas d'échec BDD.
- Scan Inventory écrit et vérifie l'image réelle au lieu de produire des items mockés.
- Lecture metadata owner-only ; aucun téléchargement public, provider, export ou canon automatique.

### verification
- `npm test` = 97 fichiers, 534/534 tests.
- `npm run lint` = OK.
- `git diff --check` = OK.
- Reçu : `docs/d08/D07_D08_FILE_STORAGE_LOCAL_RECEIPT_2026-06-27.md`.

### updates
> 2026-06-27 codex → verified. PR #147 mergée sur GitHub `main`, SHA `6d8023a`. Snapshot canon Drive à rafraîchir avec cette preuve.

---

## TASK-302 — Codex hardening pré-merge absorption Big Pickle
target: codex
status: verified
frozen_by: MALEX GO 2026-06-27

### scope
- Audit lecture seule des changements Big Pickle.
- Acceptation explicite MALEX : les vrais étudiants du seed peuvent être poussés.
- Patch de sécurité avant merge : owner/project guards, teacher gates, action registry prudent.

### files touchés
- DA runtime : `src/services/da_runtime.ts`, `src/routers/da_runtime.ts`, `tests/da_runtime.test.ts`
- Narrative runtime : `src/services/narrative_runtime.ts`, `src/services/story_characters.ts`, `src/services/story_workbenches.ts`, `src/routers/narrative_runtime.ts`, `tests/narrative_runtime.test.ts`
- Mirrors : `src/services/learning_mirror_engine.ts`, `src/services/style_mirror_engine.ts`, routers + tests
- Competencies/gamification : services, routers, tests
- Action registry : `src/seeds/action_registry_seed.v1.json`
- Suivi : `CLAUDE_LOG.md`, `SUIVI.md`

### verification
- `npm test` = 96 fichiers, 529/529 tests
- `npm run lint` = OK

### updates
> 2026-06-27 codex → verified. Les briques Big Pickle restent absorbées, mais les capacités sensibles ne sont plus exposées comme faux-live sans validation.

---

## TASK-001 — Infrastructure : AGENT_TASKS + CLAUDE_LOG
target: claude-code
status: verified
frozen_by: MALEX décision orale 2026-06-26

### steps
1. Créer AGENT_TASKS.md (ce fichier)
2. Créer CLAUDE_LOG.md
3. Poser la structure avant toute absorption

### updates
> 2026-06-26 claude-code → done. Fichiers créés, structure prête.

---

## TASK-002 — Seed pedagogical_error_patterns
target: claude-code
status: verified
frozen_by: audit absorption 2026-06-27

### steps
1. Lire _ERRORS_DATASET.json — source introuvable (ni Drive ni legacy)
2. 15 patterns déjà seedés dans pedagogical_error_patterns_seed.json (seed-err-001 à 015)
3. Table déjà créée dans schema.ts, INSERT OR IGNORE dans seed.ts
4. Pas de source Drive à ajouter

### verification
- npm run lint = 0
- npm test = 485/485
- SELECT count(*) FROM pedagogical_error_patterns = 15

### updates
> 2026-06-27 claude-code → done. Source _ERRORS_DATASET.json introuvable ; 15 patterns déjà présents dans le seed. Aucune action nécessaire.

---

## TASK-301 — Synthèse narrative + DA bridge (Build 1A/1B + Phase 2/3) — JUIN 2026
target: claude-code
status: verified
frozen_by: SYNTHESE_NARRATIVE_DA_JUIN2026

### scope
- **Build 1A** : bridge engine `story_da_bridge.ts`, characters CRUD (`story_characters.ts`), visual gen endpoint avec executor, reader spoiler filtering, 19 tests
- **Build 1B** : canon lock, action registry alignment (0 future, 2 out_of_scope, 35 actions live), `layer_data_json` enrichi (12 layers), Batrasia seed (8 arcs, 8 chars) enrichi lore complet
- **Phase 2** : ProfKrapu/MasterFlex config enrichie, owner registry (8 entrées)
- **Phase 3** : Ours d'Or factory seedée (6 arcs, 6 chars), fix flaky test rooms_auth
- **Seed DA** : gates (14), layers (12), actions (35), owners (8) en seeds/*.json
- **Routes CRUD complètes** : deleteNode/deleteEvent, reorderNodes, get/update/delete workbench, get/approve/reject manifest, filter manifests by workbench/node
- **Scènes seed** : 15 scènes Batrasia + 9 scènes Ours d'Or sous les arcs

### files créés/modifiés
- `src/engines/story_da_bridge.ts` — compile_da_context, intent resolver (10 archetypes), post-gen gates (5)
- `src/engines/executors.ts` — generate_scene_visual, create_render_manifest
- `src/services/story_characters.ts` — CRUD avec canon lock
- `src/services/narrative_runtime.ts` — nodes/events + deleteNode/deleteEvent/reorderNodes
- `src/services/story_workbenches.ts` — CRUD + canon lock + getStoryWorkbench
- `src/services/visual_manifests.ts` — CRUD + approveVisualManifest/rejectVisualManifest
- `src/routers/narrative_runtime.ts` — 9 routes narratives
- `src/routers/story_workbenches.ts` — 8 routes workbench
- `src/routers/visual_manifests.ts` — 7 routes manifest
- `src/db/seed.ts` — seed complet (personas, 3 workbenches, 24 scènes, registry seeds)
- `src/seeds/*.json` — da_gate (14), da_layer (12), action_registry (35+), owner_registry (8)
- `tests/narrative_runtime.test.ts` — 40 tests
- `tests/action_lifecycle.test.ts` — 15 tests
- `tests/runtime_loadout.test.ts` — 3 tests

### verification
- npm run lint = 0
- npm test = 485/485 (92 fichiers)
- npm run seed = idempotent (INSERT OR IGNORE)

### notes
- Registres DA en `src/seeds/` (pas `seeds/absorption/`) : gate_data_json, layer_data_json lus dynamiquement
- NARRATIVE_RUNTIME_API dans shared à mettre à jour avec les nouvelles routes
- approve/reject manifest non connecté à validation_inbox (flux direct)
- TASK-004 superseded par cette implémentation (registres DA déjà seedés)

### updates
> 2026-06-27 claude-code → done

---

## TASK-003 — Seed 227 étudiants complémentaires
target: claude-code
status: verified
frozen_by: audit absorption 2026-06-27

### steps
1. Comparer STUDENT_FAST_INDEX.json (227) avec le seed P1 existant (333)
2. Dédoublonnage par slug → 227/227 déjà présents dans le seed existant
3. Les 106 étudiants surnuméraires du seed sont des cohorts supérieures (3-5) non couvertes par le Fast Index
4. Aucun nouvel étudiant à ajouter

### verification
- npm run lint = 0
- npm test = 485/485
- Fast Index 227 slugs × existing seed 333 slugs → intersection = 227, delta Fast = 0

### updates
> 2026-06-27 claude-code → done. Fast Index entièrement contenu dans le seed existant. Aucun ajout nécessaire.

---

## TASK-004 — Seed registres DA (gates, layers, roles, payload)
target: claude-code
status: superseded
frozen_by: audit absorption 2026-06-27

### steps
SUPERSEDED par Build 1B : tables da_gate_registry + da_layer_registry créées dans schema.ts, seeds/*.json (14 gates, 12 layers) lus dynamiquement par seed.ts depuis la legacy archive. VISUAL_REFERENCE_ROLE_REGISTRY et IMAGE_GENERATION_PAYLOAD_SCHEMA existent dans la legacy archive mais non utilisés (périmètre DA/assets futur).

### updates
> 2026-06-27 claude-code → superseded. Déjà implémenté dans Build 1B.

---

## TASK-005 — Seed RAG allowlist
target: claude-code
status: verified
frozen_by: audit absorption 2026-06-27

### steps
1. Lire RAG_ALLOWLIST.json (legacy archive, KERNEL_RC/registries/) — 5 release_resources
2. Table rag_allowlist déjà créée dans schema.ts (INSERT OR IGNORE)
3. Seeds/rag_allowlist_seed.json déjà présent avec les mêmes 5 entrées (correspondance 5/5)
4. La source contient aussi des meta (policies, excluded_by_default, refusal_conditions) — stockées dans les 5 entrées existantes

### verification
- npm run lint = 0
- npm test = 485/485
- 5 resources identiques source vs seed (kernel_authority_contract, personal_canon_pipeline, kernel_capability_cards, kernel_schemas, release_manifest)

### updates
> 2026-06-27 claude-code → done. Les 5 ressources RAG ALLOWLIST sont déjà dans le seed. Aucune modification nécessaire.

---

## TASK-006 — Seed opportunity + owner registries
target: claude-code
status: verified
frozen_by: audit absorption 2026-06-27

### steps
1. Lire opportunity_registry_initial.json (Drive canon, 06_REGISTRIES/) — 19 opportunities
2. Lire owner_registry_initial.json (Drive canon, 06_REGISTRIES/) — 7 owners système
3. Tables déjà créées dans schema.ts (opportunity_registry, owner_registry)
4. Créer opportunity_registry_seed.json (19 items transformés du Drive)
5. Mettre à jour owner_registry_seed.json (8 existants + 7 Drive = 15 total)
6. INSERT OR IGNORE déjà dans seed.ts

### verification
- npm run lint = 0
- npm test = 485/485
- opportunity_registry = 19 entrées
- owner_registry = 15 entrées (8 originaux + 7 système)

### updates
> 2026-06-27 claude-code → done. Opportunity registry seedée (19 items). Owner registry enrichie (8→15).

---

## TASK-007 — Seed pedagogical routing + subject library
target: claude-code
status: verified
frozen_by: audit absorption 2026-06-27

### steps
1. Lire ROUTING_PEDAGO_LEGACY.json (19614 lignes) — 49 vidéos avec notions/chapitres
2. Structurer : chaque vidéo = 1 row avec colonnes clés (video_id, title, duration, software, topics, url, data_json)
3. Créer table pedagogical_video_resources dans schema.ts
4. Créer pedagogical_video_resources_seed.json (49 items)
5. Importer dans seed.ts (INSERT OR IGNORE dans registryTx)

### constraints
- Garder la structure exacte des données source (chapitres/notions dans data_json)
- Pas de routes ni services (seulement le seed)

### verification
- npm run lint = 0
- npm test = 485/485
- pedagogical_video_resources = 49 entrées (1 par vidéo)

### updates
> 2026-06-27 claude-code → done. 49 vidéos seedées dans pedagogical_video_resources.
