# INBOX MALEX — MasterFlow

Objectif : point d'entrée court pour les demandes Vincent/Codex à traiter côté MALEX.

Règles de lecture :

- à checker systématiquement avant reprise frontend, décision de périmètre, validation humaine ou réponse de sync ;
- traiter les entrées du haut vers le bas ;
- une entrée peut être `open`, `answered`, `blocked` ou `done` ;
- une réponse IA ne vaut pas validation humaine ;
- Vincent peut déposer ici toute demande, mais elle reste une proposition `open` jusqu'à
  validation humaine explicite de MALEX ;
- sans cette validation, Codex/Claude peut analyser et préparer un patch, mais ne doit ni
  appliquer, ni exécuter, ni déployer, ni modifier les permissions ou le périmètre ;
- si une entrée implique backend, frontend, run ou périmètre, répondre dans `SYNC_THREAD_MALEX_VINCENT.md` ou par commit Git explicite.

---

## 2026-06-13 — done — Multi-utilisateur réel sur ta fondation Project/Scope + 🐛 fix gate-ordering (impacte TES routeurs)

Vincent → MALEX/Codex. **GO Vincent « rendre l'app multi-utilisateur ».** Mergé sur `main` (voir SUIVI, entrée
« Multi-utilisateur RÉEL »). Construit **sur ta fondation** (pas reconstruit) :
- `GET /projects/:id/resources` (tout membre voit les ressources partagées) + `POST /projects/:id/resources`
  (owner/admin projet) — ton service `attachResourceScope` existait mais n'avait **aucune route** : comblé.
  Réutilise `decideScopedPermission`/`resource_scopes`. Contrat additif `AttachProjectResourceRequestSchema`.

**🐛 IMPORTANT POUR TOI — bug corrigé qui impactait TOUS tes routeurs racine.** `diagnostics` et `admin` (les miens)
faisaient `router.use(requireRole('admin'))` **sans path**. Montés à la racine `/api/v1` AVANT
`projects`/`jobs`/`schema_templates`/`guided_runtime`/`rag`, ce middleware bloquait **toute** requête non-admin
traversante (Express exécute le `router.use` de chaque routeur traversé). Donc côté **serveur réel** (`index.ts`),
un teacher/student recevait `403 forbidden` sur tes endpoints projets/jobs/rag — alors que tes tests isolés
passaient (un seul routeur monté). **Corrigé** en scopant les gates à `/diagnostics` et `/admin`. Garde ce piège en
tête : un `router.use(mw)` sans path dans un routeur monté à la racine s'applique à tout le trafic qui le traverse.
J'ai ajouté `tests/router_gating_integration.test.ts` (monte plusieurs routeurs dans l'ordre de `index.ts`).

`vitest` 200/200 ✓. Frontend (UI projets) = ton territoire, non touché. Notif de sync, pas une auto-validation.

---

## 2026-06-13 — answered — Clôture fondations PR-1→9 : réponse + axe + consigne rebase

Vincent → MALEX/Codex. Réponse complète dans `SYNC_THREAD_MALEX_VINCENT.md` (entrée 2026-06-13 clôture fondations).
En bref : **OK sur la clôture** ; **axe retenu = ③ Project/Scope réel** (ta reco) ; **PR-C0 Corrector déprécié
accepté** (aucune dépendance côté nos features récentes). **⚠️ Avant toute intégration sur `main` : rebase
`codex/frontend-masterflow` sur `main` (`be04d77`)** — il te manque PR-2, PR-3 (admin invitations/rôles/monitoring,
**register invite-only**) et vite 6→8 / 0 vuln. Conflits additifs sur 6 fichiers (liste dans le sync). Pas une
auto-validation : tu confirmes côté humain.

---

## 2026-06-13 — done — PR-3 intégrée sur `main` : admin API_manage + monitoring API_corrector

Vincent → MALEX/Codex. **Notification de sync, pas une auto-validation** (réponse IA ≠ validation humaine).
**Vincent (humain) a tranché d'avancer sans son GO téléphonique**, puis **a donné le GO push** : PR-3 est
**mergée fast-forward sur `main` (`cf5cfcb`) et poussée sur `origin/main`**. Tu la récupères en `git pull`.
**Ton action à ta reprise** : revoir/reprendre/restyler le PoC frontend (ton territoire) et acter le point register
invite-only ci-dessous.

**Ce qui est fait (détail dans `SUIVI.md`, entrée 2026-06-13 PR-3) :**
1. **Invitations / codes d'accès** : table `invitations` + `routers/admin.ts` (`GET /admin/users`,
   `GET|POST /admin/invitations`, `…/:code/revoke`), gated admin/godmode. Code capé au rang du créateur.
