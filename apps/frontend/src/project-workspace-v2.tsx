import {ArrowLeft, ArrowUpRight, Clock3, FolderPlus, LockKeyhole, UsersRound} from 'lucide-react';
import type {FormEvent, ReactElement} from 'react';

import type {Project, ProjectMember, ProjectMemberRole, Resource, RoomCheckpoint} from '@masterflow/shared';

export type ProjectWorkspaceV2Status = 'idle' | 'loading' | 'creating' | 'ready' | 'attaching' | 'synced' | 'error';

type ProjectWorkspaceV2Props = {
  attachableResources: Resource[];
  canAttachResource: boolean;
  canCreateProject: boolean;
  checkpoint: RoomCheckpoint | null;
  createName: string;
  memberRole: ProjectMemberRole | null;
  members: ProjectMember[];
  onAttachResource: () => void;
  onBackHome: () => void;
  onCreateNameChange: (value: string) => void;
  onCreateProject: (event: FormEvent<HTMLFormElement>) => void;
  onProjectChange: (projectId: string) => void;
  onResourceChange: (resourceId: string) => void;
  onResourceOpen: (resource: Resource) => void;
  project: Project | null;
  projects: Project[];
  resources: Resource[];
  selectedProjectId: string;
  selectedResourceId: string;
  status: ProjectWorkspaceV2Status;
  statusMessage: string;
};

const roleLabels: Record<ProjectMemberRole, string> = {
  viewer: 'Lecture',
  participant: 'Participant',
  editor: 'Édition',
  owner: 'Propriétaire',
  admin: 'Administration',
};

const statusLabels: Record<ProjectWorkspaceV2Status, string> = {
  idle: 'À démarrer',
  loading: 'Chargement',
  creating: 'Création en cours',
  ready: 'Prêt',
  attaching: 'Ajout en cours',
  synced: 'À jour',
  error: 'Indisponible',
};

const formatDate = (timestamp: number): string => new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(new Date(timestamp));

const buildRoleSummary = (members: ProjectMember[]): Array<{label: string; count: number}> => {
  const counts = new Map<ProjectMemberRole, number>();
  for (const member of members) counts.set(member.role, (counts.get(member.role) ?? 0) + 1);
  return (Object.entries(roleLabels) as Array<[ProjectMemberRole, string]>)
    .map(([role, label]) => ({label, count: counts.get(role) ?? 0}))
    .filter((item) => item.count > 0);
};

/**
 * Hub de situation Project V2.
 *
 * La page ne déduit aucun droit et n'invente aucun progrès. Les données et permissions
 * sont fournies par l'orchestrateur runtime ou par une fixture explicite du Component Lab.
 */
