import type { Request } from "express";
import { PrismaService } from "../../prisma/prisma.service";
import { OperatorDashboardController } from "./station-dashboard.controller";
import { StationDashboardService } from "./station-dashboard.service";
import { TeamTaskService } from "./team-task.service";

const mockPrisma = {
  operator: { findFirst: jest.fn() },
  station: { findMany: jest.fn() },
  stationEarning: { groupBy: jest.fn() },
  operatorEarning: { groupBy: jest.fn() },
};

describe("OperatorDashboardController", () => {
  let controller: OperatorDashboardController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new OperatorDashboardController(
      mockPrisma as unknown as PrismaService,
      {} as TeamTaskService,
      {} as StationDashboardService,
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
});
