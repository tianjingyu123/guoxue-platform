import { Test } from "@nestjs/testing";
import { MerchantDepositService } from "./merchant-deposit.service";
import { MerchantService } from "./merchant.service";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";

const mockMerchantSvc = {
  calculateDeposit: jest.fn().mockResolvedValue(2000),
  handleDepositPaid: jest.fn().mockResolvedValue({ id: "m1" }),
};

const mockPrisma: any = {
  merchant: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  merchantDepositRecord: {
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

describe("MerchantDepositService", () => {
  let svc: MerchantDepositService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        MerchantDepositService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MerchantService, useValue: mockMerchantSvc },
      ],
    }).compile();
    svc = mod.get(MerchantDepositService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("getDepositInfo", () => {
    it("返回保证金信息", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({
        id: "m1", depositAmount: 2000, depositPaid: false, status: "DEPOSIT_PENDING",
      });
      const result = await svc.getDepositInfo("u1");
      expect(result.depositAmount).toBe(2000);
      expect(result.depositPaid).toBe(false);
    });

    it("商家不存在抛出异常", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue(null);
      await expect(svc.getDepositInfo("u1")).rejects.toThrow(BusinessException);
    });
  });

  describe("payDeposit", () => {
    it("发起保证金支付成功", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({
        id: "m1", userId: "u1", status: "DEPOSIT_PENDING", depositAmount: 2000,
      });
      mockPrisma.merchantDepositRecord.create.mockResolvedValue({
        id: "dr1", merchantId: "m1", amount: 2000, type: "PAYMENT", status: "PENDING",
      });
      mockPrisma.merchantDepositRecord.update.mockResolvedValue({
        id: "dr1", status: "SUCCESS",
      });
      const result = await svc.payDeposit("u1", { payMethod: "WECHAT" });
      expect(result.amount).toBe(2000);
      expect(result.payMethod).toBe("WECHAT");
      // 模拟支付：记录置 SUCCESS 并推进状态机
      expect(mockPrisma.merchantDepositRecord.update).toHaveBeenCalledWith({
        where: { id: "dr1" },
        data: expect.objectContaining({ status: "SUCCESS" }),
      });
      expect(mockMerchantSvc.handleDepositPaid).toHaveBeenCalledWith("m1");
      expect(result.paid).toBe(true);
      expect(result.status).toBe("AGREEMENT_PENDING");
    });

    it("状态不正确抛出异常", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({
        id: "m1", userId: "u1", status: "ACTIVE", depositAmount: 2000,
      });
      await expect(svc.payDeposit("u1", { payMethod: "WECHAT" })).rejects.toThrow(BusinessException);
    });
  });

  describe("refundDeposit", () => {
    it("管理员退还保证金", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: "m1", depositAmount: 2000 });
      mockPrisma.merchantDepositRecord.create.mockResolvedValue({
        id: "dr2", merchantId: "m1", amount: 2000, type: "REFUND", status: "SUCCESS",
      });
      const result = await svc.refundDeposit("m1", "admin1", {});
      expect(result.type).toBe("REFUND");
      expect(result.status).toBe("SUCCESS");
    });

    it("不能给自己名下的商家退还保证金（防自审自批）", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: "m1", userId: "u1", depositAmount: 2000 });
      await expect(svc.refundDeposit("m1", "u1", {})).rejects.toThrow(BusinessException);
    });
  });

  describe("adjustDeposit", () => {
    it("调整保证金金额", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: "m1", depositAmount: 2000 });
      mockPrisma.merchant.update.mockResolvedValue({ id: "m1", depositAmount: 3000 });
      const result = await svc.adjustDeposit("m1", { amount: 3000 });
      expect(result.depositAmount).toBe(3000);
    });
  });

  describe("listDepositRecords", () => {
    it("返回保证金流水列表", async () => {
      mockPrisma.merchantDepositRecord.findMany.mockResolvedValue([{ id: "dr1", amount: 2000, type: "PAYMENT" }]);
      mockPrisma.merchantDepositRecord.count.mockResolvedValue(1);
      const result = await svc.listDepositRecords("m1");
      expect(result.list).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("page='abc' 非法入参 → skip 不为 NaN（safePagination 兜底）", async () => {
      mockPrisma.merchantDepositRecord.findMany.mockResolvedValue([]);
      mockPrisma.merchantDepositRecord.count.mockResolvedValue(0);
      await svc.listDepositRecords("m1", "abc" as any, "xyz" as any);
      const callArg = mockPrisma.merchantDepositRecord.findMany.mock.calls[0][0];
      expect(Number.isNaN(callArg.skip)).toBe(false);
      expect(callArg.skip).toBe(0);
    });
  });
});
