import assert from 'node:assert/strict';import {resolve} from 'node:path';import {createHash} from 'node:crypto';
import {ManagedPostgresHarness,runtime} from './postgres-harness.mjs';
const h=new ManagedPostgresHarness('proxy');let failure;
try{
 const a=await h.application('a','a'),direct=await h.application('a','direct'),b=await h.application('b','b');const empty={product:[],course:[],circle:[],agent:[]};await h.grantModules(a,empty);await h.grantModules(b,empty);
 const credential=h.refs['secret-ref:synthetic/real-lease-a'];
 for(const trustedProxyIps of [true,['127.0.0.0/8'],['*'],['127.0.0.1','::ffff:127.0.0.1']]){
  await assert.rejects(()=>h.start(a,'invalid-'+h.children.length,{credential:{...credential,trustedProxyIps}}));const child=h.children.at(-1);if(child.exitCode===null)await new Promise(done=>child.once('exit',done));
 }
 h.record('实际Nest进程拒绝通配、CIDR、跳数型及归一化后重复的代理配置，没有监听入口');
 const dp=await h.start(direct,'direct'),p1=await h.start(a,'proxy1',{credential:{...credential,trustedProxyIps:['127.0.0.1','192.0.2.1']}}),p2=await h.start(a,'proxy2',{credential:{...credential,trustedProxyIps:['127.0.0.1','192.0.2.1']}}),bp=await h.start(b,'b');
 const call=async(port,app,path,body,forwarded,token)=>{
  const res=await fetch(`http://127.0.0.1:${port}/api/v1/lease${path}`,{method:path==='/auth/password'?'PUT':'POST',headers:{'Content-Type':'application/json','x-app-client':app.key,...(forwarded!==undefined?{'x-forwarded-for':forwarded}:{}),...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});return {status:res.status,body:await res.json()};
 };
 const before=await h.a.managedLeaseLoginThrottle.count();for(const invalid of [undefined,'unknown','203.0.113.1:123','203.0.113.1,'.repeat(17),'1'.repeat(1025)])assert.equal((await call(p1,a,'/auth/login',{username:h.tag+'-missing',password:h.password},invalid)).status,400);assert.equal(await h.a.managedLeaseLoginThrottle.count(),before);
 h.record('可信代理缺失、非法或过长来源链在认证数据库计数前拒绝，不回退成代理地址');
 for(let i=0;i<30;i++)assert.equal((await call(dp,direct,'/auth/login',{username:h.tag+'-direct-missing-'+i,password:h.password},'203.0.113.'+(i+1))).status,401);
 assert.equal((await call(dp,direct,'/auth/login',{username:h.tag+'-direct-over',password:h.password},'198.51.100.8')).status,429);
 h.record('未配置信任的直连入口忽略伪造转发头，轮换30个自报地址仍共用实际连接限流');
 for(let i=0;i<30;i++)assert.equal((await call(i%2?p1:p2,a,'/auth/login',{username:h.tag+'-trusted-missing-'+i,password:h.password},'198.51.100.'+(i+1)+', 203.0.113.9, 192.0.2.1')).status,401);
 assert.equal((await call(p2,a,'/auth/login',{username:h.tag+'-trusted-over',password:h.password},'198.51.100.99, ::ffff:203.0.113.9, 192.0.2.1')).status,429);
 assert.equal((await call(p1,a,'/auth/login',{username:h.tag+'-other-ip',password:h.password},'203.0.113.10, 192.0.2.1')).status,401);
 const key=createHash('sha256').update(a.key+':login:connection:203.0.113.9').digest('hex');assert.equal((await h.a.managedLeaseLoginThrottle.findUnique({where:{key}})).attempts,30);
 h.record('从右侧核可信链，在首个不可信来源停止，左侧伪造值无效；IPv4映射归一，同一真实来源跨进程共享30次上限，其他来源独立');
 for(const ip of ['2001:db8::1','2001:0db8:0000:0000:0000:0000:0000:0001'])assert.equal((await call(p1,a,'/auth/login',{username:h.tag+'-ipv6-'+ip.length,password:h.password},ip)).status,401);
 const ipv6Key=createHash('sha256').update(a.key+':login:connection:2001:db8::1').digest('hex');assert.equal((await h.a.managedLeaseLoginThrottle.findUnique({where:{key:ipv6Key}})).attempts,2);
 h.record('IPv6压缩和完整写法使用同一持久限流摘要，不能靠地址文本切换分散计数');
 const registered=await call(p1,a,'/auth/register',{username:h.tag+'-valid',password:h.password,nickname:'合成代理登录'},'203.0.113.20');assert.equal(registered.status,201);
 const refreshed=await call(p2,a,'/auth/refresh',{refreshToken:registered.body.refreshToken},'203.0.113.20');assert.equal(refreshed.status,200);
 const changed=await call(p1,a,'/auth/password',{currentPassword:h.password,newPassword:h.password+'-New'},'203.0.113.20',refreshed.body.accessToken);assert.equal(changed.status,200);
 assert.equal((await call(bp,b,'/auth/login',{username:h.tag+'-b-independent',password:h.password},'203.0.113.9')).status,401);
 h.record('可信来源贯通实际注册、刷新和改密；A的来源限额不污染B客户的认证计数');
}catch(error){failure=error;}finally{await h.close();}
h.report(resolve(process.argv[2]??resolve(runtime,'proxy-postgres.json')),['apps/server/src/modules/managed-tenancy/managed-client-address.ts','apps/server/src/modules/managed-tenancy/managed-credentials.ts','apps/server/src/modules/managed-tenancy/managed-lease.runtime.ts','apps/server/src/modules/managed-tenancy/managed-lease.module.ts','pilots/managed-tenancy/verify-proxy-postgres.mjs'],failure,['真实本机Nest与PostgreSQL，转发头由测试构造；不代表真实Nginx、网关或生产网络路由验收','可信IP由受限配置显式维护，网关必须正确覆盖/追加来源链且业务端口不得向不可信路径开放','只影响认证来源限流，不授予代理身份或客户权限，不自动信任私网、全部loopback网段或跳数']);
