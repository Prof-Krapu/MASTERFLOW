# SUIVI — MasterFlow

Journal de construction. Le quoi/pourquoi, daté et concis.

---

## 2026-06-12 — Validation graduee au lieu de double validation systematique

**Decision MALEX/Vincent.** MasterFlow assouplit la validation : ne pas exiger une double
validation humaine systematique pour les operations bas risque, privees ou reversibles.

Nouvelle reference : `POLITIQUE_VALIDATION_GRADUEE.md`.

Regle :

- permission check toujours ;
- preflight selon l'action ;
- audit des mutations ;
- validation humaine pour actions sensibles ;
- validation renforcee seulement pour actions critiques.

Impact PR-1 Guided Runtime : drafts, sessions privees, contributions et progression interne
passent par permission/scope/audit. Publication, public, email, event, devis, asset, export,
settings globaux, suppression definitive ou cout eleve restent soumis a validation humaine.

---

## 2026-06-12 — GO PR-1 Guided Runtime prive

**Decision humaine MALEX.** MOTH/CDC est retenu comme premiere verticale de preuve pour exercer
plusieurs fondations MasterFlow, sans le confondre avec une priorite absolue du produit.

Perimetre valide :

- `GUIDANCE_ENGINE` owner de la prochaine question ;
- guides owners par user, room optionnelle ;
- sessions uniquement authentifiees ;
- usage prive d'un guide draft par son teacher owner ;
- retention 30 jours inactive / 90 jours apres cloture ;
- premier template CDC versionne en `candidate` ;
- contrats, migrations, progression deterministe, permissions, audit et tests.

Restent interdits dans cette PR : public/invite, LLM obligatoire, email, event, devis, assets,
publication, analytics nominatifs et UI finale.

Demande transmise a Vincent dans `INBOX_VINCENT.md` et `SYNC_THREAD_MALEX_VINCENT.md`.

---

## 2026-06-12 — Audit exhaustif du Drive MasterFlow complet

**Perimetre :** audit documentaire et technique, sans modification runtime.

### Fait

- Inventorie les 4 508 fichiers du Drive canon :
  - 791 fichiers dans le corpus fonctionnel primaire ;
  - 3 686 fichiers secondaires (audits, deployment, factories) ;
  - 31 fichiers racine.
- Normalise le systeme en 42 familles, dont 41 dans le perimetre produit actuel et factories
  suivies separement comme `OUT_OF_SCOPE`.
- Compare chaque famille aux contrats, tables, endpoints, engines, UI et tests GitHub.
- Corrige la portee du premier audit : 15-20 % concernait le noyau actif ; la couverture de
  MasterFlow complet est estimee prudemment a **10-13 %**.
- Ajoute :
  - `AUDIT_MASTERFLOW_COMPLET_CANON_VS_GITHUB_2026-06-12.md` ;
  - `AUDIT_MASTERFLOW_CANON_INVENTORY.json` ;
  - `scripts/audit-masterflow-canon.mjs`.
- Message de revue depose pour Vincent dans `INBOX_VINCENT.md` et
  `SYNC_THREAD_MALEX_VINCENT.md`.

### Decision

- Ne pas reduire le canon au MVP et ne pas convertir chaque document en feature.
- Fermer d'abord core multi-user, permissions objet, execution/jobs et Sentinel minimal.
- Utiliser ensuite MOTH/CDC comme premiere verticale privee, puis Ours d'Or et devis.
- Terminer chaque verticale par sa surface UI, pas commencer par une UI globale.

---

## 2026-06-12 — Audit profond canon Drive vs GitHub

**Audit MALEX/Codex.** Rapport :
`AUDIT_PROFOND_CANON_VS_GITHUB_2026-06-12.md`.

L'audit compare l'index canonique des owners actifs, les grands contrats transversaux, les
objets BDD, les endpoints, les schemas partages, le frontend et les tests.

Conclusion :

- aucun des 19 owners actifs de l'index JSON n'est implemente a profondeur canonique ;
- 8 possedent une tranche de code executable identifiable ;
- la couverture brute par presence d'une tranche de code est d'environ 42 % ;
- la couverture fonctionnelle ponderee est estimee entre 15 et 20 % ;
- le socle auth/rooms/personas/actions/resources est coherent, mais les domaines metier,
  jobs, projets, assets, scopes et runners restent majoritairement absents.

Priorite recommandee : fermer scopes/ownership/privacy, projects, jobs et dispatcher d'actions,
puis utiliser le pilote MOTH/CDC comme premiere verticale multi-owner.

Validation technique du baseline : backend 27/27, lint backend/frontend et build frontend OK.

---

## 2026-06-12 — PR-0 Bot Studio / Guided Runtime

**Decision MALEX.** L'audit global du Drive canon est transforme en specification d'assemblage :
`SPEC_BOT_STUDIO_GUIDED_RUNTIME.md`.

Le Bot Studio n'est pas un nouvel engine. Il compose `GUIDANCE_ENGINE`, personas fonctionnelle
et lore, engine metier, UI manifest, permissions, cycle d'action, Resource Truth, analytics et
opportunity detector.

La spec couvre :

- guides conversationnels versionnes ;
- sessions privees, classe, invitees ou publiques ;
- contributions sourcees et contradictions ;
- manifestes de deploiement des bots ;
- permissions, consentements, preflight et validation ;
- cas MOTH/CDC, Ours d'Or, devis et creation guidee d'un bot ;
- plan de PRs progressives et tests minimum.

### Gate

- Ce commit est une PR-0 documentaire, sans code ni migration.
- La premiere implementation proposee reste privee et authentifiee, sans LLM obligatoire.
- Vincent doit auditer le mapping, repondre aux questions ouvertes et proposer le diff exact
  de PR-1.
- Acces public, email, devis, assets et analytics godmode exigent chacun un GO MALEX separe.

---

## 2026-06-12 — Dimensionnement propose pour le runtime Local RAG BGE

**Information transmise a Vincent.** Palier de depart recommande :

```text
RTX 4060 Ti 16 Go + CPU 8-12 coeurs + 64 Go RAM + NVMe 1-2 To
```

Le CPU seul reste possible pour un PoC, tandis qu'une RTX 4090 24 Go et 128 Go RAM
correspondent plutot a une charge lourde ou multi-utilisateur.

Cette recommandation n'est pas une decision d'achat. Le choix final dependra d'un benchmark
sur le corpus pilote : latence, debit, consommation VRAM/RAM et volume Qdrant.

---

## 2026-06-12 — Audit et durcissement PR-1 token tracking

**Audit MALEX/Codex du commit `1b08b38`.** Le gate admin/godmode, la whitelist SQL,
la lecture seule et le contrat partage sont conformes.

Correctifs appliques :

- index composite token par utilisateur et periode rendu deterministe ;
- rejet des periodes invalides ou inversees ;
- fallback local sur compteurs provider invalides ;
- neutralisation des couts negatifs ;
- couverture de test etendue a la tarification.

Rapport complet : `AUDIT_PR1_TOKEN_TRACKING.md`.

Validation : backend 27/27, lint backend/frontend, build frontend et `git diff --check` OK.

Risques conserves et explicites : tarification indicative non exploitable pour billing ;
appels provider echoues ou streams interrompus potentiellement absents de la telemetrie.

---

## 2026-06-12 — Dépôt du handoff Local RAG BGE pour Vincent

**Dépôt MALEX.** Le dossier `MASTERFLOW_LOCAL_RAG_BGE_HANDOFF/` est transmis à Vincent
comme spécification d'implémentation progressive d'une couche de retrieval locale et
permissionnée.

Contenu :

- point d'entrée obligatoire `00_START_HERE_VINCENT.md` ;
- architecture et limites de responsabilité ;
- indexation, retrieval hybride et context packs ;
- sécurité, permissions, révocation et audit ;
- plan de cinq PRs progressives ;
- contrat OpenAPI, schémas JSON, manifeste, compose et jeu d'évaluation.

Contrôles avant dépôt : JSON/JSONL valides, YAML valides, aucun secret détecté.

### Gate

