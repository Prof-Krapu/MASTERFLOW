# MasterFlow — Git comme source de vérité opérable + récolte de primitives externes

Date : 2026-06-27  
Statut : doctrine opérationnelle Git + audit documentaire initial  
Périmètre : repo Git publiable `/Users/malex/Documents/Playground/MASTERFLOW`

## Décision opératoire

À partir de cette passe, la vérité qui pilote le logiciel MasterFlow est le clone Git publiable :

```txt
/Users/malex/Documents/Playground/MASTERFLOW
-> commit
-> push
-> PR / merge
-> preuve GitHub
```

Le Drive canon, les anciens canons, les archives legacy et les Factories restent utiles, mais ils ne sont plus des vérités parallèles.

Ils deviennent des sources candidates pour extraire uniquement ce qui mérite MasterFlow :

- à relire ;
- à classer ;
- à transformer en primitives, patterns ou contrats Git ;
- à rejeter ;
- ou à mettre en queue.

## Règle anti-zone grise

Une idée importante n'est considérée comme maîtrisée que si elle existe dans Git sous une de ces formes :

1. code runtime ;
2. test ;
3. seed/registry ;
4. contrat documentaire ;
5. ligne dans une matrice de sync ;
6. tâche dans `AGENT_TASKS.md` ou `MASTERFLOW_ACTION_QUEUE.md` ;
7. reçu de rejet ou de blocage.

Si une idée n'existe que dans legacy, ex-canon, Drive, Factories ou conversation, elle est `external_candidate`, pas source de vérité.

## Règle spéciale Factories

Une Factory n'est pas absorbée telle quelle.

Une Factory est une extraction autonome pour un bot ou un projet pilote. MasterFlow ne reprend pas :

- le bot complet ;
- le prompt brut complet ;
- la structure de dossier complète ;
- les données spécifiques ;
- les formulations liées à une plateforme précise.

MasterFlow peut reprendre après extraction/arbitrage :

- un protocole de boot ;
- un verrou de source truth ;
- un format d'extraction ;
- un pattern conversationnel ;
- une primitive Dataviz/UI ;
- un garde-fou de sécurité ;
- une idée de mode candidat ;
- un retour d'usage récurrent.

Pipeline autorisé :

```txt
Factory active dans /Desktop/FACTORIES
-> extraction ou audit côté atelier Factories
-> primitives utiles candidates
-> arbitrage Git
-> intégration MasterFlow seulement si pertinente
```

Pipeline interdit :

```txt
Factory active
-> copie dans MasterFlow
```

## Sources externes auditées

| Source | Chemin | Statut |
|---|---|---|
| Legacy 14/06/2026 | `/Users/malex/Documents/MASTERFLOW_ARCHIVES/MASTERFLOW_LEGACY_14_06_2026` | archive historique candidate |
| Drive MasterFlow | `/Users/malex/Library/CloudStorage/GoogleDrive-oursdoriscomlille@gmail.com/Mon Drive/MASTERFLOW` | ex-canon / source lente candidate |
| Factories atelier | `/Users/malex/Desktop/FACTORIES/` | laboratoire autonome ; audits détaillés et versions actives restent hors Git |
| Repo Git | `/Users/malex/Documents/Playground/MASTERFLOW` | vérité opérable |

## Matrice initiale externe → Git

