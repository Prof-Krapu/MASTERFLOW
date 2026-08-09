# Round UI-PAGE-BY-PAGE-001

Statut : `active`

Étape : `1/8 — Orienter`

Propriétaire : MALEX

Base observable : `origin/main` au SHA `05af04f40d3fb91b1b0a326e5a5adf3cd4bf40b2`

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

Auditer Login sur le runtime publié, inscrire les findings et soumettre le contrat de correction à
MALEX. Ne modifier aucun code avant cette décision.

## Exclusions

Aucun lot transversal, backend, migration, asset, déploiement, suppression de branche ou absorption
automatique du candidat Inventory.
