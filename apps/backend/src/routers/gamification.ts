import {Router, type Request, type Response} from 'express';
import {AwardBadgeRequestSchema, CreateSkillTreeNodeRequestSchema} from '@masterflow/shared';
import {z} from 'zod';
import {requireUser, requireRole, type AuthUser} from '../middleware/auth.ts';
import {
  listBadgeDefinitions, createBadgeDefinition, updateBadgeDefinition,
  awardBadge, getUserBadges, revokeBadge,
  getProgressionSummary, listProgressionEvents,
} from '../services/gamification_engine.ts';
import {listSkillTree, createSkillTreeNode, updateSkillTreeNodeStatus, getNodeDependencies, setNodeEquipped} from '../services/skill_tree.ts';

const actor = (r: Request): AuthUser => { if (!r.user) throw new Error('unauthorized'); return r.user; };
const fail = (s: Response, e: unknown): void => {
  const m = e instanceof Error ? e.message : 'gamification_error';
  s.status(m.endsWith('_not_found') ? 404 : m.endsWith('_denied') ? 403 : 400).json({error: m});
};

export function createGamificationRouter(): Router {
  const r = Router();
  r.use(requireUser, requireRole('teacher'));

  // Badge definitions
  r.get('/gamification/badges', (q, s) => {
    try {
      const p = typeof q.query.project_id === 'string' ? q.query.project_id : undefined;
      s.json(listBadgeDefinitions(actor(q), p));
    } catch (e) { fail(s, e); }
  });
  r.post('/gamification/badges', (q, s) => {
    const b = z.object({
      code: z.string().min(1), label: z.string().min(1), description: z.string().optional(),
      badge_type: z.enum(['progression', 'competency', 'milestone', 'event', 'ritual', 'challenge']),
      icon: z.string().optional(), criteria_json: z.string().optional(),
      unlock_conditions_json: z.string().optional(),
      reward_type: z.enum(['badge', 'unlock', 'feedback', 'resource', 'output', 'ritual']).nullable().optional(),
      reward_ref: z.string().nullable().optional(),
      visibility: z.enum(['private', 'teacher_visible', 'project_visible', 'public_candidate']).optional(),
      saturation_risk: z.number().optional(), project_id: z.string().nullable().optional(),
    }).safeParse(q.body);
    if (!b.success) return void s.status(400).json({error: 'invalid_body', detail: b.error.flatten()});
    try { s.status(201).json(createBadgeDefinition(actor(q), b.data)); } catch (e) { fail(s, e); }
  });
  r.put('/gamification/badges/:id', (q, s) => {
    const b = z.object({
      label: z.string().optional(), description: z.string().optional(), icon: z.string().optional(),
      criteria_json: z.string().optional(), unlock_conditions_json: z.string().optional(),
      visibility: z.enum(['private', 'teacher_visible', 'project_visible', 'public_candidate']).optional(),
      saturation_risk: z.number().optional(),
      status: z.enum(['active', 'archived']).optional(),
    }).safeParse(q.body);
    if (!b.success) return void s.status(400).json({error: 'invalid_body', detail: b.error.flatten()});
    try { s.json(updateBadgeDefinition(actor(q), q.params.id ?? '', b.data)); } catch (e) { fail(s, e); }
  });

  // Award
  r.post('/gamification/badges/award', (q, s) => {
    const b = AwardBadgeRequestSchema.safeParse(q.body);
    if (!b.success) return void s.status(400).json({error: 'invalid_body', detail: b.error.flatten()});
    try { s.status(201).json(awardBadge(actor(q), b.data)); } catch (e) { fail(s, e); }
  });
  r.get('/gamification/badges/user/:userId', (q, s) => {
    try {
      const p = typeof q.query.project_id === 'string' ? q.query.project_id : null;
      s.json(getUserBadges(actor(q), q.params.userId ?? '', p));
    } catch (e) { fail(s, e); }
  });
  r.post('/gamification/badges/:id/revoke', (q, s) => {
    try { s.json(revokeBadge(actor(q), q.params.id ?? '')); } catch (e) { fail(s, e); }
  });

  // Skill tree
  r.get('/gamification/skill-tree', (q, s) => {
    try {
      const p = typeof q.query.project_id === 'string' ? q.query.project_id : undefined;
      s.json(listSkillTree(actor(q), p));
    } catch (e) { fail(s, e); }
  });
  r.post('/gamification/skill-tree/nodes', (q, s) => {
    const b = CreateSkillTreeNodeRequestSchema.safeParse(q.body);
    if (!b.success) return void s.status(400).json({error: 'invalid_body', detail: b.error.flatten()});
    try { s.status(201).json(createSkillTreeNode(actor(q), b.data)); } catch (e) { fail(s, e); }
  });
  r.post('/gamification/skill-tree/nodes/:id/status', (q, s) => {
    const b = z.object({status: z.enum(['locked', 'available', 'active', 'equipped', 'validation_required', 'admin_only', 'cooldown', 'future_ready', 'deprecated', 'conflict'])}).safeParse(q.body);
    if (!b.success) return void s.status(400).json({error: 'invalid_body'});
    try { s.json(updateSkillTreeNodeStatus(actor(q), q.params.id ?? '', b.data.status)); } catch (e) { fail(s, e); }
  });
  r.post('/gamification/skill-tree/nodes/:id/equip', (q, s) => {
    const b = z.object({equipped: z.boolean()}).safeParse(q.body);
    if (!b.success) return void s.status(400).json({error: 'invalid_body'});
    try { s.json(setNodeEquipped(actor(q), q.params.id ?? '', b.data.equipped)); } catch (e) { fail(s, e); }
  });
  r.get('/gamification/skill-tree/nodes/:id/dependencies', (q, s) => {
    try { s.json(getNodeDependencies(q.params.id ?? '')); } catch (e) { fail(s, e); }
  });

  // Progression
  r.get('/gamification/progression/summary/:userId', (q, s) => {
    try {
      const p = typeof q.query.project_id === 'string' ? q.query.project_id : null;
      s.json(getProgressionSummary(actor(q), q.params.userId ?? '', p));
    } catch (e) { fail(s, e); }
  });
  r.get('/gamification/progression/events', (q, s) => {
    try {
      const uId = typeof q.query.user_id === 'string' ? q.query.user_id : undefined;
      if (!uId) return void s.status(400).json({error: 'missing_user_id'});
      s.json(listProgressionEvents(actor(q), uId));
    } catch (e) { fail(s, e); }
  });

  return r;
}
