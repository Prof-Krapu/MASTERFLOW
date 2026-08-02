# MasterFlow UI CDC Canon V2

Statut : canon UI de cadrage valide pour integration progressive
Owner : MALEX
Date : 2026-07-04
Validation : GO MALEX du 2026-07-04
Source operable : repo Git `MASTERFLOW`
Sources candidates externes : `/Users/malex/Desktop/FACTORIES/`
Registre d'integration : `docs/ui/MASTERFLOW_UI_INTEGRATION_REGISTRY_V1.md`

## 1. Decision

Ce document rassemble le CDC UI actif, le reset UI, le prototype `/ui-reset`, le Component Lab
`/ui-lab` et les registres Factory utiles. MALEX valide ce document comme canon de cadrage pour
preparer l'integration systeme progressive.

Cette validation ne canonise pas automatiquement les assets candidats, les profils prototype,
les ecrans encore experimentaux ni les fonctions classees `futur`, `prototype` ou `a_decider`.
Chaque passage au runtime conserve son contrat, ses permissions, ses tests et sa validation.

Les anciens documents restent des sources auditees. Ils ne sont pas supprimes et ne doivent plus
etre utilises comme plan actif unique.

## 2. Etat actuel

| Couche | Statut | Decision |
|---|---|---|
| Canon UI de cadrage | valide | ce CDC V2 est la reference de consolidation et d'arbitrage |
| Assets visuels actifs | valide | MasterFlex et ProfKrapu actifs sont le canon visuel confirme par MALEX |
| Surfaces UI finales | partiel | les ecrans et nouveaux packs candidats restent soumis a validation humaine |
| Prototype `/ui-reset` | prototype valide pour revue | garder comme preuve de navigation, DA et interactions |
| Component Lab `/ui-lab` | atelier local partage | garder pour stabiliser les composants avant integration |
| Frontend runtime existant | technique, disperse | auditer et rebrancher progressivement, pas copier le proto tel quel |
| Backend Git | riche, partiel selon surfaces | consommer uniquement les contrats/endpoints reels |
| Factories Desktop | registre de patterns et bots autonomes | extraire primitives utiles, jamais importer une Factory complete |
| Deployment/live | hors scope | aucun merge `main`, PR, provider ou publication dans cette phase |

## 3. Vocabulaire officiel

| Terme | Sens UI V2 |
|---|---|
| Prototype | espace de recherche navigable, non runtime, non canon final |
| Lab | atelier de composants et d'etats, sans backend obligatoire |
| Runtime | interface branchee sur contrats backend reels, permissions et etats vrais |
| Canon UI | decision produit stabilisee dans Git, pas seulement une preference de session |
| Factory | capsule autonome externe ; source candidate de patterns, jamais racine active |
| Pattern Factory | primitive reutilisable : regle, contrat, gate, workflow, format ou etat |
| Candidate | proposition visible mais non validee |
| Canon | valide humainement et represente dans Git par contrat, code, seed ou document |
| Verrouille | visible si utile, mais non executable ; raison obligatoire |
| Futur | connu mais non disponible ; ne doit pas etre simule comme actif |

## 4. Vision UI

MasterFlow doit etre un canvas pedagogique vivant, pas un back-office technique.

En moins de dix secondes, l'utilisateur doit comprendre :

- ou il est ;
- quel contexte est actif ;
- quel persona l'accompagne ;
- quelle action utile est disponible maintenant ;
- ce qui demande attention humaine ;
- ce qui tourne en arriere-plan ;
- ce qui est verrouille ou futur.

La Home est un point de reprise. Elle ne doit pas devenir un catalogue de features.

## 5. Architecture ecran canonique

```txt
gauche      centre             droite
navigation  scene active       actions utiles

haut        systeme calme      notifications / jobs / inbox
bas         clavier / micro    suggestions limitees
```

Regles :

- gauche : modes autorises, profil/persona visible, acces et parametres ;
- centre : scene active, Home, personnage, projet, cours ou studio ;
- bas : command dock unique clavier / micro / historique / suggestions ;
- droite : actions rapides et bibliotheque d'actions ;
- haut : indicateurs systeme discrets, jamais tableau technique permanent ;
- mobile : logique conversationnelle, menu bas, pages plein ecran pour les panneaux utiles ;
- desktop : cockpit complet, mais centre de gravite rigoureux sur la scene.

## 6. Matrice des sources UI

