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

// ───────────────────────── Projects / scopes / ownership ─────────────────────────

export const ProjectStatusSchema = z.enum(['active', 'archived']);
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;

export const ProjectVisibilitySchema = z.enum(['private']);
export type ProjectVisibility = z.infer<typeof ProjectVisibilitySchema>;

export const ProjectMemberRoleSchema = z.enum(['viewer', 'participant', 'editor', 'owner', 'admin']);
export type ProjectMemberRole = z.infer<typeof ProjectMemberRoleSchema>;

export const ProjectSchema = z.object({
  project_id: z.string().min(1),
  owner_id: z.string().min(1),
  name: z.string().min(1).max(160),
  status: ProjectStatusSchema,
  visibility: ProjectVisibilitySchema,
  created_at: z.number().int().nonnegative(),
  updated_at: z.number().int().nonnegative(),
});
export type Project = z.infer<typeof ProjectSchema>;

export const ProjectMemberSchema = z.object({
  project_id: z.string().min(1),
  user_id: z.string().min(1),
  role: ProjectMemberRoleSchema,
  created_at: z.number().int().nonnegative(),
});
export type ProjectMember = z.infer<typeof ProjectMemberSchema>;

export const TransferProjectOwnershipSchema = z.object({
  project_id: z.string().min(1),
  new_owner_id: z.string().min(1),
});
export type TransferProjectOwnership = z.infer<typeof TransferProjectOwnershipSchema>;

export const OwnershipEdgeSchema = z.object({
  edge_id: z.string().min(1),
  owner_type: z.enum(['user', 'project']),
  owner_id: z.string().min(1),
  object_type: z.string().min(1),
  object_id: z.string().min(1),
  scope: z.string().min(1),
  created_at: z.number().int().nonnegative(),
});
export type OwnershipEdge = z.infer<typeof OwnershipEdgeSchema>;

export const ResourceScopeSchema = z.object({
  resource_id: z.string().min(1),
  scope_type: z.enum(['project']),
  scope_id: z.string().min(1),
  access_level: z.enum(['read', 'write', 'admin']),
  created_at: z.number().int().nonnegative(),
});
export type ResourceScope = z.infer<typeof ResourceScopeSchema>;

export const ScopedPermissionDecisionSchema = z.object({
  allowed: z.boolean(),
  reason: z.string().min(1),
  global_role: RoleSchema,
  project_role: ProjectMemberRoleSchema.nullable(),
  owner_match: z.boolean(),
  resource_scope_match: z.boolean().nullable(),
});
export type ScopedPermissionDecision = z.infer<typeof ScopedPermissionDecisionSchema>;

export const CreateProjectRequestSchema = z.object({
  name: z.string().min(1).max(160),
});
export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>;

export const AddProjectMemberRequestSchema = z.object({
  user_id: z.string().min(1),
  role: ProjectMemberRoleSchema,
});
export type AddProjectMemberRequest = z.infer<typeof AddProjectMemberRequestSchema>;

/**
 * Rattacher une ressource (déjà existante) au scope d'un projet, pour la partager
 * entre ses membres. `scope_type`/`scope_id`/`created_at` sont posés côté backend
 * (scope_id = id du projet de la route). Le client ne fournit que la ressource et le droit.
 */
export const AttachProjectResourceRequestSchema = z.object({
  resource_id: z.string().min(1),
  access_level: z.enum(['read', 'write', 'admin']).default('read'),
});
export type AttachProjectResourceRequest = z.infer<typeof AttachProjectResourceRequestSchema>;

// ───────────────────────── Inventory Core ─────────────────────────

export const InventoryScopeTypeSchema = z.enum(['user', 'project']);
export type InventoryScopeType = z.infer<typeof InventoryScopeTypeSchema>;

export const InventoryVisibilityScopeSchema = z.enum(['private', 'project']);
export type InventoryVisibilityScope = z.infer<typeof InventoryVisibilityScopeSchema>;

export const InventoryValidationStatusSchema = z.enum(['candidate', 'validated', 'archived']);
export type InventoryValidationStatus = z.infer<typeof InventoryValidationStatusSchema>;

export const InventoryItemTypeSchema = z.enum([
  'book',
  'comic',
  'manga',
  'artbook',
  'art_supply',
  'tool',
  'gear',
  'software',
  'product',
  'archive',
  'custom',
]);
export type InventoryItemType = z.infer<typeof InventoryItemTypeSchema>;

export const InventoryItemStatusSchema = z.enum([
  'detected',
  'owned_confirmed',
  'owned_declared',
  'wishlist',
  'complete_declared',
  'selective',
  'not_interested',
  'abandoned',
  'duplicate',
  'loan',
  'sell_or_give',
  'to_verify',
]);
export type InventoryItemStatus = z.infer<typeof InventoryItemStatusSchema>;

export const InventoryCollectionSchema = z.object({
  collection_id: z.string().min(1),
  owner_id: z.string().min(1),
  project_id: z.string().min(1).nullable(),
  scope_type: InventoryScopeTypeSchema,
  label: z.string().min(1).max(180),
  description: z.string().max(1000).nullable(),
  visibility_scope: InventoryVisibilityScopeSchema,
  validation_status: InventoryValidationStatusSchema,
  completion_state: z.enum(['unknown', 'selective', 'complete_declared', 'abandoned']),
  created_at: z.number().int().nonnegative(),
  updated_at: z.number().int().nonnegative(),
});
export type InventoryCollection = z.infer<typeof InventoryCollectionSchema>;

export const CollectionMatchSchema = z.object({
  match_id: z.string().min(1),
  item_id: z.string().min(1),
  collection_id: z.string().min(1),
  match_status: z.enum(['candidate', 'confirmed', 'rejected']),
  confidence: z.number().min(0).max(1).nullable(),
  source_ref: z.string().min(1).max(240).nullable(),
  created_at: z.number().int().nonnegative(),
  updated_at: z.number().int().nonnegative(),
});
export type CollectionMatch = z.infer<typeof CollectionMatchSchema>;

export const InventoryItemSchema = z.object({
  item_id: z.string().min(1),
  owner_id: z.string().min(1),
  project_id: z.string().min(1).nullable(),
  collection_id: z.string().min(1).nullable(),
  scope_type: InventoryScopeTypeSchema,
  type: InventoryItemTypeSchema,
  label: z.string().min(1).max(240),
  creator_or_brand: z.string().max(240).nullable(),
  item_status: InventoryItemStatusSchema,
  validation_status: InventoryValidationStatusSchema,
  intent: z.string().max(240).nullable(),
  quantity: z.number().int().positive(),
  condition: z.string().max(120).nullable(),
  estimated_value: z.number().nonnegative().nullable(),
  replacement_cost: z.number().nonnegative().nullable(),
  usage_tags: z.array(z.string().min(1).max(80)),
  source_refs: z.array(z.string().min(1).max(240)),
  visibility_scope: InventoryVisibilityScopeSchema,
  created_at: z.number().int().nonnegative(),
  updated_at: z.number().int().nonnegative(),
  archived_at: z.number().int().nonnegative().nullable(),
});
export type InventoryItem = z.infer<typeof InventoryItemSchema>;

export const CreateInventoryCollectionRequestSchema = z.object({
  project_id: z.string().min(1).nullable().optional(),
  label: z.string().min(1).max(180),
  description: z.string().max(1000).nullable().optional(),
  visibility_scope: InventoryVisibilityScopeSchema.optional(),
});
export type CreateInventoryCollectionRequest = z.input<typeof CreateInventoryCollectionRequestSchema>;

export const CreateInventoryItemRequestSchema = z.object({
  project_id: z.string().min(1).nullable().optional(),
  collection_id: z.string().min(1).nullable().optional(),
  type: InventoryItemTypeSchema,
  label: z.string().min(1).max(240),
  creator_or_brand: z.string().max(240).nullable().optional(),
  item_status: InventoryItemStatusSchema.default('detected'),
  intent: z.string().max(240).nullable().optional(),
  quantity: z.number().int().positive().default(1),
  condition: z.string().max(120).nullable().optional(),
  estimated_value: z.number().nonnegative().nullable().optional(),
  replacement_cost: z.number().nonnegative().nullable().optional(),
  usage_tags: z.array(z.string().min(1).max(80)).max(30).default([]),
  source_refs: z.array(z.string().min(1).max(240)).max(30).default([]),
  visibility_scope: InventoryVisibilityScopeSchema.optional(),
});
export type CreateInventoryItemRequest = z.input<typeof CreateInventoryItemRequestSchema>;

export const ListInventoryItemsRequestSchema = z.object({
  project_id: z.string().min(1).nullable().optional(),
  include_candidates: z.boolean().default(false),
});
export type ListInventoryItemsRequest = z.input<typeof ListInventoryItemsRequestSchema>;

export const InventoryOcrCandidateSchema = CreateInventoryItemRequestSchema.pick({
  type: true,
  label: true,
  creator_or_brand: true,
  item_status: true,
  intent: true,
  quantity: true,
  condition: true,
  estimated_value: true,
  replacement_cost: true,
  usage_tags: true,
}).extend({
  confidence: z.number().min(0).max(1).nullable().optional(),
  source_ref: z.string().min(1).max(240),
});
export type InventoryOcrCandidate = z.input<typeof InventoryOcrCandidateSchema>;

export const ScanInventoryPhotoRequestSchema = z.object({
  image_data: z.string().min(1),
  image_mime: z.string().default('image/jpeg'),
  collection_id: z.string().min(1).nullable().optional(),
  project_id: z.string().min(1).nullable().optional(),
  project_scope: z.string().min(1),
  notes: z.string().max(1000).nullable().optional(),
});
export type ScanInventoryPhotoRequest = z.input<typeof ScanInventoryPhotoRequestSchema>;

export const IngestInventoryOcrCandidatesRequestSchema = z.object({
  job_id: z.string().min(1),
  collection_id: z.string().min(1).nullable().optional(),
  candidates: z.array(InventoryOcrCandidateSchema).min(1).max(50),
});
export type IngestInventoryOcrCandidatesRequest = z.input<
  typeof IngestInventoryOcrCandidatesRequestSchema
>;

export const CreateCollectionMatchRequestSchema = z.object({
  item_id: z.string().min(1),
  confidence: z.number().min(0).max(1).nullable().optional(),
  source_ref: z.string().min(1).max(240).nullable().optional(),
});
export type CreateCollectionMatchRequest = z.input<typeof CreateCollectionMatchRequestSchema>;

export const ResolveCollectionMatchRequestSchema = z.object({
  decision: z.enum(['confirmed', 'rejected']),
});
export type ResolveCollectionMatchRequest = z.input<typeof ResolveCollectionMatchRequestSchema>;

export const SetCollectionCompletionRequestSchema = z.object({
  completion_state: z.enum(['unknown', 'selective', 'complete_declared', 'abandoned']),
});
export type SetCollectionCompletionRequest = z.input<
  typeof SetCollectionCompletionRequestSchema
>;

export const InventorySearchRequestSchema = z.object({
  query: z.string().min(2).max(240),
  project_id: z.string().min(1).nullable().optional(),
  limit: z.number().int().min(1).max(20).default(10),
});
export type InventorySearchRequest = z.input<typeof InventorySearchRequestSchema>;

export const InventorySearchResultSchema = z.object({
  item: InventoryItemSchema,
  score: z.number().min(0).max(1),
  availability_state: z.enum(['candidate_available', 'unknown']),
  availability_guaranteed: z.literal(false),
});
export type InventorySearchResult = z.infer<typeof InventorySearchResultSchema>;

export const InventoryProjectNeedSchema = z.object({
  need_id: z.string().min(1),
  project_id: z.string().min(1),
  owner_id: z.string().min(1),
  label: z.string().min(1).max(240),
  quantity: z.number().int().positive(),
  required_tags: z.array(z.string().min(1).max(80)),
  status: z.enum(['open', 'satisfied', 'abandoned']),
  created_at: z.number().int().nonnegative(),
  updated_at: z.number().int().nonnegative(),
});
export type InventoryProjectNeed = z.infer<typeof InventoryProjectNeedSchema>;

export const CreateInventoryProjectNeedRequestSchema = z.object({
  project_id: z.string().min(1),
  label: z.string().min(1).max(240),
  quantity: z.number().int().positive().default(1),
  required_tags: z.array(z.string().min(1).max(80)).max(30).default([]),
});
export type CreateInventoryProjectNeedRequest = z.input<
  typeof CreateInventoryProjectNeedRequestSchema
>;

export const MatchInventoryProjectNeedRequestSchema = z.object({
  inventory_complete_declared: z.boolean().default(false),
  limit: z.number().int().min(1).max(20).default(10),
});
export type MatchInventoryProjectNeedRequest = z.input<
  typeof MatchInventoryProjectNeedRequestSchema
>;

export const InventoryNeedMatchResultSchema = z.object({
  need: InventoryProjectNeedSchema,
  coverage_state: z.enum(['candidate_available', 'missing', 'unknown']),
  availability_guaranteed: z.literal(false),
  matches: z.array(InventorySearchResultSchema),
});
export type InventoryNeedMatchResult = z.infer<typeof InventoryNeedMatchResultSchema>;

export const InventoryDiagnosticsSchema = z.object({
  generated_at: z.number().int().nonnegative(),
  totals: z.object({
    items: z.number().int().nonnegative(),
    collections: z.number().int().nonnegative(),
    collection_matches: z.number().int().nonnegative(),
    project_needs: z.number().int().nonnegative(),
    active_rag_projections: z.number().int().nonnegative(),
  }),
  validation: z.object({
    items: z.object({
      candidate: z.number().int().nonnegative(),
      validated: z.number().int().nonnegative(),
      archived: z.number().int().nonnegative(),
    }),
    collections: z.object({
      candidate: z.number().int().nonnegative(),
      validated: z.number().int().nonnegative(),
      archived: z.number().int().nonnegative(),
    }),
  }),
  scopes: z.object({
    personal_items: z.number().int().nonnegative(),
    project_items: z.number().int().nonnegative(),
    personal_collections: z.number().int().nonnegative(),
    project_collections: z.number().int().nonnegative(),
  }),
  workflow: z.object({
    open_project_needs: z.number().int().nonnegative(),
    candidate_collection_matches: z.number().int().nonnegative(),
    validated_project_items_without_rag: z.number().int().nonnegative(),
    stale_rag_projections: z.number().int().nonnegative(),
  }),
});
export type InventoryDiagnostics = z.infer<typeof InventoryDiagnosticsSchema>;

// ───────────────────────── D12 Owner Cockpit read model ─────────────────────────

export const OwnerCockpitCapabilityStatusSchema = z.enum([
  'implemented',
  'partial',
  'locked',
  'absent',
]);

export const OwnerCockpitStatusSchema = z.object({
  generated_at: z.number().int().nonnegative(),
  runtime_truth: z.object({
    source: z.literal('runtime_database'),
    release_sha: z.string().min(7).nullable(),
    release_verification: z.enum(['reported', 'unverified']),
    github_sync: z.enum(['reported_by_release', 'not_checked_runtime']),
    canon_sync: z.literal('manual_check_required'),
    matrix_ref: z.literal('MASTERFLOW_CANON_SYNC_MATRIX.md'),
  }),
  validations: z.object({
    total: z.number().int().nonnegative(),
    high_or_critical: z.number().int().nonnegative(),
  }),
  jobs: z.object({
    active: z.number().int().nonnegative(),
    needs_review: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
  }),
  action_lifecycle: z.object({
    pending_validation: z.number().int().nonnegative(),
    approved: z.number().int().nonnegative(),
    stale: z.number().int().nonnegative(),
  }),
  d12_findings: z.object({
    total: z.number().int().nonnegative(),
    open: z.number().int().nonnegative(),
    high_or_critical: z.number().int().nonnegative(),
  }),
  capabilities: z.array(z.object({
    id: z.string().min(1),
    status: OwnerCockpitCapabilityStatusSchema,
    note: z.string().min(1),
  })),
  alerts: z.array(z.object({
    type: z.enum([
      'deployment_unverified',
      'canon_sync_manual',
      'validation_inbox_pending',
      'runtime_job_failed',
      'stale_actions_present',
      'd12_findings_present',
      'process_activation_missing',
      'process_activation_observation_only',
      'd08_generation_locked',
      'external_send_locked',
    ]),
    severity: z.enum(['info', 'warning', 'critical']),
    message: z.string().min(1),
    requires_validation: z.boolean(),
  })),
  next_safe_action: z.object({
    label: z.string().min(1),
    reason: z.string().min(1),
    source_ref: z.string().min(1),
    risk: z.enum(['low', 'medium', 'high']),
    requires_validation: z.boolean(),
    forbidden_followups: z.array(z.string().min(1)),
  }),
  known_limits: z.array(z.string().min(1)),
});
export type OwnerCockpitStatus = z.infer<typeof OwnerCockpitStatusSchema>;

// ───────────────────────── Template / Schema Registry ─────────────────────────

export const SchemaTemplateStatusSchema = z.enum(['candidate', 'validated', 'deprecated', 'archived']);
export type SchemaTemplateStatus = z.infer<typeof SchemaTemplateStatusSchema>;

export const SchemaTemplateDomainSchema = z.enum([
  'cdc',
  'quote_intake',
  'event_registration',
  'asset_manifest',
  'bot_guide',
  'correction',
  'course',
  'generic',
]);
export type SchemaTemplateDomain = z.infer<typeof SchemaTemplateDomainSchema>;

export const SchemaTemplateSchema = z.object({
  template_id: z.string().min(1),
  domain: SchemaTemplateDomainSchema,
  name: z.string().min(1).max(160),
  status: SchemaTemplateStatusSchema,
  version: z.number().int().positive(),
  owner_id: z.string().min(1).nullable(),
  schema_json: z.record(z.unknown()),
  required_fields: z.array(z.string().min(1)),
  validation_rules: z.record(z.unknown()),
  ui_hints: z.record(z.unknown()).nullable(),
  changelog: z.string().min(1).max(1000),
  created_at: z.number().int().nonnegative(),
  updated_at: z.number().int().nonnegative(),
});
export type SchemaTemplate = z.infer<typeof SchemaTemplateSchema>;

export const CreateSchemaTemplateRequestSchema = z.object({
  domain: SchemaTemplateDomainSchema,
  name: z.string().min(1).max(160),
  version: z.number().int().positive(),
  schema_json: z.record(z.unknown()),
  required_fields: z.array(z.string().min(1)),
  validation_rules: z.record(z.unknown()).default({}),
  ui_hints: z.record(z.unknown()).nullable().optional(),
  changelog: z.string().min(1).max(1000),
});
export type CreateSchemaTemplateRequest = z.infer<typeof CreateSchemaTemplateRequestSchema>;

// ───────────────────────── Guided Runtime privé PR-6 ─────────────────────────

export const GuidedQuestionSchema = z.object({
  question_id: z.string().min(1),
  prompt: z.string().min(1).max(1000),
  target_field: z.string().min(1),
  kind: z.enum(['text', 'choice', 'multi_choice', 'boolean', 'number']).default('text'),
  required: z.boolean().default(true),
  options: z.array(z.string().min(1)).optional(),
});
export type GuidedQuestion = z.infer<typeof GuidedQuestionSchema>;

export const ConversationGuideStatusSchema = z.enum(['draft', 'candidate', 'validated', 'archived']);
export type ConversationGuideStatus = z.infer<typeof ConversationGuideStatusSchema>;

export const ConversationGuideSchema = z.object({
  guide_id: z.string().min(1),
  owner_id: z.string().min(1),
  project_id: z.string().min(1).nullable(),
  name: z.string().min(1).max(160),
  purpose: z.string().min(1).max(1000),
  domain: SchemaTemplateDomainSchema,
  status: ConversationGuideStatusSchema,
  target_schema_id: z.string().min(1),
  target_schema_version: z.number().int().positive(),
  question_flow: z.array(GuidedQuestionSchema).min(1),
  completion_rules: z.record(z.unknown()),
  functional_persona_id: z.string().min(1).nullable(),
  lore_persona_id: z.string().min(1).nullable(),
  ui_manifest: z.record(z.unknown()).nullable(),
  analytics_policy: z.record(z.unknown()),
  consent_policy: z.record(z.unknown()),
  version: z.number().int().positive(),
  created_at: z.number().int().nonnegative(),
  updated_at: z.number().int().nonnegative(),
});
export type ConversationGuide = z.infer<typeof ConversationGuideSchema>;

export const GuidedContradictionSchema = z.object({
  target_field: z.string().min(1),
  values: z.array(z.unknown()).min(2),
  contribution_ids: z.array(z.string().min(1)).min(2),
});
export type GuidedContradiction = z.infer<typeof GuidedContradictionSchema>;

export const GuidedProgressSchema = z.object({
  completion_ratio: z.number().min(0).max(1),
  required_fields: z.array(z.string().min(1)),
  completed_fields: z.array(z.string().min(1)),
  missing_fields: z.array(z.string().min(1)),
  contradictions: z.array(GuidedContradictionSchema),
});
export type GuidedProgress = z.infer<typeof GuidedProgressSchema>;

export const GuidedSessionStatusSchema = z.enum(['active', 'completed', 'expired', 'revoked']);
export type GuidedSessionStatus = z.infer<typeof GuidedSessionStatusSchema>;

export const GuidedSessionSchema = z.object({
  session_id: z.string().min(1),
  guide_id: z.string().min(1),
  guide_version: z.number().int().positive(),
  owner_id: z.string().min(1),
  project_id: z.string().min(1).nullable(),
  room_id: z.string().min(1).nullable(),
  access_mode: z.enum(['private']),
  status: GuidedSessionStatusSchema,
  current_question_id: z.string().min(1).nullable(),
  target_schema_id: z.string().min(1),
  target_schema_version: z.number().int().positive(),
  progress: GuidedProgressSchema,
  structured_record: z.record(z.unknown()),
  expires_at: z.number().int().nonnegative().nullable(),
  created_at: z.number().int().nonnegative(),
  updated_at: z.number().int().nonnegative(),
});
export type GuidedSession = z.infer<typeof GuidedSessionSchema>;

export const GuidedSessionParticipantSchema = z.object({
  session_id: z.string().min(1),
  user_id: z.string().min(1).nullable(),
  guest_id: z.string().min(1).nullable(),
  role: z.enum(['owner', 'facilitator', 'participant']),
  display_name: z.string().min(1).max(160).nullable(),
  consent: z.record(z.unknown()),
  joined_at: z.number().int().nonnegative(),
  last_seen_at: z.number().int().nonnegative(),
});
export type GuidedSessionParticipant = z.infer<typeof GuidedSessionParticipantSchema>;

