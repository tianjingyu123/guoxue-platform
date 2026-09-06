import { VideoService } from "./video.service";
import { AuditService } from "../audit/audit.service";

describe("视频与待审台账原子创建", () => {
  const tx = { video: { create: jest.fn() }, contentAuditRecord: { create: jest.fn() } };
  const prisma = { configSystem: { findUnique: jest.fn().mockResolvedValue(null) }, $transaction: jest.fn() };
  const audit = { resolveContentVisibility: jest.fn(), openContentAudit: jest.fn(), queueContentModeration: jest.fn() };
  // 本组专测审核台账事务，额度真实事务另有独立覆盖。
  const publication = { createInTransaction: (_tx, input, write) => write(input.videoId) };
  const svc = new VideoService(prisma as never, {} as never, audit as never, publication as never);
  beforeEach(() => {
    jest.resetAllMocks();
    prisma.configSystem.findUnique.mockResolvedValue(null);
    tx.video.create.mockResolvedValue({ id: "synthetic-video" });
    prisma.$transaction.mockImplementation(async work => work(tx));
    audit.resolveContentVisibility.mockResolvedValue({ visibility: "CIRCLE_ONLY", auditStatus: "PENDING" });
    // 调用真实台账方法，确保事务分支不会吞掉登记失败。
    audit.openContentAudit.mockImplementation((opts, client) => AuditService.prototype.openContentAudit.call({ prisma: {} }, opts, client));
  });
  it("同一事务创建视频与审核记录后才启动异步机审", async () => {
    await svc.create("author", { videoUrl: "https://example.invalid/synthetic.mp4" });
    expect(audit.openContentAudit).toHaveBeenCalledWith(expect.objectContaining({ contentId: "synthetic-video", submitterId: "author" }), tx);
    expect(tx.contentAuditRecord.create).toHaveBeenCalledTimes(1);
    expect(tx.contentAuditRecord.create.mock.invocationCallOrder[0]).toBeLessThan(audit.queueContentModeration.mock.invocationCallOrder[0]);
  });
  it("真实审核方法登记失败向外抛出，事务失败且不调度机审", async () => {
    const failure = new Error("SYNTHETIC_AUDIT_INSERT_FAILURE");
    tx.contentAuditRecord.create.mockRejectedValue(failure);
    await expect(svc.create("author", { videoUrl: "https://example.invalid/synthetic.mp4" })).rejects.toBe(failure);
    expect(audit.queueContentModeration).not.toHaveBeenCalled();
  });
  it("视频写入失败不创建台账、不调度机审", async () => {
    tx.video.create.mockRejectedValue(new Error("SYNTHETIC_VIDEO_INSERT_FAILURE"));
    await expect(svc.create("author", { videoUrl: "https://example.invalid/synthetic.mp4" })).rejects.toThrow("VIDEO_INSERT_FAILURE");
    expect(tx.contentAuditRecord.create).not.toHaveBeenCalled(); expect(audit.queueContentModeration).not.toHaveBeenCalled();
  });
});
