import {z} from 'zod';

/**
 * Contrat partagé MasterFlow — schémas Zod + types inférés.
 *
 * Source de vérité de l'interface backend ↔ frontend (MALEX). Tout payload d'API et
 * tout message WebSocket est défini ici. Les routers backend valident avec ces schémas ;
 * le front MALEX importe les types correspondants.
 *
 * Convention : `XxxSchema` (Zod) + `Xxx` (type inféré). Champs JSON renvoyés parsés
 * (objets), pas en chaînes — la (dé)sérialisation reste interne à la BDD.
 */

// ───────────────────────── Identité & rôles ─────────────────────────

export const RoleSchema = z.enum(['student', 'teacher', 'admin', 'godmode']);
export type Role = z.infer<typeof RoleSchema>;

/** Ordre de privilège — sert au middleware requireRole (≥). */
export const ROLE_RANK: Record<Role, number> = {
  student: 0,
  teacher: 1,
  admin: 2,
  godmode: 3,
};

export const UserSchema = z.object({
  id: z.string(),
  username: z.string(),
  display_name: z.string(),
  email: z.string().email().nullable().optional(),
  role: RoleSchema,
});
export type User = z.infer<typeof UserSchema>;

// ───────────────────────── Auth ─────────────────────────

export const RegisterRequestSchema = z.object({
  username: z.string().min(3).max(64),
  display_name: z.string().min(1).max(120),
  password: z.string().min(8).max(200),
  email: z.string().email().optional(),
  invite_code: z.string().optional(),
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const LoginRequestSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const AuthResponseSchema = z.object({
  token: z.string(),
  user: UserSchema,
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

// ───────────────────────── Rooms ─────────────────────────

export const ZoomLevelSchema = z.enum(['overview', 'workspace', 'task', 'detail', 'debug', 'audit']);
export type ZoomLevel = z.infer<typeof ZoomLevelSchema>;

export const RoomSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  owner_id: z.string().nullable(),
  context: z.record(z.unknown()).nullable(),
  is_public: z.boolean(),
});
export type Room = z.infer<typeof RoomSchema>;

export const RoomInstanceSchema = z.object({
  id: z.string(),
  room_id: z.string(),
  user_id: z.string(),
  zoom_level: ZoomLevelSchema,
  active_surface: z.string(),
  cognitive_density: z.enum(['low', 'medium', 'high']),
  widget_state: z.record(z.unknown()).nullable(),
  updated_at: z.number(),
});
export type RoomInstance = z.infer<typeof RoomInstanceSchema>;

export const UpdateRoomInstanceSchema = z.object({
  zoom_level: ZoomLevelSchema.optional(),
  active_surface: z.string().optional(),
  cognitive_density: z.enum(['low', 'medium', 'high']).optional(),
  widget_state: z.record(z.unknown()).optional(),
});
export type UpdateRoomInstance = z.infer<typeof UpdateRoomInstanceSchema>;

// ───────────────────────── Personas & chimères ─────────────────────────

export const PersonaStatusSchema = z.enum(['active', 'deprecated']);
export type PersonaStatus = z.infer<typeof PersonaStatusSchema>;

export const PersonaSchema = z.object({
  id: z.string(),
  name: z.string(),
  owner_type: z.string(),
  domain: z.string(),
  status: PersonaStatusSchema,
  voice_config: z.record(z.unknown()).nullable(),
  method_config: z.record(z.unknown()).nullable(),
  visual_config: z.record(z.unknown()).nullable(),
  permissions: z.record(z.unknown()).nullable(),
});
export type Persona = z.infer<typeof PersonaSchema>;

/** Poids de fusion (0..1). `voice`/`method`/`mirror` selon ANIMATION_SPEC + DATA_SCHEMA. */
export const BlendWeightsSchema = z.object({
  voice: z.number().min(0).max(1).default(0.7),
  method: z.number().min(0).max(1).default(0.3),
  mirror: z.number().min(0).max(1).default(0).optional(),
});
export type BlendWeights = z.infer<typeof BlendWeightsSchema>;

export const BlendRequestSchema = z.object({
  room_instance_id: z.string(),
  primary_persona_id: z.string(),
  secondary_persona_id: z.string(),
  blend_weights: BlendWeightsSchema,
  active_layers: z.array(z.string()).default(['voice', 'method_signature']),
});
export type BlendRequest = z.infer<typeof BlendRequestSchema>;

export const PersonaBlendSchema = z.object({
  id: z.string(),
  room_instance_id: z.string(),
  primary_persona: PersonaSchema,
  secondary_persona: PersonaSchema.nullable(),
  blend_weights: BlendWeightsSchema,
  active_layers: z.array(z.string()),
  /** Invariant : 1 seul porte-parole sémantique = le persona primaire. */
  speaker_persona_id: z.string(),
  hybrid_voice_config: z.record(z.unknown()),
  is_active: z.boolean(),
});
export type PersonaBlend = z.infer<typeof PersonaBlendSchema>;

// ───────────────────────── Cycle de vie des actions ─────────────────────────

export const ActionStatusSchema = z.enum([
  'draft',
  'candidate',
  'preflight',
  'pending_validation',
  'approved',
  'rejected',
  'executing',
  'completed',
  'failed',
]);
export type ActionStatus = z.infer<typeof ActionStatusSchema>;

export const RiskLevelSchema = z.enum(['low', 'medium', 'medium_high', 'high', 'variable']);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export const CreateActionSchema = z.object({
  registry_id: z.string().optional(),
  intent: z.string().min(1),
  object_type: z.string().min(1),
  engine: z.string().optional(),
  room_id: z.string().optional(),
  payload: z.record(z.unknown()).default({}),
});
export type CreateAction = z.infer<typeof CreateActionSchema>;

export const PreflightResultSchema = z.object({
  permission_check: z.enum(['passed', 'failed']),
  context_locks: z.array(z.string()),
  resource_availability: z.string(),
  rate_limit: z.string(),
  warnings: z.array(z.string()),
  requires_validation: z.boolean(),
  validator_role: RoleSchema.nullable(),
  risk_level: RiskLevelSchema,
  estimated_duration_ms: z.number().optional(),
});
export type PreflightResult = z.infer<typeof PreflightResultSchema>;

export const ValidationDecisionSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  note: z.string().optional(),
});
export type ValidationDecision = z.infer<typeof ValidationDecisionSchema>;

