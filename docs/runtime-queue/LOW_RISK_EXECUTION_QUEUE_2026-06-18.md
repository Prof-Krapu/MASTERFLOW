# Low-risk execution queue — 2026-06-18

Status: `PUBLISHED_DRAFT_PR`

GitHub PR: `#6` — https://github.com/Prof-Krapu/MASTERFLOW/pull/6

## Cadre

MALEX a validé l'enchaînement des tâches sans risque avec commit/push progressif. Dans ce document,
`sans risque` veut dire : audit, spec, queue, ledger, matrice, recette papier ou vérification
read-only. Cela n'autorise pas automatiquement une migration, une route, un endpoint sensible, un
secret, un provider live, un export réel ou un envoi étudiant.

Vincent n'est plus une dépendance bloquante : sa partie est considérée clôturée. Les contrôles
restants se font contre le canon MasterFlow, GitHub `main`, les tests locaux et les validations
MALEX.

## Contrat de sécurité

- OK : lire, auditer, comparer, documenter, classer, créer des specs.
- OK : commit/push les lots low-risk sur branche Codex.
- Stop avant : merge, migration runtime, code sensible, permission, export, publication, envoi,
  provider live, suppression.
- Toujours : garder `feedback terrain`, `hypothèse produit`, `canon`, `implémentation` et
  `déploiement` séparés.

## Ordre d'exécution

| Ordre | Chantier | Risque actuel | Sortie attendue | Statut |
|---:|---|---|---|---|
| 1 | Nettoyage queue post-Vincent | faible | files de pilotage alignées | done_queue |
| 2 | D06 export preview audit | faible en spec | contrat `correction_export_preview` → inbox ou rejet | done_spec |
| 3 | Recette D05-D06 runtime | faible | script de vérification sans mutation dangereuse | done_recipe |
| 4 | D12 cockpit gap audit | faible | liste des indicateurs manquants pour ne plus travailler à l'aveugle | done_audit |
| 5 | Process activation audit | faible | où MasterFlow doit déclencher sans MALEX-orchestrateur caché | done_refresh |
| 6 | User feedback intake | faible | méthode d'absorption sans canonisation automatique | done_route |
| 7 | D08 manifest-first lock | faible en spec, élevé en code | verrouillage clair avant génération visuelle | done_locked_refresh |

## Décisions déjà actées

- `feedback_draft` D06 est sur `main` via PR #5.
- `correction_export_preview` est le candidat logique suivant, mais seulement en audit/spec pour
  l'instant.
- `student_send`, publication, note finale, storage réel et D08 génération restent verrouillés.

## Prochain commit attendu

Lot 1 : mise à jour des queues et matrices pour acter que Vincent n'est plus bloquant et que le
travail safe peut s'enchaîner.

Lot 2 : audit `correction_export_preview` comme deuxième projection D06 possible, sans code.

Lot 3 : recette runtime D05-D06 post-PR #5, sans mutation dangereuse.

Lot 4 : audit gap D12 Owner Cockpit, sans code.

Lot 5 : refresh process activation audit post-PR #5, sans code.

Lot 6 : refresh user feedback intake routing, sans absorption canon.

Lot 7 : refresh D08 manifest-first lock post-PR #5, sans code, sans provider, sans génération.

## Résultat de queue

Tous les lots low-risk de cette file sont traités côté audit/spec/ledger.

La file est publiée en PR draft pour review/merge ultérieur. Elle ne doit pas être interprétée
comme un déploiement runtime tant que la PR n'est pas validée puis mergée.

Prochaine file safe possible :

- `D08_MANIFEST_READ_MODEL_SPEC` — done_spec_on_pr6
- `PROCESS_ACTIVATION_READ_MODEL_SPEC` — done_spec_on_pr6
- `FEEDBACK_OUTPUT_FAMILY_REGISTRY_SPEC`

Stop avant merge, migration runtime, provider, génération, export ou publication.
