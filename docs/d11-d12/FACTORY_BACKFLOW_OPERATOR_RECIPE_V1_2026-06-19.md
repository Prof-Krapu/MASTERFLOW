# D11 — Recette opérateur Factory Backflow

## But

Vérifier le parcours complet avec un manifeste anonymisé : intake, quarantaine éventuelle,
validation, candidate update puis routage manuel. Aucun test ne doit installer une factory,
écrire le canon ou appeler un service externe.

## Parcours

1. Utiliser un compte `admin` ou `godmode`.
2. Envoyer `POST /api/v1/backflow/intake` avec un `factory_passport` et un
   `factory_backflow_export` JSON stricts.
3. Si passport/privacy/security/simulation manque, vérifier l'état `quarantined` puis utiliser
   `request_precision` : aucune approbation n'est possible.
4. Si le manifeste est complet, relire l'item `factory_backflow` dans la Validation Inbox et
   choisir `approve`, `park`, `reject` ou `archive`.
5. Après `approve`, lire `GET /api/v1/backflow/candidate-updates` : chaque élément reste
   `candidate_only` et `unrouted`.
6. Lire la recommandation : DA→D08, PROJECT_LORE→D09, PEDAGOGY→D05/D06 ; sans recommandation,
   ne pas router.
7. Pour un cas recommandé seulement, confirmer via
   `POST /api/v1/backflow/candidate-updates/:id/route` avec `target_domain`.

## Preuves attendues

- une route confirme `routed`, mais garde `candidate_only` ;
- une route non recommandée retourne un refus ;
- le nombre d'actions, jobs et candidates Usage Learning reste inchangé ;
- aucun ZIP, fichier, URL, provider, export ou déploiement n'est utilisé.

## Stop immédiat

Arrêter si le manifeste contient du contenu privé, si un domaine non recommandé semble requis,
ou si l'objectif est de modifier directement le canon ou le runtime. Ces cas demandent une
décision produit séparée.

## Clôture de périmètre D11 V1

Cette recette clôt D11 V1 : intake JSON strict, quarantaine, revue humaine,
candidate update, recommandation et routage manuel borné. Le résultat ne peut
être qu'un candidat routé ; il ne devient jamais canon, changement de process,
action, job, installation ou activation runtime.

Les imports de fichiers/ZIP/URL, les appels provider, l'installation de factory,
la promotion vers le canon et toute exécution externe ne sont pas des éléments
restants de D11 V1. Ils exigent un nouveau contrat produit, un preflight et une
validation explicite.
