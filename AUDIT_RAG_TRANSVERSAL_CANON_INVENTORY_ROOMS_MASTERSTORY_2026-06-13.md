# Audit RAG transversal — canon, Inventory, OCR, Rooms et MasterStory

Date : 2026-06-13  
Sources : canon Drive MASTERFLOW + Git `Prof-Krapu/MASTERFLOW`

## Conclusion

Le RAG doit devenir une couche transversale de chargement contextuel dans MasterFlow, pas une
application autonome ni une nouvelle autorité.

Doctrine cible :

```txt
source owner / Resource Truth / canon métier
-> permission et scope
-> OCR, parsing ou extraction candidate
-> validation propriétaire
-> index RAG dérivé
-> context pack cité, léger et temporaire
-> Room / App / persona consommateur
```

Le RAG retrouve et assemble. Il ne déclare ni ownership, ni inventaire réel, ni canon narratif,
ni état de Room.

## Sources canon principales

- `03_APPS/INVENTORY_APP_RUNTIME.md`
- `04_ENGINES/INVENTORY_ENGINE.md`
- `02_CONTRACTS/REFERENCE_INVENTORY_OCR_COLLECTION_GRAPH_CONTRACT.md`
- `02_CONTRACTS/MASTERINVENTORY_LIBRARIAN_FACTORY_AND_REFERENCE_DECK_CONTRACT.md`
- `03_APPS/MASTERSTORY_APP_RUNTIME.md`
- `03_APPS/NARRATIVE_MEMORY_GRAPH.md`
- `03_APPS/MEMORY_APP_RUNTIME.md`
- `02_CONTRACTS/ROOM_STATE_OVERLAY_AND_CHECKPOINT_CONTRACT.md`
- `03_APPS/MULTI_APP_CONTEXT_ROUTING.md`
- `07_UI/UI_CONTEXTUAL_SYSTEM.md`
- `11_DEPLOYMENT/UI_BACKEND_ROADMAP_V1/*`

## État Git réel

### Déjà disponible

- RAG permissionné : ressources, chunks, context packs, citations, query hashée, revoke/stale.
- Recherche lexicale bornée et point de raccord `rag_reindex`.
- Jobs OCR `ocr_prepare` pour copie pédagogique et référence morphologique.
- Project/Scope, membership et Resource Truth.
- `room_instances` avec zoom, surface active, densité et `widget_state`.
- Seeds capability/actions/rooms pour Inventory et MasterStory.
- Première exploitation RAG pour la coordination Git/inbox.

### Présent seulement comme promesse ou seed

- `inventory_ocr_review_panel`.
- action `POST /inventory/photo-scan`.
- Room `inventory`.
- Room `narrative`.
- `reader_mode_gate`.
- `collection_shelf`.
- `last_context_widget`.

### Manquant

- tables et services `inventory_items`, `inventory_collections`, `collection_matches`,
  `wishlist_items`, `inventory_visibility`;
- adapter OCR `inventory-reference-v1`;
- workflow OCR candidat -> validation ownership/wishlist/collection -> inventaire;
- indexation RAG des items/collections validés;
- checkpoints de Room et construction de context packs selon mode/zoom;
- registre des artefacts MasterStory;
- graphe mémoire narratif, présence scène, props et continuité;
- filtrage reader/author/spoiler dans le retrieval;
- chargement progressif MasterStory par artefact et niveau de zoom;
- UI réelle Inventory et MasterStory.

## Exploitation RAG recommandée

### Inventory / OCR

Le pipeline canon est :

```txt
photo
-> OCR/vision
-> candidats
-> résolution de collection et doublons
-> validation utilisateur
-> inventaire
-> index RAG
```

Le RAG peut ensuite :

- retrouver un item, une collection ou une référence;
- rapprocher un besoin projet des items disponibles ou manquants;
- proposer des doublons et correspondances à confirmer;
- alimenter devis, ressources pédagogiques et références DA;
- retrouver les sources produit/catalogue avec provenance.

