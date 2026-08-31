# MasterFlow — Pedagogical Link Engine V1

Date : 2026-08-30
Statut : déployé en preview privée, non mergé dans `main`
Owner : `RESOURCE_ENGINE` avec `PEDAGOGY_ENGINE` et `SUBJECT_ENGINE`

## Décision produit

Le Link Engine n'est pas un nouveau moteur parallèle. Il consolide :

- Resource Truth pour le statut et l'anti-hallucination ;
- le registre pédagogique pour les notions, timecodes et usages ;
- le graphe pédagogique pour les relations ;
- le niveau académique comme cadre dynamique ;
- la décision professeur comme autorité finale.

Les fichiers `ROUTING_PEDAGO` et `ROUTING_EXEMPLES` sont des sources d'import. Ils ne sont jamais
lus pour répondre à une requête utilisateur. Le runtime interroge SQLite uniquement.

## Flux

```txt
source auditée
-> normalisation déterministe
-> hash et lot d'import
-> Resource Truth
-> profils / notions / liens / classifications en BDD
-> index FTS5
-> recherche BM25
-> reranking niveau + logiciel + statut
-> réponse courte, sourcée et explicable
```

## Données importées

- 49 vidéos pédagogiques validées ;
- 20 exemples historiques candidats ;
- 542 notions normalisées après rapprochement ;
- liens de prérequis, notions liées et ressources utiles ;
- timecodes conservés uniquement lorsqu'ils existent dans la source ;
- 2 exemples sans ID legacy reçoivent un ID stable dérivé du contenu.

Les liens cassés, collisions de notions et métadonnées manquantes restent visibles dans les reçus
d'import. Un import partiel n'est pas présenté comme propre.

## Niveaux dynamiques

Le niveau scolaire est distinct de :

- la difficulté technique ;
- le niveau de maîtrise observé ;
- l'étape d'apprentissage ;
- Bloom ;
- les prérequis.

Un cadre initial `higher_education_fr` contient `B1` à `B5`, mais ses niveaux et alias vivent en
BDD. D'autres établissements peuvent disposer de leur propre cadre sans modifier le code.

## Inférence et correction

Le classement automatique repose sur des alias explicites et conserve :

- la valeur source ;
- le niveau inféré ;
- la confiance ;
- la méthode ;
- les preuves ;
- le hash de la source.

Une correction professeur :

- devient la valeur effective ;
- est journalisée avec sa raison ;
- n'altère pas la source ;
- survit aux imports suivants.

Si une future source propose un autre classement, MasterFlow conserve l'override et passe l'entrée
en `needs_review`. Il ne déduit jamais silencieusement que le professeur avait tort.

## Recherche

La V1 utilise SQLite FTS5/BM25, puis un reranking déterministe :

- correspondance notionnelle ;
- statut validé ;
- compatibilité de niveau ;
- logiciel ;
- disponibilité d'un timecode.

Chaque résultat expose `why`, `source_ref`, notions correspondantes et timecodes réels. Les
ressources candidates restent invisibles aux étudiants et ne sont accessibles qu'aux rôles autorisés.

## Surface Teaching

Teaching dispose d'un panneau progressif :

- recherche par besoin ou notion ;
- filtre de niveau ;
- explication courte ;
- notion et timecode ;
- revue des classements ;
- override professeur.

Le détail technique, les hashes et le graphe complet restent invisibles par défaut.

## Exclusions V1

- aucune clé API ni recherche vectorielle ;
- aucune ressource web ajoutée automatiquement ;
- aucun changement de note ou diagnostic étudiant ;
- aucune activation du parcours Ours d'Or ;
- aucune fusion `main`, stable ou ouverture publique ;
- aucune suppression des archives sources.

## Contrôles

- backend complet : 728 tests verts ;
- lint backend/frontend vert ;
- build frontend vert ;
- tests dédiés : import, FTS, permissions, inférence, override et changement de source ;
- release preview `23a81a715ac8312375d5c09efd6ccfebadd3235c` ;
- smoke privé vert : deux comptes godmode, source/raison/timecode, candidats masqués et anonyme 401 ;
- sauvegarde `masterflow-20260830T190143Z` restaurée séparément avec intégrité SQLite `ok`.
