import { Logger } from "@nestjs/common";
import { LiveMediaStopWorker } from "./live-media-stop.worker";
import { readCssStopAttestation } from "./live-media-stop-config";

describe("直播停流后台调度", () => {
  const old = process.env.LIVE_CSS_EXACT_SCOPE_ATTESTATION;
  const proof = () => ({ domain: "push.example.invalid", appName: "live", evidenceId: "synthetic-proof",
    verifiedAt: new Date(Date.now() - 1000).toISOString(), verifiedUntil: new Date(Date.now() + 3600000).toISOString() });
  const row = (n: number) => ({ roomId: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`, createdAt: new Date(Date.now() - 10000) });
  function fixture() {
    const prisma = { $queryRaw: jest.fn().mockResolvedValue([row(1)]), $transaction: jest.fn(fn => fn({})) };
    const stops = { expireLeaseInTransaction: jest.fn().mockResolvedValue({ state: "UNKNOWN" }) };
    const dispatcher = { dispatchCss: jest.fn().mockResolvedValue({ state: "ACKNOWLEDGED" }),
      verifyCss: jest.fn().mockResolvedValue({ state: "forbid", applied: true }) };
    const completion = { completeCss: jest.fn().mockResolvedValue({ state: "COMPLETED" }) };
    const worker = new LiveMediaStopWorker(prisma as never, stops as never, dispatcher as never, completion as never);
    return { prisma, stops, dispatcher, completion, worker };
  }
  beforeEach(() => {
    process.env.LIVE_CSS_EXACT_SCOPE_ATTESTATION = JSON.stringify(proof());
    jest.spyOn(Logger.prototype, "warn").mockImplementation(() => {});
    jest.spyOn(Logger.prototype, "error").mockImplementation(() => {});
  });
  afterEach(() => { jest.restoreAllMocks(); if (old === undefined) delete process.env.LIVE_CSS_EXACT_SCOPE_ATTESTATION; else process.env.LIVE_CSS_EXACT_SCOPE_ATTESTATION = old; });
  it("缺证明无数据库扫描或供应商操作", async () => {
    delete process.env.LIVE_CSS_EXACT_SCOPE_ATTESTATION; const f = fixture(); await f.worker.tick();
    expect(f.worker.status().state).toBe("WAITING_SCOPE_VERIFICATION"); expect(f.prisma.$queryRaw).not.toHaveBeenCalled();
    expect(f.dispatcher.dispatchCss).not.toHaveBeenCalled();
  });
  it("顺序执行过期核对、派发、查询、收尾", async () => {
    const f = fixture(); await f.worker.tick();
    expect(f.worker.status()).toMatchObject({ state: "FINISHED", processed: 1, completed: 1, failed: 0 });
    expect(f.stops.expireLeaseInTransaction.mock.invocationCallOrder[0]).toBeLessThan(f.dispatcher.dispatchCss.mock.invocationCallOrder[0]);
    expect(f.dispatcher.dispatchCss.mock.invocationCallOrder[0]).toBeLessThan(f.dispatcher.verifyCss.mock.invocationCallOrder[0]);
    expect(f.dispatcher.verifyCss.mock.invocationCallOrder[0]).toBeLessThan(f.completion.completeCss.mock.invocationCallOrder[0]);
  });
  it("同实例重叠 tick 不重复扫描", async () => {
    const f = fixture(); let release!: (rows: unknown[]) => void;
    f.prisma.$queryRaw.mockImplementation(() => new Promise(resolve => { release = resolve; }));
    const first = f.worker.tick(); await f.worker.tick(); expect(f.prisma.$queryRaw).toHaveBeenCalledTimes(1);
    release([]); await first;
  });
  it("派发阻断不继续查询；未知查询不释放额度", async () => {
    const f = fixture(); f.dispatcher.dispatchCss.mockResolvedValueOnce({ state: "BLOCKED" });
    await f.worker.tick(); expect(f.dispatcher.verifyCss).not.toHaveBeenCalled();
    f.dispatcher.verifyCss.mockResolvedValueOnce({ state: "UNKNOWN", applied: true });
    await f.worker.tick(); expect(f.completion.completeCss).not.toHaveBeenCalled(); expect(f.worker.status().pending).toBe(1);
  });
  it("单条失败不堵住后续记录，错误只输出固定摘要", async () => {
    const f = fixture(); f.prisma.$queryRaw.mockResolvedValue([row(1), row(2)]);
    f.dispatcher.dispatchCss.mockRejectedValueOnce(new Error("SYNTHETIC_PRIVATE_ERROR")); await f.worker.tick();
    expect(f.worker.status()).toMatchObject({ state: "FAILED", processed: 2, completed: 1, failed: 1 });
    expect(Logger.prototype.error).toHaveBeenCalledWith("LIVE_MEDIA_STOP_WORKER_FAILED count=1");
  });
  it("扫描游标前进，空页后重置，避免最早的未决记录饿死后续记录", async () => {
    const f = fixture(); f.prisma.$queryRaw.mockResolvedValueOnce([row(1)]).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    await f.worker.tick(); await f.worker.tick(); await f.worker.tick();
    const statements = f.prisma.$queryRaw.mock.calls.map(call => String(call[0].sql));
    expect(statements[0]).not.toContain('AND ("createdAt", "roomId")');
    expect(statements[1]).toContain('AND ("createdAt", "roomId")');
    expect(statements[2]).not.toContain('AND ("createdAt", "roomId")');
  });
  it("部署证明有效范围按实际域名和路径投影", () => {
    expect(readCssStopAttestation(JSON.stringify(proof()), Date.now())).toMatchObject({ domain: "push.example.invalid", appName: "live" });
  });
  it.each([
    { domain: "https://push.example.invalid" }, { domain: "localhost" }, { appName: "live/other" }, { evidenceId: "secret?token=value" },
    { verifiedAt: "2099-01-01T00:00:00Z" }, { verifiedUntil: "2000-01-01T00:00:00Z" },
    { verifiedUntil: "2099-01-01T00:00:00Z" }, { verifiedAt: "2026-09-01 00:00:00" }, { extra: "do-not-accept" },
  ])("无效核验证明失败即停止 %#", change => {
    expect(readCssStopAttestation(JSON.stringify({ ...proof(), ...change }), Date.now())).toBeNull();
  });
});