2. **Inscription sur invitation** — ⚠️ **CHANGEMENT DE COMPORTEMENT À CONNAÎTRE CÔTÉ FRONT** : `POST /register`
   exige maintenant un `invite_code` valide (403 `invite_required` sinon) ; le rôle vient du code. Le register
   « libre » (rôle student auto) est **fermé** → surface publique durcie (cohérent funnel public). Si ton UI a un
   écran d'inscription ouvert, il faut le passer en « inscription par code » (un composant PoC `register-form.tsx`
   montre le flux).
3. **Changement de rôle = ACTION SENSIBLE** `set_user_role` (validator **godmode uniquement**). Un admin peut
   *proposer* (l'action attend dans l'inbox de validation) ; **seul godmode valide+exécute**. Garde-fous : pas son
   propre rôle, pas de rétrogradation du dernier godmode.
4. **Monitoring usage/coût (API_corrector)** : pas de nouvel endpoint backend (réutilise `GET /diagnostics/token-usage`
   PR-1, group_by day/model/task/user). La **dataviz** est côté front.

**🟡 Périmètre frontend = TON territoire.** J'ai ajouté un **PoC** dans `apps/frontend` (`admin-console.tsx`,
`register-form.tsx`, +5 fns `api.ts`, dépendance **recharts**, montage minimal dans `App.tsx` derrière `canAdmin`).
C'est une **preuve de concept fonctionnelle** (le câblage/les invariants sont backend) : **à toi de la revoir,
restyler, ou la refaire** selon ta direction UI. Rien d'imposé sur le rendu.

**À ta connaissance :**
- `npm audit` : ~~3 high (dev `esbuild`/`vite`)~~ **→ RÉSOLU (ton GO reçu)** : **vite 6→8** (`@vitejs/plugin-react` 4→6),
  `esbuild 0.28.1` → **0 vuln**. Build vite 8 (rolldown) + dev server vérifiés ; `vite.config.ts` inchangé.
  ⚠️ vite 8 exige **Node ≥ 20.19 / 22.12** — assure-toi d'être à jour côté ta machine.
- Bundle front ~598 KB (recharts) → warning de chunk attendu (PoC).

**Statut `done`** (intégré + poussé sur `origin/main`, GO Vincent 2026-06-13) : tu revois/corriges/restyles à ta
reprise — notamment le PoC frontend (ton territoire). Si tu n'es pas d'accord sur un point (register invite-only,
recharts, surface admin), dépose ta remarque ici ou dans `SYNC_THREAD_MALEX_VINCENT.md`.

---

## 2026-06-12 — done — Audit absorption : périmètre resserré → 2 features prioritaires
## 2026-06-12 — answered — Audit absorption : périmètre resserré → 2 features prioritaires

> **VALIDATION HUMAINE MALEX, 2026-06-12.** PR-1 « suivi token réel + endpoint diagnostic
> admin/godmode » approuvée et conservée sur `main` au commit `1b08b38`. La confiance est
> confirmée directement avec Vincent.
>
> **GO HUMAIN MALEX, 2026-06-12.** PR-2 « écriture settings admin » validée pour
> implémentation selon `SPEC_PR_PRIORITAIRES.md` : action sensible `set_global_setting`,
> permission check, preflight, validation admin, allowlist stricte, secrets hors BDD, audit
> et tests. Aucun élargissement de périmètre implicite.

Vincent → MALEX/Codex. **Proposition initiale, désormais validée pour les PR-1 et PR-2.**

Suite au pilote 3 projets, Vincent resserre l'audit sur **2 features prioritaires** (godmode-only,
jamais teacher/student ; garde-fous : surface diagnostic privée par défaut, auditable, sans effet sur
le runtime user) :

1. **Console admin API_manage** → `ABSORB_AND_ADAPT` sur `permission_runtime` / `ADMIN_PERMISSION_COCKPIT`
   + admin drawer `ui_room_os`. `global_settings` (admin-write) vs `user_storage` (privé) mappe direct sur
   « données privées par défaut » + `PERMISSION > PREFERENCE`. **Écriture settings globaux = action sensible**
   (preflight → validation + audit).
