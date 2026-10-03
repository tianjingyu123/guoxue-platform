import { ConflictException, ForbiddenException, Injectable, NotFoundException,Optional,ServiceUnavailableException } from "@nestjs/common";
import { createHash } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { ShopOrderService } from "../shop/shop-order.service";
import { DistributionService } from "../system/distribution.service";
import { FeatureFlagService } from "../feature-flag/feature-flag.service";
import { RedisService } from "../../redis/redis.service";
import { versionScope } from "../system/distribution.util";
import { check, operatingStatus } from "./managed-policy";
import { managedPresentation } from "./managed-presentation";
import {CoursePurchaseService} from "../course/course-purchase.service";
import {CourseLearningService} from "../course/course-learning.service";
import {ShopOrderLifecycleService} from "../shop/shop-order-lifecycle.service";
import {ShopCouponService} from "../shop/shop-coupon.service";

@Injectable()
export class ManagedBrandService {
  constructor(private readonly prisma: PrismaService, private readonly orders: ShopOrderService,@Optional() private readonly purchase?:CoursePurchaseService,@Optional() private readonly learning?:CourseLearningService,@Optional() private readonly lifecycle?:ShopOrderLifecycleService,@Optional() private readonly aftersales?:ShopCouponService) {}
  private async scope(clientKey: string, userId: string, operating = true) {
    check(typeof clientKey === "string" && clientKey.length > 0 && clientKey.length <= 80, "品牌应用选择器无效");
    const registration = await new DistributionService(this.prisma).resolve(clientKey);
    const application = registration ? await this.prisma.managedApplication.findUnique({ where: { applicationId: registration.applicationId }, include: { customer: { include: { grant: true } } } }) : null;
    if (!registration || !application?.enabled || application.customer.mode !== "BRAND" || !application.stationId || !application.allowedPlatforms.includes(registration.platform)) throw new ForbiddenException("品牌应用未启用");
    const station = await this.prisma.station.findUnique({ where: { id: application.stationId }, include: { operator: true } });
    const platform = await this.prisma.brandConfig.findUnique({ where: { id: "default" }, select: { companyName: true } });
    if (station?.status !== "ACTIVE" || platform?.companyName !== application.customer.tradingSubject) throw new ForbiddenException("分站或平台交易主体已变化");
    if (operating && (Date.now() >= application.customer.endAt.getTime() || (station.expireAt && Date.now() >= station.expireAt.getTime()))) throw new ForbiddenException("品牌应用或既有分站已到期");
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { status: true,deletedAt:true } });
    if (user?.status !== "ACTIVE"||user.deletedAt) throw new ForbiddenException("用户身份无效");
    return { registration, application, station };
  }
  private async shop(clientKey: string, userId: string) {
    const scope = await this.scope(clientKey, userId);
    const grant = scope.application.customer.grant;
    const flags = new FeatureFlagService(this.prisma, {} as RedisService);
    if (!grant?.modules.includes("shop") || await flags.getConfiguredOperationState("shop_checkout", userId, versionScope(scope.registration)) !== "OPEN") throw new ForbiddenException("品牌入口商城未获授权或已关闭");
    return scope;
  }
  async context(clientKey: string, userId: string) {
    const { application, station } = await this.scope(clientKey, userId, false);
    return { applicationId: application.applicationId, stationId: station.id, applicationSubject: application.applicationSubject, tradingSubject: application.customer.tradingSubject, brand: application.brand, templateId: application.templateId, operatingStatus: operatingStatus(application.customer) };
  }
  async products(clientKey: string, userId: string) {
    const { application } = await this.shop(clientKey, userId);
    const ids = (application.customer.grant!.resources as Record<string, string[]>).product || [];
    const rows=await this.prisma.product.findMany({ where: { id: { in: ids }, isPlatform: true, supplierType: "PLATFORM", stationId: null, status: "ON_SALE", deletedAt: null }, select: { id: true, title: true, intro: true, detail:true, images:true, price: true }, take: 1001 });
    check(rows.length<=1000,"商品目录超过候选读取容量，请维护分页，不能截断目录");return rows;
  }
  private async courseScope(clientKey:string,userId:string){
    const scope=await this.scope(clientKey,userId),flags=new FeatureFlagService(this.prisma,{} as RedisService);
    if(!scope.application.customer.grant?.modules.includes("course")||await flags.getConfiguredOperationState("client_course_purchase",userId,versionScope(scope.registration))!=="OPEN")throw new ForbiddenException("品牌课程模块未获授权或已关闭");
    return scope;
  }
  async courses(clientKey:string,userId:string){
    const {application}=await this.courseScope(clientKey,userId),ids=(application.customer.grant!.resources as Record<string,string[]>).course||[];
    const rows=await this.prisma.course.findMany({where:{id:{in:ids},stationId:null,visibility:"PLATFORM",auditStatus:"APPROVED",deletedAt:null},select:{id:true,title:true,intro:true,cover:true,price:true,validityDays:true},take:1001});
    check(rows.length<=1000,"课程目录超过候选读取容量，请维护分页，不截断授权");return rows;
  }
  private async allowedCourse(clientKey:string,userId:string,id:string){if(!(await this.courses(clientKey,userId)).some(row=>row.id===id))throw new NotFoundException("本品牌已审核的公共课程不存在");}
  async createCourseOrder(clientKey:string,userId:string,body:{courseId:string;requestKey:string}){
    check(body&&Object.keys(body).every(key=>["courseId","requestKey"].includes(key))&&typeof body.courseId==="string"&&/^[a-zA-Z0-9_-]{1,80}$/.test(body.courseId)&&typeof body.requestKey==="string"&&/^[a-zA-Z0-9_-]{1,80}$/.test(body.requestKey),"品牌课程只接受课程标识与重试键，不接受金额、归属或收款参数");
    if(!this.purchase)throw new ServiceUnavailableException("品牌课程购买内核未挂载");
    const {application,station}=await this.courseScope(clientKey,userId);await this.allowedCourse(clientKey,userId,body.courseId);
    const clientRequestId="brand-course-"+createHash("sha256").update(application.applicationId+":"+userId+":"+body.requestKey).digest("hex"),requestDigest=createHash("sha256").update(JSON.stringify({orderKind:"COURSE",courseId:body.courseId})).digest("hex");
    await this.prisma.managedBrandRequest.createMany({data:[{customerId:application.customerId,applicationId:application.applicationId,stationId:station.id,buyerId:userId,requestKey:body.requestKey,requestDigest,clientRequestId,orderKind:"COURSE",courseId:body.courseId,quantity:1}],skipDuplicates:true});
    const intent=await this.prisma.managedBrandRequest.findUnique({where:{applicationId_buyerId_requestKey:{applicationId:application.applicationId,buyerId:userId,requestKey:body.requestKey}}});
    if(!intent||intent.orderKind!=="COURSE"||intent.requestDigest!==requestDigest||intent.stationId!==station.id||intent.customerId!==application.customerId)throw new ConflictException("重试键已有不同的品牌订单来源或内容");
    const orderId=await this.prisma.$transaction(async tx=>{
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`brand-course:${userId}:${body.courseId}`},0))`;
      const existing=await tx.order.findFirst({where:{userId,clientRequestId},select:{id:true,type:true,targetId:true}});
      if(existing){if(existing.type!=="COURSE"||existing.targetId!==body.courseId)throw new ConflictException("原课程订单与请求不符");return existing.id;}
      await this.allowedCourse(clientKey,userId,body.courseId);
      const order=await this.purchase!.purchaseInTransaction(tx,userId,body.courseId,{tempReferrerId:station.userId},clientRequestId);
      await this.allowedCourse(clientKey,userId,body.courseId);return order.id;
    },{timeout:20000,maxWait:20000});
    await this.reconcileRequest(application.customerId,intent.id,{reason:"品牌课程原订单已存在后核对来源，不重建或收费"},userId);
    return this.order(clientKey,userId,orderId);
  }
  async courseChapters(clientKey:string,userId:string,id:string){await this.allowedCourse(clientKey,userId,id);if(!this.learning)throw new ServiceUnavailableException("课程学习内核未挂载");return this.learning.getChapters(id);}
  async courseChapter(clientKey:string,userId:string,id:string,chapterId:string){
    await this.allowedCourse(clientKey,userId,id);if(!this.learning)throw new ServiceUnavailableException("课程学习内核未挂载");
    if(!await this.prisma.courseChapter.findFirst({where:{id:chapterId,courseId:id},select:{id:true}}))throw new NotFoundException("本课程章节不存在");
    const row=await this.learning.getChapterContent(userId,chapterId);await this.allowedCourse(clientKey,userId,id);return row;
  }
  async courseProgress(clientKey:string,userId:string,id:string){await this.allowedCourse(clientKey,userId,id);if(!this.learning)throw new ServiceUnavailableException("课程学习内核未挂载");return this.learning.getMyProgress(userId,id);}
  async updateCourseProgress(clientKey:string,userId:string,id:string,chapterId:string,body:{progress:number}){
    check(body&&Object.keys(body).length===1&&Number.isInteger(body.progress)&&body.progress>=0&&body.progress<=100,"学习进度须为0至100的整数，不接受身份或课程参数");
    await this.courseChapter(clientKey,userId,id,chapterId);const result=await this.learning!.updateProgress(userId,chapterId,body);await this.allowedCourse(clientKey,userId,id);return result;
  }
  async cancelOrder(clientKey:string,userId:string,id:string,body:unknown){check(body&&typeof body==="object"&&!Array.isArray(body)&&Object.keys(body).length===0,"取消订单不接受额外参数");await this.order(clientKey,userId,id);if(!this.lifecycle)throw new ServiceUnavailableException("原订单履约内核未挂载");return this.lifecycle.cancelOrder(id,userId);}
  private async afterSaleOrigin(clientKey:string,userId:string,id:string){const row=await this.prisma.afterSale.findUnique({where:{id},select:{orderId:true,userId:true}});if(!row||row.userId!==userId)throw new NotFoundException("本用户售后不存在");await this.order(clientKey,userId,row.orderId);if(!this.aftersales)throw new ServiceUnavailableException("原售后内核未挂载");}
  async cancelAfterSale(clientKey:string,userId:string,id:string,body:unknown){check(body&&typeof body==="object"&&!Array.isArray(body)&&Object.keys(body).length===0,"取消售后不接受额外参数");await this.afterSaleOrigin(clientKey,userId,id);return this.aftersales!.cancelAfterSale(id,userId);}
  async returnLogistics(clientKey:string,userId:string,id:string,body:{company:string;logisticsNo:string}){check(body&&Object.keys(body).every(key=>["company","logisticsNo"].includes(key))&&typeof body.company==="string"&&body.company.length>0&&body.company.length<=80&&typeof body.logisticsNo==="string"&&body.logisticsNo.length>=4&&body.logisticsNo.length<=80,"仅接受退货公司与运单号");await this.afterSaleOrigin(clientKey,userId,id);return this.aftersales!.submitReturnLogistics(id,userId,body.company,body.logisticsNo);}
  async presentation(clientKey: string, userId: string, build: string, capabilities: string, resource: string) {
    const { application, registration } = await this.scope(clientKey, userId, false);
    return managedPresentation(this.prisma, versionScope(registration), userId, application.customer.grant || { modules: [] }, application.templateId, Date.now() < application.customer.endAt.getTime(), build, capabilities, resource);
  }
  async createOrder(clientKey: string, userId: string, body: { productId: string; quantity: number; requestKey: string; addressId: string; skuId?: string; couponId?: string }) {
    check(body && Object.keys(body).every(key => ["productId", "quantity", "requestKey", "addressId", "skuId", "couponId"].includes(key)) && typeof body.productId === "string" && Number.isInteger(body.quantity) && body.quantity > 0 && body.quantity <= 100 && typeof body.requestKey === "string" && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(body.requestKey) && typeof body.addressId === "string" && body.addressId.length <= 80 && [body.skuId, body.couponId].every(value => value === undefined || (typeof value === "string" && value.length <= 80)), "订单仅接受商品、数量、地址、SKU、优惠券与重试键，不能指定金额或收款主体");
    const { application, station } = await this.shop(clientKey, userId);
    const allowed = await this.products(clientKey, userId);
    if (!allowed.some(product => product.id === body.productId)) throw new ForbiddenException("该商品不在品牌授权范围");
    const clientRequestId = "brand-" + createHash("sha256").update(application.applicationId + ":" + body.requestKey).digest("hex");
    const requestDigest = createHash("sha256").update(JSON.stringify({ productId: body.productId, quantity: body.quantity, addressId: body.addressId, skuId: body.skuId ?? null, couponId: body.couponId ?? null })).digest("hex");
    await this.prisma.managedBrandRequest.createMany({ data: [{ customerId: application.customerId, applicationId: application.applicationId, stationId: station.id, buyerId: userId, requestKey: body.requestKey, requestDigest, clientRequestId, productId: body.productId, quantity: body.quantity, addressId: body.addressId, skuId: body.skuId, couponId: body.couponId }], skipDuplicates: true });
    const intent = await this.prisma.managedBrandRequest.findUnique({ where: { applicationId_buyerId_requestKey: { applicationId: application.applicationId, buyerId: userId, requestKey: body.requestKey } } });
    if (!intent || intent.customerId !== application.customerId || intent.stationId !== station.id || intent.requestDigest !== requestDigest) throw new ConflictException("建单请求已存在且来源或内容不同");
    // 复用既有定价、库存、优惠券、自购立减与归因；品牌入口不设佣金率，不调用支付。
    const order = await this.orders.createOrder(userId, { type: "PRODUCT", targetId: body.productId, amount: body.quantity, addressId: body.addressId, skuId: body.skuId, couponId: body.couponId, tempReferrerId: station.userId, clientRequestId });
    await this.reconcileRequest(application.customerId, intent.id, { reason: "品牌下单完成后核对已存在订单并登记来源" }, userId);
    return { id: order.id, amount: order.amount, status: order.status, quantity: order.quantity, applicationSubject: application.applicationSubject, tradingSubject: application.customer.tradingSubject };
  }
  async pendingRequests(customerId: string) {
    return this.prisma.managedBrandRequest.findMany({ where: { customerId, state: "WAITING_ORDER" }, select: { id: true, applicationId: true, state: true, createdAt: true }, orderBy: { createdAt: "asc" }, take: 200 });
  }
  async reconcileRequest(customerId: string, id: string, payload: { reason: string }, actorId: string) {
    check(payload && Object.keys(payload).every(key => key === "reason") && typeof payload.reason === "string" && payload.reason.trim().length >= 2 && payload.reason.length <= 500, "补登记须提供维护依据，不接受订单金额、支付或用户参数");
    return this.prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`brand-request:${id}`},0))`;
      const intent = await tx.managedBrandRequest.findFirst({ where: { id, customerId } });
      if (!intent) throw new NotFoundException("本客户建单请求不存在");
      const order = await tx.order.findFirst({ where: { userId: intent.buyerId, clientRequestId: intent.clientRequestId } });
      // 请求已经持久化但公共建单未提交时，只报告等待，不重报价、建单、扣库存或付款。
      if (!order) return { id, state: "WAITING_ORDER", orderId: null };
      const matches=intent.orderKind==="PRODUCT"?order.type==="PRODUCT"&&order.targetId===intent.productId&&order.quantity===intent.quantity&&order.addressId===intent.addressId&&order.skuId===intent.skuId&&order.couponId===intent.couponId:intent.orderKind==="COURSE"&&order.type==="COURSE"&&order.targetId===intent.courseId&&order.quantity===1&&order.addressId===null&&order.skuId===null&&order.couponId===null;
      if (!matches || (intent.orderId && intent.orderId !== order.id)) throw new ConflictException("已存在订单与品牌请求意图不一致，须人工核查");
      await tx.managedBrandOrder.createMany({ data: [{ orderId: order.id, customerId: intent.customerId, applicationId: intent.applicationId, stationId: intent.stationId, buyerId: intent.buyerId }], skipDuplicates: true });
      const origin = await tx.managedBrandOrder.findUnique({ where: { orderId: order.id } });
      if (!origin || origin.customerId !== customerId || origin.applicationId !== intent.applicationId || origin.stationId !== intent.stationId || origin.buyerId !== intent.buyerId) throw new ConflictException("已存在订单来源冲突，须人工核查");
      if (intent.state !== "LINKED") {
        await tx.managedBrandRequest.update({ where: { id }, data: { state: "LINKED", orderId: order.id } });
        const customer = await tx.managedCustomer.findUniqueOrThrow({ where: { id: customerId } });
        await tx.managedAudit.create({ data: { customerId, actorId, action: "RECONCILE_BRAND_ORDER", reason: payload.reason, revision: customer.revision } });
      }
      return { id, state: "LINKED", orderId: order.id };
    });
  }
  async order(clientKey: string, userId: string, id: string) {
    const { application } = await this.scope(clientKey, userId, false);
    const origin = await this.prisma.managedBrandOrder.findFirst({ where: { orderId: id, applicationId: application.applicationId, customerId: application.customerId, buyerId: userId }, include: { order: true } });
    if (!origin || origin.order.userId !== userId) throw new NotFoundException("订单不存在或不属于此应用与用户");
    return { id: origin.order.id, type: origin.order.type, targetId: origin.order.targetId, amount: origin.order.amount, status: origin.order.status, quantity: origin.order.quantity, paidAt: origin.order.paidAt, createdAt: origin.order.createdAt, tradingSubject: application.customer.tradingSubject };
  }
  async orderList(clientKey:string,userId:string,cursor=""){
    const {application}=await this.scope(clientKey,userId,false);check(!cursor||/^[a-zA-Z0-9_-]{1,128}$/.test(cursor),"订单分页无效");
    const rows=await this.prisma.managedBrandOrder.findMany({where:{applicationId:application.applicationId,customerId:application.customerId,buyerId:userId,...(cursor?{orderId:{gt:cursor}}:{})},include:{order:{select:{id:true,type:true,targetId:true,amount:true,status:true,quantity:true,paidAt:true,createdAt:true}}},orderBy:{orderId:"asc"},take:51});
    return {items:rows.slice(0,50).map(row=>({...row.order,tradingSubject:application.customer.tradingSubject})),nextCursor:rows.length>50?rows[49].orderId:null};
  }
  async confirmOrder(clientKey:string,userId:string,id:string,body:unknown){check(body&&typeof body==="object"&&!Array.isArray(body)&&!Object.keys(body).length,"收货不接受状态或金额参数");await this.order(clientKey,userId,id);if(!this.lifecycle)throw new ServiceUnavailableException("平台履约内核未挂载");return this.lifecycle.confirmOrder(id,userId);}
  async applyAfterSale(clientKey:string,userId:string,id:string,body:{type:string;reason:string}){
    check(body&&Object.keys(body).every(key=>["type","reason"].includes(key))&&typeof body.type==="string"&&["refund_only","refund_with_return","exchange"].includes(body.type)&&typeof body.reason==="string"&&body.reason.trim().length>=2&&body.reason.length<=500,"售后仅接受已支持类型和原因，不接受退款金额或商户参数");
    await this.order(clientKey,userId,id);if(!this.aftersales)throw new ServiceUnavailableException("平台售后内核未挂载");return this.aftersales.applyAfterSale(userId,id,body.type,body.reason);
  }
  async afterSales(clientKey:string,userId:string,id:string,page=1){await this.order(clientKey,userId,id);check(Number.isInteger(page)&&page>=1&&page<=10000,"售后分页无效");if(!this.aftersales)throw new ServiceUnavailableException("平台售后内核未挂载");return this.aftersales.getUserAfterSales(userId,page,20,id);}
  async operatorSummary(clientKey: string, userId: string) {
    const { application, station } = await this.scope(clientKey, userId, false);
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { roles: true } });
    const stationOwner = user?.roles.some(role => role.roleType === "STATION_MASTER") && station.userId === userId;
    const operatorOwner = user?.roles.some(role => role.roleType === "OPERATOR") && station.operator?.status === "ACTIVE" && station.operator.userId === userId;
    if (!stationOwner && !operatorOwner) throw new ForbiddenException("仅当前分站站长或既有归属运营商可查看");
    // 只给订单数量/状态，不增加私有客户、地址、手机号或跨站订单读取权限。
    const counts = await this.prisma.managedBrandOrder.groupBy({ by: ["applicationId"], where: { applicationId: application.applicationId, customerId: application.customerId, stationId: station.id }, _count: { orderId: true } });
    return { applicationId: application.applicationId, stationId: station.id, orderCount: counts[0]?._count.orderId || 0 };
  }
}
