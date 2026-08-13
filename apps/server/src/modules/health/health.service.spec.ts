import { Test } from "@nestjs/testing";
import { HealthService } from "./health.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

const mockPrisma = { $queryRaw: jest.fn().mockResolvedValue(undefined) };
const mockRedis = {
  set: jest.fn().mockResolvedValue("OK"),
  get: jest.fn().mockResolvedValue("1"),
};

describe("HealthService", () => {
  let svc: HealthService;
  const origFetch = global.fetch;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();
    svc = mod.get(HealthService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 } as any);
    delete process.env.WECHAT_APP_ID;
    delete process.env.WECHAT_APP_SECRET;
    delete process.env.WECHAT_OFFICIAL_APPID;
    delete process.env.WECHAT_OFFICIAL_APP_SECRET;
    delete process.env.WECHAT_MINI_APP_ID;
    delete process.env.MINIPROGRAM_APP_SECRET;
    delete process.env.RELEASE_ID;
    delete process.env.APPLE_IAP_REQUIRED;
    delete process.env.APPLE_IAP_KEY_ID;
    delete process.env.APPLE_IAP_ISSUER_ID;
    delete process.env.APPLE_IAP_PRIVATE_KEY_BASE64;
    delete process.env.APPLE_IAP_PRIVATE_KEY;
    delete process.env.LIVE_PUSH_DOMAIN;
    delete process.env.LIVE_PLAY_DOMAIN;
    delete process.env.LIVE_PUSH_KEY;
    delete process.env.LIVE_PLAY_KEY;
    delete process.env.TRTC_SDK_APP_ID;
    delete process.env.TRTC_SECRET_KEY;
  });

  afterAll(() => {
    global.fetch = origFetch;
  });

  describe("liveness", () => {
    it("返回存活状态和运行时间", () => {
      process.env.RELEASE_ID = "release-liveness-test";
      const result = svc.liveness();
      expect(result.status).toBe("alive");
      expect(result.uptime).toBeGreaterThan(0);
      expect(result.releaseId).toBe("release-liveness-test");
    });
  });

  describe("readiness", () => {
    it("DB 和 Redis 都正常时返回 ready", async () => {
      const result = await svc.readiness();
      expect(result.status).toBe("ready");
      expect(result.db).toBe("ok");
      expect(result.redis).toBe("ok");
    });

    it("DB 异常时返回 not_ready", async () => {
      mockPrisma.$queryRaw.mockRejectedValueOnce(new Error("db down"));
      const result = await svc.readiness();
      expect(result.status).toBe("not_ready");
      expect(result.db).toBe("fail");
    });

    it("Redis 异常时返回 not_ready", async () => {
      mockRedis.get.mockRejectedValueOnce(new Error("redis down"));
      const result = await svc.readiness();
      expect(result.status).toBe("not_ready");
      expect(result.db).toBe("ok");
      expect(result.redis).toBe("fail");
    });
  });

  describe("check", () => {
    it("返回包含所有检查项的完整报告", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 });
      process.env.RELEASE_ID = "release-unit-test";
      const result = await svc.check();
      expect(result.status).toBeDefined();
      expect(result.releaseId).toBe("release-unit-test");
      expect(result.checks).toHaveProperty("db");
      expect(result.checks).toHaveProperty("redis");
      // 已配置的外部服务应存在
      const hasAi = result.checks.ai;
      if (hasAi) expect(result.checks.ai.status).toBeDefined();
      expect(result.memory).toHaveProperty("rss");
      expect(result.memory).toHaveProperty("heapUsed");
    });

    it("某个服务未配置时不影响整体报告", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 });
      const result = await svc.check();
      // DB/Redis 总是存在
      expect(result.checks.db.status).toBeDefined();
      expect(result.checks.redis.status).toBeDefined();
      expect(result.checks).not.toHaveProperty("appleIap");
    });

    it("Apple IAP 被标记为必需但缺少凭据时阻断健康门禁", async () => {
      process.env.APPLE_IAP_REQUIRED = "true";
      const result = await svc.check();
      expect(result.status).toBe("fail");
      expect(result.checks.appleIap).toEqual(expect.objectContaining({ status: "fail" }));
    });

    it("公众号独立配置应出现在微信健康检查中", async () => {
      process.env.WECHAT_OFFICIAL_APPID = "wx-official";
      process.env.WECHAT_OFFICIAL_APP_SECRET = "official-secret";
      const result = await svc.check();
      expect(result.checks.wechat).toEqual(expect.objectContaining({ status: "ok" }));
    });

    it("小程序独立配置应出现在微信健康检查中", async () => {
      process.env.WECHAT_MINI_APP_ID = "wx-mini";
      process.env.MINIPROGRAM_APP_SECRET = "mini-secret";
      const result = await svc.check();
      expect(result.checks.wechat).toEqual(expect.objectContaining({ status: "ok" }));
    });

    it("外部服务故障时状态为 degraded", async () => {
      process.env.DEEPSEEK_API_KEY = "sk-test";
      (global.fetch as jest.Mock).mockRejectedValue(new Error("timeout"));
      const result = await svc.check();
      delete process.env.DEEPSEEK_API_KEY;
      // 已配置的外部服务 fetch 失败 → degraded，所以 checks 中必有 ai 项
      expect(result.status).toBe("degraded");
      expect(result.checks.ai.status).toBe("degraded");
    });
    it("直播配置只填一部分时健康门禁失败并列出缺项", async () => {
      process.env.LIVE_PUSH_DOMAIN = "push.example.com";
      const result = await svc.check();
      expect(result.status).toBe("fail");
      expect(result.checks.live).toEqual(expect.objectContaining({
        status: "fail",
        error: expect.stringContaining("LIVE_PLAY_DOMAIN"),
      }));
    });

    it("直播推拉流和 TRTC 必填项完整时健康门禁通过", async () => {
      process.env.LIVE_PUSH_DOMAIN = "push.example.com";
      process.env.LIVE_PLAY_DOMAIN = "play.example.com";
      process.env.LIVE_PUSH_KEY = "push-key";
      process.env.LIVE_PLAY_KEY = "play-key";
      process.env.TRTC_SDK_APP_ID = "1600030106";
      process.env.TRTC_SECRET_KEY = "trtc-key";
      const result = await svc.check();
      expect(result.checks.live).toEqual({ status: "ok" });
    });
  });
});
