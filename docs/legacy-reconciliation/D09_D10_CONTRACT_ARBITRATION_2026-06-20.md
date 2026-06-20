# Arbitrage des contrats D09-D10 — 2026-06-20

## Diagnostic

Les 20 contrats restants se répartissent en deux rails distincts :

- D09 : sources narratives, reader state, atelier auteur, continuité et patch candidat ;
- D10 : devis privé, export/publication, consentement et couche événementielle.

Le canon couvre déjà les invariants structurants. GitHub ne possède pas de runtime MasterStory,
de Quote Builder, de public intake ni de publication sociale dédiés. Les events techniques et
le job `export_prepare` ne prouvent pas ces produits.

## Contrat de déploiement

- Intention produit : préserver l'OS narratif et la chaîne devis/export sans transformer une idée, un fichier produit ou un event technique en vérité publique.
- Partie du canon concernée : D09 et D10, avec ponts D04, D07, D08, D11 et D12.
- Ce qui doit changer : arbitrage des 20 contrats et ordre futur sûr.
- Ce qui ne doit pas changer : aucune source narrative, donnée publique, facture, export réel, envoi client ou factory.
- Critère simple de succès : zéro contrat D09/D10 en attente et aucune promesse runtime non prouvée.
- Risque de dérive : élevé pour spoilers, données personnelles, publication et engagement commercial ; faible pour cet audit.
- Validation nécessaire : non pour audit ; oui avant import, envoi, publication, facture ou activation publique.

## Matrice Canon → GitHub

| Élément canon | Statut GitHub | Écart | Risque | Action recommandée |
|---|---|---|---|---|
| Story intake privé | absent | aucune table/API D09 | moyen | commencer par index/audit sans déplacer ni réécrire les sources |
| Reader state et reveal gate | absent | aucun graphe narratif persistant | élevé pour spoilers | stocker position et truth states avant toute lecture interactive |
| Atelier auteur et patch candidat | absent | pas de workbench D09 | moyen | candidate-only avec validation auteur |
| Quote Builder privé | absent | aucun objet devis dédié | élevé si engagement implicite | première tranche D10, sources/prix/confiance et preview seulement |
| Export/publication | générique et partiel | `export_prepare` n'est pas une publication | élevé | séparer preview, export produit, envoi et publication |
| Event/public intake | absent | events internes seulement | critique pour consentement | attendre rôles, privacy, rétention et suppression |

## Arbitrage exhaustif

### Principes déjà absorbés par le canon

- `MASTERSTORY_INTERACTIVE_READING_ENGINE_CONTRACT`
- `MASTERSTORY_READER_STATE_GRAPH_AND_REVEAL_GATE_CONTRACT`
- `MASTERSTORY_STORY_INTAKE_AND_WORKBENCH_PREPARATION_CONTRACT`
- `NARRATIVE_DIEGETIC_INVENTORY_AND_PROP_CONTINUITY_CONTRACT`
- `NARRATIVE_FORESHADOWING_OPPORTUNITY_AND_PAYOFF_SUGGESTION_CONTRACT`
- `NARRATIVE_PRESENCE_AND_DIALOGUE_CONTINUITY_GATE_CONTRACT`
- `NARRATIVE_READER_WORKSHOP_EXPORT_MODES_CONTRACT`
- `NARRATIVE_TRUTH_COMPILER_CHAPTER_CARD_AND_READER_AUDIT_CONTRACT`
- `BUDGET_QUOTE_AND_FUTURE_INVOICE_CONTRACT`
- `OUTPUT_EXPORT_ROUTING_AND_CANDIDATE_FORMAT_CONTRACT`
- `PRIVACY_PUBLIC_POLICY_AND_MULTI_USER_DATA_GOVERNANCE_CONTRACT`

`absorbed` décrit la règle produit dans le canon, jamais une fonctionnalité live.

### Capacités canon prêtes à câbler

- `BDD_READY_LORE_INTAKE_AND_MASTERFLOW_REABSORPTION_CONTRACT`
- `COMIC_BOARD_SCENE_SELECTOR_AND_PANEL_CONTINUITY_CONTRACT`
- `LORE_CANON_BUILDER_AND_LIVING_WORLD_REGISTRY_CONTRACT`
- `CONTEST_MONSTER_GALLERY_AND_CHALLENGER_VISIBILITY_CONTRACT`
- `PRINT_PRODUCTION_READINESS_AND_STICKER_EXPORT_CONTRACT`
- `SOFT_SKILL_HIGHLIGHTS_AND_CV_EXPORT_CONTRACT`

Ces capacités restent privées/candidates par défaut. Personnes réelles, CV, galeries et exports
exigent consentement, scope, provenance et validation explicites.

### Contrats réduits à des adapters

- `FACTORY_FULL_BACKUP_EXPORT_AND_REABSORPTION_CONTRACT` : relève de D11 Passport/backflow ; aucun import global.
- `FACTORY_MASTERFLOW_INBOX_EXPORT_CONTRACT` : export candidat vers inbox, jamais canon automatique.
- `GAMMA_COMPILER_AND_EXPORT_FIRST_CONTRACT` : format de sortie derrière D05/D09/D10, pas autorité ni API présumée.

## Ordre futur verrouillé

```txt
D09 source index/audit
-> reader state + truth states
-> author workbench + patch candidate
-> D10 private quote draft + preview
-> export package
-> send/public/event seulement après consentement et validation
```

## Alertes

- Une lecture interactive sans reader state risque de spoiler ou d'inventer.
- Un PDF de devis n'est ni envoyé, ni accepté, ni une facture.
- Un event technique n'est pas un produit événementiel public.
- Les factories d'export restent D11 candidate-only.
