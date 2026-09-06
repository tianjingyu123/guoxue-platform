import { Logger } from "@nestjs/common";
import { ConsultTrtcStopWorker } from "./consult-trtc-stop.worker";

describe("咨询停流后台调度（仅替身）", () => {
  const original = process.env.CONSULT_TRTC_STOP_REGION;
  const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  function fixture() {
    const prisma = { $queryRaw: jest.fn().mockResolvedValue([{ callId: id(1) }]) };
    const dispatcher = { dispatch: jest.fn().mockResolvedValue({ state: "ACKNOWLEDGED" }) };
    return { prisma, dispatcher, worker: new ConsultTrtcStopWorker(prisma as never, dispatcher as never) };
  }
  beforeEach(() => { process.env.CONSULT_TRTC_STOP_REGION = "ap-beijing"; jest.spyOn(Logger.prototype, "warn").mockImplementation(() => {}); });
  afterEach(() => { jest.restoreAllMocks(); if (original === undefined) delete process.env.CONSULT_TRTC_STOP_REGION; else process.env.CONSULT_TRTC_STOP_REGION = original; });
  it.each([undefined, "", "ap-shanghai", " ap-beijing"])("未明确配置地域时不读库、不操作云端 %s", async region => {
    if (region === undefined) delete process.env.CONSULT_TRTC_STOP_REGION; else process.env.CONSULT_TRTC_STOP_REGION = region;
    const f = fixture(); await f.worker.tick();
    expect(f.worker.status().state).toBe("WAITING_CONFIGURATION"); expect(f.prisma.$queryRaw).not.toHaveBeenCalled();
    expect(f.dispatcher.dispatch).not.toHaveBeenCalled();
  });
  it("扫描范围仅READY/DISPATCHING且有界；ACK不是completed", async () => {
    const f = fixture(); await f.worker.tick();
    const sql = f.prisma.$queryRaw.mock.calls[0][0];
    expect(sql.sql).toContain("IN ('READY','DISPATCHING')"); expect(sql.sql).toContain("LIMIT 10");
    expect(f.dispatcher.dispatch).toHaveBeenCalledWith(id(1), "ap-beijing");
    expect(f.worker.status()).toMatchObject({ state: "FINISHED", acknowledged: 1, processed: 1 });
    expect(f.worker.status()).not.toHaveProperty("completed");
  });
  it("本进程重入不重复扫描，跨节点由事务认领保护", async () => {
    const f = fixture(); let release!: (value: unknown[]) => void;
    f.prisma.$queryRaw.mockImplementation(() => new Promise(resolve => { release = resolve; }));
    const pending = f.worker.tick(); await f.worker.tick(); expect(f.prisma.$queryRaw).toHaveBeenCalledTimes(1);
    release([]); await pending;
  });
  it("单条未知或异常不中断后续，日志只返回固定计数", async () => {
    const f = fixture(); f.prisma.$queryRaw.mockResolvedValue([1, 2, 3].map(n => ({ callId: id(n) })));
    f.dispatcher.dispatch.mockRejectedValueOnce(new Error("SYNTHETIC_SECRET")).mockResolvedValueOnce({ state: "UNKNOWN" });
    await f.worker.tick();
    expect(f.worker.status()).toMatchObject({ state: "FAILED", failed: 1, unknown: 1, acknowledged: 1 });
    expect(Logger.prototype.warn).toHaveBeenCalledWith("CONSULT_TRTC_STOP_REQUIRES_REVIEW failed=1 unknown=1");
  });
  it("游标前进并在空页后复位，阻断记录不会永久堵住后续", async () => {
    const f = fixture(); f.dispatcher.dispatch.mockResolvedValue({ state: "BLOCKED" });
    await f.worker.tick(); await f.worker.tick();
    expect(f.prisma.$queryRaw.mock.calls[1][0].values).toContain(id(1));
    f.prisma.$queryRaw.mockResolvedValue([]); await f.worker.tick(); await f.worker.tick();
    expect(f.prisma.$queryRaw.mock.calls[3][0].values).not.toContain(id(1));
  });
  it("配置在扫描期间变化则停止当前批次", async () => {
    const f = fixture(); f.prisma.$queryRaw.mockImplementation(async () => { process.env.CONSULT_TRTC_STOP_REGION = "ap-guangzhou"; return [{ callId: id(1) }]; });
    await f.worker.tick(); expect(f.dispatcher.dispatch).not.toHaveBeenCalled();
  });
  it("扫描失败后下一次仍可运行且不记录原始错误", async () => {
    const f = fixture(); f.prisma.$queryRaw.mockRejectedValueOnce(new Error("SYNTHETIC_SECRET"));
    await f.worker.tick(); expect(f.worker.status().state).toBe("FAILED");
    await f.worker.tick(); expect(f.worker.status().state).toBe("FINISHED");
    expect(JSON.stringify((Logger.prototype.warn as jest.Mock).mock.calls)).not.toContain("SYNTHETIC_SECRET");
  });
});
