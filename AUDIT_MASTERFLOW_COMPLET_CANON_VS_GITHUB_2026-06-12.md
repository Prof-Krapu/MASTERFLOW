# AUDIT COMPLET — MasterFlow canon vs GitHub

Date : 2026-06-12  
Canon : Drive `MASTERFLOW` complet  
Code : branche `codex/frontend-masterflow`  
Inventaire reproductible : `AUDIT_MASTERFLOW_CANON_INVENTORY.json`

## 1. Verdict

Le Drive contient bien un **systeme MasterFlow beaucoup plus vaste que son index actif**. Le
depot GitHub implemente un socle MVP utile, mais pas la quasi-totalite de ce systeme.

Mesure normalisee sur 41 familles fonctionnelles dans le perimetre produit, hors factories :

| Mesure | Resultat |
|---|---:|
| famille complete de bout en bout | 0 / 41 |
| famille avec une tranche executable partielle | 11 / 41 |
| famille avec seulement une facade/shell | 3 / 41 |
| famille documentee ou annoncee future | 7 / 41 |
| famille sans runtime metier exploitable | 20 / 41 |
| couverture fonctionnelle ponderee estimee | **10 a 13 %** |

Le chiffre de 15 a 20 % du premier audit reste valable pour le **noyau actif prioritaire**. Il
etait trop eleve pour representer MasterFlow complet.

```text
canon mature ou deployable != code GitHub
factory livree != feature runtime
schema ou bouton != workflow metier
```

## 2. Perimetre reellement audite

Le scan catalogue 4 508 fichiers :

| Corpus | Fichiers | Usage dans l'audit |
|---|---:|---|
| racine | 31 | boot, index, handoffs et cartes globales |
| primaire | 791 | autorite fonctionnelle auditee fichier par fichier |
| secondaire | 3 686 | preuves, livraisons, audits, factories et historique |

Corpus primaire :

| Couche | Fichiers |
|---|---:|
| `01_CORE` | 111 |
| `02_CONTRACTS` | 197 |
| `03_APPS` | 95 |
| `04_ENGINES` | 148 |
| `05_PERSONAS` | 24 |
| `06_WIDGETS` | 31 |
| `07_UI` | 18 |
| `08_DATASETS` | 67 |
| `09_EVENTS` | 12 |
| `12_REFACTOR` | 16 |
| `COMMON` | 72 |

Les 3 686 fichiers de `10_AUDITS`, `11_DEPLOYMENT` et `FACTORIES` ont ete indexes et rapproches
des familles, mais ne sont pas comptes comme implementation backend. Les factories restent hors
scope de cette version, conformement a la decision MALEX.

## 3. Methode de couverture

Chaque famille est evaluee sur la chaine :

```text
autorite canonique
-> contrat partage
-> donnees vivantes
-> permissions et privacy
-> endpoint/event
-> engine metier
-> job si necessaire
-> surface UI
-> tests
```

Ponderation indicative :

- `IMPLEMENTED` : 100 % ;
- `PARTIAL` : 40 % ;
- `SHELL` : 15 % ;
- `SPEC_ONLY` ou `FUTURE` : 5 % ;
- `ABSENT` ou `OUT_OF_SCOPE` : 0 %.

Cette methode empeche les statuts du Drive (`CORE V1`, `ENGINE V1`, `DEPLOYMENT_READY`,
`CANONICAL_EXTENSION`, etc.) d'etre confondus avec du code execute et teste.

## 4. Matrice complete des familles

