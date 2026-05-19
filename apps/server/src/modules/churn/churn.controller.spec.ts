import { Test } from "@nestjs/testing";
import { ChurnController } from "./churn.controller";
import { ChurnService } from "./churn.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";

const mockChurnSvc = {
  getPredictions: jest.fn().mockResolvedValue({ items: [{ id: "p1", riskLevel: "high" }], total: 1, page: 1, pageSize: 20 }),
  getStats: jest.fn().mockResolvedValue({ totalUsers: 100, highRisk: 10 }),
  manualCalculate: jest.fn().mockResolvedValue({ calculated: 100 }),
  listRules: jest.fn().mockResolvedValue([{ id: "r1", name: "召回规则1" }]),
  createRule: jest.fn().mockResolvedValue({ id: "r1", name: "新规则" }),
  updateRule: jest.fn().mockResolvedValue({ id: "r1", name: "更新规则" }),
  deleteRule: jest.fn().mockResolvedValue({ success: true }),
  listActions: jest.fn().mockResolvedValue({ items: [{ id: "a1", status: "pending" }], total: 1, page: 1, pageSize: 20 }),
};

describe("ChurnController", () => {
  let ctrl: ChurnController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [ChurnController],
      providers: [
        { provide: ChurnService, useValue: mockChurnSvc },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(ChurnController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("should be defined", () => {
    expect(ctrl).toBeDefined();
  });

  it("GET /admin/churn/predictions — 流失预测列表", async () => {
    const result = await ctrl.listPredictions("1", "20", "high");
    expect(result).toBeDefined();
    expect(mockChurnSvc.getPredictions).toHaveBeenCalledWith(1, 20, "high");
  });

  it("GET /admin/churn/stats — 流失统计", async () => {
    const result = await ctrl.getStats();
    expect(result).toBeDefined();
    expect(mockChurnSvc.getStats).toHaveBeenCalled();
  });

  it("POST /admin/churn/calculate — 手动执行流失评分", async () => {
    const result = await ctrl.manualCalculate();
    expect(result).toBeDefined();
    expect(mockChurnSvc.manualCalculate).toHaveBeenCalled();
  });

  it("GET /admin/churn/rules — 召回规则列表", async () => {
    const result = await ctrl.listRules();
    expect(result).toBeDefined();
    expect(mockChurnSvc.listRules).toHaveBeenCalled();
  });

  it("POST /admin/churn/rules — 创建召回规则", async () => {
    const dto: any = { name: "新规则", conditions: {} };
    const result = await ctrl.createRule(dto);
    expect(result).toBeDefined();
    expect(mockChurnSvc.createRule).toHaveBeenCalledWith(dto);
  });

  it("PUT /admin/churn/rules/:id — 更新召回规则", async () => {
    const dto: any = { name: "更新规则" };
    const result = await ctrl.updateRule("r1", dto);
    expect(result).toBeDefined();
    expect(mockChurnSvc.updateRule).toHaveBeenCalledWith("r1", dto);
  });

  it("DELETE /admin/churn/rules/:id — 删除召回规则", async () => {
    const result = await ctrl.deleteRule("r1");
    expect(result).toBeDefined();
    expect(mockChurnSvc.deleteRule).toHaveBeenCalledWith("r1");
  });

  it("GET /admin/churn/actions — 召回动作记录", async () => {
    const result = await ctrl.listActions("1", "20", "pending");
    expect(result).toBeDefined();
    expect(mockChurnSvc.listActions).toHaveBeenCalledWith(1, 20, "pending");
  });
});
