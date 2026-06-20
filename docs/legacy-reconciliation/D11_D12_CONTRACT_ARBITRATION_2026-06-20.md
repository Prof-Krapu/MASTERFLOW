# Arbitrage des contrats D11-D12 — 2026-06-20

## Diagnostic

Les 12 contrats confirment deux frontières déjà nettes :

- D11 transporte des capacités dans des factories autonomes, puis ne réabsorbe que des candidats revus ;
- D12 observe, explique et route, mais n'exécute ni déploiement, ni migration, ni écriture canon.

GitHub possède un backflow D11 candidate-only substantiel et une observabilité D12 partielle.
Les runtimes de factories autonomes, la continuité live et les surfaces adaptatives complètes ne sont pas prouvés.

## Contrat de déploiement

- Intention produit : fermer l'arbitrage des contrats D11-D12 sans activer les factories ni prétendre connaître le live.
- Partie du canon concernée : D11 Factory Passport/Backflow et D12 observabilité/continuité.
- Ce qui doit changer : décision et successeur explicites pour 12 contrats.
- Ce qui ne doit pas changer : aucun import de factory, provider, secret, migration, recovery ou déploiement.
- Critère simple de succès : zéro contrat D11-D12 ciblé en attente, frontière candidat/autorité préservée.
- Risque de dérive : élevé si portable devient public ou si observation devient action.
- Validation nécessaire : non pour audit ; oui avant installation, import, recovery ou live.

## Matrice Canon → GitHub

| Élément canon | Statut GitHub | Écart | Action sûre |
|---|---|---|---|
| Passport/backflow candidat | implémenté borné | pas d'import ZIP/runtime | conserver V1 candidate-only |
| Evolution/usage learning | implémenté partiel | sources et missed triggers limités | étendre par événements structurés seulement |
| Human override | implémenté transversal | surfaces variables | conserver autorité humaine comme invariant de recette |
| Progressive context | implémenté partiel | graphes/tiers spécialisés incomplets | compléter sans dump de contexte |
| Cognitive safety/adaptive UI | partiel/inconnu | pas de runtime dédié | critères UX, jamais profilage opaque |
| Continuité release/backup/recovery | partiel | live non prouvé | receipts avant toute action hôte |

## Arbitrage exhaustif

### Absorbés dans le canon

- `FACTORY_AUTONOMOUS_SECURITY_AND_PORTABLE_BUNDLE_CONTRACT`
- `MASTERFLOW_EVOLUTION_LOOP_FACTORY_BACKFLOW_AND_DEPLOYMENT_CONTRACT`
- `HUMAN_OVERRIDE_AND_FINAL_AUTHORITY_POLICY`
- `PROGRESSIVE_CONTEXT_LOADING_AND_ANTI_HALLUCINATION_POLICY`

### Canon prêts à câbler

- `COGNITIVE_SAFETY_AND_RUNTIME_INTERACTION_POLICY`
- `GLOBAL_ACCESS_CANON_HELP_OPPORTUNITY_AND_OWNER_OPS_ORCHESTRATION_CONTRACT`
- `HYBRID_UI_DECISION_AND_ADAPTIVE_SURFACE_POLICY`
- `MEDIA_QUEUE_AND_TIMECODE_RESOURCE_ROUTING_CONTRACT`
- `OBS_ACCOUNT_POSITIVE_OBSERVATION_AND_ROOM_CLIMATE_CONTRACT`

Les observations de climat ou d'aide restent positives, minimales et non disciplinaires. Elles
ne deviennent jamais scores comportementaux, diagnostics médicaux ou surveillance invisible.

### Réduits à des capsules/adapters

- `FACTORY_CONVERSATIONAL_RUNTIME_CONTRACT`
- `MASTERINVENTORY_LIBRARIAN_FACTORY_AND_REFERENCE_DECK_CONTRACT`
- `PORTABLE_BEHAVIOR_PACKAGE_AND_PERSONA_ADAPTER_CONTRACT`

Ils peuvent vivre dans des factories avec Passport, mais ne dupliquent ni engines, ni permissions,
ni canon MasterFlow.

## Alerte live

La demande historique de récupération runtime reste ouverte et séparée. Aucun audit documentaire
ne vaut preuve de sauvegarde, de SHA lancé, de santé de base ou de recovery.
