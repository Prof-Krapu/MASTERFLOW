# Round SERVER-FIRST-OPERATIONS-001

Statut : `active`

Étape : `7/8 — Publier`

Propriétaire : MALEX

Autorisation de transition : `AUTH-SERVER-FIRST-TRANSITION-2026-08-31`

## Intention produit

Faire de la preview privée réellement active la preuve de ce que MasterFlow sait faire, tout en
conservant un atelier local rapide et une chaîne de release sûre sans dépendre de GitHub.

## Contrat

- Partie concernée : gouvernance opérationnelle, pilotage, release et continuité.
- Ce qui change : serveur actif autoritaire, clone local candidat, GitHub en pause, preflight serveur
  obligatoire et manifeste exigé dès la prochaine release.
- Ce qui ne change pas : invariants produit, validation humaine, secrets, données privées, provider
  `mock`, absence de stable et interdiction de modifier une release active en place.
- Critère de succès : toute réponse distingue clairement serveur live, clone local et miroir
  historique ; les prochaines promotions passent par snapshot, backup, manifeste et rollback.
- Risque principal : perdre la reproductibilité en traitant le serveur comme un dossier éditable.
- Validation nécessaire : obtenue pour la dernière transition GitHub ; toujours requise séparément
  pour déploiement, migration, provider, suppression ou stable.

## Baseline

- serveur : Malex Graphics ;
- release active : `33f553fb8bbd` ;
- services : backend, frontend, export runner actifs ;
- health : vert ;
- clone / dernier miroir : `3d91c0a1ba0a89a11be1c7ad8343fab957b31f0a` avant la présente
  transition ;
- delta : interface pilotes validée dans le clone, non déployée ;
- manifeste embarqué : absent de la baseline, obligatoire pour la prochaine release.

## Gate courant

Fusionner une dernière fois cette doctrine de transition, puis mettre GitHub en pause. La suite
autorisée sans nouveau GO est locale et read-only : preflight serveur, développement, tests, build,
recette et préparation d'un snapshot. Toute mutation de Malex Graphics reste bloquée.
