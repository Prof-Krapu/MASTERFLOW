# HOME RESUME HISTORY V2 — Design Preflight 001

## Intention produit

Permettre à la Home de reprendre la dernière activité utile réellement effectuée, sans rester
bloquée sur un ancien projet ni ouvrir un lien externe devenu invalide.

## Écart constaté

- la reprise V1 ne mémorisait que Project et ses ressources ;
- naviguer dans Teaching, Learn, Inventory ou MasterBuild ne la mettait pas à jour ;
- revenir sur Home ne réparait rien ;
- une ressource reprise ouvrait automatiquement son URL, même si elle était cassée.

## Contrat V2

- conserver les huit dernières activités utiles, de la plus récente à la plus ancienne ;
- couvrir Project, Teaching, Learn, Inventory et MasterBuild selon les permissions ;
- préciser les activités Project, classe, sujet et demande d'aide lorsqu'une cible réelle existe ;
- ne jamais enregistrer Home comme activité de reprise ;
- ignorer une surface interdite, un projet supprimé ou une entrée mal formée ;
- si une ressource a disparu mais que son projet existe, reprendre le projet ;
- sinon choisir l'activité valide suivante ;
- restaurer le contexte dans MasterFlow sans ouvrir automatiquement d'URL externe.

## Limites

- aucun changement backend, API, permission, migration ou asset ;
- l'ancien format Project V1 reste lisible pendant la transition ;
- la reprise d'une ressource sélectionne son contexte Project, puis laisse l'utilisateur décider de
  l'ouvrir.

## Preuves attendues

- test unitaire léger du classement, de la déduplication et de la limite à huit entrées ;
- lint et build frontend ;
- `masterbuild:doctor` ;
- vérification visuelle directe MALEX uniquement.
