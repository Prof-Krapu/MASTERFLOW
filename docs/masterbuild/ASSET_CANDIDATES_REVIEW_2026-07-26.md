# MasterFlow Asset Candidates Review — 2026-07-26

Statut : audit non destructif
Base cible : `MASTERFLOW_MASTERBUILD_V2`
Branche cible : `codex/masterbuild-v2`
Source secondaire : ancien clone local `MASTERFLOW`

## Diagnostic Simple

La branche V2 contient déjà les assets nécessaires au prototype partagé :

- portraits MasterFlex actifs ;
- portraits ProfKrapu actifs ;
- canons en pied MasterFlex et ProfKrapu ;
- pack Stage Actor MasterFlex gauche/droite normalisé ;
- logo/wordmark dynamiques.

L'ancien clone contient encore beaucoup de candidats utiles, mais ils ne doivent pas être importés
en bloc. Certains sont des sources, certains des previews, certains des backups, certains des
doublons, et certains des fichiers non standards ou temporaires.

Règle : on versionne dans Git ce qui sert au proto, au Lab, au canon ou à la preuve de process.
Le reste reste en quarantaine jusqu'à décision.

## Inventaire Actif Dans V2

| Famille | Chemin V2 | Format constaté | Statut | Action |
|---|---|---:|---|---|
| MasterFlex portraits | `apps/frontend/src/assets/masterflex-portraits/*.png` | 6 fichiers `640 x 640`, RGBA alpha | actif proto | garder |
| ProfKrapu portraits | `apps/frontend/src/assets/profkrapu-portraits/*.png` | 6 fichiers `640 x 640`, RGBA alpha | actif proto standard | garder |
| MasterFlex canon | `apps/frontend/src/assets/masterflex-canon-full.png` | `829 x 1500`, RGBA alpha | actif proto | garder |
| ProfKrapu canon | `apps/frontend/src/assets/profkrapu-canon/profkrapu-canon-v4.png` | `829 x 1500`, RGBA alpha | actif proto/Lab | garder |
| MasterFlex Stage Actor normalisé | `apps/frontend/src/assets/masterflex-stage-actor/candidates/*-normalized/*.png` | 20 fichiers `960 x 1728`, RGBA alpha | candidat intégré Lab | garder |
| MasterFlex Stage Actor alpha | `apps/frontend/src/assets/masterflex-stage-actor/candidates/*-alpha/*.png` | 20 fichiers RGBA alpha | source candidate | garder provisoirement |
| Logo / typo | `masterflow-mark-graff.svg`, `masterflow-wordmark.svg` | SVG | actif proto/Lab | garder |
| Fallbacks étudiants | `apps/frontend/src/assets/student-placeholders/*.png` | 2 fichiers `640 x 640`, RGBA alpha | actif runtime/Lab | garder jusqu'à avatar de compte |

## Archives Et Rejets ProfKrapu Dans V2

| Famille | Chemin V2 | Format constaté | Statut | Action |
|---|---|---:|---|---|
| Source canon V4 | `profkrapu-canon/candidates/reboot-20260727/` | raw, alpha et copie normalisée | archive process | conserver comme provenance |
| Stage Actor direction draft | `profkrapu-stage-actor/archive-process/reboot-20260727/` | 4 raw, 4 alpha, 4 normalisés | archive process | ne pas exposer comme pack valide |
| Neutral directionnel raté | `profkrapu-stage-actor/rejected/reboot-20260730-directional/` | 1 PNG RGB | rejeté | conserver uniquement comme preuve de dérive |

## Candidats Restants Dans L'Ancien Clone

