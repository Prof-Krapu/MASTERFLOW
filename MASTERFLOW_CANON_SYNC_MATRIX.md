# MasterFlow — Canon Sync Matrix

Dernière vérification : 2026-06-18
Branche de travail : `main`
Payload PR #6 vérifié : `4e0cfbb`

Le Drive MasterFlow reste la source de vérité produit. Ce fichier décrit uniquement l'écart avec
le runtime GitHub.

| Élément canon | Statut GitHub | Écart | Risque | Action recommandée |
|---|---|---|---|---|
| Shared Validation Inbox | partiel | Les actions et `feedback_draft` D06 sont sur `main`; les autres objets D06-D12 ne sont pas encore projetés. | moyen | Auditer `correction_export_preview` en deuxième projection possible. |
| D05 sujet guidé | partiel | Fondation et lecture Teaching mergées ; création/réponse UI absentes. | faible | Tester plus tard avec une vraie session autorisée. |
| D06 correction / feedback | partiel | `feedback_draft` est projeté owner-only dans la Validation Inbox ; export preview et send restent exclus. | moyen | Spécifier export preview sans ouvrir publication/envoi. |
| D05-D06 Teaching readiness | implémenté | Panneau mergé ; Teaching ouvert dans Home uniquement pour professeur et godmode. | faible | Étendre par petites tranches en lecture avant D06. |
| D12 owner observability | partiel | Cockpit et jobs en lecture seule ; findings/missed triggers absents. | moyen | Ajouter un agrégat backend seulement après la tranche D05-D06. |
| D08 génération visuelle | futur | Manifest/storage/provenance/review incomplets. | élevé | Maintenir le verrou provider et génération. |
| Specs de contrôle low-risk PR #6 | implémenté docs | Read-models/specs mergés ; aucune enforcement runtime nouvelle. | faible | Choisir ensuite une première tranche read-only à implémenter ou continuer la queue safe. |
| Pont de déploiement Drive | implémenté | Drive rafraîchi après le payload PR #6 ; les commits de pilotage peuvent faire avancer `main` sans changer le runtime. | faible | Rafraîchir après le prochain merge runtime ou docs important. |
