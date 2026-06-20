# Arbitrage des familles d'apps restantes — 2026-06-20

## D01 à D04 — socle, contexte, rooms et personas

| Famille legacy | Décision | Preuve Git actuelle | Écart |
|---|---|---|---|
| Auth, projet, policy, config, organisation | `implemented_partial` | routes/services auth, projects, admin et scopes | organisation réelle et multi-tenant restent différés |
| Resource, link, search, archive, memory | `implemented_partial` | resources, RAG lexical, memory cards, context compiler | timeline/versioning relationnel et stockage fichiers absents |
| App registry, dashboard, rooms, composition, routage multi-app | `implemented_partial` | rooms, loadout, actions, checkpoints et frontend | command center, widgets contextuels complets et préférences restent à prouver |
| Persona, MasterFlex, MasterHelp, mentorship, dialogue/relations | `reduced` | personas/blends et guidance bornée | affectations, bots contextuels, mémoire/persona et conversation roster absents |
| Multi-tenant, marketplace, creator economy, subscription/billing | `deprecated` pour V1 | aucun besoin runtime actuel | ne réouvrir que pour une décision business explicite |

## D07 — inventory

| Famille legacy | Décision | Preuve Git actuelle | Écart |
|---|---|---|---|
| Inventory, collection, classification, OCR | `implemented_partial` | services/routers inventory, collection, recherche, OCR et tests dédiés | parité détaillée avec tous les packs legacy et lifecycle asset D08 à auditer |

## D11/D12 — factories, automatisation et observabilité

| Famille legacy | Décision | Preuve Git actuelle | Écart |
|---|---|---|---|
| AI OS Builder / MasterBuilder | `legacy_reference` + `D11_candidate` | intake/backflow candidate-only | aucun builder/factory ne devient runtime MasterFlow par défaut |
| Automation, queue, task, workflow, observability, health, sandbox | `implemented_partial` | jobs, runners, workflow observability, owner cockpit, hard-stop, usage harvester | pas d'auto-fix, auto-deploy, orchestration lourde ou détecteur global autonome |
| Analytics, notifications, feature unlock, progression/gamification | `restore_candidate` | token/usage observability seulement | pas de profiling, nudges ou score utilisateur sans contrat ciblé |

## Règle issue de l'arbitrage

Les noms legacy `APP V1`, `IMPLEMENTATION_READY` ou `ACTIVE` sont historiques. Ils ne
valent pas preuve Git, preuve live, ni autorisation de déployer. La source de vérité reste
la matrice Canon → Git, complétée par les tests et un receipt de publication.
