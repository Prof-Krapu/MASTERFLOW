# D11 — Factory Backflow Intake V6C

## Références canon

- Drive `05_UI_RUNTIME_CONTRACTS/D11_FACTORY_PASSPORT_BACKFLOW_CONTRACT.md`.
- Drive `03_DOMAINS/D11_FACTORIES_BACKFLOW/DOMAIN_CARD.md`.
- Shared Validation Inbox GitHub.

## Intention

Recevoir manuellement un retour de factory portable comme **candidat externe**,
sans le confondre avec un apprentissage natif, une installation de factory ou une
écriture dans le canon.

```txt
manifeste JSON -> quarantaine ou inbox -> revue owner -> statut candidat
```

Cette tranche implémente uniquement la frontière `backflow_inbox`. La simulation
et le passport doivent être attestés dans le manifeste ; MasterFlow ne les exécute
pas encore.

## Contrat runtime réel

- `POST /api/v1/backflow/intake` ; réservé `admin` et `godmode`.
- JSON strict uniquement : aucun ZIP, upload, fichier, URL externe ou fetch réseau.
- nouvel objet distinct : `factory_backflow_intakes` ; il ne réutilise pas
  `usage_learning_candidates`.
- projection dans la Shared Validation Inbox, uniquement admin/godmode.
- l'entrée complète est `candidate` puis `needs_review`.
- l'entrée incomplète est persistée comme `quarantined`, puis `blocked` dans l'inbox.
- une entrée en quarantaine refuse `approve` ; seul `request_precision`, `park`,
  `reject` ou `archive` est possible.
- une approbation classe le candidat, sans créer d'action, job, import de factory,
  activation runtime, mise à jour de process, écriture canon, déploiement ou effet externe.

## Préconditions contrôlées

Le passport doit déclarer l'identité/version, plateforme, mission, scope owner,
source manifest, capacités, routes, gates, cible backflow, classification privacy,
security preflight `passed` et simulation `passed`.

L'export doit déclarer son identité, la factory/version, session opaque, type,
résumé, candidats classifiés, nettoyage privé, source de vérité, validation humaine,
owner MasterFlow, actions bloquées et prochaine étape recommandée.

Les catégories autorisées sont : `SYSTEM`, `PERSONA`, `DA`, `PROJECT_LORE`,
`OUTPUT`, `PLATFORM`, `RESOURCE`, `PEDAGOGY`, `PRIVATE`.

## Hors périmètre explicite

- import d'un bundle/ZIP de factory ;
- traitement de fichier ou téléchargement d'URL ;
- installation de plateforme ;
- exécution de simulation ;
- transformation automatique en Usage Harvester ;
- promotion automatique vers le canon ou le runtime.

## Preuve

Tests ciblés : `factory_backflow_intake` + `validation_inbox` : 24/24.

La preuve complète et le SHA final sont ajoutés seulement après merge GitHub ;
le déploiement live reste inconnu sans `MASTERFLOW_RELEASE_SHA`.
