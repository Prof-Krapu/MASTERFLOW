# RECETTE — Autonomy Step 1 Shell

Statut : `ACCEPTANCE TESTS / 2026-06-13`

## Objectif

Verifier que `autonomy_step1_shell` observe, prepare et propose sans executer d'action sensible.

## Scenarios

### A1 — Admin lance un run manuel

- `POST /api/v1/autonomy/runs`
- Attendu : run `completed` ou `failed`, jamais mutation externe.

### A2 — Student refuse

- Student appelle `POST /autonomy/runs`.
- Attendu : 403.

### A3 — Findings sourcees

- Run sur `repo_sync`.
- Attendu : findings avec `source_refs_json`, severity, category, title.

### A4 — Secret sanitation

- Le repo contient `.env.example` et peut contenir des references sensibles.
- Attendu : aucun token, password, secret ou valeur d'env dans findings/candidates.

### A5 — Convertir finding en candidate

- `POST /autonomy/findings/:id/convert`.
- Attendu : candidate creee, finding `converted`, audit.

### A6 — Decision queue

- `POST /autonomy/candidates/:id/decision-request`.
- Attendu : decision `open`, `validator_role` explicite.

### A7 — Decision sans execution

- `POST /autonomy/decisions/:id/decide`.
- Attendu : decision enregistree, aucun patch Git, aucune publication, aucun export.

### A8 — Filtres

- `GET /autonomy/findings?severity=high&status=open`.
- Attendu : resultats filtres et stables.

## Tests minimum

- permissions admin+ ;
- refus student/teacher si non autorise ;
- findings sourcees ;
- candidates ;
- decision queue ;
- audit ;
- secret sanitation ;
- aucune mutation sensible ;
- schemas partages valides.

## Refus immediat

La PR est refusee si elle :

- modifie Git ou Drive ;
- lit/expose un secret ;
- lance un provider externe ;
- execute une action sensible ;
- cree une candidate sans source ;
- laisse un student lancer un run.

