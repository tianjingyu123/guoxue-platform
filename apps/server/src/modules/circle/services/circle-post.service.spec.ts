import { CirclePostService } from "./circle-post.service";

describe("CirclePostService 圈帖不出圈", () => {
  const prisma = {
    circle: { findMany: jest.fn(), count: jest.fn() },
    post: { findMany: jest.fn() },
    like: { groupBy: jest.fn() },
    comment: { groupBy: jest.fn() },
  };

  let service: CirclePostService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CirclePostService(
      prisma as any,
      {} as any,
      {} as any,
    );
  });

  it("全平台热门帖子兼容接口固定返回空且不读取帖子", async () => {
    await expect(service.getGlobalHotPosts()).resolves.toEqual([]);
    expect(prisma.post.findMany).not.toHaveBeenCalled();
    expect(prisma.like.groupBy).not.toHaveBeenCalled();
    expect(prisma.comment.groupBy).not.toHaveBeenCalled();
  });

  it("跨圈今日活动兼容接口固定返回空且不读取帖子", async () => {
    await expect(service.getTodayActivities()).resolves.toEqual([]);
    expect(prisma.post.findMany).not.toHaveBeenCalled();
  });

  it("综合排行按成员加帖子真实排序，再分页与编号", async () => {
    prisma.circle.findMany.mockResolvedValue([
      { id: "a", name: "甲", memberCount: 100, postCount: 1 },
      { id: "b", name: "乙", memberCount: 40, postCount: 90 },
      { id: "c", name: "丙", memberCount: 10, postCount: 5 },
    ]);
    prisma.circle.count.mockResolvedValue(3);
    const first = await service.getCircleRanking(1, 2, "activityScore");
    expect(first.items.map((circle) => [circle.id, circle.rank])).toEqual([["b", 1], ["a", 2]]);
    const second = await service.getCircleRanking(2, 2, "activityScore");
    expect(second.items.map((circle) => [circle.id, circle.rank])).toEqual([["c", 3]]);
  });
});
