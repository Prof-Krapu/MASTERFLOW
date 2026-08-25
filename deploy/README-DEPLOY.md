# Déploiement de la suite Correctors — guide détaillé

Ce dossier (`deploy/`) contient tout l'outillage pour répliquer l'intégralité de la
suite (gateway **API_manage** + 11 correcteurs web) sur une machine Linux ou macOS.
Le `README.md` à la racine donne la version courte (la ligne unique) ; ce fichier
couvre les prérequis par OS, la migration de l'état, l'exposition réseau et le dépannage.

> Périmètre : 11 correcteurs web + API_manage. **Exclus** : jumeaux `Albert_*`, TUI Go.

---

## 1. Vue d'ensemble

Un seul dépôt privé, **12 branches** : `manage` (API_manage, branche par défaut) +
11 branches correcteurs. La gateway écoute sur `:3000` et fait du reverse-proxy gaté
par session vers 11 sous-apps en loopback :

```
Tailscale Funnel (HTTPS public)  →  API_manage :3000
                                       ├─ /app/pc/    → 127.0.0.1:3001  Physique-Chimie
                                       ├─ /app/fr/    → 127.0.0.1:3005  Français
                                       ├─ /app/nl/    → 127.0.0.1:3009  Néerlandais
                                       ├─ /app/es/    → 127.0.0.1:3013  Espagnol
                                       ├─ /app/svt/   → 127.0.0.1:3021  SVT
                                       ├─ /app/maths/ → 127.0.0.1:3025  Mathématiques
                                       ├─ /app/ses/   → 127.0.0.1:3029  SES
                                       ├─ /app/tech/  → 127.0.0.1:3033  Technologie
                                       ├─ /app/en/    → 127.0.0.1:3037  Anglais
                                       ├─ /app/philo/ → 127.0.0.1:3041  Philosophie
                                       └─ /app/hg/    → 127.0.0.1:3045  Histoire-Géo
```

La source de vérité de ce câblage est [`forks.tsv`](forks.tsv), à garder alignée avec
`server/routes/proxy.ts` (`loadRoutes()`).

## 2. Prérequis

**L'installateur détecte, propose et installe lui-même ce qui manque** (git, Node ≥ 22,
npm, outils de compilation) via le gestionnaire de paquets de la machine — `apt-get`,
`dnf`, `yum`, `pacman`, `zypper` sur Linux (avec `sudo`), `brew` sur macOS. Il demande
confirmation à chaque installation ; en mode `--yes` il installe sans poser de question.
Node est posé avec un **chemin stable** (NodeSource sur Linux, `brew install node@22` sur
macOS — **jamais `nvm`**, exigé par systemd/launchd). La seule chose à avoir au départ :
de quoi cloner un dépôt privé (**clé SSH** sur la forge, ou **PAT** pour HTTPS — voir §7)
et, sur Linux, un gestionnaire de paquets utilisable en `sudo`.

Détail de ce qui est requis (et auto-installable) :
- **Git** + accès au dépôt privé (clé SSH ou PAT).
- **Node ≥ 22** (+ **npm**, fourni avec) — chemin stable, pas `nvm`.
- Compilateur C + `python3` **en secours seulement** si le prebuild `better-sqlite3`
  manque pour la plateforme (proposé automatiquement ; Xcode CLT à installer à la main sur macOS).
- Linux : `systemd --user` + `loginctl` (linger) pour que les services survivent à la déconnexion.
- Exposition publique (optionnelle) : `tailscale`.

### Dépendances d'exécution optionnelles (étape 1bis : `install-extras.sh`)

L'installateur propose ensuite quatre capacités **refusables** — jamais bloquantes :
le cœur de la suite (correction, OCR, dashboard, chat) n'en dépend pas.

