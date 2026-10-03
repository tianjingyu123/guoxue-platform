import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {resolve} from 'node:path';
import {ManagedPostgresHarness,runtime} from './postgres-harness.mjs';
const h=new ManagedPostgresHarness('provider-request'),requests=[],held=[];let failure;
// 编号由合成供应商独立给出，不使用数据库消息ID、用户正文或本地重试键。
const ids={normal:'chatcmpl-synthetic-normal-42',length:'chatcmpl-synthetic-length-43',empty:'chatcmpl-synthetic-empty-44',revoke:'chatcmpl-synthetic-revoke-45'};
const invalid=[123,'','x'.repeat(129),'bad\r\nheader','中文编号'];
const server=createServer(async(req,res)=>{
  if(req.method!=='POST'||req.url!=='/synthetic-qwen/v1/chat/completions'){res.writeHead(404).end();return;}
  const parts=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>100000){res.writeHead(413).end();return;}parts.push(chunk);}
  const body=JSON.parse(Buffer.concat(parts).toString('utf8')),text=body.messages.at(-1).content;requests.push(text);assert.equal(body.stream,false);assert.equal(body.model,'synthetic-model');
  res.setHeader('Content-Type','application/json');res.setHeader('X-Request-Id','synthetic-header-is-not-verified-chat-contract');
  const answer={choices:[{message:{content:'合成编号答复'},finish_reason:'stop'}]};
  if(text==='正常编号')answer.id=ids.normal;
  else if(text==='响应截断结束'){answer.id=ids.length;answer.choices[0].finish_reason='length';}
  else if(text==='无效正文'){answer.id=ids.empty;answer.choices[0].message.content='';}
  else if(text==='在途撤权')answer.id=ids.revoke;
  else if(text.startsWith('非法编号-'))answer.id=invalid[Number(text.slice(5))];
  else if(text==='不完整JSON'){res.end('{"id":"chatcmpl-unparsed","choices":[');return;}
  else if(text==='错误正文'){res.writeHead(503).end(JSON.stringify({id:'chatcmpl-error-body-must-not-be-read'}));return;}
  const reply=()=>res.end(JSON.stringify(answer));if(text==='在途撤权')held.push(reply);else reply();
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));const syntheticQwenProviderUrl=`http://127.0.0.1:${server.address().port}/synthetic-qwen/v1`;
const until=async predicate=>{const deadline=Date.now()+15000;while(!predicate()){if(Date.now()>deadline)throw new Error('请求编号演练同步超时');await new Promise(done=>setTimeout(done,25));}};
try{
  const a=await h.application('a','a'),b=await h.application('b','b');await h.grantModules(a,{product:[],course:[],circle:[],agent:[]});
  const p1=await h.start(a,'a1',{syntheticQwenProviderUrl}),p2=await h.start(a,'a2',{syntheticQwenProviderUrl}),bp=await h.start(b,'b');
  const admin=await h.account(p1,a,'admin',true),reader=await h.account(p1,a,'reader'),bUser=await h.account(bp,b,'b-user');
  const api=(path,method='GET',body,port=p1,token=admin.accessToken)=>h.call(port,a,path,token,method,body);
  const createAgent=async circleId=>{const row=await api('/manage/agent','POST',{name:'合成编号留存助手',persona:'仅本机编号验证',...(circleId?{circleId}:{})});assert.equal(row.status,201);assert.equal((await api('/manage/agent/'+row.body.id+'/review','POST',{revision:1,status:'APPROVED',reason:'本机编号人工核验'})).status,201);return row.body.id;};
  const agentId=await createAgent(),chat=async(id=agentId,token=admin.accessToken)=>{const row=await api('/chats','POST',{agentId:id},p1,token);assert.equal(row.status,201);return row.body.id;};
  const send=(id,text,port=p1,token=admin.accessToken,key='provider-once')=>api('/chats/'+id+'/messages','POST',{text,requestKey:key},port,token);
  const stored=id=>h.a.managedLeaseChatMessage.findFirst({where:{sessionId:id}});
  const normal=await chat(),completed=await send(normal,'正常编号');assert.equal(completed.body.state,'COMPLETED');assert.equal((await stored(normal)).providerRequestId,ids.normal);assert.equal(Object.hasOwn(completed.body,'providerRequestId'),false);
  for(const port of[p2,p1,p2]){const replay=await send(normal,'正常编号',port);assert.equal(replay.body.id,completed.body.id);assert.equal(replay.body.state,'COMPLETED');assert.equal((await stored(normal)).providerRequestId,ids.normal);}
  const history=await api('/chats/'+normal+'/messages');assert.equal(history.status,200);assert.equal(Object.hasOwn(history.body.items[0],'providerRequestId'),false);assert.equal(requests.filter(x=>x==='正常编号').length,1);
  h.record('真实Qwen适配器经正式共享结果转换进入两个Nest及PG，原样保留body.id；跨进程重放不补发、不改编号，普通会话响应不暴露维护编号');
  const missing=await chat();assert.equal((await send(missing,'缺少编号')).body.state,'COMPLETED');assert.equal((await stored(missing)).providerRequestId,null);
  h.record('完整答复没有body.id时留空，不用用户正文、消息ID、重试键或未经核验的响应头造编号');
  for(let i=0;i<invalid.length;i++){const id=await chat();assert.equal((await send(id,'非法编号-'+i)).body.state,'COMPLETED');assert.equal((await stored(id)).providerRequestId,null);}
  h.record('非字符串、空值、129字符、换行及非允许字符编号均不入库；合法正文仍按原授权完成');
  for(const [text,expected]of [['响应截断结束',ids.length],['无效正文',ids.empty]]){
    const id=await chat(),result=await send(id,text);assert.equal(result.status,201);assert.equal(result.body.state,'UNKNOWN');const row=await stored(id);assert.equal(row.providerRequestId,expected);assert.equal(row.assistantText,null);
    const replay=await send(id,text,p2);assert.equal(replay.body.id,row.id);assert.equal(replay.body.state,'UNKNOWN');assert.equal((await send(id,text,p2,admin.accessToken,'different-key')).status,409);assert.equal(requests.filter(x=>x===text).length,1);assert.equal((await stored(id)).providerRequestId,expected);
    h.record(`${text}已完整读取的合法body.id仍留存，无助手正文；UNKNOWN原键只读，换键拒绝，编号不解除未决占位`);
  }
  for(const text of['不完整JSON','错误正文']){const id=await chat();assert.equal((await send(id,text)).body.state,'UNKNOWN');const row=await stored(id);assert.equal(row.providerRequestId,null);assert.equal(row.assistantText,null);assert.equal((await send(id,text,p2)).body.id,row.id);assert.equal(requests.filter(x=>x===text).length,1);}
  h.record('JSON未完整解析和HTTP错误正文均不提取body或响应头编号，保留UNKNOWN且不补发');
  const circle=await api('/manage/circle','POST',{name:'合成编号在途撤权圈',intro:'仅本机撤权验证'});assert.equal(circle.status,201);const circleId=circle.body.id;
  assert.equal((await api('/manage/circle/'+circleId+'/review','POST',{revision:1,status:'ACTIVE',needApproval:false,reason:'本机撤权人工核验'})).status,201);
  assert.equal((await api('/circles/'+circleId+'/join','POST',{},p1,reader.accessToken)).status,201);
  const scopedAgent=await createAgent(circleId),revoked=await chat(scopedAgent,reader.accessToken),inflight=send(revoked,'在途撤权',p1,reader.accessToken);void inflight.catch(()=>{});await until(()=>held.length===1);
  await h.a.circleMember.update({where:{circleId_userId:{circleId,userId:reader.userId}},data:{expireAt:new Date()}});held.shift()();assert.equal((await inflight).status,403);
  const aborted=await stored(revoked);assert.equal(aborted.state,'ABORTED');assert.equal(aborted.failureCode,'RESULT_AUTHORIZATION_CHANGED');assert.equal(aborted.assistantText,null);assert.equal(aborted.providerRequestId,ids.revoke);
  assert.equal(await h.a.managedLeaseAudit.count({where:{entityId:aborted.id,action:'COMPLETE_OWN_CHAT'}}),0);assert.equal(requests.filter(x=>x==='在途撤权').length,1);
  h.record('供应商收到请求后撤销圈子权限，答复正文与完成审计回滚，ABORTED保留已收到合法编号；不认定未计费');
  assert.equal((await h.call(bp,b,'/context',bUser.accessToken)).status,200);assert.equal((await h.call(p1,a,'/chats/'+normal+'/messages',bUser.accessToken)).status,401);assert.equal((await h.call(bp,b,'/chats/'+normal+'/messages',bUser.accessToken)).status,404);
  h.record('另一客户正常查询，跨客户令牌及本客户会话ID均不能读取答复或编号');
}catch(error){failure=error;}finally{for(const reply of held.splice(0))reply();await h.close();server.closeAllConnections();await new Promise(done=>server.close(done));}
h.report(resolve(process.argv[2]??resolve(runtime,'provider-request-postgres.json')),['apps/server/src/modules/ai-gateway/adapters/base.adapter.ts','apps/server/src/modules/ai-gateway/adapters/qwen.adapter.ts','apps/server/src/modules/managed-tenancy/managed-chat-result.ts','apps/server/src/modules/managed-tenancy/managed-chat-provider.ts','apps/server/src/modules/managed-tenancy/managed-lease-chat.ts','pilots/managed-tenancy/lease-process.mjs','pilots/managed-tenancy/verify-provider-request-postgres.mjs'],failure,['本机合成HTTP供应商、真实固定Qwen适配器和共享转换、三个Nest及PostgreSQL；没有外部账号、真实请求编号或付费调用','仅完整解析的Chat Completions body.id，原样留存；不声称等同控制台UUID Request ID或已通过供应商查询','没有读取错误正文、增加重试、自动查询或释放UNKNOWN；schema和原字段不变','编号只留维护数据库，不加入普通用户会话响应；真实商户、费用与Linux部署另验']);
