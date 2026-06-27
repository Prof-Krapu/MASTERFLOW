# MasterFlow — Protocole de routage des demandes Factories

Date : 2026-06-27  
Statut : protocole documentaire Git  
Autorité : repo Git opérable  

## Objectif

Quand MALEX arrive avec une demande liée aux Factories, ne pas partir directement en build.

La première étape est de router la demande :

```txt
demande MALEX
-> nouvelle Factory ?
-> modification d'une Factory existante ?
-> retour utilisateur à extraire ?
-> conversation à transformer en besoin produit ?
-> primitive utile à récolter pour MasterFlow ?
-> risque / source truth / permission ?
-> action : extraction, audit, patch Factory, queue MasterFlow, ou rejet
```

## Principe clé

Une Factory est un bot/extraction autonome.

MasterFlow ne l'absorbe pas telle quelle.

MasterFlow peut seulement reprendre, après audit :

- un protocole de boot ;
- un verrou de périmètre ;
- un format d'extraction ;
- une logique de source truth ;
- une primitive Dataviz/UI ;
- une idée de mode candidat ;
- un pattern de conversation ;
- un retour d'usage robuste ;
- un garde-fou de sécurité ;
- un export structuré.

## Modes de demande

| Cas | Diagnostic | Action avant build |
|---|---|---|
| Nouvelle Factory | besoin pas encore représenté dans `FACTORIES/*/CURRENT` | créer d'abord une fiche besoin + protocole d'extraction |
| Modification Factory existante | une Factory active existe déjà | auditer `CURRENT`, vérifier archive, puis patch ciblé si validé |
| Retour utilisateur | feedback ou conversation terrain | produire une extraction inbox avant toute modification |
| Conversation longue | besoin encore flou | extraire vision produit, risques, sorties, questions |
| Besoin proche d'une Factory existante | risque de doublon | comparer aux Factories actives avant création |
| Primitive utile MasterFlow | pattern récurrent ou transversal | ajouter au registre de récolte, puis queue MasterFlow |
| Feature runtime sensible | provider, données, sécurité, live, argent | bloquer en audit/queue avant build |

## Séquence standard

### 1. Identifier la nature de la demande

Questions internes :

- Est-ce une nouvelle Factory ?
- Est-ce une amélioration d'une Factory existante ?
- Est-ce une extraction de conversation ?
- Est-ce un retour utilisateur ?
- Est-ce une primitive potentiellement utile à MasterFlow ?
- Est-ce une feature runtime Git ?
- Est-ce risqué : données privées, provider, sécurité, droits, live ?

### 2. Vérifier l'existant

Lire au minimum :

- `docs/source-truth/EXTERNAL_PRIMITIVE_HARVEST_REGISTRY_2026-06-27.md`
- `docs/factories/MASTERFLOW_FACTORY_TO_MODE_ARBITRATION_2026-06-27.md`
- la Factory active concernée si elle existe ;
- le dossier `ARCHIVE` correspondant si un patch est envisagé ;
- les docs D11 backflow si une réintégration est prévue.

### 3. Choisir le bon rail

| Rail | Quand l'utiliser | Sortie |
|---|---|---|
| `EXTRACTION_FIRST` | besoin flou, conversation, retour utilisateur | extraction inbox + questions |
| `AUDIT_EXISTING_FACTORY` | Factory déjà active | audit + plan de patch |
| `NEW_FACTORY_SPEC` | aucun équivalent existant | fiche produit + CDC Factory |
| `PATCH_FACTORY` | amélioration validée et bornée | archive + remplacement version active |
| `MASTERFLOW_PRIMITIVE_HARVEST` | pattern transversal intéressant | ligne registre + tâche queue |
| `RUNTIME_GIT_QUEUE` | doit devenir logiciel MasterFlow | spec/contrat/test, pas copie de Factory |
| `BLOCKED` | risque droit, secret, provider, live, données | blocage documenté |

### 4. Ne jamais sauter l'extraction quand le besoin est flou

Si MALEX apporte :

- une transcription ;
- un message d'un ami/client/étudiant ;
- un retour d'usage ;
- une idée encore orale ;
- une demande type “on va faire une facto” ;

alors la sortie attendue est d'abord :

```txt
besoin produit
-> usages
-> risques
-> sorties attendues
-> sources nécessaires
-> questions restantes
-> primitives MasterFlow candidates
-> décision recommandée
```

Puis seulement :

```txt
Factory spec
-> build
-> test boot
-> extraction/backflow
```

## Questions utiles à poser

Seulement si bloquant :

1. Est-ce une Factory autonome ou une future feature MasterFlow ?
2. Qui l'utilise et dans quel contexte ?
3. Quelles sources doivent faire vérité ?
4. Quelles sorties concrètes doivent être produites ?
5. Qu'est-ce qui serait dangereux si le bot invente ?

Si la réponse est évidente depuis les documents ou la conversation, ne pas demander : auditer et proposer.

## Contrat de création d'une nouvelle Factory

Avant build :

```yaml
factory_project:
  factory_id:
  cible:
  utilisateur:
  besoin:
  sources_de_verite:
  limites:
  sorties:
  boot_attendu:
  extraction_inbox:
  primitives_masterflow_candidates:
  risques:
  questions:
  decision:
```

## Contrat de patch d'une Factory existante

Avant patch :

```yaml
factory_patch:
  factory_id:
  version_active:
  archive_avant_patch: required
  probleme:
  changement:
  ne_pas_changer:
  fichiers_cibles:
  test_boot:
  zip_rebuild: required
  receipt_git: required
```

## Contrat de récolte MasterFlow

Quand une Factory révèle un truc utile pour MasterFlow :

```yaml
primitive_harvest:
  source_factory:
  primitive:
  type: boot | source_truth | dataviz | ui | extraction | safety | mode_candidate | export | conversation_pattern
  pourquoi_c_est_utile:
  deja_dans_git:
  cible_masterflow:
  risque:
  statut: already_in_git | primitive_candidate | runtime_gap | blocked | rejected
  prochaine_action:
```

## Règle de fin

Aucune demande Factory ne doit finir seulement par “fichier créé”.

Elle doit finir par un statut clair :

- nouvelle Factory créée ;
- Factory existante patchée ;
- extraction produite ;
- primitive récoltée ;
- runtime gap mis en queue ;
- rejet documenté ;
- blocage documenté.
