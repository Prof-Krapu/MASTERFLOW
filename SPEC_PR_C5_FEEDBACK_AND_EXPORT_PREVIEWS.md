# SPEC — PR-C5 Feedback student-safe et previews d'export

Statut : `FOUNDATION IMPLEMENTED / INTERNAL ONLY / NO PUBLICATION / 2026-06-13`

## Objectif

Préparer des feedbacks étudiants structurés puis des exports privés supervisés, sans transformer
une pré-correction en note finale, fichier diffusé ou publication.

```text
pré-correction PR-C3
-> feedback structuré par références privées
-> validation owner professeur
-> preview export CSV/XLSX/PDF/report
-> validation owner de l'export
-> futur job export_prepare
-> future review du fichier
-> publication séparée et hors PR-C5
```

## Sources canon

- `04_ENGINES/CORRECTOR_RUNTIME_AND_FEEDBACK_ENGINE.md`, section 12 ;
- `02_CONTRACTS/PEDAGOGICAL_DELIVERY_EVIDENCE_AND_STUDENT_SAFE_CONTRACT.md` ;
- `04_ENGINES/EXPORT_ENGINE.md` ;
- `02_CONTRACTS/OUTPUT_EXPORT_ROUTING_AND_CANDIDATE_FORMAT_CONTRACT.md` ;
- `03_APPS/CORRECTOR_APP_RUNTIME.md`.

## FeedbackDraft

Le feedback conserve par références privées :

- force observée ;
- problème observé ;
- preuves ;
- version de méthode et éventuel profil modèle validé ;
- impact sur le travail ;
- axe pédagogique ;
- prochaine action concrète ;
- critère de progression ;
- ton et cohérence avec l'évaluation.

Il exige toujours une validation professeur. Le contenu lourd n'est pas copié en BDD ou dans
l'audit. Un feedback approuvé reste un contenu pédagogique validé, pas une note finale.

## CorrectionExportPreview

La preview déclare :

- owner, batch et scope ;
- format `csv`, `xlsx`, `pdf` ou `report` ;
- cible `teacher_download` ou `manual_injection` ;
- feedbacks approuvés et runs sources exacts ;
- référence privée de preview et version de schéma ;
- données privées présentes ;
- validation humaine obligatoire ;
- `publication_allowed = false` structurellement.

L'approbation `approved_for_export` autorise uniquement une future préparation de package.
Elle ne crée aucun job, fichier final, lien de livraison ou publication.

## Autorité

- teacher owner : création et décisions ;
- admin/godmode : supervision en lecture ;
- admin/godmode ne remplace pas la validation pédagogique de l'owner ;
- aucune route publique ;
- aucune destination externe.

Les validations feedback et export portent sur deux objets différents. Elles ne constituent pas
une double validation répétitive : l'une approuve le contenu pédagogique, l'autre le package et
sa destination.

## Hors scope

- génération textuelle du feedback ;
- rendu CSV/XLSX/PDF ;
- job `export_prepare` ;
- note finale ;
- publication ou envoi étudiant ;
- LMS/API externe ;
- UI.

## Suite

Le prochain raccord pourra créer un job `export_prepare` uniquement depuis une preview
`approved_for_export`, puis terminer le fichier en `needs_review`. La publication restera une
action distincte et sensible.
