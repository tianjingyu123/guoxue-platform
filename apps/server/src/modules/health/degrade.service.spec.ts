import { Test } from "@nestjs/testing";
import { DegradeService } from "./degrade.service";
import { HealthService } from "./health.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

/** O-T2 自动降级单测：连续失败计数→挂flag→恢复即清；手动开关合成；未配置依赖跳过 */

const mockHealth = { checkIm: jest.fn(), checkDeepSeek: jest.fn() };
const mockPrisma = {
  configSystem: { findUnique: jest.fn() },
  userRole: { findMany: jest.fn() },
  notification: { createMany: jest.fn() },
};

function createFakeRedis() {
  const kv = new Map<string, string>();
  const counters = new Map<string, number>();
  return {
    kv, counters,
    runExclusive: jest.fn((_n: string, _t: number, fn: () => Promise<unknown>) => fn()),
    get: jest.fn(async (k: string) => kv.get(k) ?? (counters.has(k) ? String(counters.get(k)) : null)),
    set: jest.fn(async (k: string, v: string) => { kv.set(k, v); }),
    del: jest.fn(async (k: string) => { kv.delete(k); counters.delete(k); }),
    incrBy: jest.fn(async (k: string, d: number) => { const v = (counters.get(k) ?? 0) + d; counters.set(k, v); return v; }),
    reset() { kv.clear(); counters.clear(); },
  };
}
const fakeRedis = createFakeRedis();

describe("DegradeService", () => {
  let svc: DegradeService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        DegradeService,
        { provide: HealthService, useValue: mockHealth },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: fakeRedis },
      ],
    }).compile();
    svc = mod.get(DegradeService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    fakeRedis.reset();
    mockHealth.checkIm.mockResolvedValue({ status: "ok" });
    mockHealth.checkDeepSeek.mockResolvedValue({ status: "ok" });
    mockPrisma.configSystem.findUnique.mockResolvedValue(null);
    mockPrisma.userRole.findMany.mockResolvedValue([{ userId: "admin-1" }]);
    mockPrisma.notification.createMany.mockResolvedValue({ count: 1 });
  });

  it("probeCron 经 runExclusive('health_degrade_probe') 互斥", async () => {
    await svc.probeCron();
    expect(fakeRedis.runExclusive).toHaveBeenCalledWith("health_degrade_probe", 110, expect.any(Function));
  });

  it("连续 3 次异常才挂降级 flag，且首挂发管理员通知", async () => {
    mockHealth.checkIm.mockResolvedValue({ status: "degraded", error: "timeout" });
    await svc.probe();
    await svc.probe();
    expect(fakeRedis.kv.has("degrade:flag:im")).toBe(false); // 2 次未到阈值
    await svc.probe();
    expect(fakeRedis.kv.get("degrade:flag:im")).toBe("1");
    expect(mockPrisma.notification.createMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.notification.createMany.mock.calls[0][0].data[0].targetType).toBe("DEGRADE");
    // 已挂 flag 后再异常不重复通知
    await svc.probe();
    expect(mockPrisma.notification.createMany).toHaveBeenCalledTimes(1);
  });

  it("恢复探测成功立即清 flag 与计数", async () => {
    mockHealth.checkIm.mockResolvedValue({ status: "fail" });
    await svc.probe(); await svc.probe(); await svc.probe();
    expect(fakeRedis.kv.has("degrade:flag:im")).toBe(true);
    mockHealth.checkIm.mockResolvedValue({ status: "ok" });
    await svc.probe();
    expect(fakeRedis.kv.has("degrade:flag:im")).toBe(false);
    expect(fakeRedis.counters.has("degrade:fail:im")).toBe(false);
  });

  it("未配置的依赖（unconfigured）不参与降级", async () => {
    mockHealth.checkDeepSeek.mockResolvedValue({ status: "unconfigured" });
    await svc.probe(); await svc.probe(); await svc.probe();
    expect(fakeRedis.kv.has("degrade:flag:ai")).toBe(false);
  });

  it("偶发一次失败后恢复，计数清零不累积", async () => {
    mockHealth.checkIm.mockResolvedValueOnce({ status: "fail" });
    await svc.probe(); // 1 次失败
    await svc.probe(); // 恢复 ok → 清零
    mockHealth.checkIm.mockResolvedValueOnce({ status: "fail" });
    await svc.probe(); // 又 1 次（如未清零会到 2）
    expect(fakeRedis.counters.get("degrade:fail:im")).toBe(1);
  });

  describe("getStatus（合成状态）", () => {
    it("自动 flag 与手动开关任一为真即降级", async () => {
      fakeRedis.kv.set("degrade:flag:im", "1"); // 自动
      mockPrisma.configSystem.findUnique.mockImplementation(async (args: { where: { configKey: string } }) =>
        args.where.configKey === "degrade.manual.live" ? { configValue: "true" } : null,
      );
      const s = await svc.getStatus();
      expect(s.im).toBe(true);   // 自动轨
      expect(s.live).toBe(true); // 手动轨
      expect(s.vod).toBe(false);
      expect(s.pay).toBe(false);
    });

    it("全部正常时五键均 false", async () => {
      const s = await svc.getStatus();
      expect(s).toEqual({ live: false, im: false, vod: false, ai: false, pay: false });
    });
  });
});