- Première étape : audit du repo et proposition exacte de la PR-1 `Capability Shell`.
- Aucun code, modèle, Qdrant, indexation, migration, endpoint ou UI avant validation humaine.
- Permissions avant retrieval ; chaque hit doit conserver une source lisible.
- Le RAG reste dérivé, optionnel et non souverain.

Demande transmise dans `INBOX_VINCENT.md` et le fil de synchronisation.

---

## 2026-06-12 — GO humain MALEX sur PR-2 global settings

**Décision MALEX.** Vincent peut implémenter la PR-2 décrite dans
`SPEC_PR_PRIORITAIRES.md`.

Périmètre validé :

- action sensible `set_global_setting` ;
- passage obligatoire par permission check et preflight ;
- validation humaine admin avant exécution ;
- allowlist explicite des clés administrables ;
- secrets interdits dans `global_settings` ;
- audit et erreurs lisibles ;
- tests du cycle preflight, validation et exécution.

Pas de nouvel engine, pas de billing, pas d'extension des rôles et pas de refactor global.
Le résultat doit revenir dans Git pour revue avant toute surface frontend associée.

---

## 2026-06-12 — GO humain MALEX sur PR-1 suivi token

**Décision MALEX, confirmée directement avec Vincent.** Le commit backend `1b08b38`
« suivi token réel + endpoint diagnostic gated admin/godmode » est approuvé et conservé sur
`main`.

- instrumentation du `usage` provider avec fallback ;
- coût estimé centralisé ;
- granularité par tâche ;
- endpoint diagnostic réservé admin/godmode ;
- tests backend dédiés.

Ce GO clôt le gate de la PR-1. La PR-2 sur l'écriture sensible de `global_settings` a reçu
son GO humain séparé dans l'entrée ci-dessus.

---

## 2026-06-12 — Proposition packs et tarifs d'abonnement

**Décision MALEX.** Une première grille commerciale est déposée dans
`PROPOSITION_PACKS_ET_TARIFS_ABONNEMENT.md` pour être challengée par Vincent.

- Student : gratuit ;
- Student Pro / Portfolio : 8,90 EUR TTC/mois ;
- Teacher : 24,90 EUR TTC/mois ;
- Studio / Creator : 49 EUR TTC/mois ;
- School / Campus : à partir de 199 EUR HT/mois ;
- White Label : 990 à 2 500 EUR HT/mois + installation ;
- Godmode / Owner Ops : non commercialisé.

La proposition inclut un modèle de crédits IA et sépare strictement pack, rôle, permission,
quota et validation.

### Gate

- Statut `PROPOSAL / NON_CANONICAL`.
- Aucun billing, quota, endpoint, permission ou feature flag à implémenter dans ce tour.
- Vincent doit challenger coûts réels, marges, quotas et faisabilité à partir du suivi token.
- Toute implémentation ou canonisation exige une validation humaine MALEX séparée.

---

## 2026-06-12 — Spec détaillée des 2 PRs prioritaires (audit-only)

**Périmètre.** Spec des 2 features resserrées (suivi token, écriture settings admin), ancrée sur le code réel
de `apps/backend`. **Aucun code appliqué** — proposition pour validation humaine MALEX.

### Livré
- `SPEC_PR_PRIORITAIRES.md` :
  - **PR-1 suivi token** (`IMPROVE`) : (A) instrumentation `services/llm.ts` — `task` paramétrable,
    `stream_options.include_usage` pour consommer le `usage` réel (fallback estimation), coût via
    `llm_pricing.ts` ; (B) endpoint `GET /diagnostics/token-usage` **gated `requireRole('admin')`** (admin+
    godmode), registre `view_token_usage`. Migration : aucune (table existe).
  - **PR-2 écriture `global_settings`** (`ABSORB`) : action sensible `set_global_setting` (medium_high,
    `validator_role: admin`), ajout additif `validator_role` au schéma registre, `validatorRoleFor` le lit,
    dispatcher d'exécution réel (remplace le mock pour cette action) + allowlist `ADMIN_CONTROLLED_KEYS`,
    secrets jamais en BDD. Cycle complet preflight→validation(admin)→execute, 423 maintenu.
- Invariants tenus (validation humaine, privé par défaut, secrets hors BDD, contrat additif rétro-compatible).
  Ordre : PR-1 d'abord (indépendante), PR-2 ensuite (dépend du contrat `validator_role`).

### Gate
Spec = proposition. **`BLOCKED_BY_HUMAN_VALIDATION`** : rien implémenté/mergé/migré avant GO MALEX.

---

## 2026-06-12 — Audit d'absorption : PILOTE 3 projets livré (côté Vincent)

**Périmètre.** Réponse au gate MALEX. Décision Vincent : pilote `API_corrector` + `API_manage` + `vibe`
pour calibrer le format, extension aux ~17 autres sur GO. **Audit only, aucun code.**

### Livré
- `AUDIT_ABSORPTION_PILOTE_3PROJETS.md` : matrice sourcée par workflow (besoin, owner+type, contrats,
  données, permissions/preflight, UI, écart, classement, statut canonique, risque, tests, PR), + 5 sections
  transverses (top absorptions, incompat bloquantes, améliorations, à écarter, plan PRs courtes).
- INBOX_VINCENT entrée passée `open → answered` ; réponse dans `SYNC_THREAD` (entrée pilote audit).

### Constats clés
- Pépites faible-risque : transport Tauri desktop↔remote (`vibe`), egress LLM gated (`vibe`+`API_corrector`,
  proxy allowlisté = fausse alerte « relais ouvert » levée par contre-vérification), allowlist storage
  admin/privé (`API_manage`), garde-fous notation + `coherenceAudit` invisible → prolonge la couche 14.
- Incompat bloquantes : objets `classes/élèves` sans owner (retirés couche 13), CSP `default-src *`,
  tunnel QR brut, landing page-routing (anti-scope). Doublon correction `API_corrector` ↔ module `vibe`.
- ⚠️ Protocole canonique `PROTOCOLE_AUDIT_VINCENT_MASTERFLOW_A_LIRE_EN_PREMIER.md` introuvable en local →
  compilé sur CONTRACT_INDEX + canon `05_BACKEND_REBUILD_SOURCE_TRUTH` + registre d'actions de `main`.

### Gate
Rapport = proposition, **retour pour validation humaine MALEX**. Rien codé/mergé/migré/déployé.

---

## 2026-06-12 — Gate strategique : audit d'absorption des workflows Vincent

**Decision MALEX.** Avant toute nouvelle integration structurante, le systeme de Vincent doit
comparer les workflows et features deja construits dans ses projets avec le MasterFlow canon.
Le risque actuel n'est pas le manque de features, mais l'ajout tardif de briques utiles sous une
forme incompatible, doublonnee ou mal gatee.

### Autorites et ordre de lecture

1. Canon produit : Drive `MASTERFLOW`.
2. Point d'entree : `PROTOCOLE_AUDIT_VINCENT_MASTERFLOW_A_LIRE_EN_PREMIER.md`.
3. Resolution MasterFlow :
   - `START_HERE_FOR_AI_AND_DEVS_MASTERFLOW.md` ;
   - `01_CORE/MASTERFLOW_ACTIVE_CONTRACT_INDEX.md` ;
   - `01_CORE/MASTERFLOW_ENGINE_CONTRACTS.md` ;
   - `01_CORE/MASTERFLOW_SCOPE_AND_PERMISSION_MODEL.md` ;
   - `04_ENGINES/MASTERFLOW_RUNTIME_WIRING_AND_INTER_SYSTEM_CONNECTION_MAP.md`.
4. Implementation actuelle : GitHub `main`, `CLAUDE.md`, `packages/shared`, backend, frontend
   et registre d'actions.
5. Projets/workflows Vincent : sources candidates a inventorier et comparer, jamais nouvelle
   autorite canonique implicite.

### Methode obligatoire

Pour chaque workflow ou feature Vincent :

- decrire le besoin reel, les entrees, etats, sorties et condition d'arret ;
- identifier l'owner MasterFlow existant et son type : APP, ENGINE, CONTRACT, DATASET, EVENT,
  WIDGET ou AUDIT ;
