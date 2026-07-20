import { Test } from "@nestjs/testing";
import { AbTestController } from "./ab-test.controller";
import { AbTestService } from "./services/ab-test.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";

const mockAbTestSvc = {
  list: jest.fn().mockResolvedValue([{ id: "t1", name: "首页推荐算法A/B", status: "RUNNING" }] as any),
  get: jest.fn().mockResolvedValue({ id: "t1", name: "首页推荐算法A/B", status: "RUNNING" } as any),
  create: jest.fn().mockResolvedValue({ id: "t2", name: "新实验", status: "DRAFT" } as any),
  update: jest.fn().mockResolvedValue({ id: "t1", name: "更新后的实验" } as any),
  remove: jest.fn().mockResolvedValue(true),
  start: jest.fn().mockResolvedValue({ id: "t1", status: "RUNNING" } as any),
  pause: jest.fn().mockResolvedValue({ id: "t1", status: "PAUSED" } as any),
  complete: jest.fn().mockResolvedValue({ id: "t1", status: "COMPLETED" } as any),
  getLatestReport: jest.fn().mockResolvedValue({ totalExperiments: 1, experiments: [] }),
  generateReport: jest.fn().mockResolvedValue({ totalExperiments: 2, runningCount: 1, completedCount: 1, experiments: [], generatedAt: "2025-01-01" }),
  getMetrics: jest.fn().mockResolvedValue({ experimentId: "t1", control: { impressions: 1000, clicks: 50, ctr: 0.05 }, experiment: { impressions: 1000, clicks: 80, ctr: 0.08 }, lift: 0.6, significant: true } as any),
};

describe("AbTestController", () => {
  let ctrl: AbTestController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [AbTestController],
      providers: [{ provide: AbTestService, useValue: mockAbTestSvc }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(AbTestController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("GET /recommend/ab-tests — 获取所有实验列表", async () => {
    const result: any = await ctrl.list();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("首页推荐算法A/B");
  });

  it("GET /recommend/ab-tests/:id — 获取实验详情", async () => {
    const result: any = await ctrl.get("t1");
    expect(result.id).toBe("t1");
  });

  it("POST /recommend/ab-tests — 创建新实验", async () => {
    const result: any = await ctrl.create({ name: "新实验" } as any);
    expect(result.status).toBe("DRAFT");
  });

  it("PUT /recommend/ab-tests/:id — 更新实验配置", async () => {
    const result: any = await ctrl.update("t1", { name: "更新后的实验" } as any);
    expect(result.name).toBe("更新后的实验");
  });

  it("DELETE /recommend/ab-tests/:id — 删除实验", async () => {
    const result: any = await ctrl.remove("t1");
    expect(result).toBe(true);
  });

  it("POST /recommend/ab-tests/:id/start — 启动实验", async () => {
    const result: any = await ctrl.start("t1");
    expect(result.status).toBe("RUNNING");
  });

  it("POST /recommend/ab-tests/:id/pause — 暂停实验", async () => {
    const result: any = await ctrl.pause("t1");
    expect(result.status).toBe("PAUSED");
  });

  it("POST /recommend/ab-tests/:id/complete — 完成实验", async () => {
    const result: any = await ctrl.complete("t1");
    expect(result.status).toBe("COMPLETED");
  });

  it("GET /recommend/ab-tests/reports/latest — 获取最新实验汇总报告", async () => {
    const result = await ctrl.getReport();
    expect(result?.totalExperiments).toBe(1);
  });

  it("POST /recommend/ab-tests/reports/generate — 手动生成实验汇总报告", async () => {
    const result = await ctrl.generateReport();
    expect(result.totalExperiments).toBe(2);
  });

  it("GET /recommend/ab-tests/:id/metrics — 获取实验效果指标", async () => {
    const result: any = await ctrl.metrics("t1");
    expect(result.lift).toBe(0.6);
  });
});
