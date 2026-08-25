#!/usr/bin/env bash
# lib.sh — fonctions et variables partagées par tous les scripts deploy/.
# Compatible bash 3.2 (macOS) : pas de `declare -A`, pas de `mapfile`, pas de
# `${var,,}`. Sourcé par les autres scripts (jamais exécuté directement).

# --- Résolution des chemins (indépendante du cwd de l'appelant) -------------
# ${BASH_SOURCE[0]} = ce fichier, quel que soit le script qui le source.
DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MANAGE_DIR="$(cd "$DEPLOY_DIR/.." && pwd)"          # …/API_manage
# Parent des checkouts (API_manage + les forks sont frères). Surchargable pour
# installer ailleurs (ex. répétition de test) : CORRECTORS_PARENT=/chemin ...
PARENT="${CORRECTORS_PARENT:-$(cd "$MANAGE_DIR/.." && pwd)}"

FORKS_TSV="${FORKS_TSV:-$DEPLOY_DIR/forks.tsv}"

# URL du dépôt unique. Dérivée du remote origin d'API_manage pour que la ligne
# unique marche en SSH comme en HTTPS+PAT sans reconfiguration. Repli SSH en dur.
FALLBACK_REPO="git@forge.apps.education.fr:durieuxvincent/corrector.git"
corrector_repo() {
  local url=""
  url="$(git -C "$MANAGE_DIR" remote get-url origin 2>/dev/null || true)"
  if [ -n "$url" ]; then
    printf '%s\n' "$url"
  else
    printf '%s\n' "$FALLBACK_REPO"
  fi
}

# --- Détection OS ------------------------------------------------------------
case "$(uname -s)" in
  Linux)  DEPLOY_OS="linux" ;;
  Darwin) DEPLOY_OS="darwin" ;;
  *)      DEPLOY_OS="unknown" ;;
esac

# --- Sortie ------------------------------------------------------------------
if [ -t 1 ]; then C_B="$(printf '\033[1m')"; C_D="$(printf '\033[2m')"; C_R="$(printf '\033[31m')"; C_G="$(printf '\033[32m')"; C_Y="$(printf '\033[33m')"; C_0="$(printf '\033[0m')"; else C_B=""; C_D=""; C_R=""; C_G=""; C_Y=""; C_0=""; fi
log()  { printf '%s[deploy]%s %s\n' "$C_B" "$C_0" "$*"; }
ok()   { printf '%s[deploy]%s %s%s%s\n' "$C_B" "$C_0" "$C_G" "$*" "$C_0"; }
warn() { printf '%s[deploy]%s %s%s%s\n' "$C_B" "$C_0" "$C_Y" "$*" "$C_0" >&2; }
die()  { printf '%s[deploy]%s %serreur : %s%s\n' "$C_B" "$C_0" "$C_R" "$*" "$C_0" >&2; exit 1; }

# --- Prérequis ---------------------------------------------------------------
need_cmd() { command -v "$1" >/dev/null 2>&1; }

# --- Confirmation interactive (lit /dev/tty, contournable par --yes) ---------
# ASSUME_YES=1 → répond oui sans demander (mode non interactif de la ligne unique).
ASSUME_YES="${ASSUME_YES:-0}"
confirm() {
  local prompt="$1" ans=""
  if [ "$ASSUME_YES" = "1" ]; then return 0; fi
  # /dev/tty doit être ouvrable en lecture ET écriture (sinon run non interactif).
  if ! { true >/dev/tty; } 2>/dev/null || [ ! -r /dev/tty ]; then
    warn "pas de terminal interactif ; utilisez --yes pour un run non interactif."
    return 1
  fi
  printf '%s [o/N] ' "$prompt" > /dev/tty
  read -r ans < /dev/tty || ans=""
  case "$ans" in [oOyY]*) return 0 ;; *) return 1 ;; esac
}

# --- Installation de prérequis système (Linux/macOS) -------------------------
# sudo seulement si on n'est pas root et qu'il existe.
SUDO=""
if [ "$(id -u)" != "0" ] && need_cmd sudo; then SUDO="sudo"; fi

# PKG_MGR : gestionnaire détecté (apt-get/dnf/yum/pacman/zypper/brew), vide sinon.
PKG_MGR=""
detect_pkg() {
  if [ "$DEPLOY_OS" = "darwin" ]; then need_cmd brew && PKG_MGR="brew"; return; fi
  local m
  for m in apt-get dnf yum pacman zypper; do
    if need_cmd "$m"; then PKG_MGR="$m"; return; fi
  done
}

