# Process Control Strip Spec — 2026-06-18

Status: `SPEC_ONLY_READ_ONLY_UI`

## Intention produit

Créer une surface lisible qui dit à l'owner ce que MasterFlow pense être en train de faire,
ce qui est verrouillé, et ce qui ne doit pas bouger.

Cette spec répond à un besoin terrain récurrent :

```txt
"Je veux être sûr qu'on ne s'éloigne pas de ce qu'on faisait de base."
```

## Rôle du strip

Le strip est un panneau court, visible au-dessus ou à côté d'une action sensible.

Il doit montrer :

- le process candidat ;
- la famille de sortie ;
- le statut canon / hypothèse / prototype / implémentation ;
- les deltas autorisés ;
- les zones interdites ;
- les gates bloquantes ;
- la prochaine action sûre ;
- les actions explicitement bloquées.

## Objet lu

```yaml
process_control_strip:
  strip_id:
  source_ref:
  current_process_candidate:
  output_family:
  truth_status:
  canon_ref:
  github_ref:
  active_delta_scope:
  protected_scope:
  stop_reset_state:
  no_generation_state:
  required_gates:
  next_safe_action:
  blocked_actions:
  validation_required:
  confidence:
  audit_trace:
```

## Truth status

```txt
observation_terrain
hypothese_produit
canon_valide
prototype
implementation_partielle
implementation_deployee
futur
rejete
a_decider
```

But : ne jamais faire passer une observation terrain pour du canon.

## Delta scope

```yaml
active_delta_scope:
  allowed_changes:
    - tone
    - structure
    - evidence_detail
    - visual_style_reference
    - output_family
    - wording
  forbidden_changes:
    - canon_promise
    - validated_grade
    - external_send
    - provider_generation
    - public_export
    - deletion
  keep_stable:
    - source_truth
    - owner_decision
    - privacy_scope
    - validated_context
```

## Stop / reset / no-generation

Le strip doit rendre prioritaires les commandes de contrôle.

```yaml
stop_reset_state:
  hard_stop_active: boolean
  reset_scope:
    - none
    - current_output
    - current_process
    - room_context
    - reference_board
    - session
  reason:
  invalidated_actions:
```

```yaml
no_generation_state:
  active: boolean
  applies_to:
    - image
    - export
    - send
    - canon_write
    - migration
  reason:
```

## Copy UI recommandée

Exemples courts :

```txt
Process probable : D08 visual manifest.
Statut : hypothèse produit / spec seulement.
Autorisé maintenant : préparer le manifest.
Bloqué : génération, provider, export, canonisation.
Prochaine action sûre : compléter les références et gates Action Ready.
```

```txt
Process probable : D06 feedback.
Statut : implémentation partielle déployée.
Autorisé maintenant : validation professeur du feedback.
Bloqué : envoi étudiant, export public, note finale.
Prochaine action sûre : review dans Validation Inbox.
```

## Non-objectifs

- Pas de déclenchement automatique d'action.
- Pas de bouton hidden “go”.
- Pas de décision canon.
- Pas d'appel provider.
- Pas d'invalidation réelle d'actions tant que le backend n'a pas le modèle.

## Critère simple de succès

Avant d'agir, MALEX doit pouvoir répondre en 5 secondes :

- “On fait quoi ?”
- “Qu'est-ce qui est verrouillé ?”
- “Qu'est-ce qui peut changer ?”
- “Qu'est-ce qui est interdit ?”
- “Quelle est la prochaine action sûre ?”

## Statut de déploiement

```yaml
runtime_code: false
ui_code: false
migration: false
safe_to_queue: true
github_main: not_merged
requires_malex_before_code: true
```
