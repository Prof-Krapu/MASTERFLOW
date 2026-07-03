# MasterFlow Lab Exit Animations V1

Statut : prototype local.

Cette vague ajoute les sorties animées dans `/ui-lab` pour tester la règle UI : un composant qui apparaît doit disparaître proprement.

## Surfaces Couvertes

- Bibliothèque d'actions.
- Raccourcis.
- Paramètres.
- Panneaux système.
- Historique.
- Dock clavier / micro.
- Mode Tunnel.

## Principe

Le Lab garde le composant rendu pendant une courte durée après fermeture, avec la classe `is-closing`.

Cela permet de tester :

- fermeture par bouton ;
- fermeture par clic extérieur ;
- fermeture par `Esc` ;
- fermeture via changement de scénario ;
- réduction de mouvement avec `prefers-reduced-motion`.

## Règles Produit

- La sortie ne doit pas être instantanée sauf si l'utilisateur demande moins d'animations.
- Les overlays ferment sans casser l'état du composant testé.
- Le Lab teste les cycles d'apparition / disparition, mais ne change pas le contrat backend.
- `/ui-reset` reste la référence visuelle finale.

## À Vérifier

Dans `/ui-lab` :

- onglet `command`, presets clavier et micro ;
- onglet `overlays`, boutons paramètres/actions/raccourcis ;
- onglet `system`, recherche ou notifications ;
- scénario `Tunnel`, fermeture par croix puis `Esc`.

## Limite

La page personnage complète du Lab reste en fermeture directe dans cette vague. Sa sortie est déjà couverte dans `/ui-reset`.