export function ProjectWorkspaceV2({
  attachableResources,
  canAttachResource,
  canCreateProject,
  checkpoint,
  createName,
  memberRole,
  members,
  onAttachResource,
  onBackHome,
  onCreateNameChange,
  onCreateProject,
  onProjectChange,
  onResourceChange,
  onResourceOpen,
  project,
  projects,
  resources,
  selectedProjectId,
  selectedResourceId,
  status,
  statusMessage,
}: ProjectWorkspaceV2Props): ReactElement {
  const archived = project?.status === 'archived';
  const readOnly = archived || !canAttachResource;
  const busy = status === 'loading' || status === 'creating' || status === 'attaching';
  const latestResource = resources[0] ?? null;
  const projectCheckpoint = checkpoint && project && checkpoint.project_id === project.project_id && checkpoint.active_mode === 'project'
    ? checkpoint
    : null;
  const roleSummary = buildRoleSummary(members);
  const pageState = status === 'error'
    ? 'error'
    : status === 'loading' || status === 'creating' || status === 'attaching'
      ? 'loading'
      : !project
        ? canCreateProject ? 'empty' : 'forbidden'
        : archived
          ? 'read-only'
          : resources.length === 0
            ? 'partial'
            : 'ready';
  const visibleStatusLabel = pageState === 'forbidden'
    ? 'Interdit'
    : pageState === 'read-only'
      ? 'Lecture seule'
      : pageState === 'partial' && status === 'ready'
        ? 'Partiel'
        : pageState === 'empty' && status === 'idle'
          ? 'Vide'
          : statusLabels[status];

  const renderPrimaryAction = (): ReactElement => {
    if (!project && canCreateProject) {
      return (
        <form className="project-v2__create" onSubmit={onCreateProject}>
          <label htmlFor="project-v2-name">Nom du projet</label>
          <div>
            <input
              autoComplete="off"
              id="project-v2-name"
              maxLength={160}
              onChange={(event) => onCreateNameChange(event.target.value)}
              placeholder="Ex. Campagne de fin d’année"
              required
              type="text"
              value={createName}
            />
            <button disabled={busy || createName.trim().length === 0} type="submit">
              <FolderPlus aria-hidden="true" size={18} />
              {status === 'creating' ? 'Création…' : 'Créer le projet'}
            </button>
          </div>
        </form>
      );
    }

    if (project && !archived && canAttachResource && attachableResources.length > 0) {
      return (
        <div className="project-v2__attach">
          <label htmlFor="project-v2-resource">{resources.length > 0 ? 'Ajouter une autre source' : 'Source validée disponible'}</label>
          <div>
            <select
              id="project-v2-resource"
              onChange={(event) => onResourceChange(event.target.value)}
              value={selectedResourceId}
            >
              <option value="">Choisir une source</option>
              {attachableResources.map((resource) => (
                <option key={resource.id} value={resource.id}>{resource.title}</option>
              ))}
            </select>
            <button
              disabled={busy || selectedResourceId.length === 0}
              onClick={onAttachResource}
              type="button"
            >
              {resources.length > 0 ? 'Ajouter au projet' : 'Ajouter la source'}
            </button>
          </div>
        </div>
      );
    }

    if (latestResource) {
      return latestResource.url ? (
        <a
          className="project-v2__primary-link"
          href={latestResource.url}
          onClick={() => onResourceOpen(latestResource)}
          rel="noreferrer"
          target="_blank"
        >
          <span>
            <small>{readOnly ? 'Consulter les ressources' : 'Ouvrir la dernière source'}</small>
            <strong>{latestResource.title}</strong>
          </span>
          <ArrowUpRight aria-hidden="true" size={20} />
        </a>
      ) : (
        <a className="project-v2__primary-link" href="#project-v2-resources" onClick={() => onResourceOpen(latestResource)}>
          <span>
            <small>Consulter les ressources</small>
            <strong>{latestResource.title}</strong>
          </span>
          <ArrowUpRight aria-hidden="true" size={20} />
        </a>
      );
    }

    return (
      <button className="project-v2__back" onClick={onBackHome} type="button">
        <ArrowLeft aria-hidden="true" size={18} /> Retour à Home
      </button>
    );
  };

  return (
    <article className={`project-v2 project-v2--${pageState}`} data-ui-artifact="page.project">
      <header className="project-v2__header">
        <div>
          <p className="eyebrow">Project · situation vivante</p>
          <h1>{project?.name ?? 'Vos projets'}</h1>
          <p>{project
            ? 'Le contexte, la matière disponible et la prochaine action utile — sans progrès inventé.'
            : canCreateProject
              ? 'Créez un espace privé pour rassembler les personnes et les sources utiles.'
              : 'Aucun projet ne vous est actuellement assigné.'}</p>
        </div>
        {projects.length > 0 ? (
          <label className="project-v2__selector" htmlFor="project-v2-select">
            Projet actif
            <select id="project-v2-select" onChange={(event) => onProjectChange(event.target.value)} value={selectedProjectId}>
              {projects.map((item) => <option key={item.project_id} value={item.project_id}>{item.name}</option>)}
            </select>
          </label>
        ) : null}
      </header>

      <div className="project-v2__meta" aria-label="Informations du projet">
        <span>{memberRole ? roleLabels[memberRole] : canCreateProject ? 'Créateur autorisé' : 'Aucune affectation'}</span>
        <span><LockKeyhole aria-hidden="true" size={14} /> {project ? 'Privé' : 'Accès contrôlé'}</span>
        {project ? <span><Clock3 aria-hidden="true" size={14} /> Mis à jour {formatDate(project.updated_at)}</span> : null}
        {archived ? <strong>Archivé · lecture seule</strong> : null}
      </div>

      <section className="project-v2__now" aria-labelledby="project-v2-now-title">
        <div>
          <p className="eyebrow">Maintenant</p>
          <h2 id="project-v2-now-title">{project
            ? archived
              ? 'Ce projet reste consultable.'
              : resources.length > 0
                ? 'La matière du projet est prête à être reprise.'
                : 'Le projet existe, mais aucune source n’est encore partagée.'
            : canCreateProject
              ? 'Commencez par un projet clair.'
              : 'Project n’est pas disponible pour ce compte.'}</h2>
          <p className="project-v2__status" role="status">
            <strong>{visibleStatusLabel}</strong>
            <span>{statusMessage}</span>
          </p>
        </div>
        <div className="project-v2__primary">{renderPrimaryAction()}</div>
      </section>

      {projectCheckpoint ? (
        <section className="project-v2__resume" aria-labelledby="project-v2-resume-title">
          <Clock3 aria-hidden="true" size={20} />
          <div>
            <p className="eyebrow">À reprendre</p>
            <h2 id="project-v2-resume-title">{projectCheckpoint.summary}</h2>
            {projectCheckpoint.next_recommended_action ? <p>{projectCheckpoint.next_recommended_action}</p> : null}
            <small>Checkpoint réel · {formatDate(projectCheckpoint.created_at)}</small>
          </div>
        </section>
      ) : null}

      {project ? (
        <div className="project-v2__content">
          <section id="project-v2-resources" className="project-v2__matter" aria-labelledby="project-v2-resources-title">
            <header>
              <div>
                <p className="eyebrow">Matière du projet</p>
                <h2 id="project-v2-resources-title">Ressources validées</h2>
              </div>
              <span>{resources.length}</span>
            </header>
            {resources.length > 0 ? (
              <div className="project-v2__resources">
                {resources.map((resource) => {
                  const content = (
                    <>
                      <span><strong>Validée</strong><small>{resource.type}</small></span>
                      <h3>{resource.title}</h3>
                      <p>Provenance : {resource.source}</p>
                    </>
                  );
                  return resource.url ? (
                    <a href={resource.url} key={resource.id} rel="noreferrer" target="_blank">{content}</a>
                  ) : <article key={resource.id}>{content}</article>;
                })}
              </div>
            ) : (
              <div className="project-v2__empty">
                <strong>Aucune ressource partagée</strong>
                <p>{canAttachResource
                  ? attachableResources.length > 0
                    ? 'Utilisez l’action principale pour ajouter une source déjà validée.'
                    : 'Aucune autre source validée n’est disponible pour le moment.'
                  : 'Vous pouvez consulter ce projet, mais pas y ajouter de source.'}</p>
              </div>
            )}
          </section>

          <aside className="project-v2__team" aria-labelledby="project-v2-team-title">
            <header>
              <UsersRound aria-hidden="true" size={20} />
              <div><p className="eyebrow">Équipe</p><h2 id="project-v2-team-title">{members.length} membre{members.length > 1 ? 's' : ''}</h2></div>
            </header>
            {roleSummary.length > 0 ? (
              <dl>{roleSummary.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.count}</dd></div>)}</dl>
            ) : <p>Aucune répartition de rôle disponible.</p>}
            <small>Les identifiants techniques ne sont jamais exposés ici.</small>
          </aside>
        </div>
      ) : !canCreateProject ? (
        <section className="project-v2__forbidden" role="alert">
          <strong>Accès Project indisponible</strong>
          <p>Ce compte n’a aucune affectation projet. L’action principale permet de revenir à Home.</p>
        </section>
      ) : null}
    </article>
  );
}
