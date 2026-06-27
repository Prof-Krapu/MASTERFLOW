# MasterFlow — Routeur de primitives Factory

Date : 2026-06-27  
Statut : matrice de pilotage documentaire  
Autorité : repo Git opérable  
Base : `docs/factories/FACTORY_PRIMITIVES_AUDIT_PASS_1_2026-06-27.md`

## Objectif

Quand une Factory révèle une bonne idée, on doit savoir où la ranger.

Ce routeur répond à trois questions :

1. quelle primitive est en jeu ?
2. quel domaine MasterFlow est concerné ?
3. est-ce déjà dans Git, un candidat, un gap runtime, un blocage ou un rejet ?

## Légende

| Statut | Sens |
|---|---|
| `already_in_git_runtime` | déjà codé/testé |
| `already_in_git_doc` | déjà documenté dans Git |
| `primitive_candidate` | intéressant, à auditer avant décision |
| `runtime_gap` | manque logiciel réel |
| `blocked` | droit, secret, provider, données, sécurité ou décision produit |
| `rejected` | explicitement non retenu |

## Router par primitive

| Primitive | Sources Factory | Domaine MasterFlow cible | Statut | Prochaine action |
|---|---|---|---|---|
| Boot contexte | presque toutes | D03 Context Runtime, D11 Factory Backflow, UI onboarding | `primitive_candidate` | Standardiser avec `FACTORY_COMMON_CDC`. |
| Scope lock/refus | Batrasia, Gestion Projet, Rédaction SEO, HelpLab, MasterInventory, Masterclass, MasterFlex, Esprimed | Permissions, modes, safety | `primitive_candidate` | Créer un template de refus par type de Factory. |
| Extraction inbox | Batrasia, Stand Up, Gestion Projet, Rédaction SEO, MasterInventory, Roadtrip, Talents | D11 backflow, feedback intake | `already_in_git_runtime` partiel | Aligner le format commun sur D11 V6C-D6F. |
| Candidate-not-canon | Batrasia, MasterInventory, Roadtrip, Masterclass, Learning Mirror | Living Truth Spine, Validation Inbox | `already_in_git_runtime` partiel | Ajouter bandeau UI/source truth. |
| Source truth strip | Batrasia, MasterFlex, MasterInventory, Roadtrip, ISCOM JPO | Resource Truth, UI, Dataviz | `runtime_gap` | Spécifier une bande visible source/confiance/limite. |
| Références visuelles typées | Batrasia, Nicok, Ours, Badge, Prof Krapu, Masterclass | D08 DA/assets/OCR | `runtime_gap` | Lancer `D08-VISUAL-REFS-001`. |
| GO IMAGE gate | Batrasia, Ours, Badge, Prof Krapu, Masterclass, Roadtrip | D08 action registry + image runner | `runtime_gap` | Auditer `generate-visual` et action registry. |
| Rapport DA post-sortie | Batrasia, Masterclass, Ours, Prof Krapu | D08 output readiness | `primitive_candidate` | Créer contrat `post_generation_da_report`. |
| Subject pack schema | Masterclass, Talents Brief, Talents Guide | D05/D06 subjects/corrections | `runtime_gap` partiel | Lancer audit Masterclass séparé. |
| Brief routing admin | Talents Brief | D05 assignment, teaching admin | `primitive_candidate` | Comparer aux subjects/routes Git. |
| Guide sans faire à la place | Talents Guide, Masterclass, MasterFlex | Guided Teaching | `primitive_candidate` | Ajouter règle pédagogique commune. |
| Learning gauges | Learning Mirror, MasterFlex, MasterScore, Batrasia | Teaching UI, competencies, readiness | `primitive_candidate` | Lancer `LEARNING-GAUGES-001`. |
| Resource truth timecoded | MasterFlex | Resource Truth / Coaching | `primitive_candidate` | Vérifier source refs et non-invention de timecodes. |
| OCR candidate status | MasterInventory | D07 Inventory + D08 visual refs | `already_in_git_runtime` partiel | Lancer `MASTERINVENTORY-OCR-001`. |
| Situation companion | Roadtrip, HelpLab | MasterHelp candidat | `primitive_candidate` | Tester Roadtrip puis décider. |
| Usage harvester | Gestion Projet, Rédaction SEO, Batrasia | D11/D12 external usage intake | `already_in_git_doc` partiel | Donner protocole à Big Pickle/OpenCode. |
| Diagnostic non-surveillance | Esprimed | Feedback/analytics/privacy | `primitive_candidate` | Écrire guardrail privacy avant runtime. |
| Creative material lifecycle | Stand Up, Batrasia, transcription future | D03/D11 intake, D09 MasterStory | `primitive_candidate` | Spécifier statuts matière créative. |
| Score explicable | MasterScore | D06 competencies/correction | `primitive_candidate` | Interdire score verdict sans validation prof. |

