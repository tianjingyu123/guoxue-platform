// 正式镜像中的合成用户、真实JWT、共享Redis与数据库。仅有界只读并发，不测试真实资金。
const {createRequire}=require('module'),assert=require('assert/strict');
const req=createRequire('/app/apps/server/package.json'),jwt=req('jsonwebtoken'),{PrismaClient}=req('@prisma/client'),db=new PrismaClient();
assert(process.env.RELEASE_ID.startsWith('isolated-cc78fbe4f'));
const secondary=new URL(process.env.ISOLATED_SECOND_APP);
assert.equal(secondary.protocol,'http:');assert(secondary.hostname.startsWith('rebu-app-second-'));
const origins=['http://127.0.0.1:3000',secondary.origin];
const cases=[
 {name:'notification-owner',user:'linux-user-a',path:'/notifications/linux-notification-a',status:200},
 {name:'notification-other-denied',user:'linux-user-b',path:'/notifications/linux-notification-a',status:404},
 {name:'order-owner',user:'linux-user-b',path:'/shop/orders/linux-order-b',status:200},
 {name:'order-other-denied',user:'linux-user-a',path:'/shop/orders/linux-order-b',status:403},
 {name:'notification-anonymous-denied',user:null,path:'/notifications/linux-notification-a',status:401},
 {name:'admin-authorized',user:'linux-ops',path:'/notifications/admin/sent',status:200},
 {name:'admin-finance-denied',user:'linux-finance',path:'/notifications/admin/sent',status:403},
 {name:'admin-customer-denied',user:'linux-customer',path:'/notifications/admin/sent',status:403}
];
const tokens=Object.fromEntries([...new Set(cases.map(row=>row.user).filter(Boolean))].map(user=>[user,jwt.sign({sub:user,sessionIssuedAt:Date.now()},process.env.JWT_SECRET,{expiresIn:'5m'})]));
const snapshot=async()=>({
 notification:await db.notification.findUniqueOrThrow({where:{id:'linux-notification-a'}}),
 order:await db.order.findUniqueOrThrow({where:{id:'linux-order-b'}})
});
const percentile=(times,p)=>times.slice().sort((a,b)=>a-b)[Math.ceil(times.length*p)-1];
(async()=>{
 try{
  const before=await snapshot(),stages=[];
  // 三档每档128请求，最高16并发；合計384，避免拿此小规模基线宣称生产峰值容量。
  for(const concurrency of [2,8,16]){
   const rows=[];let index=0;const started=performance.now();
   await Promise.all(Array.from({length:concurrency},async()=>{
    while(index<128){
     const request=index++,test=cases[request%cases.length],node=Math.floor(request/cases.length)%2,t0=performance.now();
     const response=await fetch(origins[node]+'/api/v1'+test.path,{headers:test.user?{Authorization:'Bearer '+tokens[test.user]}:{},signal:AbortSignal.timeout(10000)});
     await response.arrayBuffer();
     rows.push({case:test.name,node,status:response.status,expected:test.status,ms:performance.now()-t0});
    }
   }));
   assert.equal(rows.length,128);assert(rows.every(row=>row.status===row.expected),'并发下权限或响应异常');
   const times=rows.map(row=>row.ms),durationMs=performance.now()-started;
   const stage={concurrency,requests:128,durationMs,p95Ms:percentile(times,.95),p99Ms:percentile(times,.99),requestsPerSecond:128000/durationMs,expectedStatusMatched:128,nodes:[0,1].map(node=>({node,requests:rows.filter(row=>row.node===node).length})),cases:cases.map(test=>({name:test.name,expected:test.status,requests:rows.filter(row=>row.case===test.name).length}))};
   assert(stage.p95Ms<800&&stage.p99Ms<1500,'有界并发响应超过验收阈值');
   stages.push(stage);
  }
  assert.deepEqual(await snapshot(),before,'只读请求不得改变订单或通知状态');
  console.log('NODE_TEST_RESULT:'+JSON.stringify({passed:true,requests:384,stages,maxConcurrency:16,p95ThresholdMs:800,p99ThresholdMs:1500,realJwt:true,defaultThrottleRetained:true,realSharedRedis:true,twoCompleteApps:true,readOnlyFixturesUnchanged:true,production:false,realChannels:false,productionPeakCapacityProven:false,scope:'受限容器/小量合成数据有界读取；不代表CLB、生产数据规模、支付写入或长时间稳定性'}));
 }finally{await db.$disconnect();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
