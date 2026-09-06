import { createConsultStopIntent, validConsultStopIntent } from "./consult-call-stop-intent.policy";

describe("咨询停流待办范围（不构成媒体停止证明）", () => {
  const sample = () => ({ operationId: "5f29fe32-e61e-43a2-a976-d45d93b33be7", reason: "END" as const,
    requestedBy: "792c2653-5bc4-4077-bbe6-e9bd5c627db4", now: new Date("2026-09-06T00:00:00Z"),
    boundary: { scope: { sdkAppId: 1400000001, rtcRoomId: "consult_0123456789abcdef" },
      expiresAt: new Date("2026-09-06T01:00:00Z"), revision: 2 } });
  it("固定原房间和凭据版本，保护至票据有效期后五分钟", () => {
    const input = sample(), result = createConsultStopIntent(input);
    expect(result).toEqual({ version: 1, state: "READY", operationId: input.operationId, reason: "END",
      requestedBy: input.requestedBy, requestedAt: "2026-09-06T00:00:00.000Z", credentialRevision: 2,
      scope: input.boundary.scope, protectUntil: "2026-09-06T01:05:00.000Z" });
    expect(result.scope).not.toBe(input.boundary.scope);
  });
  it("票据已到期也不立即解除保护，更不能标记完成", () => {
    const input = sample(); input.boundary.expiresAt = new Date("2026-09-05T23:00:00Z");
    const result = createConsultStopIntent(input);
    expect(result.protectUntil).toBe("2026-09-06T00:05:00.000Z"); expect(result.state).toBe("READY");
    expect(result).not.toHaveProperty("completedAt");
  });
  it("超时来自系统，取消来自明确用户", () => {
    expect(createConsultStopIntent({ ...sample(), reason: "WAITING_TIMEOUT", requestedBy: null }).requestedBy).toBeNull();
    expect(createConsultStopIntent({ ...sample(), reason: "CANCEL" }).reason).toBe("CANCEL");
  });
  it.each([
    { operationId: "bad" }, { reason: "COMPLETE" }, { requestedBy: null }, { requestedBy: "" },
    { reason: "WAITING_TIMEOUT", requestedBy: "792c2653-5bc4-4077-bbe6-e9bd5c627db4" }, { now: new Date(NaN) },
  ])("拒绝无效事件字段 %#", patch => {
    expect(() => createConsultStopIntent({ ...sample(), ...patch } as any)).toThrow("CONSULT_STOP_INTENT_INVALID");
  });
  it.each([0, -1, 1.5, NaN, 2147483648])("拒绝错误凭据版本 %s", revision => {
    const input = sample(); input.boundary.revision = revision;
    expect(() => createConsultStopIntent(input)).toThrow("CONSULT_STOP_INTENT_INVALID");
  });
  it.each([0, -1, 1.5, NaN, 4294967296])("拒绝错误应用范围 %s", sdkAppId => {
    const input = sample(); input.boundary.scope.sdkAppId = sdkAppId;
    expect(() => createConsultStopIntent(input)).toThrow("CONSULT_STOP_INTENT_INVALID");
  });
  it.each(["", "other_0123456789abcdef", "consult_0123456789abcdef?secret=x", "consult_0123456789ABCDEF"])("拒绝错误房间范围 %s", rtcRoomId => {
    const input = sample(); input.boundary.scope.rtcRoomId = rtcRoomId;
    expect(() => createConsultStopIntent(input)).toThrow("CONSULT_STOP_INTENT_INVALID");
  });
  it("拒绝无效有效期和保护时间溢出", () => {
    const input = sample(); input.boundary.expiresAt = new Date(NaN);
    expect(() => createConsultStopIntent(input)).toThrow("CONSULT_STOP_INTENT_INVALID");
    input.boundary.expiresAt = new Date(8640000000000000);
    expect(() => createConsultStopIntent(input)).toThrow("CONSULT_STOP_INTENT_INVALID");
  });
  it("附加票据字段不进入持久化输出", () => {
    const input = sample(); Object.assign(input.boundary, { userSig: "SYNTHETIC_SECRET" });
    Object.assign(input.boundary.scope, { privateMapKey: "SYNTHETIC_SECRET" });
    expect(JSON.stringify(createConsultStopIntent(input))).not.toContain("SYNTHETIC_SECRET");
  });
  it("完整受理记录可验证，但无版本、缺派发、越界时间或跨订单记录必须拒绝", () => {
    const input = sample(), intent = { ...createConsultStopIntent(input), state: "ACKNOWLEDGED" as const,
      dispatch: { region: "ap-beijing" as const, claimedAt: input.now.toISOString(),
        leaseUntil: new Date(input.now.getTime() + 60000).toISOString(),
        resultAt: new Date(input.now.getTime() + 1000).toISOString(), providerRequestId: input.operationId } };
    const call = { status: "ENDED", callerId: input.requestedBy, expertId: "00000000-0000-4000-8000-000000000003", rtcRoomId: input.boundary.scope.rtcRoomId };
    expect(validConsultStopIntent(intent, input.boundary, call)).toBe(true);
    for (const patch of [{ version: 2 }, { dispatch: undefined }, { credentialRevision: 3 }, { protectUntil: input.now.toISOString() },
      { state: "READY" }, { state: "DISPATCHING" }, { state: "UNKNOWN" },
      { dispatch: { ...intent.dispatch, resultAt: new Date(input.now.getTime() + 60001).toISOString() } },
      { dispatch: { ...intent.dispatch, resultAt: new Date(input.now.getTime() - 1).toISOString() } },
      { dispatch: { ...intent.dispatch, leaseUntil: input.now.toISOString() } },
      { dispatch: { ...intent.dispatch, providerRequestId: "bad" } }]) {
      expect(validConsultStopIntent({ ...intent, ...patch } as any, input.boundary, call)).toBe(false);
    }
    expect(validConsultStopIntent(intent, input.boundary, { ...call, status: "ONGOING" })).toBe(false);
    expect(validConsultStopIntent(intent, input.boundary, { ...call, callerId: call.expertId })).toBe(false);
    expect(validConsultStopIntent(intent, { ...input.boundary, revision: 3 }, call)).toBe(false);
  });
  it("READY、DISPATCHING 与 UNKNOWN 有各自完整形状，不能互相冒充受理", () => {
    const input = sample(), ready = createConsultStopIntent(input);
    const call = { status: "ENDED", callerId: input.requestedBy, expertId: "other", rtcRoomId: input.boundary.scope.rtcRoomId };
    expect(validConsultStopIntent(ready, input.boundary, call)).toBe(true);
    const dispatch = { region: "ap-beijing" as const, claimedAt: input.now.toISOString(), leaseUntil: new Date(input.now.getTime() + 60000).toISOString() };
    expect(validConsultStopIntent({ ...ready, state: "DISPATCHING", dispatch }, input.boundary, call)).toBe(true);
    expect(validConsultStopIntent({ ...ready, state: "UNKNOWN", dispatch: { ...dispatch, resultAt: new Date(input.now.getTime() + 70000).toISOString() } }, input.boundary, call)).toBe(true);
  });
});
