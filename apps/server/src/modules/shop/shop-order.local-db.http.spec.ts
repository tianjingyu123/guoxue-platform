import { randomUUID } from "node:crypto";
import { request as httpRequest } from "node:http";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PassportModule } from "@nestjs/passport";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import * as jwt from "jsonwebtoken";
import { ShopController } from "./shop.controller";
import { ShopService } from "./shop.service";
import { ShopOrderService } from "./shop-order.service";
import { ShopCouponService } from "./shop-coupon.service";
import { AfterSaleSlaService } from "./after-sale-sla.service";
import { LogisticsService } from "./logistics.service";
import { SystemService } from "../system/system.service";
import { WechatService } from "../auth/wechat.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { JwtStrategy } from "../../common/jwt.strategy";
import { ActiveUserGuard } from "../../common/active-user.guard";
import { FeatureFlagGuard } from "../../common/feature-flag.guard";
import { RolesGuard } from "../../common/roles.guard";
import { StationIsolationGuard } from "../../common/station-isolation.guard";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";
import { UnifiedPricingService } from "../pricing/unified-pricing.service";
import { ShopAttributionService } from "./shop-attribution.service";

const localUrl = process.env.REBU_LOCAL_ORDER_TEST_URL || "";
const isIsolatedLocalDb = (() => {
  try {
    const url = new URL(localUrl);
    return url.protocol === "postgresql:" && url.hostname === "127.0.0.1"
      && url.port === "55439" && url.username === "rebu_test" && url.pathname === "/rebu_candidate_test";
  } catch { return false; }
})();

