# MasterFlow — Audit Factories, primitives réutilisables — passe 1

Date : 2026-06-27  
Mode : audit lecture seule des Factories actives  
Repo : `/Users/malex/Documents/Playground/MASTERFLOW`  
Sources externes : `/Users/malex/Desktop/FACTORIES/*/CURRENT`  

## Diagnostic simple

Les Factories ne sont pas à importer dans MasterFlow.

Elles servent de laboratoires : elles montrent comment un bot autonome démarre, se verrouille, extrait des retours, refuse le hors-scope, produit des exports, manipule des références visuelles ou accompagne un utilisateur.

Le bon mouvement est donc :

```txt
Factory active
-> primitive utile
-> contrat MasterFlow
-> queue runtime si nécessaire
-> implémentation Git seulement si le contrat est clair
```

Pas :

```txt
Factory active
-> copie dans MasterFlow
```

## État actuel

| Axe | État |
|---|---|
| Factories actives inventoriées | 19 |
| Modification des Factories | aucune dans cette passe |
| Absorption directe dans MasterFlow | rejetée |
| Primitives identifiées | oui |
| Runtime Git ajouté | non |
| Risque principal | que chaque Factory réinvente boot, source truth, refus hors-scope, extraction et dataviz |

## Primitives communes à récolter

| Primitive | Ce que ça apporte | Cible MasterFlow | Statut |
|---|---|---|---|
| `factory_boot_context_intake` | La Factory se configure au démarrage selon le contexte réel au lieu de répondre à froid. | D03 context runtime, D11 Factory Backflow, UI onboarding | `primitive_candidate` |
| `scope_lock_and_refusal` | Refus clair de ce qui est hors mission, hors source ou dangereux. | Permissions, guardrails, modes spécialisés | `primitive_candidate` |
| `extraction_inbox` | Transformer une conversation ou un usage en sortie structurée réinjectable. | D11 backflow, user feedback intake, assistant delegation | `already_in_git_runtime` partiel |
| `candidate_not_canon` | Tout retour ou fichier ajouté reste candidat tant qu'il n'est pas validé. | Living Truth Spine, Validation Inbox | `already_in_git_runtime` partiel |
| `source_truth_strip` | Dire quelle source fonde une réponse, son statut, sa confiance et ses limites. | UI, resource truth, Dataviz, D07/D08/D09 | `runtime_gap` |
| `visual_reference_roles` | Distinguer canon, candidat, aspirationnel, style, contrainte, exemple, interdit. | D08 DA / assets / image gates | `runtime_gap` |
| `go_image_gate` | Génération image uniquement après intention consciente et gates lisibles. | D08 / action registry / image runner | `runtime_gap` |
| `post_generation_da_report` | Après sortie visuelle : ce qui respecte la DA, ce qui dévie, ce qui reste candidat. | D08 output readiness | `primitive_candidate` |
| `learning_gauges` | Jauges compréhension, confiance, charge, progression, readiness. | Teaching UI, Learning Mirror, correction | `primitive_candidate` |
| `subject_pack_schema` | Brief, ressources, correction, graph sujet, output prompt, feedback template. | D05/D06 subject/correction | `runtime_gap` partiel |
| `brief_routing_admin` | Découper un brief et router vers niveaux, groupes, séances, multi-brief. | Teaching admin / subject assignment | `primitive_candidate` |
| `situation_companion` | Accompagner une situation réelle avec contraintes, checkpoints, options et vérité critique. | MasterHelp candidat | `primitive_candidate` |
| `usage_harvester` | Observer l'usage d'un projet externe sans canoniser automatiquement. | D11/D12, Big Pickle/OpenCode delegation | `already_in_git_doc` partiel |
| `diagnostic_observer_non_surveillance` | Observer un process sans jugement, scoring caché ou surveillance. | Feedback, learning analytics, privacy | `primitive_candidate` |
| `creative_material_lifecycle` | Statuts matière brute, brouillon, prêt, joué, abandonné, exporté. | Stand-up, transcription, teaching, MasterStory | `primitive_candidate` |

## Matrice par Factory active

