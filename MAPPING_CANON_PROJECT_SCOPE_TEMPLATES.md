# Mapping canon — Project/Scope (PR-4) & Template/Schema Registry (PR-5)

**Statut :** `PROPOSITION / OPEN` — mapping lecture seule, aucun code. Réponse aux actions
demandées des items inbox `PR-4 Project/Scope livré` (point 4 : mapper classe/cours/session vers
`projects`) et `PR-5 Template/Schema Registry livré` (points 1 & 4 : figer `template_id+version`,
mapper les schémas existants).

**Auteur :** agent_ouighour · **Date :** 2026-06-13
**`SYNC_PROOF` :** `local_head = origin/main = e03b53b`, delta `0 0`. Sources lues :
`packages/shared/src/index.ts` (§ Project, SchemaTemplate, Guided Runtime, Correction PR-Cx),
`apps/backend/src/db/seed.ts` (`SCHEMA_TEMPLATE_SEEDS`), `services/guided_runtime.ts`,
`services/projects.ts`, `db/schema.ts`.

> Rappel d'invariants (PR-4/PR-5) : tout objet métier doit (a) référencer un vrai `project_id`
> quand un contexte projet existe (anti `project_scope` texte libre), (b) figer
> `template_id + version` pour toute structure versionnée (anti modification silencieuse), (c)
> rester privé par défaut, (d) passer membership + ownership + scope ressource avant runner.
> Un template `candidate` ne doit jamais alimenter une surface publique/exportable/partageable.

---

## 1. Objet canon → obligations de figement

| Objet canon (owner) | `project_id` ? | `template_id`+`version` ? | Où (table / contrat) | Statut impl. |
|---|---|---|---|---|
| **Guide MOTH/CDC** (`GUIDANCE_ENGINE`, PR-6) | ✅ nullable (`conversation_guides.project_id`) | ✅ `target_schema_id` + `target_schema_version` (fige à la session) | `conversation_guides`, `guided_sessions` | **Déjà câblé** PR-6 |
| **Session guidée** (PR-6) | hérité du guide | ✅ fige `guide_version + target_schema_id + target_schema_version` | `guided_sessions` | **Déjà câblé** |
| **Contribution guidée** (PR-6) | hérité session | — (structurée par la session) | `guided_contributions` | **Déjà câblé** |
| **CDC** (cahier des charges) | ⚠️ à rattacher au `project_id` du guide | ✅ template `cdc-template-candidate-v1` (seed `candidate`) | `schema_templates` domain `cdc` | Seed candidat ; **doit rester `candidate`** tant que non validé humainement |
| **Devis / quote intake** | ⚠️ à rattacher `project_id` | ✅ template `quote-intake-candidate-v1` (seed `candidate`) | `schema_templates` domain `quote_intake` | Seed candidat |
| **Inscription event** | ⚠️ à rattacher `project_id` (l'event = un projet ?) | ✅ template candidat event (seed) | `schema_templates` | Seed candidat — **jamais `complete` branché sur inscription publique** |
| **Manifest asset** | ⚠️ à rattacher `project_id` | ✅ template candidat manifest (seed) | `schema_templates` | Seed candidat — asset remain hors V1 surface publique |
| **RubricTemplate / RubricVersion** (PR-C1, `CORRECTOR_RUNTIME`) | ⚠️ à rattacher `project_id` (correction par classe/projet) | ✅ intrinsèquement versionné (`RubricVersion`) | à livrer PR-C1 | **À mapper** au moment de PR-C1 |
| **InstitutionalGradingProfile** (PR-C1) | ⚠️ rattachement projet optionnel | ✅ versionné | à livrer PR-C1 | **À mapper** |
| **CorrectionBatch** (PR-C1) | ✅ **obligatoire** (un batch = une cohorte/projet) | via rubric version | à livrer PR-C1 | **À mapper** — doit vérifier `decideScopedPermission` avant tout runner |
| **SubmissionRecord** (PR-C1) | ✅ obligatoire (privé, scope projet) | — | à livrer PR-C1 | **Privé par défaut** |
| **PreCorrectionManifest** (PR-C1) | ✅ obligatoire | ✅ rubric + grading profile figés | à livrer PR-C1 | Valide humaine owner-prof obligatoire |
| **Jobs** (`ocr_prepare`, `correction_prepare`, `export_prepare`, `rag_reindex`) | ✅ `scope_type='project'` + `scope_id` | — | `jobs.scope_type/scope_id` | **Déjà câblé** PR-8/PR-C2 |
| **RAG resource** (PR-7) | ✅ `scope_type` owner/project | — | `rag_resources.scope_*` | **Déjà câblé** |
| **Pedagogical record / evidence** (PR-CB0) | ✅ `project_id` optionnel | — | `pedagogical_records` | **Déjà câblé** |

Légende : ✅ = obligation satisfaite côté contrat ; ⚠️ = à rattacher explicitement lors du câblage
de la feature consommatrice.

---

## 2. Règles de figement (à appliquer avant tout runner/publication)

1. **Project/Scope (PR-4)** — tout nouvel objet métier doit :
   - accepter un `project_id` nullable dans son contrat ;
   - appeler `decideScopedPermission({actor, projectId, minimumProjectRole})` avant toute écriture
     runtime (runner, correction, export) ;
   - ne plus inventer de `project_scope` texte libre quand le projet existe ;
   - mapper les notions classe/cours/session vers `projects` (+ membres via `project_members`)
     plutôt qu'un système parallèle.
2. **Template/Schema (PR-5)** — toute structure versionnée doit :
   - figer `template_id + version` à la création de l'objet consommateur (freeze versionnel,
     comme le fait déjà `guided_sessions`) ;
   - refuser un template `candidate` pour toute surface publique/exportable/partageable ;
   - créer une **nouvelle version** plutôt que modifier silencieusement (audit + bump) ;
   - masquer `deprecated`/`archived` par défaut côté listing.
