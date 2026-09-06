import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { VideoService } from "../src/modules/video/video.service";
import { AuditService } from "../src/modules/audit/audit.service";
import { CircleWorkflowLocalPg } from "./fixtures/circle-workflow-local-pg";

const localSuite = process.env.RUN_CIRCLE_WORKFLOW_LOCAL_PG === "YES" ? describe : describe.skip;
localSuite("短视频与审核台账真实数据库原子性", () => {
  const pg = new CircleWorkflowLocalPg();
  beforeAll(() => pg.start(), 120000);
  afterAll(() => pg.stop(), 65000);
  async function fixture(lateFailure = false) {
    const userId = randomUUID();
    await pg.observer.user.create({ data: { id: userId, nickname: "LOCAL_ONLY_VIDEO" }, select: { id: true } });
    const audit = new AuditService(pg.a as never, {} as never, {} as never, {} as never, {} as never);
    jest.spyOn(audit, "resolveContentVisibility").mockResolvedValue({ visibility: "CIRCLE_ONLY", auditStatus: "PENDING" } as never);
    const queue = jest.spyOn(audit, "queueContentModeration").mockImplementation(() => undefined);
    const client = lateFailure ? {
      configSystem: pg.a.configSystem,
      $transaction: (work: (tx: Prisma.TransactionClient) => Promise<unknown>) => pg.a.$transaction(async tx => {
        const result = await work(tx);
        await tx.$executeRaw`SELECT 1 / 0`;
        return result;
      }),
    } : pg.a;
    // 本组验证视频和审核台账真实回滚，不将模拟额度标为授权集成证据。
    const publication = { createInTransaction: (_tx, input, write) => write(input.videoId) };
    const svc = new VideoService(client as never, {} as never, audit, publication as never);
    const run = () => svc.create(userId, { title: "仅本地合成", videoUrl: "https://example.invalid/local-only.mp4" });
    const counts = async () => ({ videos: await pg.observer.video.count({ where: { userId } }),
      audits: await pg.observer.contentAuditRecord.count({ where: { submitterId: userId } }) });
    return { userId, run, counts, queue };
  }
  it("成功提交两条记录并调度一次机审", async () => {
    const h = await fixture(); const result = await h.run();
    expect(await h.counts()).toEqual({ videos: 1, audits: 1 });
    expect(await pg.observer.contentAuditRecord.findFirst({ where: { contentId: result.id }, select: { contentType: true, submitterId: true } }))
      .toEqual({ contentType: "VIDEO", submitterId: h.userId });
    expect(h.queue).toHaveBeenCalledTimes(1);
  });
  it("真实审核表约束拒绝插入，视频一并回滚且不调度", async () => {
    const h = await fixture();
    // 仅本次新建合成库注入数据库拒绝，finally 移除明确约束；不接触任何共享库。
    await pg.observer.$executeRawUnsafe(`ALTER TABLE "ContentAuditRecord" ADD CONSTRAINT "local_qa_video_reject" CHECK ("submitterId" <> '${h.userId}')`);
    try {
      await expect(h.run()).rejects.toThrow();
      expect(await h.counts()).toEqual({ videos: 0, audits: 0 });
      expect(h.queue).not.toHaveBeenCalled();
    } finally { await pg.observer.$executeRaw`ALTER TABLE "ContentAuditRecord" DROP CONSTRAINT "local_qa_video_reject"`; }
  });
  it("两次写入后提交前SQL失败，全部回滚且不启动机审", async () => {
    const h = await fixture(true);
    await expect(h.run()).rejects.toThrow();
    expect(await h.counts()).toEqual({ videos: 0, audits: 0 });
    expect(h.queue).not.toHaveBeenCalled();
  });
});
