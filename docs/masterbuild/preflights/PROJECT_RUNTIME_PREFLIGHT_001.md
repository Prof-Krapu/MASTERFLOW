# Design Preflight — PROJECT-001

Date : 2026-08-03
Statut : validé par GO MALEX
Surface : Project dans le runtime unique publié
Branche : `codex/project-001-runtime-empty-state`
PR : [#227](https://github.com/Prof-Krapu/MASTERFLOW/pull/227)

## Intention produit

Transformer l'état vide Project en point de départ utile. Un GodMode ou un professeur sans projet
doit pouvoir créer son premier projet, le voir apparaître puis l'ouvrir immédiatement.

## Contrat verrouillé

- réutiliser `POST /api/v1/projects` et les permissions existantes ;
- ne créer aucun endpoint, schéma, rôle ou pouvoir supplémentaire ;
- conserver Project absent pour l'étudiant sans affectation ;
- ne modifier ni asset, ni migration, ni déploiement ;
- remplacer les états techniques par des libellés compréhensibles.

## États et permissions

| Rôle | État vide | Après création | Hors permission |
|---|---|---|---|
| GodMode | formulaire `Créer votre premier projet` | liste rafraîchie et projet ouvert | sans objet |
| Professeur | même capacité via le contrat backend existant | propriétaire du projet créé | sans objet |
| Étudiant sans affectation | Project absent de la navigation | aucun changement | aucune action exposée |

États explicites : chargement, création, prêt, partage, synchronisé et indisponible. Le bouton de
création reste désactivé sans nom ou pendant la requête.

## Données et composants

- entrée : `CreateProjectRequest { name }` depuis `packages/shared` ;
- sortie : `Project` existant ;
- rafraîchissement : `GET /api/v1/projects` ;
- présentation : `AdaptiveWorkspacePage` et composants Project déjà publiés ;
- aucune fixture produit ajoutée.

## Validation attendue

- création réelle GodMode et professeur ;
- ouverture immédiate du projet créé ;
- Project absent pour l'étudiant sans affectation ;
- aucun débordement à 390 px ;
- tests Project, lints, build frontend et contrôles MASTERBUILD verts.

## Risque principal

Faire de Project un back-office ou élargir les permissions. La tranche reste volontairement bornée
à la première création ; membres, ressources et besoins avancés conservent leurs contrats existants.
