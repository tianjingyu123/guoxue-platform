import { Logger } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { HealthController } from "../src/modules/health/health.controller";
import { HealthService } from "../src/modules/health/health.service";
import { DegradeService } from "../src/modules/health/degrade.service";
import { PrismaService } from "../src/prisma/prisma.service";
import { RedisService } from "../src/redis/redis.service";

const mockDegrade = {
  getStatus: jest
    .fn()
    .mockResolvedValue({ live: false, im: false, vod: false, ai: false, pay: false }),
};

describe("HealthController", () => {
  let healthController: HealthController;
  let healthyModule: TestingModule;

  beforeAll(async () => {
    const mockPrisma = { $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]) };
    const mockRedis = {
      set: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue("1"),
    };

    healthyModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        { provide: DegradeService, useValue: mockDegrade },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    healthController = healthyModule.get(HealthController);
  });

  afterAll(async () => {
    await healthyModule?.close();
  });

  it("健康检查返回 ok", async () => {
    const result = await healthController.check();
    expect(["ok", "degraded"]).toContain(result.status);
    expect(result.checks.db.status).toBe("ok");
    expect(result.checks.redis.status).toBe("ok");
    expect(result.releaseId).toBeDefined();
    expect(result).not.toHaveProperty("uptime");
    expect(result).not.toHaveProperty("memory");
    expect(result.checks.db).not.toHaveProperty("latencyMs");
  });

  it("数据库故障时返回 fail", async () => {
    const mockPrismaFail = { $queryRaw: jest.fn().mockRejectedValue(new Error("DB down")) };
    const mockRedisOk = {
      set: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue("1"),
    };
    const mod = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        { provide: DegradeService, useValue: mockDegrade },
        { provide: PrismaService, useValue: mockPrismaFail },
        { provide: RedisService, useValue: mockRedisOk },
      ],
    }).compile();
    const ctrl = mod.get(HealthController);
    // 只捕获本用例主动注入的故障日志，并验证它确实被记录，不关闭全局日志。
    const errorLog = jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    try {
      await expect(ctrl.check()).rejects.toMatchObject({
        response: {
          status: "fail",
          checks: {
            db: { status: "fail" },
          },
        },
        status: 503,
      });
      expect(errorLog).toHaveBeenCalledTimes(1);
      expect(errorLog).toHaveBeenCalledWith("DB 健康检查失败", "DB down");
    } finally {
      errorLog.mockRestore();
      await mod.close();
    }
  });
});
