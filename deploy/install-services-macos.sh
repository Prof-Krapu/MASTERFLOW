#!/usr/bin/env bash
# install-services-macos.sh — CÔTÉ CIBLE macOS : génère et charge les LaunchAgents
# (11 forks + gateway) depuis templates/*.plist.tpl. Best-effort, NON testé sur cette
# machine Linux — voir README-DEPLOY.md. Le funnel Tailscale est lancé en direct.
# Flags : --render-only  --agent-dir DIR  --only slug,slug  --yes
set -euo pipefail
. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

[ "$DEPLOY_OS" = "darwin" ] || die "install-services-macos.sh est pour macOS ; sur Linux utilisez install-services.sh."

AGENT_DIR="$HOME/Library/LaunchAgents"
RENDER_ONLY=0
while [ $# -gt 0 ]; do
  case "$1" in
    --render-only) RENDER_ONLY=1; shift ;;
    --agent-dir) AGENT_DIR="$2"; shift 2 ;;
    --agent-dir=*) AGENT_DIR="${1#*=}"; shift ;;
    --only) ONLY="$2"; shift 2 ;;
    --only=*) ONLY="${1#*=}"; shift ;;
    --yes) ASSUME_YES=1; shift ;;
    *) die "argument inconnu $1" ;;
  esac
done

NODE_BIN="$(command -v node)"; [ -n "$NODE_BIN" ] || die "node introuvable."
TPL="$DEPLOY_DIR/templates"
MANAGE_PORT=3000
mkdir -p "$AGENT_DIR"

render() {
  local tpl="$1" dest="$2"; shift 2
  local content; content="$(cat "$tpl")"
  while [ $# -gt 0 ]; do
    local key="$1" val="$2"; shift 2
    content="$(printf '%s' "$content" | sed -e "s|@${key}@|${val}|g")"
  done
  printf '%s\n' "$content" > "$dest"
}

load_agent() { # label plist
  local label="$1" plist="$2"
  [ "$RENDER_ONLY" = "1" ] && return 0
  launchctl bootout "gui/$(id -u)/$label" >/dev/null 2>&1 || true
  launchctl bootstrap "gui/$(id -u)" "$plist" || warn "bootstrap $label a échoué"
}

while IFS="$(printf '\t')" read -r slug dir branch port label; do
  dest="$AGENT_DIR/com.corrector.$slug.plist"
  render "$TPL/corrector-app.plist.tpl" "$dest" \
    SLUG "$slug" PORT "$port" DIR "$PARENT/$dir" NODE "$NODE_BIN"
  log "rendu com.corrector.$slug.plist (:$port)"
  load_agent "com.corrector.$slug" "$dest"
done < <(read_forks)

if [ -z "$ONLY" ] || case ",$ONLY," in *",manage,"*) true ;; *) false ;; esac; then
  dest="$AGENT_DIR/com.corrector.manage.plist"
  render "$TPL/corrector-manage.plist.tpl" "$dest" PORT "$MANAGE_PORT" DIR "$MANAGE_DIR" NODE "$NODE_BIN"
  log "rendu com.corrector.manage.plist (:$MANAGE_PORT)"
  load_agent "com.corrector.manage" "$dest"
fi

if [ "$RENDER_ONLY" = "1" ]; then ok "Plists rendus dans $AGENT_DIR (--render-only)."; exit 0; fi

TS_BIN="$(command -v tailscale 2>/dev/null || true)"
if [ -n "$TS_BIN" ]; then
  log "Funnel : $TS_BIN funnel --bg --https=443 http://localhost:$MANAGE_PORT"
  "$TS_BIN" funnel --bg --https=443 "http://localhost:$MANAGE_PORT" || warn "funnel non démarré (à lancer à la main)."
else
  warn "tailscale absent — exposition publique à configurer à la main."
fi

ok "LaunchAgents chargés depuis $AGENT_DIR."
