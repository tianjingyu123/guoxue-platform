import {BadRequestException,ConflictException,ForbiddenException,NotFoundException} from "@nestjs/common";
import {Prisma,PrismaClient} from "@prisma/client";
import {createHash} from "crypto";
import {PrismaService} from "../../prisma/prisma.service";
import {RedisService} from "../../redis/redis.service";
import {UnifiedPricingService} from "../pricing/unified-pricing.service";
import {ShopAttributionService} from "../shop/shop-attribution.service";
import {ShopOrderService} from "../shop/shop-order.service";
import {ShopOrderLifecycleService} from "../shop/shop-order-lifecycle.service";
import {ShopPaymentService} from "../shop/shop-payment.service";
import {CoursePurchaseService} from "../course/course-purchase.service";
import {contentBody,contentId,contentText,ManagedContentActor} from "./managed-lease-content";
import {digest} from "./managed-policy";

// 当前独立入口显式禁用缓存；所有互斥由外层PostgreSQL事务锁承担，不冒充真实Redis接通。
const uncached={getJson:async()=>null,setJson:async()=>undefined,setNX:async()=>true,del:async()=>0,delByPattern:async()=>0} as unknown as RedisService;
function transactionService(tx:Prisma.TransactionClient):PrismaService{
  return new Proxy(tx,{get(target,key){if(key==="$transaction")return (work:(transaction:Prisma.TransactionClient)=>Promise<unknown>)=>work(tx);const value=Reflect.get(target,key);return typeof value==="function"?value.bind(target):value;}}) as unknown as PrismaService;
}
const orderSelect={id:true,type:true,targetId:true,quantity:true,amount:true,status:true,paidAt:true,createdAt:true} as const;
const addressSelect={id:true,name:true,phone:true,province:true,city:true,district:true,detail:true,isDefault:true} as const;