- relier engine, contrats actifs, donnees/BDD, endpoints/toolcalls, permissions, preflight,
  validation humaine, traces, surface UI et tests ;
- verifier les doublons semantiques et les incompatibilites ;
- classer la proposition :
  - `KEEP_AS_IS` : deja compatible et reutilisable ;
  - `ABSORB_AND_ADAPT` : valeur utile, adaptation aux owners/contrats MasterFlow ;
  - `ADD_MISSING_CAPABILITY` : besoin nouveau confirme, a mapper avant code ;
  - `IMPROVE_EXISTING_OWNER` : meilleur pattern a injecter dans une brique existante ;
  - `SKIP_OR_QUARANTINE` : redondant, trop couple, premature ou contraire aux invariants.

Le verdict d'architecture doit aussi reprendre les statuts du protocole canonique :
`OK`, `PATCH_EXISTING_OWNER`, `AUDIT_ONLY`, `FUTURE_READY`, `QUARANTINE` ou
`BLOCKED_BY_HUMAN_VALIDATION`. `NEW_ENGINE` reste interdit sans impossibilite demontree.

### Livrable attendu avant code

Une matrice sourcee, un item par workflow :

```txt
Projet/source | workflow | valeur | owner MasterFlow | contrats | donnees
permissions/preflight | UI | ecart actuel | decision | risque | tests | PR proposee
```

Puis :

1. top des absorptions a forte valeur / faible risque ;
2. incompatibilites bloquantes ;
3. ameliorations MasterFlow suggerees par ses projets ;
4. briques a ecarter ;
5. plan de PRs courtes avec dependances et migrations explicites.

### Gate

- Audit et proposition seulement.
- Aucun code, merge, migration, endpoint, permission, deploiement ou changement de perimetre
  avant retour dans Git et validation humaine explicite de MALEX.
- Ne pas scanner tout le Drive sans ciblage : utiliser les index actifs, retrouver l'owner,
  puis charger seulement les contrats et engines necessaires.
- Conserver les invariants : permission check, preflight sensible, validation humaine,
  Resource Truth, donnees privees par defaut, UI non deceptive et auditabilite.

Demande transmise dans `INBOX_VINCENT.md` et `SYNC_THREAD_MALEX_VINCENT.md`.

---

## 2026-06-12 — Frontend couche 14 : auditabilite des actions

**Perimetre.** Rendre le cycle d'action et ses decisions lisibles depuis les donnees deja
retournees par le backend, sans nouveau contrat ni modification backend.

### Construit

- Ajout d'un composant `ActionAudit` isole du widget principal.
- Trace visuelle du cycle reel :
  - creation ;
  - preflight ;
  - validation, ou etape explicitement non requise ;
  - execution ;
  - resultat.
- Affichage des champs contractuels disponibles : risque, permission check, validateur,
  timestamp de mise a jour, note de validation, warnings, erreur backend et resultat technique
  repliable.
- Ajout d'une note libre dans l'inbox avant approbation ou rejet. Une note vide reste vide :
  aucun commentaire automatique n'est invente par l'UI.
- Distinction visuelle entre rejet humain, echec de preflight et echec d'execution.

### Invariant

Validation et execution restent deux gestes separes. L'UI ne reconstruit pas un audit log :
elle affiche uniquement l'etat courant et les metadonnees presentes dans le contrat `Action`.

### Validation

| Verif | Resultat |
|---|---|
| `npm run lint:frontend` | OK |
| `npm run build:frontend` | OK, 32 modules |
| `npm test` | OK, backend 16/16 |
| `git diff --check` | OK |
| Browser local mobile 390 px | aucun debordement, aucune erreur console |

### Run restant

Le panneau authentifie doit etre confirme sur le runtime public apres integration par Vincent,
le backend restant human-in-the-loop.

---

## 2026-06-12 — Revue + intégration couche 14 (côté Vincent)

**Périmètre.** Revue et intégration de la couche 14 frontend de MALEX (auditabilité des
actions, `action-audit.tsx`), sans modification backend ni contrat.

### Revue & intégration
- Fast-forward propre : `6f96de5` a pour parent exact `0016b6c` (MALEX déjà rebasé sur `main`).
  `main` : `0016b6c` → `6f96de5`.
- `ActionAudit` lit **uniquement** des champs présents dans le contrat `@masterflow/shared`
  `Action` (vérifié : `preflight.{risk_level,permission_check,requires_validation,warnings}`,
  `validator_id`, `updated_at`, `validation_note`, `result`, `error`, `status`). Aucun champ
  inventé, aucun audit log reconstruit côté UI — état courant + métadonnées du contrat.
- **Anti-hallucination renforcée** : l'ancien `handleValidationDecision` injectait d'office
  `'validation UI MasterFlow'` / `'rejet UI MasterFlow'`. Désormais la note n'est transmise que
  si non-vide (`note?.trim() ? {note} : {}`) → note vide = note absente. Bonne correction.
- Invariant tenu : validation et exécution restent **deux gestes séparés** (message
  « execution separee requise »). Aucun backend touché, aucun contrat modifié.

### Validation (côté Vincent, sur `main` fast-forwardé)
| Vérif | Résultat |
|---|---|
| `npm run lint:frontend` (`tsc --noEmit`) | ✓ |
| `npm run build:frontend` | ✓ 32 modules |
| backend `npm test` (vitest) | ✓ 16/16 |
| `git diff --check` | ✓ |

Pas de smoke public ici : couche front pure, zéro changement backend. Le panneau authentifié
reste à confirmer sur le runtime public (run human-in-the-loop, backend lancé par Vincent).

---

## 2026-06-12 — Revue + intégration couche 13 (côté Vincent)

**Périmètre.** Revue et intégration de la couche 13 frontend de MALEX (modes fondés sur le
runtime réel), sans modification backend.

### Revue & intégration

- `main` fast-forwardé `69979cb` → `1e7bbdd` (clôture rebase `3860f2f` + refactor `1e7bbdd`).
- Extraction `apps/frontend/src/mode-runtime.ts` (types, `WORK_MODES`, `DEFAULT_WORK_MODE`,
  `canUseMode`, `buildModeView`) hors `App.tsx`, comportement préservé.
- Doctrine : suppression des objets fictifs (classes, élèves, sujets, histoires, arcs, scènes,
  timeline, tâches) ; Teaching/Story signalent l'absence d'objets métier backend. Conforme
  « app visible ≠ engine active » + anti-hallucination.
- Invariants : aucun backend, candidates Resource Truth gated admin/godmode (deck Admin),
  sources par défaut `validated`, `canUseMode` inchangé.

### Validation

| Vérif | Résultat |
|---|---|
| `npm run lint:frontend` (`tsc --noEmit`) | OK |
| `npm run build:frontend` (`vite build`) | OK, 31 modules |
| `npm test` (backend vitest) | OK 16/16 |
| `git diff --check` | OK |

Réponse à MALEX dans `SYNC_THREAD_MALEX_VINCENT.md` + `INBOX_MALEX.md` (rebase avant prochaine couche).

---

## 2026-06-12 — Frontend couche 13 : modes fondes sur le runtime reel

**Perimetre.** Retirer les objets d'interface prospectifs des modes et isoler leur mapping,
sans modification backend ni nouveau contrat.

### Construit

- Extraction de la definition des modes et de leur projection dans `apps/frontend/src/mode-runtime.ts`.
- Les cartes de mode proviennent uniquement du contexte reel :
  - room instance ;
  - ressources validees ;
  - registre d'actions live ;
  - validations en attente ;
  - candidates Resource Truth, reservees admin/godmode ;
  - etat WebSocket.
- Suppression des objets fictifs affiches comme s'ils existaient deja : classes, eleves,
  sujets compiles, histoires, arcs, scenes, timeline et taches.
- Les modes Teaching et Story signalent explicitement l'absence d'objets metier backend au lieu
  de simuler une fonctionnalite.

### Invariant

L'interface ne presente comme disponible que ce que le runtime et les permissions exposent
reellement. Aucun ajout backend, aucune donnee canon modifiee.

