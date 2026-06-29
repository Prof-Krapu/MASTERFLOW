# DA Narrative Bridge — carte de routage V1

Date : 2026-06-29  
Vague : `DA-NARRATIVE-BRIDGE-001`  
Statut : `contract_ready`  

## Décision simple

MasterFlow a déjà les briques principales : Experience Fabric, MasterStory, Storylets, Visual
Narrative Grammar, D08 Visual Manifests, Theme Studio et Living Companions.

Le gap n'est donc pas de créer un nouveau moteur. Le gap est de verrouiller le routage :

1. une vérité narrative reste dans MasterStory / Narrative Canon Graph ;
2. une proposition d'événement passe par Storylet / Experience Fabric ;
3. une intention visuelle passe par D08 Visual Manifest ;
4. une explication visuelle passe par Visual Narrative Grammar / Theme Studio ;
5. un compagnon ou monstre ne génère rien tout seul et reste assigné à son contexte ;
6. toute production d'asset, canonisation ou provider réel reste bloquée tant qu'une validation
   humaine explicite ne l'autorise pas.

## Contrat produit

Intention produit : permettre à MasterFlow de relier lore, progression, DA, personnages,
subpersonas, monstres et UI sans inventer de canon ni déclencher de génération.

Partie du canon concernée : MasterStory, D08, Theme Studio, Ours d'Or, MOTH, compagnons,
personas, progression et assets.

Ce qui doit changer : rendre les ponts lisibles et créer une règle de routage unique pour les
prochaines surfaces UI et runtime.

Ce qui ne doit pas changer :

- pas de provider image ;
- pas de génération automatique d'asset ;
- pas de canonisation automatique ;
- pas de migration ;
- pas de nouveau moteur narratif concurrent ;
- pas de compagnon public multi-porte-parole ;
- pas de copie brute de Factory ou d'archive.

Critère simple de succès : un agent peut décider où router une demande DA/narrative sans partir
dans une feature hors scope.

Risque de dérive : élevé si Theme Studio, D08 et MasterStory se mettent chacun à décider de la
vérité narrative ou visuelle. Cette carte impose donc une autorité par décision.

## Autorités par type de décision

| Décision | Autorité | Peut proposer | Ne peut pas faire |
|---|---|---|---|
| Vérité d'histoire, spoiler, personnage, setup/payoff | Narrative Canon Graph / MasterStory | Storylet, Experience Fabric | Générer un asset ou modifier D08 |
| Événement utile, surprise, alerte, pont entre modes | Storylet Engine | Experience Fabric, Safety, Precedents, Companions | Exécuter silencieusement |
| Intention visuelle, refs, couches DA, output attendu | D08 Visual Manifest | Story DA Bridge, Theme Studio | Appeler un provider |
| Explication visuelle, continuité, drift, motif | Visual Narrative Grammar | Theme Studio | Valider ou canoniser l'asset |
| Thème, palettes, typos, pack institutionnel / événementiel | Theme Studio | GodMode / créateur autorisé | Changer la vérité narrative |
| Présence guidée, MOTH, robot CDC, monstre projet | Living Companion | Storylets, Guided Runtime | Faire le travail ou générer librement |
| État de recadrage / suspicion / hard stop | Safety State + Trust + Security | UI, persona reaction, GodMode | Ban automatique ou humiliation |

## Ponts déjà réels dans Git

