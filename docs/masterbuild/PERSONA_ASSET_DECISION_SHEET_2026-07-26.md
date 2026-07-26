# Persona Asset Decision Sheet — 2026-07-26

Cette fiche sert de point de reprise court pour éviter de mélanger actif, candidat et génération en cours.

## Validé / Actif

| Persona | Asset | Statut | Usage |
|---|---|---|---|
| MasterFlex | 6 portraits `640x640` | actif standard | `/ui-reset`, skilltree, navigation |
| MasterFlex | canon full body | actif | page personnage |
| ProfKrapu | 6 portraits `640x640` | actif standard | `/ui-reset`, profil Vincent |
| ProfKrapu | canon V3 | actif | page personnage |
| MasterFlow | logo + wordmark SVG | actif | `/ui-reset`, `/ui-lab` |

## Candidat / Lab

| Persona | Asset | Statut | Décision attendue |
|---|---|---|---|
| MasterFlex | Stage Actor gauche/droite normalisé | candidat Lab | revue visuelle finale avant promotion proto |
| MasterFlex | Stage Actor alpha sources | archive process | garder pour diagnostic de cadrage |
| ProfKrapu | Stage Actor pack | candidat à produire | fallback canon visible dans le Lab en attendant |
| MasterFlow | pipeline Identity Assets | candidat process | intégrer plus tard dans Theme Studio / MASTERBUILD |

## À Refaire / À Produire

| Persona | Besoin | Règle |
|---|---|---|
| ProfKrapu | Stage Actor pack | 20 images cible `960x1728`, `left/right`, même logique que MasterFlex, sans génération automatique en bloc |
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
