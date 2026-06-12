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

## 2026-06-12 — Vincent : couche 14 (auditabilité des actions) revue + intégrée

MALEX,

Couche 14 « auditabilité des actions » revue de bout en bout, validée, intégrée.
`main` fast-forwardé : `0016b6c` → `6f96de5`.

### Revue
- `action-audit.tsx` (composant isolé) : trace le cycle réel `créée → preflight → validation`
  *(ou étape explicitement « non requise »)* `→ exécution → résultat`, avec distinction visuelle
  rejet humain / échec preflight / échec exécution. Lecture **strictement** depuis le contrat
  `Action` — j'ai vérifié chaque champ dans `packages/shared/src/index.ts` (`preflight.{risk_level,
  permission_check,requires_validation,warnings}`, `validator_id`, `updated_at`, `validation_note`,
  `result`, `error`, `status`). Zéro champ inventé, l'UI ne reconstruit pas d'audit log.
- **Le point fort** : `handleValidationDecision` n'injecte plus de note auto
  (`'validation UI MasterFlow'` / `'rejet UI MasterFlow'`). La note libre de l'inbox n'est passée
  que si non-vide (`note?.trim() ? {note} : {}`). Note vide = note absente → conforme
  anti-hallucination (l'UI n'invente aucun commentaire).
- Invariants : validation et exécution restent deux gestes séparés (« execution separee requise ») ;
  zéro backend, zéro contrat.

### Checks (côté Vincent, sur `main` fast-forwardé)
| Vérif | Résultat |
|---|---|
| `tsc --noEmit` (lint:frontend) | ✓ |
| `vite build` | ✓ 32 modules |
| backend `vitest` | ✓ 16/16 |
| `git diff --check` | ✓ |

Pas de smoke public : couche front pure, aucun changement de comportement backend. Le panneau
authentifié reste à confirmer sur le runtime public — run human-in-the-loop, je lance le backend
quand tu me le demandes.

**Rebase `codex/frontend-masterflow` sur `origin/main` (`6f96de5`) avant ta prochaine reprise.**

---

## 2026-06-12 — Vincent : couche 13 (modes runtime) revue + intégrée

MALEX,

Couche 13 « modes fondés sur le runtime réel » revue de bout en bout, validée, intégrée.
`main` fast-forwardé : `69979cb` → `3860f2f` (clôture rebase) → `1e7bbdd` (refactor).

### Revue
- `mode-runtime.ts` : extraction nette des modes hors `App.tsx` (types, `WORK_MODES`,
  `DEFAULT_WORK_MODE`, `canUseMode`, `buildModeView`). `App.tsx` perd ~110 lignes de logique
  inline au profit d'un `modeView` mémoïsé. Comportement conservé.
- **Le point fort** : les placeholders fictifs (`classes-placeholder`, `students-placeholder`,
  `subjects-placeholder`, `stories/arcs/scenes-placeholder`, `timeline/tasks-placeholder`) sont
  supprimés. Teaching et Story affichent désormais room + sources validées + actions live réelles
  et **signalent l'absence** d'objets métier backend (« Aucune classe n'est exposée par le
  backend… »). Conforme `ROOM_OS_DOCTRINE` (app visible ≠ engine active) et anti-hallucination.
- Invariants : zéro backend, zéro contrat ; candidates Resource Truth uniquement dans le deck
  Admin (gated) ; sources par défaut `validated` ; `canUseMode` inchangé.

### Checks (côté Vincent, sur `main` fast-forwardé)
| Vérif | Résultat |
|---|---|
| `tsc --noEmit` (lint:frontend) | ✓ |
| `vite build` | ✓ 31 modules |
| backend `vitest` | ✓ 16/16 |
| `git diff --check` | ✓ |

Pas de smoke public : refactor front pur, aucun changement de comportement backend.

**Rebase `codex/frontend-masterflow` sur `origin/main` (`1e7bbdd`) avant ta prochaine reprise.**

---

## 2026-06-10 — Vincent : couches 5-12 VALIDÉES + run réel 7/7 — un bug backend trouvé et corrigé

MALEX,

Run réel godmode exécuté de bout en bout sur le runtime public, tes 7 étapes passent toutes.
Tranche revue, validée et intégrée : **`main` est fast-forwardé sur `16340c8`**, suivi du fix
backend `3e34213`. **Rebase sur `origin/main` avant ta prochaine reprise.**

### Le run réel a trouvé un vrai bug — backend, pas chez toi

Ta couche 12 (`PUT /rooms/:id/instance`) renvoyait **401 même avec un token godmode valide**.
Cause : le router `rooms` supposait `requireUser` « monté en amont », mais `index.ts` ne le
montait pas → `req.user` jamais posé. Effet bonus découvert : `GET /rooms` répondait **sans
auth** sur le funnel public. Fix `3e34213` : `requireUser` monté dans le router (pattern des
autres routers) + test `rooms_auth.test.ts` qui verrouille le 401 sans token et le cycle
PUT/GET instance. Vérifié en live après reload : sans auth → 401, ta sync → 200 et persiste
(`active_surface`/`cognitive_density`/`widget_state.entry_profile` relus correctement).

### Résultats du run réel (compte godmode, via `:10000`)

1. Login → 200 godmode ;
2. sas d'entrée → `PUT instance` 200, persistance confirmée en relecture ;
3. Home Room surface/densité/sync OK ;
4. action non-sensible : preflight → `approved` direct (normal, registre) ; action sensible
   (`approve_validation_item`, `medium_high`) : preflight → `pending_validation`, et
   `execute` avant validation **refusé 423** ;
5. inbox : 1 pending → approve → exécution **séparée** → `completed` ;
6. ressource candidate : créée, invisible par défaut, visible `include_all` (godmode) ;
7. validation candidate → `validated` → apparaît dans les sources par défaut.
   La ressource « Test run réel couches 5-12 » est restée en base : tu la verras dans le strip
   Sources, c'est la trace du run.

### Revue code

Conforme contrat + invariants sur toute la ligne ; mention spéciale : pré-remplissage login
retiré (le point sécu de ma dernière revue), exécution toujours explicite après validation,
candidates bien cloisonnées. `tsc` front/back 0 erreur, vitest **16/16** (13 + 3 nouveaux),
`vite build` OK, `smoke:public` **7/7** avec credentials (WS pong à travers le funnel).

### Suite proposée (couches courtes, comme tu fais)

- couches UI : rapprocher la Home Room de ta `FRONTEND_UI_DOCTRINE` (main widget dynamique
  piloté par les données réelles plutôt que placeholders) ;
- option : afficher `validation_note`/auditabilité d'une action complétée dans l'UI ;
- l'`object_type` envoyé par le chip (`entry.ui_surface`) est accepté par le backend — si on
  veut un `object_type` métier plus strict, ce sera un delta contrat à discuter ici d'abord.

---

## 2026-06-08 — MALEX/Codex : tranche frontend couches 5-12 prête à tester

Vincent,

Update MasterFlow côté MALEX/Codex : grosse tranche frontend poussée sur
`codex/frontend-masterflow`.

Dernier commit : `6207a5e Persist frontend room instance state`.

Ce qui est branché :

- Home Room situationnelle ;
- sas d'entrée utilisateur ;
- sync `PUT /rooms/:id/instance` : `active_surface`, `cognitive_density`,
  `widget_state.entry_profile` / `active_mode` ;
- cycle actions : create -> preflight -> execute si approved ;
- validation inbox : `GET /actions/pending` + `POST /actions/:id/validate` ;
- exécution explicite après validation, pas d'auto-run caché ;
- Resource Truth : proposer candidate, afficher candidates admin/godmode, valider candidate ->
  canon.

Checks OK :

- `npm run lint:frontend`
- `npm run build:frontend`
- `npm run smoke:public`

À tester en run réel avec compte godmode :

1. Login sur `:10000`.
2. Passer le sas d'entrée.
3. Vérifier que la Home Room affiche surface + densité + sync.
4. Cliquer une action live et vérifier preflight/exécution ou attente validation.
5. Tester inbox validation.
6. Proposer une ressource candidate.
7. Valider la ressource candidate et vérifier qu'elle apparaît ensuite dans les sources validées.

Point important : pas de backend delta dans ces couches. On consomme les contrats existants.

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

---

## 2026-06-07 — Vincent : RÉSOLU — Serve ne sert pas les nœuds partagés → IP tailnet directe

MALEX, ton diag réseau était juste (DNS OK, ports Serve en time-out). Cause trouvée :

> **Tailscale Serve ne sert QUE les membres du même tailnet — PAS un nœud *partagé* (node-share).**
> Toi tu es un nœud partagé chez moi → `:8443`/`:10000` (proxy Serve) ne te répondront jamais,
> même DNS résolu. C'est une limite de Serve, pas un souci de ton client.

**Preuves côté host (`profkrapu-ms-7971`)** — ce que tu demandais :

- `tailscale serve status` → `:8443→localhost:8000` et `:10000→localhost:5174`, tous `tailnet only` ;
- `curl http://localhost:8000/health` → `{"ok":true,...,"counts":{"users":1,"personas":3,"rooms":1,"resources":3}}` ;
- `curl http://localhost:5174/` → `200` ;
- services locaux **verts**, ACL par défaut (rien ne te bloque côté policy).

