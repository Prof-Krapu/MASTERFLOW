# CLAUDE.md

Guide pour Claude Code travaillant dans **ce dépôt de code** (`~/Documents/masterflow/`).

Doctrine active depuis 2026-06-27 : la source de vérité **opérable** est désormais ce repo Git
publiable. Une idée issue du Drive, d'un ancien canon, d'une archive legacy, d'une Factory ou d'une
conversation ne devient maîtrisée que lorsqu'elle est représentée dans Git : code, test, seed,
contrat, matrice, queue, reçu de blocage ou reçu de rejet.

Le Drive MASTERFLOW historique reste une source produit lente et une archive candidate :
`/Users/malex/Library/CloudStorage/GoogleDrive-oursdoriscomlille@gmail.com/Mon Drive/MASTERFLOW`.

Voir `docs/source-truth/GIT_OPERABLE_SOURCE_OF_TRUTH_AND_EXTERNAL_PRIMITIVE_HARVEST_AUDIT_2026-06-27.md`.
Ici, on écrit le **code GitHub** et on documente le périmètre V1 consommable.

## Nature & frontière de travail

MasterFlow = OS pédagogique à personas IA fusionnables (« chimères »), client **MALEX**.
- **Backend = nous** (livrable principal).
- **Frontend = MALEX**, dans `apps/frontend` (workspace npm). Ne pas le construire à leur place ; on garantit le contrat qu'il consomme (`packages/shared`). *(Le PoC `packages/poc-frontend` a été retiré : le frontend revient en priorité à MALEX — cf. SUIVI.)*
- Langue de travail : **français** (JSDoc et termes métier en français : *room*, *persona*, *blend/chimère*, *preflight*, *validation inbox*, *canon*).
- **Pas obligé de suivre les .md à la lettre** : si une spec est infaisable/incohérente, être agile et le signaler — mais ne jamais violer les invariants ci-dessous.
- Drive/legacy/factories != périmètre V1 : les sources longues décrivent ou expérimentent MasterFlow complet. Le repo implémente par couches courtes ; toute couche future doit rester `future`/`out_of_scope` tant que contrat + endpoint + permission gate ne sont pas réels.

## Sync MALEX / Vincent / Codex

Source de vérité du rituel : `PROTOCOLE_SYNC_GIT_INBOX.md`. Il est obligatoire, pas decoratif.

Avant toute reprise de travail, toute réponse de coordination ou toute modification qui touche backend, frontend, run local, permissions, endpoints, actions ou périmètre, vérifier systématiquement :

0. `git fetch --all --prune`, puis vérifier les derniers commits de `origin/main` et des branches de
   sync avant de répondre à MALEX. Si Vincent vient de pousser une correction, lire les versions
   distantes (`git show origin/main:<fichier>`) avant toute conclusion.
0bis. Si `gh` est installé et connecté, vérifier aussi GitHub avec `gh auth status`,
   `gh repo view Prof-Krapu/MASTERFLOW` et le SHA de `main`. Si `gh` n'est pas connecté, le dire
   explicitement au lieu de prétendre que le check GitHub est fait.
0. `AGENT_TASKS.md` — board des tâches en cours entre agents
1. `CLAUDE_LOG.md` — journal chronologique des actions Claude/Codex
2. `SUIVI.md`
3. `SYNC_THREAD_MALEX_VINCENT.md`
4. `INBOX_VINCENT.md`
5. `INBOX_MALEX.md` si présent

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

### Check externe avant specs structurantes

Avant de formaliser, prioriser ou spécifier une idée produit/conceptuelle dans le Git, vérifier si
le Drive historique, legacy ou les Factories contiennent déjà une version utile du sujet. Cela vaut
notamment pour personas, MasterStory, pédagogie, bots, RAG, jobs, DA/assets, Ours d'Or, devis,
correction, cours et UI.

Procédure minimale :

1. chercher d'abord dans Git : code, docs, seeds, tâches, matrices et reçus ;
2. si Git ne couvre pas clairement le sujet, rechercher dans les sources externes avec `rg` sur les termes métier et synonymes ;
3. lire les fichiers sources trouvés, pas seulement leurs noms ;
4. citer les références externes dans la spec/handoff Git comme sources candidates ;
5. distinguer clairement `déjà représenté dans Git`, `candidat externe`, `runtime_gap`, `blocked` ou `rejected` ;
6. créer ou mettre à jour une ligne dans `docs/source-truth/EXTERNAL_PRIMITIVE_HARVEST_REGISTRY_2026-06-27.md`.

