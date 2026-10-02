import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes,createHash} from 'node:crypto';
import {fork,execFileSync} from 'node:child_process';
import {loadCandidatePrisma} from '../../scripts/ops/prisma-candidate/client.mjs';
const repo=fileURLToPath(new URL('../../',import.meta.url)),runtime=resolve(repo,'pilots/managed-tenancy/.runtime'),require=createRequire(resolve(repo,'apps/server/package.json'));
const {PrismaClient}=loadCandidatePrisma();require('ts-node').register({transpileOnly:true,compilerOptions:{module:'commonjs',experimentalDecorators:true,emitDecoratorMetadata:true}});require('reflect-metadata');
const {ManagedTenancyService}=require(resolve(repo,'apps/server/src/modules/managed-tenancy/managed-tenancy.service.ts'));
const credentials=JSON.parse(readFileSync(resolve(runtime,'postgres/synthetic-connections.json'),'utf8')),reader=JSON.parse(readFileSync(resolve(runtime,'postgres/synthetic-reader.json'),'utf8')),refs=JSON.parse(readFileSync(resolve(runtime,'lease-postgres/credentials.json'),'utf8'));
const client=name=>new PrismaClient({datasources:{db:{url:`postgresql://${name}:${credentials[name]}@127.0.0.1:55467/${name}`}}});const control=client('mt_control'),a=client('mt_customer_a'),b=client('mt_customer_b'),service=new ManagedTenancyService(control);
const children=[],ports=[],checks=[],record=name=>checks.push({name,status:'PASS'}),customers={},selectors={},resources={},savedGrants={};const tag='learning-'+Date.now(),password='Synthetic-'+randomBytes(12).toString('hex');let failure;
async function start(suffix,serial){
  const file=resolve(runtime,tag+'-'+serial+'.json');writeFileSync(file,JSON.stringify({customerId:customers[suffix].id,credential:refs['secret-ref:synthetic/real-lease-'+suffix],controlUrl:`postgresql://mt_control_reader:${reader.password}@127.0.0.1:55467/mt_control`}),{mode:0o600});
  const child=fork(resolve(repo,'pilots/managed-tenancy/lease-process.mjs'),[file],{cwd:repo,stdio:['ignore','ignore','pipe','ipc'],windowsHide:true});children.push(child);child.stderr.on('data',data=>writeFileSync(resolve(runtime,tag+'-'+serial+'-stderr.txt'),data,{mode:0o600,flag:'a'}));
  const result=await new Promise((done,reject)=>{const timer=setTimeout(()=>reject(new Error('独立学习入口启动超时')),30000);child.once('message',m=>{clearTimeout(timer);done(m);});child.once('exit',()=>{clearTimeout(timer);reject(new Error('独立学习入口退出'));});});assert.equal(result.ready,true);ports.push(result.port);return result.port;
}
const call=async(port,key,path,token,method='GET',body)=>{const r=await fetch(`http://127.0.0.1:${port}/api/v1/lease${path}`,{method,headers:{'Content-Type':'application/json','x-app-client':key,...(token?{Authorization:'Bearer '+token}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});return{status:r.status,body:await r.json()};};
try{
  for(const suffix of['a','b']){
    const db=suffix==='a'?a:b;
    const customer=await control.managedCustomer.findFirst({where:{deployment:{databaseName:'mt_customer_'+suffix}},include:{grant:true,deployment:true}});assert.equal(customer.deployment.state,'READY');assert.ok(customer.endAt>Date.now());customers[suffix]=customer;savedGrants[suffix]=customer.grant;
    const teacher=await db.user.create({data:{nickname:'合成本客户课程作者'}}),courses={};
    for(const type of['free','paid','hidden','draft']){
      const course=await db.course.create({data:{id:tag+'-'+type+'-'+suffix,userId:teacher.id,title:'合成课程'+type,price:type==='paid'?50:0,validityDays:type==='paid'?1:0,auditStatus:type==='draft'?'PENDING':'APPROVED'}});
      const chapter=await db.courseChapter.create({data:{courseId:course.id,title:'本库章节'+suffix,content:'仅客户'+suffix+'可用的合成课程内容',sortOrder:0,freeTrial:false}});courses[type]={course,chapter};
    }
    const trial=await db.courseChapter.create({data:{courseId:courses.paid.course.id,title:'合成免费试看',content:'试看内容',freeTrial:true,sortOrder:1}});resources[suffix]={...courses,trial};
    const granted=await service.updateGrant(customer.id,{modules:[...new Set([...customer.grant.modules,'course'])],resources:{...customer.grant.resources,course:['free','paid','draft'].map(type=>courses[type].course.id)},circleLimit:customer.grant.circleLimit,expectedRevision:customer.revision,reason:'独立学习白名单合成验证'},'synthetic-maintainer');customers[suffix]=granted;
    const app=await control.managedApplication.create({data:{customerId:customer.id,applicationId:tag+'-app-'+suffix,applicationSubject:'synthetic-learning-owner',allowedPlatforms:['h5'],brand:{name:'合成学习客户'},templateId:'community'}});const selector=tag+'-client-'+suffix;selectors[suffix]=selector;
    await control.appDistribution.create({data:{clientKey:selector,productId:'synthetic',applicationId:app.applicationId,platform:'h5',channelId:'synthetic-learning',packageName:'synthetic.not-a-real-channel'}});await service.enableApplication(app.id,'synthetic-maintainer','本任务合成学习入口验收');
  }
  const a1=await start('a','a1'),a2=await start('a','a2'),bp=await start('b','b');
  const signup=async(port,key,account)=>{const r=await call(port,key,'/auth/register',undefined,'POST',{username:tag+'-'+account,password,nickname:'合成学习账号'});assert.equal(r.status,201);return r.body;};
  const student=await signup(a1,selectors.a,'student'),other=await signup(a2,selectors.a,'other'),bStudent=await signup(bp,selectors.b,'student');const own=resources.a;
  const route=(course,chapter)=>'/courses/'+course+'/chapters'+(chapter?'/'+chapter:'');
  assert.equal((await call(a1,selectors.a,route(own.free.course.id,own.free.chapter.id),student.accessToken)).status,200);
  assert.equal((await call(a1,selectors.a,route(own.hidden.course.id,own.hidden.chapter.id),student.accessToken)).status,400);
  assert.equal((await call(a1,selectors.a,route(own.draft.course.id,own.draft.chapter.id),student.accessToken)).status,404);
  assert.equal((await call(a1,selectors.a,route(own.free.course.id,own.paid.chapter.id),student.accessToken)).status,404);
  assert.equal((await call(a1,selectors.a,route(resources.b.free.course.id,resources.b.free.chapter.id),student.accessToken)).status,400);
  assert.equal((await call(bp,selectors.b,route(own.free.course.id,own.free.chapter.id),bStudent.accessToken)).status,400);
  assert.equal((await call(bp,selectors.b,route(resources.b.free.course.id),student.accessToken)).status,401);
  record('三个Nest进程真实章节白名单、审核、课程归属、跨库与跨客户会话检查；合成文本内容可读');
  const catalog=await call(a1,selectors.a,route(own.paid.course.id),student.accessToken);assert.equal(catalog.status,200);assert.ok(catalog.body.every(row=>!Object.hasOwn(row,'content')&&!Object.hasOwn(row,'mediaUrl')));assert.equal(catalog.body.find(row=>row.id===own.paid.chapter.id).accessible,false);
  assert.equal((await call(a1,selectors.a,route(own.paid.course.id,own.paid.chapter.id),student.accessToken)).status,403);assert.equal((await call(a1,selectors.a,route(own.paid.course.id,own.trial.id),student.accessToken)).status,200);
  const savePath=route(own.paid.course.id,own.paid.chapter.id)+'/progress';assert.equal((await call(a1,selectors.a,savePath,student.accessToken,'PUT',{progress:100})).status,403);
  record('未购买只能看已授权试看；章节目录无内容和媒体地址，未有课程权益不能写进度');
  await a.order.create({data:{userId:student.userId,type:'COURSE',targetId:own.paid.course.id,amount:50,status:'PAID',paidAt:new Date(Date.now()-2*86400000),payMethod:'SYNTHETIC_TEST_ONLY'}});
  const otherOrder=await a.order.create({data:{userId:other.userId,type:'COURSE',targetId:own.paid.course.id,amount:50,status:'PAID',paidAt:new Date(),payMethod:'SYNTHETIC_TEST_ONLY'}});
  const pending=await a.order.create({data:{userId:student.userId,type:'COURSE',targetId:own.paid.course.id,amount:50,status:'PENDING',paidAt:new Date(),payMethod:'SYNTHETIC_TEST_ONLY'}});
  assert.equal((await call(a1,selectors.a,route(own.paid.course.id,own.paid.chapter.id),student.accessToken)).status,403);
  assert.equal((await call(a1,selectors.a,route(own.paid.course.id,own.paid.chapter.id),other.accessToken)).status,200);
  const paid=await a.order.create({data:{userId:student.userId,type:'COURSE',targetId:own.paid.course.id,amount:50,status:'PAID',paidAt:new Date(),payMethod:'SYNTHETIC_TEST_ONLY'}});
  assert.equal((await call(a2,selectors.a,route(own.paid.course.id,own.paid.chapter.id),student.accessToken)).status,200);
  record('真实合成订单状态：未支付、过期或另一用户已付不授本人权益；本人有效已付订单授学习');
  assert.equal((await call(a1,selectors.a,savePath,student.accessToken,'PUT',{progress:10,userId:other.userId})).status,400);
  assert.equal((await call(a1,selectors.a,savePath,student.accessToken,'PUT',{progress:101})).status,400);assert.equal((await call(a1,selectors.a,savePath,student.accessToken,'PUT',{progress:-1})).status,400);
  const results=await Promise.all([20,90,50,70].map((value,index)=>call(index%2?a1:a2,selectors.a,savePath,student.accessToken,'PUT',{progress:value})));assert.ok(results.every(row=>row.status===200));assert.equal(await a.courseProgress.count({where:{userId:student.userId,chapterId:own.paid.chapter.id}}),1);
  assert.equal((await a.courseProgress.findUnique({where:{userId_chapterId:{userId:student.userId,chapterId:own.paid.chapter.id}}})).progress,90);
  const completed=await call(a1,selectors.a,savePath,student.accessToken,'PUT',{progress:100});assert.equal(completed.body.completed,true);
  const delayed=await call(a2,selectors.a,savePath,student.accessToken,'PUT',{progress:5});assert.equal(delayed.body.progress,100);assert.equal(delayed.body.completed,true);
  assert.deepEqual((await call(a1,selectors.a,'/courses/'+own.paid.course.id+'/progress?userId='+student.userId,other.accessToken)).body,[]);
  record('跨进程进度写入只产生一行且单调前进，低进度重放不回退；未知用户/完成字段和越界值拒绝，读取只归本人');
  await a.order.update({where:{id:paid.id},data:{status:'REFUNDED'}});
  assert.equal((await call(a1,selectors.a,route(own.paid.course.id,own.paid.chapter.id),student.accessToken)).status,403);
  assert.equal((await call(a1,selectors.a,savePath,student.accessToken,'PUT',{progress:80})).status,403);assert.equal((await a.courseProgress.findUnique({where:{userId_chapterId:{userId:student.userId,chapterId:own.paid.chapter.id}}})).progress,100);
  assert.equal((await call(a1,selectors.a,route(own.paid.course.id,own.paid.chapter.id),other.accessToken)).status,200);assert.equal(pending.status,'PENDING');assert.equal(otherOrder.userId,other.userId);
  record('合成退款后即时拒绝内容和进度写入，既有进度保留，另一用户有效权益不受影响');
  await a.course.update({where:{id:own.free.course.id},data:{auditStatus:'DRAFT'}});assert.equal((await call(a1,selectors.a,route(own.free.course.id,own.free.chapter.id),student.accessToken)).status,404);
  assert.equal((await call(a1,selectors.a,'/orders',student.accessToken,'POST',{type:'COURSE',status:'PAID'})).status,404);
  record('课程下架即时拒绝章节；独立学习入口没有客户端指定已付状态或创建支付订单的路由');
}catch(error){failure=error;writeFileSync(resolve(runtime,'learning-diagnostic.txt'),error.stack||String(error),{mode:0o600});}
finally{
  for(const child of children)if(child.exitCode===null){child.send('stop');await new Promise(done=>{const timer=setTimeout(()=>{child.kill();done();},10000);child.once('exit',()=>{clearTimeout(timer);done();});});}
  for(const suffix of Object.keys(savedGrants)){const grant=savedGrants[suffix],row=await control.managedCustomer.findUnique({where:{id:customers[suffix].id}});await service.updateGrant(row.id,{modules:grant.modules,resources:grant.resources,circleLimit:grant.circleLimit,expectedRevision:row.revision,reason:'独立学习合成验收恢复原授权'},'synthetic-maintainer');}
  for(const db of[control,a,b])await db.$disconnect();
}
for(const port of ports)await assert.rejects(()=>fetch(`http://127.0.0.1:${port}/api/v1/lease/context`));if(ports.length)record('三个学习子进程与全部随机监听端口已退出');
const files=['apps/server/src/modules/managed-tenancy/managed-lease-learning.ts','apps/server/src/modules/managed-tenancy/managed-lease.runtime.ts','apps/server/src/modules/managed-tenancy/managed-lease.module.ts','apps/server/src/modules/managed-tenancy/managed-lease-permissions.ts','pilots/managed-tenancy/verify-learning-postgres.mjs'];
const report={head:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),sources:Object.fromEntries(files.map(path=>[path,createHash('sha256').update(readFileSync(resolve(repo,path))).digest('hex')])),checks,passed:checks.length,failed:failure?1:0,production:false,limits:['本任务三个Nest进程和真实PostgreSQL合成数据；已付/退款由准备账号置为合成状态，没有真实付款或退款','只覆盖文本章节、既有已付权益与本人进度，不继承平台会员，不含真实视频、证书、作业、课程交易或完整圈子/聊天','权益和进度不替代生产退款并发及媒体访问回收验收']};
const output=resolve(process.argv[2]??resolve(runtime,'learning-postgres.json'));mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed,report:output}));if(failure)process.exitCode=1;
