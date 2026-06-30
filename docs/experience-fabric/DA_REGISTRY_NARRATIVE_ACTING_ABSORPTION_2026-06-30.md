# DA Registry + Narrative Acting — absorption ciblée legacy → Git

Date : 2026-06-30  
Statut : publié sur GitHub `main` en preview, sans génération image, sans canonisation automatique.

## Décision produit

MasterFlow doit savoir reconstituer une direction artistique depuis des registres composables :

1. racine MasterFlow ;
2. profil visuel d’entité ;
3. couches événementielles ou dédiées ;
4. briques atomiques ;
5. planches de références typées ;
6. recette de sortie ;
7. acting narratif.

Le premier pilote est `masterflex-001`. Ours d’Or reste une couche événementielle branchable, pas la DA root.

## Matrice legacy source → registre cible → statut Git → action

| Source legacy ciblée | Registre cible | Statut Git | Action |
|---|---|---|---|
| `DA_COMPILER_VISUAL_REFERENCE_ROUTER_ENGINE` | resolver + gates + ordre de compilation | partiel implémenté | ordre repris dans le resolver preview |
| `PROMPT_STACK_ARCHITECTURE` | pipeline stack / contexte / intention | partiel | repris comme principe, pas comme prompt runtime |
| `MASTERFLEX_PROPRIETARY_DA_ROOT_REGISTRY` | `VisualEntityProfile`, briques MasterFlex | implémenté P1 | seed déclaratif MasterFlex |
| `MASTERFLEX_GRAPHIC_CANON_V2_STYLE_PROPORTION_CLOTHING_ACTING` | `NarrativeActingProfile`, negative locks | implémenté P1 | états normal, amusé, suspicieux, fermé |
| `VISUAL_REFERENCE_BOARD_REGISTRY_V5` | `VisualReferenceBoard` | implémenté P1 | planches canon/expression/anti-pattern/Ours/Prof/roles |
| `MASTERFLOW_DA_ATOMIC_BRICKS_AND_PIPELINE_SLICES_REGISTRY` | `VisualAtomicBrick`, `VisualPipelineSlice` | implémenté P1 | briques core + recettes avatar/UI/badge/monstre/rôles |
| `OURS_DOR_EVENT_DA_REFERENCE_AND_PIPELINE_REGISTRY` | `VisualDaLayer`, role classes, monster slice | partiel implémenté | Ours d’Or layer + role/monster preview |
| `PROF_KRAPU_DA_REFERENCE_AND_PIPELINE_REGISTRY` | dedicated layer + badge slice | partiel implémenté | couche dédiée et recette badge |
| payloads Comfy / narrative-to-image | D08 manifest preview | partiel | aucun provider ; seulement preview explicable |

## Complément Factory absorbé — 001b

Les factories actives Ours d’Or, Ours d’Or Badge et ProfKrapu contenaient des éléments plus récents ou plus précis que le premier seed. Elles sont absorbées comme sources candidates validées pour registre, pas comme runtime autonome.

| Source factory | Élément absorbé | Registre cible | Décision |
|---|---|---|---|
| `OURS_DOR_FACTORY/02_MASTERFLEX_CANON_AVATAR_AND_ROLE_AUTHORITY` | hiérarchie pouvoir/étrangeté, test silhouette, caricature structurelle | `VisualClassProfile`, `VisualDaGauge` | absorbé comme contrôle de rôle |
| `OURS_DOR_FACTORY/04_ROLES_MONSTERS_INCUBATOR_EVENTS_AND_WORLD` | classes participant, finaliste, lauréat, jury collectif, visitor, incubator, gold bear | `VisualClassProfile`, `VisualAtomicBrick` | absorbé sans transformer les étudiants en monstres |
| `OURS_DOR_FACTORY/04_ROLES_MONSTERS_INCUBATOR_EVENTS_AND_WORLD` | emblème contextuel t-shirt MasterFlex et propagation d’accents | `VisualAtomicBrick` | absorbé comme option bornée, pas invariant morphologique |
| `OURS_DOR_BADGE_FACTORY/03_BADGE_MODALITIES_AND_CONTAINER` | badge = conteneur FRAME/BACKGROUND/CONTENT/TOPPER/BANNER/FOOTER/PORTS | `VisualPipelineSlice` | absorbé comme slice `badge_container` |
| `OURS_DOR_BADGE_FACTORY/04_VISUAL_CANON_BOARD_ROUTER` | board badge, logo officiel jamais redessiné, anti-patterns | `VisualReferenceBoard`, `VisualPipelineSlice.logo_policy` | absorbé comme gate de sortie |
| `PROF_KRAPU_FACTORY/01_CORE_CANON_BEHAVIOR_DA` | ProfKrapu morphologie stylisée, tenue, expression, cuisine/botanique/dataviz | `VisualEntityProfile`, `VisualAtomicBrick`, `NarrativeActingProfile` | absorbé comme persona dédié |
| `PROF_KRAPU_FACTORY/06_SCIENCE_PULP_FRANCO_BELGE_ESCALATION_LOCK` | science-pulp, blouse propre, molécule visible, relation MasterFlex | `VisualAtomicBrick`, `VisualDaGauge` | absorbé comme locks de dérive |

## Ce que le runtime sait faire maintenant

- charger un registre DA déclaratif depuis `visual_da_registry_seed.v1.json` ;
- résoudre une demande `entity_id + context + output_surface + mode + optional_event_layer` ;
- retourner la stack DA, l’acting, les briques, références, gates, negative locks, sources et manques ;
- produire un `d08_manifest_preview` non exécutable ;
- bloquer si le profil visuel manque ;
- empêcher qu’une planche expression soit traitée comme morphologie ;
- prouver que Ours d’Or reste une couche, pas une racine.
- résoudre ProfKrapu comme entité dédiée, avec acting science-pulp et anti-copie biométrique ;
- résoudre un badge Ours d’Or comme conteneur modulaire et non comme image décorative libre ;
- exposer des jauges DA : lisibilité, caricature, étrangeté, force de filtre et science-pulp.

## Verrous P1

- aucune génération image ;
- aucune canonisation automatique ;
- aucun provider image ;
- aucune migration ;
- aucune donnée privée/morpho utilisateur ;
- aucune promotion d’asset candidat en asset canon.

## Prochaine tranche recommandée

`DA-REGISTRY-ACTING-003` :

- tester les cas pilotes sans provider image : MasterFlex UI states, ProfKrapu badge/avatar,
  Ours d’Or monstre/subpersona et rôles Ours d’Or ;
- vérifier que le resolver explique stack, acting, références, gates, manques et interdits ;
- enrichir uniquement les profils manquants repérés par ces cas pilotes ;
- préparer l'import contrôlé des planches de références réelles après validation produit.
