import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {readFileSync,writeFileSync} from 'node:fs';
import {ManagedPostgresHarness,repo,runtime} from './postgres-harness.mjs';

// 用户指定的两个虚拟主体只登记到本任务合成库，不充当工商、商户或渠道资质。
const h=new ManagedPostgresHarness('virtual-pilot'),db=h.control,require=createRequire(resolve(repo,'apps/server/package.json'));
const source=name=>require(resolve(repo,'apps/server/src/modules/'+name));
const {ManagedBrandService}=source('managed-tenancy/managed-brand.service.ts');
const {CoursePurchaseService}=source('course/course-purchase.service.ts'),{CourseLearningService}=source('course/course-learning.service.ts');
const {UnifiedPricingService}=source('pricing/unified-pricing.service.ts'),{ShopAttributionService}=source('shop/shop-attribution.service.ts'),{ShopOrderService}=source('shop/shop-order.service.ts');
const cache={get:async()=>null,getJson:async()=>null,setJson:async()=>{},setNX:async()=>true,del:async()=>0,delByPattern:async()=>{}};
const pricing=new UnifiedPricingService(db,cache),attribution=new ShopAttributionService(db,cache),purchase=new CoursePurchaseService(db,cache,pricing,attribution);
const brand=new ManagedBrandService(db,new ShopOrderService(db,cache,pricing,attribution),purchase,new CourseLearningService(db,purchase));
const term={remindAt:'2035-01-01T00:00:00Z',endAt:'2036-01-01T00:00:00Z',exportUntil:'2037-01-01T00:00:00Z',downloadTtlSeconds:60};
const subjects=[];let failure,expiredBrand;
try{
  assert.deepEqual((await db.$queryRawUnsafe('SELECT current_database() db,current_user actor,inet_server_port() port'))[0],{db:'mt_control',actor:'mt_control',port:55467});
  const a=await h.application('a','system'),b=await h.application('b','isolation');await h.grantModules(a,{product:[],course:[],circle:[],agent:[]});
  await db.managedApplication.update({where:{id:a.application.id},data:{applicationSubject:'独立系统测试（虚拟应用主体）',brand:{name:'独立系统测试',themeColor:'#225544'}}});
  const ap=await h.start(a),bp=await h.start(b),admin=await h.account(ap,a,'admin',true),buyer=await h.account(ap,a,'buyer'),other=await h.account(bp,b,'other');
  const context=await h.call(ap,a,'/context',buyer.accessToken);assert.equal(context.status,200);assert.equal(context.body.brand.name,'独立系统测试');assert.equal(context.body.customerId,a.customerId);
  subjects.push({name:'独立系统测试',virtual:true,mode:'LEASE',customerId:a.customerId,usesExistingSyntheticCustomer:true,databaseName:'mt_customer_a',applicationId:a.applicationId,applicationSubject:context.body.applicationSubject,tradingSubject:context.body.tradingSubject,formalChannelRegistered:false,merchantRegistered:false});
  h.record('独立系统测试应用实际登记、独立进程注册登录和固定客户上下文通过；原合成客户ID及数据库绑定保留');
  const api=(path,method='GET',body,token=admin.accessToken)=>h.call(ap,a,path,token,method,body);
  const course=await api('/manage/course','POST',{title:'独立系统测试免费课程',price:0,validityDays:0,assetIds:[]});assert.equal(course.status,201);
  const chapter=await api('/manage/course/'+course.body.id+'/chapters','POST',{title:'虚拟试点说明',content:'本课程只用于虚拟测试，不提供商业服务或资质证明。',sortOrder:0,freeTrial:false,revision:1});assert.equal(chapter.status,201);
  assert.equal((await api('/manage/course/'+course.body.id+'/review','POST',{revision:2,status:'APPROVED',reason:'用户指定虚拟试点课程验收'})).status,201);
  const enrollment=await api('/orders/courses','POST',{courseId:course.body.id,requestKey:'virtual-free'},buyer.accessToken);assert.equal(enrollment.status,201);assert.equal(Number(enrollment.body.amount),0);assert.equal(enrollment.body.status,'PAID');
  assert.equal((await api('/courses/'+course.body.id+'/chapters/'+chapter.body.id,'GET',undefined,buyer.accessToken)).status,200);
  assert.equal((await h.call(bp,b,'/courses/'+course.body.id+'/chapters/'+chapter.body.id,other.accessToken)).status,400);
  h.record('独立系统测试实际经营建课、审核、零价订阅和学习通过，另一客户不可读取；没有商户资金调用');
  const platform=await db.brandConfig.findUnique({where:{id:'default'}});assert.equal(platform.companyName,'synthetic-rebu-company');
  const owner=await db.user.create({data:{id:h.tag+'-owner',nickname:'独立分站测试站长（虚拟）',roles:{create:{roleType:'STATION_MASTER'}}}}),user=await db.user.create({data:{id:h.tag+'-student',nickname:'独立分站测试学员（虚拟）'}});
  const station=await db.station.create({data:{userId:owner.id,name:'独立分站测试',code:h.tag+'-station'}});
  const publicCourse=await db.course.create({data:{userId:owner.id,title:'独立分站测试公共免费课',type:'TEXT',visibility:'PLATFORM',auditStatus:'APPROVED',price:0}}),publicChapter=await db.courseChapter.create({data:{courseId:publicCourse.id,title:'虚拟试点说明',content:'本分站与主体均为虚拟测试。'}});
  const payload={requestKey:h.tag+'-brand',name:'独立分站测试',mode:'BRAND',tradingSubject:platform.companyName,maintenancePrice:null,term,applications:[{applicationId:h.tag+'-brand-app',applicationSubject:'独立分站测试（虚拟应用主体）',stationId:station.id,allowedPlatforms:['h5'],brand:{name:'独立分站测试',themeColor:'#335577'},templateId:'community'}],modules:['course'],resources:{product:[],course:[publicCourse.id],circle:[],agent:[]},circleLimit:0,reason:'用户确认以独立分站测试虚拟主体进行本机试点'};
  const customer=await h.service.create(payload,'synthetic-maintainer');assert.equal((await h.service.create(payload,'synthetic-maintainer')).id,customer.id);
  const key=h.tag+'-brand-client';await db.appDistribution.create({data:{clientKey:key,applicationId:customer.applications[0].applicationId,productId:'synthetic',platform:'h5',channelId:'synthetic-web',packageName:'synthetic.virtual.pilot'}});await h.service.enableApplication(customer.applications[0].id,'synthetic-maintainer','仅本机虚拟登记，不代表正式渠道核验');
  const brandContext=await brand.context(key,user.id);assert.equal(brandContext.brand.name,'独立分站测试');assert.equal(brandContext.tradingSubject,platform.companyName);
  subjects.push({name:'独立分站测试',virtual:true,mode:'BRAND',customerId:customer.id,stationId:station.id,applicationId:customer.applications[0].applicationId,applicationSubject:brandContext.applicationSubject,tradingSubject:brandContext.tradingSubject,formalChannelRegistered:false,merchantRegistered:false,independentCollection:false});
  h.record('独立分站测试通过实际控制面幂等开通、既有分站绑定和应用启用，交易主体保留合成平台主体');
  const created=await brand.createCourseOrder(key,user.id,{courseId:publicCourse.id,requestKey:'virtual-brand-free'});assert.equal(Number(created.amount),0);assert.equal(created.status,'PAID');assert.equal((await brand.courseChapter(key,user.id,publicCourse.id,publicChapter.id)).content,'本分站与主体均为虚拟测试。');
  await assert.rejects(()=>brand.courseChapter(key,user.id,course.body.id,chapter.body.id));assert.equal((await api('/courses/'+publicCourse.id+'/chapters/'+publicChapter.id,'GET',undefined,buyer.accessToken)).status,400);
  h.record('独立分站测试复用原公共免费课订阅和学习内核，品牌公共课与独立客户私有课双向隔离');
  expiredBrand=await h.service.renew(customer.id,{term:{...term,remindAt:'2020-01-01T00:00:00Z',endAt:'2021-01-01T00:00:00Z'},expectedRevision:customer.revision,reason:'虚拟分站测试到期验收'},'synthetic-maintainer');
  await assert.rejects(()=>brand.createCourseOrder(key,user.id,{courseId:publicCourse.id,requestKey:'expired'}));assert.equal((await brand.order(key,user.id,created.id)).id,created.id);
  await h.service.renew(customer.id,{term,expectedRevision:expiredBrand.revision,reason:'虚拟分站到期演练后恢复合成期限'},'synthetic-maintainer');expiredBrand=undefined;
  h.record('虚拟分站到期拒绝新经营、保留本人历史订单，演练后恢复合成期限，不执行付款续费');
}catch(error){failure=error;}finally{
  if(expiredBrand)await h.service.renew(expiredBrand.id,{term,expectedRevision:expiredBrand.revision,reason:'失败路径恢复虚拟分站合成期限'},'synthetic-maintainer');
  await h.close();
}
const output=resolve(process.argv[2]??resolve(runtime,'virtual-pilot-postgres.json'));
h.report(output,['pilots/managed-tenancy/verify-virtual-pilot-postgres.mjs','pilots/managed-tenancy/postgres-harness.mjs','apps/server/src/modules/managed-tenancy/managed-tenancy.service.ts','apps/server/src/modules/managed-tenancy/managed-brand.service.ts','apps/server/src/modules/managed-tenancy/managed-lease.runtime.ts'],failure,['两个名称由用户指定，均为虚拟测试主体；独立系统使用既有合成客户A的固定库和新的命名应用，不改合同身份或旧恢复记录','本任务Windows/PostgreSQL和实际业务内核；品牌Redis为无缓存替身，没有生产、工商主体、正式AppID、商户、真实收退款或渠道审核','零价课程订阅使用原FREE规则，不能作为真实付费交易证明']);
const report=JSON.parse(readFileSync(output,'utf8'));report.virtualSubjects=subjects;writeFileSync(output,JSON.stringify(report,null,2)+'\n');
