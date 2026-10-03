import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,renameSync} from 'node:fs';
import {resolve} from 'node:path';
import {ManagedPostgresHarness,repo,runtime} from './postgres-harness.mjs';
const h=new ManagedPostgresHarness('provider-reload'),require=createRequire(resolve(repo,'apps/server/package.json'));
const {providerReceiptSignature}=require(resolve(repo,'apps/server/src/modules/managed-tenancy/managed-chat-provider.ts'));
const file=resolve(runtime,h.tag+'-provider-credentials.json'),requests=[],held=[];let failure,releaseLock,lockTask,triggerInstalled=false;
const server=createServer(async(req,res)=>{
  if(req.method!=='POST'||req.url!=='/synthetic-complete'){res.writeHead(404).end();return;}
  let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw);requests.push(body);
  const reply=()=>res.end(JSON.stringify({content:'合成动态授权答复'}));res.setHeader('Content-Type','application/json');
  if(body.messages.at(-1).content==='授权在途撤销')held.push(reply);else reply();
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));const syntheticProviderUrl='http://127.0.0.1:'+server.address().port+'/synthetic-complete';
const entries={};const publish=()=>{const temp=file+'.new';writeFileSync(temp,JSON.stringify(entries),{mode:0o600});renameSync(temp,file);};
const until=async predicate=>{const end=Date.now()+15000;while(!await predicate()){if(Date.now()>end)throw new Error('动态授权演练同步超时');await new Promise(done=>setTimeout(done,25));}};
try{
  const a=await h.application('a','a'),other=await h.application('a','other'),b=await h.application('b','b');await h.grantModules(a,{product:[],course:[],circle:[],agent:[]});await h.grantModules(b,{product:[],course:[],circle:[],agent:[]});
  const count=(db,id)=>db.managedLeaseChatMessage.count({where:{session:{customerId:id}}}),pending=(db,id)=>db.managedLeaseChatMessage.count({where:{session:{customerId:id},state:{in:['DISPATCHING','UNKNOWN']}}});
  const base=await count(h.a,a.customerId),unresolved=await pending(h.a,a.customerId),bBase=await count(h.b,b.customerId),bPending=await pending(h.b,b.customerId);assert.ok(unresolved<97&&bPending<99);
  const register=async(app,budget)=>{
    const deployment=await h.control.managedDeployment.findUnique({where:{customerId:app.customerId}}),key='synthetic-supplier-key-not-a-real-account-'+app.suffix;
    const receipt={customerId:app.customerId,spaceKey:deployment.spaceKey,provider:'qwen',baseUrl:'https://dashscope.aliyuncs.com/compatible-mode/v1',model:'synthetic-reload-model',keyFingerprint:createHash('sha256').update(key).digest('hex'),verifiedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+3600000).toISOString(),verificationMethod:'GET_MODELS',providerRequestId:'synthetic-reload-verification',responseSha256:'1'.repeat(64),paidCallsAuthorized:true,callBudget:budget};
    return {baseUrl:receipt.baseUrl,model:receipt.model,apiKey:key,receipt,signature:providerReceiptSignature(receipt,h.refs['secret-ref:synthetic/real-lease-'+app.suffix].authKey)};
  };
  entries[a.customerId]=await register(a,{maxRequests:base+6,maxUnresolved:unresolved+2});entries[b.customerId]=await register(b,{maxRequests:bBase+2,maxUnresolved:bPending+1});publish();
  const change=(budget,paid=true)=>{const row=entries[a.customerId];row.receipt={...row.receipt,paidCallsAuthorized:paid,callBudget:budget};row.signature=providerReceiptSignature(row.receipt,h.refs['secret-ref:synthetic/real-lease-a'].authKey);publish();};
  const extra={syntheticProviderUrl,syntheticRegisteredProviderFile:file},p1=await h.start(a,'a1',extra),p2=await h.start(other,'a2',extra),bp=await h.start(b,'b',extra);
  const one=await h.account(p1,a,'one',true),two=await h.account(p2,other,'two',true),bUser=await h.account(bp,b,'b-user',true);
  const agent=async(port,app,user)=>{const r=await h.call(port,app,'/manage/agent',user.accessToken,'POST',{name:'合成动态授权助手',persona:'仅本机测试'});assert.equal(r.status,201);assert.equal((await h.call(port,app,'/manage/agent/'+r.body.id+'/review',user.accessToken,'POST',{revision:1,status:'APPROVED',reason:'动态授权人工核验'})).status,201);return r.body.id;};
  const chat=async(port,app,user)=>{const agentId=await agent(port,app,user),r=await h.call(port,app,'/chats',user.accessToken,'POST',{agentId});assert.equal(r.status,201);assert.equal(r.body.providerReady,true);return r.body.id;};
  const s1=await chat(p1,a,one),s2=await chat(p2,other,two),sb=await chat(bp,b,bUser),send=(port,app,user,id,text,key)=>h.call(port,app,'/chats/'+id+'/messages',user.accessToken,'POST',{text,requestKey:key});
  const first=await send(p1,a,one,s1,'首次签名授权','first');assert.equal(first.body.state,'COMPLETED');assert.equal(requests.length,1);
  change({maxRequests:base+1,maxUnresolved:unresolved+2});for(const [port,app,user,id]of [[p1,a,one,s1],[p2,other,two,s2]])assert.equal((await send(port,app,user,id,'运行中减额','reduced')).status,403);assert.equal(await count(h.a,a.customerId),base+1);assert.equal(requests.length,1);
  h.record('共享受限文件原子替换后两个既有Nest进程都按签名减额拒绝新预留，不重启、不沿用旧预算、不发出新HTTP');
  change({maxRequests:base+6,maxUnresolved:unresolved+2});
  // 用真实PG触发器暂停已经核过旧预算、尚未提交的预留，更新签名后再释放。
  const lockId=1000000000+Math.floor(Math.random()*100000000),fn='synthetic_reload_pause',trigger='synthetic_reload_pause';
  assert.match(one.userId,/^[a-zA-Z0-9_-]+$/);
  h.adminSql('mt_customer_a',`CREATE FUNCTION public.${fn}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='DISPATCH_OWN_CHAT' AND NEW."userId"='${one.userId}' THEN PERFORM pg_advisory_xact_lock(${lockId}); END IF; RETURN NEW; END $$; CREATE TRIGGER ${trigger} BEFORE INSERT ON "ManagedLeaseAudit" FOR EACH ROW EXECUTE FUNCTION public.${fn}();`);triggerInstalled=true;
  let locked,lockFailed;const ready=new Promise((done,reject)=>{locked=done;lockFailed=reject;}),release=new Promise(done=>releaseLock=done);
  lockTask=h.a.$transaction(async tx=>{await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(${lockId})`);locked();await release;},{timeout:30000});void lockTask.catch(lockFailed);await ready;
  const queued=send(p1,a,one,s1,'预留后减额','queued-reduction');void queued.catch(()=>{});await until(async()=>Number((await h.a.$queryRawUnsafe(`SELECT count(*)::int n FROM pg_locks WHERE locktype='advisory' AND objid=${lockId} AND NOT granted`))[0].n)>0);
  change({maxRequests:base+1,maxUnresolved:unresolved+2});releaseLock();releaseLock=undefined;await lockTask;lockTask=undefined;
  const queuedResult=await queued;assert.equal(queuedResult.status,201);assert.equal(queuedResult.body.state,'ABORTED');assert.equal(queuedResult.body.failureCode,'REQUEST_AUTHORIZATION_CHANGED');assert.equal(requests.length,1);assert.equal(await count(h.a,a.customerId),base+2);
  h.adminSql('mt_customer_a',`DROP TRIGGER ${trigger} ON "ManagedLeaseAudit"; DROP FUNCTION public.${fn}();`);triggerInstalled=false;
  h.record('真实PG暂停已核旧额度的预留；减额后派发前二次检查将请求ABORTED，零供应商调用，累计预留次数保留');
  change({maxRequests:base+6,maxUnresolved:unresolved+2});const raised=await send(p2,other,two,s2,'显式签名提高测试预算','raised');assert.equal(raised.body.state,'COMPLETED');assert.equal(requests.length,2);assert.equal(await count(h.a,a.customerId),base+3);
  h.record('显式提高合成签名预算后另一既有进程继续，历史及ABORTED次数均不清零，不自动退款');
  change({maxRequests:base+6,maxUnresolved:unresolved+2},false);for(const [port,app,user,id]of [[p1,a,one,s1],[p2,other,two,s2]])assert.equal((await send(port,app,user,id,'撤销后不能调用','revoked')).status,503);assert.equal(requests.length,2);
  assert.equal((await h.call(p2,other,'/chats',two.accessToken)).body.providerReady,false);const replay=await send(p1,a,one,s1,'首次签名授权','first');assert.equal(replay.body.id,first.body.id);assert.equal(replay.body.state,'COMPLETED');assert.equal(requests.length,2);
  h.record('签名撤销同时阻断两个运行进程，状态返回未就绪；本人已完成历史仍可同键读取，不补发');
  const saved=entries[a.customerId];delete entries[a.customerId];publish();assert.equal((await send(p1,a,one,s1,'删除登记不继承旧授权','removed')).status,503);
  const bResult=await send(bp,b,bUser,sb,'另一客户仍独立授权','b-independent');assert.equal(bResult.body.state,'COMPLETED');assert.equal(requests.length,3);entries[a.customerId]=saved;
  change({maxRequests:base+6,maxUnresolved:unresolved+2});entries[a.customerId].receipt.callBudget.maxRequests++;publish();assert.equal((await send(p2,other,two,s2,'签名篡改拒绝','tampered')).status,503);assert.equal(requests.length,3);
  writeFileSync(file,'{',{mode:0o600});assert.equal((await send(p1,a,one,s1,'配置损坏拒绝','invalid-json')).status,503);change({maxRequests:base+6,maxUnresolved:unresolved+2});
  h.record('删除登记、篡改预算签名和损坏JSON均关闭授权，不缓存旧记录；删除A条目不影响B的有效签名和独立调用');
  const inflight=send(p1,a,one,s1,'授权在途撤销','inflight');await until(()=>held.length===1);change({maxRequests:base+6,maxUnresolved:unresolved+2},false);held.shift()();const result=await inflight;assert.equal(result.status,503);
  const aborted=await h.a.managedLeaseChatMessage.findFirst({where:{sessionId:s1,requestKey:'inflight'}});assert.equal(aborted.state,'ABORTED');assert.equal(aborted.failureCode,'RESULT_AUTHORIZATION_CHANGED');assert.equal(aborted.assistantText,null);assert.equal(requests.length,4);
  h.record('请求已经到达合成供应商后撤销，收到答复也不保存或下发助手正文，ABORTED仍计次数；不声称能撤回已派发费用');
  change({maxRequests:base+6,maxUnresolved:unresolved+2});const original=JSON.parse(JSON.stringify(entries[a.customerId]));entries[a.customerId].apiKey='synthetic-rotated-key-not-a-real-account';entries[a.customerId].receipt.keyFingerprint=createHash('sha256').update(entries[a.customerId].apiKey).digest('hex');entries[a.customerId].signature=providerReceiptSignature(entries[a.customerId].receipt,h.refs['secret-ref:synthetic/real-lease-a'].authKey);publish();assert.equal((await send(p2,other,two,s2,'固定通道不能热换密钥','rotated')).status,503);assert.equal(requests.length,4);entries[a.customerId]=original;publish();
  h.record('即使新密钥登记签名有效，原进程固定通道身份变化也拒绝，不在运行中改接另一密钥或模型');
}catch(error){failure=error;}finally{
  if(releaseLock)releaseLock();if(lockTask)await lockTask.catch(()=>{});
  if(triggerInstalled)h.adminSql('mt_customer_a','DROP TRIGGER IF EXISTS synthetic_reload_pause ON "ManagedLeaseAudit"; DROP FUNCTION IF EXISTS public.synthetic_reload_pause();');
  for(const reply of held.splice(0))reply();await h.close();server.closeAllConnections();await new Promise(done=>server.close(done));
}
h.report(resolve(process.argv[2]??resolve(runtime,'provider-reload-postgres.json')),['apps/server/src/modules/managed-tenancy/managed-chat-provider.ts','apps/server/src/modules/managed-tenancy/managed-lease-chat.ts','pilots/managed-tenancy/lease-process.mjs','pilots/managed-tenancy/verify-provider-reload-postgres.mjs'],failure,['三个真实Nest进程、本任务PostgreSQL及共享签名文件，供应商为loopback替身，未进行真实鉴权或付费调用','单写维护者须原子替换同一受限文件，进程间配置副本分发一致性和Linux部署门禁另验','每次预留、派发和提交核当前授权，已通过最后检查并发给上游的请求不能回撤；撤销不证明上游未计费','启动时没有客户登记仍须登记后重启；固定模型、端点和密钥轮换须重启，UNKNOWN对账及真实费用仍未完成']);
