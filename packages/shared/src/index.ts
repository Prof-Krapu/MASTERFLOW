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

export const ActionSchema = z.object({
  id: z.string(),
  registry_id: z.string().nullable(),
  intent: z.string(),
  object_type: z.string(),
  user_id: z.string(),
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

export const SubmissionRecordSchema = z.object({
  submission_id: z.string().min(1),
  batch_id: z.string().min(1),
  owner_id: z.string().min(1),
  project_id: z.string().min(1).nullable().optional(),
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
    project_id: z.string().min(1).nullable().optional(),
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
    project_id: z.string().min(1).nullable().optional(),
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
});
export type UserRuntimeLoadout = z.infer<typeof UserRuntimeLoadoutSchema>;

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
