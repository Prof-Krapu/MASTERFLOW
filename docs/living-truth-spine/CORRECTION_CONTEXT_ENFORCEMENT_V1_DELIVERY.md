# Correction Context Enforcement V1 — Livraison backend

Statut : `MERGED_MAIN_PR61_SHA_a5fca40`

## Livré

- `context_snapshot_id` porté par le manifest et le run de pré-correction ;
- refus explicite d'un nouveau run si le manifest n'a pas de snapshot ;
- contrôle d'égalité manifest/run et cohérence snapshot/batch/owner/projet/barème ;
- référence conservée dans le run et son DTO ;
- migration additive compatible avec une base existante : colonnes avant index ;
- anciens enregistrements lisibles, enforcement au point de création des nouveaux runs.

## Invariant obtenu

```txt
new pre-correction run
-> validated manifest
-> immutable correction context snapshot required
-> same batch / owner / project / rubric
-> needs_teacher_review output only
```

## Vérification

```yaml
targeted_tests: 11_passed
backend_tests: 363_passed
backend_typescript: passed
frontend_typescript: passed
frontend_build: passed
diff_check: passed
```

## Prochaine tranche

Compiler un read model privé à partir du snapshot : membres exacts du roster,
aliases, sujet, barème et source refs. Le futur runner devra consommer ce payload
borné, jamais rechercher « la dernière liste » dans la conversation.
