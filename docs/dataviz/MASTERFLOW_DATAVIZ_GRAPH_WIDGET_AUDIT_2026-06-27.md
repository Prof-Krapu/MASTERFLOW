# MasterFlow — Audit Dataviz / Graph / Widget

Date : 2026-06-27  
Statut : audit documentaire, aucune implémentation runtime  
Owner : MALEX / Codex  

## Diagnostic court

La brique Dataviz n'est pas absente de MasterFlow, mais elle est dispersée.

- Legacy contient un vrai système : profils de visualisation, graphes, widgets, dashboards, visual pedagogy et facilitation graphique.
- Canon Drive a absorbé une partie sous forme de contrats UI runtime, D12, Source Truth, Output Readiness et Room composition.
- GitHub contient des morceaux fonctionnels : Owner Cockpit, mode runtime, météo pédagogique, graphes pédagogiques/compétences, quelques charts admin.
- Factories récentes commencent à réintroduire le protocole portable, surtout Roadtrip Moto V1.3.

Le risque principal est de refaire l'interface sans cette couche transversale, puis d'empiler des panneaux au lieu de rendre les situations lisibles.

## Matrice source → statut

| Source | Fichier / zone | Concept | Statut | Écart | Action recommandée |
|---|---|---|---|---|---|
| Legacy | `02_CONTRACTS/VISUALIZATION_MODE_AND_GRAPHIC_FACILITATION_PROFILE_CONTRACT.md` | Profils `data_viz_control`, `graphic_facilitation`, `hybrid_summary`, `audit_detail` | legacy_only / canon_partial | Pas de schéma Git partagé | Promouvoir en contrat portable Dataviz |
| Legacy | `02_CONTRACTS/MASTERFLOW_GRAPH_OS_AND_DEPLOYABLE_KNOWLEDGE_CONTRACT.md` | Graph OS : intent → graph family → owner → widget/action/export | canon_partial / git_partial | Git a des graphes partiels, pas de registre transversal | Créer mapping graph families → modes/widgets |
| Legacy | `02_CONTRACTS/MASTERFLOW_VISUAL_PEDAGOGY_STRIP_AND_GRAPHIC_FACILITATION_CONTRACT.md` | Visual pedagogy et formats pédagogiques | legacy_only / factory_partial | Non intégré comme primitive Git | Ajouter à roadmap Dataviz pédagogique |
| Legacy | `04_ENGINES/PEDAGOGICAL_VISUALIZATION_STRIP_AND_FACILITATION_ENGINE.md` | Moteur de choix visuel pédagogique + jauges | legacy_only | Pas de service/runtime Git | Garder en candidat, d'abord contrat data/payload |
| Legacy | `04_ENGINES/DASHBOARD_RUNTIME_ENGINE.md` | Agrégation, widgets, dashboards, overlays | canon_partial / git_partial | Owner Cockpit existe mais pas moteur dashboard général | Ne pas créer un gros dashboard ; extraire widgets contextuels |
| Legacy | `06_WIDGETS/WIDGET_COMPOSITION_SYSTEM.md` | Sélection dynamique des widgets selon contexte/signaux/permissions | canon_partial / git_partial | `mode-runtime.ts` est très simplifié | Créer contrat `widget_candidate` + sélection |
| Legacy | `08_DATASETS/MASTERFLOW_PEDAGOGICAL_VISUAL_FORMAT_ROUTING_MATRIX.md` | Routage format visuel pédagogique | legacy_only | Non présent Git | À auditer en deuxième passe |
| Legacy | `06_WIDGETS/VISUAL_PEDAGOGY_CONSOLE_WIDGET_SPEC.md` | Console de sortie visuelle avant génération | legacy_only / D08_partial | D08 manifest-first couvre une partie | À rapprocher de D08 Output Readiness |
| Canon Drive | `04_BRIDGE_PRIMITIVES/SOURCE_TRUTH_STRIP_PRIMITIVE.md` | Afficher source, statut, confiance, limite | canon_absorbed / git_partial | Présent conceptuellement, UI non généralisée | Créer composant/contrat commun après doc |
| Canon Drive | `04_BRIDGE_PRIMITIVES/OUTPUT_READINESS_CONSOLE_PRIMITIVE.md` | Readiness avant sortie | canon_absorbed / git_partial | Appliqué par domaines, pas Dataviz général | Relier chaque vue Dataviz à readiness |
| Canon Drive | `05_UI_RUNTIME_CONTRACTS/D12_OBSERVABILITY_DASHBOARD_CONTRACT.md` | D12 owner dashboard | canon_absorbed / git_partial | Owner Cockpit existe, opportunité radar/heatmap incomplets | Garder observe/propose/route only |
| Canon Drive | `05_UI_RUNTIME_CONTRACTS/DOMAIN_ROOM_COMPOSITION_MAP.md` | Rooms par domaine | canon_absorbed / git_partial | UI pas encore structurée en rooms propres | Alimenter UI-001/UI-002 |
| Git | `apps/frontend/src/mode-runtime.ts` | Mode view + deck items | git_partial | Pas de profils visualisation, pas de source/freshness | Adapter plus tard, après contrat |
| Git | `apps/backend/src/services/owner_cockpit.ts` | Agrégat D12 owner | git_partial | Pas de Dataviz primitive ; pas de Git/Drive auto-check | Conserver comme source D12, pas moteur universel |
| Git | `apps/backend/src/services/weather_engine.ts` | Météo pédagogique + score composite | git_partial | Score utile mais pas encore relié à source strip/dataviz profile | Faire pilote pédagogique plus tard |
| Git | `packages/shared/src/index.ts` | Graphes, compétences, météo, confidence | git_partial | Schémas dispersés | Créer `VisualDatum` avant UI large |
| Factory | Roadtrip Moto V1.3 | `visual_datum`, profils, feedback, GPX integrity | factory_pilot | Hors Git/canon général | Pilote Dataviz portable |
| Factory | Prof Krapu archives | Dataviz pédagogique/science + anti-hallucination | factory_archive | Pas dans CURRENT actif homogène | Réabsorber principes dans CDC Factories |
| Factory | Batrasia | Reader graph, timeline, visual map narrative | factory_partial | Spécifique récit | Pilote graph/timeline narrative |

