import {describe, expect, it} from 'vitest';

import type {InventoryCollection, InventoryItem} from '@masterflow/shared';

import {
  canManageProjectInventory,
  formatInventoryError,
  inventoryCounts,
} from '../../frontend/src/inventory-runtime.ts';

const baseItem: InventoryItem = {
  item_id: 'item-1',
  owner_id: 'owner-1',
  project_id: null,
  collection_id: null,
  scope_type: 'user',
  type: 'tool',
  label: 'Item',
  creator_or_brand: null,
  item_status: 'owned_confirmed',
  validation_status: 'validated',
  intent: null,
  quantity: 1,
  condition: null,
  estimated_value: null,
  replacement_cost: null,
  usage_tags: [],
  source_refs: [],
  visibility_scope: 'private',
  created_at: 1,
  updated_at: 1,
  archived_at: null,
};

const baseCollection: InventoryCollection = {
  collection_id: 'collection-1',
  owner_id: 'owner-1',
  project_id: null,
  scope_type: 'user',
  label: 'Collection',
  description: null,
  visibility_scope: 'private',
  validation_status: 'validated',
  completion_state: 'unknown',
  created_at: 1,
  updated_at: 1,
};

describe('frontend Inventory runtime', () => {
  it('reserve l edition projet a editor+ ou admin global', () => {
    expect(canManageProjectInventory('student', 'participant')).toBe(false);
    expect(canManageProjectInventory('teacher', 'editor')).toBe(true);
    expect(canManageProjectInventory('teacher', 'owner')).toBe(true);
    expect(canManageProjectInventory('admin', null)).toBe(true);
    expect(canManageProjectInventory('godmode', null)).toBe(true);
  });

  it('compte separement les candidats, valides et disponibilites declarees', () => {
    const items: InventoryItem[] = [
      baseItem,
      {
        ...baseItem,
        item_id: 'item-2',
        item_status: 'detected',
        validation_status: 'candidate',
      },
      {
        ...baseItem,
        item_id: 'item-3',
        item_status: 'wishlist',
      },
    ];
    const collections: InventoryCollection[] = [
      baseCollection,
      {...baseCollection, collection_id: 'collection-2', validation_status: 'candidate'},
    ];

    expect(inventoryCounts(items, collections)).toEqual({
      validated: 2,
      candidates: 1,
      collections: 1,
      declaredAvailable: 1,
    });
  });

  it('traduit les refus backend utiles sans masquer les codes inconnus', () => {
    expect(formatInventoryError(new Error('inventory_scope_denied'))).toContain('lecture seule');
    expect(formatInventoryError(new Error('custom_failure'))).toBe('custom_failure');
  });
});
