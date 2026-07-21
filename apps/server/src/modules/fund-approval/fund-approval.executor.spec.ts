import { FundApprovalExecutor } from "./fund-approval.executor";
import { BusinessException } from "../../common/business.exception";

/**
 * 资金审批执行器 · 职责分离（防自审自批）测试
 * 真机走查 2026-07-01 发现：发起人可审批自己的资金操作 → 单人可凭空造币，已加守卫。
 */
describe("FundApprovalExecutor 自审自批防护", () => {
  let executor: FundApprovalExecutor;
  let approvals: any;
  let coin: any;
  let referrals: any;
  let system: any;

  beforeEach(() => {
    approvals = {
      findById: jest.fn(),
      claim: jest.fn().mockResolvedValue(true),
      revertToPending: jest.fn(),
    };
    coin = { recharge: jest.fn().mockResolvedValue({ balance: 100 }) };
    referrals = {
      create: jest.fn().mockResolvedValue({ id: "r1" }),
      update: jest.fn().mockResolvedValue({ id: "r1" }),
      delete: jest.fn().mockResolvedValue({ id: "r1" }),
    };
    system = {
      upsertMemberConfig: jest.fn().mockResolvedValue({ id: "m1" }),
      updateMemberConfig: jest.fn().mockResolvedValue({ id: "m1" }),
      deleteMemberConfig: jest.fn().mockResolvedValue({ id: "m1" }),
    };
    executor = new FundApprovalExecutor(approvals, {} as any, {} as any, coin, {} as any, referrals, system);
  });

  it("发起人不能审批自己发起的资金操作（approve）", async () => {
    approvals.findById.mockResolvedValue({ id: "a1", status: "PENDING", requestedBy: "admin-1", type: "RECHARGE", payload: {} });
    await expect(executor.review("a1", true, undefined, "admin-1")).rejects.toBeInstanceOf(BusinessException);
    expect(approvals.claim).not.toHaveBeenCalled();
    expect(coin.recharge).not.toHaveBeenCalled();
  });

  it("发起人不能拒绝自己发起的资金操作（reject）", async () => {
    approvals.findById.mockResolvedValue({ id: "a1", status: "PENDING", requestedBy: "admin-1", type: "RECHARGE", payload: {} });
    await expect(executor.review("a1", false, undefined, "admin-1")).rejects.toBeInstanceOf(BusinessException);
    expect(approvals.claim).not.toHaveBeenCalled();
  });

  it("其他审批人可以正常审批通过并执行", async () => {
    approvals.findById.mockResolvedValue({ id: "a1", status: "PENDING", requestedBy: "admin-1", type: "RECHARGE", payload: { userId: "u1", amountCoin: 100 } });
    const res = await executor.review("a1", true, undefined, "admin-2");
    expect(res.approved).toBe(true);
    expect(approvals.claim).toHaveBeenCalledWith("a1", "APPROVED", "admin-2", undefined);
    expect(coin.recharge).toHaveBeenCalled();
  });

  it("已处理的审批单不可重复审批", async () => {
    approvals.findById.mockResolvedValue({ id: "a1", status: "APPROVED", requestedBy: "admin-1", type: "RECHARGE", payload: {} });
    await expect(executor.review("a1", true, undefined, "admin-2")).rejects.toBeInstanceOf(BusinessException);
  });

  // 🔴 汇付分账四眼收口：审批通过后由执行器调用 createSplit 真正发起渠道分账
  it("HUIFU_SPLIT 审批通过后执行 huifu.createSplit", async () => {
    const huifu = { createSplit: jest.fn().mockResolvedValue({ splitStatus: "PROCESSING" }) };
    const exec2 = new FundApprovalExecutor(approvals, {} as any, huifu as any, coin, {} as any, referrals, system);
    const payload = { orderId: "order-1", amount: 100, receivers: [{ acctId: "A1", amount: 100, name: "张三" }] };
    approvals.findById.mockResolvedValue({ id: "a2", status: "PENDING", requestedBy: "admin-1", type: "HUIFU_SPLIT", payload });
    const res = await exec2.review("a2", true, undefined, "admin-2");
    expect(res.approved).toBe(true);
    expect(huifu.createSplit).toHaveBeenCalledWith(payload);
  });
  it("临时分佣新增审批通过后执行真实创建，并保留发起人为创建人", async () => {
    const dto = { stationId: "station-1", commissionRate: 10, validFrom: "2026-07-20T00:00:00.000Z", validTo: "2026-07-27T00:00:00.000Z" };
    approvals.findById.mockResolvedValue({
      id: "a3", status: "PENDING", requestedBy: "admin-1", type: "COMMISSION_CONFIG",
      payload: { method: "createTemporaryReferralConfig", dto },
    });
    await executor.review("a3", true, undefined, "admin-2");
    expect(referrals.create).toHaveBeenCalledWith(dto, "admin-1");
  });

  it("临时分佣修改审批通过后执行真实更新", async () => {
    const dto = { commissionRate: 20 };
    approvals.findById.mockResolvedValue({
      id: "a4", status: "PENDING", requestedBy: "admin-1", type: "COMMISSION_CONFIG",
      payload: { method: "updateTemporaryReferralConfig", id: "r1", dto },
    });
    await executor.review("a4", true, undefined, "admin-2");
    expect(referrals.update).toHaveBeenCalledWith("r1", dto);
  });

  it("临时分佣删除审批通过后执行真实删除", async () => {
    approvals.findById.mockResolvedValue({
      id: "a5", status: "PENDING", requestedBy: "admin-1", type: "COMMISSION_CONFIG",
      payload: { method: "deleteTemporaryReferralConfig", id: "r1" },
    });
    await executor.review("a5", true, undefined, "admin-2");
    expect(referrals.delete).toHaveBeenCalledWith("r1");
  });
  it("会员套餐新增审批通过后执行真实写入", async () => {
    const dto = { level: "MONTHLY", name: "月卡", price: 19 };
    approvals.findById.mockResolvedValue({
      id: "a6", status: "PENDING", requestedBy: "admin-1", type: "MEMBER_CONFIG",
      payload: { method: "upsertMemberConfig", dto },
    });
    await executor.review("a6", true, undefined, "admin-2");
    expect(system.upsertMemberConfig).toHaveBeenCalledWith(dto);
  });

  it("会员套餐修改审批通过后执行真实更新", async () => {
    const dto = { price: 20 };
    approvals.findById.mockResolvedValue({
      id: "a7", status: "PENDING", requestedBy: "admin-1", type: "MEMBER_CONFIG",
      payload: { method: "updateMemberConfig", id: "m1", dto },
    });
    await executor.review("a7", true, undefined, "admin-2");
    expect(system.updateMemberConfig).toHaveBeenCalledWith("m1", dto);
  });

  it("会员套餐删除审批通过后执行真实删除", async () => {
    approvals.findById.mockResolvedValue({
      id: "a8", status: "PENDING", requestedBy: "admin-1", type: "MEMBER_CONFIG",
      payload: { method: "deleteMemberConfig", id: "m1" },
    });
    await executor.review("a8", true, undefined, "admin-2");
    expect(system.deleteMemberConfig).toHaveBeenCalledWith("m1");
  });
});