### Validation

| Verif | Resultat |
|---|---|
| `npm run lint:frontend` | OK |
| `npm run build:frontend` | OK |
| `git diff --check` | OK |

---

## 2026-06-10 — Couches 5-12 validées + run réel godmode + fix backend rooms

**Périmètre.** Côté Vincent : revue + intégration de la tranche frontend couches 5-12 de MALEX
(`16340c8`), exécution du run réel godmode demandé, et correction d'un bug backend découvert
pendant ce run.

### Revue & intégration

- Revue complète `App.tsx` (1221 lignes), `api.ts`, `styles.css`, `smoke-public-runtime.mjs`,
  `FRONTEND_UI_DOCTRINE.md` : conforme au contrat `@masterflow/shared` et aux invariants
  (cycle create → preflight → validation → exécution **explicite et séparée**, inbox gated
  teacher+, candidates ressources gated admin/godmode, sources par défaut = `validated` only,
  1 speaker via `message.speaker`, debug godmode only, **pré-remplissage login retiré** —
  point sécu de la dernière revue traité par MALEX).
- Fast-forward `main` → `16340c8`, live sur le funnel `:10000`.
- Checks : backend vitest **16/16**, `tsc` backend + frontend 0 erreur, `vite build` OK,
  `npm run smoke:public` **7/7 OK** avec credentials (login godmode, context, personas,
  resources, WebSocket pong à travers le funnel).

### Bug backend trouvé et corrigé (`3e34213`)

Le run réel a révélé que le router `rooms` supposait `requireUser` « monté en amont » alors
qu'`index.ts` ne le montait pas :

- `GET /rooms` répondait **sans authentification** sur le funnel public (fuite) ;
- `GET/PUT /rooms/:id/instance` renvoyaient **401 même avec un token valide** (`req.user`
  jamais posé) → la couche 12 de MALEX (sync room instance) ne pouvait pas fonctionner.

Fix : `router.use(requireUser)` dans le router lui-même (pattern des autres routers) + nouveau
test HTTP éphémère `rooms_auth.test.ts` (401 sans token sur les 4 routes, cycle PUT/GET
instance avec token). Vérifié en live : `GET /rooms` sans auth → 401, `PUT instance` → 200.

### Run réel godmode (les 7 étapes demandées par MALEX) — tout passe

| Étape | Résultat |
|---|---|
| 1. Login `:10000` | 200, rôle godmode |
| 2. Sas d'entrée → `PUT instance` | 200 après fix ; surface/densité/`entry_profile` persistés et relus |
| 3. Home Room surface + densité + sync | `learning`/`low`/`active_mode` confirmés en relecture |
| 4. Action live → preflight | non-sensible auto-`approved` ; sensible (`approve_validation_item`) → `pending_validation`, `execute` avant validation refusé **423** |
| 5. Inbox validation | 1 item pending → `approved` via `POST validate`, exécution séparée → `completed` |
| 6. Proposer ressource candidate | 201 `candidate`, invisible liste par défaut, visible `include_all` (godmode) |
| 7. Valider candidate | `validated`, apparaît ensuite dans les sources par défaut |

Note : la ressource de test « Test run réel couches 5-12 » reste dans le runtime (BDD vivante,
pas le canon Drive) comme trace visible du run.

---

## 2026-06-08 — Frontend couche 12 : sync room instance

**Perimetre.** Persister le choix d'entree et le mode courant dans la room instance existante.

### Construit

- Client frontend `PUT /rooms/:id/instance`.
- Le sas d'entree persiste :
  - `active_surface` = intention choisie ;
  - `cognitive_density` = densite choisie ;
  - `widget_state.entry_profile`.
- Le rail de modes persiste `active_surface` et `widget_state.active_mode`.
- La Home Room affiche surface active, densite et etat de synchronisation.

### Invariant

Pas de nouveau backend : on consomme le contrat Room OS deja expose. Le localStorage reste un
fallback d'entree, mais la room instance devient le runtime partage.

### Validation

| Vérif | Résultat |
|---|---|
| `npm run lint:frontend` | OK |
| `npm run build:frontend` | OK |
| `npm run smoke:public` | OK health/front public ; auth skip car secrets non fournis |

---

## 2026-06-08 — Frontend couche 11 : validation Resource Truth

**Perimetre.** Boucler le cycle ressource candidate -> canon valide cote UI.

### Construit

- Client frontend `GET /resources?include_all=1` reserve admin/godmode.
- Client frontend `POST /resources/:id/validate`.
- Affichage separe des ressources candidates dans le panneau `Sources`, visible uniquement
  admin/godmode.
- Bouton `Valider` pour promouvoir une candidate au canon.
- Refresh du canon `validated` apres validation.

### Invariant

Les candidates restent separees des sources validees ; seuls admin/godmode chargent la vue
`include_all`.

### Validation

| Vérif | Résultat |
|---|---|
| `npm run lint:frontend` | OK |
| `npm run build:frontend` | OK |
| `npm run smoke:public` | OK health/front public ; auth skip car secrets non fournis |

---

## 2026-06-08 — Frontend couche 10 : proposition Resource Truth

**Perimetre.** Permettre au front de proposer une source sans l'ajouter au canon affiche.

### Construit

- Client frontend `POST /resources`.
- Formulaire compact dans le panneau `Sources` : titre, URL optionnelle, sujets.
- Une proposition cree une ressource `candidate`.
- La liste `Sources` continue d'afficher uniquement `GET /resources` par defaut, donc uniquement
  les ressources `validated`.
- Retour d'etat lisible avec id de candidate.

### Invariant

Une ressource candidate n'est jamais presentee comme source validee tant qu'un humain ne l'a pas
promue cote backend.

### Validation

| Vérif | Résultat |
|---|---|
| `npm run lint:frontend` | OK |
| `npm run build:frontend` | OK |
| `npm run smoke:public` | OK health/front public ; auth skip car secrets non fournis |

---

## 2026-06-08 — Frontend couche 9 : execution explicite apres validation

**Perimetre.** Fermer le cycle action cote UI sans transformer la validation humaine en
execution automatique.

### Construit

- Extraction d'un handler d'execution pour action deja `approved`.
- Les actions non sensibles continuent le cycle apres preflight `approved`.
- Les actions sensibles approuvees depuis l'inbox affichent un bouton `Executer` distinct.
- L'etat d'action garde le statut, le message et l'id de l'action courante.

### Invariant

Validation humaine et execution restent deux gestes separes pour les actions sensibles.

### Validation

| Vérif | Résultat |
|---|---|
| `npm run lint:frontend` | OK |
| `npm run build:frontend` | OK |
| `npm run smoke:public` | OK health/front public ; auth skip car secrets non fournis |

---

## 2026-06-08 — Frontend couche 8 : validation inbox

**Perimetre.** Brancher la surface de validation V1 sur le contrat backend existant.

### Construit

- Client frontend pour :
  - `GET /actions/pending` ;
  - `POST /actions/:id/validate`.
- Panneau `Validation` visible uniquement pour les roles `teacher`, `admin`, `godmode`.
- Rafraichissement de l'inbox apres chargement, creation d'une action en attente, approbation
  ou rejet.
- Decisions explicites : `Approuver` / `Rejeter`, avec note UI courte.
- Une action approuvee reste separee de l'execution : pas d'auto-run cache apres validation.

### Invariant

Les comptes sans role teacher+ ne chargent pas et ne voient pas l'inbox de validation.

### Validation

| Vérif | Résultat |
|---|---|
| `npm run lint:frontend` | OK |
| `npm run build:frontend` | OK |
| `npm run smoke:public` | OK health/front public ; auth skip car secrets non fournis |

---

## 2026-06-08 — Frontend couche 7 : cycle actions live

**Perimetre.** Brancher les chips d'actions live sur le contrat backend existant, sans action
sensible directe.

### Construit

- Client frontend pour :
  - `POST /actions` ;
  - `POST /actions/:id/preflight` ;
  - `POST /actions/:id/execute`.
