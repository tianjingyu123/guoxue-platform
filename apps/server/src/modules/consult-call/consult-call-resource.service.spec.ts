import { ConsultCallResourceService } from './consult-call-resource.service';
import { createConsultStopIntent } from './consult-call-stop-intent.policy';

describe('咨询停流事务复用既有待办', () => {
  const callerId = '00000000-0000-4000-8000-000000000001';
  const expertId = '00000000-0000-4000-8000-000000000002';
  const call = { id: '00000000-0000-4000-8000-000000000003', circleId: '00000000-0000-4000-8000-000000000004',
    callerId, expertId, type: 'VOICE', status: 'ENDED', rtcRoomId: 'consult_1234567890abcdef' };
  function fixture() {
    const boundary = { callId: call.id, scope: { sdkAppId: 12345, rtcRoomId: call.rtcRoomId },
      expiresAt: new Date('2026-09-05T01:00:00.000Z'), revision: 1 };
    const stopIntent = createConsultStopIntent({ boundary, operationId: '00000000-0000-4000-8000-000000000005',
      reason: 'END', requestedBy: callerId, now: new Date('2026-09-05T00:00:00.000Z') });
    const row = { ...boundary, stopIntent };
    const tx = { $queryRaw: jest.fn().mockResolvedValueOnce([call]).mockResolvedValueOnce([row]), $executeRaw: jest.fn() };
    const service = new ConsultCallResourceService({} as never, {} as never, {} as never);
    return { row, tx, run: () => service.requestStopInTransaction(tx as never, call.id, 'END', callerId) };
  }
  it('完整READY待办幂等复用，不写入第二次待办', async () => {
    const f = fixture();
    await expect(f.run()).resolves.toEqual({ tracked: true });
    expect(f.tx.$executeRaw).not.toHaveBeenCalled();
  });
  it.each(['operationId', 'requestedAt', 'protectUntil', 'version'])('缺少%s不得复用或覆盖记录', async field => {
    const f = fixture();
    delete (f.row.stopIntent as unknown as Record<string, unknown>)[field];
    await expect(f.run()).rejects.toThrow('咨询资源或授权已变化');
    expect(f.tx.$executeRaw).not.toHaveBeenCalled();
  });
  it('仅伪造ACK状态但缺少派发凭证时拒绝', async () => {
    const f = fixture();
    f.row.stopIntent.state = 'ACKNOWLEDGED';
    await expect(f.run()).rejects.toThrow('咨询资源或授权已变化');
    expect(f.tx.$executeRaw).not.toHaveBeenCalled();
  });
  it('记录请求人不属于通话双方时拒绝', async () => {
    const f = fixture();
    f.row.stopIntent.requestedBy = '00000000-0000-4000-8000-000000000099';
    await expect(f.run()).rejects.toThrow('咨询资源或授权已变化');
    expect(f.tx.$executeRaw).not.toHaveBeenCalled();
  });
});
