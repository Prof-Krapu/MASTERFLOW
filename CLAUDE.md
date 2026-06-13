# CLAUDE.md

Guide pour Claude Code travaillant dans **ce dépôt de code** (`~/Documents/masterflow/`).
Le **canon produit** vit dans le Drive MASTERFLOW :
`/Users/malex/Library/CloudStorage/GoogleDrive-oursdoriscomlille@gmail.com/Mon Drive/MASTERFLOW`.
Ici, on écrit le **code GitHub** et on documente le périmètre V1 consommable.

## Nature & frontière de travail

MasterFlow = OS pédagogique à personas IA fusionnables (« chimères »), client **MALEX**.
- **Backend = nous** (livrable principal).
- **Frontend = MALEX**, dans `apps/frontend` (workspace npm). Ne pas le construire à leur place ; on garantit le contrat qu'il consomme (`packages/shared`). *(Le PoC `packages/poc-frontend` a été retiré : le frontend revient en priorité à MALEX — cf. SUIVI.)*
- Langue de travail : **français** (JSDoc et termes métier en français : *room*, *persona*, *blend/chimère*, *preflight*, *validation inbox*, *canon*).
- **Pas obligé de suivre les .md à la lettre** : si une spec est infaisable/incohérente, être agile et le signaler — mais ne jamais violer les invariants ci-dessous.
- Drive canon != périmètre V1 : les specs longues décrivent MasterFlow complet. Le repo implémente par couches courtes ; toute couche future doit rester `future`/`out_of_scope` tant que contrat + endpoint + permission gate ne sont pas réels.

## Sync MALEX / Vincent / Codex

Source de vérité du rituel : `PROTOCOLE_SYNC_GIT_INBOX.md`. Il est obligatoire, pas decoratif.

Avant toute reprise de travail, toute réponse de coordination ou toute modification qui touche backend, frontend, run local, permissions, endpoints, actions ou périmètre, vérifier systématiquement :

0. `git fetch --all --prune`, puis vérifier les derniers commits de `origin/main` et des branches de
   sync avant de répondre à MALEX. Si Vincent vient de pousser une correction, lire les versions
   distantes (`git show origin/main:<fichier>`) avant toute conclusion.
0bis. Si `gh` est installé et connecté, vérifier aussi GitHub avec `gh auth status`,
   `gh repo view Prof-Krapu/MASTERFLOW` et le SHA de `main`. Si `gh` n'est pas connecté, le dire
   explicitement au lieu de prétendre que le check GitHub est fait.
1. `SUIVI.md`
2. `SYNC_THREAD_MALEX_VINCENT.md`
3. `INBOX_VINCENT.md`
4. `INBOX_MALEX.md` si présent

Chaque réponse de coordination doit inclure mentalement ou explicitement un `SYNC_PROOF` :
branche locale, `HEAD`, `origin/main`, `github_main` si disponible, delta `HEAD...origin/main`,
fichiers lus et conclusion.
Si le delta n'est pas `0 0`, ne jamais conclure depuis les fichiers locaux seuls.

Règle : une inbox non lue = contexte incomplet. Vincent peut déposer ses demandes dans
`INBOX_MALEX.md`, mais elles restent au statut `open` et ne valent jamais autorisation. Une
réponse IA n'est jamais une validation humaine. Codex/Claude peut analyser l'impact et proposer
un patch minimal, mais aucune modification, exécution, permission, dépense, publication,
déploiement ou changement de périmètre demandé par Vincent ne doit être appliqué sans validation
humaine explicite de MALEX.

Règle de transmission : un message écrit dans `INBOX_VINCENT.md`, `INBOX_MALEX.md`, `SUIVI.md` ou
`SYNC_THREAD_MALEX_VINCENT.md` n'existe pour l'autre côté qu'après commit + push sur la branche
qu'il lit. Si Vincent ne voit pas un message, diagnostiquer d'abord : branche lue, SHA GitHub,
SHA `origin/main`, fichier distant lu, puis statut du worktree local.

Avant toute réponse finale à MALEX sur un sujet Vincent/backend/Tailscale, refaire un dernier
check distant rapide (`git fetch --all --prune` + lecture du dernier `origin/main`) pour éviter de
répondre avec un état devenu caduc pendant le tour. Si un agent dit ne pas voir un message, il
doit d'abord citer le commit exact qu'il lit.