2. **Suivi token** (API_manage + API_corrector) → `IMPROVE_EXISTING_OWNER` (reclassé après vérif `main` :
   la table `token_events` **existe déjà** — `schema.ts:178-189` — et est **écrite à chaque appel LLM**
   — `services/llm.ts:54-84`). Manquent : consommer le **`usage` réel** du provider au lieu d'estimer
   (`llm.ts:43`), granularité **par tâche** (OCR/barème/correction, `task` figé `'chat'` aujourd'hui),
   `cost_eur`, et **endpoint gated** de lecture projeté godmode/admin (cohérent Q6). Diagnostic privé,
   jamais teacher/student.

Les deux sans nouvel engine (1 = câblage neuf sur table `global_settings` existante, derrière le cycle
d'action sensible ; 2 = patch du service `llm` + endpoint gated, rattaché à `godmode_debug_runtime` +
audit). **Audit only, aucun code avant ta validation humaine.** Message complet : `SYNC_THREAD` (entrée
2026-06-12 périmètre resserré). Vérifs code dans `AUDIT_ABSORPTION_PILOTE_3PROJETS.md` § « Vérifs contre `main` ».

**Spec détaillée prête (sans code) : `SPEC_PR_PRIORITAIRES.md`** — contrats, fichiers, permissions, tests et
ordre des 2 PRs. Prête pour ta validation ; à ton GO seulement, je passe à l'implémentation (branche `claude/*`).

**MàJ 2026-06-13 — PR-1 (suivi token) LIVRÉE** (`1b08b38`, intégrée sur `main`). Branche `claude/pr1-token-usage`.
`GET /diagnostics/token-usage` gated admin/godmode ; usage réel + fallback ; coût ; `view_token_usage` live.
`vitest` 21/21 ✓.

**MàJ 2026-06-13 — PR-2 (écriture settings admin) LIVRÉE + intégrée sur `main`** (`7b32573`, validée
Vincent 2026-06-13). `set_global_setting` cycle complet : `draft→pending_validation→admin-approve→completed`.
`validatorRoleFor` lit `validator_role` du registre ; dispatcher `ACTION_EXECUTORS` ; engine `settings.ts`
(allowlist + UPSERT + diff) ; défense en profondeur (assert admin à l'exécution) ; `shared` : `validator_role?`
additif + `SetGlobalSettingSchema`. `vitest` 37/37 ✓ · `tsc --noEmit` ✓ · `vite build` ✓ (32 modules).

---

## 2026-06-12 — done — Couche 14 (auditabilité des actions) revue + intégrée sur `main`

Vincent → MALEX/Codex.

Ta couche 14 « auditabilité des actions » (`action-audit.tsx`) est **revue, validée et intégrée**.
Fast-forward propre : `main` `0016b6c` → `6f96de5` (ton commit avait déjà `0016b6c` pour parent,
donc tu étais bien rebasé — rien à refaire de ce côté).

- **Contrat respecté** : `ActionAudit` ne lit que des champs réels de `@masterflow/shared` `Action`
  (`preflight.*`, `validator_id`, `updated_at`, `validation_note`, `result`, `error`, `status`).
  Aucun champ inventé, l'UI ne reconstruit pas d'audit log — elle affiche l'état courant.
- **Anti-hallucination renforcée** : suppression des notes auto `'validation UI MasterFlow'` /
  `'rejet UI MasterFlow'` ; la note n'est transmise que si non-vide. Exactement la bonne lecture
  de l'invariant.
- **Invariant tenu** : validation et exécution restent deux gestes séparés ; aucun backend ni
  contrat touché.

Checks côté Vincent : `tsc --noEmit` ✓ · `vite build` ✓ (32 modules) · backend `vitest` 16/16 ✓ ·
`git diff --check` ✓.

**Action : rebase `codex/frontend-masterflow` sur `origin/main` (`6f96de5`) avant ta prochaine
couche.** Le run du panneau authentifié sur le runtime public est human-in-the-loop (backend
lancé par Vincent) — dis-moi quand tu veux que je le tourne. Détails dans
`SYNC_THREAD_MALEX_VINCENT.md` (entrée 2026-06-12 couche 14).

---

## 2026-06-12 — done — Couche 13 (modes runtime) revue + intégrée sur `main`

Vincent → MALEX/Codex.

Ta couche 13 « modes fondés sur le runtime réel » est **revue, validée et intégrée**.
`main` fast-forwardé `69979cb` → `1e7bbdd` (clôture rebase `3860f2f` + refactor `1e7bbdd`).

- Extraction propre dans `apps/frontend/src/mode-runtime.ts` : types, `WORK_MODES`,
  `DEFAULT_WORK_MODE`, `canUseMode`, `buildModeView` sortis d'`App.tsx`, comportement préservé.
- **Doctrine respectée** : suppression des objets fictifs (classes, élèves, sujets, histoires,
  arcs, scènes, timeline, tâches) ; Teaching/Story **signalent explicitement** l'absence d'objets
  métier backend au lieu de les simuler. C'est exactement « app visible ≠ engine active » +
  anti-hallucination.
- Invariants OK : aucun backend touché, candidates Resource Truth réservées admin/godmode (deck
  Admin uniquement), sources par défaut = `validated`, `canUseMode` inchangé (Admin gated
  admin/godmode).

Checks côté Vincent : `tsc --noEmit` ✓ · `vite build` ✓ (31 modules) · backend `vitest` 16/16 ✓ ·
`git diff --check` ✓.

**Action : rebase `codex/frontend-masterflow` sur `origin/main` (`1e7bbdd`) avant ta prochaine
couche.** Détails dans `SYNC_THREAD_MALEX_VINCENT.md` (entrée 2026-06-12).

---

## 2026-06-06 — answered — Attente retour Vincent

Attente : feu vert ou retour backend sur le lancement du serveur pour tester la couche frontend 1.

Position MALEX :

- factories hors scope de cette version ;
- avancer par couches ;
- ne pas lancer le backend sans accord explicite ;
- tracer les échanges structurants dans Git.

→ **Répondu** dans `SYNC_THREAD_MALEX_VINCENT.md` (2026-06-06). Feu vert couche 1 accordé,
lancement backend par Vincent.

---

## 2026-06-06 — answered — Décisions backend (à appliquer côté frontend)

De Vincent, suite à tes 6 questions *(Q6 confirmée par validation humaine le 2026-06-07 : godmode étendu — voir `SYNC_THREAD_MALEX_VINCENT.md`)* :

- **Registre** : champ `status` (`live` / `future` / `out_of_scope`) ajouté à chaque action,
  lisible via `GET /actions/available` et `GET /context/current`. Règle UI : n'afficher comme
  fonctionnel que `live` ; `future` = verrouillé / « à venir » ; `out_of_scope` = masqué.
- **Endpoints actions** : consommer le réel — `POST /actions/:id/preflight`,
  `POST /actions/:id/validate`, `POST /actions/:id/execute`. Le seed a été aligné.
- **`user_runtime_loadout`** : hors V1, dériver les actions du registre + contexte.
- **Validation inbox** : `GET /actions/pending` (teacher+) suffit en V1.
- **Endpoints lourds** (`/da`, `/assets`, `/inventory`, `/subjects`) : `future`, verrouillés.
- **Permissions** : **godmode étendu** — en rôle godmode, l'UI peut exécuter des actions ET
  `owner_ops_private_diagnostic` est exposé. **Gated rôle godmode uniquement**, jamais pour
  teacher/student. (Lève le cloisonnement strict Owner Ops de la première carte ; Owner Ops
  pas encore implémenté backend.)
- **Frontend** : `apps/frontend` est désormais le seul frontend (PoC `packages/poc-frontend`
  retiré). Il revient en priorité à MALEX.

---

## 2026-06-07 — done — Rebaser sur `main` à jour (godmode étendu scellé)

Vincent → MALEX/Codex.

`origin/main` est désormais la base de référence à jour :

- fast-forward de l'intégration (frontend `apps/frontend`, seed + champ `status`, PoC retiré,
  sécu vitest 4.1.8 / `npm audit` 0 vuln) ;
- **Q6 = godmode étendu, validé humainement le 2026-06-07** — c'est ta position, donc cohérent
  (un détour « Owner Ops strict » a été poussé puis reverté ; cf. `SUIVI.md` / `SYNC_THREAD`).

Action demandée :

- **rebaser `codex/frontend-masterflow` sur `origin/main`** (ou repartir de `main`) avant toute
  reprise frontend ;
- les versions concurrentes des docs portées par `codex` (`SYNC_THREAD`, `SUIVI`, `INBOX_*`,
  `BACKEND_INTEGRATION_MAP`, `CLAUDE`) sont **supersédées par `main`** → prendre celles de `main` ;
- accès Tailscale accordé, backend exposé en Serve sur
  **`https://profkrapu-ms-7971.tail8d8b1f.ts.net:8443`** (⚠️ port 8443, **pas 443** = funnel
  API_manage) ; détails dans `SYNC_THREAD_MALEX_VINCENT.md` (entrée 2026-06-07).
- **frontend** aussi exposé en Serve : **`https://profkrapu-ms-7971.tail8d8b1f.ts.net:10000`**
  (Vite proxifie l'API/WS vers le backend → stack complète via cette URL). J'ai ajouté
  `server.allowedHosts` dans `apps/frontend/vite.config.ts` pour l'accès distant —
  **à conserver au rebase**.

### Clôture MALEX/Codex — 2026-06-07

`origin/main` est bien ancêtre de `codex/frontend-masterflow` et la branche contient les commits
MALEX récents au-dessus de `070688e`. Les docs ont été réalignées avec le Drive canon et poussées
dans `c49e862`. Action rebase considérée terminée ; continuer sur les couches frontend courtes.

---

## 2026-06-07 — answered — Time-out Serve résolu : utilise l'IP tailnet directe

Ton time-out sur `:8443`/`:10000` = limite Tailscale : **Serve ne sert pas les nœuds partagés**.
Fix appliqué (toujours tailnet privé, pas de Funnel) — **vise l'IP directe** :

- backend : `http://100.100.128.63:8000`
- stack complète : `http://100.100.128.63:5174` (frontend rebindé `host:'0.0.0.0'`)

Détails + échelle de test (`tailscale ping` d'abord) dans `SYNC_THREAD_MALEX_VINCENT.md`
(entrée « RÉSOLU — Serve ne sert pas les nœuds partagés »). Les ports Serve `:8443`/`:10000`
restent valables pour les machines du tailnet de Vincent, pas pour toi (nœud partagé).

---

## 2026-06-07 — done — Accès FINAL : Funnel PUBLIC (l'IP directe ne marchait pas non plus)

L'IP tailnet directe time-out aussi (plan de données Tailscale KO entre ton NAT FAI et la box de
Vincent — `tcpdump` host = 0 paquet de toi). **Décision humaine de Vincent : bascule en Funnel
PUBLIC.** Plus besoin de Tailscale chez toi :

- **backend** : `https://profkrapu-ms-7971.tail8d8b1f.ts.net:8443`
- **stack complète** : `https://profkrapu-ms-7971.tail8d8b1f.ts.net:10000`

Sécu : `JWT_SECRET` + mot de passe godmode **tournés** ; **tes identifiants te sont donnés par
Vincent hors-bande** (jamais dans Git). Détails dans `SYNC_THREAD_MALEX_VINCENT.md` (entrée
« RÉSOLU pour de bon : bascule en Funnel PUBLIC »).

---

## 2026-06-10 — done — Couches 5-12 validées + mergées ; rebase sur `main` (fix backend inclus)

Ton run réel godmode est fait : **7/7 étapes passent**. Tranche intégrée, `main` =
`16340c8` (tes couches) + `3e34213` (fix backend).

- Le 401 que ta couche 12 aurait pris sur `PUT /rooms/:id/instance` était un **bug backend**
  (router `rooms` sans `requireUser` monté — corrigé + testé). Rien à changer chez toi.
- **Action demandée : rebase `codex/frontend-masterflow` sur `origin/main`** avant ta
  prochaine couche (tu récupères le fix + les docs à jour).
- Détails du run + suite proposée dans `SYNC_THREAD_MALEX_VINCENT.md`
  (entrée « couches 5-12 VALIDÉES + run réel 7/7 »).

### Clôture MALEX/Codex — 2026-06-11

- `codex/frontend-masterflow` rebasée sans conflit sur `origin/main` (`69979cb`).
- Correctif backend rooms `3e34213` récupéré.
- `npm run lint:frontend` : OK.
- `npm run build:frontend` : OK.
- `npm test` : 5 fichiers, 16/16 tests OK.

---

## 2026-06-07 — done — Front Home Room VALIDÉ + intégré sur `main`

Ton cockpit Home Room (App.tsx + chat WS + couche personas/registry, api.ts, styles.css) **revu
et validé** : conforme au contrat `@masterflow/shared`, invariants respectés (buckets par
`status`, 1 speaker via `active_blend.speaker_persona_id`, `method_attribution`, ressources
`validated` only, `preflight_required` désactive le chip), `wsUrl` en `wss` derrière le funnel.
**`tsc --noEmit` ✓ + `vite build` ✓ (30 modules)**. Fast-forward `main` (`7da3a90`), **live sur le
funnel `:10000`** (rechargé à chaud, sans erreur).

2 points mineurs (non bloquants) :
- le formulaire login pré-remplit `vincent` / `masterflow` — l'ancien mdp est **mort** (tourné) ;
  pense à vider ces defaults vu que le front est **public** désormais.
- j'ai corrigé `BACKEND_INTEGRATION_MAP §Risques` (disait « JWT_SECRET fallback dev only » → faux).

Continue sur des couches courtes ; rebase sur `main` avant ta prochaine reprise.
