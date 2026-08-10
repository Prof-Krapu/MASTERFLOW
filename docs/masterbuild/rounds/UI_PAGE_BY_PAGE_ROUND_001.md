# Round UI-PAGE-BY-PAGE-001

Statut : `active`

Étape : `6/8 — Vérifier`

Propriétaire : MALEX

Base observable : `origin/main` au SHA `2daea8c7e59f4c7472337318884472e57532ce73`

## Candidat actif — Teaching partagé entre Lab et runtime

- Home reste validée et ses modifications locales sont préservées ;
- le premier candidat Teaching runtime a été rejeté explicitement par MALEX ;
- son code et ses avatars de démonstration sont isolés dans une quarantaine récupérable hors du
  repo actif ; le runtime Teaching est revenu à la base publiée ;
- le Component Lab complet est restauré depuis les preuves Git historiques : Persona, navigation,
  système, Dock, états, overlays et Tunnel ;
- les fondations, Assets actifs, Project et Promotion récents sont intégrés au même `/ui-lab` ;
- Teaching utilise désormais le même composant dans le Lab et le runtime : cinq niveaux, classes
  iconographiques, sujets iconographiques et navigation progressive ;
- le Lab emploie des fixtures signalées ; le runtime projette les cohortes, rosters, sujets et
  affectations lisibles, sans inventer de météo ni d'import Pronote ;
- la Home Teaching runtime couvre le périmètre pédagogique global autorisé, pas seulement le projet
  sélectionné, afin de restituer réellement les cinq niveaux ;
- le logo du Lab reprend le tracé dynamique du Shell, sans utiliser le mark graff divergent ;
- aucun backend, API, migration, déploiement ni réimport d'asset candidat lourd n'est inclus.

## Intention produit

Reprendre l'interface dans l'ordre réel d'utilisation et valider une page entière avant de toucher
la suivante. Une implémentation mergée reste une base à auditer, jamais une validation visuelle par
défaut.

## Ordre verrouillé

1. Login
2. Home
3. Project
4. Teaching
5. Learn

Inventory reste hors de cette première séquence. Son candidat local est sauvegardé et isolé dans
`codex/inventory-ui-candidate-recovery` sans commit ni publication.

## Contrat de chaque page

Avant modification, produire un audit court couvrant :

- situation utilisateur et première action utile ;
- données réelles, permissions et états honnêtes ;
- clair, sombre et préférence système ;
- clavier, focus, messages et sortie ;
- desktop et largeur 390 px ;
- écarts par rapport à la Bible UI et décision MALEX.

Une correction commune du Shell, du Dock ou des tokens n'est ouverte que si un finding de la page
courante la justifie. Aucune page suivante n'est construite avant validation explicite de la page
courante.

## Situation de départ

- Login intégré au Shell et ouverture directe de Home : publié via PR #233, composition à auditer ;
- Home, Teaching et Learn : métier publié conservé, conformité à auditer ;
- Project V2 : base publiée via PR #233, conformité toujours bloquée ;
- Inventory : candidat séparé non committé ;
- aucun déploiement lié à cette reprise.

## Première action recommandée

Comparer Teaching dans `/ui-lab` et dans le runtime. Valider la composition partagée avant toute
déclaration de conformité ou passage à la page suivante.

## Exclusions

Aucun lot transversal, backend, migration, asset, déploiement, suppression de branche ou absorption
automatique du candidat Inventory.
