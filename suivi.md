# suivi.md — Journal de bord API_manage

Quatrième app de la suite **CORRECTORS**. Sert de landing publique, d'auth multi-utilisateurs,
de backend de storage centralisé pour PC/FR/NL/ES/SVT/Maths, et de console admin (clé API partagée,
invitations, suppression de comptes, monitoring coût).

Référence de plan : `plans/il-est-temps-maintenant-calm-knuth.md`.

---

## Comment lancer le serveur

### TL;DR (mode prod, ce qui est exposé via Tailscale Funnel)

```bash
# 1) Démarrer la suite complète (API_manage + 3 sous-apps sur loopback)
cd /home/profkrapu/Documents/API_manage
./scripts/launch-all.sh --rebuild

# 2) Dans un autre shell, exposer publiquement
tailscale funnel --bg --https=443 http://localhost:3000
```

URL publique (Funnel) : `https://profkrapu-ms-7971.tail8d8b1f.ts.net/`

Le flag `--rebuild` force la reconstruction du bundle Vite de chaque app avec son
`VITE_BASE_PATH` (sinon le script réutilise `dist/` s'il existe). À garder à chaque
modification des sources.

### Détail du script `scripts/launch-all.sh`

Le script orchestre 4 process en parallèle, avec un `trap` qui les coupe tous proprement à
`Ctrl+C` :

| Process     | Port loopback | Mode          | Bundle servi                          |
|-------------|---------------|---------------|---------------------------------------|
| API_manage  | **3000**      | Express prod  | `dist/` (Vite build + reverse proxy)  |
| PC          | 3001          | `serve:web`   | `dist/` (avec `VITE_BASE_PATH=/app/pc/`) |
| FR          | 3005          | `serve:web`   | `dist/` (avec `VITE_BASE_PATH=/app/fr/`) |
| NL          | 3009          | `serve:web`   | `dist/` (avec `VITE_BASE_PATH=/app/nl/`) |
| ES          | 3013          | `serve:web`   | `dist/` (avec `VITE_BASE_PATH=/app/es/`) |
| SVT         | 3021          | `serve:web`   | `dist/` (avec `VITE_BASE_PATH=/app/svt/`) |
| MATHS       | 3025          | `serve:web`   | `dist/` (avec `VITE_BASE_PATH=/app/maths/`) |

Seul `:3000` est public via Funnel. `:3001/3005/3009/3013/3021/3025` restent strictement
loopback : toute requête `/app/{pc|fr|nl|es|svt|maths}/*` est gatée par
`requireUserOrRedirect` puis proxyfiée par `server/routes/proxy.ts`.

### Lancement en mode dev (hot-reload)

Pour développer API_manage seul :

```bash
npm run dev   # concurrently : Vite :3000 + Express :3100 (tsx watch)
```

Le proxy Vite redirige `/api/*` et `/app/*` vers Express :3100. Les modifs côté serveur
sont rechargées par `tsx watch`. Pour développer aussi une sous-app, démarrer manuellement
son `npm run serve:web` sur son port loopback et le reverse proxy y enverra les requêtes.

### Redémarrage rapide après modif

Pour ne rebuild que ce qui a changé :

```bash
# UI API_manage uniquement (les sous-apps n'ont pas bougé)
npm run build:web                                       # rebuild dist/
lsof -ti:3000 | xargs -r kill -9                        # tue Express
NODE_ENV=production npm run serve &                     # relance Express
```

Le bundle est servi par `express.static(dist/)`, donc le nouveau hash JS apparaît dès qu'on
reload le navigateur (Ctrl+Shift+R pour bypasser le cache disque). Les routes API ne sont
prises en compte qu'après redémarrage du process Node.

### Variables d'environnement (`.env`)

```ini
SESSION_SECRET=…              # ≥ 32 chars (iron-session refuse en dessous)
ADMIN_USERNAME=<voir .env>    # seedé/maj au boot via server/seed.ts — JAMAIS en clair ici
ADMIN_PASSWORD=<voir .env>    # idem
# PORT=3000                   # par défaut
# NODE_ENV=production         # forcé par scripts/launch-all.sh
```

### Healthcheck

```bash
curl -fsS http://127.0.0.1:3000/healthz
# → {"ok":true,"ts":…}
```

### Données persistantes

- `data/api-manage.db` (SQLite WAL) — **survit aux rebuilds des sous-apps**. C'est la garantie de
  persistance des classes / DS / dashboards entre updates.
- Les sous-apps ne touchent plus directement IndexedDB en mode managé : elles passent par
  `/api/v1/storage/:app/:key` qui arbitre `global_settings` (admin-only) vs `user_storage`
  (par-user).

### Tailscale Funnel

```bash
tailscale funnel --bg --https=443 http://localhost:3000   # démarrer
tailscale funnel status                                    # vérifier
tailscale funnel reset                                     # arrêter
```

Le Funnel n'expose **que** `:3000`. Les ports des sous-apps sont protégés par le binding
loopback + le gate `requireUser` côté reverse proxy.

---

## Journal — chronologique

### Phase 1 : architecture & squelette

**Décisions structurantes** (cf. plan `il-est-temps-maintenant-calm-knuth.md`) :

- Stack identique aux sous-apps : Vite 6 + React 19 + TS 5.8 + Tailwind CSS 4 + shadcn/ui,
  thème DSFR (Bleu France `#000091`, Marianne).
- Path alias `@/*` résout depuis la racine (cohérent avec PC/FR/NL).
- DB locale `better-sqlite3` (WAL, FK ON), migrations idempotentes au boot.
- Sessions : `iron-session` (cookies HTTP-only signés + chiffrés).
- Reverse proxy : `http-proxy-middleware` v3, gated par `requireUserOrRedirect` (302 vers
  `/login`, pas 401 JSON — on est sur une nav, pas une API).
- Routing client minimal sans `react-router` : `window.location.pathname` + 4 vues.

### Phase 2 : auth + storage REST + reverse proxy

Schéma DB (5 tables, FK ON, `ON DELETE CASCADE` pour `user_storage` et `token_events`) :

```
users(id, username, password_hash, role, active, created_at, last_login)
invites(code, created_by, created_at, expires_at, max_uses, used_count, revoked)
user_storage(user_id, app, key, value_json, updated_at)              -- CASCADE on user
global_settings(app, key, value_json, updated_at, updated_by)
token_events(id, user_id, app, ts, model, task, prompt_tokens, …)    -- CASCADE on user
```

Routes REST montées :

- `/api/v1/auth/{register,login,logout,me}` — auth complète, rate-limit 5/min sur login.
- `/api/v1/admin/invites` — codes 12 chars `[A-HJ-NP-Za-hjk-np-z2-9]` (sans 0/O/I/1).
- `/api/v1/admin/global-settings/:app/:key` — clé API partagée (admin-only en écriture).
- `/api/v1/admin/users` + `/api/v1/admin/stats` — liste & agrégats.
- `/api/v1/storage/:app/:key` — abritrage `ADMIN_CONTROLLED_KEYS` vs user.
- `/api/v1/telemetry/token` — flush des `UsageEvent` depuis les sous-apps.
- `/app/{pc|fr|nl}/*` — reverse proxy avec injection `X-Subapp`.

### Phase 3 : intégration sous-apps (lib/tauri.ts byte-identique → patch puis recopie)

Trois modifications sur chacune des 3 sous-apps :

1. **`lib/tauri.ts`** : ajout d'un 3e backend `remote` (`isManaged()` détecte
   `/^\/app\/(pc|fr|nl)\b/`). `storeGet/Set/Delete` appellent `/api/v1/storage/...` via fetch.
   `tauriFetch` rewrite vers `/app/{app}/api/proxy?url=...` (préfixe la sous-app, indispensable
   sinon le POST hit la racine API_manage qui n'a pas de `/api/proxy`).
2. **`vite.config.ts`** : `base: process.env.VITE_BASE_PATH ?? '/'` — permet de builder pour
   `/app/pc/` etc.
3. **`lib/token-tracker.ts`** : `pushTelemetryEvent` fire-and-forget après chaque `trackUsage` /
   `trackPages` pour alimenter le monitoring admin.

> ⚠️ Conséquence — les 3 fichiers `lib/tauri.ts` ne sont plus byte-identiques entre forks
> (chaque app détecte son propre slug). Cf. memory `[[albert-correctors-shared-files]]` qui
> ne s'applique donc plus pour ce fichier.

### Phase 4 : bug GitHub Copilot device flow

Symptôme : admin sur `/app/pc/`, clic « Se connecter avec GitHub Copilot » →
`"Device flow init failed: 404 Cannot POST /api/proxy"`.

Trois couches de bug cumulées :

| # | Cause                                                      | Fix                                                                                                                              |
|---|------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------|
| 1 | SPA POSTait `/api/proxy` absolu → racine API_manage        | `lib/tauri.ts` (×3) : préfixer `/app/{pc|fr|nl}` quand `isManaged()`                                                            |
| 2 | `express.json()` consommait le body avant le reverse proxy | `server/index.ts` : monter `/app` proxy **avant** `express.json()`                                                              |
| 3 | `github.com` absent de `DEFAULT_ALLOWED_HOSTS`             | `proxy-routes.ts` (×3) : ajouter `'github.com'` à l'allowlist anti-SSRF (`api.githubcopilot.com` seul était insuffisant)         |

Vérifié end-to-end : `POST /app/pc/api/proxy?url=https%3A%2F%2Fgithub.com%2Flogin%2Fdevice%2Fcode`
renvoie 200 avec `device_code` / `user_code` / `verification_uri`.

### Phase 5 : refonte UI Landing + Login + Register (DSFR)

Le design initial était trop sec (header sobre + 3 cartes carrées sur fond blanc). Refonte
calquée sur `Homepage.tsx` des sous-apps :

- **Hero** `bg-[#F5F5FE]` avec eyebrow chips, titre bicolore (texte foreground + segment
  Bleu France), pitch en muted-foreground.
- **`AppCard`** refactor `border-2` → `border-t-2` accent par matière : indigo PC `#3939E0`,
  Bleu France FR `#000091`, orange Pays-Bas NL `#FF6B35`. Eyebrow + titre + description + CTA
  flèche qui se déplace au hover.
- **Footer** `RepubliqueFooter` partagé : bandeau Bleu France 4px + bloc *République Française*
  + devise *Liberté Égalité Fraternité*.
- **Login/Register** : `BrandHeader` + carte centrée avec accent top-Bleu France + même footer.

Composants partagés ajoutés :

- `components/RepubliqueFooter.tsx`
- `components/BrandHeader.tsx`

### Phase 6 : console admin — actions de modération + polish

Demande de l'utilisateur : « comment supprimer bob/alice/colleague1 ? » + « donne un coup de
polish à la console admin ».

**Backend** — `server/routes/admin-users.ts` :

- `POST /users/:id/disable` — `active = 0`, réversible.
- `POST /users/:id/enable` — `active = 1`.
- `DELETE /users/:id` — suppression dure. Cascade FK sur `user_storage` + `token_events`.
  - Bloque l'auto-action (`req.params.id === me.userId` → 400).
  - Bloque la suppression d'un admin (`invites.created_by` et `global_settings.updated_by`
    ne cascadent pas — désactivation seule possible).

