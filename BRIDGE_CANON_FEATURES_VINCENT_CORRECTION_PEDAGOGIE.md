# BRIDGE — Canon MasterFlow x features Vincent

Statut : `CANON BRIDGE / IMPLEMENTATION READY / 2026-06-13`

## Objectif

Relier les fonctions deja construites dans les projets Vincent aux owners deja presents dans le
canon MasterFlow, sans creer un second systeme pedagogique ni attendre une relecture manuelle
feature par feature.

Principe :

```text
canon MasterFlow = owners, contrats, permissions et doctrine
features Vincent = patterns executables, adapters et experience terrain
Git = contrat d'integration et plan de PRs
```

Ce document est un handoff Git. Il n'ecrit pas directement dans le Drive canon. Les extensions
durables doivent revenir au canon par candidate validee, conformement aux invariants MasterFlow.

## Sources canon verifiees

- `04_ENGINES/CORRECTOR_RUNTIME_AND_FEEDBACK_ENGINE.md`
- `04_ENGINES/CORRECTOR_QUALITY_CONTROL_AND_SAMPLE_REVIEW_SYSTEM.md`
- `04_ENGINES/SIGNAL_ENGINE.md`
- `04_ENGINES/PEDAGOGICAL_ADAPTATION_ENGINE.md`
- `04_ENGINES/LLM_PROVIDER_ABSTRACTION.md`
- `03_APPS/CORRECTOR_APP_RUNTIME.md`
- `03_APPS/REAL_WORLD_CORRECTION_RUNTIME_IMPLEMENTATION.md`
- `03_APPS/PEDAGOGICAL_ANALYTICS_AND_DIAGNOSTICS.md`
- `03_APPS/STUDENT_MONITORING_AND_PEDAGOGICAL_SIGNAL_SYSTEM.md`
- `03_APPS/WOOCLAP_AND_INTERACTIVE_CLASSROOM_SYSTEM.md`
- `02_CONTRACTS/COURSE_GRAPH_METHOD_PROFILE_AND_TEACHER_ENRICHMENT_CONTRACT.md`
- `02_CONTRACTS/SUBJECT_CORRECTION_SHEET_AUTOSYNC_CONTRACT.md`
- `02_CONTRACTS/BACKGROUND_JOB_EXECUTION_AND_CHAT_CONTINUITY_CONTRACT.md`
- `02_CONTRACTS/ACADEMIC_INTEGRITY_EVIDENCE_AND_HUMAN_REVIEW_CONTRACT.md`
- `02_CONTRACTS/PEDAGOGICAL_DELIVERY_EVIDENCE_AND_STUDENT_SAFE_CONTRACT.md`

## Sources Vincent verifiees

- audit `API_corrector`, `API_manage` et `vibe` dans
  `AUDIT_ABSORPTION_PILOTE_3PROJETS.md` ;
- `MASTERFLOW_CORRECTOR_PIPELINE` : OCR, phases P1-P4, calibration, feedback, exports ;
- sources Corrector historiques : analyse pedagogique, capteurs, progression, signal engine,
  supports, WooClap, suivi individuel et evolution de sujets.

## Conclusion du croisement

Les concepts majeurs existaient deja dans le canon. Il ne manque pas de nouveaux engines.

Ce qui manque est le cablage runtime :

```text
adapters d'entree
-> evidence events
-> owners canoniques
-> candidates explicables
-> decision humaine
-> delta trace
-> enrichissement candidat
```

Les features Vincent doivent donc etre absorbees comme adapters, runners, schemas, controles et
surfaces, jamais comme autorite parallele.

## Matrice de pont

