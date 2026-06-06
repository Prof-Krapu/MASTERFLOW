# BACKEND INTEGRATION MAP — MasterFlow

Statut : pré-code / coordination MALEX-Vincent  
Branche : `codex/frontend-masterflow`  
Date : 2026-06-06

> **Mise à jour 2026-06-06 (décision Vincent, QCM).** La règle « cloisonnement strict
> propriétaire » d'Owner Ops (§5, §7, §9) est **levée au profit du godmode** : en rôle
> `godmode`, l'UI peut exécuter des actions ET `owner_ops_private_diagnostic` est exposé —
> **gated rôle `godmode` uniquement**, jamais teacher/student. Owner Ops n'est pas encore
> implémenté backend. Décisions complètes dans `SYNC_THREAD_MALEX_VINCENT.md`.

## 1. Règle de source

- GitHub est la source de vérité technique du code.
- Le Drive MasterFlow reste la source de vérité canon / specs longues / intentions produit.
- Ce document ne remplace pas `CLAUDE.md` ni `SUIVI.md` : il les transforme en carte d'intégration actionnable.

## 2. Modules existants

### Backend

- `apps/backend/src/index.ts` : boot Express + HTTP server + WebSocket.
- `db/schema.ts` : SQLite singleton, migrations idempotentes, types de rangées.
- `db/seed.ts` : seed idempotent `vincent / masterflow`, 3 personas, Home Room, ressources.
- `middleware/auth.ts` : JWT, rôles, révocation, `requireUser`, `requireRole`.
- `engines/action_registry.ts` : registre statique des actions depuis le seed.
- `engines/permission_runtime.ts` : permission MVP, rôles, rôle validateur.
- `engines/action_engine.ts` : cycle `draft -> preflight -> pending_validation -> approved -> executing -> completed`.
- `engines/persona_engine.ts` : personas, blends/chimères, porte-parole primaire.
- `engines/resource_truth.ts` : ressources validées/candidates.
- `services/llm.ts` : mock ou OpenAI-compatible SSE, proposition texte uniquement.
- `routers/*` : transport REST + validation Zod.
- `routers/ws/chat.ts` : WebSocket chat streaming.

### Frontend existant

- `packages/poc-frontend` : PoC React/Vite, pas frontend final.
- `packages/shared` : contrat typé Zod, source commune backend/frontend.

## 3. Tables existantes

- `users`
- `revoked_tokens`
- `rooms`
- `room_instances`
- `personas`
- `persona_blends`
- `actions`
- `audit_logs`
- `resources`
- `global_settings`
- `token_events`

## 4. Endpoints réellement branchés

Base REST : `/api/v1`

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

### Contexte / rooms

- `GET /context/current`
- routes `rooms` présentes dans le repo, à consommer après lecture fine du router.

### Personas / chimères

- `GET /personas`
- `GET /personas/:id`
- `POST /personas/:id/activate`
- `POST /personas/blend`
- `PUT /personas/blend/:id`
- `DELETE /personas/blend/:id`

### Actions

- `GET /actions/available`
- `GET /actions/pending` (`teacher+`)
- `POST /actions`
- `POST /actions/:id/preflight`
- `POST /actions/:id/validate` (`teacher+`)
- `POST /actions/:id/execute`
- `GET /actions/:id`

### Ressources

- `GET /resources?q=&include_all=1`
- `POST /resources`
- `POST /resources/:id/validate` (`teacher+`)

### WebSocket

- `ws://localhost:8000/ws/{room_instance_id}?token=<JWT>`
- Messages : `chat_start`, `chat_chunk`, `chat_end`, `error`, `pong`, plus messages futurs typés dans `packages/shared`.

## 5. Gates et permissions actuelles

- Toute route sensible REST exige `requireUser`.
- `requireRole('teacher')` protège la validation d'actions et de ressources.
- `permission_runtime` est volontairement permissif au MVP : un user authentifié peut créer une action sensible, mais le preflight la met en validation.
- `executeAction` refuse toute action dont `status !== 'approved'`.
- `resource_truth.searchResources` ne renvoie que `status = 'validated'` par défaut.
- `include_all=1` sur ressources est réservé `admin/godmode`.
- Les chimères ne fusionnent pas les permissions.

## 6. Seed actions : réel vs futur

### Supporté maintenant

- `get_current_context` -> `GET /context/current`
- `list_available_actions` -> `GET /actions/available`
- `execute_action` -> cycle action générique, exécution mockée

### Partiellement supporté / mapping à clarifier

