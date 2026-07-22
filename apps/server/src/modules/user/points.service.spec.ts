import { Test, TestingModule } from "@nestjs/testing";
import { PointsService } from "./points.service";
import { PrismaService } from "../../prisma/prisma.service";

const mockPrisma: any = {
  userPoints: { findUnique: jest.fn(), create: jest.fn(), upsert: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
  pointsRecord: { findMany: jest.fn(), count: jest.fn(), create: jest.fn(), aggregate: jest.fn() },
  growthValue: { findUnique: jest.fn(), create: jest.fn(), upsert: jest.fn(), update: jest.fn() },
  growthRecord: { findMany: jest.fn(), count: jest.fn(), create: jest.fn() },
};
// 事务代理：把 tx 直接映射到 mockPrisma
mockPrisma.$transaction = (fn: any) => fn(mockPrisma);

describe("PointsService", () => {
  let svc: PointsService;

  beforeEach(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        PointsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    svc = mod.get(PointsService);
    jest.clearAllMocks();
    mockPrisma.pointsRecord.aggregate.mockResolvedValue({ _sum: { amount: null } });
  });

  it("应被定义", () => expect(svc).toBeDefined());

  describe("getPoints", () => {
    it("已有积分记录时直接返回", async () => {
      const points = { userId: "u1", balance: 100, totalEarned: 200, totalSpent: 100 };
      mockPrisma.userPoints.findUnique.mockResolvedValue(points);

      const result = await svc.getPoints("u1");
      expect(result).toEqual({ ...points, todayEarned: 0, monthEarned: 0 });
      expect(mockPrisma.userPoints.create).not.toHaveBeenCalled();
    });

    it("无积分记录时自动创建", async () => {
      const points = { userId: "u1", balance: 0, totalEarned: 0, totalSpent: 0 };
      mockPrisma.userPoints.findUnique.mockResolvedValue(null);
      mockPrisma.userPoints.create.mockResolvedValue(points);

      const result = await svc.getPoints("u1");
      expect(result).toEqual({ ...points, todayEarned: 0, monthEarned: 0 });
      expect(mockPrisma.userPoints.create).toHaveBeenCalledWith({ data: { userId: "u1" } });
    });

    it("按北京时间自然日与自然月聚合真实获取积分", async () => {
      jest.useFakeTimers().setSystemTime(new Date("2026-07-21T16:30:00.000Z"));
      try {
        mockPrisma.userPoints.findUnique.mockResolvedValue({ userId: "u1", balance: 100 });
        mockPrisma.pointsRecord.aggregate
          .mockResolvedValueOnce({ _sum: { amount: 15 } })
          .mockResolvedValueOnce({ _sum: { amount: 80 } });

        const result = await svc.getPoints("u1");

        expect(result).toMatchObject({ todayEarned: 15, monthEarned: 80 });
        expect(mockPrisma.pointsRecord.aggregate).toHaveBeenNthCalledWith(1, {
          where: {
            userId: "u1",
            type: "EARN",
            createdAt: {
              gte: new Date("2026-07-21T16:00:00.000Z"),
              lt: new Date("2026-07-22T16:00:00.000Z"),
            },
          },
          _sum: { amount: true },
        });
        expect(mockPrisma.pointsRecord.aggregate).toHaveBeenNthCalledWith(2, {
          where: {
            userId: "u1",
            type: "EARN",
            createdAt: {
              gte: new Date("2026-06-30T16:00:00.000Z"),
              lt: new Date("2026-07-31T16:00:00.000Z"),
            },
          },
          _sum: { amount: true },
        });
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe("getPointsRecords", () => {
    it("返回分页流水", async () => {
      mockPrisma.pointsRecord.findMany.mockResolvedValue([{ id: "r1", amount: 10 }]);
      mockPrisma.pointsRecord.count.mockResolvedValue(1);

      const result = await svc.getPointsRecords("u1", 1, 20);
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("page 传非数字串不产生 NaN skip（P2-4 分页加固）", async () => {
      mockPrisma.pointsRecord.findMany.mockResolvedValue([]);
      mockPrisma.pointsRecord.count.mockResolvedValue(0);
      await svc.getPointsRecords("u1", "abc" as any, 20);
      const arg = mockPrisma.pointsRecord.findMany.mock.calls[0][0];
      expect(Number.isNaN(arg.skip)).toBe(false);
    });
  });

  describe("earnPoints", () => {
    it("成功赚取积分", async () => {
      mockPrisma.userPoints.upsert.mockResolvedValue({ userId: "u1", balance: 50 });
      mockPrisma.pointsRecord.create.mockResolvedValue({});

      const result = await svc.earnPoints("u1", 50, "sign_in", "签到奖励");
      expect(result).toEqual({ userId: "u1", balance: 50 });
      expect(mockPrisma.pointsRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ type: "EARN", source: "sign_in" }) }),
      );
    });
  });

  describe("spendPoints", () => {
    it("积分不足时抛出异常（CAS count=0）", async () => {
      mockPrisma.userPoints.updateMany.mockResolvedValue({ count: 0 });
      await expect(svc.spendPoints("u1", 100, "exchange")).rejects.toThrow("积分不足");
    });

    it("积分充足时成功消费（原子 CAS）", async () => {
      mockPrisma.userPoints.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.pointsRecord.create.mockResolvedValue({});
      mockPrisma.userPoints.findUnique.mockResolvedValue({ userId: "u1", balance: 50 });

      const result = await svc.spendPoints("u1", 50, "exchange");
      expect(result).toEqual({ userId: "u1", balance: 50 });
      expect(mockPrisma.userPoints.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: "u1", balance: { gte: 50 } } }),
      );
    });
  });

  describe("getGrowth", () => {
    it("无成长值记录时自动创建", async () => {
      mockPrisma.growthValue.findUnique.mockResolvedValue(null);
      mockPrisma.growthValue.create.mockResolvedValue({ userId: "u1", value: 0, level: 1 });

      const result = await svc.getGrowth("u1");
      expect(result.level).toBe(1);
      expect(mockPrisma.growthValue.create).toHaveBeenCalled();
    });
  });

  describe("addGrowth", () => {
    it("成长值增加并自动升级", async () => {
      mockPrisma.growthValue.upsert.mockResolvedValue({ userId: "u1", value: 150, level: 1 });
      mockPrisma.growthRecord.create.mockResolvedValue({});
      mockPrisma.growthValue.update.mockResolvedValue({});

      const result = await svc.addGrowth("u1", 150, "daily_login");
      expect(result.level).toBe(2);
      expect(mockPrisma.growthValue.update).toHaveBeenCalled();
    });
  });
});
