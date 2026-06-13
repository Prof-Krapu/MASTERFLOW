# Clôture — Fondations MasterFlow PR-1 à PR-9

Statut : `CLOSURE / MALEX-CODEX / 2026-06-13`

## Résumé

Le plan fondations post-audit PR-1 à PR-9 est désormais cadré dans Git.

Deux niveaux doivent rester distincts :

1. **Packs/specs/recettes prêts** : les passes qui définissent le contrat, les gates, la recette et
   le périmètre avant code runtime complet.
2. **Backend livré** : les passes qui possèdent déjà contrats partagés, migrations, services,
   routes et tests.

Le point important : aucune fondation ne doit être présentée comme une capability live côté UI si
son moteur runtime réel n'est pas branché.

## État par passe

| Passe | Sujet | État |
|---|---|---|
| PR-1 | `autonomy_step1_shell` | pack/spec/recette prêts, exécution sensible interdite |
| PR-2 | `capability_registry_shell` | pack/spec prêt, registre à garder read-only/gated |
| PR-3 | `status_taxonomy` | pack/spec prêt, statuts normalisés côté doctrine |
| PR-4 | `project_scope_shell` | pack/spec prêt, à relier aux owners/scopes réels avant routes larges |
| PR-5 | `template_schema_registry` | pack/spec prêt, dépendant de scopes/templates validés |
| PR-6 | `guided_runtime_pr1` | pack/spec/recette prêts pour MOTH/CDC privé |
| PR-7 | `rag_capability_shell` | pack/spec/recette prêts, pas d'index massif ni RAG public |
| PR-8 | `jobs_shell` | backend livré et renforcé : jobs, events, runners internes, claim/lease/heartbeat/gates |
| PR-9 | `workflow_observability` | backend livré : events workflow, diagnostics admin+, agrégats et trace |

## Backend réellement livré autour de PR-8

PR-8 a été volontairement plus loin que le shell initial, car c'est le socle nécessaire pour
brancher les runners Vincent sans course concurrente ni bypass :

- `jobs` et `job_events` ;
- `ocr_prepare`, `correction_prepare`, `export_prepare` ;
- progression monotone ;
- cancel/retry ;
- finalisation runner-only : `needs_review`, `completed`, `failed` ;
- `claimNextJob` et `extendJobLease` ;
- `runner_heartbeats` ;
- heartbeat obligatoire avant claim ;
- gate `job_type -> runner_family`.

Ce durcissement reste interne : aucune route publique ne lance un runner brut.

## Backend réellement livré autour de PR-9

PR-9 ajoute l'observation des workflows :

- `WorkflowEvent` partagé ;
- table `workflow_events` ;
- `recordWorkflowEvent` interne ;
- `GET /diagnostics/workflows` admin/godmode ;
- `GET /diagnostics/workflows/:id` admin/godmode ;
- agrégats completion, blocked, failed, validations, p50/p95, coût/tokens nullable ;
- trace par workflow.

La table ne stocke pas de payload brut, message utilisateur, OCR, feedback ou export.

## Ce qui reste volontairement non live

- aucun runner OCR/correction/export réel branché par MALEX/Codex ;
- aucun upload public ;
- aucun RAG massif ;
- aucune publication/export automatique ;
- aucune note finale ;
- aucune UI finale fondée sur des objets fictifs ;
- aucun orchestrateur multi-famille ;
- aucun accès teacher/student aux diagnostics globaux.

## Prochaine décision recommandée

Avant de partir sur l'UI finale, choisir un seul axe :

1. **Raccord runner Vincent** : brancher un runner réel derrière PR-8, en commençant par OCR ou
   export, avec sortie `needs_review`.
2. **Guided Runtime MOTH/CDC privé** : implémenter le premier parcours utile pour Ours d'Or /
   cours / devis, sans accès public large.
3. **Project/Scope réel** : remplacer les restrictions conservatrices `teacher = owner` par des
   memberships/scopes explicites.

Recommandation : commencer par **Project/Scope réel** si l'objectif est de rendre les prochaines
verticales propres et multi-utilisateurs. Commencer par **runner OCR/export** si Vincent veut
prouver rapidement son intégration technique.

## Message à Vincent

Les fondations ne sont pas une invitation à brancher large.

Toute intégration doit indiquer :

- runner family ;
- job type ;
- preflight ;
- validation ;
- owner/scope ;
- payload refs only ;
- sortie `needs_review` si sensible ;
- workflow events sobres ;
- tests.

Pas de SQL direct dans `jobs`, `job_events`, `runner_heartbeats` ou `workflow_events`.
