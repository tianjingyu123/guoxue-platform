import { MediaStopVerification, validStopVerification } from "./live-media-stop-verification.policy";

describe("停流核验脱敏证据格式", () => {
  const querying = (): MediaStopVerification => ({ queryId: "00000000-0000-4000-8000-000000000001", state: "QUERYING",
    startedAtMs: 100000, receivedAtMs: null, requestId: null, scopeProofRef: "synthetic-proof", proofValidUntilMs: 200000 });
  it("待查询不携带旧回执", () => expect(validStopVerification(querying())).toBe(true));
  it.each(["active", "inactive", "forbid"] as const)("只记录真实 %s 状态，不互换语义", state => {
    expect(validStopVerification({ ...querying(), state, receivedAtMs: 101000, requestId: "synthetic-id" })).toBe(true);
  });
  it("UNKNOWN 允许记录超时，但不得携带成功请求号", () => {
    expect(validStopVerification({ ...querying(), state: "UNKNOWN", receivedAtMs: 300000 })).toBe(true);
    expect(validStopVerification({ ...querying(), state: "UNKNOWN", receivedAtMs: 300000, requestId: "old-id" })).toBe(false);
  });
  it.each([
    { queryId: "not-an-id" }, { startedAtMs: NaN }, { startedAtMs: -1 }, { proofValidUntilMs: 0 },
    { scopeProofRef: "https://private.invalid/?token=value" }, { receivedAtMs: 101000 }, { requestId: "old-id" },
    { state: "forbid", receivedAtMs: 101000, requestId: null },
    { state: "forbid", receivedAtMs: 101000, requestId: 123 },
    { state: "forbid", receivedAtMs: 99999, requestId: "id" },
    { state: "forbid", receivedAtMs: 160001, requestId: "id" },
    { state: "forbid", receivedAtMs: 101000, proofValidUntilMs: 101000, requestId: "id" },
    { rawResponse: { privateField: "SYNTHETIC_ONLY" } },
  ])("畸形或额外字段拒绝 %#", change => {
    expect(validStopVerification({ ...querying(), ...change } as MediaStopVerification)).toBe(false);
  });
});
