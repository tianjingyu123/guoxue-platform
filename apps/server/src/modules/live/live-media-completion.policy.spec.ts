import { cssCompletionEvidence } from "./live-media-completion.policy";
import { CredentialBoundary } from "./live-media-credential.repository";
import { MediaStopIntent } from "./live-media-stop.repository";

describe("直播媒体额度收尾证据", () => {
  const now = 2000000000000, roomId = "00000000-0000-4000-8000-000000000001";
  function fixture() {
    const scope = { provider: "CSS" as const, domain: "push.example.invalid", appName: "live", streamName: `room_${roomId}` };
    const boundary: CredentialBoundary = { roomId, provider: "CSS", scope, revision: 2, expiresAt: new Date(now + 3600000) };
    const stop: MediaStopIntent = { roomId, provider: "CSS", operationId: roomId, requestedBy: roomId, scope,
      credentialRevision: 2, protectUntil: new Date(now + 3900000), state: "ACKNOWLEDGED", revision: 4,
      createdAt: new Date(now - 6000), claimedAt: new Date(now - 5500), leaseUntil: new Date(now + 54000),
      resultAt: new Date(now - 4000), providerRequestId: "synthetic-stop", completion: null,
      verification: { queryId: roomId, state: "forbid", startedAtMs: now - 3000, receivedAtMs: now - 2000,
        requestId: "synthetic-query", scopeProofRef: "synthetic-proof", proofValidUntilMs: now + 60000 } };
    const media = { revision: 2, snapshot: { domain: scope.domain, appName: scope.appName,
      evidence: { uncertain: false, sessions: [{ sessionHash: "a".repeat(64), beganAtMs: now - 10000, endedAtMs: now - 5000 }] } } };
    return { boundary, stop, media, run: () => cssCompletionEvidence([boundary], stop, media, now) };
  }
  it("同一范围的完整证据通过", () => expect(fixture().run()).toMatchObject({ allowed: true, mediaRevision: 2, credentialRevision: 2 }));
  it.each(["READY", "DISPATCHING", "UNKNOWN"] as const)("%s 不是供应商 ACK", state => {
    const f = fixture(); f.stop.state = state; expect(f.run()).toMatchObject({ allowed: false, reason: "STOP_NOT_ACKNOWLEDGED" });
  });
  it.each(["QUERYING", "active", "inactive", "UNKNOWN"] as const)("查询 %s 不是有效禁推证据", state => {
    const f = fixture(); f.stop.verification!.state = state; expect(f.run().allowed).toBe(false);
  });
  it("即使证明结构正常，查询超过一分钟仍拒绝", () => {
    const f = fixture();
    expect(cssCompletionEvidence([f.boundary], f.stop, f.media, now + 59000)).toMatchObject({ allowed: false });
  });
  it("没有连接或有未闭合连接不能当完整断流", () => {
    const f = fixture(); f.media.snapshot.evidence.sessions = []; expect(f.run().allowed).toBe(false);
    f.media.snapshot.evidence.sessions = [{ sessionHash: "b".repeat(64), beganAtMs: now - 1000, endedAtMs: null! }];
    expect(f.run().allowed).toBe(false);
  });
  it("回调范围、凭据版本或不确定标记不一致均拒绝", () => {
    const a = fixture(); a.media.snapshot.domain = "wrong.invalid"; expect(a.run().allowed).toBe(false);
    const b = fixture(); b.boundary.revision++; expect(b.run().allowed).toBe(false);
    const c = fixture(); c.media.snapshot.evidence.uncertain = true; expect(c.run().allowed).toBe(false);
  });
  it("查询早于 ACK 不采用，回调结束晚于查询也不采用", () => {
    const a = fixture(); a.stop.resultAt = new Date(now - 1000); expect(a.run().allowed).toBe(false);
    const b = fixture(); b.media.snapshot.evidence.sessions[0].endedAtMs = now - 1000; expect(b.run().allowed).toBe(false);
  });
  it("只看到停流前的旧结束回调不归到当前请求", () => {
    const f = fixture(); f.media.snapshot.evidence.sessions[0].endedAtMs = now - 8000;
    expect(f.run()).toMatchObject({ allowed: false, reason: "MEDIA_EVENT_OUTSIDE_STOP_WINDOW" });
  });
  it("禁推期限未覆盖全部签发凭据不释放", () => {
    const f = fixture(); f.stop.protectUntil = new Date(now + 1000);
    expect(f.run()).toMatchObject({ allowed: false, reason: "RECONNECT_PROTECTION_UNPROVEN" });
  });
});
