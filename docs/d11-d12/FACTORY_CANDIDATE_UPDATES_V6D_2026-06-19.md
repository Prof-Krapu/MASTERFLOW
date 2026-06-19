# D11 — Factory Candidate Updates V6D

## Références canon

- Drive `D11_FACTORY_PASSPORT_BACKFLOW_CONTRACT.md` :
  `factory_export -> passport -> backflow_inbox -> simulation -> owner_validation -> candidate_update`.
- Shared Validation Inbox.

## Intention

Après l'approbation humaine d'un backflow V6C complet, conserver une fiche par
candidat exporté. Cette fiche rend la suite visible sans prétendre savoir quel
domaine, quel process ou quel canon doit évoluer.

## Contrat runtime réel

- l'approbation d'un intake complet crée une `factory_backflow_candidate_update`
  par candidat déclaré ;
- chaque fiche reste `approved_candidate`, `unrouted`, `candidate_only` et sans
  `target_domain` ;
- `GET /api/v1/backflow/candidate-updates` est réservé admin/godmode ;
- aucun update n'est créé sur quarantaine, demande de précision, park, rejet ou archive ;
- l'opération est idempotente par `intake_id + source_candidate_id`.

## Frontières

Cette tranche ne route rien vers D05-D12, ne crée pas de Usage Learning, action,
job, import, installation, activation runtime ou écriture canon. Un futur routage
de domaine devra être une décision séparée et explicitement validée.

## Preuve locale

Factory Backflow + Validation Inbox : 24/24. TypeScript backend OK.
