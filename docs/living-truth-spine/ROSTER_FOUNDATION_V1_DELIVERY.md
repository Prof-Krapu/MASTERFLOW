# Roster Foundation V1 — Livraison backend

Statut : `MERGED_MAIN_PR59_SHA_236add0`

## Intention produit

Permettre à un professeur de créer manuellement une cohorte privée et des versions
de roster traçables, sans dépendre de la mémoire d'une conversation.

## Livré

- tables additives `cohorts`, `student_identities`, `roster_versions`, `roster_members` ;
- contrats partagés Cohort/Roster ;
- service teacher-scoped avec permissions projet ;
- routes privées de création/lecture ;
- nouvelle version active sans réécriture des membres de la version précédente ;
- identité existante réutilisée uniquement par identifiant explicite dans le même scope ;
- audit de création cohorte/version.

## Routes

```txt
POST /api/v1/cohorts
GET  /api/v1/cohorts/:id
POST /api/v1/cohorts/:id/roster-versions
GET  /api/v1/cohorts/:id/roster-versions
GET  /api/v1/cohorts/:id/roster-versions/:versionId
```

## Garde-fous

- `teacher+` ;
- owner privé ou projet avec rôle editor minimum ;
- un godmode extérieur ne lit pas une cohorte owner-private ;
- aucun matching automatique par nom ou alias ;
- aucun import, synchronisation établissement, suppression ou migration de données existantes ;
- aucune activation sur la base live dans cette tranche.

## Vérification

```yaml
targeted_tests: 4_passed
backend_tests: 359_passed
backend_typescript: passed
frontend_typescript: passed
frontend_build: passed
diff_check: passed
```

## Écart restant vers le cas réel

Le roster existe désormais comme vérité versionnée. La prochaine tranche doit créer
le `correction_context_snapshot` immuable qui relie un batch à la version exacte du
roster, du sujet, du barème et des sources. La migration d'une base réelle reste
gated par sauvegarde et rollback.
