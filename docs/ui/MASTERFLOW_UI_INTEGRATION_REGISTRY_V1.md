# MasterFlow UI Integration Registry V1

Statut : registre actif sous canon UI de cadrage V2
Owner : MALEX
Date : 2026-07-04
Validation : GO MALEX du 2026-07-04 pour le cadrage, pas pour les candidats
Reference CDC : `docs/ui/MASTERFLOW_UI_CDC_CANON_V2.md`
Perimetre : audit, classement, integration progressive. Pas de code runtime dans ce fichier.

## 1. Decision

Ce registre sert a eviter que les idees UI deja pensees se perdent entre le prototype, le Lab, Git,
les Factories, les legacy, les captures et les conversations.

Principe :

```txt
idee ou cas MALEX -> check Git -> check proto/Lab -> check Factory/legacy si besoin -> classement -> queue
```

Une idee ne devient pas canon parce qu'elle est bonne. Elle devient exploitable quand elle est
classee, reliee a une surface, rattachee a une source, puis branchee ou mise en queue.

## 2. Sources et roles

| Source | Role | Regle |
|---|---|---|
| `docs/ui/MASTERFLOW_UI_CDC_CANON_V2.md` | canon UI de cadrage valide | point d'arbitrage principal |
| `docs/ui/MASTERFLOW_UI_SURFACE_SHELL_DOCK_V1.md` | fiche de branchement P1 | cadrer Shell + Dock avant code |
| `docs/ui/MASTERFLOW_UI_ASSET_CURATION_V1.md` | manifeste de curation | separer actifs, candidats, sources, backups et debug |
| `/ui-reset` | prototype navigable | reference DA, comportement et feeling |
| `/ui-lab` | atelier composants | tester un composant sans toucher au runtime |
| `apps/frontend` existant | frontend technique | recycler les raccords API/panneaux, pas copier le prototype brut |
| `packages/shared` | contrats partages | source prioritaire pour schema/endpoint/type |
| `apps/backend` | runtime reel | source des endpoints, permissions, jobs et actions |
| `/Users/malex/Desktop/FACTORIES/` | patterns candidats | extraire primitives utiles, jamais importer une Factory complete |
| legacy / archives | preuves candidates | lire seulement si Git/proto/Lab ne couvrent pas le sujet |

## 3. Statuts de classement

| Statut | Sens |
|---|---|
| `canon_ui` | decision UI stabilisee par CDC ou doc Git |
| `prototype` | prouve dans `/ui-reset`, pas encore runtime |
| `lab` | testable dans `/ui-lab`, pas encore runtime |
| `runtime_partiel` | branche en Git mais incomplet cote UI/permissions/etat |
| `runtime_pret` | contrat + endpoint + permission + etats identifies |
| `factory_candidate` | pattern utile trouve dans Factories |
| `legacy_candidate` | idee/source trouvee hors Git, a verifier |
| `a_decider` | bonne piste, arbitrage produit necessaire |
| `rejete` | explicitement non retenu |
| `futur` | connu, mais hors vague actuelle |

## 4. Methode d'audit rapide

Pour chaque nouvelle idee ou surface :

1. Chercher dans Git : `docs/ui`, `packages/shared`, `apps/backend`, `apps/frontend`.
2. Chercher dans le prototype : `/ui-reset`, registry profils, assets et scenes.
3. Chercher dans le Lab : composant isole, scenario, theme, mobile, overlay.
4. Si absent ou flou, chercher dans Factories par mots metier et synonymes.
5. Classer la source : Git / proto / Lab / Factory / legacy / absent.
6. Decider : integrer maintenant, queue, demander a Vincent, decider plus tard, rejeter.
7. Mettre a jour la ligne de surface et le cas d'usage.

## 5. Registre des surfaces UI

