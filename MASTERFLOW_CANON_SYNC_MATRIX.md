# MasterFlow — Canon Sync Matrix

Dernière vérification : 2026-06-28
Branche de travail : `codex/experience-fabric-precedents`
Base GitHub vérifiée : `63381f5` (`main == origin/main` après merge PR #155)

Doctrine active 2026-06-27 : le repo Git publiable devient la source de vérité opérable.
Drive, legacy, ex-canon et Factories sont des sources candidates tant que leurs idées ne sont pas
représentées dans Git par code, test, seed, contrat, matrice, queue, reçu de blocage ou rejet.
Les Factories ne sont jamais absorbées telles quelles : seules leurs primitives utiles peuvent être
récoltées après audit.

| Élément canon | Statut GitHub | Écart | Risque | Action recommandée |
|---|---|---|---|---|
| Experience Fabric / Event Spine | implémenté | Timeline et snapshot read-only publiés via PR #155. | faible | Utiliser comme spine commun pour précédents, storylets et narration. |
| Experience Fabric / Precedent Engine | implémenté local | Recherche de cas depuis mémoire, checkpoints, décisions et événements ; publication GitHub à faire. | faible | Publier la vague 2 puis construire le Narrative Canon Graph. |
| Experience Fabric / Narrative Canon Graph | implémenté local | Projection des faits, présentations, connaissances personnage et setup/payoff ; publication GitHub à faire. | faible | Publier la vague 3 puis construire les storylets sur ces faits. |
| Experience Fabric / Storylet Engine | implémenté local | Storylets candidates `suggest_only` depuis canon narratif, précédents et blockers ; publication GitHub à faire. | faible | Publier la vague 4 puis relier Visual Narrative Grammar. |
| Source truth opérable Git | partiel local | Doctrine `Git opérable` créée localement, non publiée ; l'ancien vocabulaire Drive-canon peut encore induire une vérité parallèle. | moyen | Publier `docs/source-truth/` et garder Drive/legacy/factories en sources candidates, avec récolte de primitives uniquement pour les Factories. |
| D01 identité, accès, ownership | implémenté fondation | Auth, invitations, projets, membres/scopes et cohorte/roster privés sont sur `main`; organisation absente. | faible | Garder l'organisation future, sans multi-tenant prématuré. |
| D02 contexte, mémoire, RAG | partiel | Context compiler, loadout, Resource Truth, memory et RAG lexical existent ; fichier/vectoriel réel absent. | moyen | Ne pas promettre BGE/Qdrant ou file storage. |
| D07 Inventory / scan photo | partiel implémenté | Le scan écrit un fichier privé vérifié sous `storage://` et crée un candidat unique sur `main`. OCR provider et UI finale restent absents. | moyen | Rafraîchir le snapshot canon sans déclarer l'OCR réel. |
| D03 Room OS et commandes | partiel | Rooms, instances, checkpoints et frontend existent ; command surface complète absente. | moyen | Ajouter les contrôles par tranches explicites. |
| D04 personas et bots contextuels | partiel | Personas/blends existent ; affectations contextuelles et bots bornés incomplets. | moyen | Maintenir persona ≠ permission. |
| Shared Validation Inbox | partiel | Actions, objets D06, findings D12, candidates Usage Learning et intake factory D11 sont sur `main`. | faible | Ajouter les prochains domaines uniquement avec leur autorité métier propre. |
| D05 sujet guidé | implémenté | Guided Runtime, sujets privés versionnés et assignments de cohorte sont sur `main`, professeur/godmode uniquement. | faible | Garder participation élève et publication séparées. |
| D06 correction / feedback | partiel | R1.1-R1.4 et R2.1-R2.6 sont sur `main` : prérequis, lot, intake, manifest professeur, sujet, assignment, fiche, paramètres, diff et édition privée. R1.5 reste fermée : aucun runner/provider ni traitement de copies. | faible à moyen | Garder R1.5 fermée tant qu'un contrat provider/consentement/runtime n'est pas validé explicitement. |
| D05-D06 Teaching readiness | implémenté | Panneau mergé ; Teaching ouvert dans Home uniquement pour professeur et godmode ; backend complet 341/341 après recette isolée. | faible | Conserver stockage, export publié et envoi hors scope. |
| D12 owner observability et continuité | partiel | Cockpit, findings, décisions owner, Usage Harvester V1, rails privés release/backup et registre d'incidents sont sur `main`. Live, backup réel, recovery et smoke restent non prouvés. | moyen | Rails de preuves clos ; toute action hôte reste derrière un contrat, un preflight et une validation séparés. |
| D08 génération visuelle | partiel implémenté | R3.1-R3.4, le lifecycle asset candidat et le stockage fichier privé sont sur `main`. Provider, export, téléchargement public et canonisation restent absents. | moyen | Conserver toute génération derrière les gates provider/review/export. |
| Dataviz / Graph / Widget transversal | partiel documentaire | Legacy contient un système riche ; canon absorbe Source Truth, Output Readiness et Room maps ; Git expose seulement des fragments runtime. DATAVIZ-001 local pose audit, contrat portable et plan Factory→Mode, non encore publié. | moyen | Relire/publier DATAVIZ-001 avant toute refonte UI ou composant Dataviz runtime. |
| MasterHelp / Situation Companion | futur candidat | Roadtrip révèle une primitive transversale de situation réelle, mais aucun mode Git n'existe. Spec candidate locale créée ; Factory Roadtrip V1.4 patchée hors Git comme pilote. | moyen | Tester le pilote, extraire les sorties `EXTRACTION MASTERHELP`, puis décider si cela devient mode MasterFlow. |
| D09 MasterStory | partiel | R4.1-R4.6 sur `main` : workbench privé, reader state, patches candidats et validation auteur. Canon delta, import, export et publication absents. | moyen | Considérer le lot privé clos ; ne rouvrir delta/import/export qu'après décision produit et gates dédiés. |
| D10 événements/devis/public | partiel | R5.1-R5.4 publiés sur `main` : devis privé sourcé, panneau owner et validation interne. Public intake, export, envoi et facture absents. | moyen | Considérer le rail devis privé clos ; ne rouvrir une sortie ou le rail public qu'après décision produit et gates dédiés. |
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
