import { Test, TestingModule } from "@nestjs/testing";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";
import { DegradeService } from "./degrade.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

const mockPrisma = { $queryRaw: jest.fn() };
const mockRedis = { get: jest.fn(), set: jest.fn() };

describe("HealthController", () => {
  let ctrl: HealthController;

  beforeEach(async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);
    mockRedis.set.mockResolvedValue("OK");
    mockRedis.get.mockResolvedValue("1");

    const mod: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        { provide: DegradeService, useValue: { getStatus: jest.fn().mockResolvedValue({ live: false, im: false, vod: false, ai: false, pay: false }) } },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();
    ctrl = mod.get(HealthController);
  });

  afterEach(() => jest.clearAllMocks());

  it("应被定义", () => expect(ctrl).toBeDefined());

  describe("GET /health", () => {
    it("DB和Redis都正常时返回ready", async () => {
      const result = await ctrl.check();
      expect(result.status).toBe("ready");
      expect(result.db).toBe("ok");
      expect(result.redis).toBe("ok");
    });

    it("DB异常时返回503", async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error("DB down"));
      await expect(ctrl.check()).rejects.toMatchObject({ status: 503 });
    });

    it("Redis异常时返回503", async () => {
      mockRedis.get.mockRejectedValue(new Error("Redis down"));
      await expect(ctrl.check()).rejects.toMatchObject({ status: 503 });
    });
  });

  describe("GET /health/detail", () => {
    it("返回完整依赖检查", async () => {
      const result = await ctrl.detail();
      expect(["ok", "degraded"]).toContain(result.status);
      expect(result.checks.db.status).toBe("ok");
      expect(result.checks.redis.status).toBe("ok");
    });

    it("返回内存信息", async () => {
      const result = await ctrl.detail();
      expect(result.memory).toBeDefined();
      expect(result.memory.rss).toBeDefined();
      expect(result.memory.heapUsed).toBeDefined();
    });

    it("返回运行时间", async () => {
      const result = await ctrl.detail();
      expect(result.uptime).toBeGreaterThan(0);
    });
  });

  describe("GET /health/ready", () => {
    it("就绪时返回ready", async () => {
      const result = await ctrl.ready();
      expect(result.status).toBe("ready");
    });

    it("DB异常时返回503", async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error("DB down"));
      await expect(ctrl.ready()).rejects.toMatchObject({ status: 503 });
    });
  });

  describe("GET /health/live", () => {
    it("始终返回alive", async () => {
      const result = await ctrl.live();
      expect(result.status).toBe("alive");
    });
  });
});
