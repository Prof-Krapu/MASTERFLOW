# Audit d'absorption — PILOTE (3 projets) · `answered`, en attente validation MALEX

> Réponse à `INBOX_VINCENT.md` 2026-06-12 « Auditer les workflows Vincent pour absorption MasterFlow ».
> **Runtime : audit only.** Aucun code, merge, migration, endpoint, engine, permission, déploiement
> ni changement de périmètre. Le présent document est une **proposition** qui revient dans Git pour
> validation humaine explicite de MALEX.

## Cadrage

- **Décision Vincent (humaine)** : faire d'abord un **pilote sur 3 projets** pour calibrer le format de
  la matrice, puis étendre aux ~17 autres projets après GO explicite.
- **Projets pilotes** : `API_corrector`, `API_manage`, `vibe` (les plus proches de la stack cible TS/Tauri).
- **Méthode** : pour chaque workflow → besoin réel / entrées-états-sorties / owner MasterFlow + type /
  contrats / données / permissions-preflight / validation humaine / trace / UI / tests → doublons &
  incompatibilités → classement. Chaque constat cite une source (`fichier` ou `fichier:ligne`).
- ⚠️ **Protocole d'entrée introuvable en local** : `PROTOCOLE_AUDIT_VINCENT_MASTERFLOW_A_LIRE_EN_PREMIER.md`
  n'est ni sous `~/Documents/MALEX/` ni ailleurs sur disque (probablement Google Drive non synchronisé).
  Grille de compilation utilisée à la place : `MALEXSIMPLE/02_ARCHITECTURE/CONTRACT_INDEX.md` (13 moteurs),
  `MALEX/05_BACKEND_REBUILD_SOURCE_TRUTH/01_CORE/MASTERFLOW_ACTIVE_CONTRACT_INDEX.md`, et le registre
  d'actions réel de `main`. **À confirmer par MALEX** si un protocole canonique doit primer.

## Légendes

**Classement d'absorption** (axe MALEX) :
`KEEP_AS_IS` · `ABSORB_AND_ADAPT` · `ADD_MISSING_CAPABILITY` · `IMPROVE_EXISTING_OWNER` · `SKIP_OR_QUARANTINE`.

**Statut d'architecture canonique** (axe protocole) :
`OK` · `PATCH_EXISTING_OWNER` · `AUDIT_ONLY` · `FUTURE_READY` · `QUARANTINE` · `BLOCKED_BY_HUMAN_VALIDATION`.
`NEW_ENGINE` reste **interdit** sans impossibilité démontrée.

**Owners MasterFlow** (CONTRACT_INDEX) : `core_runtime_resolution`, `permission_runtime`,
`godmode_debug_runtime`, `resource_truth_engine`, `subject_compiler`, `correction_engine`,
`pedagogical_graph_engine`, `inventory_ocr_engine`, `ui_room_os`, `persona_engine`, `image_action_gate`,
`da_visual_engine`, `factory_builder_backflow` (+ runners `llm`/`ocr`/`export`).

---

## 1. `API_corrector` — correction desktop Tauri, multi-provider LLM

Source : `API_corrector/README.md`, `AUDIT_2026-06.md`, `proxy-routes.ts`, `bridge-routes.ts`.

