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

describe("CirclePostService 打赏原子事务与请求重试", () => {
  let service: CirclePostService;
  const ledgers: any[] = [];
  const tx = {
    $queryRaw: jest.fn(),
    virtualCoinTransaction: { findUnique: jest.fn(), findMany: jest.fn() },
  };
  const prisma = { post: { findUnique: jest.fn() }, $transaction: jest.fn() };
  const shared = { ensureMember: jest.fn() };
  const coin = { spend: jest.fn(), refund: jest.fn() };
  const notifications = { sendOnce: jest.fn() };

  beforeEach(() => {
    jest.resetAllMocks();
    ledgers.length = 0;
    prisma.post.findUnique.mockResolvedValue({ id: "post", userId: "author", circleId: "circle", title: "帖子" });
    tx.$queryRaw.mockResolvedValue([]);
    tx.virtualCoinTransaction.findUnique.mockImplementation(({ where }) => Promise.resolve(ledgers.find(row => row.id === where.id) ?? null));
    tx.virtualCoinTransaction.findMany.mockImplementation(({ where }) => Promise.resolve(ledgers.filter(row => row.refId === where.refId)));
    prisma.$transaction.mockImplementation(action => action(tx));
    shared.ensureMember.mockResolvedValue(undefined);
    coin.spend.mockImplementation(async (userId, dto, _tx, id) => {
      ledgers.push({ id, userId, type: "SPEND", amountCoin: -dto.amountCoin, scene: dto.scene, refId: dto.refId, description: dto.description });
      return {};
    });
    coin.refund.mockImplementation(async (userId, amountCoin, _description, _tx, refId) => {
      ledgers.push({ id: `credit-${ledgers.length}`, userId, amountCoin, type: "REFUND", scene: "REFUND", refId });
      return {};
    });
    notifications.sendOnce.mockResolvedValue({});
    service = new CirclePostService(prisma as any, {} as any, shared as any, undefined, coin as any, notifications as any);
    jest.spyOn((service as any).logger, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it("作者入账成功后才通知实际分成金额，保持既有50%分账和返回值", async () => {
    await expect(service.rewardPost("circle", "post", "payer", 9, "谢谢")).resolves.toEqual({ success: true, amount: 9 });
    expect(coin.spend).toHaveBeenCalledTimes(1);
    const debitId = coin.spend.mock.calls[0][3];
    expect(coin.spend.mock.calls[0][2]).toBe(tx);
    expect(coin.refund).toHaveBeenCalledWith("author", 4, "帖子打赏收入: 帖子", tx, debitId);
    expect(notifications.sendOnce).toHaveBeenCalledWith("author", `POST_REWARD:${debitId}`, expect.objectContaining({
      content: "有人打赏了你的帖子，入账 4 币（已扣除平台服务费）：谢谢",
      targetType: "POST", targetId: "post", category: "TRADE", circleId: "circle",
    }));
  });

  it("作者入账失败抛出整笔事务失败，不通知成功也不另开自动补款事务", async () => {
    coin.refund.mockRejectedValue(new Error("合成入账故障"));
    await expect(service.rewardPost("circle", "post", "payer", 8)).rejects.toThrow("合成入账故障");
    expect(coin.spend).toHaveBeenCalledTimes(1);
    expect(coin.refund).toHaveBeenCalledTimes(1);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(notifications.sendOnce).not.toHaveBeenCalled();
  });

  it("扣款失败时不入账也不发送任何成功通知", async () => {
    coin.spend.mockRejectedValue(new Error("合成余额不足"));
    await expect(service.rewardPost("circle", "post", "payer", 8)).rejects.toThrow("合成余额不足");
    expect(coin.refund).not.toHaveBeenCalled();
    expect(notifications.sendOnce).not.toHaveBeenCalled();
  });

  it("通知失败不阻断已完成打赏及作者入账", async () => {
    notifications.sendOnce.mockRejectedValue(new Error("合成通知故障"));
    await expect(service.rewardPost("circle", "post", "payer", 8)).resolves.toEqual({ success: true, amount: 8 });
    expect(coin.spend).toHaveBeenCalledTimes(1);
    expect(coin.refund).toHaveBeenCalledTimes(1);
  });

  it("小额打赏的零分成不调用入账接口，保持既有取整口径", async () => {
    await service.rewardPost("circle", "post", "payer", 1);
    expect(coin.refund).not.toHaveBeenCalled();
    expect(notifications.sendOnce).toHaveBeenCalledWith("author", expect.any(String), expect.objectContaining({
      content: "有人打赏了你的帖子，入账 0 币（已扣除平台服务费）",
    }));
  });

  it("等待资金事务提交后才发送通知", async () => {
    let commit!: () => void;
    prisma.$transaction.mockImplementation(async action => {
      await action(tx);
      await new Promise<void>(resolve => { commit = resolve; });
    });
    const operation = service.rewardPost("circle", "post", "payer", 8);
    while (!commit) await new Promise(resolve => setImmediate(resolve));
    expect(notifications.sendOnce).not.toHaveBeenCalled();
    commit(); await operation;
    expect(notifications.sendOnce).toHaveBeenCalledTimes(1);
  });

  it("提交失败不发送任何通知", async () => {
    prisma.$transaction.mockImplementation(async action => { await action(tx); throw new Error("合成提交失败"); });
    await expect(service.rewardPost("circle", "post", "payer", 8)).rejects.toThrow("合成提交失败");
    expect(notifications.sendOnce).not.toHaveBeenCalled();
  });

  it("同请求编号重试复用账本和通知键，不重复扣款或入账", async () => {
    await service.rewardPost("circle", "post", "payer", 8, "谢谢", "request-001");
    await service.rewardPost("circle", "post", "payer", 8, "谢谢", "request-001");
    expect(coin.spend).toHaveBeenCalledTimes(1);
    expect(coin.refund).toHaveBeenCalledTimes(1);
    expect(notifications.sendOnce.mock.calls[0][1]).toBe(notifications.sendOnce.mock.calls[1][1]);
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.virtualCoinTransaction.findUnique.mock.invocationCallOrder[0]);
  });

  it("同帖子不同编号允许再次打赏，无编号旧调用每次仍是新笔", async () => {
    for (const requestId of ["request-001", "request-002", undefined, undefined]) {
      await service.rewardPost("circle", "post", "payer", 8, undefined, requestId);
    }
    expect(coin.spend).toHaveBeenCalledTimes(4);
    expect(new Set(coin.spend.mock.calls.map(call => call[3])).size).toBe(4);
  });

  it.each(["amount", "post"])("同编号修改%s拒绝再次执行资金", async change => {
    await service.rewardPost("circle", "post", "payer", 8, "谢谢", "request-001");
    if (change === "post") prisma.post.findUnique.mockResolvedValue({ id: "another-post", userId: "author", circleId: "circle", title: "另一帖" });
    await expect(service.rewardPost("circle", change === "post" ? "another-post" : "post", "payer", change === "amount" ? 9 : 8, "谢谢", "request-001")).rejects.toThrow("请求编号已用于其他内容");
    expect(coin.spend).toHaveBeenCalledTimes(1);
    expect(notifications.sendOnce).toHaveBeenCalledTimes(1);
  });

  it("不同付款用户的同编号互不占用", async () => {
    await service.rewardPost("circle", "post", "payer", 8, undefined, "request-001");
    await service.rewardPost("circle", "post", "another-payer", 8, undefined, "request-001");
    expect(coin.spend).toHaveBeenCalledTimes(2);
    expect(coin.spend.mock.calls[0][3]).not.toBe(coin.spend.mock.calls[1][3]);
  });

  it.each(["missing", "duplicate", "user", "amount", "type"])("重试遇到%s作者流水拒绝自动补钱或成功通知", async change => {
    await service.rewardPost("circle", "post", "payer", 8, undefined, "request-001");
    const credit = ledgers[1];
    if (change === "missing") ledgers.splice(1);
    if (change === "duplicate") ledgers.push({ ...credit, id: "duplicate" });
    if (change === "user") credit.userId = "wrong-author";
    if (change === "amount") credit.amountCoin = 99;
    if (change === "type") credit.type = "INCOME";
    await expect(service.rewardPost("circle", "post", "payer", 8, undefined, "request-001")).rejects.toThrow("打赏流水不完整");
    expect(coin.spend).toHaveBeenCalledTimes(1);
    expect(coin.refund).toHaveBeenCalledTimes(1);
    expect(notifications.sendOnce).toHaveBeenCalledTimes(1);
  });

  it("零分成重试不新增流水", async () => {
    await service.rewardPost("circle", "post", "payer", 1, undefined, "request-001");
    await service.rewardPost("circle", "post", "payer", 1, undefined, "request-001");
    expect(coin.spend).toHaveBeenCalledTimes(1);
    expect(coin.refund).not.toHaveBeenCalled();
  });

  it("通知失败后重试仍只复用资金结果，并重试同一个通知键", async () => {
    notifications.sendOnce.mockRejectedValueOnce(new Error("合成通知失败"));
    await service.rewardPost("circle", "post", "payer", 8, undefined, "request-001");
    await service.rewardPost("circle", "post", "payer", 8, undefined, "request-001");
    expect(coin.spend).toHaveBeenCalledTimes(1);
    expect(notifications.sendOnce.mock.calls[0][1]).toBe(notifications.sendOnce.mock.calls[1][1]);
  });

  it.each([0, -1, 1.5, 10001, NaN, Infinity, "8"])("无效金额%s在读取业务前拒绝", async amount => {
    await expect(service.rewardPost("circle", "post", "payer", amount as number)).rejects.toThrow("打赏金额");
    expect(prisma.post.findUnique).not.toHaveBeenCalled();
  });

  it.each(["short", "a.b.c.def", "x".repeat(129), 123, null])("无效请求编号%s拒绝执行", async requestId => {
    await expect(service.rewardPost("circle", "post", "payer", 8, undefined, requestId as string)).rejects.toThrow("请求编号");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it.each([{}, 123, null, "x".repeat(201)])("无效留言%s拒绝执行", async message => {
    await expect(service.rewardPost("circle", "post", "payer", 8, message as string)).rejects.toThrow("打赏留言");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it.each(["missing", "other-circle", "self", "non-member"])("%s权限条件不满足时不执行资金事务", async state => {
    if (state === "missing") prisma.post.findUnique.mockResolvedValue(null);
    if (state === "other-circle") prisma.post.findUnique.mockResolvedValue({ id: "post", circleId: "another-circle", userId: "author" });
    if (state === "self") prisma.post.findUnique.mockResolvedValue({ id: "post", circleId: "circle", userId: "payer" });
    if (state === "non-member") shared.ensureMember.mockRejectedValue(new Error("请先加入圈子"));
    await expect(service.rewardPost("circle", "post", "payer", 8)).rejects.toThrow();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