**Frontend** :

- `AdminLayout` : chrome DSFR alignée Landing (BrandHeader + hero + footer), sidebar avec
  eyebrow par onglet et accent gauche Bleu France sur l'actif. Récupère `currentUser` pour
  l'identité affichée + la propagation à `UsersPanel`.
- `UsersPanel` : colonne **Actions** (Désactiver / Réactiver / Supprimer), confirmation
  `window.confirm` avec détail de l'effet en cascade, badge **vous** sur sa propre ligne,
  boutons d'action désactivés sur soi-même et sur les admins (pour Supprimer), pastilles
  d'état colorées, compteur en tête.
- `InvitesPanel` :
  - libellé `Utilisations max` → **« Nombre maximum d'inscriptions »** avec helper :
    « Combien de personnes peuvent utiliser ce code pour créer un compte. 1 = code à usage
    unique. »
  - colonne `Usages` → **« Inscriptions »** (`consommé / max`)
  - bouton **Copier** sur chaque code actif (clipboard)
  - à la création : callout vert pâle avec le nouveau code en gros + **Copier le code** +
    **Copier l'URL d'inscription** (génère `…/register?invite=XXX`)
- `ApiConfigPanel` : eyebrow + accent ; tabs avec sous-ligne colorée par matière ; callout
  vert sur sauvegarde réussie, callout rouge sur erreur.
