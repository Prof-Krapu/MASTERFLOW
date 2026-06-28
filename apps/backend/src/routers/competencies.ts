import {Router, type Request, type Response} from 'express';
import {CreateSkillTreeNodeRequestSchema, IngestCompetencySignalRequestSchema} from '@masterflow/shared';
import {z} from 'zod';
import {requireUser, requireRole, type AuthUser} from '../middleware/auth.ts';
import {
  createFramework, createDefinition, ingestSignal, validateSignal,
  listFrameworks, listDefinitions, listSignals, getUserProgress,
  getFramework, getDefinition, updateFramework, updateDefinition,
} from '../services/competency_engine.ts';
import {listSkillTree, createSkillTreeNode, updateSkillTreeNodeStatus, getNodeDependencies} from '../services/skill_tree.ts';
import {createGraph, listGraphs, getFullGraph, addGraphNode, addGraphEdge} from '../services/pedagogical_graph.ts';

const actor = (r: Request): AuthUser => { if (!r.user) throw new Error('unauthorized'); return r.user; };
const fail = (s: Response, e: unknown): void => {
  const m = e instanceof Error ? e.message : 'competency_error';
  s.status(m.endsWith('_not_found') ? 404 : m.endsWith('_denied') ? 403 : 400).json({error: m});
};
const SignalDecisionSchema = z.object({decision: z.enum(['validated', 'rejected'])});

