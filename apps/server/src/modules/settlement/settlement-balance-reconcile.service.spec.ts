import { Test } from "@nestjs/testing";
import { SettlementBalanceReconcileService } from "./settlement-balance-reconcile.service";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";

/** 🔴 转正顺序守卫：开启引擎口径前必须对账通过，防在账没对平时转正致余额瞬间归零 */
describe("SettlementBalanceReconcileService.setAuthoritativeMode（转正顺序守卫）", () => {
  let svc: SettlementBalanceReconcileService;
  let prisma: { configSystem: { upsert: jest.Mock } };

  const report = (canSwitch: boolean, gappedCount = 0, totalGap = 0) => ({
    canSwitch, gappedCount, totalGap, checked: 5, station: [], operator: [], user: [],
  });

  beforeEach(async () => {
    prisma = { configSystem: { upsert: jest.fn().mockResolvedValue({}) } };
    const mod = await Test.createTestingModule({
      providers: [SettlementBalanceReconcileService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    svc = mod.get(SettlementBalanceReconcileService);
  });

  it("对账不通过时拒绝转正，且绝不写开关", async () => {
    jest.spyOn(svc, "reconcileBalances").mockResolvedValue(report(false, 2, 100) as any);
    await expect(svc.setAuthoritativeMode(true, "admin1")).rejects.toThrow(BusinessException);
    expect(prisma.configSystem.upsert).not.toHaveBeenCalled();
  });

  it("对账通过时放行并写开关=true", async () => {
    jest.spyOn(svc, "reconcileBalances").mockResolvedValue(report(true) as any);
    const r = await svc.setAuthoritativeMode(true, "admin1");
    expect(r.enabled).toBe(true);
    expect(r.forced).toBe(false);
    expect(prisma.configSystem.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: expect.objectContaining({ configValue: "true" }) }),
    );
  });

  it("force 强制转正即使对账不过也放行（forced=true 留告警）", async () => {
    jest.spyOn(svc, "reconcileBalances").mockResolvedValue(report(false, 2, 100) as any);
    const r = await svc.setAuthoritativeMode(true, "admin1", true);
    expect(r.enabled).toBe(true);
    expect(r.forced).toBe(true);
    expect(prisma.configSystem.upsert).toHaveBeenCalled();
  });

  it("关闭开关无需对账（回退旧口径永远安全）", async () => {
    const spy = jest.spyOn(svc, "reconcileBalances");
    const r = await svc.setAuthoritativeMode(false, "admin1");
    expect(r.enabled).toBe(false);
    expect(spy).not.toHaveBeenCalled();
    expect(prisma.configSystem.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: expect.objectContaining({ configValue: "false" }) }),
    );
  });
});
