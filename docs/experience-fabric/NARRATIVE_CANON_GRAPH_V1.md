# Experience Fabric — Narrative Canon Graph V1

Statut : V1 locale, lecture seule.  
Source : plan MasterFlow Experience Fabric — vague 3.

## Intention

Séparer proprement :

- la vérité narrative : faits, personnages, événements, continuité ;
- la présentation : ce qu'un public voit, dans quel ordre, avec quel niveau de spoiler.

Cette séparation empêche MasterFlow de confondre un canon, une scène, une lecture sans spoiler et un
atelier complet.

## Sources projetées

La V1 ne crée pas de table canon parallèle. Elle projette :

- `story_nodes` ;
- `narrative_events` ;
- `story_characters`.

## Contrats ajoutés

- `NarrativeFact`
- `NarrativePresentation`
- `CharacterKnowledge`
- `CharacterGoal`
- `SetupPayoff`
- `NarrativeCanonGraph`

## Endpoint

`GET /api/v1/narrative/workbench/:id/canon-graph`

Paramètre :

- `presentation_mode=reader|workshop|full_spoilers|export`

## Garde-fous

- Un fait spoiler reste dans le graph mais peut être caché dans la présentation.
- Le mode `reader` masque les faits `major` et `critical`.
- Le mode `workshop` masque les faits `critical`.
- La projection ne canonise rien.
- Aucun delta canon, export, génération visuelle ou publication n'est déclenché.
- Les accès suivent les permissions existantes du workbench/projet.

## Diagnostics V1

Le graph expose :

- contradictions ;
- fuites de spoiler ;
- alertes temporelles futures ;
- émotions sans cause futures.

Les deux derniers champs sont prévus pour les vagues Storylet / Drama Manager et restent vides en V1.

## Hors périmètre V1

- pas de moteur d'intrigue ;
- pas de storylets ;
- pas de validation automatique de cohérence ;
- pas de modification des tables MasterStory ;
- pas de surface UI dédiée ;
- pas de génération image.