Règle : pas de spec Git hors-sol. Si une idée existe déjà hors Git, le livrable Git doit soit
en extraire une primitive utile, soit la bloquer, soit la rejeter, soit la mettre en queue. Aucune
source externe ne vaut vérité parallèle sans représentation Git.

Règle spéciale Factories : une Factory est un bot/extraction autonome. Ne jamais l'importer telle
quelle dans MasterFlow. Auditer uniquement les primitives, patterns, verrous, formats et retours
d'usage utiles.

Avant toute création ou modification de Factory, appliquer
`docs/factories/FACTORY_REQUEST_ROUTING_PROTOCOL_2026-06-27.md` : router d'abord la demande
entre extraction préalable, audit de l'existant, nouvelle spec, patch Factory, récolte de primitive
MasterFlow, queue runtime ou blocage.

Pour Vincent, ne pas transférer la charge brute du Drive canon par défaut. Si une référence canon
est nécessaire côté backend, l'embarquer dans Git sous forme de spec/handoff/checklist. Vincent
doit surtout comparer ces sources Git avec ses propres features/projets/PRs pour repérer les
opportunités d'implémentation, les doublons et les écarts. Voir
`PROTOCOLE_VINCENT_FEATURE_OPPORTUNITY_CHECK.md`.

**Délégation Big Pickle / OpenCode.** Canal unique obligatoire :
`.opencode/INBOX.md`. Codex y dépose au plus une tâche simple, bornée, consommatrice de lecture
ou de répétition et facile à vérifier. Big Pickle ne cherche aucune tâche ailleurs, ne crée aucun
fichier de communication et répond dans cette même inbox. Sans statut `ready_for_big_pickle`,
il reste en pause. Sa réponse `done_unverified` n'est jamais une validation. Les décisions produit,
le canon, l'architecture, les permissions, les secrets, les providers, les migrations, les seeds,
les schémas, les contrats partagés, le Git distant et le live restent pilotés par Codex et MALEX.

### Reprise anti-coupure crédits

Les sessions Codex peuvent s'interrompre par manque de crédits. Toute vague structurante doit donc
laisser un point de reprise lisible dans `SUIVI.md` avant de devenir longue ou risquée.

Rituel de reprise obligatoire :

1. `git fetch --all --prune` ;
2. lire `CLAUDE.md`, `SUIVI.md`, `.opencode/INBOX.md`, `INBOX_MALEX.md`, `INBOX_VINCENT.md` et
   `SYNC_THREAD_MALEX_VINCENT.md` ;
3. vérifier `HEAD == origin/main` ou expliciter le delta ;
4. reprendre d'abord la vague active/inachevée indiquée dans `SUIVI.md` ;
5. ne jamais déclarer une publication sans preuve GitHub.

Format attendu en tête de `SUIVI.md` :

```txt
VAGUE ACTIVE:
- id:
- objectif:
- statut:
- dernière action terminée:
- prochaine action:
- fichiers/domaines concernés:
- tests à relancer:
- publication:
- blocage:
```

Si aucune vague n'est active, le bloc doit le dire explicitement et pointer la prochaine vague
recommandée.

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

Multi-room avance, ComfyUI/rendu image, factories, OCR/vision reel, embeddings BGE/Qdrant reels,
dashboard SaaS permanent, routing page-par-page, auto-correction sans enseignant et UI Inventory
finale. Les fondations Inventory et le pont OCR-candidate sont actifs ; les runners lourds et
l'interface finale restent des phases ulterieures.

## État

MVP backend **livré et validé** (`tsc` 0 erreur, vitest **4.1.8** 13/13, **`npm audit` 0 vulnérabilité**, streaming WS + invariants prouvés en run réel). Frontend MALEX (`apps/frontend`) : shell couche 1 (login + `GET /context/current`), avance par couches. PoC retiré. Registre d'actions : champ `status` (`live`/`future`/`out_of_scope`) + `endpoint` alignés sur le réel.

**Décisions de périmètre actées.** Les endpoints lourds (`/da`, `/assets`, `/subjects`) restent
hors V1 et backflow/factories restent `out_of_scope`. Inventory dispose maintenant d'une
fondation backend V1 permissionnee ; cela n'active ni OCR/vision reel, ni BGE/Qdrant, ni UI finale. Le
`user_runtime_loadout`, initialement reporte, est désormais une fondation runtime minimale :
il filtre actions, personas, modes et capacités verrouillées depuis les permissions et la Room.
**Godmode étendu** reste valable pour les capacités explicitement autorisées, mais ne traverse
jamais un scope utilisateur/projet privé par simple rang global. L'UI ne présente rien comme
fonctionnel avant contrat + endpoint réels. Détail daté dans `SUIVI.md`.
