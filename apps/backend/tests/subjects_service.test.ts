import {beforeAll,describe,expect,it} from 'vitest';
import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {createSubject,createSubjectVersion,listSubjectVersions,listSubjects,validateSubjectVersion} from '../src/services/subjects.ts';
import {activateSubjectAssignment,createSubjectAssignment} from '../src/services/subjects.ts';
import {createCohort} from '../src/services/cohorts.ts';
import {
  listCorrectionSheetDrafts,
  syncCorrectionSheetDraft,
  updateCorrectionSheetDraft,
  validateCorrectionSheetDraft,
} from '../src/services/correction_sheets.ts';

const teacher:AuthUser={id:'subject-teacher',username:'subject_teacher',role:'teacher'};
const outsider:AuthUser={id:'subject-outsider',username:'subject_outsider',role:'godmode'};
const manifest={situation:'Une marque doit évoluer.',tension:'Visibilité contre cohérence.',mission:'Construire une campagne.',decision_to_make:'Choisir un territoire.',observable_deliverables:['Concept','Système'],proofs_of_understanding:['Justification sourcée'],progression_levels:['Diagnostic','Décision','Preuve'],objectives:['Argumenter une décision'],criteria:['Cohérence du système'],competencies:['Direction artistique'],bloom_level:'Évaluer',constraints:['Deux formats'],checkpoints:['Diagnostic validé'],evaluation_mode:'Formative',assistance_level:'Guidage léger',deadlines:['Vendredi 18h'],resource_refs:[],correction_model_candidate_ref:null,deployment_state:'private_draft' as const};
beforeAll(async()=>{await seedAll();const now=Date.now(),q=getDb().prepare("INSERT OR IGNORE INTO users(id,username,display_name,password_hash,role,active,created_at,updated_at)VALUES(?,?,?,'x',?,1,?,?)");q.run(teacher.id,teacher.username,teacher.username,teacher.role,now,now);q.run(outsider.id,outsider.username,outsider.username,outsider.role,now,now);});
describe('bibliothèque de sujets versionnés R2',()=>{
  it('crée l’assignment et sa fiche brouillon sans muter le sujet',()=>{
    const created=createSubject(teacher,{title:'Campagne responsable',manifest});
    expect(created.version.status).toBe('draft');
    expect(listSubjects(outsider)).toHaveLength(0);
    expect(validateSubjectVersion(teacher,created.version.version_id).status).toBe('validated');
    const cohort=createCohort(teacher,{title:'4CREA A'});
    const assignment=createSubjectAssignment(teacher,{cohort_id:cohort.cohort_id,source_subject_version_id:created.version.version_id,title:'Campagne — 4CREA A'});
    expect(assignment).toMatchObject({status:'draft',subject_snapshot:manifest});
    const [sheetV1]=listCorrectionSheetDrafts(teacher,assignment.assignment_id);
    expect(sheetV1).toMatchObject({version:1,status:'draft',sync_status:'synced'});
    expect(sheetV1?.derived_fields.mission).toBe(manifest.mission);
    expect(sheetV1?.derived_fields).toMatchObject({criteria:manifest.criteria,bloom_level:'Évaluer',evaluation_mode:'Formative'});
    expect(Object.keys(sheetV1??{})).not.toContain('grade');
    expect(()=>listCorrectionSheetDrafts(outsider,assignment.assignment_id)).toThrow('correction_sheet_not_found');
    expect(activateSubjectAssignment(teacher,assignment.assignment_id).status).toBe('active');

    const updated=updateCorrectionSheetDraft(teacher,sheetV1?.correction_sheet_id??'',{
      teacher_fields:{evaluation_mode:'Évaluation formative',deadline:'Vendredi 18h'},
      locked_teacher_fields:['evaluation_mode'],
    });
    expect(updated.locked_teacher_fields).toEqual(['evaluation_mode']);
    const v2=createSubjectVersion(teacher,created.template.template_id,{manifest:{...manifest,mission:'Construire une campagne V2.'}});
    expect(v2.version).toBe(2);
    expect(validateSubjectVersion(teacher,v2.version_id).status).toBe('validated');
    const sheetV2=syncCorrectionSheetDraft(teacher,updated.correction_sheet_id,{source_subject_version_id:v2.version_id});
    expect(sheetV2).toMatchObject({version:2,sync_status:'needs_teacher_review',status:'draft'});
    expect(sheetV2.changed_fields).toEqual(['mission']);
    expect(sheetV2.derived_fields.mission).toBe('Construire une campagne V2.');
    expect(sheetV2.teacher_fields.evaluation_mode).toBe('Évaluation formative');
    expect(sheetV2.locked_teacher_fields).toEqual(['evaluation_mode']);
    expect(validateCorrectionSheetDraft(teacher,sheetV2.correction_sheet_id,{validation_ref:'teacher://review/r2-3'})).toMatchObject({status:'validated',sync_status:'synced'});
    expect(listSubjectVersions(teacher,created.template.template_id)).toHaveLength(2);
    expect(assignment.subject_snapshot.mission).toBe(manifest.mission);
  });
});
