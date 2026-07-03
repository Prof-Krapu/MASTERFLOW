# MasterFlow Command Dock Lab V1

Statut : prototype local.

Cette fiche cadre l'isolation du dock clavier / micro / historique dans `/ui-lab`.

## Intention

Le Command Dock est transversal : Home, pages, skilltree, Tunnel et mobile dépendent de son comportement.

Le Lab doit permettre de tester ce composant sans naviguer dans tout `/ui-reset`.

## Presets Disponibles

| Preset | Objectif |
|---|---|
| Fermé | vérifier l'état repos |
| Clavier | ouvrir le clavier standard |
| Texte long | vérifier confort et hauteur du textarea |
| Historique | vérifier apparition et expansion d'une entrée |
| Micro | vérifier panneau micro sans REC |
| REC | vérifier état conversation vocale active |
| Transcription | vérifier dictée dans le clavier, séparée du micro conversationnel |

## Règles Produit

- `Enter` envoie.
- `Shift+Enter` ajoute une ligne.
- Le clavier ne se ferme pas après envoi.
- Le micro conversationnel et la transcription clavier sont deux fonctions différentes.
- Les suggestions restent limitées à 5 actions visibles.
- Le dock doit rester le même composant sur toutes les surfaces.

## Validation Rapide

À vérifier dans `/ui-lab` :

- scénario `Édition` ;
- onglet `command` ;
- preset `Texte long` ;
- preset `Historique` ;
- preset `REC` ;
- preset `Transcription` ;
- mode `390 px`.

## Limite

Cette vague ne modifie pas les animations du dock dans `/ui-reset`. Elle donne seulement un banc de test plus rapide pour les prochaines retouches.
