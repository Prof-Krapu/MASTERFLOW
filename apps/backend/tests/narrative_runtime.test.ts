import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {
  createNode, getNode, listNodesByWorkbench, getNextSortOrder,
  createEvent, listEventsByWorkbench, listAllEvents, updateNode,
  updateWorkbenchStatus, deleteNode, deleteEvent,
} from '../src/services/narrative_runtime.ts';
import {createCharacter, getCharacter, listCharacters, updateCharacter, deleteCharacter} from '../src/services/story_characters.ts';
import {compileSceneVisualContext, evaluatePostGenerationGates} from '../src/engines/story_da_bridge.ts';

const teacher: AuthUser = {id: 'nr-test-teacher', username: 'nr_test_teacher', role: 'teacher'};
const outsider: AuthUser = {id: 'nr-test-outsider', username: 'nr_test_outsider', role: 'teacher'};
const reader: AuthUser = {id: 'nr-test-reader', username: 'nr_test_reader', role: 'student'};
const now = Date.now();
let workbenchId: string;
let secondWb: string;

beforeAll(async () => {
  await seedAll();
  getDb().prepare(
    `INSERT OR IGNORE INTO users (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  ).run(teacher.id, teacher.username, teacher.username, teacher.role, now, now);
  getDb().prepare(
    `INSERT OR IGNORE INTO users (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  ).run(reader.id, reader.username, reader.username, reader.role, now, now);
  getDb().prepare(
    `INSERT OR IGNORE INTO users (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  ).run(outsider.id, outsider.username, outsider.username, outsider.role, now, now);

  // Créer un workbench pour les tests
  workbenchId = 'nr-test-wb';
  getDb().prepare(`
    INSERT OR IGNORE INTO story_workbenches (id, owner_id, project_id, project_scope, title, source_ref, intake_mode, source_truth_state, status, created_by, created_at, updated_at)
    VALUES (?, ?, NULL, 'test', 'Test Workbench', 'src://test', 'draft_workbench', 'USER_PROVIDED', 'draft', ?, ?, ?)
  `).run(workbenchId, teacher.id, teacher.id, now, now);

  secondWb = 'nr-test-wb-2';
  getDb().prepare(`
    INSERT OR IGNORE INTO story_workbenches (id, owner_id, project_id, project_scope, title, source_ref, intake_mode, source_truth_state, status, created_by, created_at, updated_at)
    VALUES (?, ?, NULL, 'test', 'Test Workbench 2', 'src://test2', 'draft_workbench', 'USER_PROVIDED', 'draft', ?, ?, ?)
  `).run(secondWb, teacher.id, teacher.id, now, now);
});

describe('narrative_runtime', () => {
  // ── Workbench status lifecycle ──
  it('updateWorkbenchStatus change le statut', () => {
    const result = updateWorkbenchStatus(teacher, workbenchId, 'reader_ready');
    expect(result.status).toBe('reader_ready');
  });

  it('updateWorkbenchStatus refuse un statut invalide', () => {
    expect(() => updateWorkbenchStatus(teacher, workbenchId, 'invalid')).toThrow('invalid_status');
  });

  it('updateWorkbenchStatus lève pour workbench inconnu', () => {
    expect(() => updateWorkbenchStatus(teacher, 'nonexistent', 'reader_ready')).toThrow('workbench_not_found');
  });

  it('updateWorkbenchStatus bloque un autre owner', () => {
    expect(() => updateWorkbenchStatus(outsider, workbenchId, 'reader_ready')).toThrow('workbench_not_found');
  });

  // ── Story nodes ──
  it('createNode crée un nœud racine', () => {
    const node = createNode(teacher, {workbench_id: workbenchId, node_type: 'arc', title: 'Acte 1'});
    expect(node.node_type).toBe('arc');
    expect(node.title).toBe('Acte 1');
    expect(node.parent_id).toBeNull();
    expect(node.sort_order).toBe(1);
    expect(node.status).toBe('draft');
  });

  it('createNode crée un nœud enfant', () => {
    const parent = createNode(teacher, {workbench_id: workbenchId, node_type: 'arc', title: 'Acte 2'});
    const child = createNode(teacher, {workbench_id: workbenchId, parent_id: parent.id, node_type: 'scene', title: 'Scène 1', spoiler_level: 'mild'});
    expect(child.parent_id).toBe(parent.id);
    expect(child.node_type).toBe('scene');
    expect(child.spoiler_level).toBe('mild');
  });

  it('getNode récupère par id', () => {
    const node = createNode(teacher, {workbench_id: workbenchId, node_type: 'beat', title: 'Beat test'});
    const fetched = getNode(teacher, node.id);
    expect(fetched.title).toBe('Beat test');
  });

  it('bloque get/update/delete node cross-owner', () => {
    const node = createNode(teacher, {workbench_id: workbenchId, node_type: 'beat', title: 'Privé'});
    expect(() => getNode(outsider, node.id)).toThrow('workbench_not_found');
    expect(() => updateNode(outsider, node.id, {title: 'Intrusion'})).toThrow('workbench_not_found');
    expect(() => deleteNode(outsider, node.id)).toThrow('workbench_not_found');
  });

  it('getNode lève pour id inconnu', () => {
    expect(() => getNode(teacher, 'nonexistent')).toThrow('node_not_found');
  });

  it('listNodesByWorkbench retourne les nœuds ordonnés', () => {
    const nodes = listNodesByWorkbench(teacher, workbenchId);
    expect(nodes.length).toBeGreaterThanOrEqual(4);
    // Vérifie l'ordre
    for (let i = 1; i < nodes.length; i++) {
      expect(nodes[i]!.sort_order).toBeGreaterThanOrEqual(nodes[i - 1]!.sort_order);
    }
  });

  it('getNextSortOrder calcule le prochain ordre', () => {
    const order = getNextSortOrder(workbenchId);
    const rootNodes = listNodesByWorkbench(teacher, workbenchId).filter((n) => !n.parent_id);
    expect(order).toBe(rootNodes.length + 1);
  });

  // ── D09 reveal gate metadata ──
  it('createNode accepte les champs reveal gate dans metadata', () => {
    const node = createNode(teacher, {
      workbench_id: workbenchId, node_type: 'scene', title: 'Scène verrouillée',
      metadata: {
        gate_type: 'prerequisite',
        prerequisite_ids: ['node-a', 'node-b'],
        reader_visibility: 'restricted',
        truth_state: 'CANDIDATE',
      },
    });
    expect(node.metadata).toMatchObject({
      gate_type: 'prerequisite',
      prerequisite_ids: ['node-a', 'node-b'],
      reader_visibility: 'restricted',
      truth_state: 'CANDIDATE',
    });
  });

  it('createNode accepte metadata vide et ajoute les défauts', () => {
    const node = createNode(teacher, {
      workbench_id: workbenchId, node_type: 'beat', title: 'Beat sans gate',
    });
    expect(node.metadata).toBeDefined();
    expect(node.metadata.gate_type).toBeUndefined();
    expect(node.metadata.prerequisite_ids).toBeUndefined();
  });

  it('createNode rejette metadata invalide (enum)', () => {
    expect(() => createNode(teacher, {
      workbench_id: workbenchId, node_type: 'scene', title: 'Gate invalide',
      metadata: {gate_type: 'invalid_gate'} as never,
    })).toThrow();
  });

  it('getNode preserve le metadata reveal gate round-trip', () => {
    const created = createNode(teacher, {
      workbench_id: workbenchId, node_type: 'chapter', title: 'Chapitre secret',
      metadata: {
        gate_type: 'reveal',
        prerequisite_ids: ['pre-req-1'],
        reader_visibility: 'spoilered',
        protagonist_visibility: 'unknown',
        confidence: 'speculative',
      },
    });
    const fetched = getNode(teacher, created.id);
    expect(fetched.metadata).toEqual(created.metadata);
    expect(fetched.metadata.gate_type).toBe('reveal');
    expect(fetched.metadata.prerequisite_ids).toEqual(['pre-req-1']);
    expect(fetched.metadata.protagonist_visibility).toBe('unknown');
  });

  // ── updateNode (PATCH) ──
  it('updateNode modifie le titre et le status', () => {
    const node = createNode(teacher, {workbench_id: workbenchId, node_type: 'beat', title: 'Avant MAJ'});
    const updated = updateNode(teacher, node.id, {title: 'Après MAJ', status: 'active'});
    expect(updated.title).toBe('Après MAJ');
    expect(updated.status).toBe('active');
  });

  it('updateNode modifie le metadata reveal gate', () => {
    const node = createNode(teacher, {
      workbench_id: workbenchId, node_type: 'scene', title: 'Gate PATCH',
      metadata: {gate_type: 'none'},
    });
    const updated = updateNode(teacher, node.id, {
      metadata: {gate_type: 'spoiler', reader_visibility: 'spoilered'},
    });
    expect(updated.metadata.gate_type).toBe('spoiler');
    expect(updated.metadata.reader_visibility).toBe('spoilered');
  });

  it('updateNode lève pour id inconnu', () => {
    expect(() => updateNode(teacher, 'nonexistent', {title: 'Nope'})).toThrow('node_not_found');
  });

  // ── Narrative events ──
  it('createEvent crée un événement', () => {
    const evt = createEvent(teacher, {workbench_id: workbenchId, event_type: 'story_beat', title: 'Le héros part à l\'aventure', description: 'Inciting incident'});
    expect(evt.event_type).toBe('story_beat');
    expect(evt.title).toBe('Le héros part à l\'aventure');
    expect(evt.occurred_at).toBeGreaterThan(now - 1000);
  });

  it('createEvent lie à un nœud', () => {
    const node = createNode(teacher, {workbench_id: workbenchId, node_type: 'scene', title: 'Scène clé'});
    const evt = createEvent(teacher, {workbench_id: workbenchId, node_id: node.id, event_type: 'plot_twist', title: 'Plot twist', payload: {reveal: 'Le mentor est le traître'}});
    expect(evt.node_id).toBe(node.id);
    expect(evt.payload).toEqual({reveal: 'Le mentor est le traître'});
  });

  it('listEventsByWorkbench retourne les événements chronologiques', () => {
    const events = listEventsByWorkbench(teacher, workbenchId);
    expect(events.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < events.length; i++) {
      expect(events[i]!.occurred_at).toBeGreaterThanOrEqual(events[i - 1]!.occurred_at);
    }
  });

  it('bloque les événements cross-owner', () => {
    const evt = createEvent(teacher, {workbench_id: workbenchId, event_type: 'story_beat', title: 'Événement privé'});
    expect(() => listEventsByWorkbench(outsider, workbenchId)).toThrow('workbench_not_found');
    expect(() => deleteEvent(outsider, evt.id)).toThrow('workbench_not_found');
  });

  it('listAllEvents retourne les événements récents', () => {
    const events = listAllEvents(teacher);
    expect(events.length).toBeGreaterThanOrEqual(2);
  });

  // ── Story characters CRUD ──

  let createdCharId: string;

  it('createCharacter crée un personnage', () => {
    const char = createCharacter(teacher, {
      workbench_id: workbenchId, name: 'Héros', role: 'main', archetype: 'protagonist',
      design_notes: 'Cheveux bleus, cape rouge', behavior_notes: 'Brave mais impulsif',
      aliases: ['Le Brave', 'Héros du royaume'],
    });
    createdCharId = char.id;
    expect(char.name).toBe('Héros');
    expect(char.archetype).toBe('protagonist');
    expect(char.design_notes).toBe('Cheveux bleus, cape rouge');
    expect(char.aliases).toEqual(['Le Brave', 'Héros du royaume']);
    expect(char.workbench_id).toBe(workbenchId);
  });

  it('createCharacter crée avec les valeurs par défaut', () => {
    const char = createCharacter(teacher, {
      workbench_id: secondWb, name: 'Figurant', role: 'background', archetype: 'neutral',
    });
    expect(char.status).toBe('active');
    expect(char.aliases).toEqual([]);
    expect(char.design_notes).toBeNull();
  });

  it('getCharacter récupère par id', () => {
    const char = getCharacter(teacher, createdCharId);
    expect(char.name).toBe('Héros');
    expect(char.archetype).toBe('protagonist');
  });

  it('bloque les personnages cross-owner', () => {
    expect(() => getCharacter(outsider, createdCharId)).toThrow('workbench_not_found');
    expect(() => listCharacters(outsider, workbenchId)).toThrow('workbench_not_found');
    expect(() => updateCharacter(outsider, createdCharId, {name: 'Intrusion'})).toThrow('workbench_not_found');
    expect(() => deleteCharacter(outsider, createdCharId)).toThrow('workbench_not_found');
  });

  it('getCharacter lève pour id inconnu', () => {
    expect(() => getCharacter(teacher, 'nonexistent')).toThrow('character_not_found');
  });

  it('listCharacters retourne les personnages du workbench', () => {
    const chars = listCharacters(teacher, workbenchId);
    expect(chars.length).toBe(1);
    expect(chars[0]!.name).toBe('Héros');
  });

  it('listCharacters ne mélange pas les workbenches', () => {
    const chars = listCharacters(teacher, secondWb);
    expect(chars.length).toBe(1);
    expect(chars[0]!.name).toBe('Figurant');
  });

  it('updateCharacter modifie les champs', () => {
    const updated = updateCharacter(teacher, createdCharId, {
      name: 'Héros Légendaire', archetype: 'mentor', status: 'inactive',
      design_notes: 'Barbe blanche, cape dorée',
    });
    expect(updated.name).toBe('Héros Légendaire');
    expect(updated.archetype).toBe('mentor');
    expect(updated.status).toBe('inactive');
    expect(updated.design_notes).toBe('Barbe blanche, cape dorée');
  });

  it('updateCharacter lève pour id inconnu', () => {
    expect(() => updateCharacter(teacher, 'nonexistent', {name: 'Nope'})).toThrow('character_not_found');
  });

  it('deleteCharacter supprime le personnage', () => {
    deleteCharacter(teacher, createdCharId);
    expect(() => getCharacter(teacher, createdCharId)).toThrow('character_not_found');
  });

  it('deleteCharacter lève pour id inconnu', () => {
    expect(() => deleteCharacter(teacher, 'nonexistent')).toThrow('character_not_found');
  });

  // ── Reader engine spoiler filtering ──

  it('listNodesByWorkbench filtre les spoilers en MODE_LECTURE', () => {
    const safe = createNode(teacher, {workbench_id: secondWb, node_type: 'scene', title: 'Safe', spoiler_level: 'none'});
    const mild = createNode(teacher, {workbench_id: secondWb, node_type: 'scene', title: 'Mild', spoiler_level: 'mild'});
    const major = createNode(teacher, {workbench_id: secondWb, node_type: 'scene', title: 'Major', spoiler_level: 'major'});
    const critical = createNode(teacher, {workbench_id: secondWb, node_type: 'scene', title: 'Critical', spoiler_level: 'critical'});

    getDb().prepare(
      'INSERT OR REPLACE INTO story_reader_states (id, workbench_id, owner_id, current_node, opening_sequence_lock, mode, created_at, updated_at) VALUES (?, ?, ?, NULL, NULL, ?, ?, ?)',
    ).run('reader-state-1', secondWb, reader.id, 'MODE_LECTURE', now, now);

    const nodes = listNodesByWorkbench(reader, secondWb);
    const titles = nodes.map((n) => n.title);
    expect(titles).toContain('Safe');
    expect(titles).toContain('Mild');
    expect(titles).not.toContain('Major');
    expect(titles).not.toContain('Critical');
  });

  it('listNodesByWorkbench montre tout en FULL_SPOILERS', () => {
    getDb().prepare(
      'INSERT OR REPLACE INTO story_reader_states (id, workbench_id, owner_id, current_node, opening_sequence_lock, mode, created_at, updated_at) VALUES (?, ?, ?, NULL, NULL, ?, ?, ?)',
    ).run('reader-state-2', secondWb, reader.id, 'FULL_SPOILERS', now, now);

    const nodes = listNodesByWorkbench(reader, secondWb);
    expect(nodes.length).toBeGreaterThanOrEqual(4);
  });

  // ── DA bridge engine ──

  it('compileSceneVisualContext compile un contexte avec personnages', () => {
    const proto = createCharacter(teacher, {
      workbench_id: secondWb, name: 'Mentor', role: 'support', archetype: 'mentor',
    });
    const node = createNode(teacher, {
      workbench_id: secondWb, node_type: 'scene', title: 'Leçon', summary: 'Le mentor enseigne une leçon importante',
      metadata: {character_ids: [proto.id]},
    });

    const context = compileSceneVisualContext(teacher, {node_id: node.id});
    expect(context.node_id).toBe(node.id);
    expect(context.workbench_id).toBe(secondWb);
    expect(context.prompt).toContain('leçon importante');
    expect(context.prompt).toContain('Mentor');
    expect(context.character_intents.length).toBe(1);
    expect(context.character_intents[0]!.archetype).toBe('mentor');
    expect(context.character_intents[0]!.acting_directive).toContain('pointing at diagram');
    expect(context.manifest).not.toBeNull();
    expect(context.active_layers.length).toBeGreaterThan(0);
    expect(context.gates_check.length).toBeGreaterThan(0);
    expect(context.gates_check.some((g) => g.status === 'passed')).toBe(true);
    expect(context.gates_check.filter((g) => g.status === 'blocked')).toHaveLength(0);
    expect(context.spoiler_level).toBe('none');
  });

  it('compileSceneVisualContext gère un nœud sans personnages', () => {
    const node = createNode(teacher, {
      workbench_id: secondWb, node_type: 'beat', title: 'Narration seule',
      metadata: {},
    });

    const context = compileSceneVisualContext(teacher, {node_id: node.id});
    expect(context.character_intents).toEqual([]);
    expect(context.prompt).toContain('Narration seule');
  });

  it('compileSceneVisualContext resolve correctement l\'intent confrontational', () => {
    const antagonist = createCharacter(teacher, {
      workbench_id: secondWb, name: 'Méchant', role: 'villain', archetype: 'antagonist',
    });
    const node = createNode(teacher, {
      workbench_id: secondWb, node_type: 'scene', title: 'Combat final', summary: 'Confrontation épique entre le héros et le méchant',
      metadata: {character_ids: [antagonist.id]},
    });

    const context = compileSceneVisualContext(teacher, {node_id: node.id});
    const intent = context.character_intents[0]!;
    expect(intent.intent).toBe('attacking');
    expect(intent.acting_directive).toContain('aggressive');
  });

  it('compileSceneVisualContext utilise additional_prompt', () => {
    const node = createNode(teacher, {
      workbench_id: secondWb, node_type: 'scene', title: 'Paysage',
    });

    const context = compileSceneVisualContext(teacher, {node_id: node.id, additional_prompt: 'Lumière dorée du coucher de soleil'});
    expect(context.prompt).toContain('Lumière dorée');
  });

  // ── Post-gen gates ──

  it('evaluatePostGenerationGates passe toutes les gates pour une description neutre', () => {
    const gates = evaluatePostGenerationGates('a character standing in a room with simple background', ['base', 'characters']);
    expect(gates.length).toBeGreaterThan(0);
    const blocked = gates.filter((g) => g.status === 'blocked');
    expect(blocked).toEqual([]);
  });

  it('evaluatePostGenerationGates bloque adult_cartoon_not_layette pour chibi', () => {
    const gates = evaluatePostGenerationGates('chibi cute mascot character', ['base']);
    const gate = gates.find((g) => g.gate_id === 'adult_cartoon_not_layette');
    expect(gate).toBeDefined();
    expect(gate!.status).toBe('blocked');
  });

  it('evaluatePostGenerationGates bloque anti_realism pour photoreal', () => {
    const gates = evaluatePostGenerationGates('photoreal cinematic portrait', ['base']);
    const gate = gates.find((g) => g.gate_id === 'anti_realism');
    expect(gate).toBeDefined();
    expect(gate!.status).toBe('blocked');
  });

  it('evaluatePostGenerationGates émet warning pour acting sans silhouette', () => {
    const gates = evaluatePostGenerationGates('a simple landscape', ['base']);
    const gate = gates.find((g) => g.gate_id === 'acting_and_silhouette');
    expect(gate).toBeDefined();
    expect(gate!.status).toBe('warning');
  });
});
