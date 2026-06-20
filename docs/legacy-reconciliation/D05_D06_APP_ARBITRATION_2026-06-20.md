# Arbitrage apps pédagogie et correction — 2026-06-20

| App legacy | Décision | État canon/Git vérifié | Suite |
|---|---|---|---|
| `CORRECTOR_APP_RUNTIME` | `reduced` | D06 + contexte immuable, identité humaine et roster manuel sont sur `main` | restaurer barème/profil, lot, submissions, sample review et export sous validation |
| `REAL_WORLD_CORRECTION_RUNTIME_IMPLEMENTATION` | `restore_candidate` | ses garde-fous sont cohérents avec D06, mais le pipeline 100+ copies/OCR/recovery n'est pas livré | extraire une tranche scalable seulement après le workflow manuel complet |
| `STUDENT_MONITORING_AND_PEDAGOGICAL_SIGNAL_SYSTEM` | `canon_ready` | principes non disciplinaires repris ; dossier longitudinal absent | créer un Student Longitudinal Record teacher-scoped, sans scoring comportemental |
| `MASTERSCORE_APP_RUNTIME` | `deprecated` pour le core | compétition/scoreboard non requis pour la verticale correction | conserver comme éventuelle couche D10 événement, jamais comme mesure d'élève par défaut |
| `EXERCISE_AND_ASSIGNMENT_RUNTIME` | `canon_ready` | sujet guidé D05 existe ; assignment/submission scoped absent | restaurer assignments puis intake de rendus, sans upload/sync externe automatique |
| `PEDAGOGICAL_ANALYTICS_AND_DIAGNOSTICS` | `restore_candidate` | observabilité technique existe, analytics élève absents | seulement après dossier longitudinal, agrégats prudents et validation prof |
| `WOOCLAP_AND_INTERACTIVE_CLASSROOM_SYSTEM` | `future` | aucun connecteur/API ou runtime temps réel confirmé | conserver les formats pédagogiques comme contrat, pas promettre d'intégration Wooclap |

## Décision produit

La chaîne prioritaire D05/D06 devient :

```txt
sujet validé -> assignment scoped -> roster versionné -> submissions ambiguës en review
-> barème/profil validés -> lot contextualisé -> pré-correction candidate
-> sample review professeur -> feedback/export validé
```

Les analytics, la heatmap, les avatars, la gamification et le live classroom restent hors de cette
première chaîne afin d'éviter surveillance, score implicite et promesses runtime prématurées.
