# Boot / Process Activation — Audit de conformité

Date : 2026-06-27 · HEAD : `65d518a`

## 1. Périmètre audité

- `apps/backend/src/services/process_activation.ts` — diagnostiqueur de processus
- CLI.md / GLOBAL_AGENTS.md / TOKEN_ROUTING_POLICY.md — docs de pilotage
- `apps/backend/src/services/context.ts` — context compiler
- `apps/backend/src/engines/permission_runtime.ts` — permission engine

## 2. Constats

### P1. `process_activation.ts` est purement DIAGNOSTIC — ✅ CONFORME à sa spec

- Toutes les règles retournent un `ProcessActivationReadModel` avec `audit_trace: ['deterministic_registry_v1', 'no_persistence', 'no_execution']`
- Aucun effet de bord : pas de mutation DB, pas de création de job, pas d'appel LLM
- Le statut `diagnostic_only` empêche toute interprétation comme ordre d'exécution
- La règle D08 bloque bien `image_generation` et `provider_generation` (lignes 68-72)

### P2. Aucun pouvoir d'enforcement — ⚠️ DOCUMENTÉ, PAS UN BUG

- Le diagnostic ne bloque rien : c'est le routeur ou le middleware qui doit refuser l'action
- `process_activation` ne peut pas empêcher `POST /narrative/nodes/:id/generate-visual` de passer
- La documentation CLI.md et GLOBAL_AGENTS.md ne mentionne pas cette limitation

### P3. Gap de couverture sur la route narrative bypass

- La règle D08 croise sur le pattern `/image|visuel|da|retake|genere/`
- Mais `process_activation` n'est jamais appelée par la route narrative → le bypass n'est même pas diagnostiqué
- Le diagnostic est inutile si le routeur ne le consulte pas

### P4. Context compiler et runtime loadout — ✅ IMPLÉMENTÉS

- `apps/backend/src/services/runtime_loadout.ts` : `deriveUserRuntimeLoadout()` filtre actions/personas/modes/capacités
- `apps/backend/src/routers/context.ts` : `/context/current` retourne le loadout complet (l.200)
- `CLAUDE.md` dit que c'était "initiallement reporté" — le code montre le contraire (implémenté depuis `runtime_loadout.ts`)

## 3. Gaps

### G1. Aucun point de hook obligatoire

- `process_activation.ts` expose `diagnoseProcessActivation()` mais aucune route ne l'appelle obligatoirement
- Idéalement : middleware optionnel qui logge le diagnostic sans bloquer, puis version bloquante plus tard

### G2. `user_runtime_loadout` documenté comme "initialement reporté" dans `CLAUDE.md`

- `CLAUDE.md`: "Le `user_runtime_loadout`, initialement reporté, est désormais une fondation runtime minimale"
- `SUIVI.md` : contient des déclarations obsolètes sur le loadout étant V1+
- Le code montre que le loadout est fully implemented et intégré au context compiler

### G3. Les docs de pilotage (`CLAUDE.md`, `GLOBAL_AGENTS.md`) ne mentionnent pas les routes D08 bypass

- Aucune mention que `POST /narrative/nodes/:id/generate-visual` existe et contourne les gates
- Les agents (Big Pickle, Codex) ne savent pas qu'ils doivent éviter cette route

## 4. Recommandations

| Priorité | Action |
|---|---|
| P1 | Ajouter un middleware optionnel qui appelle `diagnoseProcessActivation` sur les routes sensibles et logge le résultat |
| P2 | Mettre à jour `CLAUDE.md` pour corriger le statut de `user_runtime_loadout` |
| P3 | Mettre à jour `SUIVI.md` pour refléter l'état réel du loadout |
| P4 | Documenter le bypass narratif D08 dans les docs de pilotage |

## Ce qui reste à vérifier

- **process_activation non testé** : le diagnostic n'a pas été exécuté contre un backend réel
- **Route narrative bypass** : la décision de garder ou retirer la route `POST /narrative/nodes/:id/generate-visual` est une décision produit, pas technique
- **Docs de pilotage** : vérifier si `GLOBAL_AGENTS.md` et `CLAUDE.md` doivent être mis à jour pour mentionner le bypass

## Correction post-revue Codex (2026-06-27)

Corrections appliquées après revue Codex de la tâche initiale :
- Chemin de `user_runtime_loadout.ts` → `runtime_loadout.ts` (fichier réel)
- Chemin de `services/context.ts` → `routers/context.ts` (le context compiler est dans le routeur)
- Ajout de la section "Ce qui reste à vérifier"
