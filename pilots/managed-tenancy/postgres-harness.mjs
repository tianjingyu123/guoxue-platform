import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes,createHash} from 'node:crypto';
import {fork,execFileSync} from 'node:child_process';
import {loadCandidatePrisma} from '../../scripts/ops/prisma-candidate/client.mjs';
import {scopedControlUrl} from './scoped-control.mjs';
import {installSyntheticFence} from './synthetic-fence.mjs';

export const repo=fileURLToPath(new URL('../../',import.meta.url)),runtime=resolve(repo,'pilots/managed-tenancy/.runtime');
const require=createRequire(resolve(repo,'apps/server/package.json'));
const {PrismaClient}=loadCandidatePrisma();
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'commonjs',experimentalDecorators:true,emitDecoratorMetadata:true}});require('reflect-metadata');
const {ManagedTenancyService}=require(resolve(repo,'apps/server/src/modules/managed-tenancy/managed-tenancy.service.ts'));
/** 只连接本任务三库；配置不打印，独立进程与随机监听端口在 finally 中回收。 */
export class ManagedPostgresHarness {
  constructor(label){
    this.tag=label+'-'+Date.now();this.password='Synthetic-'+randomBytes(12).toString('hex');this.children=[];this.ports=[];this.saved=[];this.checks=[];
    const credentials=JSON.parse(readFileSync(resolve(runtime,'postgres/synthetic-connections.json'),'utf8'));
    const client=name=>new PrismaClient({datasources:{db:{url:`postgresql://${name}:${credentials[name]}@127.0.0.1:55467/${name}`}}});
    this.control=client('mt_control');this.a=client('mt_customer_a');this.b=client('mt_customer_b');this.service=new ManagedTenancyService(this.control);
    this.refs=JSON.parse(readFileSync(resolve(runtime,'lease-postgres/credentials.json'),'utf8'));
  }
  record(name){this.checks.push({name,status:'PASS'});}
  adminSql(database,statement){
    if(!['mt_customer_a','mt_customer_b'].includes(database))throw new Error('故障注入仅限本任务客户库');
    const password=readFileSync(resolve(runtime,'postgres/synthetic-password.txt'),'utf8').trim();
    const args=['-X','-h','127.0.0.1','-p','55467','-U','mt_admin','-d',database,'-v','ON_ERROR_STOP=1','-At'];
    const execute=sql=>execFileSync('C:/Program Files/PostgreSQL/16/bin/psql.exe',args,{input:sql,env:{...process.env,PGPASSWORD:password},encoding:'utf8'});
    if(execute('SELECT current_database()||\':\'||current_user||\':\'||inet_server_port()::text;').trim()!==database+':mt_admin:55467')throw new Error('故障注入目标身份不符');
    return execute(statement);
  }
  async application(suffix,serial,template='community'){
    const customer=await this.control.managedCustomer.findFirst({where:{deployment:{databaseName:'mt_customer_'+suffix}},include:{grant:true,deployment:true}});
    assert.equal(customer.deployment.state,'READY');assert.ok(customer.endAt.getTime()>Date.now());
    const applicationId=this.tag+'-app-'+serial,key=this.tag+'-client-'+serial;
    const application=await this.control.managedApplication.create({data:{customerId:customer.id,applicationId,applicationSubject:'synthetic-local-owner',allowedPlatforms:['h5'],brand:{name:'合成经营客户',themeColor:'#225544'},templateId:template}});
    await this.control.appDistribution.create({data:{clientKey:key,productId:'synthetic',applicationId,platform:'h5',channelId:'synthetic-management',packageName:'synthetic.not-a-real-channel'}});
    await this.service.enableApplication(application.id,'synthetic-maintainer','本任务独立经营合成验收');
    return {suffix,serial,customerId:customer.id,applicationId,key,application,db:suffix==='a'?this.a:this.b};
  }
  async grantModules(app,resources){
    const customer=await this.control.managedCustomer.findUnique({where:{id:app.customerId},include:{grant:true}});
    if(!this.saved.some(row=>row.id===customer.id)){this.saved.push({id:customer.id,grant:customer.grant});writeFileSync(resolve(runtime,this.tag+'-saved-grants.json'),JSON.stringify(this.saved),{mode:0o600});}
    const count=await app.db.circle.count({where:{deletedAt:null}});
    await this.service.updateGrant(customer.id,{modules:['shop','course','circle','agent'],resources:resources??customer.grant.resources,circleLimit:Math.min(10000,Math.max(customer.grant.circleLimit,count+10)),creationLimits:{products:5000,courses:5000,agents:1000,storageBytes:64*1024*1024,users:200000},expectedRevision:customer.revision,reason:'本任务经营入口合成授权'},'synthetic-maintainer');
  }
  async start(app,serial=app.serial,extra={}){
    await installSyntheticFence(this.control,app.customerId);
    const path=resolve(runtime,this.tag+'-'+serial+'.json');
    writeFileSync(path,JSON.stringify({customerId:app.customerId,credential:this.refs['secret-ref:synthetic/real-lease-'+app.suffix],controlUrl:await scopedControlUrl(app.customerId),...extra}),{mode:0o600});
    const child=fork(resolve(repo,'pilots/managed-tenancy/lease-process.mjs'),[path],{cwd:repo,stdio:['ignore','ignore','pipe','ipc'],windowsHide:true});this.children.push(child);
    child.stderr.on('data',data=>writeFileSync(resolve(runtime,this.tag+'-'+serial+'-stderr.txt'),data,{mode:0o600,flag:'a'}));
    const result=await new Promise((done,reject)=>{const timer=setTimeout(()=>reject(new Error('固定客户入口启动超时')),30000);child.once('message',message=>{clearTimeout(timer);done(message);});child.once('exit',()=>{clearTimeout(timer);reject(new Error('固定客户入口退出'));});});
    assert.equal(result.ready,true);this.ports.push(result.port);return result.port;
  }
  async call(port,app,path,token,method='GET',body){
    const response=await fetch(`http://127.0.0.1:${port}/api/v1/lease${path}`,{method,headers:{'Content-Type':'application/json','x-app-client':app.key,...(token?{Authorization:'Bearer '+token}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
    return {status:response.status,body:await response.json()};
  }
  async account(port,app,label,admin=false){
    const username=this.tag+'-'+label;
    let response=await this.call(port,app,'/auth/register',undefined,'POST',{username,password:this.password,nickname:'合成客户本地用户'});assert.equal(response.status,201);
    if(admin){await this.control.managedMembership.create({data:{customerId:app.customerId,userId:response.body.userId,identityProvider:'LOCAL',role:'CUSTOMER_ADMIN'}});response=await this.call(port,app,'/auth/login',undefined,'POST',{username,password:this.password});assert.equal(response.status,200);}
    return {...response.body,username};
  }
  async login(port,app,account){const response=await this.call(port,app,'/auth/login',undefined,'POST',{username:account.username,password:this.password});assert.equal(response.status,200);return {...response.body,username:account.username};}
  async close(){
    for(const child of this.children)if(child.exitCode===null&&child.signalCode===null){if(child.connected)child.send('stop');else child.kill();await new Promise(done=>{const timer=setTimeout(()=>{child.kill();done();},10000);child.once('exit',()=>{clearTimeout(timer);done();});});}
    for(const saved of this.saved){const row=await this.control.managedCustomer.findUnique({where:{id:saved.id}});await this.service.updateGrant(row.id,{modules:saved.grant.modules,resources:saved.grant.resources,circleLimit:saved.grant.circleLimit,creationLimits:saved.grant.creationLimits,expectedRevision:row.revision,reason:'合成经营验收恢复原授权'},'synthetic-maintainer');}
    for(const db of[this.control,this.a,this.b])await db.$disconnect();
    for(const port of this.ports)await assert.rejects(()=>fetch(`http://127.0.0.1:${port}/api/v1/lease/context`));
    if(this.ports.length)this.record('本任务全部独立子进程及随机端口已退出');
  }
  report(output,files,failure,limits){
    const report={head:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),workingTreeDirty:!!execFileSync('git',['status','--porcelain'],{cwd:repo,encoding:'utf8'}).trim(),sources:Object.fromEntries(files.map(path=>[path,createHash('sha256').update(readFileSync(resolve(repo,path))).digest('hex')])),checks:this.checks,passed:this.checks.length,failed:failure?1:0,production:false,limits};
    mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');if(failure)writeFileSync(resolve(runtime,this.tag+'-diagnostic.txt'),failure.stack||String(failure),{mode:0o600});
    console.log(JSON.stringify({passed:report.passed,failed:report.failed,report:output}));if(failure)process.exitCode=1;
  }
}
