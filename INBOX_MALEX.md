# INBOX MALEX — MasterFlow

Objectif : point d'entrée court pour les demandes Vincent/Codex à traiter côté MALEX.

Règles de lecture :

- à checker systématiquement avant reprise frontend, décision de périmètre, validation humaine ou réponse de sync ;
- traiter les entrées du haut vers le bas ;
- une entrée peut être `open`, `answered`, `blocked` ou `done` ;
- une réponse IA ne vaut pas validation humaine ;
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

## 2026-06-07 — open — Rebaser sur `main` à jour (godmode étendu scellé)

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
