# CHECKLIST — PR-1 autonomy_step1_shell

Statut : `IMPLEMENTATION CHECKLIST / 2026-06-13`

## Scope autorise

- `autonomy_runs`
- `autonomy_findings`
- `improvement_candidates`
- `decision_queue`
- checks read-only
- routes admin+
- audit
- tests

## Fichiers probables

```text
packages/shared/src/index.ts
apps/backend/src/db/schema.ts
apps/backend/src/engines/autonomy_step1.ts
apps/backend/src/routers/autonomy.ts
apps/backend/src/index.ts
apps/backend/tests/autonomy_step1.test.ts
SUIVI.md
```

## Migration attendue

Tables :

```text
autonomy_runs
autonomy_findings
improvement_candidates
decision_queue
```

Contraintes :

- UUID partout sauf choix justifie ;
- timestamps epoch ms ;
- champs flexibles suffixes `_json` ;
- index sur status, severity, run_id, candidate_id.

## Routes attendues

```text
POST /api/v1/autonomy/runs
GET /api/v1/autonomy/runs
GET /api/v1/autonomy/runs/:id
GET /api/v1/autonomy/findings
POST /api/v1/autonomy/findings/:id/acknowledge
POST /api/v1/autonomy/findings/:id/convert
GET /api/v1/autonomy/candidates
POST /api/v1/autonomy/candidates/:id/decision-request
GET /api/v1/autonomy/decisions
POST /api/v1/autonomy/decisions/:id/decide
```

## Permissions

- routes admin+ par defaut ;
- decision peut exiger `validator_role` ;
- student/teacher non autorises sauf decision explicite future ;
- aucune permission deduite d'un persona.

## Checks read-only PR-1

Autorises :

- presence des fichiers de sync ;
- presence de recettes pour capabilities connues ;
- coherence `future/live/out_of_scope` ;
- existence de fichiers attendus ;
- incoherences simples spec/recette/registry.

Interdits :

- lire `.env` ;
- appeler internet/provider ;
- modifier Git/Drive ;
- executer patch ;
- lancer runner ;
- indexer massivement le canon.

## Tests obligatoires

- admin lance run ;
- student refuse ;
- run cree finding source ;
- finding converti en candidate ;
- candidate cree decision ;
- decision ne mute rien ;
- audit transitions ;
- secret sanitation ;
- filtres findings ;
- lint/typecheck.

## Refus immediat

- secret expose ;
- mutation sensible ;
- endpoint public ;
- absence d'audit ;
- absence de tests permission ;
- action automatique sur Git/Drive ;
- statut runtime modifie par decision sans autre PR.

## Definition de done

```text
npm test OK
npm run lint OK
git diff --check OK
SUIVI mis a jour
recette A1-A8 satisfaite
```

