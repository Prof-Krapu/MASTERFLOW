# DECISION — Persona utilisateur et bots contextuels

Statut : `DECISION MALEX / 2026-06-13`

## Decision

MasterFlow distingue deux couches conversationnelles :

1. **Persona utilisateur par defaut** : compagnon personnel attache a l'utilisateur.
2. **Bot/guide contextuel** : intervenant assigne a une activite, classe, projet, event ou tunnel.

MOTH n'est pas le persona par defaut de tous les utilisateurs. MOTH est un guide contextuel
assignable a un atelier, par exemple une classe ou une activite CDC.

## Regle produit

Chaque utilisateur doit pouvoir avoir son persona dedie pour l'accompagner dans MasterFlow :

- preferences ;
- niveau ;
- style d'accompagnement ;
- historique autorise ;
- aide transverse ;
- continuites personnelles.

Les bots contextuels ont une mission bornee :

- MOTH pour CDC / cadrage ;
- bot event pour inscription ou qualification ;
- bot devis pour demande client ;
- bot correction pour grille ;
- bot cours pour exercice ou sequence.

## Invariant permission

Ni le persona personnel, ni le bot contextuel, ni le lore ne donnent de droits.

Les droits viennent uniquement de :

```text
permission_runtime
membership
ownership
scope
action risk
validation gates
```

## Interaction attendue

Dans une classe ou activite :

```text
user
-> personal_persona_runtime
-> activite assignee
-> contextual_bot_guide
-> permission_runtime
-> guided/session/action engines
```

Le persona personnel peut aider l'utilisateur a comprendre et progresser. Le bot contextuel mene
l'exercice selon le guide, les templates, les scopes et les gates.

## Impact backend

Prevoir dans les contrats :

- `personal_persona_id` ou equivalent cote profil utilisateur ;
- `contextual_bot_id` / `guide_id` cote activite/session ;
- separation entre persona fonctionnelle et persona lore ;
- assignations scopees par classe/projet/session ;
- aucune elevation de droit par assignation de persona.

## Impact UI

L'UI doit eviter la confusion :

- persona personnel = accompagnement general ;
- bot contextuel = activite precise ;
- MOTH visible seulement dans les contexts ou il est assigne ;
- action disponible seulement si le runtime la permet.

## Impact pedagogique

Cette separation permet :

- accompagnement personnalise continu ;
- interventions pedagogiques specialisees ;
- activites plus incarnées sans imposer un personnage unique partout ;
- meilleure lisibilite pour les etudiants ;
- reutilisation des bots dans cours, event, devis, correction et ateliers.