| # | Workflow | Owner MasterFlow | Décision | Statut | Risque |
|---|---|---|---|---|---|
| C1 | Client LLM multi-provider (`lib/api-client.ts`, presets OpenAI/Copilot/Z.AI/DeepSeek/Groq/Mistral/OpenRouter/Albert) | runner `llm` | **IMPROVE_EXISTING_OWNER** | PATCH_EXISTING_OWNER | faible |
| C2 | Routage fin modèle **par tâche** (OCR/barème/correction/synthèse/chat) + fallbacks | runner `llm` + `core_runtime_resolution` | **ADD_MISSING_CAPABILITY** | FUTURE_READY | faible |
| C3 | Pipeline correction OCR→barème→correction→historisation (`lib/pipeline.ts`) | `correction_engine` | **ABSORB_AND_ADAPT** | FUTURE_READY | moyen |
| C4 | Garde-fous notation (copie blanche→0 sans LLM ; code hors dico→`null` ; Σ points fait autorité — `AUDIT_2026-06.md §2.2`) | `correction_engine` + `resource_truth_engine` | **IMPROVE_EXISTING_OWNER** | PATCH_EXISTING_OWNER | faible |
| C5 | OCR multimodal corrigé+copies (images/PDF) | runner `ocr` / `inventory_ocr_engine` | **ABSORB_AND_ADAPT** | FUTURE_READY | moyen |
| C6 | Extraction barème / grille de correction | `subject_compiler` | **ABSORB_AND_ADAPT** | FUTURE_READY | faible |
| C7 | Édition humaine de la correction + restore version IA + undo/redo | `correction_engine` + lifecycle actions/validation | **IMPROVE_EXISTING_OWNER** | PATCH_EXISTING_OWNER | faible |
| C8 | `coherenceAudit` (écart note, couverture, structure) **calculé mais invisible en UI** (`pipeline.ts:546-574`) | owner audit / `ui_room_os` (cf. couche 14) | **IMPROVE_EXISTING_OWNER** | PATCH_EXISTING_OWNER | faible |
| C9 | Proxy egress LLM `/api/proxy` **avec allowlist anti-SSRF** (`proxy-routes.ts:29-60`) | runner `llm` (egress) + `permission_runtime` | **ABSORB_AND_ADAPT** | OK | faible |
| C10 | Mode `admin`/`client` (verrouiller vs déléguer la config LLM) | `permission_runtime` | **ABSORB_AND_ADAPT** | OK | faible |
| C11 | Dashboard historique **classes/élèves** (timeline/classe/élève) | aucun owner V1 (objets métier absents) | **ADD_MISSING_CAPABILITY** | BLOCKED_BY_HUMAN_VALIDATION | élevé |
| C12 | Bridge QR smartphone (session + upload + polling, **+ tunnel de secours**) | ingestion → lifecycle actions | **ABSORB_AND_ADAPT** (tunnel : QUARANTINE) | FUTURE_READY | moyen |
| C13 | Exports PDF individuel / CSV synthèse | runner `export` / `factory_builder_backflow` | **ABSORB_AND_ADAPT** | FUTURE_READY | faible |
| C14 | Historique local (`lib/history.ts`, DS/résultats/synthèses/threads) | BDD runtime + storage gated | **ABSORB_AND_ADAPT** | FUTURE_READY | moyen |

**Points saillants**
- **C4/C8 = les pépites.** Les garde-fous anti-hallucination (jamais de code d'erreur inventé, copie blanche
  notée sans appeler le LLM) **incarnent déjà** l'invariant Resource Truth. `coherenceAudit` est exactement le
  cas « audit calculé mais non surfacé » que la **couche 14** vient de résoudre côté MasterFlow → pattern à
  injecter dans l'owner audit/UI. **Contrats** : `RESOLUTION_MAP`, action lifecycle, `ActionAudit`.
- **C9 corrige une fausse alerte** : le proxy n'est pas un relais ouvert (allowlist providers). Seul caveat :
  l'extension `PROXY_ALLOWED_HOSTS` doit rester **admin-gated** côté MasterFlow (sinon contournement de permission).
