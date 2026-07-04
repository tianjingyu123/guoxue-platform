import { Test } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { StageFlowService } from "./stage-flow.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

const mockPrisma: any = {
  competition: {
    findUnique: jest.fn(),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
  },
  competitionStage: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    updateMany: jest.fn(),
  },
  competitionRound: {
    findMany: jest.fn().mockResolvedValue([]),
  },
  competitionRegistration: {
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    update: jest.fn().mockResolvedValue({}),
  },
  competitionRanking: {
    findMany: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    createMany: jest.fn().mockResolvedValue({ count: 0 }),
    groupBy: jest.fn().mockResolvedValue([]),
  },
  competitionScore: {
    findMany: jest.fn().mockResolvedValue([]),
  },
  competitionAnswer: {
    count: jest.fn().mockResolvedValue(0),
  },
  notification: {
    createMany: jest.fn().mockResolvedValue({ count: 0 }),
  },
  auditLog: {
    create: jest.fn().mockResolvedValue({}),
  },
  $transaction: jest.fn(async (arg: any) => (typeof arg === "function" ? arg(mockPrisma) : Promise.all(arg))),
};

const mockRedis = {
  setNX: jest.fn().mockResolvedValue(true),
  runExclusive: jest.fn((_n: string, _t: number, fn: () => Promise<unknown>) => fn()),
};

const COMP = { id: "c1", title: "经学杯", status: "PUBLISHED" };
const now = new Date("2026-07-04T12:00:00Z");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600 * 1000);
const hoursLater = (h: number) => new Date(now.getTime() + h * 3600 * 1000);

/** 造一个阶段行（含 competition include） */
function makeStage(overrides: Record<string, unknown> = {}) {
  return {
    id: "st1",
    competitionId: "c1",
    seq: 1,
    name: "海选·答题",
    format: "QUIZ",
    startAt: hoursAgo(2),
    endAt: hoursLater(2),
    advanceRule: { type: "count", value: 2 },
    status: "PENDING",
    competition: COMP,
    ...overrides,
  };
}

/** runFlow 三段扫描的 findMany 依次返回：收卷(RUNNING) / 判分(JUDGING) / 开赛(PENDING) */
function mockScans(running: unknown[], judging: unknown[], pending: unknown[]) {
  mockPrisma.competitionStage.findMany
    .mockResolvedValueOnce(running)
    .mockResolvedValueOnce(judging)
    .mockResolvedValueOnce(pending);
}

