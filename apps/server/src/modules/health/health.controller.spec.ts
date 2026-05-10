import { Test, TestingModule } from "@nestjs/testing";
import { HealthController } from "./health.controller";
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
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();
    ctrl = mod.get(HealthController);
  });

  it("应被定义", () => expect(ctrl).toBeDefined());

  it("DB和Redis都正常时返回ok", async () => {
    const result = await ctrl.check();
    expect(["ok", "degraded"]).toContain(result.status);
    expect(result.checks.db).toBe("ok");
    expect(result.checks.redis).toBe("ok");
  });

  it("DB异常时返回degraded", async () => {
    mockPrisma.$queryRaw.mockRejectedValue(new Error("DB down"));
    const result = await ctrl.check();
    expect(result.status).toBe("degraded");
    expect(result.checks.db).toBe("fail");
  });

  it("Redis异常时返回degraded", async () => {
    mockRedis.get.mockRejectedValue(new Error("Redis down"));
    const result = await ctrl.check();
    expect(result.status).toBe("degraded");
    expect(result.checks.redis).toBe("fail");
  });
});
