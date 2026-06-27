# Modèle de plan OpenCode

```markdown
## TASK-XXX — <titre>
- statut : draft
- target : opencode
- agent : non assigné
- créé par : codex
- créé : AAAA-MM-JJ
- priorité : basse | normale | haute
- classe de risque : safe
- source de vérité : <référence canon/contrat/code existant>
- branche attendue : assistant/task-xxx-<slug>
- worktree attendu : ../MASTERFLOW_OPENCODE_TASK-XXX

### Intention
<résultat utile en une phrase>

### Contexte vérifié
- <fait prouvé>

### Fichiers autorisés en écriture
- `<chemin exact>`

### Fichiers autorisés en lecture
- `<chemin exact>`

### Interdictions
- aucun fichier hors liste ;
- aucun changement produit/contrat ;
- aucun secret, provider, réseau, donnée réelle ou live ;
- aucun commit, push, merge ou déploiement.

### Étapes
1. <étape bornée>

### Critères d’acceptation
- <preuve observable>

### Checks obligatoires
- `<commande>`

### Stop conditions
- <condition qui impose blocked>

### Réponse OpenCode
> Vide avant exécution.
```

Seul Codex ou MALEX transforme `draft/open` en `ready`.
