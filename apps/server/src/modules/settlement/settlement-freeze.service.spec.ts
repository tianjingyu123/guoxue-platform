import { Test } from "@nestjs/testing";
import { SettlementFreezeService, FREEZE_REASON_PREFIX } from "./settlement-freeze.service";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";

const mockPrisma = {
  ledgerEntry: { updateMany: jest.fn() },
  auditLog: { create: jest.fn() },
};

describe("SettlementFreezeService（事后冻结·商-P1 分销风控缺口）", () => {
  let svc: SettlementFreezeService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [SettlementFreezeService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    svc = mod.get(SettlementFreezeService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.ledgerEntry.updateMany.mockResolvedValue({ count: 3 });
    mockPrisma.auditLog.create.mockResolvedValue({ id: "audit-1" });
  });

  describe("freezeBeneficiary — 冻结 CAS", () => {
    it("该受益人全部 PENDING 行 CAS 翻 FROZEN（只按 status=PENDING 条件更新·不动已 SETTLED）", async () => {
      const res = await svc.freezeBeneficiary("STATION", "st-1", "互刷风控触发", "admin-1");

      expect(res).toEqual({ frozen: 3 });
      expect(mockPrisma.ledgerEntry.updateMany).toHaveBeenCalledTimes(1);
      const args = mockPrisma.ledgerEntry.updateMany.mock.calls[0][0];
      // CAS 条件：status=PENDING 硬编码在 where —— SETTLED/REVERSED/FROZEN 行天然不被触碰
      expect(args.where).toEqual({ beneficiaryType: "STATION", beneficiaryId: "st-1", status: "PENDING" });
      // 只翻状态不改金额：data 仅 status + reason 两键
      expect(args.data).toEqual({ status: "FROZEN", reason: `${FREEZE_REASON_PREFIX} 互刷风控触发` });
      expect(Object.keys(args.data)).toEqual(["status", "reason"]);
    });

    it("冻结落 AuditLog：行数 + reason + 操作者", async () => {
      await svc.freezeBeneficiary("STATION", "st-1", "秒下单刷佣", "SYSTEM:DISTRIBUTION_RISK");

      expect(mockPrisma.auditLog.create).toHaveBeenCalledTimes(1);
      const data = mockPrisma.auditLog.create.mock.calls[0][0].data;
      expect(data.action).toBe("settlement.freeze");
      expect(data.executor).toBe("SYSTEM:DISTRIBUTION_RISK");
      expect(data.targetType).toBe("LEDGER_BENEFICIARY");
      expect(data.targetId).toBe("STATION:st-1");
      expect(JSON.parse(data.detail)).toEqual({ frozen: 3, reason: "秒下单刷佣" });
    });

    it("幂等：重复冻结第二次 count=0 不报错，返回行数 0", async () => {
      mockPrisma.ledgerEntry.updateMany.mockResolvedValue({ count: 0 });
      const res = await svc.freezeBeneficiary("STATION", "st-1", "重复触发", "admin-1");
      expect(res).toEqual({ frozen: 0 });
      // 0 行也照常审计（留痕）
      expect(mockPrisma.auditLog.create).toHaveBeenCalledTimes(1);
    });

    it("参数校验：非法主体类型 / 空 ID / 空原因均拒绝（资金操作审计要求）", async () => {
      await expect(svc.freezeBeneficiary("PLATFORM" as never, "p", "r", "a")).rejects.toThrow(BusinessException);
      await expect(svc.freezeBeneficiary("STATION", "  ", "r", "a")).rejects.toThrow(BusinessException);
      await expect(svc.freezeBeneficiary("STATION", "st-1", "  ", "a")).rejects.toThrow(BusinessException);
      expect(mockPrisma.ledgerEntry.updateMany).not.toHaveBeenCalled();
    });
  });

  describe("unfreezeBeneficiary — 解冻", () => {
    it("仅解本接口冻结的行（reason 前缀标记）FROZEN→PENDING·大额审批冻结行不受影响", async () => {
      mockPrisma.ledgerEntry.updateMany.mockResolvedValue({ count: 2 });
      const res = await svc.unfreezeBeneficiary("STATION", "st-1", "复核放行", "admin-1");

      expect(res).toEqual({ unfrozen: 2 });
      const args = mockPrisma.ledgerEntry.updateMany.mock.calls[0][0];
      // 冻结来源过滤：reason startsWith 前缀 —— settle() L4 大额冻结行（reason="单笔≥X元…"）不会被解冻
      expect(args.where).toEqual({
        beneficiaryType: "STATION",
        beneficiaryId: "st-1",
        status: "FROZEN",
        reason: { startsWith: FREEZE_REASON_PREFIX },
      });
      // 还原 settle() 产出的 PENDING 原始状态（reason=null·availableAt 不动）
      expect(args.data).toEqual({ status: "PENDING", reason: null });
    });

    it("解冻落 AuditLog：行数 + reason", async () => {
      mockPrisma.ledgerEntry.updateMany.mockResolvedValue({ count: 2 });
      await svc.unfreezeBeneficiary("STATION", "st-1", "误报解除", "admin-1");

      const data = mockPrisma.auditLog.create.mock.calls[0][0].data;
      expect(data.action).toBe("settlement.unfreeze");
      expect(data.targetId).toBe("STATION:st-1");
      expect(JSON.parse(data.detail)).toEqual({ unfrozen: 2, reason: "误报解除" });
    });

    it("幂等：无可解冻行 count=0 不报错", async () => {
      mockPrisma.ledgerEntry.updateMany.mockResolvedValue({ count: 0 });
      const res = await svc.unfreezeBeneficiary("STATION", "st-1", "复核放行", "admin-1");
      expect(res).toEqual({ unfrozen: 0 });
    });
  });
});
