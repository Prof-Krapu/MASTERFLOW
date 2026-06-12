# SPEC — Autonomie encadree step 1

Statut : `PROPOSAL / ACCEPTANCE READY / 2026-06-13`

## 1. Objectif

Mettre en place un premier systeme autonome MasterFlow capable de :

- observer l'etat Git/canon/runtime ;
- detecter des incoherences ;
- preparer des findings actionnables ;
- proposer une prochaine action ;
- ouvrir des candidats d'amelioration ;
- alimenter une decision queue.

Il ne doit pas :

- publier ;
- envoyer ;
- deployer ;
- modifier le canon ;
- modifier une ressource ;
- executer une action sensible ;
- lancer un outil externe puissant ;
- contourner une validation humaine.

Formule :

```text
autonomie step 1 = read-only checks + findings + candidates + decision queue
```

## 2. Position dans MasterFlow

Owner propose :

```text
autonomy_step1_runtime
```

Owners relies :

- `core_runtime_resolution` ;
- `permission_runtime` ;
- `resource_truth_engine` ;
- `observability_engine` ;
- `command_center_runtime` ;
- `guidance_engine` ;
- `job_and_task_orchestration` plus tard.

Le runtime autonome est un orchestrateur prudent. Il ne remplace aucun engine metier.

## 3. Objets de donnees

### `autonomy_runs`

Trace chaque analyse autonome.

```text
id
trigger
initiator_user_id nullable
scope_type
scope_id nullable
status
started_at
completed_at nullable
summary_json
created_at
```

`trigger` :

```text
manual | git_change | inbox_check | scheduled_check | recipe_check
```

`status` :

```text
running | completed | failed | cancelled
```

### `autonomy_findings`

Constat factuel, source, non encore decision.

```text
id
run_id
severity
category
title
description
source_refs_json
affected_owner
affected_capability
status
created_at
```

`severity` :

```text
info | low | medium | high | critical
```

`category` :

```text
canon_git_drift
ui_deceptive_risk
permission_gap
missing_recipe
runtime_missing
test_gap
security_risk
data_quality
workflow_friction
```

`status` :

```text
open | acknowledged | converted | dismissed
```

### `improvement_candidates`

Proposition d'amelioration issue d'un finding ou d'un usage.

```text
id
finding_id nullable
proposed_by
target_owner
target_capability
proposal_type
title
rationale
expected_impact
risk_level
required_gate
status
created_at
updated_at
```

`proposal_type` :

```text
patch_spec
patch_runtime
add_recipe
add_test
clarify_canon
defer
quarantine
```

`status` :

```text
candidate | accepted_for_planning | rejected | implemented | archived
```

### `decision_queue`

File des decisions humaines attendues.

```text
id
candidate_id nullable
requested_by
decision_type
question
options_json
recommended_option nullable
status
validator_role
decided_by nullable
decision_note nullable
created_at
decided_at nullable
```

`decision_type` :

```text
approve_scope
choose_priority
accept_risk
reject_candidate
request_implementation
request_review
```

## 4. Contrat REST PR-1

Base : `/api/v1`.

| Endpoint | Permission | Effet |
|---|---|---|
| `POST /autonomy/runs` | admin+ ou godmode | lance une analyse read-only |
| `GET /autonomy/runs` | admin+ | liste les runs autorises |
| `GET /autonomy/runs/:id` | admin+ | lit run + resume |
| `GET /autonomy/findings` | admin+ | liste findings filtres |
| `POST /autonomy/findings/:id/acknowledge` | admin+ | marque acknowledged |
| `POST /autonomy/findings/:id/convert` | admin+ | cree candidate depuis finding |
| `GET /autonomy/candidates` | admin+ | liste candidates |
| `POST /autonomy/candidates/:id/decision-request` | admin+ | cree une decision humaine |
| `GET /autonomy/decisions` | admin+ | liste decision queue |
| `POST /autonomy/decisions/:id/decide` | role requis | enregistre decision |

