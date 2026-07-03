import { Test } from "@nestjs/testing";
import { UserGrowthService } from "./user-growth.service";
import { PrismaService } from "../../prisma/prisma.service";

const mockPrisma = {
  userGrowth: { upsert: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
  userAchievement: { findMany: jest.fn(), createMany: jest.fn() },
  userTitle: { findMany: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(), createMany: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
  mentorship: { findFirst: jest.fn(), update: jest.fn() },
  $transaction: jest.fn(),
};

describe("UserGrowthService", () => {
  let svc: UserGrowthService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [UserGrowthService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    svc = mod.get(UserGrowthService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.userAchievement.findMany.mockResolvedValue([]);
    mockPrisma.userAchievement.createMany.mockResolvedValue({ count: 0 });
    // 称号体系默认：未获任何称号、无佩戴
    mockPrisma.userTitle.findMany.mockResolvedValue([]);
    mockPrisma.userTitle.findUnique.mockResolvedValue(null);
    mockPrisma.userTitle.findFirst.mockResolvedValue(null);
    mockPrisma.userTitle.createMany.mockResolvedValue({ count: 0 });
    mockPrisma.userTitle.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.$transaction.mockResolvedValue([]);
    // 默认无 ACTIVE 师父（传道值钩子不触发）
    mockPrisma.mentorship.findFirst.mockResolvedValue(null);
    mockPrisma.mentorship.update.mockResolvedValue({});
  });

  describe("levelOf — 功名阶梯", () => {
    it("学分边界正确映射等级", () => {
      expect(svc.levelOf(0)).toMatchObject({ level: 1, name: "书童", nextExp: 50 });
      expect(svc.levelOf(49)).toMatchObject({ level: 1, name: "书童" });
      expect(svc.levelOf(150)).toMatchObject({ level: 3, name: "秀才" });
      expect(svc.levelOf(8000)).toMatchObject({ level: 10, name: "宗师", nextExp: null });
    });
  });

  describe("onCheckin — 打卡成长钩子", () => {
    it("加学分+同步连续天数+晋级重算+成就评估", async () => {
      mockPrisma.userGrowth.upsert.mockResolvedValue({ userId: "u1", totalExp: 150, maxStreak: 3, level: 1 });
      mockPrisma.userGrowth.findUnique.mockResolvedValue({ userId: "u1", totalExp: 160, level: 1, currentStreak: 7, maxStreak: 7 });
      await svc.onCheckin("u1", 7);
      // 晋级：160 学分 = 秀才(level 3)，档案 level=1 需重算
      expect(mockPrisma.userGrowth.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ level: 3 }) }),
      );
      // 成就：streak 7 → streak_7；level 3 → level_xiucai；首次打卡 first_checkin
      const awarded = mockPrisma.userAchievement.createMany.mock.calls[0][0].data.map((d: any) => d.code);
      expect(awarded).toEqual(expect.arrayContaining(["first_checkin", "streak_7", "level_xiucai"]));
    });

    it("已拥有的成就不重复颁发", async () => {
      mockPrisma.userGrowth.upsert.mockResolvedValue({ userId: "u1", totalExp: 10, maxStreak: 5, level: 1 });
      mockPrisma.userGrowth.findUnique.mockResolvedValue({ userId: "u1", totalExp: 20, level: 1, currentStreak: 2, maxStreak: 5 });
      mockPrisma.userAchievement.findMany.mockResolvedValue([{ code: "first_checkin" }]);
      await svc.onCheckin("u1", 2);
      expect(mockPrisma.userAchievement.createMany).not.toHaveBeenCalled();
    });

    it("内部异常自吞不外抛（不影响签到主流程）", async () => {
      mockPrisma.userGrowth.upsert.mockRejectedValue(new Error("db down"));
      await expect(svc.onCheckin("u1", 1)).resolves.toBeUndefined();
    });
  });

  describe("传道值钩子 — 徒弟成长反哺师父荣誉（R1 合规·纯荣誉）", () => {
    it("徒弟打卡 → 师父传道值 +2（双写 UserGrowth + Mentorship）", async () => {
      mockPrisma.userGrowth.upsert.mockResolvedValue({ userId: "d1", totalExp: 10, maxStreak: 1, level: 1 });
      mockPrisma.userGrowth.findUnique.mockResolvedValue({ userId: "d1", totalExp: 20, level: 1, currentStreak: 1, maxStreak: 1 });
      mockPrisma.mentorship.findFirst.mockResolvedValue({ id: "m1", mentorId: "mentor1" });
      await svc.onCheckin("d1", 1);
      // 师父荣誉总和 +2
      expect(mockPrisma.userGrowth.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "mentor1" },
          update: { mentorshipPoints: { increment: 2 } },
        }),
      );
      // 归属明细 +2
      expect(mockPrisma.mentorship.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "m1" }, data: { mentorshipPoints: { increment: 2 } } }),
      );
    });

    it("徒弟无 ACTIVE 师父 → 不产生任何传道值加值", async () => {
      mockPrisma.userGrowth.upsert.mockResolvedValue({ userId: "d2", totalExp: 10, maxStreak: 1, level: 1 });
      mockPrisma.userGrowth.findUnique.mockResolvedValue({ userId: "d2", totalExp: 20, level: 1, currentStreak: 1, maxStreak: 1 });
      mockPrisma.mentorship.findFirst.mockResolvedValue(null);
      await svc.onCheckin("d2", 1);
      // 无师父：mentorship.update 不应被调用，也不应有 mentor 的传道值 upsert
      expect(mockPrisma.mentorship.update).not.toHaveBeenCalled();
      const mentorAward = mockPrisma.userGrowth.upsert.mock.calls.find(
        (c) => c[0]?.update?.mentorshipPoints,
      );
      expect(mentorAward).toBeUndefined();
    });
  });

  describe("getMyGrowth — 成长档案", () => {
    it("断签超过1天连续天数归零，成就墙含未获得项", async () => {
      mockPrisma.userGrowth.findUnique.mockResolvedValue({
        userId: "u1", totalExp: 200, level: 3, currentStreak: 9, maxStreak: 12,
        lastCheckinDate: new Date(Date.now() - 3 * 86_400_000), // 3天前
      });
      mockPrisma.userAchievement.findMany.mockResolvedValue([{ code: "first_checkin", earnedAt: new Date() }]);
      const result = await svc.getMyGrowth("u1");
      expect(result.levelName).toBe("秀才");
      expect(result.currentStreak).toBe(0); // 断签归零
      expect(result.maxStreak).toBe(12);
      const first = result.achievements.find((a) => a.code === "first_checkin");
      const streak30 = result.achievements.find((a) => a.code === "streak_30");
      expect(first?.earned).toBe(true);
      expect(streak30?.earned).toBe(false);
    });

    it("无档案用户返回书童初始态", async () => {
      mockPrisma.userGrowth.findUnique.mockResolvedValue(null);
      mockPrisma.userAchievement.findMany.mockResolvedValue([]);
      const result = await svc.getMyGrowth("u-new");
      expect(result).toMatchObject({ totalExp: 0, level: 1, levelName: "书童", currentStreak: 0 });
    });
  });

  describe("getPublicGrowthCard — 公开成就卡（V1 裂变）", () => {
    it("真实获得的成就返回展示字段（昵称/成就名/连续天数/功名）", async () => {
      (mockPrisma as any).userAchievement.findUnique = jest.fn().mockResolvedValue({
        userId: "u1", code: "streak_7", earnedAt: new Date("2026-07-01"),
      });
      (mockPrisma as any).user = {
        findUnique: jest.fn().mockResolvedValue({ nickname: "子墨", avatar: "a.png" }),
      };
      mockPrisma.userGrowth.findUnique.mockResolvedValue({
        userId: "u1", totalExp: 200, level: 3, currentStreak: 8, maxStreak: 8,
        lastCheckinDate: new Date(),
      });
      const card = await svc.getPublicGrowthCard("u1", "streak_7", "achievement");
      expect(card).toMatchObject({
        nickname: "子墨", name: "七日不辍", type: "achievement",
        currentStreak: 8, levelName: "秀才",
      });
    });

    it("未获得的成就/不存在的 code 均 404，不泄漏任何信息", async () => {
      (mockPrisma as any).userAchievement.findUnique = jest.fn().mockResolvedValue(null);
      await expect(svc.getPublicGrowthCard("u1", "streak_7", "achievement")).rejects.toThrow("成就卡不存在");
      await expect(svc.getPublicGrowthCard("u1", "no_such_code", "achievement")).rejects.toThrow("成就卡不存在");
      mockPrisma.userTitle.findUnique.mockResolvedValue(null);
      await expect(svc.getPublicGrowthCard("u1", "t_xiucai", "title")).rejects.toThrow("成就卡不存在");
    });
  });
});
