# MasterFlow — Canon Sync Matrix

Dernière vérification : 2026-06-18  
Branche de travail : `codex/d05-d06-teaching-readiness`  
GitHub `main` vérifié : `0970dc4`

Le Drive MasterFlow reste la source de vérité produit. Ce fichier décrit uniquement l'écart avec
le runtime GitHub.

| Élément canon | Statut GitHub | Écart | Risque | Action recommandée |
|---|---|---|---|---|
| Shared Validation Inbox | partiel | Les actions sont raccordées, pas encore tous les objets D06-D12. | moyen | Projeter les prochains objets dans l'inbox commune, sans queue parallèle. |
| D05 sujet guidé | implémenté | Fondation backend réelle, session active non exposée dans la surface Teaching. | moyen | Ajouter une lecture de session après décision sur la Room pédagogique. |
| D06 correction / feedback | partiel | Fondations backend présentes, routes et UI dédiées absentes. | moyen | Demander à Vincent le contrat minimal de lecture D06. |
| D05-D06 Teaching readiness | implémenté sur branche | Panneau vérifié ; Teaching ouvert dans Home uniquement pour professeur et godmode. | faible | Publier la branche, relire la PR puis merger après validation. |
| D12 owner observability | partiel | Cockpit et jobs en lecture seule ; findings/missed triggers absents. | moyen | Ajouter un agrégat backend seulement après la tranche D05-D06. |
| D08 génération visuelle | futur | Manifest/storage/provenance/review incomplets. | élevé | Maintenir le verrou provider et génération. |
| Pont de déploiement Drive | en retard | Le Drive annonce encore `489b00a`, GitHub `main` est à `0970dc4`. | moyen | Rafraîchir le snapshot Drive après validation explicite. |
