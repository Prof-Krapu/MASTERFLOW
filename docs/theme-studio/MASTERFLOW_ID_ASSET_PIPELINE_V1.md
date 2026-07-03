# MasterFlow ID Asset Pipeline V1

Date : 2026-07-01  
Statut : `prototype_process_validated`  
Surface : Theme Studio / DA Studio / Persona portraits

Runbook d’exécution associé :

`docs/theme-studio/MASTERFLOW_PERSONA_ASSET_RUNBOOK_V1.md`

## Décision Simple

MasterFlow doit traiter les assets d'identité comme des assets canon dérivés, pas comme des
images isolées.

Le bon pipeline est :

1. choisir un visuel canon maître ;
2. normaliser un gabarit UI fixe ;
3. générer ou éditer les états expressifs ;
4. ne garder que la zone utile d'expression ;
5. recomposer sur le gabarit maître ;
6. contrôler les dimensions, l'alpha, la silhouette et la transition ;
7. intégrer seulement après validation visuelle.

## Pourquoi Ça Compte

Une profile pic animée ne supporte pas les micro-dérives : veste différente, crop différent,
casquette modifiée, épaules qui bougent, fond qui change ou silhouette qui saute.

Le modèle peut proposer de bonnes expressions, mais il a tendance à redessiner plus que demandé.
La solution MasterFlow est donc un pipeline hybride :

- l'IA propose l'expression ;
- le gabarit canon conserve l'identité ;
- le compositing fixe la stabilité UI.

## Bonnes Pratiques De Format

Pour une UI finale, `640 x 640` est un bon format de livraison.

Pour une source canon, il vaut mieux partir plus grand :

- source maître recommandée : `1024 x 1024`, `1254 x 1254` ou `2048 x 2048` ;
- travail d'expression : taille source ou `1024 x 1024` minimum ;
- sortie UI : `640 x 640`, `PNG`, alpha, crop strict ;
- ne pas générer directement en `640 x 640` si l'identité doit rester très contrôlée.

Générer directement en `640 x 640` est possible pour un brouillon, mais moins bon pour :

- garder les détails de fourrure, textile et contours ;
- détourer proprement ;
- recomposer une zone expression sans artefacts ;
- produire une version future plus grande.

Règle MasterFlow : **source grande, sortie UI stable**.

## Gabarit Canon En Pied

Le visuel canon en pied utilise un preset distinct des portraits :

- canvas final : `829 x 1500`, `PNG`, alpha ;
- marge haute cible : `23 px` ;
- marge basse cible : `24 px` ;
- marge latérale minimale : `27 px` ;
- priorité de normalisation : hauteur utile, puis largeur disponible ;
- masse visuelle centrée sur le canvas complet ;
- chaussures, cheveux, accessoires et vêtement entièrement dans le cadre.

La largeur réelle dépend de la morphologie du persona. MasterFlex occupe presque toute la
largeur à cause de sa carrure ; un persona humain plus fin conserve la même hauteur et le même
centre sans être artificiellement élargi.

Outil local :

`scripts/normalize-canon-asset.py`

Pour un fond chroma uniforme, utiliser d'abord :

`scripts/remove-connected-chroma.py`

Ce détourage ne supprime que la couleur chroma reliée aux bords du canvas. Il préserve donc les
couleurs proches enfermées dans le personnage, contrairement à une suppression globale qui peut
percer la peau, les accessoires ou les liquides.

Limite importante : une zone chroma enfermée dans des lunettes, une fiole ou un autre contour ne
sera pas reliée aux bords. Elle exige une correction ciblée avant intégration. Ne jamais compenser
ce défaut par un despill global agressif.

La couleur chroma n’est pas canonique. Elle doit être choisie par asset selon les couleurs du
personnage et de ses transparences. Pour un asset final complexe, préférer un alpha natif ou un
masque ciblé au chroma.

Exemple :

```bash
python3 scripts/remove-connected-chroma.py \
  --input "apps/frontend/src/assets/<persona>-canon/candidates/<persona>-source.png" \
  --output "apps/frontend/src/assets/<persona>-canon/candidates/<persona>-cutout.png"

python3 scripts/normalize-canon-asset.py \
  --input "apps/frontend/src/assets/<persona>-canon/candidates/<persona>-cutout.png" \
  --output "apps/frontend/src/assets/<persona>-canon/<persona>-canon-v3.png"
```

## Contrat D'Invariant

Pour une série d'états d'un même persona, ces éléments ne doivent pas bouger :

- cadrage carré ;
- taille de tête ;
- position des épaules ;
- costume ;
- casquette ou accessoire canon ;
- silhouette alpha ;
- position générale dans le cercle UI ;
- style graphique.

Seules ces zones peuvent changer :