| Factory | Ce qu'il ne faut pas importer | Primitives à récolter | Cible Git recommandée | Risque |
|---|---|---|---|---|
| `BATRASIA` | Lore complet, références propres à l'oeuvre, bot lecteur complet | no-spoiler, canon/candidat, timeline, GO IMAGE, backflow auteur, DA noir/blanc | D09 MasterStory + D08 DA narrative | élevé si spoiler ou canon inventé |
| `MASTERCLASS` | Les 491 fichiers comme vérité automatique | subject pack, resource hub, correction model, subject graph, DA output prompt | D05/D06 subject library + teaching resources | moyen : gros volume, tri nécessaire |
| `MASTERINVENTORY` | Inventory autonome complet | OCR candidate, reference deck, confidence/status, source image, review owner | D07 Inventory + OCR + D08 refs | moyen : OCR ne doit jamais valider |
| `ISCOM_JPO` | Contenu école comme moteur général | source lock, refus concurrent/web, profil visiteur, guide événement | Event guide / school ops mode | moyen : risque de réponse hors contenu |
| `TALENTS_CREATIFS_BRIEF_INTAKE` | Bot admin spécifique tel quel | brief splitting, multi-brief, routing niveaux, JSON sujet | Teaching admin / D05 subject intake | faible à moyen |
| `TALENTS_CREATIFS_GUIDE` | Coach qui fait le travail étudiant | guide mode, orientation sans faire à la place, pack étudiant | D05/D06 guided teaching | moyen : frontière aide/travail |
| `PROF_KRAPU_FACTORY` | Persona/DA complet comme racine | pédagogie visuelle, scope prof, refus hors source, GO IMAGE | D04 persona + D08 visual pedagogy | moyen |
| `NICOK_FACTORY` | Canon local du projet | local canon, références typées, DA board, boot contexte | D04/D08 reference roles | moyen |
| `OURS_DOR_FACTORY` | Ours d'Or comme DA root globale | thème/layer, visual board, event theme, readiness | D08 layers/theme | moyen : ne pas écraser la DA MasterFlow |
| `OURS_DOR_BADGE_FACTORY` | Badge maker complet | output readiness, badge constraints, DA layer | D08 output contracts | faible à moyen |
| `ROADTRIP_MOTO` | App GPS complète | GPX corridor, vérité critique, détours score coût/bénéfice, mode fatigue/pluie/canicule, exports | MasterHelp + Dataviz + source truth | élevé : sécurité terrain |
| `STAND_UP` | Bot scène autonome | matière créative, statuts texte, import transcription, export version | D03/D11 creative material intake | faible |
| `GESTION_PROJET` | Kit Claude comme vérité MasterFlow | usage harvester, observation de friction, export candidat | D11 external LLM handoff | faible |
| `REDACTION_SEO` | Process SEO spécifique | usage harvester, source truth, brief/extraction | D11 external LLM handoff | faible |
| `HELPLAB` | Aide méthodo générique floue | situation helper, routines, checklist, safety escalation, non médical | MasterHelp / Situation Companion | moyen : boot actuel à relire |
| `LEARNING_MIRROR` | Profil utilisateur figé | jauges, apprentissage silencieux, miroir d'usage, confidence | Learning Mirror runtime + UI | moyen |
| `MASTERFLEX_COACH` | Vidéos/ressources comme vérité universelle | resource truth, timecodes, coaching, no invented URL/timecode | D04 persona + resource truth | moyen |
| `MASTERSCORE` | Score comme jugement utilisateur | score explicable, critères, feedback, non-notation automatique | D06/competencies | élevé si score devient verdict |
| `ESPRIMED_LEARNING` | Observateur d'organisation spécifique | diagnostic non-surveillance, confidentialité, consentement, process mapping | Feedback/analytics privacy | moyen |

## Décisions d'arbitrage

1. **Créer un CDC commun des Factories** dans Git avant toute nouvelle extraction massive.
   - Objet : boot, scope lock, source truth, extraction inbox, dataviz, output readiness, backflow.
   - Statut : `À faire maintenant`.

2. **Créer un routeur de primitives Factory** plutôt qu'un importeur.
   - Objet : dire quelle Factory contient quelle primitive et vers quel domaine MasterFlow elle peut alimenter.
   - Statut : `À faire maintenant`.

3. **Traiter Masterclass en audit séparé.**
   - Objet : c'est le plus gros gisement pédagogique, mais il faut éviter d'importer 491 fichiers sans tri.
   - Statut : `À mettre en queue`.

