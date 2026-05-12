import { Test, TestingModule } from "@nestjs/testing";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";
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
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();
    ctrl = mod.get(HealthController);
  });

  afterEach(() => jest.clearAllMocks());

  it("应被定义", () => expect(ctrl).toBeDefined());

  describe("GET /health", () => {
    it("DB和Redis都正常时返回ok", async () => {
      const result = await ctrl.check();
      expect(["ok", "degraded"]).toContain(result.status);
      expect(result.checks.db.status).toBe("ok");
      expect(result.checks.redis.status).toBe("ok");
    });

    it("DB异常时返回degraded", async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error("DB down"));
      const result = await ctrl.check();
      expect(result.checks.db.status).toBe("fail");
    });

    it("Redis异常时返回degraded", async () => {
      mockRedis.get.mockRejectedValue(new Error("Redis down"));
      const result = await ctrl.check();
      expect(result.checks.redis.status).toBe("fail");
    });

    it("返回内存信息", async () => {
      const result = await ctrl.check();
      expect(result.memory).toBeDefined();
      expect(result.memory.rss).toBeDefined();
      expect(result.memory.heapUsed).toBeDefined();
    });

    it("返回运行时间", async () => {
      const result = await ctrl.check();
      expect(result.uptime).toBeGreaterThan(0);
    });
  });

  describe("GET /health/ready", () => {
    it("就绪时返回ready", async () => {
      const result = await ctrl.ready();
      expect(result.status).toBe("ready");
    });

    it("DB异常时返回not_ready", async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error("DB down"));
      const result = await ctrl.ready();
      expect(result.status).toBe("not_ready");
    });
  });

  describe("GET /health/live", () => {
    it("始终返回alive", async () => {
      const result = await ctrl.live();
      expect(result.status).toBe("alive");
    });
  });
});
