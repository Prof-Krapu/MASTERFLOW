# D12 R5.3 — Registre privé de backup receipts

## Contrat de déploiement

- Intention produit : consigner l'existence déclarée d'une sauvegarde avec cible, checksum et date.
- Partie du canon concernée : D12 Runtime Continuity, objet `backup_receipt`.
- Ce qui doit changer : registre append-only admin/godmode avec checksum SHA-256 obligatoire.
- Ce qui ne doit pas changer : aucun fichier n'est lu, copié, vérifié, restauré ou supprimé.
- Critère simple de succès : un receipt contient une cible et un checksum complet ; son `restore_status` reste `not_tested`.
- Risque de dérive : moyen si un checksum est pris pour une restauration validée ; verrouillé par l'état constant.
- Validation nécessaire : non pour le registre déclaratif ; oui avant backup réel, restauration, recovery, migration ou action hôte.

## Trace Legacy → Canon → GitHub

- Source canon Drive : `03_DOMAINS/D12_AUTONOMY_OBSERVABILITY_DEPLOYMENT/DOMAIN_CARD.md`.
- Preuve legacy/arbitrage : Runtime Continuity & Recovery `canon_ready`, backup/recovery live non prouvés.
- Statut legacy : `canon_ready`, absorption progressive sous D12.
- Écart GitHub traité : aucun objet runtime n'exposait une trace append-only de backup avec checksum.
- Exclusions : exécution backup, lecture/copier de données, checksum calculé par le runtime, restauration, recovery, rollback, migration et déploiement.
