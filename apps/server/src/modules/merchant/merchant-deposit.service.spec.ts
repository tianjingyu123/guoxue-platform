import { Test } from "@nestjs/testing";
import { MerchantDepositService } from "./merchant-deposit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";

const mockPrisma: any = {
  merchant: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  merchantDepositRecord: {
    create: jest.fn(),
    update: jest.fn(),
    findFirst: jest.fn(),
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
      ],
    }).compile();
    svc = mod.get(MerchantDepositService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("getDepositInfo", () => {
    it("免保证金商家返回免缴且不可在线收退款", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({
        id: "m1", depositAmount: 0, depositPaid: false, status: "AGREEMENT_PENDING",
      });
      mockPrisma.merchantDepositRecord.findFirst.mockResolvedValue(null);

      const result = await svc.getDepositInfo("u1");

      expect(result).toEqual(expect.objectContaining({
        depositAmount: 0,
        depositPaid: false,
        waived: true,
        collectionAvailable: false,
        refundAvailable: false,
      }));
    });

    it("只把非模拟成功流水认定为真实到账", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({
        id: "m1", depositAmount: 2000, depositPaid: true, status: "AGREEMENT_PENDING",
      });
      mockPrisma.merchantDepositRecord.findFirst.mockResolvedValue({ payTransactionId: "WX202607190001", amount: 2000 });

      const result = await svc.getDepositInfo("u1");

      expect(result.depositPaid).toBe(true);
      expect(result.waived).toBe(false);
    });

    it("SIMULATED 流水不得被认定为到账", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({
        id: "m1", depositAmount: 2000, depositPaid: true, status: "AGREEMENT_PENDING",
      });
      mockPrisma.merchantDepositRecord.findFirst.mockResolvedValue({ payTransactionId: "SIMULATED-dr1", amount: 2000 });

      const result = await svc.getDepositInfo("u1");

      expect(result.depositPaid).toBe(false);
    });

    it("商家不存在抛出异常", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue(null);
      await expect(svc.getDepositInfo("u1")).rejects.toThrow(BusinessException);
    });
  });

  describe("payDeposit", () => {
    it("免保证金不创建支付流水", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: "m1", depositAmount: 0 });

      await expect(svc.payDeposit("u1", { payMethod: "WECHAT" })).rejects.toThrow("无需支付");
      expect(mockPrisma.merchantDepositRecord.create).not.toHaveBeenCalled();
      expect(mockPrisma.merchantDepositRecord.update).not.toHaveBeenCalled();
    });

    it("正金额在真实收款未接入时拒绝且零写入", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: "m1", depositAmount: 2000 });

      await expect(svc.payDeposit("u1", { payMethod: "ALIPAY" })).rejects.toThrow("在线收款尚未开放");
      expect(mockPrisma.merchantDepositRecord.create).not.toHaveBeenCalled();
      expect(mockPrisma.merchant.update).not.toHaveBeenCalled();
    });
  });

  describe("refundDeposit", () => {
    it("退款渠道未接入时拒绝且不伪造 SUCCESS", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({
        id: "m1", userId: "u1", depositAmount: 2000, depositPaid: true,
      });

      await expect(svc.refundDeposit("m1", "admin1", { amount: 2000 })).rejects.toThrow("已阻止账面退款");
      expect(mockPrisma.merchantDepositRecord.create).not.toHaveBeenCalled();
    });

    it("不能给自己名下的商家发起退还", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({
        id: "m1", userId: "u1", depositAmount: 2000, depositPaid: true,
      });

      await expect(svc.refundDeposit("m1", "u1", {})).rejects.toThrow(BusinessException);
      expect(mockPrisma.merchantDepositRecord.create).not.toHaveBeenCalled();
    });
  });

  describe("adjustDeposit", () => {
    it("当前政策拒绝调高保证金", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({
        id: "m1", depositAmount: 0, depositPaid: false, status: "AGREEMENT_PENDING",
      });

      await expect(svc.adjustDeposit("m1", { amount: 3000 })).rejects.toThrow("不可设置正金额");
      expect(mockPrisma.merchant.update).not.toHaveBeenCalled();
    });

    it("存在账面余额时拒绝直接调零", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({
        id: "m1", depositAmount: 2000, depositPaid: true, status: "AGREEMENT_PENDING",
      });

      await expect(svc.adjustDeposit("m1", { amount: 0 })).rejects.toThrow("不可直接调额");
      expect(mockPrisma.merchant.update).not.toHaveBeenCalled();
    });

    it("零金额遗留待缴状态可推进到待签约", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({
        id: "m1", depositAmount: 0, depositPaid: false, status: "DEPOSIT_PENDING",
      });
      mockPrisma.merchant.update.mockResolvedValue({
        id: "m1", depositAmount: 0, depositPaid: false, status: "AGREEMENT_PENDING",
      });

      const result = await svc.adjustDeposit("m1", { amount: 0 });

      expect(result.status).toBe("AGREEMENT_PENDING");
      expect(mockPrisma.merchant.update).toHaveBeenCalledWith({
        where: { id: "m1" },
        data: { depositAmount: 0, depositPaid: false, status: "AGREEMENT_PENDING" },
      });
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

    it("非法分页参数安全回落", async () => {
      mockPrisma.merchantDepositRecord.findMany.mockResolvedValue([]);
      mockPrisma.merchantDepositRecord.count.mockResolvedValue(0);
      await svc.listDepositRecords("m1", "abc" as any, "xyz" as any);
      expect(mockPrisma.merchantDepositRecord.findMany.mock.calls[0][0].skip).toBe(0);
    });
  });
});
