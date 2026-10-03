import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCandidatePrisma } from '../../scripts/ops/prisma-candidate/client.mjs';
const repo=fileURLToPath(new URL('../../',import.meta.url));
const require=createRequire(resolve(repo,'apps/server/package.json'));
const {PrismaClient}=loadCandidatePrisma();
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'commonjs',experimentalDecorators:true,emitDecoratorMetadata:true}});
require('reflect-metadata');
const {NestFactory}=require('@nestjs/core');
const {ManagedLeaseRuntime}=require(resolve(repo,'apps/server/src/modules/managed-tenancy/managed-lease.runtime.ts'));
const {ManagedLeaseModule,managedLeaseRequestGate}=require(resolve(repo,'apps/server/src/modules/managed-tenancy/managed-lease.module.ts'));
const {verifyManagedControlReader}=require(resolve(repo,'apps/server/src/modules/managed-tenancy/managed-control-reader.ts'));
const config=JSON.parse(readFileSync(process.argv[2],'utf8'));
const control=new PrismaClient({datasources:{db:{url:config.controlUrl}}});
const business=new PrismaClient({datasources:{db:{url:config.credential.databaseUrl}}});
let app;
async function close(){if(app)await app.close();await control.$disconnect();await business.$disconnect();process.exit(0);}
try {
  await verifyManagedControlReader(control,config.customerId);
  // 合成供应商只存在于本任务验证进程，不在正式lease-main中提供此配置通道。
  let syntheticProvider;
  if(config.syntheticProviderUrl){
    const url=new URL(config.syntheticProviderUrl);
    if(url.hostname!=='127.0.0.1'||url.protocol!=='http:'||url.username||url.password||url.search||url.hash||url.pathname!=='/synthetic-complete'||!Number.isInteger(Number(url.port))||Number(url.port)<1)throw new Error('合成供应商须为本任务loopback服务');
    syntheticProvider={ready:()=>true,budget:()=>config.syntheticCallBudget??{maxRequests:1000000,maxUnresolved:100},complete:async input=>{
      const result=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:input.messages,requestId:input.requestId}),signal:input.signal});
      if(!result.ok)throw new Error('合成供应商结果未知');return result.json();
    }};
  }
  if(config.syntheticQwenProviderUrl){
    if(syntheticProvider)throw new Error('合成供应商配置只能选择一条通道');
    const url=new URL(config.syntheticQwenProviderUrl);
    if(url.hostname!=='127.0.0.1'||url.protocol!=='http:'||url.username||url.password||url.search||url.hash||url.pathname!=='/synthetic-qwen/v1'||!Number.isInteger(Number(url.port))||Number(url.port)<1)throw new Error('合成Qwen须为本任务loopback服务');
    const {QwenAdapter}=require(resolve(repo,'apps/server/src/modules/ai-gateway/adapters/qwen.adapter.ts'));
    const adapter=new QwenAdapter({baseUrl:url.href,apiKey:'synthetic-test-key-never-an-account'});
    syntheticProvider={ready:()=>true,budget:()=>config.syntheticCallBudget??{maxRequests:1000000,maxUnresolved:100},complete:async input=>{const response=await adapter.chat('synthetic-model',input.messages,{maxTokens:512,timeout:30000,signal:input.signal});if(response.finishReason!=='stop')throw new Error('合成供应商未完整结束');return {content:response.content};}};
  }
  const runtime=new ManagedLeaseRuntime(control,business,config.customerId,config.credential,syntheticProvider);
  await runtime.initialize();
  app=await NestFactory.create(ManagedLeaseModule.register(runtime),{logger:false,bodyParser:false});
  app.use(managedLeaseRequestGate(runtime));
  app.use(require('express').json({limit:'2mb'}));
  app.setGlobalPrefix('api/v1');
  await app.listen(0,'127.0.0.1');
  process.send?.({ready:true,port:app.getHttpServer().address().port});
  process.on('message',message=>{if(message==='stop')void close();});
  process.once('SIGTERM',()=>void close());
}catch{process.send?.({ready:false,error:'固定实例身份核验或启动失败'});await control.$disconnect();await business.$disconnect();process.exit(1);}
