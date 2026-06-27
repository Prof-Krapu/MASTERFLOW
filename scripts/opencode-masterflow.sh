#!/bin/zsh

set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root"

model="${OPENCODE_MODEL:-opencode/big-pickle}"
mode="${1:-status}"

if ! command -v opencode >/dev/null 2>&1; then
  echo "OpenCode CLI absent. Installer la formule officielle avant de continuer." >&2
  exit 1
fi

case "$mode" in
  status)
    exec opencode run \
      --command mf-status \
      --model "$model" \
      --agent masterflow-auditor
    ;;

  next)
    task_id="${2:-}"
    if [[ ! "$task_id" =~ '^TASK-[0-9]+$' ]]; then
      echo "Usage : scripts/opencode-masterflow.sh next TASK-XXX" >&2
      exit 1
    fi

    branch="$(git branch --show-current)"
    if [[ "$branch" != assistant/* ]]; then
      echo "Refus : la branche courante doit commencer par assistant/." >&2
      exit 1
    fi

    task_block="$(
      awk -v heading="## ${task_id} " '
        index($0, heading) == 1 {capture = 1}
        capture && /^## TASK-/ && index($0, heading) != 1 {exit}
        capture {print}
      ' INBOX_ASSISTANT.md
    )"

    if [[ -z "$task_block" ]]; then
      echo "Refus : ${task_id} est absent de INBOX_ASSISTANT.md." >&2
      exit 1
    fi

    if ! grep -Eq '^- statut : ready$' <<<"$task_block"; then
      echo "Refus : ${task_id} n’est pas au statut ready." >&2
      exit 1
    fi

    if ! grep -Eq '^- classe de risque : safe$' <<<"$task_block"; then
      echo "Refus : ${task_id} n’est pas classée safe." >&2
      exit 1
    fi

    exec opencode run "$task_id" \
      --command mf-next \
      --model "$model" \
      --agent masterflow-safe-executor
    ;;

  *)
    echo "Usage : scripts/opencode-masterflow.sh status | next TASK-XXX" >&2
    exit 1
    ;;
esac
