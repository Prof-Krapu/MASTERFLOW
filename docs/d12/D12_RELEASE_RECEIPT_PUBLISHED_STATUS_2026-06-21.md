# D12 — État publié du registre release receipt

## Disponible sur GitHub `main`

| Tranche | Résultat | Preuve |
|---|---|---|
| R5.1 | Registre append-only SHA/environnement/composants | PR #123, merge `6e9f62e` |
| R5.2 | Panneau privé admin/godmode | PR #124, merge `eefd84a` |

## Ce que cela signifie

Un owner peut consigner une déclaration de release et les références disponibles. Le système distingue
une absence de preuve (`unknown`) d'une référence attachée (`evidence_attached`), mais le runtime reste
toujours `not_verified` : ce registre n'observe ni ne contacte un serveur.

## Toujours fermé

Smoke live, backup réel, recovery, rollback, migration, secrets et déploiement hôte. Ces rails exigent
un contrat séparé, leurs preuves propres et une validation explicite avant tout geste externe.
