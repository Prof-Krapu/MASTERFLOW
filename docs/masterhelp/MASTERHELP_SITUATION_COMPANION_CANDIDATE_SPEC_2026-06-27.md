# MasterHelp — Situation Companion

Date : 2026-06-27  
Statut : mode MasterFlow candidat, non implémenté  
Origine : abstraction Roadtrip Moto + Factories + MasterFlow Inventory/Source Truth/Dataviz  

## Diagnostic

La Factory Roadtrip ne révèle pas seulement un besoin GPS.

Elle révèle un mode plus général :

```txt
Préparer une situation réelle
-> organiser ressources, contraintes et risques
-> vérifier les informations critiques
-> proposer des variantes
-> accompagner par checkpoints
-> produire un export clair
-> récupérer le retour d'expérience
```

Nom candidat : `MasterHelp / Situation Companion`.

## Périmètre produit

MasterHelp aide à piloter des situations concrètes :

- vacances tranquilles ;
- roadtrip ;
- JPO ;
- événement école ;
- déménagement ;
- sortie classe ;
- préparation d'oral ;
- mission terrain ;
- projet personnel court.

Il ne remplace pas les domaines existants. Il compose :

- Inventory ;
- Source Truth ;
- Planning ;
- Dataviz ;
- Checkpoints ;
- Export ;
- Backflow.

## Structure commune

```txt
Objectif
-> contexte
-> contraintes
-> ressources disponibles
-> ressources manquantes
-> risques
-> variantes
-> plan
-> checklist
-> accompagnement
-> export
-> retour d'expérience
```

## Objets principaux

```yaml
situation_companion:
  situation_id:
  title:
  situation_type: travel | vacation | event | school_event | field_mission | oral_defense | move | personal_project
  owner_id:
  participants:
  constraints:
  resources_available:
  resources_missing:
  critical_infos:
  variants:
  checkpoints:
  exports:
  source_registry:
  risk_register:
  dataviz_state:
  backflow_items:
```

## Roadtrip → MasterHelp

| Élément Roadtrip | Domaine spécifique | Primitive transversale | Mode MasterHelp |
|---|---|---|---|
| GPX actif | moto/cartographie | itinéraire ou plan de situation optionnel | route/plan |
| points d'eau / essence | sécurité moto | ressources critiques | critical resources |
| camping | voyage | point d'arrêt / hébergement | stop options |
| mode fatigue/pluie/canicule | terrain | contexte dégradé | degraded mode |
| roadbook PDF | roadtrip | export situationnel | situation export |
| variantes de trajet | GPS | comparateur d'options | variant comparison |
| check-ins voyage | route | checkpoints terrain | manual checkpoint |
| confiance des sources | sécurité | source truth | source registry |
| inventaire moto | équipement | inventory de situation | situation inventory |
| profil rider | moto | profil d'usage | preference profile |

## Verrous

- MasterHelp ne doit pas inventer une information critique.
- Une estimation doit rester visible comme estimation.
- Une donnée de sécurité faible ou périmée bloque le signal vert.
- Une action externe reste manuelle.
- Un export ne vaut pas publication.
- Une situation privée ne devient pas template public sans validation.

## UI attendue

Pas de gros dashboard.

Vue cible :

```txt
Situation actuelle
-> 1-3 alertes utiles
-> prochaine action
-> ressources critiques
-> variantes si décision
-> checkpoint
-> export
-> sources/détails à la demande
```

## Lien Git recommandé

Étapes :

1. rester doc/candidat ;
2. tester avec Roadtrip Factory ;
3. ajouter primitives Dataviz et Source Truth ;
4. créer schémas partagés seulement si usage répété ;
5. créer UI workspace seulement après preuve d'usage.

## Décision recommandée

Ne pas intégrer Roadtrip comme app isolée.

Intégrer d'abord :

- `visual_datum`;
- `source_truth_strip`;
- `variant_comparison`;
- `situation_inventory`;
- `checkpoint_state`;
- `situation_export`.

