import { Test, TestingModule } from "@nestjs/testing";
import { PointsService } from "./points.service";
import { PrismaService } from "../../prisma/prisma.service";

const mockPrisma = {
  userPoints: { findUnique: jest.fn(), create: jest.fn(), upsert: jest.fn(), update: jest.fn() },
  pointsRecord: { findMany: jest.fn(), count: jest.fn(), create: jest.fn() },
  growthValue: { findUnique: jest.fn(), create: jest.fn(), upsert: jest.fn(), update: jest.fn() },
  growthRecord: { findMany: jest.fn(), count: jest.fn(), create: jest.fn() },
};

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
  });

  it("应被定义", () => expect(svc).toBeDefined());

  describe("getPoints", () => {
    it("已有积分记录时直接返回", async () => {
      const points = { userId: "u1", balance: 100, totalEarned: 200, totalSpent: 100 };
      mockPrisma.userPoints.findUnique.mockResolvedValue(points);

      const result = await svc.getPoints("u1");
      expect(result).toEqual(points);
      expect(mockPrisma.userPoints.create).not.toHaveBeenCalled();
    });

    it("无积分记录时自动创建", async () => {
      const points = { userId: "u1", balance: 0, totalEarned: 0, totalSpent: 0 };
      mockPrisma.userPoints.findUnique.mockResolvedValue(null);
      mockPrisma.userPoints.create.mockResolvedValue(points);

      const result = await svc.getPoints("u1");
      expect(result).toEqual(points);
      expect(mockPrisma.userPoints.create).toHaveBeenCalledWith({ data: { userId: "u1" } });
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
    it("积分不足时抛出异常", async () => {
      mockPrisma.userPoints.findUnique.mockResolvedValue({ userId: "u1", balance: 10 });
      await expect(svc.spendPoints("u1", 100, "exchange")).rejects.toThrow("积分不足");
    });

    it("积分充足时成功消费", async () => {
      mockPrisma.userPoints.findUnique.mockResolvedValue({ userId: "u1", balance: 100 });
      mockPrisma.userPoints.update.mockResolvedValue({ userId: "u1", balance: 50 });
      mockPrisma.pointsRecord.create.mockResolvedValue({});

      const result = await svc.spendPoints("u1", 50, "exchange");
      expect(result).toEqual({ userId: "u1", balance: 50 });
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
