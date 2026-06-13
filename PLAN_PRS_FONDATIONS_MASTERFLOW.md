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

Etat : contrats partages, migrations SQLite, services internes, routes auth projet/membres,
scopes ressources, anti-enumeration et tests livres. Les prochaines verticales doivent utiliser
un `project_id` reel plutot qu'un scope texte libre des qu'un contexte projet existe.

### PR-5 — `template_schema_registry`

Templates versionnes, CDC candidat, validation admin.

Etat : contrats partages, table `schema_templates`, seeds candidats non canoniques, routes auth,
creation teacher+ candidate, validation admin/godmode, masquage deprecated/archive et tests
livres. Les futures sessions doivent figer `template_id + version`.

### PR-6 — `guided_runtime_pr1`

MOTH/CDC prive, sur templates et scopes si disponibles.

Etat : contrats, tables, routes auth, guides draft, sessions privees, participants internes,
contributions, progression deterministe, contradictions visibles, freeze `guide/template version`
et tests livres. Aucun lien public, LLM obligatoire, inscription, devis, email, export, badge ou
asset.

### PR-7 — `rag_capability_shell`

Manifestes, permissions, context packs, pas d'index massif.

### PR-8 — `jobs_shell`

Jobs, events, progress, cancel/retry, logs.

### PR-9 — `workflow_observability`

Diagnostics workflows, friction, latence, completion, cout nullable.

Etat : contrat partagé, table `workflow_events`, service interne, routes diagnostics admin+,
agrégats p50/p95/completion/friction et tests livrés. Aucun contenu métier brut, aucune action
runtime et aucune UI.

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

### PR-CB1 — `pedagogical_adapter_registry_readonly`

Registre statique et versionné des adapters OCR, WooClap, transcription et note professeur.

Etat : contrat partagé, seed validé, lecture filtrée par rôle et tests livrés. Aucun adapter n'est
`live`, aucun executor n'est branché et aucune route d'import n'est exposée.

Référence :

- `SPEC_ADAPTER_REGISTRY_PR_CB1.md`
- `BRIDGE_CANON_FEATURES_VINCENT_CORRECTION_PEDAGOGIE.md`

L'activation d'un adapter attend Project/Scope, Jobs, stockage, permission/preflight et recette.

### PR-CB2 — `task_aware_model_routing_and_egress`

Routage du provider actif contre un profil validé par tâche et gate réseau anti-SSRF.

Etat : contrat de tâches partagé, résolution fail-closed, privacy `local_only`, origine exacte
allowlistée et tests livrés. Le mock reste sans réseau. Le fallback multi-provider, les budgets
préflight et l'administration des profils restent hors scope.

Référence :

- `SPEC_TASK_AWARE_MODEL_ROUTING_AND_EGRESS_PR_CB2.md`
- `BRIDGE_CANON_FEATURES_VINCENT_CORRECTION_PEDAGOGIE.md`

### PR-C0 — `deprecate_corrector_persona`

Dépréciation non destructive de `corrector-001`.

Etat : Corrector est masqué des nouveaux parcours, non activable et interdit dans les nouveaux
blends. Sa rangée, ses configurations et les blends historiques restent lisibles.

Référence :

- `SPEC_PR_C0_DEPRECATION_NON_DESTRUCTIVE_CORRECTOR.md`
- `DECISION_ABSORPTION_CORRECTOR_ET_CALIBRATION_INSTITUTIONNELLE.md`

### PR-C1 — `correction_reference_objects`

Rubriques et profils institutionnels versionnés, batches, submissions privées et manifests de
pré-correction.

Etat : contrats, migrations, index et tests livrés. Aucun score, route, runner ou export.

Référence :

- `SPEC_PR_C1_RUBRICS_GRADING_BATCHES_MANIFESTS.md`
- `DECISION_ABSORPTION_CORRECTOR_ET_CALIBRATION_INSTITUTIONNELLE.md`

### PR-C2 — `ocr_ingestion_jobs_shell`

Jobs owner/scope, événements, progression monotone, cancel/retry et création interne
`ocr_prepare` derrière adapter, preflight et manifest/consentement.

Etat : contrats, migrations, service interne, routes de suivi et tests livrés. Aucun upload ni
runner OCR réel.

Référence :

- `SPEC_PR_C2_OCR_INGESTION_AND_JOBS_SHELL.md`
- `DECISION_ABSORPTION_OCR_COMMUN_ET_ADAPTER_MORPHOLOGIQUE.md`

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