export const ActionSchema = z.object({
  id: z.string(),
  registry_id: z.string().nullable(),
  intent: z.string(),
  object_type: z.string(),
  status: ActionStatusSchema,
  engine: z.string().nullable(),
  risk_level: RiskLevelSchema.nullable(),
  payload: z.record(z.unknown()).nullable(),
  preflight: PreflightResultSchema.nullable(),
  validator_id: z.string().nullable(),
  validation_note: z.string().nullable(),
  result: z.record(z.unknown()).nullable(),
  error: z.string().nullable(),
  created_at: z.number(),
  updated_at: z.number(),
});
export type Action = z.infer<typeof ActionSchema>;

/**
 * Statut d'implémentation d'une action, pour que l'UI sache quoi afficher :
 * - `live` : endpoint réellement branché et fonctionnel ;
 * - `future` : prévu plus tard (à afficher verrouillé / « à venir », jamais comme fonctionnel) ;
 * - `out_of_scope` : hors périmètre de cette version (à masquer côté UI).
 * Défaut prudent : `future` (une action non taguée n'est jamais présentée comme fonctionnelle).
 */
export const RegistryStatusSchema = z.enum(['live', 'future', 'out_of_scope']);
export type RegistryStatus = z.infer<typeof RegistryStatusSchema>;

/** Entrée du registre d'actions (chargé depuis action_registry_seed.v1.json). */
export const ActionRegistryEntrySchema = z.object({
  action_id: z.string(),
  label: z.string(),
  endpoint: z.string(),
  risk_level: z.string(),
  preflight_required: z.boolean(),
  validation_required: z.union([z.boolean(), z.literal('depends_on_preflight')]),
  ui_surface: z.string(),
  status: RegistryStatusSchema.default('future'),
});
export type ActionRegistryEntry = z.infer<typeof ActionRegistryEntrySchema>;

// ───────────────────────── Registre des adapters ─────────────────────────

export const AdapterKindSchema = z.enum([
  'ocr_submission',
  'morphological_reference',
  'wooclap_import',
  'transcript_import',
  'teacher_note',
]);
export type AdapterKind = z.infer<typeof AdapterKindSchema>;

export const AdapterRuntimeStatusSchema = z.enum([
  'shell',
  'partial',
  'live',
  'deprecated',
  'blocked',
]);
export type AdapterRuntimeStatus = z.infer<typeof AdapterRuntimeStatusSchema>;

export const AdapterUiStatusSchema = z.enum([
  'hidden',
  'locked',
  'readonly',
  'actionable',
  'admin_only',
]);
export type AdapterUiStatus = z.infer<typeof AdapterUiStatusSchema>;

/**
 * Déclaration d'un adapter d'entrée. Le registre décrit une capacité et ses
 * garde-fous ; il ne constitue ni une permission d'usage ni un runner.
 */
