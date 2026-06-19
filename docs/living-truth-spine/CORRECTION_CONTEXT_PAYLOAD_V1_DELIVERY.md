# Correction Context Payload V1 — Livraison backend

Statut : `MERGED_MAIN_PR62_SHA_53efad0`

## Livré

- compilateur read-only depuis le snapshot immuable ;
- cohorte, période, version de roster, membres et alias exacts ;
- références du sujet, barème, sources et profil de processus ;
- ancienne version compilée même après activation d'un roster plus récent ;
- payload toujours `private`, soumis aux mêmes permissions que le batch ;
- aucune lecture du contenu brut des transcripts/sources.

## Route

```txt
GET /api/v1/correction/batches/:id/context-payload
```

## Invariant obtenu

```txt
conversation history != correction context
immutable snapshot -> bounded private payload -> future runner
```

## Vérification

```yaml
targeted_tests: 9_passed
backend_tests: 363_passed
backend_typescript: passed
frontend_typescript: passed
frontend_build: passed
diff_check: passed
```

## Prochaine tranche

Relier explicitement chaque submission à un `student_identity_id` présent dans le
roster figé. Les noms/alias ambigus doivent rester `candidate`/review ; aucune
fusion automatique n'est autorisée.
