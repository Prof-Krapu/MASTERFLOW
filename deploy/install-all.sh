#!/usr/bin/env bash
# install-all.sh — POINT D'ENTRÉE de l'installation en une ligne.
# Orchestre : prérequis → bootstrap (clones) → install (deps+builds) → .env+seed
# → services (systemd/launchd) → smoke-test → récap. Idempotent, relançable.
#
#   git clone -b manage <repo> corrector-suite/API_manage \
#     && corrector-suite/API_manage/deploy/install-all.sh
#
# Flags : --yes  --only slug,slug  --no-services  --no-extras  --skip-install  --skip-build
#         --complet (12 process)  --light (alias historique du défaut)  NO_TUI=1
#
# MODE ÉCONOME — le DÉFAUT, et désormais un mode COMPLET en capacités.
# Une seule unité systemd : la gateway sert elle-même les dist/ des 11 correcteurs, ET
# porte leurs routes serveur (/api/proxy, /api/latex/*, /api/search) via
# server/routes/fork-api.ts. Les 11 process Node disparaissent sans rien perdre :
# correction, aperçu PDF, export DOCX, éditeur Word et recherche web répondent.
# Mesuré au repos sur le poste de dev : 1 084 Mo avec 12 process, 173 Mo avec la seule
# gateway (inchangé après un rendu PDF réel).
# Mêmes URL /app/<slug>/, même gate de session, même accès par tunnel Tailscale.
#
# Avant que la gateway ne porte ces routes, ce mode ne servait qu'une interface morte :
# /app/<slug>/api/latex/health renvoyait 200 text/html (le repli SPA) et /api/proxy un 404.
# C'est corrigé — et couvert par tests/fork-api-parite.test.ts côté gateway.
#
# --complet garde les 12 process : utile seulement pour redémarrer ou déboguer UN
# correcteur isolément, ce qui n'a pas d'objet sur un serveur de production.
set -euo pipefail
DEPLOY_DIR_BOOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$DEPLOY_DIR_BOOT/lib.sh"
. "$DEPLOY_DIR_BOOT/tui.sh"

NO_SERVICES=0 NO_EXTRAS=0 PASS_ARGS="" LIGHT=1
while [ $# -gt 0 ]; do
  case "$1" in
    --light|--web-only) LIGHT=1; shift ;;
    --complet|--full) LIGHT=0; shift ;;
    --yes) ASSUME_YES=1; shift ;;
    --only) ONLY="$2"; shift 2 ;;
    --only=*) ONLY="${1#*=}"; shift ;;
    --no-services) NO_SERVICES=1; shift ;;
    --no-extras) NO_EXTRAS=1; shift ;;
    --skip-install) PASS_ARGS="$PASS_ARGS --skip-install"; shift ;;
    --skip-build) PASS_ARGS="$PASS_ARGS --skip-build"; shift ;;
    -h|--help) sed -n '2,26p' "$0"; exit 0 ;;
    *) die "install-all.sh : argument inconnu $1" ;;
  esac
done
# install-all installe TOUJOURS la gateway (c'est le dépôt cloné). Un --only ne
# scope que les forks : on garantit donc que 'manage' est inclus pour que
# install.sh / install-services.sh ne sautent pas la gateway.
if [ -n "$ONLY" ]; then case ",$ONLY," in *",manage,"*) : ;; *) ONLY="manage,$ONLY" ;; esac; fi
# LIGHT est exporté plutôt que passé en argument : install.sh et install-services.sh le
# lisent tous les deux, et une variable d'environnement évite d'oublier l'un des deux —
# une install « légère » qui garderait les 11 unités ne serait pas légère du tout.
export ASSUME_YES ONLY LIGHT

if [ "$LIGHT" = "1" ]; then
  MODE_LIBELLE="économe — 1 service, toutes capacités"
else
  MODE_LIBELLE="complet — 12 services (1 084 Mo mesurés)"
fi
tui_banniere "Suite Correctors — installation" "11 correcteurs + gateway · mode $MODE_LIBELLE"

tui_section "Contexte"
tui_etape "Système" info "$DEPLOY_OS"
tui_etape "Gateway" info "$MANAGE_DIR"
tui_etape "Parent des correcteurs" info "$PARENT"
tui_etape "Dépôt" info "$(corrector_repo)"
[ -n "$ONLY" ] && tui_etape "Filtre" info "--only $ONLY"

