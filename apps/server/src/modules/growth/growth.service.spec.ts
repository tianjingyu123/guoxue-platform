import { GrowthService } from "./growth.service";

/**
 * 入圈审批链路的治理接线单测（2026-07-11）：
 * ① 禁入拦截（#10 旁路补全）：REMOVE ACTIVE 者不能经审批绕回；
 * ② requireRuleAck 强制（TODO#5）：未确认圈规不能通过审批建成员；
 * 两类校验均在申请状态流转之前，校验不过时申请保持 PENDING 可再审。
 */
describe("GrowthService reviewJoinRequest 治理接线", () => {
  let svc: GrowthService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      circleMember: { findUnique: jest.fn(), create: jest.fn() },
      circle: { update: jest.fn(), findUnique: jest.fn().mockResolvedValue({ name: "测试圈" }) },
      circleGovernanceConfig: { findUnique: jest.fn().mockResolvedValue(null) },
      circleViolation: { findFirst: jest.fn().mockResolvedValue(null) },
      circleRule: { count: jest.fn().mockResolvedValue(0) },
      circleRuleAck: { findUnique: jest.fn().mockResolvedValue(null) },
      $queryRawUnsafe: jest.fn(),
      $executeRawUnsafe: jest.fn().mockResolvedValue(1),
      $transaction: jest.fn((arg: any) => (typeof arg === "function" ? arg(prisma) : Promise.all(arg))),
    };
    // GrowthService 依赖仅 prisma（notification @Optional·单测不注入）
    svc = new GrowthService(prisma);
    // ensureCircleAdmin：操作者为圈主
    prisma.circleMember.findUnique.mockResolvedValueOnce({ circleId: "c1", userId: "owner", role: "OWNER" });
    // 待审申请
    prisma.$queryRawUnsafe.mockResolvedValue([{ id: "req1", circleId: "c1", userId: "u9", status: "PENDING" }]);
  });

  it("禁入拦截：REMOVE ACTIVE 者审批通过被拒·申请保持 PENDING（不流转状态）", async () => {
    prisma.circleViolation.findFirst.mockResolvedValue({ id: "v1" });
    await expect(svc.reviewJoinRequest("c1", "req1", "owner", "approve")).rejects.toThrow("限制重新加入");
    expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled(); // 状态未流转
    expect(prisma.circleMember.create).not.toHaveBeenCalled();
  });

  it("requireRuleAck 强制：有圈规未确认时审批通过被拒（RULE_ACK_REQUIRED）", async () => {
    // 配置未落库 → 默认 requireRuleAck=true；圈规 2 条；无 ack 记录
    prisma.circleRule.count.mockResolvedValue(2);
    prisma.circleRuleAck.findUnique.mockResolvedValue(null);
    await expect(svc.reviewJoinRequest("c1", "req1", "owner", "approve")).rejects.toThrow("RULE_ACK_REQUIRED");
    expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled();
    expect(prisma.circleMember.create).not.toHaveBeenCalled();
  });

  it("无禁入+已确认圈规：审批通过正常建成员+memberCount+1", async () => {
    prisma.circleRule.count.mockResolvedValue(2);
    prisma.circleRuleAck.findUnique.mockResolvedValue({ id: "ack1" });
    prisma.circleMember.findUnique.mockResolvedValueOnce(null); // 第二次查：申请人还不是成员
    prisma.circleMember.create.mockResolvedValue({ id: "m1" });
    const res = await svc.reviewJoinRequest("c1", "req1", "owner", "approve");
    expect(res.success).toBe(true);
    expect(prisma.circleMember.create).toHaveBeenCalledWith({ data: { circleId: "c1", userId: "u9" } });
    expect(prisma.circle.update).toHaveBeenCalledWith({ where: { id: "c1" }, data: { memberCount: { increment: 1 } } });
  });

  it("驳回不做治理校验：直接流转 REJECTED", async () => {
    const res = await svc.reviewJoinRequest("c1", "req1", "owner", "reject", "不符合圈子定位");
    expect(res.status).toBe("REJECTED");
    expect(prisma.circleViolation.findFirst).not.toHaveBeenCalled();
    expect(prisma.circleRuleAck.findUnique).not.toHaveBeenCalled();
  });
});

