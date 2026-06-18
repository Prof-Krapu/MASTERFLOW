# MasterFlow — Canon Sync Matrix

Dernière vérification : 2026-06-18
Branche de travail : `main`
Payload PR #6 vérifié : `4e0cfbb`

Le Drive MasterFlow reste la source de vérité produit. Ce fichier décrit uniquement l'écart avec
le runtime GitHub.

| Élément canon | Statut GitHub | Écart | Risque | Action recommandée |
|---|---|---|---|---|
| D01 identité, accès, ownership | implémenté fondation | Auth, invitations, projets, membres et scopes existent ; classe dédiée absente. | faible | Garder le projet comme scope actuel sans inventer une classe. |
| D02 contexte, mémoire, RAG | partiel | Context compiler, loadout, Resource Truth, memory et RAG lexical existent ; fichier/vectoriel réel absent. | moyen | Ne pas promettre BGE/Qdrant ou file storage. |
| D03 Room OS et commandes | partiel | Rooms, instances, checkpoints et frontend existent ; command surface complète absente. | moyen | Ajouter les contrôles par tranches explicites. |
| D04 personas et bots contextuels | partiel | Personas/blends existent ; affectations contextuelles et bots bornés incomplets. | moyen | Maintenir persona ≠ permission. |
| Shared Validation Inbox | partiel | Les actions et `feedback_draft` D06 sont sur `main`; les autres objets D06-D12 ne sont pas encore projetés. | moyen | Auditer `correction_export_preview` en deuxième projection possible. |
| D05 sujet guidé | implémenté local vérifié | Fondation et lecture sont sur `main`; création/réponse/fin Teaching passent une vraie session locale, professeur/godmode uniquement. | faible | Publier sans ouvrir D06 ni participation élève. |
| D06 correction / feedback | partiel | `feedback_draft` est projeté owner-only dans la Validation Inbox ; export preview et send restent exclus. | moyen | Spécifier export preview sans ouvrir publication/envoi. |
| D05-D06 Teaching readiness | implémenté | Panneau mergé ; Teaching ouvert dans Home uniquement pour professeur et godmode. | faible | Étendre par petites tranches en lecture avant D06. |
| D12 owner observability | partiel | Cockpit et jobs en lecture seule ; findings/missed triggers absents. | moyen | Ajouter un agrégat backend seulement après la tranche D05-D06. |
| D08 génération visuelle | futur | Manifest/storage/provenance/review incomplets. | élevé | Maintenir le verrou provider et génération. |
| D09 MasterStory | absent runtime | Aucun stockage ou workbench MasterStory dédié confirmé. | moyen | Garder les récits en candidats jusqu'à une tranche dédiée. |
| D10 événements/devis/public | futur | Pas de Quote Builder privé ni de public intake dédié. | élevé | Commencer plus tard par le devis privé, jamais par l'envoi. |
| D11 factories/backflow | hors runtime | Factories externes utiles comme terrain, sans absorption canon automatique. | moyen | Auditer Usage Harvester ; garder les factories candidates. |
| Specs de contrôle low-risk PR #6 | implémenté docs | Read-models/specs mergés ; aucune enforcement runtime nouvelle. | faible | Choisir ensuite une première tranche read-only à implémenter ou continuer la queue safe. |
| Pont de déploiement Drive | implémenté | Drive rafraîchi après le payload PR #6 ; les commits de pilotage peuvent faire avancer `main` sans changer le runtime. | faible | Rafraîchir après le prochain merge runtime ou docs important. |
| Déploiement live vérifiable | inconnu | Aucun workflow GitHub Actions ni environnement GitHub ; le Funnel historique n'a pas été revérifié dans cette tranche. | élevé | Injecter `MASTERFLOW_RELEASE_SHA` au déploiement et faire un smoke live séparé. |
| D12 Owner Cockpit status | implémenté local | Agrégat runtime privé prêt localement ; aucune lecture automatique GitHub/Drive. | faible | Tester, publier après validation, puis rafraîchir le pont Drive. |
