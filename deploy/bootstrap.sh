#!/usr/bin/env bash
# bootstrap.sh — CÔTÉ CIBLE : clone les 11 forks depuis le dépôt unique.
# Idempotent (saute un checkout déjà présent). API_manage est déjà cloné par la
# ligne unique ; ce script clone ses frères sous $PARENT.
set -euo pipefail
. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

while [ $# -gt 0 ]; do
  case "$1" in
    --only) ONLY="$2"; shift 2 ;;
    --only=*) ONLY="${1#*=}"; shift ;;
    *) die "bootstrap.sh : argument inconnu $1" ;;
  esac
done

REPO="$(corrector_repo)"
log "Dépôt          : $REPO"
log "Destination    : $PARENT/"
mkdir -p "$PARENT"

while IFS="$(printf '\t')" read -r slug dir branch port label; do
  dest="$PARENT/$dir"
  if [ -d "$dest/.git" ]; then
    log "$slug : $dir déjà cloné — saut."
  else
    log "$slug : clone $branch → $dir"
    git clone --branch "$branch" --single-branch "$REPO" "$dest" \
      || die "clone de $dir ($branch) échoué."
  fi

  # Cas FR : double remote. Le fork dérive de API_corrector (PC) ; on garde le
  # forge sous le nom `forge` et un `origin` local vers le checkout PC frère.
  if [ "$slug" = "fr" ]; then
    if git -C "$dest" remote | grep -qx origin && ! git -C "$dest" remote | grep -qx forge; then
      git -C "$dest" remote rename origin forge
    fi
    sibling="$PARENT/API_corrector"
    if [ -d "$sibling/.git" ]; then
      if git -C "$dest" remote | grep -qx origin; then
        git -C "$dest" remote set-url origin "$sibling"
      else
        git -C "$dest" remote add origin "$sibling"
      fi
      git -C "$dest" branch --set-upstream-to="forge/$branch" "$branch" >/dev/null 2>&1 || true
      log "fr : double remote (forge=$REPO, origin=$sibling)"
    else
      warn "fr : checkout PC absent ($sibling) — origin local non ajouté (clonez pc d'abord)."
    fi
  fi
done < <(read_forks)

ok "Bootstrap terminé — $(fork_count) fork(s) présent(s) sous $PARENT."
