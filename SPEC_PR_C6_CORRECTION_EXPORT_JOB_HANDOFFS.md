# SPEC — PR-C6 Handoffs jobs correction/export

Statut : `FOUNDATION IMPLEMENTED / INTERNAL ONLY / NO RUNNER / 2026-06-13`

## Objectif

Créer les intentions de jobs sensibles à partir d'objets déjà validés, sans lancer de runner,
sans exposer de route publique et sans produire de fichier final.

```text
manifest pré-correction validé
-> correction_prepare queued
-> futur runner correction
-> sortie needs_review

preview export approved_for_export
-> export_prepare queued
-> futur renderer/exporter
-> fichier final needs_review
-> publication séparée hors PR-C6
```

## Sources canon

- `BACKGROUND_JOB_EXECUTION_AND_CHAT_CONTINUITY_CONTRACT.md` ;
- `SPEC_JOBS_QUEUES_RUNNERS.md` ;
- `SPEC_PR_C2_OCR_INGESTION_AND_JOBS_SHELL.md` ;
- `SPEC_PR_C3_PRE_CORRECTION_EXPLICABLE.md` ;
- `SPEC_PR_C5_FEEDBACK_AND_EXPORT_PREVIEWS.md` ;
- `04_ENGINES/EXPORT_ENGINE.md` ;
- `03_APPS/CORRECTOR_APP_RUNTIME.md`.

## CorrectionPrepareRequest

Le job `correction_prepare` exige :

- owner professeur exact ;
- `project_scope` et `batch_id` ;
- manifest de pré-correction existant ;
- manifest `validated` avec `validation_ref` ;
- `workflow_version` alignée ;
- `preflight_ref` explicite ;
- `source_kind = validated_pre_correction_manifest`.

Le payload du job ne contient que des références. Aucun contenu OCR, commentaire, preuve ou
score final n'est copié dans la queue.

## ExportPrepareRequest

Le job `export_prepare` exige :

- owner professeur exact ;
- preview d'export existante ;
- preview `approved_for_export` avec `validation_ref` ;
- batch, owner et scope alignés ;
- `preflight_ref` explicite ;
- `source_kind = approved_correction_export_preview`.

Le payload ne contient pas `preview_ref` de stockage privé. Il garde uniquement l'id de la
preview, le format et la cible déjà validés.

## Autorité

- teacher owner : peut créer les intentions ;
- admin/godmode : supervision en lecture via les endpoints jobs existants ;
- admin/godmode ne crée pas ces jobs à la place du propriétaire ;
- student/random user : refus ;
- aucune route HTTP de création générique ;
- aucune mutation runner exposée côté public.

## Runner attendu côté Vincent

Le runner doit consommer uniquement les jobs `queued` créés par ces services internes.

Contraintes :

- pas de création de job arbitraire ;
- pas de lecture de payload contenant des secrets ;
- progression monotone ;
- cancel/retry respectés ;
- erreurs lisibles ;
- sortie correction en `needs_review`, jamais en note finale ;
- sortie export en fichier privé à reviewer, jamais en publication ;
- logs utiles mais sans contenu privé ;
- audit par refs seulement.

## Hors scope

- runner correction ;
- renderer/exporter CSV/XLSX/PDF ;
- publication, envoi étudiant ou LMS ;
- endpoint public de création ;
- final score ;
- UI.

## Tests verrouillés

- manifest draft refusé ;
- preview non approuvée refusée ;
- validation_ref incohérente refusée ;
- owner-only strict ;
- payload sans `storage://private` ;
- job `queued` et événement `job_queued`.
