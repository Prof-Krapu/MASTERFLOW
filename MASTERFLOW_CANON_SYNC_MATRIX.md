# MasterFlow — Canon Sync Matrix

Dernière vérification : 2026-06-20
Branche de travail : `main` — D08 R3.1-R3.3 publiées
Base GitHub vérifiée : `ab418e1` (`main` après PR #106)

Le Drive MasterFlow reste la source de vérité produit. Ce fichier décrit uniquement l'écart avec
le runtime GitHub.

| Élément canon | Statut GitHub | Écart | Risque | Action recommandée |
|---|---|---|---|---|
| D01 identité, accès, ownership | implémenté fondation | Auth, invitations, projets, membres/scopes et cohorte/roster privés sont sur `main`; organisation absente. | faible | Garder l'organisation future, sans multi-tenant prématuré. |
| D02 contexte, mémoire, RAG | partiel | Context compiler, loadout, Resource Truth, memory et RAG lexical existent ; fichier/vectoriel réel absent. | moyen | Ne pas promettre BGE/Qdrant ou file storage. |
| D03 Room OS et commandes | partiel | Rooms, instances, checkpoints et frontend existent ; command surface complète absente. | moyen | Ajouter les contrôles par tranches explicites. |
| D04 personas et bots contextuels | partiel | Personas/blends existent ; affectations contextuelles et bots bornés incomplets. | moyen | Maintenir persona ≠ permission. |
| Shared Validation Inbox | partiel | Actions, objets D06, findings D12, candidates Usage Learning et intake factory D11 sont sur `main`. | faible | Ajouter les prochains domaines uniquement avec leur autorité métier propre. |
| D05 sujet guidé | implémenté | Guided Runtime, sujets privés versionnés et assignments de cohorte sont sur `main`, professeur/godmode uniquement. | faible | Garder participation élève et publication séparées. |
| D06 correction / feedback | partiel | R1 atteint le manifest professeur sans runner ; R2.1-R2.6 sont sur `main` : sujet, assignment, fiche, paramètres, diff et édition professeur privée. | faible à moyen | Garder R1.5 fermé ; passer à D08 manifest-first ou audit D07. |
| D05-D06 Teaching readiness | implémenté | Panneau mergé ; Teaching ouvert dans Home uniquement pour professeur et godmode ; backend complet 341/341 après recette isolée. | faible | Conserver stockage, export publié et envoi hors scope. |
| D12 owner observability | partiel | Cockpit, findings, décisions owner et Usage Harvester V1 sont sur `main` ; détection automatique des findings reste absente. | faible | Étendre les sources structurées une par une, sans analyse brute ni auto-fix. |
| D08 génération visuelle | partiel | R3.1-R3.3 sont sur `main` : registre, panneau owner, classement. Provider, storage, asset lifecycle et review restent absents. | moyen | Préparer une soumission Inbox manuelle, sans exécution. |
| D09 MasterStory | absent runtime | Aucun stockage ou workbench MasterStory dédié confirmé. | moyen | Garder les récits en candidats jusqu'à une tranche dédiée. |
| D10 événements/devis/public | futur | Pas de Quote Builder privé ni de public intake dédié. | élevé | Commencer plus tard par le devis privé, jamais par l'envoi. |
| D11 factories/backflow | implémenté V1 borné | V6C intake JSON/quarantaine, V6D candidate updates, V6E recommandations lecture seule et V6F routage manuel whitelisté sont sur `main`. Toute route reste `candidate_only`. | faible | D11 V1 est clos ; ne rouvrir que sur une nouvelle décision produit explicitant une frontière encore exclue. |
| Specs de contrôle low-risk PR #6 | implémenté docs | Read-models/specs mergés ; aucune enforcement runtime nouvelle. | faible | Choisir ensuite une première tranche read-only à implémenter ou continuer la queue safe. |
| Pont de déploiement Drive | synchronisé | Le pont est rafraîchi après la dernière PR de preuve ; le SHA exact reste porté par le snapshot Drive. | faible | Rafraîchir après chaque merge de preuve ou changement runtime. |
| Déploiement live vérifiable | inconnu | Aucun workflow GitHub Actions ni environnement GitHub ; le Funnel historique n'a pas été revérifié dans cette tranche. | élevé | Injecter `MASTERFLOW_RELEASE_SHA` au déploiement et faire un smoke live séparé. |
| D12 Owner Cockpit status | implémenté | Agrégat runtime privé sur `main`; aucune lecture automatique GitHub/Drive. | faible | Conserver le statut live non vérifié sans SHA injecté. |
| Hard stop / action expiry | implémenté | Garde, preview, sélection et état persistant owner+Room sont sur `main`. | faible | Conserver activation et reprise explicites, sans déclenchement automatique depuis le texte. |
| Context hash / re-preflight | partiel implémenté | Snapshot privé et comparateur read-only sont sur `main` ; seules les refs avec révision fiable sont comparées. | faible | Décider les familles qui imposeraient réellement stale ou re-preflight. |
| Politique changement de contexte V1 | implémenté docs | Toute divergence fiable demande revue/re-preflight ; stale auto interdit hors hard-stop déjà borné. | faible | Conserver la décision humaine. |
| Visibilité owner du comparateur | implémenté | Trace d'action montre le résultat et les refs, sans action de mutation. | faible | Garder la décision re-preflight humaine. |
| Audit legacy exhaustif | réconciliation sémantique close | 4 714 fichiers inventoriés ; 692 artefacts fonctionnels arbitrés, dont 4 sources privées/droits bloquées. Cette clôture ne vaut ni absorption intégrale, ni implémentation runtime, ni preuve live. | moyen | Exécuter les tranches R1→R6 du plan runtime, une à la fois. |
