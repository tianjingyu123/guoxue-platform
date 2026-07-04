import { Test } from "@nestjs/testing";
import { ContentGenerationService } from "./content-generation.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";

const mockPrisma = {
  configSystem: { findUnique: jest.fn() },
  content: { count: jest.fn(), create: jest.fn() },
};

const mockGateway = {
  chat: jest.fn(),
};

describe("ContentGenerationService", () => {
  let svc: ContentGenerationService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        ContentGenerationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AiGatewayService, useValue: mockGateway },
        {
          provide: RedisService,
          useValue: { runExclusive: jest.fn((_n: string, _t: number, fn: () => Promise<unknown>) => fn()) },
        },
      ],
    }).compile();
    svc = mod.get(ContentGenerationService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  // ═══════════ getCategoryTree / loadCategoryTree ═══════════
  describe("getCategoryTree", () => {
    it("从configSystem解析品类树", async () => {
      mockPrisma.configSystem.findUnique.mockResolvedValue({
        configKey: "category_tree",
        configValue: JSON.stringify({ "自定义": ["子类A"] }),
      });

      const tree = await svc.getCategoryTree();
      expect(tree).toEqual({ "自定义": ["子类A"] });
    });

    it("config为null时返回默认树", async () => {
      mockPrisma.configSystem.findUnique.mockResolvedValue(null);

      const tree = await svc.getCategoryTree();
      expect(tree).toHaveProperty("国学经典");
      expect(tree).toHaveProperty("中医养生");
      expect(tree["国学经典"]).toContain("儒家经典");
    });

    it("解析失败时返回默认树", async () => {
      mockPrisma.configSystem.findUnique.mockResolvedValue({
        configKey: "category_tree",
        configValue: "bad json",
      });

      const tree = await svc.getCategoryTree();
      expect(tree).toHaveProperty("国学经典");
    });
  });

  // ═══════════ getCategoryStats ═══════════
  describe("getCategoryStats", () => {
    it("返回所有品类统计", async () => {
      mockPrisma.configSystem.findUnique.mockResolvedValue(null);
      mockPrisma.content.count
        .mockResolvedValueOnce(2) // knowledge
        .mockResolvedValueOnce(3) // classics
        .mockResolvedValueOnce(1) // tutorial
        .mockResolvedValueOnce(2) // knowledge
        .mockResolvedValueOnce(3) // classics
        .mockResolvedValueOnce(1) // tutorial
        // ... repeat for all 10 categories * 3 types + today count
        .mockResolvedValue(0); // remaining calls + today

      const stats = await svc.getCategoryStats();
      expect(stats).toHaveProperty("totalCategories");
      expect(stats).toHaveProperty("totalContent");
      expect(stats).toHaveProperty("details");
      expect(stats.details.length).toBeGreaterThan(0);
      expect(stats.details[0]).toHaveProperty("level1");
      expect(stats.details[0]).toHaveProperty("healthScore");
    });
  });

  // ═══════════ generateForCategory ═══════════
  describe("generateForCategory", () => {
    // countPerCat=3 + 2000ms延迟 ≈ 6s+，设置更长超时
    jest.setTimeout(20000);

    it("为指定品类生成AI内容", async () => {
      mockPrisma.configSystem.findUnique.mockResolvedValue(null);
      mockGateway.chat.mockResolvedValue({ content: "# 论语入门指南\n\n这是关于论语的基础知识..." });
      mockPrisma.content.create.mockResolvedValue({});

      const result = await svc.generateForCategory("国学经典", "儒家经典", ["knowledge"]);

      expect(result.categoryLevel1).toBe("国学经典");
      expect(result.generated).toBeGreaterThanOrEqual(1);
      expect(mockPrisma.content.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            categoryLevel1: "国学经典",
            categoryLevel2: "儒家经典",
            status: "DRAFT",
            tags: expect.arrayContaining(["AI生成"]),
          }),
        }),
      );
    });

    it("未知品类返回错误", async () => {
      mockPrisma.configSystem.findUnique.mockResolvedValue(null);

      const result = await svc.generateForCategory("未知品类");
      expect(result).toHaveProperty("error", "未知一级品类");
    });

    it("AI生成失败时继续处理", async () => {
      mockPrisma.configSystem.findUnique.mockResolvedValue(null);
      mockGateway.chat
        .mockRejectedValueOnce(new Error("AI超时"))
        .mockResolvedValue({ content: "成功生成的内容" });
      mockPrisma.content.create.mockResolvedValue({});

      const result = await svc.generateForCategory("国学经典", "儒家经典", ["knowledge"]);

      // 仍有成功生成的记录
      expect(result.generated).toBeGreaterThan(0);
    });
  });

  // ═══════════ autoFillEmptyCategories ═══════════
  describe("autoFillEmptyCategories", () => {
    jest.setTimeout(30000);

    it("所有品类充足时跳过生成", async () => {
      mockPrisma.configSystem.findUnique.mockResolvedValue(null);
      // 默认树 ~40 个子品类，全部返回充足数量
      mockPrisma.content.count.mockResolvedValue(10);

      await svc.autoFillEmptyCategories();

      expect(mockGateway.chat).not.toHaveBeenCalled();
    });
  });
});
