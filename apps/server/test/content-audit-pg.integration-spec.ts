import { Prisma, PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { AuditService } from "../src/modules/audit/audit.service";
import { CircleWorkflowLocalPg, capture, localGate } from "./fixtures/circle-workflow-local-pg";

const localSuite = process.env.RUN_CIRCLE_WORKFLOW_LOCAL_PG === "YES" ? describe : describe.skip;
localSuite("人工审核真实事务与双审核员竞争", () => {
  const pg = new CircleWorkflowLocalPg();
  beforeAll(() => pg.start(), 120000);
  afterAll(() => pg.stop(), 65000);
  async function fixture() {
    const user = await pg.observer.user.create({ data: { id: randomUUID(), nickname: "LOCAL_ONLY_AUDIT" } });
    const video = await pg.observer.video.create({ data: { userId: user.id, videoUrl: "https://example.invalid/synthetic.mp4", auditStatus: "PENDING" } });
    const record = await pg.observer.contentAuditRecord.create({ data: { contentType: "VIDEO", contentId: video.id, submitterId: user.id } });
    return { user, video, record };
  }
  function service(client: PrismaClient | object) {
    const cache = { delByPattern: jest.fn().mockResolvedValue(undefined), del: jest.fn().mockResolvedValue(undefined) };
    return { cache, audit: new AuditService(client as never, cache as never, {} as never, {} as never, {} as never) };
  }
  it("真实内容回写失败，台账保持待审且不写成功日志", async () => {
    const h = await fixture(); await pg.observer.video.delete({ where: { id: h.video.id } });
    const s = service(pg.a);
    await expect(s.audit.reviewContent(h.record.id, h.user.id, "approve")).rejects.toThrow();
    expect(await pg.observer.contentAuditRecord.findUnique({ where: { id: h.record.id } })).toMatchObject({ finalStatus: "PENDING", humanAuditorId: null, finishedAt: null });
    expect(await pg.observer.auditLog.count({ where: { targetId: h.video.id } })).toBe(0);
    expect(s.cache.delByPattern).not.toHaveBeenCalled();
  });
  it("人工驳回同步保存可见性、恢复快照和站内通知", async () => {
    const h = await fixture(); const s = service(pg.a);
    await s.audit.reviewContent(h.record.id, h.user.id, "reject", "合成审核原因");
    expect(await pg.observer.video.findUnique({ where: { id: h.video.id } })).toMatchObject({ visibility: "SELF_ONLY", auditStatus: "REJECTED" });
    expect(await pg.observer.notification.count({ where: { targetId: h.video.id, userId: h.user.id } })).toBe(1);
    expect(await pg.observer.auditLog.count({ where: { targetId: h.video.id, action: "CONTENT_DEMOTE_SELF_ONLY" } })).toBe(1);
    await expect(s.audit.reviewContent(h.record.id, h.user.id, "reject")).rejects.toThrow("已审结");
    expect(await pg.observer.notification.count({ where: { targetId: h.video.id } })).toBe(1);
  });
  it("真实通知约束拒绝写入时，驳回与可见性和恢复日志一起回滚", async () => {
    const h = await fixture(); const s = service(pg.a);
    await pg.observer.$executeRawUnsafe(`ALTER TABLE "Notification" ADD CONSTRAINT "local_qa_audit_notification_reject" CHECK ("targetId" <> '${h.video.id}')`);
    try {
      await expect(s.audit.reviewContent(h.record.id, h.user.id, "reject")).rejects.toThrow();
      expect(await pg.observer.contentAuditRecord.findUnique({ where: { id: h.record.id } })).toMatchObject({ finalStatus: "PENDING" });
      expect(await pg.observer.video.findUnique({ where: { id: h.video.id } })).toMatchObject({ visibility: h.video.visibility, auditStatus: "PENDING" });
      expect(await pg.observer.auditLog.count({ where: { targetId: h.video.id } })).toBe(0);
      expect(s.cache.delByPattern).not.toHaveBeenCalled();
    } finally { await pg.observer.$executeRaw`ALTER TABLE "Notification" DROP CONSTRAINT "local_qa_audit_notification_reject"`; }
  });
  it("两次写入后提交前失败，内容与审核结论全部回滚", async () => {
    const h = await fixture();
    const s = service({ $transaction: (work: (tx: Prisma.TransactionClient) => Promise<unknown>) => pg.transaction(pg.a, async tx => {
      await work(tx); await tx.$executeRaw`SELECT 1 / 0`;
    }) });
    await expect(s.audit.reviewContent(h.record.id, h.user.id, "approve")).rejects.toThrow();
    expect(await pg.observer.video.findUnique({ where: { id: h.video.id } })).toMatchObject({ auditStatus: "PENDING" });
    expect(await pg.observer.contentAuditRecord.findUnique({ where: { id: h.record.id } })).toMatchObject({ finalStatus: "PENDING" });
    expect(s.cache.delByPattern).not.toHaveBeenCalled();
  });
  it("两个真实连接同时裁决，只允许先提交者审结", async () => {
    const h = await fixture(); const entered = localGate(), release = localGate();
    const first = service({ auditLog: pg.a.auditLog,
      $transaction: (work: (tx: Prisma.TransactionClient) => Promise<unknown>) => pg.transaction(pg.a, async tx => {
        try { const result = await work(tx); entered.release(); await release.promise; return result; }
        catch (error) { entered.release(); throw error; }
      }) });
    const firstResult = capture(first.audit.reviewContent(h.record.id, h.user.id, "approve"));
    await entered.promise;
    const second = service(pg.b);
    const secondResult = capture(second.audit.reviewContent(h.record.id, h.user.id, "reject", "合成冲突裁决"));
    try { await pg.waitForLocks(); } finally { release.release(); }
    expect((await firstResult).ok).toBe(true);
    const rejected = await secondResult; expect(rejected.ok).toBe(false);
    if (!rejected.ok) expect(rejected.error.message).toContain("已审结");
    expect(await pg.observer.contentAuditRecord.findUnique({ where: { id: h.record.id } })).toMatchObject({ finalStatus: "APPROVED" });
    expect(await pg.observer.video.findUnique({ where: { id: h.video.id } })).toMatchObject({ auditStatus: "APPROVED" });
    expect(await pg.observer.auditLog.count({ where: { targetId: h.video.id, action: "CONTENT_AUDIT_APPROVE" } })).toBe(1);
    expect(second.cache.delByPattern).not.toHaveBeenCalled();
  });
  it("等待内容行锁后，恢复快照读取最新提交状态而非等待前旧值", async () => {
    const h = await fixture(); const entered = localGate(), release = localGate();
    const holder = capture(pg.transaction(pg.a, async tx => {
      await tx.video.update({ where: { id: h.video.id }, data: { status: "HIDDEN", auditStatus: "APPROVED", visibility: "PLATFORM" } });
      entered.release(); await release.promise;
    }));
    await entered.promise;
    const s = service(pg.b); const review = capture(s.audit.reviewContent(h.record.id, h.user.id, "reject", "合成原因"));
    try { await pg.waitForLocks(); } finally { release.release(); }
    expect((await holder).ok).toBe(true); expect((await review).ok).toBe(true);
    const log = await pg.observer.auditLog.findFirst({ where: { targetId: h.video.id, action: "CONTENT_DEMOTE_SELF_ONLY" } });
    expect(log!.rollbackData).toMatchObject({ status: "HIDDEN", auditStatus: "APPROVED", visibility: "PLATFORM" });
    expect(await pg.observer.video.findUnique({ where: { id: h.video.id } })).toMatchObject({ status: "HIDDEN", visibility: "SELF_ONLY", auditStatus: "REJECTED" });
  });
});