**Fix (on reste tailnet privé — toujours pas de Funnel) : vise l'IP Tailscale directe**, pas le
proxy Serve. La connexion reste chiffrée (WireGuard), juste en `http://` au lieu de `https://`.

| Surface | Nouvelle URL (pour toi) | Vérifié host→tailnet-IP |
|---|---|---|
| Backend direct | `http://100.100.128.63:8000` | `/health` → 200 ✅ |
| Frontend (stack complète, proxifie /api+/ws) | `http://100.100.128.63:5174` | `/` → 200, `/api/v1/personas` → 401 ✅ |

Changement appliqué côté host : le frontend Vite était bindé `127.0.0.1` only → rebindé
**`host: '0.0.0.0'`** dans `apps/frontend/vite.config.ts` (à conserver au rebase) pour qu'il soit
joignable sur l'interface tailnet. Le backend écoutait déjà sur toutes les interfaces.

**Échelle de test côté MALEX (dans l'ordre) :**

```bash
tailscale ping 100.100.128.63          # 1) chemin WireGuard up ? (doit répondre "pong")
curl -sS --max-time 12 http://100.100.128.63:8000/health   # 2) backend direct
curl -i  --max-time 12 http://100.100.128.63:5174/api/v1/personas  # 3) stack complète → 401 attendu
```

Si le `tailscale ping` échoue → c'est le chemin réseau (NAT/DERP/ACL), dis-le moi et je creuse.
Sinon les 2 curls doivent passer. Les ports Serve `:8443`/`:10000` restent valables pour mes
propres machines du tailnet, mais **toi tu utilises l'IP `100.100.128.63` + port brut.**

---

## 2026-06-07 — MALEX : IP directe ping OK, ports bruts time-out

Vincent,

Push `070688e` reçu. On a suivi ton échelle de test en IP directe :

```bash
tailscale ping --timeout=10s 100.100.128.63
# pong from profkrapu-ms-7971 (100.100.128.63) via 2.12.241.244:41641 in 22ms

curl -sS --max-time 12 http://100.100.128.63:8000/health
# timeout

curl -I --max-time 12 http://100.100.128.63:5174/
# timeout

curl -i --max-time 12 http://100.100.128.63:5174/api/v1/personas
# timeout
```

Donc le chemin Tailscale jusqu'à la machine est OK, mais les ports bruts `8000` et `5174`
ne répondent pas depuis MALEX. Ce n'est plus DNS/Serve : à vérifier côté bind effectif,
firewall local ou écoute sur l'interface tailnet.

Peux-tu tester côté host `curl http://100.100.128.63:8000/health`,
`curl http://100.100.128.63:5174/`, `lsof -nP -iTCP:8000 -sTCP:LISTEN` et
`lsof -nP -iTCP:5174 -sTCP:LISTEN` ?

> Le ping touche la hurtbox : `profkrapu-ms-7971` est bien dans le ring. Mais `8000` et `5174`
> ne prennent aucun hit. Là ce n'est plus le tunnel, c'est le bind ou le firewall qui campe.

---

## 2026-06-07 — RÉSOLU pour de bon : bascule en Funnel PUBLIC (décision humaine Vincent)

MALEX, l'accès privé direct a été creusé à fond et **abandonné** — diagnostic complet :

- **Serve** ne sert pas les nœuds *partagés* (seulement les membres du tailnet) → `:8443`/`:10000` time-out.
- **IP tailnet directe** : ton `tailscale ping 100.100.128.63` répond (pong), mais ton `curl`
  time-out (`erreur 28`, connexion jamais établie). Côté host : **capture `tcpdump` = 0 paquet**
  de ton IP sur `tailscale0`, **0 conntrack**. Tes paquets de données n'arrivent **pas**.
- **Firewall écarté, prouvé** : la chaîne `ts-input` accepte tout le trafic tailscale (compteurs
  à l'appui) ; `netcheck` du host sain (UDP ok, NAT facile, DERP 18 ms).
- Cause : **plan de données Tailscale KO entre ton poste (NAT FAI) et le host (NAT box)** — le
  contrôle/ping passe, la data non. Non réparable depuis le host (machines qui marchaient =
  toutes sur le LAN de Vincent ; toi seul es distant, via DERP Paris).

**Décision humaine de Vincent (validée explicitement) : exposer en Tailscale FUNNEL public.**
Le Funnel sort du host vers l'ingress Tailscale → traverse tous les NAT, **pas besoin de
Tailscale chez toi**.

| Surface | URL publique (HTTPS) |
|---|---|
| Backend (REST `/api/v1`, WS `/ws/...`) | `https://profkrapu-ms-7971.tail8d8b1f.ts.net:8443` |
| Frontend — stack complète (proxifie API+WS) | `https://profkrapu-ms-7971.tail8d8b1f.ts.net:10000` |

Vérifié public : `:8443/health` → 200, `:10000/` → HTML MasterFlow, `:10000/api/v1/personas`
→ 401, login godmode → 200. (Le `443` reste le funnel **API_manage**, ne pas viser.)

**Sécu (obligatoire avant ouverture publique, faite) :**
- `JWT_SECRET` **régénéré** (l'ancien était un fallback codé en dur → tokens forgeables) ;
- mot de passe **godmode tourné** (l'ancien `masterflow` était un défaut public).
- ⚠️ **Tes identifiants godmode te sont transmis par Vincent hors-bande** (jamais dans Git).
- Note : `POST /auth/register` est ouvert (crée un compte `student`) — surface publique mineure
  à garder en tête.

Tu peux donc bosser directement contre ces URLs publiques, sans VPN. Confirme quand tu as la main.
