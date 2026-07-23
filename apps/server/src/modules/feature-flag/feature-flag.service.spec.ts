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
      mockPrisma.featureFlag.upsert.mockResolvedValue({ key: "new_key", enabled: true, percentage: 100, targetUserIds: [] });
      const result = await svc.upsert("new_key", { enabled: true });
      expect(result.key).toBe("new_key");
      expect(mockRedis.del).toHaveBeenCalledWith("feature:new_key");
      expect(mockRedis.del).toHaveBeenCalledWith("feature:list");
    });

    it("更新现有开关", async () => {
      mockPrisma.featureFlag.upsert.mockResolvedValue({ key: "existing", enabled: false, percentage: 50, targetUserIds: ["u1"] });
      const result = await svc.upsert("existing", { percentage: 50, targetUserIds: ["u1"] });
      expect(result.percentage).toBe(50);
    });

    it("upsert 后清除缓存", async () => {
      mockPrisma.featureFlag.upsert.mockResolvedValue({ key: "k1" });
      await svc.upsert("k1", {});
      expect(mockRedis.del).toHaveBeenCalledWith("feature:k1");
      expect(mockRedis.del).toHaveBeenCalledWith("feature:list");
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
