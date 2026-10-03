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
const {ManagedLeaseModule}=require(resolve(repo,'apps/server/src/modules/managed-tenancy/managed-lease.module.ts'));
const {verifyManagedControlReader}=require(resolve(repo,'apps/server/src/modules/managed-tenancy/managed-control-reader.ts'));
const config=JSON.parse(readFileSync(process.argv[2],'utf8'));
const control=new PrismaClient({datasources:{db:{url:config.controlUrl}}});
const business=new PrismaClient({datasources:{db:{url:config.credential.databaseUrl}}});
let app;
async function close(){if(app)await app.close();await control.$disconnect();await business.$disconnect();process.exit(0);}
try {
  await verifyManagedControlReader(control,config.customerId);
  const runtime=new ManagedLeaseRuntime(control,business,config.customerId,config.credential);
  await runtime.initialize();
  app=await NestFactory.create(ManagedLeaseModule.register(runtime),{logger:false});
  app.setGlobalPrefix('api/v1');
  app.use((_req,res,next)=>{res.setHeader('Cache-Control','private, no-store');next();});
  await app.listen(0,'127.0.0.1');
  process.send?.({ready:true,port:app.getHttpServer().address().port});
  process.on('message',message=>{if(message==='stop')void close();});
  process.once('SIGTERM',()=>void close());
}catch{process.send?.({ready:false,error:'固定实例身份核验或启动失败'});await control.$disconnect();await business.$disconnect();process.exit(1);}
