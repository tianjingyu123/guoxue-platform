import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {gzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {ManagedPostgresHarness,runtime} from './postgres-harness.mjs';
const h=new ManagedPostgresHarness('provider-boundary'),requests=[],responses=[];let failure;
const answer=padding=>JSON.stringify({choices:[{message:{content:'合成固定答复'},finish_reason:'stop'}],padding});
const marker='SYNTHETIC_ERROR_BODY_NEVER_RETURN';
const server=createServer(async(req,res)=>{
  if(req.method!=='POST'||req.url!=='/synthetic-qwen/v1/chat/completions'){res.writeHead(404).end();return;}
  let bytes=0;const parts=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>100000){res.writeHead(413).end();return;}parts.push(chunk);}
  const body=JSON.parse(Buffer.concat(parts).toString('utf8')),text=body.messages.at(-1).content;assert.equal(body.model,'synthetic-model');assert.equal(body.max_tokens,512);assert.equal(body.stream,false);requests.push(text);
  res.setHeader('Content-Type','application/json');
  if(text==='压缩超限'){
    const decoded=Buffer.from(answer('x'.repeat(1024*1024))),compressed=gzipSync(decoded);assert.ok(compressed.length<64*1024);res.setHeader('Content-Encoding','gzip');res.setHeader('Content-Length',compressed.length);responses.push({kind:text,wireBytes:compressed.length,decodedBytes:decoded.length});res.end(compressed);
  }else if(text==='正常压缩'){
    const compressed=gzipSync(Buffer.from(answer('')));res.setHeader('Content-Encoding','gzip');res.end(compressed);
  }else if(text==='错误正文')res.writeHead(503).end(marker.repeat(10000));
  else if(text==='截断正文')res.end('{"choices":[');
  else if(text==='无效编码')res.end(Buffer.concat([Buffer.from('{"choices":[{"message":{"content":"'),Buffer.from([255]),Buffer.from('"},"finish_reason":"stop"}]}')]));
  else res.end(answer(''));
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));const syntheticQwenProviderUrl=`http://127.0.0.1:${server.address().port}/synthetic-qwen/v1`;
try{
  const app=await h.application('a','a'),b=await h.application('b','b');await h.grantModules(app,{product:[],course:[],circle:[],agent:[]});
  const p1=await h.start(app,'a1',{syntheticQwenProviderUrl}),p2=await h.start(app,'a2',{syntheticQwenProviderUrl}),bp=await h.start(b,'b'),admin=await h.account(p1,app,'admin',true),bUser=await h.account(bp,b,'buser');
  const api=(path,method='GET',body,port=p1)=>h.call(port,app,path,admin.accessToken,method,body);
  const agent=await api('/manage/agent','POST',{name:'合成响应边界助手',persona:'仅本机响应读取演练'});assert.equal(agent.status,201);assert.equal((await api('/manage/agent/'+agent.body.id+'/review','POST',{revision:1,status:'APPROVED',reason:'本机人工核验'})).status,201);
  const chat=async()=>{const row=await api('/chats','POST',{agentId:agent.body.id});assert.equal(row.status,201);return row.body.id;};
  const normalId=await chat();
  for(const text of['正常正文','正常压缩']){const row=await api('/chats/'+normalId+'/messages','POST',{text,requestKey:'normal-'+requests.length});assert.equal(row.status,201);assert.equal(row.body.state,'COMPLETED');assert.equal(row.body.assistantText,'合成固定答复');assert.equal(requests.filter(x=>x===text).length,1);}
  h.record('真实loopback HTTP与固定Qwen适配器接入独立Nest，普通及gzip完整JSON正常提交，单次请求只派发一次');
  for(const text of['压缩超限','错误正文','截断正文','无效编码']){
    const id=await chat(),path='/chats/'+id+'/messages',body={text,requestKey:'bounded-once'};
    const result=await api(path,'POST',body);assert.equal(result.status,201);assert.equal(result.body.state,'UNKNOWN');assert.equal(result.body.failureCode,'PROVIDER_OUTCOME_UNKNOWN');assert.ok(!JSON.stringify(result.body).includes(marker));
    const persisted=await h.a.managedLeaseChatMessage.findFirst({where:{sessionId:id}});assert.equal(persisted.state,'UNKNOWN');assert.equal(persisted.assistantText,null);assert.equal(await h.a.managedLeaseChatMessage.count({where:{sessionId:id}}),1);
    const repeats=await Promise.all([p1,p2,p1,p2].map(port=>api(path,'POST',body,port)));assert.ok(repeats.every(row=>row.status===201&&row.body.state==='UNKNOWN'&&row.body.id===result.body.id));assert.equal(requests.filter(x=>x===text).length,1);
    assert.equal((await api(path,'POST',{...body,requestKey:'different-key'},p2)).status,409);assert.equal(requests.filter(x=>x===text).length,1);
    const history=await api(path);assert.equal(history.status,200);assert.ok(history.body.items.every(row=>row.assistantText===null));assert.ok(!JSON.stringify(history.body).includes(marker));
    h.record(`${text}在真实供应商派发后保留一条UNKNOWN，无助手正文；跨进程同键仅查询，换键也不再派发`);
  }
  assert.equal(responses.length,1);assert.ok(responses[0].wireBytes<64*1024&&responses[0].decodedBytes>64*1024);
  h.record('gzip线上长度小于64KiB仍按解压后实际正文拒绝，不能借压缩头绕过读取上限');
  assert.equal((await h.call(bp,b,'/context',bUser.accessToken)).status,200);assert.equal((await h.call(p1,app,'/chats/'+normalId+'/messages',bUser.accessToken)).status,401);
  h.record('响应失败及取消期间另一客户查询正常，跨客户令牌不能读取当前会话');
}catch(error){failure=error;}finally{await h.close();server.closeAllConnections();await new Promise(done=>server.close(done));}
h.report(resolve(process.argv[2]??resolve(runtime,'provider-boundary-postgres.json')),['apps/server/src/modules/ai-gateway/adapters/bounded-response.ts','apps/server/src/modules/ai-gateway/adapters/qwen.adapter.ts','apps/server/src/modules/managed-tenancy/managed-lease-chat.ts','apps/server/src/modules/managed-tenancy/managed-chat-provider.ts','pilots/managed-tenancy/lease-process.mjs','pilots/managed-tenancy/verify-provider-boundary-postgres.mjs'],failure,['本机合成HTTP、真实Qwen固定配置适配器、三个Nest进程和合成PostgreSQL；没有真实账号、外部请求或付费调用','合成Qwen入口只存在于pilots包装器，正式入口仍要求固定客户签名核验与调用授权','未知结果没有费用结论或自动补发；真实额度和供应商对账仍需另验','所有合成数据保留，原授权与本任务子进程按既有规则恢复']);
