import { Test } from "@nestjs/testing";
import { OfflineStationDashboardService } from "./offline-station-dashboard.service";
import { PrismaService } from "../../prisma/prisma.service";
import { InsightService } from "../track/insight.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";

const mockPrisma = {
  stationOffline: {
    findFirst: jest.fn(),
  },
  offlineCourseRegistration: {
    groupBy: jest.fn(),
    findFirst: jest.fn(),
  },
};

const mockInsight = {
  buildCustomerProfiles: jest.fn(),
  getTimeline: jest.fn(),
};

describe("OfflineStationDashboardService · 学员洞察", () => {
  let svc: OfflineStationDashboardService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        OfflineStationDashboardService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: InsightService, useValue: mockInsight },
      ],
    }).compile();
    svc = mod.get(OfflineStationDashboardService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("listStudents", () => {
    it("返回本驿站去重学员画像列表（boundAt=最早报名时间，total=去重数）", async () => {
      mockPrisma.stationOffline.findFirst.mockResolvedValue({ id: "st1" });
      const early = new Date("2026-06-01T00:00:00Z");
      const late = new Date("2026-06-20T00:00:00Z");
      mockPrisma.offlineCourseRegistration.groupBy.mockResolvedValue([
        { userId: "u1", _min: { createdAt: early } },
        { userId: "u2", _min: { createdAt: late } },
      ]);
      const profiles = [
        { userId: "u2", nickname: "乙", avatar: null, boundAt: late, lastActiveAt: null, events30d: 0, orderCount: 0, totalSpent: 0, interests: [] },
        { userId: "u1", nickname: "甲", avatar: null, boundAt: early, lastActiveAt: null, events30d: 3, orderCount: 1, totalSpent: 99, interests: ["课程"] },
      ];
      mockInsight.buildCustomerProfiles.mockResolvedValue(profiles);

      const result = await svc.listStudents("owner1", 1, 20);

      expect(result.total).toBe(2);
      expect(result.customers).toBe(profiles);
      // 归属判定：仅有效报名状态 + 本驿站课程
      expect(mockPrisma.offlineCourseRegistration.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          by: ["userId"],
          where: { status: { in: ["REGISTERED", "SIGNED_IN"] }, course: { stationId: "st1" } },
        }),
      );
      // 聚合委托 InsightService：按最早报名时间为 boundAt，最近报名者在前
      expect(mockInsight.buildCustomerProfiles).toHaveBeenCalledWith([
        { userId: "u2", boundAt: late },
        { userId: "u1", boundAt: early },
      ]);
    });

    it("分页切片：第2页只把该页学员交给 InsightService，total 仍为全量去重数", async () => {
      mockPrisma.stationOffline.findFirst.mockResolvedValue({ id: "st1" });
      const days = [3, 2, 1].map((d) => new Date(`2026-06-0${d}T00:00:00Z`));
      mockPrisma.offlineCourseRegistration.groupBy.mockResolvedValue([
        { userId: "u1", _min: { createdAt: days[0] } },
        { userId: "u2", _min: { createdAt: days[1] } },
        { userId: "u3", _min: { createdAt: days[2] } },
      ]);
      mockInsight.buildCustomerProfiles.mockResolvedValue([]);

      const result = await svc.listStudents("owner1", 2, 2);

      expect(result.total).toBe(3);
      expect(mockInsight.buildCustomerProfiles).toHaveBeenCalledWith([
        { userId: "u3", boundAt: days[2] },
      ]);
    });

    it("当前用户名下无驿站 → 抛 NOT_FOUND", async () => {
      mockPrisma.stationOffline.findFirst.mockResolvedValue(null);
      await expect(svc.listStudents("nobody", 1, 20)).rejects.toMatchObject({
        errorCode: ErrorCode.NOT_FOUND,
      });
      await expect(svc.listStudents("nobody", 1, 20)).rejects.toBeInstanceOf(BusinessException);
      expect(mockInsight.buildCustomerProfiles).not.toHaveBeenCalled();
    });
  });

  describe("getStudentTimeline", () => {
    it("目标用户不是本驿站报名学员 → 抛 FORBIDDEN 防越权窥探", async () => {
      mockPrisma.stationOffline.findFirst.mockResolvedValue({ id: "st1" });
      mockPrisma.offlineCourseRegistration.findFirst.mockResolvedValue(null);
      await expect(svc.getStudentTimeline("owner1", "stranger")).rejects.toMatchObject({
        errorCode: ErrorCode.FORBIDDEN,
      });
      expect(mockInsight.getTimeline).not.toHaveBeenCalled();
    });

    it("本驿站报名学员 → 校验归属后委托 InsightService 返回时间线", async () => {
      mockPrisma.stationOffline.findFirst.mockResolvedValue({ id: "st1" });
      mockPrisma.offlineCourseRegistration.findFirst.mockResolvedValue({ id: "reg1" });
      const timeline = { events: [{ action: "page_view", path: "/offline", summary: "逛了逛线下驿站", occurredAt: new Date() }] };
      mockInsight.getTimeline.mockResolvedValue(timeline);

      const result = await svc.getStudentTimeline("owner1", "u1");

      expect(result).toBe(timeline);
      // 归属校验条件：本驿站课程 + 有效报名状态
      expect(mockPrisma.offlineCourseRegistration.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "u1", status: { in: ["REGISTERED", "SIGNED_IN"] }, course: { stationId: "st1" } },
        }),
      );
      expect(mockInsight.getTimeline).toHaveBeenCalledWith("u1", 30);
    });

    it("运营者无驿站 → 时间线同样 NOT_FOUND（不进入归属校验）", async () => {
      mockPrisma.stationOffline.findFirst.mockResolvedValue(null);
      await expect(svc.getStudentTimeline("nobody", "u1")).rejects.toMatchObject({
        errorCode: ErrorCode.NOT_FOUND,
      });
      expect(mockPrisma.offlineCourseRegistration.findFirst).not.toHaveBeenCalled();
    });
  });
});
