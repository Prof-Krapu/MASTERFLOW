import type {PedagogicalGraph, PedagogicalGraphNode, PedagogicalGraphEdge} from '@masterflow/shared';

import {
  getDb,
  type PedagogicalGraphRow,
  type PedagogicalGraphNodeRow,
  type PedagogicalGraphEdgeRow,
} from '../db/schema.ts';
import {audit} from '../lib/audit.ts';
import {uuid} from '../lib/uuid.ts';
import type {AuthUser} from '../middleware/auth.ts';

function toGraphDTO(row: PedagogicalGraphRow): PedagogicalGraph {
  return {
    id: row.id,
    owner_id: row.owner_id,
    project_id: row.project_id,
    label: row.label,
    description: row.description,
    scope: row.scope,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toNodeDTO(row: PedagogicalGraphNodeRow): PedagogicalGraphNode {
  return {
    id: row.id,
    graph_id: row.graph_id,
    node_type: row.node_type,
    label: row.label,
    ref_type: row.ref_type,
    ref_id: row.ref_id,
    metadata_json: row.metadata_json,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toEdgeDTO(row: PedagogicalGraphEdgeRow): PedagogicalGraphEdge {
  return {
    id: row.id,
    graph_id: row.graph_id,
    source_node_id: row.source_node_id,
    target_node_id: row.target_node_id,
    relation_type: row.relation_type,
    weight: row.weight,
    metadata_json: row.metadata_json,
    created_at: row.created_at,
  };
}

export function listGraphs(actor: AuthUser, projectId?: string): PedagogicalGraph[] {
  let sql = 'SELECT * FROM pedagogical_graphs WHERE owner_id = ?';
  const params: unknown[] = [actor.id];
  if (projectId) { sql += ' AND project_id = ?'; params.push(projectId); }
  sql += ' ORDER BY label ASC';
  return (getDb().prepare(sql).all(...params) as PedagogicalGraphRow[]).map(toGraphDTO);
}

export function getGraph(graphId: string): PedagogicalGraph {
  const row = getDb().prepare('SELECT * FROM pedagogical_graphs WHERE id = ?').get(graphId) as PedagogicalGraphRow | undefined;
  if (!row) throw new Error('pedagogical_graph_not_found');
  return toGraphDTO(row);
}

export function createGraph(
  actor: AuthUser,
  data: {
    label: string;
    description?: string;
    scope?: PedagogicalGraph['scope'];
    project_id?: string | null;
  },
): PedagogicalGraph {
  const id = uuid();
  const now = Date.now();
  getDb().prepare(`
    INSERT INTO pedagogical_graphs (id, owner_id, project_id, label, description, scope, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, actor.id, data.project_id ?? null, data.label, data.description ?? null, data.scope ?? 'general', now, now);
  audit({event_type: 'pedagogical_graph.created', user_id: actor.id, detail: {graph_id: id, label: data.label}});
  return getGraph(id);
}

export function addGraphNode(
  actor: AuthUser,
  graphId: string,
  data: {
    node_type: PedagogicalGraphNode['node_type'];
    label: string;
    ref_type?: string | null;
    ref_id?: string | null;
    metadata_json?: string;
    sort_order?: number;
  },
): PedagogicalGraphNode {
  const graph = getGraph(graphId);
  void graph;
  const id = uuid();
  const now = Date.now();
  getDb().prepare(`
    INSERT INTO pedagogical_graph_nodes (id, graph_id, node_type, label, ref_type, ref_id, metadata_json, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, graphId, data.node_type, data.label, data.ref_type ?? null, data.ref_id ?? null, data.metadata_json ?? '{}', data.sort_order ?? 0, now, now);
  audit({event_type: 'pedagogical_graph_node.created', user_id: actor.id, detail: {graph_id: graphId, node_id: id, label: data.label}});
  return getGraphNode(id);
}

export function getGraphNode(nodeId: string): PedagogicalGraphNode {
  const row = getDb().prepare('SELECT * FROM pedagogical_graph_nodes WHERE id = ?').get(nodeId) as PedagogicalGraphNodeRow | undefined;
  if (!row) throw new Error('pedagogical_graph_node_not_found');
  return toNodeDTO(row);
}

export function listGraphNodes(graphId: string): PedagogicalGraphNode[] {
  return (getDb().prepare('SELECT * FROM pedagogical_graph_nodes WHERE graph_id = ? ORDER BY sort_order ASC').all(graphId) as PedagogicalGraphNodeRow[]).map(toNodeDTO);
}

export function addGraphEdge(
  actor: AuthUser,
  graphId: string,
  data: {
    source_node_id: string;
    target_node_id: string;
    relation_type: PedagogicalGraphEdge['relation_type'];
    weight?: number | null;
    metadata_json?: string;
  },
): PedagogicalGraphEdge {
  // Vérifier que les nœuds existent dans ce graphe
  getGraphNode(data.source_node_id);
  getGraphNode(data.target_node_id);
  const graph = getGraph(graphId);
  void graph;

  const id = uuid();
  const now = Date.now();
  getDb().prepare(`
    INSERT INTO pedagogical_graph_edges (id, graph_id, source_node_id, target_node_id, relation_type, weight, metadata_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, graphId, data.source_node_id, data.target_node_id, data.relation_type, data.weight ?? null, data.metadata_json ?? '{}', now);
  audit({event_type: 'pedagogical_graph_edge.created', user_id: actor.id, detail: {graph_id: graphId, edge_id: id, relation_type: data.relation_type}});

  return toEdgeDTO(getDb().prepare('SELECT * FROM pedagogical_graph_edges WHERE id = ?').get(id) as PedagogicalGraphEdgeRow);
}

export function listGraphEdges(graphId: string): PedagogicalGraphEdge[] {
  return (getDb().prepare('SELECT * FROM pedagogical_graph_edges WHERE graph_id = ?').all(graphId) as PedagogicalGraphEdgeRow[]).map(toEdgeDTO);
}

export function getFullGraph(graphId: string): {graph: PedagogicalGraph; nodes: PedagogicalGraphNode[]; edges: PedagogicalGraphEdge[]} {
  return {
    graph: getGraph(graphId),
    nodes: listGraphNodes(graphId),
    edges: listGraphEdges(graphId),
  };
}
