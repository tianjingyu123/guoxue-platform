import { appendConsultMediaEvent as append, ConsultMediaEvidence, observeConsultMedia as observe, parseConsultMediaEvent as parse } from "./consult-media-evidence.policy";

describe("咨询回调乱序与重投观察态（非额度释放证明）", () => {
  const users: [string, string] = [`c_${"a".repeat(30)}`, `c_${"b".repeat(30)}`], now = 1788650000000;
  const packet = (type = 104, at = now, userId = users[0], extra = {}) => ({ sdkAppId: 1400000001, receivedAt: now + 10000, bodyDigest: "a".repeat(64),
    body: { EventGroupId: type < 200 ? 1 : 2, EventType: type, CallbackTs: now + 5000,
      EventInfo: { RoomId: "consult_0123456789abcdef", EventMsTs: at, UserId: userId, ...extra } } });
  const event = (...args: Parameters<typeof packet>) => parse(packet(...args))!;
  const fold = (...events: ReturnType<typeof event>[]) => events.reduce<ConsultMediaEvidence | null>((state, item) => append(state, item), null);
  it("新版无UniqueId与旧版有UniqueId都可以归一化", () => {
    expect(event().uniqueId).toBeNull(); expect(event(104, now, users[0], { UniqueId: 123 }).uniqueId).toBe(123);
  });
  it("只保留白名单字段，不保留IP、签名或供应商正文", () => {
    const result = event(104, now, users[0], { ClientIpv4: "SYNTHETIC_PRIVATE", sign: "SYNTHETIC_PRIVATE" });
    expect(JSON.stringify(result)).not.toContain("SYNTHETIC_PRIVATE");
  });
  it("同事件重投幂等，不刷新接收时间和版本", () => {
    const item = event(), first = append(null, item);
    const later = parse({ ...packet(), receivedAt: now + 20000, bodyDigest: "b".repeat(64) })!;
    expect(append(first, later)).toBe(first);
  });
  it("退房先到、较早进房后到，观察结果不被倒转", () => {
    const exits = [event(104, now + 2, users[0]), event(104, now + 3, users[1])];
    const state = fold(...exits, event(103, now, users[0]), event(103, now + 1, users[1]));
    expect(observe(state, users)).toBe("OFFLINE_OBSERVED");
    expect(observe(fold(event(103, now, users[0]), ...exits), users)).toBe("OFFLINE_OBSERVED");
  });
  it("新进房晚于旧退房必须重新显示活动，不能释放", () => {
    expect(observe(fold(event(104, now, users[0]), event(104, now, users[1]), event(103, now + 1, users[0])), users)).toBe("ACTIVITY_OBSERVED");
  });
  it("退房仅代表该会话，旧策略另一会话仍在房时不误判离线", () => {
    expect(observe(fold(event(103, now, users[0], { UniqueId: 1 }), event(104, now + 1, users[0], { UniqueId: 2 }), event(104, now, users[1])), users)).toBe("ACTIVITY_OBSERVED");
  });
  it("同毫秒进退房冲突或混用会话策略时保持UNKNOWN", () => {
    expect(observe(fold(event(103), event(104), event(104, now, users[1])), users)).toBe("UNKNOWN");
    expect(observe(fold(event(103, now, users[0], { UniqueId: 1 }), event(104), event(104, now, users[1])), users)).toBe("UNKNOWN");
  });
  it("媒体停止不是退房；退房后又有媒体证据不能判离线", () => {
    expect(observe(fold(event(203), event(204, now + 1)), users)).not.toBe("OFFLINE_OBSERVED");
    expect(observe(fold(event(104), event(104, now, users[1]), event(201, now + 2)), users)).toBe("ACTIVITY_OBSERVED");
  });
  it("精确解散事件可观察离线，新活动或同刻冲突使其失效", () => {
    expect(observe(fold(event(102)), users)).toBe("OFFLINE_OBSERVED");
    expect(observe(fold(event(102), event(103, now + 1)), users)).toBe("ACTIVITY_OBSERVED");
    expect(observe(fold(event(102), event(103)), users)).toBe("UNKNOWN");
  });
  it("只有秒精度的兼容事件记录但不能作为精确退房观察", () => {
    const p = packet(); Object.assign(p.body.EventInfo, { EventMsTs: undefined, EventTs: now / 1000 });
    expect(parse(p)).toMatchObject({ precise: false, eventAt: now });
    expect(observe(fold(parse(p)!, event(104, now, users[1])), users)).toBe("UNKNOWN");
  });
  it.each([{ RoomId: "other_room" }, { UserId: "raw-user" }, { UniqueId: "123" }, { UniqueId: 1.5 }, { EventMsTs: now + 600000 }, { EventMsTs: NaN }])("拒绝非法事件字段 %#", extra => {
    expect(parse(packet(104, now, users[0], extra))).toBeNull();
  });
  it("超过128条保留原记录并标记溢出，不静默截断成为离线", () => {
    let state: ConsultMediaEvidence | null = null;
    for (let i = 0; i < 128; i++) state = append(state, event(103, now + i));
    const overflow = append(state, event(104, now + 200));
    expect(overflow.events).toHaveLength(128); expect(overflow.overflow).toBe(true);
    expect(observe(overflow, users)).toBe("UNKNOWN"); expect(append(overflow, event(104, now + 201))).toBe(overflow);
  });
  it("错误范围的既有记录不能与新事件合并", () => {
    const first = append(null, event()), other = parse({ ...packet(), sdkAppId: 2 })!;
    expect(() => append(first, other)).toThrow("CONSULT_MEDIA_EVIDENCE_INVALID");
  });
});