export const AdapterRegistryEntrySchema = z
  .object({
    adapter_id: z.string().min(1),
    label: z.string().min(1),
    kind: AdapterKindSchema,
    owner_engine: z.string().min(1),
    runner_family: z.string().min(1).nullable(),
    input_types: z.array(z.string().min(1)).min(1),
    output_source_type: z.enum([
      'submission',
      'rubric',
      'transcript',
      'wooclap',
      'survey',
      'teacher_note',
      'calendar',
      'morphological_reference',
    ]),
    output_contract: z.string().min(1),
    capabilities: z.array(z.string().min(1)).min(1),
    required_gates: z.array(z.string().min(1)),
    data_classification: z.enum(['standard', 'private', 'sensitive_private']),
    privacy_mode: z.enum(['local_only', 'approved_remote', 'hybrid']),
    risk_level: RiskLevelSchema,
    minimum_role: RoleSchema,
    runtime_status: AdapterRuntimeStatusSchema,
    ui_status: AdapterUiStatusSchema,
    executor_ref: z.string().min(1).nullable(),
    feature_flag: z.string().min(1).nullable(),
    limitations: z.array(z.string().min(1)),
  })
  .superRefine((entry, ctx) => {
    if (entry.runtime_status === 'live' && !entry.executor_ref) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Un adapter live doit déclarer un executor_ref.',
        path: ['executor_ref'],
      });
    }
    if (entry.ui_status === 'actionable' && entry.runtime_status !== 'live') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Un adapter non live ne peut pas être actionable.',
        path: ['ui_status'],
      });
    }
  });
export type AdapterRegistryEntry = z.infer<typeof AdapterRegistryEntrySchema>;

/**
 * Diagnostic d'usage tokens — réponse de `GET /diagnostics/token-usage`
 * (lecture gated admin/godmode). Schéma additif : aucun runtime existant n'en dépend.
 */
export const TokenUsageGroupBySchema = z.enum(['model', 'task', 'user', 'day']);
export type TokenUsageGroupBy = z.infer<typeof TokenUsageGroupBySchema>;

export const TokenUsageRowSchema = z.object({
  group: z.string(),
  prompt_tokens: z.number(),
  completion_tokens: z.number(),
  cost_eur: z.number(),
  events: z.number(),
});
export type TokenUsageRow = z.infer<typeof TokenUsageRowSchema>;

export const TokenUsageReportSchema = z.object({
  group_by: TokenUsageGroupBySchema,
  from: z.number(),
  to: z.number(),
  totals: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
    cost_eur: z.number(),
    events: z.number(),
  }),
  rows: z.array(TokenUsageRowSchema),
});
export type TokenUsageReport = z.infer<typeof TokenUsageReportSchema>;

// ───────────────────────── Evidence & signaux pédagogiques ─────────────────────────

export const EvidenceSourceTypeSchema = z.enum([
  'submission',
  'rubric',
  'transcript',
  'wooclap',
  'survey',
  'teacher_note',
  'calendar',
]);
export type EvidenceSourceType = z.infer<typeof EvidenceSourceTypeSchema>;

export const EvidenceEventSchema = z.object({
  evidence_id: z.string().min(1),
  source_type: EvidenceSourceTypeSchema,
  adapter_id: z.string().min(1),
  owner_id: z.string().min(1),
  project_scope: z.string().min(1),
  target_refs: z.array(z.string().min(1)),
  payload_ref: z.string().min(1),
  extraction_confidence: z.number().min(0).max(1).nullable(),
  privacy_level: z.enum(['private', 'restricted', 'shared']),
  occurred_at: z.number().int().nonnegative(),
  status: z.enum(['candidate', 'validated', 'rejected', 'archived']),
});
export type EvidenceEvent = z.infer<typeof EvidenceEventSchema>;

export const PedagogicalSignalSchema = z.object({
  signal_id: z.string().min(1),
  signal_type: z.enum([
    'progression',
    'blockage',
    'confusion',
    'overload',
    'method',
    'subject_quality',
    'drift',
  ]),
  level: z.enum(['individual', 'group', 'cohort', 'course', 'method', 'system']),
  project_scope: z.string().min(1),
  evidence_refs: z.array(z.string().min(1)).min(1),
  recurrence: z.number().int().nonnegative(),
  contradiction_refs: z.array(z.string().min(1)),
  confidence: z.number().min(0).max(1).nullable(),
  sensitivity: z.enum(['normal', 'sensitive', 'highly_sensitive']),
  status: z.enum([
    'observation',
    'hypothesis',
    'candidate_pattern',
    'validated_alert',
    'stale',
    'archived',
  ]),
  created_at: z.number().int().nonnegative(),
  updated_at: z.number().int().nonnegative(),
});
export type PedagogicalSignal = z.infer<typeof PedagogicalSignalSchema>;

