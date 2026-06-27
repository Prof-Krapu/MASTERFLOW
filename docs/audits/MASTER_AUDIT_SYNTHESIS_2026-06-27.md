# MasterFlow — Synthèse d'audit D08/OCR/Boot/Factories

Date : 2026-06-27 · HEAD : `65d518a` · Branche : `main`

## Résumé exécutif

Cet audit couvre 4 domaines : D08 (génération visuelle), OCR/vision, boot/process activation, et D11 factories/backflow.

**Domaines sains** : OCR/vision, D11 factories/backflow — conformes aux invariants, aucune action corrective nécessaire.

**Domaines à corriger** : D08 (2 bugs critiques, 3 incohérences), Boot/process activation (gaps de couverture + documentation obsolète).

## Matrice des risques

| Domaine | Risque max | Nb critiques | Nb moyens | Nb faibles |
|---|---|---|---|---|
| D08 génération visuelle | **CRITIQUE** | 2 | 3 | 2 |
| OCR/vision | faible | 0 | 0 | 3 |
| Boot/process activation | moyen | 0 | 2 | 2 |
| D11 factories/backflow | **aucun** | 0 | 0 | 0 |

## Détail des problèmes critiques

### C1. `approved`/`rejected` crash SQLite (D08) — **BUG PROUVÉ**
- **Fichier** : `apps/backend/src/services/visual_manifests.ts:161,174`
- **Preuve** : `approveVisualManifest` écrit `status='approved'`, `rejectVisualManifest` écrit `status='rejected'`. Ni `VisualManifestStatusSchema` (shared) ni la CHECK constraint SQLite (schema.ts:904-907) n'autorisent ces valeurs. Appeler ces routes lève `SQLITE_CONSTRAINT_CHECK`.
- **Correction** : Ajouter `approved` et `rejected` à `VisualManifestStatusSchema` + CHECK constraint, ou changer le cycle pour utiliser des statuts existants

### C2. `POST /narrative/nodes/:id/generate-visual` bypass D08 — **BUG PROUVÉ**
- **Fichier** : `apps/backend/src/routers/narrative_runtime.ts:94`
- **Preuve** : La route appelle `compileSceneVisualContext()` + `executeSceneVisualGeneration()` sans preflight, validation inbox ou vérification action_ready. L'action n'est pas listée dans `action_registry_seed.v1.json`.
- **Correction** : Ajouter un gate action_ready + validation inbox obligatoire, ou retirer la route

### C3. `compile_da_context` marqué `future` mais implémenté — **INCOHÉRENCE PROBABLE**
- **Fichier** : `action_registry_seed.v1.json:86`
- **Preuve** : Le registre indique `status: 'future'` pour l'action `compile_da_context`. Le endpoint `POST /da/compile-context` n'existe pas comme route autonome. En revanche, `compileSceneVisualContext()` est appelé par la route narrative. Le statut `future` est donc correct pour la route autonome, mais ne couvre pas le bypass narratif.
- **Recommandation** : Clarifier si le statut `future` s'applique à la route `/da/compile-context` qui n'existe pas encore, ou si le bypass narratif doit aussi être traité.

## Problèmes moyens

### M1. `da_resolution` absente du runtime D08
- Le champ existe dans la table mais n'est jamais vérifié par un gate avant generation

### M2. `action_ready_preflight` absent
- Aucun endpoint preflight D08 implémenté

### M3. `provider_handoff_candidate` absent
- La generation va directement de `action_ready_preview` au job sans handoff

### M4. `process_activation.ts` sans hook obligatoire
- Aucune route n'appelle obligatoirement `diagnoseProcessActivation`
- Le bypass narratif n'est même pas diagnostiqué

### M5. Documentation obsolète dans `CLAUDE.md` et `SUIVI.md`
- `user_runtime_loadout` décrit comme reporté alors qu'il est implémenté

## Patch plan par vagues

| Vague | Patch | Fichier | Priorité |
|---|---|---|---|
| V1 | P1 : Ajouter `approved`/`rejected` à la CHECK constraint | `schema.ts` | 🔴 critique |
| V1 | P2 : Gater ou retirer `POST /narrative/nodes/:id/generate-visual` | `narrative_runtime.ts` | 🔴 critique |
| V1 | P3 : Aligner `compile_da_context` sur le réel | `action_registry_seed.v1.json` | 🔴 critique |
| V1 | P4 : Vérifier `manifest_id` dans les routes `generated_assets` | routes DA | 🔴 critique |
| V2 | P5 : Implémenter `action_ready_preflight` D08 | nouveau endpoint | 🟡 moyen |
| V2 | P6 : Ajouter état `provider_handoff` | `visual_manifests.ts` | 🟡 moyen |
| V2 | P7 : Rendre `evaluatePostGenerationGates` obligatoire | `story_da_bridge.ts` | 🟡 moyen |
| V2 | P8 : Middleware optionnel process_activation sur routes sensibles | nouveau middleware | 🟡 moyen |
| V3 | P9 : Mettre à jour `CLAUDE.md` et `SUIVI.md` | docs | 🟢 faible |
| V3 | P10 : Mettre à jour `MASTERFLOW_CANON_SYNC_MATRIX.md` | docs | 🟢 faible |

## Notes sur les vérifications

- `npm run lint` (tsc --noEmit) : **non exécuté** dans cette tâche (audit-only)
- `npm test` (vitest) : **non exécuté** dans cette tâche (audit-only)
- Les patches ci-dessus sont documentés uniquement — aucune application de code n'a été faite

## Ce qui reste à vérifier

- **Patch plan non validé** : les recommandations de patch n'ont pas été testées ni approuvées par Codex
- **Canon Drive non relu exhaustivement** : seuls les contrats listés en source_of_truth ont été vérifiés
- **OCR runner non exécuté** : le runner OCR n'a pas été lancé (pas de provider réel configuré)
- **Routes D11 backflow** : analysées en lecture seule, pas de test d'intégration réel
- **Action registry** : vérifier si d'autres actions ont un statut incohérent avec leur endpoint réel
- **Route `POST /narrative/nodes/:id/generate-visual`** : décision produit nécessaire (garder avec gates ou retirer?)

## Correction post-revue Codex

Ce rapport a été corrigé le 2026-06-27 après revue Codex de la tâche initiale (TASK-MASTERFLOW-D08-OCR-BOOT-COHERENCE-AUDIT-001). Corrections appliquées :
- Statuts `VisualManifestSchema` corrigés (ni `approved` ni `rejected` dans le schema)
- Statuts de référence visuelle corrigés (valeurs réelles du shared contract)
- Distinction claire entre bug prouvé, incohérence probable, recommandation
- Section "Ce qui reste à vérifier" ajoutée
- Fausses mentions de checks exécutés retirées
