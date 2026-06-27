import {Router, type Request, type Response} from 'express';
import {CreateNarrativeEventRequestSchema, CreateStoryNodeRequestSchema, UpdateStoryNodeRequestSchema, CreateStoryCharacterRequestSchema, UpdateStoryCharacterRequestSchema, GenerateSceneVisualRequestSchema} from '@masterflow/shared';
import {z} from 'zod';
import {requireRole, requireUser, type AuthUser} from '../middleware/auth.ts';
import {audit} from '../lib/audit.ts';
import {
  createEvent, createNode, deleteEvent, deleteNode, getNode, listAllEvents, listAllNodes,
  listEventsByWorkbench, listNodesByWorkbench, reorderNodes, updateNode, updateWorkbenchStatus,
} from '../services/narrative_runtime.ts';
import {createCharacter, getCharacter, listAllCharacters, listCharacters, updateCharacter, deleteCharacter} from '../services/story_characters.ts';
import {setCanonLock} from '../services/story_workbenches.ts';
import {compileSceneVisualContext} from '../engines/story_da_bridge.ts';

const actor = (r: Request): AuthUser => { if (!r.user) throw new Error('unauthorized'); return r.user; };
const fail = (s: Response, e: unknown): void => {
  const m = e instanceof Error ? e.message : 'narrative_runtime_error';
  s.status(m.endsWith('_not_found') ? 404 : m.endsWith('_denied') ? 403 : m.endsWith('_invalid') ? 400 : 400).json({error: m});
};