export const GuidedContributionSchema = z.object({
  contribution_id: z.string().min(1),
  session_id: z.string().min(1),
  participant_ref: z.string().min(1),
  question_id: z.string().min(1),
  target_field: z.string().min(1),
  value: z.unknown(),
  source: z.enum(['user', 'facilitator']),
  status: z.enum(['accepted', 'contradiction', 'superseded']),
  supersedes_id: z.string().min(1).nullable(),
  created_at: z.number().int().nonnegative(),
});
export type GuidedContribution = z.infer<typeof GuidedContributionSchema>;

export const CreateGuideRequestSchema = z.object({
  name: z.string().min(1).max(160),
  purpose: z.string().min(1).max(1000),
  domain: SchemaTemplateDomainSchema,
  project_id: z.string().min(1).nullable().optional(),
  target_schema_id: z.string().min(1),
  question_flow: z.array(GuidedQuestionSchema).min(1),
  completion_rules: z.record(z.unknown()).default({}),
  functional_persona_id: z.string().min(1).nullable().optional(),
  lore_persona_id: z.string().min(1).nullable().optional(),
  ui_manifest: z.record(z.unknown()).nullable().optional(),
  analytics_policy: z.record(z.unknown()).default({private: true}),
  consent_policy: z.record(z.unknown()).default({required: true}),
});
export type CreateGuideRequest = z.infer<typeof CreateGuideRequestSchema>;

export const UpdateGuideRequestSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  purpose: z.string().min(1).max(1000).optional(),
  question_flow: z.array(GuidedQuestionSchema).min(1).optional(),
  completion_rules: z.record(z.unknown()).optional(),
  ui_manifest: z.record(z.unknown()).nullable().optional(),
});
export type UpdateGuideRequest = z.infer<typeof UpdateGuideRequestSchema>;

export const CreateGuidedSessionRequestSchema = z.object({
  guide_id: z.string().min(1),
  room_id: z.string().min(1).nullable().optional(),
  expires_at: z.number().int().nonnegative().nullable().optional(),
  preview: z.boolean().default(false),
  consent: z.record(z.unknown()).default({}),
});
export type CreateGuidedSessionRequest = z.infer<typeof CreateGuidedSessionRequestSchema>;

export const AddGuidedParticipantRequestSchema = z.object({
  user_id: z.string().min(1),
  role: z.enum(['facilitator', 'participant']).default('participant'),
  consent: z.record(z.unknown()).default({}),
});
export type AddGuidedParticipantRequest = z.infer<typeof AddGuidedParticipantRequestSchema>;

export const SubmitGuidedAnswerRequestSchema = z.object({
  question_id: z.string().min(1),
  value: z.unknown(),
});
export type SubmitGuidedAnswerRequest = z.infer<typeof SubmitGuidedAnswerRequestSchema>;

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

// ───────────────────────── Administration : invitations (codes d'accès) ─────────────────────────

/**
 * Invitation (code d'accès). L'inscription est sur invitation : redéemer un code
 * crée un compte au rôle pré-assigné. Un code n'est émis que pour un rôle ≤ rang du
 * créateur (garde-fou backend) ; valide tant que non révoqué, non expiré, `used_count < max_uses`.
 */
export const InvitationSchema = z.object({
  code: z.string(),
  role: RoleSchema,
  created_by: z.string(),
  max_uses: z.number().int().positive(),
  used_count: z.number().int().nonnegative(),
  note: z.string().nullable(),
  expires_at: z.number().nullable(),
  revoked_at: z.number().nullable(),
  /** Dérivé côté backend : non révoqué, non expiré et usages restants. */
  active: z.boolean(),
  created_at: z.number(),
});
export type Invitation = z.infer<typeof InvitationSchema>;

export const CreateInvitationSchema = z.object({
  role: RoleSchema,
  max_uses: z.number().int().positive().max(1000).default(1),
  /** Durée de validité en jours (optionnelle). Absente = pas d'expiration. */
  expires_in_days: z.number().int().positive().max(3650).optional(),
  note: z.string().max(280).optional(),
});
export type CreateInvitation = z.infer<typeof CreateInvitationSchema>;

// ───────────────────────── Administration : comptes utilisateurs ─────────────────────────

/**
 * DTO admin d'un utilisateur (lecture gated admin/godmode) — plus riche que `UserSchema`
 * public : expose `active`, `created_at`, `last_login` pour la console d'administration.
 */
export const AdminUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  display_name: z.string(),
  email: z.string().nullable(),
  role: RoleSchema,
  active: z.boolean(),
  created_at: z.number(),
  last_login: z.number().nullable(),
});
export type AdminUser = z.infer<typeof AdminUserSchema>;

/**
 * Payload de l'action sensible `set_user_role` (changement de rôle).
 * Touche aux permissions → passe par le cycle d'action (validator_role = godmode).
 */
export const SetUserRoleSchema = z.object({
  user_id: z.string().min(1),
  role: RoleSchema,
});
export type SetUserRole = z.infer<typeof SetUserRoleSchema>;

// ───────────────────────── Rooms ─────────────────────────

export const ZoomLevelSchema = z.enum(['overview', 'workspace', 'task', 'detail', 'debug', 'audit']);
export type ZoomLevel = z.infer<typeof ZoomLevelSchema>;

export const RoomSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  owner_id: z.string().nullable(),
  project_id: z.string().nullable().optional(),
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

export const RoomCheckpointReasonSchema = z.enum([
  'validation',
  'mode_change',
  'stable_activity',
  'pedagogical_progress',
  'significant_mutation',
  'manual_save',
]);
export type RoomCheckpointReason = z.infer<typeof RoomCheckpointReasonSchema>;

export const CreateRoomCheckpointSchema = z.object({
  reason: RoomCheckpointReasonSchema,
  summary: z.string().min(1).max(1000),
  active_widgets: z.array(z.string().min(1)).max(30).default([]),
  active_mode: z.string().min(1).max(80),
  decisions: z.array(z.string().min(1).max(500)).max(20).default([]),
  open_loops: z.array(z.string().min(1).max(500)).max(20).default([]),
  media_queue_refs: z.array(z.string().min(1)).max(50).default([]),
  asset_queue_refs: z.array(z.string().min(1)).max(50).default([]),
  resource_refs: z.array(z.string().min(1)).max(50).default([]),
  next_recommended_action: z.string().min(1).max(500).nullable().default(null),
  rollback_light_possible: z.boolean().default(false),
});
export type CreateRoomCheckpoint = z.infer<typeof CreateRoomCheckpointSchema>;

export const RoomCheckpointSchema = CreateRoomCheckpointSchema.extend({
  checkpoint_id: z.string().min(1),
  room_id: z.string().min(1),
  room_instance_id: z.string().min(1),
  user_id: z.string().min(1),
  project_id: z.string().min(1).nullable(),
  privacy_scope: z.literal('private'),
  created_at: z.number().int().nonnegative(),
});
export type RoomCheckpoint = z.infer<typeof RoomCheckpointSchema>;

export const MemoryCardTypeSchema = z.enum([
  'preference',
  'canon_candidate',
  'rule',
  'resource',
  'feedback',
  'project_fact',
  'user_trait',
  'bug',
  'idea',
  'output_template',
  'opportunity',
]);
export const MemoryCardAffectSchema = z.enum([
  'persona',
  'DA',
  'pedagogy',
  'resource_routing',
  'output',
  'backend',
  'pricing',
]);
export const CreateMemoryCardSchema = z.object({
  type: MemoryCardTypeSchema,
  project_id: z.string().min(1).nullable().optional(),
  source_ref: z.string().min(1).max(1000),
  extracted_signal: z.string().min(1).max(1000),
  distilled_value: z.string().min(1).max(1000),
  confidence: z.enum(['low', 'medium', 'high']).default('medium'),
  privacy: z.enum(['public', 'private', 'sensitive', 'restricted']).default('private'),
  affects: z.array(MemoryCardAffectSchema).min(1).max(7),
  invalidation_rule: z.string().min(1).max(500),
  next_action: z.string().min(1).max(500).nullable().default(null),
});
export type CreateMemoryCard = z.infer<typeof CreateMemoryCardSchema>;

export const MemoryCardSchema = CreateMemoryCardSchema.extend({
  memory_card_id: z.string().min(1),
  owner_id: z.string().min(1),
  scope: z.enum(['user', 'project']),
  confidence: z.enum(['low', 'medium', 'high', 'validated']),
  status: z.enum(['candidate', 'active', 'stale', 'archived', 'rejected']),
  compression_level: z.enum(['L2', 'L3', 'L4']),
  validated_by: z.string().min(1).nullable(),
  created_at: z.number().int().nonnegative(),
  updated_at: z.number().int().nonnegative(),
});
export type MemoryCard = z.infer<typeof MemoryCardSchema>;

export const MemoryCardRelationTypeSchema = z.enum([
  'supports',
  'contradicts',
  'extends',
  'illustrates',
  'related_to',
  'broader',
  'narrower',
  'derived_from',
  'requires_validation',
  'triggers_action',
  'references',
  'used_in',
  'blocks',
  'unlocks',
]);
export type MemoryCardRelationType = z.infer<typeof MemoryCardRelationTypeSchema>;

export const MemoryCardRelationFamilySchema = z.enum([
  'semantic',
  'provenance',
  'operational',
]);
export type MemoryCardRelationFamily = z.infer<typeof MemoryCardRelationFamilySchema>;

export const CreateMemoryCardLinkSchema = z.object({
  target_card_id: z.string().min(1),
  relation_type: MemoryCardRelationTypeSchema,
  rationale: z.string().min(1).max(500),
  source_ref: z.string().min(1).max(1000),
  confidence: z.enum(['low', 'medium', 'high']).default('medium'),
});
export type CreateMemoryCardLink = z.infer<typeof CreateMemoryCardLinkSchema>;

export const MemoryCardLinkSchema = CreateMemoryCardLinkSchema.extend({
  link_id: z.string().min(1),
  source_card_id: z.string().min(1),
  relation_family: MemoryCardRelationFamilySchema,
  directionality: z.enum(['directed', 'symmetric']),
  confidence: z.enum(['low', 'medium', 'high', 'validated']),
  created_by: z.string().min(1),
  status: z.enum(['candidate', 'active', 'rejected', 'archived']),
  validated_by: z.string().min(1).nullable(),
  created_at: z.number().int().nonnegative(),
  updated_at: z.number().int().nonnegative(),
});
export type MemoryCardLink = z.infer<typeof MemoryCardLinkSchema>;

export const DecideMemoryCardLinkSchema = z.object({
  decision: z.enum(['active', 'rejected', 'archived']),
});
export type DecideMemoryCardLink = z.infer<typeof DecideMemoryCardLinkSchema>;

export const MemoryGraphHealthSchema = z.object({
  scope: z.enum(['user', 'project']),
  scope_id: z.string().min(1),
  cards: z.object({
    total: z.number().int().nonnegative(),
    candidate: z.number().int().nonnegative(),
    active: z.number().int().nonnegative(),
    stale: z.number().int().nonnegative(),
    archived: z.number().int().nonnegative(),
    rejected: z.number().int().nonnegative(),
  }),
  active_links: z.number().int().nonnegative(),
  candidate_links: z.number().int().nonnegative(),
  orphan_active_cards: z.number().int().nonnegative(),
  contradiction_links: z.number().int().nonnegative(),
  duplicate_distilled_values: z.number().int().nonnegative(),
  stale_links: z.number().int().nonnegative(),
});
export type MemoryGraphHealth = z.infer<typeof MemoryGraphHealthSchema>;

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
  'stale',
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
  project_id: z.string().optional(),
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

export const ExpireActionsRequestSchema = z.object({
  scope: z.enum(['mine', 'project']).default('mine'),
  project_id: z.string().min(1).optional(),
  room_id: z.string().min(1).optional(),
  reason: z.enum(['manual_owner_stop', 'context_changed', 'source_changed', 'hard_stop']),
  note: z.string().max(500).optional(),
});
export type ExpireActionsRequest = z.infer<typeof ExpireActionsRequestSchema>;

export const ExpireSelectedActionsRequestSchema = ExpireActionsRequestSchema.extend({
  action_ids: z.array(z.string().min(1)).min(1).max(100).refine(
    (ids) => new Set(ids).size === ids.length,
    'duplicate_action_ids',
  ),
});
export type ExpireSelectedActionsRequest = z.infer<typeof ExpireSelectedActionsRequestSchema>;

export const HardStopReasonSchema = z.enum(['manual_owner_stop', 'hard_stop']);
export const HardStopControlStateSchema = z.object({
  id: z.string().min(1),
  owner_id: z.string().min(1),
  room_id: z.string().min(1),
  status: z.enum(['active', 'released']),
  reason: HardStopReasonSchema,
  note: z.string().max(500).nullable(),
  activated_by: z.string().min(1),
  released_by: z.string().min(1).nullable(),
  created_at: z.number().int().nonnegative(),
  updated_at: z.number().int().nonnegative(),
  released_at: z.number().int().nonnegative().nullable(),
});
export type HardStopControlState = z.infer<typeof HardStopControlStateSchema>;

export const ActivateHardStopRequestSchema = z.object({
  room_id: z.string().min(1),
  reason: HardStopReasonSchema.default('hard_stop'),
  note: z.string().max(500).optional(),
});
export type ActivateHardStopRequest = z.infer<typeof ActivateHardStopRequestSchema>;

export const ResumeHardStopRequestSchema = z.object({
  room_id: z.string().min(1),
  note: z.string().max(500).optional(),
});
export type ResumeHardStopRequest = z.infer<typeof ResumeHardStopRequestSchema>;

export const ActionContextSnapshotRefSchema = z.object({
  ref_type: z.string().min(1),
  ref_id: z.string().min(1),
  revision_ref: z.string().min(1).nullable(),
});
export type ActionContextSnapshotRef = z.infer<typeof ActionContextSnapshotRefSchema>;

export const ActionContextSnapshotSchema = z.object({
  snapshot_id: z.string().min(1),
  action_id: z.string().min(1),
  owner_id: z.string().min(1),
  project_id: z.string().min(1).nullable(),
  room_id: z.string().min(1),
  room_instance_id: z.string().min(1),
  action_intent: z.string().min(1),
  action_payload_fingerprint: z.string().length(64),
  authoritative_refs: z.array(ActionContextSnapshotRefSchema),
  checkpoint_ref: ActionContextSnapshotRefSchema.nullable(),
  hard_stop_state_ref: z.string().min(1).nullable(),
  context_fingerprint: z.string().length(64),
  created_at: z.number().int().nonnegative(),
});
export type ActionContextSnapshot = z.infer<typeof ActionContextSnapshotSchema>;

export const ActionContextComparisonSchema = z.object({
  action_id: z.string().min(1),
  snapshot_status: z.enum(['found', 'absent']),
  comparison: z.enum(['unchanged', 'requires_review', 'inconclusive']),
  changed_refs: z.array(z.string().min(1)),
  missing_revision_refs: z.array(z.string().min(1)),
  recommended_next_step: z.enum(['none', 're_preflight', 'owner_review']),
  mutation: z.literal(false),
});
export type ActionContextComparison = z.infer<typeof ActionContextComparisonSchema>;

export const ExpireActionsResponseSchema = z.object({
  expired_count: z.number().int().nonnegative(),
  expired_action_ids: z.array(z.string().min(1)),
  reason: ExpireActionsRequestSchema.shape.reason,
  scope_ref: z.string().min(1),
  audit_trace: z.array(z.string().min(1)),
});
export type ExpireActionsResponse = z.infer<typeof ExpireActionsResponseSchema>;

export const PreviewActionExpiryCandidateSchema = z.object({
  id: z.string().min(1),
  intent: z.string().min(1),
  object_type: z.string().min(1),
  status: z.enum(['pending_validation', 'approved']),
  risk_level: RiskLevelSchema,
});
export type PreviewActionExpiryCandidate = z.infer<typeof PreviewActionExpiryCandidateSchema>;

export const PreviewActionsExpiryResponseSchema = z.object({
  candidate_count: z.number().int().nonnegative(),
  candidate_action_ids: z.array(z.string().min(1)),
  candidates: z.array(PreviewActionExpiryCandidateSchema),
  reason: ExpireActionsRequestSchema.shape.reason,
  scope_ref: z.string().min(1),
  audit_trace: z.array(z.string().min(1)),
});
export type PreviewActionsExpiryResponse = z.infer<typeof PreviewActionsExpiryResponseSchema>;

export const ActionSchema = z.object({
  id: z.string(),
  registry_id: z.string().nullable(),
  intent: z.string(),
  object_type: z.string(),
  user_id: z.string(),
  room_id: z.string().nullable(),
  project_id: z.string().nullable(),
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
  /** Rôle minimal requis pour valider cette action (optionnel — défaut 'teacher' si sensible). */
  validator_role: RoleSchema.optional(),
  /** Rôle minimal requis pour voir et créer cette action dans un loadout. */
  minimum_role: RoleSchema.default('student'),
  ui_surface: z.string(),
  status: RegistryStatusSchema.default('future'),
});
export type ActionRegistryEntry = z.infer<typeof ActionRegistryEntrySchema>;

// ───────────────────────── Validation Inbox MVP ─────────────────────────

export const ValidationInboxItemTypeSchema = z.enum([
  'correction_review',
  'feedback_review',
  'grade_lock',
  'inventory_candidate',
  'visual_asset_candidate',
  'generated_asset_candidate',
  'story_patch',
  'quote_export',
  'quote_send',
  'public_export',
  'factory_backflow',
  'permission_change',
  'autonomy_proposal',
  'deployment_question',
  'output_candidate',
  'canon_delta',
]);
export type ValidationInboxItemType = z.infer<typeof ValidationInboxItemTypeSchema>;

export const ValidationInboxStatusSchema = z.enum([
  'draft',
  'candidate',
  'needs_review',
  'blocked',
  'approved',
  'rejected',
  'parked',
  'archived',
]);
export type ValidationInboxStatus = z.infer<typeof ValidationInboxStatusSchema>;

export const ValidationInboxRiskLevelSchema = z.enum(['low', 'medium', 'high', 'critical']);
export type ValidationInboxRiskLevel = z.infer<typeof ValidationInboxRiskLevelSchema>;

export const ValidationPrivacyScopeSchema = z.enum([
  'private',
  'project',
  'class',
  'organization',
  'collaborators',
  'admin_only',
  'public_export',
]);
export type ValidationPrivacyScope = z.infer<typeof ValidationPrivacyScopeSchema>;

export const ValidationDecisionValueSchema = z.enum([
  'approve',
  'edit',
  'reject',
  'park',
  'request_precision',
  'archive',
  'export_patch',
]);
export type ValidationDecisionValue = z.infer<typeof ValidationDecisionValueSchema>;

export const ValidationInboxDecisionSchema = z.object({
  value: ValidationDecisionValueSchema,
  decided_by: z.string().min(1).nullable(),
  decided_at: z.number().int().nonnegative().nullable(),
  rationale: z.string().max(1000).nullable(),
});
export type ValidationInboxDecision = z.infer<typeof ValidationInboxDecisionSchema>;

export const ValidationInboxItemSchema = z.object({
  item_id: z.string().min(1),
  item_type: ValidationInboxItemTypeSchema,
  title: z.string().min(1).max(240),
  summary: z.string().min(1).max(2000),
  domain_refs: z.array(z.string().min(1).max(240)),
  object_refs: z.array(z.string().min(1).max(240)),
  source_refs: z.array(z.string().min(1).max(240)),
  requester: z.string().min(1),
  owner: z.string().min(1),
  required_validator: z.string().min(1),
  current_status: ValidationInboxStatusSchema,
  risk_level: ValidationInboxRiskLevelSchema,
  privacy_scope: ValidationPrivacyScopeSchema,
  source_truth_state: z.enum(['unknown', 'source_verified', 'conflicting', 'missing']),
  output_readiness_state: z.enum(['blocked', 'needs_review', 'ready']),
  proposed_action: z.string().min(1).max(500),
  impact_summary: z.string().min(1).max(1000),
  blocked_actions: z.array(z.string().min(1).max(240)),
  allowed_actions: z.array(z.string().min(1).max(240)),
  conflicts: z.array(z.string().min(1).max(500)),
  open_questions: z.array(z.string().min(1).max(500)),
  recommended_decision: ValidationDecisionValueSchema.nullable(),
  decision_options: z.array(ValidationDecisionValueSchema).min(1),
  decision: ValidationInboxDecisionSchema.nullable(),
  audit_trace: z.array(z.string().min(1).max(240)),
  source_kind: z.enum([
    'action',
    'feedback_draft',
    'correction_export_preview',
    'd12_finding',
    'usage_learning_candidate',
    'factory_backflow_intake',
    'visual_manifest',
  ]),
  source_id: z.string().min(1),
  created_at: z.number().int().nonnegative(),
  updated_at: z.number().int().nonnegative(),
});
export type ValidationInboxItem = z.infer<typeof ValidationInboxItemSchema>;

export const DecideValidationInboxItemRequestSchema = z.object({
  decision: ValidationDecisionValueSchema,
  note: z.string().max(1000).optional(),
});
export type DecideValidationInboxItemRequest = z.infer<typeof DecideValidationInboxItemRequestSchema>;

// ───────────────────────── D11 Factory Backflow Intake ─────────────────────────

/**
 * V6C accepte exclusivement un manifeste JSON relu par un humain. Ces chaînes ne
 * sont jamais dereferencées : une URL, archive ou fichier externe reste hors scope.
 */
function factoryBackflowText(max: number) {
  return z.string().trim().min(1).max(max).refine(
    (value) => !/^https?:\/\//i.test(value),
    'Les URL externes ne sont pas acceptées dans l’intake factory.',
  );
}

const FactoryBackflowTextSchema = factoryBackflowText(500);

export const FactoryBackflowClassificationSchema = z.enum([
  'SYSTEM',
  'PERSONA',
  'DA',
  'PROJECT_LORE',
  'OUTPUT',
  'PLATFORM',
  'RESOURCE',
  'PEDAGOGY',
  'PRIVATE',
]);
export type FactoryBackflowClassification = z.infer<typeof FactoryBackflowClassificationSchema>;

