#!/usr/bin/env bash
# export-state.sh — CÔTÉ SOURCE : archive l'état vivant (SQLite + .env) pour migration.
# Coupe brièvement la gateway (trap de redémarrage), checkpoint WAL (TRUNCATE) via
# better-sqlite3, puis tar de la DB + .env gateway + .env des forks découverts.
# L'archive contient TOUS les secrets → chmod 600, à transférer par canal sûr puis effacer.
# Usage : export-state.sh [archive.tar.gz]   (défaut : ./corrector-state-<horodatage>.tar.gz)
set -euo pipefail
. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

STAMP="$(date +%Y%m%d-%H%M%S)"
ARCHIVE="${1:-$PWD/corrector-state-$STAMP.tar.gz}"
DB="$MANAGE_DIR/data/api-manage.db"
[ -f "$DB" ] || die "DB introuvable : $DB"

# --- Arrêt/redémarrage de la gateway pendant le checkpoint --------------------
SERVICE_STOPPED=0
stop_manage() {
  if [ "$DEPLOY_OS" = "linux" ] && need_cmd systemctl && systemctl --user is-active --quiet corrector-manage.service 2>/dev/null; then
    log "Arrêt temporaire de corrector-manage…"; systemctl --user stop corrector-manage.service; SERVICE_STOPPED=1
  elif [ "$DEPLOY_OS" = "darwin" ] && launchctl list 2>/dev/null | grep -q com.corrector.manage; then
    log "Arrêt temporaire de com.corrector.manage…"; launchctl bootout "gui/$(id -u)/com.corrector.manage" >/dev/null 2>&1 || true; SERVICE_STOPPED=1
  else
    warn "corrector-manage non géré par un service actif — checkpoint quand même (assurez-vous qu'aucun writer ne tourne)."
  fi
}
restart_manage() {
  [ "$SERVICE_STOPPED" = "1" ] || return 0
  if [ "$DEPLOY_OS" = "linux" ]; then systemctl --user start corrector-manage.service && log "corrector-manage redémarré."
  else launchctl bootstrap "gui/$(id -u)" "$HOME/Library/LaunchAgents/com.corrector.manage.plist" 2>/dev/null && log "com.corrector.manage rechargé."; fi
}
trap restart_manage EXIT

stop_manage

log "Checkpoint WAL (TRUNCATE)…"
( cd "$MANAGE_DIR" && node -e '
  const Database = require("better-sqlite3");
  const db = new Database(process.argv[1]);
  const r = db.pragma("wal_checkpoint(TRUNCATE)");
  console.log("[checkpoint]", JSON.stringify(r));
  db.close();
' "$DB" ) || die "checkpoint échoué (better-sqlite3 installé ? lancez install.sh)."

# --- Constitution de la liste des fichiers (chemins relatifs à PARENT) --------
MANAGE_DIR_REL="$(basename "$MANAGE_DIR")"
add() { [ -f "$PARENT/$1" ] && FILES_LIST="$FILES_LIST $1"; }
FILES_LIST=""
add "$MANAGE_DIR_REL/data/api-manage.db"
add "$MANAGE_DIR_REL/.env"
while IFS="$(printf '\t')" read -r slug dir branch port label; do
  add "$dir/.env"
done < <(read_forks)
FILES_LIST="${FILES_LIST# }"
[ -n "$FILES_LIST" ] || die "rien à archiver."

log "Fichiers inclus :"; for f in $FILES_LIST; do printf '  %s\n' "$f"; done

# tar sans les -wal/-shm/.bak-* (on ne liste que des fichiers explicites).
tar -C "$PARENT" -czf "$ARCHIVE" $FILES_LIST || die "tar a échoué."
chmod 600 "$ARCHIVE"

ok "Archive : $ARCHIVE ($(du -h "$ARCHIVE" | cut -f1))"
warn "Contient tous les secrets — transfert scp/tailscale uniquement, puis EFFACER des deux côtés."
