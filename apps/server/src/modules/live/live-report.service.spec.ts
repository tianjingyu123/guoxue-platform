import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, ForbiddenException } from "@nestjs/common";
import { LiveReportService } from "./live-report.service";
import { PrismaService } from "../../prisma/prisma.service";

// 调用方传入的当前用户（主播），归属校验通过用
const HOST = "h1";

const mockPrisma = {
  liveRoom: { findUnique: jest.fn(), findFirst: jest.fn() },
  liveMinuteData: { findMany: jest.fn(), aggregate: jest.fn() },
  giftRecord: { count: jest.fn(), groupBy: jest.fn() },
};

describe("LiveReportService", () => {
  let svc: LiveReportService;

  beforeEach(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        LiveReportService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    svc = mod.get(LiveReportService);
    jest.clearAllMocks();
  });

  it("应被定义", () => expect(svc).toBeDefined());

  describe("getReport", () => {
    it("直播间不存在时抛出异常", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue(null);
      await expect(svc.getReport("bad-id", HOST)).rejects.toThrow(NotFoundException);
    });

    it("非主播访问抛出 ForbiddenException", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({
        id: "r1", title: "国学直播", hostUserId: "h1",
        viewCount: 100, startTime: new Date("2025-01-01T10:00:00Z"),
        endTime: new Date("2025-01-01T11:00:00Z"), status: "ENDED",
      });
      await expect(svc.getReport("r1", "other")).rejects.toThrow(ForbiddenException);
    });

    it("返回完整的直播报告", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({
        id: "r1", title: "国学直播", hostUserId: "h1",
        viewCount: 100, startTime: new Date("2025-01-01T10:00:00Z"),
        endTime: new Date("2025-01-01T11:00:00Z"), status: "ENDED",
      });
      mockPrisma.liveMinuteData.findMany.mockResolvedValue([
        { minute: 1, onlineCount: 50, gmw: 1000, orderCount: 2, commentCount: 5, likeCount: 10, giftAmount: 200 },
        { minute: 2, onlineCount: 80, gmw: 2000, orderCount: 3, commentCount: 8, likeCount: 15, giftAmount: 300 },
      ]);
      mockPrisma.giftRecord.count.mockResolvedValue(5);
      mockPrisma.giftRecord.groupBy.mockResolvedValue([{ userId: "u1" }, { userId: "u2" }]);

      const result = await svc.getReport("r1", HOST);

      expect(result.summary.title).toBe("国学直播");
      expect(result.summary.durationMinutes).toBe(60);
      expect(result.summary.peakOnline).toBe(80);
      expect(result.summary.avgOnline).toBe(65);
      expect(result.summary.totalGmv).toBe(30);
      expect(result.summary.totalOrders).toBe(5);
      expect(result.summary.uniqueGifters).toBe(2);
      expect(result.minuteData).toHaveLength(2);
    });
  });

  describe("getCompare", () => {
    it("无历史场次返回 current 和 null", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({
        id: "r1", hostUserId: "h1", viewCount: 100,
        startTime: new Date("2025-01-01T10:00:00Z"), endTime: new Date("2025-01-01T11:00:00Z"),
      });
      mockPrisma.liveRoom.findFirst.mockResolvedValue(null);
      // getCompare 无上一场时回退到 getReport，补充其依赖的 mock
      mockPrisma.liveMinuteData.findMany.mockResolvedValue([]);
      mockPrisma.giftRecord.count.mockResolvedValue(0);
      mockPrisma.giftRecord.groupBy.mockResolvedValue([]);

      const result = await svc.getCompare("r1", HOST);
      expect(result.previous).toBeNull();
    });
  });
});
