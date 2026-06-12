# CHECKLIST PR-4 — Project Scope Ownership

Statut : `BACKEND CHECKLIST / 2026-06-13`

## Intention

Introduire une couche minimale de projet, membership, ownership et scope ressource, sans
construire encore les verticales produit.

## Tables / migrations

- `projects`
  - `id`
  - `owner_id`
  - `name`
  - `status`
  - `visibility`
  - `created_at`
  - `updated_at`
- `project_members`
  - `project_id`
  - `user_id`
  - `role`
  - `created_at`
- `ownership_edges`
  - `id`
  - `owner_type`
  - `owner_id`
  - `object_type`
  - `object_id`
  - `scope`
  - `created_at`
- `resource_scopes`
  - `resource_id`
  - `scope_type`
  - `scope_id`
  - `access_level`
  - `created_at`

Roles membres :

```text
viewer | participant | editor | owner | admin
```

## Contrats partages

Ajouter ou exposer les types :

- `Project`
- `ProjectMember`
- `ProjectMemberRole`
- `OwnershipEdge`
- `ResourceScope`
- `ScopedPermissionDecision`

## Routes minimales

```text
POST /api/v1/projects
GET /api/v1/projects
GET /api/v1/projects/:id
POST /api/v1/projects/:id/members
GET /api/v1/projects/:id/members
```

## Permissions attendues

- utilisateur authentifie : liste uniquement ses projets autorises ;
- `teacher+` : cree un projet prive ;
- owner/admin projet : ajoute un membre ;
- membre projet : lit le detail et les membres ;
- non-membre : refuse sans fuite de donnees ;
- persona/lore/bot : ne donne jamais de droit par lui-meme.

## Helper attendu

La decision permissionnelle doit pouvoir combiner :

```text
global role + project membership + ownership edge + resource scope + action risk
```

Le nom exact peut suivre le code existant, mais il faut un point d'entree testable.

## Tests minimum

- un student voit seulement les projets dont il est membre ;
- un non-membre ne lit pas un projet ;
- un owner ajoute un membre ;
- un editor ne peut pas ajouter un owner si la policy l'interdit ;
- une ressource hors projet est bloquee ;
- l'ajout de membre produit un audit event ;
- les routes refusent les requetes non authentifiees.

## Refus immediat

- exposer tous les projets a tous les users ;
- autoriser une action parce que le persona semble admin ;
- rendre les projets publics par defaut ;
- coupler cette PR a une UI finale ;
- importer les classes, events ou organisations completes dans cette PR.