| # | Famille MasterFlow | GitHub | Constat |
|---:|---|---|---|
| 1 | Architecture, runtime, orchestration | `PARTIAL` | contexte, registres et montage existent ; resolution globale, graphes, budgets et overrides manquent |
| 2 | Auth, identite, comptes | `PARTIAL` | login/register/JWT/revocation ; invitations, devices, recovery, consentements et identite etendue manquent |
| 3 | Permissions, scopes, privacy | `PARTIAL` | rang de role et scopes JSON ; pas de capability/ownership/object gate complet |
| 4 | Actions, preflight, validation | `PARTIAL` | cycle trace et validation humaine ; execution metier encore generique/simulee |
| 5 | Rooms, UI OS, navigation | `PARTIAL` | Home Room et etat utilisateur ; pas de project rooms, focus graph ou resolver complet |
| 6 | Widgets, overlays, command center | `SHELL` | etat JSON et surfaces statiques ; pas de registre/resolver/loadout vivant |
| 7 | Personas, comportement, lore, voix | `PARTIAL` | personas et chimere simple ; pas d'assignation, packages, memoire ou evolution visuelle |
| 8 | Sessions, chat, conversations | `PARTIAL` | WS streaming ; pas d'historique, contributions, resumés, reprise ou isolation projet |
| 9 | Memoire, contexte, knowledge graph | `ABSENT` | aucun objet de memoire ou graphe de contexte vivant |
| 10 | Projets, taches, workflows, regles | `ABSENT` | aucun `project`, state machine, dependency graph ou workflow engine |
| 11 | Jobs, queues, automation, triggers | `ABSENT` | aucun worker, job log, retry, cancel, schedule ou backpressure |
| 12 | Sandbox, simulation, rollback | `ABSENT` | specs presentes ; aucune isolation, simulation d'impact ou restauration |
| 13 | Resources, Search, Resource Truth, RAG | `PARTIAL` | registre valide et recherche ; pas de provenance graph, ranking, embeddings ou reranker |
| 14 | Connecteurs, LLM, IA locale/privee | `PARTIAL` | provider OpenAI-compatible et mock ; pas de gateway, allowlist outils ou runtime local BGE |
| 15 | Sentinel, securite, moderation, incidents | `SHELL` | auth et gates generiques ; pas de quarantaine, trust state, incident response ou tool envelope |
| 16 | Observabilite, debug, health | `PARTIAL` | audit logs, token events et diagnostic ; pas de traces distribuees, alertes ou projections runtime |
| 17 | Versioning, timeline, archive, migration | `ABSENT` | aucune version metier, snapshot, archive ou migration supervisee |
| 18 | Organisations, multi-tenant, equipes | `ABSENT` | aucun tenant, membership, classe, teamspace ou isolation organisationnelle |
| 19 | Guidance, onboarding, discovery | `SHELL` | sas UI local ; aucun guide/session/progression persiste |
| 20 | Bot Studio / guided runtime | `SPEC_ONLY` | architecture consolidee ; guides, deployments et evaluations non codes |
| 21 | Pedagogie, cours, apprentissage | `ABSENT` | aucun course graph, adaptation, mentorship ou learning playlist |
| 22 | Sujets, exercices, assignments | `ABSENT` | action future seulement ; aucun objet/version/assignation |
| 23 | Correction, feedback, evaluation | `ABSENT` | aucun submission, rubric, correction sheet ou validation enseignant |
| 24 | Competences, analytics, profils | `ABSENT` | tokens seulement ; aucun competency graph, creator profile ou soft-skill proof |
| 25 | Recommandation, matching, opportunites | `ABSENT` | engines canoniques presents ; aucun candidat, preuve, score prudent ou inbox |
| 26 | Classroom live, signaux, realtime | `ABSENT` | aucun signal pedagogique, Wooclap, overlay live ou event bus metier |
| 27 | DA, MasterLab, direction visuelle | `FUTURE` | action declaree ; pas de DA compiler, references, locks ou review |
| 28 | Image, Comfy, motion, render | `FUTURE` | pas de runner, queue, casting, continuite ou retake |
| 29 | Assets, inventaire, OCR, collections | `FUTURE` | pas d'asset manifest, item, collection, OCR ou ownership |
| 30 | Outputs, export, publication, delivery | `ABSENT` | aucun preview, format, destination, approval ou publication connector |
| 31 | MasterStory, narration, lore | `ABSENT` | aucune scene, beat, reader graph, reveal gate ou continuity ledger |
| 32 | Events, concours, Ours d'Or | `ABSENT` | aucun event, inscription, roster, jury, scoring, badge ou sticker workflow |
| 33 | Quote, Price, abonnement, billing | `ABSENT` | tarifs documentes ; aucun price source, devis versionne, paiement ou facture |
| 34 | Notifications, email, consentements | `ABSENT` | aucun canal, preference, template, delivery log ou unsubscribe |
| 35 | Marketplace, communaute, creator economy | `ABSENT` | aucun listing, licence, echange, reputation ou moderation sociale |
| 36 | Gamification, progression, rivalite | `ABSENT` | aucun progression state, reward, league ou unlock gate |
| 37 | HelpLab, accessibilite, support | `ABSENT` | aucun profil d'aide, consentement aidant, routine ou safety escalation |
| 38 | Policy, gouvernance, ethique | `SPEC_ONLY` | doctrine riche dans le canon ; pas de policy objects/versioning/enforcement dedie |
| 39 | AI OS Builder / MasterBuilder | `SPEC_ONLY` | methodes de conception et compilation presentes ; aucun builder executable |
| 40 | Tests, deploiement, operations | `PARTIAL` | tests MVP, lint/build et run prouves ; pas de CI complete, migrations versionnees ou SLO |
| 41 | Lettres externes et messages de confiance | `SPEC_ONLY` | contrat source-backed et validation humaine ; aucun workflow/export |
| 42 | Factories et backflow | `OUT_OF_SCOPE` | artefacts nombreux et matures, volontairement exclus du backend V1 |

