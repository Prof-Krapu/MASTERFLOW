# SPEC — PR-C3 Pré-correction explicable

Statut : `FOUNDATION IMPLEMENTED / INTERNAL ONLY / NEEDS REVIEW / 2026-06-13`

## Objectif

Absorber le `scoring_trace` canonique de Corrector sans produire de note finale automatique.

```text
manifest validé
-> rubrique validée
-> copie privée + preuves utilisables
-> score brouillon par critère
-> confiance + commentaire par référence
-> needs_review
-> future décision professeur distincte
```

## Sources canon

- `04_ENGINES/CORRECTOR_RUNTIME_AND_FEEDBACK_ENGINE.md`, section 5.2 ;
- `04_ENGINES/BATCH_CORRECTION_AND_REVIEW_PIPELINE_SYSTEM.md`, sections 5.1–5.2 ;
- `03_APPS/CORRECTOR_APP_RUNTIME.md`, sections 7.4–7.5 ;
- `02_CONTRACTS/BACKGROUND_JOB_EXECUTION_AND_CHAT_CONTINUITY_CONTRACT.md`, section 10.

Ces sources imposent critère, preuves, score brouillon, confiance et validation professeur.

## Objets

### PreCorrectionRunDraft

Enveloppe une analyse pour une seule submission et référence :

- manifest, batch, owner et scope ;
- rubrique et profil institutionnel ;
- type d'analyse ;
- snapshot de preuves ;
- version de méthode et éventuel profil modèle ;
- brouillons de scores et raisons de review.

Son seul statut possible est `needs_review`.

### CriterionScoreDraft

Proposition pour un critère exact de la rubrique :

- score borné par `max_points` ;
- une ou plusieurs preuves ;
- confiance bornée entre 0 et 1 ;
- commentaire lourd conservé par référence ;
- statut `candidate`, `rejected` ou `superseded`.

Le contrat ne possède ni note finale, ni calibration, ni statut validé.

## Gates du dépôt interne

`recordPreCorrectionDraft` :

1. exige au moins le rôle teacher ;
2. limite un teacher à ses propres objets ;
3. exige un manifest humainement validé ;
4. aligne owner, scope, batch, submission, rubrique et profil ;
5. exige une rubrique validée et tous ses critères exactement une fois ;
6. refuse les preuves absentes, rejetées, archivées ou hors scope ;
7. n'accepte un profil modèle que s'il est validé pour `criterion_analysis` ;
8. force le run en `needs_review` et les scores en `candidate` ;
9. audite uniquement les références et compteurs non sensibles.

## Hors scope

- runner LLM ou OCR ;
- route publique ;
- score total ou note finale ;
- calibration de cohorte ;
- feedback étudiant ;
- validation professeur et export ;
- règles de sujet codées en dur ;
- UI.

## Suite

PR-C4 pourra calculer des diagnostics de cohorte et préparer le contrôle qualité. Elle devra
conserver le score brut, séparer tout delta de calibration et exiger une décision professeur
avant qu'une note finale puisse exister.