## Router par domaine MasterFlow

| Domaine | Primitives entrantes | Factories sources | Action recommandée |
|---|---|---|---|
| D03 Context / Boot | boot contexte, profil utilisateur, matière créative | toutes, Stand Up, HelpLab | Créer un boot commun réutilisable. |
| D04 Personas | coach, ton, ressource, persona local | MasterFlex, Prof Krapu, Nicok | Garder méthode/persona séparées des permissions. |
| D05 Subjects | subject pack, brief routing, guide étudiant | Masterclass, Talents Brief, Talents Guide | Audit pédagogique séparé. |
| D06 Correction | correction model, score explicable, feedback template | Masterclass, MasterScore, Talents | Ne jamais auto-noter sans prof. |
| D07 Inventory | OCR candidate, reference deck, source image | MasterInventory, Roadtrip | Owner review obligatoire. |
| D08 DA / Assets | visual refs, GO IMAGE, DA report, layer/theme | Batrasia, Ours, Badge, Prof, Nicok, Masterclass | D08 visual refs + gate generate-visual. |
| D09 MasterStory | no-spoiler, timeline, lore candidate, patch auteur | Batrasia | Garder reader/author/canon séparés. |
| D11 Factory Backflow | extraction inbox, usage harvester, candidate export | toutes | Utiliser V6C-D6F, pas d'import ZIP. |
| D12 Observability | incident, diagnostic, usage, token, confidence | Esprimed, usage harvester | Non-surveillance + owner review. |
| UI / Dataviz | source strip, jauges, roadbook, dashboards conversationnels | Roadtrip, Learning Mirror, Masterclass | Dataviz = aide à décider, pas source de vérité. |
| MasterHelp candidat | situation companion, contraintes, checkpoints | Roadtrip, HelpLab | Mode candidat après test terrain. |

## Décision automatique autorisée

Codex, Big Pickle ou OpenCode peuvent classer automatiquement une idée Factory en :

- `primitive_candidate` ;
- `already_in_git_doc` ;
- `rejected` si doublon évident et déjà couvert ;
- `blocked` si secret/provider/live/données sensibles.

Ils ne peuvent pas classer automatiquement en :

- `already_in_git_runtime` sans preuve de code/test ;
- `runtime_gap` prioritaire sans lien à un domaine et une tâche ;
- canon validé ;
- feature live.

## Sortie attendue d'un audit Factory

```yaml
factory_primitive_routing:
  factory_id:
  active_version:
  source_path:
  primitives:
    - primitive:
      evidence:
      target_domain:
      git_status:
      risk:
      recommended_action:
      blocked_by:
  do_not_import:
  next_queue_items:
```

## Prochaine vague sûre

1. `D08-VISUAL-REFS-001` : car refs image/OCR/GO IMAGE reviennent dans beaucoup de Factories.
2. `MASTERCLASS-SUBJECTS-001` : car c'est le plus gros gisement pédagogique.
3. `MASTERINVENTORY-OCR-001` : car il relie Factories, visuels, OCR et Inventory.

Le routeur reste documentaire tant qu'aucune route runtime n'est codée.
