# MasterFlow — Canon Sync Matrix

Dernière vérification : 2026-06-18  
Branche de travail : `codex/teaching-guided-session-read`
GitHub `main` vérifié : `ed7c0f1`

Le Drive MasterFlow reste la source de vérité produit. Ce fichier décrit uniquement l'écart avec
le runtime GitHub.

| Élément canon | Statut GitHub | Écart | Risque | Action recommandée |
|---|---|---|---|---|
| Shared Validation Inbox | partiel | Les actions sont raccordées, pas encore tous les objets D06-D12. | moyen | Projeter les prochains objets dans l'inbox commune, sans queue parallèle. |
| D05 sujet guidé | partiel | Fondation backend réelle ; liste scoped et lecture Teaching implémentées localement, mutations volontairement absentes de cette tranche. | faible | Publier la lecture puis tester avec une vraie session autorisée. |
| D06 correction / feedback | partiel | Fondations backend présentes, routes et UI dédiées absentes. | moyen | Demander à Vincent le contrat minimal de lecture D06. |
| D05-D06 Teaching readiness | implémenté | Panneau mergé ; Teaching ouvert dans Home uniquement pour professeur et godmode. | faible | Étendre par petites tranches en lecture avant D06. |
| D12 owner observability | partiel | Cockpit et jobs en lecture seule ; findings/missed triggers absents. | moyen | Ajouter un agrégat backend seulement après la tranche D05-D06. |
| D08 génération visuelle | futur | Manifest/storage/provenance/review incomplets. | élevé | Maintenir le verrou provider et génération. |
| Pont de déploiement Drive | implémenté | Drive et GitHub référencent `ed7c0f1`. | faible | Rafraîchir après le prochain merge. |
