export type ResumeSurface = 'project' | 'teaching' | 'learn' | 'inventory' | 'masterbuild';

export type ResumeActivity = {
  version: 2;
  kind: 'surface' | 'project' | 'resource';
  surface: ResumeSurface;
  label: string;
  updatedAt: number;
  projectId?: string;
  resourceId?: string;
};

export type ResumeActivityInput = Omit<ResumeActivity, 'version' | 'updatedAt'>;

const MAX_RECENT_ACTIVITIES = 8;

function isResumeSurface(value: unknown): value is ResumeSurface {
  return value === 'project'
    || value === 'teaching'
    || value === 'learn'
    || value === 'inventory'
    || value === 'masterbuild';
}

function parseActivity(value: unknown): ResumeActivity | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (
    candidate['version'] !== 2
    || (candidate['kind'] !== 'surface' && candidate['kind'] !== 'project' && candidate['kind'] !== 'resource')
    || !isResumeSurface(candidate['surface'])
    || typeof candidate['label'] !== 'string'
    || typeof candidate['updatedAt'] !== 'number'
    || !Number.isFinite(candidate['updatedAt'])
  ) return null;
  const projectId = typeof candidate['projectId'] === 'string' ? candidate['projectId'] : undefined;
  const resourceId = typeof candidate['resourceId'] === 'string' ? candidate['resourceId'] : undefined;
  if ((candidate['kind'] === 'project' || candidate['kind'] === 'resource') && !projectId) return null;
  if (candidate['kind'] === 'resource' && !resourceId) return null;
  return {
    version: 2,
    kind: candidate['kind'],
    surface: candidate['surface'],
    label: candidate['label'].trim().slice(0, 160),
    updatedAt: candidate['updatedAt'] as number,
    ...(projectId ? {projectId} : {}),
    ...(resourceId ? {resourceId} : {}),
  };
}

function readLegacyProjectTarget(widgetState: Record<string, unknown> | null | undefined): ResumeActivity | null {
  const candidate = widgetState?.['resume_target'];
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null;
  const value = candidate as Record<string, unknown>;
  if (
    value['version'] !== 1
    || (value['kind'] !== 'project' && value['kind'] !== 'resource')
    || value['surface'] !== 'project'
    || typeof value['label'] !== 'string'
    || typeof value['projectId'] !== 'string'
  ) return null;
  const resourceId = typeof value['resourceId'] === 'string' ? value['resourceId'] : undefined;
  if (value['kind'] === 'resource' && !resourceId) return null;
  return {
    version: 2,
    kind: value['kind'],
    surface: 'project',
    label: value['label'].trim().slice(0, 160),
    projectId: value['projectId'],
    ...(resourceId ? {resourceId} : {}),
    updatedAt: 0,
  };
}

export function readResumeHistory(
  widgetState: Record<string, unknown> | null | undefined,
): ResumeActivity[] {
  const rawHistory = widgetState?.['resume_history'];
  if (rawHistory && typeof rawHistory === 'object' && !Array.isArray(rawHistory)) {
    const items = (rawHistory as Record<string, unknown>)['items'];
    if (Array.isArray(items)) {
      const parsed = items.map(parseActivity).filter((item): item is ResumeActivity => Boolean(item));
      if (parsed.length > 0) return parsed.sort((left, right) => right.updatedAt - left.updatedAt);
    }
  }
  const legacyTarget = readLegacyProjectTarget(widgetState);
  return legacyTarget ? [legacyTarget] : [];
}

function activityKey(activity: ResumeActivity): string {
  return [activity.kind, activity.surface, activity.projectId ?? '', activity.resourceId ?? '', activity.label].join(':');
}

export function appendResumeActivity(
  widgetState: Record<string, unknown> | null | undefined,
  input: ResumeActivityInput,
  updatedAt = Date.now(),
): Record<string, unknown> {
  const activity: ResumeActivity = {
    ...input,
    version: 2,
    label: input.label.trim().slice(0, 160),
    updatedAt,
  };
  const key = activityKey(activity);
  const items = [
    activity,
    ...readResumeHistory(widgetState).filter((item) => activityKey(item) !== key),
  ].slice(0, MAX_RECENT_ACTIVITIES);
  return {
    ...(widgetState ?? {}),
    resume_history: {version: 2, items},
  };
}

export function resumeActivityForMode(mode: string): ResumeActivityInput | null {
  if (mode === 'project') return {kind: 'surface', surface: 'project', label: 'Project'};
  if (mode === 'teaching') return {kind: 'surface', surface: 'teaching', label: 'Teaching'};
  if (mode === 'learning' || mode === 'learn') return {kind: 'surface', surface: 'learn', label: 'Learn'};
  if (mode === 'inventory') return {kind: 'surface', surface: 'inventory', label: 'Inventory'};
  if (mode === 'masterbuild') return {kind: 'surface', surface: 'masterbuild', label: 'MasterBuild'};
  return null;
}
