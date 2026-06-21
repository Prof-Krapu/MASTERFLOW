# D12 R5.2 — Panneau privé de release receipts

## Contrat de déploiement

- Intention produit : rendre le registre D12 utilisable par l'owner sans action sur un runtime.
- Partie du canon concernée : D12 Runtime Continuity, `release_receipt`.
- Ce qui doit changer : saisir et relire des receipts privés, avec statut de preuve explicite.
- Ce qui ne doit pas changer : aucun bouton de health check, smoke, backup, recovery, migration ou déploiement.
- Critère simple de succès : l'owner peut enregistrer un SHA complet et lit `runtime_status: not_verified`.
- Risque de dérive : faible ; l'interface reprend l'invariant backend.
- Validation nécessaire : non pour l'interface ; oui avant action hôte ou live.

## Trace Legacy → Canon → GitHub

- Source canon Drive : D12 Runtime Continuity Registry.
- Preuve legacy/arbitrage : continuité `canon_ready`, live et recovery encore non prouvés.
- Écart GitHub traité : R5.1 était accessible seulement par API.
- Exclusions : vérification live, smoke, backup, recovery, migration et déploiement.
