import { LiveDataCollectorService } from "./live-data-collector.service";

describe("LiveDataCollectorService", () => {
  const prisma = {
    liveRoom: { findMany: jest.fn(), update: jest.fn() },
    comment: { count: jest.fn() },
    like: { count: jest.fn() },
    giftRecord: { aggregate: jest.fn() },
    order: { aggregate: jest.fn() },
    liveMinuteData: { create: jest.fn() },
  } as any;
  const redis = { runExclusive: jest.fn() } as any;
  const quality = { consumeQuota: jest.fn() } as any;
  const presence = { getOnlineCount: jest.fn() } as any;
  let service: LiveDataCollectorService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LiveDataCollectorService(prisma, redis, quality, presence);
    prisma.liveRoom.findMany.mockResolvedValue([{ id: "r1", quality: "basic", hostUserId: "host1" }]);
    presence.getOnlineCount.mockResolvedValue(3);
    prisma.comment.count.mockResolvedValue(1);
    prisma.like.count.mockResolvedValue(2);
    prisma.giftRecord.aggregate.mockResolvedValue({ _sum: { totalCoin: 10 } });
    prisma.order.aggregate.mockResolvedValue({ _sum: { amount: 88 }, _count: 1 });
    prisma.liveMinuteData.create.mockResolvedValue({ id: "m1" });
  });

  it("分钟 GMV 只按支付时间统计本直播间来源的商品订单", async () => {
    await (service as any)._collectMinuteData();

    expect(prisma.order.aggregate).toHaveBeenCalledWith({
      where: {
        type: "PRODUCT",
        sourceContentType: "LIVE",
        sourceContentId: "r1",
        status: { in: ["PAID", "SHIPPED", "COMPLETED"] },
        paidAt: { gte: expect.any(Date), lt: expect.any(Date) },
      },
      _sum: { amount: true },
      _count: true,
    });
    expect(prisma.liveMinuteData.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ roomId: "r1", gmw: 8800, orderCount: 1 }),
    });
  });
});
