# MasterFlow — Canon Sync Matrix

Dernière vérification : 2026-06-18  
Branche de travail : `codex/d06-validation-inbox-contract`
GitHub `main` vérifié : `c2a4ea3`

Le Drive MasterFlow reste la source de vérité produit. Ce fichier décrit uniquement l'écart avec
le runtime GitHub.

| Élément canon | Statut GitHub | Écart | Risque | Action recommandée |
|---|---|---|---|---|
| Shared Validation Inbox | partiel | Les actions sont sur `main`; `feedback_draft` est implémenté localement mais non publié. | moyen | Publier la tranche D06 après validation commit/push/PR. |
| D05 sujet guidé | partiel | Fondation et lecture Teaching mergées ; création/réponse UI absentes. | faible | Tester plus tard avec une vraie session autorisée. |
| D06 correction / feedback | partiel | Projection `feedback_draft` codée localement ; pas encore sur `main`. | moyen | Publier puis rafraîchir le pont Drive. |
| D05-D06 Teaching readiness | implémenté | Panneau mergé ; Teaching ouvert dans Home uniquement pour professeur et godmode. | faible | Étendre par petites tranches en lecture avant D06. |
| D12 owner observability | partiel | Cockpit et jobs en lecture seule ; findings/missed triggers absents. | moyen | Ajouter un agrégat backend seulement après la tranche D05-D06. |
| D08 génération visuelle | futur | Manifest/storage/provenance/review incomplets. | élevé | Maintenir le verrou provider et génération. |
| Pont de déploiement Drive | implémenté | Drive et GitHub référencent `c2a4ea3`. | faible | Rafraîchir après le prochain merge. |
