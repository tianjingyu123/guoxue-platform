import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, ForbiddenException } from "@nestjs/common";
import { LiveDashboardService } from "./live-dashboard.service";
import { PrismaService } from "../../prisma/prisma.service";

const mockPrisma = {
  liveRoom: { findUnique: jest.fn() },
  comment: { count: jest.fn(), findMany: jest.fn() },
  like: { count: jest.fn() },
  giftRecord: { aggregate: jest.fn(), groupBy: jest.fn(), findMany: jest.fn() },
  order: { aggregate: jest.fn(), groupBy: jest.fn() },
  liveMinuteData: { findFirst: jest.fn(), findMany: jest.fn() },
  liveProduct: { findMany: jest.fn(), count: jest.fn() },
  product: { findMany: jest.fn() },
  user: { findMany: jest.fn() },
};

// 调用方传入的当前用户（主播），归属校验通过用
const HOST = "h1";

describe("LiveDashboardService", () => {
  let svc: LiveDashboardService;

  beforeEach(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      providers: [LiveDashboardService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    svc = mod.get(LiveDashboardService);
    jest.clearAllMocks();
  });

  it("应被定义", () => expect(svc).toBeDefined());

  describe("getOverview", () => {
    it("直播间不存在时抛出异常", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue(null);
      await expect(svc.getOverview("bad", HOST)).rejects.toThrow(NotFoundException);
    });

    it("非主播访问抛出 ForbiddenException", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({
        id: "r1", title: "测试", viewCount: 100, status: "LIVE", startTime: new Date(), endTime: null, hostUserId: "h1",
      });
      await expect(svc.getOverview("r1", "other")).rejects.toThrow(ForbiddenException);
    });

    it("返回聚合概览数据", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({
        id: "r1", title: "测试", viewCount: 100, status: "LIVE", startTime: new Date(), endTime: null, hostUserId: "h1",
      });
      mockPrisma.comment.count.mockResolvedValue(20);
      mockPrisma.like.count.mockResolvedValue(30);
      mockPrisma.giftRecord.aggregate.mockResolvedValue({ _sum: { totalCoin: 500 }, _count: 10 });
      mockPrisma.order.aggregate.mockResolvedValue({ _sum: { amount: 1000 }, _count: 5 });
      mockPrisma.liveMinuteData.findFirst.mockResolvedValue({ onlineCount: 80 });
      mockPrisma.giftRecord.groupBy.mockResolvedValue([{ userId: "u1" }, { userId: "u2" }]);

      const result = await svc.getOverview("r1", HOST);
      expect(result.title).toBe("测试");
      expect(result.viewCount).toBe(100);
      expect(result.peakOnline).toBe(80);
      expect(result.commentCount).toBe(20);
      expect(result.likeCount).toBe(30);
    });
  });

  describe("getTrends", () => {
    it("返回分钟级趋势", async () => {
      // assertRoomHost 会查 liveRoom，校验 hostUserId === userId
      mockPrisma.liveRoom.findUnique.mockResolvedValue({ hostUserId: "h1" });
      mockPrisma.liveMinuteData.findMany.mockResolvedValue([
        { minute: 1, onlineCount: 50, gmw: 100, orderCount: 1, commentCount: 3, likeCount: 5, giftAmount: 10 },
      ]);
      const result = await svc.getTrends("r1", HOST);
      expect(result.trends).toHaveLength(1);
    });

    it("非主播访问抛出 ForbiddenException", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({ hostUserId: "h1" });
      await expect(svc.getTrends("r1", "other")).rejects.toThrow(ForbiddenException);
    });
  });

  describe("getHostStats", () => {
    it("返回主播统计", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({
        hostUserId: "h1", startTime: new Date("2025-01-01T10:00"), endTime: new Date("2025-01-01T11:00"),
      });
      mockPrisma.liveProduct.count.mockResolvedValue(5);

      const result = await svc.getHostStats("r1", HOST);
      expect(result.durationMinutes).toBe(60);
      expect(result.totalProductsPresented).toBe(5);
    });

    it("非主播访问抛出 ForbiddenException", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({
        hostUserId: "h1", startTime: new Date("2025-01-01T10:00"), endTime: new Date("2025-01-01T11:00"),
      });
      await expect(svc.getHostStats("r1", "other")).rejects.toThrow(ForbiddenException);
    });
  });
});
