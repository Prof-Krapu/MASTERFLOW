# AUDIT PROFOND — MasterFlow canon vs GitHub

Date : 2026-06-12  
Canon audite : Drive `MASTERFLOW`  
Code audite : branche `codex/frontend-masterflow` au commit `c57e938`  
Reference distante : `origin/main` au commit `1b08b38`

> **Portee corrigee :** ce rapport audite le noyau actif et ses 19 owners prioritaires. Il ne
> constitue pas l'audit exhaustif de tout le corpus MasterFlow. Pour la couverture globale des
> apps, engines, contrats, personas, widgets, datasets, evenements et artefacts secondaires, voir
> `AUDIT_MASTERFLOW_COMPLET_CANON_VS_GITHUB_2026-06-12.md`.

## 1. Verdict

Non, la quasi-totalite de MasterFlow canon n'est pas implantee dans GitHub.

Le depot contient un **socle MVP coherent et teste**, ainsi qu'une quantite importante de
documentation de cadrage. Il ne contient pas encore la majorite des objets metier, engines,
jobs, surfaces et politiques runtime decrits par le canon.

Mesure prudente sur les 19 owners de l'index actif JSON :

| Mesure | Resultat |
|---|---:|
| owner implemente a profondeur canonique | 0 / 19 |
| owner avec une tranche de code executable identifiable | 8 / 19 |
| owner sans tranche de code executable | 11 / 19 |
| couverture brute par presence d'une tranche de code | 42 % |
| couverture fonctionnelle ponderee estimee | 15 a 20 % |

Cette estimation ne mesure pas le volume de fichiers. Elle mesure la chaine utile :

```text
contrat partage
-> modele vivant
-> permission/scope
-> endpoint ou event
-> engine reel
-> surface UI
-> tests
```

Une spec, un seed `future`, un bouton ou un nom d'engine ne compte pas comme implementation.

## 2. Methode

Lecture d'autorite :

- `START_HERE_FOR_AI_AND_DEVS_MASTERFLOW.md` ;
- `01_CORE/MASTERFLOW_ACTIVE_CONTRACT_INDEX.md` ;
- `08_DATASETS/masterflow_active_contract_index.json` ;
- `01_CORE/MASTERFLOW_USAGE_LAYER_RESOLUTION_MAP.md` ;
- `01_CORE/MASTERFLOW_ENGINE_CONTRACTS.md` ;
- `01_CORE/MASTERFLOW_SCOPE_AND_PERMISSION_MODEL.md` ;
- `04_ENGINES/MASTERFLOW_RUNTIME_WIRING_AND_INTER_SYSTEM_CONNECTION_MAP.md` ;
- `03_APPS/APP_REGISTRY_AND_DISCOVERY.md` ;
- roadmap de deploiement et contrats actifs de chaque grande famille.

Inspection GitHub :

- 11 tables SQLite ;
- 27 routes REST ;
- un WebSocket de chat ;
- 5 fichiers `engines/*` ;
- 31 schemas Zod partages ;
- 13 actions declarees : 6 `live`, 5 `future`, 2 `out_of_scope` ;
- 7 suites de tests, 27 tests.

Statuts utilises :

- `IMPLEMENTED` : chaine complete et comportement metier reel ;
- `PARTIAL` : tranche executable, mais owner canonique incomplet ;
- `SHELL` : facade, seed, schema ou simulation sans traitement metier ;
- `SPEC_ONLY` : documente mais non executable ;
- `FUTURE` : explicitement declare futur ;
- `OUT_OF_SCOPE` : exclu de la version courante ;
- `ABSENT` : aucune tranche runtime exploitable.

## 3. Matrice des owners actifs

