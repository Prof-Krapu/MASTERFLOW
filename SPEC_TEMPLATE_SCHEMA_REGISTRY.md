# SPEC — Template / Schema Registry

Statut : `BACKEND IMPLEMENTED / 2026-06-13`

## Objectif

Versionner les structures que MasterFlow remplit ou valide : CDC, devis, event, cours,
correction, asset manifest, bot guide.

## Objet `schema_templates`

```text
id
domain
name
status
version
owner_id nullable
schema_json
required_fields_json
validation_rules_json
ui_hints_json nullable
changelog
created_at
updated_at
```

Statuts :

```text
candidate | validated | deprecated | archived
```

## Regles

- un template candidat n'est pas canonique ;
- une session fige `template_id` + `version` ;
- un LLM ne modifie pas le schema ;
- changement de schema = nouvelle version ;
- chaque domaine public exige template valide.

## Templates initiaux

- `cdc-template-candidate-v1` ;
- `quote-intake-candidate-v1` ;
- `event-registration-candidate-v1` ;
- `asset-manifest-candidate-v1`.

## Endpoints PR-5

| Endpoint | Permission | Effet |
|---|---|---|
| `GET /schema-templates` | auth | liste autorisee |
| `GET /schema-templates/:id` | auth | detail |
| `POST /schema-templates` | teacher+ | cree candidat |
| `POST /schema-templates/:id/validate` | admin+ | valide |

## Tests minimum

- version figee en session ;
- student ne valide pas ;
- deprecated non utilise par defaut ;
- schema invalide refuse ;
- audit validation.

## Implementation livree

- contrats partages : `SchemaTemplate`, domaines, statuts et
  `CreateSchemaTemplateRequest` ;
- migration SQLite : `schema_templates` ;
- seeds candidats non canoniques : CDC, devis, inscription event, manifest asset ;
- service interne : liste, detail, creation candidate, validation admin ;
- routes : `GET/POST /schema-templates`, `GET /schema-templates/:id`,
  `POST /schema-templates/:id/validate` ;
- templates owner-prives masques aux autres owners ;
- `deprecated` et `archived` masques par defaut ;
- validation basique du schema : `type = object`, `properties` non vide,
  `required_fields` coherents ;
- doublon `domain/name/version/owner` refuse ;
- audit : `schema_template.created`, `schema_template.validated` ;
- tests service + router.

## Verification

```text
npm test
npm run lint
npm run lint:frontend
npm run build:frontend
git diff --check
```