- Clic action = creation d'une action `draft`, puis preflight obligatoire.
- Execution seulement si le backend renvoie `approved`.
- Si le backend renvoie `pending_validation`, l'UI s'arrete et affiche le role validateur requis.
- Retour d'etat lisible dans le widget principal : creation, preflight, attente validation,
  execution, completed ou failed.

### Invariant

Aucun chip n'execute directement une action sensible. Le backend reste l'autorite du cycle.

### Validation

| Vérif | Résultat |
|---|---|
| `npm run lint:frontend` | OK |
| `npm run build:frontend` | OK |
| `npm run smoke:public` | OK health/front public ; auth skip car secrets non fournis |

---

## 2026-06-08 — Frontend couche 6 : sas d'entree utilisateur

**Perimetre.** Ajouter l'entree runtime avant la Home Room, sans backend delta et sans ecriture canon.

### Construit

- Apres login, un utilisateur sans profil d'entree local passe par un sas court :
  - intention du jour ;
  - densite cognitive ;
  - preference de presence/persona.
- Le choix est persiste en `localStorage`, scope par `user.id`.
- L'intention choisie ouvre directement le mode correspondant dans la Home Room.
- Aucune action sensible, aucune ecriture backend, aucun secret.

### Note backend

La table `users` contient deja `preferences_json`, mais `UserSchema` / `CurrentContext` ne
l'exposent pas encore. Cette couche prepare le futur contrat sans l'inventer cote frontend.

### Validation

| Vérif | Résultat |
|---|---|
| `npm run lint:frontend` | OK |
| `npm run build:frontend` | OK |
| `npm run smoke:public` | OK health/front public ; auth skip car secrets non fournis |

---

## 2026-06-08 — Frontend couche 5 : Home Room situationnelle

**Perimetre.** Premier refactor UI depuis la doctrine MALEX, sans backend delta et sans action sensible.

### Construit

- Home Room recentree sur une situation lisible : modes disponibles, sources, actions live, persona.
- Rail de modes : Home, Teaching, Story, Project, Learning, Inventory, Admin selon role.
- Widget principal dynamique par mode, avec signal court et 1-3 actions utiles.
- Object deck contextuel par mode au lieu d'un catalogue de personas/features.
- Actions futures/verrouillees retirees de l'experience normale ; consultables seulement en godmode/debug.

### Intention

Cette couche reste volontairement sobre : elle pose la navigation canon `situation -> mode -> objet`
avant d'ouvrir les rooms specialisees ou les flows d'onboarding.

### Validation

| Vérif | Résultat |
|---|---|
| `npm run lint:frontend` | OK |
| `npm run build:frontend` | OK |
| `npm run smoke:public` | OK health/front public ; auth skip car secrets non fournis |
| Vite local `http://127.0.0.1:5174/` | HTTP 200 |

Note : capture Playwright non realisee car `playwright` n'est pas installe dans le workspace.

---

## 2026-06-08 — Synthese UI MALEX : situation avant fonctionnalites

**Contexte.** MALEX fournit une synthese UI issue d'un debrief : le frontend fonctionne
techniquement, mais ne doit pas devenir une interface deceptive ou un catalogue de boutons.

### Doctrine actee

- MasterFlow doit montrer la **situation**, pas les fonctionnalites disponibles.
- Premiere connexion : tunnel unique type mini Akinator -> profil -> preferences -> avatar /
  personnage canon si souhaite -> interface personnalisee.
- Navigation par zoom : accueil -> mode -> room -> objet -> detail.
- Les modes sont des univers : Teaching, Story, Project, Learning, Inventory, Admin/Godmode.
- Le widget principal est dynamique, choisi par le contexte actif.
- Les IA/engines doivent etre majoritairement invisibles.
- Clic et chat pilotent tous les deux l'interface.

### Patch

- Ajout `FRONTEND_UI_DOCTRINE.md`.
- Handoff Home Room recadre : situation summary, main widget dynamique, mode rail, object deck,
  1-3 actions.
- Login frontend : retrait du mot de passe pre-rempli obsolète.

---

## 2026-06-07 — Accès MALEX : bascule Funnel PUBLIC + durcissement secrets + intégration front

**Contexte.** Déblocage de l'accès distant de MALEX (toutes les voies privées Tailscale ont
échoué), puis validation + intégration du frontend Home Room de MALEX sur `main`.

### Diagnostic accès (voies privées épuisées)

- **Serve ne sert pas les nœuds partagés** (sharee) → `:8443`/`:10000` timeout pour MALEX.
- **IP tailnet directe** échoue aussi : `tailscale ping` OK mais TCP jamais établi ; `tcpdump`
  host = **0 paquet** de l'IP MALEX sur `tailscale0`, 0 conntrack. **Firewall écarté** (`ts-input`
  accepte tout le trafic tailscale, compteurs ; `netcheck` host sain). Cause = **plan de données
  Tailscale KO entre le NAT FAI de MALEX et la box** (les machines qui marchaient étaient toutes
  sur le LAN ; MALEX seul est distant, via DERP Paris).

### Décision (validée humainement par Vincent)

- **Exposer en Tailscale Funnel PUBLIC** : `:8443` (backend) + `:10000` (frontend). **`443` =
  Funnel API_manage, intact.** + **partage du compte godmode** avec MALEX (le classifier auto
  avait bloqué la génération de creds sans validation explicite → confirmée).

### Durcissement sécu (obligatoire avant ouverture publique, fait)

- `JWT_SECRET` **régénéré** : l'ancien fallback codé en dur (`dev-…-change-me`) permettait de
  **forger un token godmode** — prouvé par forge HS256 (`/me` 200 avant, 401 après) puis fermé.
- **Mot de passe godmode tourné** (défaut public `vincent/masterflow`).
- Les deux dans `apps/backend/.env` (gitignoré, `dotenv` chargé ; ⚠️ `tsx watch` ne recharge pas
  `.env` → **redémarrage backend requis**). Identifiants transmis **hors-bande** (jamais dans Git).
- Risque résiduel noté : `POST /auth/register` ouvert (crée rôle `student`).
- Nettoyage : 6 process backend orphelins (vieux `tsx` détachés) supprimés.

### Intégration frontend MALEX (couches 2-4) — validé + mergé

- Revue Home Room cockpit + chat WS + couche personas/registry (`App.tsx`, `api.ts`,
  `styles.css`) : conforme `@masterflow/shared`, invariants OK (buckets `status`, **1 speaker**,
  `method_attribution`, ressources `validated` only, `preflight_required` désactive le chip),
  `wss` derrière le funnel. Fast-forward `main` ← `codex` (pas de divergence), **live sur le
  funnel `:10000`** sans erreur. Note : login pré-remplit l'ancien mdp (mort) → à vider (public).

### Validation (run réel)

| Vérif | Résultat |
|---|---|
| Backend public `:8443/health` | 200 |
| Frontend public `:10000/` | MasterFlow servi |
| `:10000/api/v1/personas` (proxy) | 401 (backend joint) |
| `443` API_manage | 200 (intact) |
| Login godmode public (nouveau mdp) | 200 |
| Token forgé **ancien** JWT secret → `/me` | 401 (rotation OK) |
| Frontend `tsc --noEmit` + `vite build` | OK (30 modules) |

Refs : `ee77878` (funnel + secrets), `7da3a90` (fix doc risques), `f14509d` (validation front),
`b006df3` (clôture items inbox).

---

## 2026-06-07 — Runtime public : smoke test reproductible

**Périmètre :** réduire les tests manuels MALEX avant ouverture de l'interface.

### Ajouté

- Script `npm run smoke:public`.
- Vérifie sans secret :
  - backend public `/health` ;
  - frontend public `:10000`.
- Si `MASTERFLOW_USERNAME` et `MASTERFLOW_PASSWORD` sont fournis via l'environnement, vérifie aussi :
  - login via proxy frontend ;
  - `GET /context/current` ;
  - `GET /personas` ;
  - `GET /resources` ;
  - WebSocket `ping -> pong`.

### Règle sécurité

Le script ne contient aucun identifiant et n'affiche jamais le token. Les secrets restent hors Git.

### Validation 2026-06-07

