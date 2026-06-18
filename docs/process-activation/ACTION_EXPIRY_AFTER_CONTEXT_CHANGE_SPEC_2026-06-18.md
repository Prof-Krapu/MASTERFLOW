# Action Expiry After Context Change Spec — 2026-06-18

Status: `SPEC_ONLY_NO_RUNTIME`

## Intention produit

Empêcher une action préparée dans un ancien contexte de rester valide quand le contexte produit a
changé.

Exemple :

```txt
Une action d'export est préparée.
Puis le feedback source, la privacy, la note, le manifest ou le canon change.
L'action ne doit pas rester exécutable comme si rien n'avait changé.
```

## Principe de sécurité

Cette spec décrit le contrat. Elle ne modifie pas encore le runtime.

Objectif :

```txt
context change -> action becomes stale or requires re-preflight
```

## Objet candidat

```yaml
action_context_snapshot:
  action_id:
  created_at:
  actor_ref:
  process_ref:
  source_refs:
  context_hash:
  canon_refs:
  privacy_scope:
  output_family:
  validation_refs:
  risk_level:
```

```yaml
action_expiry_report:
  action_id:
  previous_context_hash:
  current_context_hash:
  changed_refs:
  expiry_reason:
  recommended_status:
  required_next_step:
  blocked_actions:
  audit_trace:
```

## Changements qui doivent invalider ou re-preflight

| Changement | Effet recommandé |
|---|---|
| source evidence modifiée | re-preflight obligatoire |
| feedback source rejeté/modifié | action stale |
| validation owner retirée | action stale |
| privacy scope augmenté | action stale |
| canon ref modifiée | re-preflight obligatoire |
| D08 reference status changé | re-preflight obligatoire |
| output family changé | action stale |
| destination export/send changé | action stale |
| user dit stop/reset | action stale immédiate |

## Statuts recommandés

```txt
valid
requires_repreflight
stale
blocked_by_stop
blocked_by_privacy_change
blocked_by_source_change
archived
```

## Actions bloquées quand stale

- execute;
- export;
- send;
- provider_call;
- canon_write;
- publication;
- final_grade_write.

## Copy UI recommandée

```txt
Action périmée : le contexte source a changé depuis le preflight.
Prochaine action sûre : relancer le preflight.
Bloqué : exécution/export/envoi.
```

```txt
Action bloquée : MALEX a demandé stop/reset.
Prochaine action sûre : confirmer le nouveau périmètre.
```

## Non-objectifs

- Pas de migration maintenant.
- Pas de hash runtime maintenant.
- Pas d'annulation automatique de jobs actifs.
- Pas de suppression.
- Pas d'exécution.

## Critère simple de succès

Une action sensible ne doit pas survivre silencieusement à un changement important de contexte.

## Statut de déploiement

```yaml
runtime_code: false
migration: false
job_cancellation: false
safe_to_queue: true
github_main: not_merged
requires_malex_before_code: true
```