export function createNarrativeRuntimeRouter(): Router {
  const r = Router();
  r.use(requireUser, requireRole('teacher'));

  // Workbench status lifecycle
  r.post('/narrative/workbench/:id/status', (q, s) => {
    const b = z.object({status: z.enum(['draft', 'reader_ready', 'workshop_ready', 'parked'])}).safeParse(q.body);
    if (!b.success) return void s.status(400).json({error: 'invalid_status'});
    try { s.json(updateWorkbenchStatus(actor(q), q.params.id ?? '', b.data.status)); } catch (e) { fail(s, e); }
  });
  r.put('/narrative/workbench/:id/canon-lock', (q, s) => {
    const b = z.object({locked: z.boolean()}).safeParse(q.body);
    if (!b.success) return void s.status(400).json({error: 'invalid_canon_lock'});
    try { s.json(setCanonLock(actor(q), q.params.id ?? '', b.data.locked)); } catch (e) { fail(s, e); }
  });

  // Story nodes
  r.get('/narrative/nodes', (q, s) => {
    try { s.json(listAllNodes(actor(q))); } catch (e) { fail(s, e); }
  });
  r.get('/narrative/nodes/by-workbench/:workbenchId', (q, s) => {
    try { s.json(listNodesByWorkbench(actor(q), q.params.workbenchId ?? '')); } catch (e) { fail(s, e); }
  });
  r.get('/narrative/nodes/:id', (q, s) => {
    try { s.json(getNode(actor(q), q.params.id ?? '')); } catch (e) { fail(s, e); }
  });
  r.patch('/narrative/nodes/:id', (q, s) => {
    const b = UpdateStoryNodeRequestSchema.safeParse(q.body);
    if (!b.success) return void s.status(400).json({error: 'invalid_body', detail: b.error.flatten()});
    try { s.json(updateNode(actor(q), q.params.id ?? '', b.data)); } catch (e) { fail(s, e); }
  });
  r.post('/narrative/nodes', (q, s) => {
    const b = CreateStoryNodeRequestSchema.safeParse(q.body);
    if (!b.success) return void s.status(400).json({error: 'invalid_body', detail: b.error.flatten()});
    try { s.status(201).json(createNode(actor(q), b.data)); } catch (e) { fail(s, e); }
  });
  r.delete('/narrative/nodes/:id', (q, s) => {
    try { deleteNode(actor(q), q.params.id ?? ''); s.status(204).end(); } catch (e) { fail(s, e); }
  });

  r.post('/narrative/nodes/reorder', (q, s) => {
    const b = z.object({
      workbench_id: z.string().min(1),
      items: z.array(z.object({id: z.string().min(1), sort_order: z.number().int()})).min(1),
    }).safeParse(q.body);
    if (!b.success) return void s.status(400).json({error: 'invalid_body', detail: b.error.flatten()});
    try { reorderNodes(actor(q), b.data.workbench_id, b.data.items); s.status(200).json({ok: true}); } catch (e) { fail(s, e); }
  });

  // Story characters
  r.get('/narrative/characters', (q, s) => {
    try { s.json(listAllCharacters(actor(q))); } catch (e) { fail(s, e); }
  });
  r.get('/narrative/characters/by-workbench/:workbenchId', (q, s) => {
    try { s.json(listCharacters(actor(q), q.params.workbenchId ?? '')); } catch (e) { fail(s, e); }
  });
  r.get('/narrative/characters/:id', (q, s) => {
    try { s.json(getCharacter(actor(q), q.params.id ?? '')); } catch (e) { fail(s, e); }
  });
  r.post('/narrative/characters', (q, s) => {
    const b = CreateStoryCharacterRequestSchema.safeParse(q.body);
    if (!b.success) return void s.status(400).json({error: 'invalid_body', detail: b.error.flatten()});
    try { s.status(201).json(createCharacter(actor(q), b.data)); } catch (e) { fail(s, e); }
  });
  r.patch('/narrative/characters/:id', (q, s) => {
    const b = UpdateStoryCharacterRequestSchema.safeParse(q.body);
    if (!b.success) return void s.status(400).json({error: 'invalid_body', detail: b.error.flatten()});
    try { s.json(updateCharacter(actor(q), q.params.id ?? '', b.data)); } catch (e) { fail(s, e); }
  });
  r.delete('/narrative/characters/:id', (q, s) => {
    try { deleteCharacter(actor(q), q.params.id ?? ''); s.status(204).end(); } catch (e) { fail(s, e); }
  });

  // Scene visual generation (MasterStory → DA bridge)
  r.post('/narrative/nodes/:id/generate-visual', (q, s) => {
    const b = GenerateSceneVisualRequestSchema.safeParse({...q.body, node_id: q.params.id ?? ''});
    if (!b.success) return void s.status(400).json({error: 'invalid_body', detail: b.error.flatten()});
    try {
      const context = compileSceneVisualContext(actor(q), {node_id: b.data.node_id, additional_prompt: b.data.additional_prompt});
      audit({
        event_type: 'narrative.visual_generation_blocked_action_gate',
        user_id: actor(q).id,
        detail: {
          node_id: q.params.id,
          manifest_id: context.manifest?.manifest_id ?? null,
          reason: 'image_generation_requires_approved_action',
        },
      });
      s.status(202).json({
        status: 'generation_blocked_action_gate',
        manifest_id: context.manifest?.manifest_id ?? null,
        prompt: context.prompt,
        character_intents: context.character_intents,
        gates_check: context.gates_check,
        next_action: 'submit_approved_create_render_manifest_action',
      });
    } catch (e) { fail(s, e); }
  });

  // Narrative events
  r.get('/narrative/events/by-workbench/:workbenchId', (q, s) => {
    try { s.json(listEventsByWorkbench(actor(q), q.params.workbenchId ?? '')); } catch (e) { fail(s, e); }
  });
  r.get('/narrative/events', (q, s) => {
    try { s.json(listAllEvents(actor(q))); } catch (e) { fail(s, e); }
  });
  r.post('/narrative/events', (q, s) => {
    const b = CreateNarrativeEventRequestSchema.safeParse(q.body);
    if (!b.success) return void s.status(400).json({error: 'invalid_body', detail: b.error.flatten()});
    try { s.status(201).json(createEvent(actor(q), b.data)); } catch (e) { fail(s, e); }
  });
  r.delete('/narrative/events/:id', (q, s) => {
    try { deleteEvent(actor(q), q.params.id ?? ''); s.status(204).end(); } catch (e) { fail(s, e); }
  });

  return r;
}
