#!/usr/bin/env bash
# install-services.sh — CÔTÉ CIBLE Linux : génère et active les 13 unités systemd
# user (11 forks + gateway + funnel) depuis templates/. Idempotent.
# Flags :
#   --render-only        n'écrit que les units (pas de daemon-reload/enable) — pour diff
#   --unit-dir DIR       répertoire des units (défaut ~/.config/systemd/user)
#   --no-start           génère + enable mais ne démarre pas
#   --only slug,slug     restreint aux forks listés (la gateway suit si non filtrée)
#   --light              MODE ÉCONOME (défaut d'install-all) : une seule unité ; la
#   --yes                pas de confirmation interactive
#
# Le mode économe vise les machines à faible RAM (mesuré : 1 084 Mo pour les 12 services,
# 173 Mo pour la gateway seule). L'accès navigateur, les routes /app/<slug>/ et la
# gate de session sont identiques dans les deux modes — seul le nombre de process change.
set -euo pipefail
. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

[ "$DEPLOY_OS" = "linux" ] || die "install-services.sh est pour Linux ; sur macOS utilisez install-services-macos.sh."

UNIT_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
RENDER_ONLY=0 NO_START=0 LIGHT="${LIGHT:-0}"
while [ $# -gt 0 ]; do
  case "$1" in
    --light|--web-only) LIGHT=1; shift ;;
    --render-only) RENDER_ONLY=1; shift ;;
    --unit-dir) UNIT_DIR="$2"; shift 2 ;;
    --unit-dir=*) UNIT_DIR="${1#*=}"; shift ;;
    --no-start) NO_START=1; shift ;;
    --only) ONLY="$2"; shift 2 ;;
    --only=*) ONLY="${1#*=}"; shift ;;
    --yes) ASSUME_YES=1; shift ;;
    *) die "install-services.sh : argument inconnu $1" ;;
  esac
done

NODE_BIN="$(command -v node)"; [ -n "$NODE_BIN" ] || die "node introuvable dans le PATH."
TPL="$DEPLOY_DIR/templates"
TMPL_APP="$TPL/corrector-app.service.tpl"
TMPL_MANAGE="$TPL/corrector-manage.service.tpl"
TMPL_FUNNEL="$TPL/tailscale-funnel.service.tpl"
MANAGE_PORT=3000

mkdir -p "$UNIT_DIR"
log "Répertoire des units : $UNIT_DIR"

# Liste des unités fork pour la ligne Wants= de la gateway (ordre forks.tsv).
# En mode économe il n'y a AUCUNE unité fork : la ligne doit rester vide, sinon systemd
# tenterait de démarrer 11 services inexistants à chaque boot.
WANTS=""
if [ "$LIGHT" = "0" ]; then
  while IFS="$(printf '\t')" read -r slug dir branch port label; do
    WANTS="$WANTS corrector-$slug.service"
  done < <(read_forks)
  WANTS="${WANTS# }"
fi
SERVE_MODE="proxy"; [ "$LIGHT" = "1" ] && SERVE_MODE="static"
[ "$LIGHT" = "1" ] && log "MODE ÉCONOME : une seule unité ; la gateway sert les dist/ des forks et leurs routes serveur."

render() { # tpl dest  — le reste = paires clé/val substituées via placeholders @K@
  local tpl="$1" dest="$2"; shift 2
  local content; content="$(cat "$tpl")"
  while [ $# -gt 0 ]; do
    local key="$1" val="$2"; shift 2
    content="$(printf '%s' "$content" | sed -e "s|@${key}@|${val}|g")"
  done
  printf '%s\n' "$content" > "$dest"
}

# Forks — aucune unité en mode économe.
if [ "$LIGHT" = "0" ]; then
  while IFS="$(printf '\t')" read -r slug dir branch port label; do
    render "$TMPL_APP" "$UNIT_DIR/corrector-$slug.service" \
      LABEL "$label" PORT "$port" DIR "$PARENT/$dir" NODE "$NODE_BIN"
    log "rendu corrector-$slug.service (:$port)"
  done < <(read_forks)
fi

# Gateway (si non filtrée)
if [ -z "$ONLY" ] || case ",$ONLY," in *",manage,"*) true ;; *) false ;; esac; then
  render "$TMPL_MANAGE" "$UNIT_DIR/corrector-manage.service" \
    PORT "$MANAGE_PORT" DIR "$MANAGE_DIR" NODE "$NODE_BIN" WANTS "$WANTS" SERVE_MODE "$SERVE_MODE"
  log "rendu corrector-manage.service (:$MANAGE_PORT, mode $SERVE_MODE)"
fi

# Funnel (si tailscale présent)
TS_BIN="$(command -v tailscale 2>/dev/null || true)"
if [ -n "$TS_BIN" ]; then
  render "$TMPL_FUNNEL" "$UNIT_DIR/tailscale-funnel.service" \
    TAILSCALE "$TS_BIN" PORT "$MANAGE_PORT"
  log "rendu tailscale-funnel.service"
else
  warn "tailscale absent — unité funnel non générée (exposition publique à configurer à la main)."
fi

if [ "$RENDER_ONLY" = "1" ]; then
  ok "Units rendues dans $UNIT_DIR (mode --render-only, aucun service touché)."
  exit 0
fi

confirm "Activer/démarrer les services systemd user depuis $UNIT_DIR ?" \
  || die "Annulé (units rendues, rien de démarré). Relancez avec --yes pour non interactif."

need_cmd systemctl || die "systemctl introuvable."
systemctl --user daemon-reload
need_cmd loginctl && loginctl enable-linger "$(id -un)" >/dev/null 2>&1 || true

ENABLE_ARGS=""; [ "$NO_START" = "0" ] && ENABLE_ARGS="--now"
if [ "$LIGHT" = "1" ]; then
  # Bascule complet → économe : sans cet arrêt, les 11 services d'une installation
  # précédente continueraient de tourner et le gain de RAM n'existerait pas. On ne
  # touche QUE les unités corrector-<slug> issues de forks.tsv, jamais un motif large.
  arretes=0
  while IFS="$(printf '\t')" read -r slug dir branch port label; do
    unit="corrector-$slug.service"
    if systemctl --user list-unit-files "$unit" >/dev/null 2>&1 &&
       [ -f "$UNIT_DIR/$unit" ]; then
      systemctl --user disable --now "$unit" >/dev/null 2>&1 || true
      rm -f "$UNIT_DIR/$unit"
      arretes=$((arretes + 1))
    fi
  done < <(read_forks)
  [ "$arretes" -gt 0 ] && log "mode économe : $arretes unité(s) fork arrêtée(s) et retirée(s)."
  systemctl --user daemon-reload
else
  while IFS="$(printf '\t')" read -r slug dir branch port label; do
    systemctl --user enable $ENABLE_ARGS "corrector-$slug.service" || warn "enable corrector-$slug a échoué"
  done < <(read_forks)
fi
if [ -f "$UNIT_DIR/corrector-manage.service" ]; then
  systemctl --user enable $ENABLE_ARGS corrector-manage.service || warn "enable corrector-manage a échoué"
fi
if [ -n "$TS_BIN" ]; then
  systemctl --user enable $ENABLE_ARGS tailscale-funnel.service || warn "enable funnel a échoué"
fi

ok "Services installés dans $UNIT_DIR."
[ "$NO_START" = "1" ] && log "(--no-start : services activés mais non démarrés ; systemctl --user start … pour lancer)."