## 5. Capacites sous-estimees par l'index actif

L'audit complet revele plusieurs ensembles coherents qui ne doivent pas disparaitre du plan :

### Construction et orchestration

- `AI_OS_BUILDER_APP` : concevoir, auditer et scaffold des OS/apps a partir de besoins ;
- `MASTERBUILDER_APP_RUNTIME` : briefs, sujets, workflows, exports et packs pedagogiques ;
- `WORKFLOW_APP_RUNTIME`, `RULE_ENGINE`, `STATE_MACHINE_ENGINE` : workflows explicites ;
- `AUTOMATION_APP_RUNTIME` : triggers, schedules, retries et executions supervisees ;
- `SANDBOX_APP_RUNTIME`, `SIMULATION_ENGINE`, `ROLLBACK_ENGINE` : tester avant mutation.

### Collaboration et produit

- organisations, tenants, classes, equipes et teamspaces ;
- communaute, marketplace, licences, reputation et creator economy ;
- timeline, versioning, archives, migrations et snapshots ;
- notifications et consentements multicanaux.

### Intelligence et accompagnement

- memory engine, contextual reasoning, semantic retrieval et recherche indexee ;
- recommendation, matching, friction et opportunity detection ;
- creator profile, competence graph, soft-skill proof et exports CV ;
- lettres de recommandation sourcees, toujours relues avant envoi ;
- IA locale/privee et abstraction de providers.

Ces blocs ne sont pas des idees isolees : apps, engines, contrats et datasets se repondent deja
dans le Drive. Le manque se situe principalement dans la compilation vers le runtime GitHub.

## 6. Etat technique GitHub

Le backend possede 11 tables :

```text
users, revoked_tokens, rooms, room_instances, personas, persona_blends,
actions, audit_logs, resources, global_settings, token_events
```

Il expose le MVP auth/context/rooms/personas/actions/resources/diagnostics et un WS de chat. Les
engines executables sont limites a :

```text
action_registry
permission_runtime
action_engine
persona_engine
resource_truth
```

Le frontend est un cockpit d'integration du MVP, pas encore l'UI MasterFlow complete. Il doit
rester aligne sur les objets reels et ne pas simuler les domaines absents.

## 7. Problemes de coherence identifies

### P0 — Trois sens differents de « deploye »

Le Drive utilise parfois « deployed » pour indiquer qu'un contrat, patch ou bundle canonique a
ete livre. GitHub utilise le deploiement pour du code executable. Il faut conserver trois colonnes :

```text
maturite canon | artefact/factory disponible | implementation runtime GitHub
```

### P0 — Statuts canoniques heterogenes

