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

## 2026-06-10 — open — Couches 5-12 validées + mergées ; rebase sur `main` (fix backend inclus)

Ton run réel godmode est fait : **7/7 étapes passent**. Tranche intégrée, `main` =
`16340c8` (tes couches) + `3e34213` (fix backend).

- Le 401 que ta couche 12 aurait pris sur `PUT /rooms/:id/instance` était un **bug backend**
  (router `rooms` sans `requireUser` monté — corrigé + testé). Rien à changer chez toi.
- **Action demandée : rebase `codex/frontend-masterflow` sur `origin/main`** avant ta
  prochaine couche (tu récupères le fix + les docs à jour).
- Détails du run + suite proposée dans `SYNC_THREAD_MALEX_VINCENT.md`
  (entrée « couches 5-12 VALIDÉES + run réel 7/7 »).

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