export const FactoryPassportIntakeSchema = z.object({
  factory_id: factoryBackflowText(160).optional(),
  factory_version: factoryBackflowText(120).optional(),
  target_platform: factoryBackflowText(120).optional(),
  mission: FactoryBackflowTextSchema.optional(),
  owner_scope: factoryBackflowText(240).optional(),
  source_manifest: z.array(factoryBackflowText(240)).min(1).max(50).optional(),
  capability_profile: z.array(factoryBackflowText(160)).min(1).max(30).optional(),
  output_routes: z.array(factoryBackflowText(160)).min(1).max(30).optional(),
  validation_gates: z.array(factoryBackflowText(160)).min(1).max(30).optional(),
  backflow_target: factoryBackflowText(160).optional(),
  security_preflight_status: z.enum(['passed', 'pending', 'failed']).optional(),
  simulation_status: z.enum(['passed', 'pending', 'failed']).optional(),
  privacy_classification: FactoryBackflowClassificationSchema.optional(),
}).strict();
export type FactoryPassportIntake = z.infer<typeof FactoryPassportIntakeSchema>;

export const FactoryBackflowCandidateSummarySchema = z.object({
  candidate_id: factoryBackflowText(160),
  summary: FactoryBackflowTextSchema,
  classification: FactoryBackflowClassificationSchema,
}).strict();
export type FactoryBackflowCandidateSummary = z.infer<typeof FactoryBackflowCandidateSummarySchema>;

export const FactoryBackflowExportIntakeSchema = z.object({
  export_id: factoryBackflowText(160).optional(),
  factory_id: factoryBackflowText(160).optional(),
  factory_version: factoryBackflowText(120).optional(),
  source_session_ref: factoryBackflowText(240).optional(),
  export_type: factoryBackflowText(120).optional(),
  summary: FactoryBackflowTextSchema.optional(),
  candidates: z.array(FactoryBackflowCandidateSummarySchema).min(1).max(30).optional(),
  private_content_removed: z.boolean().optional(),
  source_truth: factoryBackflowText(240).optional(),
  validation_required: z.literal(true).optional(),
  target_masterflow_owner: factoryBackflowText(160).optional(),
  blocked_actions: z.array(factoryBackflowText(160)).max(30).optional(),
  recommended_next_action: FactoryBackflowTextSchema.optional(),
}).strict();
export type FactoryBackflowExportIntake = z.infer<typeof FactoryBackflowExportIntakeSchema>;

/** Entrée permissive volontairement : les manques sont tracés en quarantaine, pas perdus. */
export const CreateFactoryBackflowIntakeRequestSchema = z.object({
  factory_passport: FactoryPassportIntakeSchema.optional(),
  factory_backflow_export: FactoryBackflowExportIntakeSchema.optional(),
}).strict();
export type CreateFactoryBackflowIntakeRequest = z.infer<typeof CreateFactoryBackflowIntakeRequestSchema>;

export const FactoryBackflowIntakeStatusSchema = z.enum(['candidate', 'quarantined']);
export type FactoryBackflowIntakeStatus = z.infer<typeof FactoryBackflowIntakeStatusSchema>;

export const FactoryBackflowIntakeReviewStatusSchema = z.enum([
  'pending',
  'approved',
  'parked',
  'rejected',
  'archived',
]);
export type FactoryBackflowIntakeReviewStatus = z.infer<typeof FactoryBackflowIntakeReviewStatusSchema>;

export const FactoryBackflowIntakeSchema = z.object({
  intake_id: z.string().min(1),
  owner_id: z.string().min(1),
  factory_id: z.string().min(1).nullable(),
  factory_version: z.string().min(1).nullable(),
  target_platform: z.string().min(1).nullable(),
  export_id: z.string().min(1).nullable(),
  export_type: z.string().min(1).nullable(),
  source_session_ref: z.string().min(1).nullable(),
  summary: z.string().min(1).nullable(),
  candidate_count: z.number().int().nonnegative(),
  passport: FactoryPassportIntakeSchema.nullable(),
  backflow_export: FactoryBackflowExportIntakeSchema.nullable(),
  quarantine_reasons: z.array(z.string().min(1).max(160)),
  intake_status: FactoryBackflowIntakeStatusSchema,
  review_status: FactoryBackflowIntakeReviewStatusSchema,
  reviewer_id: z.string().min(1).nullable(),
  review_note: z.string().max(1000).nullable(),
  canon_status: z.literal('candidate_only'),
  audit_trace: z.array(z.string().min(1).max(240)),
  created_at: z.number().int().nonnegative(),
  updated_at: z.number().int().nonnegative(),
});
export type FactoryBackflowIntake = z.infer<typeof FactoryBackflowIntakeSchema>;

/**
 * Résultat local d'une validation owner. Il attend un routage humain ultérieur ;
 * il n'est ni une mise à jour de domaine, ni une écriture canon.
 */
export const FactoryCandidateRoutingRecommendationSchema = z.object({
  recommended_domains: z.array(z.string().min(1).max(120)),
  status: z.enum(['owner_decision_required', 'no_safe_recommendation']),
  reason: z.string().min(1).max(500),
});
export type FactoryCandidateRoutingRecommendation = z.infer<typeof FactoryCandidateRoutingRecommendationSchema>;

export const FactoryBackflowCandidateUpdateSchema = z.object({
  candidate_update_id: z.string().min(1),
  intake_id: z.string().min(1),
  owner_id: z.string().min(1),
  factory_id: z.string().min(1).nullable(),
  source_candidate_id: z.string().min(1).max(160),
  summary: z.string().min(1).max(500),
  classification: FactoryBackflowClassificationSchema,
  routing_status: z.enum(['unrouted', 'routed']),
  target_domain: z.string().min(1).max(120).nullable(),
  candidate_status: z.literal('approved_candidate'),
  canon_status: z.literal('candidate_only'),
  routing_recommendation: FactoryCandidateRoutingRecommendationSchema,
  audit_trace: z.array(z.string().min(1).max(240)),
  created_at: z.number().int().nonnegative(),
  updated_at: z.number().int().nonnegative(),
});
export type FactoryBackflowCandidateUpdate = z.infer<typeof FactoryBackflowCandidateUpdateSchema>;

export const RouteFactoryBackflowCandidateUpdateRequestSchema = z.object({
  target_domain: z.enum(['D08_DA_VISUAL_ASSETS', 'D09_MASTERSTORY', 'D05_PEDAGOGY', 'D06_CORRECTION_FEEDBACK_EVALUATION']),
  note: z.string().max(500).optional(),
});
export type RouteFactoryBackflowCandidateUpdateRequest = z.infer<typeof RouteFactoryBackflowCandidateUpdateRequestSchema>;

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
 * Payload d'une action `set_global_setting`.
 * `value` accepte tout JSON-sérialisable ; les secrets ne passent jamais ici.
 */
export const SetGlobalSettingSchema = z.object({
  app: z.string().min(1),
  key: z.string().min(1),
  value: z.unknown(),
});
export type SetGlobalSetting = z.infer<typeof SetGlobalSettingSchema>;

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
  project_id: z.string().min(1).nullable().optional(),
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
  project_id: z.string().min(1).nullable().optional(),
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
    project_id: z.string().min(1).nullable().optional(),
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
  'image_generation',
]);
export type LLMTask = z.infer<typeof LLMTaskSchema>;

