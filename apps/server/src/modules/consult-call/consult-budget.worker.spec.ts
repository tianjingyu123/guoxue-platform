import { ConsultBudgetWorker } from './consult-budget.worker';
import { consultBudgetDeadline } from './consult-budget.policy';
import { createConsultStopIntent, validConsultStopIntent } from './consult-call-stop-intent.policy';
describe('预扣到期自动结束（不追加扣款）', () => {
  const now = 1788650000000;
  beforeEach(() => jest.useFakeTimers().setSystemTime(now));
  afterEach(() => jest.useRealTimers());
  function fixture() {
    const call = { status: 'ONGOING', startAt: new Date(now - 600000), prepaidCoin: 80, pricePerMinute: 8, callerId: 'caller', expertId: 'expert' };
    const tx = { $queryRaw: jest.fn().mockResolvedValue([call]), $executeRaw: jest.fn().mockResolvedValue(1) };
    const prisma = { $transaction: jest.fn(async fn => fn(tx)), $queryRaw: jest.fn().mockResolvedValue([{ id: 'call1' }]) };
    const resources = { lockForStopInTransaction: jest.fn(), requestStopInTransaction: jest.fn() };
    const revenue = { recordConsultInTransaction: jest.fn() }, stop = { dispatch: jest.fn() };
    return { call, tx, prisma, resources, revenue, stop, worker: new ConsultBudgetWorker(prisma as any, resources as any, revenue as any, stop as any) };
  }
  it('按已预扣金额核算截止，到点同事务写终态、停流、收益', async () => {
    const f = fixture(); expect(await f.worker.expire('call1')).toBe(true);
    expect(f.tx.$executeRaw.mock.calls[0].slice(1)).toEqual([new Date(now).toISOString(), 600, 80, 'call1']);
    expect(f.resources.requestStopInTransaction).toHaveBeenCalledWith(f.tx, 'call1', 'BUDGET_TIMEOUT', null);
    expect(f.revenue.recordConsultInTransaction).toHaveBeenCalledWith({ callId: 'call1', callerId: 'caller', expertId: 'expert', amountCoin: 80 }, f.tx);
  });
  it.each(['not-due', 'ended', 'invalid-price', 'invalid-start', 'cas-lost'])('未到期/无效/竞争失败不记账：%s', async kind => {
    const f = fixture();
    if (kind === 'not-due') f.call.startAt = new Date(now - 599999);
    if (kind === 'ended') f.call.status = 'ENDED';
    if (kind === 'invalid-price') f.call.pricePerMinute = 0;
    if (kind === 'invalid-start') f.call.startAt = new Date(NaN);
    if (kind === 'cas-lost') f.tx.$executeRaw.mockResolvedValue(0);
    expect(await f.worker.expire('call1')).toBe(false); expect(f.revenue.recordConsultInTransaction).not.toHaveBeenCalled();
    expect(f.resources.requestStopInTransaction).not.toHaveBeenCalled();
  });
  it('收益失败向事务传播，不能吞掉并报告结束成功', async () => {
    const f = fixture(); f.revenue.recordConsultInTransaction.mockRejectedValue(new Error('synthetic'));
    await expect(f.worker.expire('call1')).rejects.toThrow('synthetic');
  });
  it('到期任务不假扮真人，提交后才派发原有单次停流', async () => {
    const old = process.env.CONSULT_TRTC_STOP_REGION; process.env.CONSULT_TRTC_STOP_REGION = 'ap-beijing';
    try { const f = fixture(); await f.worker.tick(); expect(f.stop.dispatch).toHaveBeenCalledWith('call1', 'ap-beijing'); }
    finally { if (old === undefined) delete process.env.CONSULT_TRTC_STOP_REGION; else process.env.CONSULT_TRTC_STOP_REGION = old; }
  });
  it.each([0, -1, 1.2, 2147483648, NaN])('拒绝非法预扣 %s', prepaidCoin => {
    expect(consultBudgetDeadline({ startAt: new Date(now), pricePerMinute: 8, prepaidCoin })).toBeNull();
  });
  it('系统预算终态必须ENDED且不携带真人ID', () => {
    const boundary = { scope: { sdkAppId: 1, rtcRoomId: 'consult_0123456789abcdef' }, revision: 1, expiresAt: new Date(now) };
    const stop = createConsultStopIntent({ operationId: '00000000-0000-4000-8000-000000000001', reason: 'BUDGET_TIMEOUT', requestedBy: null, now: new Date(now), boundary });
    const call = { status: 'ENDED', callerId: 'caller', expertId: 'expert', rtcRoomId: boundary.scope.rtcRoomId };
    expect(validConsultStopIntent(stop, boundary, call)).toBe(true);
    expect(validConsultStopIntent(stop, boundary, { ...call, status: 'ONGOING' })).toBe(false);
  });
});
