# MasterFlow — Canon Sync Matrix

Dernière vérification : 2026-06-18  
Branche de travail : `codex/low-risk-masterflow-queue`
GitHub `main` vérifié : `bb61e4f`

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
| Pont de déploiement Drive | implémenté | Drive et GitHub référencent `bb61e4f`. | faible | Rafraîchir après le prochain merge. |
