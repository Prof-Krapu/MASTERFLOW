# Submission Identity Link V1 — Livraison backend

Statut : `MERGED_MAIN_PR64_SHA_e0cf578`

## Livré

- liaison manuelle `submission -> student_identity_id` ;
- identité obligatoirement présente dans le roster versionné du snapshot ;
- aucune résolution automatique depuis un nom ou un alias ;
- liaison idempotente vers la même identité ;
- changement vers une autre identité refusé après confirmation ;
- submission terminée/processing verrouillée ;
- isolation owner/projet et audit minimal de la décision.

## Route

```txt
POST /api/v1/correction/submissions/:id/identity-link
```

Payload :

```yaml
context_snapshot_id: snapshot explicite du batch
student_identity_id: identité choisie dans le payload privé
```

## Vérification

```yaml
backend_tests: 363_passed
backend_typescript: passed
frontend_typescript: passed
frontend_build: passed
diff_check: passed
```

## Prochaine tranche

Créer une queue `identity_match_candidate` pour les noms/alias ambigus et une
surface professeur qui propose les candidats sans les confirmer automatiquement.
