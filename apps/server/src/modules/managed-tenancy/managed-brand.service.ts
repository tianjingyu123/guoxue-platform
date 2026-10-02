import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { createHash } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { ShopOrderService } from "../shop/shop-order.service";
import { DistributionService } from "../system/distribution.service";
import { FeatureFlagService } from "../feature-flag/feature-flag.service";
import { RedisService } from "../../redis/redis.service";
import { versionScope } from "../system/distribution.util";
import { check, operatingStatus } from "./managed-policy";
import { managedPresentation } from "./managed-presentation";

@Injectable()
export class ManagedBrandService {
  constructor(private readonly prisma: PrismaService, private readonly orders: ShopOrderService) {}
  private async scope(clientKey: string, userId: string, operating = true) {
    check(typeof clientKey === "string" && clientKey.length > 0 && clientKey.length <= 80, "品牌应用选择器无效");
    const registration = await new DistributionService(this.prisma).resolve(clientKey);
    const application = registration ? await this.prisma.managedApplication.findUnique({ where: { applicationId: registration.applicationId }, include: { customer: { include: { grant: true } } } }) : null;
    if (!registration || !application?.enabled || application.customer.mode !== "BRAND" || !application.stationId || !application.allowedPlatforms.includes(registration.platform)) throw new ForbiddenException("品牌应用未启用");
    const station = await this.prisma.station.findUnique({ where: { id: application.stationId }, include: { operator: true } });
    const platform = await this.prisma.brandConfig.findUnique({ where: { id: "default" }, select: { companyName: true } });
    if (station?.status !== "ACTIVE" || platform?.companyName !== application.customer.tradingSubject) throw new ForbiddenException("分站或平台交易主体已变化");
    if (operating && (Date.now() >= application.customer.endAt.getTime() || (station.expireAt && Date.now() >= station.expireAt.getTime()))) throw new ForbiddenException("品牌应用或既有分站已到期");
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { status: true } });
    if (user?.status !== "ACTIVE") throw new ForbiddenException("用户身份无效");
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
    return this.prisma.product.findMany({ where: { id: { in: ids }, isPlatform: true, supplierType: "PLATFORM", stationId: null, status: "ON_SALE", deletedAt: null }, select: { id: true, title: true, intro: true, price: true }, take: 200 });
  }
  async presentation(clientKey: string, userId: string, build: string, capabilities: string, resource: string) {
    const { application, registration } = await this.scope(clientKey, userId, false);
    return managedPresentation(this.prisma, versionScope(registration), userId, application.customer.grant || { modules: [] }, application.templateId, Date.now() < application.customer.endAt.getTime(), build, capabilities, resource);
  }
  async createOrder(clientKey: string, userId: string, body: { productId: string; quantity: number; requestKey: string; addressId: string; skuId?: string; couponId?: string }) {
    check(body && Object.keys(body).every(key => ["productId", "quantity", "requestKey", "addressId", "skuId", "couponId"].includes(key)) && typeof body.productId === "string" && Number.isInteger(body.quantity) && body.quantity > 0 && body.quantity <= 100 && typeof body.requestKey === "string" && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(body.requestKey) && typeof body.addressId === "string" && body.addressId.length <= 80 && [body.skuId, body.couponId].every(value => value === undefined || (typeof value === "string" && value.length <= 80)), "订单仅接受商品、数量、地址、SKU、优惠券与重试键，不能指定金额或收款主体");
    const { application, station } = await this.shop(clientKey, userId);
    const allowed = await this.products(clientKey, userId);
    if (!allowed.some(product => product.id === body.productId)) throw new ForbiddenException("该商品不在品牌授权范围");
    // 复用既有定价、库存、优惠券、自购立减与归因；品牌入口不设佣金率，不调用支付。
    const order = await this.orders.createOrder(userId, { type: "PRODUCT", targetId: body.productId, amount: body.quantity, addressId: body.addressId, skuId: body.skuId, couponId: body.couponId, tempReferrerId: station.userId, clientRequestId: "brand-" + createHash("sha256").update(application.applicationId + ":" + body.requestKey).digest("hex") });
    await this.prisma.managedBrandOrder.createMany({ data: [{ orderId: order.id, customerId: application.customerId, applicationId: application.applicationId, stationId: station.id, buyerId: userId }], skipDuplicates: true });
    const origin = await this.prisma.managedBrandOrder.findUnique({ where: { orderId: order.id } });
    if (!origin || origin.customerId !== application.customerId || origin.applicationId !== application.applicationId || origin.buyerId !== userId) throw new ForbiddenException("订单来源已存在且不属于此应用");
    return { id: order.id, amount: order.amount, status: order.status, quantity: order.quantity, applicationSubject: application.applicationSubject, tradingSubject: application.customer.tradingSubject };
  }
  async order(clientKey: string, userId: string, id: string) {
    const { application } = await this.scope(clientKey, userId, false);
    const origin = await this.prisma.managedBrandOrder.findFirst({ where: { orderId: id, applicationId: application.applicationId, customerId: application.customerId, buyerId: userId }, include: { order: true } });
    if (!origin || origin.order.userId !== userId) throw new NotFoundException("订单不存在或不属于此应用与用户");
    return { id: origin.order.id, type: origin.order.type, targetId: origin.order.targetId, amount: origin.order.amount, status: origin.order.status, quantity: origin.order.quantity, paidAt: origin.order.paidAt, createdAt: origin.order.createdAt, tradingSubject: application.customer.tradingSubject };
  }
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
