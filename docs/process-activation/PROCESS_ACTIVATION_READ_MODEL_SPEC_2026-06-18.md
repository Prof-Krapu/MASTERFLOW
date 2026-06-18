# Process Activation Read Model Spec — 2026-06-18

Status: `SPEC_ONLY_NO_RUNTIME`

## Intention produit

Donner à MasterFlow une lecture claire de ce qu'une demande utilisateur semble vouloir activer,
sans exécuter automatiquement un process.

Le but est de réduire le rôle caché de MALEX comme orchestrateur manuel :

```txt
intention utilisateur
-> process candidat
-> contexte nécessaire
-> gates nécessaires
-> prochaine action sûre
-> actions bloquées
```

## Principe de sécurité

Ce read model ne décide pas à la place du backend, du canon ou de MALEX.

Il affiche un diagnostic exploitable :

- ce que la demande semble vouloir faire ;
- ce qui est prêt ;
- ce qui manque ;
- ce qui doit rester bloqué ;
- quelle validation humaine est nécessaire.

## Objet lu

```yaml
process_activation_read_model:
  request_ref:
  source:
  raw_signal_summary:
  detected_domains:
  process_candidates:
  output_family_candidates:
  required_context_tier:
  loaded_context_status:
  required_gates:
  next_safe_action:
  blocked_actions:
  validation_route_candidate:
  missed_trigger_candidate:
  confidence:
  status:
  audit_trace:
```

## Sources possibles

```txt
user_intent
ui_mode
action
job
validation_item
workflow_event
owner_observation
feedback_intake
```

## Statuts

| Statut | Signification | Action autorisée |
|---|---|---|
| `diagnostic_only` | Lecture informative. | afficher |
| `candidate_ready_for_review` | Process probable, validation humaine requise. | préparer queue/spec |
| `missing_context` | Le process est probable mais le contexte manque. | charger contexte |
| `blocked_by_gate` | Une gate produit ou permission bloque. | expliquer le blocage |
| `missed_trigger_candidate` | Le système aurait dû activer quelque chose. | créer finding D12 plus tard |
| `rejected` | Signal trop faible ou mauvais process. | ne rien lancer |

## Process candidates initiaux

| Signal utilisateur | Process candidat | Output family | Gates requises | Actions bloquées |
|---|---|---|---|---|
| corrige / feedback / appréciation | D05-D06 correction | `correction_feedback` | source truth, teacher validation, output readiness | send/export/publication |
| feedback V2 / améliore le retour | D06 feedback evolution | `feedback_revision` | prior feedback lookup, evidence delta, teacher validation | overwrite feedback |
| lettre de reco | D06 recommendation letter | `recommendation_letter` | privacy, evidence status, external send gate | send external |
| génère / retake / DA / image | D08 visual manifest | `visual_manifest` | manifest, source truth, no-generation, storage/review | provider/generation |
| devis / prix / budget | D10 private quote | `quote_draft` | price source, quote validation, send gate | send quote |
| mets dans le canon | canon candidate | `canon_delta` | source truth, owner validation | direct canon write |
| stop / reset / attends | control state | `no_generation_review` | priority interruption, action invalidation | queued risky actions |
| ça a échoué / transforme en règle | D12 backflow | `factory_backflow` | finding, owner review, no auto-fix | auto patch |

## Context tier attendu

```yaml
T1_active_scope:
  required_for:
    - control state
    - current action diagnosis
T2_local_context:
  required_for:
    - D05-D06 feedback
    - current room teaching state
T3_linked_context:
  required_for:
    - feedback evolution
    - recommendation letter
    - visual continuity
T4_canon_references:
  required_for:
    - canon delta
    - D08 strict references
    - D10 quote truth
T5_archive_deep_search:
  required_for:
    - historical reconstruction
    - older Drive archive lookup
```

Current implementation remains T2-capped unless explicitly confirmed otherwise.

## Next safe action model

```yaml
next_safe_action:
  kind:
    - inspect_context
    - create_spec
    - add_queue_task
    - route_to_validation_inbox
    - park
    - ask_malex_decision
    - create_d12_finding_later
  label:
  reason:
  required_validation:
  forbidden_followups:
```

## Validation route candidate

Le read model peut proposer une route de validation, mais ne doit pas l'exécuter :

```yaml
validation_route_candidate:
  target: shared_validation_inbox | owner_cockpit | action_queue | none
  object_type:
  decision_authority:
  decider_role:
  reason:
```

## Missed trigger candidate

Si MasterFlow détecte qu'un process aurait dû apparaître mais n'est pas disponible :

```yaml
missed_trigger_candidate:
  expected_process:
  missing_runtime_piece:
  user_impact:
  suggested_queue_task:
  severity: low | medium | high
```

Ce bloc prépare D12, mais ne crée pas encore de finding runtime.

## Non-objectifs

- Pas d'exécution automatique.
- Pas de routing LLM invisible.
- Pas de création directe d'action risquée.
- Pas d'écriture canon.
- Pas d'export, send, provider, migration ou suppression.
- Pas de remplacement des permissions backend.

## Critère simple de succès

Pour une demande utilisateur, l'owner doit voir :

- le process candidat ;
- le contexte manquant ;
- les gates bloquantes ;
- la prochaine action sûre ;
- ce qu'il ne faut surtout pas lancer.

## Statut de déploiement

```yaml
runtime_code: false
migration: false
autonomous_execution: false
safe_to_queue: true
github_main: not_merged
requires_malex_before_code: true
```