| Surface | Role produit | Composants Lab lies | Donnees backend attendues | Patterns Factory utiles | Cas deja penses | Manques / risques | Statut | Prochaine action |
|---|---|---|---|---|---|---|---|---|
| Shell / navigation | acces aux modes selon contexte et profil | left nav, profile switch, system bar | `CurrentContext`, `user_runtime_loadout`, actions, role | `runtime_loadout`, `permission_runtime`, `domain_runtime_surface` | menu retractable, profil actif, acces eleve/prof/admin/godmode, mobile bottom nav | cycle global doit lire les droits reels ; ne pas figer les modes | `prototype` + `lab` | definir mapping loadout -> modes visibles |
| Command Dock | interface d'entree principale clavier/micro/actions | dock, suggestions, history, mic, action library | `available_actions`, WS chat futur, action registry | `runtime_loadout`, `action_lifecycle`, `llm_streaming` | clavier unique, Enter send, micro distinct, Tunnel, suggestions max 5 | brancher actions reelles sans action sensible accidentelle | `canon_ui` + `prototype` | brancher en lecture seule sur actions disponibles |
| Home | reprise de contexte utile | home scene, dock ouvert, mode entries | `/context/current`, `/experience/orientation`, `/jobs`, `/validation-inbox` | `room_context_card`, `source_truth_strip`, `runtime_loadout` | message d'accueil, acces principaux, clavier ouvert par defaut | eviter dashboard technique ; definir prochaine action utile | `prototype` | creer Home runtime minimale |
| Persona / Profile page | identite active, statut, progression, relation | profile card, theme, persona page | `/personas`, style/learning mirror, competencies | `persona_to_visual_pipeline`, `behavior_profile`, `personal_learning_profile` | MasterFlex, ProfKrapu, portraits, punchlines, rang, theme | profil prototype ne doit pas devenir compte/runtime par accident | `prototype` + `lab` | separer profil proto, persona runtime et permissions |
| Skilltree / Galaxy | progression visuelle et pedagogique | galaxy scene, skill nodes, nav arrows | `/competencies`, `/gamification`, learning profile | `skill_tree_node`, `competency_signal`, `gamification_engine` | distance/vitesse/taille, galaxies, centralite, mobile | source des skills et XP pas encore unifiee | `prototype` + `lab` | choisir source runtime primaire |
| Tunnel | explication longue focus | tunnel overlay, large composer, persona focus | WS chat futur, context current, active surface | `conversation_to_runtime_routing`, `guided_runtime`, `mode_handoff` | `T`, focus plein ecran, retour contexte | risque de devenir chat generique hors contexte | `prototype` | definir ce que le Tunnel recoit comme contexte |
| Notifications / jobs / inbox | attention humaine et process qui tournent | system buttons, panels, badges | `/jobs`, `/validation-inbox`, diagnostics | `validation_inbox`, `workflow_observability`, `safety_state_machine` | top system bar, badges, panels plein ecran mobile | eviter queues paralleles ; distinguer job vs decision | `runtime_partiel` | unifier Task Monitor + Validation Inbox |
| Project | travail courant et ressources de projet | mode page future | `/projects`, resources, needs | `source_truth_strip`, `mode_handoff`, `territory_map` | Project prioritaire dans nav | Home doit donner envie d'entrer dans Project | `runtime_partiel` | cadrer page Project V1 |
| Teaching | surface prof, cours, cohorts, correction | mode page future | `/cohorts`, `/subjects`, guided runtime, correction | `pedagogical_routing_matrix`, `subject_as_mission`, `correction_pipeline` | Teaching comme mode outil | ne pas melanger prof/admin/godmode | `runtime_partiel` | cadrer V1 lecture seule |
| Learn | surface eleve/apprenant | mode page future | `/learning-mirror`, subjects, guided runtime | `personal_learning_profile`, `guided_runtime` | Learn stacke avec Teaching | definir difference Learn vs Teaching | `runtime_partiel` | cadrer parcours minimal |
| Inventory | ressources, documents, objets, besoins | panel/page future | `/inventory`, `/resources`, `/rag` | `source_truth_strip`, `diegetic_inventory`, `resource_truth_patch` | action secondaire/personnelle | risque de back-office technique | `runtime_partiel` | exposer inventaire par contexte, pas catalogue brut |
| DA / Theme Studio | direction artistique, themes, visuels | theme controls, future studio | visual refs, manifests, theme packs | `visual_reference_status`, `generation_lifecycle_gates`, `da_linter` | palettes guidees, assets persona | GO IMAGE et assets candidats a proteger | `prototype` + `doc` | definir Theme Studio candidate-only |
| MasterStory | narration, storylets, canon narratif | mode page future | story workbenches, narrative graph | `narrative_canon_graph`, `storylet_engine`, `reader_graph_reveal_gate` | mode haut niveau, pas Home | risque de trop ouvrir trop tot | `runtime_partiel` | cadrer lecture/atelier avant edition |
| Companions / MOTH / monstres | entites vivantes et accompagnement | futur | living entity contracts | `persona_layer_architecture`, `lore_entity_builder`, `safety_persona_runtime` | futur identifie | pas de contrat runtime assez clair | `futur` | garder hors P1/P2 |

