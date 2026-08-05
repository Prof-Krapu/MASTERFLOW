# Design Preflight — Project V2 situation vivante

Date : 2026-08-05  
Round : `UI-FOUNDATIONS-RECOVERY-001`  
Lot : `UFR-003`  
Artefact : `page.project`  
Composant : `project-workspace-v2`  
Bible : `docs/ui/MASTERFLOW_UI_BIBLE_V1.md` v1.0.0

## Intention utilisateur

Comprendre en moins de dix secondes quel projet est actif, ce qui est réellement disponible et
quelle action permet de reprendre le travail. Project reste un hub de contexte ; ce n'est pas un
gestionnaire de tâches inventé.

## Valeur immédiate

- nom, rôle projet, confidentialité et dernière mise à jour ;
- situation `Maintenant` et une action principale réelle ;
- checkpoint du même projet uniquement lorsqu'il existe ;
- ressources validées avec leur provenance ;
- taille de l'équipe et répartition des rôles sans identifiant technique.

## Données et sources de vérité

| Élément visible | Source runtime | Règle |
|---|---|---|
| Projet actif | `GET /api/v1/projects` | aucune fixture dans le prototype assemblé |
| Membres et rôles | `GET /api/v1/projects/:id/members` | afficher des agrégats, pas les identifiants |
| Matière du projet | `GET /api/v1/projects/:id/resources` | ressources `validated` uniquement, ordre backend récent d'abord |
| Reprise | dernier `RoomCheckpoint` chargé | seulement si `project_id` et `active_mode=project` correspondent |
| Création | `POST /api/v1/projects` | GodMode ou professeur selon permission existante |
| Ajout de source | endpoint projet existant | uniquement rôle projet autorisé et projet actif |

## Priorité de l'action principale

1. aucun projet et création autorisée : `Créer le projet` ;
2. projet actif sans source et source validée disponible : `Ajouter la source` ;
3. projet avec ressource ouvrable : `Ouvrir la dernière source` ;
4. lecture seule avec ressources : `Consulter les ressources` ;
5. aucune action métier possible : `Retour à Home`.

Une seule action principale est rendue. Le rail commun peut présenter jusqu'à trois actions
contextuelles filtrées par le runtime ; le Dock ne les duplique pas.

## Permissions

- GodMode et professeur : création selon la permission runtime existante ;
- owner, admin ou editor projet : ajout d'une ressource validée ;
- participant ou viewer : lecture seule ;
- étudiant sans affectation : Project absent du loadout et refus explicite en accès direct ;
- projet archivé : lecture seule explicite ;
- aucun élargissement de permission et aucun nouveau contrat backend.

## États obligatoires

| État | Projection Project V2 |
|---|---|
| chargement | situation nommée, action désactivée |
| vide | création si autorisée |
| partiel | projet sans ressource, limite expliquée |
| prêt | situation, ressource et équipe visibles |
| erreur | message humain issu de l'orchestrateur |
| interdit | retour Home, aucun pouvoir simulé |
| lecture seule | contenu consultable, mutation absente |
| futur | aucune tâche, échéance ou progression inventée |
| session expirée | géré par l'orchestrateur avant rendu Project |

## Scénarios Component Lab

- `project.godmode-empty` ;
- `project.teacher-ready` ;
- `project.student-assigned` ;
- `project.student-forbidden` ;
- `project.archived-read-only` ;
- `project.mobile-390`.

Les fixtures sont locales, sans backend, sans donnée privée et ne modifient aucune permission.

## Responsive et accessibilité

- desktop : situation puis matière et synthèse équipe ;
- mobile : une colonne, sélecteur puis situation, action, reprise, ressources et équipe ;
- aucune largeur horizontale à 390 px ;
- labels natifs, focus partagé visible, statuts annoncés et cibles principales de 44 px minimum ;
- aucun code couleur seul pour distinguer prêt, archivé, erreur ou interdit.

## Exclusions verrouillées

Aucune tâche, milestone, échéance, livrable ou progression sans source runtime. Aucun backend,
Inventory, asset, migration, provider, dépense, commit, push, PR, merge ou déploiement.

## Promotion

Pipeline du GO courant : `Lab → Prototype assemblé → vérification locale`. La promotion runtime
publiée reste bloquée jusqu'à validation MALEX, smoke permissions Vincent et GO Git distinct.
