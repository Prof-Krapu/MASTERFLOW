# assistant.md — Manuel des agents assistants (repo de code)

> **Pour qui ?** Tout LLM **autre que Claude Code** (GPT, DeepSeek, Qwen, Mistral…) lancé via **opencode** (ou un autre client) pour épauler Claude Code sur **ce dépôt de code** `~/Documents/masterflow/`.
> **Lis ce fichier en entier AVANT de toucher au code.** Lis aussi `CLAUDE.md` (les invariants y sont) — tu en es tenu autant que Claude.

---

## 0. En une phrase

Tu es un **agent assistant**. Ton rôle : exécuter un plan **safe**, borné et préparé par Codex,
Claude Code ou MALEX.
Boucle : **sync → vérifier `ready` → vérifier le worktree → claim → faire → vérifier → reçu signé.**

Tu produis un **diff non commité dans un worktree dédié**. La validation, le commit et la
publication sont faits après relecture par Codex/MALEX. Jamais par toi.

---

## 1. Les 7 règles d'or (à ne JAMAIS enfreindre)

1. **Langue = français.** Code, JSDoc et termes métier en français. Termes canon **verbatim** : *room, persona, blend/chimère, preflight, validation inbox, GODMODE, canon, resource, runner*.
2. **Une réponse d'IA n'est JAMAIS une validation humaine.** Tu produis un brouillon sur une
   branche `assistant/*`, dans un worktree dédié. **Tu ne commit, ne merges et ne pousses pas.**
   Ton statut final est `done_unverified`, jamais `verified`.
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

## 3. La boucle de travail : `sync → ready gate → worktree gate → claim → do → verify → receipt`

1. **SYNC** — la synchronisation et le worktree sont préparés par Codex. Vérifie seulement le
   SHA, la branche et les fichiers de coordination. Tu ne fais pas de `fetch` ou `pull`.
2. **READY GATE** — ouvre `INBOX_ASSISTANT.md`. Prends uniquement la tâche `ready` désignée.
   Une tâche `draft` ou `open` est interdite.
3. **WORKTREE GATE** — vérifie que la branche courante est `assistant/*` et que le worktree
   est propre. Sinon : `blocked`, aucune édition.
4. **CLAIM** — statut → `claimed`, ajoute ton nom. Ne change pas de branche.
5. **DO** — fais exactement la tâche, uniquement dans les fichiers autorisés.
6. **VERIFY** — lance les checks listés dans le plan. Ne prétends jamais avoir lancé un check absent.
7. **RECEIPT** — statut → `done_unverified` ou `blocked`, remplis la réponse sous la tâche
   et ajoute un reçu à `OPENCODE_EXECUTION_LEDGER.md`.
8. **STOP** — ne commit, ne push, ne merge et ne déploie jamais. Codex relit le diff.

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
- `git add`, `git commit`, `git push`, `git merge`, changer de branche, pousser sur `main`,
  ou **sceller/valider** quoi que ce soit.
- Générer des **images** / lancer un **job GPU** (gate `GO IMAGE` / `RUN APPROVED` requis).

> Tri simple : **sécurité, autorité métier (engines), contrat, canon, ou décision dure à défaire → ce n'est pas pour toi.**

---

## 5. Format de réponse + signature

Sous la tâche, remplis le bloc `### Réponse` (copie-colle, adapte) :

```markdown
### Réponse — <ton-llm> via opencode — <AAAA-MM-JJ>
- statut → done_unverified   (ou: blocked)
- branche : assistant/<task-id>-<court>
- ce que j'ai fait : <résumé 1–3 lignes>
- fichiers modifiés : <chemins>
- checks : `npm run lint` → <ok / erreurs> ; `npm test` → <X/Y vert>
- doutes / limites : <ce dont tu n'es pas sûr, ou "aucun">
- opérations Git/publication : aucun commit, push, merge ou live
- à relire par Codex : <quoi exactement>
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
- statut → done_unverified
- branche : assistant/task-012-blend-speaker
- ce que j'ai fait : ajouté 1 test vitest (blend → 1 speaker = primary ; permissions non blendées). Aucun code engine touché.
- fichiers modifiés : apps/backend/src/engines/persona_engine.test.ts
- checks : `npm run lint` → ok ; `npm test` → 14/14 vert
- doutes / limites : aucun
- opérations Git/publication : aucun commit, push, merge ou live
- à relire par Codex : oui — relire le test et relancer les checks.
— signé : deepseek-v3 via opencode
```

---

## 7. Lancer un agent assistant dans l’application OpenCode

Codex prépare d’abord le plan `ready`, la branche et le worktree dédié. MALEX ouvre ensuite
ce worktree dans l’application OpenCode et utilise :

```text
/mf-status
/mf-next TASK-XXX
```

Le modèle choisi dans OpenCode signe son reçu. Le contrat ne dépend pas du fournisseur :
`ready` + worktree `assistant/*` + périmètre borné + checks + reçu `done_unverified`.

L’application macOS et le CLI officiel OpenCode sont installés. MALEX peut utiliser le lanceur
`scripts/opencode-masterflow.sh` dans son terminal. La sandbox Codex ne peut pas déclencher
elle-même l’appel modèle, car sa politique bloque l’export du contexte privé du workspace vers
un provider externe non approuvé. Codex prépare les plans et reprend la revue après exécution.

---

## 8. Antisèche

```
Qui     : un LLM assistant (≠ Claude Code), via opencode, sur le repo de code.
Pourquoi: exécuter à moindre coût des tâches safe préparées par Codex.
Où      : INBOX_ASSISTANT.md (racine). Lire d'abord assistant.md + CLAUDE.md.
Boucle  : ready gate → worktree gate → claim → do → checks demandés → reçu.
Branche : assistant/<task-id>-<court>. JAMAIS commit/push/merge/live.
Langue  : français. Termes canon = verbatim. JSDoc FR.
Jamais  : toucher engines/auth/seeds/.env/permissions, frontend MALEX, inventer, refactor large, valider.
Toujours: rester dans le scope, lancer les checks prescrits, signaler les doutes, SIGNER.
Doute ? : tu ne fais pas → statut 'blocked' + explication, et tu laisses à Claude.
```

*Si une seule ligne doit rester : **tu proposes sur une branche, tu ne valides pas, tu ne merges pas — et tu signes.***
