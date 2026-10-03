import { HomeChannelFeedService } from "./home-channel-feed.service";

describe("HomeChannelFeedService", () => {
  let prisma: any;
  let redis: any;
  let service: HomeChannelFeedService;

  beforeEach(() => {
    prisma = {
      follow: { findMany: jest.fn().mockResolvedValue([]) },
      circleMember: { findMany: jest.fn().mockResolvedValue([]) },
      article: { findMany: jest.fn().mockResolvedValue([]) },
      course: { findMany: jest.fn().mockResolvedValue([]) },
      classicBook: { findMany: jest.fn().mockResolvedValue([]) },
      video: { findMany: jest.fn().mockResolvedValue([]) },
      liveRoom: { findMany: jest.fn().mockResolvedValue([]) },
      product: { findMany: jest.fn().mockResolvedValue([]) },
    };
    redis = {
      getOrSet: jest.fn((_key: string, _ttl: number, factory: () => Promise<unknown>) => factory()),
    };
    service = new HomeChannelFeedService(prisma, redis);
  });

  it("未登录关注流诚实返回空，不降级成推荐或热门", async () => {
    const result = await service.getFollowingFeed(undefined, 1, 20);

    expect(result.userSegment).toBe("following-anonymous");
    expect(result.items).toEqual([]);
    expect(prisma.article.findMany).not.toHaveBeenCalled();
  });

  it("关注流按关注用户和已加入圈子聚合最新内容", async () => {
    const updatedAt = new Date("2026-07-24T12:00:00.000Z");
    prisma.follow.findMany.mockResolvedValue([{ followedUserId: "teacher-1" }]);
    prisma.circleMember.findMany.mockResolvedValue([{ circleId: "circle-1" }]);
    prisma.article.findMany.mockResolvedValue([{
      id: "article-1",
      title: "老师新文章",
      excerpt: "摘要",
      cover: "",
      likeCount: 8,
      updatedAt,
      user: { nickname: "老师甲", avatar: "" },
    }]);

    const result = await service.getFollowingFeed("user-1", 1, 20);

    expect(result.userSegment).toBe("following");
    expect(result.items.map((item) => item.id)).toEqual(["article-1"]);
    expect(result.items[0].reason).toBe("关注更新");
    expect(prisma.article.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        OR: expect.arrayContaining([
          expect.objectContaining({ visibility: "PLATFORM" }),
          expect.objectContaining({ circleId: { in: ["circle-1"] } }),
        ]),
      }),
    }));
  });

  it("热门流固定使用平台热度池并保持多类型混排", async () => {
    prisma.article.findMany.mockResolvedValue([{
      id: "article-1", title: "热门文章", excerpt: "", cover: "", likeCount: 10,
      user: { nickname: "作者", avatar: "" },
    }]);
    prisma.course.findMany.mockResolvedValue([{
      id: "course-1", title: "热门课程", intro: "", cover: "", price: 0,
      originalPrice: null, studentCount: 20, user: { nickname: "讲师", avatar: "" },
    }]);
    prisma.classicBook.findMany.mockResolvedValue([{
      id: "classic-1", title: "论语", intro: "", cover: "", viewCount: 30,
    }]);

    const result = await service.getHotFeed(1, 20);

    expect(result.userSegment).toBe("hot");
    expect(result.items.map((item) => item.type)).toEqual(["article", "course", "classic"]);
    expect(result.items.every((item) => item.reason === "全平台热门")).toBe(true);
    expect(redis.getOrSet).toHaveBeenCalled();
  });
});
