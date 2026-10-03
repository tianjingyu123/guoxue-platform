import { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import request from "supertest";
import { ShopService } from "../src/modules/shop/shop.service";
import { createE2eApp } from "./e2e-setup";

describe("App 微信收银台 HTTP 边界（无真实资金）", () => {
  let app: INestApplication;
  let prisma: any;
  let token: string;
  let createPayment: jest.SpyInstance;
  const route = "/api/v1/shop/orders/00000000-0000-4000-8000-000000000001/pay/app";

  beforeAll(async () => {
    const ctx = await createE2eApp();
    app = ctx.app;
    prisma = ctx.prisma;
    token = app.get(JwtService).sign({ sub: "app-payment-buyer" });
    // 只截断外部支付边界；HTTP 鉴权、红线和 DTO 走真实应用管线。
    createPayment = jest.spyOn(app.get(ShopService), "createAppPayment").mockResolvedValue({
      appid: "test-app", partnerid: "test-merchant", prepayid: "test-prepay",
      package: "Sign=WXPay", noncestr: "test-nonce", timestamp: "1", sign: "test-sign",
    });
  });

  beforeEach(() => {
    createPayment.mockClear();
    prisma.user.findUnique.mockResolvedValue({
      id: "app-payment-buyer", status: "ACTIVE", roles: [{ roleType: "USER" }],
    });
  });

  afterAll(async () => {
    createPayment.mockRestore();
    await app.close();
  });

  it("未登录 401，不能初始化第三方支付", async () => {
    await request(app.getHttpServer()).post(route).send({ platform: "android" }).expect(401);
    expect(createPayment).not.toHaveBeenCalled();
  });

  it("AUTOMATION 403，不能越过资金红线", async () => {
    await request(app.getHttpServer()).post(route)
      .set("Authorization", `Bearer ${token}`).set("x-executor-type", "AUTOMATION")
      .send({ platform: "android" }).expect(403);
    expect(createPayment).not.toHaveBeenCalled();
  });

  it.each([{ platform: "h5" }, {}, { platform: "android", amount: 1 },
    { platform: "android", notifyUrl: "https://attacker.invalid/notify" }])(
    "非法平台/客户端金额/回调地址在 DTO 层被拒绝：%j", async (body) => {
      await request(app.getHttpServer()).post(route)
        .set("Authorization", `Bearer ${token}`).send(body).expect(400);
      expect(createPayment).not.toHaveBeenCalled();
    },
  );

  it.each(["android", "ios"])("真人 %s 只透传订单 ID、登录主体和平台，不承诺到账", async (platform) => {
    const response = await request(app.getHttpServer()).post(route)
      .set("Authorization", `Bearer ${token}`).send({ platform }).expect(201);
    expect(createPayment).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000001", "app-payment-buyer", platform,
    );
    expect(response.body.prepayid).toBe("test-prepay");
    expect(response.body.status).toBeUndefined();
  });
});
