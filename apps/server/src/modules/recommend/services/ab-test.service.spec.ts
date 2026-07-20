import { AbTestConfig, AbTestStatus } from "../ab-test.dto";
import { AbTestService } from "./ab-test.service";

const activeExperiment = (): AbTestConfig => ({
  id: "ab_real_1",
  name: "推荐策略真实实验",
  description: "",
  experimentTraffic: 50,
  controlOverrides: [],
  experimentOverrides: [{ strategy: "tag-match", weight: 2 }],
  status: AbTestStatus.RUNNING,
  startAt: "2026-07-01T00:00:00.000Z",
  endAt: "2099-07-30T00:00:00.000Z",
  createdBy: "admin",
});

describe("AbTestService", () => {
  const tx = {
    $queryRawUnsafe: jest.fn().mockResolvedValue([{ pg_advisory_xact_lock: "" }]),
    configSystem: {
      findUnique: jest.fn(),
      upsert: jest.fn().mockResolvedValue({}),
    },
  };
  const prisma = {
    configSystem: {
      findUnique: jest.fn(),
      upsert: jest.fn().mockResolvedValue({}),
    },
    recommendLog: { findMany: jest.fn() },
    $transaction: jest.fn((fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
  };
  const redis = {
    getJson: jest.fn(),
    setJson: jest.fn().mockResolvedValue(undefined),
    delByPattern: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  };
  let service: AbTestService;

  beforeEach(() => {
    jest.clearAllMocks();
    redis.getJson.mockResolvedValue(null);
    prisma.configSystem.findUnique.mockResolvedValue(null);
    tx.configSystem.findUnique.mockResolvedValue(null);
    service = new AbTestService(prisma as any, redis as any);
  });

  it("配置缓存未命中时从 ConfigSystem 恢复并回填缓存", async () => {
    const config = activeExperiment();
    prisma.configSystem.findUnique.mockResolvedValue({ configValue: JSON.stringify([config]) });

    await expect(service.list()).resolves.toEqual([config]);
    expect(prisma.configSystem.findUnique).toHaveBeenCalledWith({
      where: { configKey: "recommend.ab.configs.v1" },
      select: { configValue: true },
    });
    expect(redis.setJson).toHaveBeenCalledWith("recommend:ab:configs:v2", [config], 60);
  });

  it("新建实验通过数据库事务锁持久化，不再只活 60 秒", async () => {
    const created = await service.create({
      name: "新排序权重",
      experimentTraffic: 40,
      experimentOverrides: [{ strategy: "hot", weight: 1.5 }],
    });

    expect(created.status).toBe(AbTestStatus.DRAFT);
    expect(tx.$queryRawUnsafe).toHaveBeenCalledWith(
      "SELECT pg_advisory_xact_lock(hashtext($1))",
      "recommend.ab.configs.v1",
    );
    expect(tx.configSystem.upsert).toHaveBeenCalledTimes(1);
    const upsert = tx.configSystem.upsert.mock.calls[0][0];
    expect(JSON.parse(upsert.create.configValue)[0].name).toBe("新排序权重");
    expect(redis.delByPattern).toHaveBeenCalledWith("recommend:*:v2");
    expect(redis.setJson).toHaveBeenCalledWith(
      "recommend:ab:configs:v2",
      expect.arrayContaining([expect.objectContaining({ name: "新排序权重" })]),
      60,
    );
  });

  it("损坏的持久配置拒绝覆盖，避免后台一次保存清空全部实验", async () => {
    prisma.configSystem.findUnique.mockResolvedValue({ configValue: "{bad-json" });
    await expect(service.list()).rejects.toThrow("不是合法 JSON");

    tx.configSystem.findUnique.mockResolvedValue({ configValue: "{bad-json" });
    await expect(service.create({ name: "不能覆盖" })).rejects.toThrow("不是合法 JSON");
    expect(tx.configSystem.upsert).not.toHaveBeenCalled();
  });

  it("按真实实验组日志计算 CTR、百分点变化与显著性", async () => {
    const config = activeExperiment();
    redis.getJson.mockImplementation(async (key: string) =>
      key === "recommend:ab:configs:v2" ? [config] : null,
    );
    prisma.recommendLog.findMany.mockResolvedValue([
      ...Array.from({ length: 100 }, () => ({ strategy: "tag|ab:ab_real_1:control", isClick: false })),
      ...Array.from({ length: 10 }, () => ({ strategy: "tag|ab:ab_real_1:control", isClick: true })),
      ...Array.from({ length: 100 }, () => ({ strategy: "hot|ab:ab_real_1:experiment", isClick: false })),
      ...Array.from({ length: 20 }, () => ({ strategy: "hot|ab:ab_real_1:experiment", isClick: true })),
    ]);

    const metrics = await service.getMetrics(config.id);
    expect(metrics).toEqual({
      experimentId: config.id,
      control: { impressions: 100, clicks: 10, ctr: 0.1 },
      experiment: { impressions: 100, clicks: 20, ctr: 0.2 },
      lift: 10,
      significant: true,
    });
    expect(prisma.recommendLog.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ strategy: { contains: "ab:ab_real_1:" } }),
    }));
  });

  it("配置中心故障时推荐分桶 fail-open，不阻断推荐主链", async () => {
    prisma.configSystem.findUnique.mockRejectedValue(new Error("db unavailable"));
    await expect(service.getAssignments("user-1")).resolves.toEqual([]);
    await expect(service.getOverrides("user-1")).resolves.toEqual([]);
  });
});
