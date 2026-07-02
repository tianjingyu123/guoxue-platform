import { Test } from "@nestjs/testing";
import { SettlementReconcileService } from "./settlement-reconcile.service";
import { SettlementService } from "./settlement.service";
import { PrismaService } from "../../prisma/prisma.service";

const mockPrisma = {
  ledgerEntry: { groupBy: jest.fn() },
  stationEarning: { groupBy: jest.fn() },
  operatorEarning: { groupBy: jest.fn() },
  userRole: { findMany: jest.fn() },
  notification: { createMany: jest.fn() },
};
const mockSettlement = { settlePending: jest.fn() };

describe("SettlementReconcileService", () => {
  let svc: SettlementReconcileService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        SettlementReconcileService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SettlementService, useValue: mockSettlement },
      ],
    }).compile();
    svc = mod.get(SettlementReconcileService);
  });

  beforeEach(() => jest.clearAllMocks());

  it("总账与实付净额一致时对账通过", async () => {
    mockPrisma.ledgerEntry.groupBy.mockResolvedValue([
      { refId: "o1", role: "STATION", _sum: { amount: 30 } },
      { refId: "o1", role: "OPERATOR", _sum: { amount: 3.6 } },
    ]);
    mockPrisma.stationEarning.groupBy.mockResolvedValue([{ orderId: "o1", _sum: { earned: 30 } }]);
    mockPrisma.operatorEarning.groupBy.mockResolvedValue([{ orderId: "o1", _sum: { earned: 3.6 } }]);
    const result = await svc.reconcileOrders();
    expect(result).toEqual({ checked: 1, mismatched: [] });
  });

  it("净额差异超容差时报差异（含冲正后净额口径）", async () => {
    mockPrisma.ledgerEntry.groupBy.mockResolvedValue([
      { refId: "o2", role: "STATION", _sum: { amount: 30 } }, // 总账未冲正
    ]);
    mockPrisma.stationEarning.groupBy.mockResolvedValue([{ orderId: "o2", _sum: { earned: 0 } }]); // 实付已冲正归零
    mockPrisma.operatorEarning.groupBy.mockResolvedValue([]);
    const result = await svc.reconcileOrders();
    expect(result.mismatched).toEqual([{ refId: "o2", role: "STATION", ledger: 30, legacy: 0 }]);
  });

  it("无双写订单时空转不误报", async () => {
    mockPrisma.ledgerEntry.groupBy.mockResolvedValue([]);
    const result = await svc.reconcileOrders();
    expect(result).toEqual({ checked: 0, mismatched: [] });
    expect(mockPrisma.stationEarning.groupBy).not.toHaveBeenCalled();
  });
});
