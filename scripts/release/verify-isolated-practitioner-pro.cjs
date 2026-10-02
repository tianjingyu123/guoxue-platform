const assert = require('node:assert/strict');
const {createRequire}=require('node:module');
const {randomUUID}=require('node:crypto');
const req=createRequire('/app/apps/server/package.json');
const {PrismaClient}=req('@prisma/client');
const {ShopPaymentService}=require('/app/apps/server/dist/modules/shop/shop-payment.service');
const {ShopRefundService}=require('/app/apps/server/dist/modules/shop/shop-refund.service');
const {EntitlementService}=require('/app/apps/server/dist/modules/entitlement/entitlement.service');
const {EntitlementNotificationTask}=require('/app/apps/server/dist/modules/notification/entitlement-notification.task');
const {NotificationService}=require('/app/apps/server/dist/modules/notification/notification.service');
const {addCalendarMonthsClamped}=require('/app/apps/server/dist/modules/shop/membership-period');
const p=new PrismaClient(),users=[],orders=[];
const redis={setNX:async()=>true,del:async()=>undefined,delByPattern:async()=>undefined,get:async()=>JSON.stringify({PUSH_ENABLED:false}),getJson:async()=>({PUSH_ENABLED:false})};
const notice=()=>new NotificationService(p,redis,{send:()=>{throw Error('禁止真实渠道')}},{});
const rights=()=>new EntitlementService(p);
const payment=(client=p)=>new ShopPaymentService(client,redis,{},{},{},{fire:async()=>undefined},{},rights(),{recordOrderCommissionAndFee:async()=>undefined},{invalidateOrderCache:async()=>undefined,settleGroupBuyIfNeeded:async()=>undefined},undefined,undefined,undefined,undefined,undefined,notice());
const refund=(client=p)=>new ShopRefundService(client,redis,{},{},{},{registerRefundNotifyHandler:()=>undefined},{},{fire:async()=>undefined},rights(),undefined,notice());
const task=()=>new EntitlementNotificationTask(p);
const user=async()=>{const u=await p.user.create({data:{nickname:'合成镜像从业用户'}});users.push(u.id);return u.id;};
const order=async userId=>{const o=await p.order.create({data:{userId,type:'PRACTITIONER_PRO',targetId:'practitioner_pro_monthly',amount:98,payAmount:98,status:'PENDING',payMethod:'WECHAT',payTransactionId:'synthetic-image-pro-'+randomUUID()}});orders.push(o.id);return o;};
const callback=o=>({out_trade_no:o.payTransactionId,transaction_id:'synthetic-confirmed-'+o.id,trade_state:'SUCCESS',attach:o.id,amount:{total:9800}});
const refundBody=o=>({out_refund_no:'RF'+o.id,transaction_id:'synthetic-confirmed-'+o.id,refund_status:'SUCCESS',refund_id:'synthetic-refund-'+o.id,amount:{refund:9800,total:9800}});
// 两笔订单CAS完成后再同时竞争真实User行锁，避免把顺序请求写成并发。
const competingClient=()=>{let release,arrived=0;const gate=new Promise(r=>{release=r;});return new Proxy(p,{get(target,key){if(key==='$transaction')return work=>target.$transaction(tx=>work(new Proxy(tx,{get(t,k){if(k==='$queryRaw')return async(...args)=>{if(String(args[0]).includes('"User"')&&arrived<2){if(++arrived===2)release();await gate;}return tx.$queryRaw(...args);};const v=Reflect.get(t,k,t);return typeof v==='function'?v.bind(t):v;}})),{timeout:15000});const v=Reflect.get(target,key,target);return typeof v==='function'?v.bind(target):v;}});};
(async()=>{try{
 const first=await user(),a=await order(first),b=await order(first),client=competingClient();
 assert.deepEqual(await Promise.all([payment(client).handlePaymentNotify(callback(a)),payment(client).handlePaymentNotify(callback(b))]),[true,true]);
 assert.equal(await p.order.count({where:{id:{in:[a.id,b.id]},status:'PAID'}}),2);
 const profile=await p.practitionerProfile.findUniqueOrThrow({where:{userId:first}});
 assert.equal(profile.proExpireAt.toISOString(),addCalendarMonthsClamped(addCalendarMonthsClamped(profile.proFirstAt,1),1).toISOString());
 assert.equal(await p.entitlementLedger.count({where:{userId:first,action:'GRANT'}}),2);
 assert.equal(await p.notification.count({where:{userId:first,idempotencyKey:{in:[first+':ORDER_PAID:'+a.id,first+':ORDER_PAID:'+b.id]}}}),2);
 // 新持久权益事实恢复失败后只重试通知，不回滚已提交订单。
 await p.$executeRawUnsafe("CREATE FUNCTION synthetic_image_pro_notice_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.type = 'ENTITLEMENT' THEN RAISE EXCEPTION 'synthetic notice failure'; END IF; RETURN NEW; END $$");
 await p.$executeRawUnsafe('CREATE TRIGGER synthetic_image_pro_notice_fail BEFORE INSERT ON "Notification" FOR EACH ROW EXECUTE FUNCTION synthetic_image_pro_notice_fail()');
 try{await task().tick();assert.equal(await p.notification.count({where:{userId:first,type:'ENTITLEMENT'}}),0);assert.equal(await p.order.count({where:{userId:first,status:'PAID'}}),2);}
 finally{await p.$executeRawUnsafe('DROP TRIGGER synthetic_image_pro_notice_fail ON "Notification"');await p.$executeRawUnsafe('DROP FUNCTION synthetic_image_pro_notice_fail()');}
 assert.equal(await task().deliverPendingGrants(),2);assert.equal(await task().deliverPendingGrants(),0);
 const renewed=await user(),r1=await order(renewed),r2=await order(renewed),expiry=new Date(2035,0,31,12),firstAt=new Date(2034,0,1,12);
 await p.practitionerProfile.create({data:{userId:renewed,proExpireAt:expiry,proFirstAt:firstAt}});
 const concurrent=competingClient();await Promise.all([payment(concurrent).handlePaymentNotify(callback(r1)),payment(concurrent).handlePaymentNotify(callback(r2))]);
 const renewedProfile=await p.practitionerProfile.findUniqueOrThrow({where:{userId:renewed}});
 assert.equal(renewedProfile.proExpireAt.toISOString(),addCalendarMonthsClamped(addCalendarMonthsClamped(expiry,1),1).toISOString());assert.equal(renewedProfile.proFirstAt.toISOString(),firstAt.toISOString());
 assert.equal(await task().deliverPendingGrants(),2);
 const refunds=competingClient();await Promise.all([refund(refunds).handleRefundNotify(refundBody(a)),refund(refunds).handleRefundNotify(refundBody(b))]);
 assert.equal(await p.order.count({where:{id:{in:[a.id,b.id]},status:'REFUNDED'}}),2);
 assert.equal((await p.practitionerProfile.findUniqueOrThrow({where:{userId:first}})).proExpireAt,null);
 assert.equal(await p.entitlementLedger.count({where:{userId:first,action:'REVOKE'}}),2);
 await refund().handleRefundNotify(refundBody(a));assert.equal(await p.entitlementLedger.count({where:{userId:first,action:'REVOKE'}}),2);
 assert.equal(await p.notification.count({where:{userId:first,idempotencyKey:{in:[first+':ORDER_REFUNDED:'+a.id,first+':ORDER_REFUNDED:'+b.id]}}}),2);
 assert.equal(await task().deliverPendingGrants(),0);
 assert(!(await rights().getMyEntitlements(first)).items.some(v=>v.entitlementKey==='membership.practitioner'));
 for(const id of users){const u=await p.user.findUniqueOrThrow({where:{id}});assert.equal(u.memberLevel,'NONE');assert.equal(u.memberExpire,null);assert.equal(await p.memberPurchase.count({where:{userId:id}}),0);}
 console.log('NODE_TEST_RESULT:'+JSON.stringify({passed:true,compiledService:true,firstPurchaseConcurrentTwoMonths:true,renewalConcurrentTwoMonths:true,notificationFailureDoesNotUndoPaid:true,durableRetryOnce:true,concurrentRefundDoesNotRevive:true,refundReplayIdempotent:true,schoolMembershipUnchanged:true,noRealChannel:true,redisStub:true,realSignatureTransport:false}));
}finally{await p.order.deleteMany({where:{id:{in:orders}}});await p.user.deleteMany({where:{id:{in:users}}});await p.$disconnect();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
