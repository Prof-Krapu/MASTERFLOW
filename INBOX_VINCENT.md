# INBOX VINCENT — MasterFlow

Objectif : point d'entrée court pour les demandes MALEX/Codex à traiter côté Vincent.

Règles de lecture :

- à checker systématiquement avant reprise backend, run local, réponse de sync ou modification de contrat ;
- traiter les entrées du haut vers le bas ;
- une entrée peut être `open`, `answered`, `blocked` ou `done` ;
- une réponse IA ne vaut pas validation humaine ;
- Vincent peut transmettre ses demandes à MALEX via `INBOX_MALEX.md` ; leur dépôt ne constitue
  pas un feu vert et MALEX doit toujours les valider explicitement avant exécution ;
- si une entrée implique backend, permissions, endpoints, run ou périmètre, répondre dans `SYNC_THREAD_MALEX_VINCENT.md` ou par commit Git explicite.

---

## 2026-06-13 — open — Revue PR-CB2 routing LLM et egress gated

MALEX/Codex a posé `SPEC_TASK_AWARE_MODEL_ROUTING_AND_EGRESS_PR_CB2.md`.

Le runner LLM externe exige maintenant un profil validé unique pour la tâche, un provider
autorisé, une privacy compatible et une origine exacte dans `LLM_EGRESS_ALLOWLIST`. HTTPS est
obligatoire hors loopback. Le mode mock reste inchangé et sans réseau.

Action demandée : comparer le gate avec tes implémentations `API_corrector` / `vibe` :

- stripping ou headers supplémentaires réellement nécessaires ;
- providers et origines à déclarer côté serveur ;
- contraintes timeout/retry ;
- éventuelles protections DNS/IP manquantes ;
- stratégie future de plusieurs credentials et fallback.

Ne pas injecter de clé en BDD, ne pas rendre les profils modifiables sans action sensible, et ne
pas annoncer de fallback tant qu'il n'est pas réellement testé.

---

## 2026-06-13 — open — Revue PR-CB1 adapter registry read-only

MALEX/Codex a posé `SPEC_ADAPTER_REGISTRY_PR_CB1.md`.

Implémentation à relire :

- `AdapterRegistryEntrySchema` dans `packages/shared/src/index.ts` ;
- `apps/backend/src/seeds/adapter_registry_seed.v1.json` ;
- `apps/backend/src/engines/adapter_registry.ts` ;
- `apps/backend/tests/adapter_registry.test.ts`.

OCR, WooClap et transcription sont `shell/locked`. La note professeur est
`partial/readonly` car le contrat de preuve existe, mais aucune surface publique n'est livrée.
Aucun executor n'est branché et le gate refuse toute exécution.

Action demandée : comparer ce registre à tes runners/features existants et signaler, sans les
activer, les capacités, contraintes MIME, privacy, jobs ou limites manquantes. Ne passer aucun
adapter `live` avant Project/Scope, permission/preflight, stockage, tests et recette.

---

## 2026-06-13 — open — Pont direct canon x features Vincent

MALEX demande de ne plus traiter l'absorption Corrector comme une verticale isolee.

Nouveaux documents obligatoires :

- `BRIDGE_CANON_FEATURES_VINCENT_CORRECTION_PEDAGOGIE.md` ;
- `SPEC_PEDAGOGICAL_EVIDENCE_SIGNAL_AND_TEACHER_DELTA.md`.

Le check canon est fait. Les owners existaient deja : Corrector, Signal, Pedagogical Adaptation,
Course Graph, Subject, Queue/Jobs, LLM Provider, Export et WooClap/Classroom.

Tes modules apportent les implementations et patterns terrain qui manquaient : OCR, workflow
P1-P4, coherence audit, edition/restauration, capteurs, progression, routage modele par tache,
exports, egress gated et transport desktop.

Action demandee :

1. utiliser le bridge comme mapping de reference ;
2. relire la tranche PR-CB0 deja posee :
   - contrats dans `packages/shared/src/index.ts` ;
   - migrations dans `apps/backend/src/db/schema.ts` ;
   - depot interne dans `apps/backend/src/services/pedagogical_records.ts` ;
   - tests `pedagogical_contracts`, `pedagogical_storage`, `pedagogical_records` ;
3. challenger les contraintes et proposer les adaptations necessaires a Project/Scope ;
4. ne creer aucun nouvel engine ;
5. conserver chaque proposition IA et decision prof comme objets distincts ;
6. ne pas ajouter de route publique ou de statut `live` avant scopes et recette ;
7. repondre avec les incompatibilites eventuelles et la prochaine PR courte.

Le gain cle est la boucle :

```text
evidence -> signal -> candidate -> decision prof -> delta -> enrichment candidate
```

Elle prepare correction, cours, suivi, MOTH/CDC, Ours d'Or, devis et futurs LMS avec les memes
briques permissionnees.

