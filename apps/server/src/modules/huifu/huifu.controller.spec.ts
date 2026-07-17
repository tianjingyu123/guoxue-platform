import { Test, TestingModule } from "@nestjs/testing";
import { HuifuController } from "./huifu.controller";
import { HuifuService } from "./huifu.service";

const mockSvc = {
  createPayment: jest.fn(),
  queryPayment: jest.fn(),
  createSplit: jest.fn(),
  requestSplit: jest.fn(),
  querySplit: jest.fn(),
  requestRefund: jest.fn(),
  verifyNotify: jest.fn(),
  handleNotify: jest.fn(),
  getAllConfigs: jest.fn(),
  setConfig: jest.fn(),
  isEnabled: jest.fn(),
  ping: jest.fn(),
  queryBalance: jest.fn(),
  downloadBill: jest.fn(),
};

const mockRequest = (userId: string) => ({
  user: { id: userId, role: "USER" },
}) as any;

describe("HuifuController", () => {
  let ctrl: HuifuController;

  beforeEach(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      controllers: [HuifuController],
      providers: [{ provide: HuifuService, useValue: mockSvc }],
    }).compile();
    ctrl = mod.get(HuifuController);
    jest.clearAllMocks();
  });

  it("应被定义", () => expect(ctrl).toBeDefined());

  describe("支付", () => {
    it("创建支付", async () => {
      mockSvc.createPayment.mockResolvedValue({ outTradeNo: "HF001", payUrl: "https://pay.example.com" });
      const result = await ctrl.createPayment(mockRequest("user-1"), { orderId: "order-1", payType: "WECHAT_H5" });
      expect(result.outTradeNo).toBe("HF001");
      expect(mockSvc.createPayment).toHaveBeenCalledWith("user-1", expect.any(Object));
    });

    it("查询支付状态", async () => {
      mockSvc.queryPayment.mockResolvedValue({ trade_status: "SUCCESS" });
      const result = await ctrl.queryPayment("HF001", mockRequest("user-1"));
      expect(result.trade_status).toBe("SUCCESS");
      expect(mockSvc.queryPayment).toHaveBeenCalledWith("HF001", "user-1");
    });
  });

  describe("回调", () => {
    it("验签通过应返回成功（斗拱 sign 在通知体内）", async () => {
      mockSvc.verifyNotify.mockResolvedValue(true);
      const body = { resp_data: '{"trans_stat":"S","req_seq_id":"HF001"}', sign: "valid-signature" };
      const result = await ctrl.handleNotify(body);
      expect(result.resp_code).toBe("00000000");
      expect(result.resp_desc).toBe("成功");
      expect(mockSvc.verifyNotify).toHaveBeenCalledWith(body, "valid-signature");
      expect(mockSvc.handleNotify).toHaveBeenCalledWith(body);
    });

    it("验签失败应返回失败", async () => {
      mockSvc.verifyNotify.mockResolvedValue(false);
      const result = await ctrl.handleNotify({ resp_data: "{}", sign: "invalid-signature" });
      expect(result.resp_code).toBe("FAIL");
      expect(mockSvc.handleNotify).not.toHaveBeenCalled();
    });

    it("缺少签名应直接拒绝", async () => {
      const result = await ctrl.handleNotify({ resp_data: "{}" });
      expect(result.resp_code).toBe("FAIL");
      expect(mockSvc.verifyNotify).not.toHaveBeenCalled();
    });
  });

  describe("连通性探针", () => {
    it("ping 应透传服务结果", async () => {
      mockSvc.ping.mockResolvedValue({ ok: true, respCode: "00000000", respDesc: "成功", merchantName: "测试商户" });
      const result = await ctrl.ping();
      expect(result.ok).toBe(true);
      expect(result.merchantName).toBe("测试商户");
    });
  });

  describe("分账", () => {
    // 🔴 四眼收口：/huifu/split 不再直接执行渠道分账，而是提交 FundApproval 审批
    it("发起分账 → 提交资金审批（不直接执行）", async () => {
      mockSvc.requestSplit.mockResolvedValue({ submitted: true, approvalId: "fa-split", status: "PENDING" });
      const result: any = await ctrl.createSplit(
        { orderId: "order-1", amount: 100, receivers: [{ acctId: "A1", amount: 10, name: "张三" }] },
        mockRequest("admin1"),
      );
      expect(result.submitted).toBe(true);
      expect(mockSvc.requestSplit).toHaveBeenCalledWith(expect.any(Object), "admin1");
      expect(mockSvc.createSplit).not.toHaveBeenCalled();
    });

    it("查询分账结果", async () => {
      mockSvc.querySplit.mockResolvedValue({ splitStatus: "SUCCESS" });
      const result = await ctrl.querySplit("order-1");
      expect(result.splitStatus).toBe("SUCCESS");
    });
  });

  describe("退款", () => {
    it("申请退款（提交审批）", async () => {
      mockSvc.requestRefund.mockResolvedValue({ submitted: true, approvalId: "fa1", status: "PENDING", message: "已提交审批，待财务审批后生效" });
      const result = await ctrl.createRefund({ orderId: "order-1", amount: 50 }, mockRequest("admin1"));
      expect(result.submitted).toBe(true);
      expect(result.status).toBe("PENDING");
      expect(mockSvc.requestRefund).toHaveBeenCalledWith(expect.any(Object), "admin1");
    });
  });

  describe("配置管理", () => {
    it("获取配置列表", async () => {
      mockSvc.getAllConfigs.mockResolvedValue([{ key: "merchantId", value: "M001" }]);
      const result = await ctrl.getAllConfigs();
      expect(result).toHaveLength(1);
    });

    it("更新配置", async () => {
      mockSvc.setConfig.mockResolvedValue(undefined);
      await ctrl.updateConfig({ key: "merchantId", value: "M002", description: "新商户" });
      expect(mockSvc.setConfig).toHaveBeenCalledWith("merchantId", "M002", "新商户");
    });

    it("检查启用状态", async () => {
      mockSvc.isEnabled.mockResolvedValue(true);
      const result = await ctrl.checkStatus();
      expect(result.enabled).toBe(true);
    });
  });

  describe("账单与余额", () => {
    it("查询余额", async () => {
      mockSvc.queryBalance.mockResolvedValue({ balance: 100000 });
      const result = await ctrl.queryBalance();
      expect(result.balance).toBe(100000);
    });

    it("下载账单（斗拱对账接口未接入·诚实降级）", async () => {
      mockSvc.downloadBill.mockRejectedValue(new Error("汇付对账单下载暂未接入斗拱协议"));
      await expect(ctrl.downloadBill("2026-05-15")).rejects.toThrow("暂未接入");
      expect(mockSvc.downloadBill).toHaveBeenCalledWith("2026-05-15");
    });
  });
});
