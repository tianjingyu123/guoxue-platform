import { Test } from "@nestjs/testing";
import { MerchantAgreementService } from "./merchant-agreement.service";
import { MerchantService } from "./merchant.service";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";

const mockMerchantSvc = {
  handleAgreementSigned: jest.fn().mockResolvedValue({ id: "m1" }),
};

const template = {
  id: "a1", merchantId: "TEMPLATE", version: "1.0", title: "商家入驻协议", content: "协议内容",
};

const mockPrisma: any = {
  merchant: { findUnique: jest.fn() },
  merchantAgreement: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  merchantDepositRecord: { findFirst: jest.fn() },
};

describe("MerchantAgreementService", () => {
  let svc: MerchantAgreementService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        MerchantAgreementService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MerchantService, useValue: mockMerchantSvc },
      ],
    }).compile();
    svc = mod.get(MerchantAgreementService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("getLatestAgreement", () => {
    it("返回最新协议", async () => {
      mockPrisma.merchantAgreement.findFirst.mockResolvedValue(template);
      expect((await svc.getLatestAgreement()).version).toBe("1.0");
    });

    it("无可用协议抛出异常", async () => {
      mockPrisma.merchantAgreement.findFirst.mockResolvedValue(null);
      await expect(svc.getLatestAgreement()).rejects.toThrow(BusinessException);
    });
  });

  describe("signAgreement", () => {
    beforeEach(() => {
      mockPrisma.merchantAgreement.findFirst.mockResolvedValue(template);
      mockPrisma.merchantAgreement.create.mockResolvedValue({
        id: "a2", merchantId: "m1", version: "1.0", signedAt: new Date(),
      });
      mockPrisma.merchantDepositRecord.findFirst.mockResolvedValue(null);
    });

    it("免保证金待签约商家可签署", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({
        id: "m1", userId: "u1", status: "AGREEMENT_PENDING", depositAmount: 0,
      });

      const result = await svc.signAgreement("u1", "127.0.0.1", { version: "1.0", agreed: true });

      expect(result.merchantId).toBe("m1");
      expect(mockMerchantSvc.handleAgreementSigned).toHaveBeenCalledWith("m1", "127.0.0.1");
    });

    it("兼容零金额遗留待缴状态直接签署", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({
        id: "m1", userId: "u1", status: "DEPOSIT_PENDING", depositAmount: 0,
      });

      await expect(svc.signAgreement("u1", "127.0.0.1", { version: "1.0", agreed: true })).resolves.toBeTruthy();
    });

    it("正金额无真实流水时拒绝签署", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({
        id: "m1", userId: "u1", status: "AGREEMENT_PENDING", depositAmount: 2000,
      });

      await expect(svc.signAgreement("u1", "127.0.0.1", { version: "1.0", agreed: true })).rejects.toThrow("未核验到真实保证金");
      expect(mockPrisma.merchantAgreement.create).not.toHaveBeenCalled();
    });

    it("SIMULATED 流水不得解锁签约", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({
        id: "m1", userId: "u1", status: "AGREEMENT_PENDING", depositAmount: 2000,
      });
      mockPrisma.merchantDepositRecord.findFirst.mockResolvedValue({ payTransactionId: "SIMULATED-dr1", amount: 2000 });

      await expect(svc.signAgreement("u1", "127.0.0.1", { version: "1.0", agreed: true })).rejects.toThrow("未核验到真实保证金");
    });

    it("真实成功流水可解锁正金额签约", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({
        id: "m1", userId: "u1", status: "AGREEMENT_PENDING", depositAmount: 2000,
      });
      mockPrisma.merchantDepositRecord.findFirst.mockResolvedValue({ payTransactionId: "WX202607190001", amount: 2000 });

      await expect(svc.signAgreement("u1", "127.0.0.1", { version: "1.0", agreed: true })).resolves.toBeTruthy();
    });

    it("真实流水金额不足时仍拒绝签约", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({
        id: "m1", userId: "u1", status: "AGREEMENT_PENDING", depositAmount: 2000,
      });
      mockPrisma.merchantDepositRecord.findFirst.mockResolvedValue({ payTransactionId: "WX202607190002", amount: 1 });

      await expect(svc.signAgreement("u1", "127.0.0.1", { version: "1.0", agreed: true })).rejects.toThrow("未核验到真实保证金");
      expect(mockPrisma.merchantAgreement.create).not.toHaveBeenCalled();
    });

    it("协议版本已更新时拒绝签旧版", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({
        id: "m1", userId: "u1", status: "AGREEMENT_PENDING", depositAmount: 0,
      });

      await expect(svc.signAgreement("u1", "127.0.0.1", { version: "0.9", agreed: true })).rejects.toThrow("协议已更新");
      expect(mockPrisma.merchantAgreement.create).not.toHaveBeenCalled();
    });

    it("不同意协议时拒绝", async () => {
      await expect(svc.signAgreement("u1", "127.0.0.1", { version: "1.0", agreed: false })).rejects.toThrow(BusinessException);
    });

    it("非签约状态拒绝", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({
        id: "m1", userId: "u1", status: "PENDING_REVIEW", depositAmount: 0,
      });
      await expect(svc.signAgreement("u1", "127.0.0.1", { version: "1.0", agreed: true })).rejects.toThrow(BusinessException);
    });
  });

  describe("template management", () => {
    it("管理员创建协议模板", async () => {
      mockPrisma.merchantAgreement.create.mockResolvedValue(template);
      expect((await svc.createAgreement({ version: "1.0", title: "商家入驻协议", content: "协议内容" })).version).toBe("1.0");
    });

    it("删除不存在的协议报错", async () => {
      mockPrisma.merchantAgreement.findUnique.mockResolvedValue(null);
      await expect(svc.deleteAgreement("nope")).rejects.toThrow(BusinessException);
      expect(mockPrisma.merchantAgreement.delete).not.toHaveBeenCalled();
    });

    it("协议模板分页非法参数安全回落", async () => {
      mockPrisma.merchantAgreement.findMany.mockResolvedValue([]);
      mockPrisma.merchantAgreement.count.mockResolvedValue(0);
      await svc.listAgreements({ page: "abc" as any, pageSize: "xyz" as any });
      expect(mockPrisma.merchantAgreement.findMany.mock.calls[0][0].skip).toBe(0);
    });
  });
});
