# Audit global Legacy → Canon → GitHub — 2026-06-20

Statut : `AUDIT_REFRESH_IN_PROGRESS`

Progression d'arbitrage : P0 `11/11` terminé ; queue fonctionnelle exhaustive `692` entrées créée,
dont 333 routées vers un domaine unique, 104 transverses et 255 à router manuellement.
Grappe applicative D05/D06 : `7/7` arbitrée.
Grappe D08 (apps et contrats directeurs) : `9/9` arbitrée.
Grappes D09/D10 applicatives : `12/12` arbitrées.
Familles applicatives restantes : arbitrage de niveau famille terminé ; les objets individuels
restent dans la queue de 692 lignes jusqu'à leur décision et preuve propres.
Engines directeurs : `13` owners arbitrés ; les `135` engines restants restent à dédoublonner et
à classer par tranche, pas à implémenter individuellement.
Datasets critiques de vérité : `7/7` arbitrés ; les autres restent dans la queue pour contrôle
de provenance, doublons et compatibilité de scope.
Contrats transverses, vague 1 : `9/9` arbitrés ; les contrats restants sont à traiter par domaine.
Contrats transverses, vague 2 : `11/11` arbitrés.
Contrats D05-D07 : `12/12` arbitrés, dont un contrat morphologique rerouté vers D08.
Contrats D08 : `48/48` arbitrés ; les variantes Comfy/provider/export sont réduites à des adapters derrière le manifest-first.
Contrats D09-D10 : `20/20` arbitrés ; récit privé/reader state avant export, devis privé avant public/event.
Contrats D11-D12 : `12/12` arbitrés ; factories candidate-only et observabilité sans mutation autonome.

La suite est ordonnée dans `MARATHON_WAVE_EXECUTION_QUEUE.md` et s'enchaîne sans replanification
manuelle, sauf gate produit, droit, migration ou déploiement live.

## Conclusion vérifiée

Le legacy est intégralement **inventorié**, mais pas intégralement **absorbé** ni même
intégralement arbitré fichier par fichier.

- 4 714 fichiers indexés en lecture seule ;
- 147 core, 197 contrats, 95 apps, 148 engines, 69 datasets et 12 événements ;
- 2 062 artefacts factories isolés dans la voie D11 ;
- la première confrontation détaillée a couvert les contrats structurants, pas les 668
  artefacts fonctionnels core/contrats/apps/engines/datasets/événements un par un ;
- plusieurs cartes canon et cartes de progression portent encore un snapshot Git ancien.

## Couverture par domaine

| Domaine | Héritage déjà raccordé | Canon | GitHub | État global | Reste principal |
|---|---|---|---|---|---|
| D01 Identité/accès | auth, ownership, projets, organisation réduite | actif | fondation + cohortes/rosters | partiel solide | organisation et passeport personnel |
| D02 Contexte/mémoire | Resource Truth, contexte, RAG, mémoire/versioning | actif | RAG lexical + cards/checkpoints | partiel | graphe relationnel, provenance, timeline/version ledger |
| D03 Room OS | rooms, widgets, commandes, sessions | actif | rooms/loadout/frontend partiels | partiel | command center, widgets contextuels, zoom/debug complet |
| D04 Personas/bots | personas, blends, voix, bots bornés | actif | personas/blends partiels | partiel | affectations, roster conversationnel, speaker routing |
| D05 Pédagogie | guided runtime, sujets, ressources | actif | verticale guidée utilisable | implémenté partiel | subject graph/compiler et participation élève complète |
| D06 Correction | corrector, suivi étudiant, roster, contexte | actif | contexte + identité + UI roster | implémenté partiel | barème/profil, lot, submissions, workflow complet, longitudinal |
| D07 Inventory | inventory, OCR, collections, recherche | actif | runtime et tests substantiels | implémenté partiel | audit de parité legacy et surfaces restantes |
| D08 DA/assets | DA roots, resolver, manifests, assets générés | actif cadré | lifecycle absent | canon prêt | registre références/assets, review, provider ensuite seulement |
| D09 MasterStory | story intake, reader graph, vérité narrative | actif cadré | runtime dédié absent | canon prêt | workbench, stockage, reader state, patch/review |
| D10 Events/devis/public | event, quote, export/publication | actif cadré | runtime dédié absent | canon prêt | devis privé avant public/event |
| D11 Factories | passport, export, backflow | actif borné | V1 candidate-only | implémenté borné | audit des 2 062 artefacts par factory, aucune activation globale |
| D12 Autonomie/déploiement | observabilité, incident, recovery | actif | cockpit/harvester partiels | partiel | release SHA, backup/recovery, smoke live, sync automatique |

## Dette d'audit restante

1. Affecter les 95 apps legacy à un domaine et une décision explicite.
2. Affecter les 148 engines à un owner, un successeur et un statut Git.
3. Classer les 197 contrats par canon actif, fusion, réduction, futur ou rejet.
4. Vérifier les 69 datasets/registries comme sources de vérité potentielles.
5. Vérifier les 12 événements et les 24 personas sans les confondre avec le runtime.
6. Dédupliquer les 1 278 artefacts de déploiement et 413 audits avant extraction.
7. Traiter les 2 062 fichiers factories par Passport/owner, jamais par import global.

## Dérives de pilotage détectées

- `WAVE_QUEUE.md` indiquait 4 647 artefacts au lieu de 4 714 ;
- `RECONCILIATION_PROGRESS_CARD.md` indiquait encore le roster absent ;
- plusieurs Domain Cards utilisent le snapshot Git `2026-06-14 / a8a4751` ;
- l'Active Contract Registry décrit encore roster/identité comme futurs ;
- le déploiement live reste inconnu malgré les merges GitHub.

## Stop rule

La reprise du code D06 ne vaut pas preuve d'absorption globale. Le marathon doit désormais
alterner une vague d'arbitrage legacy et une tranche Git testable, avec mise à jour du ledger.
