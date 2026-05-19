import { Test } from "@nestjs/testing";
import { OperationEngineController } from "./operation-engine.controller";
import { OperationEngineService } from "./operation-engine.service";

describe("OperationEngineController", () => {
  let ctrl: OperationEngineController;
  let svc: jest.Mocked<OperationEngineService>;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [OperationEngineController],
      providers: [
        {
          provide: OperationEngineService,
          useValue: {
            getOverview: jest.fn(),
            getRelatedRecommendations: jest.fn(),
            getPersonalizedRecommendations: jest.fn(),
            generateWeeklyBrief: jest.fn(),
            detectEmptyCategories: jest.fn(),
            rotateHomepageContent: jest.fn(),
            markHotContent: jest.fn(),
            fillEmptyCategories: jest.fn(),
          },
        },
      ],
    }).compile();
    ctrl = mod.get(OperationEngineController);
    svc = mod.get(OperationEngineService) as jest.Mocked<OperationEngineService>;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getOverview", () => {
    it("获取运营概览", async () => {
      const overview = { totalContent: 5000, totalUsers: 1000, totalCircles: 50, recentContent: 200 };
      svc.getOverview.mockResolvedValue(overview);
      const result = await ctrl.getOverview();
      expect(svc.getOverview).toHaveBeenCalled();
      expect(result).toEqual(overview);
    });
  });

  describe("getRelatedRecommendations", () => {
    const recommendationItem = {
      id: "r1", title: "相关内容", excerpt: null, cover: null,
      categoryLevel1: "国学", categoryLevel2: null,
      viewCount: 100, likeCount: 10,
    };

    it("获取关联推荐（仅一级品类）", async () => {
      const recommendations = { category: "国学", subcategory: undefined, recommendations: [recommendationItem], total: 1 };
      svc.getRelatedRecommendations.mockResolvedValue(recommendations);
      const result = await ctrl.getRelatedRecommendations("国学");
      expect(svc.getRelatedRecommendations).toHaveBeenCalledWith("国学", undefined);
      expect(result).toEqual(recommendations);
    });

    it("获取关联推荐（含二级品类）", async () => {
      svc.getRelatedRecommendations.mockResolvedValue({ category: "国学", subcategory: "易经", recommendations: [], total: 0 });
      await ctrl.getRelatedRecommendations("国学", "易经");
      expect(svc.getRelatedRecommendations).toHaveBeenCalledWith("国学", "易经");
    });

    it("空推荐列表", async () => {
      svc.getRelatedRecommendations.mockResolvedValue({ category: "不存在", subcategory: undefined, recommendations: [], total: 0 });
      const result = await ctrl.getRelatedRecommendations("不存在");
      expect(result.recommendations).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe("getPersonalizedRecommendations", () => {
    it("获取个性化推荐", async () => {
      const recommendations = {
        userId: "u1", interests: ["国学"],
        results: [{ category: "国学", items: [{ id: "r1", title: "推荐", excerpt: null, cover: null, categoryLevel1: "国学", viewCount: 100, likeCount: 10 }] }],
      };
      svc.getPersonalizedRecommendations.mockResolvedValue(recommendations);
      const result = await ctrl.getPersonalizedRecommendations("u1");
      expect(svc.getPersonalizedRecommendations).toHaveBeenCalledWith("u1");
      expect(result).toEqual(recommendations);
    });

    it("用户无兴趣时返回空结果", async () => {
      const emptyResult = { userId: "newUser", interests: [], results: [] };
      svc.getPersonalizedRecommendations.mockResolvedValue(emptyResult);
      const result = await ctrl.getPersonalizedRecommendations("newUser");
      expect(result.results).toEqual([]);
    });
  });

  describe("generateBrief", () => {
    it("手动生成运营周报", async () => {
      const brief = {
        period: "2026-05-08 ~ 2026-05-15",
        newContent: 50, newUsers: 30,
        totalLikes: 200, totalViews: 5000,
        generatedAt: "2026-05-15T00:00:00.000Z",
      };
      svc.generateWeeklyBrief.mockResolvedValue(brief);
      const result = await ctrl.generateBrief();
      expect(svc.generateWeeklyBrief).toHaveBeenCalled();
      expect(result).toEqual(brief);
    });
  });

  describe("detectEmpty", () => {
    it("手动触发空板块检测", async () => {
      svc.detectEmptyCategories.mockResolvedValue(undefined);
      const result = await ctrl.detectEmpty();
      expect(svc.detectEmptyCategories).toHaveBeenCalled();
      expect(result).toEqual({ message: "空板块检测已触发" });
    });
  });

  describe("rotate", () => {
    it("手动触发首页内容轮换", async () => {
      svc.rotateHomepageContent.mockResolvedValue(undefined);
      const result = await ctrl.rotate();
      expect(svc.rotateHomepageContent).toHaveBeenCalled();
      expect(result).toEqual({ message: "首页内容轮换已触发" });
    });
  });

  describe("markHot", () => {
    it("手动触发热门内容标记", async () => {
      const hotResult = { hotContentCount: 10, contentIds: ["c1", "c2"] };
      svc.markHotContent.mockResolvedValue(hotResult);
      const result = await ctrl.markHot();
      expect(svc.markHotContent).toHaveBeenCalled();
      expect(result).toEqual(hotResult);
    });
  });

  describe("fillEmpty", () => {
    it("手动触发空品类AI内容填充", async () => {
      const fillResult = { message: "空品类内容填充已触发" };
      svc.fillEmptyCategories.mockResolvedValue(fillResult);
      const result = await ctrl.fillEmpty();
      expect(svc.fillEmptyCategories).toHaveBeenCalled();
      expect(result).toEqual(fillResult);
    });
  });
});
