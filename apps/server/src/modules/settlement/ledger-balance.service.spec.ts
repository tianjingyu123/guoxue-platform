import { Test } from "@nestjs/testing";
import { LedgerBalanceService, LEDGER_WITHDRAWABLE_FLAG } from "./ledger-balance.service";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * P2-c 可提现口径核心单测（T4 审查补齐·真实提现上线前的资金安全钉）。
 * 口径铁律：净结算额 = sum(amount) WHERE status NOT IN (PENDING, FROZEN)。
 * REVERSED 必须计入（冲正对 = REVERSED(+X) + SETTLED(-X) 净 0）；
 * 若有人把口径改成 status='SETTLED' 或把 REVERSED 加进排除清单 → 冲正双重扣除 → 本 spec 必须红。
 */

const mockPrisma = {
  configSystem: { findUnique: jest.fn() },
  ledgerEntry: { aggregate: jest.fn() },
};

describe("LedgerBalanceService", () => {
  let svc: LedgerBalanceService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        LedgerBalanceService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    svc = mod.get(LedgerBalanceService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("isAuthoritative（灰度开关）", () => {
    it("configValue='true' 时启用引擎口径", async () => {
      mockPrisma.configSystem.findUnique.mockResolvedValue({ configValue: "true" });
      expect(await svc.isAuthoritative()).toBe(true);
      expect(mockPrisma.configSystem.findUnique).toHaveBeenCalledWith({
        where: { configKey: LEDGER_WITHDRAWABLE_FLAG },
        select: { configValue: true },
      });
    });

    it("configValue='false' 时关闭（回切旧口径）", async () => {
      mockPrisma.configSystem.findUnique.mockResolvedValue({ configValue: "false" });
      expect(await svc.isAuthoritative()).toBe(false);
    });

    it("配置行缺失时默认关闭（安全方向）", async () => {
      mockPrisma.configSystem.findUnique.mockResolvedValue(null);
      expect(await svc.isAuthoritative()).toBe(false);
    });

    it("非法值（'1'/'on'/'TRUE'）一律视为关闭——只认字面 'true'", async () => {
      for (const v of ["1", "on", "TRUE", ""]) {
        mockPrisma.configSystem.findUnique.mockResolvedValue({ configValue: v });
        expect(await svc.isAuthoritative()).toBe(false);
      }
    });
  });

  describe("getNetSettled（净结算额口径）", () => {
    it("聚合条件精确：受益主体 + status notIn 恰为 [PENDING, FROZEN]（REVERSED 必须计入）", async () => {
      mockPrisma.ledgerEntry.aggregate.mockResolvedValue({ _sum: { amount: 100 } });
      await svc.getNetSettled("STATION", "st-1");
      expect(mockPrisma.ledgerEntry.aggregate).toHaveBeenCalledWith({
        where: {
          beneficiaryType: "STATION",
          beneficiaryId: "st-1",
          status: { notIn: ["PENDING", "FROZEN"] },
        },
        _sum: { amount: true },
      });
      // 语义钉子：排除清单里绝不允许出现 REVERSED / SETTLED 限定
      const arg = mockPrisma.ledgerEntry.aggregate.mock.calls[0][0];
      expect(arg.where.status.notIn).toEqual(["PENDING", "FROZEN"]);
      expect(arg.where.status.equals).toBeUndefined();
    });

    it("空台账（_sum.amount 为 null）返回 0", async () => {
      mockPrisma.ledgerEntry.aggregate.mockResolvedValue({ _sum: { amount: null } });
      expect(await svc.getNetSettled("USER", "u-1")).toBe(0);
    });

    it("Decimal 聚合值转 number（Prisma Decimal 兼容）", async () => {
      // Prisma Decimal 对象 Number() 化走 valueOf/toString
      const decimalLike = { toString: () => "336.50", valueOf: () => "336.50" };
      mockPrisma.ledgerEntry.aggregate.mockResolvedValue({ _sum: { amount: decimalLike } });
      expect(await svc.getNetSettled("OPERATOR", "op-1")).toBe(336.5);
    });

    it("负净额透传不钳制（防御性暴露异常，供对账告警发现）", async () => {
      mockPrisma.ledgerEntry.aggregate.mockResolvedValue({ _sum: { amount: -12.34 } });
      expect(await svc.getNetSettled("MERCHANT", "m-1")).toBe(-12.34);
    });

    it("冲正对净额语义：REVERSED(+X) 与补偿 SETTLED(-X) 同时计入后净 0", async () => {
      // 单测层以聚合结果表达该语义：两笔计入相抵
      mockPrisma.ledgerEntry.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
      expect(await svc.getNetSettled("STATION", "st-reversed")).toBe(0);
    });

    it("五类受益主体类型均可查询", async () => {
      mockPrisma.ledgerEntry.aggregate.mockResolvedValue({ _sum: { amount: 1 } });
      for (const t of ["USER", "STATION", "OPERATOR", "MERCHANT", "PLATFORM"] as const) {
        expect(await svc.getNetSettled(t, "id-x")).toBe(1);
      }
      expect(mockPrisma.ledgerEntry.aggregate).toHaveBeenCalledTimes(5);
    });
  });
});