---

## 2026-06-13 — open — Decision finale : Corrector absorbe, features a recuperer

**Decision humaine MALEX. A lire avant tout nouveau travail lie a Corrector/API_corrector.**

Document obligatoire :

- `DECISION_ABSORPTION_CORRECTOR_ET_CALIBRATION_INSTITUTIONNELLE.md`.

Conclusion non ambigue :

- tes features de correction ne sont pas rejetees ;
- le systeme absorbe est nettement plus puissant que ton Corrector isole : ses capacites deviennent
  accessibles a tous les personas et contextes autorises, sans perdre leur voix propre ;
- une amelioration OCR, rubrique, scoring, calibration, feedback ou controle qualite profite a
  toutes les surfaces MasterFlow au lieu de rester enfermee dans un bot ;
- tu dois les auditer et les reabsorber dans les engines, jobs, contrats, donnees et surfaces
  MasterFlow appropries ;
- tu as tort de maintenir Corrector comme persona autonome, primaire et conteneur du pipeline ;
- la correction est une capacite metier gouvernee par
  `CORRECTOR_RUNTIME_AND_FEEDBACK_ENGINE`, avec validation professeur ;
- `corrector-001` doit etre deprecie sans destruction, ou transforme plus tard en profil de
  methode optionnel ;
- la moyenne 13-14 de MALEX est un referentiel institutionnel, pas une courbe arbitraire ;
- remplacer le lissage automatique par un diagnostic de cohorte, une proposition bornee et une
  validation professeur, en conservant note brute, delta et note finale.

Action demandee :

1. scanner tes projets/features/PRs `API_corrector` ;
2. rendre la matrice d'absorption demandee dans le document ;
3. proposer PR-C0 puis PR-C1, sans exposer de pipeline fictif comme `live` ;
4. repondre dans `SYNC_THREAD_MALEX_VINCENT.md`.

Tu peux challenger l'implementation. La decision engine/persona est tranchee.

---

## 2026-06-13 — open — Correction : check features Vincent + canon embarque Git

Correction MALEX : Vincent ne doit pas checker directement le Drive canon par defaut.

Le protocole correct est documente ici :

- `PROTOCOLE_VINCENT_FEATURE_OPPORTUNITY_CHECK.md`.

Regle :

1. Codex/MALEX embarque le canon utile dans Git ;
2. Vincent checke les specs/handoffs Git ;
3. Vincent checke surtout ses propres features/projets/PRs/workflows deja crees ;
4. Vincent mappe les opportunites vers owners, engines, contrats, tables, endpoints, permissions,
   gates, UI et tests ;
5. si une reference canon manque, Vincent le signale et Codex/MALEX l'importe dans Git.

Action demandee : avant chaque PR d'absorption ou de fondation, verifier aussi les features
Vincent existantes pour ne rien oublier et ne pas recoder une version appauvrie.

---

## 2026-06-13 — open — Precision multi-personas pedagogiques

Precision MALEX a integrer a PR-6 / Guided Runtime :

- cette logique est deja canonique dans MasterFlow, pas une feature nouvelle ;
- sources : `PERSONAL_PERSONA_ASSIGNMENT_AND_CHATBOT_CONTRACT`,
  `CONDITIONAL_SUB_PERSONA_RUNTIME_AND_CLASS_INSTANCE_CONTRACT`, `PERSONA_RUNTIME_SYSTEM`,
  `CONVERSATION_SURFACE_AND_SPEAKER_ROUTING_CONTRACT` ;
- l'utilisateur garde son persona principal ;
- une activite peut ajouter des personas contextuels : prof, sujet, methode, jury, expert ;
- MOTH sert surtout de check/friction/cadrage CDC quand il est assigne ;
- Incubator peut jouer le meme role pour Ours d'Or ;
- 1 a 3 personas contextuels maximum par defaut ;
- un orchestrateur choisit les voix utiles ;
- chaque message doit identifier sa voix si plusieurs personas sont actifs ;
- aucune assignation persona/bot/lore ne donne de droit.

Action demandee : prevoir les champs/contrats sans sur-implementer. Si PR-6 reste mono-guide,
garder une extension compatible `conversation_roster` / `contextual_persona_assignments`.

---

## 2026-06-13 — open — Decision persona utilisateur + pack PR-8 Jobs

Decision a prendre en compte :

- `DECISION_PERSONA_USER_ET_BOTS_CONTEXTUELS.md`.

MOTH n'est pas le persona par defaut de tous les utilisateurs. Chaque user peut avoir un persona
personnel ; MOTH et les autres bots sont des guides contextuels assignes a une activite, classe,
projet, event ou tunnel. Aucun persona/bot/lore ne donne de droits.

Pack suivant pour `jobs_shell` :