# --- 1) Prérequis (détectés, proposés et installés au besoin) ----------------
tui_section "Prérequis"
detect_pkg
if [ -n "$PKG_MGR" ]; then tui_etape "Gestionnaire de paquets" ok "$PKG_MGR${SUDO:+ (sudo)}"
else tui_etape "Gestionnaire de paquets" ko "aucun reconnu — installations manuelles"; fi

# git, puis Node ≥22 (installe npm avec, via NodeSource/brew), puis npm en filet.
require_or_install git "git" git
ensure_node 22
if ! need_cmd npm; then require_or_install npm "npm" npm; fi

# openssl : pratique pour SESSION_SECRET, sinon repli Node (non bloquant → on propose sans imposer).
if ! need_cmd openssl && [ -n "$PKG_MGR" ] && confirm "Installer openssl (génération du secret de session) ?"; then
  pkg_install openssl || warn "openssl non installé — repli sur Node."
fi

# Outils de compilation : seulement en secours si un prebuild better-sqlite3 manque.
if [ "$DEPLOY_OS" = "linux" ] && ! need_cmd cc && ! need_cmd gcc; then
  warn "Compilateur C absent (nécessaire seulement si le binaire pré-compilé better-sqlite3 manque)."
  if [ -n "$PKG_MGR" ] && confirm "Installer les outils de compilation (build-essential/python3) par précaution ?"; then
    case "$PKG_MGR" in
      apt-get) pkg_install build-essential python3 ;;
      dnf|yum) pkg_install gcc-c++ make python3 ;;
      pacman)  pkg_install base-devel python ;;
      zypper)  pkg_install gcc-c++ make python3 ;;
    esac || warn "Installation des outils de compilation incomplète — à refaire si besoin."
  fi
fi
tui_etape "Node.js" ok "$(node -v)"
tui_etape "git" ok "$(git --version 2>/dev/null | awk '{print $3}')"

# --- 1bis) Capacités d'exécution (rendus TeX/PDF/DOCX, recherche web, expo) ---
# LaTeX et pandoc portent la promesse « rendus TeX, PDF et DOCX » : ils sont
# cochés par défaut. SearXNG et tailscale ne le sont que s'ils sont déjà là — les
# proposer cochés imposerait Docker ou un compte Tailscale à qui n'en veut pas.
EXTRAS_CAPS_FILE=""
if [ "$NO_EXTRAS" = "1" ]; then
  tui_section "Capacités"
  tui_etape "Dépendances d'exécution" skip "--no-extras"
else
  TUI_CASES_LIBELLES=("LaTeX (XeLaTeX + styles)" "pandoc" "SearXNG" "tailscale")
  TUI_CASES_DETAILS=(
    "rendu TeX → PDF · ~1,5 Go"
    "rendu → DOCX et éditeur Word"
    "recherche web · conteneur Docker"
    "exposition HTTPS (Funnel)"
  )
  TUI_CASES_ETATS=(1 1 0 0)
  need_cmd curl && curl -sf --max-time 2 -o /dev/null http://127.0.0.1:8888/ 2>/dev/null && TUI_CASES_ETATS[2]=1
  need_cmd tailscale && TUI_CASES_ETATS[3]=1

  tui_cases "Capacités à installer et vérifier" || true

  EXTRAS_CHOIX=""
  [ "${TUI_CASES_ETATS[0]}" = "1" ] && EXTRAS_CHOIX="$EXTRAS_CHOIX,latex"
  [ "${TUI_CASES_ETATS[1]}" = "1" ] && EXTRAS_CHOIX="$EXTRAS_CHOIX,pandoc"
  [ "${TUI_CASES_ETATS[2]}" = "1" ] && EXTRAS_CHOIX="$EXTRAS_CHOIX,searxng"
  [ "${TUI_CASES_ETATS[3]}" = "1" ] && EXTRAS_CHOIX="$EXTRAS_CHOIX,tailscale"
  EXTRAS_CHOIX="${EXTRAS_CHOIX#,}"
  export EXTRAS_CHOIX

  # Le fichier recueille les capacités RÉELLEMENT vérifiées par install-extras
  # (compilation XeLaTeX d'essai, aller-retour pandoc --sandbox). Sans lui, le
  # récap final ne saurait que constater la présence des binaires.
  EXTRAS_CAPS_FILE="$(mktemp)" && export EXTRAS_CAPS_FILE
  bash "$DEPLOY_DIR/install-extras.sh" || warn "install-extras.sh a rencontré une erreur (non bloquant)."
