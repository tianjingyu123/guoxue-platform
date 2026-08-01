import { CirclePostService } from "./circle-post.service";

describe("CirclePostService 圈帖不出圈", () => {
  const prisma = {
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
});
