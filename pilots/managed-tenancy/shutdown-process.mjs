import{createRequire}from'node:module';import{readFileSync}from'node:fs';import{resolve}from'node:path';import{fileURLToPath}from'node:url';import{loadCandidatePrisma}from'../../scripts/ops/prisma-candidate/client.mjs';
const repo=fileURLToPath(new URL('../../',import.meta.url)),require=createRequire(resolve(repo,'apps/server/package.json'));loadCandidatePrisma();
const config=JSON.parse(readFileSync(process.argv[2],'utf8')),compiled=resolve(repo,'apps/server/.prisma-candidate/server-build');
Object.assign(process.env,{MANAGED_CUSTOMER_ID:config.customerId,MANAGED_CONTROL_READONLY_URL:config.controlUrl,MANAGED_LEASE_CREDENTIALS_FILE:config.credentialFile,MANAGED_LEASE_PORT:String(config.port),MANAGED_LEASE_BIND:'127.0.0.1'});
const{ManagedLeaseRuntime}=require(resolve(compiled,'modules/managed-tenancy/managed-lease.runtime.js'));
const before=ManagedLeaseRuntime.prototype.beforeApplicationShutdown,after=ManagedLeaseRuntime.prototype.onApplicationShutdown;
const{ExpressAdapter}=require('@nestjs/platform-express'),httpClose=ExpressAdapter.prototype.close;
let releaseClose;const barrier=config.holdBeforeClose?new Promise(done=>{releaseClose=done}):Promise.resolve();
const send=message=>new Promise(done=>process.connected?process.send(message,done):done());
ExpressAdapter.prototype.close=function(){const closing=httpClose.call(this);return send({event:'httpClosing'}).then(()=>closing);};
// 仅此合成验证包装器暂停生命周期及触发事件；正式入口没有IPC或HTTP停机命令。
ManagedLeaseRuntime.prototype.beforeApplicationShutdown=async function(){before.call(this);await send({event:'draining',activeOperations:this.activeOperations});await barrier;};
ManagedLeaseRuntime.prototype.onApplicationShutdown=async function(){await send({event:'httpClosed',activeOperations:this.activeOperations});const once=after.call(this);if(once!==after.call(this))throw new Error('连接释放未复用同一退出任务');await once;await send({event:'databasesClosed',activeOperations:this.activeOperations});};
process.on('message',message=>{if(message==='release-close')releaseClose?.();if(message==='shutdown'){process.emit('SIGTERM','SIGTERM');process.emit('SIGTERM','SIGTERM');}});
require(resolve(compiled,'lease-main.js'));