4. **Traiter Batrasia et D08 image comme audit séparé.**
   - Objet : c'est le meilleur gisement DA/narratif, mais aussi le plus risqué pour canon/spoiler/image.
   - Statut : `À mettre en queue`.

5. **Traiter MasterInventory comme audit OCR/reference-board séparé.**
   - Objet : utile pour l'usage des visuels de référence, OCR, statut candidat et validation owner.
   - Statut : `À mettre en queue`.

6. **Ne pas généraliser MasterHelp depuis Roadtrip sans extraction terrain.**
   - Objet : Roadtrip est un bon pilote, mais la sécurité terrain exige source truth, fraîcheur, double vérification et mode offline.
   - Statut : `À faire quand usage pilote`.

## Queue recommandée

### À faire maintenant

| ID | Tâche | Impact | Risque | Validation |
|---|---|---|---|---|
| `FACTORY-CDC-001` | Rédiger le CDC commun des Factories : boot, scope, extraction, source truth, dataviz, backflow. | Évite que chaque Factory réinvente le système. | faible | non |
| `FACTORY-ROUTER-001` | Créer une matrice `factory -> primitives -> target MasterFlow -> statut`. | Permet de piloter les prochaines Factories et Big Pickle/OpenCode. | faible | non |
| `D08-VISUAL-REFS-001` | Extraire de Batrasia/Nicok/Ours/Prof les rôles de références visuelles. | Clarifie OCR, refs canon/candidate/aspirational, GO IMAGE. | moyen | non pour audit |

### À mettre en queue

| ID | Tâche | Impact | Risque | Validation |
|---|---|---|---|---|
| `MASTERCLASS-SUBJECTS-001` | Audit Masterclass subject packs vs D05/D06 Git. | Gros gain teaching/correction. | moyen | non pour audit |
| `MASTERINVENTORY-OCR-001` | Audit OCR/reference deck vs D07/D08. | Renforce vérité visuelle et inventory. | moyen | non pour audit |
| `LEARNING-GAUGES-001` | Comparer Learning Mirror/MasterFlex/MasterScore aux jauges Git. | Prépare UI pédagogique claire. | moyen | non pour audit |
| `MASTERHELP-001` | Après test Roadtrip, décider si MasterHelp devient mode candidat. | Ouvre aide vacances/voyage/inventory/situation. | moyen | oui avant runtime |

### À demander à Big Pickle / OpenCode

| ID | Tâche | Sortie attendue | Garde-fou |
|---|---|---|---|
| `BP-FACTORIES-READONLY-001` | Lire les 19 Factories et compléter la matrice primitive par primitive. | Markdown ou JSON sans patch. | Ne pas modifier `CURRENT`. |
| `BP-MASTERCLASS-MAP-001` | Mapper sujets, ressources, correction models et subject graphs. | Liste dédupliquée + recommandations D05/D06. | Ne pas importer de données privées sans statut. |
| `BP-D08-REFS-001` | Extraire les rôles de références visuelles dans Batrasia/Nicok/Ours/Prof. | Taxonomie canon/candidat/aspirationnel/style/interdit. | Pas de génération image. |

## Alertes

- **Masterclass est trop volumineux pour être absorbé en bloc.** Il faut un audit sujet par sujet ou famille par famille.
- **Les références visuelles doivent être typées.** Une image inspirante ne doit pas devenir canon par simple présence dans une Factory.
- **Le score n'est pas un verdict.** MasterScore doit nourrir des critères explicables, pas une notation autonome.
- **Roadtrip touche à la sécurité réelle.** Essence, météo, chaleur, eau, routes et campings doivent être vérifiés, sourcés et signalés avec confiance.
- **HelpLab semble utile pour MasterHelp, mais doit être relu finement.** Il ne faut pas transformer une aide pratique en promesse médicale, sociale ou administrative.

## Recommandation

La prochaine tranche sûre est `FACTORY-CDC-001 + FACTORY-ROUTER-001` : poser le cahier des charges commun et le routeur de primitives. Cela servira à toutes les prochaines Factories, à Big Pickle/OpenCode, et à l'intégration future dans MasterFlow sans dérive.
