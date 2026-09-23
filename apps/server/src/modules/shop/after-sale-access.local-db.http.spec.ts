import { randomUUID } from "node:crypto";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PassportModule } from "@nestjs/passport";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import * as jwt from "jsonwebtoken";
import { ShopController } from "./shop.controller";
import { ShopService } from "./shop.service";
import { ShopCouponService } from "./shop-coupon.service";
import { AfterSaleSlaService } from "./after-sale-sla.service";
import { LogisticsService } from "./logistics.service";
import { SystemService } from "../system/system.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { JwtStrategy } from "../../common/jwt.strategy";
import { ActiveUserGuard } from "../../common/active-user.guard";
import { FeatureFlagGuard } from "../../common/feature-flag.guard";
import { RolesGuard } from "../../common/roles.guard";
import { StationIsolationGuard } from "../../common/station-isolation.guard";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";

const localUrl = process.env.REBU_LOCAL_AFTER_SALE_TEST_URL || "";
const isIsolatedLocalDb = (() => {
  try {
    const url = new URL(localUrl);
    return url.protocol === "postgresql:" && url.hostname === "127.0.0.1"
      && url.port === "55439" && url.username === "rebu_test" && url.pathname === "/rebu_candidate_test";
  } catch { return false; }
})();

(isIsolatedLocalDb ? describe : describe.skip)("售后本人权限独立库 HTTP", () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const previousSecret = process.env.JWT_SECRET;
  const secret = "synthetic-after-sale-local-http-secret";
  const userA = `synthetic-sale-a-${randomUUID()}`;
  const userB = `synthetic-sale-b-${randomUUID()}`;
  const productId = `synthetic-sale-product-${randomUUID()}`;
  const orderA = `synthetic-sale-order-a-${randomUUID()}`;
  const orderB = `synthetic-sale-order-b-${randomUUID()}`;
  const saleA = `synthetic-sale-record-a-${randomUUID()}`;
  const saleB = `synthetic-sale-record-b-${randomUUID()}`;
  const tokenA = jwt.sign({ sub: userA }, secret, { expiresIn: "5m" });
  const tokenB = jwt.sign({ sub: userB }, secret, { expiresIn: "5m" });

  beforeAll(async () => {
    process.env.JWT_SECRET = secret;
    prisma = new PrismaClient({ datasources: { db: { url: localUrl } } });
    await prisma.$connect();
    await prisma.user.createMany({ data: [
      { id: userA, nickname: "合成售后用户 A" },
      { id: userB, nickname: "合成售后用户 B" },
    ] });
    await prisma.product.create({ data: {
      id: productId, title: "合成售后商品", detail: "仅供独立库测试", price: 15, stock: 5, status: "ON_SALE",
    } });
    await prisma.order.createMany({ data: [
      { id: orderA, userId: userA, type: "PRODUCT", targetId: productId, amount: 15, status: "PAID", paidAt: new Date() },
      { id: orderB, userId: userB, type: "PRODUCT", targetId: productId, amount: 15, status: "PAID", paidAt: new Date() },
    ] });
    await prisma.afterSale.createMany({ data: [
      { id: saleA, userId: userA, orderId: orderA, type: "refund_only", reason: "A 的私有售后理由", amount: 15, status: "PENDING" },
      { id: saleB, userId: userB, orderId: orderB, type: "refund_only", reason: "B 的私有售后理由", amount: 15, status: "COMPLETED" },
    ] });
    const coupon = new ShopCouponService(prisma as any, {} as any);
    const module = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: "jwt" })],
      controllers: [ShopController],
      providers: [
        JwtStrategy, ActiveUserGuard,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: { get: async () => null } },
        { provide: ShopService, useValue: {} },
        { provide: ShopCouponService, useValue: coupon },
        { provide: AfterSaleSlaService, useValue: {} },
        { provide: LogisticsService, useValue: {} },
        { provide: SystemService, useValue: {} },
      ],
    })
      .overrideGuard(FeatureFlagGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .overrideGuard(StationIsolationGuard).useValue({ canActivate: () => true })
      .overrideGuard(StrictRedisThrottleGuard).useValue({ canActivate: () => true })
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    if (prisma) {
      await prisma.afterSale.deleteMany({ where: { id: { in: [saleA, saleB] } } });
      await prisma.order.deleteMany({ where: { id: { in: [orderA, orderB] } } });
      await prisma.product.deleteMany({ where: { id: productId } });
      await prisma.user.deleteMany({ where: { id: { in: [userA, userB] } } });
      await prisma.$disconnect();
    }
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  it("列表和订单筛选只返回本人售后，详情不泄露其他用户理由", async () => {
    const url = "/api/v1/shop/after-sales";
    await request(app.getHttpServer()).get(url).expect(401);
    const a = await request(app.getHttpServer()).get(url).set("Authorization", `Bearer ${tokenA}`).expect(200);
    expect(a.body.total).toBe(1);
    expect(a.body.items.map((item: { id: string }) => item.id)).toEqual([saleA]);
    expect(JSON.stringify(a.body)).not.toContain("B 的私有售后理由");
    const filtered = await request(app.getHttpServer()).get(`${url}?orderId=${orderB}`)
      .set("Authorization", `Bearer ${tokenA}`).expect(200);
    expect(filtered.body.total).toBe(0);
    const foreign = await request(app.getHttpServer()).get(`${url}/${saleB}`)
      .set("Authorization", `Bearer ${tokenA}`).expect(403);
    expect(JSON.stringify(foreign.body)).not.toContain("B 的私有售后理由");
    const own = await request(app.getHttpServer()).get(`${url}/${saleA}`)
      .set("Authorization", `Bearer ${tokenA}`).expect(200);
    expect(own.body.reason).toBe("A 的私有售后理由");
  });

  it("不能申请或取消他人售后；本人取消后状态与列表一致", async () => {
    const url = "/api/v1/shop/after-sales";
    await request(app.getHttpServer()).post(`/api/v1/shop/orders/${orderB}/after-sale`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ type: "refund_only", reason: "跨用户申请", amount: 15 }).expect(403);
    expect(await prisma.afterSale.count({ where: { orderId: orderB } })).toBe(1);
    await request(app.getHttpServer()).put(`${url}/${saleB}/cancel`)
      .set("Authorization", `Bearer ${tokenA}`).expect(403);
    await request(app.getHttpServer()).put(`${url}/${saleB}/cancel`)
      .set("Authorization", `Bearer ${tokenB}`).expect(400);
    await request(app.getHttpServer()).put(`${url}/${saleA}/cancel`)
      .set("Authorization", `Bearer ${tokenA}`).expect(200);
    const own = await request(app.getHttpServer()).get(`${url}/${saleA}`)
      .set("Authorization", `Bearer ${tokenA}`).expect(200);
    expect(own.body.status).toBe("CANCELLED");
    expect((await prisma.afterSale.findUniqueOrThrow({ where: { id: saleB } })).status).toBe("COMPLETED");
  });
});
