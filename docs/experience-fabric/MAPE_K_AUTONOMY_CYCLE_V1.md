# Experience Fabric — Cycle MAPE-K contrôlé V1

Statut : publié via PR #164, planification sans exécution.

## Intention

Assembler les fondations Experience Fabric dans une boucle d'autonomie contrôlée :

1. `Monitor` : lire le snapshot et les événements permissionnés ;
2. `Analyze` : compter blocages, validations, précédents et storylets ;
3. `Plan` : classer des actions candidates explicables ;
4. `Execute` : rester à `not_executed` ;
5. `Knowledge` : exposer les précédents sans rétention automatique.

## Sources runtime

- Event Spine et snapshot ;
- Precedent Engine ;
- Storylet Engine ;
- scopes projet, workbench et session guidée.

## Surface

`GET /api/v1/experience/autonomy/cycle`

Paramètres optionnels :

- `project_id` ;
- `workbench_id` ;
- `guided_session_id` ;
- `limit`.

## Verrous

- `execution_policy: plan_only` ;
- aucun `Action` créé ;
- aucun candidat sélectionné automatiquement ;
- aucun résultat ou précédent retenu automatiquement ;
- chaque candidat conserve ses sources et son besoin de validation ;
- les projets privés restent protégés ;
- l'Action Engine demeure l'unique chemin d'exécution futur.

## Suite

Le Blackboard multi-personas pourra déposer des contributions privées dans ce cycle. Un seul
porte-parole synthétisera ensuite les propositions avant toute décision humaine ou création
d'Action.