| Owner actif | Statut GitHub | Couverture reelle | Manques structurants |
|---|---|---|---|
| `core_runtime_resolution` | `PARTIAL` | `GET /context/current`, registre d'actions, room courante | intention, object type, maturite, graph family, context locks, budget engine, next best action |
| `permission_runtime` | `PARTIAL` | rang de roles, auth JWT, validation teacher+ | scopes, ownership, packs, capabilities, room/project access, privacy gate, revocation d'acces |
| `godmode_debug_runtime` | `SHELL` | diagnostic token admin/godmode | projections runtime/backend/BDD/engines, simulation pure, change control, console privee |
| `da_visual_engine` | `FUTURE` | action `compile_da_context` declaree future | DA resolver, canon locks, couches, references, manifests, review |
| `image_action_gate` | `SHELL` | cycle generique preflight/validation | brief image, token conscient, DA gate, render job, asset review, retake |
| `resource_truth_engine` | `PARTIAL` | registre, candidate, validation, recherche validee | provenance graph, niveaux N1-N5, timecodes, ownership, scopes, ranking, broken-link lifecycle |
| `subject_compiler` | `FUTURE` | action future uniquement | subjects, versions, graphes, Gamma, ressources, correction sheet, assignation |
| `correction_engine` | `ABSENT` | aucun objet ni endpoint | submissions, non-rendus, criteres, feedback drafts, review prof, suivi |
| `pedagogical_graph_engine` | `ABSENT` | aucun graphe vivant | competences, method profile, signals, enrichissements candidats, progression |
| `masterstory_reader_engine` | `ABSENT` | mode UI declaratif sans objet narratif | nodes, ordre lecteur/auteur, reveal gates, contradictions, continuity |
| `factory_builder_backflow` | `OUT_OF_SCOPE` | actions masquees | volontairement exclu de cette version |
| `inventory_ocr_engine` | `FUTURE` | mode ressources et action OCR future | photos, OCR, items, collections, quantites, ownership, wishlist, review |
| `ui_room_os` | `PARTIAL` | Home Room, instance, zoom, surface, densite, widget JSON | projets, multi-room, widget resolver, drilldown, maturity activation, layouts et permissions |
| `ai_sync_handoff` | `PARTIAL` | inbox et journal Git operationnels | objets BDD, API, pending dual validation, decision log runtime, notifications |
| `global_access_canon_help_owner_ops` | `SHELL` | roles et diagnostic token prive | packs, passport, readiness, feature map, help, opportunity inbox, owner ops requests |
| `command_center_runtime` | `SHELL` | modes UI et action chips | loadout, commandes, raccourcis, conflits, mode switch backend, help console |
| `generated_asset_runtime` | `FUTURE` | action manifest future | assets, manifests, variants, counters, source, owner, scope, validation, gallery |
| `sentinel_security_runtime` | `ABSENT` | auth/preflight generiques seulement | source isolation, safe extraction, trust state, tool envelopes, quarantine, incident review |
| `helplab_support_engine` | `ABSENT` | aucune tranche | helper scopes, consentements, routines, documents, imagiers, reminders, safety escalation |
| `guidance/bot composition` | `SPEC_ONLY` | PR-0 Bot Studio sur branche | guides, sessions, contributions, question resolver, evaluations, deployment manifests |
| `local runner / queues` | `ABSENT` | execution d'action simulee | jobs, workers, progress, cancel/retry, needs_review, Comfy/local execution |

Les deux dernieres lignes sont transversales : elles sont indispensables au runtime decrit par le
canon, meme si elles ne figurent pas comme lignes autonomes dans la version courante de l'index JSON.

## 4. Profondeur des fondations GitHub

### Auth et identite — `PARTIAL`

Present :

- inscription, login, logout et `GET /me` ;
- mots de passe bcrypt ;
- JWT HS256 avec expiration et revocation par `jti` ;
- roles `student`, `teacher`, `admin`, `godmode`.

Manquant :

- organisation, classe, equipe et memberships ;
- invitation et canon passport ;
- privacy policy versionnee et consentement ;
- droits d'acces, rectification, suppression et export ;
- MFA, recovery, session/device management ;
- rate limit effectivement monte et politique anti-abus.

Risque : `POST /auth/register` cree directement un compte student sans scope ni privacy gate,
alors que le backend est expose publiquement.

