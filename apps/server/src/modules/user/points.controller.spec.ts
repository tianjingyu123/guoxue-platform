import { Test } from "@nestjs/testing";
import { CanActivate } from "@nestjs/common";
import { PointsController } from "./points.controller";
import { PointsService } from "./points.service";
import { InteractionService } from "../interaction/interaction.service";
import { CommentService } from "../comment/comment.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

const mockSvc = {
  getPoints: jest.fn(),
  hasCheckedInToday: jest.fn(),
  getPointsRecords: jest.fn(),
  getGrowth: jest.fn(),
  getGrowthRecords: jest.fn(),
  exchangeProduct: jest.fn(),
};

const mockInteraction = {
  getMyLikes: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 }),
};

const mockComment = {
  getUserComments: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 }),
  getReceivedComments: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 }),
};

const mockGuard: CanActivate = { canActivate: () => true };

describe("PointsController", () => {
  let ctrl: PointsController;
  const mockReq = { user: { id: "u1" } } as any;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [PointsController],
      providers: [
        { provide: PointsService, useValue: mockSvc },
        { provide: InteractionService, useValue: mockInteraction },
        { provide: CommentService, useValue: mockComment },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue(mockGuard)
      .compile();
    ctrl = mod.get(PointsController);
  });

  beforeEach(() => jest.clearAllMocks());

  describe("GET points", () => {
    it("获取积分余额", async () => {
      mockSvc.getPoints.mockResolvedValue({ balance: 100, totalEarned: 200, totalSpent: 100 });
      const result = await ctrl.getPoints(mockReq);
      expect(result.balance).toBe(100);
      expect(mockSvc.getPoints).toHaveBeenCalledWith("u1");
    });
  });

  describe("GET points/tasks", () => {
    it("仅返回已有真实入账链路的签到任务", async () => {
      mockSvc.hasCheckedInToday.mockResolvedValue(false);
      const result = await ctrl.getPointsTasks(mockReq);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ title: "每日签到", points: 5, completed: false, action: "去签到" });
      expect(mockSvc.hasCheckedInToday).toHaveBeenCalledWith("u1");
    });

    it("签到后返回真实完成态", async () => {
      mockSvc.hasCheckedInToday.mockResolvedValue(true);
      const result = await ctrl.getPointsTasks(mockReq);
      expect(result[0]).toMatchObject({ completed: true, action: "已完成" });
    });
  });

  describe("GET points/records", () => {
    it("获取积分明细分页", async () => {
      mockSvc.getPointsRecords.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });
      const result = await ctrl.getPointsRecords(mockReq, 1, 20);
      expect(result.total).toBe(0);
      expect(mockSvc.getPointsRecords).toHaveBeenCalledWith("u1", 1, 20);
    });

    it("默认分页参数", async () => {
      mockSvc.getPointsRecords.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });
      await ctrl.getPointsRecords(mockReq, undefined as any, undefined as any);
      expect(mockSvc.getPointsRecords).toHaveBeenCalledWith("u1", 1, 20);
    });
  });

  describe("GET growth", () => {
    it("获取成长值+等级", async () => {
      mockSvc.getGrowth.mockResolvedValue({ value: 150, level: 2, nextLevelValue: 300 });
      const result = await ctrl.getGrowth(mockReq);
      expect(result.level).toBe(2);
      expect(mockSvc.getGrowth).toHaveBeenCalledWith("u1");
    });
  });

  describe("GET growth/records", () => {
    it("获取成长值明细分页", async () => {
      mockSvc.getGrowthRecords.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });
      const result = await ctrl.getGrowthRecords(mockReq, 1, 20);
      expect(result.total).toBe(0);
      expect(mockSvc.getGrowthRecords).toHaveBeenCalledWith("u1", 1, 20);
    });
  });

  describe("POST points/exchange", () => {
    it("积分兑换", async () => {
      mockSvc.exchangeProduct.mockResolvedValue({ balance: 50 });
      const dto = { productId: "p1" };
      const result = await ctrl.exchange(mockReq, dto);
      expect(result.balance).toBe(50);
      expect(mockSvc.exchangeProduct).toHaveBeenCalledWith("u1", "p1");
    });
  });
});