| Famille | Chemin ancien clone | Lecture | Risque si import brut | Décision recommandée |
|---|---|---|---|---|
| MasterFlex portrait backups | `masterflex-portraits/candidates/backup-before-denim-states-20260701/` | anciens portraits pré-denim | retour arrière visuel involontaire | archive seulement si besoin historique |
| MasterFlex denim strict | `masterflex-portraits/candidates/denim-states-strict/` | sources, previews, composites et contact sheets du pipeline portrait | mélange source/previews/actifs ; certains fichiers opaques | ne pas importer en bloc ; sélectionner uniquement README/contact sheet si preuve utile |
| MasterFlex canon candidates | `masterflex-portraits/candidates/masterflex-canon-*` | versions de travail du canon en pied et sources | confusion avec canon actif | garder hors Git sauf source canon validée |
| ProfKrapu canon candidates | `profkrapu-canon/candidates/` | sources de reboot, dont candidate 01 promue en V4 | utile pour provenance DA | garder comme archive process, pas comme canon parallèle |
| ProfKrapu canon V2/V3 | `profkrapu-canon/profkrapu-canon-v2.png`, `profkrapu-canon/profkrapu-canon-v3.png` | anciennes versions | risque de remplacer la V4 validée | ne pas promouvoir |
| ProfKrapu portrait candidates | `profkrapu-portraits/candidates/` | sources RGB + contact sheets | utile pour preuve, pas runtime | importer uniquement si on veut tracer la génération |
| ProfKrapu alpha preview | `profkrapu-portraits/profkrapu-expression-alpha-preview.png` | preview RGB | pas un asset actif | garder hors runtime |
| MasterFlex PSD | `masterflex-canon-full.psd` | source lourde | poids Git + outil non web | décider séparément |
| `_masterflex-canon-full.png` | ancien clone | variante canon/source | doublon probable | comparer visuellement avant import |
| `tmp/pdfs/*` | ancien clone | previews PDF logo/typo | temporaire | ne pas importer |

## Écarts À Surveiller

### ProfKrapu Portraits

Les portraits ProfKrapu actifs ont été normalisés en `640 x 640`, RGBA alpha.

Les sources `1254 x 1254` sont conservées dans :

`apps/frontend/src/assets/profkrapu-portraits/backup-before-640-20260726/`

Décision recommandée : garder les actifs `640 x 640` comme standard UI, et ne revenir aux
sources que si MALEX demande une retouche visuelle.

### Sources DA

Le Git contient les actifs et une partie du process, mais pas toutes les sources candidates.

Deux stratégies possibles :

1. **Git léger** : actifs + docs + scripts, sources lourdes hors Git.
2. **Git preuve complète** : actifs + candidats + contact sheets + sources utiles.

Recommandation : Git léger pour le runtime, dossier `docs/ui/archive/` pour les preuves validées,
et sources lourdes seulement si elles sont indispensables à refaire l'asset.

## Actions Recommandées

| Priorité | Action | Pourquoi |
|---:|---|---|
| 1 | Garder `MASTERFLOW_MASTERBUILD_V2` comme base de travail unique | C'est la seule branche propre et poussée contenant Lab + MASTERBUILD + Stage Actor |
| 2 | Ne pas importer les candidats de l'ancien clone en vrac | Trop de doublons et de fichiers intermédiaires |
| 3 | Créer plus tard un registre asset typé dans le Lab | Permettre à MALEX/Vincent de voir actif/candidat/archive sans fouiller les dossiers |
| 4 | Normaliser ProfKrapu portraits en `640 x 640` si l'UI montre des sautes | Dette propre mais non urgente |
| 5 | Décider du sort des PSD/sources lourdes | Éviter un Git obèse sans bénéfice runtime |

## Prochaine Vague Conseillée

`asset-registry-lab-v1`

Objectif : ajouter dans MASTERBUILD/Lab une vue lisible :

- persona ;
- type : portrait, canon, stage actor, source, archive ;
- statut : actif, candidat, rejeté, historique ;
- format ;
- alpha ;
- où c'est utilisé ;
- prochaine action.

Cela remplacera le tri mental par une mini fiche produit. Beaucoup plus humain, beaucoup moins
"je fouille dans 73 PNG à la lampe frontale".
