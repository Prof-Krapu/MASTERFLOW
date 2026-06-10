# SUIVI — MasterFlow

Journal de construction. Le quoi/pourquoi, daté et concis.

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
