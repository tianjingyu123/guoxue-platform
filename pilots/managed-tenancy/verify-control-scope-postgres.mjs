import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { loadCandidatePrisma } from '../../scripts/ops/prisma-candidate/client.mjs';
import { managedControlScope } from '../../scripts/ops/prisma-candidate/managed-control-scope.mjs';
import { scopedControlUrl } from './scoped-control.mjs';

const repo=fileURLToPath(new URL('../../',import.meta.url)),runtime=resolve(repo,'pilots/managed-tenancy/.runtime'),require=createRequire(resolve(repo,'apps/server/package.json'));
const {PrismaClient}=loadCandidatePrisma();require('ts-node').register({transpileOnly:true,compilerOptions:{module:'commonjs',experimentalDecorators:true,emitDecoratorMetadata:true}});
const {verifyManagedControlReader}=require(resolve(repo,'apps/server/src/modules/managed-tenancy/managed-control-reader.ts'));
const fixture=JSON.parse(readFileSync(resolve(runtime,'postgres/synthetic-connections.json'),'utf8')),reader=JSON.parse(readFileSync(resolve(runtime,'postgres/synthetic-reader.json'),'utf8'));
const control=new PrismaClient({datasources:{db:{url:`postgresql://mt_control:${fixture.mt_control}@127.0.0.1:55467/mt_control`}}});
const shared=new PrismaClient({datasources:{db:{url:`postgresql://mt_control_reader:${reader.password}@127.0.0.1:55467/mt_control`}}});
const rootPassword=readFileSync(resolve(runtime,'postgres/synthetic-password.txt'),'utf8').trim();
const root=statement=>execFileSync('C:/Program Files/PostgreSQL/16/bin/psql.exe',['-X','-h','127.0.0.1','-p','55467','-U','mt_admin','-d','mt_control','-v','ON_ERROR_STOP=1','-At'],{input:statement,env:{...process.env,PGPASSWORD:rootPassword},encoding:'utf8'});
if(root("SELECT current_database()||':'||current_user||':'||inet_server_port()::text;").trim()!=='mt_control:mt_admin:55467')throw new Error('只允许本任务控制库');
const checks=[],record=name=>checks.push({name,status:'PASS'}),clients=[],configIds=[],users=[],memberIds=[];const tag='scope-'+Date.now(),flagKey='client_'+tag;let failure;
try {
  const customers={};for(const suffix of ['a','b']){
    const customer=await control.managedCustomer.findFirst({where:{deployment:{databaseName:'mt_customer_'+suffix}},include:{applications:{where:{enabled:true}}}});assert.ok(customer&&customer.applications.length);customers[suffix]=customer;
    const client=new PrismaClient({datasources:{db:{url:await scopedControlUrl(customer.id)}}});clients.push(client);await verifyManagedControlReader(client,customer.id);
  }
  const [a,b]=clients;
  assert.equal(await a.managedCustomer.count(),1);assert.equal(await b.managedCustomer.count(),1);
  assert.equal(await a.managedCustomer.findUnique({where:{id:customers.b.id}}),null);
  assert.equal(await a.managedDeployment.findUnique({where:{customerId:customers.b.id}}),null);
  assert.ok((await a.managedApplication.findMany()).every(row=>row.customerId===customers.a.id));
  assert.ok((await a.managedMembership.findMany()).every(row=>row.customerId===customers.a.id));
  const ownApplications=await a.managedApplication.findMany();
  assert.ok((await a.appDistribution.findMany()).every(row=>ownApplications.some(app=>app.applicationId===row.applicationId)));
  record('实际数据库读取限制客户、部署、成员、应用和登记行，A不能枚举B');
  await assert.rejects(()=>a.$queryRawUnsafe('SELECT * FROM public."ManagedCustomer"'));
  await assert.rejects(()=>a.$queryRawUnsafe(`SELECT * FROM "${managedControlScope(customers.b.id).name}"."ManagedCustomer"`));
  await assert.rejects(()=>a.$queryRawUnsafe('SELECT * FROM public."ConfigVersion"'));
  await assert.rejects(()=>a.$queryRawUnsafe('SELECT phone FROM "User"'));
  await assert.rejects(()=>a.$executeRawUnsafe(`SET ROLE "${managedControlScope(customers.b.id).name}"`));
  await assert.rejects(()=>a.managedCustomer.updateMany({data:{name:'禁止修改'}}));
  await assert.rejects(()=>a.$executeRawUnsafe('CREATE TABLE "scope_forbidden" (id text)'));
  record('基础表、其他客户视图、手机号、切换角色、写入和DDL均拒绝');
  const pool=await Promise.all(Array.from({length:8},(_,index)=>a.$transaction(async tx=>{
    await tx.$executeRawUnsafe("SELECT set_config('managed.customer_id',$1,true)",customers.b.id);
    const rows=await tx.managedCustomer.findMany();assert.deepEqual(rows.map(row=>row.id),[customers.a.id]);return index;
  })));assert.equal(pool.length,8);
  record('连接池并发及伪造session客户变量不能改变固定视图范围');
  for(const suffix of ['a','b']){
    const user=await control.user.create({data:{id:tag+'-'+suffix,nickname:'合成控制视图身份'}});users.push(user.id);
    const member=await control.managedMembership.create({data:{customerId:customers[suffix].id,userId:user.id,role:'USER',identityProvider:'PLATFORM'}});memberIds.push(member.id);
  }
  assert.ok(await a.user.findUnique({where:{id:users[0]},select:{status:true}}));assert.equal(await a.user.findUnique({where:{id:users[1]},select:{status:true}}),null);
  const registration={};for(const suffix of ['a','b'])registration[suffix]=await control.appDistribution.findFirst({where:{applicationId:customers[suffix].applications[0].applicationId,enabled:true}});
  assert.ok(registration.a&&registration.b);
  const rule=suffix=>({id:tag+'-'+suffix,applicationId:registration[suffix].applicationId,platform:registration[suffix].platform,channelId:registration[suffix].channelId,state:'MAINTENANCE',targetUserIds:users});
  await control.featureFlag.create({data:{key:flagKey,name:'合成内部备注不应下发',description:'合成隐私备注',enabled:true,targetUserIds:users,scopeRules:[rule('a'),rule('b')]}});
  const projected=await a.featureFlag.findUnique({where:{key:flagKey}});assert.deepEqual(projected.targetUserIds,[users[0]]);assert.equal(projected.description,null);assert.equal(projected.name,'');assert.equal(projected.scopeRules.length,1);assert.equal(projected.scopeRules[0].applicationId,registration.a.applicationId);assert.deepEqual(projected.scopeRules[0].targetUserIds,[users[0]]);
  record('平台账号及运营灰度目标限定本客户平台成员，规则按实际应用渠道过滤');
  const add=async data=>{const row=await control.configVersion.create({data});configIds.push(row.id);return row;};
  const published=await add({configKey:'client_presentation:v1',version:1000000,value:{schemaVersion:1,rules:[rule('a'),rule('b')]},changedBy:'合成内部维护人',comment:'合成内部发布备注'});
  const draft=await add({configKey:'client_presentation:v1:draft:'+tag,version:1,value:{secret:'合成草稿不应下发'}});
  const secret=await add({configKey:'synthetic:credentials:'+tag,version:1,value:{secret:'合成非客户端配置'}});
  const cap=async suffix=>add({configKey:`client_capability:${registration[suffix].applicationId}:${registration[suffix].platform}:${registration[suffix].channelId}:100:${tag}`,version:1,value:{applicationId:registration[suffix].applicationId,platform:registration[suffix].platform,channelId:registration[suffix].channelId,nativeBuild:'100'}});
  const ownCap=await cap('a'),otherCap=await cap('b');
  const view=await a.configVersion.findUnique({where:{id:published.id}});assert.equal(view.value.rules.length,1);assert.equal(view.value.rules[0].applicationId,registration.a.applicationId);assert.equal(view.changedBy,null);assert.equal(view.comment,null);
  for(const id of [draft.id,secret.id,otherCap.id])assert.equal(await a.configVersion.findUnique({where:{id}}),null);
  assert.ok(await a.configVersion.findUnique({where:{id:ownCap.id}}));
  record('公共发布裁决只投影本渠道，草稿、任意配置、其他客户能力记录及维护备注不可读');
  await assert.rejects(()=>verifyManagedControlReader(shared,customers.a.id));await assert.rejects(()=>verifyManagedControlReader(a,customers.b.id));
  const role=managedControlScope(customers.a.id).name;root(`GRANT SELECT ON public."UserRole" TO "${role}";`);
  try{await assert.rejects(()=>verifyManagedControlReader(a,customers.a.id));}finally{root(`REVOKE SELECT ON public."UserRole" FROM "${role}";`);}
  await verifyManagedControlReader(a,customers.a.id);
  record('启动核验拒绝共用只读账号、错误客户绑定和额外读取权限');
  root(`CREATE FUNCTION "${role}"."synthetic_scope_bypass"() RETURNS bigint LANGUAGE SQL SECURITY DEFINER SET search_path=pg_catalog AS 'SELECT count(*) FROM public."ManagedCustomer"'; REVOKE ALL ON FUNCTION "${role}"."synthetic_scope_bypass"() FROM PUBLIC; GRANT EXECUTE ON FUNCTION "${role}"."synthetic_scope_bypass"() TO "${role}";`);
  try{
    const leaked=await a.$queryRawUnsafe(`SELECT "${role}"."synthetic_scope_bypass"() count`);assert.ok(leaked[0].count>1n);
    await assert.rejects(()=>verifyManagedControlReader(a,customers.a.id));
  }finally{root(`DROP FUNCTION "${role}"."synthetic_scope_bypass"();`);}
  await verifyManagedControlReader(a,customers.a.id);
  record('可调用的非系统SECURITY DEFINER函数即使没有表权限也使启动拒绝');
  const before=await a.managedCustomer.findUnique({where:{id:customers.a.id}});
  try{await control.managedCustomer.update({where:{id:customers.a.id},data:{revision:{increment:1}}});assert.equal((await a.managedCustomer.findUnique({where:{id:customers.a.id}})).revision,before.revision+1);}finally{await control.managedCustomer.update({where:{id:customers.a.id},data:{revision:before.revision}});}
  await control.featureFlag.update({where:{key:flagKey},data:{enabled:false}});assert.equal((await a.featureFlag.findUnique({where:{key:flagKey}})).enabled,false);
  record('视图实时读取合同修订和运营关闭，不依赖复制快照或缓存续命');
} catch(error){failure=true;writeFileSync(resolve(runtime,'control-scope-diagnostic.txt'),error.stack||String(error),{mode:0o600});}
finally{
  if(configIds.length)await control.configVersion.deleteMany({where:{id:{in:configIds}}});
  await control.featureFlag.deleteMany({where:{key:flagKey}});
  if(memberIds.length)await control.managedMembership.deleteMany({where:{id:{in:memberIds}}});
  if(users.length)await control.user.deleteMany({where:{id:{in:users}}});
  for(const client of [...clients,shared,control])await client.$disconnect();
}
const files=['apps/server/src/modules/managed-tenancy/managed-control-reader.ts','scripts/ops/prisma-candidate/managed-control-scope.mjs','pilots/managed-tenancy/scoped-control.mjs'];
const report={head:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),node:process.version,sources:Object.fromEntries(files.map(path=>[path,createHash('sha256').update(readFileSync(resolve(repo,path))).digest('hex')])),checks,passed:checks.length,failed:failure?1:0,production:false,limits:['数据库安全屏障视图与最低权限实测，不是公共基础表RLS迁移','仅本任务合成库；未验证数据库管理员攻破、OS、网络或跨服务器隔离']};
const output=resolve(process.argv[2]||resolve(runtime,'control-scope-postgres.json'));mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed,report:output}));if(failure)process.exitCode=1;
