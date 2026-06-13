# Sync thread — MALEX / Vincent / Codex

Objectif : garder les échanges de coordination dans Git, avec des messages courts, datés, actionnables et relus par les deux côtés.

Règles :

- une entrée = une demande ou une décision ;
- les décisions structurantes restent explicites ;
- une réponse IA n'est pas une validation humaine ;
- les demandes backend doivent préciser le périmètre exact du run ou de la modification ;
- les factories / bots extraits sont hors scope de cette version.
- avant toute reprise ou action structurante, chaque système doit checker `SUIVI.md`, ce fil, puis son inbox dédiée ;
- inbox Vincent : `INBOX_VINCENT.md` ;
- inbox MALEX/Codex : `INBOX_MALEX.md` si présent.

Règle inbox :

```txt
inbox non lue = contexte incomplet
message IA != validation humaine
demande structurante -> résumé impact -> patch minimal -> validation/consigne
```

---

## 2026-06-13 — MALEX/Codex vers Vincent : bridge Project/Scope deltas professeur

`TeacherDecisionDelta` porte maintenant un vrai `project_id`. Le professeur authentifie doit
etre l'auteur du delta, membre `editor+`, et son premier `context_ref` reprend le projet.

Admin/godmode peuvent superviser mais ne signent jamais a la place du professeur. Merci de
transmettre cette identite depuis tes surfaces et runners, et de conserver le delta comme trace
immutable ou source de candidat : aucune application directe sur score, rubrique ou methode.

---

## 2026-06-13 — MALEX/Codex vers Vincent : bridge Project/Scope OCR

`ocr_prepare` porte maintenant un vrai `project_id`.

Pour les copies pedagogiques, un teacher `editor+` peut creer et suivre le job uniquement depuis
un manifest valide du meme projet, du meme owner et avec la meme `validation_ref`.

Pour la morphologie, le job reste personnel : consentement, owner exact et membership projet.
Les teachers du projet n'obtiennent aucun acces a la photo ou au job par leur seul role.

Merci de conserver cette separation dans ton runner commun OCR et dans ses resultats.

---

## 2026-06-13 — MALEX/Codex vers Vincent : bridge Project/Scope calibration

Le diagnostic de cohorte est maintenant rattache au vrai projet. Batch, profil institutionnel,
runs et review doivent porter le meme `project_id`; les membres `editor+` peuvent produire et
lire le diagnostic.

Invariant inchangé : `diagnostic_delta_candidate` reste une information de review. Aucun score
n'est modifie, aucun seuil n'est franchi automatiquement et aucun item de qualite ne devient une
etiquette durable d'etudiant.

Merci de mapper tes anciennes fonctions de calibration vers ce diagnostic et de signaler toute
logique qui applique encore directement un delta.

---

## 2026-06-13 — MALEX/Codex vers Vincent : bridge Project/Scope feedback/export

Le bridge projet couvre maintenant `FeedbackDraft`, `CorrectionExportPreview` et
`export_prepare`.

Les teachers `editor+` du projet peuvent preparer et relire les brouillons, mais l'owner reste
le seul a valider le contenu pedagogique puis le package d'export. Admin/godmode gardent la
supervision sans se substituer a cette validation.

Merci de faire porter le meme `project_id` par tes futurs objets et de raccorder le renderer
uniquement derriere le job approuve. Le resultat doit rester prive et en review ; publication,
envoi et LMS restent hors de cette passe.

---

## 2026-06-13 — MALEX/Codex vers Vincent : bridge Project/Scope correction

Le bridge Project/Scope couvre maintenant rubriques, profils institutionnels, batches,
submissions, manifests, runs de pre-correction et `correction_prepare`.

Pour une nouvelle chaine projet, chaque objet et chaque preuve doivent porter le meme
`project_id`, avec `project_scope` identique pendant la transition. Un membre `editor+` peut
produire/lire le run et preparer le job ; le fallback sans `project_id` reste owner-only.

Merci de mapper tes objets correction existants vers cette chaine avant tout runner reel.
Feedback et export ne sont pas inclus dans cette passe et ne doivent pas etre consideres migres.

---

## 2026-06-13 — MALEX/Codex vers Vincent : bridge Project/Scope evidence/signaux

Le premier bridge des anciens `project_scope` vers les vrais projets est livre sur
`evidence_events` et `pedagogical_signals`.

Les nouveaux objets projet portent `project_id` et exigent membership reel. Durant la
transition, `project_scope` doit etre identique au `project_id`. Les anciens objets sans
`project_id` restent en fallback owner-only pour ne pas casser les historiques.

Merci de faire transmettre le vrai `project_id` par tes adapters OCR/WooClap/transcription/notes
prof, puis de proposer le mapping correction/batches/exports avant la prochaine migration.

---

## 2026-06-13 — MALEX/Codex vers Vincent : PR-7 RAG permissionne livre

Le shell `RAG permissionne` est livre.

Il ajoute manifestes ressources/chunks, context packs cites, query events hashes, filtrage
scope/owner avant scoring, refus sans source fiable, secret detection et revocation qui rend les
packs existants `stale`.

Le retrieval actuel est lexical et borne : il sert a valider le contrat sans faire semblant que
BGE/Qdrant est deja branche. Le point de raccord runner est le job `rag_reindex` existant.

Merci de brancher ton runtime BGE-M3/reranker/Qdrant derriere ce job, en conservant strictement
l'ordre permission -> statut/trust -> retrieval -> citations -> audit. L'index reste derive ;
Resource Truth reste l'autorite.

---

## 2026-06-13 — MALEX/Codex vers Vincent : PR-6 Guided Runtime prive livre

La premiere couche backend du `Guided Runtime prive` est livree.

Elle ajoute guides, sessions privees, participants, contributions, progression deterministe et
contradictions visibles. Les sessions figent `guide_version`, `target_schema_id` et
`target_schema_version`, donc un changement ulterieur du guide ou du template ne modifie pas
silencieusement une session existante.

Regle de raccord : MOTH/CDC et les futurs bots de collecte doivent consommer cette couche comme
atelier prive. `complete` ne publie rien, n'inscrit personne, n'envoie aucun email, ne cree aucun
devis, export, badge ou asset.

Merci de mapper tes collecteurs/CDC existants vers `guided_contributions` et
`structured_record`, puis de signaler les ecarts vraiment utiles avant de brancher LLM, public
link ou verticale Ours d'Or/devis.

---

## 2026-06-13 — MALEX/Codex vers Vincent : PR-5 Template Registry livree

La couche `Template / Schema Registry` est livree cote backend.

Elle ajoute la table `schema_templates`, les contrats partages, les routes auth
`GET/POST /schema-templates`, `GET /schema-templates/:id` et
`POST /schema-templates/:id/validate`, ainsi que quatre seeds candidats non canoniques :
CDC, devis, inscription event et manifest asset.

Regle de raccord : une session ou un objet consommateur doit figer `template_id + version`.
Un template `candidate` peut servir en atelier prive/test, mais pas en surface publique,
exportable ou partageable. Toute evolution de structure doit devenir une nouvelle version, pas
une modification silencieuse.

Merci de comparer tes schemas existants et de proposer uniquement les champs manquants
necessaires avant PR-6/MOTH ou devis/event.

---

## 2026-06-13 — MALEX/Codex vers Vincent : PR-4 Project/Scope livree

La couche `Project/Scope` est livree cote backend.

Elle ajoute les contrats et tables `projects`, `project_members`, `ownership_edges` et
`resource_scopes`, plus les routes auth `GET/POST /projects`, `GET /projects/:id` et
`GET/POST /projects/:id/members`.

Regle de raccord : les prochaines verticales doivent privilegier un `project_id` reel des qu'un
contexte projet/cours/event existe. Les ressources doivent etre attachees explicitement au projet
via `resource_scopes` avant d'etre consommees dans ce contexte. Un non-membre voit un 404, pas un
indice d'existence.

Merci de mapper tes objets classes/cours/sessions/batches vers ce socle avant d'activer runners,
correction ou exports.

---

## 2026-06-13 — MALEX/Codex vers Vincent : clôture fondations PR-1 à PR-9

Le rapport `FONDATIONS_PR1_PR9_CLOSURE_REPORT.md` est ajouté.

Clarification :

- PR-1 à PR-7 : packs/specs/recettes, à ne pas présenter comme live tant que le runtime réel
  n'est pas branché ;
- PR-8 : backend livré et renforcé jobs/runners ;
- PR-9 : backend livré workflow observability.

Avant prochaine intégration, merci de répondre avec l'axe proposé : Project/Scope réel, premier
runner réel, ou Guided Runtime privé. Toute proposition doit respecter preflight, validation,
owner/scope, refs only, claim/lease/heartbeat et workflow events sobres.

---

## 2026-06-13 — MALEX/Codex vers Vincent : PR-9 workflow observability prête

La passe fondation `PR-9 workflow_observability` est livrée.

Elle ajoute `WorkflowEvent`, la table `workflow_events`, le service interne
`recordWorkflowEvent`, les agrégats admin/godmode `GET /diagnostics/workflows` et le détail
`GET /diagnostics/workflows/:id`.

Merci de brancher les futurs workflows/runners en émettant des événements sobres : ids, type,
capability, statut, durée, coût/tokens nullable et blocker si utile. Aucun contenu métier brut,
message utilisateur, OCR, feedback ou export dans cette table.

---

## 2026-06-13 — MALEX/Codex vers Vincent : PR-C11 gates famille/type prête

La couche `SPEC_PR_C11_RUNNER_FAMILY_GATES.md` ajoute le mapping `job_type -> runner_family`.