- yeux ;
- sourcils ;
- bouche ;
- museau proche ;
- teinte légère du visage si elle sert l'état.

## Méthode Validée Sur MasterFlex

Source maître utilisée :

`/Users/malex/Downloads/1 juil. 2026, 18_45_47.png`

Lot de travail :

`apps/frontend/src/assets/masterflex-portraits/candidates/denim-states-strict/`

Outputs principaux :

- `neutral-preview-640.png` : base neutre normalisée ;
- `fear-strict-composite-640.png` ;
- `disgust-strict-composite-640.png` ;
- `sad-strict-composite-640.png` ;
- `confident-strict-composite-640.png` ;
- `joy-strict-composite-640.png` ;
- `contact-sheet-strict-composite.jpg` ;
- `transition-check.gif`.

Résultat technique attendu :

- toutes les images en `640 x 640 RGBA` ;
- même bbox alpha pour tous les états ;
- aucun remplacement des assets actifs sans validation.

## Pipeline Reproductible

1. Copier la source canon dans un dossier `candidates/<persona>-states-strict/`.
2. Créer une base `neutral-preview-640.png` depuis la source canon.
3. Générer une expression à la fois depuis le même portrait visible.
4. Sauvegarder chaque génération brute en `*-generated-source.png`.
5. Normaliser chaque génération en `*-preview-640.png`.
6. Créer un masque doux limité au visage.
7. Composer la zone expression sur `neutral-preview-640.png`.
8. Réappliquer l'alpha du neutre sur chaque composite.
9. Produire une planche contact et un GIF de transition.
10. Vérifier dimensions, alpha, bbox et stabilité visuelle.

Outil local sauvegardé :

`scripts/build-identity-state-pack.py`

Exemple :

```bash
python3 scripts/build-identity-state-pack.py \
  --source "apps/frontend/src/assets/masterflex-portraits/candidates/denim-states-strict/source-neutral-1254.png" \
  --out-dir "apps/frontend/src/assets/masterflex-portraits/candidates/denim-states-strict/rerun" \
  --state fear="apps/frontend/src/assets/masterflex-portraits/candidates/denim-states-strict/fear-generated-source.png" \
  --state disgust="apps/frontend/src/assets/masterflex-portraits/candidates/denim-states-strict/disgust-generated-source.png" \
  --state sad="apps/frontend/src/assets/masterflex-portraits/candidates/denim-states-strict/sad-generated-source.png" \
  --state confident="apps/frontend/src/assets/masterflex-portraits/candidates/denim-states-strict/confident-generated-source.png" \
  --state joy="apps/frontend/src/assets/masterflex-portraits/candidates/denim-states-strict/joy-generated-source.png"
```

## Prompt Type

```text
Edit the visible <PERSONA> portrait image.
Use case: identity-preserve character portrait edit.
Asset type: 640x640 UI profile portrait candidate.
Primary request: create the <STATE> state from the exact same portrait.

Critical invariants: keep the exact same square crop, same head size, same
shoulders, same outfit, same accessories, same species, same line-art style,
same lighting and same UI framing. Do not redesign the character. Do not change
clothing, pose, crop, camera angle, silhouette, or body.

Expression change only: <STATE_DIRECTION>.

Avoid: different outfit, logo changes, new accessories, different crop, human
realism, chibi, corporate mascot redesign, changing the body, changing the
silhouette.

Output one single square portrait only, no text, no labels, no contact sheet.
```

## États MasterFlex V1

- `neutral` : lucide, blasé, calme ;
- `fear` : angoisse lisible, bouche ouverte, léger côté livide, pas panique totale ;
- `disgust` : sceptique, bouche tordue, regard "vraiment ?" ;
- `sad` : doute, déception, regard bas ;
- `confident` : sourire en coin, regard malin ;
- `joy` : sourire idiot assumé, vivant, troll, mais même personnage.

## Critères D'Acceptation

Un lot peut remplacer les assets actifs seulement si :

- les six images ont exactement le même format ;
- la bbox alpha est identique ou quasi identique ;
- le costume et le crop ne changent pas ;
- les expressions sont lisibles à petite taille ;
- la transition ne donne pas l'impression de changer de personnage ;
- une planche contact et une séquence de contrôle existent ;
- MALEX a validé visuellement.

## Intégration Produit

Ce pipeline doit devenir une primitive DA Studio :

- entrée : portrait canon ou visuel canon ;
- sortie : `IdentityStatePack` candidat ;
- statut par défaut : `candidate`, jamais canon automatique ;
- validation : humaine avant remplacement des assets actifs ;
- futur : UI d'édition des masques, preview dans cercle, test de transition.

Interdits V1 :

- pas de remplacement automatique ;
- pas de canonisation automatique ;
- pas de provider image branché au backend ;
- pas de publication sans validation.
