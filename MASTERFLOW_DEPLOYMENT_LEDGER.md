# MasterFlow — Deployment Ledger

Ce journal trace les gestes GitHub et runtime. Une entrée `local` n'est ni commitée, ni poussée,
ni déployée.

| Date | Action | Intention produit | Fichiers touchés | Statut | Validation | Résultat |
|---|---|---|---|---|---|---|
| 2026-06-18 | Merge PR #2 | Donner une lecture owner des jobs, validations et prochaines actions sûres. | owner cockpit + mappings/queue | déployé sur `main` | obtenue | GitHub `main` = `0970dc4`. |
| 2026-06-18 | Merge PR #3 | Déployer Teaching readiness pour professeur et godmode. | panneau Teaching + permissions + ledgers | déployé sur `main` | obtenue | GitHub `main` = `ed7c0f1`. |
| 2026-06-18 | Rafraîchissement pont Drive | Aligner la preuve de déploiement sur GitHub. | `DEPLOYMENT_TO_REBUILD_INBOX.md`, `GITHUB_IMPLEMENTATION_SNAPSHOT.json` | synchronisé | obtenue | Drive relu avec SHA `ed7c0f1`, tests 294/294. |
| 2026-06-18 | Merge PR #4 | Déployer la lecture scoped guide/session dans Teaching. | guided runtime + frontend Teaching + ledgers | déployé sur `main` | obtenue | GitHub `main` = `c2a4ea3`. |
| 2026-06-18 | Rafraîchissement pont Drive | Aligner la preuve après PR #4. | inbox déploiement + snapshot JSON | synchronisé | obtenue | Drive relu avec SHA `c2a4ea3`, tests 294/294. |
| 2026-06-18 | Contrat projection D06 | Choisir le premier objet D06 sûr pour l'inbox commune. | `docs/d06/D06_VALIDATION_INBOX_PROJECTION_CONTRACT_2026-06-18.md` | spec locale | requise avant code | `feedback_draft` retenu ; pré-correction/export exclus de la première tranche. |
| 2026-06-18 | Contrôle sync distant | Vérifier que le travail part d'un GitHub propre. | aucun | vérifié | non | `HEAD...origin/main = 0/0` avant création de branche ; API GitHub directe momentanément indisponible. |
| 2026-06-18 | Implémentation locale D06 Validation Inbox | Raccorder le premier objet D06 réel à l'inbox commune sans queue parallèle. | shared schema + SQLite migration + validation inbox service + feedback service + tests + pilotage | local prêt | validation requise avant commit/push | `feedback_draft` owner-only projeté ; décisions déléguées à `reviewFeedbackDraft`; 299/299 backend, TS front/back et build front OK. |
| 2026-06-18 | Merge PR #5 | Déployer la projection D06 `feedback_draft` dans la Shared Validation Inbox. | shared schema + DB migration + validation inbox service + feedback service + tests | déployé sur `main` | obtenue | GitHub `main` = `bb61e4f`; Drive bridge rafraîchi; backend 299/299, TS front/back et build front OK. |
| 2026-06-18 | Queue post-Vincent | Retirer Vincent comme dépendance bloquante et classer les tâches safe à enchaîner. | action queue + runtime queue + matrice | local | GO MALEX pour commit/push progressif | Chantiers sans risque limités à queue/spec/audit/ledger. |
| 2026-06-18 | Audit export preview D06 | Spécifier le deuxième candidat D06 pour l'inbox commune sans ouvrir export/send. | `docs/d06/D06_EXPORT_PREVIEW_INBOX_AUDIT_2026-06-18.md` + queue | local | non requise pour audit | Candidat viable plus tard ; code/migration explicitement hors scope. |
| 2026-06-18 | Recette D05-D06 runtime | Décrire la vérification sûre post-PR #5 sans lancer de flux risqué. | `docs/d05-d06/D05_D06_RUNTIME_RECIPE_2026-06-18.md` | local | non requise | Recette safe : Teaching read-only + guided read + Validation Inbox feedback, sans export/send. |
| 2026-06-18 | Audit gap D12 cockpit | Clarifier ce que le cockpit owner voit déjà et ce qui manque pour ne plus travailler à l'aveugle. | `docs/d12/D12_OWNER_COCKPIT_GAP_AUDIT_2026-06-18.md` | local | non requise | Cockpit read-only confirmé partiel ; findings/missed triggers/gap tracker runtime restent futurs. |