### Check canon obligatoire avant specs

Avant de formaliser, prioriser ou spécifier une idée produit/conceptuelle dans le Git, vérifier
systématiquement si le Drive canon a déjà traité le sujet. Cela vaut notamment pour personas,
MasterStory, pédagogie, bots, RAG, jobs, DA/assets, Ours d'Or, devis, correction, cours et UI.

Procédure minimale :

1. rechercher dans le Drive canon avec `rg` sur les termes métier et synonymes ;
2. lire les fichiers sources trouvés, pas seulement leurs noms ;
3. citer les références canon dans la spec/handoff Git ;
4. distinguer clairement `déjà canonique`, `partiellement implémenté`, `absent du backend` ;
5. ne créer une spec nouvelle que si elle complète ou clarifie le canon, jamais comme doublon.

Règle : pas de spec Git hors-sol. Si une idée existe déjà dans le canon, le livrable Git doit
l'absorber, la relier aux contrats backend et signaler les écarts d'implémentation.

Pour Vincent, ne pas transférer la charge brute du Drive canon par défaut. Si une référence canon
est nécessaire côté backend, l'embarquer dans Git sous forme de spec/handoff/checklist. Vincent
doit surtout comparer ces sources Git avec ses propres features/projets/PRs pour repérer les
opportunités d'implémentation, les doublons et les écarts. Voir
`PROTOCOLE_VINCENT_FEATURE_OPPORTUNITY_CHECK.md`.

**Délégation à des agents assistants (tokens épuisés).** Quand Claude Code n'a plus de tokens pour
des tâches de code **basiques**, il peut déposer des tâches bornées dans `INBOX_ASSISTANT.md`
(protocole complet : `assistant.md`). Des LLM tiers (via opencode : `ollama/mistral-agent`,
`zai-coding-plan/glm-4.6v`…) les traitent sur une branche `assistant/*`, lancent `npm test` +
`npm run lint`, et répondent **signés**. Leur réponse `done` **n'est jamais une validation** :
Claude/Vincent relisent et mergent la branche. Ne **jamais** déléguer ce qui touche `engines/*`,
`middleware/auth.ts`, `seeds/*.json`, permissions/rôles, secrets, contrat `packages/shared` ou
périmètre — ces tâches restent `blocked` et reviennent à Claude/Vincent.

## Stack & commandes

TypeScript ESM (exécuté par **tsx**, pas de build backend). Express 4 + better-sqlite3 + `ws` + JWT (`jsonwebtoken`/`bcryptjs`) + Zod. Frontend MALEX (`apps/frontend`) : React 19 + Vite 6.

```bash
npm install
npm run dev            # backend → http://localhost:8000  (seed: vincent / masterflow, role godmode)
npm run dev:frontend   # frontend MALEX → http://localhost:5174
npm test               # vitest (apps/backend) — 13 tests
npm run lint           # tsc --noEmit (backend)
npm run seed           # re-seed idempotent
```

API : `/api/v1` · WS : `ws://localhost:8000/ws/{room_instance_id}?token=<JWT>`.
LLM en mode `mock` par défaut (aucune clé). Provider réel via `apps/backend/.env` (`LLM_PROVIDER`/`LLM_API_KEY`/`LLM_BASE_URL`/`LLM_MODEL`).

## Carte du code (`apps/backend/src/`)

| Fichier | Responsabilité (1 fichier = 1 responsabilité) |
|---|---|
| `db/schema.ts` | SQLite singleton (WAL+FK), migrations idempotentes, types de rangées. `MASTERFLOW_DB_PATH` override (`:memory:` en test). |
| `db/seed.ts` | `seedAll()` idempotent : godmode `vincent`, 2 personas actifs (`masterflex-001`/`profkrapu-001`), `corrector-001` déprécié en lecture historique, room Home, ressources. |
| `lib/{env,uuid,audit}.ts` | config env, uuid, `audit()` (trace immuable). |
| `services/llm.ts` | `streamChat`/`chat` — mock ou OpenAI-compat SSE. **Ne fait que proposer du texte.** |
| `engines/*` | **Autorité métier.** `action_registry`, `permission_runtime`, `action_engine`, `persona_engine`, `resource_truth`. |
| `routers/*` | Transport HTTP : valident les bodies (Zod partagé) et délèguent aux engines. Exportent `createXxxRouter()`. |
| `routers/ws/chat.ts` | `attachChatWs(server)` — auth à l'upgrade (token en query), streaming `chat_start→chat_chunk→chat_end`. |
| `middleware/auth.ts` | `signToken`/`verifyToken`/`requireUser`/`requireRole(min)`, type `AuthUser`. |
| `seeds/*.json` | **Source de vérité** du registre d'actions (`action_id`, `endpoint`, `risk_level`, `validation_required`, `ui_surface`, `status`). `status` ∈ `live`/`future`/`out_of_scope` : dit à l'UI quoi afficher comme fonctionnel, verrouillé ou masqué. |

