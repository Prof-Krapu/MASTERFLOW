# D08 — Audit de cohérence Canon↔Runtime

Date : 2026-06-27 · HEAD : `65d518a` · Base canon vérifiée : Drive MASTERFLOW

## 1. Matrice Canon↔Runtime

| État canon D08 (Drive) | Runtime GitHub | Écart | Gravité |
|---|---|---|---|
| manifest-first obligatoire | `visual_manifests` table + routes | OK | — |
| `visual_intent` → `room_context_card` | Context compiler présent | OK | — |
| `reference_status_board` | `visual_references` CRUD, statuts `canon_strict`/`expression_only`/`outfit_only`/`world_style`/`poster_energy`/`filter_reference`/`output_template`/`anti_pattern`/`rejected` | Partiel : pas de board UI, backends OK | faible |
| `da_resolution` | champ `da_root_ref` + `active_layers_json` dans le manifest | Absent : pas de gate runtime qui vérifie la résolution DA avant generation | **moyen** |
| `output_readiness` | `action_ready_report()` lit les champs manquants | OK (read-only, technique) | — |
| `action_ready_preflight` | Non implémenté | **Absent** : pas de preflight endpoint D08 dans le registre | **élevé** |
| `provider_handoff_candidate` | Non implémenté | **Absent** : la generation va direct de `action_ready_preview` vers le job | **élevé** |
| `generated_asset_candidate` | `generated_assets` table, routes `POST/GET /da/assets` | Présent dans le registre comme `live` mais les gates D08 ne sont pas appliquées | **critique** |
| `post_generation_da_report` | `evaluatePostGenerationGates()` dans `story_da_bridge.ts` | Implémenté mais uniquement via le bridge narrative, pas via visual_manifests | moyen |
| `validation_inbox` D08 | Route `POST /visual-manifests/:id/submit-review` + `syncValidationInboxItemForVisualManifest` | OK | — |
| `candidate_delta_or_no_canonization` | Non implémenté | **Absent** | moyen |
| `approved` / `rejected` statuts | Écrits en dur dans `approveVisualManifest`/`rejectVisualManifest` | **CHECK constraint violée** : `approved`/`rejected` ne sont pas dans la CHECK constraint de la table (p.904-907) | **CRITIQUE** |

## 2. Problèmes critiques

### C1. `approved`/`rejected` crash SQLite

- **Fichier** : `apps/backend/src/services/visual_manifests.ts:161,174`
- **Code** : `getDb().prepare('UPDATE visual_manifests SET status=?, updated_at=? WHERE id=?').run('approved', now, id);`
- **CHECK constraint** (schema.ts:904-907) : ne liste que `draft`, `references_to_classify`, `da_to_resolve`, `readiness_blocked`, `action_ready_preview`, `generation_blocked_tech_pending`, `parked`
- **Impact** : Tout appel à `POST /visual-manifests/:id/approve` ou `reject` lève une `SQLITE_CONSTRAINT_CHECK`
- **Racine** : `approveVisualManifest` et `rejectVisualManifest` écrivent `'approved'` et `'rejected'` — mais ni `VisualManifestStatusSchema` (shared) ni la CHECK constraint SQLite n'autorisent ces valeurs. Les statuts valides sont : `draft`, `references_to_classify`, `da_to_resolve`, `readiness_blocked`, `action_ready_preview`, `generation_blocked_tech_pending`, `parked`.

### C2. `POST /narrative/nodes/:id/generate-visual` bypass total du cycle d'action D08

- **Fichier** : `apps/backend/src/routers/narrative_runtime.ts:94`
- **Mécanisme** : Appelle `compileSceneVisualContext()` qui crée un manifest + `executeSceneVisualGeneration()` qui crée un job image
- **Contournement** : Aucun preflight, aucune validation inbox, aucune vérification action_ready. Le manifest passe directement en `action_ready_preview`
- **Statut registre** : L'action n'est pas listée dans `action_registry_seed.v1.json`
- **Impact** : Un teacher peut générer une image sans passer par les gates D08

### C3. `compile_da_context` dans le registre comme `future` mais implémenté

- **Fichier** : `seeds/action_registry_seed.v1.json:86` → `"status": "future"`
- **Réalité** : `compileSceneVisualContext()` est appelé par la route `POST /narrative/nodes/:id/generate-visual`
- **Incohérence** : Le registre dit `future` (UI ne doit rien montrer), mais le endpoint backend existe et fonctionne
- **Impact** : Silence du registre = UI ne peut pas décorrêler ce qui est réel

### C4. `generated_assets` CRUD exposé sans gate D08

- **Registre** : `store_generated_asset` (`POST /da/assets`), `review_generated_asset` (`POST /da/assets/{id}/review`), `view_generated_assets` (`GET /da/assets`) sont tous `live`
- **Problème** : Aucun de ces endpoints ne vérifie que l'asset a transité par le cycle D08 (manifest → review → generation)
- **Impact** : N'importe quel teacher peut créer des `generated_assets` en dehors de tout manifest

## 3. Problèmes moyens

### M1. `da_resolution` absente du runtime

- Le canon prévoit une étape `da_resolution` avant `action_ready_preflight`
- Le champ `da_root_ref` + `active_layers_json` existe dans la table mais n'est jamais vérifié par un gate avant generation (sauf dans le rapport read-only)
- `story_da_bridge.ts` écrit `action_ready_preview` même si `reference_ids` est vide et `da_root_ref` null

### M2. `action_ready_preflight` absent

- Aucun endpoint `/actions/visual-manifest/{id}/preflight` implémenté
- Le registre mentionne `preflight_image_action` (`POST /assets/image/preflight`) comme `future`
- La route narrative bypass complètement ce gate

### M3. `provider_handoff_candidate` absent

- Le canon prévoit un état de handoff explicite avant provider
- `executeSceneVisualGeneration()` crée le job directement sans cet état intermédiaire

## 4. Plan de patch recommandé (documentation uniquement)

### Vague 1 — Critique (à faire avant toute utilisation D08)

| Patch | Fichier | Solution |
|---|---|---|
| P1 | `schema.ts` + `visual_manifests.ts` | Ajouter `approved` et `rejected` à la CHECK constraint, ou changer le cycle pour utiliser des statuts existants |
| P2 | `narrative_runtime.ts` | Soit retirer la route, soit ajouter un gate action_ready + validation inbox obligatoire avant generation |
| P3 | `action_registry_seed.v1.json` | Aligner `compile_da_context` sur le réel : soit `live` si le endpoint est maintenu, soit `out_of_scope` avec documentation |
| P4 | `generated_assets` routes | Ajouter une vérification que l'asset provient d'un manifest approuvé via `manifest_id` |

### Vague 2 — Gates manquants

| Patch | Description |
|---|---|
| P5 | Implémenter `action_ready_preflight` comme endpoint dédié qui vérifie da_root_ref, references, layers avant de débloquer |
| P6 | Ajouter un état `provider_handoff` dans le cycle du manifest |
| P7 | Rendre l'appel à `evaluatePostGenerationGates` obligatoire après chaque generation (pas seulement via le bridge narrative) |

### Vague 3 — Documentation

| Patch | Description |
|---|---|
| P8 | Mettre à jour `D08_LOCKED_MANIFEST_FIRST_SEQUENCE.md` avec les constats de ce audit |
| P9 | Mettre à jour `MASTERFLOW_CANON_SYNC_MATRIX.md` |
