# SPEC — Capability Registry MasterFlow

Statut : `FOUNDATION SPEC / 2026-06-13`

## Objectif

Exposer ce qui existe reellement dans MasterFlow, ce qui est futur, ce qui est masque, et ce que
l'UI peut afficher sans mentir.

## Objet `capabilities`

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
required_scope nullable
feature_flag nullable
endpoints_json
dependencies_json
recipes_json
created_at
updated_at
```

## Statuts

`canon_status` suit `SPEC_STATUS_TAXONOMY.md`.

`runtime_status` :

```text
absent | shell | partial | live | deprecated | out_of_scope | blocked
```

`ui_status` :

```text
hidden | locked | visible_readonly | visible_actionable | admin_only
```

## Endpoints PR-1

| Endpoint | Permission | Effet |
|---|---|---|
| `GET /capabilities` | auth | liste selon role/scope |
| `GET /capabilities/:id` | auth | detail autorise |
| `GET /diagnostics/capabilities` | admin+ | vue complete |

PR-1 est read-only.

## Regles UI

- `runtime_status=absent` ou `out_of_scope` -> hidden.
- `runtime_status=shell` -> locked ou readonly.
- `runtime_status=partial` -> visible seulement avec limites.
- `runtime_status=live` -> actionable si permission et endpoint reels.
- absence de capability -> ne pas afficher.

## Tests minimum

- student ne voit pas admin-only ;
- godmode voit diagnostics ;
- capability future n'est pas actionable ;
- endpoint absent ne peut pas etre marque `live` ;
- chaque capability live a au moins une recette.

