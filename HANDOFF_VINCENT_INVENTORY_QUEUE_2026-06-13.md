# Handoff Vincent — Queue Inventory backend

Date : 2026-06-13  
Branche : `codex/frontend-masterflow`  
Owner produit : MALEX  
Owner integration backend : Vincent

## But

Livrer une fondation Inventory conforme au canon Drive, sans OCR/vision reel, sans BGE/Qdrant
reel, sans disponibilite inventee et sans UI finale.

Sources canon relues :

- `04_ENGINES/INVENTORY_ENGINE.md`
- `04_ENGINES/COLLECTION_ENGINE.md`
- `04_ENGINES/SEMANTIC_RETRIEVAL_AND_CONTEXT_LINKING.md`
- `02_CONTRACTS/REFERENCE_INVENTORY_OCR_COLLECTION_GRAPH_CONTRACT.md`
- `02_CONTRACTS/PERSONAL_AND_PROJECT_INVENTORY_COLLECTION_REMINDER_CONTRACT.md`
- `02_CONTRACTS/USEFUL_CONTEXT_COMPILATION_AND_PERSISTENCE_CONTRACT.md`

## Chaine livree

```text
ocr_prepare needs_review
-> inventory candidate
-> validation humaine
-> collection/search/project need
-> projection RAG explicite
-> contexte Room sur signal explicite
-> diagnostics agreges
-> archive
-> projection et context packs stale
```

## Commits

| Couche | Commit |
|---|---|
| Inventory Core | `d181767` |
| OCR -> candidates | `c1e3486` |
| Inventory RAG | `3504dfc` |
| Collection Graph | `2368f83` |
| Search / Project Needs | `ecf54b2` |
| Room / Context bridge | `f97878d` |
| Diagnostics prives | `30df43f` |
| Recette end-to-end | `c3cf55a` |

Dependances transversales a conserver : `722dc6a` (contrat RAG) et les fondations contexte de la
branche. Ne pas cherry-pick une couche Inventory isolee sans ses dependances.

## Objets et surfaces

- tables : `inventory_items`, `inventory_collections`, `collection_matches`,
  `inventory_visibility`, `inventory_project_needs` ;
- API : `/inventory/items`, `/inventory/collections`, `/inventory/search`,
  `/inventory/project-needs`, `/inventory/ocr-candidates` ;
- projection : `POST /inventory/items/:id/rag-index` ;
- owner ops : `GET /diagnostics/inventory`, strictement `admin/godmode` ;
- contexte : references `inventory_item` / `inventory_collection` dans le context compiler T2.

## Invariants prouves

- OCR candidate n'est jamais une verite validee ;
- validation Inventory reste explicite ;
- inventaire personnel prive par defaut ;
- un membre projet ne voit que les objets valides et partages au projet ;
- outsider refuse, y compris s'il possede un role global eleve sans membership ;
- RAG reste derive, cite et invalidable ;
- aucun candidat Inventory n'entre dans RAG ou dans une trace de contexte ;
- stock n'est jamais presente comme disponibilite garantie ;
- absence de match reste `unknown` sauf declaration explicite d'inventaire complet ;
- doublons et collection matches restent consultatifs jusqu'a confirmation ;
- diagnostics owner ops n'exposent ni label, ni owner, ni ID metier.

## Recette

`apps/backend/tests/inventory_end_to_end.test.ts` traverse le workflow complet et verifie :

- preflight/consentement OCR ;
- sortie `needs_review` ;
- isolation candidat ;
- validation + indexation ;
- recherche membre ;
- contexte Room + citation RAG ;
- refus outsider ;
- archive + stale ;
- retrait des recherches/contextes ;
- traces d'audit structurantes.

Etat au handoff :

- backend : **251/251** ;
- TypeScript backend/frontend : OK ;
- build frontend : OK ;
- `git diff --check` : OK.

## Action Vincent

1. Relire cette branche et comparer avec tes runners OCR/BGE et tes features historiques.
2. Reutiliser les tables, permissions, jobs, projections et filtres existants.
3. Mapper toute sortie OCR reelle vers `/inventory/ocr-candidates`.
4. Faire consommer a BGE/Qdrant les `rag_resources` Inventory valides et les filtres du context pack.
5. Conserver le lexical comme fallback et le RAG comme couche derivee.
6. Lancer la recette E2E avec tes runners branches.
7. Integrer sur `main` seulement apres revue des collisions.

## Hors scope volontaire

- OCR/vision reel ;
- embeddings BGE et stockage Qdrant reels ;
- mouvements, reservations et disponibilite temps reel ;
- estimation/prix automatiques ;
- rappels et maintenance ;
- inventaire diegetique MasterStory ;
- UI Inventory finale ;
- merge ou deploiement production.
