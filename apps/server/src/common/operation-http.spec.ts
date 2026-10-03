import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { Reflector } from "@nestjs/core";
import request from "supertest";
import { FeatureFlagGuard } from "./feature-flag.guard";
import { FeatureFlagService } from "../modules/feature-flag/feature-flag.service";
import { RequireFeature, FEATURE_FLAG_KEY } from "./feature-flag.decorator";
import { evaluateOperation } from "../modules/feature-flag/operation.util";
import { ShopController } from "../modules/shop/shop.controller";
import { MemberController } from "../modules/member/member.controller";
import { LiveController } from "../modules/live/live.controller";
import { MerchantController } from "../modules/merchant/merchant.controller";
import { LiveCredentialsGuard } from "../modules/live/live-credentials.guard";
import { PrismaService } from "../prisma/prisma.service";

@Controller("synthetic")
class SyntheticController {
  @Post("new-course")
  @UseGuards(FeatureFlagGuard)
  @RequireFeature("client_course_purchase", { whenConfigured: true, writes: true })
  course() {
    return { syntheticOnly: true };
  }
  @Post("orders")
  @UseGuards(FeatureFlagGuard)
  @RequireFeature("shop_checkout")
  order(@Body() body: unknown) {
    return { syntheticOnly: true, body };
  }
  @Get("read")
  @UseGuards(FeatureFlagGuard)
  @RequireFeature("shop_checkout")
  read() {
    return { syntheticOnly: true };
  }
  @Get("new-credentials")
  @UseGuards(FeatureFlagGuard)
  @RequireFeature("shop_checkout", { writes: true })
  credentials() {
    return { syntheticOnly: true };
  }
  @Get("rooms/:id/credentials")
  @UseGuards(LiveCredentialsGuard)
  roomCredentials() {
    return { syntheticOnly: true };
  }
  @Get("existing-order")
  existing() {
    return { syntheticOnly: true, owned: true };
  }
}
describe("运营直接 HTTP 裁决与补救边界（合成）", () => {
  let app: any;
  let state = "OPEN",
    emergency = false;
  const flag = { key: "shop_checkout", enabled: true, percentage: 100, targetUserIds: [] };
  const service = {
    getConfiguredOperationState: async () => (emergency ? "UNOPENED" : state),
    requestScope: async (req: any) =>
      req.headers["x-app-client"] === "test-huawei"
        ? { applicationId: "rebu", platform: "android", channelId: "huawei" }
        : { applicationId: "rebu", platform: "android", channelId: "xiaomi" },
    getOperationState: async (key: string, userId: string, scope: any) =>
      key === "member_purchase" || emergency
        ? "UNOPENED"
        : evaluateOperation(
            {
              ...flag,
              operationState: state,
              scopeRules: [
                {
                  applicationId: "rebu",
                  platform: "android",
                  channelId: "xiaomi",
                  state: "UNOPENED",
                },
              ],
            },
            userId,
            scope,
          ),
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [SyntheticController],
      providers: [
        FeatureFlagGuard,
        LiveCredentialsGuard,
        Reflector,
        { provide: FeatureFlagService, useValue: service },
        {
          provide: PrismaService,
          useValue: {
            liveRoom: {
              findUnique: async ({ where }: any) => ({
                status: where.id === "already-live" ? "LIVING" : "SCHEDULED",
              }),
            },
          },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    state = "OPEN";
    emergency = false;
  });
  it("可选新购买开关开放时允许，维护/只读/急停时拒绝；历史读不取消", async () => {
    await request(app.getHttpServer()).post("/synthetic/new-course").expect(201);
    for (const restricted of ["MAINTENANCE", "READ_ONLY", "UNOPENED"]) {
      state = restricted;
      await request(app.getHttpServer()).post("/synthetic/new-course").expect(404);
      await request(app.getHttpServer()).get("/synthetic/existing-order").expect(200);
    }
    state = "OPEN";
    emergency = true;
    await request(app.getHttpServer()).post("/synthetic/new-course").expect(404);
  });
  it("关闭渠道 POST 拒绝，其他渠道开放；全局急停不能被渠道头放宽", async () => {
    await request(app.getHttpServer())
      .post("/synthetic/orders")
      .set("X-App-Client", "test-xiaomi")
      .send({ type: "PRODUCT" })
      .expect(404);
    await request(app.getHttpServer())
      .post("/synthetic/orders")
      .set("X-App-Client", "test-huawei")
      .send({ type: "PRODUCT" })
      .expect(201);
    emergency = true;
    await request(app.getHttpServer())
      .post("/synthetic/orders")
      .set("X-App-Client", "test-huawei")
      .send({ type: "PRODUCT" })
      .expect(404);
    await request(app.getHttpServer()).get("/synthetic/existing-order").expect(200);
  });
  it("只读允许读取、拒绝写入；统一建单不得绕过关闭的会员购买", async () => {
    state = "READ_ONLY";
    await request(app.getHttpServer())
      .get("/synthetic/new-credentials")
      .set("X-App-Client", "test-huawei")
      .expect(404);
    await request(app.getHttpServer())
      .get("/synthetic/read")
      .set("X-App-Client", "test-huawei")
      .expect(200);
    await request(app.getHttpServer())
      .post("/synthetic/orders")
      .set("X-App-Client", "test-huawei")
      .send({ type: "PRODUCT" })
      .expect(404);
    state = "OPEN";
    await request(app.getHttpServer())
      .post("/synthetic/orders")
      .set("X-App-Client", "test-huawei")
      .send({ type: "MEMBER" })
      .expect(404);
  });
  it("正式控制器的新建单接入同一守卫；已有订单、退款、会员既有权益不继承购买开关", () => {
    expect(Reflect.getMetadata(FEATURE_FLAG_KEY, ShopController.prototype.createOrder)).toBe(
      "shop_checkout",
    );
    const shopPrototype = ShopController.prototype as any;
    for (const name of Object.getOwnPropertyNames(shopPrototype).filter((n) =>
      /refund|myOrder|orderDetail/i.test(n),
    )) {
      expect(Reflect.getMetadata(FEATURE_FLAG_KEY, shopPrototype[name])).toBeUndefined();
    }
    expect(Reflect.getMetadata(FEATURE_FLAG_KEY, MemberController)).toBeUndefined();
    expect(Reflect.getMetadata(FEATURE_FLAG_KEY, LiveController.prototype.createRoom)).toBe(
      "live_start",
    );
    expect(Reflect.getMetadata(FEATURE_FLAG_KEY, LiveController.prototype.getStreamConfig)).toBe(
      "live_start",
    );
    expect(Reflect.getMetadata(FEATURE_FLAG_KEY, MerchantController)).toBeUndefined();
    expect(
      Reflect.getMetadata(FEATURE_FLAG_KEY, MerchantController.prototype.createApplication),
    ).toBe("merchant_onboarding");
    for (const method of ["getApplication", "getDepositInfo", "previewAgreement"]) {
      const handler = (MerchantController.prototype as any)[method];
      expect(handler).toBeDefined();
      expect(Reflect.getMetadata(FEATURE_FLAG_KEY, handler)).toBeUndefined();
    }
  });
  it("只读/关闭时拒绝未开播凭证，既有直播续期凭证仍可读取", async () => {
    for (const value of ["READ_ONLY", "UNOPENED"]) {
      state = value;
      await request(app.getHttpServer())
        .get("/synthetic/rooms/not-started/credentials")
        .set("X-App-Client", "test-huawei")
        .expect(404);
      await request(app.getHttpServer())
        .get("/synthetic/rooms/already-live/credentials")
        .set("X-App-Client", "test-huawei")
        .expect(200);
    }
  });
});
