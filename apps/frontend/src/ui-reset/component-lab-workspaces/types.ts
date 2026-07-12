import type {PrototypeProfileId} from '../prototype-profile-registry';

export type ComponentLabWorkspaceId = 'malex' | 'vincent';

export interface ComponentLabWorkspaceDefinition {
  defaultProfileId: PrototypeProfileId;
  id: ComponentLabWorkspaceId;
  label: string;
  owner: string;
}
