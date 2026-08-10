# Design Preflight — TEACHING-001

Date : 2026-08-03
Statut : validé par GO MALEX
Surface : Teaching dans le runtime unique publié
Branche : `codex/teaching-001-empty-state`
PR : [#228](https://github.com/Prof-Krapu/MASTERFLOW/pull/228)

## Intention produit

Transformer l'état vide Teaching en parcours utile : créer une première classe, l'ouvrir, ajouter
ses étudiants, puis préparer son premier sujet sans exposer immédiatement tout l'atelier avancé.

## Contrat verrouillé

- réutiliser les endpoints cohortes et listes d'étudiants existants ;
- conserver l'isolation privée actuelle, y compris pour GodMode ;
- conserver Teaching absent pour l'étudiant ;
- ne créer aucun endpoint, schéma, rôle ou permission ;
- ne modifier ni asset, ni migration, ni déploiement.

## Parcours et permissions

| État | Professeur / GodMode | Étudiant |
|---|---|---|
| aucune classe | formulaire `Créer votre première classe` | Teaching absent |
| classe créée | classe active et action `Ajouter les étudiants` | Teaching absent |
| liste enregistrée | action `Préparer un sujet` ouvrant l'atelier à la demande | Teaching absent |

L'atelier avancé reste fermé par défaut. Les actions de correction, validation, export et envoi
conservent leurs verrous existants.

## Données et composants

- création : `POST /api/v1/cohorts` ;
- liste : `GET /api/v1/cohorts` ;
- étudiants versionnés : `POST /api/v1/cohorts/:id/roster-versions` ;
- présentation : `TeachingReadiness` dans `AdaptiveWorkspacePage` ;
- aucune fixture ou donnée produit ajoutée.

## Validation

- création réelle et ouverture immédiate avec professeur et GodMode ;
- ajout réel de deux étudiants avec le professeur ;
- Teaching absent pour l'étudiant ;
- atelier avancé fermé, puis ouvert depuis `Préparer un sujet` ;
- largeur 390 px sans débordement horizontal ;
- tests cohortes, backend complet, lints, build frontend et MASTERBUILD verts.

## Risque principal

Confondre le rôle GodMode avec un accès global aux classes privées. TEACHING-001 conserve
strictement l'isolation existante ; toute évolution de visibilité exige une décision séparée.

## Révision de composition — 2026-08-10

- la surface visible se limite à la navigation Teaching partagée : overview, classe et sujet ;
- les formulaires historiques, panneaux d'assistance et ateliers de correction ne sont plus rendus
  sous la page ; leurs workflows restent dans le code en attente de boutons contextuels dédiés ;
- aucun bouton de gestion inactif n'est exposé dans le runtime ;
- les étudiants du roster actif sont présentés comme les avatars Persona : portrait rond plus grand,
  nom dessous et couleur de statut sourcée ;
- chaque portrait est navigable et ouvre une fiche élève dans le même canvas, avec retour vers la
  classe et aucune donnée au-delà du roster, de la classe et de ses affectations ;
- la classe s’ouvre en vue globale ; le clic sur un sujet affecté filtre les étudiants dans le même
  canvas et le crayon ouvre la page Sujet, sans bascule involontaire ;
- la couleur du portrait décrit la santé pédagogique ; une cellule en bas à droite décrit séparément
  l’étape `à démarrer`, `en cours` ou `terminé` ;
- le Lab démontre les deux dimensions et une courbe d’évolution par sujet ; le runtime reste `Sans
  signal` et `Évolution non raccordée` faute de progression reliée à l’identité roster ;
- la galerie desktop affiche dix étudiants par rangée et l’en-tête de classe est réduit au nom,
  niveau, effectif et période ;
- aucun changement backend, endpoint, permission, migration ou donnée.

## Révision de l’overview — 2026-08-10

- cinq lignes de niveaux compactes occupent la zone principale gauche ;
- les sujets forment un rail droit avec sélection, ouverture, modification et création séparées ;
- sélectionner une classe met en évidence ses sujets et sélectionner un sujet met en évidence les
  classes affectées ; le chevron ou `Entrée` ouvre le détail ;
- l’affectation n’est proposée qu’après sélection explicite du couple classe/sujet ;
- création/import de classe et création de sujet restent visibles sans exposer les formulaires dans
  l’overview ;
- sur mobile, les sujets repassent sous les classes et ne restent pas en position fixe ;
- aucun changement backend, endpoint, permission, migration, asset ou donnée.
