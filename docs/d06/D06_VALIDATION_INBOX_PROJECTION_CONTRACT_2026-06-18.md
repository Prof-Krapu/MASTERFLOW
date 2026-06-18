# D06 → Shared Validation Inbox — contrat minimal de projection

Date : 2026-06-18  
Statut : `IMPLEMENTED_LOCAL_PENDING_PUBLICATION`  
Nature : contrat d'implémentation, aucune projection runtime dans ce document.

Mise à jour locale 2026-06-18 : ce contrat est implémenté sur la branche
`codex/d06-validation-inbox-contract`, mais n'est pas encore publié sur GitHub `main`.

## Intention produit

Faire apparaître les feedbacks D06 réellement en attente dans l'unique Validation Inbox, sans
créer une queue correction parallèle et sans transformer une validation UI en envoi étudiant.

## Références canon

- `03_DOMAINS/D06_CORRECTION_FEEDBACK_EVALUATION/DOMAIN_CARD.md`
- `04_BRIDGE_PRIMITIVES/VALIDATION_INBOX_AND_CANDIDATE_CANON_CONTROLS.md`
- `04_BRIDGE_PRIMITIVES/VALIDATION_INBOX_GLOBAL_SCHEMA.md`
- `05_UI_RUNTIME_CONTRACTS/D05_D06_VERTICAL_UI_RUNTIME_CONTRACT.md`

## Audit Canon → GitHub

| Élément canon | Statut GitHub | Écart | Risque | Action recommandée |
|---|---|---|---|---|
| Feedback draft candidat | implémenté | `feedback_drafts` possède le statut `needs_teacher_validation`. | faible | Première source D06 à projeter. |
| Décision professeur | implémenté | `reviewFeedbackDraft()` approuve/rejette et audite, mais n'est pas relié à l'inbox. | moyen | Déléguer la décision inbox à cette autorité. |
| Validation Inbox D06 | absent | `source_kind` est verrouillé à `action` dans TypeScript et SQLite. | moyen | Migration additive contrôlée vers `feedback_draft`. |
| Pré-correction review | fondation | `pre_correction_runs.status` est figé à `needs_review`, sans décision réelle. | élevé | Ne pas projeter comme item décidable. |
| Calibration review | fondation | `review_required` existe, sans méthode de résolution. | élevé | Diagnostic uniquement, hors première projection. |
| Export preview | implémenté fondation | Autorité approve/reject réelle, mais dépend de feedbacks déjà approuvés. | élevé | Deuxième source D06, après feedback. |
| Envoi étudiant | absent/bloqué | Aucun envoi/publication et `publication_allowed=false`. | critique | Rester hors scope. |

## Première source autorisée

```yaml
source_kind: feedback_draft
source_table: feedback_drafts
source_status: needs_teacher_validation
decision_authority: reviewFeedbackDraft
decider: owner teacher only
item_type: feedback_review
risk_level: high
privacy_scope: project if project_id else private
output_readiness_state: blocked
decision_options:
  - approve
  - reject
```

### Mapping de l'item

```yaml
title: Feedback à valider
summary: Brouillon de feedback étudiant en attente de validation professeur.
domain_refs:
  - D06_CORRECTION_FEEDBACK_EVALUATION
object_refs:
  - feedback_draft:{feedback_id}
  - pre_correction_run:{run_id}
  - submission:{submission_id}
source_refs:
  - evidence refs déjà validées par recordFeedbackDraft
requester: owner_id
owner: owner_id
required_validator: teacher_owner
source_truth_state: source_verified
proposed_action: approve_student_safe_feedback
impact_summary: L'approbation rend le feedback utilisable comme source d'une preview privée ; elle ne l'envoie pas.
blocked_actions:
  - create_correction_export_preview
  - student_send
allowed_actions:
  - approve
  - reject
recommended_decision: null
```

## Invariants non négociables

1. La décision inbox appelle `reviewFeedbackDraft()` ; elle ne met jamais la table D06 à jour directement.
2. Seul le professeur owner peut décider dans la première tranche.
3. Un membre projet non-owner ne voit pas cet item dans la première tranche, même s'il peut lire certains objets projet.
4. `approve` devient `feedback_drafts.status = approved`.
5. `reject` devient `feedback_drafts.status = rejected`.
6. L'approbation ne crée aucun export et n'envoie rien à l'étudiant.
7. La Validation Inbox reste la seule surface de décision.
8. Les références sensibles ne sont pas développées en contenu brut dans l'item.

## Changements techniques nécessaires

### Contrat partagé

- étendre `ValidationInboxItem.source_kind` de `action` à `action | feedback_draft` ;
- conserver les décisions génériques mais limiter D06 à `approve | reject` ;
- ne pas créer un nouveau schéma d'inbox D06.

### Base SQLite

Le `CHECK (source_kind = 'action')` exige une migration de reconstruction de table idempotente.

La migration doit :

- préserver tous les items action existants ;
- autoriser uniquement `action` et `feedback_draft` ;
- préserver l'unicité `(source_kind, source_id)` ;
- être testée sur une base déjà peuplée.

### Service Validation Inbox

- synchroniser les actions pending comme aujourd'hui ;
- projeter les `feedback_drafts.needs_teacher_validation` dont `owner_id = actor.id` ;
- lire ensuite les items persistés autorisés, au lieu de retourner uniquement `listPending(action)` ;
- dispatcher la décision selon `source_kind` ;
- générer un `validation_ref` traçable à partir de l'item et de la décision.

### Tests minimum

1. Un feedback pending de l'owner apparaît une seule fois.
2. Un autre professeur ne le voit pas.
3. Un compte student ne voit pas l'inbox.
4. Approve délègue à `reviewFeedbackDraft` et ne crée aucun export.
5. Reject délègue à `reviewFeedbackDraft`.
6. Une seconde décision est refusée.
7. Les items action existants continuent de fonctionner.
8. La migration conserve les items action d'une base existante.

## Hors scope explicite

- pré-correction run ;
- criterion score draft ;
- calibration review ;
- quality review item ;
- correction export preview ;
- note finale ;
- publication ou envoi étudiant ;
- modification/édition du feedback depuis l'inbox.

## Risques

- migration SQLite incorrecte pouvant perdre des items existants ;
- fuite de références privées si le mapping devient trop bavard ;
- approbation confondue avec un envoi ;
- élargissement accidentel aux membres projet non-owner ;
- double autorité si l'inbox réimplémente la décision D06.

## Contrat de succès

Un professeur owner voit son feedback en attente dans l'inbox commune, peut l'approuver ou le
rejeter une fois, et aucun export, envoi ou score final n'est produit automatiquement.

## Décision demandée

Valider ou refuser cette première projection `feedback_draft only` avant toute modification de
schéma, service ou route.