| Vérif | Résultat |
|---|---|
| Smoke public sans secret | OK (`/health` + frontend `:10000`) |
| Smoke public authentifié | OK |
| Login | 200 · rôle `godmode` |
| `GET /context/current` | 200 · Home Room |
| `GET /personas` | 200 · 3 personas |
| `GET /resources` | 200 · 2 ressources validées |
| WebSocket | `ping -> pong` |

---

## 2026-06-07 — Frontend couche 4 : chat compact + WebSocket

**Périmètre :** ajouter la surface chat Home Room sans action sensible, sans écriture canon et
sans backend delta.

### Construit

- Client WebSocket frontend vers `/ws/{room_instance_id}?token=...`.
- États de connexion : `idle`, `connecting`, `connected`, `closed`, `error`.
- Support des messages backend existants :
  - `chat_start` ;
  - `chat_chunk` ;
  - `chat_end` ;
  - `pong` ;
  - `error`.
- Chat compact dans la Home Room :
  - tours utilisateur ;
  - streaming assistant ;
  - attribution système courte si une méthode secondaire est prêtée ;
  - formulaire désactivé tant que WS non connecté.

### Validation

| Vérif | Résultat |
|---|---|
| `npm run lint:frontend` | OK |
| `npm run build:frontend` | OK |
| Vite local `http://localhost:5174/` | HTTP 200 |

Note : test WS réel en attente d'un backend joignable (`localhost:8000` ou tailnet
`100.100.128.63:8000`).

---

## 2026-06-07 — Frontend couche 3 : Home Room canon compacte

**Périmètre :** recadrer l'écran connecté selon le handoff Home Room, sans backend delta et sans
exécuter d'action sensible.

### Construit

- Home Room recentrée sur :
  - room active ;
  - rôle/mode courant ;
  - persona porte-parole ;
  - 1 à 3 actions `live` utiles ;
  - sources validées depuis `GET /resources`.
- Les actions `future` restent visibles comme verrouillées ; les actions `out_of_scope` ne sont
  plus exposées dans l'expérience normale.
- Le panneau debug n'apparaît qu'en rôle `godmode` et sert à compter `live` / `future` /
  `out_of_scope`, sans ouvrir Owner Ops fonctionnel.
- Ajout client frontend `GET /resources` pour amorcer le `source_truth_strip`.

### Validation

| Vérif | Résultat |
|---|---|
| `npm run lint:frontend` | OK |
| `npm run build:frontend` | OK |
| Vite local `http://localhost:5174/` | HTTP 200 |

Note : screenshot Playwright non réalisé car `playwright` n'est pas installé dans le workspace.

---

## 2026-06-07 — Inbox MALEX : rebase main clôturé

**Contexte.** Vérification après audit Drive canon avant reprise frontend.

- `origin/main` est bien ancêtre de `codex/frontend-masterflow`.
- La demande inbox « rebaser sur main à jour » est donc traitée, pas bloquante.
- `INBOX_MALEX.md` passe l'entrée correspondante de `open` à `done`.
- Prochaine étape : frontend couche 3, Home Room canon compacte.

---

## 2026-06-07 — Audit Drive canon + verrouillage cohérence V1

**Contexte.** MALEX demande un audit du MASTERFLOW canon sur Drive avant de continuer les
opérations GitHub/frontend.

### Lu côté Drive

- `START_HERE_FOR_AI_AND_DEVS_MASTERFLOW.md`
- `START_HERE_VINCENT_CLAUDE_UI_MASTERFLOW.md`
- `PROTOCOLE_AUDIT_VINCENT_MASTERFLOW_A_LIRE_EN_PREMIER.md`
- `01_CORE/MASTERFLOW_ACTIVE_CONTRACT_INDEX.md`
- contrats clés UI/permissions/Owner Ops/sync/runtime action surface

### Verdict

- Drive MASTERFLOW reste la source canon produit ; GitHub reste la source technique du code.
- Le Drive décrit MasterFlow complet. La V1 GitHub doit rester en couches courtes : contrat,
  endpoint, permission gate, UI surface et validation avant toute feature.
- Factories/backflows existent dans le canon global mais restent **hors scope V1 backend/frontend**
  dans cette version.
- Godmode / Owner Ops est cohérent si gate strict `godmode`, jamais teacher/student/client, et
  sans bypass audit/preflight.
- Prochaine UI : traiter l'état actuel comme couche d'intégration/debug et évoluer vers une
  Home Room contextuelle compacte, pas un dashboard permanent.

### Patch documentaire

- `CLAUDE.md` : clarification Drive canon vs V1 GitHub + port frontend `5174`.
- `BACKEND_INTEGRATION_MAP.md` : retrait des mentions périmées PoC/seed/vulnérabilités/Owner Ops.
- `FRONTEND_SCREEN_HANDOFF_HOME_ROOM.md` : handoff minimal avant couche UI suivante.

---

## 2026-06-07 — Sync GitHub + Q6 tranchée : godmode étendu (confirmé humainement)

**Contexte.** Sync depuis GitHub : `main` fast-forward sur `claude/gitlab-audit-suivi-6PjDS`
(frontend MALEX `apps/frontend`, infra sync, seed + champ `status`, PoC retiré, sécu vitest
4.1.8 / `npm audit` 0 vuln). Réponse à **la question clé backend** de MALEX (`VINCENT_BACKEND_SYNC_2026-06-06.md`, Q6).

### Aller-retour Q6 (tracé honnêtement)

