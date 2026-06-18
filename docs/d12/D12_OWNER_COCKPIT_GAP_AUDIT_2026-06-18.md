# D12 Owner Cockpit — gap audit post-PR #5

Date : 2026-06-18
Statut : `SAFE_GAP_AUDIT_NO_CODE`

## Diagnostic simple

Le cockpit owner existe maintenant comme première surface frontend read-only. Il agrège les jobs et
la Validation Inbox pour proposer un prochain geste sûr.

Mais il ne couvre pas encore tout le canon D12. Il aide à moins travailler à l'aveugle, sans être
encore le vrai dashboard d'observabilité/autonomie MasterFlow.

## Références canon lues

- `05_UI_RUNTIME_CONTRACTS/D12_OBSERVABILITY_DASHBOARD_SCHEMA.json`
- `05_UI_RUNTIME_CONTRACTS/KERNEL_AND_CONTROL_ROOM_COMPOSITION_MAP.md`
- `90_WORKBENCH/SIMULATIONS/SIM-20260614-PHASE9-D12-OBSERVABILITY-DASHBOARD-001.md`

## État GitHub réel

| Rail D12 canon | Statut GitHub | Preuve | Écart | Action recommandée |
|---|---|---|---|---|
| Validation Inbox | partiel | `/validation-inbox`, actions + `feedback_draft` | Pas encore tous les domaines D06-D12. | Continuer projections par contrat. |
| Jobs/runners state | partiel | `/jobs`, `owner-cockpit.tsx` | Visible mais pas expliqué par cause produit. | Ajouter diagnostics lus/agrégés plus tard. |
| Owner next action | partiel | `nextSafeAction()` frontend | Heuristique frontend, pas read-model backend. | Garder read-only ; backend agrégat plus tard. |
| Deployment bridge | documentation | Drive bridge + docs Git | Pas de runtime object ni alerte auto. | Créer d'abord un read-model doc/status. |
| Implementation gap tracker | documentation | matrices/queues | Pas d'objet structuré requêtable. | Spec d'abord, pas code. |
| Opportunity radar | absent runtime | canon Drive uniquement | Aucun service/table. | Garder en futur. |
| Findings/autonomy runs | absent | pas de tables/services | Pas d'observation native. | Future tranche observation-only. |
| Missed trigger detection | absent | pas de detector | Les ratés ne deviennent pas findings. | Future tranche, très bornée. |
| Cleanup/archive safety | absent runtime | protocole seulement | Aucun contrôle logiciel. | Garder hors scope code immédiat. |

## Ce que le cockpit actuel sait faire

- Lire les validations ouvertes.
- Repérer les validations high/critical.
- Lire les jobs actifs, à revoir, échoués.
- Donner un prochain geste sûr simple.
- Rappeler les limites runtime.

## Ce qu'il ne sait pas encore faire

- Dire si Drive canon et GitHub ont dérivé automatiquement.
- Lire le snapshot Drive comme objet runtime.
- Grouper les gaps par domaine D01-D12.
- Créer une finding D12.
- Détecter un missed trigger.
- Proposer une action avec source/cause/impact complet.
- Router une décision vers une inbox sans règle codée.

## Queue D12 safe

### 1. Read-model documentation/status

- Tâche : définir un objet `owner_cockpit_status` read-only.
- Risque : faible en spec.
- Ne fait pas : mutation, auto-fix, canon lock.

### 2. Gap tracker statique

- Tâche : convertir les gaps connus en structure lisible par UI.
- Risque : faible si source Git, pas Drive live.
- Ne fait pas : inference automatique.

### 3. Deployment bridge read signal

- Tâche : exposer le dernier SHA GitHub/Drive bridge comme statut lu.
- Risque : moyen si on lit Drive/runtime automatiquement.
- Première version recommandée : doc/spec seulement.

### 4. Findings observation-only

- Tâche : spécifier un objet `autonomy_finding` sans exécution.
- Risque : moyen.
- Garde-fou : finding ≠ action.

### 5. Missed trigger logging

- Tâche : spécifier des exemples de ratés transformables en observations.
- Risque : élevé si auto-fix.
- Garde-fou : observation-only, Validation Inbox avant toute action.

## Décision recommandée

Ne pas coder D12 maintenant. Le prochain geste safe est de garder D12 comme boussole de pilotage et
de continuer les specs/audits faibles risques :

1. Process activation audit.
2. User feedback intake.
3. D08 manifest-first lock.

Le premier code D12 utile plus tard serait un agrégat read-only `GET /diagnostics/owner-cockpit`,
mais seulement après stabilisation des objets à afficher.