export const TeacherDecisionDeltaSchema = z
  .object({
    delta_id: z.string().min(1),
    object_type: z.enum([
      'criterion_score',
      'feedback',
      'rubric',
      'calibration',
      'subject',
      'remediation',
    ]),
    object_ref: z.string().min(1),
    ai_proposal_ref: z.string().min(1),
    human_decision_ref: z.string().min(1),
    changed_fields: z.array(z.string().min(1)).min(1),
    reason_code: z.string().min(1).nullable(),
    free_note_ref: z.string().min(1).nullable(),
    teacher_id: z.string().min(1),
    context_refs: z.array(z.string().min(1)),
    created_at: z.number().int().nonnegative(),
  })
  .refine((delta) => delta.ai_proposal_ref !== delta.human_decision_ref, {
    message: 'La proposition IA et la décision humaine doivent rester distinctes.',
    path: ['human_decision_ref'],
  });
export type TeacherDecisionDelta = z.infer<typeof TeacherDecisionDeltaSchema>;

export const LLMTaskSchema = z.enum([
  'ocr',
  'rubric_extraction',
  'criterion_analysis',
  'feedback_draft',
  'cohort_synthesis',
  'subject_revision',
  'chat',
]);
export type LLMTask = z.infer<typeof LLMTaskSchema>;

export const TaskModelProfileSchema = z.object({
  profile_id: z.string().min(1),
  task: LLMTaskSchema,
  allowed_providers: z.array(z.string().min(1)).min(1),
  fallback_order: z.array(z.string().min(1)),
  privacy_mode: z.enum(['local_only', 'approved_remote', 'hybrid']),
  max_cost_eur: z.number().nonnegative().nullable(),
  max_latency_ms: z.number().int().positive().nullable(),
  status: z.enum(['draft', 'validated', 'disabled']),
});
export type TaskModelProfile = z.infer<typeof TaskModelProfileSchema>;

// ───────────────────────── Correction versionnée PR-C1 ─────────────────────────

export const RubricCriterionSchema = z.object({
  criterion_id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1),
  weight: z.number().positive().max(1),
  max_points: z.number().positive(),
  evidence_requirements: z.array(z.string().min(1)),
  required: z.boolean(),
});
export type RubricCriterion = z.infer<typeof RubricCriterionSchema>;

export const RubricTemplateSchema = z.object({
  template_id: z.string().min(1),
  owner_id: z.string().min(1),
  project_scope: z.string().min(1),
  title: z.string().min(1),
  subject_ref: z.string().min(1).nullable(),
  current_version_ref: z.string().min(1).nullable(),
  status: z.enum(['draft', 'active', 'deprecated']),
  created_at: z.number().int().nonnegative(),
  updated_at: z.number().int().nonnegative(),
});
export type RubricTemplate = z.infer<typeof RubricTemplateSchema>;

export const RubricVersionSchema = z
  .object({
    version_id: z.string().min(1),
    template_id: z.string().min(1),
    version: z.number().int().positive(),
    project_scope: z.string().min(1),
    criteria: z.array(RubricCriterionSchema).min(1),
    total_points: z.number().positive(),
    status: z.enum(['draft', 'candidate', 'validated', 'archived']),
    created_by: z.string().min(1),
    created_at: z.number().int().nonnegative(),
  })
  .superRefine((rubric, ctx) => {
    const weight = rubric.criteria.reduce((total, criterion) => total + criterion.weight, 0);
    if (Math.abs(weight - 1) > 0.0001) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La somme des poids de critères doit être égale à 1.',
        path: ['criteria'],
      });
    }
    const points = rubric.criteria.reduce((total, criterion) => total + criterion.max_points, 0);
    if (Math.abs(points - rubric.total_points) > 0.0001) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Le total du barème doit correspondre aux points des critères.',
        path: ['total_points'],
      });
    }
  });
export type RubricVersion = z.infer<typeof RubricVersionSchema>;

const GradeBandSchema = z.tuple([z.number(), z.number()]);

export const InstitutionalGradingProfileSchema = z
  .object({
    profile_id: z.string().min(1),
    owner_id: z.string().min(1),
    project_scope: z.string().min(1),
    version: z.number().int().positive(),
    scale: GradeBandSchema,
    expected_cohort_band: GradeBandSchema,
    anchors: z.object({
      insufficient: GradeBandSchema,
      minimum_met: GradeBandSchema,
      expected: GradeBandSchema,
      strong: GradeBandSchema,
      exceptional: GradeBandSchema,
    }),
    calibration_mode: z.literal('diagnostic_then_teacher_validation'),
    max_global_delta: z.number().nonnegative(),
    protected_thresholds: z.array(z.number()),
    threshold_crossing_requires_validation: z.boolean(),
    status: z.enum(['draft', 'validated', 'deprecated']),
    created_at: z.number().int().nonnegative(),
  })
  .superRefine((profile, ctx) => {
    const [scaleMin, scaleMax] = profile.scale;
    const bands = [profile.expected_cohort_band, ...Object.values(profile.anchors)];
    if (scaleMin >= scaleMax || bands.some(([min, max]) => min > max || min < scaleMin || max > scaleMax)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Les bandes de notation doivent être ordonnées et incluses dans l’échelle.',
        path: ['anchors'],
      });
    }
  });