Le corpus primaire contient notamment `TARGET / V1`, `CORE V1`, `ENGINE V1`,
`CANONICAL_EXTENSION`, `DRAFT_READY`, `ACTIVE` et `DEPLOYMENT_READY`. Ces statuts ne forment pas
une machine d'etat commune. Ils sont utiles editorialement, mais impropres au calcul automatique
de couverture.

### P0 — Owners declares sans objets vivants

Les contrats sont souvent tres aboutis alors que les tables, endpoints et jobs n'existent pas.
Le risque principal est donc une illusion de disponibilite par la documentation, les seeds
`future` ou les surfaces UI.

### P0 — Permissions insuffisantes pour le public et le multi-user

Avant MOTH public, Ours d'Or, classe ou marketplace, il faut au minimum :

- ownership et scopes par objet ;
- invitation/public access explicite ;
- consentement et privacy versionnes ;
- rate limiting et anti-abus ;
- journal d'acces ;
- Sentinel pour les sources, fichiers et outils.

### P1 — Duplications conceptuelles

Plusieurs docs deploiement/factory reappliquent les memes concepts sous des noms differents. Ce
n'est pas un probleme tant qu'un owner canonique unique compile le comportement. Il ne faut pas
transformer chaque document en table, endpoint ou engine.

## 8. Architecture cible minimale avant domaines metier

Les fondations a fermer sont :

1. `projects`, memberships, scopes et privacy ;
2. permission runtime par capability, owner, target et contexte ;
3. dispatcher d'actions vers des handlers metier reels ;
4. jobs/queue avec progress, retry, cancel et `needs_review` ;
5. objets `assets`/manifests et `outputs`/previews ;
6. sessions/messages/memoire isolees par projet ;
7. event bus et notifications internes ;
8. Sentinel minimal pour ingestion, outils et exposition publique ;
9. versioning/decision log ;
10. capability registry lisible par l'UI.

## 9. Ordre recommande

### Couche 1 — Core multi-user

Scopes, ownership, projets, memberships, privacy, invitations et permissions objet.

### Couche 2 — Execution fiable

Handlers reels, jobs, queue, simulation, retry/cancel, logs et Sentinel minimal.

### Couche 3 — Runtime conversationnel prive

Sessions persistantes, guides, contributions, Bot Studio et premier bot MOTH/CDC en environnement
authentifie. Cette verticale teste plusieurs fondations sans exposition publique.

### Couche 4 — Pilote pedagogique

Course/subject/assignment, progression du CDC, ressources verifiees et validation enseignant.

### Couche 5 — Ours d'Or

Event, inscription, consentement email, roster, communication, badge manifest et export sticker.

### Couche 6 — Devis guide

Intake, price sources, estimation avec confiance, previews techniques et devis versionne.

### Couche 7 — DA et production

DA compiler, assets, render jobs, Comfy/local runner, review, retake et publication.

L'UI finale vient apres chaque verticale, pas avant les objets, permissions et workflows qu'elle
doit representer.

## 10. Livrables de controle

- `scripts/audit-masterflow-canon.mjs` : regenere l'inventaire depuis le Drive ;
- `AUDIT_MASTERFLOW_CANON_INVENTORY.json` : catalogue des 4 508 fichiers et familles heuristiques ;
- ce rapport : interpretation humaine et comparaison au runtime ;
- `AUDIT_PROFOND_CANON_VS_GITHUB_2026-06-12.md` : zoom conserve sur les owners actifs.

## 11. Conclusion

MasterFlow n'est pas incoherent dans son intention : il contient deja les briques d'un OS
pedagogique, creatif, conversationnel et operationnel. Son probleme actuel est un **ecart de
compilation** entre un canon tres large et un runtime volontairement minimal.

La strategie correcte n'est ni de reduire le canon au MVP, ni d'implanter 791 documents. Elle
consiste a :

```text
normaliser les owners
-> fermer les fondations transversales
-> compiler une verticale utile
-> tester backend et permissions
-> exposer sa surface UI
-> recommencer
```

Le prochain chantier ne doit donc pas etre une finition generale de l'interface. Il doit fermer
la couche core multi-user et l'execution fiable, puis utiliser MOTH/CDC comme premiere verticale
de preuve.

