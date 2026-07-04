import { OpsService } from "./ops.service";
import { BusinessException } from "../../common/business.exception";

/** 任务池（OS-P1）— 任务流转 pending→claim→complete + needs_review 转办 + 审计透传 */
describe("OpsService", () => {
  const mockPrisma = {
    opsTask: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };
  const mockSystemSvc = { logAudit: jest.fn().mockResolvedValue({}) };

  let svc: OpsService;

  beforeEach(() => {
    jest.clearAllMocks();
    svc = new OpsService(mockPrisma as any, mockSystemSvc as any);
  });

  const task = (over: Record<string, any> = {}) => ({
    id: "t1",
    type: "INSPECT",
    priority: "MEDIUM",
    status: "pending",
    title: "每日巡检报告",
    executor: null,
    payload: {},
    result: null,
    reviewReason: null,
    needsApproval: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  });

  describe("任务流转 pending → claim → complete", () => {
    it("create — 建任务并落审计（executor 透传）", async () => {
      mockPrisma.opsTask.create.mockResolvedValue(task());
      const created = await svc.create({ type: "INSPECT", title: "每日巡检报告" }, "admin-1");
      expect(created.status).toBe("pending");
      expect(mockPrisma.opsTask.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ type: "INSPECT", priority: "MEDIUM", needsApproval: false }) }),
      );
      expect(mockSystemSvc.logAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: "ops_task.create", executor: "admin-1", targetType: "OPS_TASK", targetId: "t1" }),
      );
    });

    it("claim — pending 原子认领转 in_progress", async () => {
      mockPrisma.opsTask.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.opsTask.findUnique.mockResolvedValue(task({ status: "in_progress", executor: "CLAUDE" }));
      const claimed = await svc.claim("t1", "CLAUDE", "admin-1");
      expect(claimed.status).toBe("in_progress");
      expect(mockPrisma.opsTask.updateMany).toHaveBeenCalledWith({
        where: { id: "t1", status: { in: ["pending", "needs_review"] } },
        data: { status: "in_progress", executor: "CLAUDE" },
      });
      expect(mockSystemSvc.logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "ops_task.claim" }));
    });

    it("claim — 已完成任务不可认领（CAS 打空 → 400）", async () => {
      mockPrisma.opsTask.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.opsTask.findUnique.mockResolvedValue(task({ status: "completed" }));
      await expect(svc.claim("t1", "CLAUDE", "admin-1")).rejects.toThrow(BusinessException);
    });

    it("complete — in_progress 转 completed 落 result + 回滚快照审计", async () => {
      mockPrisma.opsTask.findUnique.mockResolvedValue(task({ status: "in_progress", executor: "CLAUDE" }));
      mockPrisma.opsTask.update.mockResolvedValue(task({ status: "completed", result: { ok: true } }));
      const done = await svc.complete("t1", { ok: true }, "CLAUDE");
      expect(done.status).toBe("completed");
      expect(mockPrisma.opsTask.update).toHaveBeenCalledWith({
        where: { id: "t1" },
        data: { status: "completed", result: { ok: true } },
      });
      expect(mockSystemSvc.logAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "ops_task.complete",
          executor: "CLAUDE",
          rollbackData: expect.objectContaining({ previousStatus: "in_progress" }),
        }),
      );
    });

    it("complete — 未认领（pending）不可直接完成", async () => {
      mockPrisma.opsTask.findUnique.mockResolvedValue(task({ status: "pending" }));
      await expect(svc.complete("t1", {}, "CLAUDE")).rejects.toThrow(BusinessException);
      expect(mockPrisma.opsTask.update).not.toHaveBeenCalled();
    });
  });

  describe("needs_review 转办", () => {
    it("review — in_progress 转 needs_review 附原因", async () => {
      mockPrisma.opsTask.findUnique.mockResolvedValue(task({ status: "in_progress", executor: "CLAUDE" }));
      mockPrisma.opsTask.update.mockResolvedValue(task({ status: "needs_review", reviewReason: "涉资金操作，需人工确认" }));
      const t = await svc.review("t1", "涉资金操作，需人工确认", "CLAUDE");
      expect(t.status).toBe("needs_review");
      expect(t.reviewReason).toContain("人工确认");
      expect(mockPrisma.opsTask.update).toHaveBeenCalledWith({
        where: { id: "t1" },
        data: { status: "needs_review", reviewReason: "涉资金操作，需人工确认" },
      });
      expect(mockSystemSvc.logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "ops_task.review" }));
    });

    it("review — 已完成任务不可转办", async () => {
      mockPrisma.opsTask.findUnique.mockResolvedValue(task({ status: "completed" }));
      await expect(svc.review("t1", "原因", "admin-1")).rejects.toThrow(BusinessException);
    });

    it("claim — 真人可从 needs_review 认领接管（一键接管双向通道）", async () => {
      mockPrisma.opsTask.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.opsTask.findUnique.mockResolvedValue(task({ status: "in_progress", executor: "admin-1" }));
      const t = await svc.claim("t1", "admin-1", "admin-1");
      expect(t.executor).toBe("admin-1");
    });

    it("任务不存在 → NOT_FOUND", async () => {
      mockPrisma.opsTask.findUnique.mockResolvedValue(null);
      await expect(svc.review("missing", "原因", "admin-1")).rejects.toThrow("任务不存在");
    });
  });

  describe("list 分页筛选", () => {
    it("按 status/type 过滤并返回分页结构", async () => {
      mockPrisma.opsTask.findMany.mockResolvedValue([task()]);
      mockPrisma.opsTask.count.mockResolvedValue(1);
      const res = await svc.list({ status: "pending", type: "INSPECT", page: 1, pageSize: 20 });
      expect(res.rows).toHaveLength(1);
      expect(res.total).toBe(1);
      expect(res._paginated).toBe(true);
      expect(mockPrisma.opsTask.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: "pending", type: "INSPECT" }, skip: 0, take: 20 }),
      );
    });
  });
});