### Permissions — `PARTIAL FAIBLE`

Le middleware sait comparer un rang. Le moteur autorise actuellement tout utilisateur authentifie
a creer toute action, sensible ou non. La validation protege l'execution sensible, mais ne remplace
pas les controles :

```text
owner + scope + target + capability + context lock + privacy + pack
```

Il n'existe pas encore de permission par ressource, room, projet, action ou dataset.

### Actions et validations — `PARTIAL`

Present :

- cycle draft, preflight, pending validation, approved, rejected, executing, completed/failed ;
- risque statique depuis le registre ;
- validation humaine ;
- audit des transitions ;
- UI de trace.

Manquant :

- dispatcher metier reel : l'execution renvoie encore `resultat simule` ;
- simulation distincte ;
- rollback/reversibilite ;
- expiration/revision des validations ;
- ownership de l'action ;
- validation par type et scope ;
- jobs pour traitement long ;
- decision log structure distinct de l'audit technique.

### Resource Truth — `PARTIAL SOLIDE`

C'est la tranche la plus proche d'un owner reel :

- candidates invisibles par defaut ;
- validation humaine ;
- recherche limitee aux ressources validees ;
- source et sujets conserves.

Elle reste toutefois un registre plat. Le canon attend taxonomie, provenance, niveaux, scopes,
timecodes, relations, pertinence, lifecycle et routage pedagogique.

### Personas — `PARTIAL`

Present :

- trois personas ;
- voix, methode, visuel et permissions en JSON ;
- chimere primaire/secondaire ;
- un seul speaker ;
- methode secondaire attribuee ;
- chat WS avec persona.

Manquant :

- assignments user/project/room/class ;
- persona fonctionnelle vs persona lore ;
- sous-personas conditionnels comme MOTH ;
- memory/log policy ;
- behavior packages ;
- etats visuels et asset packs ;
- activation budget, decay et cooldown ;
- permission firewall par capability.

Le chat ne conserve pas d'historique et n'emploie qu'un message utilisateur avec un system prompt
compile localement.

### Room OS — `PARTIAL`

Present :

- Home Room ;
- room instance par utilisateur ;
- zoom, surface, densite et widget state ;
- UI modes Home/Teaching/Story/Project/Learning/Inventory/Admin.

Manquant :

- table `projects` et objets project-like ;
- room memberships et scopes ;
- plusieurs rooms actives par projet ;
- activation progressive selon maturite ;
- widget registry/resolver ;
- focus objects et drilldown ;
- app bindings ;
- snapshots, last context et open loops.

Les modes Teaching, Story et Inventory sont actuellement des projections prudentes de ressources
et actions existantes, pas les apps metier correspondantes.

### Observabilite — `SHELL`

Present :

- `audit_logs` ;
- `token_events` ;
- diagnostic de tokens admin/godmode ;
- erreurs HTTP lisibles sur les chemins principaux.

Manquant :

- runtime health structure ;
- jobs et logs ;
- incidents et alertes ;
- debug projections ;
- traces d'owners/dependances ;
- metriques de latence, echec, cout par workflow ;
- retention/redaction.

## 5. Couverture des grandes familles fonctionnelles

