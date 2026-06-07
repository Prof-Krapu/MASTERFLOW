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

De Vincent, suite à tes 6 questions *(Q6 corrigée par validation humaine le 2026-06-07)* :

- **Registre** : champ `status` (`live` / `future` / `out_of_scope`) ajouté à chaque action,
  lisible via `GET /actions/available` et `GET /context/current`. Règle UI : n'afficher comme
  fonctionnel que `live` ; `future` = verrouillé / « à venir » ; `out_of_scope` = masqué.
- **Endpoints actions** : consommer le réel — `POST /actions/:id/preflight`,
  `POST /actions/:id/validate`, `POST /actions/:id/execute`. Le seed a été aligné.
- **`user_runtime_loadout`** : hors V1, dériver les actions du registre + contexte.
- **Validation inbox** : `GET /actions/pending` (teacher+) suffit en V1.
- **Endpoints lourds** (`/da`, `/assets`, `/inventory`, `/subjects`) : `future`, verrouillés.
- **Permissions** — **Owner Ops strict** *(validé humainement par Vincent le 2026-06-07 ;
  annule le brouillon IA « godmode étendu »)* : `owner_ops_private_diagnostic` reste
  **privé/propriétaire**, **jamais exposé dans l'UI, même en rôle `godmode`**. `godmode` =
  surface console/diagnostic en **lecture** ; il **ne court-circuite pas** le pipeline de
  validation (pas d'exécution d'action sensible via un bypass godmode-UI ; validation toujours
  `teacher+` sur `POST /actions/:id/validate`). Rien de ces surfaces pour teacher/student.
  Cloisonnement strict de la 1re carte **maintenu**. Backend : aucun code Owner Ops (hors V1) ;
  le jour venu, derrière un **canal propriétaire hors UI standard**. Le « debug drawer godmode »
  reste **sans Owner Ops privé** (cf. §9 `BACKEND_INTEGRATION_MAP.md`).
- **Frontend** : `apps/frontend` est désormais le seul frontend (PoC `packages/poc-frontend`
  retiré). Il revient en priorité à MALEX.
