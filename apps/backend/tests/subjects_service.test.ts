import {beforeAll,describe,expect,it} from 'vitest';
import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {createSubject,createSubjectVersion,listSubjectVersions,listSubjects,validateSubjectVersion} from '../src/services/subjects.ts';
import {activateSubjectAssignment,createSubjectAssignment} from '../src/services/subjects.ts';
import {createCohort} from '../src/services/cohorts.ts';

const teacher:AuthUser={id:'subject-teacher',username:'subject_teacher',role:'teacher'};
const outsider:AuthUser={id:'subject-outsider',username:'subject_outsider',role:'godmode'};
const manifest={situation:'Une marque doit évoluer.',tension:'Visibilité contre cohérence.',mission:'Construire une campagne.',decision_to_make:'Choisir un territoire.',observable_deliverables:['Concept','Système'],proofs_of_understanding:['Justification sourcée'],progression_levels:['Diagnostic','Décision','Preuve'],resource_refs:[],correction_model_candidate_ref:null,deployment_state:'private_draft' as const};
beforeAll(async()=>{await seedAll();const now=Date.now(),q=getDb().prepare("INSERT OR IGNORE INTO users(id,username,display_name,password_hash,role,active,created_at,updated_at)VALUES(?,?,?,'x',?,1,?,?)");q.run(teacher.id,teacher.username,teacher.username,teacher.role,now,now);q.run(outsider.id,outsider.username,outsider.username,outsider.role,now,now);});
describe('bibliothèque de sujets versionnés R2.1',()=>{it('crée, versionne et dérive un assignment sans muter le sujet',()=>{const created=createSubject(teacher,{title:'Campagne responsable',manifest});expect(created.version.status).toBe('draft');expect(listSubjects(outsider)).toHaveLength(0);expect(validateSubjectVersion(teacher,created.version.version_id).status).toBe('validated');const cohort=createCohort(teacher,{title:'4CREA A'});const assignment=createSubjectAssignment(teacher,{cohort_id:cohort.cohort_id,source_subject_version_id:created.version.version_id,title:'Campagne — 4CREA A'});expect(assignment).toMatchObject({status:'draft',subject_snapshot:manifest});expect(activateSubjectAssignment(teacher,assignment.assignment_id).status).toBe('active');const v2=createSubjectVersion(teacher,created.template.template_id,{manifest:{...manifest,mission:'Construire une campagne V2.'}});expect(v2.version).toBe(2);expect(listSubjectVersions(teacher,created.template.template_id)).toHaveLength(2);expect(assignment.subject_snapshot.mission).toBe(manifest.mission);});});
