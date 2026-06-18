# D06 → Validation Inbox — audit `correction_export_preview`

Date : 2026-06-18  
Statut : `SPEC_READY_NO_CODE`  
Nature : audit de projection possible, aucune migration ni implémentation runtime dans ce document.

## Diagnostic

`correction_export_preview` est le deuxième candidat D06 logique après `feedback_draft`.

Pourquoi : GitHub possède déjà une autorité de décision réelle (`reviewCorrectionExportPreview`),
un statut d'attente (`needs_teacher_validation`), une décision owner-only, un audit et un verrou
canonique `publication_allowed = false`.

Ce candidat est donc viable pour la Shared Validation Inbox, mais seulement comme **preview privée
d'export**, jamais comme publication, note finale ou envoi étudiant.

## Références canon lues

- `04_BRIDGE_PRIMITIVES/OUTPUT_READINESS_CONSOLE_PRIMITIVE.md`
- `04_BRIDGE_PRIMITIVES/VALIDATION_INBOX_GLOBAL_SCHEMA.md`
- `04_BRIDGE_PRIMITIVES/VALIDATION_INBOX_AND_CANDIDATE_CANON_CONTROLS.md`
- `90_WORKBENCH/SIMULATIONS/SIM-20260614-VERTICAL-D05-D06-PRODUCT-PROOF-001.md`

## Audit Canon → GitHub

| Élément canon | Statut GitHub | Écart | Risque | Action recommandée |
|---|---|---|---|---|
| Export ≠ publication | implémenté | `CorrectionExportPreviewSchema.publication_allowed` est toujours `false`. | faible | Préserver ce verrou dans l'inbox. |
| Preview privée après feedback validé | implémenté | `recordCorrectionExportPreview` refuse les feedbacks non approuvés. | faible | Projeter seulement les previews déjà créées et en attente. |
| Validation professeur | implémenté | `reviewCorrectionExportPreview` décide owner-only et audite. | faible | Déléguer la décision inbox à cette autorité. |
| Shared Validation Inbox source | absent | `validation_inbox.ts` ne projette pas encore `correction_export_preview`. | moyen | Ajouter une source plus tard, après validation MALEX. |
| Export prepare job | fondation | `createExportPrepareJob` exige une preview `approved_for_export`, mais ce job est une étape séparée. | élevé | Ne pas déclencher de job depuis la décision inbox. |
| Envoi étudiant | absent/verrouillé | Aucun send/publication étudiant ne doit être inféré. | critique | Garder hors scope. |
| Storage réel | absent/partiel | `storage://` reste une référence, pas une garantie de stockage final. | élevé | Ne pas ouvrir de téléchargement final sans contrat storage. |

## Projection proposée

```yaml
source_kind: correction_export_preview
source_table: correction_export_previews
source_status: needs_teacher_validation
decision_authority: reviewCorrectionExportPreview
decider: owner teacher only
item_type: public_export
risk_level: high
privacy_scope: project if project_id else private
output_readiness_state: blocked
decision_options:
  - approve
  - reject
```

Note : `item_type: public_export` est imparfait mais disponible dans le contrat partagé actuel.
La copy UI devra dire explicitement **preview privée**, pas publication.

## Mapping minimal de l'item

```yaml
title: Preview d'export D06 à valider
summary: Preview privée d'export de correction en attente de validation professeur.
domain_refs:
  - D06_CORRECTION_FEEDBACK_EVALUATION
object_refs:
  - correction_export_preview:{export_id}
  - correction_batch:{batch_id}
source_refs:
  - feedback_draft:{source_feedback_refs[]}
  - pre_correction_run:{source_run_refs[]}
requester: owner_id
owner: owner_id
required_validator: teacher_owner
source_truth_state: source_verified
proposed_action: approve_private_correction_export_preview
impact_summary: >
  L'approbation rend la preview utilisable par un futur job export_prepare privé.
  Elle ne publie rien et n'envoie rien à l'étudiant.
blocked_actions:
  - export_prepare_job
  - student_send
  - publication
allowed_actions:
  - approve
  - reject
recommended_decision: null
```

## Invariants non négociables

1. La décision inbox appelle `reviewCorrectionExportPreview()`.
2. L'inbox ne modifie jamais directement `correction_export_previews`.
3. Seul le professeur owner décide dans la première tranche.
4. `approve` devient `approved_for_export`.
5. `reject` devient `rejected`.
6. `approve` ne crée pas de job `export_prepare`.
7. `approve` ne crée pas de fichier final.
8. `approve` ne publie rien et n'envoie rien à l'étudiant.
9. `publication_allowed` reste toujours `false`.
10. Les refs `storage://private/...` ne sont jamais développées en contenu brut dans l'item.

## Décision recommandée

Intégrer **plus tard**, après validation MALEX, comme deuxième source D06 de la Shared Validation
Inbox.

Cette intégration est plus risquée que `feedback_draft`, car le mot "export" peut être mal compris
par l'UI ou par un utilisateur. La première implémentation devra donc avoir une copy très explicite :

```txt
Valider la preview privée, pas envoyer à l'étudiant.
```

## Travail technique futur

- Étendre `ValidationInboxItem.source_kind` à `correction_export_preview`.
- Migrer le CHECK SQLite `validation_inbox_items.source_kind`.
- Ajouter `listPendingCorrectionExportPreviewsForValidation(actor)`.
- Ajouter `syncValidationInboxItemForCorrectionExportPreview`.
- Dispatcher la décision vers `reviewCorrectionExportPreview`.
- Refuser toute décision autre que `approve/reject`.
- Tester :
  1. owner voit la preview pending ;
  2. autre professeur ne la voit pas dans la première tranche ;
  3. approve appelle l'autorité D06 ;
  4. reject appelle l'autorité D06 ;
  5. seconde décision refusée ;
  6. aucun job `export_prepare` créé ;
  7. `publication_allowed` reste false ;
  8. items `action` et `feedback_draft` continuent de fonctionner.

## Hors scope

- génération de fichier final ;
- téléchargement réel ;
- envoi étudiant ;
- publication ;
- note finale ;
- storage service ;
- édition du contenu depuis l'inbox ;
- auto-création de preview après feedback approval.