/** 原报价与下单内核在本客户同一事务内使用；来源、库存和审计一起提交。 */
export class ManagedLeaseCommerceService {
  constructor(private readonly db:PrismaClient,private readonly actor:ManagedContentActor,private readonly scope:(kind:"product"|"course")=>Promise<string[]>,private readonly authorizeHistorical:()=>Promise<unknown>){ }
  private native(tx:Prisma.TransactionClient){
    const prisma=transactionService(tx),pricing=new UnifiedPricingService(prisma,uncached),attribution=new ShopAttributionService(prisma,uncached);
    const order=new ShopOrderService(prisma,uncached,pricing,attribution,undefined,"INDEPENDENT");
    return {order,course:new CoursePurchaseService(prisma,uncached,pricing,attribution,undefined,"INDEPENDENT"),lifecycle:new ShopOrderLifecycleService(prisma,uncached,attribution,order,undefined as unknown as ShopPaymentService)};
  }
  private originWhere(key:string){return {customerId_applicationId_userId_requestKey:{...this.actor,requestKey:key}};}
  private async originFor(tx:Prisma.TransactionClient,id:string){
    const origin=await tx.managedLeaseOrder.findUnique({where:{orderId:id}});
    if(origin&&(origin.customerId!==this.actor.customerId||origin.applicationId!==this.actor.applicationId||origin.userId!==this.actor.userId))throw new NotFoundException("本应用订单不存在");return origin;
  }
  async create(kind:"product"|"course",value:unknown){
    const body=contentBody(value,kind==="product"?["productId","quantity","addressId","requestKey"]:["courseId","requestKey"]);
    const id=contentId(kind==="product"?body.productId:body.courseId),key=contentId(body.requestKey);
    if(key.length>80)throw new BadRequestException("下单重试键最多80字符");
    const quantity=kind==="product"?body.quantity:1,addressId=kind==="product"?contentId(body.addressId):undefined;
    if(!Number.isSafeInteger(quantity)||Number(quantity)<1||Number(quantity)>100)throw new BadRequestException("下单数量必须为1至100件");
    const fingerprint=digest({kind,id,quantity,addressId:addressId??null});
    if(!(await this.scope(kind)).includes(id))throw new NotFoundException("本应用标的未授权");
    return this.db.$transaction(async tx=>{
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`managed-order:${this.actor.customerId}:${this.actor.applicationId}:${this.actor.userId}:${key}`},0))`;
      const earlier=await tx.managedLeaseOrder.findUnique({where:this.originWhere(key)});
      if(earlier){if(earlier.requestDigest!==fingerprint)throw new ConflictException("重试键已用于不同订单内容");await this.scope(kind);return this.read(tx,earlier.orderId);}
      // 编辑和建单共用来源行锁，订单预占库存后推进修订，旧管理表单不能覆盖预占数。
      const owned=await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM "ManagedLeaseResource" WHERE "customerId"=${this.actor.customerId} AND "applicationId"=${this.actor.applicationId} AND kind=${kind} AND "resourceId"=${id} FOR UPDATE`;
      const native=this.native(tx);let order:{id:string};
      if(kind==="product"){
        await tx.$queryRaw`SELECT id FROM "Product" WHERE id=${id} FOR UPDATE`;
        const product=await tx.product.findFirst({where:{id,status:"ON_SALE",deletedAt:null},select:{id:true,supplierType:true}});
        if(!product)throw new NotFoundException("商品未上架");
        if(product.supplierType!=="PLATFORM")throw new ForbiddenException("本入口尚未核验外部供应商商品履约");
        const nativeKey=createHash("sha256").update(`${this.actor.customerId}:${this.actor.applicationId}:${this.actor.userId}:${key}`).digest("hex");
        order=await native.order.createOrder(this.actor.userId,{type:"PRODUCT",targetId:id,amount:Number(quantity),addressId,clientRequestId:nativeKey});
        if(owned[0])await tx.managedLeaseResource.update({where:{id:owned[0].id},data:{revision:{increment:1}}});
      }else{
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`managed-course-order:${this.actor.customerId}:${this.actor.userId}:${id}`},0))`;
        await tx.$queryRaw`SELECT id FROM "Course" WHERE id=${id} FOR UPDATE`;
        if(!await tx.course.findFirst({where:{id,auditStatus:"APPROVED",deletedAt:null},select:{id:true}}))throw new NotFoundException("课程未审核启用");
        order=await native.course.purchase(this.actor.userId,id);
      }
      const source=await this.originFor(tx,order.id);
      if(source)throw new ConflictException("标的已有待支付订单，请继续使用原订单和重试键");
      await tx.managedLeaseOrder.create({data:{...this.actor,orderId:order.id,requestKey:key,requestDigest:fingerprint}});
      await tx.managedLeaseAudit.create({data:{customerId:this.actor.customerId,userId:this.actor.userId,action:"CREATE_OWN_ORDER",entityId:order.id}});
      if(!(await this.scope(kind)).includes(id))throw new ForbiddenException("建单期间标的授权已撤销");
      return this.read(tx,order.id);
    },{timeout:20000,maxWait:20000});
  }
  private async read(tx:Prisma.TransactionClient,id:string){
    await this.originFor(tx,id);
    const row=await tx.order.findFirst({where:{id,userId:this.actor.userId},select:orderSelect});if(!row)throw new NotFoundException("本人订单不存在");
    return {...row,paymentReady:false};
  }
  async detail(id:string){contentId(id);await this.authorizeHistorical();return this.read(this.db,id);}
  async list(cursor=""){
    await this.authorizeHistorical();if(cursor)contentId(cursor);
    const rows=await this.db.order.findMany({where:{userId:this.actor.userId,...(cursor?{id:{gt:cursor}}:{}),OR:[{managedLeaseOrigin:null},{managedLeaseOrigin:{customerId:this.actor.customerId,applicationId:this.actor.applicationId,userId:this.actor.userId}}]},select:orderSelect,orderBy:{id:"asc"},take:51});
    return {items:rows.slice(0,50).map(row=>({...row,paymentReady:false})),nextCursor:rows.length>50?rows[49].id:null};
  }
  async cancel(id:string,value:unknown){
    contentId(id);contentBody(value,[]);await this.authorizeHistorical();
    return this.db.$transaction(async tx=>{
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`managed-order-cancel:${this.actor.customerId}:${id}`},0))`;
      // 已来源化的新订单可由本入口取消；旧订单走原受控历史流程，不能猜测库存归属。
      const source=await this.originFor(tx,id);if(!source)throw new ForbiddenException("此历史订单须由维护流程受理取消");
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id=${id} FOR UPDATE`;
      const row=await tx.order.findFirst({where:{id,userId:this.actor.userId},select:orderSelect});if(!row)throw new NotFoundException("本人订单不存在");
      if(row.status==="CANCELLED"){await this.authorizeHistorical();return {id,status:"CANCELLED"};}
      if(row.status!=="PENDING")throw new ForbiddenException("只能取消本人待支付订单，已付订单须走售后");
      if(row.type==="PRODUCT"){
        // 先锁来源，再调用原取消内核恢复库存；与商品编辑、建单保持同一顺序。
        const owned=await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM "ManagedLeaseResource" WHERE "customerId"=${this.actor.customerId} AND "applicationId"=${this.actor.applicationId} AND kind='product' AND "resourceId"=${row.targetId} FOR UPDATE`;
        await this.native(tx).lifecycle.cancelOrder(id,this.actor.userId);
        if(owned[0])await tx.managedLeaseResource.update({where:{id:owned[0].id},data:{revision:{increment:1}}});
      }else if(row.type==="COURSE"){
        // 课程没有实物库存；不能进入原实物取消分支按同名商品回补。
        const changed=await tx.order.updateMany({where:{id,userId:this.actor.userId,status:"PENDING"},data:{status:"CANCELLED"}});if(changed.count!==1)throw new ConflictException("订单状态已变化");
      }else throw new ForbiddenException("此订单类型尚未挂载独立取消入口");
      await tx.managedLeaseAudit.create({data:{customerId:this.actor.customerId,userId:this.actor.userId,action:"CANCEL_OWN_ORDER",entityId:id}});await this.authorizeHistorical();
      return {id,status:"CANCELLED"};
    },{timeout:20000,maxWait:20000});
  }
  async addresses(){await this.authorizeHistorical();const rows=await this.db.shippingAddress.findMany({where:{userId:this.actor.userId},select:addressSelect,orderBy:{id:"asc"},take:101});if(rows.length>100)throw new BadRequestException("地址超过当前读取上限，请安排维护处理");return rows;}
  async saveAddress(value:unknown,id?:string){
    const body=contentBody(value,["name","phone","province","city","district","detail","isDefault"]),data={name:contentText(body.name,60),phone:contentText(body.phone,24),province:contentText(body.province,60),city:contentText(body.city,60),district:contentText(body.district,60),detail:contentText(body.detail,300),isDefault:body.isDefault};
    if(!/^[+0-9 ()-]{6,24}$/.test(data.phone)||typeof data.isDefault!=="boolean")throw new BadRequestException("收货电话或默认标记无效");if(id)contentId(id);await this.scope("product");
    return this.db.$transaction(async tx=>{
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`managed-address:${this.actor.customerId}:${this.actor.userId}`},0))`;
      if(id&&!await tx.shippingAddress.findFirst({where:{id,userId:this.actor.userId},select:{id:true}}))throw new NotFoundException("本人地址不存在");
      if(!id&&await tx.shippingAddress.count({where:{userId:this.actor.userId}})>=100)throw new ForbiddenException("地址达到当前技术上限");
      if(data.isDefault)await tx.shippingAddress.updateMany({where:{userId:this.actor.userId,isDefault:true},data:{isDefault:false}});
      let addressId=id;
      if(id)await tx.shippingAddress.updateMany({where:{id,userId:this.actor.userId},data:{...data,isDefault:data.isDefault as boolean}});
      else addressId=(await tx.shippingAddress.create({data:{...data,isDefault:data.isDefault as boolean,userId:this.actor.userId},select:{id:true}})).id;
      await tx.managedLeaseAudit.create({data:{customerId:this.actor.customerId,userId:this.actor.userId,action:"SAVE_OWN_ADDRESS",entityId:addressId!}});await this.scope("product");
      return tx.shippingAddress.findFirst({where:{id:addressId,userId:this.actor.userId},select:addressSelect});
    });
  }
}
