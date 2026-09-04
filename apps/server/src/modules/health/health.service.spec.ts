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
    delete process.env.LIVE_MULTI_GUEST_MIXING_ENABLED;
    delete process.env.LIVE_OBS_TRTC_INGEST_ENABLED;
    delete process.env.TRTC_CALLBACK_KEY;
    delete process.env.TENCENT_CALLBACK_KEY;
    delete process.env.TENCENT_SECRET_ID;
    delete process.env.TENCENT_SECRET_KEY;
    delete process.env.COS_SECRET_ID;
    delete process.env.COS_SECRET_KEY;
    delete process.env.VOD_SUB_APP_ID;
    delete process.env.VOD_PLAY_KEY;
    delete process.env.WECHAT_PAY_MCH_ID;
    delete process.env.WECHAT_PAY_ALLOWED_MCH_ID;
    delete process.env.WECHAT_PAY_RUNTIME_CONFIG_SOURCE;
    delete process.env.WECHAT_PAY_PUBLIC_KEY;
    delete process.env.WECHAT_PAY_PUBLIC_KEY_ID;
    delete process.env.TENCENT_CVM_ROLE_NAME;
    process.env.TENCENT_CREDENTIAL_MODE = "static";
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

    it("VOD 已配置时执行 SearchMedia 只读实探测并限定应用", async () => {
      process.env.VOD_SUB_APP_ID = "1500012345";
      process.env.COS_SECRET_ID = "vod-test-id";
      process.env.COS_SECRET_KEY = "vod-test-key";
      process.env.VOD_PLAY_KEY = "vod-play-key";
      (global.fetch as jest.Mock).mockImplementation(async (input: string | URL, init?: RequestInit) => {
        if (String(input) === "https://vod.tencentcloudapi.com" && init?.method === "POST") {
          return {
            ok: true,
            status: 200,
            json: async () => ({ Response: { RequestId: "vod-health-rid", MediaInfoSet: [] } }),
          } as any;
        }
        return { ok: true, status: 200 } as any;
      });

      const result = await svc.check();
      expect(result.checks.vod).toEqual(expect.objectContaining({ status: "ok" }));
      const vodCall = (global.fetch as jest.Mock).mock.calls.find(
        ([input, init]) => String(input) === "https://vod.tencentcloudapi.com" && init?.method === "POST",
      );
      expect(vodCall).toBeDefined();
      expect(vodCall[1].headers["X-TC-Action"]).toBe("SearchMedia");
      expect(JSON.parse(vodCall[1].body)).toEqual(expect.objectContaining({
        SubAppId: 1500012345,
        Offset: 0,
        Limit: 1,
      }));
    });

    it("生产微信支付未从完整数据库配置加载时保持降级", async () => {
      const previousNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";
      process.env.WECHAT_PAY_MCH_ID = "1748964663";
      process.env.WECHAT_PAY_RUNTIME_CONFIG_SOURCE = "INVALID";
      try {
        const result = await svc.check();
        expect(result.status).toBe("degraded");
        expect(result.checks.payment).toEqual({
          status: "degraded",
          error: "WECHAT_PAY_DATABASE_CONFIG_INCOMPLETE",
        });
      } finally {
        if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = previousNodeEnv;
      }
    });

    it("生产微信支付公钥与公钥 ID 不成对时保持降级", async () => {
      const previousNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";
      process.env.WECHAT_PAY_MCH_ID = "1748964663";
      process.env.WECHAT_PAY_ALLOWED_MCH_ID = "1748964663";
      process.env.WECHAT_PAY_RUNTIME_CONFIG_SOURCE = "DB";
      process.env.WECHAT_PAY_PUBLIC_KEY = "configured-public-key";
      try {
        const result = await svc.check();
        expect(result.status).toBe("degraded");
        expect(result.checks.payment).toEqual({
          status: "degraded",
          error: "WECHAT_PAY_PUBLIC_KEY_PAIR_INCOMPLETE",
        });
      } finally {
        if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = previousNodeEnv;
      }
    });

    it("VOD SearchMedia 权限缺失时降级且不向健康响应泄露云端详情", async () => {
      process.env.VOD_SUB_APP_ID = "1500012345";
      process.env.COS_SECRET_ID = "vod-test-id";
      process.env.COS_SECRET_KEY = "vod-test-key";
      (global.fetch as jest.Mock).mockImplementation(async (input: string | URL, init?: RequestInit) => {
        if (String(input) === "https://vod.tencentcloudapi.com" && init?.method === "POST") {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              Response: {
                Error: {
                  Code: "AuthFailure.UnauthorizedOperation",
                  Message: "account and role details must remain private",
                },
              },
            }),
          } as any;
        }
        return { ok: true, status: 200 } as any;
      });

      const result = await svc.check();
      expect(result.status).toBe("degraded");
      expect(result.checks.vod).toEqual({
        status: "degraded",
        error: "VOD_SEARCH_PERMISSION_MISSING",
      });
      expect(JSON.stringify(result)).not.toContain("account and role details");
    });

    it("VOD 管理探测成功但缺播放器密钥时仍如实降级", async () => {
      process.env.VOD_SUB_APP_ID = "1500012345";
      process.env.COS_SECRET_ID = "vod-test-id";
      process.env.COS_SECRET_KEY = "vod-test-key";
      (global.fetch as jest.Mock).mockImplementation(async (input: string | URL, init?: RequestInit) => {
        if (String(input) === "https://vod.tencentcloudapi.com" && init?.method === "POST") {
          return {
            ok: true,
            status: 200,
            json: async () => ({ Response: { RequestId: "vod-health-rid" } }),
          } as any;
        }
        return { ok: true, status: 200 } as any;
      });
      const result = await svc.check();
      expect(result.checks.vod).toEqual({ status: "degraded", error: "VOD_PLAY_KEY_MISSING" });
    });

    it("VOD 应用 ID 非法时阻断健康门禁", async () => {
      process.env.VOD_SUB_APP_ID = "not-a-number";
      const result = await svc.check();
      expect(result.status).toBe("fail");
      expect(result.checks.vod).toEqual({ status: "fail", error: "VOD_SUB_APP_ID_INVALID" });
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

    it("多人混流启用但缺腾讯云 API 凭据时健康门禁失败", async () => {
      process.env.LIVE_PUSH_DOMAIN = "push.example.com";
      process.env.LIVE_PLAY_DOMAIN = "play.example.com";
      process.env.LIVE_PUSH_KEY = "push-key";
      process.env.LIVE_PLAY_KEY = "play-key";
      process.env.TRTC_SDK_APP_ID = "1600030106";
      process.env.TRTC_SECRET_KEY = "trtc-key";
      process.env.LIVE_MULTI_GUEST_MIXING_ENABLED = "true";
      const result = await svc.check();
      expect(result.checks.live).toEqual({ status: "fail", error: "LIVE_MIXING_CREDENTIAL_MISSING" });
    });

    it("OBS 进 TRTC 启用但未启用统一混流时健康门禁失败", async () => {
      process.env.LIVE_PUSH_DOMAIN = "push.example.com";
      process.env.LIVE_PLAY_DOMAIN = "play.example.com";
      process.env.LIVE_PUSH_KEY = "push-key";
      process.env.LIVE_PLAY_KEY = "play-key";
      process.env.TRTC_SDK_APP_ID = "1600030106";
      process.env.TRTC_SECRET_KEY = "trtc-key";
      process.env.LIVE_OBS_TRTC_INGEST_ENABLED = "true";
      const result = await svc.check();
      expect(result.checks.live).toEqual({ status: "fail", error: "LIVE_OBS_TRTC_REQUIRES_MIXING" });
    });

    it("OBS 进 TRTC 启用但缺回调验签密钥时健康门禁失败", async () => {
      process.env.LIVE_PUSH_DOMAIN = "push.example.com";
      process.env.LIVE_PLAY_DOMAIN = "play.example.com";
      process.env.LIVE_PUSH_KEY = "push-key";
      process.env.LIVE_PLAY_KEY = "play-key";
      process.env.TRTC_SDK_APP_ID = "1600030106";
      process.env.TRTC_SECRET_KEY = "trtc-key";
      process.env.LIVE_MULTI_GUEST_MIXING_ENABLED = "true";
      process.env.LIVE_OBS_TRTC_INGEST_ENABLED = "true";
      const result = await svc.check();
      expect(result.checks.live).toEqual({ status: "fail", error: "LIVE_OBS_TRTC_CALLBACK_KEY_MISSING" });
    });
  });
});