| Pont | Statut | Preuve Git | Commentaire |
|---|---|---|---|
| MasterStory → D08 | `partial_runtime` | `apps/backend/src/engines/story_da_bridge.ts` | Compile une scène en Visual Manifest candidat ; attention, ne doit pas devenir provider automatique. |
| D08 → Validation Inbox | `implemented_runtime` | `apps/backend/src/services/validation_inbox.ts` | Un manifest soumis reste une revue humaine, pas une génération. |
| D08 → Visual Narrative Grammar | `implemented_runtime` | `apps/backend/src/services/visual_narrative_grammar.ts` | Produit explications, arc émotionnel et diagnostics en `explain_only`. |
| MasterStory → Narrative Canon Graph | `implemented_runtime` | `apps/backend/src/services/narrative_canon_graph.ts` | Sépare faits, présentation, spoilers, connaissance personnages et setup/payoff. |
| Canon Graph / Precedents / Blockers → Storylets | `implemented_runtime` | `apps/backend/src/services/storylet_engine.ts` | Propose, bloque ou demande validation ; n'exécute pas silencieusement. |
| Guided Runtime → Living Companion | `implemented_runtime` | `apps/backend/src/services/living_companion.ts` | MOTH / robot / monstre sont contextuels et guidés. |
| Storylets → Autonomy Cycle | `implemented_runtime` | `apps/backend/src/services/autonomy_cycle.ts` | Plan candidat, validation humaine selon risque, pas d'action directe sauvage. |
| Theme Studio → Visual Grammar | `implemented_ui_runtime` | `apps/backend/src/engines/theme_lint.ts`, `apps/frontend` | Surface explicable à la demande, pas un dashboard permanent. |
| Safety / Trust / Security → UI future | `contract_ready` | `docs/safety`, `docs/trust`, `docs/security` | Les états existent côté projection ; la réaction visuelle UI reste une tranche séparée. |

## Routage d'une demande utilisateur

| Demande | Routage correct | Sortie autorisée maintenant |
|---|---|---|
| “Fais évoluer le monstre de ce projet” | Living Companion + Storylet + D08 manifest | proposer une évolution candidate, expliquer les refs, demander validation |
| “Génère l'image finale” | D08 Visual Manifest + Validation Inbox | préparer / relire le manifest, bloquer provider |
| “Pourquoi ce visuel ?” | Visual Narrative Grammar / Theme Studio | carte d'explication, continuité, drift, sources |
| “Passe mon sujet en mode histoire” | MasterStory + Narrative Canon Graph | lecture, facts, spoilers, setup/payoff, storylets |
| “Le MOTH doit intervenir en classe” | Living Companion + Safety + Teaching UI future | présence contextuelle, bulle ou pleine page selon configuration |
| “Change le thème Ours d'Or” | Theme Studio + Theme Pack | proposition de pack, pas d'application silencieuse |
| “Un étudiant contourne le système” | Security + Trust + Safety State | recadrage, état narratif, alerte GodMode si seuil réel |

## Règles d'évolution des subpersonas / monstres

Un subpersona contextuel peut être :

- questionnable : MOTH, robot CDC, assistant de cours ;
- non questionnable : monstre projet, indicateur de progression visuel ;
- hybride : bulle courte par défaut, pleine page si le créateur l'a rendu interactif.

Règles :

1. le créateur valide l'identité initiale, le rôle et le design de départ ;
2. après validation, l'évolution est pilotée par les indicateurs du moteur, pas par les étudiants ;
3. les paliers doivent référencer des preuves : progression projet, compétences, complétude,
   contradictions résolues, décisions validées ;
4. chaque palier produit d'abord un manifest / une proposition, jamais un asset canon direct ;
5. l'UI peut signaler l'évolution par bulle, alerte douce ou galerie future ;
6. le subpersona ne remplace jamais le persona principal de l'utilisateur.

## Gaps à traiter ensuite

| Gap | Risque | Tranche recommandée |
|---|---|---|
| Theme Studio ne pilote pas encore vraiment les packs thème/typos/assets | moyen | `THEME-STUDIO-ASSET-PACKS-001` |
| Safety State n'a pas encore de réaction visuelle UI complète | moyen | `UI-SAFETY-STATES-001` |
| Ours d'Or / monstres n'ont pas encore de paliers typés exploitables | moyen | `PROJECT-MONSTER-EVOLUTION-001` |
| Compagnons Teaching pas encore affichés en mode projection classe | élevé rentrée | `TEACHING-COMPANION-PROJECTION-001` |
| Asset provenance / confiance fichier pas encore consolidée en passeport | moyen | `ASSET-PROVENANCE-PASSPORT-001` |
| Provider image réel, cache audio, STT et génération automatique | élevé | rester bloqué sans GO explicite |

## Règle pour la prochaine vague

La prochaine vague utile doit partir de Theme Studio / Assets, car c'est le cockpit qui permettra
ensuite d'événementialiser l'interface, d'organiser les typos, palettes, assets, lore, versions
institutionnelles et couches Ours d'Or sans mélanger ça avec MasterStory ou D08.

Tranche recommandée : `THEME-STUDIO-ASSET-PACKS-001`.