`claimNextJob` refuse maintenant un runner dont la famille ne correspond pas au type demandé :
`ocr_prepare=ocr_multimodal`, `correction_prepare=correction`, `export_prepare=export`,
`asset_prepare=asset`, `rag_reindex=rag`, `resource_revoke=resource`.

Merci d'adapter tes heartbeats : pas de runner générique qui déclare tout, pas de mélange
OCR/correction/export dans un même runner. Si un orchestrateur multi-famille est nécessaire, il
doit être proposé comme couche séparée.

---

## 2026-06-13 — MALEX/Codex vers Vincent : PR-C10 gates de claim prête

La couche `SPEC_PR_C10_RUNNER_CLAIM_GATES.md` rend le heartbeat obligatoire avant claim.

`claimNextJob` refuse désormais les runners inconnus, `draining`, `offline`, stale ou non
compatibles avec le type demandé. Un runner doit donc déclarer `runner_id`, statut `online` et
`job_types` avant de prendre un job.

Merci d'adapter tes runners à ce flux : heartbeat online -> claim -> lease/progress ->
finalisation -> draining/offline à l'arrêt. Aucun runner spécialisé ne doit demander un type de
job qu'il n'a pas explicitement déclaré.

---

## 2026-06-13 — MALEX/Codex vers Vincent : PR-C9 heartbeats runners prête

La couche `SPEC_PR_C9_RUNNER_HEARTBEATS.md` ajoute l'identité et la santé internes des runners :

1. `recordRunnerHeartbeat` ;
2. `listClaimableRunnerHeartbeats(job_type)` ;
3. table `runner_heartbeats` ;
4. statuts `online`, `draining`, `offline`.

Merci de faire déclarer chaque runner avant claim : famille, types de jobs, version, lease et
job actif. `draining` ne prend plus de nouveau job ; `offline` sert aux arrêts propres. Pas de
secret ni contenu métier dans les heartbeats.

---

## 2026-06-13 — MALEX/Codex vers Vincent : PR-C8 claim/lease runners prête

La couche `SPEC_PR_C8_RUNNER_CLAIM_AND_LEASE.md` ajoute l'attribution sûre des jobs :

1. `claimNextJob(runner_id, types, lease_ms?)` ;
2. `extendJobLease(job_id, runner_id, lease_ms?)` ;
3. colonnes `runner_id`, `claimed_at`, `lease_expires_at` ;
4. reprise d'un job `running` seulement si son lease est expiré.

Merci de brancher tes runners sur ce flux : claim, progress avec le même `runner_id`, extension
du lease si nécessaire, puis finalisation PR-C7. Pas de polling SQL direct, pas d'écriture table,
pas de double consommation du même job.

---

## 2026-06-13 — MALEX/Codex vers Vincent : PR-C7 lifecycle runners prête

La couche `SPEC_PR_C7_RUNNER_JOB_LIFECYCLE.md` ajoute les sorties internes runner-only :

1. `markJobNeedsReview` pour les traitements sensibles à relire ;
2. `completeJob` pour les traitements sans review humaine supplémentaire ;
3. `failJob` pour les erreurs lisibles et retryables.

Merci de brancher tes runners via ces services uniquement. Pas d'écriture SQL directe dans
`jobs`/`job_events`. Pour `ocr_prepare`, `correction_prepare` et `export_prepare`, la sortie
normale attendue reste `needs_review` avec artefact privé, pas `completed` automatique.

---

## 2026-06-13 — MALEX/Codex vers Vincent : PR-C6 handoffs jobs prête

La couche `SPEC_PR_C6_CORRECTION_EXPORT_JOB_HANDOFFS.md` crée maintenant les intentions
`correction_prepare` et `export_prepare` uniquement depuis des objets validés :

1. manifest pré-correction `validated` + `validation_ref` pour correction ;
2. preview export `approved_for_export` + `validation_ref` pour export.

Création owner-only professeur, supervision admin/godmode en lecture, aucune route publique de
création arbitraire. Merci de brancher tes runners exclusivement sur ces jobs `queued`, avec
progression monotone, cancel/retry, sortie en `needs_review` et zéro publication implicite.

---

## 2026-06-13 — MALEX/Codex vers Vincent : PR-C5 feedback/exports prête

La couche `SPEC_PR_C5_FEEDBACK_AND_EXPORT_PREVIEWS.md` sépare désormais :

1. le feedback student-safe structuré, validé par l'owner professeur ;
2. la preview privée `CSV/XLSX/PDF/report`, validée comme package d'export.

Même approuvée, une preview garde `publication_allowed = false` et ne crée aucun job ni fichier
final. Merci de comparer tes feedbacks, règles d'unicité et exports P1–P4, puis de proposer les
écarts utiles avant tout raccord `export_prepare`.

---

## 2026-06-13 — MALEX/Codex vers Vincent : PR-C4 calibration/quality review prête

La couche `SPEC_PR_C4_CALIBRATION_AND_QUALITY_REVIEW.md` produit désormais un diagnostic
institutionnel borné et un échantillon de relecture ciblé. Le delta candidat vise uniquement le
bord de la bande attendue, respecte `max_global_delta`, signale les seuils protégés et n'est
jamais appliqué. Moins de trois copies donne `insufficient_data`.

Merci de comparer ce contrat à `coherenceAudit`, aux cas meilleurs/faibles/limites et aux
contrôles historiques de tes pipelines. Réponse attendue : écarts utiles seulement, sans note
finale, règle de sujet ou validation automatique.

---

## 2026-06-13 — MALEX/Codex vers Vincent : PR-C3 pré-correction explicable prête

La couche `SPEC_PR_C3_PRE_CORRECTION_EXPLICABLE.md` persiste maintenant un scoring brouillon
strictement par critère, avec preuves, confiance et version de méthode. Elle exige manifest et
rubrique validés, aligne tous les scopes et termine exclusivement en `needs_review`.

Merci de comparer ce contrat à ton `scoring_trace` P1–P4 et de proposer uniquement le raccord
runner minimal. Aucun total final, calibration, feedback ou endpoint public ne doit entrer dans
cette tranche.

---

## 2026-06-13 — MALEX/Codex vers Vincent : PR-C2 jobs OCR prête

Le shell jobs OCR est livré dans `SPEC_PR_C2_OCR_INGESTION_AND_JOBS_SHELL.md`.

Il crée uniquement des intentions `ocr_prepare` internes et observables. Aucun runner n'est
branché et aucune route publique ne peut créer un job arbitraire. Merci de proposer le connecteur
minimal de ton OCR derrière ce contrat, avec progression, cancel, erreurs et sortie
`needs_review`.

---

## 2026-06-13 — MALEX/Codex vers Vincent : PR-C1 prête à challenger

Les objets versionnés de correction sont posés dans
`SPEC_PR_C1_RUBRICS_GRADING_BATCHES_MANIFESTS.md`.

Merci de comparer ta correction sheet YAML, tes batches et manifests P1–P4 avec les contrats.
Réponse attendue : champs manquants réellement nécessaires et mapping vers PR-C2 ingestion/jobs.
Aucun score, feedback ou pipeline ne doit être ajouté à cette tranche.

---

## 2026-06-13 — MALEX/Codex vers Vincent : absorption du socle OCR commun

MALEX confirme qu'on garde ton protocole OCR et qu'on l'étend au-delà de Corrector.

Architecture décidée : un runner `ocr_multimodal` commun, plusieurs adapters métier séparés.
L'adapter morphologique privé est maintenant déclaré conformément au canon Drive. Merci
d'inventorier les composants réutilisables et de proposer un découplage court, sans activation
publique. Détails : `DECISION_ABSORPTION_OCR_COMMUN_ET_ADAPTER_MORPHOLOGIQUE.md`.

---

## 2026-06-13 — MALEX/Codex vers Vincent : PR-C0 appliquée

Corrector est désormais déprécié sans destruction. Il reste lisible pour les références et
blends historiques, mais n'est plus sélectionnable, activable ou utilisable dans un nouveau
blend. Voir `SPEC_PR_C0_DEPRECATION_NON_DESTRUCTIVE_CORRECTOR.md`.

La prochaine contribution attendue côté Vincent est le mapping concret de ses objets vers PR-C1 :
rubriques, profils institutionnels, batches et manifests, sans dépendance au persona historique.

---

## 2026-06-13 — MALEX/Codex vers Vincent : PR-CB2 prête à challenger

Le runner LLM applique désormais le profil validé de chaque tâche et bloque tout egress hors
allowlist. Détails dans `SPEC_TASK_AWARE_MODEL_ROUTING_AND_EGRESS_PR_CB2.md`.

Cette tranche reste volontairement mono-provider : elle valide la configuration active, mais ne
simule pas plusieurs credentials ni un fallback automatique. Merci de comparer avec les gates
`API_corrector` / `vibe` et de signaler les protections ou contraintes opérationnelles à absorber.

---

## 2026-06-13 — MALEX/Codex vers Vincent : PR-CB1 prête à challenger

Le registre read-only des adapters pédagogiques est posé dans
`SPEC_ADAPTER_REGISTRY_PR_CB1.md`.

Il déclare OCR, WooClap, transcription et note professeur avec owner, entrées, sortie de preuve,
privacy, risque, rôle minimal, statut runtime/UI et limitations. Aucun import n'est exposé et
aucun runner n'est présenté comme live.

Merci de comparer les déclarations à tes implémentations existantes et de répondre avec les
écarts concrets. Toute proposition d'activation devra préciser Project/Scope, jobs, stockage,
permission, preflight, tests et recette.

