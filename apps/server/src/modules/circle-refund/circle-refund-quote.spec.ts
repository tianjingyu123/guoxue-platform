import { CircleRefundService } from "./circle-refund.service";

describe("圈子退款提交金额前置条件", () => {
  const prisma = {
    circleMember: { findUnique: jest.fn() },
    order: { findFirst: jest.fn() },
    $transaction: jest.fn(),
    $queryRawUnsafe: jest.fn(),
    $executeRawUnsafe: jest.fn(),
  };
  let service: CircleRefundService;
  let nowSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    nowSpy = jest.spyOn(Date, "now").mockReturnValue(new Date("2026-09-23T00:00:00Z").getTime());
    prisma.circleMember.findUnique.mockResolvedValue({
      joinedAt: new Date("2026-09-01T00:00:00Z"),
      expireAt: new Date("2027-09-01T00:00:00Z"),
    });
    prisma.order.findFirst.mockResolvedValue({ id: "order-1", amount: 365, payAmount: 365 });
    prisma.$queryRawUnsafe.mockResolvedValue([]);
    prisma.$executeRawUnsafe.mockResolvedValue(1);
    prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
    service = new CircleRefundService(prisma as any);
  });

  afterEach(() => nowSpy.mockRestore());

  it("新客户端金额匹配时才建立申请", async () => {
    const result = await service.applyRefund("circle-1", "member-1", undefined, "normal", 274.4);
    expect(result.actualRefund).toBe(274.4);
    expect(prisma.$executeRawUnsafe).toHaveBeenCalledTimes(1);
    expect(prisma.$queryRawUnsafe.mock.calls[0][0]).toContain("FOR UPDATE");
  });

  it("金额过期或类型错误时不建立申请", async () => {
    await expect(service.applyRefund("circle-1", "member-1", undefined, "normal", 275))
      .rejects.toThrow("退款金额已变化，请重新确认");
    await expect(service.applyRefund("circle-1", "member-1", undefined, "normal", "274.4" as any))
      .rejects.toThrow("退款金额已变化，请重新确认");
    expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled();
  });

  it("未传金额的旧客户端仍由服务端计价", async () => {
    const result = await service.applyRefund("circle-1", "member-1");
    expect(result.actualRefund).toBe(274.4);
    expect(prisma.$executeRawUnsafe).toHaveBeenCalledTimes(1);
  });

  it("退款执行中不可再建立第二笔申请", async () => {
    prisma.$queryRawUnsafe.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: "existing-refunding" }]);
    await expect(service.applyRefund("circle-1", "member-1", undefined, "normal", 274.4))
      .rejects.toThrow("待处理的退款申请");
    expect(prisma.$queryRawUnsafe.mock.calls[1][0]).toContain("'refunding'");
    expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled();
  });

  it("建单失败时错误从查重事务返回", async () => {
    prisma.$executeRawUnsafe.mockRejectedValue(new Error("insert failed"));
    await expect(service.applyRefund("circle-1", "member-1", undefined, "normal", 274.4))
      .rejects.toThrow("insert failed");
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.$queryRawUnsafe).toHaveBeenCalledTimes(2);
  });
});
