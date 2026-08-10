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
- visage invisible, aucune émotion, origine, difficulté ou performance représentée ;
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
  forme de petites vignettes compactes ;
- absence de roster : l'état vide existant reste affiché.

## États et responsive

- roster vide : aucune fausse identité ;
- roster présent : grille compacte de noms et silhouettes provisoires ; les fixtures sont
  explicitement nommées `Exemples du prototype`, le runtime `Roster actif` ;
- thème clair/sombre/système : fond et bordure viennent des tokens de la page ;
- mobile : grille fluide sans largeur fixe ni scroll horizontal ;
- aucune vignette n'est cliquable tant que la fiche Étudiant n'est pas raccordée.

## Promotion

Les assets deviennent des fallbacks runtime actifs sur décision explicite MALEX. Ils ne deviennent
ni portraits personnels, ni données d'identité, ni assets de persona canon. La conformité visuelle
Teaching reste en attente de la revue directe MALEX.
