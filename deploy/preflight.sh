#!/usr/bin/env bash
# preflight.sh — contrôles CÔTÉ SOURCE avant le grand chantier (Phase 0).
# Vérifie que les 11 forks sont propres/synchronisés et qu'API_manage n'a
# jamais commité de secret. N'écrit rien, ne pousse rien.
set -euo pipefail
. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

fail=0

log "Parent des checkouts : $PARENT"
log "Dépôt cible          : $(corrector_repo)"
echo

log "Forks (propreté + synchro) :"
while IFS="$(printf '\t')" read -r slug dir branch port label; do
  d="$PARENT/$dir"
  if [ ! -d "$d/.git" ]; then
    printf '  %-6s %s MANQUANT (%s)\n' "$slug" "$C_R✗$C_0" "$d"; fail=1; continue
  fi
  dirty="$(git -C "$d" status --porcelain 2>/dev/null | grep -vE '^\?\?' | grep -c . || true)"
  sb="$(git -C "$d" status -sb 2>/dev/null | head -1)"
  mark="$C_G✓$C_0"
  case "$sb" in *'[devant'*|*'[ahead'*|*'[derrière'*|*'[behind'*) mark="$C_Y!$C_0" ;; esac
  [ "$dirty" != "0" ] && mark="$C_Y!$C_0"
  printf '  %-6s %s %-18s %s (%s modifs suivies)\n' "$slug" "$mark" "$branch" "$sb" "$dirty"
done < <(read_forks)
echo

log "API_manage — aucun secret dans l'historique :"
added="$(git -C "$MANAGE_DIR" log --all --diff-filter=A --oneline -- .env 'data/*' 2>/dev/null | grep -c . || true)"
if [ "$added" = "0" ]; then
  printf '  %s .env / data/ jamais ajoutés au suivi\n' "$C_G✓$C_0"
else
  printf '  %s %s commit(s) ajoutant .env/data/ — À INSPECTER avant push\n' "$C_R✗$C_0" "$added"; fail=1
fi
secrets="$(git -C "$MANAGE_DIR" log --all -p 2>/dev/null | grep -ncE 'glpat-[A-Za-z0-9_-]{20}|sk-[A-Za-z0-9]{20}|BEGIN (RSA|OPENSSH) PRIVATE KEY' || true)"
if [ "$secrets" = "0" ]; then
  printf '  %s aucun motif de secret (glpat-/sk-/clé privée) dans les diffs\n' "$C_G✓$C_0"
else
  printf '  %s %s occurrence(s) de motif secret — À INSPECTER\n' "$C_R✗$C_0" "$secrets"; fail=1
fi

echo
if [ "$fail" = "0" ]; then ok "Preflight OK — prêt pour le renommage forge + push."; else die "Preflight : anomalies ci-dessus à traiter avant de continuer."; fi
