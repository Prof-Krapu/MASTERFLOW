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

## Registre initial

| ID | Source externe | Famille | Statut Git | Prochaine action |
|---|---|---|---|---|
| EXT-DATAVIZ-001 | Legacy Dataviz / Graph / Widget | Dataviz portable | `already_in_git_doc` local | Publier DATAVIZ-001, puis runtime plus tard. |
| EXT-FACTORY-001 | `/Users/malex/Desktop/FACTORIES/ROADTRIP_MOTO/CURRENT` | Roadtrip / MasterHelp | `already_in_git_doc` local + Factory patchée | Tester le pilote ; récolter uniquement les primitives validées. |
| EXT-FACTORY-002 | `/Users/malex/Desktop/FACTORIES/BATRASIA/CURRENT` | MasterStory / DA narrative | `primitive_candidate` | Audit ciblé D09/D08 ; ne pas importer la Factory. |
| EXT-FACTORY-003 | `/Users/malex/Desktop/FACTORIES/MASTERCLASS/CURRENT` | Subject library / teaching packs | `primitive_candidate` | Audit ciblé D05/D06/resources ; récolter sujets/rubriques/patterns. |
| EXT-FACTORY-004 | `/Users/malex/Desktop/FACTORIES/MASTERINVENTORY/CURRENT` | Inventory / OCR / reference deck | `primitive_candidate` | Audit ciblé D07/OCR/reference boards. |
| EXT-FACTORY-005 | `/Users/malex/Desktop/FACTORIES/ISCOM_JPO/CURRENT` | Event guide / school ops | `primitive_candidate` | Vérifier scope lock + source truth + refus hors périmètre. |
| EXT-FACTORY-006 | `/Users/malex/Desktop/FACTORIES/TALENTS_CREATIFS_BRIEF_INTAKE/CURRENT` | Brief intake / subject routing | `primitive_candidate` | Comparer à D05/D06 subject/routing. |
| EXT-FACTORY-007 | `/Users/malex/Desktop/FACTORIES/TALENTS_CREATIFS_GUIDE/CURRENT` | Guide étudiant / coaching | `primitive_candidate` | Comparer à Teaching guided runtime. |
| EXT-FACTORY-008 | `/Users/malex/Desktop/FACTORIES/PROF_KRAPU_FACTORY/CURRENT` | Visual pedagogy / DA teaching | `primitive_candidate` | Extraire visual pedagogy + source truth. |
| EXT-FACTORY-009 | `/Users/malex/Desktop/FACTORIES/NICOK_FACTORY/CURRENT` | Persona / DA local canon | `primitive_candidate` | Audit D04/D08 local canon. |
| EXT-FACTORY-010 | `/Users/malex/Desktop/FACTORIES/OURS_DOR_FACTORY/CURRENT` | Event theme / DA layer | `primitive_candidate` | Vérifier que Ours d'Or reste layer/theme, pas DA root. |
| EXT-FACTORY-011 | `/Users/malex/Desktop/FACTORIES/STAND_UP/CURRENT` | Stand-up / prise de parole | `primitive_candidate` | Audit D03/D05 : mode oral, coaching, feedback, export. |
| EXT-FACTORY-012 | `/Users/malex/Desktop/FACTORIES/GESTION_PROJET/CURRENT` | Gestion projet / usage Claude | `primitive_candidate` | Vérifier protocole usage harvester et patterns projet réutilisables. |
| EXT-FACTORY-013 | `/Users/malex/Desktop/FACTORIES/REDACTION_SEO/CURRENT` | Rédaction SEO / usage Claude | `primitive_candidate` | Vérifier usage harvester, source truth, export backflow. |
| EXT-FACTORY-014 | `/Users/malex/Desktop/FACTORIES/HELPLAB/CURRENT` | HelpLab / aide méthodo | `primitive_candidate` | Audit D03/D11 : guide, boot, extraction, refus hors scope. |
| EXT-FACTORY-015 | `/Users/malex/Desktop/FACTORIES/LEARNING_MIRROR/CURRENT` | Learning mirror | `primitive_candidate` | Comparer avec `learning_mirror_engine` Git. |
| EXT-FACTORY-016 | `/Users/malex/Desktop/FACTORIES/MASTERFLEX_COACH/CURRENT` | Coach MasterFlex | `primitive_candidate` | Comparer D04 personas + coaching behavior + source truth. |
| EXT-FACTORY-017 | `/Users/malex/Desktop/FACTORIES/MASTERSCORE/CURRENT` | Scoring / évaluation | `primitive_candidate` | Vérifier D06/compétences : score ≠ jugement utilisateur. |
| EXT-FACTORY-018 | `/Users/malex/Desktop/FACTORIES/OURS_DOR_BADGE_FACTORY/CURRENT` | Badge / event visual output | `primitive_candidate` | Vérifier D08 : Ours d'Or layer, pas DA root ; output readiness. |
| EXT-FACTORY-019 | `/Users/malex/Desktop/FACTORIES/ESPRIMED_LEARNING/CURRENT` | Diagnostic observer | `primitive_candidate` | Audit confidentialité, observation, consentement, learning signals. |
| EXT-LEGACY-DA-001 | Legacy DA orchestration V5 | DA compiler / visual refs | `runtime_gap` partiel | Audit D08 gate + visual reference boards. |
| EXT-LEGACY-RPG-001 | Legacy RPG runtime / jauges | Progression / readiness | `already_in_git_runtime` partiel | Ajouter contrat UI readiness/jauge. |
| EXT-LEGACY-UI-001 | Legacy UI Backend Roadmap V1 | UI rooms/widgets/control panel | `already_in_git_doc` partiel | Alimenter UI-001, éviter dashboard permanent. |
| EXT-DRIVE-001 | Drive Domain Cards D01-D12 | Produit lent | `already_in_git_doc` partiel | Ne plus traiter comme vérité parallèle ; vérifier uniquement si une idée n'est pas encore dans Git. |

## Règle d'usage

Chaque nouvelle découverte hors Git doit créer ou mettre à jour une ligne ici avant d'être traitée comme importante.

Une ligne `primitive_candidate` ne donne jamais le droit de coder directement, ni de copier une Factory telle quelle.

Pour les Factories, l'objet d'audit est toujours : `quelle primitive utile peut-on reprendre ?`, jamais `comment intégrer ce bot ?`.

Une ligne `runtime_gap` doit être reliée à :

- un contrat produit ;
- un test attendu ;
- un risque ;
- une tâche `AGENT_TASKS.md`.

## Passe 1 Factories — 2026-06-27

Audit publié : `docs/factories/FACTORY_PRIMITIVES_AUDIT_PASS_1_2026-06-27.md`.

Décision : les 19 Factories actives restent des sources candidates. Aucune n'est absorbée telle
quelle. Les primitives transversales prioritaires sont :

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

Nouvelles tâches de queue :

- `FACTORY-CDC-001` : publié dans `docs/factories/FACTORY_COMMON_CDC_2026-06-27.md` ;
- `FACTORY-ROUTER-001` : publié dans `docs/factories/FACTORY_PRIMITIVE_ROUTER_2026-06-27.md` ;
- `D08-VISUAL-REFS-001` ;
- `MASTERCLASS-SUBJECTS-001` ;
- `MASTERINVENTORY-OCR-001` ;
- `LEARNING-GAUGES-001` ;
- `MASTERHELP-001`.
