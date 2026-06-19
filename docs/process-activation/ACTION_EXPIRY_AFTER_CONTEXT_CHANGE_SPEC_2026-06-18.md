# Action Expiry After Context Change Spec — 2026-06-18

Status: `PARTIAL_RUNTIME_GUARD_PREVIEW_MAIN_SELECTED_APPLY_LOCAL`

Mise à jour locale : première tranche implémentée sur `codex/action-expiry-guard`.
Elle ajoute un garde runtime minimal : `POST /api/v1/actions/expire-context` rend `stale`
les actions sensibles ouvertes dans un scope contrôlé. Ce n'est pas encore un détecteur autonome
de changement de contexte ni un hard-stop branché automatiquement au signal utilisateur.

Mise à jour 2026-06-19 : une prévisualisation read-only utilise les mêmes règles de scope pour
montrer les actions qui seraient rendues stale, sans aucune mutation.

Mise à jour Vague 5B : l'application explicite accepte une liste d'actions sélectionnées après
preview. Toutes sont décochées par défaut et l'opération est atomique : une action inéligible
annule l'ensemble. Le signal texte ne déclenche toujours aucune mutation et aucun job n'est annulé.

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

Cette spec décrit le contrat. La première tranche runtime applique seulement le cas sûr :
marquer obsolètes des actions sensibles déjà ouvertes, sans suppression et sans exécution.

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

## Première tranche implémentée localement

```yaml
route: POST /api/v1/actions/expire-context
minimum_role: teacher
scopes:
  - mine
  - project
affected_statuses:
  - pending_validation
  - approved
affected_actions:
  - sensitive registry actions
  - medium_high/high/variable risk actions
  - actions whose preflight requires validation
never_touched:
  - low-risk approved actions
  - executing
  - completed
  - failed
  - rejected
runtime_effect:
  - status becomes stale
  - executeAction refuses stale by existing status guard
  - validateAction refuses stale by existing pending_validation guard
audit:
  - action_stale
```

## Gaps restants

- pas encore de détection automatique de changement de contexte ;
- pas encore de hash/snapshot de contexte ;
- pas encore d'application du hard-stop depuis le signal `stop` ;
- granularité reset à confirmer avant application : user, Room, projet ou actions sélectionnées ;
- pas de retry/re-preflight automatique.
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
runtime_code: true
migration: false
job_cancellation: false
preview_route: POST /api/v1/actions/expire-context/preview
preview_mutation: false
safe_to_queue: true
github_main: expiry_guard_merged_pr11
preview_status: merged_pr19
selected_apply_route: POST /api/v1/actions/expire-context/selected
selected_apply_status: local_verified
selected_apply_invariants: explicit_selection_only_all_or_nothing
requires_malex_before_code: fulfilled_by_global_go
```