Montage (`index.ts`) : `auth`/`context`/`rooms`/`resources` sous leur sous-chemin ; `personas` et `actions` **auto-préfixés** (montés à la racine `/api/v1`).

## Invariants non négociables — et OÙ ils sont appliqués

1. **Aucune action sensible sans validation humaine, mais pas de double validation systematique.** Les actions bas risque peuvent passer avec permission, preflight eventuel et audit. Les actions sensibles exigent validation humaine ; les actions critiques peuvent exiger validation renforcee. Voir `POLITIQUE_VALIDATION_GRADUEE.md`.
2. **Anti-hallucination (tolérance 0).** `resource_truth.searchResources` ne rend que `status='validated'` par défaut ; toute proposition entre en `candidate`.
3. **1 porte-parole sémantique.** `persona_engine` : `blend.speaker_persona_id === primary.id` ; le secondaire ne prête que sa méthode, attribuée (« méthode inspirée de … »). Les permissions ne se blendent jamais.
4. `PERMISSION > CONTEXT_LOCK > SAFETY > OBJECT_TYPE > MATURITY > PREFERENCE` (`permission_runtime` + `middleware/auth`).
5. **L'IA n'écrit jamais le canon (Drive) directement** ; tout passe par des flux validés et tracés (`audit_logs`).

Cycle d'action : `draft → preflight → pending_validation → approved → executing → completed` (ou `rejected`/`failed`). `risk_level` **statique** depuis le seed (jamais inféré d'une préférence).

## Conventions (à respecter à la lettre)

- ESM (`"type":"module"`), imports backend avec **extension `.ts` explicite**.
- TS `strict` + **`noUncheckedIndexedAccess`** : garder les gardes sur `req.params.id`, accès tableau, optionnels.
- 2 espaces, single quotes, points-virgules, JSDoc **en français**.
- BDD : PK en **UUID**, timestamps **INTEGER (epoch ms)**, champs flexibles en TEXT JSON suffixés `_json`.
- Tests : niveau **engine** (pas de serveur HTTP), `vitest.config.ts` fixe `MASTERFLOW_DB_PATH=':memory:'` ; `beforeAll` appelle `seedAll()`.
- Réutiliser avant de coder neuf ; pas de moteur générique, pas de sur-ingénierie.

## Anti-scope (NE PAS construire dans le MVP)

Multi-room, pipeline de correction, ComfyUI/rendu image, factories, OCR, dashboard SaaS permanent, routing page-par-page, auto-correction sans enseignant. Ce sont les phases 2+ des specs.

## État

MVP backend **livré et validé** (`tsc` 0 erreur, vitest **4.1.8** 13/13, **`npm audit` 0 vulnérabilité**, streaming WS + invariants prouvés en run réel). Frontend MALEX (`apps/frontend`) : shell couche 1 (login + `GET /context/current`), avance par couches. PoC retiré. Registre d'actions : champ `status` (`live`/`future`/`out_of_scope`) + `endpoint` alignés sur le réel.

**Décisions de périmètre actées.** Les endpoints lourds (`/da`, `/assets`, `/inventory`,
`/subjects`) restent hors V1 et backflow/factories restent `out_of_scope`. Le
`user_runtime_loadout`, initialement reporte, est désormais une fondation runtime minimale :
il filtre actions, personas, modes et capacités verrouillées depuis les permissions et la Room.
**Godmode étendu** reste valable pour les capacités explicitement autorisées, mais ne traverse
jamais un scope utilisateur/projet privé par simple rang global. L'UI ne présente rien comme
fonctionnel avant contrat + endpoint réels. Détail daté dans `SUIVI.md`.