export type InstitutionalGradingProfile = z.infer<typeof InstitutionalGradingProfileSchema>;

export const CorrectionBatchSchema = z.object({
  batch_id: z.string().min(1),
  owner_id: z.string().min(1),
  project_scope: z.string().min(1),
  rubric_version_id: z.string().min(1),
  grading_profile_id: z.string().min(1),
  status: z.enum(['draft', 'ready', 'running', 'review', 'completed', 'failed', 'archived']),
  submission_count: z.number().int().nonnegative(),
  created_at: z.number().int().nonnegative(),
  updated_at: z.number().int().nonnegative(),
});
export type CorrectionBatch = z.infer<typeof CorrectionBatchSchema>;

export const SubmissionRecordSchema = z.object({
  submission_id: z.string().min(1),
  batch_id: z.string().min(1),
  owner_id: z.string().min(1),
  project_scope: z.string().min(1),
  student_ref: z.string().min(1).nullable(),
  source_evidence_ref: z.string().min(1),
  identity_status: z.enum(['unknown', 'candidate', 'confirmed', 'rejected']),
  status: z.enum(['candidate', 'ready', 'processing', 'review', 'completed', 'rejected']),
  privacy_level: z.literal('private'),
  created_at: z.number().int().nonnegative(),
  updated_at: z.number().int().nonnegative(),
});
export type SubmissionRecord = z.infer<typeof SubmissionRecordSchema>;

export const PreCorrectionManifestSchema = z
  .object({
    manifest_id: z.string().min(1),
    batch_id: z.string().min(1),
    project_scope: z.string().min(1),
    rubric_version_id: z.string().min(1),
    grading_profile_id: z.string().min(1),
    submission_refs: z.array(z.string().min(1)).min(1),
    workflow_version: z.string().min(1),
    status: z.enum(['draft', 'validated', 'executing', 'completed', 'rejected']),
    created_by: z.string().min(1),
    validation_ref: z.string().min(1).nullable(),
    created_at: z.number().int().nonnegative(),
  })
  .refine(
    (manifest) => manifest.status === 'draft' || manifest.status === 'rejected' || manifest.validation_ref !== null,
    {
      message: 'Un manifest utilisable doit référencer une validation humaine.',
      path: ['validation_ref'],
    },
  );
export type PreCorrectionManifest = z.infer<typeof PreCorrectionManifestSchema>;

// ───────────────────────── Pré-correction explicable PR-C3 ─────────────────────────

export const PreCorrectionAnalysisTypeSchema = z.enum([
  'ocr_structured',
  'rubric_scoring',
  'creative_structure',
  'portfolio_review',
  'mixed',
]);
export type PreCorrectionAnalysisType = z.infer<typeof PreCorrectionAnalysisTypeSchema>;

/**
 * Proposition de score strictement bornée à un critère.
 *
 * Ce contrat ne possède volontairement ni note finale, ni statut validé :
 * une proposition reste candidate jusqu'à la décision distincte du professeur.
 */
export const CriterionScoreDraftSchema = z
  .object({
    draft_id: z.string().min(1),
    run_id: z.string().min(1),
    submission_id: z.string().min(1),
    rubric_version_id: z.string().min(1),
    criterion_id: z.string().min(1),
    draft_score: z.number().nonnegative(),
    max_points: z.number().positive(),
    evidence_refs: z.array(z.string().min(1)).min(1),
    confidence: z.number().min(0).max(1),
    comment_ref: z.string().min(1).nullable(),
    status: z.enum(['candidate', 'rejected', 'superseded']),
    created_at: z.number().int().nonnegative(),
  })
  .strict()
  .refine((draft) => draft.draft_score <= draft.max_points, {
    message: 'Un score brouillon ne peut pas dépasser le maximum du critère.',
    path: ['draft_score'],
  });
export type CriterionScoreDraft = z.infer<typeof CriterionScoreDraftSchema>;

/**
 * Enveloppe d'une analyse de pré-correction.
 *
 * Le run aboutit toujours en review humaine. Les scores restent dans les
 * CriterionScoreDraft référencés et ne sont jamais agrégés en note finale ici.
 */
