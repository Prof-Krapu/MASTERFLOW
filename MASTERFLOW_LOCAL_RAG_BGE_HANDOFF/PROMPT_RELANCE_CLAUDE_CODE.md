# Prompt De Reprise Pour Vincent / Claude Code

Tu travailles dans le repository backend MasterFlow.

Lis d'abord intégralement :

1. `MASTERFLOW_LOCAL_RAG_BGE_HANDOFF/00_START_HERE_VINCENT.md`
2. `MASTERFLOW_LOCAL_RAG_BGE_HANDOFF/README.md`
3. tous les fichiers de `MASTERFLOW_LOCAL_RAG_BGE_HANDOFF/docs/`
4. `contracts/rag-api.openapi.yaml`
5. `schemas/*.json`
6. la carte backend active du repository et ses règles `CLAUDE.md`

Objectif :

Intégrer progressivement un RAG local permissionné basé sur BGE-M3, un reranker
BGE et Qdrant, sans remplacer SQLite, sans modifier la source de vérité canon et
sans exposer une fonctionnalité non implémentée dans l'UI.

Contraintes absolues :

- commence par auditer l'état réel du repository ;
- ne suppose aucun endpoint absent ;
- permissions avant retrieval ;
- chaque hit pointe vers une source lisible ;
- aucun secret, token ou credential dans l'index ;
- canon, sécurité, outils et validation humaine restent hors RAG ;
- service désactivable et fallback propre ;
- petites PRs testables et réversibles ;
- ne code pas les PRs 2 à 5 avant validation de la PR 1.

Première mission :

1. cartographie les fichiers backend concernés ;
2. compare l'API proposée au registre d'actions réel ;
3. propose le diff exact de la PR 1 `Capability Shell` ;
4. liste migrations, endpoints, types partagés, tests et variables nécessaires ;
5. signale toute contradiction avant modification ;
6. attends validation expresse avant d'écrire.

Réponse attendue :

```text
ETAT REPO
COMPATIBILITE PACK
PR 1 PROPOSEE
FICHIERS TOUCHES
TESTS
RISQUES
QUESTIONS BLOQUANTES
```