- `HANDOFF_VINCENT_PR8_JOBS_QUEUES_RUNNERS.md` ;
- `CHECKLIST_PR8_JOBS_QUEUES_RUNNERS.md` ;
- `RECETTE_PR8_JOBS_QUEUES_RUNNERS.md`.

Action demandee : challenger la separation persona/bot dans PR-6 si besoin, puis proposer une PR-8
courte pour jobs, events, progress, cancel/retry et gates.

---

## 2026-06-13 — open — Pack PR-7 RAG permissionne

Pack suivant pour `rag_capability_shell` :

- `HANDOFF_VINCENT_PR7_RAG_PERMISSIONNE.md` ;
- `CHECKLIST_PR7_RAG_PERMISSIONNE.md` ;
- `RECETTE_PR7_RAG_PERMISSIONNE_DETAILLEE.md`.

But : fournir un retrieval permissionne, cite, revoke-aware, sans index massif ni fuite de
metadata. Le RAG doit servir Resource Truth, pas le remplacer.

Action demandee : challenger les tables/routes/tests, puis proposer une PR courte. Si la queue
jobs n'est pas encore prete, garder le reindex borne et compatible avec PR-8.

---

## 2026-06-13 — open — Pack PR-6 Guided Runtime prive

Pack suivant pour la tranche `guided_runtime_pr1` :

- `HANDOFF_VINCENT_PR6_GUIDED_RUNTIME.md` ;
- `CHECKLIST_PR6_GUIDED_RUNTIME.md` ;
- `RECETTE_PR6_GUIDED_RUNTIME_DEPENDENCIES.md`.

But : livrer MOTH/CDC comme runtime prive et testable, pas comme bot public ou verticale complete.
Le runtime doit consommer ou preparer l'accrochage a project/scope et template/schema registry.

Action demandee : challenger le perimetre, puis proposer une PR courte avec migrations, routes,
contrats partages et tests. Tout public/export/email/event/devis/badge reste hors PR-6.

---

## 2026-06-13 — open — Pack PR-4/PR-5 Project Scope + Template Registry

Pack suivant pour apres capability/status :

- `HANDOFF_VINCENT_PR4_PR5_SCOPE_TEMPLATES.md` ;
- `CHECKLIST_PR4_PROJECT_SCOPE_OWNERSHIP.md` ;
- `CHECKLIST_PR5_TEMPLATE_SCHEMA_REGISTRY.md` ;
- `RECETTE_PROJECT_SCOPE_TEMPLATES.md`.

But : poser ownership/scope puis templates versionnes, afin que MOTH/CDC, Ours d'Or, devis,
event, DA/assets, correction et RAG ne recreent pas chacun leur permission/schema local.

Action demandee : challenger les tables/routes/tests, puis proposer deux PRs courtes separees.
PR-4 avant PR-5 est recommande, sauf contrainte backend explicite.

---

## 2026-06-13 — open — Pack PR-2/PR-3 Capability Registry + Status Taxonomy

Pack suivant pour apres `autonomy_step1_shell` :

- `HANDOFF_VINCENT_PR2_PR3_CAPABILITY_STATUS.md` ;
- `CHECKLIST_PR2_CAPABILITY_REGISTRY.md` ;
- `CHECKLIST_PR3_STATUS_TAXONOMY.md` ;
- `RECETTE_CAPABILITY_STATUS.md`.

But : rendre impossible une UI deceptive ou une feature marquee live sans preuve runtime.

Action demandee : challenger PR-2/PR-3, puis proposer deux PRs courtes separees.

---

## 2026-06-13 — open — Big chantier backend fondations

Pack operationnel a lire au reveil :

- `HANDOFF_VINCENT_BIG_CHANTIER_FONDATIONS_2026-06-13.md` ;
- `PROTOCOLE_REVUE_PRS_VINCENT.md` ;
- `CHECKLIST_PR1_AUTONOMY_STEP1.md`.

But : transformer les specs post-audit en PRs courtes, en commencant par
`autonomy_step1_shell`.

Action demandee : soit repondre avec le diff backend exact de PR-1, soit livrer une branche
courte PR-1 avec tests. Ne pas attaquer plusieurs fondations dans la meme PR.

---

## 2026-06-13 — open — Matrice features vs fondations

Nouveau document :

- `MATRICE_FEATURES_VS_FONDATIONS_MASTERFLOW.md`

Il relie les cas d'usage MasterFlow aux fondations techniques requises : autonomie, registry,
statuts, scopes, templates, RAG, jobs, observabilite, recettes et validation graduee.

Action demandee : utiliser cette matrice pour challenger l'ordre produit/backend. Signaler toute
dependance manquante ou verticale qui devrait remonter/descendre.

---

## 2026-06-13 — open — Pack specs fondations post-audit

MALEX/Codex a deroule les specs/recettes suivantes pour cadrer les prochaines PRs :

