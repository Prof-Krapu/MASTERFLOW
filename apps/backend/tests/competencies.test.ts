import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {createFramework, listFrameworks, getFramework, updateFramework, createDefinition, listDefinitions, getDefinition, updateDefinition, ingestSignal, listSignals, validateSignal, getUserProgress} from '../src/services/competency_engine.ts';
import {listSkillTree, createSkillTreeNode, updateSkillTreeNodeStatus, getNodeDependencies} from '../src/services/skill_tree.ts';
import {createGraph, listGraphs, getFullGraph, addGraphNode, addGraphEdge} from '../src/services/pedagogical_graph.ts';

const teacher: AuthUser = {id: 'comp-test-teacher', username: 'comp_test_teacher', role: 'teacher'};
const ownProject = 'comp-test-project';
const now = Date.now();

beforeAll(async () => {
  await seedAll();
  getDb().prepare(
    `INSERT OR IGNORE INTO users (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  ).run(teacher.id, teacher.username, teacher.username, teacher.role, now, now);

  getDb().prepare(
    `INSERT OR IGNORE INTO projects (id, owner_id, name, status, visibility, created_at, updated_at)
     VALUES (?, ?, ?, 'active', 'private', ?, ?)`,
  ).run(ownProject, teacher.id, 'Test Project', now, now);
});

describe('Frameworks', () => {
  let fwId: string;

  it('createFramework creates a framework', () => {
    const fw = createFramework(teacher, {label: 'Test Framework', domain: 'test'});
    fwId = fw.id;
    expect(fw.label).toBe('Test Framework');
    expect(fw.status).toBe('active');
  });

  it('listFrameworks returns created framework', () => {
    const list = listFrameworks(teacher);
    expect(list.some((f) => f.id === fwId)).toBe(true);
  });

  it('getFramework returns framework by id', () => {
    const fw = getFramework(teacher, fwId);
    expect(fw.id).toBe(fwId);
  });

  it('getFramework throws for unknown id', () => {
    expect(() => getFramework(teacher, 'nonexistent')).toThrow('not_found');
  });

  it('updateFramework archives it', () => {
    const updated = updateFramework(teacher, fwId, {status: 'archived'});
    expect(updated.status).toBe('archived');
  });
});

describe('Definitions', () => {
  let fwId: string;
  let defId: string;

  beforeAll(() => {
    const fw = createFramework(teacher, {label: 'Def Framework', domain: 'test'});
    fwId = fw.id;
  });

  it('createDefinition creates a definition', () => {
    const def = createDefinition(teacher, {framework_id: fwId, code: 'TEST-01', label: 'Test Definition'});
    defId = def.id;
    expect(def.code).toBe('TEST-01');
    expect(def.label).toBe('Test Definition');
  });

  it('listDefinitions returns created def', () => {
    const list = listDefinitions(teacher);
    expect(list.some((d) => d.id === defId)).toBe(true);
  });

  it('getDefinition returns definition by id', () => {
    const def = getDefinition(teacher, defId);
    expect(def.id).toBe(defId);
  });

  it('getDefinition throws for unknown id', () => {
    expect(() => getDefinition(teacher, 'nonexistent')).toThrow('not_found');
  });

  it('updateDefinition changes bloom level', () => {
    const updated = updateDefinition(teacher, defId, {bloom_level: 'create'});
    expect(updated.bloom_level).toBe('create');
  });
});

describe('Signals', () => {
  let defId: string;

  beforeAll(() => {
    const fw = createFramework(teacher, {label: 'Signal Framework', domain: 'test'});
    const def = createDefinition(teacher, {framework_id: fw.id, code: 'SIG-01', label: 'Signal Test'});
    defId = def.id;
  });

  it('ingestSignal creates a signal', () => {
    const sig = ingestSignal(teacher, {
      user_id: teacher.id,
      competency_id: defId,
      source: 'system',
      mastery_level: 'discovering',
      autonomy_level: 'dependent',
      confidence: 0.8,
    });
    expect(sig.id).toBeTruthy();
  });

  it('listSignals returns signals', () => {
    const list = listSignals(teacher);
    expect(list.length).toBeGreaterThanOrEqual(1);
  });

  it('listSignals filters by status', () => {
    const list = listSignals(teacher, {status: 'candidate'});
    expect(Array.isArray(list)).toBe(true);
  });

  it('validateSignal validates a signal', () => {
    const signals = listSignals(teacher, {status: 'candidate'});
    if (signals.length > 0) {
      const validated = validateSignal(teacher, signals[0]!.id, 'validated');
      expect(validated.status).toBe('validated');
    }
  });
});

describe('Progress', () => {
  it('getUserProgress returns array for any user', () => {
    const progress = getUserProgress(teacher, teacher.id);
    expect(Array.isArray(progress)).toBe(true);
  });
});

describe('Skill Tree', () => {
  let nodeId: string;

  it('listSkillTree returns array', () => {
    const tree = listSkillTree(teacher);
    expect(Array.isArray(tree)).toBe(true);
  });

  it('createSkillTreeNode creates a node', () => {
    const node = createSkillTreeNode(teacher, {
      label: 'Test Skill',
      node_type: 'competency',
      status: 'available',
    });
    nodeId = node.id;
    expect(node.label).toBe('Test Skill');
  });

  it('updateSkillTreeNodeStatus changes status', () => {
    const updated = updateSkillTreeNodeStatus(teacher, nodeId, 'active');
    expect(updated.status).toBe('active');
  });

  it('getNodeDependencies returns object with dependencies/dependents', () => {
    const deps = getNodeDependencies(nodeId);
    expect(deps).toHaveProperty('dependencies');
    expect(deps).toHaveProperty('dependents');
    expect(Array.isArray(deps.dependencies)).toBe(true);
    expect(Array.isArray(deps.dependents)).toBe(true);
  });
});

describe('Pedagogical Graphs', () => {
  let graphId: string;

  it('createGraph creates a graph', () => {
    const graph = createGraph(teacher, {label: 'Test Graph'});
    graphId = graph.id;
    expect(graph.label).toBe('Test Graph');
  });

  it('listGraphs returns created graph', () => {
    const list = listGraphs(teacher);
    expect(list.some((g) => g.id === graphId)).toBe(true);
  });

  it('getFullGraph returns graph with nodes and edges', () => {
    const result = getFullGraph(teacher, graphId);
    expect(result.graph.id).toBe(graphId);
    expect(Array.isArray(result.nodes)).toBe(true);
    expect(Array.isArray(result.edges)).toBe(true);
  });

  it('addGraphNode adds a node to graph', () => {
    const gn = addGraphNode(teacher, graphId, {node_type: 'competency', label: 'Graph Node'});
    expect(gn.label).toBe('Graph Node');
  });

  it('addGraphEdge adds an edge between nodes', () => {
    const gn1 = addGraphNode(teacher, graphId, {node_type: 'competency', label: 'Source Node'});
    const gn2 = addGraphNode(teacher, graphId, {node_type: 'competency', label: 'Target Node'});
    const edge = addGraphEdge(teacher, graphId, {
      source_node_id: gn1.id,
      target_node_id: gn2.id,
      relation_type: 'requires',
    });
    expect(edge.relation_type).toBe('requires');
  });
});
