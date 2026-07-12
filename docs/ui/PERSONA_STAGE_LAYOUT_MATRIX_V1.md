# Persona Stage Layout Matrix V1

Statut : prototype Lab, pas encore canon runtime.

## Intention

MasterFlow ne doit pas utiliser tout l'espace desktop pour agrandir le clavier.
Quand la fenetre grandit, l'espace disponible sert aux personas, aux panneaux,
au board vivant et aux preuves contextuelles.

## Regle Principale

- Le clavier reste centre et lisible.
- Largeur standard cible : 560 a 680 px selon viewport.
- Largeur tunnel cible : jusqu'a 900 px.
- Les personas ne sont pas des avatars ronds dans ce contexte.
- Le persona lead agit comme une presence de scene, type plan americain/bassin,
  ancree bas gauche ou bas droite.
- Par defaut, le persona principal est a gauche.
- La droite reste disponible pour les autres personas, les panneaux, les preuves,
  les ressources ou les actions contextuelles.
- Le panneau droit explique ce que le systeme fait, voit ou propose.
- La bulle du persona est une reponse visible, pas un tooltip.
- La bulle utilise la couleur du persona pour identifier rapidement qui parle.
- La bulle doit etre placee plus haut et plus proche du centre que le personnage.
- La largeur courte est standardisee pour eviter les sautes de mise en page.
- Les etats peuvent changer la forme graphique de la bulle, pas son role.
- La bulle indique une parole active : si le clavier est ferme ou que le
  persona ne parle pas, elle disparait pour laisser l'interface respirer.
- Le tunnel n'est pas une simple bulle : c'est le passage en fil conversationnel
  focus, pour les reponses longues et les decisions guidees.

## Presets Lab

| Preset | Usage | Clavier | Persona gauche | Droite |
|---|---|---|---|---|
| Cockpit | usage normal desktop | stable | lead visible | board contextuel |
| Dialogue | echange court | stable | lead compact | interlocuteur compact |
| Board | explication de systeme | stable | lead presentateur | preuves / contexte |
| Tunnel | explication longue | confortable | lead plus grand | fil conversationnel |

## Mode Tunnel V3

Le tunnel est un seul systeme de conversation focus :

- mode normal : cockpit, reponse courte, interface qui oriente ;
- clavier ouvert : echange court possible avec le persona ;
- clavier ferme : pas de bulle persistante ;
- tunnel : fil de conversation long, type IA classique, au-dessus du cockpit ;
- historique : archive consultable, pas l'ecran principal.

Le tunnel n'est pas une nouvelle page produit. C'est la parenthese ou le persona
developpe vraiment, pose des questions, propose des choix et revient ensuite au
contexte exact.

Declencheurs V3 :

- raccourci T ;
- proposition persona : "Tu veux que je developpe ?";
- bouton Oui qui ouvre le tunnel ;
- bouton Non qui ferme la proposition ;
- Esc qui ferme le tunnel ou la proposition.

Comportement attendu :

- si le contexte est clair, T ouvre directement le tunnel sur ce sujet ;
- si le contexte est flou, le persona demande quoi developper ;
- dans le tunnel, les choix rapides sont privilegies : Oui / Non, voir les tutos,
  comparer, resumer, ouvrir une ressource ;
- hors tunnel, pas de fil conversationnel visible.

La conversation mobile permanente est une future couche separee. Elle ne doit
pas etre confondue avec le tunnel V3.

## Responsive

### Mobile

- Le tunnel reste un overlay conversationnel focus.
- Le personnage peut etre masque si l'espace est trop court.
- Le deuxieme persona est masque par defaut.
- Le clavier garde la largeur ecran utile.
- Le board passe avant la decoration.

### Desktop large

- Le centre reste le centre de commande.
- Les cotes deviennent utiles.
- Les panneaux peuvent apparaitre a droite sans deplacer le clavier.

## Contraintes Assets

- Les assets stage doivent etre transparents.
- Les variantes gauche/droite seront generees comme assets propres apres validation.
- Le miroir CSS reste accepte uniquement en placeholder Lab.
- Les proportions doivent rester comparables entre personas.

## Controle Humain

MALEX valide :

- presence du persona ;
- collision clavier/persona/panneaux ;
- lisibilite du clavier ;
- valeur pedagogique du board ;
- usage mobile.

## A Ne Pas Faire

- Agrandir le clavier jusqu'aux bords sur desktop large.
- Utiliser les portraits ronds comme presence principale de scene.
- Placer les personas comme decoration sans fonction.
- Cacher les actions utiles derriere une mise en scene trop lourde.
- Afficher un fil conversationnel dans le cockpit normal.