- `RECETTE_AUTONOMY_STEP1_SHELL.md` ;
- `SPEC_CAPABILITY_REGISTRY.md` ;
- `SPEC_STATUS_TAXONOMY.md` ;
- `SPEC_PROJECT_SCOPE_OWNERSHIP.md` ;
- `SPEC_TEMPLATE_SCHEMA_REGISTRY.md` ;
- `RECETTE_RAG_PERMISSIONNE.md` ;
- `SPEC_JOBS_QUEUES_RUNNERS.md` ;
- `SPEC_WORKFLOW_OBSERVABILITY.md` ;
- `PLAN_PRS_FONDATIONS_MASTERFLOW.md`.

Action demandee : challenger l'ordre, signaler les conflits backend, puis proposer les PRs
courtes correspondantes. Ne pas tout implementer d'un bloc.

---

## 2026-06-13 — open — Spec PR autonomy_step1_shell

La specification de la premiere couche d'autonomie encadree est disponible :

- `SPEC_AUTONOMY_STEP1_SHELL.md`

But : observer, preparer, proposer. Pas executer.

Perimetre propose :

- `autonomy_runs` ;
- `autonomy_findings` ;
- `improvement_candidates` ;
- `decision_queue` ;
- checks read-only sur sync, inbox, recettes, registry et coherence canon/Git ;
- endpoints admin+ ;
- audit ;
- tests.

Interdit en PR-1 : publication, export, email, deploy, tool externe puissant, modification Drive,
modification Git, execution sensible ou exposition de secrets.

Action demandee : challenger le diff backend exact et proposer une PR courte compatible avec
les gates MasterFlow.

---

## 2026-06-13 — open — Reprioriser : autonomie encadree avant connecteurs

MALEX corrige la projection post-audit : les connecteurs/plugins ne sont pas step 1.

Reference mise a jour :

- `MASTERFLOW_POST_AUDIT_FOUNDATION_UPGRADES.md`

Nouvelle priorite :

1. `autonomy_step1_shell` : observer, preparer, proposer ;
2. capability registry + statuts ;
3. project/scope/ownership ;
4. template registry ;
5. RAG permissionne ;
6. jobs/queues ;
7. observabilite workflow.

Le systeme autonome step 1 ne doit jamais publier, envoyer, deployer ou modifier une ressource
sensible seul. Il produit des findings, candidates et decisions a valider.

Action demandee : tenir compte de cette priorisation dans la sequence de PRs backend.

---

## 2026-06-12 — open — Fondations post-audit a integrer au plan backend

Nouveau document de cadrage :

- `MASTERFLOW_POST_AUDIT_FOUNDATION_UPGRADES.md`

Il formalise les multiplicateurs systeme a mettre en place apres l'audit complet :
Capability Registry, statuts normalises, project/scope/ownership, RAG permissionne,
jobs/queues/runners, template registry, tool gateway, observabilite workflow et recettes
d'acceptation.

Action demandee : utiliser ce document pour challenger l'ordre des prochaines PRs backend.
Ne pas tout coder d'un bloc. Repondre avec une sequence de PRs courtes et les dependances.

---

## 2026-06-12 — open — Recette UI post-PR-1 Guided Runtime

La recette UI minimale pour consommer la PR-1 Guided Runtime est disponible :

- `RECETTE_UI_PR1_GUIDED_RUNTIME.md`

Elle ne demande pas a Vincent de coder l'UI, mais elle precise les donnees que le backend doit
exposer proprement pour eviter une interface deceptive : progression, contradictions, session,
question courante, gates et etats.

Point cle : l'UI ne doit pas compenser un backend incomplet avec des objets fictifs.

---

## 2026-06-12 — open — Recette d'acceptation PR-1 Guided Runtime

La recette MALEX pour accepter/refuser la PR-1 MOTH/CDC est disponible :

- `RECETTE_PR1_GUIDED_RUNTIME.md`

Elle fixe les endpoints attendus, payloads de reference, scenarios A1-A12, tests minimum et
criteres de refus immediat.

Important : cette recette applique la validation graduee. Les operations privees/reversibles
passent par permission, scope et audit ; publication, public, export, email, event, devis et
asset restent hors PR-1 ou sous validation humaine.

Utilise cette recette comme banc d'essai avant de deposer ton commit. Si tu changes un nom de
route ou un champ, fournis une table d'equivalence et conserve les garanties.

---

## 2026-06-12 — open — Assouplir la validation systematique

MALEX valide le principe propose par Vincent : ne pas imposer une double validation humaine
systematique partout.

Nouvelle reference :

- `POLITIQUE_VALIDATION_GRADUEE.md`

Regle :

```text
permission_check toujours
preflight selon action
validation humaine selon risque / effet / scope
validation renforcee seulement pour critique
```

Impact PR-1 Guided Runtime :

- creer/modifier guide draft, session privee, contribution et progression interne : permission,
  scope et audit suffisent ;