- `MonitoringPanel` : 4 tuiles `border-t-2` colorées (Bleu France / indigo / orange / vert
  émeraude), légendes Recharts en français complet, badge App coloré dans le tableau,
  alignement `tabular-nums` sur tous les chiffres.

### Phase — câblage du 6ᵉ correcteur : Mathématiques (17 juin 2026)

Ajout du slug **`maths`** (port loopback **3025**, `API_corrector_mathematiques`) à la gateway,
6ᵉ sous-app de la suite (après PC/FR/NL/ES/SVT).

- **Backend** : `'maths'` ajouté aux `ALLOWED_APPS` de `storage.ts`, `admin-settings.ts`,
  `telemetry.ts`, `admin-storage.ts` ; route `{app:'maths', target: MATHS_TARGET ?? :3025}`
  dans `proxy.ts` (type `SubappRoute.app` étendu).
- **Frontend** : carte Mathématiques sur la `Landing` (icône `Sigma`, accent violet glycine
  `--maths-color #6A2C91`), onglet `maths` dans `ApiConfigPanel`, `PricingPanel`,
  `UserStorageDrawer` (type `AppSlug`), et série `maths` dans `MonitoringPanel`
  (`APP_COLOR`/`APP_LABEL`/barres empilées). `AppCard` : union `slug`/`accentVar` étendue.
