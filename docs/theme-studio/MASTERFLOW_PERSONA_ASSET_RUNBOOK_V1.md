# MasterFlow Persona Asset Runbook V1

Date : 2026-07-02
Statut : `prototype_process_validated`
Usage : préparation des assets personas avant intégration finale

Contrat produit futur associé :

`docs/theme-studio/MASTERFLOW_IDENTITY_FORGE_TUNNEL_CONTRACT_V1.md`

## Principe

Les portraits animés et le visuel canon en pied utilisent deux pipelines distincts.

- **Portraits** : stabilité absolue du cadrage et du costume.
- **Canon en pied** : identité issue du portrait, silhouette complète et gabarit vertical commun.

Une belle image isolée ne suffit pas. L’asset doit être interchangeable dans l’UI sans correction
CSS spécifique au persona.

## Procédure A — Portraits Animés

Cette procédure a fonctionné pour MasterFlex et ProfKrapu.

### Source

- choisir un portrait neutre validé comme source maître unique ;
- conserver le même angle, la même taille de tête, les mêmes épaules, le même costume et la même
  lumière ;
- travailler en grande définition, puis exporter en `640 x 640`.

### États

Produire séparément :

1. `neutral`
2. `fear`
3. `disgust`
4. `sad`
5. `confident`
6. `joy`

Chaque génération ne doit modifier que les yeux, sourcils, bouche, museau ou bas du visage.

### Sortie

- `640 x 640`, PNG alpha ;
- même bbox alpha ;
- même position du visage ;
- même silhouette, costume et accessoires ;
- une planche contact et un contrôle de transition avant remplacement des assets actifs.

Outil :

`scripts/build-identity-state-pack.py`

## Procédure B — Visuel Canon En Pied

### Références Obligatoires

Utiliser trois rôles de référence explicites :

1. **Portrait validé** : autorité absolue pour le visage, l’âge, la DA et l’identité.
2. **Ancien canon ou brief costume** : vêtements, accessoires et fonction du personnage uniquement.
3. **Canon MasterFlex** : cadrage, occupation verticale et présence dans le canvas uniquement.

Ne jamais laisser une ancienne version malade, vieillie ou trop réaliste reprendre l’autorité sur
le visage.

### Prompt De Production

Le prompt doit verrouiller :

- même visage que le portrait ;
- âge apparent et énergie ;
- style cartoon exact ;
- costume complet ;
- pose lisible ;
- personnage entier, chaussures comprises ;
- petite marge de sécurité en haut et en bas ;
- aucun texte ni second personnage.

Les rôles des références doivent être écrits dans le prompt. Une référence sans rôle explicite
peut contaminer l’identité, l’âge, le costume ou les proportions.

### Preset MasterFlow

- source : verticale haute définition ;
- livraison : `829 x 1500`, PNG alpha ;
- marge haute : `23 px` ;
- marge basse : `24 px` ;
- marge latérale minimale : `27 px` ;
- priorité : hauteur utile, puis largeur disponible ;
- masse visuelle centrée sur le canvas complet ;
- aucun membre, vêtement ou accessoire coupé.

La largeur dépend de la morphologie. Un humain fin ne doit pas être déformé pour occuper la largeur
d’un personnage massif.

Outil :

`scripts/normalize-canon-asset.py`

## Piège Chroma — Lunettes, Fioles Et Transparences

Le cas ProfKrapu a révélé un défaut important : un fond rose peut rester visible dans les verres de
lunettes ou dans un objet transparent. Ces zones sont enfermées par un contour ; un détourage
connecté aux bords ne peut donc pas les retirer.

### Hiérarchie De Production

1. **Final avec transparences complexes** : génération ou édition avec alpha natif, PNG, qualité
   moyenne ou haute, quand le modèle utilisé le permet.
2. **Final depuis une source opaque validée** : masque alpha ciblé ou détourage manuel, sans
   regénérer l’identité.
3. **Prototype rapide** : chroma adaptatif puis retrait connecté aux bords.

`gpt-image-2` ne gère pas actuellement le fond transparent natif. Le chroma reste donc nécessaire
avec ce modèle. Les modèles GPT Image compatibles avec `background: transparent` doivent être
privilégiés pour les canons finaux comportant lunettes, verre, fourrure ou éléments translucides.

### Règles

- ne jamais imposer une couleur chroma unique à tous les personas ;
- choisir le chroma le plus éloigné de la peau, des vêtements, des couleurs persona et des objets
  transparents présents dans l’image ;
- interdire le rose si le personnage contient liquide rose, lunettes teintées ou accents magenta ;
- interdire le vert si le personnage contient science verte, végétation, liquide vert ou accents
  teal ;
- interdire le bleu si le personnage contient denim, ombres bleues ou couleur persona bleue ;
- ne jamais considérer le détourage terminé après le seul retrait du fond extérieur ;
- inspecter systématiquement les lunettes, fioles, vitres, bijoux, trous entre les doigts et zones
  encerclées par du line-art ;
- ne pas appliquer un despill global agressif : il peut détruire les tons peau et créer des trous ;
- privilégier une correction ciblée des pixels chroma enfermés ;
- si la transparence complexe est importante, utiliser un détourage manuel ou une source alpha
  native lors de l’intégration finale ;
- ne pas intégrer un canon tant qu’un reflet chroma résiduel reste visible à taille réelle.

### Détourage Extérieur

Pour un fond uniforme et un personnage opaque :

`scripts/remove-connected-chroma.py`

Cet outil supprime uniquement le chroma relié aux bords. Il protège les couleurs internes, mais ne
remplace pas la passe de contrôle ciblée sur les zones transparentes.

### Contrôles Automatiques À Ajouter

Avant intégration finale, le pipeline doit pouvoir bloquer si :

- des pixels proches de la couleur chroma subsistent à l’intérieur de la bbox du personnage ;
- une zone opaque du neutre devient transparente après détourage ;
- l’alpha contient des trous nouveaux dans le visage, les mains ou les vêtements ;
- les dimensions, marges ou centre visuel sortent du preset ;
- le fichier final n’est pas en PNG RGBA.

Ces contrôles doivent produire un rapport court. La validation esthétique finale reste humaine.

## Ordre De Validation Rapide

1. Valider le personnage brut avant détourage.
2. Conserver la source générée dans `candidates/`.
3. Détourer sans modifier la source.
4. Contrôler uniquement les zones à risque : contour, lunettes, objets transparents, doigts.
5. Normaliser au preset MasterFlow.
6. Intégrer dans le prototype.
7. Laisser MALEX faire la validation visuelle finale.

Le navigateur automatisé n’est pas requis par défaut. Un build frontend et une vérification des
dimensions suffisent avant validation humaine, sauf bug d’intégration explicitement demandé.

## Références Techniques

- OpenAI Image Generation : choix de l’API, références multiples, édition et limites de cohérence.
- OpenAI Image Output : formats, qualité, tailles et support du fond transparent selon le modèle.
- Adobe Ultra Key : matte, tolérance, récupération des détails transparents et risques du spill.
- ImageMagick Alpha Compositing : alpha continu et antialiasing des contours.

## Critères De Livraison

- identité immédiatement reconnaissable ;
- rendu cohérent avec les portraits ;
- pas de vieillissement ou changement de morphologie non demandé ;
- aucun chroma résiduel ;
- dimensions et alpha conformes ;
- aucune correction CSS propre à un seul persona ;
- source, cutout et export final conservés séparément ;
- aucun remplacement canon, commit, push ou publication sans validation explicite.
