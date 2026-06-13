import {
  InventoryDiagnosticsSchema,
  type InventoryDiagnostics,
} from '@masterflow/shared';

import {getDb} from '../db/schema.ts';

function count(sql: string, ...params: unknown[]): number {
  const row = getDb().prepare(sql).get(...params) as {count: number};
  return row.count;
}

function validationCounts(table: 'inventory_items' | 'inventory_collections'): {
  candidate: number;
  validated: number;
  archived: number;
} {
  return {
    candidate: count(
      `SELECT COUNT(*) AS count FROM ${table} WHERE validation_status = 'candidate'`,
    ),
    validated: count(
      `SELECT COUNT(*) AS count FROM ${table} WHERE validation_status = 'validated'`,
    ),
    archived: count(
      `SELECT COUNT(*) AS count FROM ${table} WHERE validation_status = 'archived'`,
    ),
  };
}

export function getInventoryDiagnostics(): InventoryDiagnostics {
  const diagnostics: InventoryDiagnostics = {
    generated_at: Date.now(),
    totals: {
      items: count('SELECT COUNT(*) AS count FROM inventory_items'),
      collections: count('SELECT COUNT(*) AS count FROM inventory_collections'),
      collection_matches: count('SELECT COUNT(*) AS count FROM collection_matches'),
      project_needs: count('SELECT COUNT(*) AS count FROM inventory_project_needs'),
      active_rag_projections: count(
        `SELECT COUNT(*) AS count
           FROM rag_resources
          WHERE source_type = 'inventory_item'
            AND status = 'validated'
            AND revoked_at IS NULL`,
      ),
    },
    validation: {
      items: validationCounts('inventory_items'),
      collections: validationCounts('inventory_collections'),
    },
    scopes: {
      personal_items: count(
        "SELECT COUNT(*) AS count FROM inventory_items WHERE scope_type = 'user'",
      ),
      project_items: count(
        "SELECT COUNT(*) AS count FROM inventory_items WHERE scope_type = 'project'",
      ),
      personal_collections: count(
        "SELECT COUNT(*) AS count FROM inventory_collections WHERE scope_type = 'user'",
      ),
      project_collections: count(
        "SELECT COUNT(*) AS count FROM inventory_collections WHERE scope_type = 'project'",
      ),
    },
    workflow: {
      open_project_needs: count(
        "SELECT COUNT(*) AS count FROM inventory_project_needs WHERE status = 'open'",
      ),
      candidate_collection_matches: count(
        "SELECT COUNT(*) AS count FROM collection_matches WHERE match_status = 'candidate'",
      ),
      validated_project_items_without_rag: count(
        `SELECT COUNT(*) AS count
           FROM inventory_items item
          WHERE item.scope_type = 'project'
            AND item.visibility_scope = 'project'
            AND item.validation_status = 'validated'
            AND NOT EXISTS (
              SELECT 1
                FROM rag_resources rag
               WHERE rag.resource_id = 'inventory-item:' || item.id
                 AND rag.source_type = 'inventory_item'
                 AND rag.status = 'validated'
                 AND rag.revoked_at IS NULL
            )`,
      ),
      stale_rag_projections: count(
        `SELECT COUNT(DISTINCT rag.id) AS count
           FROM rag_resources rag
           LEFT JOIN rag_resource_chunks chunk ON chunk.resource_id = rag.id
          WHERE rag.source_type = 'inventory_item'
            AND (
              rag.status <> 'validated'
              OR rag.revoked_at IS NOT NULL
              OR chunk.status IN ('stale', 'revoked')
            )`,
      ),
    },
  };
  return InventoryDiagnosticsSchema.parse(diagnostics);
}
