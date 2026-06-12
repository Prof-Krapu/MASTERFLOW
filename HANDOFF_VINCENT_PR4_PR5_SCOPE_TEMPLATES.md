# HANDOFF VINCENT — PR-4/PR-5 Project Scope + Template Registry

Statut : `HANDOFF BACKEND / 2026-06-13`

## Objectif

Apres `autonomy_step1_shell`, `capability_registry_shell` et `status_taxonomy`, poser les deux
fondations qui empechent les verticales MasterFlow de flotter sans ownership ni schema :

- PR-4 : `project_scope_shell` ;
- PR-5 : `template_schema_registry`.

Ces deux PRs doivent rester courtes et separees. PR-4 definit qui possede quoi. PR-5 definit
quelle structure MasterFlow remplit, valide ou affiche.

## Pourquoi maintenant

MOTH/CDC, Ours d'Or, devis, cours, DA/assets, correction et RAG ont tous besoin des memes
questions de base :

```text
qui possede cet objet ?
qui peut le lire ?
qui peut le modifier ?
dans quel projet / scope vit-il ?
quel template versionne est utilise ?
ce template est-il candidat, valide, deprecie ou archive ?
```

Sans ces fondations, chaque verticale risque de recreer son propre mini-systeme de permissions,
de statuts et de schemas.

## PR-4 — `project_scope_shell`

Reference : `SPEC_PROJECT_SCOPE_OWNERSHIP.md`.

Livrer le shell minimal :

- tables `projects`, `project_members`, `ownership_edges`, `resource_scopes` ;
- routes projets privees ;
- premier helper permissionnel objet/scope ;
- audit membership et ownership ;
- tests de non-fuite entre projets.

Ne pas livrer encore :

- orgs completes ;
- classes/cours complets ;
- events publics ;
- rooms publiques ;
- UI finale ;
- import massif de ressources.

## PR-5 — `template_schema_registry`

Reference : `SPEC_TEMPLATE_SCHEMA_REGISTRY.md`.

Livrer le registry minimal :

- table `schema_templates` ;
- statuts `candidate`, `validated`, `deprecated`, `archived` ;
- routes lecture, creation candidat, validation admin ;
- seeds candidats CDC, devis, event, asset manifest ;
- validation JSON schema basique ;
- audit validation.

Ne pas livrer encore :

- moteur conversationnel complet ;
- generation LLM ;
- publication publique ;
- marketplace de templates ;
- editeur visuel final.

## Dependances

Ordre recommande :

1. PR-4 `project_scope_shell` ;
2. PR-5 `template_schema_registry`.

Raison : les templates, guides, sessions et ressources doivent pouvoir etre rattaches a un
owner/scope clair. Si PR-5 part avant PR-4, garder `owner_id` simple et prevoir l'attache projet
dans la PR suivante.

## Acceptation globale

Chaque PR doit fournir :

- contrats partages ;
- migration explicite ;
- endpoints gates ;
- tests unitaires/integration ;
- audit events utiles ;
- recette passee ou table d'ecarts ;
- aucune feature marquee `live` sans preuve runtime.

## Punchline utile

Pas de Hadoken dans le vide : chaque objet MasterFlow doit avoir un owner, un scope, un statut
et un schema avant d'entrer sur le terrain.
