import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {repo,runtime} from './postgres-harness.mjs';
const require=createRequire(resolve(repo,'apps/server/package.json'));
const {probeManagedQwen}=require(resolve(repo,'apps/server/src/modules/managed-tenancy/managed-provider-probe.ts'));
const {verifyProviderRegistration,managedQwenUrl,providerReceiptSignature}=require(resolve(repo,'apps/server/src/modules/managed-tenancy/managed-chat-provider.ts'));
const checks=[],record=name=>checks.push({name,status:'PASS'});let failure;
try{
  const input={baseUrl:'https://synthetic-workspace.cn-beijing.maas.aliyuncs.com/compatible-mode/v1',model:'synthetic-qwen-model',apiKey:'synthetic-key-not-a-real-account'},binding={customerId:'synthetic-customer',spaceKey:'synthetic-space',authKey:'synthetic-private-binding-key-0123456789'};let calls=0;
  const fetcher=async(url,options)=>{calls++;assert.equal(url.origin,'https://synthetic-workspace.cn-beijing.maas.aliyuncs.com');assert.equal(url.pathname,'/api/v1/models');assert.equal(options.method,'GET');assert.equal(options.redirect,'error');assert.equal(url.searchParams.get('model'),input.model);return new Response(JSON.stringify({request_id:'synthetic-readonly-request',output:{models:[{model:input.model}]}}),{status:200,headers:{'Content-Type':'application/json'}});};
  const registered=await probeManagedQwen(input,binding,false,fetcher);assert.equal(calls,1);assert.equal(registered.receipt.paidCallsAuthorized,false);assert.equal(verifyProviderRegistration(registered,binding.customerId,binding.spaceKey,binding.authKey),registered);
  record('合成HTTP边界核验只构造一次固定官方GET模型清单请求，不生成内容，默认不授付费调用，签名绑定客户与空间');
  for(const changed of [{...registered,apiKey:'different-synthetic-key-00000000'},{...registered,model:'different-model'},{...registered,receipt:{...registered.receipt,paidCallsAuthorized:true}},{...registered,receipt:{...registered.receipt,customerId:'other-customer'}},{...registered,signature:'0'.repeat(64)}])assert.throws(()=>verifyProviderRegistration(changed,binding.customerId,binding.spaceKey,binding.authKey));
  assert.throws(()=>verifyProviderRegistration(registered,binding.customerId,'other-space',binding.authKey));assert.throws(()=>verifyProviderRegistration(registered,binding.customerId,binding.spaceKey,'another-private-auth-key'));
  record('替换模型、密钥、客户、空间、调用授权或签名均拒绝，不能把另一客户核验记录搬来使用');
  for(const url of ['http://127.0.0.1:8080/compatible-mode/v1','https://dashscope.aliyuncs.com.evil.example/compatible-mode/v1','https://user:pass@dashscope.aliyuncs.com/compatible-mode/v1','https://dashscope.aliyuncs.com/compatible-mode/v1?key=synthetic','https://evil.example/compatible-mode/v1'])assert.throws(()=>managedQwenUrl(url));
  await assert.rejects(()=>probeManagedQwen(input,binding,false,async()=>{calls++;return new Response(JSON.stringify({request_id:'synthetic',output:{models:[{model:'wrong-model'}]}}));}));assert.equal(calls,2);
  await assert.rejects(()=>probeManagedQwen(input,binding,false,async()=>{calls++;return new Response('{}',{status:401});}));assert.equal(calls,3);
  await assert.rejects(()=>probeManagedQwen(input,binding,false,async()=>{calls++;throw new Error('synthetic-timeout');}));assert.equal(calls,4);
  record('非官方、明文、含凭据或查询串端点拒绝；错误模型、鉴权失败和超时均不签发核验、不自动重试');
}catch(error){failure=error;writeFileSync(resolve(runtime,'provider-registration-diagnostic.txt'),error.stack||String(error),{mode:0o600});}
const files=['apps/server/src/modules/managed-tenancy/managed-provider-probe.ts','apps/server/src/modules/managed-tenancy/managed-chat-provider.ts','scripts/ops/prisma-candidate/managed-provider-probe.mjs','pilots/managed-tenancy/verify-provider-registration.mjs'];
const report={head:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),workingTreeDirty:!!execFileSync('git',['status','--porcelain'],{cwd:repo,encoding:'utf8'}).trim(),sources:Object.fromEntries(files.map(path=>[path,createHash('sha256').update(readFileSync(resolve(repo,path))).digest('hex')])),checks,passed:checks.length,failed:failure?1:0,production:false,limits:['纯合成HTTP响应及签名验证，没有访问真实百炼账号，不代表真实API鉴权或收费通道可用','GET模型清单仅证明该只读结果，生成权限、额度、价格和输出质量仍须实际授权后的独立验收'],officialReferences:['https://help.aliyun.com/en/model-studio/list-models','https://help.aliyun.com/en/model-studio/base-url']};
const output=resolve(process.argv[2]??resolve(runtime,'provider-registration.json'));mkdirSync(resolve(output,'..'),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed,report:output}));if(failure)process.exitCode=1;
