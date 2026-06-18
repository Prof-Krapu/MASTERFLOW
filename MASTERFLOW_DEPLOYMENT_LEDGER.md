# MasterFlow — Deployment Ledger

Ce journal trace les gestes GitHub et runtime. Une entrée `local` n'est ni commitée, ni poussée,
ni déployée.

| Date | Action | Intention produit | Fichiers touchés | Statut | Validation | Résultat |
|---|---|---|---|---|---|---|
| 2026-06-18 | Merge PR #2 | Donner une lecture owner des jobs, validations et prochaines actions sûres. | owner cockpit + mappings/queue | déployé sur `main` | obtenue | GitHub `main` = `0970dc4`. |
| 2026-06-18 | Merge PR #3 | Déployer Teaching readiness pour professeur et godmode. | panneau Teaching + permissions + ledgers | déployé sur `main` | obtenue | GitHub `main` = `ed7c0f1`. |
| 2026-06-18 | Rafraîchissement pont Drive | Aligner la preuve de déploiement sur GitHub. | `DEPLOYMENT_TO_REBUILD_INBOX.md`, `GITHUB_IMPLEMENTATION_SNAPSHOT.json` | synchronisé | obtenue | Drive relu avec SHA `ed7c0f1`, tests 294/294. |
| 2026-06-18 | Teaching Guided Subject | Afficher le vrai guide/session lisible et sa progression. | guided runtime router/service/test + frontend API/Teaching/CSS | prêt à publier | obtenue | Tests ciblés 11/11, lint/build et smoke responsive OK. |
| 2026-06-18 | Contrôle sync distant | Vérifier que le travail part d'un GitHub propre. | aucun | vérifié | non | `HEAD...origin/main = 0/0` avant création de branche ; API GitHub directe momentanément indisponible. |