export const PreCorrectionRunDraftSchema = z
  .object({
    run_id: z.string().min(1),
    manifest_id: z.string().min(1),
    batch_id: z.string().min(1),
    submission_id: z.string().min(1),
    owner_id: z.string().min(1),
    project_scope: z.string().min(1),
    rubric_version_id: z.string().min(1),
    grading_profile_id: z.string().min(1),
    analysis_type: PreCorrectionAnalysisTypeSchema,
    evidence_snapshot_ref: z.string().min(1),
    method_version: z.string().min(1),
    model_profile_ref: z.string().min(1).nullable(),
    criterion_score_refs: z.array(z.string().min(1)).min(1),
    review_reasons: z.array(z.string().min(1)),
    status: z.literal('needs_review'),
    created_at: z.number().int().nonnegative(),
    updated_at: z.number().int().nonnegative(),
  })
  .strict();
export type PreCorrectionRunDraft = z.infer<typeof PreCorrectionRunDraftSchema>;

// ───────────────────────── Calibration et contrôle qualité PR-C4 ─────────────────────────

export const CalibrationPositionSchema = z.enum([
  'insufficient_data',
  'below_expected_band',
  'within_expected_band',
  'above_expected_band',
]);
export type CalibrationPosition = z.infer<typeof CalibrationPositionSchema>;

export const CohortScoreStatisticsSchema = z
  .object({
    sample_count: z.number().int().positive(),
    scale: GradeBandSchema,
    expected_band: GradeBandSchema,
    mean_raw_score: z.number(),
    median_raw_score: z.number(),
    min_raw_score: z.number(),
    max_raw_score: z.number(),
    standard_deviation: z.number().nonnegative(),
    position: CalibrationPositionSchema,
  })
  .strict();
export type CohortScoreStatistics = z.infer<typeof CohortScoreStatisticsSchema>;

export const QualitySelectionReasonSchema = z.enum([
  'strongest_draft',
  'weakest_draft',
  'protected_threshold_boundary',
  'statistical_outlier',
  'low_confidence',
]);
export type QualitySelectionReason = z.infer<typeof QualitySelectionReasonSchema>;

export const QualityReviewItemSchema = z
  .object({
    item_id: z.string().min(1),
    calibration_review_id: z.string().min(1),
    run_id: z.string().min(1),
    submission_id: z.string().min(1),
    raw_score: z.number(),
    scale: GradeBandSchema,
    mean_confidence: z.number().min(0).max(1),
    selection_reasons: z.array(QualitySelectionReasonSchema).min(1),
    status: z.literal('review_required'),
    created_at: z.number().int().nonnegative(),
  })
  .strict();
export type QualityReviewItem = z.infer<typeof QualityReviewItemSchema>;

/**
 * Diagnostic de cohorte candidat. Le delta proposé est une information de
 * review bornée ; il n'est appliqué à aucun score par ce contrat.
 */
export const CohortCalibrationReviewSchema = z
  .object({
    review_id: z.string().min(1),
    batch_id: z.string().min(1),
    owner_id: z.string().min(1),
    project_scope: z.string().min(1),
    grading_profile_id: z.string().min(1),
    method_version: z.string().min(1),
    statistics: CohortScoreStatisticsSchema,
    diagnostic_delta_candidate: z.number().nullable(),
    protected_threshold_crossing_count: z.number().int().nonnegative(),
    alert_codes: z.array(
      z.enum([
        'insufficient_sample',
        'cohort_below_expected_band',
        'cohort_above_expected_band',
        'protected_threshold_crossing',
      ]),
    ),
    sample_item_refs: z.array(z.string().min(1)).min(1),
    status: z.literal('review_required'),
    created_at: z.number().int().nonnegative(),
  })
  .strict();
export type CohortCalibrationReview = z.infer<typeof CohortCalibrationReviewSchema>;

// ───────────────────────── Feedback et exports supervisés PR-C5 ─────────────────────────

const StorageRefSchema = z.string().startsWith('storage://');

export const FeedbackDraftSchema = z
  .object({
    feedback_id: z.string().min(1),
    run_id: z.string().min(1),
    submission_id: z.string().min(1),
    owner_id: z.string().min(1),
    project_scope: z.string().min(1),
    method_version: z.string().min(1),
    model_profile_ref: z.string().min(1).nullable(),
    observed_strength_ref: StorageRefSchema,
    observed_issue_ref: StorageRefSchema,
    evidence_refs: z.array(z.string().min(1)).min(1),
    impact_on_work_ref: StorageRefSchema,
    pedagogical_axis_ref: StorageRefSchema,
    next_action_ref: StorageRefSchema,
    validation_criterion_ref: StorageRefSchema,
    tone_level: z.enum(['supportive', 'clear', 'firm']),
    evaluation_alignment: z.enum(['aligned', 'review_required']),
    teacher_validation_required: z.literal(true),
    status: z.enum(['needs_teacher_validation', 'approved', 'rejected']),
    validator_id: z.string().min(1).nullable(),
    validation_ref: z.string().min(1).nullable(),
    created_at: z.number().int().nonnegative(),
    updated_at: z.number().int().nonnegative(),
  })
  .strict()
  .superRefine((feedback, ctx) => {
    const decided = feedback.status === 'approved' || feedback.status === 'rejected';
    if (decided && (!feedback.validator_id || !feedback.validation_ref)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Un feedback décidé doit référencer son validateur et sa décision.',
        path: ['validation_ref'],
      });
    }
    if (!decided && (feedback.validator_id || feedback.validation_ref)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Un feedback en attente ne peut pas porter de validation.',
        path: ['validator_id'],
      });
    }
  });