| Feature Vincent | Owner canonique | Apport concret | Action Git/backend |
|---|---|---|---|
| OCR PDF/image | ingestion adapter + jobs + Resource Truth | extraction deja operationnelle | adapter `ocr_submission`, preuves et confiance |
| pipeline P1-P4 | Corrector + Queue/Jobs | workflow reel et reproductible | workflow versionne, etapes observables |
| extraction bareme | Subject Engine + Template Registry | passage document vers grille | rubric candidate, validation prof |
| score par signaux | Corrector | prototype exploitable mais trop code en dur | scorer par criteres versionnes et preuves |
| coherence audit | Corrector Quality + Observability | controle note/couverture/structure | `quality_finding`, widget review |
| edition/restauration | lifecycle + review | comparaison IA/prof | decision delta immutable |
| calibration historique | Corrector + analytics | alignement avec pratique reelle | profil institutionnel versionne |
| feedback court | Feedback Engine | sortie terrain efficace | template student-safe configurable |
| exports PDF/CSV/XLSX | Export Engine + jobs | formats deja pratiques | preview, validation, manifest |
| watcher dossier | Jobs/Queue | automatisation d'ingestion | trigger borne, idempotent et permissionne |
| WooClap | Interactive Classroom + Signal Engine | capteur collectif operationnel | adapter `classroom_sensor` |
| suivi individuel | Student Monitoring + Pedagogical Adaptation | memoire longitudinale | signaux prives, jamais profil definitif |
| progression module | Course Graph + Adaptation | ajustement rythme/seances | enrichment candidate valide par prof |
| evolution de sujet | Subject Engine + autosync | boucle sujet/correction | subject improvement candidate |
| supports/Gamma | Subject Compiler + Export | production pedagogique | output candidate puis preview |
| routage modele par tache | LLM Provider Abstraction | choix provider deja prouve | task profile + fallback + cout/qualite |
| proxy egress allowliste | LLM runner + permission | anti-SSRF et secrets serveur | gateway allowlistee |
| storage admin/prive | permission/storage | separation globale/personnelle | allowlist + scope prive |
| desktop/remote | environment adapter | transport Tauri/web prouve | transport unique runtime-aware |
| services persistants | runtime ops | survie au reboot | recette ops, hors contrat produit |

## Ponts a activer immediatement

### 1. Evidence adapter registry

Toutes les entrees heterogenes doivent produire une enveloppe commune :

```yaml
evidence_event:
  evidence_id:
  source_type: submission | rubric | transcript | wooclap | survey | teacher_note | calendar
  adapter_id:
  owner_id:
  project_scope:
  target_refs:
  payload_ref:
  extraction_confidence:
  privacy_level:
  occurred_at:
  status: candidate | validated | rejected | archived
```

Les adapters extraient. Ils ne concluent pas.

### 2. Teacher decision delta

Chaque fois que le professeur modifie une proposition IA, MasterFlow conserve un delta
structure, sans stocker de raisonnement prive :

```yaml
teacher_decision_delta:
  delta_id:
  object_type: criterion_score | feedback | rubric | calibration | subject | remediation
  object_ref:
  ai_proposal_ref:
  human_decision_ref:
  changed_fields:
  reason_code:
  free_note_ref:
  teacher_id:
  context_refs:
  created_at:
```

Ce delta peut produire un enrichissement candidat. Il ne modifie jamais silencieusement une
rubrique, une methode ou un modele.

### 3. Task-aware model routing

Le routing LLM doit distinguer :

```text
ocr
rubric_extraction
criterion_analysis
feedback_draft
cohort_synthesis
subject_revision
chat
```

Chaque profil de tache peut declarer providers compatibles, cout maximal, latence, fallback,
privacy et niveau de qualite attendu. Le persona n'influence jamais les permissions du provider.

### 4. Pedagogical signal normalization

WooClap, corrections, transcriptions et annotations doivent alimenter le meme `SIGNAL_ENGINE`.

```yaml
pedagogical_signal:
  signal_id:
  signal_type: progression | blockage | confusion | overload | method | subject_quality | drift
  level: individual | group | cohort | course | method | system
  evidence_refs:
  recurrence:
  contradictions:
  confidence:
  sensitivity:
  status: observation | hypothesis | candidate_pattern | validated_alert | stale | archived
```

Rappel : signal != note, signal != diagnostic, signal != action.

### 5. Subject quality feedback loop

```text
subject version
-> submissions
-> correction findings
-> cohort signals
-> subject quality candidate
-> teacher review
-> new subject version
-> correction sheet autosync
```

