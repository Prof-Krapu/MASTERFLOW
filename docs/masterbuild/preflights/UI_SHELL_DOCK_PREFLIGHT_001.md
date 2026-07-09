# Design Preflight — UI-SHELL-DOCK-001

Date : 2026-07-09  
Surfaces : Shell / navigation / Command Dock  
Audience principale : professeur / owner produit  
Contributeurs : MALEX, Vincent, Codex  

## Situation

Le prototype contient déjà la coque, le menu, le dock clavier/micro/actions et des raccourcis. Le
Lab contient les composants isolés. Le runtime expose déjà du contexte et des actions, mais la
promotion complète Lab → Prototype → Runtime n'est pas faite.

## Composants existants

- Component Lab ;
- prototype `/ui-reset` ;
- Command Dock clavier/micro/actions ;
- navigation gauche ;
- system bar ;
- raccourcis globaux ;
- registres MASTERBUILD.

## Principes applicables

- DES-001 : montrer la situation, pas le catalogue ;
- DES-002 : révélation progressive par contexte et loadout ;
- DES-003 : navigation par zoom ;
- DES-004 : composants et comportements cohérents ;
- DES-006 : desktop full power, mobile conversationnel ;
- DES-007 : raccourcis optionnels et cohérents ;
- DES-008 : entrée et sortie animées ;
- DES-009 : état lisible sans couleur seule ;
- DES-010 : accessibilité interactive ;
- DES-011 : thèmes guidés et accessibles.

## Décisions verrouillées

- ne pas redessiner la navigation sans nécessité ;
- ne pas afficher toutes les fonctionnalités en vrac ;
- ne pas simuler une capacité future comme active ;
- garder les actions sensibles sous validation explicite ;
- garder le clavier/micro cohérent entre surfaces ;
- éviter les scans visuels longs quand MALEX peut valider à l'oeil.

## Zones libres

- microcopy ;
- ordre local des actions ;
- rythme et détail d'animation ;
- présentation des états vides/verrouillés ;
- expérimentation dans le Lab avant promotion.

## États obligatoires

- loaded ;
- empty ;
- partial ;
- locked ;
- future ;
- error ;
- validation_required ;
- read_only ;
- mobile.

## Desktop / mobile

- Desktop : cockpit complet, raccourcis, panneaux maîtrisés.
- Mobile : conversationnel, panneaux plein écran, pas de surcharge de modes.

## Accessibilité

- focus visible ;
- labels accessibles ;
- `Esc` cohérent ;
- raccourcis qui ne volent pas la saisie ;
- contraste clair/sombre ;
- état jamais dépendant uniquement de la couleur ;
- reduced motion respecté aux gates de promotion.

## Backend

État actuel : `ready` pour Shell/Dock, mais raccord incomplet.

Dépendances :

- `context-current` ;
- `runtime-loadout` ;
- `action-registry`.

Manques à traiter :

- promotion runtime ;
- recette permissions ;
- lecture actions réelles ;
- préflight visible avant action sensible.

## Validations

- MALEX : expérience, navigation, DA, comportement.
- Vincent : contrats, permissions, données, runtime.

## Recommandation

Commencer par l'audit ciblé des composants et endpoints, puis brancher uniquement les lectures
nécessaires. Garder Home, personas et skilltree hors de ce Round.