export type FeedbackDraft = z.infer<typeof FeedbackDraftSchema>;

export const CorrectionExportFormatSchema = z.enum(['csv', 'xlsx', 'pdf', 'report']);
export type CorrectionExportFormat = z.infer<typeof CorrectionExportFormatSchema>;

/**
 * Preview privée d'un export de correction.
 *
 * Même approuvée, elle n'est jamais une publication et ne déclenche aucun
 * envoi externe. Le rendu réel reste derrière un futur job export_prepare.
 */
export const CorrectionExportPreviewSchema = z
  .object({
    export_id: z.string().min(1),
    batch_id: z.string().min(1),
    owner_id: z.string().min(1),
    project_scope: z.string().min(1),
    format: CorrectionExportFormatSchema,
    target: z.enum(['teacher_download', 'manual_injection']),
    source_feedback_refs: z.array(z.string().min(1)).min(1),
    source_run_refs: z.array(z.string().min(1)).min(1),
    preview_ref: StorageRefSchema,
    schema_version: z.string().min(1),
    contains_private_data: z.literal(true),
    publication_allowed: z.literal(false),
    human_validation_required: z.literal(true),
    status: z.enum(['needs_teacher_validation', 'approved_for_export', 'rejected']),
    validator_id: z.string().min(1).nullable(),
    validation_ref: z.string().min(1).nullable(),
    created_at: z.number().int().nonnegative(),
    updated_at: z.number().int().nonnegative(),
  })
  .strict()
  .superRefine((preview, ctx) => {
    const decided = preview.status === 'approved_for_export' || preview.status === 'rejected';
    if (decided && (!preview.validator_id || !preview.validation_ref)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Un export décidé doit référencer son validateur et sa décision.',
        path: ['validation_ref'],
      });
    }
    if (!decided && (preview.validator_id || preview.validation_ref)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Une preview en attente ne peut pas porter de validation.',
        path: ['validator_id'],
      });
    }
  });
export type CorrectionExportPreview = z.infer<typeof CorrectionExportPreviewSchema>;

// ───────────────────────── Jobs / ingestion OCR PR-C2 ─────────────────────────

export const JobStatusSchema = z.enum([
  'queued',
  'running',
  'needs_review',
  'completed',
  'failed',
  'cancelled',
  'expired',
]);
export type JobStatus = z.infer<typeof JobStatusSchema>;

export const JobTypeSchema = z.enum([
  'rag_reindex',
  'resource_revoke',
  'export_prepare',
  'asset_prepare',
  'ocr_prepare',
  'correction_prepare',
]);
export type JobType = z.infer<typeof JobTypeSchema>;

export const JobSchema = z.object({
  job_id: z.string().min(1),
  type: JobTypeSchema,
  status: JobStatusSchema,
  owner_id: z.string().min(1),
  scope_type: z.string().min(1),
  scope_id: z.string().min(1),
  risk_level: RiskLevelSchema,
  payload: z.record(z.unknown()),
  result: z.record(z.unknown()).nullable(),
  error: z.string().nullable(),
  progress: z.number().int().min(0).max(100),
  retry_count: z.number().int().nonnegative(),
  created_at: z.number().int().nonnegative(),
  updated_at: z.number().int().nonnegative(),
  started_at: z.number().int().nonnegative().nullable(),
  completed_at: z.number().int().nonnegative().nullable(),
  cancelled_at: z.number().int().nonnegative().nullable(),
  runner_id: z.string().min(1).nullable(),
  claimed_at: z.number().int().nonnegative().nullable(),
  lease_expires_at: z.number().int().nonnegative().nullable(),
});
export type Job = z.infer<typeof JobSchema>;

export const JobEventSchema = z.object({
  event_id: z.string().min(1),
  job_id: z.string().min(1),
  event_type: z.enum([
    'job_queued',
    'job_started',
    'job_progress',
    'job_needs_review',
    'job_completed',
    'job_failed',
    'job_cancelled',
    'job_retried',
  ]),
  detail: z.record(z.unknown()).nullable(),
  created_at: z.number().int().nonnegative(),
});
export type JobEvent = z.infer<typeof JobEventSchema>;