---

## 2026-06-13 — MALEX/Codex vers Vincent : pont canon et PR-CB0

Vincent,

MALEX demande qu'on absorbe maintenant les ponts evidents entre son canon et tes features, sans
attendre la fin du chantier Corrector.

Le check canon est fait. Lis :

- `BRIDGE_CANON_FEATURES_VINCENT_CORRECTION_PEDAGOGIE.md`
- `SPEC_PEDAGOGICAL_EVIDENCE_SIGNAL_AND_TEACHER_DELTA.md`

Conclusion : les engines existaient deja. Tes projets apportent surtout les implementations
terrain qui permettent enfin de les cabler. On prepare donc un socle commun :

```text
evidence normalisee
-> signal prudent
-> candidate
-> decision professeur
-> delta auditable
-> enrichissement candidat
```

Ce socle rend reutilisables OCR, WooClap, corrections, transcriptions, progression, evolution de
sujets et routing de modeles. Il sert ensuite correction, cours, MOTH/CDC, Ours d'Or, devis et
LMS, sans engines paralleles.

Les schemas partages PR-CB0 et leurs premiers tests sont deja poses par MALEX/Codex. Action :
les relire, puis proposer migrations, permissions internes, events et tests backend
complementaires. Pas de route d'ecriture publique, pas de note, pas de profil automatique et
aucune capability `live` dans cette PR.

---

## 2026-06-13 — MALEX/Codex : correction protocole Vincent features/canon

Vincent,

Correction importante de MALEX : on ne te demande pas de checker directement le Drive canon par
defaut.

Le canon utile doit etre embarque dans Git par MALEX/Codex. Ton systeme doit surtout checker :

1. les specs/handoffs/checklists Git ;
2. tes propres features/projets/branches/PRs/workflows deja crees ;
3. les audits d'absorption existants ;
4. les opportunites a forte valeur/faible risque ;
5. les doublons, incompatibilites et besoins de canon manquant.

Nouveau protocole : `PROTOCOLE_VINCENT_FEATURE_OPPORTUNITY_CHECK.md`.

Si une reference canon manque dans Git, tu le signales. Codex/MALEX l'importe ou la resume dans
Git avant implementation. Le but est double : ne rien perdre du canon, et ne rien perdre de ce que
tu as deja construit.

---

## 2026-06-13 — MALEX/Codex : precision multi-personas pedagogiques

Vincent,

Precision importante sur la couche persona : on part sur une logique type RPG pedagogique.

Correction importante : ce n'est pas une invention nouvelle. C'est deja present dans le canon
MasterFlow via `PERSONAL_PERSONA_ASSIGNMENT_AND_CHATBOT_CONTRACT`,
`CONDITIONAL_SUB_PERSONA_RUNTIME_AND_CLASS_INSTANCE_CONTRACT`, `PERSONA_RUNTIME_SYSTEM` et
`CONVERSATION_SURFACE_AND_SPEAKER_ROUTING_CONTRACT`. Le message sert a le rendre explicite dans
le backend Git.

L'utilisateur garde son persona principal. Une activite peut ajouter des personas contextuels :
persona du prof qui assigne le sujet, methode, jury, expert, contradicteur, MOTH en check CDC,
Incubator en check Ours d'Or.

Par defaut, 1 a 3 personas contextuels maximum. Un orchestrateur choisit les voix utiles ; tous
les personas ne doivent pas parler a chaque tour. Chaque message doit identifier sa voix si
plusieurs personas sont actifs.

But : croiser methodes, graphs pedagogiques et ressources, pas creer un chat de carnaval. Et
comme toujours : persona/bot/lore ne donne aucun droit.

---

## 2026-06-13 — MALEX/Codex : persona utilisateur + pack PR-8 jobs

Vincent,

Decision MALEX a integrer : `DECISION_PERSONA_USER_ET_BOTS_CONTEXTUELS.md`.

MOTH n'est pas le persona par defaut de tous les users. Chaque utilisateur peut avoir son persona
personnel pour l'accompagnement general ; MOTH et les autres bots sont des guides contextuels
assignes a une activite, classe, projet, event ou tunnel. Persona, bot et lore ne donnent jamais
de droits : permission_runtime reste le seul arbitre.

J'ai aussi prepare PR-8 :

- `HANDOFF_VINCENT_PR8_JOBS_QUEUES_RUNNERS.md`
- `CHECKLIST_PR8_JOBS_QUEUES_RUNNERS.md`
- `RECETTE_PR8_JOBS_QUEUES_RUNNERS.md`

But : jobs owner/scope, progress, cancel/retry, audit et gates. Pas de runner appele directement
depuis l'UI, pas de payload secret, pas de bouton magique qui lance un Tatsumaki en prod.

---

## 2026-06-13 — MALEX/Codex : pack PR-7 RAG permissionne

Vincent,

J'ai prepare le paquet PR-7 :

- `HANDOFF_VINCENT_PR7_RAG_PERMISSIONNE.md`
- `CHECKLIST_PR7_RAG_PERMISSIONNE.md`
- `RECETTE_PR7_RAG_PERMISSIONNE_DETAILLEE.md`

Objectif : un RAG qui retrouve des sources autorisees, construit des context packs cites et
refuse proprement quand la source manque. Permission avant retrieval, statut/trust avant
contexte, revoke pris en compte.

Pas d'index massif du Drive, pas de secrets, pas de reponse non citee, pas de diagnostic visible
hors admin/godmode. Si PR-8 jobs n'est pas encore la, garde un reindex borne ou un statut
compatible.

Le RAG n'est pas le lore omniscient : c'est le frame data. S'il n'a pas la source, il bloque.

---

## 2026-06-13 — MALEX/Codex : pack PR-6 guided runtime prive

Vincent,

J'ai prepare le paquet PR-6 :

- `HANDOFF_VINCENT_PR6_GUIDED_RUNTIME.md`
- `CHECKLIST_PR6_GUIDED_RUNTIME.md`
- `RECETTE_PR6_GUIDED_RUNTIME_DEPENDENCIES.md`

L'objectif est de cadrer MOTH/CDC comme runtime guide prive : guide draft, session authentifiee,
contributions sourcees, progression deterministe, contradictions visibles, `complete` sans effet
externe.

Si PR-4/PR-5 sont merges, PR-6 doit consommer project/scope et template/schema. Sinon, garde les
champs de compatibilite (`owner_id`, `target_schema_id`, version) pour ne pas peindre le backend
dans un coin.

Pas de public, pas d'email, pas de devis, pas de badge, pas d'event, pas de LLM obligatoire. MOTH
peut avoir le flowchart d'un boss de training mode, mais pas lancer le World Tour tout seul.

---

## 2026-06-13 — MALEX/Codex : pack PR-4/PR-5 scope/templates

Vincent,

J'ai prepare le paquet suivant :

- `HANDOFF_VINCENT_PR4_PR5_SCOPE_TEMPLATES.md`
- `CHECKLIST_PR4_PROJECT_SCOPE_OWNERSHIP.md`
- `CHECKLIST_PR5_TEMPLATE_SCHEMA_REGISTRY.md`
- `RECETTE_PROJECT_SCOPE_TEMPLATES.md`

Objectif : poser project/scope/ownership puis template/schema registry. Tant qu'on n'a pas ca,
MOTH/CDC, Ours d'Or, devis, event, cours, DA/assets et RAG risquent de rejouer chacun leur petit
systeme de droits et de schemas.

PR-4 avant PR-5 de preference. Challenge l'ordre si ton backend impose mieux, mais garde les PRs
courtes et testables.

Pas de Hadoken dans le vide : owner, scope, statut, schema, puis seulement apres on met les coups
speciaux.

---

## 2026-06-13 — MALEX/Codex : pack PR-2/PR-3 capability/status

Vincent,

J'ai prepare le chantier suivant apres `autonomy_step1_shell` :

- `HANDOFF_VINCENT_PR2_PR3_CAPABILITY_STATUS.md`
- `CHECKLIST_PR2_CAPABILITY_REGISTRY.md`
- `CHECKLIST_PR3_STATUS_TAXONOMY.md`
- `RECETTE_CAPABILITY_STATUS.md`

L'objectif est simple : aucune feature live sans endpoint/test/recette, aucune UI actionable
sur du futur, aucun statut canon pris pour une implementation.

---

## 2026-06-13 — MALEX/Codex : big chantier backend fondations

Vincent,

On te laisse un pack de nuit pour attaquer proprement les fondations :

- `HANDOFF_VINCENT_BIG_CHANTIER_FONDATIONS_2026-06-13.md`
- `PROTOCOLE_REVUE_PRS_VINCENT.md`
- `CHECKLIST_PR1_AUTONOMY_STEP1.md`

Le chantier commence par `autonomy_step1_shell`. Objectif : observer, preparer, proposer ;
aucune execution sensible, aucun patch auto, aucun connecteur puissant.

Soit tu reponds avec le diff exact, soit tu livres une branche courte PR-1 avec tests.

---

## 2026-06-13 — MALEX/Codex : matrice features vs fondations

Vincent,

J'ai ajoute `MATRICE_FEATURES_VS_FONDATIONS_MASTERFLOW.md`. Elle relie les verticales produit
aux fondations backend : autonomie, registry, statuts, scopes, templates, RAG, jobs,
observabilite et recettes.

But : eviter de lancer Ours d'Or, devis, DA/assets ou correction avant les dependances qui les
rendent sûrs et testables. Challenge l'ordre si ton backend a deja certaines briques.

---

## 2026-06-13 — MALEX/Codex : pack specs fondations post-audit

Vincent,

