# Arbitrage contrats transverses — vague 1

| Contrat | Décision | État |
|---|---|---|
| Action preflight / validation inbox | `implemented_partial` | actions, inbox, hard-stop et décisions existent ; simulation universelle et decision log complet restent partiels |
| Candidate canon / no invention | `absorbed` | règle appliquée au canon, D11, D12 et arbitrage legacy |
| Human override | `absorbed` | validation humaine, permissions et hard-stop sont réels ; pas d'auto-déploiement |
| Sentinel / untrusted input | `implemented_partial` | garde source non autorité et quarantaine/candidates ; enveloppe capability complète à vérifier séparément |
| Resource Truth Lock | `implemented_partial` | resources/RAG/candidates permissionnés ; import normalisé des anciens routings absent |
| Subject Library backend | `canon_ready` | sujets guidés existent ; manifest, versions, import et déploiement sujet complet absents |
| Memory minimization | `canon_ready` | cards/context packs existent ; save tiers, invalidation complète et relation graph absents |
| Backup contextual restore | `canon_ready` | canon D12 présent ; backup manifest, restore snapshot et reprise live absents |
| Validated pipeline slice | `canon_ready` | D08 conserve le principe ; registry/slices/runtime Comfy non livrés |

## Décision de vague

Ces contrats ne déclenchent aucun nouveau moteur. Ils sont les garde-fous à utiliser dans les
tranches futures D02, D05/D06, D08 et D12.