export const OcrPrepareRequestSchema = z
  .object({
    adapter_id: z.enum(['ocr-submission-v1', 'morphological-reference-v1']),
    owner_id: z.string().min(1),
    project_scope: z.string().min(1),
    source_ref: z.string().startsWith('storage://'),
    preflight_ref: z.string().min(1),
    manifest_ref: z.string().min(1).nullable(),
    consent_ref: z.string().min(1).nullable(),
    validation_ref: z.string().min(1).nullable(),
  })
  .superRefine((request, ctx) => {
    if (request.adapter_id === 'ocr-submission-v1' && !request.manifest_ref) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'L’OCR de copie exige un manifest de pré-correction.',
        path: ['manifest_ref'],
      });
    }
    if (request.adapter_id === 'morphological-reference-v1' && !request.consent_ref) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La référence morphologique exige un consentement explicite.',
        path: ['consent_ref'],
      });
    }
  });
export type OcrPrepareRequest = z.infer<typeof OcrPrepareRequestSchema>;

export const CorrectionPrepareRequestSchema = z.object({
  owner_id: z.string().min(1),
  project_scope: z.string().min(1),
  batch_id: z.string().min(1),
  manifest_ref: z.string().min(1),
  preflight_ref: z.string().min(1),
  validation_ref: z.string().min(1),
  workflow_version: z.string().min(1),
  source_kind: z.literal('validated_pre_correction_manifest'),
});
export type CorrectionPrepareRequest = z.infer<typeof CorrectionPrepareRequestSchema>;

export const ExportPrepareRequestSchema = z.object({
  owner_id: z.string().min(1),
  project_scope: z.string().min(1),
  batch_id: z.string().min(1),
  export_preview_ref: z.string().min(1),
  preflight_ref: z.string().min(1),
  validation_ref: z.string().min(1),
  source_kind: z.literal('approved_correction_export_preview'),
});
export type ExportPrepareRequest = z.infer<typeof ExportPrepareRequestSchema>;

// ───────────────────────── Ressources (anti-hallucination) ─────────────────────────

export const ResourceStatusSchema = z.enum(['candidate', 'validated', 'deprecated']);
export type ResourceStatus = z.infer<typeof ResourceStatusSchema>;

export const ResourceSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  url: z.string().nullable(),
  source: z.string(),
  status: ResourceStatusSchema,
  subjects: z.array(z.string()).nullable(),
});
export type Resource = z.infer<typeof ResourceSchema>;

export const ProposeResourceSchema = z.object({
  type: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url().optional(),
  source: z.string().min(1).default('user_proposal'),
  subjects: z.array(z.string()).default([]),
});
export type ProposeResource = z.infer<typeof ProposeResourceSchema>;

/**
 * Réponse de `GET /resources?q=&include_all=1`.
 * Par défaut, `results` ne contient que des ressources `status = 'validated'`
 * (anti-hallucination) ; `include_all=1` (admin/godmode) lève ce filtre.
 */
export const SearchResourcesResponseSchema = z.object({
  results: z.array(ResourceSchema),
  total: z.number(),
});
export type SearchResourcesResponse = z.infer<typeof SearchResourcesResponseSchema>;

// ───────────────────────── Contexte courant ─────────────────────────

export const CurrentContextSchema = z.object({
  user: UserSchema,
  room: RoomSchema,
  room_instance: RoomInstanceSchema,
  personas: z.array(PersonaSchema),
  active_blend: PersonaBlendSchema.nullable(),
  available_actions: z.array(ActionRegistryEntrySchema),
});
export type CurrentContext = z.infer<typeof CurrentContextSchema>;

// ───────────────────────── Messages WebSocket ─────────────────────────

/** Client → serveur. */
export const WsClientMessageSchema = z.discriminatedUnion('type', [
  z.object({type: z.literal('chat'), content: z.string().min(1)}),
  z.object({type: z.literal('ping')}),
]);
export type WsClientMessage = z.infer<typeof WsClientMessageSchema>;

/** Serveur → client. */
export const WsServerMessageSchema = z.discriminatedUnion('type', [
  z.object({type: z.literal('chat_start'), persona_id: z.string(), speaker: z.string()}),
  z.object({type: z.literal('chat_chunk'), content: z.string()}),
  z.object({
    type: z.literal('chat_end'),
    persona_id: z.string(),
    method_attribution: z.string().nullable(),
  }),
  z.object({type: z.literal('blend_update'), blend: PersonaBlendSchema}),
  z.object({type: z.literal('room_update'), widgets: z.array(z.string()), active_persona: z.string()}),
  z.object({type: z.literal('validation_required'), action_id: z.string(), summary: z.string()}),
  z.object({type: z.literal('job_completed'), job_id: z.string(), status: z.string()}),
  z.object({type: z.literal('error'), message: z.string()}),
  z.object({type: z.literal('pong')}),
]);
export type WsServerMessage = z.infer<typeof WsServerMessageSchema>;
