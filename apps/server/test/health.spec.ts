import { Test } from "@nestjs/testing";
import { HealthController } from "../src/modules/health/health.controller";
import { HealthService } from "../src/modules/health/health.service";
import { PrismaService } from "../src/prisma/prisma.service";
import { RedisService } from "../src/redis/redis.service";

describe("HealthController", () => {
  let healthController: HealthController;

  beforeAll(async () => {
    const mockPrisma = { $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]) };
    const mockRedis = {
      set: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue("1"),
    };

    const mod = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    healthController = mod.get(HealthController);
  });

  it("健康检查返回 ok", async () => {
    const result = await healthController.check();
    expect(["ok", "degraded"]).toContain(result.status);
    expect(result.checks.db.status).toBe("ok");
    expect(result.checks.redis.status).toBe("ok");
    expect(result.uptime).toBeGreaterThan(0);
  });

  it("数据库故障时返回 degraded", async () => {
    const mockPrismaFail = { $queryRaw: jest.fn().mockRejectedValue(new Error("DB down")) };
    const mockRedisOk = {
      set: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue("1"),
    };
    const mod = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        { provide: PrismaService, useValue: mockPrismaFail },
        { provide: RedisService, useValue: mockRedisOk },
      ],
    }).compile();
    const ctrl = mod.get(HealthController);
    const result = await ctrl.check();
    expect(result.status).toBe("degraded");
    expect(result.checks.db.status).toBe("fail");
  });
});
