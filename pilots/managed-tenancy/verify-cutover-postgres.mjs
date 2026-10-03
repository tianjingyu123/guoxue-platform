import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {randomBytes,createHash} from 'node:crypto';
import {loadCandidatePrisma} from '../../scripts/ops/prisma-candidate/client.mjs';
import {ManagedPostgresHarness,runtime,repo} from './postgres-harness.mjs';
const require=createRequire(resolve(repo,'apps/server/package.json'));
const {ManagedLeaseMaintenanceService}=require(resolve(repo,'apps/server/src/modules/managed-tenancy/managed-lease-maintenance.service.ts'));
const {ManagedLeaseRuntime}=require(resolve(repo,'apps/server/src/modules/managed-tenancy/managed-lease.runtime.ts'));
const {managedFenceStateSql,managedFenceInstallSql}=require(resolve(repo,'apps/server/src/modules/managed-tenancy/managed-write-fence.ts'));
const {managedLeaseGrantSql}=require(resolve(repo,'apps/server/src/modules/managed-tenancy/managed-lease-permissions.ts'));
const {managedOrderPolicySql}=require(resolve(repo,'apps/server/src/modules/managed-tenancy/managed-order-policy.ts'));
const {PrismaClient}=loadCandidatePrisma();
const h=new ManagedPostgresHarness('cutover'),maintenance=new ManagedLeaseMaintenanceService(h.control),dir=resolve(runtime,h.tag);mkdirSync(dir,{recursive:true});
let failure,app,original,originalRevision;const clients=[],bindings=[],createdTargets=[],newCredentials={...h.refs};
const checkpoint=phase=>writeFileSync(resolve(dir,'checkpoint.json'),JSON.stringify({phase,original,originalRevision,createdTargets,completedBindings:bindings.map(row=>({binding:row.binding,backupSha256:row.backupSha256}))}),{mode:0o600});
const rootPassword=readFileSync(resolve(runtime,'postgres/synthetic-password.txt'),'utf8').trim(),tools='C:/Program Files/PostgreSQL/16/bin/';
const sql=(database,statement)=>{
  if(database!=='postgres'&&database!=='mt_customer_a'&&!/^mt_(cutover|rollback)_\d+$/.test(database))throw new Error('仅允许本任务迁移演练数据库');
  const args=['-X','-h','127.0.0.1','-p','55467','-U','mt_admin','-d',database,'-v','ON_ERROR_STOP=1','-At'];
  const run=input=>execFileSync(tools+'psql.exe',args,{input,env:{...process.env,PGPASSWORD:rootPassword},encoding:'utf8',stdio:['pipe','pipe','pipe'],timeout:65000});
  assert.equal(run("SELECT current_database()||':'||current_user||':'||inet_server_port()::text;").trim(),database+':mt_admin:55467');return run(statement).trim();
};
const client=credential=>{const db=new PrismaClient({datasources:{db:{url:credential.databaseUrl}}});clients.push(db);return db;};
const freeze=database=>{const row=JSON.parse(sql(database,'SELECT row_to_json(t) FROM "ManagedLeaseWriteFence" t;'));sql(database,managedFenceStateSql(app.customerId,'FROZEN',row.epoch));};
async function restoreNew(source,kind){
  const name='mt_'+kind+'_'+Date.now(),role=name+'_runtime',password=randomBytes(32).toString('hex'),key=randomBytes(32).toString('hex');
  assert.equal(JSON.parse(sql(source,'SELECT row_to_json(t) FROM "ManagedLeaseWriteFence" t;')).state,'FROZEN');
  const backup=resolve(dir,name+'.dump');execFileSync(tools+'pg_dump.exe',['-h','127.0.0.1','-p','55467','-U','mt_admin','-d',source,'--format=custom','--no-owner','--no-acl','--file',backup],{env:{...process.env,PGPASSWORD:rootPassword},stdio:['ignore','pipe','pipe'],timeout:90000});
  const backupSha256=createHash('sha256').update(readFileSync(backup)).digest('hex');
  sql('postgres',`CREATE DATABASE ${name} OWNER mt_admin;`);createdTargets.push(name);checkpoint('CREATED_'+kind);
  sql('postgres',`CREATE ROLE ${role} LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION; REVOKE ALL ON DATABASE ${name} FROM PUBLIC; GRANT CONNECT ON DATABASE ${name} TO ${role};`);
  execFileSync(tools+'pg_restore.exe',['-h','127.0.0.1','-p','55467','-U','mt_admin','-d',name,'--no-owner','--no-acl','--exit-on-error',backup],{env:{...process.env,PGPASSWORD:rootPassword},stdio:['ignore','pipe','pipe'],timeout:90000});checkpoint('RESTORED_'+kind);
  // 一个只读内容比较会话在PG内批量计算全部表，避免Windows逐表数千次拉起psql。
  const digests=database=>JSON.parse(sql(database,`SET statement_timeout='60s'; SET timezone='UTC';
    CREATE TEMP TABLE managed_cutover_digest(name TEXT, rows BIGINT, digest TEXT);
    DO $managed_digest$ DECLARE item RECORD; BEGIN
      FOR item IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename<>'ManagedLeaseWriteFence' LOOP
        EXECUTE format('INSERT INTO pg_temp.managed_cutover_digest SELECT %L,count(*),coalesce(md5(string_agg(row_to_json(t)::text,''|'' ORDER BY row_to_json(t)::text)),''empty'') FROM public.%I t',item.tablename,item.tablename);
      END LOOP;
    END $managed_digest$;
    SELECT json_agg(row_to_json(d) ORDER BY name) FROM pg_temp.managed_cutover_digest d;`).split('\n').at(-1));
  const sourceDigest=digests(source);assert.deepEqual(digests(name),sourceDigest,'全量恢复内容与冻结源不符');const tables=sourceDigest.map(row=>row.name);checkpoint('COMPARED_'+kind);
  const binding={databaseName:name,databaseRole:role,spaceKey:h.tag+'-'+kind,credentialRef:'secret-ref:synthetic/'+name,authKeyFingerprint:createHash('sha256').update(key).digest('hex')};
  sql(name,`REVOKE ALL ON SCHEMA public FROM PUBLIC; ${managedLeaseGrantSql(role)} ${managedOrderPolicySql(role)}`);
  sql(name,managedFenceInstallSql({customerId:app.customerId,...binding}));
  const row=JSON.parse(sql(name,'SELECT row_to_json(t) FROM "ManagedLeaseWriteFence" t;'));sql(name,managedFenceStateSql(app.customerId,'ACTIVE',row.epoch));
  const credential={databaseUrl:`postgresql://${role}:${password}@127.0.0.1:55467/${name}`,authKey:key,host:'127.0.0.1',port:55467};newCredentials[binding.credentialRef]=credential;const path=resolve(dir,'credentials.json');writeFileSync(path,JSON.stringify(newCredentials),{mode:0o600});process.env.MANAGED_LEASE_CREDENTIALS_FILE=path;
  const business=client(credential);bindings.push({binding,credential,business,backupSha256,tables:tables.length});checkpoint('BOUND_'+kind);return bindings.at(-1);
}
try{
  app=await h.application('a','a');await h.grantModules(app);const port=await h.start(app);const admin=await h.account(port,app,'admin',true);
  original=await h.control.managedDeployment.findUnique({where:{customerId:app.customerId}});originalRevision=(await h.control.managedCustomer.findUnique({where:{id:app.customerId}})).revision;
  checkpoint('ORIGINAL_SAVED');
  const sourceBusiness=client(h.refs[original.credentialRef]),sourceRuntime=new ManagedLeaseRuntime(h.control,sourceBusiness,app.customerId,h.refs[original.credentialRef]);await sourceRuntime.initialize();
  freeze('mt_customer_a');const target=await restoreNew('mt_customer_a','cutover');
  await assert.rejects(()=>maintenance.cutover(app.customerId,{expectedRevision:originalRevision-1,deployment:target.binding,backupSha256:target.backupSha256,reason:'陈旧修订切换拒绝'},'synthetic-maintainer'));
  assert.equal((await h.control.managedDeployment.findUnique({where:{customerId:app.customerId}})).databaseName,original.databaseName);
  const switched=await maintenance.cutover(app.customerId,{expectedRevision:originalRevision,deployment:target.binding,backupSha256:target.backupSha256,reason:h.tag+':本任务冻结源库后真实恢复并切换'},'synthetic-maintainer');assert.equal(switched.jobsReplayed,false);
  checkpoint('CUTOVER_CONFIRMED');
  await assert.rejects(()=>sourceRuntime.authenticate(admin.accessToken,app.key));await assert.rejects(()=>sourceBusiness.$executeRawUnsafe('UPDATE "Product" SET stock=stock WHERE false'));
  h.record('冻结原库、pg_dump并恢复全部业务表到新库，最低权限与新密钥核验后乐观切换；旧实例和旧令牌立即失效');
  const targetRuntime=new ManagedLeaseRuntime(h.control,target.business,app.customerId,target.credential);await targetRuntime.initialize();
  await assert.rejects(()=>targetRuntime.authenticate(admin.accessToken,app.key));const targetSession=await targetRuntime.loginLocal(app.key,{username:admin.username,password:h.password},'synthetic-cutover');
  const targetContext=await targetRuntime.authenticate(targetSession.accessToken,app.key),newProduct=await targetRuntime.manageCreate(targetContext,'product',{title:'切换后必须保留的新商品',detail:'回退也要保存本次新增',price:0,stock:2});
  assert.equal(sql('mt_customer_a',`SELECT count(*) FROM "Product" WHERE id='${newProduct.id}';`),'0');
  const sourceURL=new URL(h.refs[original.credentialRef].databaseUrl);sourceURL.pathname='/'+target.binding.databaseName;const wrongClient=client({...h.refs[original.credentialRef],databaseUrl:sourceURL.href});await assert.rejects(()=>wrongClient.$queryRawUnsafe('SELECT 1'));
  h.record('新实例使用恢复后的客户账号重新登录并创建真实商品；源库不接收新写，旧数据库账号不能连接恢复目标');
  freeze(target.binding.databaseName);const rollback=await restoreNew(target.binding.databaseName,'rollback');
  const beforeRollback=(await h.control.managedCustomer.findUnique({where:{id:app.customerId}})).revision;
  await maintenance.cutover(app.customerId,{expectedRevision:beforeRollback,deployment:rollback.binding,backupSha256:rollback.backupSha256,reason:h.tag+':从冻结的新写入库携带新增数据恢复回退候选'},'synthetic-maintainer');
  checkpoint('ROLLBACK_CONFIRMED');
  await assert.rejects(()=>targetRuntime.authenticate(targetSession.accessToken,app.key));await assert.rejects(()=>target.business.$executeRawUnsafe('UPDATE "Product" SET stock=stock WHERE false'));
  const rollbackRuntime=new ManagedLeaseRuntime(h.control,rollback.business,app.customerId,rollback.credential);await rollbackRuntime.initialize();const rollbackSession=await rollbackRuntime.loginLocal(app.key,{username:admin.username,password:h.password},'synthetic-rollback');
  const context=await rollbackRuntime.authenticate(rollbackSession.accessToken,app.key);assert.ok((await rollbackRuntime.manageList(context,'product')).items.some(row=>row.id===newProduct.id));
  h.record('回退先冻结目标并携带目标新增数据恢复到第三个新库；旧源和前目标继续拒写，回退实例保留切换后的商品与账号');
  const audit=await h.control.managedAudit.findMany({where:{customerId:app.customerId,action:'CUTOVER_FROZEN_DATABASE',reason:{startsWith:h.tag+':'}},orderBy:{revision:'asc'},select:{revision:true,reason:true}});assert.deepEqual(audit.map(row=>row.revision),[originalRevision+1,beforeRollback+1]);assert.ok(audit[0].reason.includes(target.backupSha256));assert.ok(audit[1].reason.includes(rollback.backupSha256));
  assert.equal(JSON.parse(sql('mt_customer_a','SELECT row_to_json(t) FROM "ManagedLeaseWriteFence" t;')).state,'FROZEN');
  h.record('切换与回退均登记维护审计；未重放支付、队列或供应商请求，全部源库和备份保留');
}catch(error){failure=error;}finally{
  // 合成验收收尾：只有恢复原控制绑定之后才解冻原库；演练生成的库全部冻结保留。
  for(const database of createdTargets){if(sql(database,`SELECT to_regclass('public."ManagedLeaseWriteFence"') IS NOT NULL;`)==='t'){const raw=sql(database,'SELECT row_to_json(t) FROM "ManagedLeaseWriteFence" t;');if(raw){const row=JSON.parse(raw);assert.equal(row.customerId,app.customerId);if(row.state==='ACTIVE')freeze(database);}}}
  if(original){await h.control.$transaction(async tx=>{await tx.managedCustomer.update({where:{id:app.customerId},data:{revision:{increment:1}}});await tx.managedDeployment.update({where:{customerId:app.customerId},data:{spaceKey:original.spaceKey,databaseName:original.databaseName,databaseRole:original.databaseRole,credentialRef:original.credentialRef,authKeyFingerprint:original.authKeyFingerprint,state:original.state,verifiedAt:original.verifiedAt}});});const row=JSON.parse(sql('mt_customer_a','SELECT row_to_json(t) FROM "ManagedLeaseWriteFence" t;'));if(row.state==='FROZEN')sql('mt_customer_a',managedFenceStateSql(app.customerId,'ACTIVE',row.epoch));}
  for(const db of clients)await db.$disconnect();await h.close();
  checkpoint('SYNTHETIC_CLEANUP_COMPLETE');
}
h.report(resolve(process.argv[2]??resolve(runtime,'cutover-postgres.json')),['apps/server/src/modules/managed-tenancy/managed-write-fence.ts','apps/server/src/modules/managed-tenancy/managed-lease-maintenance.service.ts','apps/server/src/modules/managed-tenancy/managed-tenancy.controller.ts','pilots/managed-tenancy/verify-cutover-postgres.mjs'],failure,['只在本任务集群演练新库切换和带新增数据的回退，不接触生产或DNS','回退源库全部保留；收尾恢复合成原绑定仅为测试隔离，演练新增数据完整保留在冻结回退库','切换接口核验身份、权限、围栏与修订；数据核对和备份摘要由维护者负责，不承诺线上RPO/RTO']);
