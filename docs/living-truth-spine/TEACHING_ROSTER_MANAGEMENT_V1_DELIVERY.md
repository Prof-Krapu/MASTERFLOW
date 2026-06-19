# Teaching Roster Management V1 — Delivery

Statut : `MERGED_ON_MAIN`

Publication : PR #69 — `0168a7078d99c6efc44f7861a963bb42ea5f466f`

## Intention produit

Permettre au professeur de créer une cohorte privée et de maintenir sa liste d'étudiants
depuis Teaching, sans intervention technique ni import automatique.

## Livré

- liste des cohortes accessibles, filtrable par projet actif ;
- création manuelle d'une cohorte privée avec période optionnelle ;
- saisie simple d'un élève par ligne, avec alias optionnels après `|` ;
- création append-only d'une nouvelle version de roster ;
- version précédente archivée et historique visible ;
- permissions owner/projet et isolation d'une cohorte privée conservées.

## Limites conservées

- aucun import CSV, synchronisation établissement ou matching automatique ;
- aucune suppression de cohorte, roster ou identité ;
- aucune migration ou activation sur une base live ;
- aucune correction, note ou communication étudiant déclenchée.

## Vérifications

- backend : 363/363 tests verts ;
- TypeScript backend/frontend et build Vite : verts ;
- navigateur : création cohorte puis roster V1 de deux élèves réussie ;
- historique `V1 active · 2 élèves` visible ;
- aucun débordement horizontal à 1280 px et 390 px ;
- console navigateur sans erreur.
