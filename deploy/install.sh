#!/usr/bin/env bash
# install.sh — CÔTÉ CIBLE : dépendances + builds web pour la gateway et les forks.
#   npm ci (repli npm install) ×12, puis vite build (forks : VITE_BASE_PATH=/app/<slug>/).
# Flags : --only slug,slug   --skip-install   --skip-build   --light
set -euo pipefail
. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

SKIP_INSTALL=0 SKIP_BUILD=0 LIGHT="${LIGHT:-0}"
while [ $# -gt 0 ]; do
  case "$1" in
    --light|--web-only) LIGHT=1; shift ;;
    --only) ONLY="$2"; shift 2 ;;
    --only=*) ONLY="${1#*=}"; shift ;;
    --skip-install) SKIP_INSTALL=1; shift ;;
    --skip-build) SKIP_BUILD=1; shift ;;
    *) die "install.sh : argument inconnu $1" ;;
  esac
done

need_cmd npm || die "npm introuvable (installez Node ≥22)."

deps() {
  local d="$1" name="$2"
  [ "$SKIP_INSTALL" = "1" ] && { log "$name : install sautée"; return 0; }
  log "$name : dépendances…"
  if [ -f "$d/package-lock.json" ]; then
    ( cd "$d" && npm ci ) || die "npm ci a échoué dans $name"
  else
    ( cd "$d" && npm install ) || die "npm install a échoué dans $name"
  fi
}

build() {
  local d="$1" name="$2" base="${3:-}"
  [ "$SKIP_BUILD" = "1" ] && { log "$name : build sauté"; return 0; }
  if [ -n "$base" ]; then
    log "$name : build web (VITE_BASE_PATH=$base)"
    ( cd "$d" && VITE_BASE_PATH="$base" npm run build:web ) || die "build web a échoué dans $name"
  else
    log "$name : build web"
    ( cd "$d" && npm run build:web ) || die "build web a échoué dans $name"
  fi
}

# Pré-compression des bundles, pour le mode économe uniquement.
#
# La gateway sert `<fichier>.gz` quand il existe et que le navigateur accepte gzip
# (cf. servirPrecompresse dans server/routes/proxy.ts). Mesuré sur le bundle principal
# d'un correcteur : 3,9 Mo brut → 1,5 Mo gzippé. Sur un accès navigateur depuis un
# établissement à travers un tunnel Tailscale, c'est le poste dominant du premier
# chargement.
#
# Compresser ICI et pas à l'exécution est délibéré : le mode économe vise une machine
# modeste, qui n'a pas à regzipper 4 Mo pour chaque visiteur. Le coût est du disque
# (~+25 % sur dist/) et une poignée de secondes au build.
precompresse() {
  local d="$1" name="$2"
  [ "$LIGHT" = "1" ] || return 0
  [ -d "$d/dist" ] || return 0
  need_cmd gzip || { warn "$name : gzip introuvable — bundles servis non compressés."; return 0; }
  # Au-dessus de 4 ko seulement : en dessous, l'en-tête gzip coûte plus qu'il ne rapporte.
  local n
  n="$(find "$d/dist" -type f \( -name '*.js' -o -name '*.css' -o -name '*.svg' -o -name '*.json' \) \
        -size +4k -exec gzip -9 -k -f {} \; -print | wc -l)"
  log "$name : $n fichier(s) pré-compressé(s)."
}

# Gateway (seulement si non filtrée, ou si aucun filtre). On la traite quand ONLY
# est vide ou contient explicitement "manage".
if [ -z "$ONLY" ] || case ",$ONLY," in *",manage,"*) true ;; *) false ;; esac; then
  deps "$MANAGE_DIR" "API_manage"
  build "$MANAGE_DIR" "API_manage"
fi

while IFS="$(printf '\t')" read -r slug dir branch port label; do
  d="$PARENT/$dir"
  [ -d "$d" ] || { warn "$slug : $d absent — lancez bootstrap.sh d'abord (saut)."; continue; }
  deps "$d" "$slug"
  build "$d" "$slug" "/app/$slug/"
  precompresse "$d" "$slug"
done < <(read_forks)

ok "Install terminée."
[ "$LIGHT" = "1" ] && log "(mode économe : la gateway servira les dist/ ET les routes /api/* des forks.)"