describe("StageFlowService", () => {
  let service: StageFlowService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        StageFlowService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();
    service = mod.get(StageFlowService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // 恢复常用默认值（clearAllMocks 会清掉 mockResolvedValue 的实现）
    mockPrisma.competition.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.competitionStage.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.competitionStage.findUnique.mockResolvedValue(null);
    mockPrisma.competitionRound.findMany.mockResolvedValue([]);
    mockPrisma.competitionRegistration.findMany.mockResolvedValue([]);
    mockPrisma.competitionRegistration.update.mockResolvedValue({});
    mockPrisma.competitionRanking.findMany.mockResolvedValue([]);
    mockPrisma.competitionRanking.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.competitionRanking.createMany.mockResolvedValue({ count: 0 });
    mockPrisma.competitionScore.findMany.mockResolvedValue([]);
    mockPrisma.competitionAnswer.count.mockResolvedValue(0);
    mockPrisma.notification.createMany.mockResolvedValue({ count: 0 });
    mockPrisma.auditLog.create.mockResolvedValue({});
    mockPrisma.$transaction.mockImplementation(async (arg: any) =>
      typeof arg === "function" ? arg(mockPrisma) : Promise.all(arg));
    mockRedis.setNX.mockResolvedValue(true);
    mockRedis.runExclusive.mockImplementation((_n: string, _t: number, fn: () => Promise<unknown>) => fn());
  });

  // ═══════ cron 入口 ═══════

  it("cron 走 runExclusive 锁 competition-stage-flow", async () => {
    mockScans([], [], []);
    await service.flowCron();
    expect(mockRedis.runExclusive).toHaveBeenCalledWith(
      "competition-stage-flow", expect.any(Number), expect.any(Function),
    );
  });

  // ═══════ ① PENDING → RUNNING ═══════

  it("PENDING 且 startAt 已到 → RUNNING·赛事整体开赛·通知有效报名者开赛", async () => {
    const stage = makeStage({ startAt: hoursAgo(1), status: "PENDING" });
    mockScans([], [], [stage]);
    mockPrisma.competitionRegistration.findMany.mockResolvedValue([
      { id: "r1", userId: "u1", extraData: null },
      { id: "r2", userId: "u2", extraData: null },
      { id: "r3", userId: "u3", extraData: null },
    ]);

    const stats = await service.runFlow(now);
    expect(stats.started).toBe(1);

    // CAS 翻转带旧状态条件
    expect(mockPrisma.competitionStage.updateMany).toHaveBeenCalledWith({
      where: { id: "st1", status: "PENDING" },
      data: { status: "RUNNING" },
    });
    // 赛事整体 PUBLISHED→IN_PROGRESS（CAS 幂等）
    expect(mockPrisma.competition.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "c1", status: "PUBLISHED" } }),
    );
    // 开赛通知覆盖 3 名有效报名者
    const rows = mockPrisma.notification.createMany.mock.calls[0][0].data;
    expect(rows).toHaveLength(3);
    expect(rows[0].title).toContain("开赛");
    expect(rows.map((r: any) => r.userId).sort()).toEqual(["u1", "u2", "u3"]);
  });

  it("上一阶段未收官时下一阶段暂缓开赛（名单未定不抢跑）", async () => {
    const stage2 = makeStage({ id: "st2", seq: 2, status: "PENDING", startAt: hoursAgo(1) });
    mockScans([], [], [stage2]);
    mockPrisma.competitionStage.findUnique.mockResolvedValue({
      id: "st1", seq: 1, name: "海选", status: "JUDGING",
    });

    const stats = await service.runFlow(now);
    expect(stats.started).toBe(0);
    expect(mockPrisma.competitionStage.updateMany).not.toHaveBeenCalled();
  });

  // ═══════ ② RUNNING → JUDGING ═══════

  it("RUNNING 且 endAt 已过 → JUDGING（收卷）", async () => {
    const stage = makeStage({ status: "RUNNING", startAt: hoursAgo(4), endAt: hoursAgo(1) });
    mockScans([stage], [], []);

    const stats = await service.runFlow(now);
    expect(stats.toJudging).toBe(1);
    expect(mockPrisma.competitionStage.updateMany).toHaveBeenCalledWith({
      where: { id: "st1", status: "RUNNING" },
      data: { status: "JUDGING" },
    });
  });

  // ═══════ ③ JUDGING → DONE（count 规则·非末阶段） ═══════

  it("JUDGING 成绩齐 → count 规则切晋级线·阶段榜 PROMOTED/ELIMINATED·双话术通知 → DONE", async () => {
    const stage = makeStage({
      status: "JUDGING", startAt: hoursAgo(4), endAt: hoursAgo(1),
      advanceRule: { type: "count", value: 2 },
      competition: { ...COMP, status: "IN_PROGRESS" },
    });
    mockScans([], [stage], []);
    // 存在下一阶段 → 非末阶段
    mockPrisma.competitionStage.findUnique.mockResolvedValue({
      id: "st2", seq: 2, name: "决赛·直播PK", startAt: hoursLater(3), endAt: hoursLater(5),
    });
    mockPrisma.competitionRegistration.findMany.mockResolvedValue([
      { id: "r1", userId: "u1", extraData: null },
      { id: "r2", userId: "u2", extraData: null },
      { id: "r3", userId: "u3", extraData: null },
    ]);
    // 阶段窗口内一个 round，三人成绩 90/80/70
    mockPrisma.competitionRound.findMany.mockResolvedValue([
      { id: "rd1", startAt: hoursAgo(4), endAt: hoursAgo(1) },
    ]);
    mockPrisma.competitionScore.findMany.mockResolvedValue([
      { registrationId: "r1", totalScore: 90 },
      { registrationId: "r2", totalScore: 80 },
      { registrationId: "r3", totalScore: 70 },
    ]);

    const stats = await service.runFlow(now);
    expect(stats.settled).toBe(1);

    // 阶段榜：roundId=stage.id·前2晋级后1淘汰·分数降序排名
    expect(mockPrisma.competitionRanking.deleteMany).toHaveBeenCalledWith({
      where: { competitionId: "c1", roundId: "st1" },
    });
    const rows = mockPrisma.competitionRanking.createMany.mock.calls[0][0].data;
    expect(rows).toEqual([
      expect.objectContaining({ userId: "u1", roundId: "st1", rank: 1, score: 90, status: "PROMOTED" }),
      expect.objectContaining({ userId: "u2", roundId: "st1", rank: 2, score: 80, status: "PROMOTED" }),
      expect.objectContaining({ userId: "u3", roundId: "st1", rank: 3, score: 70, status: "ELIMINATED" }),
    ]);
    // 阶段 CAS → DONE
    expect(mockPrisma.competitionStage.updateMany).toHaveBeenCalledWith({
      where: { id: "st1", status: "JUDGING" },
      data: { status: "DONE" },
    });
    // Registration.extraData 晋级快照 ×3
    expect(mockPrisma.competitionRegistration.update).toHaveBeenCalledTimes(3);
    // 双话术：晋级 2 人 + 淘汰 1 人
    const calls = mockPrisma.notification.createMany.mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[0][0].data).toHaveLength(2);
    expect(calls[0][0].data[0].title).toContain("晋级");
    expect(calls[1][0].data).toHaveLength(1);
    expect(calls[1][0].data[0].title).toContain("成绩公布");
  });

  it("percent 规则：4 人 50% → 晋级 2 人", async () => {
    const stage = makeStage({
      status: "JUDGING", startAt: hoursAgo(4), endAt: hoursAgo(1),
      advanceRule: { type: "percent", value: 50 },
      competition: { ...COMP, status: "IN_PROGRESS" },
    });
    mockScans([], [stage], []);
    mockPrisma.competitionStage.findUnique.mockResolvedValue({
      id: "st2", seq: 2, name: "决赛", startAt: hoursLater(3), endAt: hoursLater(5),
    });
    mockPrisma.competitionRegistration.findMany.mockResolvedValue([
      { id: "r1", userId: "u1", extraData: null },
      { id: "r2", userId: "u2", extraData: null },
      { id: "r3", userId: "u3", extraData: null },
      { id: "r4", userId: "u4", extraData: null },
    ]);
    mockPrisma.competitionScore.findMany.mockResolvedValue([
      { registrationId: "r1", totalScore: 90 },
      { registrationId: "r2", totalScore: 80 },
      { registrationId: "r3", totalScore: 70 },
      { registrationId: "r4", totalScore: 60 },
    ]);

    await service.runFlow(now);
    const rows = mockPrisma.competitionRanking.createMany.mock.calls[0][0].data;
    expect(rows.filter((r: any) => r.status === "PROMOTED")).toHaveLength(2);
    expect(rows.filter((r: any) => r.status === "ELIMINATED")).toHaveLength(2);
  });

  it("成绩未齐（存在未评分答卷）保持 JUDGING 等待，不切榜不通知", async () => {
    const stage = makeStage({
      status: "JUDGING", format: "LIVE_PK", startAt: hoursAgo(4), endAt: hoursAgo(1),
      competition: { ...COMP, status: "IN_PROGRESS" },
    });
    mockScans([], [stage], []);
    mockPrisma.competitionStage.findUnique.mockResolvedValue({ id: "st2", seq: 2, name: "决赛" });
    mockPrisma.competitionRegistration.findMany.mockResolvedValue([
      { id: "r1", userId: "u1", extraData: null },
    ]);
    mockPrisma.competitionRound.findMany.mockResolvedValue([
      { id: "rd1", startAt: hoursAgo(4), endAt: hoursAgo(1) },
    ]);
    mockPrisma.competitionAnswer.count.mockResolvedValue(3); // 3 份未评分

    const stats = await service.runFlow(now);
    expect(stats.settled).toBe(0);
    expect(mockPrisma.competitionStage.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.competitionRanking.createMany).not.toHaveBeenCalled();
    expect(mockPrisma.notification.createMany).not.toHaveBeenCalled();
  });

  // ═══════ ④ 末阶段收官 ═══════

  it("末阶段 JUDGING → 终榜 CHAMPION/RUNNER_UP/THIRD_PLACE(roundId=null) → 赛事 FINISHED", async () => {
    const stage = makeStage({
      id: "st2", seq: 2, name: "决赛·直播PK", status: "JUDGING", advanceRule: null,
      startAt: hoursAgo(4), endAt: hoursAgo(1),
      competition: { ...COMP, status: "IN_PROGRESS" },
    });
    mockScans([], [stage], []);
    // seq-1 查上一阶段（DONE）·seq+1 查下一阶段（不存在 → 末阶段）
    mockPrisma.competitionStage.findUnique.mockImplementation(async (args: any) => {
      const seq = args?.where?.competitionId_seq?.seq;
      return seq === 1 ? { id: "st1", seq: 1, name: "海选", status: "DONE" } : null;
    });
    // 上一阶段晋级者 = u1/u2/u3
    mockPrisma.competitionRanking.findMany.mockResolvedValue([
      { userId: "u1" }, { userId: "u2" }, { userId: "u3" },
    ]);
    mockPrisma.competitionRegistration.findMany.mockResolvedValue([
      { id: "r1", userId: "u1", extraData: null },
      { id: "r2", userId: "u2", extraData: null },
      { id: "r3", userId: "u3", extraData: null },
    ]);
    mockPrisma.competitionScore.findMany.mockResolvedValue([
      { registrationId: "r1", totalScore: 95 },
      { registrationId: "r2", totalScore: 85 },
      { registrationId: "r3", totalScore: 75 },
    ]);

    const stats = await service.runFlow(now);
    expect(stats.settled).toBe(1);

    // 终榜 roundId=null·删旧写新防 NULL 唯一约束漏洞下的重复
    expect(mockPrisma.competitionRanking.deleteMany).toHaveBeenCalledWith({
      where: { competitionId: "c1", roundId: null },
    });
    const rows = mockPrisma.competitionRanking.createMany.mock.calls[0][0].data;
    expect(rows.map((r: any) => r.status)).toEqual(["CHAMPION", "RUNNER_UP", "THIRD_PLACE"]);
    expect(rows.every((r: any) => r.roundId === null)).toBe(true);
    // 赛事整体收官
    expect(mockPrisma.competition.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "c1", status: { in: ["PUBLISHED", "IN_PROGRESS"] } },
        data: expect.objectContaining({ status: "FINISHED" }),
      }),
    );
    // 收官通知含获奖话术
    const notif = mockPrisma.notification.createMany.mock.calls[0][0].data;
    expect(notif[0].content).toContain("冠军");
    expect(notif[2].content).toContain("季军");
  });

  // ═══════ 幂等重跑 ═══════

  it("幂等：CAS 抢不到（count=0）不重复通知不计数", async () => {
    const stage = makeStage({ startAt: hoursAgo(1), status: "PENDING" });
    mockScans([], [], [stage]);
    mockPrisma.competitionStage.updateMany.mockResolvedValue({ count: 0 }); // 并发已翻转

    const stats = await service.runFlow(now);
    expect(stats.started).toBe(0);
    expect(mockPrisma.notification.createMany).not.toHaveBeenCalled();
  });

  it("幂等：重跑时 setNX 去重命中 → 状态可补翻但通知不重发", async () => {
    const stage = makeStage({ startAt: hoursAgo(1), status: "PENDING" });
    mockScans([], [], [stage]);
    mockPrisma.competitionRegistration.findMany.mockResolvedValue([
      { id: "r1", userId: "u1", extraData: null },
    ]);
    mockRedis.setNX.mockResolvedValue(false); // 上次已发过

    const stats = await service.runFlow(now);
    expect(stats.started).toBe(1);
    expect(mockPrisma.notification.createMany).not.toHaveBeenCalled();
  });

  // ═══════ 人工兜底 forceAdvance ═══════

  it("人工强制推进 JUDGING：跳过成绩齐闸并写审计留痕", async () => {
    mockPrisma.competition.findUnique.mockResolvedValue({ ...COMP, status: "IN_PROGRESS" });
    mockPrisma.competitionStage.findUnique.mockImplementation(async (args: any) => {
      const seq = args?.where?.competitionId_seq?.seq;
      if (seq === 1) {
        return {
          id: "st1", competitionId: "c1", seq: 1, name: "海选·答题", format: "QUIZ",
          startAt: hoursAgo(4), endAt: hoursAgo(1),
          advanceRule: { type: "count", value: 1 }, status: "JUDGING",
        };
      }
      return seq === 2 ? { id: "st2", seq: 2, name: "决赛", startAt: hoursLater(3), endAt: hoursLater(5) } : null;
    });
    mockPrisma.competitionRegistration.findMany.mockResolvedValue([
      { id: "r1", userId: "u1", extraData: null },
      { id: "r2", userId: "u2", extraData: null },
    ]);
    mockPrisma.competitionAnswer.count.mockResolvedValue(99); // 大量未评分·force 应跳过该闸

    const result = await service.forceAdvance("c1", 1, "admin1", "127.0.0.1");
    expect(result.from).toBe("JUDGING");
    expect(result.to).toBe("DONE");
    expect(result.promoted).toBe(1);
    // 审计留痕
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "admin1",
          action: "competition.stage.force_advance",
          targetType: "CompetitionStage",
          targetId: "st1",
          ip: "127.0.0.1",
        }),
      }),
    );
  });

  it("人工推进 PENDING → RUNNING（跳过时间闸）", async () => {
    mockPrisma.competition.findUnique.mockResolvedValue(COMP);
    mockPrisma.competitionStage.findUnique.mockImplementation(async (args: any) => {
      const seq = args?.where?.competitionId_seq?.seq;
      // startAt 在未来·人工强开
      return seq === 1
        ? { id: "st1", competitionId: "c1", seq: 1, name: "海选", format: "QUIZ", startAt: hoursLater(5), endAt: hoursLater(8), advanceRule: null, status: "PENDING" }
        : null;
    });

    const result = await service.forceAdvance("c1", 1, "admin1");
    expect(result.to).toBe("RUNNING");
    expect(mockPrisma.auditLog.create).toHaveBeenCalled();
  });

  it("已完结阶段拒绝推进；赛事/阶段不存在报 404", async () => {
    mockPrisma.competition.findUnique.mockResolvedValue(COMP);
    mockPrisma.competitionStage.findUnique.mockResolvedValue({
      id: "st1", competitionId: "c1", seq: 1, name: "海选", status: "DONE",
      startAt: hoursAgo(4), endAt: hoursAgo(1), format: "QUIZ", advanceRule: null,
    });
    await expect(service.forceAdvance("c1", 1, "admin1")).rejects.toThrow(BadRequestException);

    mockPrisma.competitionStage.findUnique.mockResolvedValue(null);
    await expect(service.forceAdvance("c1", 9, "admin1")).rejects.toThrow(NotFoundException);

    mockPrisma.competition.findUnique.mockResolvedValue(null);
    await expect(service.forceAdvance("nope", 1, "admin1")).rejects.toThrow(NotFoundException);
  });

  // ═══════ 进程监控 ═══════

  it("flow-status 聚合各阶段晋级/淘汰计数与当前阶段", async () => {
    mockPrisma.competition.findUnique.mockResolvedValue({
      id: "c1", title: "经学杯", status: "IN_PROGRESS", format: "HYBRID",
      startedAt: hoursAgo(4), finishedAt: null,
    });
    mockPrisma.competitionStage.findMany.mockResolvedValue([
      { id: "st1", seq: 1, name: "海选", format: "QUIZ", status: "DONE", startAt: hoursAgo(4), endAt: hoursAgo(2), advanceRule: { type: "count", value: 2 } },
      { id: "st2", seq: 2, name: "决赛", format: "LIVE_PK", status: "RUNNING", startAt: hoursAgo(1), endAt: hoursLater(1), advanceRule: null },
    ]);
    mockPrisma.competitionRegistration.count.mockResolvedValue(10);
    mockPrisma.competitionRanking.groupBy.mockResolvedValue([
      { roundId: "st1", status: "PROMOTED", _count: { _all: 2 } },
      { roundId: "st1", status: "ELIMINATED", _count: { _all: 8 } },
    ]);

    const result = await service.getFlowStatus("c1");
    expect(result.activeRegistrations).toBe(10);
    expect(result.currentSeq).toBe(2);
    expect(result.stages[0].promotedCount).toBe(2);
    expect(result.stages[0].eliminatedCount).toBe(8);
    expect(result.stages[1].promotedCount).toBe(0);
    expect(result.finalRanking).toBeNull();
  });
});