export const TaskModelProfileSchema = z.object({
  profile_id: z.string().min(1),
  task: LLMTaskSchema,
  allowed_providers: z.array(z.string().min(1)).min(1),
  fallback_order: z.array(z.string().min(1)),
  /**
   * Modèle propre à ce profil de tâche (routage multi-LLM selon rôle/besoin).
   * Optionnel et additif : si absent (`null`), le runner retombe sur le modèle
   * global de l'environnement (`LLM_MODEL`). Le provider, la base URL et les
   * secrets restent gérés côté serveur — un modèle n'est pas un secret.
   */
  model: z.string().min(1).nullable().optional(),
  /**
   * Modèle par rôle (routage par tâche × rôle, objectif économie de tokens).
   * Optionnel/additif : map partielle `Role → model`. Si un rôle a une entrée,
   * elle prime sur `model` (qui prime lui-même sur le modèle global env). Permet
   * un modèle plus fort pour teacher/admin sans surcoût pour student.
   */
  role_models: z
    .object({
      student: z.string().min(1),
      teacher: z.string().min(1),
      admin: z.string().min(1),
      godmode: z.string().min(1),
    })
    .partial()
    .nullable()
    .optional(),
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
  project_id: z.string().min(1).nullable().optional(),
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
    project_id: z.string().min(1).nullable().optional(),
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
    project_id: z.string().min(1).nullable().optional(),
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

/** Création d'un barème privé : la première version reste brouillon. */
const RubricContentFieldsSchema = z.object({
  criteria: z.array(RubricCriterionSchema).min(1).max(30),
  total_points: z.number().positive(),
});

function validateRubricContent(
  request: z.infer<typeof RubricContentFieldsSchema>,
  ctx: z.RefinementCtx,
): void {
  const weight = request.criteria.reduce((total, criterion) => total + criterion.weight, 0);
  const points = request.criteria.reduce((total, criterion) => total + criterion.max_points, 0);
  if (Math.abs(weight - 1) > 0.0001) {
    ctx.addIssue({code: z.ZodIssueCode.custom, message: 'La somme des poids doit être égale à 1.', path: ['criteria']});
  }
  if (Math.abs(points - request.total_points) > 0.0001) {
    ctx.addIssue({code: z.ZodIssueCode.custom, message: 'Le total doit correspondre aux critères.', path: ['total_points']});
  }
}

const CreateRubricContentSchema = RubricContentFieldsSchema.superRefine(validateRubricContent);

export const CreateRubricTemplateRequestSchema = RubricContentFieldsSchema.extend({
  project_id: z.string().min(1).nullable().optional(),
  title: z.string().min(1).max(160),
  subject_ref: z.string().min(1).max(500).nullable().optional(),
}).superRefine(validateRubricContent);
export type CreateRubricTemplateRequest = z.infer<typeof CreateRubricTemplateRequestSchema>;

/** Une version validée est immuable : toute évolution passe par cette demande. */
export const CreateRubricVersionRequestSchema = CreateRubricContentSchema;
export type CreateRubricVersionRequest = z.infer<typeof CreateRubricVersionRequestSchema>;

/** Création d'un profil institutionnel privé, toujours brouillon à l'entrée. */
export const CreateInstitutionalGradingProfileRequestSchema = z.object({
  project_id: z.string().min(1).nullable().optional(),
  scale: GradeBandSchema,
  expected_cohort_band: GradeBandSchema,
  anchors: z.object({
    insufficient: GradeBandSchema,
    minimum_met: GradeBandSchema,
    expected: GradeBandSchema,
    strong: GradeBandSchema,
    exceptional: GradeBandSchema,
  }),
  max_global_delta: z.number().nonnegative(),
  protected_thresholds: z.array(z.number()).max(20).default([]),
  threshold_crossing_requires_validation: z.boolean().default(true),
}).superRefine((profile, ctx) => {
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
export type CreateInstitutionalGradingProfileRequest = z.input<
  typeof CreateInstitutionalGradingProfileRequestSchema
>;

// D05 R2.1 — sujet privé comme mission versionnée, jamais publication implicite.
export const SubjectManifestSchema = z.object({
  situation: z.string().min(1).max(2000),
  tension: z.string().min(1).max(2000),
  mission: z.string().min(1).max(2000),
  decision_to_make: z.string().min(1).max(1000),
  observable_deliverables: z.array(z.string().min(1).max(500)).min(1).max(30),
  proofs_of_understanding: z.array(z.string().min(1).max(500)).min(1).max(30),
  progression_levels: z.array(z.string().min(1).max(500)).min(1).max(20),
  objectives: z.array(z.string().min(1).max(500)).max(30).default([]),
  criteria: z.array(z.string().min(1).max(500)).max(50).default([]),
  competencies: z.array(z.string().min(1).max(500)).max(50).default([]),
  bloom_level: z.string().min(1).max(120).nullable().default(null),
  constraints: z.array(z.string().min(1).max(500)).max(50).default([]),
  checkpoints: z.array(z.string().min(1).max(500)).max(50).default([]),
  evaluation_mode: z.string().min(1).max(500).nullable().default(null),
  assistance_level: z.string().min(1).max(500).nullable().default(null),
  deadlines: z.array(z.string().min(1).max(500)).max(30).default([]),
  resource_refs: z.array(z.string().min(1).max(500)).max(100),
  correction_model_candidate_ref: z.string().min(1).max(500).nullable(),
  deployment_state: z.literal('private_draft'),
});
export type SubjectManifest = z.infer<typeof SubjectManifestSchema>;

export const SubjectTemplateSchema = z.object({template_id: z.string().min(1), owner_id: z.string().min(1), project_id: z.string().min(1).nullable(), project_scope: z.string().min(1), title: z.string().min(1), current_version_ref: z.string().min(1).nullable(), status: z.enum(['draft','active','archived']), created_at: z.number().int().nonnegative(), updated_at: z.number().int().nonnegative()});
export type SubjectTemplate = z.infer<typeof SubjectTemplateSchema>;
export const SubjectVersionSchema = z.object({version_id: z.string().min(1), template_id: z.string().min(1), version: z.number().int().positive(), project_id: z.string().min(1).nullable(), project_scope: z.string().min(1), manifest: SubjectManifestSchema, status: z.enum(['draft','validated','archived']), created_by: z.string().min(1), created_at: z.number().int().nonnegative()});
export type SubjectVersion = z.infer<typeof SubjectVersionSchema>;
export const CreateSubjectTemplateRequestSchema = z.object({project_id: z.string().min(1).nullable().optional(), title: z.string().min(1).max(160), manifest: SubjectManifestSchema});
export type CreateSubjectTemplateRequest = z.infer<typeof CreateSubjectTemplateRequestSchema>;
export const CreateSubjectVersionRequestSchema = z.object({manifest: SubjectManifestSchema});
export type CreateSubjectVersionRequest = z.infer<typeof CreateSubjectVersionRequestSchema>;
export const SubjectAssignmentSchema = z.object({assignment_id:z.string().min(1),owner_id:z.string().min(1),project_id:z.string().min(1).nullable(),project_scope:z.string().min(1),cohort_id:z.string().min(1),source_subject_version_id:z.string().min(1),title:z.string().min(1),subject_snapshot:SubjectManifestSchema,status:z.enum(['draft','active','archived']),created_by:z.string().min(1),created_at:z.number().int().nonnegative(),activated_at:z.number().int().nonnegative().nullable()});
export type SubjectAssignment = z.infer<typeof SubjectAssignmentSchema>;

export const SubjectFullStackSchema = z.object({
  template: SubjectTemplateSchema,
  version: SubjectVersionSchema,
  compiled_at: z.number().int().nonnegative(),
  compiled_by: z.string().min(1),
});
export type SubjectFullStack = z.infer<typeof SubjectFullStackSchema>;


export const CreateSubjectAssignmentRequestSchema = z.object({project_id:z.string().min(1).nullable().optional(),cohort_id:z.string().min(1),source_subject_version_id:z.string().min(1),title:z.string().min(1).max(160)});
export type CreateSubjectAssignmentRequest = z.infer<typeof CreateSubjectAssignmentRequestSchema>;

// D06 R2.3 — brouillon synchronisé depuis le sujet, jamais une note.
export const CorrectionSheetDerivedFieldsSchema = z.object({
  mission: z.string().min(1),
  observable_deliverables: z.array(z.string().min(1)),
  proofs_of_understanding: z.array(z.string().min(1)),
  progression_levels: z.array(z.string().min(1)),
  objectives: z.array(z.string().min(1)),
  criteria: z.array(z.string().min(1)),
  competencies: z.array(z.string().min(1)),
  bloom_level: z.string().min(1).nullable(),
  constraints: z.array(z.string().min(1)),
  checkpoints: z.array(z.string().min(1)),
  evaluation_mode: z.string().min(1).nullable(),
  assistance_level: z.string().min(1).nullable(),
  deadlines: z.array(z.string().min(1)),
  resource_refs: z.array(z.string().min(1)),
});
export type CorrectionSheetDerivedFields = z.infer<typeof CorrectionSheetDerivedFieldsSchema>;
export const CorrectionSheetDraftSchema = z.object({
  correction_sheet_id: z.string().min(1),
  owner_id: z.string().min(1),
  project_id: z.string().min(1).nullable(),
  project_scope: z.string().min(1),
  assignment_id: z.string().min(1),
  source_subject_version_id: z.string().min(1),
  version: z.number().int().positive(),
  subject_snapshot: SubjectManifestSchema,
  derived_fields: CorrectionSheetDerivedFieldsSchema,
  teacher_fields: z.record(z.string(), z.string()),
  locked_teacher_fields: z.array(z.string()),
  changed_fields: z.array(z.string()),
  sync_status: z.enum(['synced', 'needs_teacher_review']),
  status: z.enum(['draft', 'validated', 'archived']),
  created_by: z.string().min(1),
  created_at: z.number().int().nonnegative(),
  updated_at: z.number().int().nonnegative(),
  validated_by: z.string().min(1).nullable(),
  validated_at: z.number().int().nonnegative().nullable(),
  validation_ref: z.string().min(1).nullable(),
});
export type CorrectionSheetDraft = z.infer<typeof CorrectionSheetDraftSchema>;
export const UpdateCorrectionSheetDraftRequestSchema = z.object({
  teacher_fields: z.record(z.string().min(1).max(120), z.string().max(4000)),
  locked_teacher_fields: z.array(z.string().min(1).max(120)).max(100),
});
export type UpdateCorrectionSheetDraftRequest = z.infer<typeof UpdateCorrectionSheetDraftRequestSchema>;
export const SyncCorrectionSheetDraftRequestSchema = z.object({
  source_subject_version_id: z.string().min(1),
});
export type SyncCorrectionSheetDraftRequest = z.infer<typeof SyncCorrectionSheetDraftRequestSchema>;
export const ValidateCorrectionSheetDraftRequestSchema = z.object({
  validation_ref: z.string().min(1).max(500),
});
export type ValidateCorrectionSheetDraftRequest = z.infer<typeof ValidateCorrectionSheetDraftRequestSchema>;

// D08 R3.1 — registre visuel privé et manifest-first ; aucun provider ni asset généré.
// ───────────────────────── Promesse de sortie et preuves qualité ─────────────────────────

export const OutputFamilySchema = z.enum([
  'visual_static',
  'motion',
  'document',
  'dataviz',
  'audio',
  'interactive',
  'export',
]);
export type OutputFamily = z.infer<typeof OutputFamilySchema>;

export const OutputPromiseSchema = z.object({
  promise_id: z.string().min(1),
  output_family: OutputFamilySchema,
  quality_floor: z.enum(['draft', 'reviewable', 'presentable', 'publishable']),
  required_evidence: z.array(z.string().min(1)),
  forbidden_fallbacks: z.array(z.string().min(1)),
  approved_fallbacks: z.array(z.string().min(1)),
  status: z.enum(['candidate', 'locked', 'reviewed']),
  user_approved: z.boolean(),
});
export type OutputPromise = z.infer<typeof OutputPromiseSchema>;

export const OutputQualityEvidenceSchema = z.object({
  evidence_id: z.string().min(1),
  evidence_type: z.string().min(1),
  confidence: z.number().min(0).max(1),
  source_ref: z.string().min(1),
});
export type OutputQualityEvidence = z.infer<typeof OutputQualityEvidenceSchema>;

export const OutputQualityReportSchema = z.object({
  promise_id: z.string().min(1),
  verdict: z.enum(['pass', 'warn', 'block']),
  missing_evidence: z.array(z.string().min(1)),
  forbidden_fallbacks_used: z.array(z.string().min(1)),
  reasons: z.array(z.string().min(1)),
});
export type OutputQualityReport = z.infer<typeof OutputQualityReportSchema>;

export const VisualReferenceStatusSchema = z.enum([
  'canon_strict', 'expression_only', 'outfit_only', 'world_style', 'poster_energy',
  'filter_reference', 'output_template', 'anti_pattern', 'rejected',
]);
export type VisualReferenceStatus = z.infer<typeof VisualReferenceStatusSchema>;
export const VisualReferenceSchema = z.object({
  reference_id: z.string().min(1), owner_id: z.string().min(1), project_id: z.string().min(1).nullable(),
  project_scope: z.string().min(1), label: z.string().min(1), source_ref: z.string().min(1),
  reference_status: VisualReferenceStatusSchema, provenance_state: z.enum(['declared', 'validated', 'weak']),
  privacy_scope: z.enum(['private', 'project_private']), created_by: z.string().min(1),
  created_at: z.number().int().nonnegative(), updated_at: z.number().int().nonnegative(),
});
export type VisualReference = z.infer<typeof VisualReferenceSchema>;
export const CreateVisualReferenceRequestSchema = z.object({
  project_id: z.string().min(1).nullable().optional(), label: z.string().min(1).max(160),
  source_ref: z.string().min(1).max(1000), reference_status: VisualReferenceStatusSchema,
  provenance_state: z.enum(['declared', 'validated', 'weak']), privacy_scope: z.enum(['private', 'project_private']),
});
export type CreateVisualReferenceRequest = z.infer<typeof CreateVisualReferenceRequestSchema>;
export const UpdateVisualReferenceRequestSchema = z.object({reference_status: VisualReferenceStatusSchema, provenance_state: z.enum(['declared', 'validated', 'weak'])});
export type UpdateVisualReferenceRequest = z.infer<typeof UpdateVisualReferenceRequestSchema>;
export const VisualManifestStatusSchema = z.enum([
  'draft','references_to_classify','da_to_resolve','readiness_blocked',
  'action_ready_preview','generation_blocked_tech_pending','parked',
  'approved','rejected',
]);
export const VisualManifestSchema = z.object({
  manifest_id: z.string().min(1), owner_id: z.string().min(1), project_id: z.string().min(1).nullable(),
  project_scope: z.string().min(1), request_title: z.string().min(1), intent: z.string().min(1),
  privacy_scope: z.enum(['private', 'project_private']), canon_entity_refs: z.array(z.string()),
  da_root_ref: z.string().min(1).nullable(), active_layers: z.array(z.string()), filters: z.array(z.string()),
  output_family: z.enum(['visual_retake','visual_diagnostic','event_spread','badge_reward','medal_reward','trophy_reward','visual_manifest_candidate']),
  output_template: z.string().min(1), source_truth_summary: z.string().min(1), reference_ids: z.array(z.string()),
  output_promise: OutputPromiseSchema,
  workbench_id: z.string().nullable(), node_id: z.string().nullable(),
  status: VisualManifestStatusSchema, action_ready_report: z.object({
    final_state: z.enum(['not_ready','ready_for_owner_review','generation_blocked_tech_pending','parked']),
    missing_items: z.array(z.string()), generation_blockers: z.array(z.string()),
  }), created_by: z.string().min(1), created_at: z.number().int().nonnegative(), updated_at: z.number().int().nonnegative(),
});
export type VisualManifest = z.infer<typeof VisualManifestSchema>;
export const CreateVisualManifestRequestSchema = z.object({
  project_id: z.string().min(1).nullable().optional(), request_title: z.string().min(1).max(160), intent: z.string().min(1).max(4000),
  privacy_scope: z.enum(['private', 'project_private']), canon_entity_refs: z.array(z.string().min(1)).max(50).default([]),
  da_root_ref: z.string().min(1).max(500).nullable().optional(), active_layers: z.array(z.string().min(1)).max(30).default([]),
  filters: z.array(z.string().min(1)).max(30).default([]),
  output_family: z.enum(['visual_retake','visual_diagnostic','event_spread','badge_reward','medal_reward','trophy_reward','visual_manifest_candidate']),
  output_template: z.string().min(1).max(500), source_truth_summary: z.string().min(1).max(2000),
  reference_ids: z.array(z.string().min(1)).max(100).default([]),
  output_promise: OutputPromiseSchema.optional(),
  workbench_id: z.string().min(1).nullable().optional(),
  node_id: z.string().min(1).nullable().optional(),
});
export type CreateVisualManifestRequest = z.infer<typeof CreateVisualManifestRequestSchema>;

export const VisualGrammarElementSchema = z.object({
  element_id: z.string().min(1),
  element_type: z.enum(['shape', 'color', 'light', 'motion', 'composition', 'motif', 'texture', 'typography']),
  label: z.string().min(1).max(160),
  meaning: z.string().min(1).max(500),
  source_refs: z.array(z.string().min(1)).min(1).max(20),
});
export type VisualGrammarElement = z.infer<typeof VisualGrammarElementSchema>;

export const EmotionalArcPointSchema = z.object({
  point_id: z.string().min(1),
  narrative_ref: z.string().min(1),
  emotion: z.string().min(1).max(120),
  intensity: z.number().min(0).max(1),
  palette_refs: z.array(z.string().min(1)).max(12),
  lighting_ref: z.string().min(1).nullable(),
});
export type EmotionalArcPoint = z.infer<typeof EmotionalArcPointSchema>;

export const VisualNarrativeGrammarSchema = z.object({
  grammar_id: z.string().min(1),
  scope_ref: z.string().min(1),
  theme_ref: z.string().min(1).nullable(),
  narrative_refs: z.array(z.string().min(1)),
  visual_elements: z.array(VisualGrammarElementSchema),
  emotional_arc: z.array(EmotionalArcPointSchema),
  continuity_refs: z.array(z.string().min(1)),
  source_refs: z.array(z.string().min(1)).min(1),
});
export type VisualNarrativeGrammar = z.infer<typeof VisualNarrativeGrammarSchema>;

export const VisualNarrativeGrammarQuerySchema = z.object({
  workbench_id: z.string().min(1).optional(),
  manifest_id: z.string().min(1).optional(),
  project_id: z.string().min(1).optional(),
}).refine((value) => Boolean(value.workbench_id || value.manifest_id), {
  message: 'workbench_id_or_manifest_id_required',
});
export type VisualNarrativeGrammarQuery = z.input<typeof VisualNarrativeGrammarQuerySchema>;

export const VisualNarrativeGrammarReportSchema = z.object({
  generated_at: z.number().int().nonnegative(),
  grammar: VisualNarrativeGrammarSchema,
  manifest_refs: z.array(z.string().min(1)),
  narrative_fact_refs: z.array(z.string().min(1)),
  explanation_cards: z.array(z.object({
    card_id: z.string().min(1),
    title: z.string().min(1).max(160),
    explanation: z.string().min(1).max(1000),
    source_refs: z.array(z.string().min(1)).min(1).max(20),
  })),
  diagnostics: z.object({
    graphic_drift: z.array(z.string().min(1)),
    unjustified_evolution: z.array(z.string().min(1)),
    decorative_motif_without_function: z.array(z.string().min(1)),
    missing_continuity_refs: z.array(z.string().min(1)),
  }),
  execution_policy: z.literal('explain_only'),
});
export type VisualNarrativeGrammarReport = z.infer<typeof VisualNarrativeGrammarReportSchema>;

export const GeneratedAssetTypeSchema = z.enum(['image', 'visual_manifest', 'badge', 'render', 'export']);
export type GeneratedAssetType = z.infer<typeof GeneratedAssetTypeSchema>;

export const GeneratedAssetStatusSchema = z.enum(['candidate', 'approved', 'rejected', 'archived']);
export type GeneratedAssetStatus = z.infer<typeof GeneratedAssetStatusSchema>;

export const GeneratedAssetSchema = z.object({
  id: z.string(),
  manifest_id: z.string().nullable(),
  job_id: z.string().nullable(),
  owner_id: z.string(),
  project_id: z.string().nullable(),
  asset_type: GeneratedAssetTypeSchema,
  status: GeneratedAssetStatusSchema,
  mime_type: z.string().nullable(),
  storage_ref: z.string().nullable(),
  thumbnail_ref: z.string().nullable(),
  metadata: z.record(z.unknown()).default({}),
  review_note: z.string().nullable(),
  reviewed_by: z.string().nullable(),
  reviewed_at: z.number().nullable(),
  created_at: z.number(),
  updated_at: z.number(),
});
export type GeneratedAsset = z.infer<typeof GeneratedAssetSchema>;

export const StoreGeneratedAssetRequestSchema = z.object({
  manifest_id: z.string().min(1).nullable().optional(),
  job_id: z.string().min(1).nullable().optional(),
  asset_type: GeneratedAssetTypeSchema,
  mime_type: z.string().min(1).nullable().optional(),
  storage_ref: z.string().min(1).nullable().optional(),
  thumbnail_ref: z.string().min(1).nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type StoreGeneratedAssetRequest = z.infer<typeof StoreGeneratedAssetRequestSchema>;

export const UploadBase64AssetRequestSchema = z.object({
  data: z.string().min(1),
  mime: z.string().min(1).default('image/png'),
  asset_type: GeneratedAssetTypeSchema.default('image'),
});
export type UploadBase64AssetRequest = z.infer<typeof UploadBase64AssetRequestSchema>;

export const ReviewGeneratedAssetRequestSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  review_note: z.string().max(2000).optional(),
});
export type ReviewGeneratedAssetRequest = z.infer<typeof ReviewGeneratedAssetRequestSchema>;

export const ASSETS_API = {
  list: '/api/v1/assets',
  get: '/api/v1/assets/:id',
  upload: '/api/v1/assets/upload',
  uploadBase64: '/api/v1/assets/upload-base64',
} as const;

export const DA_RUNTIME_API = {
  assets: {
    list: '/api/v1/da/assets',
    get: '/api/v1/da/assets/:id',
    store: '/api/v1/da/assets',
    review: '/api/v1/da/assets/:id/review',
    byManifest: '/api/v1/da/assets/by-manifest/:manifestId',
  },
} as const;

export const StoryWorkbenchSchema = z.object({workbench_id:z.string().min(1),owner_id:z.string().min(1),project_id:z.string().min(1).nullable(),project_scope:z.string().min(1),title:z.string().min(1),source_ref:z.string().min(1),intake_mode:z.enum(['audit_only','index_only','draft_workbench']),source_truth_state:z.enum(['SOURCE_VERIFIED','SOURCE_CURRENT','SOURCE_LEGACY','USER_PROVIDED']),status:z.enum(['draft','reader_ready','workshop_ready','parked']),canon_locked:z.number().int().min(0).max(1).default(0),created_by:z.string().min(1),created_at:z.number(),updated_at:z.number()});
export type StoryWorkbench=z.infer<typeof StoryWorkbenchSchema>;
export const CreateStoryWorkbenchRequestSchema=z.object({project_id:z.string().min(1).nullable().optional(),title:z.string().min(1).max(160),source_ref:z.string().min(1).max(1000),intake_mode:z.enum(['audit_only','index_only','draft_workbench']),source_truth_state:z.enum(['SOURCE_VERIFIED','SOURCE_CURRENT','SOURCE_LEGACY','USER_PROVIDED'])});
export type CreateStoryWorkbenchRequest=z.infer<typeof CreateStoryWorkbenchRequestSchema>;
export const StoryReaderStateSchema=z.object({reader_state_id:z.string().min(1),workbench_id:z.string().min(1),owner_id:z.string().min(1),current_node:z.string().min(1).nullable(),opening_sequence_lock:z.string().min(1).nullable(),mode:z.enum(['MODE_LECTURE','MODE_ATELIER','FULL_SPOILERS','MODE_EXPORT']),created_at:z.number(),updated_at:z.number()});
export type StoryReaderState=z.infer<typeof StoryReaderStateSchema>;
export const SetStoryReaderStateRequestSchema=z.object({current_node:z.string().min(1).nullable().optional(),opening_sequence_lock:z.string().min(1).nullable().optional(),mode:z.enum(['MODE_LECTURE','MODE_ATELIER','FULL_SPOILERS','MODE_EXPORT'])}).refine(v=>v.mode!=='MODE_LECTURE'||Boolean(v.current_node||v.opening_sequence_lock),{message:'reader_position_required'});
export type SetStoryReaderStateRequest=z.infer<typeof SetStoryReaderStateRequestSchema>;
export const StoryPatchCandidateSchema=z.object({patch_id:z.string().min(1),workbench_id:z.string().min(1),owner_id:z.string().min(1),title:z.string().min(1),proposal:z.string().min(1),truth_state:z.enum(['CANDIDATE','TO_VALIDATE','OPEN_QUESTION','CONTRADICTION']),status:z.enum(['candidate','parked','rejected','validated_for_canon_delta']),created_at:z.number(),updated_at:z.number()});
export type StoryPatchCandidate=z.infer<typeof StoryPatchCandidateSchema>;
export const CreateStoryPatchCandidateRequestSchema=z.object({title:z.string().min(1).max(160),proposal:z.string().min(1).max(10000),truth_state:z.enum(['CANDIDATE','TO_VALIDATE','OPEN_QUESTION','CONTRADICTION']).default('CANDIDATE')});
export type CreateStoryPatchCandidateRequest=z.infer<typeof CreateStoryPatchCandidateRequestSchema>;

export const StoryNodeTypeSchema = z.enum(['arc', 'scene', 'beat', 'sequence', 'chapter']);
export type StoryNodeType = z.infer<typeof StoryNodeTypeSchema>;

export const StoryNodeMetadataSchema = z.object({
  gate_type: z.enum(['none', 'spoiler', 'prerequisite', 'reveal', 'locked']).optional(),
  prerequisite_ids: z.array(z.string().min(1)).optional(),
  reader_visibility: z.enum(['everyone', 'spoilered', 'restricted']).optional(),
  truth_state: z.enum([
    'SOURCE_VERIFIED', 'SOURCE_CURRENT', 'CANDIDATE',
    'CONTRADICTION', 'CANON_LOCKED', 'OPEN_QUESTION',
  ]).optional(),
  protagonist_visibility: z.enum(['known', 'unknown', 'suspected', 'revealed']).optional(),
  confidence: z.enum(['canon', 'probable', 'speculative', 'uncertain', 'contradiction']).optional(),
  character_ids: z.array(z.string().min(1)).optional(),
  visual_manifest_ids: z.array(z.string().min(1)).optional(),
}).catchall(z.unknown());
export type StoryNodeMetadata = z.infer<typeof StoryNodeMetadataSchema>;

export const StoryNodeSchema = z.object({
  id: z.string(),
  workbench_id: z.string(),
  parent_id: z.string().nullable(),
  owner_id: z.string(),
  node_type: StoryNodeTypeSchema,
  title: z.string(),
  summary: z.string().nullable(),
  sort_order: z.number(),
  spoiler_level: z.enum(['none', 'mild', 'major', 'critical']),
  status: z.enum(['draft', 'active', 'locked', 'archived']),
  metadata: StoryNodeMetadataSchema.default({}),
  created_at: z.number(),
  updated_at: z.number(),
});
export type StoryNode = z.infer<typeof StoryNodeSchema>;

export const CreateStoryNodeRequestSchema = z.object({
  workbench_id: z.string().min(1),
  parent_id: z.string().nullable().optional(),
  node_type: StoryNodeTypeSchema,
  title: z.string().min(1).max(300),
  summary: z.string().max(2000).nullable().optional(),
  sort_order: z.number().int().optional(),
  spoiler_level: z.enum(['none', 'mild', 'major', 'critical']).optional(),
  metadata: StoryNodeMetadataSchema.optional(),
});
export type CreateStoryNodeRequest = z.infer<typeof CreateStoryNodeRequestSchema>;

export const UpdateStoryNodeRequestSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  summary: z.string().max(2000).nullable().optional(),
  sort_order: z.number().int().optional(),
  spoiler_level: z.enum(['none', 'mild', 'major', 'critical']).optional(),
  status: z.enum(['draft', 'active', 'locked', 'archived']).optional(),
  metadata: StoryNodeMetadataSchema.optional(),
});
export type UpdateStoryNodeRequest = z.infer<typeof UpdateStoryNodeRequestSchema>;

export const NarrativeEventSchema = z.object({
  id: z.string(),
  workbench_id: z.string(),
  node_id: z.string().nullable(),
  owner_id: z.string(),
  event_type: z.enum(['story_beat','milestone','unlock','character_intro','plot_twist','reveal','decision_point']),
  title: z.string(),
  description: z.string().nullable(),
  payload: z.record(z.unknown()).default({}),
  occurred_at: z.number(),
  created_at: z.number(),
});
export type NarrativeEvent = z.infer<typeof NarrativeEventSchema>;

export const StoryCharacterArchetypeSchema = z.enum([
  'protagonist', 'antagonist', 'mentor', 'ally', 'trickster',
  'guardian', 'herald', 'shadow', 'shapeshifter', 'sidekick',
  'collective', 'neutral',
]);
export type StoryCharacterArchetype = z.infer<typeof StoryCharacterArchetypeSchema>;

export const StoryCharacterSchema = z.object({
  id: z.string(),
  workbench_id: z.string(),
  owner_id: z.string(),
  name: z.string().min(1),
  aliases: z.array(z.string()).default([]),
  role: z.string(),
  archetype: StoryCharacterArchetypeSchema,
  status: z.enum(['active', 'inactive', 'deceased', 'unknown', 'concept']),
  design_notes: z.string().nullable(),
  behavior_notes: z.string().nullable(),
  metadata: z.record(z.unknown()).default({}),
  created_at: z.number(),
  updated_at: z.number(),
});
export type StoryCharacter = z.infer<typeof StoryCharacterSchema>;

export const CreateStoryCharacterRequestSchema = z.object({
  workbench_id: z.string().min(1),
  name: z.string().min(1).max(200),
  aliases: z.array(z.string().min(1)).max(20).optional(),
  role: z.string().min(1).max(500),
  archetype: StoryCharacterArchetypeSchema,
  status: z.enum(['active', 'inactive', 'deceased', 'unknown', 'concept']).optional(),
  design_notes: z.string().max(5000).nullable().optional(),
  behavior_notes: z.string().max(5000).nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type CreateStoryCharacterRequest = z.infer<typeof CreateStoryCharacterRequestSchema>;

export const UpdateStoryCharacterRequestSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  aliases: z.array(z.string().min(1)).max(20).optional(),
  role: z.string().min(1).max(500).optional(),
  archetype: StoryCharacterArchetypeSchema.optional(),
  status: z.enum(['active', 'inactive', 'deceased', 'unknown', 'concept']).optional(),
  design_notes: z.string().max(5000).nullable().optional(),
  behavior_notes: z.string().max(5000).nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type UpdateStoryCharacterRequest = z.infer<typeof UpdateStoryCharacterRequestSchema>;

export const GenerateSceneVisualRequestSchema = z.object({
  node_id: z.string().min(1),
  additional_prompt: z.string().max(1000).optional(),
  width: z.number().int().positive().max(4096).optional(),
  height: z.number().int().positive().max(4096).optional(),
  n: z.number().int().min(1).max(4).optional(),
});
export type GenerateSceneVisualRequest = z.infer<typeof GenerateSceneVisualRequestSchema>;

export const CreateNarrativeEventRequestSchema = z.object({
  workbench_id: z.string().min(1),
  node_id: z.string().nullable().optional(),
  event_type: z.enum(['story_beat','milestone','unlock','character_intro','plot_twist','reveal','decision_point']),
  title: z.string().min(1).max(300),
  description: z.string().max(5000).nullable().optional(),
  payload: z.record(z.unknown()).optional(),
  occurred_at: z.number().optional(),
});
export type CreateNarrativeEventRequest = z.infer<typeof CreateNarrativeEventRequestSchema>;

export const NarrativeTruthStateSchema = z.enum(['canon', 'probable', 'candidate', 'contradictory', 'revoked']);
export type NarrativeTruthState = z.infer<typeof NarrativeTruthStateSchema>;

export const NarrativeFactSchema = z.object({
  fact_id: z.string().min(1),
  workbench_id: z.string().min(1),
  source_kind: z.enum(['story_node', 'narrative_event', 'story_character']),
  subject_refs: z.array(z.string().min(1)).max(20),
  summary: z.string().min(1).max(1000),
  truth_state: NarrativeTruthStateSchema,
  spoiler_level: z.enum(['none', 'mild', 'major', 'critical']),
  confidence: z.enum(['canon', 'probable', 'speculative', 'uncertain', 'contradiction']),
  source_refs: z.array(z.string().min(1)).min(1).max(20),
  created_at: z.number().int().nonnegative(),
  updated_at: z.number().int().nonnegative(),
});
export type NarrativeFact = z.infer<typeof NarrativeFactSchema>;

export const NarrativePresentationModeSchema = z.enum(['reader', 'workshop', 'full_spoilers', 'export']);
export type NarrativePresentationMode = z.infer<typeof NarrativePresentationModeSchema>;

export const NarrativePresentationSchema = z.object({
  presentation_id: z.string().min(1),
  workbench_id: z.string().min(1),
  mode: NarrativePresentationModeSchema,
  point_of_view_ref: z.string().min(1).nullable(),
  audience_ref: z.string().min(1).nullable(),
  visible_fact_refs: z.array(z.string().min(1)),
  hidden_spoiler_refs: z.array(z.string().min(1)),
  ordering_refs: z.array(z.string().min(1)),
  media_refs: z.array(z.string().min(1)),
  source_refs: z.array(z.string().min(1)).min(1),
});
export type NarrativePresentation = z.infer<typeof NarrativePresentationSchema>;

export const CharacterKnowledgeSchema = z.object({
  character_ref: z.string().min(1),
  fact_ref: z.string().min(1),
  knowledge_state: z.enum(['knows', 'believes', 'ignores', 'conceals']),
  evidence_refs: z.array(z.string().min(1)).min(1).max(20),
});
export type CharacterKnowledge = z.infer<typeof CharacterKnowledgeSchema>;

export const CharacterGoalSchema = z.object({
  goal_id: z.string().min(1),
  character_ref: z.string().min(1),
  summary: z.string().min(1).max(500),
  status: z.enum(['active', 'blocked', 'completed', 'unknown']),
  source_refs: z.array(z.string().min(1)).min(1).max(20),
});
export type CharacterGoal = z.infer<typeof CharacterGoalSchema>;

export const SetupPayoffSchema = z.object({
  thread_id: z.string().min(1),
  workbench_id: z.string().min(1),
  setup_refs: z.array(z.string().min(1)),
  payoff_refs: z.array(z.string().min(1)),
  status: z.enum(['setup_only', 'payoff_ready', 'resolved', 'broken']),
  explanation: z.string().min(1).max(1000),
});
export type SetupPayoff = z.infer<typeof SetupPayoffSchema>;

export const NarrativeCanonGraphQuerySchema = z.object({
  workbench_id: z.string().min(1),
  presentation_mode: NarrativePresentationModeSchema.default('workshop'),
});
export type NarrativeCanonGraphQuery = z.input<typeof NarrativeCanonGraphQuerySchema>;

export const NarrativeCanonGraphSchema = z.object({
  workbench_id: z.string().min(1),
  generated_at: z.number().int().nonnegative(),
  facts: z.array(NarrativeFactSchema),
  presentation: NarrativePresentationSchema,
  character_knowledge: z.array(CharacterKnowledgeSchema),
  character_goals: z.array(CharacterGoalSchema),
  setup_payoffs: z.array(SetupPayoffSchema),
  diagnostics: z.object({
    contradictions: z.array(z.string().min(1)),
    spoiler_leaks: z.array(z.string().min(1)),
    temporal_warnings: z.array(z.string().min(1)),
    emotion_without_cause: z.array(z.string().min(1)),
  }),
});
export type NarrativeCanonGraph = z.infer<typeof NarrativeCanonGraphSchema>;

export const StoryletDomainSchema = z.enum([
  'onboarding',
  'narrative',
  'precedent',
  'visual',
  'companion',
  'teaching',
  'bridge',
  'notification',
]);
export type StoryletDomain = z.infer<typeof StoryletDomainSchema>;

export const StoryletDefinitionSchema = z.object({
  storylet_id: z.string().min(1),
  domain: StoryletDomainSchema,
  title: z.string().min(1).max(240),
  description: z.string().min(1).max(1000),
  appearance_conditions: z.array(z.string().min(1).max(240)).min(1).max(12),
  proposed_action: z.string().min(1).max(500),
  expected_effects: z.array(z.string().min(1).max(240)).max(12),
  priority: z.number().min(0).max(1),
  validation_required: z.boolean(),
  scope_ref: z.string().min(1),
  permission_ref: z.string().min(1).nullable(),
  source_refs: z.array(z.string().min(1)).min(1).max(20),
});
export type StoryletDefinition = z.infer<typeof StoryletDefinitionSchema>;

export const StoryletInstanceSchema = z.object({
  instance_id: z.string().min(1),
  definition: StoryletDefinitionSchema,
  readiness: z.enum(['available', 'pending_validation', 'blocked', 'expired']),
  reason: z.string().min(1).max(500),
  context_refs: z.array(z.string().min(1)).max(20),
  expires_at: z.number().int().nonnegative().nullable(),
});
export type StoryletInstance = z.infer<typeof StoryletInstanceSchema>;

export const StoryletEvaluationQuerySchema = z.object({
  project_id: z.string().min(1).optional(),
  workbench_id: z.string().min(1).optional(),
  guided_session_id: z.string().min(1).optional(),
  domains: z.array(StoryletDomainSchema).min(1).optional(),
  limit: z.number().int().min(1).max(50).default(20),
});
export type StoryletEvaluationQuery = z.input<typeof StoryletEvaluationQuerySchema>;

export const StoryletEvaluationSchema = z.object({
  generated_at: z.number().int().nonnegative(),
  scope_refs: z.array(z.string().min(1)).min(1),
  instances: z.array(StoryletInstanceSchema),
  blocked_count: z.number().int().nonnegative(),
  validation_required_count: z.number().int().nonnegative(),
  execution_policy: z.literal('suggest_only'),
});
export type StoryletEvaluation = z.infer<typeof StoryletEvaluationSchema>;

export const LivingCompanionReadinessSchema = z.enum([
  'ready',
  'limited',
  'blocked',
  'completed',
]);
export type LivingCompanionReadiness = z.infer<typeof LivingCompanionReadinessSchema>;

export const LivingCompanionSchema = z.object({
  companion_id: z.string().min(1),
  companion_type: z.enum(['cdc_robot', 'moth']),
  display_name: z.string().min(1).max(160),
  role_summary: z.string().min(1).max(500),
  boundaries: z.array(z.string().min(1).max(240)).min(1).max(12),
  session_ref: z.string().min(1),
  guide_ref: z.string().min(1),
  project_ref: z.string().min(1).nullable(),
  room_ref: z.string().min(1).nullable(),
  assignment_scope_refs: z.array(z.string().min(1)).min(1).max(6),
  functional_persona_ref: z.string().min(1).nullable(),
  lore_persona_ref: z.string().min(1).nullable(),
  interaction_mode: z.literal('full_page_guided'),
  readiness: LivingCompanionReadinessSchema,
  current_prompt: z.string().min(1).max(1000).nullable(),
  dialogue_bubble: z.string().min(1).max(1200),
  available_intents: z.array(z.enum([
    'answer_current_question',
    'review_progress',
    'request_facilitator',
    'review_summary',
  ])),
  progress: GuidedProgressSchema,
  storylets: z.array(StoryletInstanceSchema),
  source_refs: z.array(z.string().min(1)).min(1).max(30),
  diagnostics: z.object({
    unresolved_persona_refs: z.array(z.string().min(1)),
    contradictions: z.array(z.string().min(1)),
    configuration_warnings: z.array(z.string().min(1).max(500)),
  }),
  presence_policy: z.literal('assigned_context_only'),
  configuration_policy: z.literal('creator_validates_initial_identity'),
  evolution_policy: z.literal('engine_managed_after_validation'),
  execution_policy: z.literal('guide_only'),
});
export type LivingCompanion = z.infer<typeof LivingCompanionSchema>;

export const NARRATIVE_RUNTIME_API = {
  nodes: {
    list: '/api/v1/narrative/nodes',
    create: '/api/v1/narrative/nodes',
    get: '/api/v1/narrative/nodes/:id',
    update: '/api/v1/narrative/nodes/:id',
    delete: '/api/v1/narrative/nodes/:id',
    byWorkbench: '/api/v1/narrative/nodes/by-workbench/:workbenchId',
    reorder: '/api/v1/narrative/nodes/reorder',
  },
  events: {
    list: '/api/v1/narrative/events',
    create: '/api/v1/narrative/events',
    delete: '/api/v1/narrative/events/:id',
    byWorkbench: '/api/v1/narrative/events/by-workbench/:workbenchId',
  },
  workbench: {
    updateStatus: '/api/v1/narrative/workbench/:id/status',
    canonLock: '/api/v1/narrative/workbench/:id/canon-lock',
    canonGraph: '/api/v1/narrative/workbench/:id/canon-graph',
  },
  characters: {
    list: '/api/v1/narrative/characters',
    create: '/api/v1/narrative/characters',
    get: '/api/v1/narrative/characters/:id',
    update: '/api/v1/narrative/characters/:id',
    delete: '/api/v1/narrative/characters/:id',
    byWorkbench: '/api/v1/narrative/characters/by-workbench/:workbenchId',
  },
  visual: {
    generate: '/api/v1/narrative/nodes/:id/generate-visual',
  },
} as const;

export const STORY_WORKBENCHES_API = {
  list: '/api/v1/story-workbenches',
  get: '/api/v1/story-workbenches/:id',
  create: '/api/v1/story-workbenches',
  update: '/api/v1/story-workbenches/:id',
  delete: '/api/v1/story-workbenches/:id',
  patches: '/api/v1/story-workbenches/:id/patches',
  validatePatch: '/api/v1/story-workbenches/:id/patches/:patchId/validate',
  readerState: '/api/v1/story-workbenches/:id/reader-state',
} as const;

export const VISUAL_MANIFESTS_API = {
  references: '/api/v1/visual-references',
  referencesUpdate: '/api/v1/visual-references/:id',
  manifests: '/api/v1/visual-manifests',
  get: '/api/v1/visual-manifests/:id',
  create: '/api/v1/visual-manifests',
  submitReview: '/api/v1/visual-manifests/:id/submit-review',
  approve: '/api/v1/visual-manifests/:id/approve',
  reject: '/api/v1/visual-manifests/:id/reject',
} as const;

export const QuoteLineCategorySchema=z.enum(['service','production_time','resource','asset','license','hardware','software','travel','contingency','discount','tax_placeholder']);
export type QuoteLineCategory=z.infer<typeof QuoteLineCategorySchema>;
export const QuoteLineSchema=z.object({label:z.string().min(1),quantity:z.number().positive(),unit_price:z.number().nonnegative(),price_source_ref:z.string().min(1),confidence:z.enum(['low','medium','high']),category:QuoteLineCategorySchema.optional(),margin:z.number().optional(),tax_mode:z.enum(['ht','tva_reduite','tva_pleine']).optional(),optional:z.boolean().optional(),notes:z.string().max(2000).optional(),subtotal:z.number().nonnegative()});
export const PrivateQuoteDraftSchema=z.object({quote_id:z.string().min(1),owner_id:z.string().min(1),project_id:z.string().min(1).nullable(),project_scope:z.string().min(1),version:z.number().int().positive(),client_label:z.string().min(1),currency:z.string().length(3),lines:z.array(QuoteLineSchema),assumptions:z.array(z.string()),exclusions:z.array(z.string()),validity:z.string().min(1),total:z.number().nonnegative(),margin_total:z.number().optional(),tax_total:z.number().optional(),status:z.enum(['draft','needs_review','validated_private','archived']),created_by:z.string().min(1),created_at:z.number(),updated_at:z.number()});
export type PrivateQuoteDraft=z.infer<typeof PrivateQuoteDraftSchema>;
export const CreatePrivateQuoteDraftRequestSchema=z.object({project_id:z.string().min(1).nullable().optional(),client_label:z.string().min(1).max(200),currency:z.string().length(3).transform(v=>v.toUpperCase()),lines:z.array(z.object({label:z.string().min(1).max(300),quantity:z.number().positive(),unit_price:z.number().nonnegative(),price_source_ref:z.string().min(1).max(1000),confidence:z.enum(['low','medium','high']),category:QuoteLineCategorySchema.optional(),margin:z.number().optional(),tax_mode:z.enum(['ht','tva_reduite','tva_pleine']).optional(),optional:z.boolean().optional(),notes:z.string().max(2000).optional()})).min(1).max(100),assumptions:z.array(z.string().min(1).max(1000)).max(50).default([]),exclusions:z.array(z.string().min(1).max(1000)).max(50).default([]),validity:z.string().min(1).max(200)});
export type CreatePrivateQuoteDraftRequest=z.infer<typeof CreatePrivateQuoteDraftRequestSchema>;

export const CorrectionBatchSchema = z.object({
  batch_id: z.string().min(1),
  owner_id: z.string().min(1),
  project_id: z.string().min(1).nullable().optional(),
  project_scope: z.string().min(1),
  rubric_version_id: z.string().min(1),
  grading_profile_id: z.string().min(1),
  status: z.enum(['draft', 'ready', 'running', 'review', 'completed', 'failed', 'archived']),
  submission_count: z.number().int().nonnegative(),
  created_at: z.number().int().nonnegative(),
  updated_at: z.number().int().nonnegative(),
});
export type CorrectionBatch = z.infer<typeof CorrectionBatchSchema>;

/** Création atomique d'un lot privé et de son contexte figé, sans intake ni correction. */
export const CreateCorrectionBatchRequestSchema = z.object({
  project_id: z.string().min(1).nullable().optional(),
  rubric_version_id: z.string().min(1),
  grading_profile_id: z.string().min(1),
  cohort_id: z.string().min(1),
  roster_version_id: z.string().min(1),
  subject_version_ref: z.string().min(1).max(500),
  source_refs: z.array(z.string().min(1).max(500)).min(1).max(100),
  process_context_profile_ref: z.string().min(1).max(500),
});
export type CreateCorrectionBatchRequest = z.infer<typeof CreateCorrectionBatchRequestSchema>;

export const CorrectionContextSnapshotSchema = z.object({
  snapshot_id: z.string().min(1),
  batch_id: z.string().min(1),
  owner_id: z.string().min(1),
  project_id: z.string().min(1).nullable(),
  cohort_id: z.string().min(1),
  roster_version_id: z.string().min(1),
  rubric_version_id: z.string().min(1),
  subject_version_ref: z.string().min(1).max(500),
  source_refs: z.array(z.string().min(1).max(500)).min(1).max(100),
  process_context_profile_ref: z.string().min(1).max(500),
  created_by: z.string().min(1),
  created_at: z.number().int().nonnegative(),
});
export type CorrectionContextSnapshot = z.infer<typeof CorrectionContextSnapshotSchema>;

export const CreateCorrectionContextSnapshotSchema = z.object({
  cohort_id: z.string().min(1),
  roster_version_id: z.string().min(1),
  subject_version_ref: z.string().min(1).max(500),
  source_refs: z.array(z.string().min(1).max(500)).min(1).max(100),
  process_context_profile_ref: z.string().min(1).max(500),
});
export type CreateCorrectionContextSnapshot = z.infer<
  typeof CreateCorrectionContextSnapshotSchema
>;

export const CorrectionContextPayloadSchema = z.object({
  snapshot_id: z.string().min(1),
  batch_id: z.string().min(1),
  cohort: z.object({
    cohort_id: z.string().min(1),
    title: z.string().min(1).max(160),
    period_ref: z.string().min(1).max(160).nullable(),
  }),
  roster: z.object({
    roster_version_id: z.string().min(1),
    version: z.number().int().positive(),
    source_ref: z.string().min(1).max(500),
    members: z
      .array(
        z.object({
          student_identity_id: z.string().min(1),
          display_name: z.string().min(1).max(160),
          aliases: z.array(z.string().min(1).max(160)).max(20),
        }),
      )
      .max(300),
  }),
  rubric_version_id: z.string().min(1),
  subject_version_ref: z.string().min(1).max(500),
  source_refs: z.array(z.string().min(1).max(500)).min(1).max(100),
  process_context_profile_ref: z.string().min(1).max(500),
  privacy: z.literal('private'),
  compiled_at: z.number().int().nonnegative(),
});
export type CorrectionContextPayload = z.infer<typeof CorrectionContextPayloadSchema>;

export const SubmissionRecordSchema = z.object({
  submission_id: z.string().min(1),
  batch_id: z.string().min(1),
  owner_id: z.string().min(1),
  project_id: z.string().min(1).nullable().optional(),
  project_scope: z.string().min(1),
  student_ref: z.string().min(1).nullable(),
  student_identity_id: z.string().min(1).nullable().optional(),
  identity_linked_by: z.string().min(1).nullable().optional(),
  identity_linked_at: z.number().int().nonnegative().nullable().optional(),
  source_evidence_ref: z.string().min(1),
  identity_status: z.enum(['unknown', 'candidate', 'confirmed', 'rejected']),
  status: z.enum(['candidate', 'ready', 'processing', 'review', 'completed', 'rejected']),
  privacy_level: z.literal('private'),
  created_at: z.number().int().nonnegative(),
  updated_at: z.number().int().nonnegative(),
});
export type SubmissionRecord = z.infer<typeof SubmissionRecordSchema>;

export const CreateSubmissionIntakeRequestSchema = z.object({
  source_ref: z.string().min(1).max(500),
  observed_label: z.string().min(1).max(160).nullable().optional(),
});
export type CreateSubmissionIntakeRequest = z.infer<typeof CreateSubmissionIntakeRequestSchema>;

export const LinkSubmissionIdentityRequestSchema = z.object({
  context_snapshot_id: z.string().min(1),
  student_identity_id: z.string().min(1),
});
export type LinkSubmissionIdentityRequest = z.infer<
  typeof LinkSubmissionIdentityRequestSchema
>;

export const SubmissionIdentityLinkSchema = z.object({
  submission_id: z.string().min(1),
  batch_id: z.string().min(1),
  context_snapshot_id: z.string().min(1),
  roster_version_id: z.string().min(1),
  student_identity_id: z.string().min(1),
  identity_status: z.literal('confirmed'),
  linked_by: z.string().min(1),
  linked_at: z.number().int().nonnegative(),
});
export type SubmissionIdentityLink = z.infer<typeof SubmissionIdentityLinkSchema>;

export const CreateIdentityMatchCandidateRequestSchema = z.object({
  context_snapshot_id: z.string().min(1),
  observed_label: z.string().min(1).max(160),
});
export type CreateIdentityMatchCandidateRequest = z.infer<
  typeof CreateIdentityMatchCandidateRequestSchema
>;

export const IdentityMatchCandidateSchema = z.object({
  candidate_id: z.string().min(1),
  submission_id: z.string().min(1),
  batch_id: z.string().min(1),
  context_snapshot_id: z.string().min(1),
  observed_label: z.string().min(1).max(160),
  candidate_identity_ids: z.array(z.string().min(1)).min(1).max(20),
  status: z.enum(['pending', 'confirmed', 'rejected']),
  selected_identity_id: z.string().min(1).nullable(),
  created_by: z.string().min(1),
  decided_by: z.string().min(1).nullable(),
  created_at: z.number().int().nonnegative(),
  updated_at: z.number().int().nonnegative(),
});
export type IdentityMatchCandidate = z.infer<typeof IdentityMatchCandidateSchema>;

export const IdentityMatchReviewItemSchema = z.object({
  candidate: IdentityMatchCandidateSchema,
  options: z.array(
    z.object({
      student_identity_id: z.string().min(1),
      display_name: z.string().min(1).max(160),
      aliases: z.array(z.string().min(1).max(160)).max(20),
    }),
  ).min(1).max(20),
});
export type IdentityMatchReviewItem = z.infer<typeof IdentityMatchReviewItemSchema>;

export const DecideIdentityMatchCandidateRequestSchema = z
  .object({
    decision: z.enum(['confirm', 'reject']),
    selected_identity_id: z.string().min(1).nullable().optional(),
  })
  .refine(
    (request) =>
      request.decision === 'reject' || Boolean(request.selected_identity_id),
    {message: 'Une confirmation exige une identité sélectionnée.', path: ['selected_identity_id']},
  );
export type DecideIdentityMatchCandidateRequest = z.infer<
  typeof DecideIdentityMatchCandidateRequestSchema
>;

export const PreCorrectionManifestSchema = z
  .object({
    manifest_id: z.string().min(1),
    batch_id: z.string().min(1),
    project_id: z.string().min(1).nullable().optional(),
    project_scope: z.string().min(1),
    rubric_version_id: z.string().min(1),
    grading_profile_id: z.string().min(1),
    context_snapshot_id: z.string().min(1),
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

export const CreatePreCorrectionManifestRequestSchema = z.object({
  submission_refs: z.array(z.string().min(1)).min(1).max(100),
  workflow_version: z.string().min(1).max(160),
});
export type CreatePreCorrectionManifestRequest = z.infer<typeof CreatePreCorrectionManifestRequestSchema>;

export const ValidatePreCorrectionManifestRequestSchema = z.object({
  validation_ref: z.string().min(1).max(500),
});
export type ValidatePreCorrectionManifestRequest = z.infer<typeof ValidatePreCorrectionManifestRequestSchema>;

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
    project_id: z.string().min(1).nullable().optional(),
    project_scope: z.string().min(1),
    rubric_version_id: z.string().min(1),
    grading_profile_id: z.string().min(1),
    context_snapshot_id: z.string().min(1),
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

// ───────────────────────── Correction session state & scoring (P2 bridge) ─────────────────────────

export const CorrectionSessionStateSchema = z.enum([
  'created',
  'sources_partial',
  'sources_ready',
  'rubric_generated',
  'submissions_partial',
  'submissions_stable',
  'matching_verified',
  'ready_for_calibration',
  'ready_for_batch',
  'grading_in_progress',
  'grading_complete',
  'report_generated',
  'outdated',
]);
export type CorrectionSessionState = z.infer<typeof CorrectionSessionStateSchema>;

export const CORRECTION_SESSION_TRANSITIONS: Record<CorrectionSessionState, CorrectionSessionState[]> = {
  created: ['sources_partial', 'sources_ready'],
  sources_partial: ['sources_ready', 'outdated'],
  sources_ready: ['rubric_generated', 'outdated'],
  rubric_generated: ['submissions_partial', 'submissions_stable', 'outdated'],
  submissions_partial: ['submissions_stable', 'outdated'],
  submissions_stable: ['matching_verified', 'outdated'],
  matching_verified: ['ready_for_calibration', 'ready_for_batch', 'outdated'],
  ready_for_calibration: ['ready_for_batch', 'outdated'],
  ready_for_batch: ['grading_in_progress', 'outdated'],
  grading_in_progress: ['grading_complete'],
  grading_complete: ['report_generated', 'outdated'],
  report_generated: ['outdated'],
  outdated: [],
};

export const CorrectionScoringSignalTypeSchema = z.enum([
  'insight',
  'mechanic',
  'benchmark',
  'activation',
  'naming',
  'construction',
  'coherence',
  'red_flag_chat',
  'red_flag_help',
  'red_flag_generic',
  'red_flag_instagram',
  'red_flag_influencer',
  'red_flag_dating',
]);
export type CorrectionScoringSignalType = z.infer<typeof CorrectionScoringSignalTypeSchema>;

export const CorrectionScoringSignalSchema = z.object({
  type: CorrectionScoringSignalTypeSchema,
  label: z.string().min(1),
  evidence: z.string().min(1),
  weight: z.number().min(-1).max(1),
});
export type CorrectionScoringSignal = z.infer<typeof CorrectionScoringSignalSchema>;

export const CorrectionCriterionScoreSchema = z.object({
  criterion_id: z.string().min(1),
  draft_score: z.number().nonnegative(),
  max_points: z.number().positive(),
  confidence: z.number().min(0).max(1),
  evidence: z.string().min(1),
  signals: z.array(CorrectionScoringSignalSchema).min(1),
});
export type CorrectionCriterionScore = z.infer<typeof CorrectionCriterionScoreSchema>;

export const CorrectionSubmissionScoreSchema = z.object({
  submission_id: z.string().min(1),
  criterion_scores: z.array(CorrectionCriterionScoreSchema).min(1),
  feedback: z.string().min(1),
  feedback_tone: z.enum(['supportive', 'clear', 'firm']),
  total_score: z.number().nonnegative(),
  review_reasons: z.array(z.string().min(1)),
});
export type CorrectionSubmissionScore = z.infer<typeof CorrectionSubmissionScoreSchema>;

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
    project_id: z.string().min(1).nullable().optional(),
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
    project_id: z.string().min(1).nullable().optional(),
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
    project_id: z.string().min(1).nullable().optional(),
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
    project_id: z.string().min(1).nullable().optional(),
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

// ── Génération d'image (branchement gated GO IMAGE) ──────────────────────────
// Le job est de type `asset_prepare` (famille runner `asset`). Il n'est créé que
// par l'action sensible approuvée (preflight_image_action / create_render_manifest)
// — jamais d'image sans ce gate. La sortie du runner part en `needs_review`, jamais
// `completed` : un humain valide et ingère l'asset.
export const ImageGenerationRequestSchema = z.object({
  owner_id: z.string().min(1),
  scope_type: z.enum(['owner', 'project']),
  scope_id: z.string().min(1),
  prompt: z.string().min(1).max(2000),
  negative_prompt: z.string().max(2000).optional(),
  width: z.number().int().positive().max(4096).optional(),
  height: z.number().int().positive().max(4096).optional(),
  n: z.number().int().min(1).max(4).default(1),
});
export type ImageGenerationRequest = z.infer<typeof ImageGenerationRequestSchema>;

/** Une image proposée par le runner (référence `url` ou octets `base64`, jamais inventée). */
export const GeneratedImageSchema = z
  .object({
    mime: z.enum(['image/png', 'image/jpeg', 'image/webp']),
    url: z.string().url().optional(),
    base64: z.string().min(1).optional(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
  })
  .refine((img) => Boolean(img.url) || Boolean(img.base64), {
    message: 'Une image générée doit porter une url ou des octets base64.',
  });
export type GeneratedImage = z.infer<typeof GeneratedImageSchema>;

export const CorrectionPrepareRequestSchema = z.object({
  owner_id: z.string().min(1),
  project_id: z.string().min(1).nullable().optional(),
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
  project_id: z.string().min(1).nullable().optional(),
  project_scope: z.string().min(1),
  batch_id: z.string().min(1),
  export_preview_ref: z.string().min(1),
  preflight_ref: z.string().min(1),
  validation_ref: z.string().min(1),
  source_kind: z.literal('approved_correction_export_preview'),
});
export type ExportPrepareRequest = z.infer<typeof ExportPrepareRequestSchema>;

export const RunnerStatusSchema = z.enum(['online', 'draining', 'offline']);
export type RunnerStatus = z.infer<typeof RunnerStatusSchema>;

export const RunnerHeartbeatSchema = z.object({
  runner_id: z.string().min(1),
  runner_family: z.string().min(1),
  job_types: z.array(JobTypeSchema).min(1),
  status: RunnerStatusSchema,
  active_job_id: z.string().min(1).nullable(),
  version: z.string().min(1),
  host_ref: z.string().min(1).nullable(),
  lease_ms: z.number().int().positive().max(60 * 60 * 1000),
  last_seen_at: z.number().int().nonnegative(),
});
export type RunnerHeartbeat = z.infer<typeof RunnerHeartbeatSchema>;

export const WorkflowEventTypeSchema = z.enum([
  'workflow_started',
  'workflow_step_completed',
  'workflow_blocked',
  'workflow_failed',
  'workflow_completed',
  'validation_requested',
  'validation_approved',
  'validation_rejected',
  'job_queued',
  'job_failed',
  'resource_missing',
  'permission_denied',
]);
export type WorkflowEventType = z.infer<typeof WorkflowEventTypeSchema>;

export const WorkflowRuntimeStatusSchema = z.enum([
  'started',
  'running',
  'blocked',
  'failed',
  'completed',
  'validation_pending',
  'validation_approved',
  'validation_rejected',
]);
export type WorkflowRuntimeStatus = z.infer<typeof WorkflowRuntimeStatusSchema>;

export const WorkflowEventSchema = z.object({
  event_id: z.string().min(1),
  workflow_id: z.string().min(1),
  event_type: WorkflowEventTypeSchema,
  workflow_type: z.string().min(1),
  capability_id: z.string().min(1),
  owner_id: z.string().min(1),
  project_id: z.string().min(1).nullable(),
  room_id: z.string().min(1).nullable(),
  duration_ms: z.number().int().nonnegative().nullable(),
  cost_eur: z.number().nonnegative().nullable(),
  tokens: z.number().int().nonnegative().nullable(),
  status: WorkflowRuntimeStatusSchema,
  blocker_category: z.string().min(1).nullable(),
  created_at: z.number().int().nonnegative(),
});
export type WorkflowEvent = z.infer<typeof WorkflowEventSchema>;

// ───────────────────────── Experience Fabric : spine événementielle ─────────────────────────

export const DomainEventStreamSchema = z.enum([
  'audit',
  'workflow',
  'narrative',
  'job',
  'progression',
]);
export type DomainEventStream = z.infer<typeof DomainEventStreamSchema>;

export const DomainEventOutcomeSchema = z.enum([
  'observed',
  'running',
  'pending_validation',
  'approved',
  'completed',
  'failed',
  'blocked',
  'rejected',
  'cancelled',
]);
export type DomainEventOutcome = z.infer<typeof DomainEventOutcomeSchema>;

export const DomainEventEnvelopeSchema = z.object({
  event_id: z.string().min(1),
  stream_type: DomainEventStreamSchema,
  stream_id: z.string().min(1),
  event_type: z.string().min(1).max(160),
  actor_id: z.string().min(1).nullable(),
  project_id: z.string().min(1).nullable(),
  room_id: z.string().min(1).nullable(),
  object_ref: z.string().min(1).nullable(),
  summary: z.string().min(1).max(500),
  source_refs: z.array(z.string().min(1)).min(1),
  cause_ref: z.string().min(1).nullable(),
  outcome: DomainEventOutcomeSchema,
  confidence: z.enum(['recorded', 'validated', 'inferred']),
  provenance: z.object({
    activity_ref: z.string().min(1),
    entity_refs: z.array(z.string().min(1)),
    agent_ref: z.string().min(1).nullable(),
  }),
  occurred_at: z.number().int().nonnegative(),
});
export type DomainEventEnvelope = z.infer<typeof DomainEventEnvelopeSchema>;

export const ExperienceTimelineQuerySchema = z.object({
  project_id: z.string().min(1).optional(),
  streams: z.array(DomainEventStreamSchema).min(1).optional(),
  from: z.number().int().nonnegative().optional(),
  to: z.number().int().nonnegative().optional(),
  limit: z.number().int().min(1).max(200).default(100),
});
export type ExperienceTimelineQuery = z.input<typeof ExperienceTimelineQuerySchema>;

export const ExperienceStateSnapshotSchema = z.object({
  scope: z.enum(['user', 'project']),
  scope_id: z.string().min(1),
  up_to: z.number().int().nonnegative(),
  event_count: z.number().int().nonnegative(),
  stream_counts: z.record(DomainEventStreamSchema, z.number().int().nonnegative()),
  outcome_counts: z.record(DomainEventOutcomeSchema, z.number().int().nonnegative()),
  latest_event: DomainEventEnvelopeSchema.nullable(),
  open_blockers: z.array(z.string().min(1)),
  fingerprint: z.string().min(1),
});
export type ExperienceStateSnapshot = z.infer<typeof ExperienceStateSnapshotSchema>;

export const PrecedentCaseSourceSchema = z.enum([
  'memory_card',
  'room_checkpoint',
  'decision_trace',
  'domain_event',
]);
export type PrecedentCaseSource = z.infer<typeof PrecedentCaseSourceSchema>;

export const PrecedentCaseStatusSchema = z.enum([
  'candidate',
  'usable',
  'stale',
  'rejected',
]);
export type PrecedentCaseStatus = z.infer<typeof PrecedentCaseStatusSchema>;

export const PrecedentCaseSchema = z.object({
  case_id: z.string().min(1),
  source_kind: PrecedentCaseSourceSchema,
  scope: z.enum(['user', 'project']),
  scope_id: z.string().min(1),
  project_id: z.string().min(1).nullable(),
  title: z.string().min(1).max(240),
  context_summary: z.string().min(1).max(1000),
  decision_summary: z.string().min(1).max(1000),
  outcome_summary: z.string().min(1).max(1000),
  lesson: z.string().min(1).max(1000),
  tags: z.array(z.string().min(1).max(80)).max(12),
  confidence: z.enum(['low', 'medium', 'high', 'validated']),
  status: PrecedentCaseStatusSchema,
  source_refs: z.array(z.string().min(1)).min(1).max(20),
  event_refs: z.array(z.string().min(1)).max(20),
  requires_human_validation: z.literal(true),
  created_at: z.number().int().nonnegative(),
  updated_at: z.number().int().nonnegative(),
});
export type PrecedentCase = z.infer<typeof PrecedentCaseSchema>;

export const PrecedentSearchQuerySchema = z.object({
  project_id: z.string().min(1).optional(),
  q: z.string().min(1).max(240).optional(),
  tags: z.array(z.string().min(1).max(80)).max(12).optional(),
  source_kinds: z.array(PrecedentCaseSourceSchema).min(1).optional(),
  include_candidates: z.boolean().default(false),
  limit: z.number().int().min(1).max(50).default(20),
});
export type PrecedentSearchQuery = z.input<typeof PrecedentSearchQuerySchema>;

export const PrecedentSearchResultSchema = z.object({
  case: PrecedentCaseSchema,
  relevance_score: z.number().min(0).max(1),
  match_reasons: z.array(z.string().min(1).max(240)).min(1).max(6),
  adaptation_note: z.string().min(1).max(500),
});
export type PrecedentSearchResult = z.infer<typeof PrecedentSearchResultSchema>;

export const EXPERIENCE_FABRIC_API = {
  timeline: '/api/v1/experience/events',
  snapshot: '/api/v1/experience/snapshot',
  precedents: '/api/v1/experience/precedents',
  storylets: '/api/v1/experience/storylets',
  visualGrammar: '/api/v1/experience/visual-grammar',
  guidedCompanion: '/api/v1/experience/companions/guided-sessions/:sessionId',
} as const;

export const DecisionTraceOptionSchema = z.object({
  option_id: z.string().min(1),
  label: z.string().min(1).max(240),
  score: z.number().min(0).max(1).nullable(),
  reason: z.string().min(1).max(1000),
  rejected_because: z.string().min(1).max(1000).nullable(),
});
export type DecisionTraceOption = z.infer<typeof DecisionTraceOptionSchema>;

export const DecisionTraceSchema = z.object({
  decision_id: z.string().min(1),
  category: z.enum([
    'pack_selection',
    'mode_handoff',
    'provider_selection',
    'budget_tradeoff',
    'quality_gate',
    'fallback',
    'theme_selection',
    'guidance_proposal',
  ]),
  subject: z.string().min(1).max(500),
  options_considered: z.array(DecisionTraceOptionSchema).min(1),
  selected_option_id: z.string().min(1).nullable(),
  reason: z.string().min(1).max(2000),
  confidence: z.number().min(0).max(1),
  human_approval: z.enum(['not_required', 'pending', 'approved', 'rejected']),
  source_refs: z.array(z.string().min(1)).min(1),
});
export type DecisionTrace = z.infer<typeof DecisionTraceSchema>;

export const CostGovernanceModeSchema = z.enum(['observe', 'warn', 'cap']);
export type CostGovernanceMode = z.infer<typeof CostGovernanceModeSchema>;

export const CostPreflightPolicySchema = z.object({
  currency: z.literal('EUR'),
  total_limit: z.number().nonnegative(),
  reserve_ratio: z.number().min(0).max(1),
  per_action_approval_threshold: z.number().nonnegative(),
  require_paid_capability_approval: z.boolean(),
  mode: CostGovernanceModeSchema,
});
export type CostPreflightPolicy = z.infer<typeof CostPreflightPolicySchema>;

export const CostPreflightRequestSchema = z.object({
  capability_id: z.string().min(1),
  estimated_cost: z.number().nonnegative(),
  spent_cost: z.number().nonnegative(),
  reserved_cost: z.number().nonnegative(),
  paid_capability_approved: z.boolean(),
  policy: CostPreflightPolicySchema,
});
export type CostPreflightRequest = z.infer<typeof CostPreflightRequestSchema>;

export const CostPreflightResultSchema = z.object({
  verdict: z.enum(['allow', 'warn', 'approval_required', 'block']),
  usable_remaining: z.number(),
  projected_remaining: z.number(),
  reasons: z.array(z.string().min(1)),
});
export type CostPreflightResult = z.infer<typeof CostPreflightResultSchema>;

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

// ───────────────────────── Context tiers ─────────────────────────

export const ContextTierSchema = z.enum(['T0', 'T1', 'T2', 'T3', 'T4', 'T5']);
export type ContextTier = z.infer<typeof ContextTierSchema>;

// ───────────────────────── Process activation diagnostic ─────────────────────────

export const ProcessActivationRequestSchema = z.object({
  signal: z.string().min(2).max(1000),
  source: z.enum(['owner_observation', 'user_intent', 'ui_mode']).default('owner_observation'),
  active_mode: z.string().min(1).max(80).nullable().default(null),
  loaded_context_tier: ContextTierSchema.default('T1'),
});
export type ProcessActivationRequest = z.input<typeof ProcessActivationRequestSchema>;

export const ProcessActivationReadModelSchema = z.object({
  generated_at: z.number().int().nonnegative(),
  source: z.enum(['owner_observation', 'user_intent', 'ui_mode']),
  raw_signal_summary: z.string().min(1).max(240),
  active_mode: z.string().nullable(),
  detected_domains: z.array(z.string().min(1)),
  process_candidates: z.array(z.object({
    process_id: z.string().min(1),
    label: z.string().min(1),
    runtime_status: z.enum(['implemented', 'partial', 'locked', 'absent']),
  })),
  output_family_candidates: z.array(z.string().min(1)),
  required_context_tier: ContextTierSchema,
  loaded_context_status: z.object({
    granted_tier: ContextTierSchema,
    sufficient: z.boolean(),
    missing: z.array(z.string().min(1)),
  }),
  required_gates: z.array(z.string().min(1)),
  next_safe_action: z.object({
    kind: z.enum(['inspect_context', 'route_to_validation_inbox', 'create_spec', 'park', 'ask_malex_decision']),
    label: z.string().min(1),
    reason: z.string().min(1),
    required_validation: z.boolean(),
    forbidden_followups: z.array(z.string().min(1)),
  }),
  blocked_actions: z.array(z.string().min(1)),
  validation_route_candidate: z.object({
    target: z.enum(['shared_validation_inbox', 'owner_cockpit', 'action_queue', 'none']),
    object_type: z.string().min(1),
    decision_authority: z.string().min(1),
    decider_role: z.string().min(1),
    reason: z.string().min(1),
  }).nullable(),
  missed_trigger_candidate: z.object({
    expected_process: z.string().min(1),
    missing_runtime_piece: z.string().min(1),
    user_impact: z.string().min(1),
    suggested_queue_task: z.string().min(1),
    severity: z.enum(['low', 'medium', 'high']),
  }).nullable(),
  confidence: z.number().min(0).max(1),
  status: z.enum(['diagnostic_only', 'candidate_ready_for_review', 'missing_context', 'blocked_by_gate', 'missed_trigger_candidate']),
  audit_trace: z.array(z.string().min(1)),
});
export type ProcessActivationReadModel = z.infer<typeof ProcessActivationReadModelSchema>;

// ───────────────────────── D12 missed trigger findings ─────────────────────────

export const D12FindingSeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export type D12FindingSeverity = z.infer<typeof D12FindingSeveritySchema>;

export const D12FindingStatusSchema = z.enum([
  'observation',
  'hypothesis',
  'candidate_pattern',
  'validated_alert',
  'stale',
  'archived',
]);
export type D12FindingStatus = z.infer<typeof D12FindingStatusSchema>;

export const D12RecommendedQueueTaskSchema = z.object({
  task: z.string().min(1).max(240),
  impact: z.string().min(1).max(500),
  risk: z.string().min(1).max(120),
  source_of_truth: z.string().min(1).max(160),
  truth_status: z.string().min(1).max(120),
  validation_required: z.boolean(),
  suggested_owner: z.string().min(1).max(120),
  forbidden_actions: z.array(z.string().min(1).max(120)).default([]),
});
export type D12RecommendedQueueTask = z.infer<typeof D12RecommendedQueueTaskSchema>;

export const D12FindingDecisionSchema = z.object({
  decision: z.enum([
    'keep_observation',
    'promote_to_hypothesis',
    'promote_to_candidate_pattern',
    'validate_alert',
    'mark_stale',
    'archive',
  ]),
  note: z.string().max(500).optional(),
});
export type D12FindingDecision = z.infer<typeof D12FindingDecisionSchema>;

export const CreateD12MissedTriggerFindingSchema = z.object({
  source_ref: z.string().min(1).max(240),
  expected_process: z.string().min(1).max(160),
  actual_runtime_response: z.string().min(1).max(500),
  missing_runtime_piece: z.string().min(1).max(160),
  user_impact: z.string().min(1).max(500),
  domain_refs: z.array(z.string().min(1).max(120)).default([]),
  output_family_refs: z.array(z.string().min(1).max(120)).default([]),
  evidence_refs: z.array(z.string().min(1).max(240)).default([]),
  blocked_actions: z.array(z.string().min(1).max(120)).default(['auto_fix', 'auto_patch', 'auto_canon']),
  recommended_queue_task: D12RecommendedQueueTaskSchema,
  severity: D12FindingSeveritySchema.default('medium'),
  project_id: z.string().min(1).nullable().optional(),
});
export type CreateD12MissedTriggerFinding = z.infer<typeof CreateD12MissedTriggerFindingSchema>;

// ───────────────────────── D11/D12 usage learning candidates ─────────────────────────

export const UsageLearningSignalTypeSchema = z.enum([
  'repeated_correction',
  'stable_preference',
  'recurring_workflow',
  'new_source_or_stakeholder',
  'new_validation_or_sensitive_action',
  'recurring_exception',
  'failure_or_rework',
  'contradiction',
  'missed_trigger',
  'portable_factory_backflow',
]);
export type UsageLearningSignalType = z.infer<typeof UsageLearningSignalTypeSchema>;

export const UsageLearningCandidateStatusSchema = z.enum([
  'observation',
  'hypothesis',
  'user_confirmed_rule',
  'contradiction',
  'open_question',
]);
export type UsageLearningCandidateStatus = z.infer<typeof UsageLearningCandidateStatusSchema>;

export const UsageLearningPrivacySchema = z.enum(['safe', 'anonymize', 'do_not_export']);
export type UsageLearningPrivacy = z.infer<typeof UsageLearningPrivacySchema>;

export const UsageLearningRoutingStatusSchema = z.enum([
  'pending',
  'routed',
  'ambiguous',
  'quarantined',
]);
export type UsageLearningRoutingStatus = z.infer<typeof UsageLearningRoutingStatusSchema>;

export const UsageLearningReviewStatusSchema = z.enum([
  'pending',
  'approved',
  'parked',
  'rejected',
  'archived',
]);
export type UsageLearningReviewStatus = z.infer<typeof UsageLearningReviewStatusSchema>;

export const UsageLearningCandidateSchema = z.object({
  candidate_id: z.string().min(1),
  owner_id: z.string().min(1),
  project_id: z.string().min(1).nullable(),
  source_environment: z.enum(['masterflow_native', 'portable_factory']),
  source_factory_id: z.string().min(1).nullable(),
  source_session_or_event: z.string().min(1).max(240),
  detected_at: z.number().int().nonnegative(),
  signal_type: UsageLearningSignalTypeSchema,
  summary: z.string().min(1).max(500),
  affected_process: z.string().min(1).max(160),
  affected_output_family: z.string().min(1).max(160),
  domain_refs: z.array(z.string().min(1).max(120)),
  evidence_summary: z.string().min(1).max(500),
  evidence_refs: z.array(z.string().min(1).max(240)),
  repetition_count: z.number().int().positive(),
  confidence: z.enum(['low', 'medium', 'high']),
  status: UsageLearningCandidateStatusSchema,
  privacy: UsageLearningPrivacySchema,
  scope: z.string().min(1).max(240),
  godmode_targets: z.array(z.string().min(1).max(120)).min(1),
  routing_status: UsageLearningRoutingStatusSchema,
  canon_status: z.literal('candidate_only'),
  review_status: UsageLearningReviewStatusSchema,
  reviewer_id: z.string().min(1).nullable(),
  review_note: z.string().max(500).nullable(),
  dedupe_key: z.string().length(64),
  audit_trace: z.array(z.string().min(1).max(240)),
  created_at: z.number().int().nonnegative(),
  updated_at: z.number().int().nonnegative(),
});
export type UsageLearningCandidate = z.infer<typeof UsageLearningCandidateSchema>;

export const D12MissedTriggerFindingSchema = CreateD12MissedTriggerFindingSchema.extend({
  finding_id: z.string().min(1),
  detected_at: z.number().int().nonnegative(),
  owner_id: z.string().min(1),
  project_id: z.string().nullable(),
  status: D12FindingStatusSchema,
  owner_decision: D12FindingDecisionSchema.nullable(),
  audit_trace: z.array(z.string().min(1)),
  created_at: z.number().int().nonnegative(),
  updated_at: z.number().int().nonnegative(),
});
export type D12MissedTriggerFinding = z.infer<typeof D12MissedTriggerFindingSchema>;

export const CreateD12ReleaseReceiptSchema = z.object({
  commit_sha: z.string().regex(/^[0-9a-fA-F]{40}$/).transform((value) => value.toLowerCase()),
  environment_label: z.string().min(1).max(120),
  components: z.array(z.string().min(1).max(120)).min(1).max(50),
  evidence_refs: z.array(z.string().min(1).max(500)).max(50).default([]),
  observed_at: z.number().int().nonnegative(),
  note: z.string().max(1000).nullable().optional(),
});
export type CreateD12ReleaseReceipt = z.infer<typeof CreateD12ReleaseReceiptSchema>;
export const D12ReleaseReceiptSchema = CreateD12ReleaseReceiptSchema.extend({
  receipt_id: z.string().min(1),
  owner_id: z.string().min(1),
  proof_state: z.enum(['unknown', 'evidence_attached']),
  runtime_status: z.literal('not_verified'),
  created_at: z.number().int().nonnegative(),
});
export type D12ReleaseReceipt = z.infer<typeof D12ReleaseReceiptSchema>;
export const CreateD12BackupReceiptSchema = z.object({
  target_label: z.string().min(1).max(240),
  environment_label: z.string().min(1).max(120),
  checksum_sha256: z.string().regex(/^[0-9a-fA-F]{64}$/).transform((value) => value.toLowerCase()),
  backup_observed_at: z.number().int().nonnegative(),
  evidence_refs: z.array(z.string().min(1).max(500)).max(50).default([]),
  note: z.string().max(1000).nullable().optional(),
});
export type CreateD12BackupReceipt = z.infer<typeof CreateD12BackupReceiptSchema>;
export const D12BackupReceiptSchema = CreateD12BackupReceiptSchema.extend({
  receipt_id: z.string().min(1), owner_id: z.string().min(1),
  proof_state: z.enum(['unknown', 'evidence_attached']),
  restore_status: z.literal('not_tested'), created_at: z.number().int().nonnegative(),
});
export type D12BackupReceipt = z.infer<typeof D12BackupReceiptSchema>;
export const CreateD12IncidentRecordSchema=z.object({severity:z.enum(['low','medium','high','critical']),impact_summary:z.string().min(1).max(2000),scope_refs:z.array(z.string().min(1).max(240)).min(1).max(50),symptom_refs:z.array(z.string().min(1).max(500)).min(1).max(50),observed_at:z.number().int().nonnegative(),evidence_refs:z.array(z.string().min(1).max(500)).max(50).default([])});
export type CreateD12IncidentRecord=z.infer<typeof CreateD12IncidentRecordSchema>;
export const D12IncidentRecordSchema=CreateD12IncidentRecordSchema.extend({incident_id:z.string().min(1),owner_id:z.string().min(1),status:z.literal('recorded_unresolved'),created_at:z.number().int().nonnegative()});
export type D12IncidentRecord=z.infer<typeof D12IncidentRecordSchema>;

// ───────────────────────── RAG permissionné PR-7 ─────────────────────────

export const RagResourceStatusSchema = z.enum([
  'candidate',
  'validated',
  'deprecated',
  'revoked',
  'archived',
]);
export type RagResourceStatus = z.infer<typeof RagResourceStatusSchema>;

export const RagTrustStatusSchema = z.enum([
  'unverified',
  'source_verified',
  'canonical',
  'private_reference',
]);
export type RagTrustStatus = z.infer<typeof RagTrustStatusSchema>;

export const RagResourceSchema = z.object({
  rag_resource_id: z.string().min(1),
  resource_id: z.string().min(1),
  owner_id: z.string().min(1),
  project_id: z.string().min(1).nullable(),
  source_type: z.string().min(1),
  source_uri: z.string().min(1),
  title: z.string().min(1),
  status: RagResourceStatusSchema,
  trust_status: RagTrustStatusSchema,
  scope_type: z.enum(['owner', 'project']),
  scope_id: z.string().min(1),
  content_hash: z.string().min(1),
  indexed_at: z.number().int().nonnegative().nullable(),
  revoked_at: z.number().int().nonnegative().nullable(),
  created_at: z.number().int().nonnegative(),
  updated_at: z.number().int().nonnegative(),
});
export type RagResource = z.infer<typeof RagResourceSchema>;

export const RagResourceChunkSchema = z.object({
  chunk_id: z.string().min(1),
  resource_id: z.string().min(1),
  chunk_index: z.number().int().nonnegative(),
  content_excerpt: z.string().min(1).max(2000),
  embedding_ref: z.string().min(1).nullable(),
  token_count: z.number().int().nonnegative().nullable(),
  metadata: z.record(z.unknown()),
  status: z.enum(['active', 'stale', 'revoked']),
  created_at: z.number().int().nonnegative(),
  updated_at: z.number().int().nonnegative(),
});
export type RagResourceChunk = z.infer<typeof RagResourceChunkSchema>;

export const RagCitationSchema = z.object({
  resource_id: z.string().min(1),
  chunk_id: z.string().min(1),
  title: z.string().min(1),
  source_uri: z.string().min(1),
  status: RagResourceStatusSchema,
  trust_status: RagTrustStatusSchema,
  scope_type: z.enum(['owner', 'project']),
  scope_id: z.string().min(1),
  score: z.number().min(0).max(1),
  excerpt: z.string().min(1).max(500),
});
export type RagCitation = z.infer<typeof RagCitationSchema>;

export const RagRefusalReasonSchema = z.enum([
  'no_authorized_source',
  'no_reliable_source',
  'scope_denied',
  'unsafe_query',
]);
export type RagRefusalReason = z.infer<typeof RagRefusalReasonSchema>;

export const RagContextFiltersSchema = z.object({
  active_app: z.string().min(1).max(80).nullable().default(null),
  zoom_level: z.string().min(1).max(80).nullable().default(null),
  entity_refs: z.array(z.string().min(1).max(160)).max(40).default([]),
  allowed_statuses: z.array(RagResourceStatusSchema).min(1).max(5).default(['validated']),
  spoiler_policy: z.enum(['none', 'reader_safe', 'author_full']).default('none'),
  context_token_budget: z.number().int().min(256).max(32000).default(4000),
  sensitivity: z.enum(['public', 'internal', 'private', 'sensitive']).default('private'),
});
export type RagContextFilters = z.infer<typeof RagContextFiltersSchema>;

export const RagContextPackSchema = z.object({
  pack_id: z.string().min(1),
  query_hash: z.string().min(1),
  user_id: z.string().min(1),
  purpose: z.string().min(1).max(120),
  room_instance_id: z.string().min(1).nullable(),
  context_tier: ContextTierSchema,
  retrieval_strategy: z.enum(['lexical', 'vector', 'hybrid']),
  scope_type: z.enum(['owner', 'project']),
  scope_id: z.string().min(1),
  citations: z.array(RagCitationSchema),
  filters: RagContextFiltersSchema,
  status: z.enum(['active', 'refused', 'stale', 'expired']),
  refusal_reason: RagRefusalReasonSchema.nullable(),
  created_at: z.number().int().nonnegative(),
  expires_at: z.number().int().nonnegative().nullable(),
});
export type RagContextPack = z.infer<typeof RagContextPackSchema>;

export const RegisterRagResourceRequestSchema = z.object({
  resource_id: z.string().min(1),
  project_id: z.string().min(1).nullable().optional(),
  source_type: z.string().min(1).max(80),
  source_uri: z.string().min(1).max(1000),
  chunks: z.array(z.string().min(1).max(2000)).min(1).max(100),
});
export type RegisterRagResourceRequest = z.infer<typeof RegisterRagResourceRequestSchema>;

export const RagQueryRequestSchema = z.object({
  query: z.string().min(2).max(1000),
  project_id: z.string().min(1).nullable().optional(),
  room_instance_id: z.string().min(1).nullable().optional(),
  purpose: z.string().min(1).max(120).default('context_retrieval'),
  context_tier: ContextTierSchema.default('T2'),
  active_app: z.string().min(1).max(80).nullable().optional(),
  zoom_level: z.string().min(1).max(80).nullable().optional(),
  entity_refs: z.array(z.string().min(1).max(160)).max(40).optional(),
  allowed_statuses: z.array(RagResourceStatusSchema).min(1).max(5).optional(),
  spoiler_policy: z.enum(['none', 'reader_safe', 'author_full']).optional(),
  context_token_budget: z.number().int().min(256).max(32000).optional(),
  sensitivity: z.enum(['public', 'internal', 'private', 'sensitive']).optional(),
  limit: z.number().int().min(1).max(10).default(5),
});
export type RagQueryRequest = z.infer<typeof RagQueryRequestSchema>;

export const RagQueryResponseSchema = z.object({
  context_pack: RagContextPackSchema,
  refusal_reason: RagRefusalReasonSchema.nullable(),
});
export type RagQueryResponse = z.infer<typeof RagQueryResponseSchema>;

// ───────────────────────── Runtime context compilation ─────────────────────────

export const ContextReferenceSchema = z.object({
  ref_type: z.string().min(1).max(80),
  ref_id: z.string().min(1),
  authority: z.enum(['authoritative', 'derived']),
  source: z.string().min(1).max(120),
  scope_type: z.enum(['user', 'project', 'room', 'room_instance']),
  scope_id: z.string().min(1),
});
export type ContextReference = z.infer<typeof ContextReferenceSchema>;

export const RejectedContextReferenceSchema = z.object({
  ref_type: z.string().min(1).max(80),
  ref_id: z.string().min(1),
  reason: z.string().min(1).max(240),
});
export type RejectedContextReference = z.infer<typeof RejectedContextReferenceSchema>;

export const ContextCompilationTraceSchema = z.object({
  purpose: z.string().min(1).max(120),
  requested_tier: ContextTierSchema,
  granted_tier: ContextTierSchema,
  loaded_refs: z.array(ContextReferenceSchema),
  rejected_refs: z.array(RejectedContextReferenceSchema),
  missing_context: z.array(z.string().min(1).max(240)),
  uncertainty: z.array(z.string().min(1).max(240)),
  budget: z.object({
    max_refs: z.number().int().positive(),
    max_chars: z.number().int().positive(),
    used_refs: z.number().int().nonnegative(),
    used_chars: z.number().int().nonnegative(),
  }),
});
export type ContextCompilationTrace = z.infer<typeof ContextCompilationTraceSchema>;

export const RuntimeContextEnvelopeSchema = z.object({
  actor: z.object({
    user_id: z.string().min(1),
    role: RoleSchema,
  }),
  scope: z.object({
    project_id: z.string().min(1).nullable(),
    room_id: z.string().min(1),
    room_instance_id: z.string().min(1),
  }),
  room_runtime: z.object({
    room_type: z.string().min(1),
    zoom_level: ZoomLevelSchema,
    active_surface: z.string().min(1),
    cognitive_density: z.enum(['low', 'medium', 'high']),
  }),
  authoritative_facts: z.array(ContextReferenceSchema),
  derived_context: z.array(ContextReferenceSchema),
  allowed_action_ids: z.array(z.string().min(1)),
  allowed_persona_ids: z.array(z.string().min(1)),
  checkpoint_ref: ContextReferenceSchema.nullable(),
  rag_context_pack_ref: ContextReferenceSchema.nullable(),
  trace: ContextCompilationTraceSchema,
  compiled_at: z.number().int().nonnegative(),
});
export type RuntimeContextEnvelope = z.infer<typeof RuntimeContextEnvelopeSchema>;

export const CompileRuntimeContextRequestSchema = z.object({
  purpose: z.string().min(1).max(120).default('room_bootstrap'),
  requested_tier: ContextTierSchema.default('T2'),
  room_id: z.string().min(1).optional(),
  room_instance_id: z.string().min(1).optional(),
  rag_query: z.string().min(2).max(1000).optional(),
});
export type CompileRuntimeContextRequest = z.infer<typeof CompileRuntimeContextRequestSchema>;

export const LockedCapabilitySchema = z.object({
  capability_id: z.string().min(1),
  reason: z.string().min(1).max(240),
});
export type LockedCapability = z.infer<typeof LockedCapabilitySchema>;

// ───────────────────────── Packs runtime et guidance progressive ─────────────────────────

export const RuntimePackStatusSchema = z.enum([
  'live',
  'partial',
  'future',
  'blocked',
]);
export type RuntimePackStatus = z.infer<typeof RuntimePackStatusSchema>;

export const RuntimePackStageSchema = z.object({
  stage_id: z.string().min(1),
  label: z.string().min(1).max(160),
  purpose: z.string().min(1).max(500),
  activation: z.enum(['always', 'first_use', 'context_signal', 'manual']),
  required_action_ids: z.array(z.string().min(1)).default([]),
  input_object_types: z.array(z.string().min(1)).default([]),
  output_object_types: z.array(z.string().min(1)).default([]),
  target_mode: z.string().min(1).nullable().default(null),
  context_tier: ContextTierSchema.default('T1'),
  checkpoint_policy: z.enum(['none', 'compact', 'review', 'human_required']).default('compact'),
});
export type RuntimePackStage = z.infer<typeof RuntimePackStageSchema>;

export const GuidanceTriggerSchema = z.enum([
  'first_session',
  'pack_available',
  'capability_first_use',
  'context_changed',
  'friction_detected',
  'tutorial_stale',
]);
export type GuidanceTrigger = z.infer<typeof GuidanceTriggerSchema>;

export const RuntimePackGuidanceSchema = z.object({
  guidance_id: z.string().min(1),
  trigger: GuidanceTriggerSchema,
  title: z.string().min(1).max(160),
  summary: z.string().min(1).max(500),
  recommended_mode: z.string().min(1).max(80),
  tutorial_resource_id: z.string().min(1).nullable().default(null),
  skippable: z.boolean().default(true),
});
export type RuntimePackGuidance = z.infer<typeof RuntimePackGuidanceSchema>;

export const RuntimePackManifestSchema = z
  .object({
    pack_id: z.string().min(1),
    version: z.string().min(1),
    label: z.string().min(1).max(160),
    description: z.string().min(1).max(800),
    minimum_role: RoleSchema.default('student'),
    status: RuntimePackStatusSchema,
    active_modes: z.array(z.string().min(1)).min(1),
    required_action_ids: z.array(z.string().min(1)).default([]),
    optional_action_ids: z.array(z.string().min(1)).default([]),
    stages: z.array(RuntimePackStageSchema).min(1),
    guidance: RuntimePackGuidanceSchema.nullable().default(null),
    source_refs: z.array(z.string().min(1)).default([]),
  })
  .superRefine((pack, ctx) => {
    const stageIds = pack.stages.map((stage) => stage.stage_id);
    if (new Set(stageIds).size !== stageIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Les stage_id doivent être uniques dans un pack.',
        path: ['stages'],
      });
    }
    const overlap = pack.required_action_ids.filter((id) => pack.optional_action_ids.includes(id));
    if (overlap.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Une action ne peut pas être requise et optionnelle: ${overlap.join(', ')}`,
        path: ['optional_action_ids'],
      });
    }
    const declaredActions = new Set([...pack.required_action_ids, ...pack.optional_action_ids]);
    const undeclaredStageActions = pack.stages
      .flatMap((stage) => stage.required_action_ids)
      .filter((id) => !declaredActions.has(id));
    if (undeclaredStageActions.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Les actions requises par une étape doivent être déclarées par le pack: ${[...new Set(undeclaredStageActions)].join(', ')}`,
        path: ['stages'],
      });
    }
  });
export type RuntimePackManifest = z.infer<typeof RuntimePackManifestSchema>;

export const RuntimePackAvailabilitySchema = z.object({
  pack_id: z.string().min(1),
  status: z.enum(['active', 'limited', 'locked']),
  reason: z.string().min(1).max(240).nullable(),
  missing_action_ids: z.array(z.string().min(1)),
});
export type RuntimePackAvailability = z.infer<typeof RuntimePackAvailabilitySchema>;

export const GuidanceCandidateSchema = z.object({
  guidance_id: z.string().min(1),
  pack_id: z.string().min(1),
  trigger: GuidanceTriggerSchema,
  title: z.string().min(1).max(160),
  summary: z.string().min(1).max(500),
  recommended_mode: z.string().min(1).max(80),
  tutorial_resource_id: z.string().min(1).nullable(),
  skippable: z.boolean(),
  confidence: z.number().min(0).max(1),
});
export type GuidanceCandidate = z.infer<typeof GuidanceCandidateSchema>;

export const ModeObjectRefSchema = z.object({
  object_type: z.string().min(1),
  object_id: z.string().min(1),
  source_mode: z.string().min(1),
  source_refs: z.array(z.string().min(1)).min(1),
  authority: z.enum(['authoritative', 'validated', 'candidate', 'derived']),
});
export type ModeObjectRef = z.infer<typeof ModeObjectRefSchema>;

export const ModeHandoffCandidateSchema = z.object({
  handoff_id: z.string().min(1),
  source_mode: z.string().min(1),
  target_mode: z.string().min(1),
  source_object_type: z.string().min(1),
  source_object_id: z.string().min(1),
  target_pack_id: z.string().min(1),
  target_stage_id: z.string().min(1),
  expected_output_types: z.array(z.string().min(1)),
  reason: z.string().min(1).max(800),
  confidence: z.number().min(0).max(1),
  risk_level: z.enum(['low', 'medium', 'medium_high', 'high']),
  validation_required: z.boolean(),
  status: z.literal('proposed'),
  source_refs: z.array(z.string().min(1)).min(1),
});
export type ModeHandoffCandidate = z.infer<typeof ModeHandoffCandidateSchema>;

// ───────────────────────── Theme Studio : contrat et lint ─────────────────────────

export const ThemeScopeSchema = z.enum([
  'global',
  'institution',
  'user',
  'project',
  'room',
  'event',
]);
export type ThemeScope = z.infer<typeof ThemeScopeSchema>;

export const ThemePackStatusSchema = z.enum([
  'candidate',
  'validated',
  'rejected',
  'archived',
]);
export type ThemePackStatus = z.infer<typeof ThemePackStatusSchema>;

export const ThemeFontRefSchema = z.object({
  family: z.string().min(1).max(160),
  source_ref: z.string().min(1).max(500).nullable(),
  license_status: z.enum(['known', 'unknown', 'restricted']),
  fallback_family: z.string().min(1).max(160),
});
export type ThemeFontRef = z.infer<typeof ThemeFontRefSchema>;

export const ThemeColorPairSchema = z.object({
  pair_id: z.string().min(1),
  foreground: z.string().min(1),
  background: z.string().min(1),
  usage: z.enum(['normal_text', 'large_text', 'ui_control', 'decorative']),
});
export type ThemeColorPair = z.infer<typeof ThemeColorPairSchema>;

export const ThemePackSchema = z
  .object({
    theme_id: z.string().min(1),
    version: z.string().min(1),
    label: z.string().min(1).max(160),
    scope: ThemeScopeSchema,
    scope_id: z.string().min(1).nullable(),
    status: ThemePackStatusSchema,
    palette: z.object({
      primary: z.string().min(1),
      surface: z.string().min(1),
      text: z.string().min(1),
      accent: z.string().min(1),
    }),
    token_aliases: z.record(z.string().min(1)),
    fonts: z.object({
      body: ThemeFontRefSchema,
      heading: ThemeFontRefSchema,
      display: ThemeFontRefSchema.nullable(),
    }),
    contrast_pairs: z.array(ThemeColorPairSchema),
    asset_refs: z.array(z.string().min(1)),
    source_refs: z.array(z.string().min(1)).min(1),
  })
  .superRefine((theme, ctx) => {
    if (theme.scope === 'global' && theme.scope_id !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Un thème global ne doit pas avoir de scope_id.',
        path: ['scope_id'],
      });
    }
    if (theme.scope !== 'global' && theme.scope_id === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Un thème non global doit cibler un scope_id.',
        path: ['scope_id'],
      });
    }
  });
