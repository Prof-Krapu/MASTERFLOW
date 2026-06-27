# INBOX_ASSISTANT — MasterFlow

Objectif : unique file d’exécution de plans bornés confiés par **Codex / Claude Code / MALEX**
aux agents assistants via OpenCode.

Règles de lecture (mêmes principes que `INBOX_VINCENT.md` / `INBOX_MALEX.md`) :

- **lire `assistant.md` ET `CLAUDE.md` avant de prendre une tâche** ;
- traiter les entrées du haut vers le bas ;
- statuts : `draft` · `open` · `ready` · `claimed` · `done_unverified` · `verified` ·
  `blocked` · `rejected` ;
- OpenCode traite uniquement `ready` ; `open` ne vaut jamais autorisation ;
- **une réponse IA ne vaut pas validation humaine** : `done_unverified` attend la relecture Codex ;
- l’agent travaille dans un worktree dédié sur `assistant/*`, lance les checks prescrits et
  **ne commit/push/merge jamais** ;
- toute tâche qui dérive vers backend sensible, permissions, engines, endpoints, secrets ou périmètre → `blocked`, on laisse à Claude.
- protocole complet : `docs/agent-coordination/OPENCODE_DELEGATION_PROTOCOL.md`.

---

## Modèle de tâche

```markdown
## TASK-XXX — <titre court>
- statut : draft
- target : opencode
- agent : non assigné
- de : <codex | claude-code | malex>
- créé : <AAAA-MM-JJ>
- priorité : <basse | normale | haute>
- classe de risque : safe
- source de vérité : <référence vérifiée>
- branche attendue : assistant/task-xxx-<slug>
- worktree attendu : ../MASTERFLOW_OPENCODE_TASK-XXX

### Intention
<résultat précis>

### Fichiers autorisés en écriture
- <chemins exacts>

### Étapes
1. <étape>

### Critères d'acceptation
- <preuve>

### Checks obligatoires
- <commande>

### Stop conditions
- <condition de blocage>

### Interdictions
- aucun fichier hors liste ;
- aucun commit, push, merge, live, secret, provider ou donnée réelle.

### Réponse OpenCode
> (vide — à remplir par l'agent assistant, voir assistant.md §5)
```

---

## TASK-000 — (EXEMPLE, ne pas traiter)

- statut : exemple
- de : claude-code
- créé : 2026-06-12
- priorité : basse
- fichiers : —
- contexte : illustre une tâche complète avec sa réponse signée.
- tâche : exemple illustratif uniquement.
- NE PAS : la traiter (c'est une démo).

### Réponse — deepseek-v3 via opencode — 2026-06-12
- statut → done_unverified
- branche : assistant/task-000-demo
- ce que j'ai fait : rien (tâche d'exemple), juste illustrer le format.
- fichiers modifiés : aucun
- checks : `npm run lint` → ok ; `npm test` → 13/13 vert
- doutes / limites : aucun
- opérations Git/publication : aucun commit, push, merge ou live
- à relire par Codex : non, exemple uniquement
— signé : deepseek-v3 via opencode

---

<!-- ↓ Nouvelles tâches 'open' à ajouter sous cette ligne ↓ -->

> Aucune tâche `ready` au 2026-06-27. Codex doit publier un plan borné avant toute exécution.


<!-- ─────────────── ARCHIVE (tâches relues/mergées par Claude ou Vincent) ─────────────── -->