| Source | Decision | Pourquoi |
|---|---|---|
| `MASTERFLOW_UI_CDC_ACTIVE.md` | archiver / fusionner | contient beaucoup de matiere historique, trop large pour etre plan actif |
| `MASTERFLOW_UI_RESET_CDC_V1.md` | fusionner | pose la bonne rupture : Home point de reprise, UI legere, pas dashboard |
| `MASTERFLOW_COMPONENT_LAB_V2.md` | garder | definit le Lab comme banc de test rapide |
| `MASTERFLOW_COMMAND_DOCK_LAB_V1.md` | garder | comportement clavier/micro transversal stabilise |
| `MASTERFLOW_SKILLTREE_GALAXY_LAB_V1.md` | garder | skilltree/galaxy doit rester testable a part |
| `MASTERFLOW_SHORTCUTS_LAB_V1.md` | garder | raccourcis et priorite `Esc` doivent rester canoniques |
| `MASTERFLOW_LAB_EXIT_ANIMATIONS_V1.md` | garder | tout composant qui entre doit sortir proprement |
| `MASTERFLOW_PROTOTYPE_PROFILE_CONTRACT_V1.md` | garder | profils prototype strictement separes du backend |
| `MASTERFLOW_PROTOTYPE_PROFILE_PROFKRAPU_V1.md` | garder | exemple valide de profil multi-identite |
| `/ui-reset` | garder comme reference prototype | prouve la navigation, les animations et la DA actuelle |
| `/ui-lab` | garder comme outil de travail | isole composants, profils, themes, mobile et overlays |
| Ancien frontend `apps/frontend` | recycler | contient les raccords API reels et panneaux runtime |
| Docs Factories | fusionner par primitives | source de patterns, pas de runtime direct |

## 7. Regles de navigation

- La navigation globale est pilotee par le loadout, pas par une liste fixe definitive.
- Le prototype peut garder une liste locale, mais le runtime devra lire les modes autorises.
- `Cmd/Ctrl + haut/bas` navigue dans le cycle global autorise.
- Sur skilltree/galaxy, `gauche/droite` navigue dans les galaxies sans casser le cycle global.
- Mobile : les panneaux de menu bas ouvrent des pages plein ecran, pas des mini-popovers desktop.
- Une fonction non autorisee est cachee ou verrouillee avec raison, jamais simulee active.
- GodMode est un acces, pas une experience normale affichee a tout le monde.

## 8. Command dock clavier / micro / tunnel

Regles canon :

- un seul Command Dock pour Home, pages, skilltree et surfaces runtime ;
- Home : dock ouvert par defaut ;
- autres surfaces : dock ferme par defaut ;
- `K` ouvre/ferme clavier ;
- `M` ouvre/ferme micro conversationnel ;
- micro conversationnel et transcription clavier sont deux fonctions differentes ;
- `Enter` envoie ;
- `Shift+Enter` ajoute une ligne ;
- le clavier ne se ferme pas apres envoi ;
- suggestions visibles limitees a 5 actions par defaut ;
- pas de grille permanente a deux lignes ;
- `Esc` ferme selon priorite : Tunnel, overlays, system panels, historique, dock, menu, focus.

Mode Tunnel :

- activable partout par `T` ;
- surface focus plein ecran ;
- l'arriere-plan reste present mais non interactif ;
- retour exact au contexte precedent ;
- utilise le persona comme developpeur d'explication longue ;
- aucune action runtime sensible n'est executee depuis le Tunnel sans validation.

## 9. Profils, personas et assets

Regles :

- profil prototype != persona backend canonise ;
- persona != permission ;
- theme personnel != theme global ;
- asset candidat != asset canon ;
- visual canon lock exige validation humaine ;
- les profils prototype vivent dans `prototype-profile-registry.ts` tant qu'aucun contrat runtime
  dedie n'existe.

Dossier prototype actuel :

- MasterFlex : profil MALEX, theme MasterFlow, skilltree/galaxy, assets locaux ;
- ProfKrapu : profil Vincent, theme Orchidee, assets locaux, skilltree science/pedagogie/dataviz ;
- les deux profils partagent les memes composants et ne doivent pas se modifier mutuellement.

Pattern retenu :

- `persona_to_visual_pipeline` depuis Factories : `PRIVATE_PREVIEW -> PERSONA_CANDIDATE ->
  GOOD_DIRECTION -> CANON_CANDIDATE -> CANON_LOCKED`.

## 10. Themes et couleurs

Regles :

- les couleurs viennent de palettes guidees, pas de liberte totale ;
- chaque theme doit distinguer couleur UI majeure, couleur persona/user et couleur support ;
- le theme clair inverse les valeurs sans casser la lisibilite ;
- les champs texte, focus, selections et boutons suivent la palette active ;
- aucun etat critique ne doit reposer uniquement sur la couleur ;
- le Theme Studio manipule des previews et packs candidats, pas le theme global live sans validation.

Pattern retenu :

- `features/theme-studio/asset_pack.md` : `ThemePack` candidat avec palette, typographies sourcees,
  assets et lint. Actions d'application/deploiement fermees.

## 11. Skilltree / Galaxy

Regles :

