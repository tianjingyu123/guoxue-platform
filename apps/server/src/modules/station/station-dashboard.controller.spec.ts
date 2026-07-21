import type { Request } from "express";
import { PrismaService } from "../../prisma/prisma.service";
import { OperatorDashboardController } from "./station-dashboard.controller";
import { StationDashboardService } from "./station-dashboard.service";
import { TeamTaskService } from "./team-task.service";
import { NotificationService } from "../notification/notification.service";

const mockPrisma = {
  operator: { findFirst: jest.fn() },
  station: { findMany: jest.fn() },
  stationEarning: { groupBy: jest.fn() },
  operatorEarning: { groupBy: jest.fn() },
  notification: { findMany: jest.fn() },
};
const mockNotification = { send: jest.fn() };

describe("OperatorDashboardController", () => {
  let controller: OperatorDashboardController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new OperatorDashboardController(
      mockPrisma as unknown as PrismaService,
      {} as TeamTaskService,
      {} as StationDashboardService,
      mockNotification as unknown as NotificationService,
    );
  });

  it("名下站长列表使用真实管理奖账本，不按站长佣金固定比例估算", async () => {
    mockPrisma.operator.findFirst.mockResolvedValue({
      id: "operator-d",
      userId: "operator-d-user",
      containQuota: 0,
    });
    mockPrisma.station.findMany.mockResolvedValue([
      {
        id: "station-e",
        name: "E 分站",
        code: "E001",
        totalEarning: 200,
        status: "ACTIVE",
        createdAt: new Date("2026-07-01T00:00:00.000Z"),
      },
      {
        id: "station-f",
        name: "F 分站",
        code: "F001",
        totalEarning: 100,
        status: "ACTIVE",
        createdAt: new Date("2026-07-02T00:00:00.000Z"),
      },
    ]);
    mockPrisma.stationEarning.groupBy.mockResolvedValue([
      { stationId: "station-e", _sum: { earned: 200 } },
      { stationId: "station-f", _sum: { earned: 100 } },
    ]);
    mockPrisma.operatorEarning.groupBy.mockResolvedValue([
      { sourceStationId: "station-e", _sum: { earned: 20 } },
    ]);

    const result = await controller.getMyStations({
      user: { id: "operator-d-user", roles: [] },
    } as unknown as Request);

    expect(result).toEqual([
      expect.objectContaining({ id: "station-e", monthEarning: 200, mgmtBonus: 20 }),
      expect.objectContaining({ id: "station-f", monthEarning: 100, mgmtBonus: 0 }),
    ]);
    expect(mockPrisma.operatorEarning.groupBy).toHaveBeenCalledWith({
      by: ["sourceStationId"],
      where: {
        operatorId: "operator-d",
        source: "MGMT_BONUS",
        sourceStationId: { in: ["station-e", "station-f"] },
        createdAt: { gte: expect.any(Date) },
      },
      _sum: { earned: true },
    });
  });

  it("只提醒本团队站长，24 小时内已提醒目标跳过", async () => {
    mockPrisma.operator.findFirst.mockResolvedValue({ id: "operator-d", userId: "operator-user", containQuota: 6 });
    mockPrisma.station.findMany.mockResolvedValue([
      { id: "station-e", userId: "user-e", name: "E 分站" },
      { id: "station-f", userId: "user-f", name: "F 分站" },
    ]);
    mockPrisma.notification.findMany.mockResolvedValue([{ targetId: "station-f" }]);
    mockNotification.send.mockResolvedValue({ id: "notice-e" });

    await expect(controller.remindDormantStations(
      { user: { id: "operator-user", roles: [] } } as unknown as Request,
      { stationIds: ["station-e", "station-f"] },
    )).resolves.toEqual({ sent: 1, skipped: 1, cooldownHours: 24 });
    expect(mockNotification.send).toHaveBeenCalledTimes(1);
    expect(mockNotification.send).toHaveBeenCalledWith("user-e", expect.objectContaining({
      type: "SYSTEM", targetType: "STATION", targetId: "station-e",
    }));
  });

  it("请求包含非本团队分站时整批拒绝，不发送任何通知", async () => {
    mockPrisma.operator.findFirst.mockResolvedValue({ id: "operator-d", userId: "operator-user", containQuota: 6 });
    mockPrisma.station.findMany.mockResolvedValue([
      { id: "station-e", userId: "user-e", name: "E 分站" },
    ]);

    await expect(controller.remindDormantStations(
      { user: { id: "operator-user", roles: [] } } as unknown as Request,
      { stationIds: ["station-e", "foreign-station"] },
    )).rejects.toThrow("所选分站不属于当前运营商团队");
    expect(mockNotification.send).not.toHaveBeenCalled();
  });
});
