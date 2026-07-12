import { Test } from "@nestjs/testing";
import { SmartFeedController } from "./smart-feed.controller";
import { SmartFeedService, SmartFeedResult } from "./smart-feed.service";

describe("SmartFeedController", () => {
  let ctrl: SmartFeedController;
  let svc: jest.Mocked<SmartFeedService>;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [SmartFeedController],
      providers: [
        {
          provide: SmartFeedService,
          useValue: {
            getFeed: jest.fn(),
            getAnonymousFeed: jest.fn(),
          },
        },
      ],
    }).compile();
    ctrl = mod.get(SmartFeedController);
    svc = mod.get(SmartFeedService) as jest.Mocked<SmartFeedService>;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockReq = (userId = "u1") => ({ user: { id: userId } }) as any;

  const feedResult: SmartFeedResult = {
    userId: "u1",
    userSegment: "normal",
    items: [
      { id: "f1", type: "article", title: "国学文章", score: 0.95, reason: "热门推荐" },
      { id: "f2", type: "course", title: "易经入门", score: 0.88, reason: "兴趣匹配" },
    ],
    generatedAt: "2026-05-15T00:00:00.000Z",
  };

  describe("getSmartFeed", () => {
    it("获取AI智能信息流，默认分页", async () => {
      svc.getFeed.mockResolvedValue(feedResult);
      const result = await ctrl.getSmartFeed(mockReq("u1"));
      expect(svc.getFeed).toHaveBeenCalledWith("u1", 1, 20);
      expect(result).toEqual(feedResult);
    });

    it("自定义分页参数", async () => {
      svc.getFeed.mockResolvedValue(feedResult);
      await ctrl.getSmartFeed(mockReq("u1"), 2, 10);
      expect(svc.getFeed).toHaveBeenCalledWith("u1", 2, 10);
    });

    it("分页参数字符串处理", async () => {
      const emptyFeed: SmartFeedResult = {
        userId: "u1", userSegment: "normal", items: [], generatedAt: "2026-05-15T00:00:00.000Z",
      };
      svc.getFeed.mockResolvedValue(emptyFeed);
      await ctrl.getSmartFeed(mockReq("u1"), "3" as any, "15" as any);
      expect(svc.getFeed).toHaveBeenCalledWith("u1", 3, 15);
    });

    it("空信息流", async () => {
      const emptyFeed: SmartFeedResult = {
        userId: "u1", userSegment: "normal", items: [], generatedAt: "2026-05-15T00:00:00.000Z",
      };
      svc.getFeed.mockResolvedValue(emptyFeed);
      const result = await ctrl.getSmartFeed(mockReq("u1"));
      expect(result.items).toEqual([]);
      expect(result.userSegment).toBe("normal");
    });
  });

  describe("getSmartFeedOptional", () => {
    it("登录用户返回个性化信息流", async () => {
      svc.getFeed.mockResolvedValue(feedResult);
      const result = await ctrl.getSmartFeedOptional(mockReq("u1"));
      expect(svc.getFeed).toHaveBeenCalledWith("u1", 1, 20);
      expect(result).toEqual(feedResult);
    });

    it("未登录返回匿名热门流（游客预览），走 getAnonymousFeed 不调用 getFeed", async () => {
      const anonResult = { userId: null as unknown as string, userSegment: "anonymous", items: [{ id: "a1", type: "course" as const, title: "热门课", score: 1, reason: "热门" }], generatedAt: "2026-05-15T00:00:00.000Z" };
      svc.getAnonymousFeed.mockResolvedValue(anonResult);
      const result = await ctrl.getSmartFeedOptional({} as any);
      expect(svc.getFeed).not.toHaveBeenCalled();
      expect(svc.getAnonymousFeed).toHaveBeenCalled();
      expect(result.userSegment).toBe("anonymous");
      expect(result.items.length).toBeGreaterThan(0);
    });

    it("自定义分页参数透传", async () => {
      svc.getFeed.mockResolvedValue(feedResult);
      await ctrl.getSmartFeedOptional(mockReq("u1"), 2, 10);
      expect(svc.getFeed).toHaveBeenCalledWith("u1", 2, 10);
    });
  });

  describe("refreshFeed", () => {
    it("刷新AI智能信息流，重新生成排序", async () => {
      svc.getFeed.mockResolvedValue(feedResult);
      const result = await ctrl.refreshFeed(mockReq("u1"));
      expect(svc.getFeed).toHaveBeenCalledWith("u1", 1, 20);
      expect(result).toEqual(feedResult);
    });
  });
});