- le skilltree est une metaphore de progression, pas une note humiliante ;
- `visible != usable != equipped != validated` ;
- les galaxies peuvent montrer distance, taille et vitesse comme metaphores de maitrise/importance ;
- les galaxies doivent rester centrees sur la scene, independantes du menu lateral ;
- les skills et familles viennent d'un contrat, pas d'une liste decorative libre ;
- le Lab reste le bon endroit pour tester tailles, vitesses, orbites, mobile et profils.

Pattern retenu :

- `skill_tree_node` depuis Factories : types de noeuds, statuts visuels, dependances, conflits,
  explication obligatoire pour verrouillage.

## 12. Animations

Regle generale : tout composant qui apparait doit pouvoir disparaitre avec une animation coherente.

- ouverture : apparition claire, souvent depuis le bas pour le contenu texte ;
- fermeture : sortie visible, jamais disparition brutale sauf `prefers-reduced-motion` ;
- overlays : clic exterieur et `Esc` ferment proprement ;
- menu gauche, rail droit et dock bas sortent dans leur direction physique ;
- les transitions de theme, jauges et fonds doivent eviter les flashs de couleur ;
- le Lab doit tester les entrees/sorties avant integration runtime.

## 13. Patterns Factory retenus

| Pattern / primitive | Source Factory | Present Git | Present proto | Present Lab | Statut | Action |
|---|---|---|---|---|---|---|
| Candidate != Canon | `candidate_canon_ui`, `domain_runtime_surface` | oui docs + validation | oui logique assets | partiel | deja integre | garder comme invariant central |
| Source truth strip | `source_truth_strip` | partiel Resource Truth / D08 | non systematique | non | runtime manquant | ajouter aux surfaces qui montrent sources, assets, feedbacks |
| Validation inbox | `validation_inbox` | oui backend + UI existante | resumee | non central | deja integre | la garder comme point unique decision humaine |
| Runtime loadout | `runtime_loadout` | oui backend | simule/local | partiel | a brancher | utiliser pour modes, actions, shortcuts et verrouillages |
| Skill tree node | `skill_tree_node` | gamification/competencies existent | oui prototype | oui | prototype seulement | definir le mapping runtime avant integration |
| Persona visual pipeline | `persona_to_visual_pipeline` | D08/style partiel | oui assets locaux | oui profils | prototype seulement | creer contrat API/assets plus tard |
| Mode handoff | `mode_handoff` | tests/contrat existants | non exploite | non | runtime manquant UI | connecter aux ponts Learn/Project/Story/DA plus tard |
| Theme pack | `asset_pack` | Theme Studio partiel | oui palette locale | oui | doc + prototype | rapprocher Theme Studio et palettes guidees |
| Extraction / backflow | `core/extraction`, `core/backflow` | D11 existe | non direct | non | doc/runtime partiel | exposer comme source de feedback, pas action automatique |
| Usage harvester | `usage_harvester` | D11/D12 partiel | non | non | runtime partiel | utiliser pour ameliorer l'UI apres validation |
| Domain runtime surface | `domain_runtime_surface` | partiel via capability maps | non | non | a formaliser | utiliser comme contrat par surface UI |

## 14. Surfaces UI et branchement systeme

