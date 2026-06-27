# Protocole de délégation Codex → OpenCode

## Objectif

Utiliser OpenCode/Big Pickle comme exécutant économique pour les tâches mécaniques, tout en
gardant Codex comme poste de contrôle de l’alignement canon, du risque, de la revue et de la
publication GitHub.

Ce protocole ne délègue aucune autorité produit à OpenCode.

## Chaîne de responsabilité

```text
MALEX fixe l’objectif
  → Codex audite et découpe
  → Codex publie un plan safe dans INBOX_ASSISTANT.md
  → OpenCode exécute dans un worktree assistant dédié
  → OpenCode rend un reçu done_unverified
  → Codex relit le diff et relance les checks
  → MALEX autorise commit/push si nécessaire
  → Codex publie et passe la tâche à verified
```

## Sources de vérité

- `AGENT_TASKS.md` : board global entre agents.
- `INBOX_ASSISTANT.md` : unique queue d’exécution OpenCode.
- `OPENCODE_EXECUTION_LEDGER.md` : reçus append-only des exécutions.
- `SUIVI.md` : évolution durable du repo.
- Drive canon : vérité produit, toujours hors du périmètre d’écriture OpenCode.

## Statuts

| Statut | Sens | OpenCode peut agir |
|---|---|---|
| `draft` | plan en préparation | non |
| `open` | plan à compléter ou arbitrer | non |
| `ready` | plan borné et classé safe par Codex/MALEX | oui |
| `claimed` | exécution en cours | oui, agent nommé uniquement |
| `done_unverified` | résultat déclaré, en attente de revue Codex | non |
| `verified` | diff et checks revus indépendamment | non |
| `blocked` | décision, risque ou information manquante | non |
| `rejected` | tâche abandonnée explicitement | non |

Le mot `done` seul est interdit pour OpenCode.

## Classement du risque

Une tâche est `safe` seulement si elle satisfait toutes les conditions :

- comportement déjà décidé ;
- fichiers autorisés listés ;
- pas de canon, secret, provider, réseau ou donnée réelle ;
- pas de migration, seed, permission, rôle, auth, engine ou contrat partagé ;
- pas de suppression, renommage large, dépendance ou déploiement ;
- résultat réversible et vérifiable par diff/tests.

Sinon la tâche reste chez Codex, ou passe à `blocked`.

## Préparation par Codex

Codex doit :

1. vérifier canon, Git, inbox et branche ;
2. créer ou compléter l’entrée `AGENT_TASKS.md` ;
3. remplir un plan dans `INBOX_ASSISTANT.md` avec le modèle officiel ;
4. classer explicitement la tâche `safe` ;
5. créer une branche et un worktree dédiés, par exemple :

   ```bash
   git worktree add ../MASTERFLOW_OPENCODE_TASK-XXX -b assistant/task-xxx-slug main
   ```

6. indiquer à MALEX le chemin à ouvrir dans OpenCode ;
7. ne passer la tâche à `ready` qu’une fois ces gates satisfaits.

## Exécution OpenCode

Dans l’application OpenCode ouverte sur le worktree dédié :

```text
/mf-status
/mf-next TASK-XXX
```

Depuis un terminal utilisateur hors de la sandbox Codex :

```bash
scripts/opencode-masterflow.sh status
scripts/opencode-masterflow.sh next TASK-XXX
```

Le lanceur refuse une exécution `next` hors branche `assistant/*`, sans tâche `ready` ou sans
classe de risque `safe`.

La sandbox Codex ne peut pas déclencher elle-même l’appel modèle : sa politique interdit
l’export direct du contexte privé du workspace vers un provider externe non approuvé, même
après accord utilisateur. Codex prépare donc le plan et le worktree ; MALEX lance la commande
dans OpenCode ou son terminal, puis Codex reprend la revue du diff local.

OpenCode doit refuser si la branche n’est pas `assistant/*`, si la tâche n’est pas `ready`,
si le worktree n’est pas propre au départ ou si le périmètre est ambigu.

## Reçu obligatoire

Le reçu doit contenir :

- task id, modèle et date ;
- branche et SHA de départ ;
- fichiers modifiés ;
- résumé du diff ;
- checks réellement lancés avec résultats ;
- écarts, limites et doutes ;
- confirmation : aucun commit/push/merge/live ;
- statut `done_unverified` ou `blocked`.

## Revue Codex

Codex ne se fie jamais au texte « réussi ». Il vérifie :

1. branche et diff exacts ;
2. absence de fichiers hors scope ;
3. respect du comportement décidé ;
4. checks proportionnés relancés ;
5. absence de secret, donnée sensible ou dérive canon ;
6. mise à jour des suivis ;
7. seulement ensuite : proposition de commit/push à MALEX.

## Installation locale vérifiée

- application macOS OpenCode présente ;
- CLI officiel OpenCode `1.17.11` installé via `anomalyco/tap/opencode` ;
- modèle `opencode/big-pickle` disponible ;
- agents `masterflow-auditor` et `masterflow-safe-executor` détectés par le CLI ;
- appel modèle depuis Codex refusé par la politique d’export du workspace ;
- lancement disponible côté MALEX via l’application ou le terminal local.
