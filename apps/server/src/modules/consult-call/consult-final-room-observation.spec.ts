import { appendConsultMediaEvent, consultFinalRoomObservation, parseConsultMediaEvent } from './consult-media-evidence.policy';

describe('咨询最终整房观察边界（不释放额度）', () => {
  const protect = 1788650000000, now = protect + 10000;
  const scope = { sdkAppId: 1600160984, rtcRoomId: 'consult_0123456789abcdef' };
  const users: [string, string] = [`c_${'a'.repeat(30)}`, `c_${'b'.repeat(30)}`];
  function event(type = 102, at = protect + 1, precise = true) {
    return parseConsultMediaEvent({ sdkAppId: scope.sdkAppId, receivedAt: now, bodyDigest: 'a'.repeat(64),
      body: { EventGroupId: 1, EventType: type, CallbackTs: now,
        EventInfo: { RoomId: scope.rtcRoomId, UserId: users[0], ...(precise ? { EventMsTs: at } : { EventTs: Math.floor(at / 1000) }) } } })!;
  }
  const evidence = (type = 102, at = protect + 1, precise = true) => appendConsultMediaEvent(null, event(type, at, precise));
  const check = (data = evidence(), end = protect, time = now, bound = scope) => consultFinalRoomObservation(data, users, bound, end, time);
  it('保护窗之后精确整房解散形成候选观察，结果不含释放授权', () => {
    expect(check()).toMatchObject({ observed: true, evidenceRevision: 1, eventAt: protect + 1 });
    expect(check()).not.toHaveProperty('allowed');
  });
  it.each([protect - 1, protect])('旧解散或保护边界同刻不能完成：%s', at => {
    expect(check(evidence(102, at))).toMatchObject({ observed: false, reason: 'NO_ROOM_DISMISS_AFTER_PROTECTION' });
  });
  it('票据保护窗未关闭不接受任何离线记录', () => {
    expect(check(evidence(), now + 1)).toMatchObject({ observed: false, reason: 'REENTRY_WINDOW_OPEN' });
  });
  it.each([NaN, Infinity, -1, 1.5])('非法保护时间拒绝：%s', end => expect(check(evidence(), end).observed).toBe(false));
  it('跨应用、跨房间拒绝', () => {
    expect(check(evidence(), protect, now, { ...scope, sdkAppId: 1 }).observed).toBe(false);
    expect(check(evidence(), protect, now, { ...scope, rtcRoomId: 'consult_ffffffffffffffff' }).observed).toBe(false);
  });
  it('未来事件或接收时间不提前生效', () => {
    expect(check(evidence(102, now + 1))).toMatchObject({ reason: 'EVIDENCE_IN_FUTURE' });
    expect(check(evidence(), protect, now - 1)).toMatchObject({ reason: 'EVIDENCE_IN_FUTURE' });
  });
  it('秒精度解散不能替代精确证据', () => expect(check(evidence(102, protect + 1000, false)).observed).toBe(false));
  it('解散之后的新进房或同刻冲突使候选失效', () => {
    expect(check(appendConsultMediaEvent(evidence(), event(103, protect + 2))).observed).toBe(false);
    expect(check(appendConsultMediaEvent(evidence(), event(103, protect + 1))).observed).toBe(false);
  });
  it('溢出证据不能完成', () => expect(check({ ...evidence(), overflow: true }).observed).toBe(false));
  it('乱序到达的较早活动不覆盖精确最终解散', () => {
    expect(check(appendConsultMediaEvent(evidence(), event(103, protect - 1))).observed).toBe(true);
  });
});