| Capacité | Binaire(s) | Paquets (Debian/Ubuntu) | Sans elle |
|---|---|---|---|
| Aperçu PDF (assistant) | `latexmk` + `xelatex` + styles | `latexmk texlive-xetex texlive-latex-recommended texlive-latex-extra texlive-pictures texlive-science texlive-lang-french texlive-fonts-recommended` (~1,5 Go) | bouton « PDF » masqué, repli `.tex`/Overleaf |
| Export DOCX | `pandoc` | `pandoc` | bouton « DOCX » masqué |
| **Éditeur Word** (onglet Word de l'assistant) | `pandoc` **≥ 2.15** (`--sandbox`) | idem, mais un pandoc de distro trop ancien ne suffit pas | onglet Word en erreur — voir ci-dessous |
| Recherche web | conteneur SearXNG | `docker.io` + image `searxng/searxng` (127.0.0.1:8888) | toggle « Web » masqué |
| Exposition HTTPS | `tailscale` | script officiel multi-distro | usage local seul |

**Les capacités sont vérifiées par l'usage, pas par la présence du binaire.**
`install-extras.sh` fait, à chaque passage (y compris quand rien n'est à installer) :

- `kpsewhich` sur les **24 entrées** de la liste blanche `ALLOWED_PACKAGES` de
  `latex-routes.ts` (siunitx, mhchem, chemfig, tikz, pgfplots, tcolorbox, exam…),
  **puis une compilation XeLaTeX d'essai** qui les charge toutes (~3 s) : une
  distribution TeX incomplète répond `latexmk --version` sans savoir compiler ;
- un **aller-retour pandoc réel** (`latex → html5 --mathml --sandbox → docx`),
  seul moyen de trancher : `pandoc --sandbox --version` renvoie 0 même sur un
  pandoc qui ignore l'option, car `--version` court-circuite l'analyse des autres
  arguments ;
- une requête JSON réelle sur SearXNG (`search: formats: [html, json]`, exigé par
  les forks) après configuration au mieux du volume.

Le récapitulatif final (`PDF · DOCX · Éditeur Word · Web`) reflète ces mesures, pas
la présence des binaires. `--no-extras` saute l'étape ; `deploy/install-extras.sh`
est relançable seul à tout moment. Trois pièges :

- **Sonde figée** : chaque fork met en cache sa détection latexmk/pandoc à vie du
  process — après ajout sur une machine déjà servie :
  `systemctl --user restart 'corrector-*'`.
- **pandoc trop ancien** : `/api/latex/health` ne teste que la présence du binaire
  et renvoie `html: true`. Le client affiche donc l'onglet Word, qui échoue au
  premier clic si `--sandbox` est inconnu. Correctif : paquet `.deb`/`.rpm` depuis
  [github.com/jgm/pandoc/releases](https://github.com/jgm/pandoc/releases), puis
  redémarrage des services.
- **Servies dans les deux modes** depuis que la gateway porte `server/routes/fork-api.ts`.
  Ce n'était pas le cas avant : en mode économe, `/api/latex/*` et `/api/search` des
  forks tombaient dans le repli SPA (§3 bis).

## 3. Installation en une ligne

SSH (recommandé) :

```bash
git clone -b manage git@forge.apps.education.fr:durieuxvincent/corrector.git corrector-suite/API_manage \
  && corrector-suite/API_manage/deploy/install-all.sh
```

HTTPS + PAT (sans clé SSH) :

```bash
git clone -b manage https://<PAT>@forge.apps.education.fr/durieuxvincent/corrector.git corrector-suite/API_manage \
  && corrector-suite/API_manage/deploy/install-all.sh
```

`install-all.sh` enchaîne : prérequis → `bootstrap.sh` (clone les 11 forks sous le
parent) → `install.sh` (`npm ci` + builds web) → génération `.env` + seed admin
(+ clé LLM optionnelle) → services (systemd/launchd) → `smoke-test.sh` → récap.
Idempotent et relançable. Options : `--yes` (non interactif, mdp admin aléatoire),
`--complet` (12 services), `--only pc,fr`, `--no-services`, `--no-extras`,
`--skip-install`, `--skip-build`, `NO_TUI=1` (sortie texte simple).

L'installateur s'affiche en **interface terminal** : bannière, prérequis ligne à ligne,
**menu à cases cochables** pour les capacités (flèches, espace, `a`, `n`, entrée), barre
de progression, récapitulatif encadré. Sans terminal — sortie redirigée, `--yes`,
`NO_TUI=1` — il retombe sur une sortie texte sans aucune séquence d'échappement.

L'URL du dépôt est **dérivée du remote `origin`** d'API_manage : le clone SSH comme
HTTPS+PAT fonctionne sans reconfiguration (repli sur l'URL SSH en dur).

> **Le mode économe est le DÉFAUT.** `--complet` reste disponible et n'est justifié que
> pour redémarrer/déboguer un correcteur isolément — voir §3 bis.

### 3 bis. Mode économe (défaut) — un service, toutes les capacités

```bash
deploy/install-all.sh --yes            # économe
deploy/install-all.sh --complet --yes  # 12 process
```

**Le problème.** En `--complet`, la suite lance 12 process Node : la gateway + un serveur
de fichiers par correcteur. Mesuré au repos sur le poste de dev :

| | process | RSS mesuré |
|---|---|---|
| **économe** (static) | **1** | **173 Mo** |
| `--complet` (proxy) | 12 | **1 084 Mo** (~85 Mo par fork, 138 Mo gateway) |

Ces ~85 Mo par correcteur ne sont pas l'applicatif : le serveur d'un fork fait
**44 lignes** et ne fait que servir des fichiers. C'est le `tsx`/esbuild résident dans
chaque service qui pèse. Les supprimer ne retire donc aucune fonctionnalité.

**Ce que fait le mode économe.**
1. `install.sh` construit les 11 fronts comme d'habitude (`VITE_BASE_PATH=/app/<slug>/`),
   puis **pré-compresse** les bundles (`.gz` à côté du fichier) : 3,9 Mo → 1,5 Mo sur le
   plus gros. La compression est faite **au build**, pas à l'exécution — une machine
   modeste n'a pas à regzipper 4 Mo pour chaque visiteur.
2. `install-services.sh` n'installe **que** `corrector-manage` et le funnel, et pose
   `CORRECTOR_SERVE_MODE=static` dans l'unité.
3. La gateway sert alors `<PARENT>/<dossier>/dist` à `/app/<slug>/`, derrière **exactement
   la même gate de session** (`requireAppAccessOrRedirect`) qu'en mode proxy.
4. Elle monte **les routes serveur des forks** (`server/routes/fork-api.ts`) sous chaque
   préfixe `/app/<slug>`, AVANT le service statique : `/api/proxy` (relais LLM),
   `/api/latex/*` (PDF, DOCX, éditeur Word) et `/api/search` (SearXNG). Un seul routeur
   pour les 11, donc une seule file d'attente de compilation LaTeX — xelatex est gourmand,
   11 files indépendantes écrouleraient une machine à 4 Go.

**Ce qui ne change pas** : les URL, l'écran de connexion, le cloisonnement par compte
(`users.assigned_app`), le stockage REST, l'accès navigateur par tunnel Tailscale. Les
sous-apps déduisent leur slug de `window.location.pathname`, pas d'un en-tête : le
navigateur voit la même chose dans les deux modes.

**Ce qui n'est plus perdu.** Jusqu'au montage de `fork-api.ts`, ce mode ne servait qu'une
interface morte : `/app/<slug>/api/latex/health` renvoyait `200 text/html` (le repli SPA
rendait la page à la place du JSON) et `/api/proxy` un `404`. Donc ni rendu PDF, ni
recherche web, **ni même correction** — `rewriteBrowserProxyRequest` (`lib/tauri.ts` des
forks) fait passer tous les appels LLM du navigateur par `/app/<slug>/api/proxy`.
Vérifié depuis : rendu TeX → PDF (1 page A4) et TeX → DOCX à travers la gateway économe.
`tests/fork-api-parite.test.ts` échoue si une copie de `server/fork-api/` dérive du fork.

**Bascule d'une installation existante** : relancer `deploy/install-all.sh` suffit. Le script
`disable --now` puis retire les 11 unités fork — sans cet arrêt, elles continueraient de
tourner et le gain de RAM n'existerait pas.

**Quand renoncer au mode économe.** Un seul cas : vouloir redémarrer, mettre à jour ou
déboguer **un** correcteur isolément (`systemctl --user restart corrector-svt`) sans toucher
aux dix autres ni à la gateway. Utile sur une machine de développement, sans objet sur un
serveur. Passage aux 12 process : `deploy/install-all.sh --complet`.

**Si un correcteur répond 503** en mode économe, son `dist/` n'a pas été construit sur cette
machine ; le message le dit et donne la commande (`deploy/install.sh --only <slug>`).

## 4. Scripts (référence)

| Script | Côté | Rôle |
|---|---|---|
| `install-all.sh` | cible | orchestrateur — **point d'entrée de la ligne unique** |
| `bootstrap.sh` | cible | clone les 11 forks (`--single-branch`) ; double remote FR |
| `install.sh` | cible | `npm ci` + `vite build` (forks : `VITE_BASE_PATH=/app/<slug>/`) |
| `install-extras.sh` | cible | dépendances d'exécution optionnelles : LaTeX, pandoc, SearXNG (Docker), tailscale |
| `install-services.sh` | cible Linux | rend + active les 13 units systemd depuis `templates/` |
| `install-services-macos.sh` | cible macOS | rend + charge les LaunchAgents (best-effort) |
| `smoke-test.sh` | cible | santé publique, gate `/app/*`, login admin, assets préfixés |
| `preflight.sh` | source | contrôle forks propres/synchro + absence de secret commité |
| `export-state.sh` | source | archive l'état vivant (SQLite + `.env`) après checkpoint WAL |
| `restore-state.sh` | cible | restaure l'archive, `chmod 600`, redémarre les services |
| `install-autopush.sh` | **dév** | installe un hook post-commit qui pousse vers corrector.git à chaque commit |
| `lib.sh` | — | fonctions/chemins partagés (bash 3.2) |
| `forks.tsv` | — | source de vérité slug/dossier/branche/port/label |
| `templates/` | — | gabarits systemd (×3) + plist macOS (×2) |

**Auto-push à chaque commit (machine de développement uniquement).**
`deploy/install-autopush.sh` installe dans les 12 dépôts un hook `post-commit` qui
**pousse automatiquement la branche courante vers corrector.git après chaque commit**
(tes messages restent les tiens ; seul l'envoi est automatisé). Le hook ne pousse que
vers un remote pointant sur `corrector.git` (gère le double-remote FR en choisissant
`forge`, jamais l'`origin` local) et journalise dans `<repo>/.git/autopush.log`. À **ne
pas** installer sur un serveur cible. Retrait : `deploy/install-autopush.sh --uninstall`.

## 5. Migration de l'état vivant (optionnelle)

L'installation vierge crée une base neuve. Pour transférer classes, DS, historique,
utilisateurs et clés API depuis la machine source :

```bash
# Sur la SOURCE (heure creuse — coupe ~10-30 s la gateway) :
API_manage/deploy/export-state.sh          # → corrector-state-<horodatage>.tar.gz (chmod 600)

# Transfert par canal sûr (jamais en clair sur le réseau) :
scp corrector-state-*.tar.gz  cible:/tmp/     # ou via tailscale

# Sur la CIBLE :
corrector-suite/API_manage/deploy/restore-state.sh /tmp/corrector-state-*.tar.gz
```

L'archive contient **tous les secrets** (`.env` avec `SESSION_SECRET`, base SQLite).
Les clés API stockées en base sont chiffrées (AES-256-GCM) avec une clé dérivée de
`SESSION_SECRET` (ou `STORAGE_ENC_SECRET` s'il est défini) : elles ne sont
déchiffrables qu'avec le **même** secret, restauré via `.env`. Si le secret diffère,
relancer `npm run seed:mistral` / `seed:albert` ou re-saisir les clés dans l'admin.
**Effacer l'archive des deux côtés** après restauration.

## 6. Exposition réseau (Tailscale Funnel)

```bash
tailscale funnel --bg --https=443 http://localhost:3000
```

L'URL publique devient `https://<hostname>.<tailnet>.ts.net`. Les ports 3001-3045
restent **strictement loopback** (jamais exposés). Sur Linux, l'unité
`tailscale-funnel.service` relance le funnel au boot si `tailscale` est présent.

## 7. Accès au dépôt privé & PAT

Le dépôt est **privé** (pas de `curl | bash` public) : l'authentification passe par git.
- **SSH** : ajouter sa clé publique sur la forge (Preferences → SSH Keys).
- **HTTPS + PAT** : jeton scope `read_repository` suffisant pour cloner/pull. Ne
  **jamais** committer le PAT ni le mettre dans une URL de remote persistée
  (`git remote set-url` sans le token ; utiliser un credential helper).

## 8. Mise à jour

```bash
git -C corrector-suite/API_manage pull            # gateway
# et pour chaque fork (ou boucle sur forks.tsv) : git pull sur sa branche
corrector-suite/API_manage/deploy/install.sh      # re-deps + rebuild
systemctl --user restart 'corrector-*.service'    # Linux
```

## 9. Dépannage

- **`better-sqlite3` ne compile pas** : installer `build-essential python3` (Linux) /
  Xcode CLT (macOS), puis relancer `deploy/install.sh`.
- **Un `/app/<slug>/` renvoie du blanc / 404 d'assets** : rebuild du fork avec le bon
  `VITE_BASE_PATH=/app/<slug>/` (`deploy/install.sh --only <slug>`).
- **`/app/*` redirige toujours vers `/login`** : normal si non authentifié (gate session).
- **Services non lancés après reboot (Linux)** : `loginctl enable-linger $USER`.
- **Le funnel n'expose rien** : `tailscale status` (connecté ?), ACL du tailnet, `--https=443`.
- **FR : `git pull` se plaint du remote** : le fork FR a deux remotes — `forge`
  (dépôt corrector) et `origin` (checkout PC local). Pull depuis `forge/Fr`.
- **Boutons « Générer le PDF » / « DOCX » absents de l'assistant** : deux causes —
  (1) `latexmk`/`pandoc` absents → `deploy/install-extras.sh` ; (2) binaires ajoutés
  après coup → la sonde est figée au démarrage du process :
  `systemctl --user restart corrector-manage` (mode économe) ou
  `systemctl --user restart 'corrector-*'` (mode complet).
  Le mode économe n'est PLUS une cause : la gateway porte ces routes depuis
  `server/routes/fork-api.ts`. Vérifier au besoin :
  `curl -sb <cookie> http://localhost:3000/app/pc/api/latex/health` doit renvoyer du
  **JSON** ; du `text/html` signifie que le repli SPA a repris la main.
- **L'onglet Word s'affiche mais échoue au clic** (« erreur pandoc », le PDF et
  l'export DOCX marchent) : pandoc trop ancien pour `--sandbox`, exigé par les
  routes `/html` et `/docx-from-html`. `deploy/install-extras.sh` le diagnostique
  (« Éditeur Word non ») ; correctif : pandoc ≥ 2.15 depuis
  [github.com/jgm/pandoc/releases](https://github.com/jgm/pandoc/releases) puis
  `systemctl --user restart 'corrector-*'`.
- **Le PDF échoue alors que `latexmk` est installé** : distribution TeX
  incomplète. `deploy/install-extras.sh` le montre (« la compilation d'essai
  échoue ») et laisse le répertoire de diagnostic en place — le `probe.log` y
  nomme le style manquant.
- **Toggle « Web » absent de l'assistant** : SearXNG injoignable →
  `deploy/install-extras.sh` (conteneur sur 127.0.0.1:8888 + `formats: [html, json]`),
  puis vérifier `docker logs searxng`.

## 10. Vérification sans second serveur

- `bash -n deploy/*.sh` (syntaxe) ; `shellcheck` si dispo.
- **Preuve par diff (zéro risque)** : `install-services.sh --render-only --unit-dir <scratch>`
  puis `diff` des units rendues contre `~/.config/systemd/user/` → identiques.
- **Répétition scopée** dans un répertoire d'essai :
  `CORRECTORS_PARENT=/chemin/essai … install-all.sh --only pc,fr --no-services`,
  puis démarrage manuel sur ports décalés et `smoke-test.sh http://localhost:4000`.

## 11. Ce qui n'est PAS automatisé (checklist jour J)

systemd sur machine vierge, `enable-linger`, le login tailscale (`tailscale up`) + ACL
du tailnet, et le chemin macOS/launchd (marqué **best-effort**, non testé depuis
Linux ; sur macOS, Docker Desktop doit être ouvert à la main pour SearXNG). Les
`apt`/`brew` des prérequis et des dépendances d'exécution (LaTeX, pandoc, Docker,
tailscale) sont, eux, proposés par l'installateur.
