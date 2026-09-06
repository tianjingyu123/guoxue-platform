import { CssMediaEvent, MediaEvidence, mediaEvidenceStatus, mergeCssMediaEvidence, parseCssMediaEvent } from "./live-media-evidence.policy";

describe("CSS 媒体证据归并（非供应商集成）", () => {
  const now = 1788609600000;
  const expected = { roomId: "test-room", domain: "push.example.invalid", appName: "live", nowMs: now };
  const body = { stream_id: "room_test-room", app: expected.domain, appname: "live", event_type: 1, sequence: "123456", event_time: now / 1000 };
  const begin = parseCssMediaEvent(body, expected)!;
  const end: CssMediaEvent = { ...begin, kind: "END", occurredAtMs: now + 1000 };
  const empty: MediaEvidence = { sessions: [], uncertain: false };
  it("只输出散列会话、事件种类和时间，不传播原始敏感字段", () => {
    const parsed = parseCssMediaEvent({ ...body, sign: "SYNTHETIC_SIGNATURE", stream_param: "SYNTHETIC_PRIVATE", user_ip: "SYNTHETIC_IP" }, expected);
    expect(parsed).toEqual({ sessionHash: expect.stringMatching(/^[a-f0-9]{64}$/), kind: "BEGIN", occurredAtMs: now });
    expect(Object.keys(parsed!)).toHaveLength(3);
  });
  it.each([
    { stream_id: "room_other" }, { app: "other.invalid" }, { appname: "other" }, { sequence: "" },
    { sequence: undefined }, { event_time: "1788609600" }, { event_type: 100 }, { event_time: now / 1000 + 301 },
  ])("不完整或串流字段不得成为证据 %j", change => expect(parseCssMediaEvent({ ...body, ...change }, expected)).toBeNull());
  it("先断流后开始的乱序与正常顺序得到一致状态", () => {
    const normal = mergeCssMediaEvidence(mergeCssMediaEvidence(empty, begin), end);
    const reordered = mergeCssMediaEvidence(mergeCssMediaEvidence(empty, end), begin);
    expect(reordered).toEqual(normal); expect(mediaEvidenceStatus(normal)).toBe("OFFLINE_OBSERVED");
  });
  it("重复事件幂等，不改证据", () => {
    const once = mergeCssMediaEvidence(empty, begin);
    expect(mergeCssMediaEvidence(once, begin)).toEqual(once);
  });
  it("旧连接迟到断流不能覆盖新连接仍在线", () => {
    const newBegin = parseCssMediaEvent({ ...body, sequence: "new-session", event_time: now / 1000 + 2 }, expected)!;
    const result = mergeCssMediaEvidence(mergeCssMediaEvidence(mergeCssMediaEvidence(empty, begin), newBegin), end);
    expect(mediaEvidenceStatus(result)).toBe("ONLINE");
  });
  it("只有断流没有对应开始仍未知，不释放额度", () => expect(mediaEvidenceStatus(mergeCssMediaEvidence(empty, end))).toBe("UNKNOWN"));
  it("同一事件矛盾时间与结束早于开始均不能冒充离线", () => {
    const conflict = mergeCssMediaEvidence(mergeCssMediaEvidence(empty, begin), { ...begin, occurredAtMs: now + 1 });
    expect(mediaEvidenceStatus(conflict)).toBe("UNKNOWN");
    expect(mediaEvidenceStatus(mergeCssMediaEvidence(mergeCssMediaEvidence(empty, begin), { ...end, occurredAtMs: now - 1 }))).toBe("UNKNOWN");
  });
  it("过多连接不会淘汰旧活动连接后误判离线", () => {
    let state = empty;
    for (let i = 0; i < 128; i++) state = mergeCssMediaEvidence(state, { ...begin, sessionHash: i.toString(16).padStart(64, "0") });
    const full = mergeCssMediaEvidence(state, { ...begin, sessionHash: "f".repeat(64) });
    expect(full.sessions).toHaveLength(128); expect(mediaEvidenceStatus(full)).toBe("UNKNOWN");
  });
});
