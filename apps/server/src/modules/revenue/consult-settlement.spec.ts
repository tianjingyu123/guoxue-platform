import { RevenueService } from "./revenue.service";
import { SettlementService } from "../settlement/settlement.service";
import { COIN_TO_RMB } from "../../common/constants";

describe("咨询退款与双账同事务（本地合成）", () => {
  const params = { callId: "synthetic-call", callerId: "caller", expertId: "expert", amountCoin: COIN_TO_RMB * 10 };
  function fixture() {
    const rows = [
      { scene: "CONSULT_CALL", refType: "CONSULT_CALL", refId: params.callId, role: "PROVIDER", beneficiaryType: "USER", beneficiaryId: "expert", amount: 5, category: "SERVICE", status: "PENDING", rate: 0.5 },
      { scene: "CONSULT_CALL", refType: "CONSULT_CALL", refId: params.callId, role: "PLATFORM", beneficiaryType: "PLATFORM", beneficiaryId: "PLATFORM", amount: 5, category: "PLATFORM", status: "PENDING", rate: 0.5 },
    ];
    const tx = { userEarning: { create: jest.fn().mockResolvedValue({ amountRmb: 5 }) },
      settlementRule: { findUnique: jest.fn().mockResolvedValue({ enabled: true, bufferDays: 0, requireApproval: false, approvalThreshold: null,
        splits: [{ role: "PROVIDER", rate: 0.5, basis: "GROSS", category: "SERVICE" }, { role: "PLATFORM", rate: 0.5, basis: "GROSS", category: "PLATFORM" }] }) },
      ledgerEntry: { findMany: jest.fn().mockResolvedValueOnce([]).mockResolvedValue(rows), createMany: jest.fn().mockResolvedValue({ count: 2 }) } };
    // 根客户端故意无任何表：读写若逃出tx立即失败。
    const svc = new RevenueService({} as never, new SettlementService({} as never));
    return { svc, tx, rows };
  }
  it("真实引擎读规则及写两本账均使用传入事务", async () => {
    const { svc, tx } = fixture();
    await svc.recordConsultInTransaction(params, tx as never);
    expect(tx.userEarning.create).toHaveBeenCalledTimes(1);
    expect(tx.ledgerEntry.createMany).toHaveBeenCalledTimes(1);
    expect(tx.ledgerEntry.createMany.mock.calls[0][0].data.map((r: { amount: number }) => r.amount)).toEqual([5, 5]);
  });
  it("合格规则只读前置不写收益或总账", async () => {
    const { svc, tx } = fixture();
    await svc.assertConsultReadyInTransaction(tx as never);
    expect(tx.userEarning.create).not.toHaveBeenCalled(); expect(tx.ledgerEntry.createMany).not.toHaveBeenCalled();
  });
  it.each([null, { enabled: false }, { enabled: true, bufferDays: 0, splits: [] },
    { enabled: true, bufferDays: 0, splits: [{ role: "PROVIDER", rate: 1 }] }])("无效规则前置拒绝 %#", async rule => {
    const { svc, tx } = fixture(); tx.settlementRule.findUnique.mockResolvedValue(rule);
    await expect(svc.assertConsultReadyInTransaction(tx as never)).rejects.toThrow("通话结算配置暂不可用");
    expect(tx.userEarning.create).not.toHaveBeenCalled(); expect(tx.ledgerEntry.createMany).not.toHaveBeenCalled();
  });
  it.each(["earning", "ledger", "rule"])("%s失败不吞异常", async stage => {
    const { svc, tx } = fixture();
    if (stage === "earning") tx.userEarning.create.mockRejectedValue(new Error("SYNTHETIC_ERROR"));
    if (stage === "ledger") tx.ledgerEntry.createMany.mockRejectedValue(new Error("SYNTHETIC_ERROR"));
    if (stage === "rule") tx.settlementRule.findUnique.mockRejectedValue(new Error("SYNTHETIC_ERROR"));
    await expect(svc.recordConsultInTransaction(params, tx as never)).rejects.toThrow("SYNTHETIC_ERROR");
  });
  it("缺结算引擎或缺规则均失败，不伪报完成", async () => {
    const { svc, tx } = fixture();
    await expect(new RevenueService({} as never).recordConsultInTransaction(params, tx as never)).rejects.toThrow("UNAVAILABLE");
    tx.settlementRule.findUnique.mockResolvedValue(null);
    await expect(svc.recordConsultInTransaction(params, tx as never)).rejects.toThrow("LEDGER_MISMATCH");
  });
  it.each(["amount", "beneficiary", "scope", "status", "rate", "category"])("总账%s漂移拒绝提交", async drift => {
    const { svc, tx, rows } = fixture();
    if (drift === "amount") rows[0].amount = 4;
    if (drift === "beneficiary") rows[0].beneficiaryId = "other";
    if (drift === "scope") rows[0].refId = "other-call";
    if (drift === "status") rows[0].status = "REVERSED";
    if (drift === "rate") rows[0].rate = 0.4;
    if (drift === "category") rows[0].category = "COMMISSION";
    await expect(svc.recordConsultInTransaction(params, tx as never)).rejects.toThrow("LEDGER_MISMATCH");
  });
});
