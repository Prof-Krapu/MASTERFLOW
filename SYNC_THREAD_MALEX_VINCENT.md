# Sync thread — MALEX / Vincent / Codex

Objectif : garder les échanges de coordination dans Git, avec des messages courts, datés, actionnables et relus par les deux côtés.

Règles :

- une entrée = une demande ou une décision ;
- les décisions structurantes restent explicites ;
- une réponse IA n'est pas une validation humaine ;
- les demandes backend doivent préciser le périmètre exact du run ou de la modification ;
- les factories / bots extraits sont hors scope de cette version.
- avant toute reprise ou action structurante, chaque système doit checker `SUIVI.md`, ce fil, puis son inbox dédiée ;
- inbox Vincent : `INBOX_VINCENT.md` ;
- inbox MALEX/Codex : `INBOX_MALEX.md` si présent.

Règle inbox :

```txt
inbox non lue = contexte incomplet
message IA != validation humaine
demande structurante -> résumé impact -> patch minimal -> validation/consigne
```

---

## 2026-06-06 — Demande feu vert backend

Vincent,

Feu vert demandé pour allumer le backend.

On a poussé la première couche frontend sur `codex/frontend-masterflow` :

- `apps/frontend` créé ;
- shell login minimal ;
- appel typé `GET /context/current` ;
- aucun backend modifié ;
- tests/lint/build OK.

Objectif du run : tester uniquement l'intégration réelle auth + contexte courant.

Commande backend attendue :

```bash
npm run dev
```

Puis côté MALEX/Codex :

```bash
npm run dev:frontend
```

Punchline officielle :

> On n'est pas en train de faire une landing page, on branche le cockpit au réacteur. Dis-moi quand je peux tourner la clé.

---

## 2026-06-06 — Réponse Vincent : feu vert + 6 questions backend

MALEX,

**Feu vert : OK** pour la couche 1, périmètre strict `POST /auth/login` + `GET /context/current`.
Le backend, je l'allume moi (`npm run dev`) — je te dis « clé tournée » ici quand il tourne.
Et oui : **le frontend est à toi**. J'ai retiré mon PoC (`packages/poc-frontend`) ; `apps/frontend`
devient le seul frontend, tu le portes.

Réponses aux 6 points de `VINCENT_BACKEND_SYNC_2026-06-06.md` :

1. **Capabilities / registre exploitable par l'UI** — *fait, côté backend.* J'ai ajouté un champ
   **`status`** à chaque entrée du registre (`ActionRegistryEntrySchema` dans `packages/shared`) :
   - `live` → endpoint réellement branché, affichable comme fonctionnel ;
   - `future` → prévu plus tard, à afficher **verrouillé / « à venir »** (jamais fonctionnel) ;
   - `out_of_scope` → hors version, **à masquer**.
   Tu le lis tel quel via `GET /actions/available` et `GET /context/current` (`available_actions`).
   Pas d'endpoint `/capabilities` séparé : le registre porte déjà l'info.

2. **Alignement seed ↔ endpoints** — *on aligne le seed sur le réel.* Le contrat REST réel fait
   foi. J'ai corrigé les `endpoint` du seed :
   - `preflight_action` → `POST /actions/{action_id}/preflight`
   - `approve_validation_item` → `POST /actions/{action_id}/validate`
   Tu consommes donc **`/actions/:id/preflight`** et **`/actions/:id/validate`** (et
   `/actions/:id/execute`). Plus de `POST /actions/preflight` ni `POST /validation/{item}/approve`.

3. **`user_runtime_loadout`** — *hors V1* (anti-scope). Pas de modèle/endpoint pour l'instant ;
   l'UI dérive les actions de `GET /actions/available` + le contexte courant. À rouvrir en phase 2.

4. **Validation inbox** — *`GET /actions/pending` suffit en V1.* Pas de table
   `validation_inbox` séparée pour l'instant ; l'inbox UI se branche dessus (rôle `teacher+`).

5. **Endpoints UI complète** (`/da/compile-context`, `/assets/image/preflight`,
   `/assets/render-manifests`, `/inventory/photo-scan`, `/subjects/{id}/compile-fullstack`) —
   *plus tard.* Non implémentés au MVP ; marqués `status: future` dans le registre → affiche-les
   **verrouillés**, jamais comme fonctionnels.

6. **godmode vs owner_ops** — **godmode étendu** : en rôle `godmode`, l'UI peut **exécuter
   des actions** (pas seulement lire) **et** `owner_ops_private_diagnostic` est **exposé**.
   ⚠️ Décision assumée : ça **lève le cloisonnement strict Owner Ops** de la première carte
   d'intégration. **Garde-fou impératif** : tout ça est **gated rôle `godmode` uniquement** —
   rien de ces surfaces ne doit jamais apparaître pour teacher/student. (Owner Ops n'est pas
   encore implémenté côté backend : à brancher derrière ce gate godmode le moment venu.)

Backflow / factories : **hors scope**, confirmé des deux côtés (taggé `out_of_scope`).

> *Brouillon rédigé via Claude pour Vincent — les décisions ci-dessus valent consigne de
> périmètre ; le lancement réel du backend reste mon acte (human in the loop).*

---

## 2026-06-07 — Q6 confirmée humainement (Vincent) : godmode étendu

MALEX,

Mise au point honnête : dans la journée une correction **« Owner Ops strict »** a été poussée
sur `main` (commit `7322e61`) puis **annulée à ma demande** (`git revert`). Après ta réassertion
côté `codex/frontend-masterflow`, **je confirme humainement la position godmode étendu** — c'est
elle qui fait foi désormais (et non plus un simple brouillon IA).

**Q6 — godmode vs owner_ops = godmode étendu (validé Vincent, 2026-06-07) :**

- en rôle `godmode`, l'UI peut **exécuter des actions** ET `owner_ops_private_diagnostic` est
  **exposé** *quand le backend l'implémentera* ;
- **gate strict `godmode` uniquement** — jamais `teacher` ni `student` ;
- ça **lève le cloisonnement strict Owner Ops** de la 1re carte d'intégration ;
- l'UI **ne présente rien comme fonctionnel** avant contrat + endpoint réels (owner_ops n'est
  pas encore codé backend).

Q1–Q5 inchangées (cf. entrée du 2026-06-06). Backflow/factories : `out_of_scope`.

> *Cette entrée est la validation humaine de Vincent : elle remplace la correction « Owner Ops
> strict » et scelle godmode étendu.*

---

## 2026-06-07 — Vincent : accès Tailscale accordé

MALEX,

Accès tailnet **accordé**. J'invite ton compte Tailscale au tailnet MasterFlow / je partage la
machine qui héberge le backend. On reste sur **Tailscale Serve** — **pas de Funnel, aucun port
public**.

- Hostname MagicDNS privé du backend : `profkrapu-ms-7971.tail8d8b1f.ts.net`
- Backend exposé en local sur `:8000` (REST `/api/v1` + WS `/ws`), atteignable via ce hostname
  en Tailscale **Serve**.
- Périmètre de test inchangé : `POST /auth/login` + `GET /context/current` uniquement ; le
  lancement effectif (`npm run dev`) reste mon acte — je dirai « clé tournée » ici.

Confirme la réception côté MALEX une fois l'invitation acceptée.

> *(Demande d'origine : `INBOX_VINCENT.md` côté `codex/frontend-masterflow`, entrée
> « Invitation Tailscale requise » du 2026-06-07.)*
