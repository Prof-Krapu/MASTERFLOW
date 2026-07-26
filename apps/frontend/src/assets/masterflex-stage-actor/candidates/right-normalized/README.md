# MasterFlex Stage Actor - Right Normalized Candidates

Pack candidat normalise pour revue et test Lab.

## Format

- Canvas : `960 x 1728`
- Mode : `RGBA`
- Baseline : `40 px` de marge sous le bas de la silhouette
- Fond : transparent

## Methode

Chaque `right` a ete :

1. detoure depuis le fond chroma rose ;
2. redimensionne pour matcher la hauteur de silhouette du `left` correspondant ;
3. pose sur le canvas final avec la meme baseline.

Cette methode evite les changements de taille perceptibles entre un etat `left` et son equivalent `right`.

## Contenu

- `neutral-right.png`
- `positive-right.png`
- `thinking-right.png`
- `listening-right.png`
- `negative-right.png`
- `warning-right.png`
- `doubt-right.png`
- `fear-right.png`
- `explaining-right.png`
- `troll-right.png`

## Statut

Ces fichiers sont prets pour un test d'affichage dans le Lab / prototype, mais restent candidats.

Ne pas promouvoir en assets actifs sans validation visuelle MALEX.