- **Script** : `scripts/launch-all.sh` déclare `MATHS`, le `require_dir`, le `build_subapp …
  /app/maths/` et le `start_subapp … 3025 MATHS`.
- **Notation** : maths = **sommatif par question par défaut** (modèle PC/bac), paliers/bandeau
  en exception (démonstration exigible / problème ouvert). Vision scientifique activée
  (courbes, figures, tableaux de variations).
- `npm run lint` (tsc) **0 erreur**. Reste : service systemd `corrector-maths` + rebuild/restart.

### Phase — sécurité P2 de l'audit : chiffrement at-rest + anti-SSRF test de clé (12 juillet 2026)

Deux P2 sécurité de l'audit du 11/07 (`server/secrets-at-rest.ts`, `server/probe-allowlist.ts`) :

- **Chiffrement at-rest des clés API** : `global_settings.corrector_api_key` chiffrée
  AES-256-GCM (`encv1:` + base64(iv‖tag‖data)), clé dérivée (scrypt) de
  `STORAGE_ENC_SECRET` sinon `SESSION_SECRET`. Chiffrement à l'écriture (PUT
  admin-settings/storage, seeds mistral+albert), déchiffrement à la lecture (dumps,
  GET clé, sondes santé) avec passthrough sur les valeurs héritées en clair ;
  migration idempotente au boot (`migrateSecretsAtRest`, loggée). La config non
  sensible (baseUrl, modèles, routing, tarifs) reste en clair pour le debug.
  **⚠ Rotation** : changer le secret de dérivation rend les clés chiffrées
  illisibles (erreur explicite au déchiffrement) → relancer les seeds ou re-saisir
  les clés en admin APRÈS rotation. Définir `STORAGE_ENC_SECRET` découple la
  rotation de `SESSION_SECRET` (sessions) de celle des secrets stockés.
  Limite assumée (architecture client-side) : en mode managed, la clé est toujours
  servie EN CLAIR aux navigateurs connectés — le chiffrement ne protège que la base.