## 6. Registre des cas d'usage

| Cas | Surface | Source actuelle | Present Git | Present proto | Present Lab | Decision | Prochaine action |
|---|---|---|---|---|---|---|---|
| Dock clavier unique partout | Command Dock | CDC + proto | oui doc | oui | oui | `canon_ui` | brancher sur actions reelles en lecture seule |
| Shell + Dock lecture seule | Shell / Command Dock | `MASTERFLOW_UI_SURFACE_SHELL_DOCK_V1.md` | oui doc + pont runtime optionnel | oui | oui | `runtime_partiel` | tester avec session backend connectee puis decider Home runtime |
| Enter envoie, Shift+Enter newline | Command Dock | CDC + proto | oui doc | oui | oui | `canon_ui` | conserver invariant pendant integration |
| Micro conversationnel distinct de transcription | Command Dock | prototype | oui doc | oui | partiel | `canon_ui` | definir contrat voix/transcription futur |
| Mode Tunnel pour explication longue | Tunnel | prototype | oui doc | oui | oui | `prototype` | definir contexte donne au Tunnel |
| Tous panneaux ont animation entree/sortie | Global | CDC + Lab | oui doc | oui | oui | `canon_ui` | ajouter recette par composant avant runtime |
| Home ouverte sur clavier | Home | prototype | oui doc | oui | oui | `canon_ui` | brancher Home runtime minimale |
| Navigation au loadout | Shell | Factory + backend | oui partiel | simule | partiel | `runtime_partiel` | mapper `user_runtime_loadout` vers UI |
| Profil MasterFlex / ProfKrapu separes | Persona | prototype + docs | oui doc | oui | oui | `prototype` | definir passage profil proto -> runtime |
| Skill galaxy distance/vitesse/taille | Skilltree | prototype | oui doc | oui | oui | `prototype` | raccorder a competencies/gamification |
| Source truth strip visible sur sources/assets | Inventory / DA / Project | Factory | oui partiel | non | non | `factory_candidate` | definir surfaces ou l'afficher |
| Validation humaine unique | Inbox | backend + Factory | oui | partiel | non | `runtime_partiel` | ne jamais creer de queue parallele |
| Theme guide par palettes | Theme Studio | prototype + Factory | oui doc | oui | oui | `prototype` | formaliser ThemePack runtime plus tard |
| Action sensible jamais depuis suggestion directe | Command Dock | CDC + action registry | oui partiel | oui | oui | `canon_ui` | verifier action lifecycle avant execution |
| Mobile panneaux plein ecran | Global mobile | prototype | oui doc | oui | oui | `canon_ui` | garder dans recettes Lab |

## 7. Registre des patterns Factory utiles

| Pattern | Chemin source | Usage UI | Git aujourd'hui | Statut | Action |
|---|---|---|---|---|---|
| Candidate != Canon | `_FACTORY_LIBRARY/patterns/candidate_canon_ui.md` | ne pas canoniser proto/assets/Factory automatiquement | docs + validation | `deja_retenu` | garder invariant dans chaque spec |
| Domain runtime surface | `_FACTORY_LIBRARY/core/domain_runtime_surface.md` | separer preview/export/live/persona/permission | partiel | `a_formaliser` | utiliser dans chaque surface runtime |
| Runtime loadout | `_FACTORY_LIBRARY/patterns/runtime_loadout.md` | modes/actions visibles selon droits | backend existe | `a_brancher` | Shell + Dock P1 |
| Source truth strip | `_FACTORY_LIBRARY/patterns/source_truth_strip.md` | afficher origine/statut/confiance des contenus | partiel | `runtime_gap` | Inventory/Project/DA |
| Validation inbox | `_FACTORY_LIBRARY/patterns/validation_inbox.md` | decision humaine unique | backend + UI existante | `deja_integre_partiel` | unifier panels |
| Skill tree node | `_FACTORY_LIBRARY/patterns/skill_tree_node.md` | etats visible/usable/equipped/validated | proto + backend pieces | `a_mapper` | Skilltree P1 |
| Persona visual pipeline | `_FACTORY_LIBRARY/patterns/persona_to_visual_pipeline.md` | generation et validation assets persona | proto assets | `prototype` | ecrire contrat assets plus tard |
| Theme pack | `_FACTORY_LIBRARY/features/theme-studio/asset_pack.md` | palettes guidees, previews, lint | doc/proto | `a_brancher_plus_tard` | Theme Studio P3 |
| Mode handoff | `_FACTORY_LIBRARY/patterns/mode_handoff.md` | passer d'un mode a l'autre avec contexte | peu exploite | `runtime_gap` | Learn/Project/Story/DA |
| Usage harvester | `_FACTORY_LIBRARY/patterns/usage_harvester.md` | capter signaux sans auto-canon | partiel D11/D12 | `future` | apres surfaces P1 |

