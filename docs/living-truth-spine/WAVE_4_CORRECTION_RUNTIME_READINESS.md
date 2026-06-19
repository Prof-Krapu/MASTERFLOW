# Vague 4 — Préparation runtime : correction contextualisée

Statut : `AUDITED_READY_FOR_MIGRATION_GATE`

## Diagnostic simple

Le backend sait déjà créer des batches de correction, relier des soumissions à
des preuves, geler les versions de barème et imposer la validation professeur
sur les feedbacks. Il sait aussi produire des Context Packs RAG permissionnés.

Il ne sait pas encore représenter durablement une classe, un roster versionné,
un étudiant/alias ni un snapshot qui relie ces objets à une correction. C'est
pourquoi le bot peut aujourd'hui avoir besoin qu'on lui répète la liste et le
contexte.

## Preuves dans le runtime actuel

| Élément existant | Preuve | Réemploi prévu |
|---|---|---|
| correction privée et validation prof | `correction_batches`, `submissions`, `feedback_drafts` | conserver les garde-fous actuels |
| versions de barème | `rubric_versions` | référencer la version dans le snapshot |
| preuve de soumission | `submissions.source_evidence_ref` | rattacher transcription/copie au `source_record` |
| contexte scope/autorisé | `rag_context_packs` | compiler le Context Pack de correction |
| projection pédagogique privée | `feedback_drafts` + validation inbox | ne promouvoir qu'après validation |

## Écart à combler par une migration additive

Nouveaux objets proposés : `cohorts`, `roster_versions`, `roster_members`,
`student_identities`, `identity_match_candidates`, `source_records` et
`correction_context_snapshots`.

La stratégie est additive : aucune table existante n'est renommée, supprimée ou
reconstruite ; les batches historiques restent lisibles. Les nouvelles
références sont d'abord optionnelles pour garder la compatibilité, puis une
politique de création exige le snapshot pour les nouveaux runs contextualisés.

## Contrat de déploiement de la tranche code

- Intention produit : ne plus devoir recharger manuellement la liste et le
  contexte de correction.
- Canon concerné : `CLASS_COHORT_ROSTER_AND_CORRECTION_CONTEXT_CONTRACT.md`.
- Ce qui change : schéma SQLite additif, services privés, routes teacher/admin,
  Context Pack immuable et tests.
- Ce qui ne change pas : batches passés, barèmes existants, validation prof,
  correction finale, export, provider, synchronisation externe.
- Critère simple : un nouveau run explicite conserve exactement son roster,
  ses identités résolues, sa source, son sujet et son barème.
- Risque de dérive : moyen — données pédagogiques privées et migration locale.
- Validation nécessaire : oui, juste avant exécution de la migration sur une
  base contenant des données réelles.

## Séquence de réalisation sans dette

1. Tests de schéma sur base vide et base de compatibilité préexistante.
2. Tables et index additifs, sans import automatique.
3. Service roster/identité scoped, avec ambiguïtés en queue de review.
4. Snapshot de contexte écrit une seule fois à la création du batch.
5. Lecture de correction qui réutilise le snapshot sans le modifier.
6. Routes privées teacher/admin, puis validation inbox si une identité est
   ambiguë.
7. Tests d'isolement entre cohortes, invalidation de roster, non-réécriture de
   l'historique et absence de feedback final automatique.
8. Preflight sur copie/sauvegarde de base avant toute activation live.

## Décision de sécurité

La documentation et les tests de compatibilité peuvent continuer. La migration
vers une base réelle, son déploiement et toute importation de roster restent
gated : ils exigent une sauvegarde vérifiable, un rollback et un GO explicite
de MALEX au moment de l'opération.