export type ThemePack = z.infer<typeof ThemePackSchema>;

export const ThemeLintFindingSchema = z.object({
  severity: z.enum(['error', 'warning', 'info']),
  code: z.enum([
    'invalid_color',
    'broken_token_reference',
    'cyclic_token_reference',
    'insufficient_contrast',
    'font_source_missing',
    'font_license_unknown',
    'font_license_restricted',
  ]),
  path: z.string().min(1),
  message: z.string().min(1),
});
export type ThemeLintFinding = z.infer<typeof ThemeLintFindingSchema>;

export const ThemeLintReportSchema = z.object({
  theme_id: z.string().min(1),
  valid: z.boolean(),
  findings: z.array(ThemeLintFindingSchema),
  checked_at: z.number().int().nonnegative(),
});
export type ThemeLintReport = z.infer<typeof ThemeLintReportSchema>;

export const UserRuntimeLoadoutSchema = z.object({
  user_id: z.string().min(1),
  room_id: z.string().min(1),
  project_id: z.string().min(1).nullable(),
  available_apps: z.array(z.string().min(1)),
  available_persona_ids: z.array(z.string().min(1)),
  available_action_ids: z.array(z.string().min(1)),
  locked_capabilities: z.array(LockedCapabilitySchema),
  default_action_ids: z.array(z.string().min(1)),
  quick_palette_action_ids: z.array(z.string().min(1)),
  create_launcher_action_ids: z.array(z.string().min(1)),
  available_shortcuts: z.array(z.string().min(1)),
  active_mode_cycle: z.array(z.string().min(1)),
  command_center_scope: z.enum(['user', 'project', 'room']),
  suggested_first_action_ids: z.array(z.string().min(1)),
  simplified_support_action_ids: z.array(z.string().min(1)),
  disabled_reason_map: z.record(z.string().min(1)),
  available_pack_ids: z.array(z.string().min(1)).default([]),
  pack_availability: z.array(RuntimePackAvailabilitySchema).default([]),
  guidance_candidates: z.array(GuidanceCandidateSchema).max(3).default([]),
});
export type UserRuntimeLoadout = z.infer<typeof UserRuntimeLoadoutSchema>;

