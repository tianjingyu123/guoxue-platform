import { Test } from "@nestjs/testing";
import { SolarTermService } from "./solar-term.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { NotificationService } from "../notification/notification.service";
import { BusinessException } from "../../common/business.exception";
import { getTermByName, ACH_SOLAR_TERM_RITUAL } from "./solar-term.constants";

const mockPrisma = {
  solarTermParticipation: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  userAchievement: {
    findMany: jest.fn(),
    createMany: jest.fn(),
  },
  trackEvent: {
    findMany: jest.fn(),
  },
};

// runExclusive 直接执行传入的 fn（单实例测试）
const mockRedis = {
  runExclusive: jest.fn((_name: string, _ttl: number, fn: () => Promise<unknown>) => fn()),
};

const mockNotification = {
  batchSend: jest.fn().mockResolvedValue({ success: true }),
};

const lichun = getTermByName("立春")!;

describe("SolarTermService", () => {
  let svc: SolarTermService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        SolarTermService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: NotificationService, useValue: mockNotification },
      ],
    }).compile();
    svc = mod.get(SolarTermService);
  });

  beforeEach(() => jest.clearAllMocks());

  // 1. today 节气日
  it("today：节气日返回当期内容 + 下一节气", async () => {
    jest.spyOn(svc as unknown as { findTodayTerm: () => unknown }, "findTodayTerm").mockReturnValue(lichun);
    jest.spyOn(svc as unknown as { findNextTerm: () => unknown }, "findNextTerm").mockReturnValue({ name: "雨水", daysUntil: 15 });

    const res = await svc.today();

    expect(res.isSolarTermDay).toBe(true);
    expect(res.current?.name).toBe("立春");
    expect(res.current?.poem).toBe(lichun.poem);
    expect(res.next).toEqual({ name: "雨水", daysUntil: 15 });
    expect(res.myParticipated).toBe(false);
  });

  // 2. today 非节气日
  it("today：非节气日 current 为 null 但仍给 next", async () => {
    jest.spyOn(svc as unknown as { findTodayTerm: () => unknown }, "findTodayTerm").mockReturnValue(null);
    jest.spyOn(svc as unknown as { findNextTerm: () => unknown }, "findNextTerm").mockReturnValue({ name: "立春", daysUntil: 10 });

    const res = await svc.today();

    expect(res.isSolarTermDay).toBe(false);
    expect(res.current).toBeNull();
    expect(res.next.name).toBe("立春");
    expect(res.next.daysUntil).toBe(10);
  });

  // 3. participate 成功颁成就
  it("participate：节气日成功建记录 + 颁发首次成就", async () => {
    jest.spyOn(svc as unknown as { findTodayTerm: () => unknown }, "findTodayTerm").mockReturnValue(lichun);
    mockPrisma.solarTermParticipation.create.mockResolvedValue({ id: "p1" });
    mockPrisma.solarTermParticipation.findMany.mockResolvedValue([{ termName: "立春" }]);
    mockPrisma.userAchievement.findMany.mockResolvedValue([]);
    mockPrisma.userAchievement.createMany.mockResolvedValue({ count: 1 });

    const res = await svc.participate("u1");

    expect(res.term).toBe("立春");
    expect(res.totalTerms).toBe(1);
    expect(res.newAchievements).toContain(ACH_SOLAR_TERM_RITUAL);
    expect(mockPrisma.userAchievement.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true }),
    );
  });

  // 4. participate 非节气日拒
  it("participate：非节气日抛 400「今日非节气日」", async () => {
    jest.spyOn(svc as unknown as { findTodayTerm: () => unknown }, "findTodayTerm").mockReturnValue(null);

    await expect(svc.participate("u1")).rejects.toBeInstanceOf(BusinessException);
    expect(mockPrisma.solarTermParticipation.create).not.toHaveBeenCalled();
  });

  // 5. participate 重复拒
  it("participate：撞唯一约束(P2002)抛「今日已参与」", async () => {
    jest.spyOn(svc as unknown as { findTodayTerm: () => unknown }, "findTodayTerm").mockReturnValue(lichun);
    mockPrisma.solarTermParticipation.create.mockRejectedValue({ code: "P2002" });

    await expect(svc.participate("u1")).rejects.toBeInstanceOf(BusinessException);
    expect(mockPrisma.userAchievement.createMany).not.toHaveBeenCalled();
  });

  // 6. my 集齐进度
  it("my：去重统计 + collectProgress x/24", async () => {
    mockPrisma.solarTermParticipation.findMany.mockResolvedValue([
      { termName: "立春", year: 2026, participatedAt: new Date() },
      { termName: "雨水", year: 2026, participatedAt: new Date() },
      { termName: "惊蛰", year: 2026, participatedAt: new Date() },
    ]);

    const res = await svc.my("u1");

    expect(res.totalUniqueTerms).toBe(3);
    expect(res.collectProgress).toBe("3/24");
    expect(res.participated).toHaveLength(3);
  });

  // 7. cron 节气日推送
  it("dailyPush：节气日给活跃用户批量推送", async () => {
    jest.spyOn(svc as unknown as { findTodayTerm: () => unknown }, "findTodayTerm").mockReturnValue(lichun);
    mockPrisma.trackEvent.findMany.mockResolvedValue([{ userId: "u1" }, { userId: "u2" }]);

    await svc.dailyPush();

    expect(mockRedis.runExclusive).toHaveBeenCalled();
    expect(mockNotification.batchSend).toHaveBeenCalledWith(
      expect.objectContaining({ userIds: ["u1", "u2"], type: "SYSTEM" }),
    );
  });

  // 8. cron 非节气日跳过
  it("dailyPush：非节气日不推送", async () => {
    jest.spyOn(svc as unknown as { findTodayTerm: () => unknown }, "findTodayTerm").mockReturnValue(null);

    await svc.dailyPush();

    expect(mockNotification.batchSend).not.toHaveBeenCalled();
  });
});
