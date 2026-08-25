#!/usr/bin/env bash
# restore-state.sh — CÔTÉ CIBLE : restaure l'état vivant depuis une archive export-state.
# Refuse d'écraser une DB existante sauf --force. Vérifie l'archive (anti path-traversal),
# extrait sous PARENT, chmod 600 les secrets, puis redémarre les services.
# Usage : restore-state.sh <archive.tar.gz> [--force] [--no-restart]
set -euo pipefail
. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

ARCHIVE="" FORCE=0 NO_RESTART=0
while [ $# -gt 0 ]; do
  case "$1" in
    --force) FORCE=1; shift ;;
    --no-restart) NO_RESTART=1; shift ;;
    -*) die "argument inconnu $1" ;;
    *) ARCHIVE="$1"; shift ;;
  esac
done
[ -n "$ARCHIVE" ] && [ -f "$ARCHIVE" ] || die "usage : restore-state.sh <archive.tar.gz> [--force]"

# --- Contrôle du contenu (allowlist, anti path-traversal) --------------------
log "Contenu de l'archive :"
BAD=0
while IFS= read -r entry; do
  [ -z "$entry" ] && continue
  printf '  %s\n' "$entry"
  case "$entry" in
    /*|*..*) warn "chemin suspect : $entry"; BAD=1 ;;
    API_manage/data/api-manage.db|API_manage/.env|*/.env) : ;;
    */) : ;;  # entrées de répertoire
    *) warn "chemin inattendu : $entry"; BAD=1 ;;
  esac
done < <(tar -tzf "$ARCHIVE")
[ "$BAD" = "0" ] || die "archive rejetée (chemins non conformes)."

DB="$MANAGE_DIR/data/api-manage.db"
if [ -f "$DB" ] && [ "$FORCE" = "0" ]; then
  die "DB déjà présente ($DB). Sauvegardez-la puis relancez avec --force pour écraser."
fi

log "Extraction sous $PARENT…"
mkdir -p "$PARENT"
tar -C "$PARENT" -xzf "$ARCHIVE" || die "extraction échouée."

# Droits stricts sur les secrets restaurés.
chmod 600 "$MANAGE_DIR/.env" 2>/dev/null || true
while IFS="$(printf '\t')" read -r slug dir branch port label; do
  chmod 600 "$PARENT/$dir/.env" 2>/dev/null || true
done < <(read_forks)
chmod 644 "$DB" 2>/dev/null || true

ok "État restauré."
warn "Les clés API en base sont déchiffrables UNIQUEMENT avec le SESSION_SECRET (ou STORAGE_ENC_SECRET) d'origine, restauré via .env. Sinon : relancer seed:mistral / seed:albert ou re-saisir en admin."

if [ "$NO_RESTART" = "1" ]; then log "(--no-restart : services non redémarrés.)"; exit 0; fi
if [ "$DEPLOY_OS" = "linux" ] && need_cmd systemctl; then
  systemctl --user daemon-reload 2>/dev/null || true
  systemctl --user restart 'corrector-*.service' 2>/dev/null && ok "Services redémarrés." || warn "Redémarrez les services manuellement (systemctl --user restart 'corrector-*')."
else
  log "Redémarrez les services de votre plateforme pour prendre en compte l'état restauré."
fi
