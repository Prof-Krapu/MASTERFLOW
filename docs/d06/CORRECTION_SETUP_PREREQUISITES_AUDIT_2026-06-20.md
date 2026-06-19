# D06 — Audit des prérequis de lancement d'un lot

## Diagnostic

La création d'un lot de correction ne peut pas être exposée proprement maintenant.
Le runtime exige déjà deux références validées :

1. une version de barème (`rubric_version`) ;
2. un profil institutionnel de notation (`institutional_grading_profile`).

Les tables et contrôles existent, mais aucune route ni interface professeur ne permet de
créer, relire et valider ces objets. La base de recette contient actuellement zéro barème
et zéro profil. Créer directement le lot produirait donc une interface inutilisable ou
contournerait les garde-fous du canon.

## Pipeline corrigé

1. surface privée de création/relecture du barème ;
2. surface privée de profil de notation et seuils protégés ;
3. validation explicite professeur ;
4. création du lot avec cohorte, roster, sujet, sources, barème et profil ;
5. snapshot immuable de contexte ;
6. seulement ensuite, pré-correction candidate et revue humaine.

## Verrous maintenus

- aucun modèle ou provider lancé ;
- aucun score ou feedback final ;
- aucun lot prêt sans références validées ;
- aucune migration ou activation live.
