# Persona Asset Decision Sheet — 2026-07-26

Cette fiche sert de point de reprise court pour éviter de mélanger actif, candidat et génération en cours.

## Validé / Actif

| Persona | Asset | Statut | Usage |
|---|---|---|---|
| MasterFlex | 6 portraits `640x640` | actif standard | `/ui-reset`, skilltree, navigation |
| MasterFlex | canon full body | actif | page personnage |
| ProfKrapu | 6 portraits `640x640` | actif standard | `/ui-reset`, profil Vincent |
| ProfKrapu | canon V4 | actif | page personnage `/ui-reset` + Lab partagé |
| MasterFlow | logo + wordmark SVG | actif | `/ui-reset`, `/ui-lab` |

## Candidat / Lab

| Persona | Asset | Statut | Décision attendue |
|---|---|---|---|
| MasterFlex | Stage Actor gauche/droite normalisé | candidat Lab | revue visuelle finale avant promotion proto |
| MasterFlex | Stage Actor alpha sources | archive process | garder pour diagnostic de cadrage |
| ProfKrapu | Stage Actor reboot neutral + listening | archive process | rangé sous `archive-process/reboot-20260727`, mauvais contrat left/right, garder comme preuve mais ne plus afficher comme pack valide |
| ProfKrapu | Stage Actor directional neutral-left | rejeté | rangé sous `rejected/reboot-20260730-directional`, orientation et alpha non conformes |
| ProfKrapu | source reboot candidate 01 | archive process | promue en `profkrapu-canon-v4.png`, ne pas garder comme canon parallèle |
| ProfKrapu | Stage Actor pack 2026-07-26 | archive process | superseded par canon reboot, ne plus guider la DA |
| MasterFlow | pipeline Identity Assets | candidat process | intégrer plus tard dans Theme Studio / MASTERBUILD |

## À Refaire / À Produire

| Persona | Besoin | Règle |
|---|---|---|
| ProfKrapu | Stage Actor neutral | refaire `neutral-left` puis `neutral-right` avec contrat bord d'ecran strict |
| ProfKrapu | Stage Actor states finals | produire les etats seulement apres validation du couple neutral |
| ProfKrapu | Stage Actor reboot | repartir du canon V4, pas du pack 2026-07-26 ni des drafts directionnels |
| MasterFlex | éventuelles poses refusées | repartir des versions validées, jamais d’une dérive précédente |

## À Décider

| Sujet | Risque | Recommandation |
|---|---|---|
| Sources lourdes PSD / variantes | alourdir Git et brouiller le canon actif | conserver hors runtime, importer seulement une preuve si utile |
| Archives ancien clone | import massif accidentel | garder comme preuve, sélectionner fichier par fichier |

## Règle De Promotion

Un asset passe `candidat → actif` seulement si :

- il a un usage UI identifié ;
- son format est standard ou explicitement accepté ;
- MALEX valide le rendu ;
- Codex vérifie chemin, import, build et Git.
