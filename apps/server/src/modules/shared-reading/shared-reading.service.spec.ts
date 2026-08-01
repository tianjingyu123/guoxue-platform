import { Test } from "@nestjs/testing";
import { SharedReadingService, SHARED_READING_REWARD_EXP } from "./shared-reading.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { UserGrowthService } from "../user-growth/user-growth.service";
import { BusinessException } from "../../common/business.exception";

const mockPrisma = {
  classicBook: { findFirst: jest.fn() },
  classicChapter: { count: jest.fn() },
  readingProgress: { findUnique: jest.fn() },
  user: { findMany: jest.fn(), findUnique: jest.fn() },
  sharedReadingGroup: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
  sharedReadingMember: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    groupBy: jest.fn(),
  },
  // 共读结业成就直建（B1）
  userAchievement: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
};

const mockGrowth = { addExp: jest.fn().mockResolvedValue(undefined) };

describe("SharedReadingService", () => {
  let svc: SharedReadingService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        SharedReadingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: { runExclusive: (_n: string, _t: number, fn: () => Promise<unknown>) => fn() } },
        { provide: UserGrowthService, useValue: mockGrowth },
      ],
    }).compile();
    svc = mod.get(SharedReadingService);
  });

  beforeEach(() => jest.clearAllMocks());

  // 0. 超时兜底结算 cron（后端审计D8）
  it("settleExpiredGroupsCron：扫 READING+deadline 到期组，空成员组结算为 EXPIRED", async () => {
    mockPrisma.sharedReadingGroup.findMany.mockResolvedValue([
      { id: "g1", classicBookId: "b1", targetChapters: 10 },
    ]);
    mockPrisma.sharedReadingMember.findMany.mockResolvedValue([]); // 无成员 → allCompleted=false
    mockPrisma.sharedReadingGroup.update.mockResolvedValue({});

    await svc.settleExpiredGroupsCron();

    // 只扫 READING 且 deadline<=now
    expect(mockPrisma.sharedReadingGroup.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: "READING", deadline: expect.objectContaining({ lte: expect.any(Date) }) }) }),
    );
    // 结算流转为 EXPIRED
    expect(mockPrisma.sharedReadingGroup.update).toHaveBeenCalledWith(
      { where: { id: "g1" }, data: { status: "EXPIRED" } },
    );
  });

  // 1. 建组
  it("建组成功：校验书存在、目标章节缺省取书章节数、发起人入组 isLeader", async () => {
    mockPrisma.classicBook.findFirst.mockResolvedValue({ id: "b1", title: "论语", chapterCount: 20 });
    mockPrisma.sharedReadingGroup.create.mockResolvedValue({ id: "g1" });
    mockPrisma.sharedReadingMember.create.mockResolvedValue({});

    const res = await svc.createGroup("u1", { classicBookId: "b1" });

    expect(res.groupId).toBe("g1");
    expect(res.inviteToken).toHaveLength(32);
    expect(res.shareUrl).toContain(`token=${res.inviteToken}`);
    expect(mockPrisma.sharedReadingGroup.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ targetChapters: 20 }) }),
    );
    expect(mockPrisma.sharedReadingMember.create).toHaveBeenCalledWith({
      data: { groupId: "g1", userId: "u1", isLeader: true },
    });
  });

  it("建组失败：书不存在抛 CLASSIC_BOOK_NOT_FOUND", async () => {
    mockPrisma.classicBook.findFirst.mockResolvedValue(null);
    await expect(svc.createGroup("u1", { classicBookId: "x" })).rejects.toBeInstanceOf(BusinessException);
  });

  // 2. join 成功
  it("join 成功：RECRUITING 未满未加入 → 入组，人数未达 minMembers 不自动开读", async () => {
    mockPrisma.sharedReadingGroup.findUnique.mockResolvedValue({
      id: "g1",
      status: "RECRUITING",
      maxMembers: 5,
      minMembers: 3,
      durationDays: 7,
    });
    mockPrisma.sharedReadingMember.findUnique.mockResolvedValue(null);
    mockPrisma.sharedReadingMember.count.mockResolvedValue(1); // 已有1人
    mockPrisma.sharedReadingMember.create.mockResolvedValue({});

    const res = await svc.join("u2", "tok");
    expect(res.groupId).toBe("g1");
    expect(mockPrisma.sharedReadingMember.create).toHaveBeenCalled();
    expect(mockPrisma.sharedReadingGroup.updateMany).not.toHaveBeenCalled(); // 2 < 3 不开读
  });

  // 3. 满 minMembers 自动 READING
  it("join 达 minMembers 自动转 READING（写 startAt/deadline）", async () => {
    mockPrisma.sharedReadingGroup.findUnique.mockResolvedValue({
      id: "g1",
      status: "RECRUITING",
      maxMembers: 5,
      minMembers: 3,
      durationDays: 7,
    });
    mockPrisma.sharedReadingMember.findUnique.mockResolvedValue(null);
    mockPrisma.sharedReadingMember.count.mockResolvedValue(2); // +1 = 3 = min
    mockPrisma.sharedReadingMember.create.mockResolvedValue({});

    await svc.join("u3", "tok");
    expect(mockPrisma.sharedReadingGroup.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "g1", status: "RECRUITING" },
        data: expect.objectContaining({ status: "READING" }),
      }),
    );
  });

  // 4. 重复 join 拒
  it("重复 join 拒绝：已在组内抛异常", async () => {
    mockPrisma.sharedReadingGroup.findUnique.mockResolvedValue({
      id: "g1",
      status: "RECRUITING",
      maxMembers: 5,
      minMembers: 3,
      durationDays: 7,
    });
    mockPrisma.sharedReadingMember.findUnique.mockResolvedValue({ id: "m1" });
    await expect(svc.join("u2", "tok")).rejects.toBeInstanceOf(BusinessException);
    expect(mockPrisma.sharedReadingMember.create).not.toHaveBeenCalled();
  });

  // 5. 满员拒
  it("满员拒绝：已达 maxMembers 抛异常", async () => {
    mockPrisma.sharedReadingGroup.findUnique.mockResolvedValue({
      id: "g1",
      status: "RECRUITING",
      maxMembers: 5,
      minMembers: 3,
      durationDays: 7,
    });
    mockPrisma.sharedReadingMember.findUnique.mockResolvedValue(null);
    mockPrisma.sharedReadingMember.count.mockResolvedValue(5);
    await expect(svc.join("u9", "tok")).rejects.toBeInstanceOf(BusinessException);
    expect(mockPrisma.sharedReadingMember.create).not.toHaveBeenCalled();
  });

  // 6. 进度统计 completed 判定
  it("进度统计：当前章之前章节数 + 当前章读完 → completedChapters/completed 判定正确", async () => {
    // RECRUITING 组 → 不触发结算，仅测实时统计
    mockPrisma.sharedReadingGroup.findUnique.mockResolvedValue({
      id: "g1",
      status: "RECRUITING",
      classicBookId: "b1",
      bookTitle: "论语",
      targetChapters: 3,
      minMembers: 3,
      maxMembers: 5,
      deadline: null,
    });
    mockPrisma.sharedReadingMember.findMany.mockResolvedValue([
      { id: "m1", userId: "u1", isLeader: true, rewardedAt: null },
    ]);
    mockPrisma.user.findMany.mockResolvedValue([{ id: "u1", nickname: "甲", avatar: null }]);
    mockPrisma.readingProgress.findUnique.mockResolvedValue({ progress: 90, chapter: { sortOrder: 5 } });
    mockPrisma.classicChapter.count.mockResolvedValue(3); // 当前章之前 3 章

    const res = await svc.getDetail("g1", "u1");
    expect(res.members[0].completedChapters).toBe(4); // 3 + 1
    expect(res.members[0].completed).toBe(true); // 4 >= 3
    expect(res.myProgress).toEqual({ completedChapters: 4, completed: true });
  });

  // 7. 惰性结算发奖 + 防重
  it("惰性结算：全员完成 → 发学分 + 状态 COMPLETED；rewardedAt 已存在则不重发", async () => {
    mockPrisma.sharedReadingGroup.findUnique.mockResolvedValue({
      id: "g1",
      status: "READING",
      classicBookId: "b1",
      bookTitle: "论语",
      targetChapters: 1,
      minMembers: 3,
      maxMembers: 5,
      deadline: new Date(Date.now() + 86400000),
    });
    mockPrisma.sharedReadingMember.findMany.mockResolvedValue([
      { id: "m1", userId: "u1", isLeader: true, rewardedAt: null },
    ]);
    mockPrisma.user.findMany.mockResolvedValue([{ id: "u1", nickname: "甲", avatar: null }]);
    mockPrisma.readingProgress.findUnique.mockResolvedValue({ progress: 100, chapter: { sortOrder: 1 } });
    mockPrisma.classicChapter.count.mockResolvedValue(1); // completedChapters = 1+1 = 2 >= 1
    mockPrisma.sharedReadingMember.update.mockResolvedValue({});
    mockPrisma.sharedReadingMember.updateMany.mockResolvedValue({ count: 1 }); // 原子占位成功
    mockPrisma.sharedReadingGroup.update.mockResolvedValue({});

    const res = await svc.getDetail("g1", "u1");
    expect(mockGrowth.addExp).toHaveBeenCalledWith("u1", SHARED_READING_REWARD_EXP, "shared_reading");
    expect(res.status).toBe("COMPLETED");
    expect(mockPrisma.sharedReadingGroup.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "COMPLETED" } }),
    );
  });

  it("防重发：成员 rewardedAt 已有值 → 不再调用 addExp", async () => {
    mockPrisma.sharedReadingGroup.findUnique.mockResolvedValue({
      id: "g1",
      status: "READING",
      classicBookId: "b1",
      bookTitle: "论语",
      targetChapters: 1,
      minMembers: 3,
      maxMembers: 5,
      deadline: new Date(Date.now() + 86400000),
    });
    mockPrisma.sharedReadingMember.findMany.mockResolvedValue([
      { id: "m1", userId: "u1", isLeader: true, rewardedAt: new Date() }, // 已发过
    ]);
    mockPrisma.user.findMany.mockResolvedValue([{ id: "u1", nickname: "甲", avatar: null }]);
    mockPrisma.readingProgress.findUnique.mockResolvedValue({ progress: 100, chapter: { sortOrder: 1 } });
    mockPrisma.classicChapter.count.mockResolvedValue(1);
    mockPrisma.sharedReadingMember.update.mockResolvedValue({});
    mockPrisma.sharedReadingGroup.update.mockResolvedValue({});

    await svc.getDetail("g1", "u1");
    expect(mockGrowth.addExp).not.toHaveBeenCalled();
    expect(mockPrisma.sharedReadingMember.updateMany).not.toHaveBeenCalled();
  });

  // 8. deadline 过期
  it("deadline 到但未完成 → 状态 EXPIRED，未完成成员不发奖", async () => {
    mockPrisma.sharedReadingGroup.findUnique.mockResolvedValue({
      id: "g1",
      status: "READING",
      classicBookId: "b1",
      bookTitle: "论语",
      targetChapters: 10,
      minMembers: 3,
      maxMembers: 5,
      deadline: new Date(Date.now() - 1000), // 已过期
    });
    mockPrisma.sharedReadingMember.findMany.mockResolvedValue([
      { id: "m1", userId: "u1", isLeader: true, rewardedAt: null },
    ]);
    mockPrisma.user.findMany.mockResolvedValue([{ id: "u1", nickname: "甲", avatar: null }]);
    mockPrisma.readingProgress.findUnique.mockResolvedValue({ progress: 50, chapter: { sortOrder: 2 } });
    mockPrisma.classicChapter.count.mockResolvedValue(1); // completedChapters = 1 (progress<80) < 10
    mockPrisma.sharedReadingMember.update.mockResolvedValue({});
    mockPrisma.sharedReadingGroup.update.mockResolvedValue({});

    const res = await svc.getDetail("g1", "u1");
    expect(res.status).toBe("EXPIRED");
    expect(mockGrowth.addExp).not.toHaveBeenCalled();
  });

  // 9. leave 退组
  it("leave：RECRUITING 期普通成员退出成功", async () => {
    mockPrisma.sharedReadingGroup.findUnique.mockResolvedValue({
      id: "g1",
      status: "RECRUITING",
      initiatorId: "u1",
    });
    mockPrisma.sharedReadingMember.findUnique.mockResolvedValue({ id: "m2" });
    mockPrisma.sharedReadingMember.delete.mockResolvedValue({});

    const res = await svc.leave("u2", "g1");
    expect(res).toEqual({ left: true });
    expect(mockPrisma.sharedReadingMember.delete).toHaveBeenCalledWith({ where: { id: "m2" } });
  });

  // 10. 发起人解散
  it("leave：发起人退出 = 解散整组（删成员+删组）", async () => {
    mockPrisma.sharedReadingGroup.findUnique.mockResolvedValue({
      id: "g1",
      status: "RECRUITING",
      initiatorId: "u1",
    });
    mockPrisma.sharedReadingMember.deleteMany.mockResolvedValue({ count: 2 });
    mockPrisma.sharedReadingGroup.delete.mockResolvedValue({});

    const res = await svc.leave("u1", "g1");
    expect(res).toEqual({ dissolved: true });
    expect(mockPrisma.sharedReadingMember.deleteMany).toHaveBeenCalledWith({ where: { groupId: "g1" } });
    expect(mockPrisma.sharedReadingGroup.delete).toHaveBeenCalledWith({ where: { id: "g1" } });
  });

  it("leave：READING 后不可退出", async () => {
    mockPrisma.sharedReadingGroup.findUnique.mockResolvedValue({
      id: "g1",
      status: "READING",
      initiatorId: "u1",
    });
    await expect(svc.leave("u2", "g1")).rejects.toBeInstanceOf(BusinessException);
  });

  // 11. 手动开读
  it("start：发起人满 minMembers → READING", async () => {
    mockPrisma.sharedReadingGroup.findUnique.mockResolvedValue({
      id: "g1",
      status: "RECRUITING",
      initiatorId: "u1",
      minMembers: 3,
      durationDays: 7,
    });
    mockPrisma.sharedReadingMember.count.mockResolvedValue(3);
    mockPrisma.sharedReadingGroup.update.mockResolvedValue({});

    const res = await svc.start("u1", "g1");
    expect(res.status).toBe("READING");
    expect(mockPrisma.sharedReadingGroup.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "READING" }) }),
    );
  });

  it("start：非发起人拒绝", async () => {
    mockPrisma.sharedReadingGroup.findUnique.mockResolvedValue({
      id: "g1",
      status: "RECRUITING",
      initiatorId: "u1",
      minMembers: 3,
      durationDays: 7,
    });
    await expect(svc.start("u2", "g1")).rejects.toBeInstanceOf(BusinessException);
  });
});
