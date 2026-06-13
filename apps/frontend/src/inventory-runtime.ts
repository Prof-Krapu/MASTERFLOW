import type {
  InventoryCollection,
  InventoryItem,
  InventoryItemStatus,
  InventoryItemType,
  ProjectMemberRole,
  Role,
} from '@masterflow/shared';

export type InventoryScopeMode = 'personal' | 'project';
export type InventoryView = 'catalog' | 'review' | 'collections' | 'needs';

export const INVENTORY_TYPE_LABELS: Record<InventoryItemType, string> = {
  book: 'Livre',
  comic: 'BD',
  manga: 'Manga',
  artbook: 'Artbook',
  art_supply: 'Materiel artistique',
  tool: 'Outil',
  gear: 'Equipement',
  software: 'Logiciel',
  product: 'Produit',
  archive: 'Archive',
  custom: 'Autre',
};

export const INVENTORY_STATUS_LABELS: Record<InventoryItemStatus, string> = {
  detected: 'Detecte',
  owned_confirmed: 'Possession confirmee',
  owned_declared: 'Possession declaree',
  wishlist: 'Souhaite',
  complete_declared: 'Ensemble complet declare',
  selective: 'Selection partielle',
  not_interested: 'Non retenu',
  abandoned: 'Abandonne',
  duplicate: 'Doublon',
  loan: 'Prete',
  sell_or_give: 'A ceder',
  to_verify: 'A verifier',
};

export function canManageProjectInventory(
  role: Role,
  projectRole: ProjectMemberRole | null,
): boolean {
  if (role === 'admin' || role === 'godmode') return true;
  return projectRole === 'editor' || projectRole === 'admin' || projectRole === 'owner';
}

export function inventoryCounts(items: InventoryItem[], collections: InventoryCollection[]): {
  validated: number;
  candidates: number;
  collections: number;
  declaredAvailable: number;
} {
  return {
    validated: items.filter((item) => item.validation_status === 'validated').length,
    candidates: items.filter((item) => item.validation_status === 'candidate').length,
    collections: collections.filter((collection) => collection.validation_status === 'validated').length,
    declaredAvailable: items.filter(
      (item) =>
        item.validation_status === 'validated' &&
        ['owned_confirmed', 'owned_declared', 'complete_declared'].includes(item.item_status),
    ).length,
  };
}

export function formatInventoryError(error: unknown): string {
  const code = error instanceof Error ? error.message : 'inventory_error';
  const labels: Record<string, string> = {
    inventory_scope_denied: 'Ce scope est en lecture seule pour votre role.',
    inventory_item_not_found: 'Item introuvable ou non autorise.',
    inventory_collection_not_found: 'Collection introuvable ou non autorisee.',
    inventory_item_not_validated: 'Validez cet item avant de l indexer.',
    inventory_item_not_shareable: 'Cet item ne peut pas etre partage dans ce scope.',
    invalid_body: 'Les informations saisies sont incompletes.',
    invalid_query: 'La recherche doit contenir au moins deux caracteres.',
  };
  return labels[code] ?? code;
}
