# OPENCODE_EXECUTION_LEDGER — reçus append-only

Ce fichier conserve les déclarations d’exécution OpenCode. Un reçu prouve ce que l’agent
déclare avoir fait ; il ne prouve ni la conformité du diff, ni la réussite réelle des checks,
ni la publication GitHub.

Codex relit chaque diff et relance les checks avant de passer une tâche à `verified`.

## Modèle de reçu

```markdown
## RECEIPT — TASK-XXX — AAAA-MM-JJ
- agent : <modèle> via OpenCode
- statut : done_unverified | blocked
- branche : assistant/task-xxx-<slug>
- sha de départ : <sha>
- fichiers modifiés : <liste>
- résumé : <court>
- checks : <commandes et résultats réels>
- limites / doutes : <liste ou aucun>
- opérations interdites : aucun commit, push, merge ou live
- relecture Codex : pending
```

---

<!-- Les nouveaux reçus sont ajoutés sous cette ligne. -->