Cette boucle distingue enfin :

- niveau reel de la cohorte ;
- sujet trop difficile ou ambigu ;
- rubrique incoherente ;
- erreur de modele ;
- notion insuffisamment enseignee.

## Opportunites nouvelles revelees

### Evaluation continue des moteurs

Les deltas prof permettent de construire des jeux d'evaluation prives :

- taux de conservation des propositions ;
- erreurs recurrentes par tache et provider ;
- criteres souvent ajustes ;
- feedbacks souvent reecrits ;
- derives selon discipline ou format.

Ces mesures servent au routing et aux tests, pas au profilage des etudiants.

### Method profile reel

Les corrections repetees du professeur peuvent proposer un
`teacher_method_profile` :

- style de feedback ;
- ordre naturel des criteres ;
- niveau d'exigence ;
- preuves privilegiees ;
- patterns refuses.

Toute evolution reste candidate et validable.

### Calibration multi-discipline

Le meme pipeline peut servir sciences, arts, communication, redaction et technique si les
rubriques, preuves et profils institutionnels sont separes du moteur.

### Adapters reutilisables hors correction

Les memes briques peuvent servir :

- MOTH/CDC ;
- inscription Ours d'Or ;
- qualification event ;
- demande de devis ;
- audit projet ;
- bot de cours ;
- integration LMS.

Dans chaque cas :

```text
evidence -> signal -> candidate -> validation -> action
```

## Ce qui ne doit pas etre absorbe tel quel

- heuristiques liees a un sujet precis codees dans le moteur ;
- etiquettes permanentes sur les etudiants ;
- scoring comportemental ;
- tunnel reseau brut ;
- CSP permissive ;
- export ou publication sans preview ;
- mise a jour automatique du profil prof depuis un seul delta ;
- routing provider silencieux qui change privacy ou cout ;
- objets classes/etudiants fictifs sans owner et scope backend reels.

## Terrain backend prepare

Objets a poser progressivement, sans les marquer `live` avant endpoint et tests :

```text
evidence_events
adapter_registry
task_model_profiles
pedagogical_signals
teacher_decision_deltas
course_enrichment_candidates
subject_quality_candidates
method_profile_candidates
evaluation_runs
evaluation_cases
```

Ils completent les objets Corrector deja listes dans
`DECISION_ABSORPTION_CORRECTOR_ET_CALIBRATION_INSTITUTIONNELLE.md`.

## Sequence d'integration

1. `PR-CB0` : schemas partages des evidence events, signals et decision deltas.
2. `PR-CB1` : adapter registry read-only + adapters OCR/WooClap/transcript/note prof déclarés
   non exécutables. Contrat, seed, filtre de rôle et tests livrés ; runners hors scope.
3. `PR-CB2` : task-aware model profiles et egress gated. Résolution mono-provider fail-closed,
   privacy locale, allowlist d'origine et tests livrés ; fallback réel hors scope.
4. `PR-C0` : deprecation non destructive du persona Corrector.
5. `PR-C1` : rubriques, profils institutionnels, batches et manifests. Contrats, migrations et
   gates de cohérence livrés ; aucun score ni runner.
6. `PR-C2` : ingestion/jobs.
7. `PR-C3` : pre-correction explicable.
8. `PR-C4` : calibration, quality review et signals.
9. `PR-C5` : feedback et exports.
10. `PR-C6` : boucle delta prof -> enrichment candidates.

`PR-CB0` peut etre prepare avant le pipeline complet. Les routes d'ecriture et les adapters reels
attendent Project/Scope, Template Registry et Jobs.

## Critere de reussite

Le terrain est correctement prepare si :

- aucun concept Vincent ne cree un engine doublon ;
- chaque entree conserve source, scope, confiance et privacy ;
- chaque proposition IA reste differente de la decision humaine ;
- les deltas humains sont auditables ;
- aucune amelioration n'est appliquee silencieusement ;
- une feature ne devient `live` qu'avec route, permission, tests et recette ;
- les memes briques peuvent etre reutilisees hors correction.