1. Première validation humaine de Vincent : **Owner Ops strict** → commit `7322e61`, poussé.
2. Découverte : `codex/frontend-masterflow` avait poussé du contenu non lu (demande Tailscale +
   réassertion **godmode étendu** s'attribuant la validation de Vincent).
3. Vincent **tranche à nouveau, en connaissance de cause : godmode étendu** (position MALEX/codex
   retenue). → `git revert 7322e61` + sceau « confirmé humainement 2026-06-07 ».

### Décision finale (validée humainement)

- **Q6 = godmode étendu.** En rôle `godmode`, l'UI peut **exécuter des actions** ET
  `owner_ops_private_diagnostic` est **exposé** (quand le backend l'implémentera). **Gate strict
  `godmode`**, jamais teacher/student. Lève le cloisonnement strict Owner Ops de la 1re carte.
  L'UI ne présente rien comme fonctionnel avant contrat + endpoint réels. Owner Ops pas encore
  codé backend.
- Q1–Q5 inchangées et confirmées (champ `status` ; seed aligné sur les endpoints réels ;
  `user_runtime_loadout` hors V1 ; `GET /actions/pending` teacher+ ; endpoints lourds `future`).
- **Tailscale** : accès tailnet **accordé** à MALEX (Serve, pas de Funnel/port public) ; entrée
  de confirmation dans `SYNC_THREAD_MALEX_VINCENT.md` (hostname MagicDNS à compléter par Vincent).
- Branches distantes `claude/*` et `codex/*` : **conservées** (pas de suppression, sur consigne
  Vincent) ; codex porte des entrées doc à rebaser sur le `main` à jour.
- Gouvernance inbox précisée : Vincent peut déposer des demandes dans `INBOX_MALEX.md`, mais
  MALEX conserve la validation humaine obligatoire avant toute application ou exécution.
- Rebase MALEX sur `main` + node-share `95faee7` reçus. Test Tailscale : DNS tailnet OK
  (`100.100.128.63`) mais ports Serve `8443`/`10000` en timeout depuis MALEX ; demande ouverte
  dans `INBOX_VINCENT.md`.
- Push `070688e` reçu : test IP directe. `tailscale ping 100.100.128.63` OK (22 ms), mais
  `http://100.100.128.63:8000/health` et `:5174` timeout ; demande host/bind/firewall ouverte
  dans `INBOX_VINCENT.md`.
- Règle de sync renforcée : avant toute réponse MALEX sur état Vincent/backend/Tailscale,
  Codex doit refaire un check distant (`git fetch origin` + dernier `origin/main`) pour éviter
  les réponses caduques si Vincent pousse pendant le tour.

### Validation (état synchronisé, run réel)

| Vérif | Résultat |
|---|---|
| `npm install` | OK · **0 vulnérabilité** |
| Backend Vitest (v4.1.8) | **13/13** |
| Backend `tsc --noEmit` | 0 erreur |
| Frontend MALEX `vite build` | OK · 30 modules / 198 KB |

---

## 2026-06-07 — Frontend couche 2 : personas, actions, états réseau

**Périmètre :** avancer côté MALEX sans dépendre du backend distant encore bloqué sur les ports
tailnet. Aucun backend delta, aucune action sensible déclenchée.

### Construit

- Client frontend enrichi avec `GET /personas` et `GET /actions/available`.
- Home Room affiche maintenant :
  - contexte courant ;
  - personas disponibles ;
  - porte-parole actif si un blend est présent ;
  - registre d'actions groupé `live` / `future` / `out_of_scope` ;
  - état réseau avec retry manuel.
- Les actions `out_of_scope` restent masquées visuellement ; les actions `future` sont affichées
  comme non fonctionnelles.

### Note

- Le test réel `login → context/personas/actions` attend toujours que `100.100.128.63:8000`
  et `:5174` répondent depuis MALEX.

---

## 2026-06-06 — Intégration MALEX : réconciliation, alignement seed, réponses de sync

**Contexte.** MALEX a poussé `codex/frontend-masterflow` (6 commits) : workspace `apps/frontend`,
carte d'intégration, protocole d'inbox/sync, modif `CLAUDE.md`. Branche basée sur le commit
initial → divergente de `main`. Intégration et réponses faites sur `claude/gitlab-audit-suivi-6PjDS`.

### Fait

- **Réconciliation** : merge de `origin/codex/frontend-masterflow` (auto-merge propre, aucun
  marqueur de conflit ; `SUIVI.md` et `CLAUDE.md` fusionnés sans perte).
- **PoC retiré** (décision Vincent : frontend prioritaire à MALEX). Suppression de
  `packages/poc-frontend`, retrait du workspace + script `dev:poc`, nettoyage `CLAUDE.md`/`README.md`.
  `apps/frontend` (MALEX) devient le **seul** frontend.
- **Alignement seed ↔ endpoints réels** (question MALEX #2) : `preflight_action` →
  `POST /actions/{action_id}/preflight`, `approve_validation_item` → `POST /actions/{action_id}/validate`.
- **Flag de capacité** (question MALEX #1) : champ `status` (`live`/`future`/`out_of_scope`)
  ajouté à `ActionRegistryEntrySchema` (`packages/shared`) + tagué dans le seed. L'UI sait quoi
  afficher comme fonctionnel / verrouillé / masqué. Default prudent `future`.
- **Réponses de sync** : feu vert couche 1 + réponses aux 6 questions backend rédigées dans
  `INBOX_VINCENT.md`, `SYNC_THREAD_MALEX_VINCENT.md`, `INBOX_MALEX.md` (brouillons via Claude ;
  lancement backend = acte humain de Vincent).
- **Réponses validées par Vincent (QCM)** : Q1 = champ `status` seul ; Q2 = aligner le seed
  sur le réel ; Q3 = `user_runtime_loadout` hors V1 ; Q4 = `GET /actions/pending` suffit ;
  Q5 = endpoints lourds plus tard (`future`) ; Q6 = **godmode étendu** (cf. ci-dessous).
- **Sécu** : montée `vitest` `^2.1.0` → `^4.1.8` (corrige l'advisory critique vitest `<4.1.0`
  + chaîne esbuild/vite dev-server, **dev-only**), puis `npm audit fix` non destructif →
  **`npm audit` = 0 vulnérabilité**. Aucun `npm audit fix --force`.

### Validation

| Vérif | Résultat |
|---|---|
| Backend `tsc --noEmit` | 0 erreur |
| Frontend MALEX `tsc --noEmit` | 0 erreur |
| Backend Vitest (v4.1.8) | 13/13 |
| `npm audit` | 0 vulnérabilité |
| Merge `codex/frontend-masterflow` | auto-merge propre, sans conflit |

### Décisions / notes

- `user_runtime_loadout`, validation inbox dédiée, endpoints `/da` `/assets` `/inventory`
  `/subjects` : **hors V1** (anti-scope). Backflow/factories : `out_of_scope`.
- **godmode étendu** (décision Vincent, QCM) : en rôle godmode l'UI peut exécuter des actions
  **et** `owner_ops_private_diagnostic` est exposé — gated rôle godmode uniquement (jamais
  teacher/student). Lève le cloisonnement strict Owner Ops de la 1re carte d'intégration.
- Le contrat REST réel reste l'autorité ; on aligne les métadonnées descriptives du seed dessus.

---

## 2026-06-06 — Frontend couche 1 : shell MALEX minimal

**Périmètre :** création du vrai workspace frontend MALEX, sans backend delta, sans lancement du backend, sans UI finale.

### Construit

- Ajout de `apps/frontend` comme workspace npm.
- Ajout des scripts root :
  - `dev:frontend` ;
  - `lint:frontend` ;
  - `build:frontend`.
- Frontend React/Vite/TypeScript minimal :
  - écran login ;
  - client REST typé vers `/api/v1` ;
  - stockage du token en mémoire ;
  - appel `GET /context/current` ;
  - affichage sobre du user, rôle, room, surface active et nombre d'actions disponibles.

### Validation

| Vérif | Résultat |
|---|---|
| Frontend `tsc --noEmit` | 0 erreur |
| Frontend `vite build` | OK · 30 modules / 198 KB JS |
| Backend Vitest | 13/13 |
| Backend `tsc --noEmit` | 0 erreur |

### Décisions / notes

- Cette couche prouve l'intégration workspace + contrat REST sans présumer des endpoints futurs.
- Aucun backend lancé et aucune modification backend.
- Les widgets chat, personas, actions, validation inbox et ressources seront ajoutés un par un.

---

## 2026-06-06 — Sync MALEX/Codex : baseline + carte d'intégration

**Périmètre :** reprise côté MALEX sur la branche `codex/frontend-masterflow`, sans modification backend ni lancement du serveur.

### Fait

- Relu `CLAUDE.md` et `SUIVI.md` avant action.
- Installé les dépendances du repo.
- Vérifié la baseline locale :
  - `npm test` OK : 13/13 ;
  - `npm run lint` OK ;
  - backend non lancé, conformément à la consigne human-in-the-loop.
- Créé `BACKEND_INTEGRATION_MAP.md` : carte pré-code des modules, tables, endpoints réels, gates, risques et plan de PRs courtes.
- Créé `VINCENT_BACKEND_SYNC_2026-06-06.md` : note courte à envoyer à Vincent pour clarifier les besoins backend avant frontend complet.
- Mis en place par MALEX : un système de conversation asynchrone via Git et fichiers suivis, initialisé dans `SYNC_THREAD_MALEX_VINCENT.md`.
- Ajout du protocole inbox systématique pour Vincent/MALEX : `CLAUDE.md`, `INBOX_VINCENT.md`, `INBOX_MALEX.md` et `SYNC_THREAD_MALEX_VINCENT.md`.
- Commit + push de la branche `codex/frontend-masterflow`.

### Décisions / notes

- Les factories / bots extraits sont hors scope de cette version.
- Le frontend complet doit avancer par couches : contrat/backend vérifié d'abord, intégration minimale ensuite, UI finale en dernier.
- Toute retouche backend éventuelle doit passer par mapping engine / contrat / données / permissions / gates avant code.
- Les échanges structurants MALEX / Vincent / Codex doivent être tracés dans Git quand ils impactent le run, le backend, le frontend ou les décisions de périmètre.
- Règle opérationnelle : avant toute reprise ou action structurante, checker `SUIVI.md`, `SYNC_THREAD_MALEX_VINCENT.md`, puis l'inbox dédiée.

### Points à clarifier avec Vincent

- Alignement entre le seed d'actions et les endpoints réellement exposés.
- Existence souhaitée d'un `capabilities` endpoint ou de champs `implemented/status/locked/ui_enabled`.
- Forme minimale éventuelle de `user_runtime_loadout`.
- Suffisance de `GET /actions/pending` comme validation inbox V1.
- Frontière exacte entre `godmode` visible dans l'UI et diagnostics privés Owner Ops.

---

## 2026-06-06 — MVP backend + PoC : livrés et validés

**Périmètre :** backend (livrable principal) + PoC frontend de démonstration. Le frontend complet reste à MALEX.

### Construit

**Phase 0 — Squelette.** Monorepo npm workspaces (`apps/backend`, `packages/shared`, `packages/poc-frontend`). SQLite via better-sqlite3 (singleton WAL+FK, migrations idempotentes). Schéma MVP : `users`, `revoked_tokens`, `rooms`, `room_instances`, `personas`, `persona_blends`, `actions`, `audit_logs`, `resources`, `global_settings`, `token_events`. Seed idempotent (godmode `vincent`, 3 personas, room Home, ressources). `GET /health`.

**Phase 1 — Auth + Contexte.** JWT Bearer (`signToken`/`verifyToken`, `requireUser`/`requireRole`, révocation par `jti`). `POST /auth/{register,login,logout}`, `GET /auth/me`. `GET /context/current` (user+room+instance+personas+blend actif+actions dispo). Rooms + room_instances (création paresseuse).

**Phase 2 — Personas + Chat + Blend.** `GET /personas`, `POST /personas/{id}/activate`, `POST/PUT/DELETE /personas/blend`. **Chimère** = fusion visuelle + 1 porte-parole (primaire) ; `computeHybridVoice` (overlay de méthode attribué) ; `methodAttribution`. **WebSocket chat streaming** (`routers/ws/chat.ts`) : auth à l'upgrade, `chat_start → chat_chunk → chat_end`. `services/llm.ts` (mock + OpenAI-compat SSE).

**Phase 3 — Action router.** Cycle `draft→preflight→pending_validation→approved→executing→completed` (`action_engine`). `GET /actions/available` (depuis le seed), `POST /actions`, `/preflight`, `/validate` (teacher+), `/execute`, `GET /actions/pending`. `risk_level` statique. Tout tracé dans `audit_logs`.

**Phase 4 — Anti-hallucination.** `resource_truth` : `GET /resources` ne sert que les `validated` ; `POST /resources` → `candidate` ; `POST /resources/{id}/validate` (teacher+). `include_all=1` réservé admin/godmode.

**Contrat MALEX.** `packages/shared` (Zod) : tous les payloads REST + messages WS. Ajout de `SearchResourcesResponseSchema` (`{results,total}`), seule réponse non typée.

**PoC front.** React 19 + Vite 6. `BlendCanvas` (métaballs WebGL `smoothMin`, creep Zerg, respecte `prefers-reduced-motion`), `api.ts` (REST typé), `useChatWs.ts` (hook streaming), `App.tsx` (harness login → contexte → chat streaming → slider de fusion ProfKrapu⇄Corrector).

**Tests.** Vitest niveau engine (`:memory:`) : auth/rôles, cycle de vie action (dont 423 avant validation, rejet, rôle insuffisant), anti-hallucination, invariant blend. **13/13.**

### Corrections de ce tour (reprise après workflow interrompu)

- Écrit le **router WS `ws/chat.ts`** (manquait) + recâblé `index.ts` (http server + montage REST + WS).
- Corrigé **10 erreurs `tsc`** (`noUncheckedIndexedAccess` sur `req.params.id`) dans `personas.ts`/`rooms.ts`.
- **Réconcilié les contrats du PoC** : `App.tsx` (généré en parallèle) attendait des signatures différentes de `api.ts`/`useChatWs.ts` → aligné (`api` agrégé, `login` positionnel, `updateBlend` poids bruts, `currentSpeaker`/`status`/`role:'assistant'`/`method_attribution`, `import App` default).

### Validation (run réel, pas seulement compilation)

| Vérif | Résultat |
|---|---|
| Backend `tsc --noEmit` | 0 erreur |
| Backend Vitest | 13/13 |
| PoC `tsc` + `vite build` | 0 erreur · 32 modules / 209 KB |
| Boot + `/health` | `users:1 personas:3 rooms:1 resources:3` |
| Login godmode → JWT | OK |
| Cycle action complet | draft→preflight→pending→approve→execute→completed |
| **Invariant** execute avant validation | **HTTP 423 `not_approved`** |
| Trace audit | `action_created→preflight→validation→execute_start→execute_completed` |
| Anti-hallucination `/resources` | 2 `validated` ; `include_all` (godmode) → 3 ; proposition → `candidate` |
| WS streaming | `chat_start` → 127 chunks → `chat_end` |
| Chimère via WS | speaker = **ProfKrapu** + `method_attribution = "méthode inspirée de Corrector"` |

### Décisions / notes

- Le **seed** (`action_registry_seed.v1.json`) prime sur `API_DESIGN.md` pour `action_id`/surfaces/risk.
- « SIMULATION PURE » traité comme dry-run (preflight actif, exécution mockée).
- Exécution d'action **mockée** au V1 (pas de runner réel).
- LLM `mock` par défaut.

### Reste à faire (hors MVP, selon souhait de Vincent)

Tauri shell (`apps/desktop`) · brancher un vrai LLM · phases 2+ des specs (multi-room, correction, ComfyUI, OCR) — **explicitement hors MVP**.

---

## 2026-06-06 (suite) — Lancement & corrections du rendu PoC

**Contexte.** Lancement effectif : backend (`:8000`) + PoC Vite (`:5173`) exposés sur le tailnet (`vite --host 0.0.0.0`), accès `http://100.100.128.63:5173` (le PoC proxifie REST `/api` + WS `/ws` vers le backend local → un seul port à partager). Démo testée **en conditions réelles** avec Vincent (navigateur sur Mac). Une chaîne de bugs d'intégration du PoC, invisibles à la compilation, a été trouvée et corrigée en run.

### Bugs trouvés & corrigés (PoC frontend)

1. **CSS désynchronisé.** `styles.css` ciblait d'anciennes classes (`.mf-canvas`/`.mf-harness`/`.mf-panel`) absentes du DOM réel d'`App.tsx` → aucune mise en page, canvas à 0 px → écran noir. **Fix :** `styles.css` réécrit pour le vrai arbre (`.screen--room`, `.room-overlay`, `.speaker-banner`, `.blend-control`, `.chat*`) + canvas plein écran (`position:fixed`).

2. **Shader WebGL — `fwidth()` sans extension.** Le fragment shader appelait `fwidth()` sans déclarer `GL_OES_standard_derivatives` → rejeté par les compilateurs GLSL stricts. **Fix :** anti-aliasing recalculé depuis `u_resolution` (1 px ≈ `1/min(res)`), retrait de `#version 100`, `highp`→`mediump` (compat max).

3. **StrictMode + `loseContext` (cause racine du « log vide / inconnue »).** Le cleanup appelait `WEBGL_lose_context.loseContext()`. Or `canvas.getContext('webgl')` rend toujours le **même** contexte ; sous React StrictMode (double montage en dev), le remontage récupérait un contexte **détruit** → compilation impossible, info-log vide. **Fix :** plus de `loseContext` au cleanup (le GC libère le contexte) ; `display:block` + reset d'erreur à chaque montage.

4. **Dégradation propre.** Si WebGL indisponible/échoue : canvas masqué + **fond CSS dégradé** (halos vert ProfKrapu / violet Corrector) au lieu de noir, et **bandeau d'erreur visible à l'écran** (diagnostic sans console). Un disjoncteur localStorage a été testé puis **retiré** (bloquait à tort une fois le shader réparé).

5. **Bruit console.** Favicon inline (`<link rel="icon" href="data:,">`) → fin du 404. Warning CSP `eval` identifié comme **externe** (extension navigateur) : aucun header CSP côté serveur, aucun `eval` dans le PoC.

### Vérifs
`tsc --noEmit` PoC : 0 erreur. Backend `/health` vert via Tailscale. Login godmode + modules (shader) servis OK via le proxy.

### Note exploitation
Lancement du backend = **human in the loop** (Vincent). Backend bind `*:8000`, Vite `--host 0.0.0.0`.