## Gaps principaux

### Gap 1 — Pas de contrat Git pour une donnée visuelle

- Source : legacy visual profiles + Roadtrip `visual_datum`.
- État Git : plusieurs champs `confidence`, `score`, `widget_state`, mais pas de primitive commune.
- Risque : une vue peut afficher un chiffre sans source, fraîcheur, statut ou limite.
- Action : créer un contrat `visual_datum` documentaire avant runtime.

### Gap 2 — Pas de sélection de widget gouvernée

- Source : legacy `WIDGET_COMPOSITION_SYSTEM`.
- État Git : `mode-runtime.ts` retourne un deck simple.
- Risque : l'UI empile des panneaux au lieu de choisir la vue utile.
- Action : créer un contrat `widget_candidate` et lier à UI-001/UI-002.

### Gap 3 — Dataviz confondue avec dashboard

- Source : legacy interdit les dashboards permanents hors admin.
- État Git : Admin Recharts PoC + Owner Cockpit.
- Risque : MasterFlow devient un cockpit lourd plutôt qu'un système situationnel.
- Action : privilégier `situation -> widget utile -> détail/source`, pas dashboard global.

### Gap 4 — Visual pedagogy non réintégrée

- Source : legacy visual pedagogy + Prof Krapu.
- État Git : météo/compétences existent mais pas console visuelle pédagogique.
- Risque : perdre la couche "rendre un raisonnement visible".
- Action : garder en queue après contrat Dataviz portable.

### Gap 5 — Factories non homogènes

- Source : CDC commun Factories candidat + Roadtrip V1.3.
- État Git : D11 backflow borné existe, mais pas registry mode/factory.
- Risque : chaque Factory réinvente boot, source truth, dataviz et export.
- Action : créer arbitrage Factory → Mode MasterFlow candidat.

## Décision recommandée

Créer une vague documentaire `DATAVIZ-001` :

1. contrat Dataviz portable ;
2. arbitrage Factory → Mode ;
3. abstraction MasterHelp / Situation Companion ;
4. Roadtrip comme pilote Dataviz + MasterHelp ;
5. prompt Big Pickle pour audit/extraction rapide.

Ne pas coder de composant UI Dataviz tant que cette base n'est pas validée.

