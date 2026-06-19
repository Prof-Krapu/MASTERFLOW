# MasterFlow — Canon Sync Matrix

Dernière vérification : 2026-06-19
Branche de travail : `codex/context-policy-and-visibility-publish-proof`
Base GitHub vérifiée : `09140e8`

Le Drive MasterFlow reste la source de vérité produit. Ce fichier décrit uniquement l'écart avec
le runtime GitHub.

| Élément canon | Statut GitHub | Écart | Risque | Action recommandée |
|---|---|---|---|---|
| D01 identité, accès, ownership | implémenté fondation | Auth, invitations, projets, membres et scopes existent ; classe dédiée absente. | faible | Garder le projet comme scope actuel sans inventer une classe. |
| D02 contexte, mémoire, RAG | partiel | Context compiler, loadout, Resource Truth, memory et RAG lexical existent ; fichier/vectoriel réel absent. | moyen | Ne pas promettre BGE/Qdrant ou file storage. |
| D03 Room OS et commandes | partiel | Rooms, instances, checkpoints et frontend existent ; command surface complète absente. | moyen | Ajouter les contrôles par tranches explicites. |
| D04 personas et bots contextuels | partiel | Personas/blends existent ; affectations contextuelles et bots bornés incomplets. | moyen | Maintenir persona ≠ permission. |
| Shared Validation Inbox | partiel | Actions, objets D06 et findings D12 sont sur `main`. | faible | Ajouter les prochains domaines uniquement avec leur autorité métier propre. |
| D05 sujet guidé | implémenté | Création/réponse/fin Teaching sont sur `main`, professeur/godmode uniquement ; recette isolée 12/12 validée. | faible | Garder D06 et participation élève séparés. |
| D06 correction / feedback | partiel | Feedback et preview privée sont dans l'inbox sur `main`; recette isolée D06 + inbox 26/26 ; send reste exclu. | moyen | Prochaine tranche D06 uniquement avec gate séparé. |
| D05-D06 Teaching readiness | implémenté | Panneau mergé ; Teaching ouvert dans Home uniquement pour professeur et godmode ; backend complet 341/341 après recette isolée. | faible | Conserver stockage, export publié et envoi hors scope. |
| D12 owner observability | partiel | Cockpit, findings, décisions owner, création manuelle et revue inbox sont sur `main`. | faible | Garder detector, fix et canonisation automatiques absents. |
| D08 génération visuelle | futur | Manifest/storage/provenance/review incomplets. | élevé | Maintenir le verrou provider et génération. |
| D09 MasterStory | absent runtime | Aucun stockage ou workbench MasterStory dédié confirmé. | moyen | Garder les récits en candidats jusqu'à une tranche dédiée. |
| D10 événements/devis/public | futur | Pas de Quote Builder privé ni de public intake dédié. | élevé | Commencer plus tard par le devis privé, jamais par l'envoi. |
| D11 factories/backflow | hors runtime | Factories externes utiles comme terrain, sans absorption canon automatique. | moyen | Auditer Usage Harvester ; garder les factories candidates. |
| Specs de contrôle low-risk PR #6 | implémenté docs | Read-models/specs mergés ; aucune enforcement runtime nouvelle. | faible | Choisir ensuite une première tranche read-only à implémenter ou continuer la queue safe. |
| Pont de déploiement Drive | en retard de deux tranches | Drive reflète PR #30 / `1f0b09d`; GitHub `main` contient politique PR #31 et visibilité PR #32. | moyen | Rafraîchir le pont sur le SHA final. |
| Déploiement live vérifiable | inconnu | Aucun workflow GitHub Actions ni environnement GitHub ; le Funnel historique n'a pas été revérifié dans cette tranche. | élevé | Injecter `MASTERFLOW_RELEASE_SHA` au déploiement et faire un smoke live séparé. |
| D12 Owner Cockpit status | implémenté | Agrégat runtime privé sur `main`; aucune lecture automatique GitHub/Drive. | faible | Conserver le statut live non vérifié sans SHA injecté. |
| Hard stop / action expiry | implémenté | Garde, preview, sélection et état persistant owner+Room sont sur `main`. Context hashes restent absents. | faible | Auditer les context hash snapshots séparément. |
| Context hash / re-preflight | partiel implémenté | Snapshot privé et comparateur read-only sont sur `main` ; seules les refs avec révision fiable sont comparées. | faible | Décider les familles qui imposeraient réellement stale ou re-preflight. |
| Politique changement de contexte V1 | implémenté docs | Toute divergence fiable demande revue/re-preflight ; stale auto interdit hors hard-stop déjà borné. | faible | Conserver la décision humaine. |
| Visibilité owner du comparateur | implémenté | Trace d'action montre le résultat et les refs, sans action de mutation. | faible | Garder la décision re-preflight humaine. |
