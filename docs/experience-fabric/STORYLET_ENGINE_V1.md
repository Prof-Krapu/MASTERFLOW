# Experience Fabric — Storylet Engine V1

Statut : V1 locale, lecture seule/suggestion only.  
Source : plan MasterFlow Experience Fabric — vague 4.

## Intention

Rendre la narration, l'onboarding, les ponts de mode et les notifications modulaires sans créer
d'autonomie incontrôlée.

Une storylet V1 :

- détecte une opportunité contextuelle ;
- explique pourquoi elle apparaît ;
- propose une action ;
- indique les effets attendus ;
- demande validation si nécessaire ;
- n'exécute jamais l'action silencieusement.

## Sources évaluées

- `NarrativeCanonGraph` : setup/payoff, contradictions, spoilers ;
- `PrecedentCase` : cas comparables à afficher avant un nouveau plan ;
- `DomainEventEnvelope` : blockers et échecs dans la timeline.

## Endpoint

`GET /api/v1/experience/storylets`

Paramètres :

- `project_id`
- `workbench_id`
- `domains`
- `limit`

## Politique d'exécution

La V1 retourne toujours :

```json
{"execution_policy": "suggest_only"}
```

Aucune storylet ne lance une action, un job, une génération, une canonisation ou un changement de
mode sans validation explicite et futur raccord à l'Action Engine.

## Garde-fous

- Les storylets candidates sont des propositions, pas des décisions.
- Les blockers restent bloquants tant qu'ils ne sont pas résolus ou reportés.
- Les précédents servent à comparer, pas à réappliquer.
- Les workbenches/projets privés restent protégés par les permissions existantes.

## Hors périmètre V1

- pas de persistance des storylets ;
- pas de scheduler ;
- pas de Drama Manager ;
- pas de MAPE-K ;
- pas de UI dédiée ;
- pas d'exécution automatique.
