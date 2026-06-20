# Consolidation des 148 engines legacy par owner — 2026-06-20

## Diagnostic

Le legacy nomme 148 engines, mais ils ne représentent pas 148 services à reconstruire. Ils
mélangent autorités métier, modèles d'orchestration, adapters, projections UI et idées futures.
La consolidation les rattache aux 12 owners de domaine sans supprimer leur trace.

## Contrat de déploiement

- Intention produit : préserver toutes les responsabilités utiles sans architecture de micro-engines artificielle.
- Partie du canon concernée : Domain Map D01-D12 et owners fonctionnels.
- Ce qui doit changer : chaque engine reçoit un owner et une décision sémantique.
- Ce qui ne doit pas changer : aucun code, endpoint, permission, provider, migration ou live.
- Critère simple de succès : 148/148 arbitrés, zéro engine autonome créé par simple reprise du legacy.
- Risque de dérive : élevé si un nom de fichier devient un service ou une capacité annoncée.
- Validation nécessaire : non pour audit ; oui avant toute nouvelle autorité runtime.

## Résultat

| Décision | Nombre | Signification |
|---|---:|---|
| `absorbed` | 24 | responsabilité déjà portée par le canon et une fondation Git identifiable |
| `canon_ready` | 59 | responsabilité canonique, runtime absent ou incomplet |
| `reduced` | 51 | alias/modèle/adaptation consolidé sous un owner existant |
| `restore_candidate` | 14 | capacité avancée ou commerciale à réévaluer plus tard |

## Répartition par owner

| Owner consolidé | Engines | Lecture produit |
|---|---:|---|
| D01 Identity & Permission | 5 | auth, permissions, onboarding, autorité avatar |
| D02 Context, Resource & Memory | 18 | contexte, recherche, mémoire, version, archive |
| D03 Room & UI | 4 | session, dashboard, overlay, teamspace |
| D04 Persona & Guidance | 3 | persona, guidance, profil créateur |
| D05 Pedagogy & Subject | 9 | sujet, pédagogie, compétences, adaptation |
| D06 Correction & Feedback | 6 | correction, feedback, score et contrôle qualité |
| D07 Inventory | 4 | inventaire, collections, classification et matching |
| D08 DA & Asset | 15 | référence, asset, review et adapters visuels |
| D09 Narrative | 5 | récit, lore, continuité et reader audit |
| D10 Event, Quote & Export | 14 | devis, prix, publication, event et candidats commerciaux |
| D11 Factory & Backflow | 3 | factories, capsules portables et réabsorption |
| D12 Runtime Control | 62 | orchestration, sécurité, jobs, état, observabilité et infrastructure transverse |

Le volume D12 ne signifie pas 62 modules à développer. Il révèle surtout une fragmentation du
contrôle runtime, désormais consolidée sous action/permission, jobs/workflows, audit,
observabilité et continuité.

## Matrice Canon → GitHub résumée

| Famille | État GitHub | Écart principal | Action recommandée |
|---|---|---|---|
| Identité/permissions | partiel solide | organisation et autorités spécialisées | étendre seulement par objet réel |
| Contexte/resource/memory | partiel | graphe, vectoriel et ledger transverse | datasets puis ledger additif |
| Pédagogie/correction | partiel | assignment, barème/profil, lot complet | reprendre après audit datasets |
| Inventory | substantiel | OCR réel et parité fine | rester candidate-first |
| DA/narratif/devis | canon prêt, runtime absent | lifecycle dédié | tranches privées manifest/workbench/quote |
| Factory/backflow | implémenté borné | aucun runtime factory | conserver candidate-only |
| Runtime control | partiel | release/backup/recovery et live inconnus | receipts avant toute action hôte |

## Stop rules

- Un engine `canon_ready` n'est pas une feature livrée.
- Un engine `reduced` conserve sa responsabilité sous un owner plus stable.
- Les 14 `restore_candidate` — social, gamification, marché, paiement, local AI et prédictif —
  restent hors priorité sans besoin produit, consentement et contrat dédiés.
- Aucun nouveau super-engine ni microservice n'est créé depuis cet audit.