- **C11 = incompatibilité majeure.** Les objets `classes`/`élèves` sont précisément les objets fictifs que MALEX
  a **supprimés en couche 13** (« Aucune classe n'est exposée par le backend »). Absorber l'UI sans owner backend
  réel violerait l'anti-hallucination → exige un owner données (Phase 2/3), **décision humaine MALEX requise**.
- **C12** : le bridge est absorbable (upload→preflight→validation), mais le **tunnel de secours** (exposition brute)
  doit passer par le modèle Funnel/permission MasterFlow → `QUARANTINE` jusqu'à gating.

---

## 2. `API_manage` — gateway/auth/storage/admin de la suite Correctors

Source : `API_manage/CLAUDE.md`.

| # | Workflow | Owner MasterFlow | Décision | Statut | Risque |
|---|---|---|---|---|---|
| M1 | Auth multi-utilisateurs (login, sessions, `requireUser`) | `permission_runtime` | **KEEP_AS_IS** (déjà couvert par l'auth JWT de `main`) | OK | faible |
| M2 | Storage REST `/api/v1/storage/:app/:key` + allowlist `ADMIN_CONTROLLED_KEYS` : `global_settings` (admin-only write / read-all) vs `user_storage` (privé par user) | `permission_runtime` | **IMPROVE_EXISTING_OWNER** | PATCH_EXISTING_OWNER | faible |
| M3 | Landing publique + reverse-proxy `/app/{pc,fr,nl}` gatés `requireUser` | `ui_room_os` | **SKIP_OR_QUARANTINE** (anti-scope : page routing + dashboard SaaS permanent) | QUARANTINE | faible |
| M4 | Panneau admin : clé API partagée, **invitations**, **monitoring token usage** | `permission_runtime` + owner audit | **ADD_MISSING_CAPABILITY** | FUTURE_READY | moyen |
| M5 | Orchestration systemd (4 services + funnel, **persistants au reboot**) | RUNTIME_ORCHESTRATION (ops) | **IMPROVE_EXISTING_OWNER** | AUDIT_ONLY | faible |
| M6 | better-sqlite3 + migrations idempotentes au boot | BDD | **KEEP_AS_IS** | OK | faible |

**Points saillants**
- **M2 = la pépite.** L'allowlist `ADMIN_CONTROLLED_KEYS` (admin-only en écriture pour les réglages globaux,
  privé-par-défaut pour les données user) **est** l'invariant MasterFlow « données privées par défaut +
  `PERMISSION > … > PREFERENCE` ». À absorber dans l'owner storage/permission. **Contrat** : `PERMISSION_RUNTIME_GUARDRAILS`.
- **M5** répond à un vrai manque de `masterflow` : les process actuels sont lancés en `setsid` détaché et **ne
  survivent pas à un reboot** (le Funnel, lui, est persistant). Le pattern systemd-user d'API_manage est un
  `IMPROVE` ops concret (faire de masterflow un service). Reste de l'ops, pas un contrat → `AUDIT_ONLY`.
- **M3** est dans la **liste anti-scope explicite** du MVP (routing classique, dashboard permanent) → écarté.

---

## 3. `vibe` (Albert Education) — app Tauri fusionnée, backend Rust/axum multi-user

Source : `vibe/CLAUDE.md`.

| # | Workflow | Owner MasterFlow | Décision | Statut | Risque |
|---|---|---|---|---|---|
| V1 | Transport desktop↔remote (`lib/transport.ts` : `__TAURI__` detect, invoke vs fetch, CSRF auto, hook 401) | packaging Tauri (`apps/desktop` planifié) | **ABSORB_AND_ADAPT** | FUTURE_READY | faible |
| V2 | Proxy Albert `/api/albert/{*path}` : **clé injectée serveur, headers client strippés, 412 si absente** | runner `llm` (egress) | **IMPROVE_EXISTING_OWNER** | PATCH_EXISTING_OWNER | faible |
| V3 | Secrets per-user chiffrés (`DbSecretStore` AES-256-GCM, master key, task-local `CURRENT_USER`) | `permission_runtime` + données privées | **ADD_MISSING_CAPABILITY** | BLOCKED_BY_HUMAN_VALIDATION | moyen |
| V4 | Auth Rust argon2id + sessions httpOnly + **CSRF double-cookie** | `permission_runtime` | **IMPROVE_EXISTING_OWNER** (CSRF) / KEEP_AS_IS (auth, stack ≠) | PATCH_EXISTING_OWNER | moyen |
| V5 | AlbertPane chat + **36 slash-commands**, dispatch par module, Cmd+K | `persona_engine` + `ui_room_os` (actions contextuelles) | **ADD_MISSING_CAPABILITY** | FUTURE_READY | moyen |
| V6 | Module Document (Tiptap + LaTeX via `albert-core`, KaTeX) | hors 13 owners | **SKIP_OR_QUARANTINE** | AUDIT_ONLY | faible |
| V7 | Module Corrector (wizard 4 étapes, OCR, PDF) — **doublon** de C3/C5 | `correction_engine` | **ABSORB_AND_ADAPT** (dédoublonner) | FUTURE_READY | moyen |
| V8 | Module Planning (IMAP + CalDAV) | hors scope | **SKIP_OR_QUARANTINE** | AUDIT_ONLY | faible |
| V9 | CSP permissif `default-src * 'unsafe-inline' 'unsafe-eval'` (contourne `tailscale serve`) | `permission_runtime`/safety | **SKIP_OR_QUARANTINE** | QUARANTINE | élevé |

**Points saillants**
- **V1 = l'absorption la plus stratégique.** MasterFlow a acté Tauri (desktop + web) mais `apps/desktop` n'est pas
  construit ; `transport.ts` est un **blueprint prouvé** (détection runtime + un seul canal d'appel). Forte valeur,
  risque faible.
- **V2 vs C9** : deux egress LLM corrects (clé serveur, headers strippés). V2 (412 si clé manquante, strip
  `Authorization`/`Cookie`/`Host`) est le **patron de référence** pour le runner `llm` de MasterFlow.
- **V3** : secrets per-user chiffrés = capacité réelle absente de MasterFlow (aujourd'hui 1 godmode + 1 clé LLM
  partagée en `.env`). Pertinent **si** MasterFlow passe multi-user → décision de périmètre **humaine**.
- **V9 = incompatibilité bloquante.** Un CSP grand ouvert contredit l'invariant safety/UI-non-déceptive ; ne pas
  absorber le serveur sans durcir le CSP.

---

## Synthèse transverse

### 1) Top absorptions — forte valeur / faible risque (à proposer en premier)
1. **V1** transport desktop↔remote → débloque `apps/desktop` (Tauri acté). `ABSORB_AND_ADAPT` / FUTURE_READY.
2. **V2 + C9** egress LLM gated (clé serveur, headers strippés, allowlist) → durcir le runner `llm`. `IMPROVE` / PATCH.
3. **M2** allowlist storage admin-controlled / privé-par-défaut → owner permission/storage. `IMPROVE` / PATCH.
4. **C4 + C8** garde-fous notation + `coherenceAudit` surfacé → owner correction + audit (prolonge la couche 14). `IMPROVE` / PATCH.
5. **C1/C2** client multi-provider + routage par tâche → runner `llm`. `IMPROVE` + `ADD_MISSING_CAPABILITY`.

### 2) Incompatibilités bloquantes
- **C11** objets `classes`/`élèves` sans owner backend (= objets fictifs retirés en couche 13) → anti-hallucination. `BLOCKED_BY_HUMAN_VALIDATION`.
- **V9** CSP `default-src *` → safety. `QUARANTINE`.
- **C12 (tunnel)** exposition brute hors Funnel/permission. `QUARANTINE`.
- **M3** landing + page routing → anti-scope MVP explicite. `SKIP`.
- **V3 / multi-user** : MasterFlow V1 = mono-godmode + clé partagée ; vibe/API_manage = multi-user. Passage multi-user = **décision de périmètre humaine**.

### 3) Améliorations que ces projets suggèrent à MasterFlow
- **CSRF double-cookie** (V4) vs bearer nu actuel ; durcir aussi `POST /auth/register` (ouvert).
- **Secrets per-user chiffrés** (V3) si multi-user.
- **Persistance systemd-user** (M5) — masterflow ne survit pas au reboot aujourd'hui.
- **Monitoring token usage + invitations** (M4) → observabilité/audit.
- **Routage modèle par tâche + fallbacks** (C2).

### 4) Briques à écarter (pour ce tour)
- Proxy générique **sans** allowlist (n'existe pas ici — C9 est déjà gated, fausse alerte levée).
- CSP permissif (V9), tunnel de secours brut (C12), landing/page-routing (M3), modules Document (V6) & Planning (V8) hors scope.

### 5) Plan de PRs courtes (proposé — **aucun code avant validation MALEX**)
> Chaque PR = 1 owner, contrat d'abord, schéma avant endpoint, permission avant action, test inclus.

| PR | Titre | Owner | Dépend de | Migration |
|---|---|---|---|---|
| PR-A | Runner `llm` : egress gated (clé serveur, strip headers, allowlist, 412) | runner `llm` + permission | — | non |
| PR-B | Storage : allowlist `admin_controlled_keys` + privé-par-défaut | permission_runtime | — | table `storage` |
| PR-C | `apps/desktop` : shell Tauri + transport runtime-detect | packaging | contrat shared | non |
| PR-D | Audit/UI : surfacer `coherence/coverage` d'une action (extension couche 14) | owner audit + ui_room_os | couche 14 | non |
| PR-E | Auth : CSRF + fermeture register ouvert | permission_runtime | — | non |
| PR-F (gated) | `correction_engine` Phase 2 (pipeline + garde-fous + grille) | correction_engine | PR-A | tables correction |

PR-A→E sont **faible risque / fort alignement**. PR-F et tout ce qui touche `classes/élèves` (C11), multi-user (V3)
ou le passage Phase 2 restent **`BLOCKED_BY_HUMAN_VALIDATION`** (périmètre).

---

## Gate (rappel)
- Audit et proposition **seulement**. Aucun code/merge/migration/endpoint/engine/permission/déploiement.
- Invariants préservés dans toute absorption future : permission check, preflight sensible, validation humaine,
  Resource Truth, données privées par défaut, UI non déceptive, auditabilité.
- **Suite (sur GO Vincent/MALEX)** : étendre aux ~17 projets restants (`Albert_corrector_*`, `albert-chimie`,
  `anti-api`, `HADES`, `NEOCLI`, `openwebui`, `paperclip`, `programme_scolaire`, `sciences`, …) au même format.

*Brouillon d'audit rédigé via Claude pour Vincent ; revient `answered` pour validation humaine explicite de MALEX.*
