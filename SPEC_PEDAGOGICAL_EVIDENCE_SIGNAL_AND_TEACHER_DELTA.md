# SPEC — Evidence, signals et deltas professeur

Statut : `BACKEND IMPLEMENTED + PROJECT BRIDGE / PR-CB0 / 2026-06-13`

Implementation initiale Git :

- schemas Zod additifs poses dans `packages/shared/src/index.ts` ;
- tests de garde poses dans `apps/backend/tests/pedagogical_contracts.test.ts` ;
- migrations SQLite idempotentes posees dans `apps/backend/src/db/schema.ts` ;
- tests de contraintes et defaults poses dans `apps/backend/tests/pedagogical_storage.test.ts` ;
- depot interne permissionne pose dans `apps/backend/src/services/pedagogical_records.ts` ;
- `project_id` reel disponible pour preuves/signaux projet, fallback legacy owner-only ;
- ecriture projet `editor+`, lecture par membership, profils modele admin en draft ;
- aucune route ou capability `live` ajoutee a ce stade.

## But

Fournir le contrat minimal partage qui permet d'absorber OCR, WooClap, corrections, notes prof,
transcriptions et historiques Vincent sans construire immediatement le pipeline complet.

Cette PR ne corrige rien, ne note rien et n'ecrit aucun profil automatiquement.

## Contrats partages proposes

### EvidenceEvent

```ts
type EvidenceSourceType =
  | 'submission'
  | 'rubric'
  | 'transcript'
  | 'wooclap'
  | 'survey'
  | 'teacher_note'
  | 'calendar';

type EvidenceStatus = 'candidate' | 'validated' | 'rejected' | 'archived';

interface EvidenceEvent {
  evidence_id: string;
  source_type: EvidenceSourceType;
  adapter_id: string;
  owner_id: string;
  project_id?: string | null;
  project_scope: string;
  target_refs: string[];
  payload_ref: string;
  extraction_confidence: number | null;
  privacy_level: 'private' | 'restricted' | 'shared';
  occurred_at: number;
  status: EvidenceStatus;
}
```

### PedagogicalSignal

```ts
type PedagogicalSignalStatus =
  | 'observation'
  | 'hypothesis'
  | 'candidate_pattern'
  | 'validated_alert'
  | 'stale'
  | 'archived';

interface PedagogicalSignal {
  signal_id: string;
  signal_type:
    | 'progression'
    | 'blockage'
    | 'confusion'
    | 'overload'
    | 'method'
    | 'subject_quality'
    | 'drift';
  level: 'individual' | 'group' | 'cohort' | 'course' | 'method' | 'system';
  project_id?: string | null;
  project_scope: string;
  evidence_refs: string[];
  recurrence: number;
  contradiction_refs: string[];
  confidence: number | null;
  sensitivity: 'normal' | 'sensitive' | 'highly_sensitive';
  status: PedagogicalSignalStatus;
  created_at: number;
  updated_at: number;
}
```

### TeacherDecisionDelta

```ts
interface TeacherDecisionDelta {
  delta_id: string;
  object_type:
    | 'criterion_score'
    | 'feedback'
    | 'rubric'
    | 'calibration'
    | 'subject'
    | 'remediation';
  object_ref: string;
  ai_proposal_ref: string;
  human_decision_ref: string;
  changed_fields: string[];
  reason_code: string | null;
  free_note_ref: string | null;
  teacher_id: string;
  context_refs: string[];
  created_at: number;
}
```

### TaskModelProfile

```ts
interface TaskModelProfile {
  profile_id: string;
  task:
    | 'ocr'
    | 'rubric_extraction'
    | 'criterion_analysis'
    | 'feedback_draft'
    | 'cohort_synthesis'
    | 'subject_revision'
    | 'chat';
  allowed_providers: string[];
  fallback_order: string[];
  privacy_mode: 'local_only' | 'approved_remote' | 'hybrid';
  max_cost_eur: number | null;
  max_latency_ms: number | null;
  status: 'draft' | 'validated' | 'disabled';
}
```

## Persistance proposee

PR-CB0 peut rester contrats + migrations sans routes d'ecriture publiques.

Tables :

```text
evidence_events
pedagogical_signals
teacher_decision_deltas
task_model_profiles
```

Contraintes :

- UUID en PK ;
- timestamps epoch ms ;
- FK ou refs verifiables ;
- index par scope, type, statut et date ;
- payload lourd conserve par reference, pas duplique ;
- donnees etudiantes privees par defaut ;
- aucune suppression silencieuse ;
- signal sensible jamais expose a student.

## Permissions

| Objet | Lecture | Ecriture |
|---|---|---|
| evidence privee | owner/teacher scope | adapter interne ou teacher |
| signal individuel | teacher/admin scope | engine interne |
| signal agrege | teacher/admin selon scope | engine interne |
| decision delta | teacher auteur + admin audit | cree lors d'une validation/modification |
| task model profile | admin/godmode | action sensible validee |

Le persona actif n'intervient jamais dans ces permissions.

### Bridge Project/Scope

- un objet avec `project_id` utilise les memberships du projet ;
- `editor+` est requis pour capturer une preuve ou creer un signal projet ;
- la lecture projet est bornee aux membres autorises ;
- les preuves multi-owner peuvent nourrir un signal seulement dans le meme projet ;
- pendant la migration, `project_scope` doit etre egal au `project_id` ;
- un objet sans `project_id` reste en mode legacy teacher owner-only.

## Evenements

```text
evidence.captured
evidence.validated
signal.observed
signal.promoted
signal.staled
teacher_delta.recorded
model_profile.proposed
model_profile.validated
```

Chaque evenement contient actor, scope, object ref et timestamp.

## Gates

- une evidence extraite reste candidate tant qu'elle n'est pas fiable ou validee ;
- un signal faible ne declenche aucune action ;
- un signal individuel sensible reste invisible cote etudiant ;
- un delta prof peut proposer un enrichissement, jamais l'appliquer ;
- modifier un task model profile passe par permission, preflight et validation admin ;
- aucune note finale dans PR-CB0.

## Tests minimum

1. un persona ne donne aucun acces a une evidence ;
2. un student ne lit pas un signal individuel sensible ;
3. un teacher hors scope ne lit pas l'evidence ;
4. un signal sans evidence ref est refuse ;
5. confidence hors `[0,1]` est refusee ;
6. un delta conserve proposition et decision distinctes ;
7. un delta ne modifie aucune rubrique automatiquement ;
8. un task profile non valide n'est pas routable ;
9. les payloads secrets ne sont jamais logges ;
10. migrations idempotentes.

## Hors scope PR-CB0

- OCR reel ;
- import WooClap ;
- correction batch ;
- dashboard classe ;
- profil etudiant ;
- adaptation automatique ;
- export ;
- choix automatique du meilleur modele ;
- UI finale.

## Acceptance

PR-CB0 est acceptee si les contrats permettent de brancher les features Vincent sans :

- creer un nouvel engine ;
- exposer des donnees ;
- transformer un signal en jugement ;
- confondre proposition IA et decision humaine ;
- annoncer une capability `live`.
