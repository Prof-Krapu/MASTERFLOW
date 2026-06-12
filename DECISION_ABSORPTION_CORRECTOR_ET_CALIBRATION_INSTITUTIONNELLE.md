# DECISION — Absorption de Corrector et calibration institutionnelle

Statut : `DECISION MALEX / HANDOFF VINCENT / 2026-06-13`

## Decision indubitable

Le produit de correction de Vincent n'est pas rejete. Ses fonctions utiles doivent etre
absorbees dans le systeme global MasterFlow.

En revanche, **Vincent a tort sur son choix d'architecture lorsqu'il traite Corrector comme un
persona autonome, activable comme interlocuteur principal et source d'autorite pedagogique**.

La correction est une capacite metier. Elle appartient a :

```text
CORRECTOR_APP
-> CORRECTOR_RUNTIME_AND_FEEDBACK_ENGINE
-> QUEUE_ENGINE / jobs
-> review queue
-> validation professeur
```

Un persona porte une voix, une presence, une relation et eventuellement une methode. Il ne doit
pas porter les tables, les permissions, le scoring, l'OCR, les batchs, les exports ni la
souverainete pedagogique d'un moteur.

Cette separation n'est pas une preference recente de MALEX. Elle est deja canonique dans :

- `04_ENGINES/CORRECTOR_RUNTIME_AND_FEEDBACK_ENGINE.md` ;
- `04_ENGINES/CORRECTOR_QUALITY_CONTROL_AND_SAMPLE_REVIEW_SYSTEM.md` ;
- `03_APPS/CORRECTOR_APP_RUNTIME.md` ;
- `03_APPS/REAL_WORLD_CORRECTION_RUNTIME_IMPLEMENTATION.md` ;
- `02_CONTRACTS/SUBJECT_CORRECTION_SHEET_AUTOSYNC_CONTRACT.md` ;
- `02_CONTRACTS/ACADEMIC_INTEGRITY_EVIDENCE_AND_HUMAN_REVIEW_CONTRACT.md`.

Le canon dit explicitement que `CORRECTION_ENGINE` est un ancien alias absorbe et non invocable,
que les scores restent des brouillons explicables et qu'aucune note finale ne sort sans
validation humaine.

## Ce qui etait faux dans le seed actuel

Le backend Git contient encore `corrector-001` comme persona :

- `owner_type: persona` ;
- `can_be_primary: true` ;
- disponible dans les blends ;
- utilise dans les exemples et tests comme source de methode.

Cela confond quatre objets differents :

1. le moteur de correction ;
2. l'application/surface de correction ;
3. un profil de methode pedagogique ;
4. un personnage conversationnel.

Corrector peut eventuellement survivre comme **profil de methode non autoritaire** ou habillage
optionnel, si MALEX le souhaite plus tard. Il ne doit pas rester le conteneur fonctionnel du
pipeline ni devenir le persona principal par defaut d'un utilisateur.

## Ce que Vincent doit recuperer de ses features

Vincent doit auditer ses projets `API_corrector`, scripts et workflows existants puis mapper les
capacites suivantes, sans copier leur architecture historique telle quelle :

| Feature source | Destination MasterFlow | Statut |
|---|---|---|
| OCR et extraction PDF | ingestion adapter + job OCR | `ABSORB_AND_ADAPT` |
| scan des copies et identification | submission intake + identity/scope review | `ABSORB_AND_ADAPT` |
| correction sheet YAML | rubric/template versionne | `ABSORB_AND_ADAPT` |
| phases P1 a P4 | workflow versionne + jobs observables | `ABSORB_AND_ADAPT` |
| notes historiques de calibration | source de calibration tracee | `ABSORB_AND_ADAPT` |
| scoring par signaux | criterion scoring draft avec preuves | `REPLACE_ARCHITECTURE` |
| feedback court, positif et actionnable | feedback draft + student-safe delivery | `KEEP_AND_GENERALIZE` |
| unicite des formulations | contrainte de qualite, jamais critere de fond | `KEEP_AND_GENERALIZE` |
| CSV/XLSX/rapport | export preview puis validation | `ABSORB_AND_ADAPT` |
| watcher de dossiers | job runner borne et permissionne | `ABSORB_AND_ADAPT` |
| echantillonnage meilleurs/faibles/cas limites | quality control review | `KEEP_AND_GENERALIZE` |
| suivi tokens/couts par tache | observabilite privee admin/godmode | `IMPROVE_EXISTING_OWNER` |
| persona `corrector-001` | profil de methode optionnel ou migration deprecation | `DEPRECATE_AS_PERSONA` |

Les heuristiques actuellement codees en dur pour un sujet precis, comme Instagram, influenceurs,
chat, QR ou mecanique, ne sont pas des lois du moteur. Elles doivent provenir d'un sujet, d'un
bareme ou d'un template versionne et valide par le professeur.

## Calibration institutionnelle : correction de doctrine

