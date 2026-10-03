import assert from'node:assert/strict';import{resolve}from'node:path';import{readFileSync,writeFileSync}from'node:fs';import{fork}from'node:child_process';import{createServer}from'node:net';import{setTimeout as delay}from'node:timers/promises';
import{ManagedPostgresHarness,runtime,repo}from'./postgres-harness.mjs';import{scopedControlUrl}from'./scoped-control.mjs';
const h=new ManagedPostgresHarness('shutdown'),owned=[],ports=[];let failure,releaseLock,lockTask;
const deadline=async(work,label,ms=30000)=>{let timer;try{return await Promise.race([work,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(label)),ms)})]);}finally{clearTimeout(timer);}};
async function start(app,holdBeforeClose){
  const socket=createServer();await new Promise(done=>socket.listen(0,'127.0.0.1',done));const port=socket.address().port;await new Promise(done=>socket.close(done));ports.push(port);
  const customer=await h.control.managedCustomer.findUnique({where:{id:app.customerId},include:{deployment:true}}),credentialFile=resolve(runtime,h.tag+'-credentials.json');
  writeFileSync(credentialFile,JSON.stringify({[customer.deployment.credentialRef]:h.refs[customer.deployment.credentialRef]}),{mode:0o600});
  const file=resolve(runtime,h.tag+'-config-'+owned.length+'.json');writeFileSync(file,JSON.stringify({customerId:app.customerId,controlUrl:await scopedControlUrl(app.customerId),credentialFile,port,holdBeforeClose}),{mode:0o600});
  const child=fork(resolve(repo,'pilots/managed-tenancy/shutdown-process.mjs'),[file],{cwd:repo,stdio:['ignore','pipe','pipe','ipc'],windowsHide:true}),row={child,port,events:[]};owned.push(row);
  row.exited=new Promise(done=>child.once('exit',(code,signal)=>done({code,signal})));child.on('message',message=>row.events.push(message.event));child.stderr.on('data',data=>writeFileSync(resolve(runtime,h.tag+'-compiled-stderr.txt'),data,{flag:'a',mode:0o600}));
  await deadline(new Promise((done,reject)=>{let stdout='';child.stdout.on('data',data=>{stdout+=data;if(stdout.includes('"managedLeaseReady":true'))done();});child.once('exit',()=>reject(new Error('实际编译入口提前退出')));child.once('error',()=>reject(new Error('实际编译入口未启动')));}), '实际编译入口启动超时');return row;
}
const waitEvent=async(row,event)=>deadline((async()=>{while(!row.events.includes(event)){if(row.child.exitCode!==null||row.child.signalCode!==null)throw new Error('退出事件未完成');await delay(10);}})(),'生命周期事件超时：'+event);
try{
  const app=await h.application('a','a'),b=await h.application('b','b');await h.grantModules(app,{product:[],course:[],circle:[],agent:[]});const setup=await h.start(app,'setup'),bp=await h.start(b,'b'),admin=await h.account(setup,app,'admin',true),bUser=await h.account(bp,b,'buser');
  const api=(port,path,method='GET',body)=>h.call(port,app,path,admin.accessToken,method,body);
  const image=await api(setup,'/assets','POST',{contentType:'image/png',dataBase64:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5yoAAAAASUVORK5CYII='});assert.equal(image.status,201);
  const product=await api(setup,'/manage/product','POST',{title:'合成停机订单商品',detail:'仅用于本机真实事务停机演练',price:1,stock:5,assetIds:[image.body.id]});assert.equal(product.status,201);const id=product.body.id;
  assert.equal((await api(setup,'/manage/product/'+id+'/review','POST',{revision:1,status:'ON_SALE',reason:'本机停机事务验收'})).status,201);
  const address=await api(setup,'/addresses','POST',{name:'合成收件人',phone:'13800000000',province:'北京市',city:'北京市',district:'海淀区',detail:'只用于本机停机验收',isDefault:true});assert.equal(address.status,201);
  const target=await start(app,true);assert.equal((await api(target.port,'/context')).status,200);h.record('实际编译lease-main完成固定客户启动与认证，测试包装器未新增HTTP停机路由');
  let acquired;const locked=new Promise(done=>{acquired=done}),lockBarrier=new Promise(done=>{releaseLock=done});
  lockTask=h.a.$transaction(async tx=>{const[pid]=await tx.$queryRaw`SELECT pg_backend_pid() pid`;const rows=await tx.$queryRaw`SELECT id FROM "ManagedLeaseResource" WHERE "applicationId"=${app.applicationId} AND "resourceId"=${id} FOR UPDATE`;assert.equal(rows.length,1);acquired(pid.pid);await lockBarrier;},{timeout:30000});lockTask.catch(()=>{});const holder=await deadline(locked,'本任务资源行锁未取得');
  const body={productId:id,quantity:1,addressId:address.body.id,requestKey:'shutdown-order-once'},pending=api(target.port,'/orders/products','POST',body);pending.catch(()=>{});
  let blocked=false;const waitUntil=Date.now()+8000;while(Date.now()<waitUntil){const rows=await h.a.$queryRaw`SELECT pid FROM pg_stat_activity WHERE datname='mt_customer_a' AND ${holder}::int=ANY(pg_blocking_pids(pid))`;if(rows.length){blocked=true;break;}await delay(20);}assert.ok(blocked,'在途订单未进入真实PG等待');h.record('实际HTTP订单已进入PG事务并被本任务资源行锁阻塞，非延时伪造的在途请求');
  target.child.send('shutdown');await waitEvent(target,'draining');
  const rejected=await api(target.port,'/orders/products','POST',{...body,requestKey:'rejected-during-shutdown'});assert.equal(rejected.status,503);
  const publicResponse=await fetch(`http://127.0.0.1:${target.port}/api/v1/lease/bootstrap`,{headers:{'x-app-client':app.key}});assert.equal(publicResponse.status,503);assert.equal(publicResponse.headers.get('cache-control'),'private, no-store');assert.equal(publicResponse.headers.get('retry-after'),'1');assert.equal(publicResponse.headers.get('connection'),'close');
  h.record('开始退出后新经营及公共请求返回503且关闭连接，不接受新订单或自动重发');
  assert.equal((await h.call(bp,b,'/context',bUser.accessToken)).status,200);h.record('客户A退出期间客户B独立认证与查询保持正常');
  target.child.send('release-close');await waitEvent(target,'httpClosing');assert.ok(!target.events.includes('databasesClosed'));assert.ok(!target.events.includes('httpClosed'));
  await assert.rejects(()=>fetch(`http://127.0.0.1:${target.port}/api/v1/lease/context`,{headers:{Connection:'close'}}));h.record('HTTP关闭已开始且不接受新连接时，原PG事务仍在等待，数据库尚未释放');
  releaseLock();await lockTask;lockTask=undefined;const result=await deadline(pending,'已接收订单未完成');assert.equal(result.status,201);assert.equal(result.body.status,'PENDING');assert.equal(await h.a.order.count({where:{id:result.body.id}}),1);assert.equal((await h.a.product.findUnique({where:{id}})).stock,4);
  assert.equal(await h.a.managedLeaseOrder.count({where:{applicationId:app.applicationId,requestKey:'rejected-during-shutdown'}}),0);h.record('已接收订单与库存及来源同事务提交，新拒绝订单没有事实；没有真实支付调用');
  await deadline(target.exited,'退出进程未收尾');assert.deepEqual(target.events,['draining','httpClosing','httpClosed','databasesClosed']);await assert.rejects(()=>fetch(`http://127.0.0.1:${target.port}/api/v1/lease/context`));h.record('两次退出事件只执行一次生命周期，HTTP关闭后释放两库连接并回收监听端口');
  const restarted=await start(app,false),retry=await api(restarted.port,'/orders/products','POST',body);assert.equal(retry.status,201);assert.equal(retry.body.id,result.body.id);assert.equal((await h.a.product.findUnique({where:{id}})).stock,4);h.record('同一部署重启后原请求键核对同一待支付订单，不重复扣库存或建单');
  assert.equal((await h.call(restarted.port,app,'/context',bUser.accessToken)).status,401);h.record('重启后另一客户令牌仍无法读取当前客户实例');
  restarted.child.send('shutdown');await deadline(restarted.exited,'重启进程退出未完成');assert.deepEqual(restarted.events,['draining','httpClosing','httpClosed','databasesClosed']);h.record('重启实例正常完成相同关闭顺序，未关闭其他客户或数据库服务');
}catch(error){failure=error;}finally{
  releaseLock?.();if(lockTask)await lockTask.catch(()=>{});
  for(const row of owned)if(row.child.exitCode===null&&row.child.signalCode===null){if(row.child.connected){row.child.send('release-close');row.child.send('shutdown');}try{await deadline(row.exited,'本任务停机收尾超时',10000);}catch{row.child.kill();await deadline(row.exited,'本任务强制收尾未退出',10000);}}
  for(const port of ports)try{await assert.rejects(()=>fetch(`http://127.0.0.1:${port}/api/v1/lease/context`));}catch(error){failure??=error;}
  await h.close();
}
h.report(resolve(process.argv[2]||resolve(runtime,'shutdown-postgres.json')),['apps/server/src/lease-main.ts','apps/server/src/modules/managed-tenancy/managed-lease.runtime.ts','apps/server/src/modules/managed-tenancy/managed-lease.module.ts','apps/server/.prisma-candidate/server-build/lease-main.js','pilots/managed-tenancy/shutdown-process.mjs','pilots/managed-tenancy/verify-shutdown-postgres.mjs'],failure,['本任务真实PG/Nest/编译入口，合成待支付订单，没有真实收费或外部SDK','Windows包装器主动触发Node事件进入真实Nest关闭链路；不是Linux/systemd真实SIGTERM或宿主机隔离验收','包装器只暂停生命周期并采集完成事件，正式入口没有其IPC控制或额外HTTP路由','测试商品、订单、用户及历史记录保留，客户授权与测试子进程按原规则恢复']);
