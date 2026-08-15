import { Test } from "@nestjs/testing";
import { FeatureFlagService } from "./feature-flag.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

const mockPrisma = {
  featureFlag: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
  },
  configVersion: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
  },
  $transaction: jest.fn(async (callback: (tx: any) => Promise<any>) => callback(mockPrisma)),
};

const mockRedis = {
  getJson: jest.fn().mockResolvedValue(null),
  setJson: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(1),
};

describe("FeatureFlagService", () => {
  let svc: FeatureFlagService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        FeatureFlagService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();
    svc = mod.get(FeatureFlagService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedis.getJson.mockResolvedValue(null);
    mockPrisma.featureFlag.findUnique.mockResolvedValue(null);
    mockPrisma.configVersion.findFirst.mockResolvedValue(null);
    mockPrisma.configVersion.findMany.mockResolvedValue([]);
    mockPrisma.configVersion.create.mockResolvedValue({});
  });

  describe("isEnabled", () => {
    it("开关不存在返回 false", async () => {
      mockPrisma.featureFlag.findUnique.mockResolvedValue(null);
      const result = await svc.isEnabled("nonexistent");
      expect(result).toBe(false);
    });

    it("开关关闭返回 false", async () => {
      const flag = {
        key: "new_feature", enabled: false, percentage: 100,
        targetUserIds: [], name: "New", description: null,
      };
      mockPrisma.featureFlag.findUnique.mockResolvedValue(flag);
      const result = await svc.isEnabled("new_feature");
      expect(result).toBe(false);
    });

    it("用户在 targetUserIds 白名单中直接返回 true", async () => {
      const flag = {
        key: "beta", enabled: true, percentage: 10,
        targetUserIds: ["u1", "u2"], name: "Beta", description: null,
      };
      mockPrisma.featureFlag.findUnique.mockResolvedValue(flag);
      const result = await svc.isEnabled("beta", "u1");
      expect(result).toBe(true);
    });

    it("percentage=100 时所有用户启用", async () => {
      const flag = {
        key: "launched", enabled: true, percentage: 100,
        targetUserIds: [], name: "All", description: null,
      };
      mockPrisma.featureFlag.findUnique.mockResolvedValue(flag);
      const result = await svc.isEnabled("launched", "u99");
      expect(result).toBe(true);
    });

    it("percentage=0 时用户不在白名单则返回 false", async () => {
      const flag = {
        key: "off", enabled: true, percentage: 0,
        targetUserIds: [], name: "Off", description: null,
      };
      mockPrisma.featureFlag.findUnique.mockResolvedValue(flag);
      const result = await svc.isEnabled("off", "u1");
      expect(result).toBe(false);
    });

    it("Redis 缓存命中不查询数据库", async () => {
      const cached = {
        key: "cached_feat", enabled: true, percentage: 100,
        targetUserIds: [], name: "Cached", description: null,
      };
      mockRedis.getJson.mockResolvedValue(cached);
      const result = await svc.isEnabled("cached_feat", "u1");
      expect(result).toBe(true);
      expect(mockPrisma.featureFlag.findUnique).not.toHaveBeenCalled();
    });

    it("无 userId 且 percentage<100 返回 false", async () => {
      const flag = {
        key: "partial", enabled: true, percentage: 50,
        targetUserIds: [], name: "Partial", description: null,
      };
      mockPrisma.featureFlag.findUnique.mockResolvedValue(flag);
      const result = await svc.isEnabled("partial");
      expect(result).toBe(false);
    });
  });

  describe("list", () => {
    it("返回所有开关", async () => {
      mockPrisma.featureFlag.findMany.mockResolvedValue([{ key: "f1", enabled: true }]);
      const result = await svc.list();
      expect(result).toHaveLength(1);
    });

    it("空列表", async () => {
      mockPrisma.featureFlag.findMany.mockResolvedValue([]);
      const result = await svc.list();
      expect(result).toHaveLength(0);
    });
  });

  describe("getClientFeatures", () => {
    it("仅下发 client_ 前缀和显式兼容白名单，内部开关不公开", async () => {
      const flags = [
        { key: "client_home_v2", enabled: true, percentage: 100, targetUserIds: [] },
        { key: "live_start", enabled: true, percentage: 100, targetUserIds: [] },
        { key: "risk_fraud_scan", enabled: true, percentage: 100, targetUserIds: [] },
      ];
      mockPrisma.featureFlag.findMany.mockResolvedValue(flags);
      mockPrisma.featureFlag.findUnique.mockImplementation(async ({ where }: any) =>
        flags.find((flag) => flag.key === where.key) ?? null,
      );

      const result = await svc.getClientFeatures("u1");

      expect(result).toEqual({ client_home_v2: true, live_start: true });
      expect(result).not.toHaveProperty("risk_fraud_scan");
    });
  });

  describe("getByKey", () => {
    it("返回开关详情", async () => {
      const flag = { key: "f1", enabled: true, percentage: 100, targetUserIds: [] };
      mockPrisma.featureFlag.findUnique.mockResolvedValue(flag);
      const result = await svc.getByKey("f1");
      expect(result.key).toBe("f1");
    });

    it("缓存命中", async () => {
      const cached = { key: "cached", enabled: true };
      mockRedis.getJson.mockResolvedValue(cached);
      const result = await svc.getByKey("cached");
      expect(result.key).toBe("cached");
    });
  });

  describe("upsert", () => {
    it("创建新开关", async () => {
      mockPrisma.featureFlag.upsert.mockResolvedValue({ key: "new_key", name: "new_key", description: null, enabled: true, percentage: 100, targetUserIds: [] });
      const result = await svc.upsert("new_key", { enabled: true });
      expect(result.key).toBe("new_key");
      expect(mockRedis.del).toHaveBeenCalledWith("feature:new_key");
      expect(mockRedis.del).toHaveBeenCalledWith("feature:list");
    });

    it("更新现有开关", async () => {
      mockPrisma.featureFlag.upsert.mockResolvedValue({ key: "existing", name: "existing", description: null, enabled: false, percentage: 50, targetUserIds: ["u1"] });
      const result = await svc.upsert("existing", { percentage: 50, targetUserIds: ["u1"] });
      expect(result.percentage).toBe(50);
    });

    it("upsert 后清除缓存", async () => {
      mockPrisma.featureFlag.upsert.mockResolvedValue({ key: "k1", name: "k1", description: null, enabled: false, percentage: 100, targetUserIds: [] });
      await svc.upsert("k1", {});
      expect(mockRedis.del).toHaveBeenCalledWith("feature:k1");
      expect(mockRedis.del).toHaveBeenCalledWith("feature:list");
    });

    it("拒绝不合法 key，避免通过路径或大小写创建影子开关", async () => {
      await expect(svc.upsert("../BAD", {})).rejects.toThrow("功能开关 key 格式不合法");
      expect(mockPrisma.featureFlag.upsert).not.toHaveBeenCalled();
    });

    it("清理并去重指定用户列表", async () => {
      mockPrisma.featureFlag.upsert.mockResolvedValue({ key: "client_demo", name: "client_demo", description: null, enabled: false, percentage: 100, targetUserIds: ["u1", "u2"] });
      await svc.upsert("client_demo", { targetUserIds: [" u1 ", "u1", "", "u2"] });
      expect(mockPrisma.featureFlag.upsert).toHaveBeenCalledWith(expect.objectContaining({
        create: expect.objectContaining({ targetUserIds: ["u1", "u2"] }),
        update: expect.objectContaining({ targetUserIds: ["u1", "u2"] }),
      }));
    });

    it("每次有效变更写入可回滚快照", async () => {
      mockPrisma.featureFlag.upsert.mockResolvedValue({
        key: "client_demo", name: "演示", description: null,
        enabled: true, percentage: 25, targetUserIds: ["u1"],
      });
      mockPrisma.configVersion.findFirst.mockResolvedValue({ version: 2 });

      await svc.upsert("client_demo", {
        name: "演示", enabled: true, percentage: 25, targetUserIds: ["u1"],
      }, "admin");

      expect(mockPrisma.configVersion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          configKey: "feature_flag:client_demo",
          version: 3,
          changedBy: "admin",
          value: expect.objectContaining({ enabled: true, percentage: 25 }),
        }),
      });
    });

    it("既有开关首次变更时先保存变更前快照", async () => {
      mockPrisma.featureFlag.findUnique.mockResolvedValue({
        key: "client_demo", name: "演示", description: "旧说明",
        enabled: false, percentage: 10, targetUserIds: ["u1"],
      });
      mockPrisma.featureFlag.upsert.mockResolvedValue({
        key: "client_demo", name: "演示", description: "新说明",
        enabled: true, percentage: 100, targetUserIds: [],
      });
      mockPrisma.configVersion.findFirst.mockResolvedValue(null);

      await svc.upsert("client_demo", {
        description: "新说明", enabled: true, percentage: 100, targetUserIds: [],
      }, "admin");

      expect(mockPrisma.configVersion.create).toHaveBeenNthCalledWith(1, {
        data: expect.objectContaining({
          configKey: "feature_flag:client_demo",
          version: 1,
          value: expect.objectContaining({ enabled: false, percentage: 10 }),
        }),
      });
      expect(mockPrisma.configVersion.create).toHaveBeenNthCalledWith(2, {
        data: expect.objectContaining({
          configKey: "feature_flag:client_demo",
          version: 2,
          changedBy: "admin",
          value: expect.objectContaining({ enabled: true, percentage: 100 }),
        }),
      });
    });
  });

  describe("history / rollback", () => {
    it("查询最近 50 条开关历史", async () => {
      mockPrisma.configVersion.findMany.mockResolvedValue([{ version: 2 }, { version: 1 }]);
      const result = await svc.getHistory("client_demo");
      expect(result).toHaveLength(2);
      expect(mockPrisma.configVersion.findMany).toHaveBeenCalledWith({
        where: { configKey: "feature_flag:client_demo" },
        orderBy: { version: "desc" },
        take: 50,
      });
    });

    it("回滚前校验快照并生成新的历史版本", async () => {
      mockPrisma.configVersion.findFirst.mockResolvedValue({
        value: {
          key: "client_demo", name: "演示", description: "历史值",
          enabled: false, percentage: 10, targetUserIds: ["u1"],
        },
      });
      mockPrisma.featureFlag.upsert.mockResolvedValue({
        key: "client_demo", name: "演示", description: "历史值",
        enabled: false, percentage: 10, targetUserIds: ["u1"],
      });

      const result = await svc.rollback("client_demo", 1, "admin");

      expect(result.enabled).toBe(false);
      expect(mockPrisma.featureFlag.upsert).toHaveBeenCalledWith(expect.objectContaining({
        update: expect.objectContaining({ enabled: false, percentage: 10 }),
      }));
    });
  });

  describe("delete", () => {
    it("删除开关成功", async () => {
      mockPrisma.featureFlag.delete.mockResolvedValue({});
      await svc.delete("old_flag");
      expect(mockRedis.del).toHaveBeenCalledWith("feature:old_flag");
      expect(mockRedis.del).toHaveBeenCalledWith("feature:list");
    });

    it("删除不存在开关不抛异常", async () => {
      mockPrisma.featureFlag.delete.mockRejectedValue(new Error("Not found"));
      await expect(svc.delete("nonexistent")).resolves.toBeUndefined();
    });
  });

  describe("hashBucket — 一致性", () => {
    it("同一用户+同一开关多次计算一致", async () => {
      const flag = {
        key: "consistent", enabled: true, percentage: 30,
        targetUserIds: [], name: "C", description: null,
      };
      mockPrisma.featureFlag.findUnique.mockResolvedValue(flag);

      const results = await Promise.all(
        Array.from({ length: 10 }, () => svc.isEnabled("consistent", "u1")),
      );
      // 所有调用结果一致
      expect(new Set(results).size).toBe(1);
    });
  });
});
