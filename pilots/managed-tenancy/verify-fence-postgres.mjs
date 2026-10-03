import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {ManagedPostgresHarness,runtime,repo} from './postgres-harness.mjs';
import {loadCandidatePrisma} from '../../scripts/ops/prisma-candidate/client.mjs';
import {installSyntheticFence} from './synthetic-fence.mjs';
const require=createRequire(resolve(repo,'apps/server/package.json'));
const {verifyManagedDatabase}=require(resolve(repo,'apps/server/src/modules/managed-tenancy/managed-lease.runtime.ts'));
const {managedFenceStateSql,managedFenceTables}=require(resolve(repo,'apps/server/src/modules/managed-tenancy/managed-write-fence.ts'));
const {PrismaClient}=loadCandidatePrisma();
const h=new ManagedPostgresHarness('fence');let failure,app,business,owner;
const data=id=>({id,customerId:app.customerId,userId:'synthetic-fence-actor',action:'SYNTHETIC_FENCE',entityId:id});
try{
  app=await h.application('a','a');await h.grantModules(app);const port=await h.start(app),account=await h.account(port,app,'reader');
  const credential=h.refs['secret-ref:synthetic/real-lease-a'];business=new PrismaClient({datasources:{db:{url:credential.databaseUrl}}});
  const rootPassword=readFileSync(resolve(runtime,'postgres/synthetic-password.txt'),'utf8').trim();
  owner=new PrismaClient({datasources:{db:{url:`postgresql://mt_admin:${rootPassword}@127.0.0.1:55467/mt_customer_a`}}});
  assert.equal((await owner.$queryRawUnsafe("SELECT current_database()||':'||current_user||':'||inet_server_port()::text identity"))[0].identity,'mt_customer_a:mt_admin:55467');
  const types=await business.$queryRawUnsafe("SELECT DISTINCT tgtype::int kind,tgenabled enabled FROM pg_trigger WHERE tgname='managed_lease_write_guard'");assert.deepEqual(types,[{kind:30,enabled:'A'}]);
  assert.equal((await business.$queryRawUnsafe("SELECT count(*)::int count FROM pg_trigger WHERE tgname='managed_lease_write_guard'"))[0].count,managedFenceTables.length);
  await verifyManagedDatabase(h.control,business,app.customerId,credential);
  await assert.rejects(()=>business.managedLeaseWriteFence.update({where:{customerId:app.customerId},data:{updatedAt:new Date()}}));
  await assert.rejects(()=>business.$executeRawUnsafe('ALTER TABLE "Product" DISABLE TRIGGER managed_lease_write_guard'));
  await assert.rejects(()=>business.$executeRawUnsafe("SET session_replication_role='replica'"));
  h.record('全部运行可写表具有实际语句级、始终启用触发器；客户不能改围栏、禁用触发器或切复制模式');
  h.adminSql('mt_customer_a','ALTER TABLE "Product" DISABLE TRIGGER managed_lease_write_guard;');
  try{await assert.rejects(()=>verifyManagedDatabase(h.control,business,app.customerId,credential));}finally{h.adminSql('mt_customer_a','ALTER TABLE "Product" ENABLE ALWAYS TRIGGER managed_lease_write_guard;');}
  h.adminSql('mt_customer_a',"CREATE OR REPLACE FUNCTION public.managed_lease_write_guard() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS 'BEGIN RETURN NULL; END';");
  try{await assert.rejects(()=>verifyManagedDatabase(h.control,business,app.customerId,credential));}finally{await installSyntheticFence(h.control,app.customerId);}
  h.adminSql('mt_customer_a','DROP TRIGGER managed_lease_write_guard ON "Product"; CREATE TRIGGER managed_lease_write_guard BEFORE INSERT OR UPDATE OF title OR DELETE ON "Product" FOR EACH STATEMENT EXECUTE FUNCTION public.managed_lease_write_guard(); ALTER TABLE "Product" ENABLE ALWAYS TRIGGER managed_lease_write_guard;');
  try{await assert.rejects(()=>verifyManagedDatabase(h.control,business,app.customerId,credential));}finally{await installSyntheticFence(h.control,app.customerId);}
  h.record('启动核验实际函数正文、绑定与触发器；禁用保护或替换为空函数立即拒绝');
  let release,entered,finished=false;
  const permit=new Promise(done=>release=done),started=new Promise(done=>entered=done),id=randomUUID();
  const write=business.$transaction(async tx=>{await tx.managedLeaseAudit.create({data:data(id)});entered();await permit;},{timeout:10000});await started;
  const epoch=(await owner.managedLeaseWriteFence.findUnique({where:{customerId:app.customerId}})).epoch;
  const freeze=owner.$transaction(async tx=>{await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"managed-write-fence:"+app.customerId},0))`;await tx.managedLeaseWriteFence.update({where:{customerId:app.customerId,epoch},data:{state:'FROZEN',epoch:{increment:1},updatedAt:new Date()}});finished=true;},{timeout:10000});
  await new Promise(done=>setTimeout(done,150));assert.equal(finished,false);release();await write;await freeze;
  assert.ok(await h.a.managedLeaseAudit.findUnique({where:{id}}));
  await assert.rejects(()=>business.managedLeaseAudit.create({data:data(randomUUID())}));
  await assert.rejects(()=>business.$executeRawUnsafe('UPDATE "Product" SET stock=stock WHERE false'));
  await assert.rejects(()=>verifyManagedDatabase(h.control,business,app.customerId,credential));
  assert.equal((await h.call(port,app,'/resources?kind=product',account.accessToken)).status,200);
  const login=await h.call(port,app,'/auth/login',undefined,'POST',{username:account.username,password:h.password});assert.equal(login.status,503);assert.ok(!JSON.stringify(login.body).includes('postgresql:'));
  h.record('冻结等待跨进程已有写事务提交；之后包括零行原始SQL均拒写，旧令牌仍可只读，HTTP维护响应不泄露连接');
  let row=await owner.managedLeaseWriteFence.findUnique({where:{customerId:app.customerId}});h.adminSql('mt_customer_a',managedFenceStateSql(app.customerId,'ACTIVE',row.epoch));
  let snapshotReady,continueSnapshot;const snapshotStarted=new Promise(done=>snapshotReady=done),snapshotGo=new Promise(done=>continueSnapshot=done);
  const staleId=randomUUID();
  const stale=business.$transaction(async tx=>{await tx.managedLeaseWriteFence.findUnique({where:{customerId:app.customerId}});snapshotReady();await snapshotGo;await tx.managedLeaseAudit.create({data:data(staleId)});},{isolationLevel:'RepeatableRead',timeout:10000});
  const rejected=assert.rejects(()=>stale);await snapshotStarted;
  row=await owner.managedLeaseWriteFence.findUnique({where:{customerId:app.customerId}});h.adminSql('mt_customer_a',managedFenceStateSql(app.customerId,'FROZEN',row.epoch));continueSnapshot();await rejected;
  assert.equal(await h.a.managedLeaseAudit.count({where:{id:staleId}}),0);
  h.record('冻结前建立的RepeatableRead旧快照不能绕过围栏；行锁触发序列化拒绝且整笔写入回滚');
  row=await owner.managedLeaseWriteFence.findUnique({where:{customerId:app.customerId}});
  assert.throws(()=>h.adminSql('mt_customer_a',managedFenceStateSql(app.customerId,'ACTIVE',row.epoch-1)));
  h.adminSql('mt_customer_a',managedFenceStateSql(app.customerId,'ACTIVE',row.epoch));
  await verifyManagedDatabase(h.control,business,app.customerId,credential);await business.managedLeaseAudit.create({data:data(randomUUID())});
  h.record('维护状态变更要求当前epoch；旧修订不能解冻，正确解冻后重新核验及新写恢复');
}catch(error){failure=error;}finally{
  if(owner&&app){const row=await owner.managedLeaseWriteFence.findUnique({where:{customerId:app.customerId}});if(row?.state==='FROZEN')h.adminSql('mt_customer_a',managedFenceStateSql(app.customerId,'ACTIVE',row.epoch));}
  if(business)await business.$disconnect();if(owner)await owner.$disconnect();await h.close();
}
h.report(resolve(process.argv[2]??resolve(runtime,'fence-postgres.json')),['apps/server/src/modules/managed-tenancy/managed-write-fence.ts','apps/server/src/modules/managed-tenancy/managed-lease-permissions.ts','apps/server/src/modules/managed-tenancy/managed-lease-exception.filter.ts','pilots/managed-tenancy/verify-fence-postgres.mjs'],failure,['本任务真实PostgreSQL事务和本地HTTP，未切换正式基础设施','冻结可保留有效旧令牌的只读能力；刷新、登录及审计写入暂停，维护窗口不等于零停机承诺']);