// ───────────────────────── Cohortes et rosters versionnés ─────────────────────────

export const CohortSchema = z.object({
  cohort_id: z.string().min(1),
  owner_id: z.string().min(1),
  project_id: z.string().min(1).nullable(),
  title: z.string().min(1).max(160),
  period_ref: z.string().min(1).max(160).nullable(),
  status: z.enum(['active', 'archived']),
  privacy: z.literal('private'),
  created_at: z.number().int().nonnegative(),
  updated_at: z.number().int().nonnegative(),
});
export type Cohort = z.infer<typeof CohortSchema>;

export const CreateCohortSchema = z.object({
  project_id: z.string().min(1).nullable().optional(),
  title: z.string().min(1).max(160),
  period_ref: z.string().min(1).max(160).nullable().optional(),
});
export type CreateCohort = z.infer<typeof CreateCohortSchema>;

export const RosterMemberSchema = z.object({
  student_identity_id: z.string().min(1),
  display_name: z.string().min(1).max(160),
  aliases: z.array(z.string().min(1).max(160)).max(20),
});
export type RosterMember = z.infer<typeof RosterMemberSchema>;

export const CreateRosterMemberSchema = z.object({
  student_identity_id: z.string().min(1).nullable().optional(),
  display_name: z.string().min(1).max(160),
  aliases: z.array(z.string().min(1).max(160)).max(20).default([]),
});
export type CreateRosterMember = z.infer<typeof CreateRosterMemberSchema>;

