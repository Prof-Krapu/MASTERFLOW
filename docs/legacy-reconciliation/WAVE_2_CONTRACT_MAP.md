# Vague 2 — Matrice contrats Legacy → Canon → GitHub

Cette vague ne promeut rien. Elle établit les successeurs, les réductions et les restaurations
nécessaires à partir des contrats directeurs legacy.

| Capacité legacy | Référence legacy | Canon actuel | GitHub actuel | Décision |
|---|---|---|---|---|
| Index actif contrats/apps/engines | `01_CORE/MASTERFLOW_ACTIVE_CONTRACT_INDEX.md` | Kernel + Domain Map, sans index actif machine-readable | registre d’actions partiel | **restaurer** un Active Contract & Process Registry |
| Correction, notes orales, roster et relances | `03_APPS/CORRECTOR_APP_RUNTIME.md` | D06 couvre preuves, feedback et validation | feedback/correction partiels | **restaurer** le registre classe/cohorte/étudiant et le Context Pack correction |
| Suivi pédagogique non disciplinaire | `03_APPS/STUDENT_MONITORING_AND_PEDAGOGICAL_SIGNAL_SYSTEM.md` | D06 signaux longitudinaux prudents | signaux/feedback partiels | **réintégrer** comme dossier longitudinal teacher-scoped, jamais score automatique |
| Mémoire, relation, provenance et invalidation | `03_APPS/MEMORY_APP_RUNTIME.md` | D02 loadout, Resource Truth et RAG | context packs cités/stale | **étendre** avec timeline, relations, rétention et conflits mémoire |
| Versioning, migration et rollback | `03_APPS/VERSIONING_APP_RUNTIME.md` | aucun contrat actif équivalent | audit Git : versioning métier absent | **restaurer** Version & Change Ledger avant migration ou import sensible |
| Organisation, classes et équipes | `03_APPS/ORGANIZATION_MODEL.md` | D01 porte le scope par projet | projets/membres/scopes | **ouvrir** classe/cohorte maintenant ; organisation ensuite ; multi-tenant plus tard |
| Isolation multi-tenant | `03_APPS/MULTI_TENANT_ARCHITECTURE.md` | scope `organization` seulement | aucun runtime tenant | **conserver candidat**, ne pas surconstruire avant besoin multi-structure réel |
| Incident, recovery et rollback | `01_CORE/MASTERFLOW_RUNTIME_INCIDENT_RESPONSE.md`, `MASTERFLOW_RUNTIME_STATE_RECOVERY_MAP.md` | D12 observe et alerte | release live non prouvée | **restaurer** Runtime Continuity & Recovery Contract, priorité haute |
| Résolution DA et références canoniques | `02_CONTRACTS/COMFY_CANONICAL_REFERENCE_RESOLUTION_AND_FEEDBACK_LEARNING_CONTRACT.md` | D08 manifest-first, sans resolver explicite | références/assets/lifecycle non confirmés | **restaurer** Canonical Asset & Reference Registry avant provider image |
| Assets générés indexés et réutilisables | `02_CONTRACTS/GENERATED_ASSET_RUNTIME_AND_INVENTORY_UI_MANIFEST_CONTRACT.md` | D08 prévoit manifest/review | persistence asset absente | **restaurer** lifecycle asset candidat → review → validé |

## Lecture

Le nouveau canon a bien préservé les garde-fous : source truth, permissions, context loadout,
validation et candidate state. Il a réduit les objets opérationnels qui rendent ces garde-fous
utilisables au quotidien. Les restaurations listées ci-dessus sont donc des raccordements, pas
un retour au legacy brut.

## Vague suivante

La vague 3 crée le patch canon minimal du **Living Truth Spine** : registre de sources/version,
classes/cohortes, identités, Context Packs de processus, références DA et continuité runtime.
