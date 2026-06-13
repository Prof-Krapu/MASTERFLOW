# RECETTE — Capability Registry + Status Taxonomy

Statut : `ACCEPTANCE TESTS / 2026-06-13`

## Objectif

Verifier que MasterFlow sait distinguer :

```text
documente
preparable
partiel
live
masque
bloque
hors scope
```

## Scenarios

### C1 — Student ne voit pas admin-only

- Login student.
- `GET /capabilities`.
- Attendu : pas de capability admin/godmode.

### C2 — Godmode voit diagnostics

- Login godmode.
- `GET /diagnostics/capabilities`.
- Attendu : toutes les capabilities + evidence.

### C3 — Future non actionable

- Capability `runtime_status=shell`.
- Attendu : `ui_status=locked` ou `visible_readonly`, jamais `visible_actionable`.

### C4 — Out of scope masque

- Capability `out_of_scope`.
- Attendu : hidden pour utilisateurs standards.

### C5 — Live exige evidence

- Seed tente `runtime_status=live` sans endpoint ou recette.
- Attendu : rejet ou downgrade prudent.

### C6 — Statut legacy

- Entrer un statut type `CORE V1` ou `DEPLOYMENT_READY`.
- Attendu : normalisation prudente, pas `live` automatique.

### C7 — UI peut faire confiance au registry

- Capability absente.
- Attendu : l'UI ne doit rien afficher.

## Tests minimum

- permissions ;
- mapping ;
- fallback legacy ;
- evidence live ;
- diagnostics admin ;
- no accidental live.

## Refus immediat

- feature marquee live sans endpoint ;
- feature visible actionable sans permission ;
- out_of_scope visible standard ;
- statut canon interprete comme runtime live ;
- diagnostics accessibles student.

