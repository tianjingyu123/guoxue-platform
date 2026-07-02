import { Test } from "@nestjs/testing";
import { MerchantAgreementService } from "./merchant-agreement.service";
import { MerchantService } from "./merchant.service";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";

const mockMerchantSvc = {
  handleAgreementSigned: jest.fn().mockResolvedValue({ id: "m1" }),
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
      mockPrisma.merchantAgreement.findFirst.mockResolvedValue({
        id: "a1", merchantId: "TEMPLATE", version: "1.0", title: "商家入驻协议", content: "<p>协议内容</p>",
      });
      const result = await svc.getLatestAgreement();
      expect(result.version).toBe("1.0");
    });

    it("无可用协议抛出异常", async () => {
      mockPrisma.merchantAgreement.findFirst.mockResolvedValue(null);
      await expect(svc.getLatestAgreement()).rejects.toThrow(BusinessException);
    });
  });

  describe("signAgreement", () => {
    it("签署协议成功", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: "m1", userId: "u1", status: "AGREEMENT_PENDING" });
      mockPrisma.merchantAgreement.findFirst.mockResolvedValue({
        id: "a1", merchantId: "TEMPLATE", version: "1.0", title: "商家入驻协议", content: "<p>内容</p>",
      });
      mockPrisma.merchantAgreement.create.mockResolvedValue({
        id: "a2", merchantId: "m1", version: "1.0", signedAt: new Date(),
      });
      const result = await svc.signAgreement("u1", "127.0.0.1", { version: "1.0", agreed: true });
      expect(result.merchantId).toBe("m1");
    });

    it("不同意协议抛出异常", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: "m1", userId: "u1", status: "AGREEMENT_PENDING" });
      await expect(svc.signAgreement("u1", "127.0.0.1", { version: "1.0", agreed: false })).rejects.toThrow(BusinessException);
    });

    it("状态不正确抛出异常", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: "m1", userId: "u1", status: "PENDING_REVIEW" });
      await expect(svc.signAgreement("u1", "127.0.0.1", { version: "1.0", agreed: true })).rejects.toThrow(BusinessException);
    });
  });

  describe("createAgreement", () => {
    it("管理员创建协议模版", async () => {
      mockPrisma.merchantAgreement.create.mockResolvedValue({
        id: "a1", merchantId: "TEMPLATE", version: "1.0", title: "入驻协议", content: "<p>内容</p>",
      });
      const result = await svc.createAgreement({ version: "1.0", title: "入驻协议", content: "<p>内容</p>" });
      expect(result.version).toBe("1.0");
    });
  });

  describe("listAgreements", () => {
    it("返回协议模版列表", async () => {
      mockPrisma.merchantAgreement.findMany.mockResolvedValue([{ id: "a1", version: "1.0" }]);
      mockPrisma.merchantAgreement.count.mockResolvedValue(1);
      const result = await svc.listAgreements({});
      expect(result.list).toHaveLength(1);
    });
  });

  describe("deleteAgreement", () => {
    it("删除协议成功", async () => {
      mockPrisma.merchantAgreement.findUnique.mockResolvedValue({ id: "a1", version: "1.0" });
      mockPrisma.merchantAgreement.delete.mockResolvedValue({});
      await expect(svc.deleteAgreement("a1")).resolves.toBeUndefined();
    });

    it("协议不存在时抛 404", async () => {
      mockPrisma.merchantAgreement.findUnique.mockResolvedValue(null);
      await expect(svc.deleteAgreement("nope")).rejects.toThrow(BusinessException);
      expect(mockPrisma.merchantAgreement.delete).not.toHaveBeenCalled();
    });
  });
});