fi

# --- 2) Clones + deps + builds ----------------------------------------------
tui_section "Correcteurs"
bash "$DEPLOY_DIR/bootstrap.sh"
# shellcheck disable=SC2086
bash "$DEPLOY_DIR/install.sh" $PASS_ARGS

# --- 3) .env gateway + seed admin -------------------------------------------
tui_section "Configuration de la gateway"
ENV_FILE="$MANAGE_DIR/.env"
if [ -f "$ENV_FILE" ]; then
  tui_etape ".env existant" skip "aucun secret régénéré"
else
  log "Aucun .env — génération…"
  if need_cmd openssl; then SECRET="$(openssl rand -hex 32)"; else SECRET="$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')"; fi
  ADMIN_USER="admin" ADMIN_PASS=""
  if [ "$ASSUME_YES" = "1" ]; then
    ADMIN_PASS="$(node -e 'console.log(require("crypto").randomBytes(9).toString("base64url"))')"
    warn "Mode --yes : mot de passe admin ALÉATOIRE généré (voir récap final)."
  elif [ -r /dev/tty ]; then
    printf 'Nom du compte admin [admin] : ' > /dev/tty; read -r ans < /dev/tty || ans=""; [ -n "$ans" ] && ADMIN_USER="$ans"
    while [ -z "$ADMIN_PASS" ]; do
      printf 'Mot de passe admin : ' > /dev/tty; stty -echo 2>/dev/null || true; read -r ADMIN_PASS < /dev/tty || true; stty echo 2>/dev/null || true; printf '\n' > /dev/tty
    done
  else
    die "Pas de terminal pour saisir le mot de passe admin ; relancez avec --yes (mdp aléatoire) ou dans un shell interactif."
  fi
  umask 177
  {
    printf '# Généré par deploy/install-all.sh — ne pas commiter.\n'
    printf 'SESSION_SECRET=%s\n' "$SECRET"
    printf 'ADMIN_USERNAME=%s\n' "$ADMIN_USER"
    printf 'ADMIN_PASSWORD=%s\n' "$ADMIN_PASS"
    printf 'PORT=3000\n'
  } > "$ENV_FILE"
  umask 022
  chmod 600 "$ENV_FILE"
  ok ".env créé (SESSION_SECRET aléatoire, admin=$ADMIN_USER)."
  GENERATED_ADMIN_USER="$ADMIN_USER"; GENERATED_ADMIN_PASS="$ADMIN_PASS"
  log "Seed du compte admin…"
  ( cd "$MANAGE_DIR" && npm run --silent seed:admin ) || warn "seed:admin a échoué — relancez : (cd $MANAGE_DIR && npm run seed:admin)"

  # Clé LLM optionnelle
  if [ "$ASSUME_YES" != "1" ] && [ -r /dev/tty ]; then
    printf 'Clé API Mistral (entrée = ignorer) : ' > /dev/tty; read -r MKEY < /dev/tty || MKEY=""
    if [ -n "$MKEY" ]; then ( cd "$MANAGE_DIR" && CORRECTOR_API_KEY="$MKEY" MISTRAL_API_KEY="$MKEY" npm run --silent seed:mistral ) && ok "Clé Mistral enregistrée." || warn "seed:mistral a échoué (à refaire en admin)."; fi
  else
    log "Clé LLM non demandée (--yes) — configurez-la dans l'espace admin, ou : npm run seed:mistral."
  fi
fi

# --- 4) Services -------------------------------------------------------------
tui_section "Services"
if [ "$NO_SERVICES" = "1" ]; then
  tui_etape "Installation des services" skip "--no-services"
elif [ "$DEPLOY_OS" = "linux" ]; then
  bash "$DEPLOY_DIR/install-services.sh" ${ONLY:+--only "$ONLY"} $([ "$ASSUME_YES" = "1" ] && printf -- --yes)
