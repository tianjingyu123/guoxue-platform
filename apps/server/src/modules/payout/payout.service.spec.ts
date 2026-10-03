import { PayoutService } from "./payout.service";
import { BusinessException } from "../../common/business.exception";

describe("PayoutService（提现自动代付）", () => {
  let svc: PayoutService;
  let prisma: any;
  let wechat: any;
  let system: any;

  const approvedApp = {
    id: "app1",
    userId: "u1",
    amount: 200,
    fee: 1.2,
    taxAmount: 40,
    actualAmount: 158.8,
    payMethod: "WECHAT",
    accountInfo: { name: "张三" },
    status: "APPROVED",
    payoutRef: null,
    transferBillNo: null,
    transferState: null,
    packageInfo: null,
  };

  beforeEach(() => {
    prisma = {
      withdrawalApplication: {
        findUnique: jest.fn(),
        update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ ...approvedApp, ...data })),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      // 风控冻结拦截：默认无冻结资金（放行）
      order: { aggregate: jest.fn().mockResolvedValue({ _sum: { frozenAmount: null } }) },
      auth: { findFirst: jest.fn().mockResolvedValue({ openId: "o_abc123" }) },
    };
    wechat = { transferToBalance: jest.fn(), queryTransferByOutBillNo: jest.fn() };
    system = { logAudit: jest.fn().mockResolvedValue(undefined) };
    svc = new PayoutService(prisma, wechat, system);
  });

  describe("autoPayout", () => {
    it("未审核（PENDING）不能发起打款 —— 打款必须先经审核", async () => {
      prisma.withdrawalApplication.findUnique.mockResolvedValue({ ...approvedApp, status: "PENDING" });
      await expect(svc.autoPayout("app1", "admin1")).rejects.toThrow(BusinessException);
      expect(wechat.transferToBalance).not.toHaveBeenCalled();
    });

    // 🔴 四眼原则：与 finance 人工打款同款 —— 审批人与打款人必须是两个人
    it("审批人不能同时发起自动打款（四眼原则）", async () => {
      prisma.withdrawalApplication.findUnique.mockResolvedValue({ ...approvedApp, reviewedBy: "admin1" });
      await expect(svc.autoPayout("app1", "admin1")).rejects.toThrow("审批人不能同时发起打款");
      expect(wechat.transferToBalance).not.toHaveBeenCalled();
    });

    it("受益人不能给自己的提现发起打款（防自审自批）", async () => {
      prisma.withdrawalApplication.findUnique.mockResolvedValue({ ...approvedApp, userId: "admin1" });
      await expect(svc.autoPayout("app1", "admin1")).rejects.toThrow(BusinessException);
      expect(wechat.transferToBalance).not.toHaveBeenCalled();
    });

    it("用户有风控冻结资金时不予自动打款", async () => {
      prisma.withdrawalApplication.findUnique.mockResolvedValue({ ...approvedApp, reviewedBy: "admin2" });
      prisma.order.aggregate.mockResolvedValue({ _sum: { frozenAmount: 300 } });
      await expect(svc.autoPayout("app1", "admin1")).rejects.toThrow("冻结");
      expect(wechat.transferToBalance).not.toHaveBeenCalled();
    });

    it("非微信收款方式：明确拒绝并提示走人工（银行卡/支付宝通道尚未接）", async () => {
      prisma.withdrawalApplication.findUnique.mockResolvedValue({ ...approvedApp, payMethod: "BANK" });
      await expect(svc.autoPayout("app1", "admin1")).rejects.toThrow(BusinessException);
      expect(wechat.transferToBalance).not.toHaveBeenCalled();
    });

    it("用户没绑微信 → 拒绝转账（商家转账必须要 openid）", async () => {
      prisma.withdrawalApplication.findUnique.mockResolvedValue(approvedApp);
      prisma.auth.findFirst.mockResolvedValue(null);
      await expect(svc.autoPayout("app1", "admin1")).rejects.toThrow(BusinessException);
      expect(wechat.transferToBalance).not.toHaveBeenCalled();
    });

    // 两个管理员同时点「打款」→ 两笔转账 → 用户收到两次钱。CAS 是第一道防线。
    it("CAS 抢锁失败（并发打款）直接拒绝，绝不重复调渠道转账", async () => {
      prisma.withdrawalApplication.findUnique.mockResolvedValue(approvedApp);
      prisma.withdrawalApplication.updateMany.mockResolvedValue({ count: 0 }); // 另一路已抢走
      await expect(svc.autoPayout("app1", "admin1")).rejects.toThrow(BusinessException);
      expect(wechat.transferToBalance).not.toHaveBeenCalled();
    });

    // 最关键的一条：接口调用成功 ≠ 钱到账。
    // 新版商家转账要用户在微信里点「确认收款」，此时钱还在路上。
    it("待用户确认收款 → 状态停在 TRANSFERRING，绝不标 PAID（钱还没到用户手上）", async () => {
      prisma.withdrawalApplication.findUnique.mockResolvedValue(approvedApp);
      wechat.transferToBalance.mockResolvedValue({
        transferBillNo: "T001", state: "WAIT_USER_CONFIRM", packageInfo: "PKG_XYZ",
      });

      const r = await svc.autoPayout("app1", "admin1");

      expect(r.needUserConfirm).toBe(true);
      expect(r.status).not.toBe("PAID");
      // 落库时不含 status: PAID
      const updateData = prisma.withdrawalApplication.update.mock.calls[0][0].data;
      expect(updateData.status).toBeUndefined();
      expect(updateData.packageInfo).toBe("PKG_XYZ");
    });

    it("渠道直接返回 SUCCESS（少数场景）→ 标 PAID 并清空 packageInfo", async () => {
      prisma.withdrawalApplication.findUnique.mockResolvedValue(approvedApp);
      wechat.transferToBalance.mockResolvedValue({ transferBillNo: "T002", state: "SUCCESS", packageInfo: null });

      const r = await svc.autoPayout("app1", "admin1");
      expect(r.status).toBe("PAID");
    });

    it("幂等键 payoutRef 作为 out_bill_no 提交渠道（DB 唯一约束是防重复打款的最后兜底）", async () => {
      prisma.withdrawalApplication.findUnique.mockResolvedValue({ ...approvedApp, payoutRef: "WD-EXISTING" });
      wechat.transferToBalance.mockResolvedValue({ transferBillNo: "T003", state: "ACCEPTED", packageInfo: null });

      await svc.autoPayout("app1", "admin1");
      expect(wechat.transferToBalance).toHaveBeenCalledWith(expect.objectContaining({ outBillNo: "WD-EXISTING" }));
    });

    // 不放回状态的话，这笔提现会永久卡在 TRANSFERRING：既打不了款，额度还一直被占着。
    it("渠道调用异常 → 状态放回 APPROVED，额度释放，可重新打款", async () => {
      prisma.withdrawalApplication.findUnique.mockResolvedValue(approvedApp);
      wechat.transferToBalance.mockRejectedValue(new Error("微信接口超时"));

      await expect(svc.autoPayout("app1", "admin1")).rejects.toThrow("微信接口超时");
      expect(prisma.withdrawalApplication.updateMany).toHaveBeenLastCalledWith({
        where: { id: "app1", status: "TRANSFERRING" },
        data: expect.objectContaining({ status: "APPROVED" }),
      });
    });

    it("≥2000 元提交加密收款人姓名（微信要求）", async () => {
      prisma.withdrawalApplication.findUnique.mockResolvedValue({ ...approvedApp, actualAmount: 2500 });
      wechat.transferToBalance.mockResolvedValue({ transferBillNo: "T4", state: "ACCEPTED", packageInfo: null });

      await svc.autoPayout("app1", "admin1");
      expect(wechat.transferToBalance).toHaveBeenCalledWith(
        expect.objectContaining({ amountFen: 250000, userName: "张三" }),
      );
    });

    it("小额不提交姓名", async () => {
      prisma.withdrawalApplication.findUnique.mockResolvedValue(approvedApp);
      wechat.transferToBalance.mockResolvedValue({ transferBillNo: "T5", state: "ACCEPTED", packageInfo: null });

      await svc.autoPayout("app1", "admin1");
      expect(wechat.transferToBalance).toHaveBeenCalledWith(
        expect.objectContaining({ amountFen: 15880, userName: undefined }),
      );
    });
  });

  describe("syncTransferState —— 只有真到账才标 PAID", () => {
    it("渠道 SUCCESS → PAID 且清空 packageInfo", async () => {
      prisma.withdrawalApplication.findUnique.mockResolvedValue({ ...approvedApp, status: "TRANSFERRING", payoutRef: "WD1" });
      wechat.queryTransferByOutBillNo.mockResolvedValue({ state: "SUCCESS" });

      await svc.syncTransferState("WD1");
      expect(prisma.withdrawalApplication.updateMany).toHaveBeenCalledWith({
        where: { id: "app1", status: "TRANSFERRING" },
        data: { status: "PAID", transferState: "SUCCESS", packageInfo: null },
      });
    });

    it("渠道 FAIL → 放回 APPROVED，额度释放，用户的钱没丢", async () => {
      prisma.withdrawalApplication.findUnique.mockResolvedValue({ ...approvedApp, status: "TRANSFERRING", payoutRef: "WD1" });
      wechat.queryTransferByOutBillNo.mockResolvedValue({ state: "FAIL", failReason: "收款账户异常" });

      await svc.syncTransferState("WD1");
      expect(prisma.withdrawalApplication.updateMany).toHaveBeenCalledWith({
        where: { id: "app1", status: "TRANSFERRING" },
        data: expect.objectContaining({ status: "APPROVED", transferFailReason: "收款账户异常" }),
      });
    });

    it("仍在途（WAIT_USER_CONFIRM）→ 只更新渠道状态，不动业务状态", async () => {
      prisma.withdrawalApplication.findUnique.mockResolvedValue({ ...approvedApp, status: "TRANSFERRING", payoutRef: "WD1" });
      wechat.queryTransferByOutBillNo.mockResolvedValue({ state: "WAIT_USER_CONFIRM" });

      await svc.syncTransferState("WD1");
      const call = prisma.withdrawalApplication.update.mock.calls[0][0];
      expect(call.data).toEqual({ transferState: "WAIT_USER_CONFIRM" });
      expect(call.data.status).toBeUndefined();
    });

    it("已 PAID → 幂等跳过，不重复查渠道", async () => {
      prisma.withdrawalApplication.findUnique.mockResolvedValue({ ...approvedApp, status: "PAID", payoutRef: "WD1" });
      await svc.syncTransferState("WD1");
      expect(wechat.queryTransferByOutBillNo).not.toHaveBeenCalled();
    });
  });

  describe("getMyTransferConfirm —— packageInfo 是能唤起转账的敏感凭据", () => {
    it("只有本人能取自己的 packageInfo", async () => {
      prisma.withdrawalApplication.findUnique.mockResolvedValue({
        ...approvedApp, status: "TRANSFERRING", packageInfo: "PKG_SECRET",
      });
      await expect(svc.getMyTransferConfirm("另一个人", "app1")).rejects.toThrow(BusinessException);
    });

    it("本人取到 packageInfo 用于调起微信确认页", async () => {
      prisma.withdrawalApplication.findUnique.mockResolvedValue({
        ...approvedApp, status: "TRANSFERRING", packageInfo: "PKG_SECRET", transferState: "WAIT_USER_CONFIRM",
      });
      const r = await svc.getMyTransferConfirm("u1", "app1");
      expect(r.needConfirm).toBe(true);
      expect(r.packageInfo).toBe("PKG_SECRET");
    });

    it("非待确认状态不返回 packageInfo", async () => {
      prisma.withdrawalApplication.findUnique.mockResolvedValue({ ...approvedApp, status: "PAID", packageInfo: null });
      const r = await svc.getMyTransferConfirm("u1", "app1");
      expect(r.needConfirm).toBe(false);
      expect(r.packageInfo).toBeNull();
    });
  });
});