| Famille canonique | Statut | Observation |
|---|---|---|
| Auth / profils | `PARTIAL` | socle compte et roles |
| Onboarding / intro tunnel | `SHELL` | sas frontend local, non contractuel et non persiste comme objet |
| Projets / objets vivants | `ABSENT` | aucune table `projects` |
| Rooms / widgets | `PARTIAL` | une room et etat JSON, pas d'orchestrateur de widgets |
| Chat / sessions / messages | `SHELL` | streaming sans historique, memoire ou session metier |
| Personas / chimeres | `PARTIAL` | blend de base, pas d'assignation ni MOTH |
| Guidance / Bot Studio | `SPEC_ONLY` | spec PR-0 uniquement |
| Actions / preflight / validation | `PARTIAL` | cycle reel, execution metier simulee |
| Jobs / queues / workers | `ABSENT` | aucun traitement de fond |
| Resource Truth / recherche | `PARTIAL` | registre valide, pas de retrieval/provenance complet |
| RAG local BGE | `SPEC_ONLY` | handoff, aucun service ni index |
| Pedagogie / cours | `ABSENT` | pas de course graph |
| Sujets / assignments | `FUTURE` | action future uniquement |
| Correction / suivi etudiant | `ABSENT` | aucun objet metier |
| Classe live / Wooclap | `ABSENT` | aucun realtime pedagogique |
| DA / MasterLab | `FUTURE` | registre uniquement |
| Images / Comfy / render | `FUTURE` | pas de runner ni queue |
| Assets / manifests | `FUTURE` | pas de table asset |
| Inventaire / OCR | `FUTURE` | pas d'items ni OCR |
| MasterStory / narration | `ABSENT` | mode UI sans graph narratif |
| Event / concours Ours d'Or | `ABSENT` | pas d'events, roster, inscription ou scoring |
| Badges / stickers / print | `ABSENT` | contrats canoniques seulement |
| Quote / Price / devis | `ABSENT` | pas de lignes, versions, prix ou exports |
| Notifications / email | `ABSENT` | aucun consentement ou delivery |
| Preview / export / publication | `ABSENT` | aucun output preview ni connecteur |
| Collaboration / equipes / organisations | `ABSENT` | aucun membership ou espace partage |
| Matching / alternance | `ABSENT` | aucun profil/preuve/match |
| Analytics produit/pedagogie | `SHELL` | tokens seulement |
| Opportunity detector / Owner Ops | `ABSENT` | diagnostic token n'est pas un owner ops runtime |
| Sentinel / moderation / incidents | `ABSENT` | aucun firewall de source/outils |
| Marketplace / billing | `OUT_OF_SCOPE` | tarifs proposes, aucune implementation |
| HelpLab / aidants | `ABSENT` | aucun objet |
| Factories / backflow | `OUT_OF_SCOPE` | exclusion explicite de cette version |

## 6. Ecart BDD

Tables presentes :

```text
users
revoked_tokens
rooms
room_instances
personas
persona_blends
actions
audit_logs
resources
global_settings
token_events
```

Objets prioritaires du handoff canon encore absents :

```text
projects
project_members / room_members
personal_persona_assignments
chat_sessions / messages
widgets / widget_states structures
jobs / job_logs
validation_items dedies
assets / asset_batches / render_manifests
exports / output_previews
user_preferences structures
decision_log
organizations / classes / teams
subjects / assignments / submissions / correction_sheets
course_graphs / competency_signals / method_profiles
events / registrations / participants / badges
quotes / quote_lines / price_sources
notifications / consent_preferences
security_incidents / quarantined_sources / tool_capabilities
conversation_guides / guided_sessions / contributions / bot_deployments
```

## 7. Ecart contrats API

Le contrat partage couvre correctement le MVP actuel, mais ne contient pas encore de schemas pour :

- projet, membership, scope et capability ;
- session/chat persistant ;
- job et progression ;
- validation item generique ;
- asset et manifest ;
- subject/course/correction ;
- event/registration/badge ;
- quote/price/export ;
- notification/consentement ;
- graph et provenance ;
- guide/session conversationnelle ;
- Sentinel et tool capability envelope.

Le `WsServerMessageSchema` annonce deja `room_update`, `validation_required` et `job_completed`,
mais le serveur ne les emet pas. Ce sont des contrats dormants, pas des features actives.

## 8. Ecart frontend

Le frontend est un bon cockpit d'integration MVP :

- login ;
- sas d'entree ;
- contexte courant ;
- modes sans objets fictifs ;
- chat streaming ;
- sources validees/candidates ;
- actions, preflight, inbox et audit ;
- persistance legere de room instance.

Il ne constitue pas encore l'UI complete de MasterFlow :

