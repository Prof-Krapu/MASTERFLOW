import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {
  createFramework, listFrameworks, getFramework, updateFramework,
  createDefinition, listDefinitions, getDefinition, updateDefinition,
  ingestSignal, listSignals, validateSignal, getUserProgress,
} from '../src/services/competency_engine.ts';
import {
  createBadgeDefinition, listBadgeDefinitions, getBadgeDefinition,
  awardBadge, getUserBadges, revokeBadge,
  getProgressionSummary, listProgressionEvents,
} from '../src/services/gamification_engine.ts';
import {
  createSkillTreeNode, listSkillTree, getSkillTreeNode,
  updateSkillTreeNodeStatus, getNodeDependencies, setNodeEquipped,
} from '../src/services/skill_tree.ts';
import {
  createGraph, listGraphs, getFullGraph,
  addGraphNode, addGraphEdge, listGraphNodes, listGraphEdges,
} from '../src/services/pedagogical_graph.ts';

const teacher: AuthUser = {id: 'test-teacher', username: 'test_teacher', role: 'teacher'};
const student: AuthUser = {id: 'test-student', username: 'test_student', role: 'student'};
const admin: AuthUser = {id: 'test-admin', username: 'test_admin', role: 'admin'};

beforeAll(async () => {
  await seedAll();
  const now = Date.now();
  const insert = getDb().prepare(
    `INSERT OR IGNORE INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  );
  insert.run(teacher.id, teacher.username, teacher.username, teacher.role, now, now);
  insert.run(student.id, student.username, student.username, student.role, now, now);
  insert.run(admin.id, admin.username, admin.username, admin.role, now, now);
});

describe('competency_engine', () => {
  it('crée et liste les frameworks', () => {
    const fw = createFramework(teacher, {label: 'Test Framework', domain: 'test', description: 'Un référentiel test'});
    expect(fw.label).toBe('Test Framework');
    expect(fw.domain).toBe('test');
    expect(fw.status).toBe('active');

    const list = listFrameworks(teacher);
    expect(list.some((f) => f.id === fw.id)).toBe(true);
  });

  it('getFramework renvoie une erreur pour un id inconnu', () => {
    expect(() => getFramework(teacher, 'nonexistent')).toThrow('framework_not_found');
  });

  it('updateFramework modifie le label et le statut', () => {
    const fw = createFramework(teacher, {label: 'À renommer', domain: 'test'});
    const updated = updateFramework(teacher, fw.id, {label: 'Renommé', status: 'archived'});
    expect(updated.label).toBe('Renommé');
    expect(updated.status).toBe('archived');
  });

  it('crée des définitions dans un framework', () => {
    const fw = createFramework(teacher, {label: 'Définitions Test', domain: 'test'});
    const def = createDefinition(teacher, {
      framework_id: fw.id, code: 'TST-01', label: 'Compétence Test',
      bloom_level: 'apply', sort_order: 1,
    });
    expect(def.code).toBe('TST-01');
    expect(def.bloom_level).toBe('apply');
    expect(def.framework_id).toBe(fw.id);

    const list = listDefinitions(teacher, fw.id);
    expect(list.some((d) => d.id === def.id)).toBe(true);
  });

  it('ingère un signal et met à jour la progression', () => {
    const fw = createFramework(teacher, {label: 'Signal Test', domain: 'test'});
    const def = createDefinition(teacher, {framework_id: fw.id, code: 'SIG-01', label: 'Compétence Signal'});

    const signal = ingestSignal(teacher, {
      user_id: student.id, competency_id: def.id,
      source: 'teacher', mastery_level: 'guided', confidence: 0.8,
      observation: 'Bon début',
    });
    expect(signal.status).toBe('candidate');
    expect(signal.mastery_level).toBe('guided');

    const progress = getUserProgress(student, student.id);
    const match = progress.find((p) => p.competency_id === def.id);
    expect(match).toBeDefined();
    expect(match?.current_mastery).toBe('guided');
    expect(match?.confidence).toBeGreaterThan(0);
  });

  it('valide un signal et recalcule la progression', () => {
    const fw = createFramework(teacher, {label: 'Validation Test', domain: 'test'});
    const def = createDefinition(teacher, {framework_id: fw.id, code: 'VAL-01', label: 'À valider'});

    const signal = ingestSignal(teacher, {
      user_id: student.id, competency_id: def.id,
      source: 'teacher', mastery_level: 'practicing', confidence: 0.9,
    });
    expect(signal.status).toBe('candidate');

    const validated = validateSignal(teacher, signal.id, 'validated');
    expect(validated.status).toBe('validated');

    const progress = getUserProgress(student, student.id);
    const match = progress.find((p) => p.competency_id === def.id);
    expect(match?.current_mastery).toBe('practicing');
  });

  it('listSignals filtre par statut', () => {
    const signals = listSignals(teacher, {status: 'candidate'});
    expect(signals.every((s) => s.status === 'candidate')).toBe(true);
  });
});

describe('gamification_engine', () => {
  it('crée et liste les définitions de badges', () => {
    const badge = createBadgeDefinition(teacher, {
      code: 'TEST-BADGE-01', label: 'Badge Test',
      badge_type: 'milestone', description: 'Un badge de test',
    });
    expect(badge.code).toBe('TEST-BADGE-01');
    expect(badge.status).toBe('active');

    const list = listBadgeDefinitions(teacher);
    expect(list.some((b) => b.id === badge.id)).toBe(true);
  });

  it('awardBadge décerne un badge et crée un événement', () => {
    const badge = createBadgeDefinition(teacher, {
      code: 'TEST-BADGE-AWARD', label: 'Badge à décerner',
      badge_type: 'competency',
    });
    const result = awardBadge(teacher, {user_id: student.id, badge_id: badge.id});
    expect(result.badge.status).toBe('awarded');
    expect(result.event.event_type).toBe('badge_awarded');
    expect(result.event.ref_id).toBe(badge.id);
  });

  it('refuse un badge déjà décerné (non révoqué)', () => {
    const badge = createBadgeDefinition(teacher, {
      code: 'TEST-BADGE-DOUBLON', label: 'Badge Doublon',
      badge_type: 'event',
    });
    awardBadge(teacher, {user_id: student.id, badge_id: badge.id});
    expect(() => awardBadge(teacher, {user_id: student.id, badge_id: badge.id})).toThrow('badge_already_awarded');
  });

  it('revokeBadge révoque un badge', () => {
    const badge = createBadgeDefinition(teacher, {
      code: 'TEST-BADGE-REVOKE', label: 'Badge à révoquer',
      badge_type: 'event',
    });
    const {badge: awarded} = awardBadge(teacher, {user_id: student.id, badge_id: badge.id});
    const revoked = revokeBadge(teacher, awarded.id);
    expect(revoked.status).toBe('revoked');
  });

  it('getProgressionSummary retourne un résumé complet', () => {
    const summary = getProgressionSummary(student, student.id);
    expect(summary.user_id).toBe(student.id);
    expect(typeof summary.badges_count).toBe('number');
    expect(typeof summary.signals_count).toBe('number');
    expect(typeof summary.average_mastery).toBe('number');
    expect(Array.isArray(summary.saturation_warnings)).toBe(true);
  });

  it('listProgressionEvents retourne les événements récents', () => {
    const events = listProgressionEvents(student, student.id);
    expect(events.length).toBeGreaterThan(0);
    expect(events.every((e) => e.user_id === student.id)).toBe(true);
  });
});

describe('skill_tree', () => {
  it('crée un nœud racine et le liste', () => {
    const node = createSkillTreeNode(teacher, {
      label: 'Compétence Racine', node_type: 'capability',
      status: 'available',
    });
    expect(node.label).toBe('Compétence Racine');
    expect(node.status).toBe('available');

    const list = listSkillTree(teacher);
    expect(list.some((n) => n.id === node.id)).toBe(true);
  });

  it('crée un nœud avec parent et dépendance', () => {
    const parent = createSkillTreeNode(teacher, {
      label: 'Parent', node_type: 'methodology',
    });
    const child = createSkillTreeNode(teacher, {
      label: 'Enfant', node_type: 'widget',
      parent_id: parent.id, dependency_type: 'requires',
    });
    const {dependencies} = getNodeDependencies(child.id);
    expect(dependencies.some((d) => d.depends_on_id === parent.id)).toBe(true);
  });

  it('updateSkillTreeNodeStatus change le statut', () => {
    const node = createSkillTreeNode(teacher, {
      label: 'Statut Test', node_type: 'app',
    });
    const updated = updateSkillTreeNodeStatus(teacher, node.id, 'active');
    expect(updated.status).toBe('active');
  });

  it('setNodeEquipped bascule equip', () => {
    const node = createSkillTreeNode(teacher, {
      label: 'Equip Test', node_type: 'engine',
    });
    const equipped = setNodeEquipped(teacher, node.id, true);
    expect(equipped.equipped).toBe(1);
    const unequipped = setNodeEquipped(teacher, node.id, false);
    expect(unequipped.equipped).toBe(0);
  });
});

describe('pedagogical_graph', () => {
  it('crée un graphe et le liste', () => {
    const graph = createGraph(teacher, {
      label: 'Graphe Test', description: 'Un graphe de test',
      scope: 'general',
    });
    expect(graph.label).toBe('Graphe Test');
    expect(graph.scope).toBe('general');

    const list = listGraphs(teacher);
    expect(list.some((g) => g.id === graph.id)).toBe(true);
  });

  it('ajoute des nœuds et des arêtes dans un graphe', () => {
    const graph = createGraph(teacher, {
      label: 'Graphe avec nœuds', scope: 'subject',
    });

    const nodeA = addGraphNode(teacher, graph.id, {
      node_type: 'competency', label: 'Compétence A',
    });
    const nodeB = addGraphNode(teacher, graph.id, {
      node_type: 'resource', label: 'Ressource B',
    });
    const nodeC = addGraphNode(teacher, graph.id, {
      node_type: 'workflow', label: 'Workflow C',
    });

    const edgeAB = addGraphEdge(teacher, graph.id, {
      source_node_id: nodeA.id, target_node_id: nodeB.id,
      relation_type: 'requires', weight: 1.0,
    });
    const edgeBC = addGraphEdge(teacher, graph.id, {
      source_node_id: nodeB.id, target_node_id: nodeC.id,
      relation_type: 'improves',
    });

    const nodes = listGraphNodes(teacher, graph.id);
    expect(nodes).toHaveLength(3);

    const edges = listGraphEdges(teacher, graph.id);
    expect(edges).toHaveLength(2);
    expect(edges[0]?.relation_type).toBe('requires');
  });

  it('getFullGraph retourne graphe + nœuds + arêtes', () => {
    const graph = createGraph(teacher, {label: 'Graphe Full', scope: 'personal'});
    addGraphNode(teacher, graph.id, {node_type: 'competency', label: 'Nœud unique'});

    const full = getFullGraph(teacher, graph.id);
    expect(full.graph.id).toBe(graph.id);
    expect(full.nodes.length).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(full.edges)).toBe(true);
  });

  it('ne révèle ni ne modifie le graphe privé d’un autre utilisateur', () => {
    const graph = createGraph(teacher, {label: 'Graphe privé', scope: 'personal'});
    expect(() => getFullGraph(student, graph.id)).toThrow('pedagogical_graph_not_found');
    expect(() =>
      addGraphNode(student, graph.id, {
        node_type: 'resource',
        label: 'Nœud intrus',
      }),
    ).toThrow('pedagogical_graph_not_found');
  });
});
