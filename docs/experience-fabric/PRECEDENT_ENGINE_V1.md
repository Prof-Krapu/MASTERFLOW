# Experience Fabric — Precedent Engine V1

Statut : V1 locale, lecture seule.  
Source : plan MasterFlow Experience Fabric — vague 2.

## Intention

Créer une mémoire de situations réutilisables sans ajouter un cerveau parallèle ni appliquer une
ancienne solution automatiquement.

Le moteur suit le cycle :

1. retrouver un cas comparable ;
2. expliquer pourquoi il ressemble au contexte ;
3. proposer une adaptation ;
4. demander validation humaine ;
5. retenir la leçon seulement après résultat observable.

## Sources projetées

Le moteur ne crée pas de table de précédents en V1. Il projette des sources existantes :

- `memory_cards` actives ;
- `room_checkpoints` privés de l'utilisateur ;
- `DecisionTrace` lorsqu'une décision est présente dans un checkpoint ;
- `DomainEventEnvelope` depuis la timeline Experience Fabric.

## Contrat

Un `PrecedentCase` contient :

- contexte ;
- décision ou action observée ;
- résultat ;
- leçon ;
- tags ;
- confiance ;
- sources ;
- indicateur `requires_human_validation: true`.

## Garde-fous

- Aucun précédent n'est exécuté automatiquement.
- Un cas candidat n'est visible que si `include_candidates=true`.
- Les projets privés restent isolés : même un godmode extérieur ne traverse pas le scope.
- Les payloads bruts ne sont pas exposés.
- Une recherche retourne une note d'adaptation, pas une décision.

## Endpoints

- `GET /api/v1/experience/precedents`
- `GET /api/v1/experience/precedents/:caseId`

Paramètres principaux :

- `project_id`
- `q`
- `tags`
- `source_kinds`
- `include_candidates`
- `limit`

## Hors périmètre V1

- pas d'embeddings ;
- pas de scoring IA ;
- pas de migration destructive ;
- pas de canonisation automatique ;
- pas de rétention automatique d'un nouveau cas après action ;
- pas de surface UI dédiée avant consolidation backend.
