import { Test } from "@nestjs/testing";
import { MerchantController } from "./merchant.controller";
import { MerchantService } from "./merchant.service";
import { MerchantDepositService } from "./merchant-deposit.service";
import { MerchantAgreementService } from "./merchant-agreement.service";
import { FeatureFlagGuard } from "../../common/feature-flag.guard";
import { FeatureFlagService } from "../feature-flag/feature-flag.service";
import { MerchantGuard } from "./merchant.guard";
import { MerchantMetricService } from "./merchant-metric.service";

const mockMerchantSvc = {
  createApplication: jest.fn().mockResolvedValue({ id: "m1", status: "PENDING_REVIEW" }),
  getApplication: jest.fn().mockResolvedValue({ id: "m1", shopName: "店铺A", status: "PENDING_REVIEW" }),
  updateApplication: jest.fn().mockResolvedValue({ id: "m1", shopName: "新名称" }),
  submitForReview: jest.fn().mockResolvedValue({ id: "m1", status: "PENDING_REVIEW" }),
};
const mockDepositSvc = {
  getDepositInfo: jest.fn().mockResolvedValue({ depositAmount: 2000, depositPaid: false }),
  payDeposit: jest.fn().mockResolvedValue({ depositRecordId: "dr1", amount: 2000, payMethod: "WECHAT" }),
};
const mockAgreementSvc = {
  getLatestAgreement: jest.fn().mockResolvedValue({ id: "a1", version: "1.0", title: "协议" }),
  signAgreement: jest.fn().mockResolvedValue({ id: "a2", merchantId: "m1" }),
};
const mockFeatureFlag = { isEnabled: jest.fn().mockResolvedValue(true) };

describe("MerchantController", () => {
  let ctrl: MerchantController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [MerchantController],
      providers: [
        { provide: MerchantService, useValue: mockMerchantSvc },
        { provide: MerchantDepositService, useValue: mockDepositSvc },
        { provide: MerchantAgreementService, useValue: mockAgreementSvc },
        // 履-P1 新端点 my/metrics 的依赖
        { provide: MerchantMetricService, useValue: { getMyMetrics: jest.fn().mockResolvedValue({ days: [], summary: {} }) } },
      ],
    })
      .overrideGuard(FeatureFlagGuard).useValue({ canActivate: () => true })
      .overrideGuard(MerchantGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(MerchantController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  const mockReq = (id = "u1") => ({ user: { id }, socket: { remoteAddress: "127.0.0.1" } } as any);

  it("POST /merchant/apply — 提交入驻申请", async () => {
    const result = await ctrl.createApplication(mockReq(), { shopName: "测试店铺", contactName: "张三", contactPhone: "13800138000", idCardNumber: "110101199001011234" } as any);
    expect(result.status).toBe("PENDING_REVIEW");
    expect(mockMerchantSvc.createApplication).toHaveBeenCalled();
  });

  it("GET /merchant/application — 获取申请状态", async () => {
    const result = await ctrl.getApplication(mockReq());
    expect(result.shopName).toBe("店铺A");
  });

  it("PUT /merchant/application — 修改申请", async () => {
    const result = await ctrl.updateApplication(mockReq(), { shopName: "新名称" });
    expect(result.shopName).toBe("新名称");
  });

  it("POST /merchant/submit — 提交审核", async () => {
    const result = await ctrl.submitForReview(mockReq());
    expect(result.status).toBe("PENDING_REVIEW");
  });

  it("GET /merchant/deposit-info — 获取保证金信息", async () => {
    const result = await ctrl.getDepositInfo(mockReq());
    expect(result.depositAmount).toBe(2000);
  });

  it("POST /merchant/pay-deposit — 发起保证金支付", async () => {
    const result = await ctrl.payDeposit(mockReq(), { payMethod: "WECHAT" });
    expect(result.amount).toBe(2000);
  });

  it("GET /merchant/agreement-preview — 预览协议", async () => {
    const result = await ctrl.previewAgreement();
    expect(result.version).toBe("1.0");
  });

  it("POST /merchant/sign-agreement — 签署协议", async () => {
    const result = await ctrl.signAgreement(mockReq(), { version: "1.0", agreed: true });
    expect(result.merchantId).toBe("m1");
  });
});
