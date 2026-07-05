# MasterFlow UI Asset Curation V1

Statut : manifeste corrige, assets actifs canon visuel valide
Owner : MALEX
Date : 2026-07-05
Validation : MALEX confirme que les assets actifs sont valides depuis longtemps
Reference : `docs/ui/MASTERFLOW_UI_CDC_CANON_V2.md`

## 1. Decision

Ce manifeste separe les assets actuellement consommes par le prototype, les candidats visuels,
les sources de travail et les artefacts de verification.

Il n'autorise aucun remplacement, deplacement, renommage, nettoyage, commit, push ou passage en
canon visuel.

## 2. Statuts

| Statut | Sens |
|---|---|
| `canon_visual_validated` | asset actif valide par MALEX et consomme par `/ui-reset` |
| `candidate_review` | sortie utile a montrer avant decision humaine |
| `working_source` | source de fabrication a conserver hors runtime |
| `backup` | preuve de retour arriere, non publiable comme asset actif |
| `debug_preview` | controle visuel, contact sheet, GIF ou sortie de debug |
| `superseded_candidate` | ancienne piste non active, a archiver plus tard |
| `canon_visual` | interdit sans validation humaine explicite asset par asset |

## 3. Set actif du prototype

Ces fichiers sont la verite d'implementation actuelle et le canon visuel valide confirme par
MALEX. Leur remplacement exige une nouvelle validation explicite.

### MasterFlex

- `apps/frontend/src/assets/masterflex-canon-full.png`
- `apps/frontend/src/assets/masterflex-portraits/neutral.png`
- `apps/frontend/src/assets/masterflex-portraits/fear.png`
- `apps/frontend/src/assets/masterflex-portraits/disgust.png`
- `apps/frontend/src/assets/masterflex-portraits/sad.png`
- `apps/frontend/src/assets/masterflex-portraits/confident.png`
- `apps/frontend/src/assets/masterflex-portraits/joy.png`

Statut : `canon_visual_validated`.

### ProfKrapu

- `apps/frontend/src/assets/profkrapu-canon/profkrapu-canon-v3.png`
- `apps/frontend/src/assets/profkrapu-portraits/neutral.png`
- `apps/frontend/src/assets/profkrapu-portraits/fear.png`
- `apps/frontend/src/assets/profkrapu-portraits/disgust.png`
- `apps/frontend/src/assets/profkrapu-portraits/sad.png`
- `apps/frontend/src/assets/profkrapu-portraits/confident.png`
- `apps/frontend/src/assets/profkrapu-portraits/joy.png`

Statut : `canon_visual_validated`.

## 4. Candidats a montrer

### MasterFlex denim strict

Lot de revue prioritaire :

- `neutral-preview-640.png`
- `fear-strict-composite-640.png`
- `disgust-strict-composite-640.png`
- `sad-strict-composite-640.png`
- `confident-strict-composite-640.png`
- `joy-strict-composite-640.png`
- `contact-sheet-strict-composite.jpg`
- `transition-check.gif`

Chemin :

`apps/frontend/src/assets/masterflex-portraits/candidates/denim-states-strict/`

Statut : `candidate_review`.

Decision attendue : valider ou rejeter le pack complet. Ne pas panacher les expressions sans une
nouvelle revue de coherence.

### ProfKrapu expressions

Support de revue :

- `apps/frontend/src/assets/profkrapu-portraits/candidates/profkrapu-expression-contact-sheet.png`
- `apps/frontend/src/assets/profkrapu-portraits/profkrapu-expression-alpha-preview.png`

Statut : `candidate_review`.

Decision attendue : Vincent peut commenter la fidelite du profil ; MALEX conserve la decision DA
et le verrou canon.

## 5. Sources de travail hors runtime

Conserver comme `working_source`, sans import dans le registre prototype :

- `apps/frontend/src/assets/masterflex-canon-full.psd`
- `apps/frontend/src/assets/_masterflex-canon-full.png`
- fichiers `*-generated-source.png`
- fichiers `*-source.png`
- variantes `masterflex-neutral-*`
- variantes `masterflex-canon-*` non actives
- dossier `apps/frontend/src/assets/profkrapu-canon/candidates/`

Ces fichiers servent a reproduire, comparer ou reprendre le travail. Leur presence ne constitue
pas une validation visuelle.

## 6. Backups et artefacts a exclure d'un snapshot applicatif

Classer comme `backup` :

- `apps/frontend/src/assets/masterflex-portraits/candidates/backup-before-denim-states-20260701/`
- `masterflex-canon-full-before-20260701.png`

Classer comme `debug_preview` :

- `contact-sheet-preview.jpg`
- `recent-generated-debug-sheet.png`
- previews intermediaires non retenues ;
- `tmp/pdfs/`.

Classer comme `superseded_candidate` :

- `apps/frontend/src/assets/profkrapu-canon/profkrapu-canon-v2.png`, car le prototype consomme V3.

Aucun de ces fichiers ne doit etre supprime sans validation explicite. Ils doivent seulement rester
hors du prochain snapshot applicatif.

## 7. Matrice de decision

| Lot | Etat | Risque | Decision recommandee |
|---|---|---|---|
| Assets actifs suivis par Git | `canon_visual_validated` | faible | conserver inchanges comme reference |
| MasterFlex denim strict | `candidate_review` | moyen | revue MALEX du pack complet |
| ProfKrapu expressions | `candidate_review` | moyen | avis Vincent puis decision DA MALEX |
| PSD et sources de generation | `working_source` | faible | conserver hors runtime |
| Backups | `backup` | faible | archiver plus tard, ne pas supprimer |
| Contact sheets, GIF et debug | `debug_preview` | faible | utiliser pour revue, exclure du snapshot |
| ProfKrapu V2 | `superseded_candidate` | faible | archiver plus tard si V3 est confirme |

## 8. Gate avant integration

Un pack ne peut remplacer les assets actifs que si :

1. le contact sheet est valide humainement ;
2. la coherence entre les six expressions est acceptee ;
3. l'alpha, le cadrage et les dimensions sont verifies ;
4. `/ui-reset` desktop et mobile sont relus ;
5. les transitions sont testees ;
6. le manifeste indique les fichiers exactement remplaces ;
7. MALEX donne un GO distinct pour le remplacement ;
8. commit et push recoivent encore une validation separee.

## 9. Prochaine decision

Choisir entre :

- conserver les assets actifs canoniques ;
- valider le pack MasterFlex denim strict ;
- demander une nouvelle iteration ;
- recueillir d'abord l'avis de Vincent sur ProfKrapu.
