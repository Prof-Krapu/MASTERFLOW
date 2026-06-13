# Matrice canon Drive -> GitHub -> prochains mouvements

Date : 2026-06-13  
Regle : Drive MASTERFLOW = intention canon ; GitHub = deploiement technique et coordination.

## Lecture courte

Le GitHub contient deja une base backend solide. Le risque actuel n'est plus "il n'y a rien",
mais "chaque brique avance dans son coin". Les prochains mouvements doivent donc stabiliser les
contrats transversaux avant les verticales visibles.

| Canon Drive | GitHub actuel | Gap exploitable | Prochaine PR courte |
|---|---|---|---|
| Contexte progressif T0-T5 | `context_compiler`, `runtime_loadout`, checkpoints, memory cards sur branche Codex | Revue Vincent + merge propre ; bridges avances pas encore generalises | CTX-MERGE-1 |
| RAG derive cite | RAG lexical permissionne + coordination + champs purpose/tier | Filtres transversaux, budgets, policies, provenance applicative | PR-RAG-1 |
| Resource Truth | ressources validees + scopes projet | Inventory reel et candidats OCR non structures | PR-INV-1 |
| OCR comme extraction candidate | jobs OCR correction/morphologie | adapter Inventory et cycle candidat -> validation -> index | PR-INV-2 |
| Rooms comme surfaces contextualisees | room_instances + checkpoints | activation progressive, maturity, resume UI et bridges | PR-ROOM-1 |
| MasterStory / canon narratif | seeds room/story et mode front | artifact registry, spoiler policy, narrative retrieval | PR-STORY-1 |
| Teamspaces et bridges | Project/Scope + memberships | objets de bridge explicites inter-projets | PR-BRIDGE-1 |
| UI finale | PoC admin/front + context card | ergonomie non finale ; ne doit pas porter la logique metier | PR-UI apres contrats |

## Ordre recommande

1. **CTX-MERGE-1** : Vincent relit `875a790`, signale collisions, merge ou patch court.
2. **PR-RAG-1** : contrat transversal RAG avec filtres, budget, provenance, policies.
3. **PR-INV-1** : Inventory Core sans OCR complet.
4. **PR-INV-2** : OCR -> candidats Inventory.
5. **PR-ROOM-1** : checkpoints/context packs consommes par les Rooms.
6. **PR-STORY-1** : registre d'artefacts MasterStory.
7. **PR-RUNNER-1** : BGE/Qdrant comme runner derive, seulement apres contrats.
8. **PR-UI-1** : vraie UI quand le runtime est stable.

## Garde-fou

Tout ajout Git doit pouvoir repondre a ces questions :

- quelle source canon Drive justifie la brique ?
- quel objet GitHub est proprietaire de verite ?
- est-ce un stockage authoritative ou un index derive ?
- quelles permissions et scopes s'appliquent ?
- quelle validation humaine est requise ?
- quelle UI consomme la brique sans reinventer la logique ?