Il ne doit jamais transformer directement un candidat OCR en objet possédé.

### Rooms

Chaque Room peut consommer un `room_context_pack` dérivé de :

- `room_checkpoint`;
- projet et permissions;
- surface et zoom actifs;
- ressources validées;
- décisions récentes et boucles ouvertes;
- artefacts métier utiles.

Le pack doit être léger, cité, temporaire et invalidé quand une source change. Une Room ne doit
pas charger tout l'historique ou tout le canon par défaut.

### MasterStory

Le RAG est adapté au chargement progressif canonique :

```txt
zoom actif
-> artefact local
-> liens proches
-> références canon utiles
-> recherche profonde seulement si nécessaire
```

Exemples :

- panorama : arcs, timeline macro, thèmes;
- scène : scene card, présence, objectif, lieu, personnages;
- dialogue : lignes proches, voix, sous-texte, tensions;
- prop : inventaire diégétique local et continuité.

Gates obligatoires :

- reader mode sans spoiler;
- séparation canon/draft/candidate;
- auteur requis avant écriture durable;
- RAG en lecture et citation, jamais en canonisation;
- inventaire narratif séparé de l'inventaire réel.

## Architecture cible

Ajouter un profil de retrieval explicite :

```yaml
rag_context_request:
  purpose: coordination | inventory | room_resume | narrative | pedagogy | resource_search
  owner_id:
  project_id:
  room_instance_id:
  active_app:
  zoom_level:
  entity_refs:
  allowed_statuses:
  spoiler_policy:
  limit:
```

Le backend résout les permissions et les filtres. Le frontend ne reconstruit pas le contexte.

## Plan de PRs courtes

### PR-RAG-1 — Contrat transversal

- ajouter `purpose`, filtres métier et métadonnées de provenance aux context packs;
- conserver compatibilité avec le contrat RAG actuel;
- tests de scope, stale, statut et fuite de métadonnées.

### PR-INV-1 — Inventory Core

- modèles/tables Inventory;
- ownership, scope personnel/projet, visibilité;
- CRUD candidat/validé minimal;
- aucun OCR ni UI complexe.

### PR-INV-2 — OCR vers candidats Inventory

- adapter `inventory-reference-v1`;
- job `ocr_prepare` compatible;
- résultats candidats avec confiance et source refs;
- validation humaine avant item/collection.

### PR-INV-3 — Inventory RAG

- indexer uniquement items/collections validés;
- recherche, doublons et matching projet;
- citations et provenance;
- revoke/stale quand l'item change.

### PR-ROOM-1 — Checkpoints et context packs

- `room_checkpoints`;
- reprise légère;
- construction du contexte selon surface/zoom;
- invalidation et observabilité.

### PR-STORY-1 — Artifact Registry

- story, arc, scene card, character dossier, breadcrumb, visual brief;
- statuts canon/draft/candidate;
- ownership et permissions auteur/lecteur.

### PR-STORY-2 — Narrative RAG

- retrieval par zoom;
- présence, props, continuité;
- spoiler policy;
- aucune écriture canon depuis le retrieval.

### PR-UI-1 — Surfaces

- Inventory OCR review;
- collection shelf;
- Room resume/context provenance;
- MasterStory passage summary et context widening;
- UI projetée depuis le runtime, sans logique métier locale.

### PR-RUNNER-1 — BGE/Qdrant

- seulement après validation des contrats précédents;
- filtrage permission/statut avant vector search;
- reranking puis citations;
- fallback lexical conservé.

## Priorité

Ordre recommandé :

```txt
PR-RAG-1
-> PR-INV-1
-> PR-INV-2
-> PR-INV-3
-> PR-ROOM-1
-> PR-STORY-1
-> PR-STORY-2
-> PR-UI-1
-> PR-RUNNER-1
```

La prochaine implémentation utile n'est donc pas une nouvelle UI : c'est le contrat RAG
transversal, puis le vrai Inventory Core qui donnera une destination fiable aux candidats OCR.