describe("GrowthService checkin 原子性", () => {
  let svc: GrowthService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      circleMember: { findUnique: jest.fn().mockResolvedValue({ id: "member-1" }) },
      $queryRawUnsafe: jest.fn().mockResolvedValueOnce([]).mockResolvedValue([{ checkinExp: 10, checkinStreak: 1, totalCheckins: 1 }]),
      $executeRawUnsafe: jest.fn().mockResolvedValue(1),
      $transaction: jest.fn(async (run: (tx: any) => Promise<unknown>) => run(prisma)),
    };
    svc = new GrowthService(prisma);
  });

  it("签到记录和经验在同一事务内写入", async () => {
    const result = await svc.checkin("circle-1", "user-1");
    expect(result.alreadyChecked).toBe(false);
    expect(result.expGained).toBe(10);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.$executeRawUnsafe).toHaveBeenCalledTimes(2);
    expect(prisma.$executeRawUnsafe.mock.calls[0][0]).toContain('INSERT INTO "CircleCheckin"');
    expect(prisma.$executeRawUnsafe.mock.calls[1][0]).toContain('INSERT INTO "CircleMemberGrowth"');
  });

  it("唯一索引报告已签到时不重复累加经验", async () => {
    prisma.$executeRawUnsafe.mockResolvedValueOnce(0);
    const result = await svc.checkin("circle-1", "user-1");
    expect(result.alreadyChecked).toBe(true);
    expect(prisma.$executeRawUnsafe).toHaveBeenCalledTimes(1);
  });

  it("成长写入失败时不返回签到成功", async () => {
    prisma.$executeRawUnsafe.mockResolvedValueOnce(1).mockRejectedValueOnce(new Error("growth write failed"));
    await expect(svc.checkin("circle-1", "user-1")).rejects.toThrow("growth write failed");
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.$executeRawUnsafe).toHaveBeenCalledTimes(2);
  });
});

describe("GrowthService 连签榜口径", () => {
  const localToday = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  };

  it("独立按有效连签排名，不受成长榜前 20 名截断", async () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({
      userId: `high-${i}`, nickname: `成员${i}`, avatar: "", checkinExp: 1000 + i,
      checkinStreak: 1, lastCheckin: localToday(), posts: 0, likes: 0,
    }));
    rows.push({ userId: "me", nickname: "我", avatar: "", checkinExp: 70, checkinStreak: 7, lastCheckin: localToday(), posts: 0, likes: 0 });
    rows.push({ userId: "stale", nickname: "已断签", avatar: "", checkinExp: 2000, checkinStreak: 30, lastCheckin: "2020-01-01", posts: 0, likes: 0 });
    const prisma: any = {
      circleMember: { findUnique: jest.fn().mockResolvedValue({ joinedAt: new Date() }) },
      $queryRawUnsafe: jest.fn().mockResolvedValueOnce(rows).mockResolvedValueOnce([{ c: 0 }]),
    };
    const result = await new GrowthService(prisma).getGrowth("circle-1", "me");
    expect(result.leaderboard.some((item) => item.userId === "me")).toBe(false);
    expect(result.checkinLeaderboard[0]).toMatchObject({ userId: "me", rank: 1, checkinStreak: 7 });
    expect(result.checkinLeaderboard.some((item) => item.userId === "stale")).toBe(false);
    expect(result.myCheckinRank).toBe(1);
  });

  it("断签后日历返回有效连签 0，累计签到次数不丢", async () => {
    const prisma: any = {
      $queryRawUnsafe: jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([{ lastCheckin: "2020-01-01", checkinStreak: 9, totalCheckins: 12 }]),
    };
    const result = await new GrowthService(prisma).getCheckinCalendar("circle-1", "me");
    expect(result.checkinStreak).toBe(0);
    expect(result.totalCheckins).toBe(12);
  });
});
