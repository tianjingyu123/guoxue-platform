import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,isAbsolute,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadCandidatePrisma} from './client.mjs';
const repo=fileURLToPath(new URL('../../../',import.meta.url)),require=createRequire(resolve(repo,'apps/server/package.json'));
const {PrismaClient}=loadCandidatePrisma();require('ts-node').register({transpileOnly:true,compilerOptions:{module:'commonjs'}});
let control,business;
try{
  const [customerId,inputFile,...flags]=process.argv.slice(2),output=process.env.MANAGED_CHAT_PROVIDERS_FILE,credentials=process.env.MANAGED_LEASE_CREDENTIALS_FILE;
  if(!customerId||!inputFile||!isAbsolute(inputFile)||!output||!isAbsolute(output)||!credentials||!isAbsolute(credentials)||dirname(output)!==dirname(credentials)||flags.some(flag=>flag!=='--authorize-paid-calls'))throw new Error('参数或受限配置目录无效');
  const {verifyManagedControlReader}=require(resolve(repo,'apps/server/src/modules/managed-tenancy/managed-control-reader.ts'));
  const {verifyManagedDatabase}=require(resolve(repo,'apps/server/src/modules/managed-tenancy/managed-lease.runtime.ts'));
  const {managedCredential}=require(resolve(repo,'apps/server/src/modules/managed-tenancy/managed-credentials.ts'));
  const {probeManagedQwen}=require(resolve(repo,'apps/server/src/modules/managed-tenancy/managed-provider-probe.ts'));
  const controlUrl=process.env.MANAGED_CONTROL_READONLY_URL;if(!controlUrl)throw new Error('固定只读控制面未配置');
  control=new PrismaClient({datasources:{db:{url:controlUrl}}});await verifyManagedControlReader(control,customerId);
  const deployment=await control.managedDeployment.findUnique({where:{customerId}});if(!deployment||deployment.state!=='READY')throw new Error('固定客户部署未验证');
  const credential=managedCredential(deployment.credentialRef);business=new PrismaClient({datasources:{db:{url:credential.databaseUrl}}});await verifyManagedDatabase(control,business,customerId,credential);
  const input=JSON.parse(readFileSync(inputFile,'utf8'));
  if(Object.keys(input).some(key=>!['baseUrl','model','apiKey'].includes(key)))throw new Error('不接受不明确的模型或端点参数');
  // 此标志须由维护人员在获得实际人类调用授权后显式传入；默认只有只读核验。
  const registration=await probeManagedQwen(input,{customerId,spaceKey:deployment.spaceKey,authKey:credential.authKey},flags.includes('--authorize-paid-calls'));
  const registry=existsSync(output)?JSON.parse(readFileSync(output,'utf8')):{};registry[customerId]=registration;writeFileSync(output,JSON.stringify(registry,null,2)+'\n',{mode:0o600});
  console.log(JSON.stringify({customerId,status:'READONLY_MODELS_VERIFIED',model:registration.model,providerRequestId:registration.receipt.providerRequestId,responseSha256:registration.receipt.responseSha256,paidCallsAuthorized:registration.receipt.paidCallsAuthorized,generationCalled:false,secretsPrinted:false}));
}catch{console.error('模型只读核验未完成；没有重试、生成调用或输出凭据，请核对固定身份与受限配置');process.exitCode=1;}
finally{if(control)await control.$disconnect();if(business)await business.$disconnect();}