- **Anti-SSRF sur `POST /:app/test`** : la sonde « Tester la clé » n'atteint plus
  que les hôtes fournisseurs connus (miroir de l'allowlist du proxy des
  correcteurs, sous-domaines inclus) + extension `PROBE_ALLOWED_HOSTS` (csv) pour
  un fournisseur personnalisé. Refus → 400 `host_not_allowed` avec hint.
- Tests : `tests/secrets-at-rest.test.ts` (7) + `tests/probe-allowlist.test.ts` (4),
  29/29 au total, tsc 0 erreur. Sauvegarde `data/api-manage.db.bak-2026-07-12`
  (API backup SQLite, WAL inclus) avant la migration.

### Phase — demandes d'accès bêta + liste de diffusion (18 juillet 2026)

Commit `a609064`, déployé (build + restart `corrector-manage`). Sans SMTP serveur :
tout envoi passe par des brouillons `mailto:` pré-remplis + boutons copier.

- **`/request-access`** (public, lié depuis `/login` et `/register`) : email requis,
  nom, message, opt-in mailing non pré-coché (RGPD). Anti-abus : rate-limit
  5/15min/IP, honeypot `website`, clamps 254/120/2000, réponse toujours `{ok:true}`
  (anti-énumération) ; dédup applicatif par email sur statuts pending/approved
  (un refusé peut re-soumettre).
- **DB** : tables `access_requests` (statut pending/approved/rejected, `invite_code`
  volontairement sans FK — la révocation fait DELETE FROM invites) et `mailing_list`
  (email PK, upsert `ON CONFLICT DO UPDATE SET active=1` = ré-abonnement) ;
  colonnes `users.email` et `news.emailed_at` via `addColumnIfMissing`.