(isIsolatedLocalDb ? describe : describe.skip)("商品建单独立库 HTTP", () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const previousSecret = process.env.JWT_SECRET;
  const secret = "synthetic-shop-order-local-http-secret";
  const userId = `synthetic-http-user-${randomUUID()}`;
  const otherUserId = `synthetic-http-other-${randomUUID()}`;
  const productId = `synthetic-http-product-${randomUUID()}`;
  const addressId = `synthetic-http-address-${randomUUID()}`;
  const token = jwt.sign({ sub: userId }, secret, { expiresIn: "5m" });
  const otherToken = jwt.sign({ sub: otherUserId }, secret, { expiresIn: "5m" });

  beforeAll(async () => {
    process.env.JWT_SECRET = secret;
    prisma = new PrismaClient({ datasources: { db: { url: localUrl } } });
    await prisma.$connect();
    await prisma.user.createMany({ data: [
      { id: userId, nickname: "合成 HTTP 下单用户" },
      { id: otherUserId, nickname: "合成其他用户" },
    ] });
    await prisma.product.create({ data: { id: productId, title: "合成 HTTP 商品", detail: "仅用于独立库测试", price: 15, stock: 10, status: "ON_SALE" } });
    await prisma.shippingAddress.create({ data: {
      id: addressId, userId, name: "合成收件人", phone: "13800000000",
      province: "北京市", city: "北京市", district: "海淀区", detail: "仅用于本地 HTTP 测试",
    } });
    const cached = new Map<string, unknown>();
    const redis = {
      get: async () => null,
      getJson: async (key: string) => cached.get(key) ?? null,
      setJson: async (key: string, value: unknown) => { cached.set(key, value); },
    };
    const pricing = { calculateEffectivePrice: async () => ({ effectivePrice: 15, appliedPromotion: null }) };
    const orderSvc = new ShopOrderService(
      prisma as unknown as PrismaService,
      redis as unknown as RedisService,
      pricing as unknown as UnifiedPricingService,
      {} as ShopAttributionService,
    );
    (orderSvc as any).resolveAttribution = async () => ({
      tempReferrerId: undefined, tempRefSubjectType: undefined, permanentReferrerId: undefined,
      effectiveReferrerId: undefined, selfPurchaseRate: 0,
      sourceContentType: undefined, sourceContentId: undefined,
    });
    const module = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: "jwt" })],
      controllers: [ShopController],
      providers: [
        JwtStrategy, ActiveUserGuard,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: ShopService, useValue: {
          createOrder: (user: string, dto: any) => orderSvc.createOrder(user, dto),
          getOrder: (id: string, user: string, isAdmin: boolean) => orderSvc.getOrder(id, user, isAdmin),
        } },
        { provide: ShopCouponService, useValue: {} },
        { provide: AfterSaleSlaService, useValue: {} },
        { provide: LogisticsService, useValue: {} },
        { provide: SystemService, useValue: { logAudit: async () => undefined } },
        { provide: WechatService, useValue: {} },
      ],
    })
      .overrideGuard(FeatureFlagGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .overrideGuard(StationIsolationGuard).useValue({ canActivate: () => true })
      .overrideGuard(StrictRedisThrottleGuard).useValue({ canActivate: () => true })
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.listen(0, "127.0.0.1");
  });

  afterAll(async () => {
    await app?.close();
    if (prisma) {
      await prisma.order.deleteMany({ where: { userId } });
      await prisma.product.deleteMany({ where: { id: productId } });
      await prisma.shippingAddress.deleteMany({ where: { id: addressId } });
      await prisma.user.deleteMany({ where: { id: { in: [userId, otherUserId] } } });
      await prisma.$disconnect();
    }
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  it("游客被拒；同键并发只建一单扣一次库存；改量拒绝复用", async () => {
    const url = "/api/v1/shop/orders";
    const key = `same-${randomUUID()}`;
    const body = { type: "PRODUCT", targetId: productId, addressId, amount: 2, clientRequestId: key };
    await request(app.getHttpServer()).post(url).send(body).expect(401);
    const responses = await Promise.all(Array.from({ length: 3 }, () =>
      request(app.getHttpServer()).post(url).set("Authorization", `Bearer ${token}`).send(body).expect(201)));
    expect(new Set(responses.map((response) => response.body.id)).size).toBe(1);
    expect(await prisma.order.count({ where: { userId } })).toBe(1);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stock).toBe(8);
    await request(app.getHttpServer()).post(url).set("Authorization", `Bearer ${token}`)
      .send({ ...body, amount: 1 }).expect(400);
    expect(await prisma.order.count({ where: { userId } })).toBe(1);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stock).toBe(8);
  });

  it("客户端丢弃成功响应正文后，同键重试仍返回已提交的原订单", async () => {
    const key = `lost-${randomUUID()}`;
    const body = JSON.stringify({ type: "PRODUCT", targetId: productId, addressId, amount: 1, clientRequestId: key });
    const port = (app.getHttpServer().address() as { port: number }).port;
    await new Promise<void>((resolve, reject) => {
      const req = httpRequest({
        hostname: "127.0.0.1", port, method: "POST", path: "/api/v1/shop/orders",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
      }, (res) => { res.destroy(); resolve(); });
      req.on("error", reject);
      req.end(body);
    });
    const committed = await prisma.order.findFirstOrThrow({ where: { userId, clientRequestId: key } });
    const retry = await request(app.getHttpServer()).post("/api/v1/shop/orders")
      .set("Authorization", `Bearer ${token}`).send(JSON.parse(body)).expect(201);
    expect(retry.body.id).toBe(committed.id);
    expect(await prisma.order.count({ where: { userId } })).toBe(2);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stock).toBe(7);
  });

  it("本人订单详情缓存命中后仍拒绝其他用户读取", async () => {
    const order = await prisma.order.findFirstOrThrow({ where: { userId }, orderBy: { createdAt: "desc" } });
    const url = `/api/v1/shop/orders/${order.id}`;
    await request(app.getHttpServer()).get(url).expect(401);
    const own = await request(app.getHttpServer()).get(url).set("Authorization", `Bearer ${token}`).expect(200);
    expect(own.body.id).toBe(order.id);
    await request(app.getHttpServer()).get(url).set("Authorization", `Bearer ${otherToken}`).expect(403);
    const cachedOwn = await request(app.getHttpServer()).get(url).set("Authorization", `Bearer ${token}`).expect(200);
    expect(cachedOwn.body.id).toBe(order.id);
  });
});
