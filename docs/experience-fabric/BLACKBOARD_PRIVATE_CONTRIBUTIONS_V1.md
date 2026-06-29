# Experience Fabric — Blackboard privé V1

Statut : V1 read-only, synthèse sans exécution.

## Intention

Le Blackboard consolide les signaux du cycle MAPE-K avant décision humaine :

1. état surveillé par l'Event Spine ;
2. storylets candidates ;
3. précédents disponibles ;
4. garde-fous ;
5. compagnon assigné quand une session guidée est fournie.

Il ne crée pas un deuxième cerveau autonome. Il transforme les contributions privées en une synthèse
lisible par un porte-parole unique.

## Surface

`GET /api/v1/experience/autonomy/blackboard`

Paramètres optionnels :

- `project_id` ;
- `workbench_id` ;
- `guided_session_id` ;
- `limit`.

## Verrous

- `execution_policy: synthesize_only` ;
- contributions visibles uniquement dans le cycle ;
- aucun `Action` créé ;
- aucune permission modifiée ;
- aucune rétention mémoire automatique ;
- aucun dialogue multi-personas exposé ;
- le porte-parole sémantique reste unique.

## Rôle produit

Cette vague prépare les surfaces GodMode, Teaching et MasterStory :

- comprendre qui recommande quoi ;
- voir les sources et risques ;
- éviter les décisions silencieuses ;
- garder les personas comme contributeurs privés ou inspirations, pas comme autorités concurrentes.
