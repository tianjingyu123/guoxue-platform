import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {loadCandidatePrisma} from '../../scripts/ops/prisma-candidate/client.mjs';
import {ManagedPostgresHarness,runtime} from './postgres-harness.mjs';
const h=new ManagedPostgresHarness('commerce');let failure,runtimeDb;
try{
  const app=await h.application('a','a'),otherApp=await h.application('a','other'),bApp=await h.application('b','b');const empty={product:[],course:[],circle:[],agent:[]};await h.grantModules(app,empty);await h.grantModules(bApp,empty);
  const p1=await h.start(app,'a1'),p2=await h.start(app,'a2'),bp=await h.start(bApp,'b');
  const admin=await h.account(p1,app,'admin',true),buyer=await h.account(p1,app,'buyer'),stranger=await h.account(p2,app,'stranger'),other=await h.login(p2,otherApp,buyer),bUser=await h.account(bp,bApp,'user');
  const api=(path,token=buyer.accessToken,method='GET',body,port=p1)=>h.call(port,app,path,token,method,body);
  const addressBody={name:'合成收件人',phone:'13800000000',province:'北京市',city:'北京市',district:'海淀区',detail:'合成地址仅本机测试',isDefault:true};
  assert.equal((await api('/addresses',buyer.accessToken,'POST',{...addressBody,userId:admin.userId})).status,400);
  const address=await api('/addresses',buyer.accessToken,'POST',addressBody);assert.equal(address.status,201);
  assert.equal((await api('/addresses',stranger.accessToken)).body.length,0);
  assert.equal((await api('/addresses/'+address.body.id,stranger.accessToken,'PUT',addressBody)).status,404);
  h.record('收货地址固定本人，拒绝指定用户和修改他人地址，列表不暴露其他用户地址');
  const image=await api('/assets',admin.accessToken,'POST',{contentType:'image/png',dataBase64:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5yoAAAAASUVORK5CYII='});assert.equal(image.status,201);
  const productBody={title:'合成可下单商品',intro:'自建商品',detail:'本机报价与库存验证',price:12.34,stock:5,assetIds:[image.body.id]};
  const product=await api('/manage/product',admin.accessToken,'POST',productBody);assert.equal(product.status,201);const id=product.body.id;
  assert.equal((await api('/manage/product/'+id+'/review',admin.accessToken,'POST',{revision:1,status:'ON_SALE',reason:'人工核验价格库存'})).status,201);
  const orderBody={productId:id,quantity:2,addressId:address.body.id,requestKey:'native-order-repeat'};
  assert.equal((await api('/orders/products',buyer.accessToken,'POST',{...orderBody,amount:0,status:'PAID'})).status,400);
  assert.equal((await api('/orders/products',stranger.accessToken,'POST',orderBody)).status,400);
  const created=await Promise.all([p1,p2,p1,p2].map(port=>api('/orders/products',buyer.accessToken,'POST',orderBody,port)));assert.ok(created.every(row=>row.status===201));assert.equal(new Set(created.map(row=>row.body.id)).size,1);const order=created[0].body;
  assert.equal(Number(order.amount),24.68);assert.equal(order.status,'PENDING');assert.equal(order.paymentReady,false);assert.equal((await h.a.product.findUnique({where:{id}})).stock,3);
  const source=await h.a.managedLeaseOrder.findUnique({where:{orderId:order.id}});assert.equal(source.customerId,app.customerId);assert.equal(source.applicationId,app.applicationId);assert.equal(await h.a.managedLeaseAudit.count({where:{entityId:order.id,action:'CREATE_OWN_ORDER'}}),1);
  const raw=await h.a.order.findUnique({where:{id:order.id}});assert.equal(raw.tempReferrerId,null);assert.equal(raw.referrerId,null);assert.equal(raw.selfDiscount,null);
  assert.equal((await api('/orders/products',buyer.accessToken,'POST',{...orderBody,quantity:1})).status,409);
  assert.equal((await api('/orders/'+order.id,stranger.accessToken)).status,404);assert.equal((await h.call(p2,otherApp,'/orders/'+order.id,other.accessToken)).status,404);assert.equal((await h.call(bp,bApp,'/orders/'+order.id,bUser.accessToken)).status,404);
  assert.equal((await h.call(p2,otherApp,'/orders',other.accessToken)).body.items.some(row=>row.id===order.id),false);
  h.record('四次跨进程建单复用原ShopOrder服务，只预占一次库存、一次来源与审计；金额由原报价计算，独立模式无平台推荐关系，跨用户/应用/客户拒绝');
  assert.equal((await api('/manage/product/'+id,admin.accessToken,'PUT',{...productBody,revision:2})).status,409);
  const out=await api('/orders/products',buyer.accessToken,'POST',{...orderBody,quantity:4,requestKey:'out-of-stock'});assert.equal(out.status,400);assert.equal((await h.a.product.findUnique({where:{id}})).stock,3);
  assert.equal(await h.a.managedLeaseOrder.count({where:{customerId:app.customerId,userId:buyer.userId,requestKey:'out-of-stock'}}),0);
  const cancelled=await Promise.all([p1,p2].map(port=>api('/orders/'+order.id+'/cancel',buyer.accessToken,'POST',{},port)));assert.ok(cancelled.every(row=>row.status===201));assert.equal((await h.a.product.findUnique({where:{id}})).stock,5);
  assert.equal(await h.a.managedLeaseAudit.count({where:{entityId:order.id,action:'CANCEL_OWN_ORDER'}}),1);assert.equal((await h.a.managedLeaseResource.findFirst({where:{resourceId:id}})).revision,4);
  assert.equal((await api('/orders/'+order.id+'/cancel',stranger.accessToken,'POST',{})).status,404);
  h.record('库存不足事务整体回滚；预占使旧经营修订失效，原待支付取消内核跨进程只恢复一次库存和审计');
  const makeCourse=async(price,label)=>{
    const course=await api('/manage/course',admin.accessToken,'POST',{title:'合成'+label,price,validityDays:0,assetIds:[]});assert.equal(course.status,201);
    const chapter=await api('/manage/course/'+course.body.id+'/chapters',admin.accessToken,'POST',{title:'文本章节',content:'合成原课程服务验证',sortOrder:0,freeTrial:false,revision:1});assert.equal(chapter.status,201);
    assert.equal((await api('/manage/course/'+course.body.id+'/review',admin.accessToken,'POST',{revision:2,status:'APPROVED',reason:'人工审核课程章节'})).status,201);return {id:course.body.id,chapter:chapter.body.id};
  };
  const free=await makeCourse(0,'免费课程'),paid=await makeCourse(30,'收费课程');
  const enroll=await Promise.all([p1,p2].map(port=>api('/orders/courses',buyer.accessToken,'POST',{courseId:free.id,requestKey:'free-enroll'},port)));assert.ok(enroll.every(row=>row.status===201));assert.equal(enroll[0].body.id,enroll[1].body.id);assert.equal(enroll[0].body.status,'PAID');assert.equal(Number(enroll[0].body.amount),0);
  assert.equal(await h.a.freeCourseEnrollmentNotice.count({where:{id:enroll[0].body.id}}),1);
  assert.equal((await api('/courses/'+free.id+'/chapters/'+free.chapter)).status,200);
  const purchase=await api('/orders/courses',buyer.accessToken,'POST',{courseId:paid.id,requestKey:'paid-course'});assert.equal(purchase.status,201);assert.equal(purchase.body.status,'PENDING');assert.equal(Number(purchase.body.amount),30);
  assert.equal((await api('/courses/'+paid.id+'/chapters/'+paid.chapter)).status,403);
  assert.equal((await api('/orders/courses',buyer.accessToken,'POST',{courseId:paid.id,requestKey:'same-course-other-key'})).status,409);
  assert.equal((await api('/orders/'+enroll[0].body.id+'/cancel',buyer.accessToken,'POST',{})).status,403);
  assert.equal((await api('/orders/'+purchase.body.id+'/cancel',buyer.accessToken,'POST',{})).status,201);
  h.record('原CoursePurchase免费订阅、通知事实与来源同事务提交；收费课程只生成待支付单，无学习权益，同标的重试不重复生成可付订单');
  const {PrismaClient}=loadCandidatePrisma();runtimeDb=new PrismaClient({datasources:{db:{url:h.refs['secret-ref:synthetic/real-lease-a'].databaseUrl}}});
  await assert.rejects(()=>runtimeDb.$executeRaw`INSERT INTO "Order" (id,"orderNo","userId",type,"targetId",amount,status,"updatedAt","paidAt","payMethod","payAmount") VALUES (${h.tag+'-forged'},${h.tag+'-forged'},${buyer.userId},'COURSE',${paid.id},30,'PAID',NOW(),NOW(),'FREE',0)`);
  assert.equal(await runtimeDb.$executeRaw`UPDATE "Order" SET status='CANCELLED' WHERE id=${enroll[0].body.id}`,0);
  await assert.rejects(()=>runtimeDb.$executeRaw`UPDATE "Order" SET amount=0 WHERE id=${purchase.body.id}`);
  await assert.rejects(()=>runtimeDb.$executeRaw`UPDATE "User" SET status='ACTIVE' WHERE id=${buyer.userId}`);
  await assert.rejects(()=>runtimeDb.$executeRaw`SELECT "configValue" FROM "ConfigSystem"`);
  h.record('实际最低权限账号与订单RLS拒绝收费课程伪造免费已付、取消已付、改金额、改用户身份和读取平台配置');
  // 只对本任务库故障注入；任何失败均先恢复策略，再回收进程。
  try{h.adminSql('mt_customer_a','CREATE POLICY managed_order_test_bypass ON "Order" FOR INSERT TO PUBLIC WITH CHECK(true)');await assert.rejects(()=>h.start(app,'invalid-policy'));}
  finally{h.adminSql('mt_customer_a','DROP POLICY IF EXISTS managed_order_test_bypass ON "Order"');}
  try{h.adminSql('mt_customer_a','ALTER TABLE "Order" DISABLE ROW LEVEL SECURITY');await assert.rejects(()=>h.start(app,'missing-rls'));}
  finally{h.adminSql('mt_customer_a','ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY');}
  h.record('真实数据库宽松插入策略和关闭RLS故障均导致新独立进程拒绝启动，恢复仅本任务策略');
}catch(error){failure=error;}finally{if(runtimeDb)await runtimeDb.$disconnect();await h.close();}
h.report(resolve(process.argv[2]??resolve(runtime,'commerce-postgres.json')),['apps/server/src/modules/managed-tenancy/managed-lease-commerce.ts','apps/server/src/modules/managed-tenancy/managed-order-policy.ts','apps/server/src/modules/managed-tenancy/managed-lease.runtime.ts','apps/server/src/modules/managed-tenancy/managed-lease.module.ts','apps/server/src/modules/managed-tenancy/managed-lease-permissions.ts','apps/server/src/modules/shop/shop-order.service.ts','apps/server/src/modules/course/course-purchase.service.ts','pilots/managed-tenancy/verify-commerce-postgres.mjs','pilots/managed-tenancy/postgres-harness.mjs'],failure,['本任务PostgreSQL/Nest多进程和原报价、建单、取消代码；没有真实收费、支付回调、退款或供应商履约','独立模式显式无Redis缓存，互斥依靠数据库锁；免费订阅是实际零价课程，不是伪造已付交易','平台模式默认归因及佣金口径保持原服务行为，仍须原商城和课程回归检查']);
