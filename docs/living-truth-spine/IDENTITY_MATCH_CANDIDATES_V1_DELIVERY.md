# Identity Match Candidates V1 — Livraison backend

Statut : `LOCAL_VERIFIED_PENDING_MERGE`

## Livré

- détection déterministe par égalité normalisée du nom ou d'un alias ;
- résultat toujours `pending`, même avec un seul match ;
- plusieurs identités candidates conservées sans liaison automatique ;
- décision professeur `confirm` ou `reject` ;
- confirmation limitée à la liste proposée et reliée au roster du snapshot ;
- seconde décision et accès hors scope refusés.

## Routes

```txt
POST /api/v1/correction/submissions/:id/identity-match-candidates
POST /api/v1/correction/identity-match-candidates/:id/decision
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

Surface professeur : afficher le libellé observé, les candidats du roster, leurs
alias et les choix confirmer/rejeter, sans exposer les données hors scope.