- `complete` prive sans publication : preflight simple + audit ;
- publication, public, email, event, devis, asset, export et settings globaux : validation
  humaine conservee ;
- critique / irreversible / couteux / donnees personnelles en masse : validation renforcee.

Objectif : moins de friction, pas moins de securite. Ne pas confondre `validation_required=false`
avec absence de permission ou absence d'audit.

---

## 2026-06-12 — open — GO MALEX pour PR-1 Guided Runtime prive

MALEX confirme que MOTH/CDC est pertinent comme premiere verticale de preuve et donne son
**GO humain** pour la PR-1 `Capability Shell privee` de
`SPEC_BOT_STUDIO_GUIDED_RUNTIME.md`.

Arbitrages obligatoires :

1. `GUIDANCE_ENGINE` est confirme comme owner de la selection de question.
2. Un guide appartient d'abord a un `user`; `room_id` reste optionnel. Organisation reportee.
3. PR-1 accepte uniquement des comptes authentifies. Aucun invite, token public ou inscription.
4. Un teacher owner peut utiliser son guide `draft` en session privee. `validated/published`
   reste admin+ et n'est pas implemente dans PR-1.
5. Retention par defaut : session active 30 jours sans activite, puis expiration ; session
   terminee et contributions 90 jours, avec suppression explicite par owner/admin.
6. Aucun template CDC n'est declare canonique sans source verifiee. PR-1 utilise un template
   candidat versionne dans un seed dedie, clairement marque `candidate`.

Perimetre autorise :

- schemas partages ;
- migrations explicites pour guides, sessions, participants authentifies et contributions ;
- engine/service de progression deterministe ;
- routes privees de la section 5 ;
- permission owner/participant ;
- audit ;
- tests engine et permission.

Interdictions maintenues :

- aucun LLM requis ;
- aucun acces public ou invite ;
- aucun email, analytics nominatif, devis, event, asset ou publication ;
- aucune action `live` sans endpoint et tests reels ;
- aucun nouveau super-engine ;
- aucune UI finale dans cette PR.

Avant code, repondre avec le diff exact et signaler tout conflit avec le backend actuel. Ensuite,
implementer sur une branche courte et deposer tests + commit pour revue MALEX.

---

## 2026-06-12 — open — Relire l'audit exhaustif MasterFlow complet

Le premier audit portait sur les owners actifs. La couverture de tout le Drive est maintenant
documentee dans :

- `AUDIT_MASTERFLOW_COMPLET_CANON_VS_GITHUB_2026-06-12.md` ;
- `AUDIT_MASTERFLOW_CANON_INVENTORY.json`.

Le scan couvre 4 508 fichiers et normalise 41 familles produit hors factories. Conclusion
prudente : 0 famille complete, 11 avec une tranche executable partielle, couverture globale
estimee a 10-13 %.

Action demandee :

1. contredire les statuts avec chemin de code et test lorsqu'une implementation existe ailleurs ;
2. verifier les fondations proposees : projets/scopes, handlers reels, jobs, assets, sessions,
   Sentinel et capability registry ;
3. signaler les owners canoniques a fusionner ou renommer ;
4. proposer uniquement une sequence de PRs courtes.

**Revue uniquement.** Aucun code, migration, deploiement ou changement de perimetre sans GO
humain explicite de MALEX.

---

## 2026-06-12 — open — Relire l'audit profond canon vs GitHub

Rapport a lire :
`AUDIT_PROFOND_CANON_VS_GITHUB_2026-06-12.md`.

Le rapport conclut a 0/19 owner actif complet, 8/19 avec une tranche de code executable et une couverture
fonctionnelle ponderee estimee entre 15 et 20 %.

Action demandee :

1. contredire toute ligne dont le backend reel possede deja une implementation non reperee ;
2. confirmer les ecarts P0 : scopes/ownership/privacy, dispatcher reel, exposition publique ;
3. signaler les travaux deja en cours qui changent l'ordre recommande ;
4. proposer une sequence de PRs courtes pour fermer le core avant les verticales metier.

**Audit/revue uniquement.** Aucun changement de perimetre ni implementation implicite.

---

## 2026-06-12 — open — Auditer la PR-0 Bot Studio / Guided Runtime

MALEX valide la formalisation du Guided Runtime dans :
`SPEC_BOT_STUDIO_GUIDED_RUNTIME.md`.

Mission de ce tour :

1. relire la spec contre le backend reel et les owners canoniques ;
2. confirmer ou corriger le rattachement a `GUIDANCE_ENGINE` ;
3. repondre aux six questions de la section 11 ;
4. identifier tout schema, table ou contrat deja present dans tes projets ;
5. proposer le diff exact de PR-1 : shared, migrations, engines/services, routes et tests.