J'ai deroule le pack de cadrage complet pour les fondations post-audit : recette autonomie,
capability registry, taxonomie statuts, project/scope, template registry, recette RAG, jobs,
observabilite workflow et plan de PRs.

Le fichier d'ordre est `PLAN_PRS_FONDATIONS_MASTERFLOW.md`. Utilise-le comme proposition de
roadmap, pas comme ordre aveugle : challenge les dependances et renvoie le diff backend exact
PR par PR.

---

## 2026-06-13 — MALEX/Codex : spec autonomy_step1_shell

Vincent,

J'ai pose `SPEC_AUTONOMY_STEP1_SHELL.md`. C'est la premiere brique autonome, volontairement
bornee : runs, findings, improvement candidates et decision queue.

Elle doit lire et diagnostiquer, pas agir. Les checks PR-1 restent read-only sur sync, inbox,
recettes, registry et coherence canon/Git. Aucun connecteur puissant, aucun patch auto, aucun
secret, aucune execution sensible.

Retour attendu : diff backend exact, migrations, routes admin+, tests et tout conflit avec ton
plan de PRs.

---

## 2026-06-13 — MALEX/Codex : autonomie encadree avant connecteurs

Vincent,

Correction importante du plan post-audit : les connecteurs/plugins ne sont pas la step 1.
MALEX veut d'abord un systeme autonome encadre : observer, preparer, proposer, mais ne jamais
executer une action sensible seul.

`MASTERFLOW_POST_AUDIT_FOUNDATION_UPGRADES.md` est mis a jour avec `F0 — Autonomie encadree
step 1`, incluant `autonomy_runs`, `autonomy_findings`, `improvement_candidates` et
`decision_queue`.

Prochaine sequence proposee : autonomy shell, capability registry/statuts, scopes, templates,
RAG permissionne, jobs, observabilite. Connecteurs puissants plus tard.

---

## 2026-06-12 — MALEX/Codex : fondations post-audit

Vincent,

On a transforme l'audit complet en document de fondations :
`MASTERFLOW_POST_AUDIT_FOUNDATION_UPGRADES.md`.

Le point important : il ne faut pas empiler les features. Les multiplicateurs a poser sont
Capability Registry, statuts normalises, project/scope/ownership, RAG permissionne, jobs,
template registry, tool gateway, observabilite workflow et recettes systematiques.

Utilise-le pour proposer l'ordre de PRs courtes cote backend. Le but est que MOTH/CDC, Ours d'Or,
devis, DA, assets et correction consomment les memes fondations au lieu de creer des chemins
paralleles.

---

## 2026-06-12 — MALEX/Codex : recette UI post-PR-1 Guided Runtime

Vincent,

J'ai ajoute `RECETTE_UI_PR1_GUIDED_RUNTIME.md`. Ce n'est pas une demande UI pour toi, mais une
contrainte de surface : ta PR-1 doit exposer assez proprement guide/session/progression/question/
contradictions pour que le frontend ne soit pas force de simuler.

Regle : l'atelier MOTH/CDC consommera le backend reel ou affichera un etat vide. Aucun objet
fictif, aucun bouton public/export/email actif, aucun `complete` transforme en publication.

---

## 2026-06-12 — MALEX/Codex : recette PR-1 Guided Runtime

Vincent,

Le banc d'essai de la PR-1 MOTH/CDC est pose dans `RECETTE_PR1_GUIDED_RUNTIME.md`.

Il contient les payloads de reference, les scenarios A1-A12, les tests minimum et les criteres
de refus immediat. Cette recette doit etre utilisee avant ton push : elle valide le runtime prive
authentifie, pas une UI ni un bot public.

Si ton implementation change un nom de route ou de champ, ajoute une table d'equivalence. Les
garanties ne bougent pas : owner/participant, guide versionne, progression deterministe, audit,
pas de publication ni d'export via `complete`.

---

## 2026-06-12 — MALEX : validation graduee, pas double validation partout

Vincent,

MALEX valide ton point : la double validation systematique rendrait MasterFlow trop lourd. On
adopte une politique graduee, documentee dans `POLITIQUE_VALIDATION_GRADUEE.md`.

Principe : permission toujours, preflight selon l'action, validation humaine seulement quand le
risque, l'effet externe, le scope ou l'irreversibilite le justifie. Les actions critiques gardent
une validation renforcee.

Pour PR-1 MOTH/CDC : drafts, sessions privees, contributions et progression interne ne doivent
pas demander deux validations. Publication, public, email, event, devis, asset, export et settings
globaux restent gates par validation humaine.

Moins de menus de confirmation, plus de frame data propre. On garde le parry pour les vrais coups
dangereux, pas pour marcher dans la room.

---

## 2026-06-12 — MALEX : GO humain PR-1 Guided Runtime prive

Vincent,

MALEX confirme MOTH/CDC comme premiere verticale de preuve, non parce qu'elle serait la feature
la plus importante, mais parce qu'elle force ensemble guidance, personas, permissions, sessions,
progression, audit et UI fondee sur le reel.

GO humain donne pour la PR-1 privee de `SPEC_BOT_STUDIO_GUIDED_RUNTIME.md`. Les six arbitrages
sont fixes dans `INBOX_VINCENT.md` : owner `GUIDANCE_ENGINE`, guide owner user, authentifie
uniquement, teacher autorise en draft prive, retention 30/90 jours, template CDC candidat.

Commence par confirmer le diff exact contre ton backend, puis implemente la tranche bornee avec
migration et tests. Aucun public, LLM, email, devis, event, asset, publication ou UI finale.

MOTH entre en training room pour tester les fondamentaux. Pas de World Tour tant que les scopes,
la progression et l'audit n'ont pas leurs confirms.

---

## 2026-06-12 — MALEX/Codex : audit exhaustif de MasterFlow complet

Vincent,

Correction de portee importante : le rapport precedent mesurait le noyau actif, pas tout
MasterFlow. L'audit exhaustif du Drive est maintenant disponible dans
`AUDIT_MASTERFLOW_COMPLET_CANON_VS_GITHUB_2026-06-12.md`, avec l'inventaire reproductible
`AUDIT_MASTERFLOW_CANON_INVENTORY.json`.

Le scan couvre 4 508 fichiers, dont 791 dans le corpus fonctionnel primaire. Apres normalisation,
0/41 famille est complete, 11/41 ont une tranche executable partielle et la couverture globale
prudente est estimee a 10-13 %. Les factories sont inventoriees mais restent hors scope backend.

Lis en priorite les sections 4, 7, 8 et 9. Pour ce tour : revue et contradiction factuelle
uniquement. Indique tout runtime deja code ailleurs qui changerait un statut, avec chemin et test.
Aucune nouvelle implementation sans GO MALEX.

Le canon a deja le roster complet. Le backend n'a pour l'instant selectionne qu'une petite equipe :
on branche les fondations avant de lancer tout le monde en ranked.

---

## 2026-06-12 — MALEX/Codex : audit profond canon vs GitHub

Vincent,

Nous avons compare le canon actif au code reel, owner par owner, puis verifie BDD, API, shared,
frontend et tests. Rapport : `AUDIT_PROFOND_CANON_VS_GITHUB_2026-06-12.md`.

Verdict prudent : 0/19 owner complet, 8/19 avec une tranche de code executable, couverture fonctionnelle
estimee entre 15 et 20 %. Le socle est propre, mais projets, scopes, jobs, assets, domaines metier
et runner ne sont pas encore la.

Relis surtout les ecarts P0 et signale ce que ton backend aurait deja implemente ailleurs. Pour ce
tour, revue seulement : aucun nouveau chantier ne part sans priorisation commune et GO MALEX.

---

## 2026-06-12 — MALEX/Codex : PR-0 Bot Studio / Guided Runtime

Vincent,

L'audit global du canon confirme que le bot MOTH/CDC, l'inscription Ours d'Or, le devis guide
et le builder de bots reposent sur les memes briques. Nous avons consolide leur assemblage dans
`SPEC_BOT_STUDIO_GUIDED_RUNTIME.md`.

Decision d'architecture : pas de super-engine. Le runtime compose guide, persona fonctionnelle,
persona lore, engine metier, UI manifest, permissions, action/preflight, Resource Truth,
analytics et opportunity detector.

Pour ce tour, audite la spec, reponds aux six questions ouvertes et propose le diff exact de la
PR-1 privee/authentifiee. Ne code rien avant le prochain GO MALEX.

Le premier round sert a cabler les regles du matchup. Aucun bouton public ne part en ranked
avant que permissions, consentements et tests aient leur frame data.

---

## 2026-06-12 — MALEX/Codex : gamme materielle Local RAG BGE

Vincent,

Pour BGE-M3 + `bge-reranker-v2-m3` + Qdrant, notre palier conseille est :

```text
RTX 4060 Ti 16 Go
CPU 8-12 coeurs
64 Go RAM
NVMe 1-2 To
```

CPU 8 coeurs / 32 Go RAM suffit pour un PoC lent. Une RTX 4070 Ti Super ou 4080
16 Go apporte davantage de confort ; RTX 4090 24 Go + 128 Go RAM vise la charge lourde.
Une carte 8 Go est trop serree hors petits batchs et chargement sequentiel.

Demarrage prudent : chunks 512-1024 tokens, batch 4-8, 20 candidats puis reranking vers 6.
Le choix final doit suivre un benchmark du corpus pilote, pas la seule fiche technique.

---

## 2026-06-12 — MALEX/Codex : audit PR-1 token tracking

Vincent,

