import {createServer, type Server} from 'node:http';
import express from 'express';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';
import {D12ReleaseReceiptSchema} from '@masterflow/shared';
import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import {signToken} from '../src/middleware/auth.ts';
import {createDiagnosticsRouter} from '../src/routers/diagnostics.ts';

let server: Server; let base = ''; let adminToken = ''; let teacherToken = '';
beforeAll(async()=>{await seedAll();const now=Date.now();const insert=getDb().prepare("INSERT OR IGNORE INTO users(id,username,display_name,password_hash,role,active,created_at,updated_at)VALUES(?,?,?,'x',?,1,?,?)");insert.run('receipt-admin','receipt-admin','Receipt Admin','admin',now,now);insert.run('receipt-teacher','receipt-teacher','Receipt Teacher','teacher',now,now);adminToken=signToken({id:'receipt-admin',username:'receipt-admin',role:'admin'});teacherToken=signToken({id:'receipt-teacher',username:'receipt-teacher',role:'teacher'});const app=express();app.use(express.json());app.use('/api/v1',createDiagnosticsRouter());server=createServer(app);await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address();if(!address||typeof address==='string')throw new Error('adresse illisible');base=`http://127.0.0.1:${address.port}/api/v1`;});
afterAll(async()=>{await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));});
const auth=(token:string)=>({Authorization:`Bearer ${token}`,'Content-Type':'application/json'});
const body={commit_sha:'f4a8cb96cb49ce3d602ea1e66b6731615b1c919e',environment_label:'local-receipt-test',components:['backend','frontend'],evidence_refs:[],observed_at:Date.now(),note:'Déclaration de test, pas une preuve live.'};

describe('D12 release receipts',()=>{
  it('reste privé admin/godmode',async()=>{expect((await fetch(`${base}/diagnostics/d12/release-receipts`)).status).toBe(401);expect((await fetch(`${base}/diagnostics/d12/release-receipts`,{headers:auth(teacherToken)})).status).toBe(403);});
  it('enregistre sans déployer et reste unknown sans preuve',async()=>{const before={actions:(getDb().prepare('SELECT COUNT(*) count FROM actions').get()as{count:number}).count,jobs:(getDb().prepare('SELECT COUNT(*) count FROM jobs').get()as{count:number}).count};const response=await fetch(`${base}/diagnostics/d12/release-receipts`,{method:'POST',headers:auth(adminToken),body:JSON.stringify(body)});expect(response.status).toBe(201);expect(D12ReleaseReceiptSchema.parse(await response.json())).toMatchObject({commit_sha:body.commit_sha,proof_state:'unknown',runtime_status:'not_verified'});const after={actions:(getDb().prepare('SELECT COUNT(*) count FROM actions').get()as{count:number}).count,jobs:(getDb().prepare('SELECT COUNT(*) count FROM jobs').get()as{count:number}).count};expect(after).toEqual(before);});
  it('distingue preuve attachée et vérification runtime',async()=>{const response=await fetch(`${base}/diagnostics/d12/release-receipts`,{method:'POST',headers:auth(adminToken),body:JSON.stringify({...body,evidence_refs:['github://Prof-Krapu/MASTERFLOW/commit/f4a8cb9']})});expect(response.status).toBe(201);expect(D12ReleaseReceiptSchema.parse(await response.json())).toMatchObject({proof_state:'evidence_attached',runtime_status:'not_verified'});const list=await fetch(`${base}/diagnostics/d12/release-receipts`,{headers:auth(adminToken)});expect(list.status).toBe(200);expect((await list.json()as unknown[]).length).toBeGreaterThanOrEqual(2);});
  it('refuse un SHA ambigu',async()=>{const response=await fetch(`${base}/diagnostics/d12/release-receipts`,{method:'POST',headers:auth(adminToken),body:JSON.stringify({...body,commit_sha:'f4a8cb9'})});expect(response.status).toBe(400);});
});
