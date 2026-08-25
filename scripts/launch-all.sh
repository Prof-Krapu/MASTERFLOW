#!/usr/bin/env bash
# Lance la suite Correctors en mode "managed" : 1 API_manage + 11 sous-apps sur loopback.
#
# - API_manage    :3000  (face publique, gated par requireUser)
# - PC sous /app/pc/  → :3001 (loopback, jamais exposé)
# - FR sous /app/fr/  → :3005 (loopback, jamais exposé)
# - NL sous /app/nl/  → :3009 (loopback, jamais exposé)
# - ES sous /app/es/  → :3013 (loopback, jamais exposé)
# - SVT sous /app/svt/ → :3021 (loopback, jamais exposé)
# - MATHS sous /app/maths/ → :3025 (loopback, jamais exposé)
# - SES sous /app/ses/ → :3029 (loopback, jamais exposé)
# - TECH sous /app/tech/ → :3033 (loopback, jamais exposé)
# - EN sous /app/en/  → :3037 (loopback, jamais exposé)
# - PHILO sous /app/philo/ → :3041 (loopback, jamais exposé)
# - HG sous /app/hg/ → :3045 (loopback, jamais exposé)
#
# Usage : ./scripts/launch-all.sh [--rebuild]
# Tailscale Funnel : `tailscale funnel --bg --https=443 http://localhost:3000`
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PARENT="$(dirname "$REPO_ROOT")"

API_MANAGE="$REPO_ROOT"
PC="$PARENT/API_corrector"
FR="$PARENT/API_corrector_francais"
NL="$PARENT/API_corrector_neerlandais"
ES="$PARENT/API_corrector_espagnol"
SVT="$PARENT/API_corrector_svt"
MATHS="$PARENT/API_corrector_mathematiques"
SES="$PARENT/API_corrector_ses"
TECH="$PARENT/API_corrector_technologie"
EN="$PARENT/API_corrector_anglais"
PHILO="$PARENT/API_corrector_philosophie"
HG="$PARENT/API_corrector_histoire_geographie"

REBUILD=0
for arg in "$@"; do
  case "$arg" in
    --rebuild) REBUILD=1 ;;
    *) echo "[launch-all] argument inconnu : $arg" ; exit 1 ;;
  esac
done

require_dir() {
  if [[ ! -d "$1" ]]; then
    echo "[launch-all] répertoire absent : $1" >&2
    exit 1
  fi
}
require_dir "$API_MANAGE"
require_dir "$PC"
require_dir "$FR"
require_dir "$NL"
require_dir "$ES"
require_dir "$SVT"
require_dir "$MATHS"
require_dir "$SES"
require_dir "$TECH"
require_dir "$EN"
require_dir "$PHILO"
require_dir "$HG"

PIDS=()
cleanup() {
  echo "[launch-all] arrêt des process…"
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
}
trap cleanup INT TERM EXIT

build_subapp() {
  local dir="$1" base="$2"
  if [[ $REBUILD -eq 1 || ! -d "$dir/dist" ]]; then
    echo "[launch-all] build $dir  (VITE_BASE_PATH=$base)"
    (cd "$dir" && VITE_BASE_PATH="$base" npm run build:web >/dev/null)
  else
    echo "[launch-all] $dir/dist déjà présent — réutilisation (--rebuild pour forcer)"
  fi
}

build_subapp "$PC" /app/pc/
build_subapp "$FR" /app/fr/
build_subapp "$NL" /app/nl/
build_subapp "$ES" /app/es/
build_subapp "$SVT" /app/svt/
build_subapp "$MATHS" /app/maths/
build_subapp "$SES" /app/ses/
build_subapp "$TECH" /app/tech/
build_subapp "$EN" /app/en/
build_subapp "$PHILO" /app/philo/
build_subapp "$HG" /app/hg/

if [[ $REBUILD -eq 1 || ! -d "$API_MANAGE/dist" ]]; then
  echo "[launch-all] build API_manage"
  (cd "$API_MANAGE" && npm run build:web >/dev/null)
fi

start_subapp() {
  local dir="$1" port="$2" name="$3"
  echo "[launch-all] start $name sur :$port"
  (cd "$dir" && PORT="$port" npm run serve:web) &
  PIDS+=($!)
}

start_subapp "$PC" 3001 PC
start_subapp "$FR" 3005 FR
start_subapp "$NL" 3009 NL
start_subapp "$ES" 3013 ES
start_subapp "$SVT" 3021 SVT
start_subapp "$MATHS" 3025 MATHS
start_subapp "$SES" 3029 SES
start_subapp "$TECH" 3033 TECH
start_subapp "$EN" 3037 EN
start_subapp "$PHILO" 3041 PHILO
start_subapp "$HG" 3045 HG

echo "[launch-all] start API_manage sur :3000 (prod)"
(cd "$API_MANAGE" && NODE_ENV=production PORT=3000 npm run serve) &
PIDS+=($!)

cat <<EOF

[launch-all] Tout est lancé. URLs :
  - http://localhost:3000/        — landing
  - http://localhost:3000/login   — connexion
  - http://localhost:3000/admin   — espace admin (config API + invitations)
  - http://localhost:3000/app/pc/ — Physique-Chimie (gated)
  - http://localhost:3000/app/fr/ — Français       (gated)
  - http://localhost:3000/app/nl/ — Néerlandais    (gated)
  - http://localhost:3000/app/es/ — Espagnol        (gated)
  - http://localhost:3000/app/svt/ — SVT            (gated)
  - http://localhost:3000/app/maths/ — Mathématiques (gated)
  - http://localhost:3000/app/ses/ — Sciences Économiques et Sociales (gated)
  - http://localhost:3000/app/tech/ — Technologie    (gated)
  - http://localhost:3000/app/en/ — Anglais         (gated)
  - http://localhost:3000/app/philo/ — Philosophie   (gated)
  - http://localhost:3000/app/hg/ — Histoire-Géographie (gated)

Pour exposer publiquement :
  tailscale funnel --bg --https=443 http://localhost:3000

Ctrl+C pour tout arrêter.
EOF

wait
