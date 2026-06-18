# D08 Manifest Read Model Spec — 2026-06-18

Status: `SPEC_ONLY_NO_RUNTIME`

## Intention produit

Permettre à MasterFlow de préparer une demande visuelle en mode manifest-first, sans appeler de
provider, sans générer d'image et sans transformer un rendu en canon.

Cette spec est la prochaine étape sûre après le verrou
`D08_LOCKED_MANIFEST_FIRST_SEQUENCE_2026-06-18.md`.

## Ce que ce read model doit faire

Il doit afficher ou exposer une lecture structurée de :

- l'intention visuelle ;
- les entités canon concernées ;
- la pièce / scène / contexte ;
- les références et leur statut ;
- la résolution DA ;
- l'état de préparation de sortie ;
- les gates Action Ready ;
- le blocage éventuel de génération ;
- le futur handoff vers Validation Inbox.

## Ce que ce read model ne doit pas faire

- Ne pas appeler ComfyUI, OpenRouter, ou un provider image.
- Ne pas créer un `generated_asset_candidate`.
- Ne pas stocker de fichier généré.
- Ne pas exposer un bouton “générer” actif.
- Ne pas canoniser une image.
- Ne pas préparer un export public.
- Ne pas mélanger badge/medal/trophy manufacturing runtime avec image generation générique.

## Objet lu

```yaml
d08_manifest_read_model:
  manifest_id:
  status:
  owner_ref:
  project_ref:
  room_ref:
  request_title:
  intent:
  privacy_scope:
  canon_entity_refs:
  da_root_ref:
  active_layers:
  output_family:
  output_template:
  provider_target_candidate:
  source_truth_summary:
  reference_status_board:
  da_resolution:
  output_readiness:
  action_ready_report:
  generation_blockers:
  validation_inbox_handoff_candidate:
  audit_trace:
```

## Statuts manifest

| Statut | Signification | Action autorisée |
|---|---|---|
| `draft` | Cadrage incomplet. | compléter le manifest |
| `references_to_classify` | Références présentes mais non qualifiées. | classer les références |
| `da_to_resolve` | DA / style / continuité flous. | résoudre la DA |
| `readiness_blocked` | Sortie non prête. | corriger le manifest |
| `action_ready_preview` | Le manifest est lisible mais génération bloquée. | review owner |
| `generation_blocked_tech_pending` | Le produit est cadré, mais runtime absent. | aucun provider |
| `parked` | Demande rangée sans exécution. | reprendre plus tard |

## Reference Status Board

Statuts autorisés :

```txt
canon_strict
expression_only
outfit_only
world_style
poster_energy
filter_reference
output_template
anti_pattern
rejected
```

Règles :

- `canon_strict` exige une validation canon/owner.
- Une référence privée ne doit jamais fuiter vers un prompt public.
- `anti_pattern` sert à empêcher la dérive, pas à nourrir le style.
- Une référence générée reste source faible tant qu'elle n'a pas une provenance claire.

## Action Ready Report

```yaml
action_ready_report:
  intent_gate:
  owner_gate:
  da_resolution_gate:
  da_stack_gate:
  canon_gate:
  source_truth_gate:
  output_gate:
  permission_gate:
  completion_gate:
  queue_gate:
  human_gate:
  final_state:
  missing_items:
```

`final_state` peut être :

```txt
not_ready
ready_for_owner_review
generation_blocked_tech_pending
parked
```

Même si tous les gates produit passent, la génération reste bloquée tant que storage,
provenance, generated asset lifecycle et review D08 ne sont pas confirmés.

## Validation Inbox handoff candidate

Le read model peut préparer un futur item d'inbox, mais ne doit pas le créer automatiquement dans
cette spec.

```yaml
validation_inbox_handoff_candidate:
  object_type: d08_visual_manifest
  decision_authority: reviewVisualManifest
  decider_role: owner
  decision_options:
    - approve_manifest
    - request_manifest_changes
    - park_manifest
    - reject_manifest
  blocked_actions:
    - generate_image
    - export_public
    - canonize_asset
```

## Critère simple de succès

Un owner doit pouvoir comprendre :

- ce qui est demandé visuellement ;
- quelles références sont fiables ou dangereuses ;
- ce qui manque pour être Action Ready ;
- pourquoi la génération est encore bloquée ;
- quelle décision humaine serait nécessaire avant toute suite.

## Risque de dérive

Risque principal : confondre “manifest prêt” avec “génération autorisée”.

Contre-mesure : afficher explicitement `generation_blocked_tech_pending` tant que les objets de
storage, provenance, candidate lifecycle, post-generation DA report et Validation Inbox D08 ne sont
pas implémentés.

## Statut de déploiement

```yaml
runtime_code: false
migration: false
provider_call: false
github_main: not_merged
safe_to_queue: true
requires_malex_before_code: true
```