Le Guided Runtime doit rester une composition. Pas de `NEW_ENGINE` sans impossibilite demontree.

**Gate : audit et proposition uniquement.** Aucun code, migration, endpoint, action `live`,
acces public, email, devis, asset ou UI avant validation humaine MALEX separee.

---

## 2026-06-12 — open — Dimensionnement machine Local RAG BGE

Recommandation materielle pour faire tourner localement BGE-M3,
`bge-reranker-v2-m3` et Qdrant :

| Palier | CPU | Memoire | GPU | Stockage |
|---|---:|---:|---|---|
| PoC minimal | 8 coeurs | 32 Go | CPU seul | NVMe 500 Go+ |
| Equilibre recommande | 8-12 coeurs | 64 Go | RTX 4060 Ti 16 Go | NVMe 1-2 To |
| Confort | 12-16 coeurs | 64 Go | RTX 4070 Ti Super / 4080 16 Go | NVMe 2 To |
| Charge lourde | 16 coeurs+ | 128 Go | RTX 4090 24 Go | NVMe 2 To+ |

Apple Silicon M2/M3/M4 Pro ou Max avec 24-36 Go de memoire unifiee convient au
developpement. Pour un serveur Linux stable et reproductible, NVIDIA/CUDA reste preferable.

Choix de depart conseille pour MasterFlow :

```text
RTX 4060 Ti 16 Go + 64 Go RAM + NVMe 1 a 2 To
```

Eviter 8 Go de VRAM sauf PoC contraint : petits batchs et chargement sequentiel obligatoire.
Commencer avec des chunks de 512-1024 tokens, batch 4-8, retrieval de 20 candidats puis
reranking vers 6 resultats. Ne pas utiliser les 8192 tokens maximaux par defaut.

Ordres de grandeur Qdrant pour des vecteurs denses 1024 dimensions, hors payloads :

- 100 000 vecteurs : environ 0,6 Go RAM ;
- 1 million de vecteurs : environ 5,7 Go RAM.

Ces valeurs sont des estimations de capacite, pas un GO d'achat. Avant choix final, benchmarker
le corpus pilote, la latence p50/p95, le debit d'indexation et le pic VRAM/RAM.

Sources : model cards officielles BGE-M3 et reranker v2-m3, documentation Qdrant Capacity
Planning.

---

## 2026-06-12 — open — Revue des correctifs d'audit PR-1 token tracking

MALEX/Codex a audite le commit `1b08b38`. Rapport :
`AUDIT_PR1_TOKEN_TRACKING.md`.

Correctifs bornes disponibles sur la branche `codex/frontend-masterflow` :

- index composite `(user_id, ts)` rendu stable ;
- validation stricte de `from` / `to` ;
- compteurs provider invalides neutralises ;
- tests de tarification et de regression ajoutes.

Tests : backend 27/27, lint backend/frontend et build frontend OK.

Action demandee : relire et integrer ces correctifs avant de construire une surface frontend
de diagnostic. Les prix restent indicatifs et ne doivent pas alimenter billing ou marges.

---

## 2026-06-12 — open — Handoff prioritaire Local RAG BGE

MALEX dépose le dossier complet `MASTERFLOW_LOCAL_RAG_BGE_HANDOFF/`.

**À lire en premier et intégralement :**

`MASTERFLOW_LOCAL_RAG_BGE_HANDOFF/00_START_HERE_VINCENT.md`

Le pack propose un RAG local permissionné fondé sur BGE-M3, un reranker BGE et Qdrant,
sans remplacer SQLite, le canon lisible, Resource Truth, les permissions ni les validations
humaines.

Mission de ce tour :

1. auditer la compatibilité avec le backend réel et `CLAUDE.md` ;
2. cartographier les fichiers, types, variables, migrations, endpoints et tests concernés ;
3. comparer le contrat OpenAPI et le manifeste au registre d'actions réel ;
4. proposer le diff exact de la PR-1 `Capability Shell` ;
5. signaler toute contradiction ou dépendance risquée.

**Gate : audit et proposition uniquement.** Aucun service, index, téléchargement de modèle,
conteneur, endpoint, migration ou UI à implémenter avant validation humaine MALEX séparée.
Répondre dans Git selon le format demandé par `PROMPT_RELANCE_CLAUDE_CODE.md`.

---

## 2026-06-12 — open — Challenger la proposition packs et tarifs

MALEX dépose `PROPOSITION_PACKS_ET_TARIFS_ABONNEMENT.md`.

Demande : relire cette hypothèse commerciale à la lumière de tes audits et du futur suivi token,
puis répondre avec :

- coût mensuel réaliste par type d'usage ;
- marge et quotas soutenables ;
- risques techniques ou de sécurité ;
- distinction billing / pack / rôle / permission / feature flag ;
- recommandations de simplification ;
- éléments impossibles à promettre tant que le backend ne les expose pas.

