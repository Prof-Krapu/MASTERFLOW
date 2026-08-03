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
