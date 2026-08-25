# CLAUDE.md

Ce fichier guide Claude Code dans le repo API_manage.

## Identité du projet

**API_manage** est le quatrième app de la suite Correctors. Il sert :
1. de landing page publique (accessible via Tailscale Funnel) pour les sous-apps (PC, FR, NL, ES, SVT, Maths, SES, Techno, Anglais, Philosophie, Histoire-Géographie),
2. de système d'authentification multi-utilisateurs,
3. de backend de storage centralisé (les sous-apps interrogent ses endpoints REST pour leurs données),
4. de panneau admin (clé API partagée, invitations, monitoring token usage).

Plan détaillé : `/home/profkrapu/.claude/plans/il-est-temps-maintenant-calm-knuth.md`.

## Commandes

```bash
npm run dev          # Vite (:3000) + Express (:3100) en parallèle via concurrently
npm run dev:web      # Vite seul
npm run dev:server   # Express seul (tsx watch)
npm run build:web    # Bundle Vite → dist/
npm run serve        # Prod : Express (:3000) sert dist/ + API + reverse proxy
npm run lint         # tsc --noEmit
npm run seed:admin   # crée/met à jour l'admin depuis .env
```

## Déploiement systemd (prod)

La suite complète tourne via les services user systemd (1 par sous-app) + 1 funnel, persistants au reboot :

| Service | Port | Répertoire |
|---|---|---|
| `corrector-pc` | 3001 | `~/Documents/API_corrector` |
| `corrector-fr` | 3005 | `~/Documents/API_corrector_francais` |
| `corrector-nl` | 3009 | `~/Documents/API_corrector_neerlandais` |
| `corrector-es` | 3013 | `~/Documents/API_corrector_espagnol` |
| `corrector-svt` | 3021 | `~/Documents/API_corrector_svt` |
| `corrector-maths` | 3025 | `~/Documents/API_corrector_mathematiques` |
| `corrector-ses` | 3029 | `~/Documents/API_corrector_ses` |
| `corrector-tech` | 3033 | `~/Documents/API_corrector_technologie` |
| `corrector-en` | 3037 | `~/Documents/API_corrector_anglais` |
| `corrector-philo` | 3041 | `~/Documents/API_corrector_philosophie` |
| `corrector-hg` | 3045 | `~/Documents/API_corrector_histoire_geographie` |
| `corrector-manage` | 3000 | `~/Documents/API_manage` |
| `tailscale-funnel` | 443→3000 | Funnel `--bg --https=443` |

Les unités sont dans `~/.config/systemd/user/corrector-{pc,fr,nl,es,svt,maths,ses,tech,en,philo,hg,manage}.service` et `tailscale-funnel.service`.
`corrector-manage` dépend des sous-apps (`After=` + `Wants=`). Le funnel dépend de `corrector-manage`.

```bash
# Gestion courante
systemctl --user status corrector-{pc,fr,nl,manage} tailscale-funnel
systemctl --user restart corrector-manage                    # restart le gateway
systemctl --user restart corrector-pc                        # restart une sous-app
journalctl --user -u corrector-manage -f                     # logs en direct

# Tout relancer après un changement
systemctl --user restart corrector-pc corrector-fr corrector-nl corrector-es corrector-svt corrector-maths corrector-ses corrector-tech corrector-en corrector-philo corrector-hg corrector-manage

# Rebuild + restart (après modif code)
# Gateway API_manage : build SANS préfixe (servi à la racine).
npm run build:web && systemctl --user restart corrector-manage
# Sous-apps : build OBLIGATOIREMENT avec VITE_BASE_PATH (sinon base='/' → assets racine-absolus
# → page blanche derrière le proxy /app/pc). Idem fr→/app/fr/, nl→/app/nl/.
cd ~/Documents/API_corrector && VITE_BASE_PATH=/app/pc/ npm run build:web && systemctl --user restart corrector-pc
```

L'ancien script `scripts/launch-all.sh` reste disponible pour un lancement manuel hors systemd.

## Architecture

### Deux process en dev, un en prod

- **Dev** : Vite (`vite --port=3000`) sert le SPA, Express (`tsx watch server/index.ts`) sert l'API.
  Le proxy Vite redirige `/api/*` et `/app/*` vers Express :3100.
- **Prod** : un seul Express sur :3000 qui sert `dist/` + l'API + le reverse proxy.

### Couches

- `src/`, `components/`, `lib/` — frontend React + shadcn (style DSFR, copié du fork FR pour cohérence).
- `server/` — backend Express, DB SQLite, routes API.
- `server/db.ts` — singleton better-sqlite3, migrations idempotentes au boot.

### Path alias

`@/*` résout depuis la racine (pas `src/`) — `lib/`, `components/`, `src/` sont tous des frères.

### Reverse proxy

`/app/pc/*` → `http://127.0.0.1:3001`, `/app/fr/*` → `:3005`, `/app/nl/*` → `:3009`,
`/app/es/*` → `:3013`, `/app/svt/*` → `:3021`, `/app/maths/*` → `:3025`, `/app/ses/*` → `:3029`,
`/app/tech/*` → `:3033`, `/app/en/*` → `:3037`, `/app/philo/*` → `:3041`, `/app/hg/*` → `:3045`.
Toutes ces routes sont gatées par session + compte actif + correcteur assigné
(`users.assigned_app`, choisi définitivement à l'inscription ; NULL = pas de restriction,
réassignable par l'admin via l'onglet Utilisateurs). Le storage REST applique le même
verrou (403 `app_not_assigned`). Logique partagée dans `server/app-access.ts`,
liste des correcteurs dans `lib/apps.ts`. Le header `X-Subapp` est injecté pour
que les sous-apps sachent vers quelle scope storage écrire.

### Storage REST

L'abstraction `storeGet`/`storeSet`/`storeDelete` de `lib/tauri.ts` des sous-apps gagne
un 3e backend "remote" qui appelle `/api/v1/storage/:app/:key`.

Côté serveur, une allowlist `ADMIN_CONTROLLED_KEYS` arbitre entre :
- `global_settings` (clé API, baseUrl, modèles routing — admin-only en écriture, lecture pour tous)
- `user_storage` (classes, DS, dashboard state — privé par user)

## Conventions

- Commentaires et identifiants en **français** (cohérent avec les sous-apps).
- Pas d'`index.ts` barrels.
- shadcn/ui dans `components/ui/`, métier dans `components/`.
- Préférer `better-sqlite3` synchrone aux ORM (vu les volumes, c'est plus simple et plus rapide).
- Les migrations sont idempotentes (`CREATE TABLE IF NOT EXISTS …`) — pas de versioning manuel.