**Audit uniquement.** Ne pas implémenter billing, quotas, endpoints, migrations, permissions ou
feature flags. Ne pas considérer les prix comme canoniques. Retour attendu dans Git pour décision
humaine MALEX.

---

## 2026-06-12 — answered — Auditer les workflows Vincent pour absorption MasterFlow

> **RÉPONSE Vincent (humaine), 2026-06-12 — pilote 3 projets livré.** Décision Vincent : faire d'abord
> un **pilote sur 3 projets** (`API_corrector`, `API_manage`, `vibe`) pour **calibrer le format** de la
> matrice, puis étendre aux ~17 autres sur GO. Livrable : **`AUDIT_ABSORPTION_PILOTE_3PROJETS.md`**
> (matrice sourcée par item, incompatibilités, améliorations, plan de PRs courtes). **Audit only, aucun
> code.** ⚠️ Le protocole d'entrée `PROTOCOLE_AUDIT_VINCENT_MASTERFLOW_A_LIRE_EN_PREMIER.md` est
> **introuvable en local** → compilé sur `CONTRACT_INDEX` + canon `05_BACKEND_REBUILD_SOURCE_TRUTH` +
> registre d'actions de `main` ; **à confirmer par MALEX** si un protocole canonique doit primer.
> Top absorptions valeur/risque : transport Tauri desktop↔remote (vibe), egress LLM gated
> (vibe+API_corrector), allowlist storage admin/privé (API_manage), garde-fous notation + `coherenceAudit`
> surfacé (prolonge couche 14). Incompat bloquantes : objets `classes/élèves` sans owner (retirés couche 13),
> CSP `default-src *` (vibe), tunnel QR brut, landing page-routing (anti-scope). **Retour pour validation
> humaine MALEX.** Détails dans `SYNC_THREAD_MALEX_VINCENT.md` (entrée 2026-06-12 pilote audit).

MALEX valide le lancement d'un **audit comparatif sans implementation**.

**Correction 2026-06-13 :** la demande ci-dessous est conservee comme historique, mais la lecture
directe du Drive canon par Vincent n'est plus la charge par defaut. Utiliser maintenant
`PROTOCOLE_VINCENT_FEATURE_OPPORTUNITY_CHECK.md` : Git embarque le canon utile, Vincent checke ses
propres features/projets/PRs/workflows et signale les besoins de canon manquant.

Contexte : tes projets contiennent deja beaucoup de workflows et de features potentiellement
utiles. Avant de poursuivre l'integration, ton systeme doit les comparer au MasterFlow canon pour
eviter doublons, incompatibilites, permissions contournees ou features tardivement recodees.

Action demandee :

1. Lire en premier les sources Git de coordination et d'absorption.
2. Utiliser les references canon deja embarquees dans Git ; demander un import canon si une
   source manque.
3. Inventorier les workflows reels de tes projets.
4. Mapper chaque workflow vers :
   owner MasterFlow, engine, contrats actifs, donnees/BDD, endpoints/toolcalls, permissions,
   preflight, validation humaine, audit, UI et tests.
5. Classer chaque item : `KEEP_AS_IS`, `ABSORB_AND_ADAPT`, `ADD_MISSING_CAPABILITY`,
   `IMPROVE_EXISTING_OWNER` ou `SKIP_OR_QUARANTINE`.
6. Retourner la matrice, les incompatibilites et un plan de PRs courtes dans Git.

**Interdit a ce stade :** coder, merger, migrer, deployer, ajouter un endpoint/engine ou modifier
permissions/perimetre. Le rapport doit revenir `answered` pour validation humaine MALEX.

Le but n'est pas de faire rentrer MasterFlow dans tes projets. Le but est d'utiliser MasterFlow
comme compilateur d'architecture pour absorber leur meilleure valeur sans casser son runtime.

---

## 2026-06-07 — done — IP directe joignable en ping, ports bruts time-out

> **RÉSOLU (Vincent, 2026-06-07).** Diagnostiqué côté host : `tcpdump` sur `tailscale0` = **0
> paquet** de l'IP MALEX (ses curls n'arrivaient pas), firewall **écarté** (`ts-input` accepte
> tout, `netcheck` host sain) → plan de données Tailscale KO entre le NAT FAI de MALEX et la box.
> **Décision humaine : bascule en Funnel PUBLIC** (`:8443` backend, `:10000` frontend) +
> durcissement secrets. Voir `SYNC_THREAD` « RÉSOLU pour de bon : bascule en Funnel PUBLIC ».

Push `070688e` reçu : on ne teste plus Tailscale Serve pour MALEX, mais l'IP tailnet directe.

Tests côté MALEX :

- `tailscale ping --timeout=10s 100.100.128.63`
  → `pong from profkrapu-ms-7971 (100.100.128.63) via 2.12.241.244:41641 in 22ms` ;
