# Feedback Output Family Registry Spec — 2026-06-18

Status: `SPEC_ONLY_PRE_CANON`

## Intention produit

Éviter que MasterFlow mélange tous les retours pédagogiques dans un seul objet “feedback”.

Un feedback d'amélioration, une appréciation de note, une défense d'évaluation, une lettre de
recommandation et un cadrage jury n'ont pas les mêmes risques, les mêmes sources, ni les mêmes
validations.

Cette spec classe les familles candidates. Elle ne les canonise pas.

## Source de vérité

Cette spec vient de `docs/user-feedback/USER_FEEDBACK_INTAKE_2026-06-18.md`.

Les retours utilisateurs restent :

```txt
observation terrain -> hypothèse produit -> modification canon proposée -> canon validé
```

Ici, le statut reste `hypothèse produit structurée`.

## Registre candidat

| Famille | Usage | Risque | Gates nécessaires | Statut |
|---|---|---|---|---|
| `actionable_feedback` | Retour utile pour améliorer un travail. | moyen | evidence, tone, teacher validation | déjà partiellement couvert par `feedback_draft` |
| `grade_appreciation` | Appréciation associée à une note ou un barème. | élevé | rubric, score status, teacher validation | candidat |
| `evaluation_defense` | Justification défendable d'une évaluation. | élevé | evidence refs, rubric refs, audit trail | candidat verrouillé |
| `recommendation_letter` | Lettre ou texte orienté externe. | très élevé | privacy, evidence status, external send gate | candidat verrouillé |
| `jury_framing` | Présentation d'un élève/projet devant jury. | élevé | source truth, privacy, owner validation | candidat |
| `class_summary` | Synthèse de classe/cohorte. | moyen | aggregation privacy, anonymization if needed | candidat |
| `feedback_revision` | V2/V3 d'un feedback existant. | moyen | prior feedback lookup, delta control, teacher validation | candidat |
| `private_export_preview` | Preview privée d'export après validation. | élevé | approved feedback source, no publication, owner validation | spec D06 séparée |

## Champs communs minimaux

```yaml
feedback_output_family:
  family_id:
  label:
  domain_refs:
  source_truth_requirements:
  evidence_requirements:
  privacy_level:
  validation_authority:
  allowed_destinations:
  blocked_destinations:
  export_policy:
  student_visible_policy:
  canon_policy:
  audit_requirements:
```

## Politiques par défaut

### `actionable_feedback`

```yaml
source_truth_requirements:
  - submission evidence
  - run context
  - pedagogical axis
validation_authority: reviewFeedbackDraft
blocked_destinations:
  - student_send_before_validation
  - public_export
canon_policy: never_auto_canon
```

### `grade_appreciation`

```yaml
source_truth_requirements:
  - rubric
  - score status
  - correction run
validation_authority: teacher_owner
blocked_destinations:
  - final_grade_write
  - student_send_before_validation
canon_policy: assessment_record_only_after_validation
```

### `evaluation_defense`

```yaml
source_truth_requirements:
  - rubric
  - evidence refs
  - score refs
  - audit trace
validation_authority: teacher_owner
blocked_destinations:
  - external_send
  - grade_change
canon_policy: never_auto_canon
```

### `recommendation_letter`

```yaml
source_truth_requirements:
  - validated achievements
  - privacy consent status
  - recipient context
validation_authority: owner_explicit_validation
blocked_destinations:
  - external_send
  - public_export
  - auto_signature
canon_policy: no_canon_without_owner
```

### `feedback_revision`

```yaml
source_truth_requirements:
  - previous_feedback_ref
  - delta_request
  - evidence delta
validation_authority: teacher_owner
blocked_destinations:
  - overwrite_previous_feedback
  - student_send_before_validation
canon_policy: versioned_candidate
```

## Decision route

```yaml
route_to_validation_inbox:
  allowed_when:
    - object exists
    - owner is known
    - source refs are private/safe
    - decision authority exists
  forbidden_when:
    - external send is implied
    - final grade write is implied
    - output family is only inferred by LLM
    - evidence is missing
```

## Ce que cette spec débloque

- Une future UI peut demander “quel type de sortie veux-tu ?”
- D06 peut éviter de traiter une recommandation externe comme un simple feedback.
- Le Process Activation read model peut router vers la bonne famille.
- La Validation Inbox peut afficher des risques plus humains.

## Ce que cette spec bloque

- Envoi étudiant automatique.
- Publication/export public.
- Lettre de recommandation externe sans validation explicite.
- Écriture de note finale.
- Canonisation d'un retour utilisateur.

## Critère simple de succès

Avant de produire un texte pédagogique sensible, MasterFlow doit savoir de quelle famille il s'agit
et quelle validation est obligatoire.

## Statut de déploiement

```yaml
runtime_code: false
migration: false
canon_promotion: false
safe_to_queue: true
github_main: not_merged
requires_malex_before_code: true
```
