import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {ManagedPostgresHarness,runtime,repo} from './postgres-harness.mjs';
const h=new ManagedPostgresHarness('chat'),requests=[],held=new Map(),waiters=new Map();let failure,savedTerm;
const pause=new Set(['模拟撤销权限','模拟进程退出']);
const server=createServer(async(req,res)=>{
  if(req.method!=='POST'||req.url!=='/synthetic-complete'){res.writeHead(404).end();return;}
  let text='';for await(const chunk of req)text+=chunk;if(text.length>100000){res.writeHead(413).end();return;}
  const body=JSON.parse(text),last=body.messages.at(-1).content;requests.push(body);
  const reply=()=>{res.setHeader('Content-Type','application/json');if(last==='模拟未知结果'){res.writeHead(503).end(JSON.stringify({error:'SYNTHETIC_UNKNOWN'}));}else res.end(JSON.stringify({content:'合成助手答复：'+last,requestId:'synthetic-'+body.requestId}));};
  if(pause.has(last)){held.set(last,reply);waiters.get(last)?.();}else reply();
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));const syntheticProviderUrl='http://127.0.0.1:'+server.address().port+'/synthetic-complete';
const captured=text=>new Promise((done,reject)=>{if(held.has(text)){done();return;}const timer=setTimeout(()=>reject(new Error('合成供应商未收到本任务请求')),15000);waiters.set(text,()=>{clearTimeout(timer);done();});});
try{
  const app=await h.application('a','a'),otherApp=await h.application('a','other'),bApp=await h.application('b','b');const empty={product:[],course:[],circle:[],agent:[]};await h.grantModules(app,empty);await h.grantModules(bApp,empty);
  const p1=await h.start(app,'a1',{syntheticProviderUrl}),p2=await h.start(app,'a2',{syntheticProviderUrl}),bp=await h.start(bApp,'b');
  const admin=await h.account(p1,app,'admin',true),reader=await h.account(p1,app,'reader'),stranger=await h.account(p2,app,'stranger'),other=await h.login(p2,otherApp,reader),bAdmin=await h.account(bp,bApp,'admin',true);
  const api=(path,token=reader.accessToken,method='GET',body,port=p1)=>h.call(port,app,path,token,method,body);
  const circle=await api('/manage/circle',admin.accessToken,'POST',{name:'合成本圈知识域',intro:'仅本圈可用'});assert.equal(circle.status,201);const circleId=circle.body.id;
  assert.equal((await api('/manage/circle/'+circleId+'/review',admin.accessToken,'POST',{revision:1,status:'ACTIVE',needApproval:false,reason:'本圈配置人工核验'})).status,201);
  const agent=await api('/manage/agent',admin.accessToken,'POST',{name:'本圈文本助手',persona:'合成角色说明',circleId});assert.equal(agent.status,201);const agentId=agent.body.id;
  assert.equal((await api('/manage/agent/'+agentId+'/review',admin.accessToken,'POST',{revision:1,status:'APPROVED',reason:'角色人工审核通过'})).status,201);
  for(const [scope,status,content] of [['circle','active','只属于本圈的合成私有资料'],['global','active','禁止使用全局兜底知识'],['circle','removed','已撤除的知识正文']])await h.a.circleKnowledge.create({data:{circleId,scope,status,content,contentHash:createHash('md5').update(content+h.tag).digest('hex'),sourceType:'free_text'}});
  assert.equal((await api('/chats',reader.accessToken,'POST',{agentId})).status,403);
  assert.equal((await api('/agents/'+agentId+'/knowledge?q=资料')).status,403);
  assert.equal((await api('/circles/'+circleId+'/join',reader.accessToken,'POST',{})).status,201);
  const knowledge=await api('/agents/'+agentId+'/knowledge?q=资料');assert.equal(knowledge.status,200);assert.equal(knowledge.body.length,1);
  const session=await api('/chats',reader.accessToken,'POST',{agentId});assert.equal(session.status,201);assert.equal(session.body.providerReady,true);const id=session.body.id,path='/chats/'+id+'/messages';
  assert.equal((await api(path,stranger.accessToken)).status,404);assert.equal((await h.call(p2,otherApp,path,other.accessToken)).status,404);assert.equal((await h.call(bp,bApp,path,bAdmin.accessToken)).status,404);
  assert.equal((await api(path,reader.accessToken,'POST',{text:'普通问句',requestKey:'valid-key',role:'system',model:'other',providerUrl:syntheticProviderUrl})).status,400);
  h.record('会话绑定客户、应用和用户，圈子角色只有有效成员能调用；客户端不能注入模型、URL或消息角色，跨用户/应用/客户历史拒绝');
  const sent=await Promise.all([p1,p2,p1,p2].map(port=>api(path,reader.accessToken,'POST',{text:'首次合成交流',requestKey:'first-message'},port)));assert.ok(sent.every(row=>row.status===201));assert.equal(new Set(sent.map(row=>row.body.id)).size,1);
  const replay=await api(path,reader.accessToken,'POST',{text:'首次合成交流',requestKey:'first-message'});assert.equal(replay.body.state,'COMPLETED');assert.equal(replay.body.assistantText,'合成助手答复：首次合成交流');assert.equal(requests.filter(row=>row.messages.at(-1).content==='首次合成交流').length,1);
  assert.equal(await h.a.managedLeaseChatMessage.count({where:{sessionId:id}}),1);
  const prompt=JSON.stringify(requests[0].messages);assert.ok(prompt.includes('只属于本圈的合成私有资料'));assert.ok(!prompt.includes('禁止使用全局兜底知识'));assert.ok(!prompt.includes('已撤除的知识正文'));
  assert.equal((await api(path,reader.accessToken,'POST',{text:'修改重试内容',requestKey:'first-message'})).status,409);
  const second=await api(path,reader.accessToken,'POST',{text:'下一条交流',requestKey:'second-message'});assert.equal(second.body.sequence,2);assert.equal(second.body.state,'COMPLETED');assert.equal(requests[1].messages.filter(row=>row.role==='assistant').length,1);
  h.record('四次跨进程同键请求仅调用一次合成HTTP供应商、保存一次消息；完成重放不再调用，历史顺序固定，提示词只含本圈有效资料');
  const unknownSession=await api('/chats',reader.accessToken,'POST',{agentId}),unknownPath='/chats/'+unknownSession.body.id+'/messages';
  const unknown=await api(unknownPath,reader.accessToken,'POST',{text:'模拟未知结果',requestKey:'unknown-result'});assert.equal(unknown.body.state,'UNKNOWN');
  const unknownReplay=await api(unknownPath,reader.accessToken,'POST',{text:'模拟未知结果',requestKey:'unknown-result'},p2);assert.equal(unknownReplay.body.state,'UNKNOWN');
  assert.equal(requests.filter(row=>row.messages.at(-1).content==='模拟未知结果').length,1);assert.equal((await api(unknownPath,reader.accessToken,'POST',{text:'模拟未知结果',requestKey:'another-key'})).status,409);
  h.record('上游已收到但返回失败时保留结果未知；跨进程重放只读已有记录，换键也不能盲目重发未确认会话');
  const revokeSession=await api('/chats',reader.accessToken,'POST',{agentId}),revokePath='/chats/'+revokeSession.body.id+'/messages';
  const inflight=api(revokePath,reader.accessToken,'POST',{text:'模拟撤销权限',requestKey:'revoke-message'});await captured('模拟撤销权限');
  await h.a.circleMember.update({where:{circleId_userId:{circleId,userId:reader.userId}},data:{expireAt:new Date()}});held.get('模拟撤销权限')();held.delete('模拟撤销权限');
  assert.equal((await inflight).status,403);const aborted=await h.a.managedLeaseChatMessage.findFirst({where:{sessionId:revokeSession.body.id}});assert.equal(aborted.state,'ABORTED');assert.equal(aborted.assistantText,null);
  assert.equal((await api('/agents/'+agentId+'/knowledge?q=资料')).status,403);
  assert.equal((await api('/circles/'+circleId+'/join',reader.accessToken,'POST',{})).status,201);
  h.record('实际供应商等待期间撤销圈子成员，完成时拒绝下发与保存助手正文，状态ABORTED，知识检索即时拒绝');
  const crashSession=await api('/chats',reader.accessToken,'POST',{agentId}),crashPath='/chats/'+crashSession.body.id+'/messages';
  const crashRequest=api(crashPath,reader.accessToken,'POST',{text:'模拟进程退出',requestKey:'crash-message'},p2).catch(error=>({transportError:true}));await captured('模拟进程退出');
  const crashed=h.children[1];crashed.kill('SIGKILL');await new Promise(done=>crashed.once('exit',done));assert.equal((await crashRequest).transportError,true);
  const dispatch=await h.a.managedLeaseChatMessage.findFirst({where:{sessionId:crashSession.body.id}});assert.equal(dispatch.state,'DISPATCHING');
  await h.a.managedLeaseChatMessage.update({where:{id:dispatch.id},data:{createdAt:new Date(Date.now()-61000)}});
  const recovered=await api(crashPath,reader.accessToken,'POST',{text:'模拟进程退出',requestKey:'crash-message'});assert.equal(recovered.body.state,'UNKNOWN');assert.equal(recovered.body.failureCode,'PROCESS_OUTCOME_UNKNOWN');assert.equal(requests.filter(row=>row.messages.at(-1).content==='模拟进程退出').length,1);
  held.get('模拟进程退出')();held.delete('模拟进程退出');
  h.record('真实杀停本任务一个调用进程后，另一进程读取持久请求并标记未知，不重新调用供应商；仅在合成库推进等待时间避免空等');
  const bAgent=await h.call(bp,bApp,'/manage/agent',bAdmin.accessToken,'POST',{name:'无通道助手',persona:'尚未验证供应商'});assert.equal(bAgent.status,201);
  assert.equal((await h.call(bp,bApp,'/manage/agent/'+bAgent.body.id+'/review',bAdmin.accessToken,'POST',{revision:1,status:'APPROVED',reason:'角色人工审核'})).status,201);
  const offline=await h.call(bp,bApp,'/chats',bAdmin.accessToken,'POST',{agentId:bAgent.body.id});assert.equal(offline.body.providerReady,false);
  assert.equal((await h.call(bp,bApp,'/chats/'+offline.body.id+'/messages',bAdmin.accessToken,'POST',{text:'不能调用真实供应商',requestKey:'no-provider'})).status,503);assert.equal(await h.b.managedLeaseChatMessage.count({where:{sessionId:offline.body.id}}),0);
  h.record('未配置本客户核验与调用授权的实例保持503，没有保存伪助手答案或发送供应商请求');
  const customer=await h.control.managedCustomer.findUnique({where:{id:app.customerId}});savedTerm={id:customer.id,remindAt:customer.remindAt,endAt:customer.endAt,exportUntil:customer.exportUntil,downloadTtlSeconds:customer.downloadTtlSeconds};
  await h.service.renew(customer.id,{expectedRevision:customer.revision,term:{remindAt:new Date(Date.now()-20000).toISOString(),endAt:new Date(Date.now()-10000).toISOString(),exportUntil:new Date(Date.now()+3600000).toISOString(),downloadTtlSeconds:600},reason:'本任务合成到期历史核验'},'synthetic-maintainer');
  const expired=await h.login(p1,app,reader);assert.equal((await api(path,expired.accessToken)).status,200);assert.equal((await api(path,expired.accessToken,'POST',{text:'到期后新调用',requestKey:'expired-message'})).status,403);
  h.record('合同到期仍保留本人已有会话记录，新模型调用禁止；未继承全局角色或知识');
}catch(error){failure=error;}finally{
  for(const reply of held.values())reply();held.clear();
  if(savedTerm){const row=await h.control.managedCustomer.findUnique({where:{id:savedTerm.id}});await h.service.renew(row.id,{expectedRevision:row.revision,term:{remindAt:savedTerm.remindAt.toISOString(),endAt:savedTerm.endAt.toISOString(),exportUntil:savedTerm.exportUntil.toISOString(),downloadTtlSeconds:savedTerm.downloadTtlSeconds},reason:'合成会话核验恢复期限'},'synthetic-maintainer');}
  await h.close();server.closeAllConnections();await new Promise(done=>server.close(done));
}
h.report(resolve(process.argv[2]??resolve(runtime,'chat-postgres.json')),['apps/server/src/modules/managed-tenancy/managed-lease-chat.ts','apps/server/src/modules/managed-tenancy/managed-chat-provider.ts','apps/server/src/modules/managed-tenancy/managed-lease.runtime.ts','apps/server/src/modules/managed-tenancy/managed-lease.module.ts','apps/server/src/modules/ai-gateway/adapters/qwen.adapter.ts','pilots/managed-tenancy/verify-chat-postgres.mjs','pilots/managed-tenancy/lease-process.mjs','pilots/managed-tenancy/postgres-harness.mjs'],failure,['仅本机合成HTTP供应商、三个Nest进程和真实PostgreSQL；未完成真实模型账号鉴权、计费或答案质量验收','未知请求禁止自动重试；无供应商结果查询权限时只能保留未知并由维护人员处理，不承诺自动对账','知识范围为本圈有效文本，未验证pgvector、COS媒体、真实语音或完整RAG质量']);
