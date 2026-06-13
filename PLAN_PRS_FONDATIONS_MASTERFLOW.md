# PLAN PRS — Fondations MasterFlow post-audit

Statut : `BACKEND ROADMAP PROPOSAL / 2026-06-13`

## Ordre propose

### PR-1 — `autonomy_step1_shell`

Runs, findings, candidates, decision queue. Read-only checks, admin+, audit.

### PR-2 — `capability_registry_shell`

Capabilities read-only, status runtime, UI visibility, diagnostics admin.

### PR-3 — `status_taxonomy`

Enums partages, mapping action registry/capability registry, migration docs.

### PR-4 — `project_scope_shell`

Projects, members, ownership edges, premiers checks permission objet.

### PR-5 — `template_schema_registry`

Templates versionnes, CDC candidat, validation admin.

### PR-6 — `guided_runtime_pr1`

MOTH/CDC prive, sur templates et scopes si disponibles.

### PR-7 — `rag_capability_shell`

Manifestes, permissions, context packs, pas d'index massif.

### PR-8 — `jobs_shell`

Jobs, events, progress, cancel/retry, logs.

### PR-9 — `workflow_observability`

Diagnostics workflows, friction, latence, completion, cout nullable.

### PR-CB0 — `pedagogical_evidence_signal_delta_contracts`

Contrats partages et migrations pour evidence events, pedagogical signals, teacher decision
deltas et task model profiles. Aucune correction, note ou adaptation automatique.

Etat : contrats Zod, migrations SQLite, depot interne permissionne, audits et tests livres sur la
branche MALEX/Codex. Project/Scope doit ensuite remplacer la restriction conservatrice
`teacher = owner` avant toute route ou adapter runtime.

Reference :

- `BRIDGE_CANON_FEATURES_VINCENT_CORRECTION_PEDAGOGIE.md`
- `SPEC_PEDAGOGICAL_EVIDENCE_SIGNAL_AND_TEACHER_DELTA.md`

Cette PR prepare la correction, les capteurs de classe, le suivi, les cours et les futurs adapters
sans exposer une verticale fictive. Elle peut etre developpee apres Project/Scope et Template
Registry, ou en contrats seuls avant les routes runtime.

## Regle de sequencing

Chaque PR doit livrer :

```text
schemas partages
migration idempotente si BDD
routes gates
tests
SUIVI
recette ou lien recette
aucune UI deceptive
```

## Priorite produit

Ces PRs ne remplacent pas MOTH/CDC. Elles evitent que MOTH/CDC, Ours d'Or, devis, DA, correction
et assets creent chacun leur propre systeme parallele.
