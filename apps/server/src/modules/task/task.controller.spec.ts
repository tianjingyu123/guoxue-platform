import { Test } from "@nestjs/testing";
import { TaskController } from "./task.controller";
import { TaskService } from "./task.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";

const mockTaskSvc = {
  list: jest.fn().mockResolvedValue({ items: [{ id: "t1", title: "任务1" }], total: 1, page: 1, pageSize: 20 }),
  create: jest.fn().mockResolvedValue({ id: "t1", title: "新任务" }),
  detail: jest.fn().mockResolvedValue({ id: "t1", title: "任务详情", logs: [] }),
  update: jest.fn().mockResolvedValue({ id: "t1", status: "completed" }),
  claim: jest.fn().mockResolvedValue({ id: "t1", claimedBy: "executor1" }),
  transfer: jest.fn().mockResolvedValue({ id: "t1", transferred: true }),
  forceReclaim: jest.fn().mockResolvedValue({ id: "t1", forceReclaimed: true }),
  approve: jest.fn().mockResolvedValue({ id: "t1", approved: true }),
  rollback: jest.fn().mockResolvedValue({ id: "t1", rolledBack: true }),
  pendingCount: jest.fn().mockResolvedValue(5),
};

describe("TaskController", () => {
  let ctrl: TaskController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [TaskController],
      providers: [
        { provide: TaskService, useValue: mockTaskSvc },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(TaskController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("should be defined", () => {
    expect(ctrl).toBeDefined();
  });

  it("GET /tasks — 任务列表", async () => {
    const result = await ctrl.list("1", "20", "pending", "review", "high", "CLAUDE", "true");
    expect(result).toBeDefined();
    expect(mockTaskSvc.list).toHaveBeenCalledWith({
      page: 1, pageSize: 20, status: "pending", type: "review",
      priority: "high", executorType: "CLAUDE", needsApproval: true,
    });
  });

  it("POST /tasks — 创建任务", async () => {
    const dto: any = { title: "新任务", type: "review" };
    const result = await ctrl.create(dto);
    expect(result).toBeDefined();
    expect(mockTaskSvc.create).toHaveBeenCalledWith(dto);
  });

  it("GET /tasks/:id — 任务详情", async () => {
    const result = await ctrl.detail("t1");
    expect(result).toBeDefined();
    expect(mockTaskSvc.detail).toHaveBeenCalledWith("t1");
  });

  it("PUT /tasks/:id — 更新任务状态", async () => {
    const dto: any = { status: "completed" };
    const req: any = { user: { id: "u1", nickname: "Admin" } };
    const result = await ctrl.update("t1", dto, req);
    expect(result).toBeDefined();
    expect(mockTaskSvc.update).toHaveBeenCalledWith("t1", dto, "Admin");
  });

  it("POST /tasks/:id/claim — 认领任务", async () => {
    const dto: any = { executorType: "HUMAN", executorId: "u1" };
    const result = await ctrl.claim("t1", dto);
    expect(result).toBeDefined();
    expect(mockTaskSvc.claim).toHaveBeenCalledWith("t1", "HUMAN", "u1");
  });

  it("POST /tasks/:id/transfer — 转交任务", async () => {
    const dto: any = { toType: "CLAUDE", toId: "agent1", reason: "重新分配" };
    const req: any = { user: { id: "u1", nickname: "Admin" } };
    const result = await ctrl.transfer("t1", dto, req);
    expect(result).toBeDefined();
    expect(mockTaskSvc.transfer).toHaveBeenCalledWith("t1", "CLAUDE", "agent1", "重新分配", "HUMAN", "Admin");
  });

  it("POST /tasks/:id/force-reclaim — 强制收回任务", async () => {
    const req: any = { user: { id: "u1", nickname: "Admin" } };
    const result = await ctrl.forceReclaim("t1", req);
    expect(result).toBeDefined();
    expect(mockTaskSvc.forceReclaim).toHaveBeenCalledWith("t1", "Admin");
  });

  it("POST /tasks/:id/approve — 审批任务", async () => {
    const dto: any = { approved: true, remark: "通过" };
    const req: any = { user: { id: "u1", nickname: "Admin" } };
    const result = await ctrl.approve("t1", dto, req);
    expect(result).toBeDefined();
    expect(mockTaskSvc.approve).toHaveBeenCalledWith("t1", true, "Admin", "通过");
  });

  it("POST /tasks/:id/rollback — 回滚任务操作", async () => {
    const req: any = { user: { id: "u1", nickname: "Admin" } };
    const result = await ctrl.rollback("t1", req);
    expect(result).toBeDefined();
    expect(mockTaskSvc.rollback).toHaveBeenCalledWith("t1", "Admin");
  });

  it("GET /tasks/stats/pending — 待处理任务统计", async () => {
    const result = await ctrl.pendingStats("CLAUDE");
    expect(result).toBeDefined();
    expect(result).toEqual({ count: 5 });
    expect(mockTaskSvc.pendingCount).toHaveBeenCalledWith("CLAUDE");
  });
});
