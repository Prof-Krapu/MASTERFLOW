# MasterFlow — Registre de récolte des primitives externes

Date : 2026-06-27  
Statut : registre initial, à enrichir par vagues  
Autorité opérable : Git repo `/Users/malex/Documents/Playground/MASTERFLOW`

## Légende

| Statut | Sens |
|---|---|
| `already_in_git_runtime` | déjà codé/testé dans Git |
| `already_in_git_doc` | déjà capturé dans un contrat ou audit Git |
| `primitive_candidate` | pattern intéressant à vérifier, pas encore décidé |
| `runtime_gap` | idée validée mais pas encore implémentée |
| `blocked` | nécessite droit, secret, provider, migration, donnée sensible ou décision produit |
| `rejected` | explicitement non retenu |
| `unknown` | à auditer |

## Registre initial corrigé

| ID | Source externe | Famille | Statut Git | Prochaine action |
|---|---|---|---|---|
| EXT-DATAVIZ-001 | Legacy Dataviz / Graph / Widget | Dataviz portable | `already_in_git_doc` local | Publier DATAVIZ-001, puis runtime plus tard. |
| EXT-FACTORY-WORKSHOP-001 | `/Users/malex/Desktop/FACTORIES/` | Atelier Factories autonome | `external_workshop` | Travailler les audits, CDC, versions actives et prompts côté Bureau ; ne remonter dans Git que les primitives utiles à MasterFlow. |
| EXT-LEGACY-DA-001 | Legacy DA orchestration V5 | DA compiler / visual refs | `runtime_gap` partiel | Audit D08 gate + visual reference boards. |
| EXT-LEGACY-RPG-001 | Legacy RPG runtime / jauges | Progression / readiness | `already_in_git_runtime` partiel | Ajouter contrat UI readiness/jauge. |
| EXT-LEGACY-UI-001 | Legacy UI Backend Roadmap V1 | UI rooms/widgets/control panel | `already_in_git_doc` partiel | Alimenter UI-001, éviter dashboard permanent. |
| EXT-DRIVE-001 | Drive Domain Cards D01-D12 | Produit lent | `already_in_git_doc` partiel | Ne plus traiter comme vérité parallèle ; vérifier uniquement si une idée n'est pas encore dans Git. |
| EXT-DESIGN-MD-001 | `design.md` — Apache-2.0 | Design tokens / lint | `already_in_git_runtime` fondation clean-room | Contrat ThemePack et lint déterministe absorbés ; stockage, application UI et export DTCG restent futurs. |
| EXT-OPENMONTAGE-001 | OpenMontage — AGPL-3.0 | Packs, étapes, promesses de sortie | `already_in_git_runtime` concepts clean-room | Aucun code copié : packs, guidage, ponts proposés, qualité, décisions et coûts réimplémentés ; scoring provider différé. |

## Règle d'usage

Chaque nouvelle découverte hors Git doit créer ou mettre à jour une ligne ici avant d'être traitée comme importante.

Une ligne `primitive_candidate` ne donne jamais le droit de coder directement, ni de copier une Factory telle quelle.

Pour les Factories, l'objet d'audit est toujours : `quelle primitive utile peut-on reprendre ?`, jamais `comment intégrer ce bot ?`.

Une ligne `runtime_gap` doit être reliée à :

- un contrat produit ;
- un test attendu ;
- un risque ;
- une tâche `AGENT_TASKS.md`.

## Absorption clean-room — 2026-06-28

Les idées utiles des deux sources ont été confrontées au runtime MasterFlow puis
réimplémentées avec les contrats, permissions et verrous du projet :

- packs et étapes composables selon les actions réellement accessibles ;
- guidage contextuel non intrusif et mémorisable ;
- ponts inter-modes proposés, jamais exécutés automatiquement ;
- Theme Studio : contrat de thème, portées et lint accessibilité/licences ;
- promesse de sortie explicite avant génération ;
- quality gate fondé sur des preuves ;
- trace de décision dans l'audit immuable existant ;
- préflight de coût pur, sans réservation ni appel provider.

Restent fermés : provider réel, déploiement live, application automatique d'un
thème, navigation automatique entre modes et toute promotion canon silencieuse.

## Correction frontière Factories — 2026-06-28

Pont publié : `docs/factories/FACTORY_DESKTOP_WORKSHOP_TO_MASTERFLOW_BRIDGE_2026-06-28.md`.

Décision : les audits détaillés de Factories ne doivent pas vivre dans Git. Les 19 Factories actives
restent travaillées dans `/Users/malex/Desktop/FACTORIES/`.

Git conserve seulement les primitives transversales utiles à MasterFlow :

- boot contexte ;
- scope lock et refus hors périmètre ;
- extraction inbox ;
- candidate-not-canon ;
- source truth strip ;
- rôles de références visuelles ;
- GO IMAGE gate ;
- rapport DA post-sortie ;
- jauges pédagogiques ;
- subject pack schema ;
- brief routing ;
- situation companion ;
- usage harvester ;
- diagnostic observer non-surveillance ;
- lifecycle matière créative.

Tâches de queue réellement Git :

- `FACTORY-BRIDGE-001` : publié dans `docs/factories/FACTORY_DESKTOP_WORKSHOP_TO_MASTERFLOW_BRIDGE_2026-06-28.md` ;
- `FACTORY-ROUTER-001` : conservé comme routeur de primitives MasterFlow, pas comme audit Factory ;
- `D08-VISUAL-REFS-001` : publié dans `docs/d08/D08_VISUAL_REFERENCE_TAXONOMY_AND_FACTORY_REF_GATE_2026-06-27.md` ;
- `MASTERCLASS-SUBJECTS-001` ;
- `MASTERINVENTORY-OCR-001` ;
- `LEARNING-GAUGES-001` ;
- `MASTERHELP-001`.
