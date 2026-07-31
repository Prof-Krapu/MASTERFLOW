# Design Preflight — Shell/Dock vers runtime

Date : 2026-07-31
Round : `GIT-CONSOLIDATION-001`
Work package : `GTC-005`
Statut : préparation contractuelle locale, aucun raccord exécuté

## Surface et rôle

- surfaces : Shell, navigation, System Bar et Command Dock ;
- rôle produit : répondre à « où suis-je ? », « que puis-je faire ? » et « qu'est-ce qui demande
  mon attention ? » ;
- audience : student, teacher, admin et godmode selon le loadout réel ;
- propriétaires : MALEX pour expérience/DA, Vincent pour contrats/permissions, Codex pour mapping,
  tests et Git.

## Contexte

Le prototype `/ui-reset` possède déjà un pont opportuniste en lecture seule vers :

- `GET /api/v1/context/current` ;
- `GET /api/v1/jobs` ;
- `GET /api/v1/validation-inbox`.

Ce pont n'est pas une promotion runtime complète. Quand le contexte échoue, le prototype reste
consultable avec ses fixtures et affiche un état dégradé. Ce comportement est acceptable pour une
route prototype, mais ne doit pas devenir un fallback silencieux dans le runtime final.

GTC-005 ne modifie ni ce code, ni les endpoints, ni les permissions.

## Composants existants

- `PrototypeNavigationRail` ;
- `PrototypeCommandDock` ;
- `PrototypeSystemChrome` ;
- bibliothèque d'actions et panneaux mobiles ;
- registre de profils et modes du prototype ;
- adaptateur frontend `apps/frontend/src/api.ts` ;
- contrats partagés `CurrentContext`, `UserRuntimeLoadout` et `ActionRegistryEntry`.

## Règles applicables

- DES-001 : montrer la situation, pas un catalogue ;
- DES-002 : révélation progressive depuis le contexte et le loadout ;
- DES-003 : conserver la profondeur de navigation et le retour ;
- DES-004 : mêmes commandes, mêmes comportements ;
- DES-006 : desktop complet, mobile conversationnel ;
- DES-007 : raccourcis optionnels qui ne volent pas la saisie ;
- DES-008 : entrées et sorties cohérentes ;
- DES-009 : état compréhensible sans couleur seule ;
- DES-010 : clavier, focus, labels et reduced motion ;
- DES-011 : thèmes accessibles, sans changement global silencieux.

## Décisions verrouillées

- `CurrentContext.user_runtime_loadout` décide des modes, actions et raccourcis disponibles ;
- `CurrentContext.available_actions` est la source des suggestions du Dock ;
- l'UI ne recalcule jamais une permission à partir du seul rôle affiché ;
- une action absente du snapshot n'est pas présentée comme active ;
- une action sensible n'est jamais exécutée directement depuis une suggestion ;
- Home, Persona, Skilltree, Project, Teaching et Learn restent hors tranche ;
- aucun nouvel asset, provider, endpoint, schéma ou permission ;
- aucun nouveau raccord pendant ce work package documentaire.

## Zones libres pour une future implémentation

- microcopy des états vides et dégradés ;
- ordre visuel des cinq suggestions déjà autorisées ;
- densité desktop/mobile ;
- animation des panneaux ;
- présentation d'un verrou lorsque le backend fournit une raison explicite.

## États obligatoires

| État | Comportement attendu |
|---|---|
| loading | squelette discret, aucune fixture présentée comme runtime |
| runtime | modes et actions issus du snapshot |
| empty | Home minimale et Dock clavier sans fausse suggestion |
| partial | contexte lisible, badges secondaires indisponibles |
| degraded | prototype explicitement identifié, aucun statut runtime simulé |
| locked | raison explicite issue du loadout |
| forbidden | surface masquée ou message adapté, jamais erreur technique brute |
| validation_required | intention visible, exécution absente |
| error | retry manuel futur, aucune boucle silencieuse |

## Responsive

- desktop : rail, Dock et System Bar visibles sans dashboard permanent ;
- mobile : navigation basse, panneaux plein écran, Dock sans débordement à 390 px ;
- maximum cinq suggestions visibles ;
- les actions supplémentaires restent dans une bibliothèque explicitement ouverte.

## Accessibilité

- focus visible et ordre clavier stable ;
- `Esc` ferme la couche la plus haute ;
- les raccourcis globaux sont désactivés pendant la saisie, sauf `Esc`, `Enter` et `Shift+Enter` ;
- labels accessibles pour les boutons icônes ;
- état jamais exprimé uniquement par la couleur ;
- reduced motion obligatoire avant promotion.

## Données backend autorisées pour la tranche

| Source | Usage autorisé |
|---|---|
| `GET /context/current` | utilisateur, room, modes, raccourcis, actions et verrous |
| `GET /jobs` | compteur et états en lecture seule, déjà scopés côté backend |
| `GET /validation-inbox` | compteur teacher+ uniquement, aucune décision |

`GET /actions/available` n'est pas la source P1 : il renvoie le registre complet. Le Dock doit
préférer `CurrentContext.available_actions`, déjà filtré par statut live, rôle et contexte.

## Validations avant une future modification de code

- MALEX : hiérarchie, microcopy, desktop/mobile et DA ;
- Vincent : loadout, filtrage des actions, visibilité jobs/inbox et permissions ;
- Codex : contrat partagé, états d'erreur, build, tests et diff Git ;
- nouveau GO : obligatoire avant toute modification UI ou raccord.

## Critère simple de succès

Le futur Shell peut peindre uniquement ce que le backend autorise, sans perdre le feeling du
prototype, sans simuler une capacité et sans exécuter d'action.

## Première tranche bornée

1. lire `CurrentContext` comme snapshot unique ;
2. projeter modes et raccourcis depuis le loadout ;
3. projeter au maximum cinq suggestions depuis `available_actions` et les listes d'IDs du loadout ;
4. afficher jobs et inbox comme attention secondaire en lecture seule ;
5. rester explicitement dégradé si une source secondaire échoue ;
6. ne créer, préflighter, valider ou exécuter aucune action.

Cette tranche est un contrat. Elle n'est pas autorisée en code par GTC-005.