- **Onglet admin « Demandes d'accès »** (`AccessRequestsPanel.tsx`, badge non-lues
  pending dans le polling 60 s d'AdminLayout) : filtres statut/non-lues, lignes
  repliables (ouverture = lu), **Approuver** → invitation générée (`generateCode()`
  exporté d'invites.ts, 1 usage / 30 j, idempotent au re-clic) + bloc « Invitation
  prête » (mailto pré-rempli vers le demandeur + copier code/URL/message) ; Refuser,
  Supprimer. Sous-vue **Liste de diffusion** : ajout manuel, désinscrire/réinscrire,
  effacement (RGPD), « Copier toutes les adresses » (Cci), export CSV client-side.
- **NewsPanel** : bouton « Envoyer » par annonce publiée (mailto `?bcc=` tous les
  abonnés actifs) + bouton copie de repli (les URLs mailto cassent vers ~2000 chars)
  + trace « Envoyé le … » (`POST /api/v1/admin/news/:id/emailed`).
- **Register** : si l'invitation consommée provient d'une demande approuvée,
  `users.email` est rattaché au compte.
- Routes : `POST /api/v1/access-requests` (public) ; admin `GET/PATCH/DELETE
  /access-requests[...]`, `POST .../approve|reject`, `GET .../count` (badge),
  CRUD `/mailing-list`. Tests `tests/access-requests.test.ts` (9), 38/38 au total,
  tsc 0 erreur. Vérifié curl de bout en bout (demande → approve → register →
  email rattaché, invite consommée), données de test purgées.
- Reste : validation navigateur par Vincent (formulaire via l'URL Funnel, onglet
  admin, ouverture des brouillons mailto dans son client mail).
- **Navigation croisée annonces ↔ abonnés** (même jour, retour Vincent « comment
  lier à Nouveautés ? ») : le sous-onglet Demandes/Mailing est remonté dans
  `AdminLayout` ; la liste de diffusion gagne un bouton « Rédiger une annonce »
  (→ onglet Nouveautés) et le header de NewsPanel affiche le nombre d'abonnés
  avec un lien « gérer la liste » (→ onglet Demandes d'accès, sous-vue mailing).
- **Choix du canal de diffusion à la publication** (même jour, retour Vincent) :
  le formulaire d'annonce remplace la case « Publié » par un bloc **Diffusion**
  à deux cases — « Landing (fil Nouveautés) » (= `published`) et « Email aux
  X abonné(s) » (ouvre le brouillon Cci **à l'enregistrement** + marque
  `emailed_at`) — combinables : landing seule, email seul, les deux, ou aucune
  (brouillon). Le libellé du bouton s'adapte (« Publier sur la landing »,
  « Envoyer par email », « Publier + envoyer l'email », « Enregistrer le
  brouillon »). Colonne « Statut » → « Diffusion » (badges Landing / Email·date /
  Brouillon) ; les boutons Envoyer/Copier sont disponibles sur toutes les
  annonces (une annonce email-seul est un `published=0` avec `emailed_at`),
  « Envoyer » devient « Renvoyer » après un premier envoi. Case email désactivée
  à 0 abonné. Aucun changement de schéma ni d'API.

### Phase — retrait temporaire du branding République Française (19 juillet 2026)

Demande externe relayée par Vincent (origine amont probable : signalement DINUM,
cf. commits « Retire le marquage Republique Francaise » du 16/07 préexistants sur
la forge — fork FR + 6 jumeaux Albert). Retiré sur **21 dépôts** : blocs
« République / Française », devise « Liberté / Égalité / Fraternité », tagline
« Correcteur souverain — Éducation nationale » (→ « Correcteur de copies assisté
par IA »). Conservés : palette Bleu France, police Marianne, coq, URLs gouv.fr,
contenus pédagogiques. Côté API_manage : `RepubliqueFooter.tsx`/`BrandHeader.tsx`
neutralisés (fichiers et imports intacts → restauration triviale) + blocs inline
`Landing.tsx` et `AdminLayout.tsx` (commit `9f416cb`). Un commit **dédié par
dépôt** → restauration par `git revert` ; table complète dépôt→commit + snippets
dans la mémoire `restauration-branding-republique.md`. Vérifié : grep multi-casse
sans résidu visible, 38/38 + 220/221 tests, rebuild+restart ×11 + gateway,
bundles servis propres. Les 9 Albert ensuite alignés sur le périmètre élargi des
commits DINUM (badge Étalab, « IA souveraine », commentaires DSFR) — validé Vincent.

### Phase — relooking UX/UI demandes d'accès + liste de diffusion (19 juillet 2026)

Retour Vincent (« travailler l'UX/UI du tout, notamment liste de diffusion »).
Refonte front-only de `AccessRequestsPanel.tsx`, aucun changement d'API.

- **Données remontées dans le parent** : `AccessRequestsPanel` charge demandes +
  abonnés en un seul `reload` partagé ; les boutons segmentés Demandes / Liste de
  diffusion portent des pastilles de compteurs (en attente / abonnés actifs)
  toujours justes, un unique bouton Rafraîchir couvre les deux vues, et approuver
  une demande opt-in resynchronise la liste de diffusion.
- **Tuiles-statistiques cliquables** (pattern Tile du Monitoring, `border-t-2` +
  variable CSS) qui servent de filtres à bascule : demandes — En attente (`--bf500`),
  Approuvées (`--green-emeraude`), Refusées (`--destructive`), Non-lues
  (`--nl-color`, remplace le select statut + case non-lues) ; mailing — Actifs,
  Désinscrits, Via demande bêta, Ajouts manuels (statut et source combinables).
- **Recherche** dans le header des deux vues (email/nom/message côté demandes,
  email côté mailing), filtrage client-side (les listes sont petites), ligne
  « X affichée(s) sur Y » quand un filtre est actif + bouton « Réinitialiser ».
- **Table de diffusion retravaillée** : tri actifs d'abord puis plus récents,
  lignes désinscrites estompées (`opacity-60`), badges Source (Demande bêta /
  Ajout manuel) et Statut en pilules, actions avec icônes (UserMinus/UserCheck,
  corbeille icône seule + tooltip RGPD), en-têtes uppercase, ligne de synthèse
  sous la table. Formulaire d'ajout compacté en une ligne (Entrée = ajouter,
  anti double-soumission).
- **États vides illustrés** (icône + titre + piste d'action) distincts du cas
  « aucun résultat pour ces filtres ».
- tsc 0 erreur, 38/38 tests, déployé (build + restart `corrector-manage`).

### 2026-07-20 : un compte = un correcteur (choix définitif à l'inscription)

Demande Vincent : l'utilisateur choisit UN SEUL correcteur à l'inscription et ne peut
plus en changer ; seul l'admin peut le réassigner en cas d'erreur.

- **DB** : colonne `users.assigned_app` (TEXT, NULL = pas de restriction — comptes
  historiques et admins). Migration idempotente `addColumnIfMissing`.
- **`lib/apps.ts`** (nouveau, partagé front/back) : source de vérité des 11 correcteurs
  (slug, titre, eyebrow, description, accentVar) + `isCorrectorSlug`/`correctorTitle`.
  Les tuiles de la Landing sont désormais générées depuis cette liste.
- **`server/app-access.ts`** (nouveau) : `canAccessApp(role, assigned, app)` (pure,
  testée) + `getUserAccess(userId)` — relecture DB à chaque requête, donc une
  réassignation ou désactivation admin prend effet immédiatement (vérifié par sonde).
- **Register** : champ `app` obligatoire (400 `invalid_app` sinon), stocké à la création ;
  sélecteur de matière dans le formulaire avec encart « Ce choix est définitif ».
- **Reverse proxy `/app/*`** : gate par correcteur assigné (302 → `/` si autre matière)
  + contrôle `active` en DB (un compte désactivé perd l'accès sans attendre l'expiration
  du cookie de 30 j — comblait un trou préexistant).
- **Storage REST `/api/v1/storage/:app/*`** : même verrou, 403 `app_not_assigned`
  (sinon contournement par appel API direct).
- **Admin** : `PUT /api/v1/admin/users/:id/app` (slug ou null = lever la restriction) ;
  colonne « Correcteur » avec sélecteur + confirm dans l'onglet Utilisateurs ;
  `GET /users` expose `assigned_app`. `/me` et login renvoient `assignedApp`.
- **Landing** : user restreint ne voit que sa tuile (« Votre correcteur ») + note
  « contactez l'administrateur pour en changer ».
- **Fix au passage** : les boutons Désactiver/Réactiver du panneau Utilisateurs
  appelaient `POST /users/:id/disable|enable` (routes inexistantes → 404) ; réalignés
  sur `PUT /users/:id/active`.
- tsc 0 erreur, 43/43 tests (5 nouveaux dans `tests/assigned-app.test.ts`), déployé
  (build + restart `corrector-manage`), sondes runtime OK (proxy 200/302, storage
  200/403, register 400, réassignation immédiate, session d'un compte supprimé → /login).

---

## Garde-fous de sécurité

- Mots de passe `bcryptjs` cost 12.
- Sessions iron-session (HTTP-only, signed + encrypted, SameSite=Lax, Secure en prod).
- Rate-limit 5/min/IP sur `/api/v1/auth/login`.
- Codes d'invitation 12 chars crypto-random, alphabet sans confusions visuelles.
- Allowlist anti-SSRF côté `proxy-routes.ts` des sous-apps + validation post-redirection.
- Reverse proxy `/app/*` gated par session — l'URL Funnel partagée seule ne suffit pas.
- Clés API partagées chiffrées at-rest en DB depuis le 12/07/2026 (AES-256-GCM,
  `server/secrets-at-rest.ts` — voir la phase du 12 juillet pour la rotation).
  Elles restent servies en clair aux navigateurs connectés (architecture client-side).
- Test de clé admin restreint aux hôtes fournisseurs connus (`server/probe-allowlist.ts`,
  extension via `PROBE_ALLOWED_HOSTS`).

---

## Phase — Tout le projet sur un dépôt unique, installable en une ligne (20 juillet 2026)

Objectif : pouvoir répliquer TOUTE la suite (API_manage + 11 correcteurs web, **hors
Albert et TUI Go**) sur un autre serveur en une commande.

**Réalisé, LIVRÉ+POUSSÉ :**
- **Consolidation forge** — nouveau dépôt privé `git@forge.apps.education.fr:durieuxvincent/corrector.git`
  (créé vierge par Vincent). Poussé **12 branches** : `manage` (API_manage, poussée EN PREMIER
  → devient la branche par défaut sans manipulation d'API) + les 11 branches correcteurs.
  Les remotes des 11 forks re-pointés vers `corrector.git` (FR : remote `forge`, `origin`
  reste le checkout PC local). L'ancien `api-corrector.git` est laissé intact (repli).
  FR : 2 commits en attente poussés au passage.
- **`deploy/`** (branche `manage`) — outillage d'installation :
  `install-all.sh` (point d'entrée de la ligne unique), `bootstrap.sh` (clones, double
  remote FR), `install.sh` (npm ci + builds `VITE_BASE_PATH`), `install-services.sh`
  (systemd) + `install-services-macos.sh` (LaunchAgents, best-effort), `export-state.sh`
  / `restore-state.sh` (migration DB+.env, checkpoint WAL), `smoke-test.sh`, `preflight.sh`,
  `lib.sh`, `forks.tsv` (source de vérité slug/dossier/branche/port), templates systemd ×3
  + plist ×2, `README-DEPLOY.md`. Bash 3.2-compatible, idempotent, `--only`, chemins dérivés.
- **`README.md`** réécrit = vitrine forge (ligne unique en premier, table des 11, un dépôt/12 branches).
- **Correctifs** : `scripts/launch-all.sh` gagne le correcteur **tech** (oublié) ; `package.json`
  `engines: node>=22`.

**Vérifié (sans second serveur, disque à 99 %) :**
- `bash -n` sur les 12 scripts : OK.
- **Preuve par diff** : les 13 unités systemd rendues par `install-services.sh --render-only`
  sont **identiques octet pour octet** aux unités de production.
- **Répétition d'installation vierge** dans un parent isolé (scratch) : clone `-b manage`
  → `install-all.sh --only pc --no-services --yes` (bootstrap + npm ci + builds gateway+pc,
  `.env` généré, seed admin OK) → démarrage gateway:4000 / pc:4001 → **smoke-test tout vert**
  (santé, gate `/app/*` 302, login admin, `/app/pc/` authentifié + assets préfixés). Démonté,
  production (3000-3045) jamais touchée.
- Deux bugs corrigés grâce à la répétition : `bootstrap.sh` ne parsait pas `--only` ;
  `install-all` ne garantissait pas la gateway quand `--only` scope des forks (normalisation de `ONLY`).

Commits `manage` : `43101cc` (tech+engines), `c4b97c8` (deploy+README), `de80578` (fixes répétition).

**Reste (optionnel, décision Vincent) :** répétition de la **migration d'état** (`export-state.sh`
coupe la gateway live ~10-30 s → à faire en heure creuse) ; le jour J réel (systemd sur machine
vierge, funnel/ACL) ; le PAT de `api-corrector/SUIVI.md` est **rejeté (401)** → à régénérer/retirer.

---

## Pendant / hors scope

- Chiffrement at-rest des clés API en DB.
- Backup automatique de `data/api-manage.db` (faire un dump manuel pour l'instant).
- 2FA / OAuth / SSO externe.
- Dialog shadcn pour les confirmations (utilise `window.confirm` actuellement).
- Filtre temporel (`from`/`to`) côté `MonitoringPanel` (les routes API le supportent déjà).
- Drill-down par modèle/tâche dans le monitoring.
