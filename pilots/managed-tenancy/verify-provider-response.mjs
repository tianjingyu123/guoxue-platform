import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {repo,runtime} from './postgres-harness.mjs';
const require=createRequire(resolve(repo,'apps/server/package.json'));
const {QwenAdapter}=require(resolve(repo,'apps/server/src/modules/ai-gateway/adapters/qwen.adapter.ts'));
const {probeManagedQwen}=require(resolve(repo,'apps/server/src/modules/managed-tenancy/managed-provider-probe.ts'));
const {verifyProviderRegistration}=require(resolve(repo,'apps/server/src/modules/managed-tenancy/managed-chat-provider.ts'));
const {Logger}=require('@nestjs/common'),checks=[],observations=[],logs=[];
const savedFetch=globalThis.fetch,savedError=Logger.prototype.error,savedKey=process.env.DASHSCOPE_API_KEY,savedUrl=process.env.DASHSCOPE_BASE_URL;
let calls=0,failure;
const deadline=async work=>{let timer;try{return await Promise.race([work,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('合成响应读取未在时限内结束')),2000);})]);}finally{clearTimeout(timer);}};
const record=name=>checks.push({name,status:'PASS'});
function response(body,{status=200,chunkSize=4096,length,stalled=false,neverCancel=false}={}){
  const bytes=Buffer.isBuffer(body)?body:Buffer.from(body),state={bodyBytes:bytes.length,consumedBytes:0,canceled:false};let offset=0;
  const stream=new ReadableStream({pull(controller){if(stalled)return new Promise(()=>{});if(offset===bytes.length){controller.close();return;}const chunk=bytes.subarray(offset,offset+chunkSize);offset+=chunk.length;state.consumedBytes+=chunk.length;controller.enqueue(chunk);},cancel(){state.canceled=true;if(neverCancel)return new Promise(()=>{});}},{highWaterMark:0});
  return {response:new Response(stream,{status,headers:{'Content-Type':'application/json',...(length===undefined?{}:{'Content-Length':String(length)})}}),state};
}
const answer=padding=>JSON.stringify({choices:[{message:{content:'合成中文答复'},finish_reason:'stop'}],padding});
async function call(row,{timeout=1000,signal}={}){
  const before=calls;let requestSignal;
  globalThis.fetch=async(url,options)=>{calls++;assert.equal(String(url),'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions');assert.equal(options.redirect,'error');const body=JSON.parse(options.body);assert.equal(body.stream,false);assert.equal(body.max_tokens,512);requestSignal=options.signal;return row.response;};
  const adapter=new QwenAdapter({baseUrl:'https://dashscope.aliyuncs.com/compatible-mode/v1',apiKey:'synthetic-response-key-never-an-account'});
  try{return await deadline(adapter.chat('synthetic-model',[{role:'user',content:'合成读取边界'}],{timeout,maxTokens:512,signal}));}
  finally{assert.equal(calls-before,1);row.state.transportAborted=!!requestSignal?.aborted;observations.push({...row.state});}
}
try{
  Logger.prototype.error=(message)=>logs.push(String(message));
  const limit=64*1024,emptyBytes=Buffer.byteLength(answer('')),exact=response(answer('x'.repeat(limit-emptyBytes)),{chunkSize:7,length:limit});
  assert.equal((await call(exact)).content,'合成中文答复');assert.equal(exact.state.consumedBytes,limit);assert.equal(exact.state.canceled,false);
  record('64KiB精确边界完整JSON与跨块中文正常读取，一次固定端点请求，不切换供应商或重试');
  const advertised=response(answer('x'.repeat(limit)),{length:limit+1});await assert.rejects(()=>call(advertised));assert.equal(advertised.state.consumedBytes,0);assert.equal(advertised.state.canceled,true);assert.equal(advertised.state.transportAborted,true);
  record('声明响应超过上限时未读取正文即取消流并中止传输');
  for(const length of[undefined,1]){const chunked=response(answer('x'.repeat(1024*1024)),{length});await assert.rejects(()=>call(chunked));assert.ok(chunked.state.consumedBytes<=limit+4096);assert.ok(chunked.state.consumedBytes<chunked.state.bodyBytes);assert.equal(chunked.state.canceled,true);assert.equal(chunked.state.transportAborted,true);}
  record('无长度或虚报小长度仍按实际字节拒绝超限块，不完整读入大正文');
  const marker='SYNTHETIC_BODY_MUST_NOT_BE_LOGGED',errorBody=response(marker.repeat(10000),{status:503});const error=await call(errorBody).catch(value=>value);assert.equal(errorBody.state.consumedBytes,0);assert.equal(errorBody.state.canceled,true);assert.equal(errorBody.state.transportAborted,true);assert.ok(!String(error.message).includes(marker));assert.ok(logs.every(line=>!line.includes(marker)));
  record('错误响应直接取消且不读取正文，错误与日志没有上游正文，单次失败不重发');
  for(const body of['{"choices":',Buffer.concat([Buffer.from('{"content":"'),Buffer.from([255]),Buffer.from('"}')]),'null','[]']){const invalid=response(body);await assert.rejects(()=>call(invalid));assert.equal(invalid.state.transportAborted,true);}
  record('截断JSON、无效UTF8及非对象响应拒绝，不返回部分正文');
  const stalled=response('',{stalled:true,neverCancel:true});await assert.rejects(()=>call(stalled,{timeout:30}));assert.equal(stalled.state.canceled,true);assert.equal(stalled.state.transportAborted,true);
  record('响应头成功但正文永不完成时超时结束，不等待永不完成的取消回调');
  const controller=new AbortController(),aborted=response('',{stalled:true});const pending=call(aborted,{signal:controller.signal});controller.abort();await assert.rejects(pending);assert.equal(aborted.state.canceled,true);assert.equal(aborted.state.transportAborted,true);
  record('调用方取消同样终止等待及传输，不被响应头成功误判为完成');
  const input={baseUrl:'https://synthetic-workspace.cn-beijing.maas.aliyuncs.com/compatible-mode/v1',model:'synthetic-model',apiKey:'synthetic-probe-key-never-an-account'},binding={customerId:'synthetic-customer',spaceKey:'synthetic-space',authKey:'synthetic-local-signing-key-0123456789'},modelJson=JSON.stringify({request_id:'synthetic-readonly',output:{models:[{model:input.model}]}});
  const normal=response(modelJson),registration=await probeManagedQwen(input,binding,false,async()=>normal.response);assert.equal(verifyProviderRegistration(registration,binding.customerId,binding.spaceKey,binding.authKey),registration);assert.equal(registration.receipt.responseSha256,createHash('sha256').update(modelJson).digest('hex'));
  for(const options of[{length:1024*1024+1},{},{status:401}]){const over=response(modelJson+' '.repeat(2*1024*1024),options);await assert.rejects(()=>probeManagedQwen(input,binding,false,async()=>over.response));assert.equal(over.state.canceled,true);assert.ok(over.state.consumedBytes<=1024*1024+4096);if(options.status||options.length)assert.equal(over.state.consumedBytes,0);}
  record('只读模型清单原字节摘要及签名保持一致，1MiB上限和错误正文取消有效，失败不签发核验');
  process.env.DASHSCOPE_API_KEY='synthetic-platform-key-never-an-account';process.env.DASHSCOPE_BASE_URL='https://synthetic.invalid/v1';const legacy=response(answer('x'.repeat(128*1024)));globalThis.fetch=async()=>legacy.response;const platform=new QwenAdapter();assert.equal((await platform.chat('synthetic-model',[])).content,'合成中文答复');assert.equal(legacy.state.consumedBytes,legacy.state.bodyBytes);
  record('原平台未指定固定客户配置的非流式适配行为保持不变，客户字节上限没有扩展到平台路径');
}catch(error){failure=error;writeFileSync(resolve(runtime,'provider-response-diagnostic.txt'),error.stack||String(error),{mode:0o600});}
finally{globalThis.fetch=savedFetch;Logger.prototype.error=savedError;if(savedKey===undefined)delete process.env.DASHSCOPE_API_KEY;else process.env.DASHSCOPE_API_KEY=savedKey;if(savedUrl===undefined)delete process.env.DASHSCOPE_BASE_URL;else process.env.DASHSCOPE_BASE_URL=savedUrl;}
const files=['apps/server/src/modules/ai-gateway/adapters/bounded-response.ts','apps/server/src/modules/ai-gateway/adapters/qwen.adapter.ts','apps/server/src/modules/managed-tenancy/managed-provider-probe.ts','apps/server/src/modules/managed-tenancy/managed-chat-provider.ts','pilots/managed-tenancy/verify-provider-response.mjs'];
const report={head:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),workingTreeDirty:!!execFileSync('git',['status','--porcelain'],{cwd:repo,encoding:'utf8'}).trim(),sources:Object.fromEntries(files.map(path=>[path,createHash('sha256').update(readFileSync(resolve(repo,path))).digest('hex')])),checks,observations,passed:checks.length,failed:failure?1:0,production:false,limits:['纯合成Web字节流及fetch替身，没有外部请求、真实鉴权或付费调用','读取保存上限不等于进程或网络缓冲总内存上限；真实Linux资源配额仍需独立验收','原平台流式及完整网关运行不属于此专项']};
const output=resolve(process.argv[2]??resolve(runtime,'provider-response.json'));mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed,report:output}));if(failure)process.exitCode=1;