L'audit de `1b08b38` est termine. Le gate admin/godmode et la surface read-only sont bons.
Nous avons corrige l'index composite ambigu, les periodes invalides et les compteurs provider
corrompus, puis ajoute les tests de tarification.

Rapport : `AUDIT_PR1_TOKEN_TRACKING.md`. Branche : `codex/frontend-masterflow`.
Checks : backend 27/27, lint backend/frontend et build frontend OK.

Point important : `cost_eur` reste une estimation d'observabilite. Ne pas l'utiliser pour
billing ou calcul de marge avant versionnement des prix. Les streams interrompus restent un
chantier de telemetrie separe.

---

## 2026-06-12 — MALEX/Codex : handoff prioritaire Local RAG BGE

Vincent,

MALEX dépose `MASTERFLOW_LOCAL_RAG_BGE_HANDOFF/`. Commence impérativement par
`00_START_HERE_VINCENT.md`, puis suis l'ordre de lecture indiqué.

Le cap : retrieval local BGE-M3 + reranker BGE + Qdrant, sous orchestration MasterFlow.
SQLite reste l'état vivant, le canon reste lisible, les permissions précèdent toute recherche,
et un hit vectoriel ne devient jamais une vérité par lui-même.

Pour ce tour, rends uniquement l'audit de compatibilité et la proposition exacte de PR-1
`Capability Shell`, au format de `PROMPT_RELANCE_CLAUDE_CODE.md`. Aucun code, conteneur,
modèle, endpoint, migration ou UI avant un GO humain séparé de MALEX.

> Le RAG peut chercher le matchup. Il ne tient ni la manette, ni le règlement du tournoi.

---

## 2026-06-12 — MALEX : GO humain sur PR-2 global settings

Vincent,

MALEX valide l'implémentation de la PR-2 selon `SPEC_PR_PRIORITAIRES.md`.

Périmètre : `set_global_setting` comme action sensible, permission check, preflight,
validation humaine admin, allowlist des clés, secrets hors BDD, audit et tests du cycle
complet. Pas de nouvel engine, de billing, d'élargissement des rôles ni de refactor global.

Dépose le résultat dans Git pour revue avant de construire la surface frontend associée.

---

## 2026-06-12 — MALEX : GO humain confirmé sur PR-1

Vincent,

MALEX valide directement avec toi la PR-1 déjà livrée au commit `1b08b38` :
suivi token réel, coût, granularité par tâche et endpoint diagnostic gated admin/godmode.
Le commit est approuvé et conservé sur `main`.

Ce message porte uniquement sur la PR-1 ; la PR-2 dispose désormais de son GO humain séparé
dans l'entrée ci-dessus.

---

## 2026-06-12 — MALEX/Codex : proposition packs et tarifs à challenger

Vincent,

Une première hypothèse d'abonnements est déposée dans
`PROPOSITION_PACKS_ET_TARIFS_ABONNEMENT.md`.

Elle couvre Student, Student Pro, Teacher, Studio/Creator, School/Campus et White Label.
Godmode/Owner Ops reste non commercialisable. La grille sépare volontairement :

```txt
pack commercial | rôle | permission | quota | validation humaine
```

Ta mission dans ce tour : challenger les coûts et limites avec les enseignements de tes projets
et la future instrumentation `token_events`. Pas de billing à coder et aucun GO implicite sur
tes deux PRs prioritaires.

Retour attendu : coûts réalistes, marges, quotas, risques, simplifications et promesses à retirer
tant qu'elles ne sont pas supportées par le backend.

> On fixe d'abord le prix du round et le nombre de barres d'EX. On ne vend pas un infinite combo
> avant d'avoir mesuré les tokens.

---

## 2026-06-12 — Vincent : audit absorption — périmètre resserré (2 features prioritaires)

MALEX,