La `moyenne_cible` de MALEX n'est pas une courbe arbitraire destinee a fabriquer artificiellement
une moyenne. Elle exprime le referentiel de notation de son ecole :

```text
moins de 10  = minimum non atteint / sanction
10 a 12      = minimum atteint mais fragile
13 a 14      = niveau normalement attendu
15 a 16      = travail solide
17 et plus   = exceptionnel
```

Il faut donc conserver le besoin, mais remplacer le lissage opaque actuel.

### Mode cible

```yaml
institutional_grading_profile:
  scale: 0_20
  expected_cohort_band: [13, 14]
  anchors:
    insufficient: [0, 9.99]
    minimum_met: [10, 11.99]
    expected: [12, 14.49]
    strong: [14.5, 16.49]
    exceptional: [16.5, 20]
  calibration_mode: diagnostic_then_teacher_validation
  max_global_delta: 1
  threshold_crossing_requires_validation: true
```

Pipeline :

```text
preuves + criteres
-> raw_level_score
-> conversion par institutional_grading_profile
-> statistiques de cohorte
-> calibration alert si derive
-> proposition d'ajustement bornee
-> validation professeur
-> final_score
```

Le systeme conserve toujours :

- `raw_score` ;
- `calibration_delta` ;
- `final_score` ;
- le profil et sa version ;
- l'auteur de la validation ;
- la justification ;
- les preuves par critere.

La plage `13-14` est une zone de coherence attendue, pas une moyenne imposee. Une cohorte
reellement forte ou faible doit rester visible. Aucun passage du seuil de 10 par ajustement
collectif sans validation explicite.

## Objets backend a prevoir

```text
institutional_grading_profiles
rubric_templates
rubric_versions
correction_batches
submissions
pre_correction_manifests
criterion_score_drafts
cohort_calibration_reviews
feedback_drafts
teacher_review_items
correction_exports
```

Chaque objet doit porter owner, project/scope, statut, version, timestamps et traces d'audit.
Les donnees etudiantes sont privees par defaut.

## Migration attendue pour `corrector-001`

Ne pas supprimer brutalement des donnees existantes.

1. Retirer `corrector-001` des nouveaux parcours et personas primaires proposes.
2. Le marquer `deprecated` ou le migrer vers un `method_profile`.
3. Interdire qu'il accorde un droit ou serve d'autorite de scoring.
4. Remplacer les tests qui imposent sa presence comme troisieme persona du MVP.
5. Conserver un adaptateur de lecture si des blends historiques le referencent.
6. Ne supprimer physiquement le seed qu'apres migration testee.

La formule correcte devient par exemple :

```text
persona principal de l'utilisateur
+ corrector_method_profile
+ CORRECTOR_RUNTIME_AND_FEEDBACK_ENGINE
```

Le persona parle. La methode aide. Le moteur calcule et trace. Le professeur decide.

## Sequence de PRs demandee a Vincent

### PR-C0 — Audit et deprecation propre

- inventaire des features `API_corrector` et projets Vincent ;
- mapping vers le tableau ci-dessus ;
- deprecation non destructive de `corrector-001` ;
- mise a jour seeds, fixtures et tests ;
- aucun pipeline de correction encore expose comme `live`.

### PR-C1 — Contrats et donnees

- profils institutionnels de notation ;
- rubriques et versions ;
- batchs, submissions et manifests ;
- permissions et statuts ;
- contrats partages sans UI deceptive.

### PR-C2 — Ingestion et jobs

- intake ;
- OCR/extraction comme adapters ;
- identity/scope/duplicate gates ;
- jobs progress/cancel/retry ;
- donnees privees et audit.

### PR-C3 — Pre-correction explicable

- score brouillon par critere ;
- preuves et confiance ;
- aucune regle de sujet codee en dur ;
- aucune note finale automatique.

### PR-C4 — Calibration et controle qualite

- profil institutionnel ;
- statistiques de cohorte ;
- alertes de derive ;
- echantillonnage meilleurs/faibles/cas limites ;
- validation professeur obligatoire.

### PR-C5 — Feedback et exports

- feedback student-safe ;
- preview ;
- validation ;
- exports CSV/XLSX/rapport ;
- aucune publication silencieuse.

Chaque PR doit etre courte, testee et compatible avec Project/Scope, Template Registry, Jobs,
Resource Truth, permissions et observabilite. Vincent doit signaler les features utiles qu'il
possede deja plutot que les recoder.

## Reponse attendue de Vincent

Vincent doit repondre dans `SYNC_THREAD_MALEX_VINCENT.md` avec :

1. les features Corrector retrouvees dans ses projets ;
2. leur statut d'absorption ;
3. les ecarts avec cette decision ;
4. les tables/routes/services/tests proposes pour PR-C0 et PR-C1 ;
5. les elements qu'il estime devoir conserver comme methode ou interface ;
6. les risques de migration.

Il peut challenger le detail technique. Il ne doit pas reouvrir la decision structurante :
**Corrector est une capacite absorbee par MasterFlow, pas un persona metier souverain.**
