# CHECKLIST — PR-2 Capability Registry

Statut : `IMPLEMENTATION CHECKLIST / 2026-06-13`

## Scope autorise

- table/seed `capabilities` ;
- schemas shared ;
- endpoints read-only ;
- diagnostic admin+ ;
- mapping minimal action registry -> capabilities ;
- tests.

## Fichiers probables

```text
packages/shared/src/index.ts
apps/backend/src/db/schema.ts
apps/backend/src/seeds/capability_registry_seed.v1.json
apps/backend/src/engines/capability_registry.ts
apps/backend/src/routers/capabilities.ts
apps/backend/src/index.ts
apps/backend/tests/capabilities.test.ts
SUIVI.md
```

## Champs minimum

```text
id
owner
label
description
canon_status
runtime_status
ui_status
risk_level
required_role
required_scope
feature_flag
endpoints_json
dependencies_json
recipes_json
created_at
updated_at
```

## Routes

```text
GET /api/v1/capabilities
GET /api/v1/capabilities/:id
GET /api/v1/diagnostics/capabilities
```

## Regles

- route publique interdite : auth requise ;
- diagnostics admin+ ;
- capability absente = UI ne montre rien ;
- `out_of_scope` = hidden ;
- `future/shell` = locked/readonly ;
- `live` exige endpoint reel + test + recette.

## Tests obligatoires

- student voit seulement capabilities autorisees ;
- admin/godmode voit diagnostics ;
- future non actionable ;
- out_of_scope masque ;
- live sans endpoint/test/recette refuse au seed ou au validate ;
- payloads conformes au shared.

## Definition de done

```text
npm test OK
npm run lint OK
git diff --check OK
SUIVI mis a jour
aucun bouton rendu live par cette PR
```

