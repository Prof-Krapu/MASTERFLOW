---
description: Exécuter une tâche MasterFlow ready et safe dans le worktree assistant courant
agent: masterflow-safe-executor
---

Tâche demandée : $ARGUMENTS

Lis @AGENTS.md, @assistant.md, @AGENT_TASKS.md, @INBOX_ASSISTANT.md et
@docs/agent-coordination/OPENCODE_DELEGATION_PROTOCOL.md.

Si un identifiant est fourni, traite uniquement cette tâche. Sinon, prends la première tâche
`ready` attribuée à `assistant` ou `opencode`.

Applique intégralement le gate de démarrage. Une tâche `open`, un worktree sur `main`, un
périmètre imprécis ou une classe autre que `safe` doit produire `blocked` sans modification.

Exécute seulement le plan borné, lance les checks demandés, passe le statut à
`done_unverified`, puis écris le reçu dans `OPENCODE_EXECUTION_LEDGER.md`.

Ne commit, ne push, ne merge et ne déploie jamais.
