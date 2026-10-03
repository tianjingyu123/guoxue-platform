import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { ControlPlane, PilotInstance } from './pilot.mjs';
import { loadPublicProtocol, startControl } from './server.mjs';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const paths=['pilots/managed-tenancy/pilot.mjs','pilots/managed-tenancy/server.mjs','pilots/managed-tenancy/verify.mjs','pilots/managed-tenancy/audit-source.mjs','pilots/managed-tenancy/migrations/001-pilot.sql','packages/shared/src/client-presentation.ts','apps/server/src/modules/system/distribution.util.ts','apps/server/src/modules/shop/shop-order.service.ts','apps/server/src/modules/commission/commission.service.ts','apps/server/prisma/schema.prisma'];
const sourceHashes=()=>Object.fromEntries(paths.map(p=>[p,createHash('sha256').update(readFileSync(join(repo,p))).digest('hex')]));
const beforeSources=sourceHashes();
const runDir = resolve(repo, 'pilots/managed-tenancy/.runtime', `run-${Date.now()}`);
mkdirSync(runDir, { recursive: true });
const protocolPath = resolve(repo, 'packages/shared/src/client-presentation.ts');
const { parseClientPresentation } = await loadPublicProtocol(protocolPath);
const now = Date.now(); const capability = randomBytes(32).toString('hex');
const platform = { space:'platform-space', tradingSubject:'synthetic-rebu-trader', merchantRef:'test-merchant-platform', priceRule:'synthetic-existing-price-snapshot', commissionRule:'synthetic-existing-commission-snapshot' };
const term = { remindAt: now + 100000, endAt: now + 200000, exportUntil: now + 3600000, downloadTtlMs: 60000 };
const config = (scope, mode='LEASE') => ({
  scope, space:mode === 'LEASE' ? scope : platform.space, customer:`customer-${scope}`, mode,
  applicationSubject:`synthetic-subject-${scope}`, tradingSubject: mode === 'LEASE' ? `synthetic-trader-${scope}` : platform.tradingSubject,
  merchantRef:mode === 'LEASE' ? `test-merchant-${scope}` : platform.merchantRef,
  applications:[{ applicationId:`app-${scope}`, platform:'miniprogram', channelId:'synthetic-mini', clientKey:`client-${scope}` }, { applicationId:`h5-${scope}`, platform:'h5', channelId:'synthetic-web', clientKey:`web-${scope}` }],
  modules:['shop','course','circle','agent'], resources:{ product:[mode === 'LEASE' ? `product-${scope}` : 'platform-product'], course:[mode === 'LEASE' ? `course-${scope}` : 'platform-course'], agent:[`agent-${scope}`] },
  maxCircles:2, template:'community', brand:{ name:`合成客户${scope}`, themeColor:'#8B4513' }, term:{...term},
  contract:{ maintenancePrice:null, maintenanceCycle:'ANNUAL', priceRule:mode === 'LEASE' ? 'synthetic-customer-price' : platform.priceRule, commissionRule:mode === 'LEASE' ? 'synthetic-none' : platform.commissionRule },
});
const a = config('tenant-a'); const b = config('tenant-b'); b.template='single-agent'; b.modules=['agent'];
const brand = config('brand-a','BRAND'); const brand2=config('brand-b','BRAND'); brand2.resources.agent=[];
const specs=[a,b,brand,brand2]; const checks=[]; const failures=[]; const children=[]; const instances=[];
const controlServer = await startControl(runDir, capability, platform);
const plane = controlServer.control;
const request = async (port,path,{method='GET',token,clientKey,data,headers={}}={}) => {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {method,headers:{...(token ? {Authorization:`Bearer ${token}`} : {}),...(clientKey ? {'x-app-client':clientKey} : {}),'Content-Type':'application/json',...headers},...(data === undefined ? {} : {body:JSON.stringify(data)}),signal:AbortSignal.timeout(10000)});
  return {status:response.status,data:await response.json()};
};
async function check(name, fn) { const start=Date.now(); try { await fn(); checks.push({name,status:'PASS',durationMs:Date.now()-start}); } catch(e) { checks.push({name,status:'FAIL',error:e.message}); failures.push(name); } }
function reject(fn, code) { assert.throws(fn, e => e.code === code); }
async function child(descriptor) {
  const proc = fork(fileURLToPath(new URL('./server.mjs', import.meta.url)), ['--fixture-child', JSON.stringify(descriptor), protocolPath], {stdio:['ignore','ignore','pipe','ipc']});
  let stderr=''; proc.stderr.on('data', x=>{stderr+=x;});
  const value=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('child startup timeout')),20000);proc.once('message',v=>{clearTimeout(timer);resolve(v);});proc.once('exit',code=>{clearTimeout(timer);reject(new Error(`child exit ${code}: ${stderr}`));});});
  children.push(proc); return value;
}
let runtime, runtime2, credential, credential2;
try {
  await check('控制面拒绝客户、无身份与冲突开通；并发幂等开通', async()=>{
    const forbidden=await request(controlServer.port,'/provision',{method:'POST',token:'synthetic-customer-token',data:a}); assert.equal(forbidden.status,403);
    const values=await Promise.all(Array.from({length:8},()=>request(controlServer.port,'/provision',{method:'POST',token:capability,data:a})));
    assert.ok(values.every(r=>r.status===200 && r.data.state==='READY')); assert.equal(new Set(values.map(r=>r.data.digest)).size,1);
    assert.equal(plane.provision(capability,Object.fromEntries(Object.entries(a).reverse())).digest,values[0].data.digest);
    // 模拟持久化后、READY 标记前中断；不触碰其他任务的库。
    const business=new DatabaseSync(join(runDir,a.space,'business.db'));
    business.prepare('INSERT INTO audit(scope,actor,action,target,at) VALUES(?,?,?,?,?)').run(a.scope,'maintenance','CRASH_FIXTURE','retained-marker',Date.now());business.close();
    const registry=new DatabaseSync(join(runDir,'registry.db'));registry.prepare("UPDATE deployments SET state='PREPARING' WHERE scope=?").run(a.scope);registry.close();
    reject(()=>plane.descriptor(capability,a.scope),'DEPLOYMENT_NOT_READY');
    assert.equal(plane.provision(capability,a).state,'READY');
    const recovered=new DatabaseSync(join(runDir,a.space,'business.db'));assert.equal(recovered.prepare("SELECT count(*) n FROM audit WHERE action='CRASH_FIXTURE'").get().n,1);recovered.close();
    const conflict=await request(controlServer.port,'/provision',{method:'POST',token:capability,data:{...a,maxCircles:3}});assert.equal(conflict.status,409);
    for(const spec of [b,brand,brand2]) plane.provision(capability,spec);
    reject(()=>plane.provision(capability,{...config('evil-space'),space:a.space}),'LEASE_REQUIRES_OWN_SPACE');
    reject(()=>plane.provision(capability,{...config('evil-select'),applications:a.applications}),'SELECTOR_ALREADY_OWNED');
    reject(()=>plane.provision(capability,{...config('evil-brand','BRAND'),merchantRef:'test-merchant-independent'}),'PLATFORM_CONTRACT_CHANGED');
    reject(()=>plane.provision(capability,{...config('evil-role'),superAdmin:true}),'UNKNOWN_FIELD');
  });
  for (const spec of specs) {
    const instance=new PilotInstance(plane.descriptor(capability,spec.scope),parseClientPresentation);instances.push(instance);
    const users=[{id:'admin-user',role:spec.mode==='LEASE'?'CUSTOMER_ADMIN':'STATION_MASTER',phone:'13800001234'},{id:'member-user',role:'USER',phone:'13800001234'}];
    if(spec.mode==='LEASE')users.push({id:'support-user',role:'CUSTOMER_SUPPORT'});
    const resource=(id,kind,body)=>({id,kind,title:`合成${id}`,body});
    const resources=spec.scope==='brand-b'?[]:[resource(spec.resources.product[0],'product',{priceMinor:100}),resource(spec.resources.course[0],'course',{priceMinor:200}),resource(`agent-${spec.scope}`,'agent',{knowledge:`private-knowledge-${spec.scope}`}),resource(`hidden-${spec.scope}`,'agent',{knowledge:'ungranted-secret'})];
    instance.seed(users,resources);
  }
  runtime=await Promise.all(specs.map(spec=>child(plane.descriptor(capability,spec.scope))));
  runtime2=await child(plane.descriptor(capability,a.scope));
  credential=specs.map((spec,i)=>({token:instances[i].token('admin-user',spec.applications[0].clientKey),clientKey:spec.applications[0].clientKey}));
  credential2=specs.map((spec,i)=>({token:instances[i].token('member-user',spec.applications[0].clientKey),clientKey:spec.applications[0].clientKey}));
  const A=runtime[0].port,B=runtime[1].port,C=runtime[2].port,D=runtime[3].port;
  const auth=credential[0], user=credential2[0], other=credential[1];
  await check('五个独立进程、两个独立客户数据库、平台品牌共享空间',async()=>{
    assert.equal(new Set([...runtime,runtime2].map(r=>r.pid)).size,5);
    assert.notEqual(plane.descriptor(capability,a.scope).space,plane.descriptor(capability,b.scope).space);
    assert.equal(plane.descriptor(capability,brand.scope).space,plane.descriptor(capability,brand2.scope).space);
    assert.equal((await request(A,'/context',auth)).status,200);
    assert.equal((await request(B,'/context',other)).status,200);
  });
  await check('无上下文、未知选择器、跨客户及同主体跨应用令牌拒绝',async()=>{
    assert.equal((await request(A,'/resources?kind=product')).status,401);
    assert.equal((await request(A,'/context',{token:auth.token})).status,401);
    assert.equal((await request(A,'/context',{...auth,clientKey:'unknown-client'})).status,401);
    assert.equal((await request(B,'/context',{...auth,clientKey:other.clientKey})).status,401);
    assert.equal((await request(A,'/context',{...auth,clientKey:a.applications[1].clientKey})).status,401);
    assert.equal((await request(A,'/context',{token:instances[0].token('admin-user',a.applications[1].clientKey),clientKey:a.applications[1].clientKey})).status,200);
    assert.equal((await request(A,'/context',{...auth,headers:{host:'other-customer.invalid'}})).data.scope,a.scope);
  });
  await check('伪造 tenantId、stationId、角色及令牌签名拒绝',async()=>{
    reject(()=>instances[0].resources(undefined,'product'),'CONTEXT_REQUIRED');
    reject(()=>instances[0].resources({userId:'admin-user',role:'CUSTOMER_ADMIN',scope:a.scope},'product'),'CONTEXT_REQUIRED');
    for(const headers of [{'x-tenant-id':b.scope},{'x-station-id':brand.scope}]) assert.equal((await request(A,'/context',{...auth,headers})).status,403);
    for(const query of ['tenantId=tenant-b','stationId=brand-a']) assert.equal((await request(A,`/context?${query}`,auth)).status,403);
    const claim=JSON.parse(Buffer.from(auth.token.split('.')[0],'base64url').toString());claim.role='SUPER_ADMIN';
    const forged=Buffer.from(JSON.stringify(claim)).toString('base64url')+'.'+auth.token.split('.')[1];assert.equal((await request(A,'/context',{...auth,token:forged})).status,401);
    assert.equal((await request(A,'/circles',{...auth,method:'POST',data:{name:'test',tenantId:b.scope}})).status,400);
    assert.equal((await request(A,'/context',{...user,headers:{'x-role':'SUPER_ADMIN'}})).data.role,'USER');
  });
  await check('并发跨进程圈子配额原子限制',async()=>{
    const results=await Promise.all(Array.from({length:12},(_,i)=>request(i%2 ? A : runtime2.port,'/circles',{...auth,method:'POST',data:{name:`合成圈子${i}`}})));
    assert.equal(results.filter(r=>r.status===200).length,2);assert.equal(results.filter(r=>r.status===409).length,10);
    assert.equal((await request(A,'/circles',{...user,method:'POST',data:{name:'越权'}})).status,403);
    assert.equal((await request(B,'/circles',{...other,method:'POST',data:{name:'未授权'}})).status,403);
  });
  await check('成员修订撤销与主库角色降权立即生效',async()=>{
    const oldContext=instances[0].authenticate(auth.token,auth.clientKey);
    const oldUserContext=instances[0].authenticate(user.token,user.clientKey);
    const db=new DatabaseSync(join(runDir,a.space,'business.db'));
    try {
      db.prepare("UPDATE users SET revision=revision+1 WHERE id='member-user' AND scope=?").run(a.scope);
      assert.equal((await request(A,'/context',user)).status,401);
      reject(()=>instances[0].resources(oldUserContext,'product'),'CONTEXT_REQUIRED');
      db.prepare("UPDATE users SET role='USER' WHERE id='admin-user' AND scope=?").run(a.scope);
      assert.equal((await request(A,'/context',auth)).data.role,'USER');
      reject(()=>instances[0].createCircle(oldContext,'撤销管理权限'),'CONTEXT_REQUIRED');
      assert.equal((await request(A,'/resources',{...auth,method:'PUT',data:{items:[{id:'product-tenant-a',title:'越权'}]}})).status,403);
    } finally { db.prepare("UPDATE users SET role='CUSTOMER_ADMIN',revision=revision+1 WHERE id='admin-user' AND scope=?").run(a.scope);db.close(); }
    auth.token=instances[0].token('admin-user',auth.clientKey);user.token=instances[0].token('member-user',auth.clientKey);
  });
  await check('单条与批量写入、原始 SQL 读过滤及事务回滚',async()=>{
    assert.equal((await request(A,'/resources?kind=product',auth)).data[0].id,'product-tenant-a');
    assert.equal((await request(B,'/resources/product-tenant-a?kind=product',other)).status,403);
    assert.equal((await request(A,'/resources',{...auth,method:'PUT',data:{items:[{id:'product-tenant-a',title:'准备回滚'},{id:'product-tenant-b',title:'跨库'}]}})).status,403);
    assert.equal((await request(A,'/resources?kind=product',auth)).data[0].title,'合成product-tenant-a');
    assert.equal((await request(A,'/resources',{...auth,method:'PUT',data:{items:[{id:'product-tenant-a',title:'本客户更新'}]}})).status,200);
    assert.equal((await request(A,'/resources',{...user,method:'PUT',data:{items:[{id:'product-tenant-a',title:'越权'}]}})).status,403);
  });
  await check('搜索、指定智能体知识、深链与本人会话隔离',async()=>{
    assert.equal((await request(A,'/resources?kind=agent&q=hidden',auth)).data.length,0);
    assert.equal((await request(A,'/resources?kind=agent',auth)).data.length,1);
    assert.equal((await request(A,'/chats',{...user,method:'POST',data:{agentId:'hidden-tenant-a',question:'越权'}})).status,403);
    const chat=await request(A,'/chats',{...user,method:'POST',data:{agentId:'agent-tenant-a',question:'合成测试'}});assert.equal(chat.data.knowledge,'private-knowledge-tenant-a');
    assert.equal((await request(B,`/chats/${chat.data.id}`,other)).status,403);
    assert.equal((await request(A,`/chats/${chat.data.id}`,auth)).status,403);
    assert.equal((await request(A,`/chats/${chat.data.id}`,user)).status,200);
    assert.equal((await request(B,'/chats',{...credential2[1],method:'POST',data:{agentId:'agent-tenant-b',question:'合成测试'}})).data.knowledge,'private-knowledge-tenant-b');
  });
  await check('缓存账号/应用/客户命名空间、附件跨用户与跨客户隔离',async()=>{
    assert.equal((await request(A,'/cache',{...auth,method:'POST',data:{key:'same-key',value:'private-a'}})).data.value,'private-a');
    assert.equal((await request(A,'/cache',{...user,method:'POST',data:{key:'same-key'}})).data.value,null);
    assert.equal((await request(B,'/cache',{...other,method:'POST',data:{key:'same-key'}})).data.value,null);
    const webAuth={token:instances[0].token('admin-user',a.applications[1].clientKey),clientKey:a.applications[1].clientKey};
    assert.equal((await request(A,'/cache',{...webAuth,method:'POST',data:{key:'same-key'}})).data.value,null);
    assert.equal((await request(A,'/assets/private-asset',{...user,method:'POST',data:{data:'synthetic-private-media'}})).status,200);
    assert.equal((await request(A,'/assets/private-asset',auth)).status,403);assert.equal((await request(B,'/assets/private-asset',other)).status,403);
    assert.equal((await request(A,'/assets/private-asset',user)).data.data,'synthetic-private-media');
  });
  const presentation={schemaVersion:1,entries:[{id:'mall',visible:true,order:0},{id:'agent',visible:true,order:1}],navigation:[],homeChannels:['recommend'],pages:{home:[{id:'entry-block',type:'entry-grid',title:'合成',text:'',entries:['mall','agent']} ]}};
  await check('公共协议同源、模板不授权、旧客户端降级、未知组件及脚本拒绝',async()=>{
    const preview=await request(B,'/presentation/preview',{...other,method:'POST',data:{presentation,clientProfile:'presentation-v1'}});
    assert.equal(preview.status,200);assert.deepEqual(preview.data.entries.map(e=>e.id),['agent']);assert.deepEqual(preview.data.pages.home[0].entries,['agent']);
    assert.equal((await request(B,'/orders',{...other,method:'POST',data:{resourceId:'product-tenant-b'}})).status,403);
    const legacy=await request(A,'/presentation/preview',{...auth,method:'POST',data:{presentation,clientProfile:'legacy-v1'}});assert.deepEqual(legacy.data.pages,{});
    const unknown=structuredClone(presentation);unknown.pages.home[0].type='arbitrary-script';assert.equal((await request(A,'/presentation/preview',{...auth,method:'POST',data:{presentation:unknown,clientProfile:'presentation-v1'}})).status,400);
    const script=structuredClone(presentation);script.pages.home[0].text='<script>alert(1)</script>';assert.equal((await request(A,'/presentation/preview',{...auth,method:'POST',data:{presentation:script,clientProfile:'presentation-v1'}})).status,400);
  });
  let order,brandOrder;
  await check('客户商户与交易快照、金额/商户检查、支付履约退款幂等契约',async()=>{
    order=(await request(A,'/orders',{...user,method:'POST',data:{resourceId:'product-tenant-a'}})).data;
    assert.equal(order.snapshot.merchantRef,a.merchantRef);assert.equal(order.snapshot.tradingSubject,a.tradingSubject);
    reject(()=>instances[0].paymentEvent(order.id,'event-pay','PAY',b.merchantRef,100),'PAYMENT_CONTRACT_MISMATCH');
    reject(()=>instances[0].paymentEvent(order.id,'event-pay','PAY',a.merchantRef,101),'PAYMENT_CONTRACT_MISMATCH');
    assert.equal(instances[0].paymentEvent(order.id,'event-pay','PAY',a.merchantRef,100).duplicate,false);
    assert.equal(instances[0].paymentEvent(order.id,'event-pay','PAY',a.merchantRef,100).duplicate,true);
    assert.equal((await request(A,`/orders/${order.id}`,user)).data.entitlement,1);
    assert.equal((await request(B,`/orders/${order.id}`,other)).status,403);
    reject(()=>instances[1].paymentEvent(order.id,'cross-event','PAY',a.merchantRef,100),'ORDER_FORBIDDEN');
    assert.equal(instances[0].paymentEvent(order.id,'event-refund','REFUND',a.merchantRef,100).status,'REFUNDED');
    assert.equal(instances[0].paymentEvent(order.id,'event-refund','REFUND',a.merchantRef,100).duplicate,true);
    assert.equal((await request(A,`/orders/${order.id}`,user)).data.entitlement,0);
    assert.equal((await request(A,'/payments',{...auth,method:'POST',data:{}})).status,404);
  });
  await check('品牌分站共享获授权资源、主体分别声明且交易规则不扩大',async()=>{
    const c=await request(C,'/context',credential[2]);assert.notEqual(c.data.applicationSubject,c.data.tradingSubject);assert.equal(c.data.role,'STATION_MASTER');
    for(const [port,auth] of [[C,credential[2]],[D,credential[3]]])assert.equal((await request(port,'/resources?kind=product',auth)).data[0].id,'platform-product');
    brandOrder=(await request(C,'/orders',{...credential2[2],method:'POST',data:{resourceId:'platform-product'}})).data;
    assert.equal(brandOrder.snapshot.merchantRef,platform.merchantRef);assert.equal(brandOrder.snapshot.commissionRule,platform.commissionRule);assert.equal(brandOrder.snapshot.priceRule,platform.priceRule);
    assert.equal((await request(D,`/orders/${brandOrder.id}`,credential[3])).status,403);
    assert.equal((await request(C,'/resources',{...credential[2],method:'PUT',data:{items:[{id:'platform-product',title:'分站上传'}]}})).status,403);
    assert.equal((await request(C,'/circles',{...credential[2],method:'POST',data:{name:'扩大权限'}})).status,403);
    assert.equal((await request(C,'/exports',{...credential[2],method:'POST',data:{}})).status,403);
  });
  await check('客户管理员、客服不能变平台超管；既有订单/售后仍按原权限',async()=>{
    reject(()=>instances[0].seed([{id:'evil-root',role:'SUPER_ADMIN'}],[]),'ROLE_ESCALATION');
    reject(()=>instances[0].seed([],[{id:'secret-resource',kind:'agent',title:'不能含凭据',body:{knowledge:'own',apiKey:'synthetic-forbidden-secret'}}]),'UNKNOWN_FIELD');
    const support={token:instances[0].token('support-user',auth.clientKey),clientKey:auth.clientKey};
    assert.equal((await request(A,'/context',support)).data.role,'CUSTOMER_SUPPORT');
    assert.equal((await request(A,'/aftercare',{...support,method:'POST',data:{orderId:order.id}})).status,200);
    assert.equal((await request(A,'/exports',{...support,method:'POST',data:{}})).status,403);
    assert.equal((await request(controlServer.port,'/provision',{method:'POST',token:auth.token,data:config('evil-admin')})).status,403);
    assert.equal((await request(A,'/roles',{...auth,method:'POST',data:{role:'SUPER_ADMIN'}})).status,404);
  });
  let oldUserToken=user.token;
  await check('提醒/到期/保留/续费状态、已有售后不关闭、旧令牌失效、任务不重跑',async()=>{
    const job=(await request(A,'/jobs',{...auth,method:'POST',data:{kind:'synthetic-charge'}})).data;
    const unrunJob=(await request(A,'/jobs',{...auth,method:'POST',data:{kind:'synthetic-charge'}})).data;
    const staleContext=instances[0].authenticate(auth.token,auth.clientKey);
    const t=Date.now();instances[0].renew({remindAt:t-2000,endAt:t-1000,exportUntil:t+3600000,downloadTtlMs:60000});
    reject(()=>instances[0].createCircle(staleContext,'失效上下文'),'CONTEXT_REQUIRED');
    assert.equal(instances[0].status(),'EXPIRED_RESTRICTED');
    assert.equal((await request(A,'/context',auth)).status,401);
    const expiredUser={token:instances[0].token('member-user',auth.clientKey),clientKey:auth.clientKey};
    assert.equal((await request(A,'/orders',{...expiredUser,method:'POST',data:{resourceId:'product-tenant-a'}})).status,403);
    assert.equal((await request(A,`/orders/${order.id}`,expiredUser)).status,200);
    assert.equal((await request(A,'/aftercare',{...expiredUser,method:'POST',data:{orderId:order.id}})).status,200);
    const expiredAdmin={token:instances[0].token('admin-user',auth.clientKey),clientKey:auth.clientKey};
    assert.equal((await request(A,'/exports',{...expiredAdmin,method:'POST',data:{}})).status,200);
    assert.equal(instances[0].runJob(job.id).state,'HELD');
    reject(()=>instances[1].runJob(job.id),'JOB_FORBIDDEN');
    instances[0].renew({remindAt:t-1000,endAt:t+300000,exportUntil:t+3600000,downloadTtlMs:60000});assert.equal(instances[0].status(),'REMINDER');
    assert.equal(instances[0].runJob(job.id).state,'HELD');
    instances[0].renew({...term,remindAt:Date.now()+100000});assert.equal(instances[0].status(),'ACTIVE');
    assert.equal(instances[0].runJob(unrunJob.id).state,'HELD');
    auth.token=instances[0].token('admin-user',auth.clientKey);user.token=instances[0].token('member-user',auth.clientKey);
    assert.equal((await request(A,'/context',{...user,token:oldUserToken})).status,401);
    assert.equal((await request(A,`/orders/${order.id}`,user)).data.snapshot.commissionRule,order.snapshot.commissionRule);
    assert.equal((await request(C,`/orders/${brandOrder.id}`,credential2[2])).data.snapshot.commissionRule,brandOrder.snapshot.commissionRule);
  });
  await check('导出实际范围、附件、敏感字段处理、跨客户与临时下载权限',async()=>{
    const exp=(await request(A,'/exports',{...auth,method:'POST',data:{}})).data;
    assert.equal((await request(A,`/exports/${exp.id}`,auth)).status,403);
    const download=await request(A,`/exports/${exp.id}`,{...auth,headers:{'x-download-grant':exp.grant}});assert.equal(download.status,200);
    assert.equal(download.data.scope,a.scope);assert.ok(download.data.assets.some(x=>x.body==='synthetic-private-media'));
    const serialized=JSON.stringify(download.data);assert.ok(!serialized.includes('13800001234'));assert.ok(serialized.includes('138****1234'));
    for(const secret of ['grantHash','synthetic-key','registry.db','private-knowledge-tenant-b','ungranted-secret','SUPER_ADMIN'])assert.ok(!serialized.includes(secret));
    assert.equal((await request(B,`/exports/${exp.id}`,{...other,headers:{'x-download-grant':exp.grant}})).status,403);
    assert.equal((await request(A,`/exports/${exp.id}`,{...user,headers:{'x-download-grant':exp.grant}})).status,403);
    const revoked=auth.token;instances[0].renew({...term});assert.equal((await request(A,`/exports/${exp.id}`,{...auth,token:revoked,headers:{'x-download-grant':exp.grant}})).status,401);
    auth.token=instances[0].token('admin-user',auth.clientKey);user.token=instances[0].token('member-user',auth.clientKey);
    instances[0].renew({...term,downloadTtlMs:1});auth.token=instances[0].token('admin-user',auth.clientKey);
    const short=(await request(A,'/exports',{...auth,method:'POST',data:{}})).data;await new Promise(resolve=>setTimeout(resolve,20));
    assert.equal((await request(A,`/exports/${short.id}`,{...auth,headers:{'x-download-grant':short.grant}})).status,403);
    const t=Date.now();instances[0].renew({remindAt:t-3000,endAt:t-2000,exportUntil:t-1000,downloadTtlMs:1});assert.equal(instances[0].status(),'ARCHIVED_RETAINED');
    auth.token=instances[0].token('admin-user',auth.clientKey);assert.equal((await request(A,'/exports',{...auth,method:'POST',data:{}})).status,403);
    assert.equal((await request(A,`/orders/${order.id}`,auth)).status,200);
    instances[0].renew({...term});auth.token=instances[0].token('admin-user',auth.clientKey);user.token=instances[0].token('member-user',auth.clientKey);
  });
  await check('同版本备份恢复/迁出/回退、错误数据库身份拒绝与审计',async()=>{
    const moved=join(runDir,'moved');const target=join(moved,a.space);mkdirSync(target,{recursive:true});
    const backup=instances[0].backup(join(target,'business.db'));assert.equal(backup.sha256.length,64);
    copyFileSync(join(runDir,a.space,`${a.scope}.synthetic-key`),join(target,`${a.scope}.synthetic-key`));
    const restored=new PilotInstance({root:moved,scope:a.scope,space:a.space},parseClientPresentation);instances.push(restored);
    const ctx=restored.authenticate(user.token,user.clientKey);assert.deepEqual(restored.order(ctx,order.id),instances[0].order(instances[0].authenticate(user.token,user.clientKey),order.id));
    assert.equal(restored.asset(ctx,'private-asset').data,'synthetic-private-media');
    assert.equal(restored.auditLog().length,instances[0].auditLog().length);
    const movedRuntime=await child({root:moved,scope:a.scope,space:a.space});assert.equal((await request(movedRuntime.port,`/orders/${order.id}`,user)).status,200);
    assert.equal((await request(A,`/orders/${order.id}`,user)).status,200);
    const corrupt=join(runDir,'wrong',a.space);mkdirSync(corrupt,{recursive:true});copyFileSync(join(target,'business.db'),join(corrupt,'business.db'));copyFileSync(join(target,`${a.scope}.synthetic-key`),join(corrupt,`${a.scope}.synthetic-key`));
    const db=new DatabaseSync(join(corrupt,'business.db'));const config=JSON.parse(db.prepare('SELECT config FROM identity WHERE space=?').get(a.scope).config);config.space=b.space;db.prepare('UPDATE identity SET config=? WHERE space=?').run(JSON.stringify(config),a.scope);db.close();
    reject(()=>new PilotInstance({root:join(runDir,'wrong'),scope:a.scope,space:a.space},parseClientPresentation),'DATABASE_IDENTITY_MISMATCH');
    const audits=instances[0].auditLog();for(const action of ['PROVISION_READY','CREATE_CIRCLE','CREATE_ORDER','PAY','REFUND','RENEW_WITHOUT_JOB_REPLAY','CREATE_EXPORT','DOWNLOAD_EXPORT']) {
      if(action!=='PROVISION_READY')assert.ok(audits.some(x=>x.action===action));
    }
  });
} catch(e) { failures.push('SETUP_OR_HARNESS');checks.push({name:'SETUP_OR_HARNESS',status:'FAIL',error:e.stack}); }
finally {
  for(const proc of children) {
    if(proc.exitCode === null) { await new Promise(resolve=>{const timer=setTimeout(()=>{proc.kill();resolve();},5000);proc.once('exit',()=>{clearTimeout(timer);resolve();});proc.send('close');}); }
  }
  for(const instance of instances)instance.close();
  await controlServer.close();
}
await check('验收器结束后所有本任务进程与端口关闭',async()=>{
  assert.ok(children.every(proc=>proc.exitCode!==null || proc.signalCode!==null));
  for(const target of [...(runtime ?? []),...(runtime2 ? [runtime2] : []),{port:controlServer.port}]) await assert.rejects(()=>fetch(`http://127.0.0.1:${target.port}/context`,{signal:AbortSignal.timeout(1000)}));
});
const sources=sourceHashes();
await check('运行前后候选源码与公共协议摘要一致',()=>assert.deepEqual(sources,beforeSources));
const git=execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim();
const report={schemaVersion:1,generatedAt:new Date().toISOString(),baselineHead:git,node:process.version,database:'SQLite synthetic pilot',sources,passed:checks.filter(c=>c.status==='PASS').length,failed:failures.length,checks,limits:['未接生产/真实客户/真实商户/微信AppID/模型供应商','SQLite合成验证不代表PostgreSQL最小权限账号、Redis、BullMQ、COS、pgvector或生产容量实测','只验证试点API与合成交易契约，不替代现有NestJS全业务集成及真实佣金资金验收','无生产迁移、推送、部署或主线合并'],runtimeProcesses:children.length,resourcesClosed:children.every(proc=>proc.exitCode!==null || proc.signalCode!==null)};
const output=process.argv[2] ? resolve(process.argv[2]) : join(runDir,'report.json');mkdirSync(resolve(output,'..'),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:report.passed,failed:report.failed,report:output,failures}));
process.exitCode=failures.length ? 1 : 0;
