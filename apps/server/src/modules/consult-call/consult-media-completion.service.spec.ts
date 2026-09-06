import { ConsultMediaCompletionService } from './consult-media-completion.service';
import { readConsultClosureAttestation } from './consult-media-completion.config';
import { createConsultStopIntent } from './consult-call-stop-intent.policy';
import { appendConsultMediaEvent, parseConsultMediaEvent } from './consult-media-evidence.policy';

describe('咨询媒体额度事务收尾', () => {
  const now = 1788650000000, id = '00000000-0000-4000-8000-000000000001';
  const caller = '00000000-0000-4000-8000-000000000002', expert = '00000000-0000-4000-8000-000000000003';
  const scope = { sdkAppId: 1600160984, rtcRoomId: 'consult_0123456789abcdef' };
  const oldProof = process.env.CONSULT_TRTC_CLOSURE_ATTESTATION, oldApp = process.env.CONSULT_TRTC_SDK_APP_ID;
  const proof = () => ({ sdkAppId: scope.sdkAppId, advancedPermission: true, exclusiveIssuer: true,
    verifiedFrom: new Date(now - 1000000).toISOString(), verifiedUntil: new Date(now + 60000).toISOString(), evidenceId: 'a'.repeat(64) });
  beforeEach(() => { jest.useFakeTimers().setSystemTime(now); process.env.CONSULT_TRTC_CLOSURE_ATTESTATION = JSON.stringify(proof()); process.env.CONSULT_TRTC_SDK_APP_ID = String(scope.sdkAppId); });
  afterEach(() => {
    jest.useRealTimers();
    if (oldProof === undefined) delete process.env.CONSULT_TRTC_CLOSURE_ATTESTATION; else process.env.CONSULT_TRTC_CLOSURE_ATTESTATION = oldProof;
    if (oldApp === undefined) delete process.env.CONSULT_TRTC_SDK_APP_ID; else process.env.CONSULT_TRTC_SDK_APP_ID = oldApp;
  });
  function fixture() {
    const trace: string[] = [];
    const call = { id, circleId: 'circle1', callerId: caller, expertId: expert, rtcRoomId: scope.rtcRoomId, type: 'VOICE', status: 'ENDED', createdAt: new Date(now - 900000) };
    const boundary: any = { scope, expiresAt: new Date(now - 400000), revision: 1 };
    boundary.stopIntent = { ...createConsultStopIntent({ operationId: id, reason: 'END', requestedBy: caller, now: new Date(now - 500000), boundary }), state: 'ACKNOWLEDGED',
      dispatch: { region: 'ap-beijing', claimedAt: new Date(now - 500000).toISOString(), leaseUntil: new Date(now - 440000).toISOString(), resultAt: new Date(now - 499000).toISOString(), providerRequestId: id } };
    boundary.mediaEvidence = appendConsultMediaEvent(null, parseConsultMediaEvent({ sdkAppId: scope.sdkAppId, receivedAt: now,
      bodyDigest: 'b'.repeat(64), body: { CallbackTs: now, EventType: 102, EventGroupId: 1,
        EventInfo: { RoomId: scope.rtcRoomId, EventMsTs: now - 50000 } } })!);
    const current: any = { id: 'quota1', state: 'ACTIVE', revision: 2, binding: { circleId: call.circleId, actorId: caller,
      subjectUserId: expert, capability: 'AUDIO_QUESTION', businessType: 'AUDIO_QUESTION', businessId: id, requestKey: id, units: 1, holdSeconds: 60 } };
    const tx: any = { $queryRaw: jest.fn().mockImplementation((strings: TemplateStringsArray) => {
      const sql = strings.join('?'); trace.push(sql.includes('MediaBoundary') ? 'boundary-lock' : sql.includes('FOR UPDATE') ? 'call-lock' : 'initial');
      return Promise.resolve([sql.includes('MediaBoundary') ? boundary : call]);
    }), $executeRaw: jest.fn().mockImplementation(() => { trace.push('completion-write'); return Promise.resolve(1); }) };
    const prisma: any = { $transaction: jest.fn(fn => fn(tx)) };
    const ledger: any = { lockScope: jest.fn(async () => { trace.push('scope-lock'); }), byBusiness: jest.fn(async () => current), receipt: jest.fn() };
    const quota: any = { settleInTransaction: jest.fn(async () => { trace.push('quota-write'); return { reservation: { ...current, state: 'COMPLETED', revision: 3 } }; }) };
    return { call, boundary, current, tx, prisma, ledger, quota, trace, service: new ConsultMediaCompletionService(prisma, ledger, quota) };
  }
  it('全部证明满足才在同一事务写额度与收尾回执，锁序一致', async () => {
    const f = fixture(); expect(await f.service.complete(id)).toEqual({ state: 'COMPLETED', changed: true });
    expect(f.trace).toEqual(['initial', 'scope-lock', 'call-lock', 'boundary-lock', 'quota-write', 'completion-write']);
    expect(f.quota.settleInTransaction).toHaveBeenCalledWith(f.tx, expect.objectContaining({ action: 'COMPLETE', expectedRevision: 2, operationKey: id }));
    expect(f.tx.$executeRaw.mock.calls[0][1]).not.toMatch(/userSig|privateMapKey|secret/i);
  });
  it('证据回执CAS失败必须抛错，由主库事务回滚额度', async () => {
    const f = fixture(); f.tx.$executeRaw.mockResolvedValue(0);
    await expect(f.service.complete(id)).rejects.toThrow('CONSULT_COMPLETION_CAS_FAILED');
    expect(f.prisma.$transaction).toHaveBeenCalledTimes(1);
  });
  it('账本失败不写完成标记', async () => {
    const f = fixture(); f.quota.settleInTransaction.mockRejectedValue(new Error('ledger-failure'));
    await expect(f.service.complete(id)).rejects.toThrow('ledger-failure'); expect(f.tx.$executeRaw).not.toHaveBeenCalled();
  });
  it('保护期后明确不存在可补足缺少最终回调，但ACK或过期租约不能代替', async () => {
    const f = fixture(); f.boundary.mediaEvidence = null;
    f.boundary.stopIntent.finalProbe = { state: 'ABSENT', region: 'ap-beijing', claimedAt: new Date(now - 10000).toISOString(),
      leaseUntil: new Date(now + 50000).toISOString(), resultAt: new Date(now - 9000).toISOString(), requestId: id };
    expect(await f.service.complete(id)).toMatchObject({ state: 'COMPLETED' });
    f.quota.settleInTransaction.mockClear();
    f.boundary.stopIntent.finalProbe.state = 'ACKNOWLEDGED';
    expect(await f.service.complete(id)).toMatchObject({ state: 'PENDING' }); expect(f.quota.settleInTransaction).not.toHaveBeenCalled();
  });
  it.each(['no-proof', 'wrong-app', 'active-order', 'wrong-party', 'unknown-stop', 'no-media', 'no-quota'])('缺少必要证明不动账本：%s', async kind => {
    const f = fixture();
    if (kind === 'no-proof') delete process.env.CONSULT_TRTC_CLOSURE_ATTESTATION;
    if (kind === 'wrong-app') process.env.CONSULT_TRTC_SDK_APP_ID = '1';
    if (kind === 'active-order') f.call.status = 'ONGOING';
    if (kind === 'wrong-party') f.current.binding.subjectUserId = caller;
    if (kind === 'unknown-stop') { f.boundary.stopIntent.state = 'UNKNOWN'; delete f.boundary.stopIntent.dispatch.providerRequestId; }
    if (kind === 'no-media') f.boundary.mediaEvidence = null;
    if (kind === 'no-quota') f.ledger.byBusiness.mockResolvedValue(null);
    expect(await f.service.complete(id)).toMatchObject({ state: 'PENDING' });
    expect(f.quota.settleInTransaction).not.toHaveBeenCalled(); expect(f.tx.$executeRaw).not.toHaveBeenCalled();
  });
  it('重复完成须核对账本原始回执，不重复消耗/释放', async () => {
    const f = fixture(), evidenceRef = `consult-final:${'c'.repeat(64)}`;
    f.current.state = 'COMPLETED'; f.current.revision = 3;
    f.boundary.stopIntent.completion = { quotaId: f.current.id, quotaRevision: 3, evidenceRef };
    f.ledger.receipt.mockResolvedValue({ action: 'COMPLETE', reservationId: f.current.id, appliedRevision: 3,
      source: 'BUSINESS_ADAPTER', actorId: null, evidenceRef, binding: f.current.binding });
    expect(await f.service.complete(id)).toEqual({ state: 'COMPLETED', changed: false });
    expect(f.quota.settleInTransaction).not.toHaveBeenCalled();
    f.ledger.receipt.mockResolvedValue(null);
    await expect(f.service.complete(id)).rejects.toThrow('CONSULT_COMPLETION_RECEIPT_INVALID');
  });
  it.each([{ advancedPermission: false }, { exclusiveIssuer: false }, { sdkAppId: 1 }, { evidenceId: 'yes' },
    { verifiedFrom: new Date(now).toISOString() }, { verifiedUntil: new Date(now).toISOString() }, { extra: true }])('拒绝不覆盖签发期或不完整的部署证明 %#', change => {
    expect(readConsultClosureAttestation(JSON.stringify({ ...proof(), ...change }), scope.sdkAppId, new Date(now - 900000), now)).toBeNull();
  });
});
