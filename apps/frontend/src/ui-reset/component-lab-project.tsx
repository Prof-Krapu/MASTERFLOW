import {useState} from 'react';
import type {ReactElement} from 'react';

import type {Project, ProjectMember, Resource, RoomCheckpoint} from '@masterflow/shared';

import {ProjectWorkspaceV2} from '../project-workspace-v2';

type ProjectScenarioId = 'godmode-empty' | 'teacher-ready' | 'student-assigned' | 'student-forbidden' | 'archived-read-only';

const project: Project = {
  project_id: 'project-lab-001', owner_id: 'owner-lab', name: 'Identité de lancement', status: 'active', visibility: 'private',
  created_at: Date.UTC(2026, 6, 28, 9, 0), updated_at: Date.UTC(2026, 7, 5, 9, 35),
};
const archivedProject: Project = {...project, project_id: 'project-lab-archived', name: 'Archive festival 2025', status: 'archived'};
const members: ProjectMember[] = [
  {project_id: project.project_id, user_id: 'owner-lab', role: 'owner', created_at: project.created_at},
  {project_id: project.project_id, user_id: 'editor-lab', role: 'editor', created_at: project.created_at},
  {project_id: project.project_id, user_id: 'student-lab-1', role: 'participant', created_at: project.created_at},
];
const resources: Resource[] = [
  {id: 'resource-lab-001', title: 'Socle de marque validé', type: 'document', source: 'Resource Truth', status: 'validated', subjects: ['identité'], url: null},
  {id: 'resource-lab-002', title: 'Étude terrain équipe', type: 'research', source: 'Projet · entretien validé', status: 'validated', subjects: ['équipe'], url: null},
];
const attachableResources: Resource[] = [
  {id: 'resource-lab-003', title: 'Références de lancement', type: 'collection', source: 'Resource Truth', status: 'validated', subjects: ['lancement'], url: null},
];
const checkpoint: RoomCheckpoint = {
  checkpoint_id: 'checkpoint-lab-project', room_id: 'room-lab', room_instance_id: 'room-instance-lab', user_id: 'owner-lab', project_id: project.project_id,
  privacy_scope: 'private', reason: 'stable_activity', summary: 'Reprendre la sélection des sources de lancement.', active_widgets: [], active_mode: 'project',
  decisions: [], open_loops: ['Choisir la prochaine source'], media_queue_refs: [], asset_queue_refs: [], resource_refs: ['resource-lab-001'],
  next_recommended_action: 'Relire le socle de marque avant d’ajouter une nouvelle source.', rollback_light_possible: true, created_at: Date.UTC(2026, 7, 5, 9, 20),
};
const labels: Record<ProjectScenarioId, string> = {
  'godmode-empty': 'GodMode · vide créable',
  'teacher-ready': 'Professeur · prêt',
  'student-assigned': 'Étudiant · affecté',
  'student-forbidden': 'Étudiant · interdit',
  'archived-read-only': 'Projet archivé · lecture seule',
};

export function ComponentLabProject(): ReactElement {
  const [scenarioId, setScenarioId] = useState<ProjectScenarioId>('teacher-ready');
  const [projectName, setProjectName] = useState('');
  const [resourceId, setResourceId] = useState('');
  const student = scenarioId === 'student-assigned';
  const forbidden = scenarioId === 'student-forbidden';
  const empty = scenarioId === 'godmode-empty';
  const archived = scenarioId === 'archived-read-only';
  const selectedProject = empty || forbidden ? null : archived ? archivedProject : project;
  const selectedMembers = selectedProject
    ? members.map((member) => ({...member, project_id: selectedProject.project_id}))
    : [];
  return (
    <section className="ui-lab-project">
      <label><span>Scénario Project</span><select onChange={(event) => setScenarioId(event.target.value as ProjectScenarioId)} value={scenarioId}>{Object.entries(labels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      <ProjectWorkspaceV2
        attachableResources={attachableResources}
        canAttachResource={!student && !forbidden && !archived && !empty}
        canCreateProject={!student && !forbidden}
        checkpoint={scenarioId === 'teacher-ready' ? checkpoint : null}
        createName={projectName}
        memberRole={forbidden || empty ? null : student ? 'participant' : archived ? 'viewer' : 'owner'}
        members={selectedMembers}
        onAttachResource={() => undefined}
        onBackHome={() => undefined}
        onCreateNameChange={setProjectName}
        onCreateProject={(event) => event.preventDefault()}
        onProjectChange={() => undefined}
        onResourceOpen={() => undefined}
        onResourceChange={setResourceId}
        project={selectedProject}
        projects={selectedProject ? [selectedProject] : []}
        resources={selectedProject ? resources : []}
        selectedProjectId={selectedProject?.project_id ?? ''}
        selectedResourceId={resourceId}
        status="ready"
        statusMessage="Fixture locale · aucune action backend"
      />
    </section>
  );
}
