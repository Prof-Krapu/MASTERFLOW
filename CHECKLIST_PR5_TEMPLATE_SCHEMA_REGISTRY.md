# CHECKLIST PR-5 — Template Schema Registry

Statut : `BACKEND CHECKLIST / 2026-06-13`

## Intention

Versionner les structures que MasterFlow remplit, valide, affiche ou exporte : CDC, devis,
inscription event, manifest asset, guide bot, correction, cours.

## Table / migration

`schema_templates`

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

Statuts autorises :

```text
candidate | validated | deprecated | archived
```

## Seeds candidats

Ajouter des templates candidats, non canoniques :

- `cdc-template-candidate-v1`
- `quote-intake-candidate-v1`
- `event-registration-candidate-v1`
- `asset-manifest-candidate-v1`

Ces seeds servent a tester le registry. Ils ne doivent pas promettre que la verticale complete est
livree.

## Routes minimales

```text
GET /api/v1/schema-templates
GET /api/v1/schema-templates/:id
POST /api/v1/schema-templates
POST /api/v1/schema-templates/:id/validate
```

## Permissions attendues

- auth : lire les templates autorises ;
- teacher+ : creer un template `candidate` ;
- admin+ : valider un template ;
- student : ne valide jamais ;
- godmode/admin autorise : voit les diagnostics si le backend les expose ;
- aucun template public utilisable sans statut `validated`.

## Regles non negociables

- un template candidat n'est pas canonique ;
- une session fige `template_id` + `version` ;
- un LLM ne modifie pas le schema ;
- changement de schema = nouvelle version ;
- les domains publics exigent un template valide ;
- les templates `deprecated` et `archived` ne sont pas utilises par defaut.

## Tests minimum

- creation d'un candidat par teacher+ ;
- refus validation par student ;
- validation par admin+ ;
- schema invalide refuse ;
- template deprecated masque par defaut ;
- changement de schema cree ou exige une nouvelle version ;
- audit validation produit.

## Refus immediat

- modifier silencieusement un template deja utilise ;
- utiliser un template candidat pour public/export sans gate explicite ;
- laisser un LLM reecrire `schema_json` ;
- exposer des templates prives a un autre owner ;
- annoncer CDC/devis/event comme complet juste parce que le template existe.
