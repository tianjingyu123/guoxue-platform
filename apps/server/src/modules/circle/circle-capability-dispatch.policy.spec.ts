import { CapabilityDispatchSnapshot, planCapabilityDispatch } from "./circle-capability-dispatch.policy";

describe("能力派发不重复外发", () => {
  const now = new Date("2026-09-05T00:00:00Z");
  const leaseUntil = new Date(now.getTime() + 30000);
  const leaseToken = "00000000-0000-4000-8000-000000000001";
  const ready: CapabilityDispatchSnapshot = { state: "READY", revision: 1, leaseToken: null, leaseUntil: null,
    dispatchedAt: null, resolvedAt: null, evidenceRef: null };
  const claim = { type: "CLAIM" as const, leaseToken, leaseUntil, holdUntil: leaseUntil };
  function active() {
    const result = planCapabilityDispatch(ready, 1, now, claim);
    if (!result.allowed) throw new Error(result.reason);
    return result.next;
  }
  it("领取固定租约，不修改原快照", () => {
    expect(active()).toMatchObject({ state: "DISPATCHING", revision: 2, leaseToken });
    expect(ready.state).toBe("READY");
  });
  it("旧版本和已领取任务不能再次领取", () => {
    expect(planCapabilityDispatch(ready, 0, now, claim).allowed).toBe(false);
    expect(planCapabilityDispatch(active(), 2, now, claim).allowed).toBe(false);
  });
  it("租约不能超过额度占位或使用已过期时间", () => {
    expect(planCapabilityDispatch(ready, 1, now, { ...claim, holdUntil: now }).allowed).toBe(false);
    expect(planCapabilityDispatch(ready, 1, now, { ...claim, leaseUntil: now }).allowed).toBe(false);
  });
  it("超时只进入未知状态，禁止重发和按未发送取消", () => {
    const result = planCapabilityDispatch(active(), 2, leaseUntil, { type: "EXPIRE_LEASE" });
    if (!result.allowed) throw new Error(result.reason);
    expect(result.next.state).toBe("UNKNOWN");
    expect(result.next.leaseToken).toBe(leaseToken);
    expect(planCapabilityDispatch(result.next, 3, leaseUntil, claim).allowed).toBe(false);
    expect(planCapabilityDispatch(result.next, 3, leaseUntil, { type: "CANCEL_READY", evidenceRef: "cancel-1" }).allowed).toBe(false);
    expect(planCapabilityDispatch(active(), 2, now, { type: "EXPIRE_LEASE" }).allowed).toBe(false);
  });
  it("同一次未知派发可凭可信证据确认，但不能借另一租约确认", () => {
    const unknown = { ...active(), state: "UNKNOWN" as const, revision: 3 };
    expect(planCapabilityDispatch(unknown, 3, leaseUntil, { type: "CONFIRM", leaseToken: "other", evidenceRef: "receipt-1" }).allowed).toBe(false);
    const result = planCapabilityDispatch(unknown, 3, leaseUntil, { type: "CONFIRM", leaseToken, evidenceRef: "receipt-1" });
    if (!result.allowed) throw new Error(result.reason);
    expect(result.next.state).toBe("CONFIRMED");
    expect(planCapabilityDispatch(result.next, 4, leaseUntil, claim).allowed).toBe(false);
  });
  it("未发送可以取消，不能把 URL 查询秘密写入证据引用", () => {
    expect(planCapabilityDispatch(ready, 1, now, { type: "CANCEL_READY", evidenceRef: "business/cancel-1" }).allowed).toBe(true);
    expect(planCapabilityDispatch(active(), 2, now, { type: "CONFIRM", leaseToken, evidenceRef: "https://x/?token=secret" }).allowed).toBe(false);
  });
});