- `curl -sS --max-time 12 http://100.100.128.63:8000/health`
  → timeout ;
- `curl -I --max-time 12 http://100.100.128.63:5174/`
  → timeout ;
- `curl -i --max-time 12 http://100.100.128.63:5174/api/v1/personas`
  → timeout.

Conclusion : le chemin Tailscale est bien ouvert jusqu'à la machine, mais les ports bruts `8000`
et `5174` ne répondent pas depuis MALEX. Ce n'est plus DNS ni Serve ; il reste exposition des
services sur l'interface tailnet, firewall local, bind effectif, ou ACL de ports.

Action demandée à Vincent :

- vérifier que le backend écoute bien sur `0.0.0.0:8000` ou `100.100.128.63:8000` ;
- vérifier que Vite écoute bien sur `0.0.0.0:5174` ou `100.100.128.63:5174` ;
- vérifier firewall macOS / pf / éventuel filtre host ;
- tester depuis la machine host :
  - `curl http://100.100.128.63:8000/health` ;
  - `curl http://100.100.128.63:5174/` ;
  - `lsof -nP -iTCP:8000 -sTCP:LISTEN` ;
  - `lsof -nP -iTCP:5174 -sTCP:LISTEN`.

Punchline réseau :

> Le ping touche la hurtbox : `profkrapu-ms-7971` est bien dans le ring. Mais `8000` et `5174`
> ne prennent aucun hit. Là ce n'est plus le tunnel, c'est le bind ou le firewall qui campe.

---

## 2026-06-07 — done — Node-share vu, ports Serve toujours injoignables

> **RÉSOLU (Vincent, 2026-06-07).** Cause : Tailscale **Serve ne sert pas les nœuds partagés**
> (sharee). Tenté ensuite l'IP tailnet directe (échec aussi, cf. item ci-dessus) → bascule
> **Funnel PUBLIC**. ACL OK (MALEX dans le packet-filter), ce n'était ni l'ACL ni le DNS.

MALEX a bien récupéré le push `95faee7` annonçant le node-share réel de
`profkrapu-ms-7971` vers `malexcoulot@gmail.com` et la correction du chemin health en `/health`.

Tests relancés côté MALEX après reconnexion Tailscale macOS :

- VPN Tailscale : **Connected** ;
- DNS `profkrapu-ms-7971.tail8d8b1f.ts.net` : résout désormais vers `100.100.128.63`
  (plus vers les IP publiques) ;
- `curl -sS --max-time 12 https://profkrapu-ms-7971.tail8d8b1f.ts.net:8443/health`
  → timeout ;
- `curl -I --max-time 12 https://profkrapu-ms-7971.tail8d8b1f.ts.net:10000/`
  → timeout ;
- `curl -i --max-time 12 https://profkrapu-ms-7971.tail8d8b1f.ts.net:10000/api/v1/personas`
  → timeout.

Conclusion : le problème n'est plus le DNS public. Depuis MALEX, le node répond en DNS tailnet,
mais aucun des ports Serve annoncés ne répond.

Action demandée à Vincent :

- vérifier côté host `profkrapu-ms-7971` :
  - `tailscale status` ;
  - `tailscale serve status` ;
  - `curl http://localhost:8000/health` ;
  - `curl http://localhost:5174/` ;
- confirmer que les ACL autorisent `malexcoulot@gmail.com` à joindre les ports Serve `8443`
  et `10000` ;
- transmettre si besoin l'adresse Tailscale directe de la machine et/ou un test `tailscale ping`
  attendu depuis MALEX.

Punchline réseau :

> Le DNS a enfin choisi le bon stage (`100.100.128.63`), mais les ports sont encore en parry
> infini. Serve ou ACL garde la porte, pas le client MALEX.

---

## 2026-06-06 — answered — Feu vert backend pour test frontend couche 1

Demande : autoriser le lancement du backend pour tester uniquement l'intégration réelle :

- `POST /auth/login`
- `GET /context/current`

Contexte :

- branche : `codex/frontend-masterflow`
- frontend shell ajouté dans `apps/frontend`
- aucun backend modifié
- tests/lint/build OK

Commande backend attendue :

```bash
npm run dev
```

But du run : valider auth + context current avec le frontend MALEX minimal, pas lancer un run large.

### Réponse Vincent — 2026-06-06

**Feu vert accordé**, périmètre strict couche 1 : `POST /auth/login` + `GET /context/current`
uniquement (pas de run large, pas d'écriture canon). Le lancement effectif du backend
(`npm run dev`) est fait **par Vincent** (human in the loop) — il dira « clé tournée » dans le
fil de sync au moment du run. Détails + réponses aux 6 questions backend dans
`SYNC_THREAD_MALEX_VINCENT.md`.

> *Brouillon rédigé via Claude pour Vincent ; le lancement réel reste l'acte humain de Vincent.*
