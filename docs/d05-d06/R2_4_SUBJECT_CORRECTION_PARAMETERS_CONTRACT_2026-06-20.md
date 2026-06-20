# R2.4 — Paramètres pédagogiques du sujet vers la fiche

## Intention produit

Faire du sujet validé la source privée des paramètres qui structurent réellement la fiche de
correction, sans les reconstruire manuellement après chaque assignment.

## Source canon

`03_DOMAINS/D06_CORRECTION_FEEDBACK_EVALUATION/DOMAIN_CARD.md`, section `Correction Sheet Autosync` :
objectifs, rendus, critères, compétences, Bloom, contraintes, ressources, checkpoints, mode
d'évaluation, assistance et échéances.

## Changement borné

- ces paramètres entrent dans le manifest versionné du sujet ;
- la fiche les dérive depuis le snapshot exact de la version choisie ;
- Teaching permet leur saisie explicite ;
- les anciens manifests restent lisibles avec des valeurs vides ou nulles.

## Exclusions

Aucune interprétation automatique du niveau Bloom, aucun score, aucune note, aucun barème généré,
aucune publication, aucun provider, aucun traitement de copie et aucune migration live.

## Succès et risque

- succès : sujet V1 puis V2 transportent les paramètres dans les fiches correspondantes ;
- risque : faible, extension additive privée et rétrocompatible ;
- validation : contrat marathon pour code/tests ; décision séparée avant live ou publication.