3. **Anti-énumération** : non-membre d'un projet = `project_not_found` (déjà appliqué PR-4),
   jamais `forbidden` révélateur.

---

## 3. Découvertes during audit (à signaler)

- **PR-6 déjà exemplaire** : `guided_sessions` fige `guide_version + target_schema_id +
  target_schema_version`. C'est le **modèle à reproduire** pour CorrectionBatch, devis, event,
  asset manifest (tous consomment un `schema_template`). Recommandation : factoriser ce pattern
  de figement dans un mini-contrat `TemplateFrozenRef` (additif, rétro-compatible) plutôt que de
  le recopier par feature.
- **Seeds PR-5 inline** : les 4 templates candidats (cdc, quote_intake, event, asset manifest)
  vivent dans `seed.ts` (`SCHEMA_TEMPLATE_SEEDS`), pas dans un `seeds/*.json` dédié (contrairement
  à `action_registry_seed.v1.json`). Cohérence à reprendre côté MALEX/Vincent si on veut un seed
  JSON canonique (⚠️ `seeds/*.json` reste réservé à Vincent/Claude, pas agent).
- **Event/asset = `candidate` par construction** : aucune de ces surfaces ne doit être présentée
  comme `live` avant (a) validation admin/godmode du template, (b) contrat + endpoint réels,
  (c) recette. Conforme à l'invariant « app visible ≠ engine active ».
- **Mapping classe/cours → projects** : PR-4 n'a pas de table `classes` dédiée (cohérent anti-scope
  objets fictifs retirés couche 13). La recommandation canon est de représenter une classe comme un
  `project` (visibility `private`) + membres (rôle `participant` = élève, `editor`/`owner` = prof).
  À valider MALEX avant activation.

---

## 4. Plan de câblage suggéré (borné, par feature)

| Feature suivante | Action Project/Scope | Action Template | Gate |
|---|---|---|---|
| **Correction (PR-C1)** | `CorrectionBatch.project_id` obligatoire + `decideScopedPermission` owner-prof | figer rubric version + grading profile | Valide humaine owner-prof avant runner |
| **Devis** | rattacher `project_id` | figer `quote-intake-candidate-v1` → `validated` avant export | Jamais `complete` publique |
| **Event / inscription** | event = `project` ? | figer template event `validated` | Inscription invite-only (cf. PR-3 register) |
| **Asset manifest** | rattacher `project_id` | figer template manifest | Surface asset hors V1 publique |
| **Pedagogical evidence (PR-CB0)** | déjà `project_id` optionnel | — | Privé par défaut |

Aucune de ces actions ne crée un nouvel engine ni ne contourne permissions/preflight/validation.

---

## 5. Décision attendue de MALEX

- Valider la représentation **classe = `project` + membres** (vs table dédiée reportée) ;
- Valider le mini-contrat `TemplateFrozenRef` factorisé (additif `shared`) ;
- Priorité du câblage : Correction (PR-C1) d'abord, puis Devis, Event, Asset.

**Gate : mapping et proposition uniquement.** Aucun code, migration, endpoint, permission ou
changement de périmètre avant validation humaine MALEX séparée.

— agent_ouighour
