#!/usr/bin/env bash
# install-autopush.sh — installe (ou retire) un hook git post-commit qui pousse
# automatiquement vers corrector.git après CHAQUE commit, dans les 12 dépôts
# (API_manage + 11 forks). À lancer sur la machine de DÉVELOPPEMENT (celle qui
# fait les commits) — PAS sur un serveur cible (qui ne doit pas repousser).
#
# Comportement : commit propre normal (tes messages), puis push auto de la branche
# courante vers le remote qui pointe sur corrector.git (gère le double-remote FR).
# Ne pousse JAMAIS ailleurs. Journalise dans <repo>/.git/autopush.log.
#
# Usage : install-autopush.sh [--uninstall]
set -euo pipefail
. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

UNINSTALL=0
[ "${1:-}" = "--uninstall" ] && UNINSTALL=1

MARKER="# corrector-autopush (géré par deploy/install-autopush.sh)"

# Contenu du hook — POSIX sh, autonome (ne dépend pas de deploy/).
read -r -d '' HOOK <<'HOOK_EOF' || true
#!/bin/sh
# corrector-autopush (géré par deploy/install-autopush.sh)
# Pousse la branche courante vers le remote corrector.git après chaque commit.
branch=$(git symbolic-ref --quiet --short HEAD) || exit 0

remote=""
up=$(git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' 2>/dev/null || true)
cand="${up%%/*}"
if [ -n "$cand" ]; then
  case "$(git remote get-url "$cand" 2>/dev/null)" in *corrector.git) remote="$cand" ;; esac
fi
if [ -z "$remote" ]; then
  for r in $(git remote); do
    case "$(git remote get-url "$r" 2>/dev/null)" in *corrector.git) remote="$r"; break ;; esac
  done
fi
[ -n "$remote" ] || { echo "[autopush] aucun remote corrector.git — push ignoré"; exit 0; }

log="$(git rev-parse --git-dir)/autopush.log"
ts=$(date '+%F %T')
if git push --quiet "$remote" "$branch" 2>>"$log"; then
  echo "[autopush] $branch -> $remote (corrector.git) OK"
  echo "$ts OK   $branch -> $remote" >> "$log"
else
  echo "[autopush] ECHEC push $branch -> $remote (voir $log) — commit conservé en local"
  echo "$ts FAIL $branch -> $remote" >> "$log"
fi
HOOK_EOF

hook_path() { # dossier repo → chemin absolu du hook post-commit
  local d="$1" gd
  gd=$( cd "$d" && git rev-parse --git-dir 2>/dev/null ) || return 1
  case "$gd" in /*) printf '%s/hooks/post-commit\n' "$gd" ;; *) printf '%s/%s/hooks/post-commit\n' "$d" "$gd" ;; esac
}

process() { # dossier repo, label
  local d="$1" label="$2" hp
  [ -d "$d/.git" ] || { warn "$label : pas un dépôt git ($d) — saut"; return 0; }
  hp="$(hook_path "$d")" || { warn "$label : git-dir introuvable — saut"; return 0; }
  mkdir -p "$(dirname "$hp")"

  if [ "$UNINSTALL" = "1" ]; then
    if [ -f "$hp" ] && grep -q "corrector-autopush" "$hp" 2>/dev/null; then
      rm -f "$hp"; ok "$label : hook retiré."
    else
      log "$label : pas de hook autopush (rien à faire)."
    fi
    return 0
  fi

  # Ne pas écraser un hook tiers sans sauvegarde.
  if [ -f "$hp" ] && ! grep -q "corrector-autopush" "$hp" 2>/dev/null; then
    cp "$hp" "$hp.pre-autopush"
    warn "$label : hook post-commit existant sauvegardé en post-commit.pre-autopush."
  fi
  printf '%s\n' "$HOOK" > "$hp"
  chmod +x "$hp"
  ok "$label : auto-push installé."
}

log "Dépôts ciblés : API_manage + 11 forks (sous $PARENT)"
[ "$UNINSTALL" = "1" ] && log "Mode : DÉSINSTALLATION"

process "$MANAGE_DIR" "manage"
while IFS="$(printf '\t')" read -r slug dir branch port label; do
  process "$PARENT/$dir" "$slug"
done < <(read_forks)

echo
if [ "$UNINSTALL" = "1" ]; then
  ok "Terminé — auto-push retiré des dépôts."
else
  ok "Terminé — chaque commit poussera désormais vers corrector.git."
  log "Journal par dépôt : <repo>/.git/autopush.log — retrait : deploy/install-autopush.sh --uninstall"
fi
