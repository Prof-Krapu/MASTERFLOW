# Design Preflight — avatars étudiants génériques

Date : 2026-08-10  
Round : `UI-PAGE-BY-PAGE-001`  
Lot : `UPP-006`  
Artefact : `component.student-avatar-fallback`  
Composant : `student-avatar-assets`  
Bible : `docs/ui/MASTERFLOW_UI_BIBLE_V1.md` v1.0.0

## Intention utilisateur

Donner une présence visuelle cohérente aux identités de roster tant que l'étudiant n'a pas créé son
compte et choisi son propre avatar, sans inventer son identité ni afficher une vignette vide.

## Contrat visuel

- deux silhouettes anonymes de type personnage non révélé de jeu vidéo ;
- sortie UI `640 × 640`, PNG RGBA, fond transparent et cadrage carré stable ;
- visage invisible, aucune émotion, origine ou caractéristique personnelle représentée ;
- contours orange MasterFlow et détails bleu/violet sobres ;
- variantes nommées A et B dans le code, jamais utilisées comme donnée de genre.

## Source et comportement

- source runtime : `RosterMember.student_identity_id` et `display_name` ;
- le choix A/B est déterministe depuis `student_identity_id`, uniquement pour éviter les sautes
  visuelles entre deux affichages ;
- l'image est décorative (`alt=""`) : le nom du roster reste l'identité accessible ;
- aucun endpoint, champ, permission ou inférence de genre ajouté ;
- l'avatar de compte remplacera ce fallback lorsque le contrat compte ↔ roster sera disponible.

## Surfaces

- Component Lab, onglet Assets : les deux fallbacks sont visibles et nommés ;
- Teaching, détail d'une classe : toutes les identités du roster actif utilisent ces fallbacks sous
  forme de portraits ronds inspirés du menu Persona, avec le nom placé dessous ;
- absence de roster : l'état vide existant reste affiché.

## États et responsive

- roster vide : aucune fausse identité ;
- roster présent : galerie fluide de portraits ronds et silhouettes provisoires ; les fixtures sont
  explicitement nommées `Exemples du prototype`, le runtime `Roster actif` ;
- fond et anneau du portrait : bleu `en avance`, vert `en bonne voie`, violet `fragile`, orange
  `attention`, rouge `en péril`, gris `sans signal` ;
- une cellule distincte en bas à droite du portrait indique l’étape de travail : `à démarrer`, `en
  cours`, `terminé` ou `inconnu` ; la fin d’un sujet ne remplace donc plus sa couleur de santé ;
- la vue de classe s’ouvre en synthèse globale, puis le clic sur un sujet recalcule les couleurs et
  cellules pour ce seul sujet sans quitter la classe ;
- la santé agrégée ou par sujet ne devient visible que si elle est sourcée ; le runtime reste gris
  et affiche une étape inconnue sans signal attribuable ;
- le clic ouvre une fiche dans le même canvas : portrait agrandi selon la composition Persona,
  classe, statut, sujets affectés et état du raccord compte ;
- le nombre annoncé par une classe doit toujours correspondre au nombre de portraits rendus ; les
  fixtures génèrent la totalité de leur effectif et le runtime suit le roster actif ;
- dans la classe, la galerie élèves occupe la colonne principale à gauche ; les sujets affectés
  restent dans un panneau compact à droite ; dix portraits tiennent sur une rangée desktop ;
- le clic sur un sujet filtre la classe ; son crayon ouvre la page Sujet séparée ; sous la liste,
  une courbe par sujet n’apparaît que lorsqu’un historique de progression existe ;
- la couleur de statut ne modifie jamais le nom : tous les noms utilisent le texte sémantique commun ;
- la même couleur de santé pilote le portrait, son anneau, le bandeau et les cartes de contexte ;
  la cellule d’étape conserve volontairement son propre code couleur ;
- thème clair/sombre/système : fond et bordure viennent des tokens de la page ;
- mobile : grille fluide sans largeur fixe ni scroll horizontal ;
- la vignette ouvre une projection partielle de fiche Étudiant ; les capacités non raccordées y sont
  signalées explicitement.

## Promotion

Les assets deviennent des fallbacks runtime actifs sur décision explicite MALEX. Ils ne deviennent
ni portraits personnels, ni données d'identité, ni assets de persona canon. La conformité visuelle
Teaching reste en attente de la revue directe MALEX.
