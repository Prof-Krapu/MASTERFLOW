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

Avant toute reprise de travail, toute réponse de coordination ou toute modification qui touche backend, frontend, run local, permissions, endpoints, actions ou périmètre, vérifier systématiquement :

0. `git fetch origin`, puis vérifier les derniers commits de `origin/main` et des branches de
   sync avant de répondre à MALEX. Si Vincent vient de pousser une correction, lire les versions
   distantes (`git show origin/main:<fichier>`) avant toute conclusion.
1. `SUIVI.md`
2. `SYNC_THREAD_MALEX_VINCENT.md`
3. `INBOX_VINCENT.md`
4. `INBOX_MALEX.md` si présent

Règle : une inbox non lue = contexte incomplet. Vincent peut déposer ses demandes dans
`INBOX_MALEX.md`, mais elles restent au statut `open` et ne valent jamais autorisation. Une
réponse IA n'est jamais une validation humaine. Codex/Claude peut analyser l'impact et proposer
un patch minimal, mais aucune modification, exécution, permission, dépense, publication,
déploiement ou changement de périmètre demandé par Vincent ne doit être appliqué sans validation
humaine explicite de MALEX.

Avant toute réponse finale à MALEX sur un sujet Vincent/backend/Tailscale, refaire un dernier
check distant rapide (`git fetch origin` + lecture du dernier `origin/main`) pour éviter de
répondre avec un état devenu caduc pendant le tour.

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
| `db/seed.ts` | `seedAll()` idempotent : godmode `vincent`, 3 personas (`masterflex-001`/`profkrapu-001`/`corrector-001`), room Home, ressources. |
| `lib/{env,uuid,audit}.ts` | config env, uuid, `audit()` (trace immuable). |
| `services/llm.ts` | `streamChat`/`chat` — mock ou OpenAI-compat SSE. **Ne fait que proposer du texte.** |
| `engines/*` | **Autorité métier.** `action_registry`, `permission_runtime`, `action_engine`, `persona_engine`, `resource_truth`. |
| `routers/*` | Transport HTTP : valident les bodies (Zod partagé) et délèguent aux engines. Exportent `createXxxRouter()`. |
| `routers/ws/chat.ts` | `attachChatWs(server)` — auth à l'upgrade (token en query), streaming `chat_start→chat_chunk→chat_end`. |
| `middleware/auth.ts` | `signToken`/`verifyToken`/`requireUser`/`requireRole(min)`, type `AuthUser`. |
| `seeds/*.json` | **Source de vérité** du registre d'actions (`action_id`, `endpoint`, `risk_level`, `validation_required`, `ui_surface`, `status`). `status` ∈ `live`/`future`/`out_of_scope` : dit à l'UI quoi afficher comme fonctionnel, verrouillé ou masqué. |

Montage (`index.ts`) : `auth`/`context`/`rooms`/`resources` sous leur sous-chemin ; `personas` et `actions` **auto-préfixés** (montés à la racine `/api/v1`).

## Invariants non négociables — et OÙ ils sont appliqués

1. **Aucune action sensible sans validation humaine.** `action_engine.executeAction` lève si `status !== 'approved'` → router renvoie **423**. Une proposition IA n'est jamais une validation.
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

**Décisions de périmètre actées (sync MALEX/Vincent ; Q6 confirmée humainement par Vincent le 2026-06-07)** : `user_runtime_loadout`, validation inbox dédiée et endpoints lourds (`/da`, `/assets`, `/inventory`, `/subjects`) = **hors V1** ; backflow/factories = `out_of_scope` ; **godmode étendu** — en rôle `godmode` l'UI peut exécuter des actions et `owner_ops_private_diagnostic` est exposé (quand le backend l'implémentera), **gated rôle `godmode` uniquement** (jamais teacher/student) ; lève le cloisonnement strict Owner Ops de la 1re carte ; l'UI ne présente rien comme fonctionnel avant contrat + endpoint réels. *(Une correction « Owner Ops strict » avait été poussée le 2026-06-07 puis annulée à la demande de Vincent au profit de godmode étendu.)* Détail daté dans `SUIVI.md` et `SYNC_THREAD_MALEX_VINCENT.md`.