- pas de Project Room reelle ;
- pas de widget runtime dynamique ;
- pas de command center ;
- pas de debug drawer canonique ;
- pas de jobs/queue ;
- pas d'app metier ;
- pas de graphes ;
- pas de builder ;
- pas de previews/exports ;
- pas de gestion multi-utilisateur.

La priorite ne doit donc pas etre une finition graphique generale. L'UI doit suivre les objets et
workflows reels ajoutes par couches.

## 9. Risques prioritaires

### P0 — Fausse impression de couverture

Les seeds `future`, modes UI et docs de spec peuvent donner l'impression que les engines existent.
Le registre `status` limite correctement ce risque, mais les audits doivent continuer a separer
`documente`, `contracte`, `code`, `teste` et `deploie`.

### P0 — Permissions trop plates

Le rang de role ne suffit pas pour un OS multi-user. Avant event public, classe ou collaboration :

- scope et ownership ;
- permission par objet ;
- privacy gate ;
- invitation ;
- consentement ;
- audit d'acces.

### P0 — Execution generique simulee

Une action `completed` peut actuellement contenir seulement un resultat simule. Chaque nouvelle
feature doit disposer d'un dispatcher reel ou rester `future`.

### P0 — Exposition publique

Le Funnel rend prioritaires :

- rate limiting ;
- register policy ;
- payload limits par route ;
- CORS/host policy ;
- journalisation minimisee ;
- abuse controls ;
- Sentinel avant ingestion de fichiers, liens ou outils.

### P1 — Absence de projects/jobs/assets

Ces trois familles bloquent une grande partie du canon :

```text
projects -> contexte et ownership
jobs -> traitements longs
assets -> sorties visuelles et exports
```

### P1 — Documentation divergente entre branches

`origin/main` ne contient pas encore plusieurs specs/correctifs de
`codex/frontend-masterflow`. Une spec poussee sur la branche n'est pas une implementation
partagee tant qu'elle n'est pas relue et integree.

## 10. Marche a suivre recommandee

### Couche A — Fermer le core runtime

1. scopes/ownership et privacy gate ;
2. `projects`, memberships et project rooms ;
3. user preferences/loadout minimal ;
4. validation items et decision log structures ;
5. dispatcher d'actions reel, sans faux `completed`.

### Couche B — Ajouter l'execution

1. jobs et job logs ;
2. queue et statuts ;
3. notifications runtime internes ;
4. simulation, cancel, retry et `needs_review` ;
5. Sentinel minimal avant sources externes et tool calls.

### Couche C — Pilote pedagogique guide

1. guides et sessions privees ;
2. MOTH comme persona conditionnel ;
3. premier template CDC ;
4. contributions et contradictions ;
5. validation enseignant.

Cette couche teste Bot Studio, Guidance, Room OS, permissions et pedagogie sans ouvrir de public.

### Couche D — Ours d'Or public

Seulement apres les gates precedents :

1. invitation/public session ;
2. consentement et email transactionnel ;
3. event, registration et roster ;
4. badge manifest et preview ;
5. export sticker valide.

### Couche E — Devis

1. price sources ;
2. intake structure ;
3. estimation avec confiance ;
4. quote versionne ;
5. preview et validation avant envoi.

### Couche F — DA/assets/runner

1. manifests ;
2. DA resolver ;
3. render queue ;
4. runner local ;
5. review et deployment asset.

## 11. Conclusion

GitHub n'est pas vide et le travail deja fait est utile :

- le socle compile ;
- les tests passent ;
- les invariants principaux commencent a etre prouves ;
- le frontend consomme le reel sans simuler les domaines absents ;
- le protocole Git evite les decisions silencieuses.

Mais MasterFlow canon reste beaucoup plus large. L'etat honnete est :

```text
fondations MVP : presentes
owners core : partiellement cables
domaines metier : majoritairement absents
execution lourde : absente
UI complete : prematuree
```

La bonne strategie n'est pas de tenter d'implanter 800 fichiers. Il faut fermer les couches
transversales, puis choisir des verticales pilotes qui prouvent plusieurs owners a la fois.