# pkg_install <paquets…> : installe via le gestionnaire détecté (non interactif).
pkg_install() {
  case "$PKG_MGR" in
    apt-get) $SUDO apt-get update -qq && $SUDO apt-get install -y "$@" ;;
    dnf)     $SUDO dnf install -y "$@" ;;
    yum)     $SUDO yum install -y "$@" ;;
    pacman)  $SUDO pacman -Sy --noconfirm "$@" ;;
    zypper)  $SUDO zypper --non-interactive install "$@" ;;
    brew)    brew install "$@" ;;
    *)       return 1 ;;
  esac
}

# node_install : installe Node 22 avec un chemin STABLE (pas nvm, exigé par systemd).
node_install() {
  case "$PKG_MGR" in
    apt-get) curl -fsSL https://deb.nodesource.com/setup_22.x | $SUDO -E bash - && $SUDO apt-get install -y nodejs ;;
    dnf)     curl -fsSL https://rpm.nodesource.com/setup_22.x | $SUDO bash - && $SUDO dnf install -y nodejs ;;
    yum)     curl -fsSL https://rpm.nodesource.com/setup_22.x | $SUDO bash - && $SUDO yum install -y nodejs ;;
    pacman)  $SUDO pacman -Sy --noconfirm nodejs npm ;;
    zypper)  $SUDO zypper --non-interactive install nodejs22 || $SUDO zypper --non-interactive install nodejs ;;
    brew)    brew install node@22 && brew link --overwrite --force node@22 ;;
    *)       return 1 ;;
  esac
}

# require_or_install <cmd> <label> <paquet> : si <cmd> manque, propose de l'installer.
# Respecte --yes (ASSUME_YES) ; die si refusé ou pas de gestionnaire.
require_or_install() {
  local cmd="$1" label="$2" pkg="$3"
  need_cmd "$cmd" && return 0
  warn "$label ($cmd) manquant."
  [ -n "$PKG_MGR" ] || die "$label manquant et aucun gestionnaire de paquets détecté — installez-le à la main."
  if confirm "Installer $label via $PKG_MGR${SUDO:+ (sudo)} ?"; then
    pkg_install "$pkg" || die "Échec de l'installation de $label via $PKG_MGR."
    need_cmd "$cmd" || die "$label toujours introuvable après installation."
    ok "$label installé."
  else
    die "$label est requis — installation refusée. Installez-le puis relancez."
  fi
}

# ensure_node : garantit Node ≥ MIN (défaut 22), en proposant l'installation.
ensure_node() {
  local min="${1:-22}" cur=0
  if need_cmd node; then cur="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"; fi
  if need_cmd node && [ "$cur" -ge "$min" ] 2>/dev/null; then return 0; fi
  if need_cmd node; then warn "Node $(node -v) trop ancien (≥$min requis)."; else warn "Node manquant (≥$min requis)."; fi
  [ -n "$PKG_MGR" ] || die "Installez Node ≥$min manuellement (chemin stable, pas nvm)."
  need_cmd curl || require_or_install curl "curl" curl
  if confirm "Installer Node $min via ${PKG_MGR}${SUDO:+ +sudo} ?"; then
    node_install || die "Échec de l'installation de Node."
    need_cmd node || die "Node introuvable après installation."
    cur="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
    [ "$cur" -ge "$min" ] 2>/dev/null || die "Node installé mais version <$min ($(node -v)) — installez Node $min à la main."
    ok "Node $(node -v) installé."
  else
    die "Node ≥$min requis — installation refusée."
  fi
}

# --- Itération sur forks.tsv -------------------------------------------------
# ONLY (csv de slugs) restreint l'itération. Vide = tous.
ONLY="${ONLY:-}"
# _only_match <slug> : 0 si le slug est retenu (ONLY vide ou le contient).
_only_match() {
  [ -z "$ONLY" ] && return 0
  case ",$ONLY," in *",$1,"*) return 0 ;; *) return 1 ;; esac
}
# read_forks : émet les lignes retenues de forks.tsv (commentaires/vides retirés).
# Usage : while IFS="$(printf '\t')" read -r slug dir branch port label; do … done < <(read_forks)
read_forks() {
  local slug dir branch port label
  while IFS="$(printf '\t')" read -r slug dir branch port label; do
    case "$slug" in ''|\#*) continue ;; esac
    _only_match "$slug" || continue
    printf '%s\t%s\t%s\t%s\t%s\n' "$slug" "$dir" "$branch" "$port" "$label"
  done < "$FORKS_TSV"
}
# fork_count : nombre de forks retenus.
fork_count() { read_forks | grep -c . ; }
