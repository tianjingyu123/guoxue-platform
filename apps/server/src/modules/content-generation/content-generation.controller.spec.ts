import { Test } from "@nestjs/testing";
import { ContentGenerationController } from "./content-generation.controller";
import { ContentGenerationService } from "./content-generation.service";
import { OperationalSeedService } from "./operational-seed.service";

describe("ContentGenerationController", () => {
  let ctrl: ContentGenerationController;
  let svc: jest.Mocked<ContentGenerationService>;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [ContentGenerationController],
      providers: [
        {
          provide: ContentGenerationService,
          useValue: {
            generateForCategory: jest.fn(),
            getCategoryStats: jest.fn(),
            getCategoryTree: jest.fn(),
            autoFillEmptyCategories: jest.fn(),
          },
        },
        {
          provide: OperationalSeedService,
          useValue: { listTopics: jest.fn(), generateDraft: jest.fn() },
        },
      ],
    }).compile();
    ctrl = mod.get(ContentGenerationController);
    svc = mod.get(ContentGenerationService) as jest.Mocked<ContentGenerationService>;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("generate", () => {
    it("手动触发生成，仅传一级品类", async () => {
      const genResult = {
        categoryLevel1: "国学",
        generated: 3,
        results: [{ level2: "儒家经典", type: "knowledge", title: "国学入门指南" }],
      };
      svc.generateForCategory.mockResolvedValue(genResult);
      const result = await ctrl.generate({ categoryLevel1: "国学" });
      expect(svc.generateForCategory).toHaveBeenCalledWith("国学", undefined, undefined);
      expect(result).toEqual(genResult);
    });

    it("带二级品类和 types 筛选", async () => {
      svc.generateForCategory.mockResolvedValue({ categoryLevel1: "国学", generated: 0, results: [] });
      await ctrl.generate({
        categoryLevel1: "国学",
        categoryLevel2: "易经",
        types: ["knowledge", "classics"],
      });
      expect(svc.generateForCategory).toHaveBeenCalledWith("国学", "易经", ["knowledge", "classics"]);
    });

    it("未知品类返回错误", async () => {
      svc.generateForCategory.mockResolvedValue({ categoryLevel1: "不存在", error: "未知一级品类" });
      const result = await ctrl.generate({ categoryLevel1: "不存在" });
      expect(result).toHaveProperty("error");
    });
  });

  describe("getStats", () => {
    it("获取品类内容统计", async () => {
      const stats = {
        totalCategories: 10,
        totalContent: 100,
        emptyCategories: 2,
        totalGeneratedToday: 5,
        details: [
          { level1: "国学", level2: "儒家经典", knowledgeCount: 3, classicsCount: 5, tutorialCount: 2, totalCount: 10, healthScore: 85 },
        ],
      };
      svc.getCategoryStats.mockResolvedValue(stats);
      const result = await ctrl.getStats();
      expect(svc.getCategoryStats).toHaveBeenCalled();
      expect(result).toEqual(stats);
    });
  });

  describe("getCategories", () => {
    it("获取品类标签树", async () => {
      const tree: Record<string, string[]> = { "国学经典": ["儒家经典", "道家典籍"] };
      svc.getCategoryTree.mockResolvedValue(tree);
      const result = await ctrl.getCategories();
      expect(svc.getCategoryTree).toHaveBeenCalled();
      expect(result).toEqual(tree);
    });

    it("空品类树", async () => {
      svc.getCategoryTree.mockResolvedValue({});
      const result = await ctrl.getCategories();
      expect(result).toEqual({});
    });
  });

  describe("autoFill", () => {
    it("手动触发自动填充空品类", async () => {
      svc.autoFillEmptyCategories.mockResolvedValue(undefined);
      const result = await ctrl.autoFill();
      expect(svc.autoFillEmptyCategories).toHaveBeenCalled();
      expect(result).toEqual({ message: "自动填充已触发" });
    });
  });
});
