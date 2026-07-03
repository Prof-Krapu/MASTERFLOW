import {malexLabWorkspace} from './malex';
import type {ComponentLabWorkspaceDefinition, ComponentLabWorkspaceId} from './types';
import {vincentLabWorkspace} from './vincent';

export type {ComponentLabWorkspaceId} from './types';

export const componentLabWorkspaces: Record<ComponentLabWorkspaceId, ComponentLabWorkspaceDefinition> = {
  malex: malexLabWorkspace,
  vincent: vincentLabWorkspace,
};
