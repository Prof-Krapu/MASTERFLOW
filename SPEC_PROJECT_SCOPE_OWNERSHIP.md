# SPEC — Project / Scope / Ownership

Statut : `FOUNDATION SPEC / 2026-06-13`

## Objectif

Sortir du role global plat et donner a MasterFlow une base permissionnelle par projet, objet,
room, ressource et session.

## Objets minimaux

### `projects`

```text
id
owner_id
name
status
visibility
created_at
updated_at
```

### `project_members`

```text
project_id
user_id
role
created_at
```

Roles :

```text
viewer | participant | editor | owner | admin
```

### `ownership_edges`

```text
id
owner_type
owner_id
object_type
object_id
scope
created_at
```

### `resource_scopes`

```text
resource_id
scope_type
scope_id
access_level
created_at
```

## Regle permission

```text
can(user, action, object, context)
= role global + membership + ownership + object scope + action risk
```

## Endpoints PR-1

| Endpoint | Permission | Effet |
|---|---|---|
| `POST /projects` | teacher+ | cree projet prive |
| `GET /projects` | auth | liste projets autorises |
| `GET /projects/:id` | member | detail |
| `POST /projects/:id/members` | owner/admin | ajoute membre |
| `GET /projects/:id/members` | member | liste membres |

## Tests minimum

- student voit seulement ses projets ;
- non-member refuse ;
- owner ajoute membre ;
- project scope bloque une ressource hors projet ;
- audit membership.