- `preflight_action` : le backend expose `POST /actions/:id/preflight`, alors que le seed annonce `POST /actions/preflight`.
- `approve_validation_item` : le backend expose `POST /actions/:id/validate`, alors que le seed annonce `POST /validation/{item_id}/approve`.

### Futur / endpoints absents au MVP

- `compile_da_context` -> `/da/compile-context`
- `preflight_image_action` -> `/assets/image/preflight`
- `create_render_manifest` -> `/assets/render-manifests`
- `scan_inventory_photo` -> `/inventory/photo-scan`
- `compile_subject_fullstack` -> `/subjects/{subject_id}/compile-fullstack`

Règle UI : ces actions peuvent être affichées comme capacités futures/verrouillées, mais ne doivent pas être présentées comme fonctionnelles.

Hors scope V1 : les factories et backflows de bots extraits ne sont pas un objectif backend/frontend de cette version.

## 7. Modèles/tables manquants pour les engines prioritaires

À ne pas créer sans mapping contrat + accord Vincent/Malex.

- `user_runtime_loadout` / shortcuts / modes autorisés.
- `validation_inbox_items` distincts des actions, si Vincent veut une inbox unifiée.
- `jobs` / `job_events` / queues background.
- `generated_assets` / `asset_manifests` / `asset_sources` / `asset_validation_status`.
- `visual_reference_boards` / `asset_source_refs` / `reference_status`.
- `inventory_items` / `inventory_collections` / `collection_matches`.
- `subjects` / `student_profiles` / `submission_records` / `correction_runs`.
- `owner_ops_diagnostics` avec cloisonnement strict propriétaire.
- `feature_flags` ou `runtime_capabilities`.

## 8. Jobs/background queues

État actuel : aucun système de jobs réel.

À prévoir plus tard :

- action execution async ;
- render manifest / Comfy local ;
- OCR inventory ;
- subject compilation ;
- correction runs ;
- audit/export jobs.

Toutes ces queues exigent preflight, statut, owner, logs, rollback/failure state.

## 9. Surfaces UI consommables maintenant

À construire en premier côté frontend MALEX :

- Login.
- Home Room shell.
- Context card.
- Persona selector.
- Blend/chimère panel.
- Chat streaming.
- Contextual action bar depuis `GET /actions/available`.
- Action preflight/validation/execute minimal.
- Validation inbox actions pending.
- Resource truth strip/search.
- Debug drawer `godmode` uniquement, sans Owner Ops privé.

À ne pas construire encore :

- multi-room complet ;
- Comfy/image generation ;
- OCR ;
- correction pipeline ;
- dashboard SaaS permanent ;
- Owner Ops diagnostics ;
- vraie queue background ;
- routing page-par-page classique.

## 10. Risques

- Le seed annonce des endpoints non implémentés : risque de faux UI si non marqué.
- `permission_runtime` MVP est permissif : ne pas surinterpréter comme modèle final.
- Exécution d'action mockée : ne pas brancher d'effet réel derrière sans nouvelle PR dédiée.
- Pas de `.env` prod : `JWT_SECRET` fallback dev uniquement.
- `npm install` signale 5 vulnérabilités dont 1 critique : audit sécurité à planifier sans `npm audit fix --force` automatique.
- Backend non lancé sans accord Vincent.
- Drive énorme : ne jamais scanner tout le canon au runtime UI.

## 11. Questions à remonter si on touche backend

1. Le seed doit-il être aligné sur les endpoints existants ou inversement ?
2. Faut-il créer une vraie `validation_inbox` séparée des actions ?
3. Quelle forme officielle pour `user_runtime_loadout` ?
4. Quels endpoints backend Vincent veut-il livrer avant le frontend final ?
5. Quelle frontière exacte entre `godmode` visible et `owner_ops_private_diagnostic` invisible ?
6. Les actions futures doivent-elles être masquées, disabled, ou visibles en mode debug seulement ?

## 12. Plan de PRs courtes recommandé

1. PR frontend shell : créer app frontend, routing minimal local, login, auth state.
2. PR context room : Home Room + `GET /context/current`.
3. PR personas/blend : selector + panel chimère + respect du porte-parole primaire.
4. PR chat : WebSocket streaming + états de connexion.
5. PR actions : action bar réelle + cycle create/preflight/validate/execute mocké.
6. PR resources : resource truth strip + candidates + validation teacher/godmode.
7. PR UI polish : responsive, densité, debug drawer, placeholders propres.
8. PR backend delta seulement si bloqué : endpoint ou table manquante, avec mapping complet.

## 13. Baseline vérifiée

- `npm install` : OK.
- `npm test` : OK, 13/13.
- `npm run lint` : OK.
- Backend non lancé.
- Branche propre avant création de ce document.
