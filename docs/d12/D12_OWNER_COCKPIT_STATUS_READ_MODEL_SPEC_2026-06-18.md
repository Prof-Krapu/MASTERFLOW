# D12 Owner Cockpit Status Read Model Spec — 2026-06-18

Status: `IMPLEMENTED_LOCALLY_READ_ONLY`

Mise à jour : première tranche implémentée localement sur
`codex/d12-owner-cockpit-runtime` via `GET /diagnostics/owner-cockpit`.
Elle agrège uniquement la vérité runtime privée. GitHub et le Drive ne sont pas interrogés ; sans
`MASTERFLOW_RELEASE_SHA`, la version live reste explicitement `unverified`.

## Intention produit

Définir ce que le cockpit owner doit lire pour répondre simplement :

```txt
Où en est MasterFlow ?
Qu'est-ce qui bloque ?
Quelle est la prochaine action sûre ?
Est-ce que GitHub, le canon et les queues racontent la même histoire ?
```

Cette spec ne crée pas d'endpoint. Elle prépare le contrat d'un futur agrégat read-only.

## Objet candidat

```yaml
owner_cockpit_status:
  generated_at:
  github_status:
  canon_sync_status:
  validation_inbox_status:
  jobs_status:
  active_queue_status:
  deployment_bridge_status:
  process_activation_status:
  d12_findings_status:
  next_safe_action:
  blockers:
  alerts:
  audit_trace:
```

## États lisibles

### GitHub status

```yaml
github_status:
  branch:
  main_sha:
  current_branch_sha:
  ahead_behind:
  open_pr:
  draft:
  merge_required:
  risk:
```

### Canon sync status

```yaml
canon_sync_status:
  canon_source:
  last_checked:
  matrix_ref:
  aligned:
  known_gaps:
  risk:
```

### Active queue status

```yaml
active_queue_status:
  queue_ref:
  done_items:
  pending_items:
  blocked_items:
  requires_malex:
  next_safe_item:
```

### Process activation status

```yaml
process_activation_status:
  read_model_available:
  known_missing_router:
  hard_stop_model:
  action_expiry_model:
  missed_trigger_model:
```

## Alert types

```txt
github_not_synced
canon_gap
queue_item_untracked
validation_inbox_pending
runtime_job_failed
process_activation_missing
d08_generation_locked
external_send_locked
merge_required
malex_decision_required
```

## Next safe action format

```yaml
next_safe_action:
  label:
  reason:
  source_ref:
  risk:
  requires_validation:
  forbidden_followups:
```

## Copy UI recommandée

```txt
État : PR draft ouverte, non mergée.
Canon : pas de dérive critique détectée dans les docs de queue.
Inbox : D06 feedback actif, autres objets D06-D12 partiels.
Blocage : D08 génération verrouillée.
Prochaine action sûre : review PR #6 ou préparer prochaine spec.
```

## Non-objectifs

- Pas d'appel Drive automatique maintenant.
- Pas de merge GitHub.
- Pas d'exécution runtime.
- Pas de résolution automatique d'alerte.
- Pas de création de finding.

## Critère simple de succès

Le cockpit doit parler en décisions, pas en logs techniques.

MALEX doit voir :

- ce qui est déployé ;
- ce qui est seulement en PR ;
- ce qui est bloqué ;
- ce qui demande validation ;
- quoi faire ensuite.

## Statut de déploiement

```yaml
runtime_code: local_true
endpoint: GET /api/v1/diagnostics/owner-cockpit
migration: false
safe_to_queue: true
github_main: not_merged
requires_malex_before_publish: true
```
