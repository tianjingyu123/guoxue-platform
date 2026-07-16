import { ConsultCallService } from "./consult-call.service";
import { BusinessException } from "../../common/business.exception";

/**
 * 通话评价体系单测（待办 #31）：评价一次性 / 24h 窗口 / 200 字校验 /
 * 申诉窗口与一次性 / 好评率聚合 / 申诉处理资金零触碰。
 * ConsultCall 走 $queryRawUnsafe/$executeRawUnsafe 原生访问，故 mock prisma 原生方法。
 */
describe("ConsultCallService · 评价与账单申诉", () => {
  let prisma: { $queryRawUnsafe: jest.Mock; $executeRawUnsafe: jest.Mock; $transaction: jest.Mock };
  let coin: { spend: jest.Mock; refund: jest.Mock };
  let revenue: { record: jest.Mock; settleLedger: jest.Mock };
  let redis: { runExclusive: jest.Mock };
  let svc: ConsultCallService;

  /** 一条刚结束 1 小时的已结算通话（在 24h 窗口内） */
  const endedCall = () => ({
    id: "call-1",
    circleId: "c-1",
    callerId: "u-caller",
    expertId: "u-expert",
    status: "ENDED",
    endAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    ratedAt: null,
    disputedAt: null,
    disputeStatus: null,
  });

  beforeEach(() => {
    prisma = {
      $queryRawUnsafe: jest.fn(),
      $executeRawUnsafe: jest.fn().mockResolvedValue(1),
      $transaction: jest.fn(),
    };
    coin = { spend: jest.fn(), refund: jest.fn() };
    revenue = { record: jest.fn(), settleLedger: jest.fn().mockResolvedValue(undefined) };
    redis = { runExclusive: jest.fn((_n: string, _t: number, fn: () => Promise<unknown>) => fn()) };
    svc = new ConsultCallService(prisma as any, redis as any, coin as any, revenue as any);
  });

  const mockGetCall = (call: Record<string, unknown>) => prisma.$queryRawUnsafe.mockResolvedValueOnce([call]);

  // ───────── 评价 rate ─────────

  it("评价成功：仅 ENDED·24h 内·首次 → 原子 UPDATE（ratedAt IS NULL 锚点）并回传评价", async () => {
    mockGetCall(endedCall());
    const res = await svc.rate("u-caller", "call-1", { rating: 5, tags: ["讲解清楚", "有实际方案"], comment: "思路很清楚" });
    expect(res).toEqual({ id: "call-1", rating: 5, tags: ["讲解清楚", "有实际方案"], comment: "思路很清楚" });
    const [sql, id, rating, tags, comment] = prisma.$executeRawUnsafe.mock.calls[0];
    expect(sql).toContain(`"ratedAt" IS NULL`);
    expect([id, rating, tags, comment]).toEqual(["call-1", 5, "讲解清楚,有实际方案", "思路很清楚"]);
  });

  it("评价一次性：ratedAt 已存在 → 拒绝", async () => {
    mockGetCall({ ...endedCall(), ratedAt: new Date().toISOString() });
    await expect(svc.rate("u-caller", "call-1", { rating: 4 })).rejects.toThrow("该通话已评价过");
    expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled();
  });

  it("评价一次性：并发抢锚点失败（claimed=0）→ 拒绝", async () => {
    mockGetCall(endedCall());
    prisma.$executeRawUnsafe.mockResolvedValueOnce(0);
    await expect(svc.rate("u-caller", "call-1", { rating: 4 })).rejects.toThrow("该通话已评价过");
  });

  it("评价 24h 窗口：结束超 24 小时 → 拒绝", async () => {
    mockGetCall({ ...endedCall(), endAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() });
    await expect(svc.rate("u-caller", "call-1", { rating: 5 })).rejects.toThrow("评价窗口已关闭");
  });

  it("评价权限：非发起方（达人自己）→ 拒绝", async () => {
    mockGetCall(endedCall());
    await expect(svc.rate("u-expert", "call-1", { rating: 5 })).rejects.toThrow("仅通话发起方可评价");
  });

  it("评价状态：非 ENDED（WAITING/ONGOING/MISSED）→ 拒绝", async () => {
    mockGetCall({ ...endedCall(), status: "ONGOING" });
    await expect(svc.rate("u-caller", "call-1", { rating: 5 })).rejects.toThrow("仅已结算的通话可评价");
  });

  it("评价字数：文字超 200 字 → 拒绝", async () => {
    mockGetCall(endedCall());
    await expect(svc.rate("u-caller", "call-1", { rating: 5, comment: "字".repeat(201) })).rejects.toThrow("评价文字最多 200 字");
  });

  it("评价星级：越界（0 / 6）→ 拒绝", async () => {
    mockGetCall(endedCall());
    await expect(svc.rate("u-caller", "call-1", { rating: 0 })).rejects.toThrow("评分须为 1-5 星");
    mockGetCall(endedCall());
    await expect(svc.rate("u-caller", "call-1", { rating: 6 })).rejects.toThrow("评分须为 1-5 星");
  });

  // ───────── 24h 账单申诉 dispute ─────────

  it("申诉成功：24h 内首次 → 落 PENDING（disputedAt IS NULL 锚点），不动资金", async () => {
    mockGetCall(endedCall());
    const res = await svc.dispute("u-caller", "call-1", { reason: "时长与实际不符" });
    expect(res).toEqual({ id: "call-1", disputeStatus: "PENDING", disputeReason: "时长与实际不符" });
    expect(prisma.$executeRawUnsafe.mock.calls[0][0]).toContain(`"disputedAt" IS NULL`);
    expect(coin.spend).not.toHaveBeenCalled();
    expect(coin.refund).not.toHaveBeenCalled();
  });

  it("申诉 24h 窗口：结束超 24 小时 → 拒绝", async () => {
    mockGetCall({ ...endedCall(), endAt: new Date(Date.now() - 24 * 60 * 60 * 1000 - 60_000).toISOString() });
    await expect(svc.dispute("u-caller", "call-1", { reason: "金额有误" })).rejects.toThrow("申诉窗口已关闭");
  });

  it("申诉一次性：已申诉过 → 拒绝", async () => {
    mockGetCall({ ...endedCall(), disputedAt: new Date().toISOString() });
    await expect(svc.dispute("u-expert", "call-1", { reason: "再次申诉" })).rejects.toThrow("该账单已提交过申诉");
  });

  it("申诉权限：非通话当事人 → 拒绝；空原因 → 拒绝", async () => {
    mockGetCall(endedCall());
    await expect(svc.dispute("u-other", "call-1", { reason: "x" })).rejects.toThrow(BusinessException);
    mockGetCall(endedCall());
    await expect(svc.dispute("u-caller", "call-1", { reason: "   " })).rejects.toThrow("请填写申诉原因");
  });

  // ───────── 好评率聚合 expertRatingStats ─────────

  it("好评率聚合：好评率 = rating≥4 占比（四舍五入）·无评价的达人不返回", async () => {
    prisma.$queryRawUnsafe.mockResolvedValueOnce([
      { expertId: "e-1", ratingCount: 4, goodCount: 3 },
      { expertId: "e-2", ratingCount: 10, goodCount: 10 },
    ]);
    const res = await svc.expertRatingStats(["e-1", "e-2", "e-noRating"]);
    expect(res["e-1"]).toEqual({ ratingCount: 4, goodRate: 75 });
    expect(res["e-2"]).toEqual({ ratingCount: 10, goodRate: 100 });
    expect(res["e-noRating"]).toBeUndefined(); // 无评价不编数，前端不渲染
    expect(prisma.$queryRawUnsafe.mock.calls[0][0]).toContain(`"rating" >= 4`);
  });

  it("好评率聚合：空入参 → 返回 {} 且不查库", async () => {
    const res = await svc.expertRatingStats([]);
    expect(res).toEqual({});
    expect(prisma.$queryRawUnsafe).not.toHaveBeenCalled();
  });

  // ───────── 管理端处理申诉 resolveDispute ─────────

  it("处理申诉：仅 PENDING 可处理，成功只改状态+备注（资金零触碰）", async () => {
    mockGetCall({ ...endedCall(), disputedAt: new Date().toISOString(), disputeStatus: "PENDING" });
    const res = await svc.resolveDispute("admin-1", "call-1", { status: "RESOLVED", note: "核查属实，转人工退款审批" });
    expect(res).toEqual({ id: "call-1", disputeStatus: "RESOLVED", disputeResolveNote: "核查属实，转人工退款审批" });
    expect(prisma.$executeRawUnsafe.mock.calls[0][0]).toContain(`"disputeStatus"='PENDING'`);
    // 资金零触碰：处理端点绝不触发任何金币/分账操作
    expect(coin.spend).not.toHaveBeenCalled();
    expect(coin.refund).not.toHaveBeenCalled();
    expect(revenue.record).not.toHaveBeenCalled();
  });

  it("处理申诉：非 PENDING（已处理/未申诉）→ 拒绝", async () => {
    mockGetCall({ ...endedCall(), disputeStatus: "RESOLVED" });
    await expect(svc.resolveDispute("admin-1", "call-1", { status: "REJECTED" })).rejects.toThrow("该申诉不在待处理状态");
  });

  // ───────── 超时未接通自动退款 cron ─────────

  it("refundStaleWaitingCallsCron：扫 WAITING 超时→CAS 置 MISSED 并退金币·经 runExclusive", async () => {
    prisma.$queryRawUnsafe.mockResolvedValueOnce([{ id: "call-1", callerId: "u1", prepaidCoin: 100 }]);
    const tx = { $executeRawUnsafe: jest.fn().mockResolvedValue(1) };
    prisma.$transaction.mockImplementation((fn: any) => fn(tx));

    await svc.refundStaleWaitingCallsCron();

    expect(redis.runExclusive).toHaveBeenCalledWith("consult_call_refund_stale_waiting", 300, expect.any(Function));
    expect(tx.$executeRawUnsafe.mock.calls[0][0]).toContain(`"status"='MISSED'`);
    expect(coin.refund).toHaveBeenCalledWith("u1", 100, expect.stringContaining("超时未接通"), tx);
  });

  it("refundStaleWaitingCallsCron：期间已被接听(claimed=0)→不退款(防误退进行中通话)", async () => {
    prisma.$queryRawUnsafe.mockResolvedValueOnce([{ id: "call-1", callerId: "u1", prepaidCoin: 100 }]);
    const tx = { $executeRawUnsafe: jest.fn().mockResolvedValue(0) };
    prisma.$transaction.mockImplementation((fn: any) => fn(tx));

    await svc.refundStaleWaitingCallsCron();
    expect(coin.refund).not.toHaveBeenCalled();
  });
});
