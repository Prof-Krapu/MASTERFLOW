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

export const PersonaSchema = z.object({
  id: z.string(),
  name: z.string(),
  owner_type: z.string(),
  domain: z.string(),
  status: z.string(),
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

/** Entrée du registre d'actions (chargé depuis action_registry_seed.v1.json). */
export const ActionRegistryEntrySchema = z.object({
  action_id: z.string(),
  label: z.string(),
  endpoint: z.string(),
  risk_level: z.string(),
  preflight_required: z.boolean(),
  validation_required: z.union([z.boolean(), z.literal('depends_on_preflight')]),
  ui_surface: z.string(),
});
export type ActionRegistryEntry = z.infer<typeof ActionRegistryEntrySchema>;

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
