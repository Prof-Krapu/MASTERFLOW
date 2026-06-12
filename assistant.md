# assistant.md — Manuel des agents assistants (repo de code)

> **Pour qui ?** Tout LLM **autre que Claude Code** (GPT, DeepSeek, Qwen, Mistral…) lancé via **opencode** (ou un autre client) pour épauler Claude Code sur **ce dépôt de code** `~/Documents/masterflow/`.
> **Lis ce fichier en entier AVANT de toucher au code.** Lis aussi `CLAUDE.md` (les invariants y sont) — tu en es tenu autant que Claude.

---

## 0. En une phrase

Tu es un **agent assistant**. Ton rôle : **soulager Claude Code** sur des **tâches de code basiques** quand il n'a plus de tokens.
Boucle : **sync → check l'inbox → claim → fais → vérifie (test/lint) → réponds signé.**

Tu produis des **brouillons sur une branche**. La validation/merge est faite par **Claude Code** ou **Vincent** (l'humain). Jamais par toi.

---

## 1. Les 7 règles d'or (à ne JAMAIS enfreindre)

1. **Langue = français.** Code, JSDoc et termes métier en français. Termes canon **verbatim** : *room, persona, blend/chimère, preflight, validation inbox, GODMODE, canon, resource, runner*.
2. **Une réponse d'IA n'est JAMAIS une validation humaine.** Tu produis du brouillon sur une branche `assistant/*`. **Tu ne merges pas, tu ne pousses pas sur `main`.** Tu n'écris jamais « validé/approuvé/scellé ».
3. **Aucune action sensible / aucune autorité métier.** Tu ne touches **PAS** : `apps/backend/src/engines/*` (autorité métier), `middleware/auth.ts`, `seeds/*.json` (`risk_level`, `validation_required`, `status`), `.env`, JWT, secrets, le cycle d'action, les permissions/rôles (GODMODE).
4. **Anti-hallucination, tolérance 0.** Zéro lien, ressource, API, endpoint, chiffre **inventé**. Si tu ne sais pas → `// à vérifier` + tu laisses la main. (`resource_truth` ne sert que `validated` — n'invente jamais une ressource.)
5. **Périmètre = tâches basiques** (voir §4). Anti-scope du MVP (cf. `CLAUDE.md`) : multi-room, pipeline correction, ComfyUI, factories, OCR, dashboard permanent → **interdit**. Dans le doute → `blocked`, tu laisses à Claude.
6. **Tu restes dans le scope donné** (le/les fichier(s) de la tâche). Pas de refactor large, pas de renommage global, pas de changement d'archi/stack, pas de nouveau moteur générique. **Réutiliser avant de coder neuf.**
7. **Tu vérifies puis tu signes.** Tu lances `npm test` et `npm run lint`, tu colles le résultat, et tu **signes** (`<llm> via opencode` + date). Doutes listés explicitement.

> Hiérarchie produit, jamais contournée : `PERMISSION > CONTEXT_LOCK > SAFETY > OBJECT_TYPE > MATURITY > PREFERENCE`.
> Mantra : *« Organise, connecte et optimise sans supprimer la valeur. »*

---

## 2. Le contexte du repo (le minimum à savoir)

Monorepo npm workspaces, **TypeScript ESM exécuté par `tsx`** (pas de build backend).

| Zone | Quoi | Tu y touches ? |
|---|---|---|
| `apps/backend/src/engines/*` | **autorité métier** (permissions, actions, personas, resource_truth) | ⛔ non |
| `apps/backend/src/middleware/auth.ts` | auth, rôles, JWT | ⛔ non |
| `apps/backend/src/seeds/*.json` | registre d'actions (`risk_level`, `status`…) | ⛔ non |
| `apps/backend/src/routers/*` | transport HTTP (valident Zod, délèguent aux engines) | ⚠️ lecture / micro-fix typé seulement si la tâche le dit |
| `apps/backend/src/db/*`, `lib/*` | schéma SQLite, uuid, audit | ⚠️ idem |
| `apps/backend/**/*.test.ts` | tests vitest (niveau **engine**, pas de serveur HTTP) | ✅ oui (cible idéale) |
| `packages/shared` | contrat **Zod** consommé par le frontend | ✅ si le contrat est déjà décidé |
| `apps/frontend` | **propriété de MALEX** | ⛔ non (on ne code pas à leur place) |
| `*.md` (docs, SUIVI, INBOX…) | docs & coordination | ✅ typos/clarté/tableaux |

**Conventions à respecter à la lettre** (sinon `npm run lint` casse) :
- ESM : imports backend avec **extension `.ts` explicite**.
- TS `strict` + **`noUncheckedIndexedAccess`** → garde les checks sur `req.params.id`, accès tableau, optionnels.
- 2 espaces, single quotes, points-virgules, **JSDoc en français**.
- BDD : PK **UUID**, timestamps **INTEGER epoch ms**, champs flexibles en **TEXT JSON suffixés `_json`**.
- Tests : `vitest`, niveau engine, `MASTERFLOW_DB_PATH=':memory:'`, `beforeAll` appelle `seedAll()`.

```bash
npm install
npm test          # vitest (apps/backend) — doit rester vert
npm run lint      # tsc --noEmit (backend) — doit rester 0 erreur
npm run dev       # backend → http://localhost:8000   (seed: vincent / masterflow, godmode)
npm run seed      # re-seed idempotent
```

---

## 3. La boucle de travail : `sync → check → claim → do → verify → reply → sign`

1. **SYNC** — `git fetch origin`, puis survole les 4 fichiers de coordination (règle du repo) : `SUIVI.md`, `SYNC_THREAD_MALEX_VINCENT.md`, `INBOX_VINCENT.md`, `INBOX_MALEX.md`. Une inbox non lue = contexte incomplet.
2. **CHECK** — Ouvre **`INBOX_ASSISTANT.md`**, prends la **première tâche `open`** (ou celle qu'on t'a désignée).
3. **CLAIM** — Statut → `claimed`, ajoute ton nom. Crée une branche : `git switch -c assistant/<task-id>-<court>`.
4. **DO** — Fais **exactement** la tâche, dans le périmètre donné, en respectant §1, §2, §4. Rien de plus.
5. **VERIFY** — `npm run lint` **et** `npm test`. Si ça casse à cause de toi → tu répares ou tu passes en `blocked`. Tu ne livres jamais du rouge en prétendant que c'est vert.
6. **REPLY** — Bloc `### Réponse` sous la tâche : ce que tu as fait, fichiers, **branche**, résultat des checks, doutes, ce qui reste à valider. Statut → `done` (ou `blocked`).
7. **SIGN** — Signature obligatoire (§5). **Tu ne merges pas, tu ne pousses pas sur `main`** — Claude/Vincent relisent la branche.

---

## 4. Ce que tu peux / ne peux pas faire

### ✅ Tu PEUX (tâches basiques)

- Écrire / étendre des **tests vitest** au niveau engine (cas manquants, edge cases d'un comportement **déjà** spécifié).
- Ajouter des **fixtures** / données de test.
- Compléter un **schéma Zod** dans `packages/shared` **uniquement si le contrat est déjà décidé** (tu ne décides pas de nouveaux champs).
- **JSDoc en français** sur des fonctions existantes ; renommer une variable **locale** pour la clarté.
- Corriger typos / formatage / tableaux / index dans les `.md`.
- Résumer du code, lister les TODO, relever des incohérences (sans les « corriger » d'autorité).
- Micro-fix de typage évident signalé par `tsc` (garde `noUncheckedIndexedAccess` manquante), **dans le fichier de la tâche**.

### ⛔ Tu ne PEUX PAS (→ laisse à Claude / Vincent)

- Toucher `engines/*`, `middleware/auth.ts`, `seeds/*.json`, le cycle d'action, les **permissions/rôles** (GODMODE, owner ops…).
- Toucher aux **secrets**, `.env`, JWT, mots de passe.
- Modifier le **frontend** (`apps/frontend`) — c'est MALEX.
- **Inventer** un endpoint, une ressource, un champ de contrat, un chiffre.
- **Refactor large**, renommage global, changement d'archi/stack, nouveau moteur générique.
- Construire l'**anti-scope** (multi-room, correction, ComfyUI, factories, OCR, dashboard permanent).
- `git push`, `git merge`, pousser sur `main`, ou **sceller/valider** quoi que ce soit.
- Générer des **images** / lancer un **job GPU** (gate `GO IMAGE` / `RUN APPROVED` requis).

> Tri simple : **sécurité, autorité métier (engines), contrat, canon, ou décision dure à défaire → ce n'est pas pour toi.**

---

## 5. Format de réponse + signature

Sous la tâche, remplis le bloc `### Réponse` (copie-colle, adapte) :

```markdown
### Réponse — <ton-llm> via opencode — <AAAA-MM-JJ>
- statut → done   (ou: blocked)
- branche : assistant/<task-id>-<court>
- ce que j'ai fait : <résumé 1–3 lignes>
- fichiers modifiés : <chemins>
- checks : `npm run lint` → <ok / erreurs> ; `npm test` → <X/Y vert>
- doutes / limites : <ce dont tu n'es pas sûr, ou "aucun">
- à valider/merger par Claude/Vincent : <oui — quoi exactement>
— signé : <ton-llm> via opencode
```

Signatures (selon le modèle lancé) : `— signé : mistral-agent via opencode` · `— signé : glm-4.6v via opencode` · `— signé : deepseek-v3 via opencode`.

La signature est **obligatoire** : elle dit à Vincent et Claude **qui** a produit quoi, donc quelle branche relire.

---

## 6. Exemple complet

**Tâche dans l'inbox :**

```markdown
## TASK-012 — test : blend garde 1 seul porte-parole
- statut : open
- de : claude-code
- créé : 2026-06-12
- fichiers : apps/backend/src/engines/persona_engine.ts (lecture) + *.test.ts associé
- contexte : invariant n°3 — speaker_persona_id === primary.id ; le secondaire ne prête que sa méthode.
- tâche : ajouter un test vitest qui prouve qu'un blend a un seul porte-parole et que les permissions ne se blendent pas.
- NE PAS : modifier persona_engine.ts lui-même ; ne change aucun comportement, juste le couvrir.
```

**Ce que tu fais :** `claimed`, branche `assistant/task-012-blend-speaker`, tu écris le test, `npm test` + `npm run lint`, puis :

```markdown
### Réponse — deepseek-v3 via opencode — 2026-06-12
- statut → done
- branche : assistant/task-012-blend-speaker
- ce que j'ai fait : ajouté 1 test vitest (blend → 1 speaker = primary ; permissions non blendées). Aucun code engine touché.
- fichiers modifiés : apps/backend/src/engines/persona_engine.test.ts
- checks : `npm run lint` → ok ; `npm test` → 14/14 vert
- doutes / limites : aucun
- à valider/merger par Claude/Vincent : oui — relire le test puis merger la branche.
— signé : deepseek-v3 via opencode
```

---

## 7. Lancer un agent assistant via opencode (côté Vincent)

Modèles **réellement branchés** dans ta config opencode (au 2026-06-12) : `ollama/mistral-agent` (Ollama local) et `zai-coding-plan/glm-4.6v` / `glm-4.5v` (Z.AI). Toujours faire lire `assistant.md` **et** `CLAUDE.md` en premier.

```bash
cd ~/Documents/masterflow

# TUI interactif (choix du modèle dans l'UI)
opencode

# Run direct, modèle imposé (forme provider/model)
opencode run --model ollama/mistral-agent \
  "Lis assistant.md et CLAUDE.md, puis traite la première tâche 'open' de INBOX_ASSISTANT.md : branche assistant/*, npm test + npm run lint, réponse signée 'mistral-agent via opencode'. Ne pousse pas, ne merge pas."

opencode run --model zai-coding-plan/glm-4.6v \
  "Lis assistant.md, prends TASK-012, fais-la, lance les checks, réponds et signe 'glm-4.6v via opencode'."
```

> Si tu ajoutes un provider (DeepSeek, OpenAI…) via `opencode auth login`, garde la même forme `--model provider/model` et adapte la signature. `opencode --help` pour les flags exacts. Le contrat ne change pas : *lire assistant.md + CLAUDE.md → traiter l'inbox → vérifier → répondre signé, sans merge.*

---

## 8. Antisèche

```
Qui     : un LLM assistant (≠ Claude Code), via opencode, sur le repo de code.
Pourquoi: aider Claude sans tokens, sur des tâches de code basiques.
Où      : INBOX_ASSISTANT.md (racine). Lire d'abord assistant.md + CLAUDE.md.
Boucle  : sync → check → claim → do → verify (npm test + npm run lint) → reply → sign.
Branche : assistant/<task-id>-<court>.  JAMAIS push/merge sur main.
Langue  : français. Termes canon = verbatim. JSDoc FR.
Jamais  : toucher engines/auth/seeds/.env/permissions, frontend MALEX, inventer, refactor large, valider.
Toujours: rester dans le scope, lancer les checks, signaler les doutes, SIGNER (<llm> via opencode + date).
Doute ? : tu ne fais pas → statut 'blocked' + explication, et tu laisses à Claude.
```

*Si une seule ligne doit rester : **tu proposes sur une branche, tu ne valides pas, tu ne merges pas — et tu signes.***