> **Audit d'absorption — périmètre resserré par Vincent : 2 features prioritaires.**
>
> 1. **Console admin API_manage** → `ABSORB_AND_ADAPT` sur `permission_runtime` / `ADMIN_PERMISSION_COCKPIT`
>    + admin drawer `ui_room_os`. Le modèle `global_settings` (admin-write) vs `user_storage` (privé) mappe
>    direct sur « données privées par défaut » + `PERMISSION > PREFERENCE`. Écriture settings globaux =
>    **action sensible** (preflight → validation + audit).
> 2. **Suivi token** (API_manage + API_corrector) → `IMPROVE_EXISTING_OWNER` *(reclassé après vérif `main`,*
>    *cf. note ci-dessous)*. Câbler sur le service LLM → consommer le `usage` réel, granularité par tâche,
>    `cost_eur`, + **endpoint gated** projeté godmode/admin (cohérent Q6). Diagnostic privé, jamais teacher/student.
>
> Les deux sont implémentables sans nouvel engine (1 = câblage neuf sur table existante derrière le cycle
> d'action sensible, 2 = patch du service `llm` + endpoint gated rattaché à `godmode_debug_runtime` + audit).
> **Audit only, aucun code avant ta validation humaine.**

**Note (vérif contre `main`, transparence)** : la feature #2 était d'abord cadrée `ADD_MISSING_CAPABILITY`.
Vérification du code réel : la table **`token_events` existe déjà** (`apps/backend/src/db/schema.ts:178-189`)
et est **écrite à chaque appel LLM** (`services/llm.ts:54-84`) — d'où le reclassement en `IMPROVE`. Ce qui
manque vraiment : `usage` provider réel (aujourd'hui estimé, `llm.ts:43`), tâche (figée `'chat'`), coût, et
endpoint de lecture gated. Côté feature #1, la table **`global_settings` existe aussi** (`schema.ts:169-176`)
mais **sans aucun endpoint** → ardoise vierge, l'écriture devra impérativement passer par le cycle d'action
sensible (pas un PUT direct). Détail : `AUDIT_ABSORPTION_PILOTE_3PROJETS.md` § « Vérifs contre `main` ».

Garde-fous tenus : godmode-only, jamais teacher/student ; surface diagnostic **privée par défaut**,
auditable, **sans effet sur le runtime user**. Proposition `open` dans `INBOX_MALEX.md` — elle attend ta
**validation humaine explicite** avant tout code.

---

## 2026-06-12 — Vincent : audit d'absorption — PILOTE 3 projets livré

MALEX,

Reçu le gate. Décision Vincent (humaine) : **pilote 3 projets d'abord** pour caler le format, puis
extension aux ~17 autres sur GO explicite. Tour **audit only**, zéro code.

**Livrable : `AUDIT_ABSORPTION_PILOTE_3PROJETS.md`** — `API_corrector`, `API_manage`, `vibe`.
Matrice sourcée (chaque item cite `fichier`/`fichier:ligne`), classement + statut canonique par workflow,
incompatibilités, améliorations, plan de PRs courtes.

⚠️ **Protocole d'entrée introuvable** : `PROTOCOLE_AUDIT_VINCENT_MASTERFLOW_A_LIRE_EN_PREMIER.md` n'est pas
en local (ni `~/Documents/MALEX/` ni ailleurs). Compilé sur `CONTRACT_INDEX` (13 owners) +
`05_BACKEND_REBUILD_SOURCE_TRUTH/01_CORE/MASTERFLOW_ACTIVE_CONTRACT_INDEX.md` + le registre d'actions réel
de `main`. **Si un protocole canonique doit primer, pousse-le (Drive/Git) et je recale.**

Ce qui ressort :
- **Top absorptions valeur/risque** : (1) transport desktop↔remote `vibe/lib/transport.ts` → débloque
  `apps/desktop` Tauri ; (2) egress LLM gated (`vibe` `/api/albert` clé serveur+strip headers, `API_corrector`
  proxy **allowlisté anti-SSRF** — fausse alerte « relais ouvert » levée) ; (3) storage allowlist
  admin/privé `API_manage` = invariant « données privées par défaut » ; (4) garde-fous notation +
  `coherenceAudit` **calculé mais invisible** (`API_corrector`) → prolonge directement ta **couche 14**.
- **Incompat bloquantes** : objets `classes/élèves` sans owner backend (= ceux retirés en couche 13,
  anti-hallucination) ; CSP `default-src *` (`vibe`) ; tunnel QR brut ; landing page-routing (anti-scope MVP).
- **Doublon notable** : la correction OCR→barème→correction existe en double (`API_corrector` ET module
  corrector de `vibe`) → un seul owner `correction_engine`, ne pas recoder 2×.
- **PRs proposées A→E** = faible risque / fort alignement (egress llm, storage allowlist, shell Tauri,
  audit étendu, CSRF). **F (correction_engine) + classes/élèves + multi-user = `BLOCKED_BY_HUMAN_VALIDATION`.**

Rien n'est codé : **rapport pour ta validation humaine**. Dis-moi (a) si tu valides le format, (b) si
j'étends aux 17 restants, (c) si un protocole canonique doit primer.

Punchline de cadrage :

> Tes workflows ont des frames qui matchent déjà (egress gated, garde-fous anti-hallu). Restent 3 hitbox
> hors-contrat (classes fantômes, CSP grand ouvert, tunnel brut) à ne pas laisser entrer dans le ring.

---

## 2026-06-12 — MALEX/Codex : audit d'absorption des workflows Vincent

Vincent,

On place maintenant un gate d'architecture avant les prochaines integrations. Tes projets ont
deja produit beaucoup de workflows utiles ; les ignorer ferait recoder des fonctions, mais les
injecter directement risquerait de casser les owners, contrats, permissions et gates MasterFlow.

Ton systeme doit donc utiliser le **Drive MasterFlow comme canon et grille de compilation**, puis
auditer tes workflows comme sources candidates.

Boot court :

```txt
MASTERFLOW BOOT CHARGE
Cible : audit d'absorption des workflows Vincent
Runtime : audit only
Projection : ENGINES + BACKEND + BDD + ACTIONS + UI
Source canonique : Drive MASTERFLOW
Implementation observee : GitHub main
Mutation : interdite avant validation MALEX
```

Lire d'abord :

```txt
PROTOCOLE_AUDIT_VINCENT_MASTERFLOW_A_LIRE_EN_PREMIER.md
START_HERE_FOR_AI_AND_DEVS_MASTERFLOW.md
01_CORE/MASTERFLOW_ACTIVE_CONTRACT_INDEX.md
```

Pour chaque workflow, poser la question MasterFlow :

```txt
Quel owner compile quoi, depuis quelles donnees, vers quelle sortie,
avec quelles permissions, quel preflight, quelle validation humaine,
quelle trace, quelle surface UI et quelle condition d'arret ?
```

Retour attendu : matrice `garder / absorber-adapter / ajouter / ameliorer / ecarter`, ecarts
contractuels, risques, tests et plan de PRs courtes. Pas de code dans ce tour. Detail complet et
gate dans `SUIVI.md` et `INBOX_VINCENT.md`.

Punchline de cadrage :

> Tes workflows ont peut-etre deja gagne le match. Maintenant on regarde s'ils jouent avec la
> frame data MasterFlow ou s'ils mashent des endpoints hors contrat.

---

## 2026-06-12 — Vincent : couche 14 (auditabilité des actions) revue + intégrée

MALEX,

Couche 14 « auditabilité des actions » revue de bout en bout, validée, intégrée.
`main` fast-forwardé : `0016b6c` → `6f96de5`.

### Revue
- `action-audit.tsx` (composant isolé) : trace le cycle réel `créée → preflight → validation`
  *(ou étape explicitement « non requise »)* `→ exécution → résultat`, avec distinction visuelle
  rejet humain / échec preflight / échec exécution. Lecture **strictement** depuis le contrat
  `Action` — j'ai vérifié chaque champ dans `packages/shared/src/index.ts` (`preflight.{risk_level,
  permission_check,requires_validation,warnings}`, `validator_id`, `updated_at`, `validation_note`,
  `result`, `error`, `status`). Zéro champ inventé, l'UI ne reconstruit pas d'audit log.
- **Le point fort** : `handleValidationDecision` n'injecte plus de note auto
  (`'validation UI MasterFlow'` / `'rejet UI MasterFlow'`). La note libre de l'inbox n'est passée
  que si non-vide (`note?.trim() ? {note} : {}`). Note vide = note absente → conforme
  anti-hallucination (l'UI n'invente aucun commentaire).
- Invariants : validation et exécution restent deux gestes séparés (« execution separee requise ») ;
  zéro backend, zéro contrat.

### Checks (côté Vincent, sur `main` fast-forwardé)
| Vérif | Résultat |
|---|---|
| `tsc --noEmit` (lint:frontend) | ✓ |
| `vite build` | ✓ 32 modules |
| backend `vitest` | ✓ 16/16 |
| `git diff --check` | ✓ |

Pas de smoke public : couche front pure, aucun changement de comportement backend. Le panneau
authentifié reste à confirmer sur le runtime public — run human-in-the-loop, je lance le backend
quand tu me le demandes.

**Rebase `codex/frontend-masterflow` sur `origin/main` (`6f96de5`) avant ta prochaine reprise.**

---

## 2026-06-12 — Vincent : couche 13 (modes runtime) revue + intégrée

MALEX,

Couche 13 « modes fondés sur le runtime réel » revue de bout en bout, validée, intégrée.
`main` fast-forwardé : `69979cb` → `3860f2f` (clôture rebase) → `1e7bbdd` (refactor).

### Revue
- `mode-runtime.ts` : extraction nette des modes hors `App.tsx` (types, `WORK_MODES`,
  `DEFAULT_WORK_MODE`, `canUseMode`, `buildModeView`). `App.tsx` perd ~110 lignes de logique
  inline au profit d'un `modeView` mémoïsé. Comportement conservé.
- **Le point fort** : les placeholders fictifs (`classes-placeholder`, `students-placeholder`,
  `subjects-placeholder`, `stories/arcs/scenes-placeholder`, `timeline/tasks-placeholder`) sont
  supprimés. Teaching et Story affichent désormais room + sources validées + actions live réelles
  et **signalent l'absence** d'objets métier backend (« Aucune classe n'est exposée par le
  backend… »). Conforme `ROOM_OS_DOCTRINE` (app visible ≠ engine active) et anti-hallucination.
- Invariants : zéro backend, zéro contrat ; candidates Resource Truth uniquement dans le deck
  Admin (gated) ; sources par défaut `validated` ; `canUseMode` inchangé.

### Checks (côté Vincent, sur `main` fast-forwardé)
| Vérif | Résultat |
|---|---|
| `tsc --noEmit` (lint:frontend) | ✓ |
| `vite build` | ✓ 31 modules |
| backend `vitest` | ✓ 16/16 |
| `git diff --check` | ✓ |

Pas de smoke public : refactor front pur, aucun changement de comportement backend.

**Rebase `codex/frontend-masterflow` sur `origin/main` (`1e7bbdd`) avant ta prochaine reprise.**

---

## 2026-06-10 — Vincent : couches 5-12 VALIDÉES + run réel 7/7 — un bug backend trouvé et corrigé

MALEX,

Run réel godmode exécuté de bout en bout sur le runtime public, tes 7 étapes passent toutes.
Tranche revue, validée et intégrée : **`main` est fast-forwardé sur `16340c8`**, suivi du fix
backend `3e34213`. **Rebase sur `origin/main` avant ta prochaine reprise.**

### Le run réel a trouvé un vrai bug — backend, pas chez toi

Ta couche 12 (`PUT /rooms/:id/instance`) renvoyait **401 même avec un token godmode valide**.
Cause : le router `rooms` supposait `requireUser` « monté en amont », mais `index.ts` ne le
montait pas → `req.user` jamais posé. Effet bonus découvert : `GET /rooms` répondait **sans
auth** sur le funnel public. Fix `3e34213` : `requireUser` monté dans le router (pattern des
autres routers) + test `rooms_auth.test.ts` qui verrouille le 401 sans token et le cycle
PUT/GET instance. Vérifié en live après reload : sans auth → 401, ta sync → 200 et persiste
(`active_surface`/`cognitive_density`/`widget_state.entry_profile` relus correctement).

### Résultats du run réel (compte godmode, via `:10000`)

1. Login → 200 godmode ;
2. sas d'entrée → `PUT instance` 200, persistance confirmée en relecture ;
3. Home Room surface/densité/sync OK ;
4. action non-sensible : preflight → `approved` direct (normal, registre) ; action sensible
   (`approve_validation_item`, `medium_high`) : preflight → `pending_validation`, et
   `execute` avant validation **refusé 423** ;
5. inbox : 1 pending → approve → exécution **séparée** → `completed` ;
6. ressource candidate : créée, invisible par défaut, visible `include_all` (godmode) ;
7. validation candidate → `validated` → apparaît dans les sources par défaut.
   La ressource « Test run réel couches 5-12 » est restée en base : tu la verras dans le strip
   Sources, c'est la trace du run.

### Revue code

Conforme contrat + invariants sur toute la ligne ; mention spéciale : pré-remplissage login
retiré (le point sécu de ma dernière revue), exécution toujours explicite après validation,
candidates bien cloisonnées. `tsc` front/back 0 erreur, vitest **16/16** (13 + 3 nouveaux),
`vite build` OK, `smoke:public` **7/7** avec credentials (WS pong à travers le funnel).

### Suite proposée (couches courtes, comme tu fais)

- couches UI : rapprocher la Home Room de ta `FRONTEND_UI_DOCTRINE` (main widget dynamique
  piloté par les données réelles plutôt que placeholders) ;
- option : afficher `validation_note`/auditabilité d'une action complétée dans l'UI ;
- l'`object_type` envoyé par le chip (`entry.ui_surface`) est accepté par le backend — si on
  veut un `object_type` métier plus strict, ce sera un delta contrat à discuter ici d'abord.

---

## 2026-06-08 — MALEX/Codex : tranche frontend couches 5-12 prête à tester

Vincent,

Update MasterFlow côté MALEX/Codex : grosse tranche frontend poussée sur
`codex/frontend-masterflow`.

Dernier commit : `6207a5e Persist frontend room instance state`.

Ce qui est branché :

- Home Room situationnelle ;
- sas d'entrée utilisateur ;
- sync `PUT /rooms/:id/instance` : `active_surface`, `cognitive_density`,
  `widget_state.entry_profile` / `active_mode` ;
- cycle actions : create -> preflight -> execute si approved ;
- validation inbox : `GET /actions/pending` + `POST /actions/:id/validate` ;
- exécution explicite après validation, pas d'auto-run caché ;
- Resource Truth : proposer candidate, afficher candidates admin/godmode, valider candidate ->
  canon.

Checks OK :

- `npm run lint:frontend`
- `npm run build:frontend`
- `npm run smoke:public`

À tester en run réel avec compte godmode :

1. Login sur `:10000`.
2. Passer le sas d'entrée.
3. Vérifier que la Home Room affiche surface + densité + sync.
4. Cliquer une action live et vérifier preflight/exécution ou attente validation.
5. Tester inbox validation.
6. Proposer une ressource candidate.
7. Valider la ressource candidate et vérifier qu'elle apparaît ensuite dans les sources validées.

Point important : pas de backend delta dans ces couches. On consomme les contrats existants.

---

## 2026-06-06 — Demande feu vert backend

Vincent,

Feu vert demandé pour allumer le backend.

On a poussé la première couche frontend sur `codex/frontend-masterflow` :

- `apps/frontend` créé ;
- shell login minimal ;
- appel typé `GET /context/current` ;
- aucun backend modifié ;
- tests/lint/build OK.

Objectif du run : tester uniquement l'intégration réelle auth + contexte courant.

Commande backend attendue :

```bash
npm run dev
```

Puis côté MALEX/Codex :

```bash
npm run dev:frontend
```

Punchline officielle :

> On n'est pas en train de faire une landing page, on branche le cockpit au réacteur. Dis-moi quand je peux tourner la clé.

---

## 2026-06-06 — Réponse Vincent : feu vert + 6 questions backend

MALEX,

**Feu vert : OK** pour la couche 1, périmètre strict `POST /auth/login` + `GET /context/current`.
Le backend, je l'allume moi (`npm run dev`) — je te dis « clé tournée » ici quand il tourne.
Et oui : **le frontend est à toi**. J'ai retiré mon PoC (`packages/poc-frontend`) ; `apps/frontend`
devient le seul frontend, tu le portes.

Réponses aux 6 points de `VINCENT_BACKEND_SYNC_2026-06-06.md` :

1. **Capabilities / registre exploitable par l'UI** — *fait, côté backend.* J'ai ajouté un champ
   **`status`** à chaque entrée du registre (`ActionRegistryEntrySchema` dans `packages/shared`) :
   - `live` → endpoint réellement branché, affichable comme fonctionnel ;
   - `future` → prévu plus tard, à afficher **verrouillé / « à venir »** (jamais fonctionnel) ;
   - `out_of_scope` → hors version, **à masquer**.
   Tu le lis tel quel via `GET /actions/available` et `GET /context/current` (`available_actions`).
   Pas d'endpoint `/capabilities` séparé : le registre porte déjà l'info.

2. **Alignement seed ↔ endpoints** — *on aligne le seed sur le réel.* Le contrat REST réel fait
   foi. J'ai corrigé les `endpoint` du seed :
   - `preflight_action` → `POST /actions/{action_id}/preflight`
   - `approve_validation_item` → `POST /actions/{action_id}/validate`
   Tu consommes donc **`/actions/:id/preflight`** et **`/actions/:id/validate`** (et
   `/actions/:id/execute`). Plus de `POST /actions/preflight` ni `POST /validation/{item}/approve`.

3. **`user_runtime_loadout`** — *hors V1* (anti-scope). Pas de modèle/endpoint pour l'instant ;
   l'UI dérive les actions de `GET /actions/available` + le contexte courant. À rouvrir en phase 2.

4. **Validation inbox** — *`GET /actions/pending` suffit en V1.* Pas de table
   `validation_inbox` séparée pour l'instant ; l'inbox UI se branche dessus (rôle `teacher+`).

5. **Endpoints UI complète** (`/da/compile-context`, `/assets/image/preflight`,
   `/assets/render-manifests`, `/inventory/photo-scan`, `/subjects/{id}/compile-fullstack`) —
   *plus tard.* Non implémentés au MVP ; marqués `status: future` dans le registre → affiche-les
   **verrouillés**, jamais comme fonctionnels.

6. **godmode vs owner_ops** — **godmode étendu** : en rôle `godmode`, l'UI peut **exécuter
   des actions** (pas seulement lire) **et** `owner_ops_private_diagnostic` est **exposé**.
   ⚠️ Décision assumée : ça **lève le cloisonnement strict Owner Ops** de la première carte
   d'intégration. **Garde-fou impératif** : tout ça est **gated rôle `godmode` uniquement** —
   rien de ces surfaces ne doit jamais apparaître pour teacher/student. (Owner Ops n'est pas
   encore implémenté côté backend : à brancher derrière ce gate godmode le moment venu.)

Backflow / factories : **hors scope**, confirmé des deux côtés (taggé `out_of_scope`).

> *Brouillon rédigé via Claude pour Vincent — les décisions ci-dessus valent consigne de
> périmètre ; le lancement réel du backend reste mon acte (human in the loop).*

---

## 2026-06-07 — Q6 confirmée humainement (Vincent) : godmode étendu

MALEX,

Mise au point honnête : dans la journée une correction **« Owner Ops strict »** a été poussée
sur `main` (commit `7322e61`) puis **annulée à ma demande** (`git revert`). Après ta réassertion
côté `codex/frontend-masterflow`, **je confirme humainement la position godmode étendu** — c'est
elle qui fait foi désormais (et non plus un simple brouillon IA).

**Q6 — godmode vs owner_ops = godmode étendu (validé Vincent, 2026-06-07) :**

- en rôle `godmode`, l'UI peut **exécuter des actions** ET `owner_ops_private_diagnostic` est
  **exposé** *quand le backend l'implémentera* ;
- **gate strict `godmode` uniquement** — jamais `teacher` ni `student` ;
- ça **lève le cloisonnement strict Owner Ops** de la 1re carte d'intégration ;
- l'UI **ne présente rien comme fonctionnel** avant contrat + endpoint réels (owner_ops n'est
  pas encore codé backend).

Q1–Q5 inchangées (cf. entrée du 2026-06-06). Backflow/factories : `out_of_scope`.

> *Cette entrée est la validation humaine de Vincent : elle remplace la correction « Owner Ops
> strict » et scelle godmode étendu.*

---

## 2026-06-07 — Vincent : accès Tailscale accordé

MALEX,

Accès tailnet **accordé**. J'invite ton compte Tailscale au tailnet MasterFlow / je partage la
machine qui héberge le backend. On reste sur **Tailscale Serve** — **pas de Funnel, aucun port
public**.

- **URL backend (Tailscale Serve, tailnet-only, actif)** :
  `https://profkrapu-ms-7971.tail8d8b1f.ts.net:8443`
  → REST `…:8443/api/v1` · WS `wss://profkrapu-ms-7971.tail8d8b1f.ts.net:8443/ws/{room_instance_id}?token=…`
- ⚠️ **Port 8443, PAS 443.** `https://profkrapu-ms-7971.tail8d8b1f.ts.net/` (443, Funnel public)
  sert un **autre projet (API_manage)** → ne jamais viser le backend dessus.
- Serve proxifie `:8443 → localhost:8000` (Funnel 443 d'API_manage intact). **Backend lancé,
  `/health` vert** (`users:1 personas:3 rooms:1 resources:3`).
- Périmètre de test inchangé : `POST /auth/login` + `GET /context/current` uniquement ; le
  lancement effectif (`npm run dev`) reste mon acte — je dirai « clé tournée » ici.

Confirme la réception côté MALEX une fois l'invitation acceptée.

> *(Demande d'origine : `INBOX_VINCENT.md` côté `codex/frontend-masterflow`, entrée
> « Invitation Tailscale requise » du 2026-06-07.)*

---

## 2026-06-07 — Vincent : frontend exposé en Serve (tailnet)

MALEX,

Le **frontend MALEX** (`apps/frontend`) est aussi exposé en Tailscale **Serve privé**
(tailnet-only, pas de Funnel). Toute la stack passe par **une seule URL** :

- **URL frontend** : `https://profkrapu-ms-7971.tail8d8b1f.ts.net:10000`
- Le frontend (Vite `:5174`) **proxifie** `/api` → backend `:8000` et `/ws` → WS backend — donc
  login + `GET /context/current` + chat fonctionnent directement depuis cette URL.
- J'ai ajouté `server.allowedHosts: ['profkrapu-ms-7971.tail8d8b1f.ts.net']` dans
  `apps/frontend/vite.config.ts` (sinon Vite 6 bloque l'hôte distant). Sans effet en local —
  **à conserver au rebase**.

**Récap des ports tailnet :**

| Port | Surface | Cible |
|---|---|---|
| `443` (Funnel public) | **autre projet — API_manage** | `localhost:3000` — ne pas toucher |
| `8443` (Serve, tailnet) | backend direct | `localhost:8000` |
| `10000` (Serve, tailnet) | frontend (proxifie l'API) | `localhost:5174` |

Frontend + backend **lancés et vérifiés** : `:10000/` sert l'HTML, `:10000/api/v1/personas`
→ `401` (backend répond, auth requise = chaîne OK).

---

## 2026-06-07 — Correctif : l'accès tailnet n'était PAS effectif → partage réel fait

MALEX,

Mise au point honnête (la trace ci-dessus disait « accès accordé » — c'était inexact) :
l'invitation tailnet **n'avait jamais été réellement émise** depuis la console. Côté toi,
ton `tailscale status` ne listait que `macbook-pro-de-alex` ; ton `curl …:8443` résolvait
vers des **IP publiques** (celles du Funnel 443 d'API_manage) et échouait en `SSL_ERROR_SYSCALL`,
parce que `:8443` est en **Serve tailnet-only** et que tu n'étais pas dans le tailnet.

**Corrigé aujourd'hui** : node-share de la machine **`profkrapu-ms-7971`** vers
**`malexcoulot@gmail.com`** (acceptée par toi par e-mail). Vérifié : la machine
`profkrapu-ms-7971.tail8d8b1f.ts.net` (`100.100.128.63`) apparaît désormais 🟢 **en ligne**
dans ton app Tailscale (onglet Devices). On reste en **Serve privé — toujours pas de Funnel**
sur le backend/frontend.

**Test de vie (chemin corrigé)** — health à la **racine `/health`**, pas `/api/v1/health`
(ce dernier passe par l'auth → `unauthorized`) :

```bash
curl -s https://profkrapu-ms-7971.tail8d8b1f.ts.net:8443/health
# → {"ok":true,"service":"masterflow-backend","counts":{"users":1,"personas":3,"rooms":1,"resources":3}}
```

Stack complète (front qui proxifie API + WS) : `https://profkrapu-ms-7971.tail8d8b1f.ts.net:10000`

Rappel ports inchangé : `443`=Funnel public **API_manage** (ne pas viser) · `8443`=backend (Serve) ·
`10000`=frontend (Serve). Confirme-moi ta sortie `/health` quand tu l'as.

---

## 2026-06-07 — Vincent : RÉSOLU — Serve ne sert pas les nœuds partagés → IP tailnet directe

MALEX, ton diag réseau était juste (DNS OK, ports Serve en time-out). Cause trouvée :

> **Tailscale Serve ne sert QUE les membres du même tailnet — PAS un nœud *partagé* (node-share).**
> Toi tu es un nœud partagé chez moi → `:8443`/`:10000` (proxy Serve) ne te répondront jamais,
> même DNS résolu. C'est une limite de Serve, pas un souci de ton client.

**Preuves côté host (`profkrapu-ms-7971`)** — ce que tu demandais :

- `tailscale serve status` → `:8443→localhost:8000` et `:10000→localhost:5174`, tous `tailnet only` ;
- `curl http://localhost:8000/health` → `{"ok":true,...,"counts":{"users":1,"personas":3,"rooms":1,"resources":3}}` ;
- `curl http://localhost:5174/` → `200` ;
- services locaux **verts**, ACL par défaut (rien ne te bloque côté policy).

**Fix (on reste tailnet privé — toujours pas de Funnel) : vise l'IP Tailscale directe**, pas le
proxy Serve. La connexion reste chiffrée (WireGuard), juste en `http://` au lieu de `https://`.

| Surface | Nouvelle URL (pour toi) | Vérifié host→tailnet-IP |
|---|---|---|
| Backend direct | `http://100.100.128.63:8000` | `/health` → 200 ✅ |
| Frontend (stack complète, proxifie /api+/ws) | `http://100.100.128.63:5174` | `/` → 200, `/api/v1/personas` → 401 ✅ |

Changement appliqué côté host : le frontend Vite était bindé `127.0.0.1` only → rebindé
**`host: '0.0.0.0'`** dans `apps/frontend/vite.config.ts` (à conserver au rebase) pour qu'il soit
joignable sur l'interface tailnet. Le backend écoutait déjà sur toutes les interfaces.

**Échelle de test côté MALEX (dans l'ordre) :**

```bash
tailscale ping 100.100.128.63          # 1) chemin WireGuard up ? (doit répondre "pong")
curl -sS --max-time 12 http://100.100.128.63:8000/health   # 2) backend direct
curl -i  --max-time 12 http://100.100.128.63:5174/api/v1/personas  # 3) stack complète → 401 attendu
```

Si le `tailscale ping` échoue → c'est le chemin réseau (NAT/DERP/ACL), dis-le moi et je creuse.
Sinon les 2 curls doivent passer. Les ports Serve `:8443`/`:10000` restent valables pour mes
propres machines du tailnet, mais **toi tu utilises l'IP `100.100.128.63` + port brut.**

---

## 2026-06-07 — MALEX : IP directe ping OK, ports bruts time-out

Vincent,

Push `070688e` reçu. On a suivi ton échelle de test en IP directe :

```bash
tailscale ping --timeout=10s 100.100.128.63
# pong from profkrapu-ms-7971 (100.100.128.63) via 2.12.241.244:41641 in 22ms

curl -sS --max-time 12 http://100.100.128.63:8000/health
# timeout

curl -I --max-time 12 http://100.100.128.63:5174/
# timeout

curl -i --max-time 12 http://100.100.128.63:5174/api/v1/personas
# timeout
```

Donc le chemin Tailscale jusqu'à la machine est OK, mais les ports bruts `8000` et `5174`
ne répondent pas depuis MALEX. Ce n'est plus DNS/Serve : à vérifier côté bind effectif,
firewall local ou écoute sur l'interface tailnet.

Peux-tu tester côté host `curl http://100.100.128.63:8000/health`,
`curl http://100.100.128.63:5174/`, `lsof -nP -iTCP:8000 -sTCP:LISTEN` et
`lsof -nP -iTCP:5174 -sTCP:LISTEN` ?

> Le ping touche la hurtbox : `profkrapu-ms-7971` est bien dans le ring. Mais `8000` et `5174`
> ne prennent aucun hit. Là ce n'est plus le tunnel, c'est le bind ou le firewall qui campe.

---

## 2026-06-07 — RÉSOLU pour de bon : bascule en Funnel PUBLIC (décision humaine Vincent)

MALEX, l'accès privé direct a été creusé à fond et **abandonné** — diagnostic complet :

- **Serve** ne sert pas les nœuds *partagés* (seulement les membres du tailnet) → `:8443`/`:10000` time-out.
- **IP tailnet directe** : ton `tailscale ping 100.100.128.63` répond (pong), mais ton `curl`
  time-out (`erreur 28`, connexion jamais établie). Côté host : **capture `tcpdump` = 0 paquet**
  de ton IP sur `tailscale0`, **0 conntrack**. Tes paquets de données n'arrivent **pas**.
- **Firewall écarté, prouvé** : la chaîne `ts-input` accepte tout le trafic tailscale (compteurs
  à l'appui) ; `netcheck` du host sain (UDP ok, NAT facile, DERP 18 ms).
- Cause : **plan de données Tailscale KO entre ton poste (NAT FAI) et le host (NAT box)** — le
  contrôle/ping passe, la data non. Non réparable depuis le host (machines qui marchaient =
  toutes sur le LAN de Vincent ; toi seul es distant, via DERP Paris).

**Décision humaine de Vincent (validée explicitement) : exposer en Tailscale FUNNEL public.**
Le Funnel sort du host vers l'ingress Tailscale → traverse tous les NAT, **pas besoin de
Tailscale chez toi**.

| Surface | URL publique (HTTPS) |
|---|---|
| Backend (REST `/api/v1`, WS `/ws/...`) | `https://profkrapu-ms-7971.tail8d8b1f.ts.net:8443` |
| Frontend — stack complète (proxifie API+WS) | `https://profkrapu-ms-7971.tail8d8b1f.ts.net:10000` |

Vérifié public : `:8443/health` → 200, `:10000/` → HTML MasterFlow, `:10000/api/v1/personas`
→ 401, login godmode → 200. (Le `443` reste le funnel **API_manage**, ne pas viser.)

**Sécu (obligatoire avant ouverture publique, faite) :**
- `JWT_SECRET` **régénéré** (l'ancien était un fallback codé en dur → tokens forgeables) ;
- mot de passe **godmode tourné** (l'ancien `masterflow` était un défaut public).
- ⚠️ **Tes identifiants godmode te sont transmis par Vincent hors-bande** (jamais dans Git).
- Note : `POST /auth/register` est ouvert (crée un compte `student`) — surface publique mineure
  à garder en tête.

Tu peux donc bosser directement contre ces URLs publiques, sans VPN. Confirme quand tu as la main.
# 2026-06-13 — MALEX vers Vincent : decision finale Corrector

Vincent,

MALEX a tranche le point Corrector. Lis en priorite :

`DECISION_ABSORPTION_CORRECTOR_ET_CALIBRATION_INSTITUTIONNELLE.md`

La position est ferme mais ne jette pas ton travail :

- tes features `API_corrector`, OCR, batch, calibration, feedback, exports et controles qualite
  doivent etre recuperees ;
- le systeme obtenu est beaucoup plus puissant que Corrector isole : chaque capacite devient
  composable, versionnee et reutilisable par tous les personas, cours, sujets, classes et futures
  integrations autorises ;
- ProfKrapu, le persona personnel d'un utilisateur ou un persona enseignant peut utiliser le meme
  moteur de correction tout en gardant sa voix, sa relation et sa methode ;
- toute amelioration du moteur profite a MasterFlow entier au lieu de rester bloquee dans un bot ;
- elles doivent etre mappees puis absorbees dans l'architecture globale MasterFlow ;
- tu as tort sur le choix de faire de Corrector un persona autonome pouvant etre primaire :
  un persona porte une voix ou prete une methode, il ne porte pas le moteur, le scoring, les
  permissions, les jobs ni l'autorite pedagogique ;
- `corrector-001` doit donc etre deprecie proprement ou migre vers un profil de methode, sans
  suppression destructive des references historiques ;
- la correction appartient au pipeline canonique
  `CORRECTOR_APP -> CORRECTOR_RUNTIME_AND_FEEDBACK_ENGINE -> jobs/review -> validation prof`.

Precision importante de MALEX : la moyenne de classe attendue entre 13 et 14 correspond au
referentiel de notation de son ecole. Ce n'est pas une fabrication arbitraire de moyenne.
Cependant, le decalage automatique de toutes les notes doit etre remplace par un profil
institutionnel versionne, un diagnostic de cohorte et une validation prof explicite. Le systeme
conserve `raw_score`, `calibration_delta` et `final_score`.

Reponse attendue :

1. audit de tes propres features/projets Corrector ;
2. matrice KEEP/ABSORB/REPLACE/DEPRECATE ;
3. proposition PR-C0 deprecation/migration ;
4. proposition PR-C1 contrats et objets ;
5. risques ou dependances manquantes.

Tu peux challenger le detail technique. La decision engine/persona n'est plus ouverte.

---
