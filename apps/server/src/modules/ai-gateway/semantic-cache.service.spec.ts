import { Test } from "@nestjs/testing";
import { SemanticCacheService } from "./semantic-cache.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { VectorService } from "./vector.service";

describe("SemanticCacheService", () => {
  let svc: SemanticCacheService;

  const mockPrisma = {
    aiCacheEntry: {
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  };
  const mockRedis = {
    getJson: jest.fn(),
    setJson: jest.fn().mockResolvedValue(undefined),
    runExclusive: jest.fn((_n: string, _t: number, fn: () => Promise<unknown>) => fn()),
  };
  const mockVector = {
    embed: jest.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        SemanticCacheService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: VectorService, useValue: mockVector },
      ],
    }).compile();
    svc = module.get(SemanticCacheService);
  });

  describe("store 场景化有效期", () => {
    it("classic_translate 固定原文场景 → 持久层有效期约 1 年（终身一次 AI 费）", async () => {
      mockPrisma.aiCacheEntry.findFirst.mockResolvedValue(null);
      await svc.store("classic_translate", "欲做精金美玉的人品", "白话译文", "deepseek");
      // persistEntry 为 fire-and-forget，等微任务清空
      await new Promise((r) => setImmediate(r));

      expect(mockPrisma.aiCacheEntry.create).toHaveBeenCalled();
      const data = mockPrisma.aiCacheEntry.create.mock.calls[0][0].data;
      const days = (data.expiresAt.getTime() - Date.now()) / 86400_000;
      expect(days).toBeGreaterThan(360);
    });

    it("自由对话场景（classic_qa）→ 维持默认 72h", async () => {
      mockPrisma.aiCacheEntry.findFirst.mockResolvedValue(null);
      await svc.store("classic_qa", "孔子是谁？请介绍一下", "回答内容", "deepseek");
      await new Promise((r) => setImmediate(r));

      const data = mockPrisma.aiCacheEntry.create.mock.calls[0][0].data;
      const hours = (data.expiresAt.getTime() - Date.now()) / 3600_000;
      expect(hours).toBeGreaterThan(70);
      expect(hours).toBeLessThan(74);
    });
  });

  describe("lookup L0.5 持久层精确命中", () => {
    it("Redis 未命中但 DB 精确哈希命中 → 返回缓存并回写 Redis（不依赖向量）", async () => {
      mockRedis.getJson.mockResolvedValue(null); // L0 miss
      mockPrisma.aiCacheEntry.findFirst.mockResolvedValue({
        response: "缓存的白话译文",
        model: "deepseek",
      });

      const result = await svc.lookup("classic_translate", "欲做精金美玉的人品");

      expect(result).toBe("缓存的白话译文");
      expect(mockRedis.setJson).toHaveBeenCalled(); // 回写 Redis
      expect(mockVector.embed).not.toHaveBeenCalled(); // 未走向量路径
    });

    it("Redis 与 DB 均未命中且无相似候选 → 返回 null", async () => {
      mockRedis.getJson.mockResolvedValue(null);
      mockPrisma.aiCacheEntry.findFirst.mockResolvedValue(null);

      const result = await svc.lookup("classic_translate", "库中不存在的一句古文");
      expect(result).toBeNull();
    });
  });

  describe("scopeKey 数据隔离（防跨圈串答·后端审计P1）", () => {
    it("store 传 scopeKey → 持久层 scene 列按实体分区（circle_assistant#circleA）", async () => {
      mockPrisma.aiCacheEntry.findFirst.mockResolvedValue(null);
      await svc.store("circle_assistant", "本圈课程怎么退款", "A圈答案", "deepseek", undefined, "circleA");
      await new Promise((r) => setImmediate(r));

      const data = mockPrisma.aiCacheEntry.create.mock.calls[0][0].data;
      expect(data.scene).toBe("circle_assistant#circleA");
    });

    it("同一问题不同圈 → Redis 键不同 → A 圈答案不会命中给 B 圈", async () => {
      mockRedis.getJson.mockResolvedValue(null);
      mockPrisma.aiCacheEntry.findFirst.mockResolvedValue(null);
      const q = "本圈课程怎么退款";

      await svc.lookup("circle_assistant", q, "circleA");
      await svc.lookup("circle_assistant", q, "circleB");

      const keyA = mockRedis.getJson.mock.calls[0][0] as string;
      const keyB = mockRedis.getJson.mock.calls[1][0] as string;
      expect(keyA).toContain("circle_assistant#circleA");
      expect(keyB).toContain("circle_assistant#circleB");
      expect(keyA).not.toBe(keyB); // 键不同 → 跨圈不串
    });

    it("不传 scopeKey → 行为向后兼容（scene 不变，旧缓存仍可命中）", async () => {
      mockRedis.getJson.mockResolvedValue(null);
      mockPrisma.aiCacheEntry.findFirst.mockResolvedValue(null);

      await svc.lookup("classic_translate", "欲做精金美玉的人品");
      const key = mockRedis.getJson.mock.calls[0][0] as string;
      expect(key).toContain("sem:v1:classic_translate:");
      expect(key).not.toContain("#");
    });
  });
});