| Surface UI | Donnees backend | Endpoint / contrat | Permission | Etat vide | Etat verrouille | Source pattern | Priorite |
|---|---|---|---|---|---|---|---|
| Shell / navigation / system bar | context, loadout, actions, jobs, inbox | `/context/current`, `/experience/orientation`, `/jobs`, `/validation-inbox` | user+ selon loadout | Home minimale + actions de base | mode visible avec raison si future/admin | runtime_loadout, domain_runtime_surface | P1 |
| Command dock | actions disponibles, shortcuts, chat WS futur | `CurrentContext.available_actions`, `user_runtime_loadout`, WS `/ws` | user+ | input seul, aucune suggestion | action chip inactive avec raison | runtime_loadout, action_lifecycle | P1 |
| Home | contexte actif, prochaine action, persona, attention | `/context/current`, `/experience/orientation`, `/validation-inbox`, `/jobs` | user+ | message de reprise + clavier | raccourcis limites au loadout | room_context_card, source_truth_strip | P1 |
| Persona / skilltree | personas, style, learning, competencies, gamification | `/personas`, `/learning-mirror`, `/style-mirror`, `/competencies`, `/gamification` | user+ / owner scope | persona systeme simple | skill locked avec raison | skill_tree_node, persona_to_visual_pipeline | P1 |
| Validation / jobs / notifications | validations, jobs, incidents | `/validation-inbox`, `/jobs`, `/diagnostics/owner-cockpit` | selon role | aucun item | decision non autorisee | validation_inbox, workflow_observability | P1 |
| Project | projets, membres, ressources, needs | `/projects`, `/projects/:id/resources`, inventory needs | project member | aucun projet actif | lecture seule si non owner | source_truth_strip, mode_handoff | P2 |
| Teaching | cohorts, rosters, subjects, rubrics, guided sessions | `/cohorts`, `/subjects`, `/guided-runtime`, correction routes | teacher+ | aucun cours/projet | action prof verrouillee | pedagogical_routing_matrix, subject_as_mission | P2 |
| Learn | learning profile, subjects, guidance | `/learning-mirror`, `/subjects`, guided runtime | user+ | mode aide simple | besoin validation prof | personal_learning_profile, guided_runtime | P2 |
| Inventory | resources, collections, OCR candidates, RAG | `/inventory`, `/resources`, `/rag` | editor/project scope | inventaire vide honnete | candidat non valide | source_truth_strip, candidate_canon_ui | P3 |
| DA / Theme Studio | visual refs, manifests, visual fabric, theme packs | `/visual-references`, `/visual-manifests`, `/experience/visual-fabric/*` | owner/admin selon action | aucune reference | GO IMAGE/provider bloque | visual_reference_status, generation_lifecycle_gates | P3 |
| MasterStory | workbenches, graph, storylets, patches | `/story-workbenches`, `/narrative/*`, `/experience/storylets` | owner/project scope | aucun workbench | canon lock / spoiler gate | narrative_canon_graph, reader_graph_reveal_gate | P3 |
| Companions / MOTH / monstres | living companion, entities, persona blend futur | guided runtime, living entity contracts | selon room/scope | aucun companion actif | futur si pas de contrat | persona_layer_architecture, lore_entity_builder | P4 |

## 15. Etats obligatoires

Chaque surface doit definir :

- etat charge ;
- etat vide ;
- etat partiel ;
- etat verrouille ;
- etat futur ;
- etat erreur ;
- etat validation requise ;
- etat lecture seule ;
- etat source incertaine ;
- etat mobile.

Interdits :

- masquer une erreur comme une interface vide ;
- afficher un bouton actif sans permission ;
- presenter un provider non configure comme disponible ;
- appeler `canon` un asset ou contenu candidat ;
- confondre job en cours et decision humaine.

## 16. Anti-patterns

- Home dashboard technique ;
- liste de toutes les features en vrac ;
- debug visible au repos ;
- duplication de queues de validation ;
- grille permanente d'actions clavier sur deux lignes ;
- couleurs libres illisibles ;
- profil prototype traite comme compte/runtime ;
- Factory importee dans Git comme si elle etait une app ;
- micro/voix simule comme live ;
- action sensible executee depuis une suggestion ;
- animations d'ouverture sans sortie ;
- mode mobile reduit a une version ecrasee du desktop.

## 17. Ordre d'integration recommande

1. Stabiliser le Lab comme banc de test de composants.
2. Extraire Shell / navigation / system bar en composants runtime-ready.
3. Brancher Command Dock sur actions/loadout reels, sans chat IA complet d'abord.
4. Refaire Home runtime minimale depuis `CurrentContext` + orientation + jobs + inbox.
5. Brancher persona/skilltree sur un contrat hybride : profil prototype + donnees backend reelles.
6. Reprendre notifications, Validation Inbox et Task Monitor comme surfaces P1.
7. Brancher Project, Teaching et Learn dans cet ordre.
8. Brancher Inventory, DA Studio et MasterStory seulement apres les P1/P2.
9. Reporter Companions/MOTH/monstres a une vague dediee.

## 18. Conditions avant passage prototype -> runtime

Une surface peut quitter le prototype seulement si elle a :

- contrat de donnees identifie ;
- endpoint ou schema partage existant ;
- permission et loadout definis ;
- etats vides/verrouilles/futurs documentes ;
- mapping mobile/desktop ;
- animations entree/sortie ;
- recette Lab ;
- recette `/ui-reset` ;
- risque de confusion prototype/canon traite.

## 19. Questions a decider plus tard

- Quel niveau de personnalisation theme devient runtime utilisateur ?
- Quel contrat transforme un profil prototype en persona runtime ?
- Le skilltree runtime lit-il d'abord `competencies`, `gamification`, ou un agregat dedie ?
- Quelle part du Mode Tunnel devient produit connecte au chat WS ?
- Quelle surface recoit en premier les `mode_handoff` ?
- Comment exposer les patterns Factory sans polluer le Git avec les audits complets ?

## 20. Prochaine action recommandee

Creer une matrice d'integration executable par vague :

```txt
surface -> composant Lab -> donnees backend -> endpoint -> permission -> etats -> tests
```

La premiere vague doit viser Shell + Command Dock + Home runtime minimale, sans toucher aux
fondations systeme deja mergees et sans importer de Factory complete.
