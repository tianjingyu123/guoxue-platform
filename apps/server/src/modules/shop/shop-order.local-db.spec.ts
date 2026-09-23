import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { ShopOrderService } from "./shop-order.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { UnifiedPricingService } from "../pricing/unified-pricing.service";
import { ShopAttributionService } from "./shop-attribution.service";
import { ShopCouponService } from "./shop-coupon.service";
import { ShopRefundService } from "./shop-refund.service";

const localUrl = process.env.REBU_LOCAL_ORDER_TEST_URL || "";
const isIsolatedLocalDb = (() => {
  try {
    const url = new URL(localUrl);
    return url.protocol === "postgresql:" && url.hostname === "127.0.0.1"
      && url.username === "rebu_test" && url.pathname === "/rebu_candidate_test"
      && !!url.port && !["5432", "5433"].includes(url.port);
  } catch { return false; }
})();

(isIsolatedLocalDb ? describe : describe.skip)("ShopOrderService 独立本地库并发", () => {
  const prisma = new PrismaClient({ datasources: { db: { url: localUrl } } });
  const userId = `synthetic-user-${randomUUID()}`;
  const productId = `synthetic-product-${randomUUID()}`;
  const couponId = `synthetic-coupon-${randomUUID()}`;
  const grantCouponId = `synthetic-grant-coupon-${randomUUID()}`;
  const userCouponId = `synthetic-user-coupon-${randomUUID()}`;
  const pricing = {
    calculateEffectivePrice: jest.fn().mockResolvedValue({ effectivePrice: 15, appliedPromotion: null }),
  };
  const service = new ShopOrderService(
    prisma as unknown as PrismaService,
    {} as RedisService,
    pricing as unknown as UnifiedPricingService,
    {} as ShopAttributionService,
  );
  (service as any).resolveAttribution = jest.fn().mockResolvedValue({
    tempReferrerId: undefined, tempRefSubjectType: undefined, permanentReferrerId: undefined,
    effectiveReferrerId: undefined, selfPurchaseRate: 0,
    sourceContentType: undefined, sourceContentId: undefined,
  });
  const couponService = new ShopCouponService(prisma as unknown as PrismaService, {} as ShopRefundService);

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.user.create({ data: { id: userId, nickname: "合成订单测试用户" } });
    await prisma.product.create({
      data: { id: productId, title: "合成测试商品", detail: "仅用于本地并发验证", price: 15, stock: 10, status: "ON_SALE" },
    });
    await prisma.coupon.create({
      data: { id: couponId, type: "FULL_REDUCE", value: 5, discountAmount: 5,
        validStart: new Date(Date.now() - 3600000), validEnd: new Date(Date.now() + 86400000) },
    });
    await prisma.userCoupon.create({ data: { id: userCouponId, userId, couponId } });
    await prisma.coupon.create({
      data: { id: grantCouponId, type: "FULL_REDUCE", value: 3, totalCount: 1,
        validStart: new Date(Date.now() - 3600000), validEnd: new Date(Date.now() + 86400000) },
    });
  });

  beforeEach(async () => {
    await prisma.afterSale.deleteMany({ where: { userId } });
    await prisma.order.deleteMany({ where: { userId } });
    await prisma.product.update({ where: { id: productId }, data: { stock: 10 } });
    await prisma.userCoupon.update({ where: { id: userCouponId }, data: { used: false, usedAt: null } });
    await prisma.userCoupon.deleteMany({ where: { couponId: grantCouponId } });
    await prisma.coupon.update({ where: { id: grantCouponId }, data: { usedCount: 0 } });
  });

  afterAll(async () => {
    await prisma.afterSale.deleteMany({ where: { userId } });
    await prisma.order.deleteMany({ where: { userId } });
    await prisma.userCoupon.delete({ where: { id: userCouponId } });
    await prisma.coupon.delete({ where: { id: couponId } });
    await prisma.userCoupon.deleteMany({ where: { couponId: grantCouponId } });
    await prisma.coupon.delete({ where: { id: grantCouponId } });
    await prisma.product.delete({ where: { id: productId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("同一用户与请求键并发建单仅生成一单、扣一次库存", async () => {
    const dto = { type: "PRODUCT", targetId: productId, amount: 2, clientRequestId: `same-${randomUUID()}` };
    const results = await Promise.all(Array.from({ length: 5 }, () => service.createOrder(userId, dto)));
    expect(new Set(results.map((order) => order.id)).size).toBe(1);
    expect(await prisma.order.count({ where: { userId } })).toBe(1);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stock).toBe(8);
  });

  it("库存不足的失败事务不占用请求键，补库存后同键可重试", async () => {
    await prisma.product.update({ where: { id: productId }, data: { stock: 0 } });
    const dto = { type: "PRODUCT", targetId: productId, amount: 1, clientRequestId: `retry-${randomUUID()}` };
    await expect(service.createOrder(userId, dto)).rejects.toThrow("商品库存不足");
    expect(await prisma.order.count({ where: { userId } })).toBe(0);
    await prisma.product.update({ where: { id: productId }, data: { stock: 2 } });
    const order = await service.createOrder(userId, dto);
    expect((await service.createOrder(userId, dto)).id).toBe(order.id);
    expect(await prisma.order.count({ where: { userId } })).toBe(1);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stock).toBe(1);
  });

  it("同一请求键更换购买数量会拒绝，不复用旧单或再次扣库存", async () => {
    const key = `changed-${randomUUID()}`;
    const first = await service.createOrder(userId, {
      type: "PRODUCT", targetId: productId, amount: 1, clientRequestId: key,
    });
    await expect(service.createOrder(userId, {
      type: "PRODUCT", targetId: productId, amount: 2, clientRequestId: key,
    })).rejects.toThrow("下单内容已变化");
    expect(await prisma.order.count({ where: { userId } })).toBe(1);
    expect((await prisma.order.findFirstOrThrow({ where: { userId } })).id).toBe(first.id);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stock).toBe(9);
  });

  it("同键并发使用优惠券时只建一单、核销一次", async () => {
    const dto = { type: "PRODUCT", targetId: productId, amount: 2,
      couponId: userCouponId, clientRequestId: `coupon-${randomUUID()}` };
    const results = await Promise.all(Array.from({ length: 4 }, () => service.createOrder(userId, dto)));
    expect(new Set(results.map((order) => order.id)).size).toBe(1);
    expect(await prisma.order.count({ where: { userId } })).toBe(1);
    expect(Number(results[0].amount)).toBe(25);
    expect((await prisma.userCoupon.findUniqueOrThrow({ where: { id: userCouponId } })).used).toBe(true);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stock).toBe(8);
  });

  it("不同请求键抢同一份库存时不能超卖", async () => {
    await prisma.product.update({ where: { id: productId }, data: { stock: 2 } });
    const results = await Promise.allSettled(Array.from({ length: 2 }, () =>
      service.createOrder(userId, { type: "PRODUCT", targetId: productId, amount: 2, clientRequestId: `compete-${randomUUID()}` })));
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.order.count({ where: { userId } })).toBe(1);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stock).toBe(0);
  });

  it("不同请求键并发使用同一张优惠券时只能成交一单", async () => {
    const results = await Promise.allSettled(Array.from({ length: 2 }, () =>
      service.createOrder(userId, { type: "PRODUCT", targetId: productId, amount: 1,
        couponId: userCouponId, clientRequestId: `coupon-compete-${randomUUID()}` })));
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.order.count({ where: { userId } })).toBe(1);
    expect((await prisma.userCoupon.findUniqueOrThrow({ where: { id: userCouponId } })).used).toBe(true);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stock).toBe(9);
  });

  it("同一用户并发发券只占一个名额", async () => {
    const results = await Promise.all(Array.from({ length: 3 }, () =>
      couponService.grantCoupon(grantCouponId, userId)));
    expect(new Set(results.map((coupon) => coupon.id)).size).toBe(1);
    expect(await prisma.userCoupon.count({ where: { userId, couponId: grantCouponId } })).toBe(1);
    expect((await prisma.coupon.findUniqueOrThrow({ where: { id: grantCouponId } })).usedCount).toBe(1);
  });

  it("同一订单并发申请售后只生成一条待处理记录", async () => {
    const order = await prisma.order.create({ data: {
      userId, type: "PRODUCT", targetId: productId, quantity: 1, amount: 15, payAmount: 15, status: "PAID",
    } });
    const results = await Promise.allSettled(Array.from({ length: 3 }, () =>
      couponService.applyAfterSale(userId, order.id, "refund_only", "合成测试退款申请")));
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.afterSale.count({ where: { userId, orderId: order.id } })).toBe(1);
  });
});
