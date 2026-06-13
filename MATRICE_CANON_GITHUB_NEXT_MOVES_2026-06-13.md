# Matrice canon Drive -> GitHub -> prochains mouvements

Date : 2026-06-13  
Regle : Drive MASTERFLOW = intention canon ; GitHub = deploiement technique et coordination.

## Lecture courte

Le GitHub contient deja une base backend solide. Le risque actuel n'est plus "il n'y a rien",
mais "chaque brique avance dans son coin". Les prochains mouvements doivent donc stabiliser les
contrats transversaux avant les verticales visibles.

| Canon Drive | GitHub actuel | Gap exploitable | Prochaine PR courte |
|---|---|---|---|
| Contexte progressif T0-T5 | `context_compiler`, loadout, checkpoints, memory cards + bridge Inventory | Revue Vincent + integration sur `main` | INV-INTEGRATION-1 |
| RAG derive cite | filtres transversaux, budgets, policies, provenance + projection Inventory | embeddings/retrieval reels sans changer le contrat | PR-RUNNER-1 |
| Resource Truth / Inventory | core, collections, recherche, besoins, diagnostics et recette E2E | mouvements, reservations et disponibilite fraiche restent absents | PR-STOCK-1 plus tard |
| OCR comme extraction candidate | job `ocr_prepare` -> candidates Inventory, validation explicite | brancher le runner OCR reel sur le contrat existant | PR-RUNNER-1 |
| Rooms comme surfaces contextualisees | references Inventory validees chargees sur signal explicite | consommation UI et activation progressive | PR-INVENTORY-UI-1 |
| MasterStory / canon narratif | seeds room/story et mode front | artifact registry, spoiler policy, narrative retrieval | PR-STORY-1 |
| Teamspaces et bridges | Project/Scope + memberships | objets de bridge explicites inter-projets | PR-BRIDGE-1 |
| UI finale | PoC admin/front + context card | ergonomie non finale ; ne doit pas porter la logique metier | PR-UI apres contrats |

## Ordre recommande

1. **INV-INTEGRATION-1** : Vincent relit le handoff Inventory et integre la branche sans
   reconstruire de contrats paralleles.
2. **PR-RUNNER-1** : raccorder OCR reel et BGE/Qdrant aux jobs/projections existants.
3. **PR-INVENTORY-UI-1** : construire la surface de validation/recherche sur les endpoints reels.
4. **PR-STORY-1** : registre d'artefacts MasterStory et inventaire diegetique separe.
5. **PR-BRIDGE-1** : bridges inter-projets explicites seulement apres les scopes locaux.
6. **PR-UI-1** : UI globale quand les verticales runtime sont stabilisees.

## Garde-fou

Tout ajout Git doit pouvoir repondre a ces questions :

- quelle source canon Drive justifie la brique ?
- quel objet GitHub est proprietaire de verite ?
- est-ce un stockage authoritative ou un index derive ?
- quelles permissions et scopes s'appliquent ?
- quelle validation humaine est requise ?
- quelle UI consomme la brique sans reinventer la logique ?