PR-1 ne doit exposer aucun endpoint d'execution de patch, publication, email, export ou outil.

## 5. Checks read-only autorises en PR-1

La PR-1 peut analyser :

- `SUIVI.md` ;
- `INBOX_VINCENT.md` ;
- `INBOX_MALEX.md` si present ;
- `SYNC_THREAD_MALEX_VINCENT.md` ;
- capability/action registry existant ;
- recettes `RECETTE_*.md` ;
- status des actions `live/future/out_of_scope` ;
- presence de fichiers attendus ;
- coherence basique entre spec, recette et registry.

Elle ne doit pas :

- lire des secrets ;
- appeler un provider externe ;
- modifier le Drive ;
- modifier Git ;
- lancer de deploy ;
- lancer un runner de generation ;
- ingerer massivement le canon dans un index.

## 6. Exemples de findings attendus

### UI deceptive risk

```json
{
  "severity": "high",
  "category": "ui_deceptive_risk",
  "title": "Bouton export actif sans endpoint runtime",
  "affected_capability": "guided_runtime",
  "source_refs": ["RECETTE_UI_PR1_GUIDED_RUNTIME.md", "action_registry_seed.v1.json"]
}
```

### Missing recipe

```json
{
  "severity": "medium",
  "category": "missing_recipe",
  "title": "Capability RAG declaree mais sans recette d'acceptation",
  "affected_capability": "rag_capability_shell"
}
```

### Canon/Git drift

```json
{
  "severity": "medium",
  "category": "canon_git_drift",
  "title": "Le canon declare autonomy_step1_runtime mais aucun endpoint Git n'existe",
  "affected_owner": "autonomy_step1_runtime"
}
```

## 7. Gates

Le systeme autonome peut proposer :

- ouvrir une candidate ;
- demander une decision ;
- recommander une PR ;
- recommander une recette ;
- recommander une quarantaine.

Il ne peut pas :

- appliquer une PR ;
- changer un statut `live` ;
- valider une ressource ;
- publier ;
- envoyer ;
- supprimer ;
- executer un tool call sensible.

## 8. Recette d'acceptation

### A1 — Lancer un run manuel

- Login admin/godmode.
- `POST /autonomy/runs` avec `trigger=manual`.
- Attendu : run `completed` ou `failed` avec resume.

### A2 — Student refuse

- Login student.
- `POST /autonomy/runs`.
- Attendu : 403.

### A3 — Findings crees depuis checks read-only

- Run sur scope `repo_sync`.
- Attendu : findings factuels avec `source_refs_json`.

### A4 — Finding converti en candidate

- Admin convertit un finding.
- Attendu : `improvement_candidate` creee, finding `converted`.

### A5 — Decision queue

- Admin cree une decision depuis candidate.
- Attendu : decision `open`, role validateur explicite.

### A6 — Decision ne modifie rien seule

- Admin decide `accepted_for_planning`.
- Attendu : statut decision mis a jour ; aucun patch, export, publication ou statut runtime
  modifie automatiquement.

### A7 — Pas de secrets

- Run read-only.
- Attendu : aucun contenu `.env`, secret, token ou mot de passe dans finding/candidate.

### A8 — Audit

- Chaque transition laisse un audit log :
  - `autonomy_run_created` ;
  - `autonomy_finding_created` ;
  - `autonomy_candidate_created` ;
  - `autonomy_decision_requested` ;
  - `autonomy_decision_recorded`.

## 9. Tests minimum

- admin peut lancer un run ;
- student ne peut pas lancer un run ;
- run cree findings sourcees ;
- finding converti en candidate ;
- candidate cree decision ;
- decision ne declenche aucune mutation sensible ;
- audit des transitions ;
- sanitization secrets ;
- filtres par status/severity/category ;
- schema shared valide.

## 10. Definition de done

```text
schemas partages
migrations idempotentes
routes admin+
checks read-only bornes
findings sourcees
candidates
decision queue
audit
tests verts
aucune execution sensible
aucun connecteur puissant
aucun secret expose
```

