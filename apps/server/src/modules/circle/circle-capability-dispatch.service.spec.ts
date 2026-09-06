import { CircleCapabilityDispatchService } from "./circle-capability-dispatch.service";
import { QuotaBinding } from "./circle-capability-quota.policy";

describe("额度与派发同事务组合", () => {
  const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const binding: QuotaBinding = { circleId: id(1), actorId: id(2), subjectUserId: null, capability: "LIVE",
    businessType: "LIVE_SESSION", businessId: id(3), requestKey: id(4), units: 1, holdSeconds: 60 };
  const actor = { userId: id(2), executor: "HUMAN" as const };
  const now = new Date("2026-09-05T00:00:00Z");
  let service: CircleCapabilityDispatchService, quota: any, quotas: any, dispatches: any, tx: any, row: any, reservation: any;
  const input = () => ({ reservationId: id(5), binding, expectedQuotaRevision: 1, expectedDispatchRevision: 1, leaseSeconds: 30 });
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);
    tx = {};
    reservation = { id: id(5), binding, revision: 1, state: "HELD", holdUntil: new Date(now.getTime() + 60000) };
    row = { reservationId: id(5), providerOperationKey: id(6), state: "READY", revision: 1 };
    quota = { reserveInTransaction: jest.fn().mockResolvedValue({ effect: "INSERT_HELD", reservation }),
      activateInTransaction: jest.fn().mockResolvedValue({ effect: "UPDATE", reservation: { ...reservation, state: "ACTIVE", revision: 2 } }) };
    quotas = { lockScope: jest.fn(), byId: jest.fn().mockResolvedValue(reservation) };
    dispatches = { byReservation: jest.fn().mockResolvedValue(row), insertReady: jest.fn().mockResolvedValue(row),
      transition: jest.fn().mockResolvedValue({ ...row, state: "DISPATCHING", revision: 2 }) };
    service = new CircleCapabilityDispatchService(quota, quotas, dispatches);
  });
  afterEach(() => jest.useRealTimers());
  it("首次预留与派发登记传递同一事务，不调用外部发送", async () => {
    dispatches.byReservation.mockResolvedValue(null);
    expect((await service.reserveInTransaction(tx, binding, actor)).effect).toBe("PREPARED");
    expect(quota.reserveInTransaction).toHaveBeenCalledWith(tx, binding, actor);
    expect(dispatches.insertReady).toHaveBeenCalledWith(tx, expect.objectContaining({ reservationId: id(5), expectedQuotaRevision: 1 }));
  });
  it("重复预留只回读；账本缺失不能补建", async () => {
    quota.reserveInTransaction.mockResolvedValue({ effect: "NONE", reservation });
    expect((await service.reserveInTransaction(tx, binding, actor)).effect).toBe("NONE");
    dispatches.byReservation.mockResolvedValue(null);
    await expect(service.reserveInTransaction(tx, binding, actor)).rejects.toThrow("DISPATCH_REPLAY_RECORD_MISSING");
    expect(dispatches.insertReady).not.toHaveBeenCalled();
  });
  it("激活使用持久幂等键，同事务成功领取才返回CLAIMED", async () => {
    expect((await service.claimInTransaction(tx, input(), actor)).effect).toBe("CLAIMED");
    expect(quota.activateInTransaction).toHaveBeenCalledWith(tx, expect.objectContaining({ operationKey: id(6), expectedRevision: 1 }), actor);
    expect(dispatches.transition).toHaveBeenCalledWith(tx, row, 1, now, expect.objectContaining({ type: "CLAIM", leaseUntil: new Date(now.getTime() + 30000) }));
    expect(quotas.lockScope.mock.invocationCallOrder[0]).toBeLessThan(dispatches.byReservation.mock.invocationCallOrder[0]);
    expect(quota.activateInTransaction.mock.invocationCallOrder[0]).toBeLessThan(dispatches.transition.mock.invocationCallOrder[0]);
  });
  it.each(["DISPATCHING", "UNKNOWN", "CONFIRMED", "CANCELLED"])("%s重复领取不能再激活或发出", async state => {
    dispatches.byReservation.mockResolvedValue({ ...row, state });
    expect((await service.claimInTransaction(tx, input(), actor)).effect).toBe("NONE");
    expect(quota.activateInTransaction).not.toHaveBeenCalled(); expect(dispatches.transition).not.toHaveBeenCalled();
  });
  it("业务绑定不符即使已派发也不可回读", async () => {
    await expect(service.claimInTransaction(tx, { ...input(), binding: { ...binding, businessId: id(9) } }, actor)).rejects.toThrow("BINDING_MISMATCH");
    expect(dispatches.byReservation).not.toHaveBeenCalled();
  });
  it("领取零行必须抛错，让外层回滚而不是保留已激活额度", async () => {
    dispatches.transition.mockResolvedValue(null);
    await expect(service.claimInTransaction(tx, input(), actor)).rejects.toThrow("DISPATCH_CLAIM_CONFLICT");
  });
  it("撤权导致激活失败时不领取", async () => {
    quota.activateInTransaction.mockRejectedValue(new Error("GRANT_REVOKED"));
    await expect(service.claimInTransaction(tx, input(), actor)).rejects.toThrow("GRANT_REVOKED");
    expect(dispatches.transition).not.toHaveBeenCalled();
  });
  it("自动化不能借内部组合器越过外发红线", async () => {
    await expect(service.claimInTransaction(tx, input(), { ...actor, executor: "AUTOMATION" })).rejects.toThrow();
    expect(quotas.lockScope).not.toHaveBeenCalled();
  });
  const confirmation = () => ({ reservationId: id(5), binding, providerOperationKey: id(6), leaseToken: id(7),
    expectedDispatchRevision: 2, evidenceRef: "callback/event-1" });
  it("成功确认不结算额度，相同事件重放只回读", async () => {
    quotas.byId.mockResolvedValue({ ...reservation, state: "ACTIVE" });
    dispatches.byReservation.mockResolvedValue({ ...row, state: "DISPATCHING", revision: 2, leaseToken: id(7) });
    expect((await service.confirmInTransaction(tx, confirmation())).effect).toBe("CONFIRMED");
    dispatches.byReservation.mockResolvedValue({ ...row, state: "CONFIRMED", leaseToken: id(7), evidenceRef: "callback/event-1" });
    expect((await service.confirmInTransaction(tx, confirmation())).effect).toBe("NONE");
    expect(dispatches.transition).toHaveBeenCalledTimes(1);
    expect(quota.activateInTransaction).not.toHaveBeenCalled();
  });
  it("不匹配的供应商身份、租约或事件不能确认", async () => {
    dispatches.byReservation.mockResolvedValue({ ...row, state: "CONFIRMED", leaseToken: id(7), evidenceRef: "callback/event-1" });
    for (const changed of [{ providerOperationKey: id(8) }, { leaseToken: id(8) }, { evidenceRef: "callback/other" }]) {
      await expect(service.confirmInTransaction(tx, { ...confirmation(), ...changed })).rejects.toThrow();
    }
    expect(dispatches.transition).not.toHaveBeenCalled();
  });
  it("非 ACTIVE 额度或缺失证据不能首次确认", async () => {
    dispatches.byReservation.mockResolvedValue({ ...row, state: "DISPATCHING", leaseToken: id(7) });
    await expect(service.confirmInTransaction(tx, confirmation())).rejects.toThrow("QUOTA_NOT_ACTIVE");
    await expect(service.confirmInTransaction(tx, { ...confirmation(), evidenceRef: undefined as any })).rejects.toThrow("INVALID_CONFIRM");
    expect(dispatches.transition).not.toHaveBeenCalled();
  });
});
