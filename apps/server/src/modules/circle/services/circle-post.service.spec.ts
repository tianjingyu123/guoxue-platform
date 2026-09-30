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

describe("CirclePostService 打赏通知的入账事实", () => {
  let service: CirclePostService;
  const prisma = { post: { findUnique: jest.fn() } };
  const shared = { ensureMember: jest.fn() };
  const coin = { spend: jest.fn(), refund: jest.fn() };
  const notifications = { send: jest.fn() };

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.post.findUnique.mockResolvedValue({ id: "post", userId: "author", circleId: "circle", title: "帖子" });
    shared.ensureMember.mockResolvedValue(undefined);
    coin.spend.mockResolvedValue({});
    coin.refund.mockResolvedValue({});
    notifications.send.mockResolvedValue({});
    service = new CirclePostService(prisma as any, {} as any, shared as any, undefined, coin as any, notifications as any);
    jest.spyOn((service as any).logger, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it("作者入账成功后才通知实际分成金额，保持既有50%分账和返回值", async () => {
    await expect(service.rewardPost("circle", "post", "payer", 9, "谢谢")).resolves.toEqual({ success: true, amount: 9 });
    expect(coin.spend).toHaveBeenCalledTimes(1);
    expect(coin.refund).toHaveBeenCalledWith("author", 4, "帖子打赏收入: 帖子");
    expect(notifications.send).toHaveBeenCalledWith("author", expect.objectContaining({
      content: "有人打赏了你的帖子，入账 4 币（已扣除平台服务费）：谢谢",
      targetType: "POST", targetId: "post", category: "TRADE", circleId: "circle",
    }));
  });

  it("作者入账失败不发送到账成功文案，也不再次扣款或自动冲正", async () => {
    coin.refund.mockRejectedValue(new Error("合成入账故障"));
    await expect(service.rewardPost("circle", "post", "payer", 8)).resolves.toEqual({ success: true, amount: 8 });
    expect(coin.spend).toHaveBeenCalledTimes(1);
    expect(coin.refund).toHaveBeenCalledTimes(1);
    expect(notifications.send).toHaveBeenCalledWith("author", expect.objectContaining({
      content: "有人打赏了你的帖子，作者收入暂未入账，请联系平台客服核查。",
    }));
  });

  it("扣款失败时不入账也不发送任何成功通知", async () => {
    coin.spend.mockRejectedValue(new Error("合成余额不足"));
    await expect(service.rewardPost("circle", "post", "payer", 8)).rejects.toThrow("合成余额不足");
    expect(coin.refund).not.toHaveBeenCalled();
    expect(notifications.send).not.toHaveBeenCalled();
  });

  it("通知失败不阻断已完成打赏及作者入账", async () => {
    notifications.send.mockRejectedValue(new Error("合成通知故障"));
    await expect(service.rewardPost("circle", "post", "payer", 8)).resolves.toEqual({ success: true, amount: 8 });
    expect(coin.spend).toHaveBeenCalledTimes(1);
    expect(coin.refund).toHaveBeenCalledTimes(1);
  });

  it("小额打赏的零分成不调用入账接口，保持既有取整口径", async () => {
    await service.rewardPost("circle", "post", "payer", 1);
    expect(coin.refund).not.toHaveBeenCalled();
    expect(notifications.send).toHaveBeenCalledWith("author", expect.objectContaining({
      content: "有人打赏了你的帖子，入账 0 币（已扣除平台服务费）",
    }));
  });
});
