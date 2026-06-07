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

- **URL backend (Tailscale Serve, tailnet-only, actif)** :
  `https://profkrapu-ms-7971.tail8d8b1f.ts.net:8443`
  → REST `…:8443/api/v1` · WS `wss://profkrapu-ms-7971.tail8d8b1f.ts.net:8443/ws/{room_instance_id}?token=…`
- ⚠️ **Port 8443, PAS 443.** `https://profkrapu-ms-7971.tail8d8b1f.ts.net/` (443, Funnel public)
  sert un **autre projet (API_manage)** → ne jamais viser le backend dessus.
- Serve proxifie `:8443 → localhost:8000` (Funnel 443 d'API_manage intact). **Backend lancé,
  `/health` vert** (`users:1 personas:3 rooms:1 resources:3`).
- Périmètre de test inchangé : `POST /auth/login` + `GET /context/current` uniquement ; le
  lancement effectif (`npm run dev`) reste mon acte — je dirai « clé tournée » ici.

Confirme la réception côté MALEX une fois l'invitation acceptée.

> *(Demande d'origine : `INBOX_VINCENT.md` côté `codex/frontend-masterflow`, entrée
> « Invitation Tailscale requise » du 2026-06-07.)*

---

## 2026-06-07 — Vincent : frontend exposé en Serve (tailnet)

MALEX,

Le **frontend MALEX** (`apps/frontend`) est aussi exposé en Tailscale **Serve privé**
(tailnet-only, pas de Funnel). Toute la stack passe par **une seule URL** :

- **URL frontend** : `https://profkrapu-ms-7971.tail8d8b1f.ts.net:10000`
- Le frontend (Vite `:5174`) **proxifie** `/api` → backend `:8000` et `/ws` → WS backend — donc
  login + `GET /context/current` + chat fonctionnent directement depuis cette URL.
- J'ai ajouté `server.allowedHosts: ['profkrapu-ms-7971.tail8d8b1f.ts.net']` dans
  `apps/frontend/vite.config.ts` (sinon Vite 6 bloque l'hôte distant). Sans effet en local —
  **à conserver au rebase**.

**Récap des ports tailnet :**

| Port | Surface | Cible |
|---|---|---|
| `443` (Funnel public) | **autre projet — API_manage** | `localhost:3000` — ne pas toucher |
| `8443` (Serve, tailnet) | backend direct | `localhost:8000` |
| `10000` (Serve, tailnet) | frontend (proxifie l'API) | `localhost:5174` |

Frontend + backend **lancés et vérifiés** : `:10000/` sert l'HTML, `:10000/api/v1/personas`
→ `401` (backend répond, auth requise = chaîne OK).

---

## 2026-06-07 — Correctif : l'accès tailnet n'était PAS effectif → partage réel fait

MALEX,

Mise au point honnête (la trace ci-dessus disait « accès accordé » — c'était inexact) :
l'invitation tailnet **n'avait jamais été réellement émise** depuis la console. Côté toi,
ton `tailscale status` ne listait que `macbook-pro-de-alex` ; ton `curl …:8443` résolvait
vers des **IP publiques** (celles du Funnel 443 d'API_manage) et échouait en `SSL_ERROR_SYSCALL`,
parce que `:8443` est en **Serve tailnet-only** et que tu n'étais pas dans le tailnet.

**Corrigé aujourd'hui** : node-share de la machine **`profkrapu-ms-7971`** vers
**`malexcoulot@gmail.com`** (acceptée par toi par e-mail). Vérifié : la machine
`profkrapu-ms-7971.tail8d8b1f.ts.net` (`100.100.128.63`) apparaît désormais 🟢 **en ligne**
dans ton app Tailscale (onglet Devices). On reste en **Serve privé — toujours pas de Funnel**
sur le backend/frontend.

**Test de vie (chemin corrigé)** — health à la **racine `/health`**, pas `/api/v1/health`
(ce dernier passe par l'auth → `unauthorized`) :

```bash
curl -s https://profkrapu-ms-7971.tail8d8b1f.ts.net:8443/health
# → {"ok":true,"service":"masterflow-backend","counts":{"users":1,"personas":3,"rooms":1,"resources":3}}
```

Stack complète (front qui proxifie API + WS) : `https://profkrapu-ms-7971.tail8d8b1f.ts.net:10000`

Rappel ports inchangé : `443`=Funnel public **API_manage** (ne pas viser) · `8443`=backend (Serve) ·
`10000`=frontend (Serve). Confirme-moi ta sortie `/health` quand tu l'as.
