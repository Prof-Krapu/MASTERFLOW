# CTX Runtime Implementation Handoff - 2026-06-13

Statut : local, non committe, non pousse.

## But

Transformer le contexte MasterFlow en objet runtime permissionne, progressif et tracable sans
charger tout le canon, toute la memoire ou des catalogues globaux.

## Couches

1. **CTX-1 - Context compiler**
   - `RuntimeContextEnvelope`, tiers T0-T5, cap runtime T2.
   - Budget 24 references / 4 000 caracteres de references.
   - Audit sans contenu sensible.

2. **CTX-2 - User runtime loadout**
   - Actions live filtrees par role, Room et registre.
   - Personas et modes explicitement autorises.
   - Capacites futures visibles comme locked seulement en admin autorise.
   - `minimum_role` porte par le registre d'actions.

3. **CTX-3 - Room checkpoints**
   - Table `room_checkpoints`, private par defaut.
   - Resume, decisions, open loops, refs et prochaine action.
   - Retention des 20 derniers checkpoints par instance.
   - Auto-save uniquement sur changement de mode.

4. **CTX-4 - RAG runtime**
   - Packs lies a un purpose, une Room instance, un tier et une strategie.
   - Retrieval lexical declare comme fallback.
   - Pack RAG classe derived ; faits BDD/registres classes authoritative.
   - Mismatch Room/projet refuse sans fuite.

5. **CTX-5 - WebSocket**
   - Persona speaker choisi uniquement dans le loadout.
   - Nouveau fallback sobre `masterflow-system-001`.
   - Prompt systeme borne a 8 000 caracteres.
   - Citations et incertitudes explicites.
   - Aucun tool call ou pouvoir implicite.

6. **CTX-6 - Memory cards**
   - Table `memory_cards`.
   - Creation L2 candidate seulement ; validation humaine vers L3 active.
   - Owner, source, scope, privacy, confidence et invalidation obligatoires.
   - Pas de sauvegarde automatique du chat brut.
   - Le compilateur charge uniquement des references de cartes actives.

7. **CTX-7 - Frontend**
   - Bootstrap depuis `GET /context/current`, sans `/personas` et `/actions/available` globaux.
   - Context card compacte : purpose, tier, sources, actions, reprise et incertitude.
   - Modes, actions, personas et locked capabilities issus du loadout.

## Endpoints ajoutes ou etendus

- `POST /api/v1/context/compile`
- `GET /api/v1/rooms/:id/checkpoint/latest`
- `POST /api/v1/rooms/:id/checkpoints`
- `POST /api/v1/memory/cards`
- `GET /api/v1/memory/cards/:id`
- `POST /api/v1/memory/cards/:id/validate`
- `POST /api/v1/memory/cards/:id/invalidate`
- `GET /api/v1/context/current` enrichi de `runtime_context` et `user_runtime_loadout`
- `/api/v1/rag/query` enrichi de `purpose`, `room_instance_id`, `context_tier`

## Invariants a relire

- Godmode n'ouvre pas une Room, une instance ou une carte user privee sans scope.
- Une action ou un persona absent du loadout n'existe pas pour le runtime.
- Une ressource candidate n'entre pas dans le contexte.
- Un pack RAG ne devient jamais une verite authoritative.
- Une carte memoire candidate ne devient jamais active sans validation humaine.
- Le LLM propose du texte ; le backend conserve permissions, preflight et execution.

## Recette locale

- Backend Vitest : 51 fichiers, 231/231 tests.
- Backend TypeScript : OK.
- Frontend TypeScript : OK.
- Frontend Vite build : OK.
- `git diff --check` : OK.

## Run reel attendu

1. Migrer/booter une copie de la base.
2. Verifier `GET /context/current` sur student, teacher, admin et godmode.
3. Verifier un checkpoint manuel puis un changement de mode.
4. Verifier RAG owner, projet et mismatch Room/projet.
5. Verifier WS : fallback systeme, persona assigne, citations et refus sans source.
6. Creer une carte L2, la valider L3, verifier son apparition par reference puis l'invalider.
7. Verifier la context card frontend sur desktop et mobile.
