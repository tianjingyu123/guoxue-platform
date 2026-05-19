import { Test } from "@nestjs/testing";
import { DiscoverController } from "./discover.controller";
import { DiscoverService } from "./discover.service";
import { DiscoverQueryDto } from "./discover-query.dto";
import { DiscoverItem } from "./discover.service";

describe("DiscoverController", () => {
  let ctrl: DiscoverController;
  let svc: jest.Mocked<DiscoverService>;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [DiscoverController],
      providers: [
        {
          provide: DiscoverService,
          useValue: {
            getDiscover: jest.fn(),
            getCategoryTree: jest.fn(),
            getHotContent: jest.fn(),
            getRecommendations: jest.fn(),
          },
        },
      ],
    }).compile();
    ctrl = mod.get(DiscoverController);
    svc = mod.get(DiscoverService) as jest.Mocked<DiscoverService>;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockDiscoverItem: DiscoverItem = {
    id: "d1", title: "国学经典", cover: null, type: "content", intro: null,
    tags: [], categoryLevel1: null, categoryLevel2: null, stats: {},
  };

  describe("getDiscover", () => {
    it("无筛选条件时（聚合模式），返回 sections", async () => {
      const resultData = {
        page: 1, pageSize: 10,
        sections: [
          { type: "content", title: "精选内容", items: [mockDiscoverItem], total: 1 },
          { type: "course", title: "热门课程", items: [], total: 0 },
          { type: "product", title: "精选商品", items: [], total: 0 },
          { type: "classic", title: "古籍经典", items: [], total: 0 },
          { type: "bot", title: "智能体", items: [], total: 0 },
        ],
      };
      svc.getDiscover.mockResolvedValue(resultData);
      const query: DiscoverQueryDto = {};
      const result = await ctrl.getDiscover(query);
      expect(svc.getDiscover).toHaveBeenCalledWith({
        page: 1, pageSize: 10,
        type: undefined, categoryLevel1: undefined, categoryLevel2: undefined,
      });
      expect(result).toEqual(resultData);
    });

    it("带品类和类型筛选（单类型模式）", async () => {
      const resultData = {
        page: 2, pageSize: 20, type: "course",
        items: [mockDiscoverItem], total: 1,
      };
      svc.getDiscover.mockResolvedValue(resultData);
      const query: DiscoverQueryDto = {
        page: 2, pageSize: 20, type: "course",
        categoryLevel1: "国学", categoryLevel2: "易经",
      };
      await ctrl.getDiscover(query);
      expect(svc.getDiscover).toHaveBeenCalledWith({
        page: 2, pageSize: 20, type: "course",
        categoryLevel1: "国学", categoryLevel2: "易经",
      });
    });

    it("page 和 pageSize 为 undefined 时使用默认值", async () => {
      svc.getDiscover.mockResolvedValue({ page: 1, pageSize: 10, sections: [] } as any);
      const query: DiscoverQueryDto = { page: undefined, pageSize: undefined };
      await ctrl.getDiscover(query);
      expect(svc.getDiscover).toHaveBeenCalledWith({
        page: 1, pageSize: 10,
        type: undefined, categoryLevel1: undefined, categoryLevel2: undefined,
      });
    });
  });

  describe("getCategories", () => {
    it("获取发现页品类导航树", async () => {
      const tree: Record<string, string[]> = { "国学经典": ["儒家经典", "道家典籍"] };
      svc.getCategoryTree.mockResolvedValue(tree);
      const result = await ctrl.getCategories();
      expect(svc.getCategoryTree).toHaveBeenCalled();
      expect(result).toEqual(tree);
    });

    it("品类树为空对象", async () => {
      svc.getCategoryTree.mockResolvedValue({});
      const result = await ctrl.getCategories();
      expect(result).toEqual({});
    });
  });

  describe("getHotContent", () => {
    const hotContent = {
      page: 1, pageSize: 10,
      items: [{ id: "h1", title: "热门内容", cover: null, type: "content" as const, intro: null, tags: [], categoryLevel1: null, categoryLevel2: null, stats: {} }],
      total: 1,
    };

    it("获取热门内容，默认分页", async () => {
      svc.getHotContent.mockResolvedValue(hotContent);
      const result = await ctrl.getHotContent();
      expect(svc.getHotContent).toHaveBeenCalledWith(1, 10);
      expect(result).toEqual(hotContent);
    });

    it("自定义分页参数", async () => {
      svc.getHotContent.mockResolvedValue({ page: 3, pageSize: 5, items: [], total: 0 });
      await ctrl.getHotContent(3, 5);
      expect(svc.getHotContent).toHaveBeenCalledWith(3, 5);
    });

    it("传 undefined 时使用默认值", async () => {
      svc.getHotContent.mockResolvedValue({ page: 1, pageSize: 10, items: [], total: 0 });
      await ctrl.getHotContent(undefined, undefined);
      expect(svc.getHotContent).toHaveBeenCalledWith(1, 10);
    });
  });

  describe("getRecommendations", () => {
    const recResult = {
      page: 1, pageSize: 10, personalized: true,
      interests: ["国学"],
      items: [{ id: "r1", title: "个性化推荐", cover: null, type: "content" as const, intro: null, tags: [], categoryLevel1: null, categoryLevel2: null, stats: {} }],
      total: 1,
    };

    it("已登录用户获取个性化推荐", async () => {
      svc.getRecommendations.mockResolvedValue(recResult);
      const result = await ctrl.getRecommendations({ user: { id: "u1" } }, 1, 10);
      expect(svc.getRecommendations).toHaveBeenCalledWith("u1", 1, 10);
      expect(result).toEqual(recResult);
    });

    it("未登录用户（user 为 undefined）", async () => {
      svc.getRecommendations.mockResolvedValue(recResult);
      const result = await ctrl.getRecommendations({ user: undefined }, 1, 10);
      expect(svc.getRecommendations).toHaveBeenCalledWith(undefined, 1, 10);
      expect(result).toEqual(recResult);
    });

    it("默认分页参数", async () => {
      svc.getRecommendations.mockResolvedValue(recResult);
      await ctrl.getRecommendations({ user: { id: "u1" } });
      expect(svc.getRecommendations).toHaveBeenCalledWith("u1", 1, 10);
    });
  });
});
