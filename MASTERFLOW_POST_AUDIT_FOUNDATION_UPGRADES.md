# MASTERFLOW — Fondations post-audit a mettre en place

Statut : `CANON ORIENTATION / GIT MIRROR / 2026-06-12`

## 1. Pourquoi ce document existe

L'audit complet a montre que MasterFlow possede deja un canon large, mais que le runtime GitHub
reste un socle MVP. La priorite n'est pas d'ajouter des features dispersees. La priorite est de
mettre en place les **multiplicateurs systeme** qui rendront toutes les features suivantes plus
simples, plus sures et plus coherentes.

Ce document fixe les fondations evidentes a combler dans le canon et dans Git.

## 2. Principes

- Une feature n'existe pas si elle n'a pas contrat, donnees, permissions, endpoint/event, tests
  et surface UI non deceptive.
- Le canon peut decrire plus large que le runtime, mais Git doit toujours dire ce qui est reel.
- Le RAG, les outils externes, les runners et les exports ne sont jamais souverains : ils passent
  par permissions, Resource Truth, audit et validation graduee.
- Chaque nouvelle capability doit avoir une recette d'acceptation avant l'UI finale.

## 3. Fondations prioritaires

### F1 — Capability Registry reel

Objectif : exposer ce qui est reellement disponible.

Doit decrire :

- `capability_id` ;
- owner canonique ;
- statut canon/runtime ;
- endpoints reels ;
- permissions ;
- UI surfaces autorisees ;
- dependances ;
- feature flag ;
- recette d'acceptation.

Impact :

- evite les boutons fantomes ;
- evite l'UI deceptive ;
- permet au frontend de cacher/verrouiller proprement ;
- donne a godmode une carte lisible du systeme.

### F2 — Statuts normalises canon/runtime

Les statuts actuels du Drive sont utiles editorialement mais heterogenes. Il faut une taxonomie
commune :

```text
canon_spec
contract_ready
runtime_shell
runtime_partial
runtime_live
validated
deprecated
out_of_scope
blocked
```

Chaque owner ou capability doit pouvoir distinguer :

```text
maturite canon | artefact/factory disponible | implementation GitHub
```

### F3 — Project / Scope / Ownership

Objectif : sortir du role global plat.

Objets minimaux :

```text
projects
project_members
resource_scopes
room_members
ownership_edges
```

Impact :

- sessions guidees privees ;
- classes et evenements futurs ;
- ressources permissionnees ;
- RAG permissionne ;
- assets et exports attribues ;
- audit exploitable.

### F4 — RAG local permissionne + Resource Truth

Objectif : permettre a MasterFlow de retrouver son propre canon, ses contrats, ressources et
guides sans halluciner.

Regles :

- permission avant retrieval ;
- Resource Truth avant affichage comme source fiable ;
- resultats cites avec chemin/source/statut ;
- embeddings derives, jamais autorite ;
- reranking prudent ;
- revoke/reindex possible ;
- aucun hit vectoriel ne devient verite seul.

Architecture cible :

```text
SQLite runtime vivant
Drive/canon lisible
Resource Truth
Qdrant ou equivalent vectoriel
BGE embeddings + reranker
context packs permissionnes
```

### F5 — Jobs / queues / runners

Objectif : ne plus traiter les operations longues comme des actions synchrones.

Objets minimaux :

```text
jobs
job_events
job_logs
job_artifacts
```

Capacites :

- progress ;
- retry ;
- cancel ;
- timeout ;
- `needs_review` ;
- dry-run ;
- logs utiles mais sobres.

Necessaire pour RAG, assets, Comfy, OCR, exports, correction, imports et batchs.

### F6 — Template / Schema Registry

Objectif : remplacer les prompts caches par des schemas versionnes.

Doit couvrir :

- CDC ;
- devis ;
- event/inscription ;
- cours ;
- correction ;
- asset manifest ;
- bot guide.

Chaque template doit avoir :

```text
id, owner, domain, status, version, schema_json, required_fields, validation_rules, changelog
```

### F7 — Tool / Connector Gateway

Objectif : brancher Comfy, email, Drive, LLM externes, local models et exports sans ouvrir des
outils bruts au runtime.

Regles :

- allowlist ;
- permission par outil ;
- preflight ;
- dry-run quand possible ;
- quotas ;
- logs ;
- secrets hors BDD ;
- resultats rattaches a un owner/scope.

### F8 — Observabilite workflow

Le suivi token est un debut. Il faut observer les workflows, pas seulement les appels LLM.

Mesures utiles :

- cout par workflow ;
- latence ;
- erreurs ;
- taux de completion ;
- points de friction ;
- retries ;
- validations demandees/acceptees/refusees ;
- jobs bloques ;
- usage par capability.

### F9 — Acceptance recipes systematiques

Chaque capability doit avoir :

- recette backend ;
- recette UI ;
- payloads de reference ;
- tests minimum ;
- criteres de refus ;
- statut de validation.

Ce pattern est initie par :

- `RECETTE_PR1_GUIDED_RUNTIME.md` ;
- `RECETTE_UI_PR1_GUIDED_RUNTIME.md`.

### F10 — Politique de validation graduee

Reference :

- `POLITIQUE_VALIDATION_GRADUEE.md`

Regle :

```text
permission_check toujours
preflight selon action
validation humaine selon risque/scope/effet
validation renforcee seulement pour critique
```

## 4. Ordre recommande

```text
1. Capability Registry + statuts normalises
2. Project / Scope / Ownership
3. Template / Schema Registry
4. RAG permissionne + Resource Truth
5. Jobs / queues / runners
6. Tool / Connector Gateway
7. Observabilite workflow
8. Recettes systematiques par capability
```

MOTH/CDC reste une bonne verticale de preuve, mais elle doit consommer ces fondations au lieu de
les contourner.

## 5. Traduction Git attendue

PRs courtes recommandees :

1. `capability_registry_shell` : schemas, seed, endpoint read-only, statut runtime.
2. `status_taxonomy` : enums partages + mapping des actions/capabilities existantes.
3. `project_scope_shell` : projets, memberships, ownership minimal.
4. `template_registry_shell` : templates versionnes dont CDC candidat.
5. `guided_runtime_pr1` : MOTH/CDC prive sur fondations disponibles.
6. `rag_capability_shell` : manifests, permission checks, pas encore ingestion massive.
7. `jobs_shell` : jobs et logs pour operations longues.

## 6. Traduction canon attendue

Le Drive canon doit contenir cette note dans `01_CORE` et la relier aux owners :

- `permission_runtime` ;
- `resource_truth_engine` ;
- `core_runtime_resolution` ;
- `command_center_runtime` ;
- `generated_asset_runtime` ;
- `guidance_engine` ;
- `observability_engine` ;
- `connector_runtime_engine` ;
- `job_and_task_orchestration`.

## 7. Critere de coherence

Une amelioration est valide si elle :

- reduit l'ambiguite entre canon et runtime ;
- diminue la friction sans retirer les gates ;
- rend les futures features plus faciles a tester ;
- aide le frontend a ne pas inventer ;
- garde les donnees personnelles privees par defaut ;
- rend les sources et decisions auditables.

