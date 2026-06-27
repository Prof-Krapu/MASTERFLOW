import type {SkillTreeNode, SkillTreeNodeDependency, CreateSkillTreeNodeRequest} from '@masterflow/shared';

import {
  getDb,
  type SkillTreeNodeRow,
  type SkillTreeNodeDependencyRow,
} from '../db/schema.ts';
import {audit} from '../lib/audit.ts';
import {uuid} from '../lib/uuid.ts';
import type {AuthUser} from '../middleware/auth.ts';

function toNodeDTO(row: SkillTreeNodeRow): SkillTreeNode {
  return {
    id: row.id,
    owner_id: row.owner_id,
    project_id: row.project_id,
    label: row.label,
    node_type: row.node_type,
    status: row.status,
    unlock_source: row.unlock_source,
    required_role: row.required_role,
    required_pack: row.required_pack,
    required_validation: row.required_validation,
    runtime_cost: row.runtime_cost,
    visible_to_user: row.visible_to_user,
    usable_by_user: row.usable_by_user,
    equipped: row.equipped,
    explanation: row.explanation,
    companion_family: row.companion_family,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toDepDTO(row: SkillTreeNodeDependencyRow): SkillTreeNodeDependency {
  return {
    node_id: row.node_id,
    depends_on_id: row.depends_on_id,
    dependency_type: row.dependency_type,
    created_at: row.created_at,
  };
}

export function listSkillTree(actor: AuthUser, projectId?: string): SkillTreeNode[] {
  let sql = 'SELECT * FROM skill_tree_nodes WHERE 1=1';
  const params: unknown[] = [];
  if (projectId) { sql += ' AND project_id = ?'; params.push(projectId); }
  sql += ' ORDER BY sort_order ASC, label ASC';
  return (getDb().prepare(sql).all(...params) as SkillTreeNodeRow[]).map(toNodeDTO);
}

export function getSkillTreeNode(nodeId: string): SkillTreeNode {
  const row = getDb().prepare('SELECT * FROM skill_tree_nodes WHERE id = ?').get(nodeId) as SkillTreeNodeRow | undefined;
  if (!row) throw new Error('skill_tree_node_not_found');
  return toNodeDTO(row);
}

export function createSkillTreeNode(actor: AuthUser, data: CreateSkillTreeNodeRequest & {project_id?: string | null}): SkillTreeNode {
  const id = uuid();
  const now = Date.now();
  getDb().prepare(`
    INSERT INTO skill_tree_nodes (id, owner_id, project_id, label, node_type, status, unlock_source, required_role, required_validation, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, actor.id, data.project_id ?? null, data.label, data.node_type, data.status ?? 'locked', data.unlock_source ?? null, data.required_role ?? null, 0, data.sort_order ?? 0, now, now);

  // Ajouter dépendance si parent_id fourni
  if (data.parent_id) {
    getDb().prepare(`
      INSERT INTO skill_tree_node_dependencies (node_id, depends_on_id, dependency_type, created_at)
      VALUES (?, ?, ?, ?)
    `).run(id, data.parent_id, data.dependency_type ?? 'requires', now);
  }

  audit({event_type: 'skill_tree_node.created', user_id: actor.id, detail: {node_id: id, label: data.label, node_type: data.node_type}});
  return getSkillTreeNode(id);
}

export function updateSkillTreeNodeStatus(actor: AuthUser, nodeId: string, status: SkillTreeNode['status']): SkillTreeNode {
  const node = getSkillTreeNode(nodeId);
  void node;
  const now = Date.now();
  getDb().prepare('UPDATE skill_tree_nodes SET status = ?, updated_at = ? WHERE id = ?').run(status, now, nodeId);
  audit({event_type: 'skill_tree_node.status_updated', user_id: actor.id, detail: {node_id: nodeId, status}});
  return getSkillTreeNode(nodeId);
}

export function getNodeDependencies(nodeId: string): {dependencies: SkillTreeNodeDependency[]; dependents: SkillTreeNodeDependency[]} {
  const dependencies = getDb().prepare('SELECT * FROM skill_tree_node_dependencies WHERE node_id = ?').all(nodeId) as SkillTreeNodeDependencyRow[];
  const dependents = getDb().prepare('SELECT * FROM skill_tree_node_dependencies WHERE depends_on_id = ?').all(nodeId) as SkillTreeNodeDependencyRow[];
  return {
    dependencies: dependencies.map(toDepDTO),
    dependents: dependents.map(toDepDTO),
  };
}

export function setNodeEquipped(actor: AuthUser, nodeId: string, equipped: boolean): SkillTreeNode {
  const node = getSkillTreeNode(nodeId);
  void node;
  const now = Date.now();
  getDb().prepare('UPDATE skill_tree_nodes SET equipped = ?, updated_at = ? WHERE id = ?').run(equipped ? 1 : 0, now, nodeId);
  audit({event_type: 'skill_tree_node.equipped', user_id: actor.id, detail: {node_id: nodeId, equipped}});
  return getSkillTreeNode(nodeId);
}
