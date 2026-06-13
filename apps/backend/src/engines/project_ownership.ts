import {TransferProjectOwnershipSchema, type Action} from '@masterflow/shared';

import type {AuthUser} from '../middleware/auth.ts';
import {transferProjectOwnership} from '../services/projects.ts';

/** Exécuteur de l'action sensible de transfert d'ownership projet. */
export function executeTransferProjectOwnership(
  actor: AuthUser,
  action: Action,
): Record<string, unknown> {
  const request = TransferProjectOwnershipSchema.parse(action.payload);
  const project = transferProjectOwnership(actor, request);
  return {
    project_id: project.project_id,
    previous_owner_id: action.user_id,
    new_owner_id: project.owner_id,
  };
}