export const RosterVersionSchema = z.object({
  roster_version_id: z.string().min(1),
  cohort_id: z.string().min(1),
  owner_id: z.string().min(1),
  version: z.number().int().positive(),
  source_ref: z.string().min(1).max(500),
  status: z.enum(['active', 'archived']),
  members: z.array(RosterMemberSchema),
  created_by: z.string().min(1),
  created_at: z.number().int().nonnegative(),
  activated_at: z.number().int().nonnegative(),
});
export type RosterVersion = z.infer<typeof RosterVersionSchema>;

export const CreateRosterVersionSchema = z.object({
  source_ref: z.string().min(1).max(500),
  members: z.array(CreateRosterMemberSchema).min(1).max(300),
});
export type CreateRosterVersion = z.infer<typeof CreateRosterVersionSchema>;

// ───────────────────────── Contexte courant ─────────────────────────

export const CurrentContextSchema = z.object({
  user: UserSchema,
  room: RoomSchema,
  room_instance: RoomInstanceSchema,
  personas: z.array(PersonaSchema),
  active_blend: PersonaBlendSchema.nullable(),
  available_actions: z.array(ActionRegistryEntrySchema),
  runtime_context: RuntimeContextEnvelopeSchema,
  user_runtime_loadout: UserRuntimeLoadoutSchema,
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

// ───────────────────────── D05 Competency & Gamification ─────────────────────────

export const CompetencyFrameworkStatusSchema = z.enum(['active', 'archived']);
export type CompetencyFrameworkStatus = z.infer<typeof CompetencyFrameworkStatusSchema>;

export const BloomLevelSchema = z.enum(['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']);
export type BloomLevel = z.infer<typeof BloomLevelSchema>;

export const CompetencyDefinitionStatusSchema = z.enum(['active', 'archived']);
export type CompetencyDefinitionStatus = z.infer<typeof CompetencyDefinitionStatusSchema>;

export const SignalSourceSchema = z.enum(['teacher', 'system', 'self', 'peer', 'workflow']);
export type SignalSource = z.infer<typeof SignalSourceSchema>;

export const MasteryLevelSchema = z.enum(['discovering', 'guided', 'practicing', 'autonomous', 'mentor_ready']);
export type MasteryLevel = z.infer<typeof MasteryLevelSchema>;

export const AutonomyLevelSchema = z.enum(['dependent', 'assisted', 'independent', 'initiative', 'mentor']);
export type AutonomyLevel = z.infer<typeof AutonomyLevelSchema>;

export const SignalStatusSchema = z.enum(['candidate', 'validated', 'rejected', 'superseded']);
export type SignalStatus = z.infer<typeof SignalStatusSchema>;

export const ProgressMasterySchema = z.enum(['unknown', 'discovering', 'guided', 'practicing', 'autonomous', 'mentor_ready']);
export type ProgressMastery = z.infer<typeof ProgressMasterySchema>;

export const ProgressAutonomySchema = z.enum(['unknown', 'dependent', 'assisted', 'independent', 'initiative', 'mentor']);
export type ProgressAutonomy = z.infer<typeof ProgressAutonomySchema>;

export const TrajectorySchema = z.enum(['emerging', 'consolidating', 'unstable', 'transferred', 'blocked', 'needs_review']);
export type Trajectory = z.infer<typeof TrajectorySchema>;

export const CompetencyFrameworkSchema = z.object({
  id: z.string(),
  owner_id: z.string(),
  project_id: z.string().nullable(),
  label: z.string(),
  description: z.string().nullable(),
  domain: z.string(),
  status: CompetencyFrameworkStatusSchema,
  created_at: z.number(),
  updated_at: z.number(),
});
export type CompetencyFramework = z.infer<typeof CompetencyFrameworkSchema>;

export const CompetencyDefinitionSchema = z.object({
  id: z.string(),
  framework_id: z.string(),
  parent_id: z.string().nullable(),
  code: z.string(),
  label: z.string(),
  description: z.string().nullable(),
  bloom_level: BloomLevelSchema.nullable(),
  icon: z.string().nullable(),
  sort_order: z.number(),
  status: CompetencyDefinitionStatusSchema,
  created_at: z.number(),
  updated_at: z.number(),
});
export type CompetencyDefinition = z.infer<typeof CompetencyDefinitionSchema>;

export const UserCompetencySignalSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  competency_id: z.string(),
  project_id: z.string().nullable(),
  evidence_ref: z.string().nullable(),
  source: SignalSourceSchema,
  mastery_level: MasteryLevelSchema,
  autonomy_level: AutonomyLevelSchema.nullable(),
  confidence: z.number().min(0).max(1),
  observation: z.string().nullable(),
  validation_required: z.number(),
  validator_id: z.string().nullable(),
  validated_at: z.number().nullable(),
  status: SignalStatusSchema,
  created_at: z.number(),
  updated_at: z.number(),
});
export type UserCompetencySignal = z.infer<typeof UserCompetencySignalSchema>;

