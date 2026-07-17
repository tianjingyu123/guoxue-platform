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

  beforeEach(() => {
    approvals = {
      findById: jest.fn(),
      claim: jest.fn().mockResolvedValue(true),
      revertToPending: jest.fn(),
    };
    coin = { recharge: jest.fn().mockResolvedValue({ balance: 100 }) };
    executor = new FundApprovalExecutor(approvals, {} as any, {} as any, coin, {} as any);
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
    const exec2 = new FundApprovalExecutor(approvals, {} as any, huifu as any, coin, {} as any);
    const payload = { orderId: "order-1", amount: 100, receivers: [{ acctId: "A1", amount: 100, name: "张三" }] };
    approvals.findById.mockResolvedValue({ id: "a2", status: "PENDING", requestedBy: "admin-1", type: "HUIFU_SPLIT", payload });
    const res = await exec2.review("a2", true, undefined, "admin-2");
    expect(res.approved).toBe(true);
    expect(huifu.createSplit).toHaveBeenCalledWith(payload);
  });
});
