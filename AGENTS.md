# AGENTS.md — MasterFlow

Ce dépôt est la vérité logicielle de MasterFlow. Le canon produit reste dans le Drive
MASTERFLOW ; une tâche Git ne peut pas modifier la promesse produit sans décision humaine MALEX.

## Démarrage obligatoire

Avant toute analyse ou modification :

1. lire `CLAUDE.md` ;
2. lire `PROTOCOLE_SYNC_GIT_INBOX.md` ;
3. lire `AGENT_TASKS.md`, `SUIVI.md`, `SYNC_THREAD_MALEX_VINCENT.md`,
   `INBOX_MALEX.md` et `INBOX_VINCENT.md` ;
4. pour une délégation OpenCode, lire aussi `assistant.md` et `INBOX_ASSISTANT.md`.

Une inbox non lue ou un dépôt non synchronisé signifie que le contexte est incomplet.

## Hiérarchie des vérités

1. Canon Drive = vérité produit.
2. GitHub `main` = vérité logicielle publiée.
3. Fichiers de suivi = vérité opérationnelle.
4. Retours utilisateurs et legacy = matière à auditer, jamais canon automatique.

Ne jamais confondre : idée, canon, prototype, implémentation, test et déploiement live.

## Délégation OpenCode

`AGENT_TASKS.md` reste le board global. `INBOX_ASSISTANT.md` est l’unique file d’exécution
OpenCode : ne pas créer de queue concurrente.

OpenCode ne peut exécuter qu’une tâche :

- marquée `ready` ;
- attribuée à `assistant` ou `opencode` ;
- dotée d’un périmètre de fichiers explicite ;
- classée `safe` ;
- lancée dans un worktree dédié sur une branche `assistant/<task-id>-<slug>`.

`open` signifie « à préparer », pas « autorisé à exécuter ». `done_unverified` signifie
« résultat déclaré par OpenCode », pas « terminé ». Seul Codex ou MALEX peut passer la tâche
à `verified` après lecture du diff et checks indépendants.

OpenCode ne commit, ne push, ne merge et ne déploie jamais. Il ne touche jamais au Drive canon,
aux secrets, aux données réelles, aux migrations, aux permissions, aux rôles, aux engines,
à l’authentification ou aux seeds.

Protocole complet : `docs/agent-coordination/OPENCODE_DELEGATION_PROTOCOL.md`.

## Commandes de vérification

```bash
npm run lint
npm test
npm run build:frontend
```

Appliquer uniquement les checks proportionnés indiqués dans le plan de tâche. Ne jamais
présenter un check non lancé comme réussi.
