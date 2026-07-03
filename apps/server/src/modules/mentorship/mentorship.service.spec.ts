import { Test } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { MentorshipService } from "./mentorship.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

const mockPrisma = {
  mentorship: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  userGrowth: { findUnique: jest.fn(), findMany: jest.fn(), upsert: jest.fn() },
  user: { findUnique: jest.fn(), findMany: jest.fn() },
  userAchievement: { createMany: jest.fn() },
};

const mockRedis = {
  set: jest.fn(),
  get: jest.fn(),
};

describe("MentorshipService — 师徒传承（纯荣誉·R1 合规）", () => {
  let svc: MentorshipService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        MentorshipService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();
    svc = mod.get(MentorshipService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.userAchievement.createMany.mockResolvedValue({ count: 0 });
  });

  describe("invite — 生成拜师邀请", () => {
    it("生成 32 位 token 并写入 Redis（7 天 TTL），返回分享链接", async () => {
      mockRedis.set.mockResolvedValue(undefined);
      const res = await svc.invite("mentor1");
      expect(res.inviteToken).toHaveLength(32);
      expect(res.shareUrl).toContain(`token=${res.inviteToken}`);
      expect(mockRedis.set).toHaveBeenCalledWith(
        `mentor:invite:${res.inviteToken}`,
        "mentor1",
        7 * 24 * 60 * 60,
      );
    });
  });

  describe("accept — 拜师", () => {
    it("成功拜师：无 ACTIVE 师父 + token 有效 → 建 Mentorship", async () => {
      mockRedis.get.mockResolvedValue("mentor1");
      mockPrisma.mentorship.findFirst.mockResolvedValue(null); // 无 ACTIVE 师父
      mockPrisma.mentorship.create.mockResolvedValue({ id: "ms1" });
      mockPrisma.user.findUnique.mockResolvedValue({ nickname: "王阳明" });
      const res = await svc.accept("disciple1", "tok", "愿承师志");
      expect(res).toEqual({ mentorshipId: "ms1", mentorNickname: "王阳明" });
      expect(mockPrisma.mentorship.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ mentorId: "mentor1", discipleId: "disciple1", status: "ACTIVE", disciplePledge: "愿承师志" }),
        }),
      );
    });

    it("已有 ACTIVE 师父 → 拒绝（BadRequest）", async () => {
      mockRedis.get.mockResolvedValue("mentor1");
      mockPrisma.mentorship.findFirst.mockResolvedValue({ id: "existing" });
      await expect(svc.accept("disciple1", "tok")).rejects.toBeInstanceOf(BadRequestException);
      expect(mockPrisma.mentorship.create).not.toHaveBeenCalled();
    });

    it("拜自己为师 → 拒绝（BadRequest）", async () => {
      mockRedis.get.mockResolvedValue("me");
      await expect(svc.accept("me", "tok")).rejects.toBeInstanceOf(BadRequestException);
      expect(mockPrisma.mentorship.create).not.toHaveBeenCalled();
    });

    it("token 失效 → NotFound", async () => {
      mockRedis.get.mockResolvedValue(null);
      await expect(svc.accept("disciple1", "bad")).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("my-disciples — 徒弟列表与汇总", () => {
    it("正确汇总 totalPoints / activeCount / graduatedCount", async () => {
      mockPrisma.mentorship.findMany.mockResolvedValue([
        { discipleId: "d1", status: "ACTIVE", mentorshipPoints: 30, createdAt: new Date() },
        { discipleId: "d2", status: "GRADUATED", mentorshipPoints: 70, createdAt: new Date() },
      ]);
      mockPrisma.userGrowth.findMany.mockResolvedValue([
        { userId: "d1", level: 2 },
        { userId: "d2", level: 6 },
      ]);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: "d1", nickname: "徒一" },
        { id: "d2", nickname: "徒二" },
      ]);
      const res = await svc.myDisciples("mentor1");
      expect(res.summary).toEqual({ totalPoints: 100, activeCount: 1, graduatedCount: 1 });
      expect(res.disciples).toHaveLength(2);
      expect(res.disciples[0]).toMatchObject({ discipleNickname: "徒一", level: 2, contributedPoints: 30 });
    });
  });

  describe("graduate — 出师", () => {
    it("满学分条件 → GRADUATED + 师父 +50 + 双方成就", async () => {
      mockPrisma.mentorship.findFirst.mockResolvedValue({ id: "ms1", mentorId: "mentor1" });
      mockPrisma.userGrowth.findUnique.mockResolvedValue({ totalExp: 1200 });
      mockPrisma.mentorship.update.mockResolvedValue({});
      mockPrisma.userGrowth.upsert.mockResolvedValue({});
      const res = await svc.graduate("disciple1");
      expect(res).toEqual({ success: true });
      expect(mockPrisma.mentorship.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "ms1" },
          data: expect.objectContaining({ status: "GRADUATED", mentorshipPoints: { increment: 50 } }),
        }),
      );
      expect(mockPrisma.userGrowth.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: "mentor1" }, update: { mentorshipPoints: { increment: 50 } } }),
      );
      expect(mockPrisma.userAchievement.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            { userId: "mentor1", code: "mentor_graduate" },
            { userId: "disciple1", code: "graduated_disciple" },
          ]),
        }),
      );
    });

    it("未满学分条件 → 拒绝（BadRequest·不改状态）", async () => {
      mockPrisma.mentorship.findFirst.mockResolvedValue({ id: "ms1", mentorId: "mentor1" });
      mockPrisma.userGrowth.findUnique.mockResolvedValue({ totalExp: 300 });
      await expect(svc.graduate("disciple1")).rejects.toBeInstanceOf(BadRequestException);
      expect(mockPrisma.mentorship.update).not.toHaveBeenCalled();
    });
  });
});
