# HANDOFF VINCENT — Big chantier fondations MasterFlow

Statut : `BACKEND WORK PACKAGE / MALEX GO TO PLAN / 2026-06-13`

## 1. Intention

Pendant que MALEX avance le canon et les recettes, le prochain gros chantier backend consiste a
transformer les fondations post-audit en PRs courtes, testables et non dangereuses.

Objectif : poser les multiplicateurs qui permettront ensuite MOTH/CDC, Ours d'Or, devis, DA,
correction et RAG sans creer cinq architectures paralleles.

## 2. Ordre de lecture

1. `MASTERFLOW_POST_AUDIT_FOUNDATION_UPGRADES.md`
2. `MATRICE_FEATURES_VS_FONDATIONS_MASTERFLOW.md`
3. `PLAN_PRS_FONDATIONS_MASTERFLOW.md`
4. `SPEC_AUTONOMY_STEP1_SHELL.md`
5. `RECETTE_AUTONOMY_STEP1_SHELL.md`
6. `CHECKLIST_PR1_AUTONOMY_STEP1.md`
7. `PROTOCOLE_REVUE_PRS_VINCENT.md`

Puis seulement :

- `SPEC_CAPABILITY_REGISTRY.md`
- `SPEC_STATUS_TAXONOMY.md`
- `SPEC_PROJECT_SCOPE_OWNERSHIP.md`
- `SPEC_TEMPLATE_SCHEMA_REGISTRY.md`
- `RECETTE_PR1_GUIDED_RUNTIME.md`
- `RECETTE_RAG_PERMISSIONNE.md`
- `SPEC_JOBS_QUEUES_RUNNERS.md`
- `SPEC_WORKFLOW_OBSERVABILITY.md`

## 3. Chantier prioritaire

### PR-1 — `autonomy_step1_shell`

But : donner a MasterFlow une autonomie encadree.

Elle doit :

- observer ;
- produire des findings ;
- proposer des improvement candidates ;
- creer des decisions humaines ;
- tracer ;
- refuser toute execution sensible.

Elle ne doit pas :

- patcher Git ;
- modifier le Drive ;
- publier ;
- envoyer email ;
- deployer ;
- appeler un provider externe ;
- lire/exposer des secrets ;
- lancer un runner ;
- changer un statut `live`.

## 4. Definition de done PR-1

```text
schemas partages ajoutes
migrations idempotentes
routes admin+ montees
checks read-only bornes
findings sourcees
candidates
decision queue
audit
tests backend verts
lint vert
aucune mutation sensible
aucun secret expose
SUIVI mis a jour
```

## 5. Sequence backend conseillee

```text
PR-1 autonomy_step1_shell
PR-2 capability_registry_shell
PR-3 status_taxonomy
PR-4 project_scope_shell
PR-5 template_schema_registry
PR-6 guided_runtime_pr1
PR-7 rag_capability_shell
PR-8 jobs_shell
PR-9 workflow_observability
```

## 6. Reponse attendue de Vincent

Avant code large, repondre dans Git :

```text
PR cible :
fichiers touches :
migrations :
schemas shared :
routes :
engines/services :
tests :
risques :
ecarts avec la spec :
ordre propose si different :
```

Si tu codes directement PR-1, livrer une branche courte avec tests et note SUIVI.

## 7. Punchline claire

On ne construit pas encore une IA qui agit a notre place. On construit le systeme qui voit le
terrain, signale les whiffs, propose le punish, et attend le GO humain avant le super.