| Famille | Sources externes repérées | État Git actuel | Écart restant | Risque | Action recommandée |
|---|---|---|---|---|---|
| Dataviz / Graph / Widgets | Legacy `VISUALIZATION_MODE`, `GRAPH_OS`, `WIDGET_COMPOSITION`, Factories Roadtrip/Prof/Batrasia | Audit + contrat portable DATAVIZ-001 créés localement ; graphes/compétences/widgets partiels en runtime | Pas encore publié ; pas encore de primitive runtime commune `visual_datum` / `widget_candidate` | moyen | Publier DATAVIZ-001, puis ouvrir UI-001 avec ces contrats comme garde-fou. |
| Factories / Backflow | Atelier Factories sur le Bureau | D11 intake/backflow existe ; routeur de primitives Git conservé | Les audits détaillés ne doivent pas être stockés dans Git | moyen | Travailler les Factories côté Bureau ; remonter seulement les primitives utiles. |
| MasterHelp / Situation Companion | Roadtrip + principes Inventory/Source Truth/Checkpoints | Spec candidate Git locale | Aucun mode runtime ; pas de preuve d'usage hors Roadtrip | moyen | Tester Roadtrip, produire `EXTRACTION MASTERHELP`, puis décider si mode candidat. |
| DA / images / visual references | Legacy DA orchestration V5, visual boards, Factories DA | DA runtime, visual manifests, assets, storage et seeds existent ; D08 partiel | Route narrative `generate-visual` semble encore bypasser l'action-ready explicite ; OCR refs/boards pas totalement exploitées | élevé | Ouvrir une vague D08 gate audit/fix avant toute génération image ambitieuse. |
| OCR / Inventory / reference deck | Legacy MasterInventory + Drive D07 + Factory MasterInventory | Inventory, OCR candidates, storage fichier réel et assets privés existent | OCR provider réel / boards / visual reference deck non finalisés ; rester `needs_review` | moyen | Garder provider et export gated ; auditer MasterInventory CURRENT vs D07 Git. |
| Pédagogie / sujets / corrections | Legacy subject library, Masterclass Factory, Drive D05/D06 | D05/D06, subjects, correction context, roster, feedback/export preview très avancés | Subject library fullstack Factory potentiellement plus riche que seeds Git | moyen | Audit ciblé `MASTERCLASS/CURRENT` → sujets/rubriques/resources à classer. |
| Compétences / jauges / RPG runtime | Legacy RPG runtime, skill tree, readiness/jauges | `competency_engine`, `skill_tree`, `gamification_engine`, `pedagogical_graph` existent | Front/UI et doctrine “jauge = readiness, pas note” pas assez visibles | moyen | Créer une spec courte `readiness_jauge_ui_contract` avant UI gamifiée. |
| MasterStory / narrative graph | Legacy Batrasia, reader graph, DA narrative | D09 workbench privé, story characters, narrative runtime, DA bridge existent | Anti-spoiler/reader graph et visual map à vérifier contre Batrasia CURRENT | moyen | Audit ciblé Batrasia CURRENT → D09/D08 gaps. |
| UI web / desktop / app | Legacy UI Backend Roadmap V1 + Drive UI contracts | Front React/Vite existant ; plan UI-001 local | Interface encore assemblée par panneaux ; pas encore cockpit produit complet | moyen | UI-001 doit partir des contrats Git, pas de nouveaux concepts hors Git. |
| Source Truth / confidence / provenance | Legacy et Factories répètent anti-hallucination | `resource_truth`, validation inbox, source refs, confidence partiels | Pas de `source_truth_strip` UI commun à toutes les surfaces | moyen | Ajouter au plan UI comme composant transversal. |

## Points déjà clarifiés pendant l'audit

### D08 : l'ancien bug de statuts est corrigé

L'audit précédent signalait un risque SQLite sur les statuts `approved` / `rejected` des manifests visuels.
Dans le Git courant, `packages/shared/src/index.ts` et `apps/backend/src/db/schema.ts` autorisent maintenant ces statuts.

Statut : `résolu dans Git`.

### D08 : le bypass narratif reste à surveiller

La route suivante existe encore :

```txt
POST /api/v1/narrative/nodes/:id/generate-visual
```

Elle compile et exécute une génération visuelle via le bridge narratif.

Risque : si elle contourne l'action registry, la validation inbox ou le gate `ACTION_READY`, elle peut recréer une génération trop directe.

Statut : `à auditer/fixer avant génération image réelle`.

## Queue recommandée

### À faire maintenant

- Garder les audits détaillés Factories côté Bureau.
- Ne publier dans Git que le pont Factory → MasterFlow et les primitives validées.
- Ouvrir une tâche D08 gate pour la route narrative `generate-visual`.

### À mettre en queue

- Quand une Factory révèle une idée utile, produire une extraction courte :
  `source -> primitive -> cible MasterFlow -> risque -> statut`.
- Classer seulement la primitive, pas la Factory complète :
  `already_in_git`, `primitive_candidate`, `runtime_gap`, `blocked`, `rejected`.

### À faire quand tokens disponibles

- Audit ciblé Masterclass Factory → D05/D06/subject library.
- Audit ciblé Batrasia Factory → D09/D08 narrative DA.
- Audit ciblé MasterInventory → D07/OCR/reference decks.
- Audit ciblé DA visual boards legacy → D08 assets/reference status.

### À décider plus tard

- Quelles Factories restent uniquement autonomes.
- Quels modes candidats deviennent surfaces MasterFlow.
- Quand l'ex-canon Drive doit être archivé comme source historique non prioritaire.

## Prochaine action recommandée

Ne plus lancer de vague d'audit exhaustif des Factories dans Git. Travailler les Factories dans
`/Users/malex/Desktop/FACTORIES/`, puis remonter uniquement les primitives vraiment utiles au logiciel.
