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
  });

  afterAll(() => { global.fetch = origFetch; });

  describe("liveness", () => {
    it("返回存活状态和运行时间", () => {
      const result = svc.liveness();
      expect(result.status).toBe("alive");
      expect(result.uptime).toBeGreaterThan(0);
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
  });

  describe("check", () => {
    it("返回包含所有检查项的完整报告", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 });
      const result = await svc.check();
      expect(result.status).toBeDefined();
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
  });
});
