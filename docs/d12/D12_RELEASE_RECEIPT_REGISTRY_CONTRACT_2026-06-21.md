# D12 R5.1 — Registre privé de release receipts

## Contrat de déploiement

- Intention produit : relier une déclaration de release à un SHA complet, un environnement et des composants.
- Partie du canon concernée : D12 Runtime Continuity, premier objet `release_receipt`.
- Ce qui doit changer : registre append-only privé admin/godmode, avec preuves optionnelles.
- Ce qui ne doit pas changer : aucun déploiement, smoke, backup, recovery, migration ou statut live n'est exécuté ou inféré.
- Critère simple de succès : un SHA complet est enregistrable ; sans preuve il reste `unknown`, avec preuve le runtime reste `not_verified`.
- Risque de dérive : moyen si une déclaration est présentée comme une preuve live ; verrouillé par les états explicites.
- Validation nécessaire : non pour le registre privé ; oui avant déploiement, recovery, migration ou action hôte.

## Trace Legacy → Canon → GitHub

- Source canon Drive : `03_DOMAINS/D12_AUTONOMY_OBSERVABILITY_DEPLOYMENT/DOMAIN_CARD.md`.
- Preuve legacy/arbitrage : Runtime Continuity & Recovery classé `canon_ready` ; release receipt absent du runtime.
- Statut legacy : `canon_ready`, absorption progressive sous D12.
- Écart GitHub traité : les preuves étaient documentaires mais aucun objet runtime append-only ne reliait SHA/environnement/composants.
- Exclusions : vérification live, health check, smoke, backup, incident, recovery, rollback, migration et déploiement.

## États

- `proof_state=unknown` : déclaration sans référence de preuve.
- `proof_state=evidence_attached` : au moins une référence est attachée, sans présumer sa validité.
- `runtime_status=not_verified` : invariant de cette tranche, y compris avec preuve attachée.