export function createCompetenciesRouter(): Router {
  const r = Router();
  r.use(requireUser, requireRole('teacher'));

  // Frameworks
  r.get('/competencies/frameworks', (q, s) => {
    try {
      const p = typeof q.query.project_id === 'string' ? q.query.project_id : undefined;
      s.json(listFrameworks(actor(q), p));
    } catch (e) { fail(s, e); }
  });
  r.post('/competencies/frameworks', (q, s) => {
    const b = z.object({label: z.string().min(1), description: z.string().optional(), domain: z.string().min(1), project_id: z.string().nullable().optional()}).safeParse(q.body);
    if (!b.success) return void s.status(400).json({error: 'invalid_body', detail: b.error.flatten()});
    try { s.status(201).json(createFramework(actor(q), b.data)); } catch (e) { fail(s, e); }
  });
  r.get('/competencies/frameworks/:id', (q, s) => {
    try { s.json(getFramework(actor(q), q.params.id ?? '')); } catch (e) { fail(s, e); }
  });
  r.put('/competencies/frameworks/:id', (q, s) => {
    const b = z.object({label: z.string().optional(), description: z.string().optional(), domain: z.string().optional(), status: z.enum(['active', 'archived']).optional()}).safeParse(q.body);
    if (!b.success) return void s.status(400).json({error: 'invalid_body', detail: b.error.flatten()});
    try { s.json(updateFramework(actor(q), q.params.id ?? '', b.data)); } catch (e) { fail(s, e); }
  });

  // Définitions
  r.get('/competencies/definitions', (q, s) => {
    try {
      const fId = typeof q.query.framework_id === 'string' ? q.query.framework_id : undefined;
      s.json(listDefinitions(actor(q), fId));
    } catch (e) { fail(s, e); }
  });
  r.post('/competencies/definitions', (q, s) => {
    const b = z.object({
      framework_id: z.string().min(1), code: z.string().min(1), label: z.string().min(1),
      parent_id: z.string().nullable().optional(), description: z.string().optional(),
      bloom_level: z.enum(['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']).nullable().optional(),
      icon: z.string().optional(), sort_order: z.number().optional(),
    }).safeParse(q.body);
    if (!b.success) return void s.status(400).json({error: 'invalid_body', detail: b.error.flatten()});
    try { s.status(201).json(createDefinition(actor(q), b.data)); } catch (e) { fail(s, e); }
  });
  r.get('/competencies/definitions/:id', (q, s) => {
    try { s.json(getDefinition(actor(q), q.params.id ?? '')); } catch (e) { fail(s, e); }
  });
  r.put('/competencies/definitions/:id', (q, s) => {
    const b = z.object({
      label: z.string().optional(), description: z.string().optional(),
      bloom_level: z.enum(['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']).nullable().optional(),
      icon: z.string().optional(), sort_order: z.number().optional(),
      status: z.enum(['active', 'archived']).optional(),
    }).safeParse(q.body);
    if (!b.success) return void s.status(400).json({error: 'invalid_body', detail: b.error.flatten()});
    try { s.json(updateDefinition(actor(q), q.params.id ?? '', b.data)); } catch (e) { fail(s, e); }
  });

  // Signaux
  r.post('/competencies/signals', (q, s) => {
    const b = IngestCompetencySignalRequestSchema.safeParse(q.body);
    if (!b.success) return void s.status(400).json({error: 'invalid_body', detail: b.error.flatten()});
    try { s.status(201).json(ingestSignal(actor(q), b.data)); } catch (e) { fail(s, e); }
  });
  r.get('/competencies/signals', (q, s) => {
    try {
      const opts: {userId?: string; competencyId?: string; status?: string} = {};
      if (typeof q.query.user_id === 'string') opts.userId = q.query.user_id;
      if (typeof q.query.competency_id === 'string') opts.competencyId = q.query.competency_id;
      if (typeof q.query.status === 'string') opts.status = q.query.status;
      s.json(listSignals(actor(q), opts));
    } catch (e) { fail(s, e); }
  });
  r.post('/competencies/signals/:id/validate', (q, s) => {
    const b = SignalDecisionSchema.safeParse(q.body);
    if (!b.success) return void s.status(400).json({error: 'invalid_body'});
    try { s.json(validateSignal(actor(q), q.params.id ?? '', b.data.decision)); } catch (e) { fail(s, e); }
  });
  r.post('/competencies/signals/:id/reject', (q, s) => {
    try { s.json(validateSignal(actor(q), q.params.id ?? '', 'rejected')); } catch (e) { fail(s, e); }
  });

  // Progression
  r.get('/competencies/progress/:userId', (q, s) => {
    try {
      const p = typeof q.query.project_id === 'string' ? q.query.project_id : null;
      s.json(getUserProgress(actor(q), q.params.userId ?? '', p));
    } catch (e) { fail(s, e); }
  });

  // Skill Tree (intégré dans competencies pour cohérence D05)
  r.get('/competencies/skill-tree', (q, s) => {
    try {
      const p = typeof q.query.project_id === 'string' ? q.query.project_id : undefined;
      s.json(listSkillTree(actor(q), p));
    } catch (e) { fail(s, e); }
  });
  r.post('/competencies/skill-tree/nodes', (q, s) => {
    const b = CreateSkillTreeNodeRequestSchema.safeParse(q.body);
    if (!b.success) return void s.status(400).json({error: 'invalid_body', detail: b.error.flatten()});
    try { s.status(201).json(createSkillTreeNode(actor(q), b.data)); } catch (e) { fail(s, e); }
  });
  r.post('/competencies/skill-tree/nodes/:id/status', (q, s) => {
    const b = z.object({status: z.enum(['locked', 'available', 'active', 'equipped', 'validation_required', 'admin_only', 'cooldown', 'future_ready', 'deprecated', 'conflict'])}).safeParse(q.body);
    if (!b.success) return void s.status(400).json({error: 'invalid_body'});
    try { s.json(updateSkillTreeNodeStatus(actor(q), q.params.id ?? '', b.data.status)); } catch (e) { fail(s, e); }
  });
  r.get('/competencies/skill-tree/nodes/:id/dependencies', (q, s) => {
    try { s.json(getNodeDependencies(q.params.id ?? '')); } catch (e) { fail(s, e); }
  });

  // Pedagogical Graphs
  r.get('/competencies/graphs', (q, s) => {
    try {
      const p = typeof q.query.project_id === 'string' ? q.query.project_id : undefined;
      s.json(listGraphs(actor(q), p));
    } catch (e) { fail(s, e); }
  });
  r.post('/competencies/graphs', (q, s) => {
    const b = z.object({label: z.string().min(1), description: z.string().optional(), scope: z.enum(['general', 'personal', 'shared', 'subject']).optional(), project_id: z.string().nullable().optional()}).safeParse(q.body);
    if (!b.success) return void s.status(400).json({error: 'invalid_body', detail: b.error.flatten()});
    try { s.status(201).json(createGraph(actor(q), b.data)); } catch (e) { fail(s, e); }
  });
  r.get('/competencies/graphs/:id', (q, s) => {
    try { s.json(getFullGraph(actor(q), q.params.id ?? '')); } catch (e) { fail(s, e); }
  });
  r.post('/competencies/graphs/:id/nodes', (q, s) => {
    const b = z.object({node_type: z.enum(['competency', 'resource', 'workflow', 'persona', 'project', 'subject', 'tool', 'methodology', 'discipline', 'exercise', 'feedback']), label: z.string().min(1), ref_type: z.string().nullable().optional(), ref_id: z.string().nullable().optional(), metadata_json: z.string().optional(), sort_order: z.number().optional()}).safeParse(q.body);
    if (!b.success) return void s.status(400).json({error: 'invalid_body', detail: b.error.flatten()});
    try { s.status(201).json(addGraphNode(actor(q), q.params.id ?? '', b.data)); } catch (e) { fail(s, e); }
  });
  r.post('/competencies/graphs/:id/edges', (q, s) => {
    const b = z.object({source_node_id: z.string().min(1), target_node_id: z.string().min(1), relation_type: z.enum(['requires', 'improves', 'extends', 'illustrates', 'contradicts', 'simplifies', 'references', 'recommended_for', 'used_in', 'blocks', 'unlocks']), weight: z.number().nullable().optional(), metadata_json: z.string().optional()}).safeParse(q.body);
    if (!b.success) return void s.status(400).json({error: 'invalid_body', detail: b.error.flatten()});
    try { s.status(201).json(addGraphEdge(actor(q), q.params.id ?? '', b.data)); } catch (e) { fail(s, e); }
  });

  return r;
}