export const UserCompetencyProgressSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  competency_id: z.string(),
  project_id: z.string().nullable(),
  current_mastery: ProgressMasterySchema,
  current_autonomy: ProgressAutonomySchema.nullable(),
  confidence: z.number(),
  signal_count: z.number(),
  last_signal_at: z.number().nullable(),
  trajectory: TrajectorySchema.nullable(),
  validation_required: z.number(),
  created_at: z.number(),
  updated_at: z.number(),
});
export type UserCompetencyProgress = z.infer<typeof UserCompetencyProgressSchema>;

export const SkillTreeNodeTypeSchema = z.enum([
  'competency', 'capability', 'app', 'engine', 'widget', 'export',
  'pack', 'permission', 'asset_render', 'reward_asset',
  'methodology', 'teacher_persona', 'companion', 'living_idea',
]);
export type SkillTreeNodeType = z.infer<typeof SkillTreeNodeTypeSchema>;

export const SkillTreeNodeStatusSchema = z.enum([
  'locked', 'available', 'active', 'equipped',
  'validation_required', 'admin_only', 'cooldown',
  'future_ready', 'deprecated', 'conflict',
]);
export type SkillTreeNodeStatus = z.infer<typeof SkillTreeNodeStatusSchema>;

export const CompanionFamilySchema = z.enum([
  'MOTH', 'MOLEKID', 'INCUBATOR_CREATURE', 'MASTERFLEX_HELPER',
  'STUDENT_DISCOVERY', 'PROJECT_MONSTER',
]);
export type CompanionFamily = z.infer<typeof CompanionFamilySchema>;

export const SkillTreeNodeSchema = z.object({
  id: z.string(),
  owner_id: z.string(),
  project_id: z.string().nullable(),
  label: z.string(),
  node_type: SkillTreeNodeTypeSchema,
  status: SkillTreeNodeStatusSchema,
  unlock_source: z.string().nullable(),
  required_role: z.string().nullable(),
  required_pack: z.string().nullable(),
  required_validation: z.number(),
  runtime_cost: z.number().nullable(),
  visible_to_user: z.number(),
  usable_by_user: z.number(),
  equipped: z.number(),
  explanation: z.string().nullable(),
  companion_family: CompanionFamilySchema.nullable(),
  sort_order: z.number(),
  created_at: z.number(),
  updated_at: z.number(),
});
export type SkillTreeNode = z.infer<typeof SkillTreeNodeSchema>;

export const DependencyTypeSchema = z.enum(['requires', 'improves', 'extends', 'blocks', 'unlocks']);
export type DependencyType = z.infer<typeof DependencyTypeSchema>;

export const SkillTreeNodeDependencySchema = z.object({
  node_id: z.string(),
  depends_on_id: z.string(),
  dependency_type: DependencyTypeSchema,
  created_at: z.number(),
});
export type SkillTreeNodeDependency = z.infer<typeof SkillTreeNodeDependencySchema>;

export const BadgeTypeSchema = z.enum(['progression', 'competency', 'milestone', 'event', 'ritual', 'challenge']);
export type BadgeType = z.infer<typeof BadgeTypeSchema>;

export const RewardTypeSchema = z.enum(['badge', 'unlock', 'feedback', 'resource', 'output', 'ritual']);
export type RewardType = z.infer<typeof RewardTypeSchema>;

export const BadgeVisibilitySchema = z.enum(['private', 'teacher_visible', 'project_visible', 'public_candidate']);
export type BadgeVisibility = z.infer<typeof BadgeVisibilitySchema>;

export const BadgeDefinitionStatusSchema = z.enum(['active', 'archived']);
export type BadgeDefinitionStatus = z.infer<typeof BadgeDefinitionStatusSchema>;

export const BadgeDefinitionSchema = z.object({
  id: z.string(),
  owner_id: z.string(),
  project_id: z.string().nullable(),
  code: z.string(),
  label: z.string(),
  description: z.string().nullable(),
  badge_type: BadgeTypeSchema,
  icon: z.string().nullable(),
  criteria_json: z.string(),
  unlock_conditions_json: z.string(),
  reward_type: RewardTypeSchema.nullable(),
  reward_ref: z.string().nullable(),
  visibility: BadgeVisibilitySchema,
  saturation_risk: z.number(),
  status: BadgeDefinitionStatusSchema,
  created_at: z.number(),
  updated_at: z.number(),
});
export type BadgeDefinition = z.infer<typeof BadgeDefinitionSchema>;

export const UserBadgeStatusSchema = z.enum(['awarded', 'revoked', 'equipped', 'archived']);
export type UserBadgeStatus = z.infer<typeof UserBadgeStatusSchema>;

export const UserBadgeSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  badge_id: z.string(),
  project_id: z.string().nullable(),
  awarded_by: z.string().nullable(),
  reason: z.string().nullable(),
  evidence_ref: z.string().nullable(),
  visibility: BadgeVisibilitySchema,
  status: UserBadgeStatusSchema,
  awarded_at: z.number(),
  created_at: z.number(),
  updated_at: z.number(),
});
export type UserBadge = z.infer<typeof UserBadgeSchema>;

export const ProgressionEventTypeSchema = z.enum([
  'signal_ingested', 'milestone_reached', 'badge_awarded',
  'skill_unlocked', 'level_changed', 'saturation_detected',
  'ritual_completed', 'challenge_proposed', 'challenge_completed',
]);
export type ProgressionEventType = z.infer<typeof ProgressionEventTypeSchema>;

export const UserProgressionEventSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  project_id: z.string().nullable(),
  event_type: ProgressionEventTypeSchema,
  ref_type: z.string().nullable(),
  ref_id: z.string().nullable(),
  detail_json: z.string(),
  created_at: z.number(),
});
export type UserProgressionEvent = z.infer<typeof UserProgressionEventSchema>;

export const PedagogicalGraphScopeSchema = z.enum(['general', 'personal', 'shared', 'subject']);
export type PedagogicalGraphScope = z.infer<typeof PedagogicalGraphScopeSchema>;

export const PedagogicalGraphStatusSchema = z.enum(['active', 'archived']);
export type PedagogicalGraphStatus = z.infer<typeof PedagogicalGraphStatusSchema>;

export const PedagogicalGraphNodeTypeSchema = z.enum([
  'competency', 'resource', 'workflow', 'persona', 'project',
  'subject', 'tool', 'methodology', 'discipline', 'exercise', 'feedback',
]);
export type PedagogicalGraphNodeType = z.infer<typeof PedagogicalGraphNodeTypeSchema>;

export const EdgeRelationTypeSchema = z.enum([
  'requires', 'improves', 'extends', 'illustrates', 'contradicts',
  'simplifies', 'references', 'recommended_for', 'used_in', 'blocks', 'unlocks',
]);
export type EdgeRelationType = z.infer<typeof EdgeRelationTypeSchema>;

export const PedagogicalGraphSchema = z.object({
  id: z.string(),
  owner_id: z.string(),
  project_id: z.string().nullable(),
  label: z.string(),
  description: z.string().nullable(),
  scope: PedagogicalGraphScopeSchema,
  status: PedagogicalGraphStatusSchema,
  created_at: z.number(),
  updated_at: z.number(),
});
export type PedagogicalGraph = z.infer<typeof PedagogicalGraphSchema>;

export const PedagogicalGraphNodeSchema = z.object({
  id: z.string(),
  graph_id: z.string(),
  node_type: PedagogicalGraphNodeTypeSchema,
  label: z.string(),
  ref_type: z.string().nullable(),
  ref_id: z.string().nullable(),
  metadata_json: z.string(),
  sort_order: z.number(),
  created_at: z.number(),
  updated_at: z.number(),
});
export type PedagogicalGraphNode = z.infer<typeof PedagogicalGraphNodeSchema>;

export const PedagogicalGraphEdgeSchema = z.object({
  id: z.string(),
  graph_id: z.string(),
  source_node_id: z.string(),
  target_node_id: z.string(),
  relation_type: EdgeRelationTypeSchema,
  weight: z.number().nullable(),
  metadata_json: z.string(),
  created_at: z.number(),
});
export type PedagogicalGraphEdge = z.infer<typeof PedagogicalGraphEdgeSchema>;

// ───────────────────────── Request / Response schemas ─────────────────────────

export const IngestCompetencySignalRequestSchema = z.object({
  user_id: z.string().min(1),
  competency_id: z.string().min(1),
  project_id: z.string().nullable().optional(),
  evidence_ref: z.string().nullable().optional(),
  source: SignalSourceSchema,
  mastery_level: MasteryLevelSchema,
  autonomy_level: AutonomyLevelSchema.nullable().optional(),
  confidence: z.number().min(0).max(1).default(0.5),
  observation: z.string().nullable().optional(),
});
export type IngestCompetencySignalRequest = z.infer<typeof IngestCompetencySignalRequestSchema>;

export const AwardBadgeRequestSchema = z.object({
  user_id: z.string().min(1),
  badge_id: z.string().min(1),
  project_id: z.string().nullable().optional(),
  reason: z.string().nullable().optional(),
  evidence_ref: z.string().nullable().optional(),
  visibility: BadgeVisibilitySchema.optional(),
});
export type AwardBadgeRequest = z.infer<typeof AwardBadgeRequestSchema>;

export const CreateSkillTreeNodeRequestSchema = z.object({
  label: z.string().min(1).max(200),
  node_type: SkillTreeNodeTypeSchema,
  status: SkillTreeNodeStatusSchema.optional(),
  parent_id: z.string().nullable().optional(),
  dependency_type: DependencyTypeSchema.optional(),
  unlock_source: z.string().nullable().optional(),
  required_role: z.string().nullable().optional(),
  sort_order: z.number().optional(),
});
export type CreateSkillTreeNodeRequest = z.infer<typeof CreateSkillTreeNodeRequestSchema>;

export const ProgressionSummarySchema = z.object({
  user_id: z.string(),
  project_id: z.string().nullable(),
  badges_count: z.number(),
  signals_count: z.number(),
  milestone_count: z.number(),
  average_mastery: z.number().min(0).max(1),
  current_milestone: z.string().nullable(),
  saturation_warnings: z.array(z.object({
    badge_id: z.string().optional(),
    reason: z.string(),
  })),
  recent_events: z.array(UserProgressionEventSchema),
});
export type ProgressionSummary = z.infer<typeof ProgressionSummarySchema>;

// ───────────────────────── D04 Personal Learning Profile ─────────────────────────

export const HelpStyleSchema = z.enum(['direct', 'guided', 'explorative', 'visual', 'step_by_step']);
export type HelpStyle = z.infer<typeof HelpStyleSchema>;

export const HelpFormatSchema = z.enum(['text', 'bullet', 'example', 'analogy', 'exercise', 'visual']);
export type HelpFormat = z.infer<typeof HelpFormatSchema>;

export const HelpDensitySchema = z.enum(['concise', 'balanced', 'detailed']);
export type HelpDensity = z.infer<typeof HelpDensitySchema>;

export const GuidanceModeSchema = z.enum(['auto', 'discovery', 'structured', 'challenge', 'mentor']);
export type GuidanceMode = z.infer<typeof GuidanceModeSchema>;

export const ProfileStatusSchema = z.enum(['draft', 'proposed', 'user_validated', 'teacher_validated', 'archived']);
export type ProfileStatus = z.infer<typeof ProfileStatusSchema>;

export const DetectedNeedSchema = z.enum(['concept', 'method', 'blockage', 'validation', 'inspiration', 'orientation', 'practice']);
export type DetectedNeed = z.infer<typeof DetectedNeedSchema>;

export const PersonalLearningProfileSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  owner_id: z.string(),
  project_id: z.string().nullable(),
  help_style: HelpStyleSchema.nullable(),
  help_format: HelpFormatSchema.nullable(),
  help_density: HelpDensitySchema.nullable(),
  preferred_personas: z.array(z.string()),
  learning_state: z.object({
    strengths: z.array(z.string()).optional(),
    blockers: z.array(z.string()).optional(),
    autonomy_level: z.string().optional(),
  }).passthrough(),
  professional_self: z.object({
    working_style: z.string().optional(),
    creative_posture: z.string().optional(),
    cv_export_preferences: z.object({
      tone: z.string().optional(),
      format: z.string().optional(),
    }).optional(),
  }).passthrough(),
  guidance_mode: GuidanceModeSchema,
  profile_status: ProfileStatusSchema,
  created_at: z.number(),
  updated_at: z.number(),
});
export type PersonalLearningProfile = z.infer<typeof PersonalLearningProfileSchema>;

export const HelpContextSnapshotSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  profile_id: z.string().nullable(),
  project_id: z.string().nullable(),
  detected_need: DetectedNeedSchema,
  confidence: z.number().min(0).max(1),
  recommended_mode: z.enum(['discovery', 'structured', 'challenge', 'mentor']),
  recommended_persona: z.string().nullable(),
  context: z.record(z.unknown()),
  resolved_at: z.number().nullable(),
  created_at: z.number(),
});
export type HelpContextSnapshot = z.infer<typeof HelpContextSnapshotSchema>;

export const UpsertProfileRequestSchema = z.object({
  user_id: z.string().min(1),
  project_id: z.string().nullable().optional(),
  help_style: HelpStyleSchema.nullable().optional(),
  help_format: HelpFormatSchema.nullable().optional(),
  help_density: HelpDensitySchema.nullable().optional(),
  preferred_personas: z.array(z.string()).optional(),
  learning_state: z.record(z.unknown()).optional(),
  professional_self: z.record(z.unknown()).optional(),
  guidance_mode: GuidanceModeSchema.optional(),
});
export type UpsertProfileRequest = z.infer<typeof UpsertProfileRequestSchema>;

export const RecordHelpContextRequestSchema = z.object({
  user_id: z.string().min(1),
  project_id: z.string().nullable().optional(),
  detected_need: DetectedNeedSchema,
  confidence: z.number().min(0).max(1).default(0.5),
  recommended_mode: z.enum(['discovery', 'structured', 'challenge', 'mentor']),
  recommended_persona: z.string().nullable().optional(),
  context: z.record(z.unknown()).optional(),
});
export type RecordHelpContextRequest = z.infer<typeof RecordHelpContextRequestSchema>;

export const LEARNING_MIRROR_API = {
  profiles: {
    get: '/api/v1/learning-mirror/profiles/:userId',
    upsert: '/api/v1/learning-mirror/profiles',
    updateStatus: '/api/v1/learning-mirror/profiles/:id/status',
  },
  helpContext: {
    record: '/api/v1/learning-mirror/help-context',
    list: '/api/v1/learning-mirror/help-context/:userId',
  },
} as const;

// ───────────────────────── Style Mirror (D04 — tone adaptation) ─────────────────────────

export const RegisterTargetSchema = z.enum(['auto', 'formal', 'medium', 'casual', 'playful']);
export type RegisterTarget = z.infer<typeof RegisterTargetSchema>;

export const EnergyTargetSchema = z.enum(['auto', 'calm', 'medium', 'high']);
export type EnergyTarget = z.infer<typeof EnergyTargetSchema>;

export const LexicalComplexitySchema = z.enum(['auto', 'simple', 'balanced', 'rich']);
export type LexicalComplexity = z.infer<typeof LexicalComplexitySchema>;

export const StyleMirrorProfileStatusSchema = z.enum(['draft', 'active', 'archived']);
export type StyleMirrorProfileStatus = z.infer<typeof StyleMirrorProfileStatusSchema>;

export const StyleMirrorProfileSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  owner_id: z.string(),
  project_id: z.string().nullable(),
  persona_id: z.string().nullable(),
  register_target: RegisterTargetSchema.nullable(),
  energy_target: EnergyTargetSchema.nullable(),
  lexical_complexity: LexicalComplexitySchema.nullable(),
  mirror_intensity: z.number().min(0).max(1),
  lexical_overrides: z.array(z.string()).default([]),
  signature_moves_override: z.array(z.string()).default([]),
  tone_rules: z.array(z.string()).default([]),
  profile_status: StyleMirrorProfileStatusSchema,
  created_at: z.number(),
  updated_at: z.number(),
});
export type StyleMirrorProfile = z.infer<typeof StyleMirrorProfileSchema>;

export const UpsertStyleMirrorRequestSchema = z.object({
  user_id: z.string().min(1),
  project_id: z.string().nullable().optional(),
  persona_id: z.string().nullable().optional(),
  register_target: RegisterTargetSchema.nullable().optional(),
  energy_target: EnergyTargetSchema.nullable().optional(),
  lexical_complexity: LexicalComplexitySchema.nullable().optional(),
  mirror_intensity: z.number().min(0).max(1).optional(),
  lexical_overrides: z.array(z.string()).optional(),
  signature_moves_override: z.array(z.string()).optional(),
  tone_rules: z.array(z.string()).optional(),
});
export type UpsertStyleMirrorRequest = z.infer<typeof UpsertStyleMirrorRequestSchema>;

export const STYLE_MIRROR_API = {
  profiles: {
    get: '/api/v1/style-mirror/profiles/:userId',
    upsert: '/api/v1/style-mirror/profiles',
    updateStatus: '/api/v1/style-mirror/profiles/:id/status',
  },
} as const;

// ───────────────────────── Weather / Pedagogical Climate (D05) ─────────────────────────

export const WeatherTypeSchema = z.enum(['sunny', 'cloudy', 'rainy', 'stormy']);
export type WeatherType = z.infer<typeof WeatherTypeSchema>;

export const WeatherTrendSchema = z.enum(['improving', 'stable', 'declining']);
export type WeatherTrend = z.infer<typeof WeatherTrendSchema>;

export const PedagogicalWeatherSchema = z.object({
  weather: WeatherTypeSchema,
  trend: WeatherTrendSchema,
  composite_score: z.number().min(0).max(100),
  signals_summary: z.object({
    total_recent: z.number(),
    progression: z.number(),
    blockages: z.number(),
    overloads: z.number(),
    drift: z.number(),
  }),
  saturation_warnings: z.array(z.string()),
  suggested_guidance_mode: z.enum(['discovery', 'structured', 'challenge', 'mentor']),
  generated_at: z.number(),
});
export type PedagogicalWeather = z.infer<typeof PedagogicalWeatherSchema>;

export const WEATHER_API = {
  get: '/api/v1/weather/:userId',
} as const;

// ───────────────────────── Public API surface ─────────────────────────

export const COMPETENCY_API = {
  frameworks: {
    list: '/api/v1/competencies/frameworks',
    create: '/api/v1/competencies/frameworks',
    get: '/api/v1/competencies/frameworks/:id',
    update: '/api/v1/competencies/frameworks/:id',
  },
  definitions: {
    list: '/api/v1/competencies/definitions',
    create: '/api/v1/competencies/definitions',
    get: '/api/v1/competencies/definitions/:id',
    update: '/api/v1/competencies/definitions/:id',
  },
  signals: {
    ingest: '/api/v1/competencies/signals',
    list: '/api/v1/competencies/signals',
    validate: '/api/v1/competencies/signals/:id/validate',
    reject: '/api/v1/competencies/signals/:id/reject',
  },
  progress: {
    getUser: '/api/v1/competencies/progress/:userId',
  },
} as const;

export const GAMIFICATION_API = {
  badges: {
    list: '/api/v1/gamification/badges',
    create: '/api/v1/gamification/badges',
    award: '/api/v1/gamification/badges/award',
    getUserBadges: '/api/v1/gamification/badges/user/:userId',
  },
  skillTree: {
    list: '/api/v1/gamification/skill-tree',
    createNode: '/api/v1/gamification/skill-tree/nodes',
    updateStatus: '/api/v1/gamification/skill-tree/nodes/:id/status',
    getDependencies: '/api/v1/gamification/skill-tree/nodes/:id/dependencies',
  },
  progression: {
    summary: '/api/v1/gamification/progression/summary/:userId',
    events: '/api/v1/gamification/progression/events',
  },
} as const;
