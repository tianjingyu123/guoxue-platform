import { scopedControlUrl } from './scoped-control.mjs';
import {installSyntheticFence} from './synthetic-fence.mjs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, createHash } from 'node:crypto';
import { fork, execFileSync } from 'node:child_process';
import { loadCandidatePrisma } from '../../scripts/ops/prisma-candidate/client.mjs';
const repo=fileURLToPath(new URL('../../',import.meta.url));
const require=createRequire(resolve(repo,'apps/server/package.json'));
const {PrismaClient}=loadCandidatePrisma();
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'commonjs',experimentalDecorators:true,emitDecoratorMetadata:true}});require('reflect-metadata');
const {ManagedTenancyService}=require(resolve(repo,'apps/server/src/modules/managed-tenancy/managed-tenancy.service.ts'));
const {ManagedLeaseMaintenanceService}=require(resolve(repo,'apps/server/src/modules/managed-tenancy/managed-lease-maintenance.service.ts'));
const {ManagedLeaseRuntime,verifyManagedDatabase}=require(resolve(repo,'apps/server/src/modules/managed-tenancy/managed-lease.runtime.ts'));
const credentials=JSON.parse(readFileSync(resolve(repo,'pilots/managed-tenancy/.runtime/postgres/synthetic-connections.json'),'utf8'));
const reader=JSON.parse(readFileSync(resolve(repo,'pilots/managed-tenancy/.runtime/postgres/synthetic-reader.json'),'utf8'));
const runtimeCredentials=JSON.parse(readFileSync(resolve(repo,'pilots/managed-tenancy/.runtime/postgres/synthetic-business-runtime.json'),'utf8'));
const businessUrl=suffix=>`postgresql://mt_customer_${suffix}_runtime:${runtimeCredentials[suffix]}@127.0.0.1:55467/mt_customer_${suffix}`;
const url=name=>`postgresql://${name}:${credentials[name]}@127.0.0.1:55467/${name}`;
const controlUrl=`postgresql://mt_control_reader:${reader.password}@127.0.0.1:55467/mt_control`;
const control=new PrismaClient({datasources:{db:{url:url('mt_control')}}});
const readControl=new PrismaClient({datasources:{db:{url:controlUrl}}});
const aDb=new PrismaClient({datasources:{db:{url:url('mt_customer_a')}}});
const bDb=new PrismaClient({datasources:{db:{url:url('mt_customer_b')}}});
const aRuntimeDb=new PrismaClient({datasources:{db:{url:businessUrl('a')}}});
const bRuntimeDb=new PrismaClient({datasources:{db:{url:businessUrl('b')}}});
const service=new ManagedTenancyService(control),maintenance=new ManagedLeaseMaintenanceService(control);
const tag='lease-'+Date.now();const runtimeDir=resolve(repo,'pilots/managed-tenancy/.runtime/lease-postgres');mkdirSync(runtimeDir,{recursive:true});
const keyPath=resolve(runtimeDir,'keys.json');
const keys=existsSync(keyPath)?JSON.parse(readFileSync(keyPath,'utf8')):{a:randomBytes(32).toString('hex'),b:randomBytes(32).toString('hex')};writeFileSync(keyPath,JSON.stringify(keys),{mode:0o600});
const refs=Object.fromEntries(['a','b'].map(s=>[`secret-ref:synthetic/real-lease-${s}`,{databaseUrl:businessUrl(s),authKey:keys[s],host:'127.0.0.1',port:55467}]));
const refPath=resolve(runtimeDir,'credentials.json');writeFileSync(refPath,JSON.stringify(refs),{mode:0o600});process.env.MANAGED_LEASE_CREDENTIALS_FILE=refPath;
const checks=[];const record=name=>checks.push({name,status:'PASS'});const children=[];const ports=[];let failure;
const term={remindAt:'2035-01-01T00:00:00Z',endAt:'2036-01-01T00:00:00Z',exportUntil:'2037-01-01T00:00:00Z',downloadTtlSeconds:60};
async function start(customerId,credential,suffix){
  const path=resolve(runtimeDir,tag+'-'+suffix+'.json');writeFileSync(path,JSON.stringify({customerId,credential,controlUrl:await scopedControlUrl(customerId)}),{mode:0o600});
  const child=fork(resolve(repo,'pilots/managed-tenancy/lease-process.mjs'),[path],{cwd:repo,stdio:['ignore','ignore','pipe','ipc'],windowsHide:true});children.push(child);
  let stderr='';child.stderr.on('data',data=>{stderr+=data.toString();});
  const result=await new Promise((done,reject)=>{const timer=setTimeout(()=>reject(new Error('独立租赁服务启动超时')),30000);child.once('message',message=>{clearTimeout(timer);done(message);});child.once('exit',code=>{if(code!==0){clearTimeout(timer);reject(new Error('独立租赁服务退出，错误输出已保留在受限运行目录'));}});});
  if(!result.ready)throw new Error(result.error);ports.push(result.port);return result.port;
}
const call=async(port,path,token,key,method='GET',body,extra={})=>{
  const r=await fetch(`http://127.0.0.1:${port}/api/v1${path}`,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...(key?{'x-app-client':key}:{}),...extra},...(body!==undefined?{body:JSON.stringify(body)}:{})});
  return{status:r.status,body:await r.json(),cache:r.headers.get('cache-control')};
};
try{
  for(const db of[aRuntimeDb,bRuntimeDb]){
    await assert.rejects(()=>db.$executeRawUnsafe('UPDATE "User" SET status=status'));
    await assert.rejects(()=>db.$executeRawUnsafe('UPDATE "Product" SET "commissionRate"="commissionRate"'));
    await assert.rejects(()=>db.$queryRawUnsafe('SELECT prompt FROM "VoiceAgentProfile" LIMIT 1'));
    await assert.rejects(()=>db.$queryRawUnsafe('SELECT * FROM "UserRole" LIMIT 1'));
    await assert.rejects(()=>db.$executeRawUnsafe('DELETE FROM "ManagedLeaseAudit" WHERE false'));
  }
  record('实际运行账号按表和字段授权，拒绝用户/价格改写、内部提示词、平台角色及审计删除');
  const writable=await readControl.$queryRawUnsafe(`SELECT has_table_privilege(current_user,'"ManagedCustomer"','INSERT,UPDATE,DELETE') writable`);assert.equal(writable[0].writable,false);
  await assert.rejects(()=>readControl.managedCustomer.updateMany({data:{name:'禁止修改'}}));
  await assert.rejects(()=>readControl.$queryRawUnsafe('SELECT phone FROM "User" LIMIT 1'));
  record('运行实例控制面账号只读，不能改合同或读取平台手机号');
  const userId=tag+'-user',otherId=tag+'-other';
  await control.user.create({data:{id:userId,nickname:'合成共用登录身份'}});await control.user.create({data:{id:otherId,nickname:'合成另一个身份'}});
  for(const db of[aDb,bDb]){await db.user.create({data:{id:userId,nickname:'合成客户本地账户',phone:'synthetic-'+tag+(db===aDb?'a':'b')}});await db.user.create({data:{id:otherId,nickname:'合成另一账户'}});}
  const customers={};const selectors={};const resourceIds={};
  for(const suffix of['a','b']){
    let customer=await control.managedCustomer.findFirst({where:{deployment:{databaseName:'mt_customer_'+suffix}},include:{applications:true,deployment:true,grant:true}});
    if(!customer){customer=await service.create({requestKey:'synthetic-real-lease-'+suffix,name:'合成独立客户'+suffix,mode:'LEASE',tradingSubject:'synthetic-company-'+suffix,maintenancePrice:null,term,applications:[{applicationId:'synthetic-real-lease-app-'+suffix,applicationSubject:'synthetic-application-owner-'+suffix,allowedPlatforms:['h5'],brand:{name:'合成客户'+suffix,themeColor:'#8B4513'},templateId:'community'}],modules:['shop','course','circle','agent'],resources:{product:[],course:[],circle:[],agent:[]},circleLimit:10000,deployment:{spaceKey:'synthetic-real-space-'+suffix,databaseName:'mt_customer_'+suffix,databaseRole:'mt_customer_'+suffix,credentialRef:'secret-ref:synthetic/real-lease-'+suffix,authKeyFingerprint:createHash('sha256').update(keys[suffix]).digest('hex')},reason:'本任务真实PostgreSQL隔离合成验收'},'synthetic-maintainer');}
    await control.managedDeployment.update({where:{customerId:customer.id},data:{databaseRole:'mt_customer_'+suffix+'_runtime',state:'PLANNED',verifiedAt:null}});
    const fixtureApp=customer.applications.find(app=>app.applicationId==='synthetic-real-lease-app-'+suffix);assert.ok(fixtureApp,'租赁验收必须选本测试登记的固定应用，不按数组首项猜测');
    customer=await service.renew(customer.id,{term,expectedRevision:customer.revision,reason:'合成验证恢复显式期限'},'synthetic-maintainer');
    await service.membership(customer.id,{userId,role:'CUSTOMER_ADMIN',enabled:true,reason:'合成本地身份对应授权'},'synthetic-maintainer');
    await service.membership(customer.id,{userId:otherId,role:'CUSTOMER_ADMIN',enabled:true,reason:'合成原申请人边界验证'},'synthetic-maintainer');
    const db=suffix==='a'?aDb:bDb;
    const product=await db.product.create({data:{id:tag+'-product-'+suffix,title:'合成公开商品'+suffix,detail:'<p>合成样本</p>',price:10,status:'ON_SALE'}});
    const hidden=await db.product.create({data:{id:tag+'-hidden-'+suffix,title:'未授权私有商品',detail:'<p>隐藏</p>',price:20,status:'ON_SALE'}});
    const circle=await db.circle.create({data:{id:tag+'-circle-'+suffix,name:'合成知识圈'+suffix,intro:'独立知识域',ownerId:userId,tags:[],status:'ACTIVE'}});
    const agent=await db.voiceAgentProfile.create({data:{id:tag+'-agent-'+suffix,ownerType:'circle',ownerId:circle.id,name:'合成指定助理',persona:'合成',prompt:'禁止下发的内部提示词',voiceId:'synthetic-voice',status:'APPROVED',activeVersion:1}});
    await db.circleKnowledge.createMany({data:[{circleId:circle.id,sourceType:'free_text',content:'synthetic-keyword 客户'+suffix+'私有知识',contentHash:tag+suffix+'private',scope:'circle'},{circleId:circle.id,sourceType:'free_text',content:'synthetic-keyword 不可全局兜底',contentHash:tag+suffix+'global',scope:'global'}]});
    const count=await db.circle.count({where:{deletedAt:null}});
    customer=await service.updateGrant(customer.id,{modules:['shop','course','circle','agent'],resources:{product:[product.id],course:[],circle:[circle.id],agent:[agent.id]},circleLimit:count+2,expectedRevision:customer.revision,reason:'真实授权更新与修订验收'},'synthetic-maintainer');
    const selector='synthetic-real-lease-client-'+suffix;selectors[suffix]=selector;
    await control.appDistribution.upsert({where:{clientKey:selector},create:{clientKey:selector,productId:'synthetic',applicationId:fixtureApp.applicationId,platform:'h5',channelId:'synthetic-web',packageName:'synthetic.no-real-registration'},update:{enabled:true}});
    await installSyntheticFence(control,customer.id);
    await maintenance.verify(customer.id,{expectedRevision:customer.revision,reason:'真实本地数据库/角色/认证摘要最小只读核验'},'synthetic-maintainer');
    await service.enableApplication(fixtureApp.id,'synthetic-maintainer','本地合成渠道与数据库验证完成');
    customers[suffix]={...customer,applications:[fixtureApp]};resourceIds[suffix]={product:product.id,hidden:hidden.id,circle:circle.id,agent:agent.id};
  }
  record('两真实独立客户库，维护侧验证才进入READY，公共应用登记复用');
  const deploymentBefore=await control.managedDeployment.findUnique({where:{customerId:customers.a.id}});
  const verificationControl=new Proxy(control,{get(target,key){if(key==='$transaction')return async callback=>{await control.managedDeployment.update({where:{customerId:customers.a.id},data:{credentialRef:'secret-ref:synthetic/changed-during-verification'}});return target.$transaction(callback);};return target[key];}});
  await control.managedDeployment.update({where:{customerId:customers.a.id},data:{state:'PLANNED',verifiedAt:null}});
  try{
    await assert.rejects(()=>new ManagedLeaseMaintenanceService(verificationControl).verify(customers.a.id,{expectedRevision:customers.a.revision,reason:'部署核验与提交之间的身份变化拒绝'},'synthetic-maintainer'));
    assert.equal((await control.managedDeployment.findUnique({where:{customerId:customers.a.id}})).state,'PLANNED');
  }finally{await control.managedDeployment.update({where:{customerId:customers.a.id},data:{credentialRef:deploymentBefore.credentialRef,state:deploymentBefore.state,verifiedAt:deploymentBefore.verifiedAt}});}
  record('实际数据库核验与READY提交之间部署身份变化时拒绝，不把新身份误标为已验证');
  const wrong=new ManagedLeaseRuntime(readControl,bDb,customers.a.id,refs['secret-ref:synthetic/real-lease-b']);await assert.rejects(()=>wrong.initialize());
  await assert.rejects(()=>verifyManagedDatabase(readControl,aRuntimeDb,customers.a.id,{...refs['secret-ref:synthetic/real-lease-a'],authKey:keys.b}));
  record('误接另一客户数据库或认证密钥时拒绝启动');
  const runtime=new ManagedLeaseRuntime(readControl,aRuntimeDb,customers.a.id,refs['secret-ref:synthetic/real-lease-a']);await runtime.initialize();
  async function rejectRevokedTransaction(delegate,method,args,token){
    const revision=(await control.managedCustomer.findUnique({where:{id:customers.a.id}})).revision;let intercepted=false;
    const db=new Proxy(aRuntimeDb,{get(target,key){
      if(key==='$transaction')return(callback,options)=>target.$transaction(tx=>callback(new Proxy(tx,{get(inner,modelKey){
        if(modelKey===delegate)return new Proxy(inner[modelKey],{get(model,operation){
          if(operation==='create')return async payload=>{const result=await model.create(payload);intercepted=true;await control.managedCustomer.update({where:{id:customers.a.id},data:{revision:{increment:1}}});return result;};
          const value=model[operation];return typeof value==='function'?value.bind(model):value;
        }});
        const value=inner[modelKey];return typeof value==='function'?value.bind(inner):value;
      }})),options);
      const value=target[key];return typeof value==='function'?value.bind(target):value;
    }});
    const tested=new ManagedLeaseRuntime(readControl,db,customers.a.id,refs['secret-ref:synthetic/real-lease-a']);await tested.initialize();
    const context=await tested.authenticate(token,selectors.a);
    try {await assert.rejects(()=>tested[method](context,...args),error=>[401,403].includes(error.getStatus?.()));assert.equal(intercepted,true);}
    finally {await control.managedCustomer.update({where:{id:customers.a.id},data:{revision}});}
  }
  const rootPassword=readFileSync(resolve(repo,'pilots/managed-tenancy/.runtime/postgres/synthetic-password.txt'),'utf8').trim();
  const changeAcl=statement=>execFileSync('C:/Program Files/PostgreSQL/16/bin/psql.exe',['-X','-h','127.0.0.1','-p','55467','-U','mt_admin','-d','mt_customer_a','-v','ON_ERROR_STOP=1'],{input:statement,env:{...process.env,PGPASSWORD:rootPassword},stdio:['pipe','pipe','pipe']});
  changeAcl('GRANT SELECT ON "UserRole" TO mt_customer_a_runtime;');
  try { await assert.rejects(()=>verifyManagedDatabase(readControl,aRuntimeDb,customers.a.id,refs['secret-ref:synthetic/real-lease-a'])); }
  finally { changeAcl('REVOKE SELECT ON "UserRole" FROM mt_customer_a_runtime;'); }
  record('即使账号与库身份正确，额外平台角色读取权限也使维护核验拒绝');
  changeAcl(`CREATE FUNCTION public."synthetic_business_bypass"() RETURNS bigint LANGUAGE SQL SECURITY DEFINER SET search_path=pg_catalog AS 'SELECT count(*) FROM public."UserRole"'; REVOKE ALL ON FUNCTION public."synthetic_business_bypass"() FROM PUBLIC; GRANT EXECUTE ON FUNCTION public."synthetic_business_bypass"() TO mt_customer_a_runtime;`);
  try { await assert.rejects(()=>verifyManagedDatabase(readControl,aRuntimeDb,customers.a.id,refs['secret-ref:synthetic/real-lease-a'])); }
  finally { changeAcl('DROP FUNCTION public."synthetic_business_bypass"();'); }
  await verifyManagedDatabase(readControl,aRuntimeDb,customers.a.id,refs['secret-ref:synthetic/real-lease-a']);
  record('客户业务账号可调用非系统特权函数时拒绝核验，不能绕过字段权限');
  await assert.rejects(()=>runtime.resources({userId,role:'CUSTOMER_ADMIN',applicationId:customers.a.applications[0].applicationId,clientKey:selectors.a,revision:customers.a.revision,memberRevision:1},'product'));
  const tokens={a:(await maintenance.session(selectors.a,userId)).accessToken,b:(await maintenance.session(selectors.b,userId)).accessToken};
  const a1=await start(customers.a.id,refs['secret-ref:synthetic/real-lease-a'],'a1');const a2=await start(customers.a.id,refs['secret-ref:synthetic/real-lease-a'],'a2');const b=await start(customers.b.id,refs['secret-ref:synthetic/real-lease-b'],'b');
  assert.equal((await call(a1,'/lease/context')).status,401);
  assert.equal((await call(a1,'/lease/context',tokens.b,selectors.b)).status,401);
  assert.equal((await call(a1,'/lease/context',tokens.a,selectors.b)).status,401);
  const jwt=require('jsonwebtoken');assert.equal((await call(a1,'/lease/context',jwt.sign({sub:userId},randomBytes(32).toString('hex')),selectors.a)).status,401);
  assert.equal((await call(a1,'/admin/managed-customers',tokens.a,selectors.a)).status,404);
  assert.equal((await call(a1,'/shop/orders',tokens.a,selectors.a)).status,404);
  const context=await call(a1,'/lease/context?tenantId=forged',tokens.a,selectors.a,'GET',undefined,{'x-tenant-id':customers.b.id,'x-station-id':'forged'});assert.equal(context.status,200);assert.equal(context.body.customerId,customers.a.id);assert.equal(context.cache,'private, no-store');
  record('三个真实Nest子进程：跨客户/应用/平台令牌、伪造上下文和非租赁路由拒绝，前端字段不能切库');
  await aDb.user.update({where:{id:userId},data:{deletedAt:new Date()}});
  try{assert.equal((await call(a1,'/lease/context',tokens.a,selectors.a)).status,401);assert.equal((await call(b,'/lease/context',tokens.b,selectors.b)).status,200);}finally{await aDb.user.update({where:{id:userId},data:{deletedAt:null}});}
  await control.user.update({where:{id:userId},data:{deletedAt:new Date()}});
  try{assert.equal((await call(a1,'/lease/context',tokens.a,selectors.a)).status,401);assert.equal((await call(b,'/lease/context',tokens.b,selectors.b)).status,401);await assert.rejects(()=>maintenance.session(selectors.a,userId));}finally{await control.user.update({where:{id:userId},data:{deletedAt:null}});}
  record('平台来源会话同时复查软删除：客户库停本客户，平台账号停两个平台关联实例，状态恢复不重建身份');
  const claims=jwt.decode(tokens.a);delete claims.exp;delete claims.iat;
  const shortToken=jwt.sign(claims,keys.a,{algorithm:'HS256',expiresIn:1});
  const heldContext=await runtime.authenticate(shortToken,selectors.a);
  await new Promise(done=>setTimeout(done,1200));
  await assert.rejects(()=>runtime.context(heldContext));
  await service.disableApplication(customers.a.applications[0].id,'synthetic-maintainer','合成应用暂停验证');
  assert.equal((await call(a1,'/lease/context',tokens.a,selectors.a)).status,401);
  await service.enableApplication(customers.a.applications[0].id,'synthetic-maintainer','合成应用恢复验证');
  assert.equal((await call(a1,'/lease/context',tokens.a,selectors.a)).status,200);
  const oldRef=customers.a.deployment.credentialRef;
  await control.managedDeployment.update({where:{customerId:customers.a.id},data:{credentialRef:'secret-ref:synthetic/changed-identity'}});
  try {
    await assert.rejects(async()=>runtime.context(await runtime.authenticate(tokens.a,selectors.a)));
    assert.equal((await call(a1,'/lease/context',tokens.a,selectors.a)).status,403);
  } finally {
    await control.managedDeployment.update({where:{customerId:customers.a.id},data:{credentialRef:oldRef}});
  }
  record('已持有上下文不能越过令牌期限；应用暂停和固定部署身份变化即时拒绝');
  const list=await call(a1,'/lease/resources?kind=product',tokens.a,selectors.a);assert.deepEqual(list.body.map(row=>row.id),[resourceIds.a.product]);
  const before=await aDb.product.findUnique({where:{id:resourceIds.a.product}});
  assert.equal((await call(a1,'/lease/products',tokens.a,selectors.a,'PUT',[{id:resourceIds.a.product,title:'不能部分提交'},{id:resourceIds.a.hidden,title:'越权'}])).status,400);assert.equal((await aDb.product.findUnique({where:{id:resourceIds.a.product}})).title,before.title);
  assert.equal((await call(b,'/lease/products',tokens.b,selectors.b,'PUT',[{id:resourceIds.a.product,title:'越库'}])).status,400);
  assert.equal((await call(a1,'/lease/products',tokens.a,selectors.a,'PUT',[{id:resourceIds.a.product,title:'授权更新'}])).status,200);
  record('真实商品白名单、批量越权整组拒绝及另一库商品ID拒绝');
  const baseCount=await aDb.circle.count({where:{deletedAt:null}});
  await rejectRevokedTransaction('circle','createCircle',[{name:tag+'-revoked-circle',intro:'创建后合同修订变化应回滚'}],tokens.a);
  assert.equal(await aDb.circle.count({where:{deletedAt:null}}),baseCount);
  record('圈子已写入但提交前合同修订变化时实际事务回滚，不消耗数量名额');
  const circles=await Promise.all(Array.from({length:8},(_,i)=>call(i%2?a1:a2,'/lease/circles',tokens.a,selectors.a,'POST',{name:'合成竞争圈'+i,intro:'跨进程事务配额'})));
  assert.equal(circles.filter(result=>result.status===201).length,2);assert.equal(await aDb.circle.count({where:{deletedAt:null}}),baseCount+2);
  record('两个独立进程并发八次创建，仅合同剩余两个名额成功');
  const knowledge=await call(a1,'/lease/agents/'+resourceIds.a.agent+'/knowledge?q=synthetic-keyword',tokens.a,selectors.a);assert.equal(knowledge.status,200);assert.equal(knowledge.body.length,1);assert.ok(knowledge.body[0].content.includes('客户a'));assert.ok(!JSON.stringify(knowledge.body).includes('全局兜底'));
  assert.equal((await call(a1,'/lease/agents/'+resourceIds.b.agent+'/knowledge?q=synthetic-keyword',tokens.a,selectors.a)).status,404);
  record('真实指定智能体只检索本库授权圈子，禁止global兜底与另一客户智能体');
  await control.featureFlag.upsert({where:{key:'client_emergency_close'},create:{key:'client_emergency_close',name:'合成全局急停验收',enabled:true},update:{enabled:true}});
  assert.equal((await call(a1,'/lease/resources?kind=product',tokens.a,selectors.a)).status,403);
  await control.featureFlag.update({where:{key:'client_emergency_close'},data:{enabled:false}});
  record('复用公共FeatureFlag真实主库急停，合同授权不能覆盖平台关闭');
  const order=await aDb.order.create({data:{userId,type:'PRODUCT',targetId:resourceIds.a.product,amount:10,status:'PAID',paidAt:new Date()}});
  const foreign=await aDb.order.create({data:{userId:otherId,type:'PRODUCT',targetId:resourceIds.a.product,amount:10,status:'PAID'}});
  const expiredTerm={remindAt:'2020-01-01T00:00:00Z',endAt:'2021-01-01T00:00:00Z',exportUntil:'2037-01-01T00:00:00Z',downloadTtlSeconds:60};
  const renewed=await service.renew(customers.a.id,{term:expiredTerm,expectedRevision:customers.a.revision,reason:'合成合同到期验证'},'synthetic-maintainer');
  assert.equal((await call(a1,'/lease/context',tokens.a,selectors.a)).status,401);tokens.a=(await maintenance.session(selectors.a,userId)).accessToken;
  assert.equal((await call(a1,'/lease/resources?kind=product',tokens.a,selectors.a)).status,403);
  assert.equal((await call(a1,'/lease/orders/'+order.id,tokens.a,selectors.a)).status,200);assert.equal((await call(a1,'/lease/orders/'+foreign.id,tokens.a,selectors.a)).status,404);
  const aftercareBody={orderId:order.id,requestKey:tag+'-aftercare',reason:'已到期合同下的既有订单售后'};const aftercare=await Promise.all(Array.from({length:4},()=>call(a1,'/lease/aftercare',tokens.a,selectors.a,'POST',aftercareBody)));assert.ok(aftercare.every(result=>result.status===201));assert.equal(new Set(aftercare.map(result=>result.body.id)).size,1);assert.equal((await aDb.order.findUnique({where:{id:order.id}})).status,'PAID');
  record('到期旧令牌失效，新经营受限；本人订单及幂等售后受理保留，不自动退款');
  const rejectedAftercare={orderId:order.id,requestKey:tag+'-revoked-aftercare',reason:'售后写入后修订撤销应回滚'};
  await rejectRevokedTransaction('managedLeaseAftercare','aftercare',[rejectedAftercare],tokens.a);
  assert.equal(await aDb.managedLeaseAftercare.count({where:{userId,requestKey:rejectedAftercare.requestKey}}),0);
  record('售后记录已写入但提交前身份修订变化时申请与审计整组回滚');
  const exported=await call(a1,'/lease/exports/paged',tokens.a,selectors.a,'POST',{});assert.equal(exported.status,201);
  await rejectRevokedTransaction('managedLeaseAudit','downloadExport',[exported.body.id,exported.body.downloadToken],tokens.a);
  assert.equal((await aDb.managedLeaseExport.findUnique({where:{id:exported.body.id}})).downloadedAt,null);
  assert.equal(await aDb.managedLeaseAudit.count({where:{entityId:exported.body.id,action:'DOWNLOAD_EXPORT'}}),0);
  record('导出manifest下载审计已写入但授权撤销时不返回数据，下载时间与审计回滚');
  assert.equal((await call(a1,'/lease/exports/'+exported.body.id,tokens.a,selectors.a)).status,400);
  const download=await call(a1,'/lease/exports/'+exported.body.id,tokens.a,selectors.a,'GET',undefined,{'x-export-token':exported.body.downloadToken});assert.equal(download.status,200);
  const users=[];for(const page of download.body.collections.users.pages){const chunk=await call(a1,'/lease/exports/'+exported.body.id+'/pages/users/'+page.page,tokens.a,selectors.a,'GET',undefined,{'x-export-token':exported.body.downloadToken});assert.equal(chunk.status,200);users.push(...chunk.body.payload);}
  const text=JSON.stringify({manifest:download.body,users});for(const forbidden of[credentials.mt_control,keys.a,keys.b,'credentialRef','authKey','phoneHash','roles','prompt','synthetic-company-b'])assert.ok(!text.includes(forbidden));assert.ok(users.find(row=>row.id===userId).phone.startsWith('***'));
  const otherToken=(await maintenance.session(selectors.a,otherId)).accessToken;assert.equal((await call(a1,'/lease/exports/'+exported.body.id,otherToken,selectors.a,'GET',undefined,{'x-export-token':exported.body.downloadToken})).status,404);
  await aDb.managedLeaseExport.update({where:{id:exported.body.id},data:{expiresAt:new Date(0)}});assert.equal((await call(a1,'/lease/exports/'+exported.body.id,tokens.a,selectors.a,'GET',undefined,{'x-export-token':exported.body.downloadToken})).status,404);
  assert.equal(await aDb.managedLeaseAudit.count({where:{entityId:exported.body.id,action:'DOWNLOAD_EXPORT'}}),1);
  record('真实一致性快照导出：手机号脱敏、无秘密/角色/另一客户数据，原申请人和额外短期凭据及下载审计');
  const {AuthService}=require(resolve(repo,'apps/server/src/modules/auth/auth.service.ts'));
  const auth=new AuthService(control,undefined,{smembers:async()=>[],del:async()=>{},set:async()=>{}},undefined,undefined,undefined,undefined,undefined,undefined,undefined);
  await auth.revokeAllRefreshTokens(userId);
  assert.equal((await call(a1,'/lease/context',tokens.a,selectors.a)).status,401);assert.equal((await call(b,'/lease/context',tokens.b,selectors.b)).status,401);
  tokens.a=(await maintenance.session(selectors.a,userId)).accessToken;
  record('复用真实AuthService撤销路径，改密/封号时两个客户实例已有会话同时失效');
  await service.membership(customers.a.id,{userId,role:'CUSTOMER_ADMIN',enabled:false,reason:'实时撤销成员授权'},'synthetic-maintainer');assert.equal((await call(a1,'/lease/context',tokens.a,selectors.a)).status,401);
  record('主库撤销成员立即拒绝旧会话，不等待缓存过期');
  await service.renew(customers.a.id,{term,expectedRevision:renewed.revision,reason:'合成验收完成后恢复合同参数'},'synthetic-maintainer');
}catch(error){failure=error;}
finally{
  for(const child of children)if(child.exitCode===null){child.send('stop');await new Promise(done=>{const timer=setTimeout(()=>{child.kill();done();},10000);child.once('exit',()=>{clearTimeout(timer);done();});});}
  for(const client of[control,readControl,aDb,bDb,aRuntimeDb,bRuntimeDb])await client.$disconnect();
}
for(const port of ports){await assert.rejects(()=>fetch(`http://127.0.0.1:${port}/api/v1/lease/context`));}if(ports.length)record('本任务三个子进程与随机监听端口全部退出');
const files=['apps/server/src/lease-main.ts','apps/server/src/modules/managed-tenancy/managed-lease.runtime.ts','apps/server/src/modules/managed-tenancy/managed-lease.module.ts','apps/server/src/modules/managed-tenancy/managed-lease-maintenance.service.ts','apps/server/src/modules/managed-tenancy/managed-credentials.ts','apps/server/src/modules/auth/auth.service.ts','apps/server/prisma/schema.prisma','apps/server/prisma/migrations/manual_z_20261002_08_managed_lease_exit/migration.sql'];
const sources=Object.fromEntries(files.map(path=>[path,createHash('sha256').update(readFileSync(resolve(repo,path))).digest('hex')]));
const report={head:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),sources,node:process.version,checks,passed:checks.length,failed:failure?1:0,error:failure?.message,production:false,limits:['真实本地PostgreSQL16、两客户业务库与只读控制面，三个实际Nest子进程','本机同一Windows用户，未验OS/网络隔离','仅已有商品、圈子、订单、知识与导出最小业务入口；不代表全平台、真实支付、COS或模型调用']};
const output=resolve(process.argv[2]??resolve(repo,'pilots/managed-tenancy/.runtime/lease-postgres.json'));mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed,report:output}));if(failure){console.error(failure.stack);process.exitCode=1;}
