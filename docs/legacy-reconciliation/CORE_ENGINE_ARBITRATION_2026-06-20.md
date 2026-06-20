# Arbitrage engines directeurs — 2026-06-20

| Engine legacy | Décision | Successeur et état Git |
|---|---|---|
| Permission | `implemented_partial` | permissions/scopes/action gates réels ; organisation et sous-personas conditionnels incomplets |
| Resource / Contextual reasoning | `implemented_partial` | Resource Truth, RAG lexical et Context Compiler ; graphe, vectoriel et stockage réels absents |
| Persona | `reduced` | personas/blends réels ; affectations, conversation roster et mémoire persona durable absents |
| Subject | `implemented_partial` | guided runtime réel ; extraction/import/assignment graph et compiler complet à restaurer |
| Corrector | `reduced` | contexte/roster/identité et pré-correction fondation ; lot, OCR, submissions, sample review et feedback final incomplets |
| Inventory | `implemented_partial` | inventory/OCR/collections réels ; séparation prop narratif et lifecycle D08 à poursuivre |
| Asset Runtime | `canon_ready` | contrats/manifest D08 ; persistance, lifecycle et review assets absents |
| Narrative | `canon_ready` | D09 workbench/candidates ; aucun engine/runtime narratif persistant |
| Quote | `canon_ready` | D10 privé cadré ; aucun devis, prix, PDF ou envoi actif |
| Conversation harvest/backflow | `implemented_bounded` | D11/D12 candidates et inbox ; aucune promotion canon automatique |
| Observability | `implemented_partial` | cockpit/findings/usage réels ; détection et couverture cross-runtime incomplètes |
| Incident response | `canon_ready` | contrat D12 présent ; recovery live non prouvé |
| Versioning | `canon_ready` | snapshots ciblés existent ; Version & Change Ledger transverse absent |

## Règle de consolidation

Ces engines restent des owners fonctionnels. Ils ne deviennent pas 148 microservices ni un
super-engine : le Git ne reçoit qu'une tranche quand elle a un objet, une permission, une preuve
de canon, des tests et une projection UI utile.
