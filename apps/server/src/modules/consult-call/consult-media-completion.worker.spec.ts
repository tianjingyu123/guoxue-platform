import { ConsultMediaCompletionWorker } from './consult-media-completion.worker';
describe('咨询收尾有界任务', () => {
  const old = process.env.CONSULT_TRTC_CLOSURE_ATTESTATION, app = process.env.CONSULT_TRTC_SDK_APP_ID;
  beforeEach(() => {
    process.env.CONSULT_TRTC_SDK_APP_ID = '1';
    process.env.CONSULT_TRTC_CLOSURE_ATTESTATION = JSON.stringify({ sdkAppId: 1, advancedPermission: true, exclusiveIssuer: true,
      verifiedFrom: new Date(Date.now() - 10000).toISOString(), verifiedUntil: new Date(Date.now() + 600000).toISOString(), evidenceId: 'a'.repeat(64) });
  });
  afterEach(() => {
    if (old === undefined) delete process.env.CONSULT_TRTC_CLOSURE_ATTESTATION; else process.env.CONSULT_TRTC_CLOSURE_ATTESTATION = old;
    if (app === undefined) delete process.env.CONSULT_TRTC_SDK_APP_ID; else process.env.CONSULT_TRTC_SDK_APP_ID = app;
  });
  const fixture = () => {
    const prisma = { $queryRaw: jest.fn().mockResolvedValue([{ callId: 'first' }, { callId: 'second' }]) };
    const completion = { complete: jest.fn().mockResolvedValue({ state: 'PENDING' }) };
    const probe = { dispatch: jest.fn() };
    return { prisma, completion, probe, worker: new ConsultMediaCompletionWorker(prisma as any, completion as any, probe as any) };
  };
  it('缺少证明零查库零动作', async () => {
    delete process.env.CONSULT_TRTC_CLOSURE_ATTESTATION; const f = fixture(); await f.worker.tick();
    expect(f.prisma.$queryRaw).not.toHaveBeenCalled(); expect(f.completion.complete).not.toHaveBeenCalled();
  });
  it('只处理受理且未完成项，使用上限与游标', async () => {
    const f = fixture(); await f.worker.tick();
    expect(f.prisma.$queryRaw.mock.calls[0][0].sql).toMatch(/LIMIT 10/);
    expect(f.prisma.$queryRaw.mock.calls[0][0].sql).toContain("NOT (\"stopIntent\" ? 'completion')");
    expect(f.completion.complete.mock.calls).toEqual([['first'], ['second']]);
    await f.worker.tick(); expect(f.prisma.$queryRaw.mock.calls[1][0].values).toContain('second');
  });
  it('部署证明中途改变立即停止本批', async () => {
    const f = fixture(); f.completion.complete.mockImplementation(async () => { delete process.env.CONSULT_TRTC_CLOSURE_ATTESTATION; return { state: 'PENDING' }; });
    await f.worker.tick(); expect(f.completion.complete).toHaveBeenCalledTimes(1);
  });
  it('同进程不会并行处理同一批', async () => {
    const f = fixture(); let finish!: (rows: any[]) => void;
    f.prisma.$queryRaw.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const first = f.worker.tick(); await f.worker.tick(); expect(f.prisma.$queryRaw).toHaveBeenCalledTimes(1);
    finish([]); await first;
  });
});