elif [ "$DEPLOY_OS" = "darwin" ]; then
  # Le mode économe n'est implémenté que pour systemd : install-services-macos.sh poserait
  # quand même 11 LaunchAgents. Le dire plutôt que de livrer une install « économe » qui ne
  # l'est pas — c'est exactement le genre d'écart qu'on ne remarque qu'en manquant de RAM.
  [ "$LIGHT" = "1" ] && warn "Mode économe non géré sur macOS : les 11 LaunchAgents seront installés (mode complet)."
  log "Installation des LaunchAgents (best-effort macOS)…"
  bash "$DEPLOY_DIR/install-services-macos.sh" ${ONLY:+--only "$ONLY"} $([ "$ASSUME_YES" = "1" ] && printf -- --yes)
else
  warn "OS non géré pour les services — lancez manuellement (voir README-DEPLOY.md)."
fi

# --- 5) Smoke-test + récap ---------------------------------------------------
if [ "$NO_SERVICES" = "0" ]; then
  tui_section "Vérification"
  sleep 2 2>/dev/null || true
  bash "$DEPLOY_DIR/smoke-test.sh" "http://localhost:3000" || warn "smoke-test partiel (les services viennent peut-être de démarrer ; réessayez : deploy/smoke-test.sh)."
fi

# Capacités effectives. On préfère le verdict d'install-extras (vérifié par
# usage : compilation d'essai, aller-retour pandoc) à une simple présence de
# binaire, qui mentirait sur un TeX incomplet ou un pandoc sans --sandbox.
CAP_PDF="non"; CAP_DOCX="non"; CAP_WORD="non"; CAP_WEB="non"; CAP_SOURCE="vérifiées"
if [ -n "$EXTRAS_CAPS_FILE" ] && [ -s "$EXTRAS_CAPS_FILE" ]; then
  CAP_PDF=$(sed -n 's/^PDF=//p'  "$EXTRAS_CAPS_FILE")
  CAP_DOCX=$(sed -n 's/^DOCX=//p' "$EXTRAS_CAPS_FILE")
  CAP_WORD=$(sed -n 's/^WORD=//p' "$EXTRAS_CAPS_FILE")
  CAP_WEB=$(sed -n 's/^WEB=//p'  "$EXTRAS_CAPS_FILE")
  rm -f "$EXTRAS_CAPS_FILE"
else
  # --no-extras (ou échec du fichier) : on ne peut que constater la présence.
  if need_cmd latexmk && need_cmd xelatex; then CAP_PDF="oui"; fi
  if need_cmd pandoc; then CAP_DOCX="oui"; CAP_WORD="?"; fi
  if need_cmd curl && curl -sf --max-time 2 -o /dev/null http://127.0.0.1:8888/ 2>/dev/null; then CAP_WEB="oui"; fi
  CAP_SOURCE="binaires présents, NON vérifiés — deploy/install-extras.sh les teste"
fi

tui_recap_debut "Installation terminée"
tui_recap_ligne "Local" "http://localhost:3000/"
if [ "$LIGHT" = "1" ]; then
  tui_recap_ligne "Mode" "économe — 1 service, la gateway sert fronts ET routes"
  tui_recap_ligne "Mettre à jour" "git pull && deploy/install-all.sh --yes"
else
  tui_recap_ligne "Mode" "complet — 12 services"
  tui_recap_ligne "Mettre à jour" "git pull && deploy/install-all.sh --complet --yes"
fi
tui_recap_ligne "Rendus" "PDF $CAP_PDF · DOCX $CAP_DOCX · éditeur Word $CAP_WORD"
tui_recap_ligne "Recherche web" "$CAP_WEB"
tui_recap_ligne "" "($CAP_SOURCE)"
tui_recap_ligne "Exposer" "tailscale funnel --bg --https=443 http://localhost:3000"
tui_recap_ligne "Migrer l'état" "deploy/export-state.sh → deploy/restore-state.sh"
if [ -n "${GENERATED_ADMIN_USER:-}" ]; then
  tui_recap_ligne "Admin" "$GENERATED_ADMIN_USER"
  tui_recap_ligne "Mot de passe" "$GENERATED_ADMIN_PASS  (à changer)"
fi
tui_recap_fin
