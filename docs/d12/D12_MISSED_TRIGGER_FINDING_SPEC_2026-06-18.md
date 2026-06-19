# D12 Missed Trigger Finding Spec — 2026-06-18

Status: `PARTIAL_RUNTIME_REVIEW_LOCAL`

Mise à jour locale : première tranche implémentée sur `codex/d12-missed-trigger-findings`.
Elle ajoute une table privée et deux routes diagnostics admin/godmode pour créer et lister des
findings D12 au statut initial `observation`. Cette tranche ne promeut rien, ne corrige rien et
ne crée aucune action.

## Intention produit

Transformer un raté MasterFlow en observation exploitable, sans auto-fix.

Exemple :

```txt
L'utilisateur demande une image, mais D08 manifest-first n'apparaît pas.
```

Le système doit pouvoir dire :

```txt
Process attendu : D08 visual manifest.
Déclencheur manqué : aucun manifest/readiness proposé.
Impact : MALEX doit orchestrer manuellement.
Prochaine action sûre : créer une tâche/spec, pas générer.
```

## Principe de sécurité

Une finding D12 n'est pas :

- une action backend ;
- une correction automatique ;
- une migration ;
- une écriture canon ;
- une validation ;
- une exécution provider.

C'est une observation structurée qui peut ensuite être revue par MALEX.

## Objet candidat

```yaml
d12_missed_trigger_finding:
  finding_id:
  detected_at:
  source_ref:
  expected_process:
  actual_runtime_response:
  missing_runtime_piece:
  user_impact:
  domain_refs:
  output_family_refs:
  evidence_refs:
  blocked_actions:
  recommended_queue_task:
  severity:
  status:
  owner_decision_ref:
  audit_trace:
```

## Sévérité

| Sévérité | Définition | Exemple |
|---|---|---|
| `low` | Confort ou lisibilité manquante. | Le cockpit n'explique pas assez le prochain geste. |
| `medium` | MALEX doit compenser manuellement. | Une demande D06 ne route pas vers la bonne famille. |
| `high` | Risque de dérive produit. | Une demande D08 pourrait ouvrir une génération sans manifest. |
| `critical` | Risque de publication/envoi/canonisation non validée. | Un export ou send est proposé sans validation. |

## Statuts

```txt
observation
hypothesis
candidate_pattern
validated_alert
stale
archived
```

Passage de statut :

```txt
observation -> hypothesis -> candidate_pattern -> validated_alert
```

Chaque passage demande une preuve ou une validation humaine.

## Exemples de triggers manqués

| Signal | Process attendu | Pièce manquante | Action sûre |
|---|---|---|---|
| “génère une image / retake / DA” | D08 manifest-first | manifest/readiness/read model | créer/ouvrir spec D08, pas provider |
| “améliore ce feedback” | D06 feedback revision | prior feedback lookup + delta | queue spec feedback evolution |
| “envoie à l'étudiant” | D06 send gate | external/student send validation | bloquer et demander validation |
| “mets dans le canon” | canon candidate | source truth + owner validation | route Validation Inbox/canon queue |
| “ça a échoué, fais-en une règle” | D12 backflow | finding route | créer finding, pas patch auto |
| “stop / reset / attends” | hard stop control | action invalidation model | marquer stop/reset, ne pas exécuter |

## Recommended queue task

```yaml
recommended_queue_task:
  task:
  impact:
  risk:
  source_of_truth:
  truth_status:
  validation_required:
  suggested_owner:
  forbidden_actions:
```

## Owner decision

MALEX peut décider :

```txt
park
add_to_queue
promote_to_spec
promote_to_canon_candidate
reject
archive
```

Aucune décision ne doit lancer un fix automatique dans cette spec.

## Première tranche implémentée localement

```yaml
table: d12_missed_trigger_findings
routes:
  - POST /api/v1/diagnostics/d12/findings
  - GET /api/v1/diagnostics/d12/findings
  - POST /api/v1/diagnostics/d12/findings/:id/decision
minimum_role: admin
initial_status: observation
audit_event: d12_missed_trigger_finding_created
forbidden_effects:
  - action_creation
  - job_creation
  - auto_patch
  - canon_write
  - provider_call
```

## Décisions owner implémentées localement

```yaml
decisions:
  keep_observation: observation
  promote_to_hypothesis: hypothesis
  promote_to_candidate_pattern: candidate_pattern
  validate_alert: validated_alert
  mark_stale: stale
  archive: archived
storage: owner_decision_json
guards:
  - no_action_creation
  - no_job_creation
  - no_auto_fix
  - no_canon_write
```

## Projection Shared Validation Inbox

Les findings sans décision owner sont projetées dans l'inbox commune comme `autonomy_proposal`,
en visibilité admin/godmode uniquement.

Décisions bornées :

```yaml
approve: validate_alert
park: keep_observation
reject: mark_stale
archive: archive
```

Les promotions `hypothesis` et `candidate_pattern` restent dans la revue D12 dédiée. Cette
projection ne crée ni action, ni job, ni patch, ni déploiement, ni candidat canon.

## Non-objectifs

- Pas de detector runtime maintenant.
- Pas d'auto-réparation.
- Pas de création automatique d'action.
- Pas de suppression.

## Critère simple de succès

Quand MasterFlow rate un déclenchement important, on doit pouvoir le ranger comme :

```txt
ce qui aurait dû se passer
ce qui s'est vraiment passé
pourquoi c'est un problème
quelle tâche safe créer
ce qui reste bloqué
```

## Statut de déploiement

```yaml
runtime_code: true
runtime_code_partial_observation: true
migration: true
auto_fix: false
safe_to_queue: true
github_main: findings_and_owner_decisions_merged_pr13_to_pr16
validation_inbox_projection: local_verified_not_merged
requires_malex_before_code: fulfilled_by_global_go
```
