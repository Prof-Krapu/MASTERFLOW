# Reçu de publication — Correction Context V1

Statut : `MERGED_VERIFIED`

| Tranche | PR | SHA main |
|---|---:|---|
| Cohortes et rosters versionnés | #59 | `236add0` |
| Snapshot correction immuable | #60 | `c0bad0b` |
| Enforcement manifest/run | #61 | `a5fca40` |
| Payload privé compilé | #62 | `53efad0` |

Recette finale conservée : 363 tests backend, TypeScript backend/frontend et build
frontend verts. Aucun provider, import, migration live, matching automatique ou
feedback final n'a été activé.

Le contexte de correction ne dépend plus de la mémoire de conversation : la
fondation runtime sait conserver et compiler la classe, la version du roster,
le sujet, le barème et les références exactes.

Écart restant : relier chaque submission à une identité du roster, puis exposer
la gestion manuelle côté professeur.
