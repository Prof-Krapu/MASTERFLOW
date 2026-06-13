# SPEC — PR-C1 Rubriques, profils institutionnels, batches et manifests

Statut : `FOUNDATION IMPLEMENTED / PROJECT BRIDGE / NO EXECUTION / 2026-06-13`

## Objectif

Poser les objets de référence nécessaires à une correction traçable sans lancer de pipeline,
calculer de note ou exposer une UI fictive.

```text
rubric template
-> immutable rubric version
-> institutional grading profile
-> correction batch
-> private submissions
-> pre-correction manifest
-> future human validation
-> future jobs
```

## Objets

### RubricTemplate

Conteneur réutilisable appartenant à un owner et un scope. Il peut pointer vers une version
courante, mais ne contient pas lui-même le barème.

### RubricVersion

Version explicite des critères :

- poids dont la somme vaut 1 ;
- points dont la somme correspond au total ;
- exigences de preuves par critère ;
- auteur, scope et statut ;
- aucune modification silencieuse d'une version validée.

### InstitutionalGradingProfile

Décrit une échelle et des repères institutionnels. Pour le profil MALEX :

```text
moins de 10  = minimum non atteint
13–14        = zone attendue de cohérence
17+          = exceptionnel
```

Ce profil ne force jamais la moyenne d'une cohorte. Son unique mode actuel est
`diagnostic_then_teacher_validation`. Les seuils protégés, notamment 10, exigent une validation
humaine avant tout futur franchissement par calibration.

### CorrectionBatch

Regroupe une rubrique versionnée, un profil institutionnel et des submissions dans un scope.
PR-C1 ne fournit aucun runner pour passer de `draft` à `running`.

### SubmissionRecord

Référence privée vers une `EvidenceEvent`. L'identité peut rester inconnue ou candidate. Une
submission ne contient pas de note finale.

### PreCorrectionManifest

Fige les références nécessaires à un futur run :

- batch ;
- rubrique versionnée ;
- profil institutionnel ;
- liste de submissions ;
- version du workflow ;
- validation humaine.

Tout état autre que `draft` ou `rejected` exige `validation_ref`.

## Invariants

- owner et `project_scope` obligatoires ;
- `project_id` nullable pour compatibilite legacy ;
- si `project_id` est present, `project_scope` doit lui etre identique et toute la chaine
  rubrique/profil/batch/submission/manifest doit viser ce meme projet ;
- les objets sans `project_id` restent dans le mode owner-only historique ;
- données étudiantes privées par défaut ;
- version et provenance obligatoires ;
- aucune moyenne imposée ;
- aucun score, feedback ou export dans PR-C1 ;
- aucune exécution sans manifest validé ;
- aucune route publique ;
- aucune feature marquée `live`.

## Implémentation

- schémas Zod dans `packages/shared/src/index.ts` ;
- tables et index idempotents dans `apps/backend/src/db/schema.ts` ;
- tests des cohérences de barème et bandes de notation ;
- tests de persistance et du gate de validation du manifest.
- bridge Project/Scope idempotent, avec index projet sur chaque objet de reference.

## Suite

PR-C2 pourra brancher ingestion et jobs sur ces objets. Elle devra consommer des versions
validées et ne jamais reconstruire implicitement un barème depuis le code historique.
