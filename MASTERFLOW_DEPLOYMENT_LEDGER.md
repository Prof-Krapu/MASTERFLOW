# MasterFlow — Deployment Ledger

Ce journal trace les gestes GitHub et runtime. Une entrée `local` n'est ni commitée, ni poussée,
ni déployée.

| Date | Action | Intention produit | Fichiers touchés | Statut | Validation | Résultat |
|---|---|---|---|---|---|---|
| 2026-06-18 | Merge PR #2 | Donner une lecture owner des jobs, validations et prochaines actions sûres. | owner cockpit + mappings/queue | déployé sur `main` | obtenue | GitHub `main` = `0970dc4`. |
| 2026-06-18 | Teaching Room Readiness Panel | Montrer ce qui est prêt, partiel ou bloqué avant travail D05-D06. | `apps/frontend/src/teaching-readiness.tsx`, `App.tsx`, `styles.css` | prêt à publier | obtenue | TypeScript/build OK ; smoke godmode et responsive 390 px OK. |
| 2026-06-18 | Ouverture Teaching dans Home | Rendre la tranche D05-D06 accessible sans l'exposer aux élèves/admins. | `mode-runtime.ts`, `db/seed.ts` | prêt à publier | obtenue pour professeur + godmode | Mode visible en godmode ; test rôles professeur/godmode autorisés, élève/admin exclus. |
| 2026-06-18 | Contrôle sync distant | Vérifier que le travail part d'un GitHub propre. | aucun | vérifié | non | `HEAD...origin/main = 0/0` avant création de branche ; API GitHub directe momentanément indisponible. |
