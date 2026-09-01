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
      groupBy: jest.fn(),
    },
  };
  const mockSystemSvc = {
    logAudit: jest.fn().mockResolvedValue({}),
    isAutomationEnabled: jest.fn().mockResolvedValue(true),
  };

  let svc: OpsService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSystemSvc.isAutomationEnabled.mockResolvedValue(true);
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
    approvalStatus: "not_required",
    approvedBy: null,
    approvedAt: null,
    approvalNote: null,
    completedAt: null,
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
        expect.objectContaining({ data: expect.objectContaining({ type: "INSPECT", priority: "MEDIUM", needsApproval: false, approvalStatus: "not_required" }) }),
      );
      expect(mockSystemSvc.logAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: "ops_task.create", executor: "admin-1", targetType: "OPS_TASK", targetId: "t1" }),
      );
    });

    it("create — 修复任务即使前端未勾选也由服务端强制审批", async () => {
      mockPrisma.opsTask.create.mockResolvedValue(task({ type: "FIX", needsApproval: true, approvalStatus: "pending" }));
      await svc.create({ type: "FIX", title: "修复聚合数据", needsApproval: false }, "admin-1");
      expect(mockPrisma.opsTask.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ needsApproval: true, approvalStatus: "pending" }),
      }));
    });

    it("claim — pending 原子认领转 in_progress", async () => {
      mockPrisma.opsTask.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.opsTask.findUnique
        .mockResolvedValueOnce(task({ status: "pending" }))
        .mockResolvedValueOnce(task({ status: "in_progress", executor: "CLAUDE" }));
      const claimed = await svc.claim("t1", "CLAUDE", "admin-1");
      expect(claimed.status).toBe("in_progress");
      expect(mockPrisma.opsTask.updateMany).toHaveBeenCalledWith({
        where: { id: "t1", status: "pending" },
        data: { status: "in_progress", executor: "CLAUDE" },
      });
      expect(mockSystemSvc.logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "ops_task.claim" }));
    });

    it("claim — 已完成任务不可认领（CAS 打空 → 400）", async () => {
      mockPrisma.opsTask.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.opsTask.findUnique.mockResolvedValue(task({ status: "completed" }));
      await expect(svc.claim("t1", "CLAUDE", "admin-1")).rejects.toThrow(BusinessException);
    });

    it("审批人不能再认领自己已审批的高风险任务", async () => {
      mockPrisma.opsTask.findUnique.mockResolvedValue(task({
        status: "pending", needsApproval: true, approvalStatus: "approved", approvedBy: "super-1",
      }));
      await expect(svc.claim("t1", "super-1", "super-1")).rejects.toThrow("审批人不能再认领");
      expect(mockPrisma.opsTask.updateMany).not.toHaveBeenCalled();
    });

    it("complete — in_progress 转 completed 落 result + 回滚快照审计", async () => {
      mockPrisma.opsTask.findUnique
        .mockResolvedValueOnce(task({ status: "in_progress", executor: "CLAUDE" }))
        .mockResolvedValueOnce(task({ status: "completed", executor: "CLAUDE", result: { ok: true } }));
      mockPrisma.opsTask.updateMany.mockResolvedValue({ count: 1 });
      const done = await svc.complete("t1", { ok: true }, "CLAUDE");
      expect(done.status).toBe("completed");
      expect(mockPrisma.opsTask.updateMany).toHaveBeenCalledWith({
        where: { id: "t1", status: "in_progress", executor: "CLAUDE" },
        data: { status: "completed", result: { ok: true }, completedAt: expect.any(Date) },
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
      expect(mockPrisma.opsTask.updateMany).not.toHaveBeenCalled();
    });

    it("complete — 自动化关闭时数字员工停止写入，真人接管仍可完成", async () => {
      mockSystemSvc.isAutomationEnabled.mockResolvedValue(false);
      mockPrisma.opsTask.findUnique.mockResolvedValueOnce(task({ status: "in_progress", executor: "AI:ops" }));
      await expect(svc.complete("t1", { ok: true }, "AI:ops")).rejects.toThrow("自动化已暂停");
      mockPrisma.opsTask.findUnique
        .mockResolvedValueOnce(task({ status: "in_progress", executor: "admin-1" }))
        .mockResolvedValueOnce(task({ status: "completed", executor: "admin-1" }));
      mockPrisma.opsTask.updateMany.mockResolvedValue({ count: 1 });
      await expect(svc.complete("t1", { ok: true }, "admin-1")).resolves.toMatchObject({ status: "completed" });
    });

    it("complete — 高风险任务未审批时服务端强制拒绝", async () => {
      mockPrisma.opsTask.findUnique.mockResolvedValue(task({
        status: "in_progress", executor: "admin-1", needsApproval: true, approvalStatus: "pending",
      }));
      await expect(svc.complete("t1", { ok: true }, "admin-1")).rejects.toThrow("尚未由超级管理员审批");
    });
  });

  describe("高风险审批", () => {
    it("通过审批但不代替执行，任务保持进行中", async () => {
      mockPrisma.opsTask.findUnique
        .mockResolvedValueOnce(task({
          status: "in_progress", executor: "operator-1", needsApproval: true, approvalStatus: "pending",
        }))
        .mockResolvedValueOnce(task({
          status: "in_progress", executor: "operator-1", needsApproval: true, approvalStatus: "approved", approvedBy: "super-1",
        }));
      mockPrisma.opsTask.updateMany.mockResolvedValue({ count: 1 });
      const approved = await svc.approve("t1", true, "super-1", "已核对范围");
      expect(approved.status).toBe("in_progress");
      expect(mockPrisma.opsTask.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ approvalStatus: "approved", approvedBy: "super-1", approvedAt: expect.any(Date) }),
      }));
    });

    it("执行者禁止自审", async () => {
      mockPrisma.opsTask.findUnique.mockResolvedValue(task({
        status: "in_progress", executor: "super-1", needsApproval: true, approvalStatus: "pending",
      }));
      await expect(svc.approve("t1", true, "super-1", "自审" )).rejects.toThrow("不能审批自己的");
    });

    it("驳回后进入待人工复核", async () => {
      mockPrisma.opsTask.findUnique
        .mockResolvedValueOnce(task({
          status: "in_progress", executor: "operator-1", needsApproval: true, approvalStatus: "pending",
        }))
        .mockResolvedValueOnce(task({ status: "needs_review", approvalStatus: "rejected", executor: null }));
      mockPrisma.opsTask.updateMany.mockResolvedValue({ count: 1 });
      await svc.approve("t1", false, "super-1", "证据不足");
      expect(mockPrisma.opsTask.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: "needs_review", executor: null, approvalStatus: "rejected", reviewReason: "证据不足" }),
      }));
    });
  });

  describe("needs_review 转办", () => {
    it("review — in_progress 转 needs_review 附原因", async () => {
      mockPrisma.opsTask.findUnique
        .mockResolvedValueOnce(task({ status: "in_progress", executor: "CLAUDE" }))
        .mockResolvedValueOnce(task({ status: "needs_review", executor: null, reviewReason: "涉资金操作，需人工确认" }));
      mockPrisma.opsTask.updateMany.mockResolvedValue({ count: 1 });
      const t = await svc.review("t1", "涉资金操作，需人工确认", "CLAUDE");
      expect(t.status).toBe("needs_review");
      expect(t.reviewReason).toContain("人工确认");
      expect(mockPrisma.opsTask.updateMany).toHaveBeenCalledWith({
        where: { id: "t1", status: { not: "completed" } },
        data: { status: "needs_review", executor: null, reviewReason: "涉资金操作，需人工确认" },
      });
      expect(mockSystemSvc.logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "ops_task.review" }));
    });

    it("review — 已完成任务不可转办", async () => {
      mockPrisma.opsTask.findUnique.mockResolvedValue(task({ status: "completed" }));
      await expect(svc.review("t1", "原因", "admin-1")).rejects.toThrow(BusinessException);
    });

    it("claim — 真人可从 needs_review 认领接管（一键接管双向通道）", async () => {
      mockPrisma.opsTask.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.opsTask.findUnique
        .mockResolvedValueOnce(task({ status: "needs_review", executor: null }))
        .mockResolvedValueOnce(task({ status: "in_progress", executor: "admin-1" }));
      const t = await svc.claim("t1", "admin-1", "admin-1");
      expect(t.executor).toBe("admin-1");
    });

    it("驳回后的高风险任务重新认领时重置为待审批", async () => {
      mockPrisma.opsTask.findUnique
        .mockResolvedValueOnce(task({
          status: "needs_review", needsApproval: true, approvalStatus: "rejected", approvedBy: "super-1",
        }))
        .mockResolvedValueOnce(task({
          status: "in_progress", executor: "operator-2", needsApproval: true, approvalStatus: "pending",
        }));
      mockPrisma.opsTask.updateMany.mockResolvedValue({ count: 1 });

      await svc.claim("t1", "operator-2", "operator-2");

      expect(mockPrisma.opsTask.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ approvalStatus: "pending", approvedBy: null, approvalNote: null }),
      }));
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

    it("overview 返回 AI 运营闭环聚合口径", async () => {
      mockPrisma.opsTask.groupBy.mockResolvedValue([
        { status: "pending", _count: 3 },
        { status: "completed", _count: 8 },
      ]);
      mockPrisma.opsTask.count
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(4)
        .mockResolvedValueOnce(5);
      const result = await svc.overview();
      expect(result).toMatchObject({ activeTasks: 3, pendingApprovals: 2, aiCompleted24h: 4, aiGenerated24h: 5 });
    });
  });
});
