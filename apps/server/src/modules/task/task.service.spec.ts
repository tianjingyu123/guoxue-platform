import { Test, TestingModule } from "@nestjs/testing";
import { TaskService } from "./task.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { BusinessException } from "../../common/business.exception";

const mockPrisma = {
  task: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  },
  taskTransferLog: {
    create: jest.fn(),
  },
};
const mockRedis = { del: jest.fn().mockResolvedValue(undefined) };

describe("TaskService", () => {
  let svc: TaskService;

  beforeAll(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();
    svc = mod.get(TaskService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("create", () => {
    it("创建任务", async () => {
      mockPrisma.task.create.mockResolvedValue({ id: "t1", title: "测试任务", status: "PENDING" });
      const dto = { type: "DAILY_CHECK", title: "测试任务", description: "描述", priority: "HIGH" as any };
      const result = await svc.create(dto);
      expect(result.id).toBe("t1");
      expect(mockPrisma.task.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ title: "测试任务" }) }));
    });
  });

  describe("list", () => {
    it("分页查询任务列表", async () => {
      mockPrisma.task.findMany.mockResolvedValue([{ id: "t1" }]);
      mockPrisma.task.count.mockResolvedValue(1);
      const result = await svc.list({ page: 1, pageSize: 10, status: "PENDING" });
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe("detail", () => {
    it("查询任务详情", async () => {
      mockPrisma.task.findUnique.mockResolvedValue({ id: "t1", status: "IN_PROGRESS" });
      const result = await svc.detail("t1");
      expect(result.id).toBe("t1");
    });

    it("任务不存在抛出异常", async () => {
      mockPrisma.task.findUnique.mockResolvedValue(null);
      await expect(svc.detail("t99")).rejects.toThrow(BusinessException);
    });
  });

  describe("update", () => {
    it("更新任务状态", async () => {
      mockPrisma.task.findUnique.mockResolvedValue({ id: "t1", status: "PENDING" });
      mockPrisma.task.update.mockResolvedValue({ id: "t1", status: "COMPLETED" });
      const result = await svc.update("t1", { status: "COMPLETED" as any }, "admin");
      expect(result.status).toBe("COMPLETED");
    });

    it("更新不存在任务抛出异常", async () => {
      mockPrisma.task.findUnique.mockResolvedValue(null);
      await expect(svc.update("t99", { status: "COMPLETED" as any })).rejects.toThrow("任务不存在");
    });
  });

  describe("claim", () => {
    it("认领待处理任务", async () => {
      mockPrisma.task.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.task.findUnique.mockResolvedValue({ id: "t1", status: "IN_PROGRESS", executorType: "CLAUDE" });
      const result = await svc.claim("t1", "CLAUDE", "claude-1");
      expect(result.executorType).toBe("CLAUDE");
    });

    it("认领非待处理任务抛出异常", async () => {
      mockPrisma.task.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.task.findUnique.mockResolvedValue({ id: "t1", status: "COMPLETED" });
      await expect(svc.claim("t1", "CLAUDE")).rejects.toThrow("任务非待处理状态");
    });

    it("认领不存在任务抛出异常", async () => {
      mockPrisma.task.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.task.findUnique.mockResolvedValue(null);
      await expect(svc.claim("t99", "CLAUDE")).rejects.toThrow("任务不存在");
    });
  });

  describe("transfer", () => {
    it("转交任务", async () => {
      mockPrisma.task.findUnique.mockResolvedValue({ id: "t1", executorType: "CLAUDE", executorId: "c1", status: "IN_PROGRESS", result: null });
      mockPrisma.taskTransferLog.create.mockResolvedValue({ id: "log1" });
      mockPrisma.task.update.mockResolvedValue({ id: "t1", executorType: "HUMAN", executorId: "u1", status: "PENDING" });
      const result = await svc.transfer("t1", "HUMAN", "u1", "转交人工处理");
      expect(result.executorType).toBe("HUMAN");
    });

    it("转交不存在任务抛出异常", async () => {
      mockPrisma.task.findUnique.mockResolvedValue(null);
      await expect(svc.transfer("t99", "HUMAN", "u1", "测试")).rejects.toThrow("任务不存在");
    });
  });

  describe("approve", () => {
    it("审批通过任务", async () => {
      mockPrisma.task.findUnique.mockResolvedValue({ id: "t1", needsApproval: true });
      mockPrisma.task.update.mockResolvedValue({ id: "t1", status: "COMPLETED", approvedBy: "admin" });
      const result = await svc.approve("t1", true, "admin");
      expect(result.status).toBe("COMPLETED");
    });

    it("审批驳回", async () => {
      mockPrisma.task.findUnique.mockResolvedValue({ id: "t1", needsApproval: true });
      mockPrisma.task.update.mockResolvedValue({ id: "t1", status: "NEEDS_REVIEW", errorLog: "审批驳回" });
      const result = await svc.approve("t1", false, "admin", "审批驳回");
      expect(result.status).toBe("NEEDS_REVIEW");
    });

    it("无需审批任务抛出异常", async () => {
      mockPrisma.task.findUnique.mockResolvedValue({ id: "t1", needsApproval: false });
      await expect(svc.approve("t1", true, "admin")).rejects.toThrow("该任务无需审批");
    });
  });

  describe("pendingCount", () => {
    it("获取待处理任务数", async () => {
      mockPrisma.task.count.mockResolvedValue(5);
      const result = await svc.pendingCount();
      expect(result).toBe(5);
    });
  });
});
