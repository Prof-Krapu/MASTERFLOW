# MasterFlow — Canon Sync Matrix

Dernière vérification : 2026-06-19
Branche de travail : `codex/persistent-room-hard-stop-publish-proof`
Base GitHub vérifiée : `64aa5a0`

Le Drive MasterFlow reste la source de vérité produit. Ce fichier décrit uniquement l'écart avec
le runtime GitHub.

| Élément canon | Statut GitHub | Écart | Risque | Action recommandée |
|---|---|---|---|---|
| D01 identité, accès, ownership | implémenté fondation | Auth, invitations, projets, membres et scopes existent ; classe dédiée absente. | faible | Garder le projet comme scope actuel sans inventer une classe. |
| D02 contexte, mémoire, RAG | partiel | Context compiler, loadout, Resource Truth, memory et RAG lexical existent ; fichier/vectoriel réel absent. | moyen | Ne pas promettre BGE/Qdrant ou file storage. |
| D03 Room OS et commandes | partiel | Rooms, instances, checkpoints et frontend existent ; command surface complète absente. | moyen | Ajouter les contrôles par tranches explicites. |
| D04 personas et bots contextuels | partiel | Personas/blends existent ; affectations contextuelles et bots bornés incomplets. | moyen | Maintenir persona ≠ permission. |
| Shared Validation Inbox | partiel | Actions, objets D06 et findings D12 sont sur `main`. | faible | Ajouter les prochains domaines uniquement avec leur autorité métier propre. |
| D05 sujet guidé | implémenté | Création/réponse/fin Teaching sont sur `main`, professeur/godmode uniquement. | faible | Garder D06 et participation élève séparés. |
| D06 correction / feedback | partiel | Feedback et preview privée sont dans l'inbox sur `main`; send reste exclu. | moyen | Prochaine tranche D06 uniquement avec gate séparé. |
| D05-D06 Teaching readiness | implémenté | Panneau mergé ; Teaching ouvert dans Home uniquement pour professeur et godmode. | faible | Étendre par petites tranches en lecture avant D06. |
| D12 owner observability | partiel | Cockpit, findings, décisions owner, création manuelle et revue inbox sont sur `main`. | faible | Garder detector, fix et canonisation automatiques absents. |
| D08 génération visuelle | futur | Manifest/storage/provenance/review incomplets. | élevé | Maintenir le verrou provider et génération. |
| D09 MasterStory | absent runtime | Aucun stockage ou workbench MasterStory dédié confirmé. | moyen | Garder les récits en candidats jusqu'à une tranche dédiée. |
| D10 événements/devis/public | futur | Pas de Quote Builder privé ni de public intake dédié. | élevé | Commencer plus tard par le devis privé, jamais par l'envoi. |
| D11 factories/backflow | hors runtime | Factories externes utiles comme terrain, sans absorption canon automatique. | moyen | Auditer Usage Harvester ; garder les factories candidates. |
| Specs de contrôle low-risk PR #6 | implémenté docs | Read-models/specs mergés ; aucune enforcement runtime nouvelle. | faible | Choisir ensuite une première tranche read-only à implémenter ou continuer la queue safe. |
| Pont de déploiement Drive | en retard d'une tranche | Drive reflète PR #24 / `f08ee75`; GitHub `main` contient PR #25 / `64aa5a0`. | moyen | Rafraîchir le pont sur le SHA final de clôture. |
| Déploiement live vérifiable | inconnu | Aucun workflow GitHub Actions ni environnement GitHub ; le Funnel historique n'a pas été revérifié dans cette tranche. | élevé | Injecter `MASTERFLOW_RELEASE_SHA` au déploiement et faire un smoke live séparé. |
| D12 Owner Cockpit status | implémenté | Agrégat runtime privé sur `main`; aucune lecture automatique GitHub/Drive. | faible | Conserver le statut live non vérifié sans SHA injecté. |
| Hard stop / action expiry | implémenté | Garde, preview, sélection et état persistant owner+Room sont sur `main`. Context hashes restent absents. | faible | Auditer les context hash snapshots séparément. |
| Context hash / re-preflight | absent runtime | Audit confirme que le contexte compilé n'a ni fingerprint stable ni registre de révision commun. | moyen | Valider snapshot + comparateur read-only avant toute invalidation automatique. |
