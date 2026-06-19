# Correction Context Snapshot V1 — Livraison backend

Statut : `LOCAL_VERIFIED_PENDING_MERGE`

## Livré

- snapshot unique et immuable par batch de correction ;
- références exactes de cohorte, version de roster, version de barème, sujet,
  sources et profil de contexte ;
- création limitée aux batches `draft` ou `ready` ;
- lecture owner-private ou projet editor+ ;
- ancienne version du roster toujours relisible après activation d'une nouvelle ;
- aucune route update/delete du snapshot.

## Routes

```txt
POST /api/v1/correction/batches/:id/context-snapshot
GET  /api/v1/correction/batches/:id/context-snapshot
```

## Vérification

```yaml
targeted_tests: 7_passed
backend_tests: 362_passed
backend_typescript: passed
frontend_typescript: passed
frontend_build: passed
diff_check: passed
```

## Frontières conservées

- aucun import de roster, transcript ou fichier ;
- aucun matching automatique d'identité ;
- aucune note/feedback final automatique ;
- aucune modification des batches ou résultats historiques ;
- aucune activation sur base live sans sauvegarde et rollback.

## Prochaine tranche

Le pre-correction manifest/run doit exiger et recopier la référence du snapshot,
afin que tout futur traitement charge ce contexte exact plutôt que la dernière
conversation ou la dernière version disponible.