## 8. Matrice de verification Git progressive

| Question | Check Git | Si absent |
|---|---|---|
| Le cas existe-t-il en doc UI ? | `rg "mot-cle" docs/ui` | chercher dans prototype ou Factory |
| Existe-t-il un contrat partage ? | `rg "Schema|API|type" packages/shared/src` | classer `runtime_gap` |
| Existe-t-il un endpoint ? | `rg "router|/api/v1|create.*Router" apps/backend/src` | classer `doc/prototype seulement` |
| Existe-t-il une permission/action ? | `rg "action_id|available_actions|permission" apps/backend/src packages/shared/src` | classer `a_decider` |
| Existe-t-il un composant prototype ? | `rg "label|mode|component" apps/frontend/src/ui-reset apps/frontend/src/current-ui-demo.*` | ajouter au Lab ou au backlog |
| Existe-t-il un pattern Factory ? | `rg "mot-cle" /Users/malex/Desktop/FACTORIES` | extraire primitive, pas importer |

## 9. Queue d'integration

### A faire maintenant

| Tache | Impact | Risque | Source | Statut | Validation |
|---|---|---|---|---|---|
| Transformer ce registre en checklist de vague P1 | clarifie le passage proto -> runtime | faible | CDC V2 | `canon_ui` | non |
| Tester Shell + Dock lecture seule avec backend connecte | confirme le pont `CurrentContext` sans casser le proto | moyen | `MASTERFLOW_UI_SURFACE_SHELL_DOCK_V1.md` | `runtime_partiel` | oui MALEX |

### A mettre en queue

| Tache | Impact | Risque | Source | Statut | Validation |
|---|---|---|---|---|---|
| Mapper `user_runtime_loadout` vers navigation UI | navigation vraie par droits | moyen | backend + Factory | `runtime_partiel` | oui avant code |
| Mapper `available_actions` vers suggestions Dock | actions vraies sans execution sensible | moyen | backend | `runtime_partiel` | oui avant code |
| Definir source runtime du skilltree | evite fausse progression | moyen | backend + proto | `a_decider` | oui |
| Formaliser ThemePack utilisateur | evite palettes illisibles | faible | prototype + Factory | `prototype` | oui |

### A demander a Vincent

| Question | Pourquoi | Surface |
|---|---|---|
| Quels endpoints/loadouts sont consideres stables pour navigation et actions ? | eviter de brancher une surface sur un contrat instable | Shell / Dock |
| Quelle source backend doit piloter le skilltree : competencies, gamification, learning mirror ou agregat ? | eviter trois verites paralleles | Skilltree |
| Quels jobs doivent apparaitre dans Task Monitor V1 ? | distinguer technique, pedagogie et validation humaine | Jobs / Inbox |

### A decider plus tard

| Sujet | Raison |
|---|---|
| Passage profil prototype -> compte/persona runtime | risque de melanger DA, permission et identite |
| Mode Tunnel connecte au WS chat | doit conserver contexte et ne pas devenir chat generique |
| Companions / MOTH / monstres | gros potentiel mais hors P1/P2 |

## 10. Regle de mise a jour

Quand MALEX ajoute une idee :

```txt
1. ajouter une ligne dans "Registre des cas d'usage"
2. mettre a jour la surface concernee
3. noter la source : Git / proto / Lab / Factory / legacy / absent
4. choisir un statut
5. ajouter une action courte dans la queue si necessaire
```

Si une idee semble absente de Git, ne pas conclure qu'elle est nouvelle. Chercher d'abord dans
Factories et legacy de facon ciblee.
