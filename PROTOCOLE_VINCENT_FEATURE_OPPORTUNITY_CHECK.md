# PROTOCOLE — Check features Vincent avant implementation

Statut : `COORDINATION BACKEND / DECISION MALEX / 2026-06-13`

## Decision

Vincent ne doit pas etre oblige de checker directement le Drive canon a chaque sujet.

Le principe correct est :

```text
Codex/MALEX embarque le canon utile dans Git
Vincent checke Git + ses propres features/projets/PRs
Vincent signale les trous ou opportunites
Codex/MALEX importe le canon manquant si necessaire
```

Objectif : ne rien perdre du canon, mais aussi ne rien perdre des features deja creees cote
Vincent.

## Sources Git a lire avant arbitrage

Avant de proposer ou coder une feature, le systeme Vincent doit checker :

- `CLAUDE.md` ;
- `SUIVI.md` ;
- `SYNC_THREAD_MALEX_VINCENT.md` ;
- `INBOX_VINCENT.md` ;
- `PLAN_PRS_FONDATIONS_MASTERFLOW.md` ;
- les specs/checklists/handoffs PR concernes ;
- `AUDIT_ABSORPTION_PILOTE_3PROJETS.md` ;
- `SPEC_PR_PRIORITAIRES.md` ;
- `MATRICE_FEATURES_VS_FONDATIONS_MASTERFLOW.md`.

## Sources Vincent a checker

Vincent doit aussi scanner ses propres sources de features :

- projets deja crees ;
- workflows existants ;
- branches/commits/PRs locales ou distantes ;
- rapports d'audit internes ;
- routes/endpoints deja codes ;
- tables/services/jobs existants ;
- UI/admin drawers/prototypes ;
- tests existants.

Le but est de detecter :

- feature deja faite et compatible ;
- feature utile a absorber ;
- feature incompatible a quarantiner ;
- concept deja couvert dans MasterFlow ;
- opportunite d'amelioration backend simple ;
- doublon potentiel.

## Quand le Drive canon intervient

Le Drive canon n'est pas la charge par defaut de Vincent.

Il intervient si :

- une reference canon manque dans Git ;
- une spec Git semble trop pauvre ou contradictoire ;
- un sujet produit important n'a pas ete embarque ;
- MALEX/Codex demande explicitement un check canon ;
- Vincent detecte un doute et demande l'import du canon correspondant.

Dans ce cas, Codex/MALEX doit importer dans Git les references utiles ou fournir un handoff court.

## Mapping obligatoire par feature

Chaque feature candidate doit etre mappee vers :

```text
source Vincent
source Git/canon embarque
owner MasterFlow
engine
contrats/specs
tables/donnees
endpoints
permissions
preflight/validation
UI surface
tests
statut absorption
risques
PR courte proposee
```

Statuts absorption :

```text
KEEP_AS_IS
ABSORB_AND_ADAPT
ADD_MISSING_CAPABILITY
IMPROVE_EXISTING_OWNER
SKIP_OR_QUARANTINE
NEEDS_CANON_IMPORT
```

## Sortie attendue

Vincent doit repondre avec :

- matrice des features trouvees ;
- opportunites a forte valeur/faible risque ;
- incompatibilites ;
- doublons detectes ;
- besoins de canon manquant a importer dans Git ;
- plan de PRs courtes.

## Interdits

- coder une feature non mappee ;
- supposer que l'absence dans Git veut dire absence canon ;
- supposer que le canon Drive doit etre lu directement par Vincent a chaque fois ;
- reimplementer une feature Vincent utile sans verifier si elle existe deja ;
- bypasser permissions/preflight/validation au nom d'une absorption rapide.

