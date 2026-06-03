import { Test } from "@nestjs/testing";
import { CanActivate } from "@nestjs/common";
import { LiveDashboardController } from "./live-dashboard.controller";
import { LiveDashboardService } from "./live-dashboard.service";
import { LiveReportService } from "./live-report.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

const mockDashboardSvc: Record<string, jest.Mock> = {
  getOverview: jest.fn(),
  getTrends: jest.fn(),
  getProducts: jest.fn(),
  getInteractions: jest.fn(),
  getHostStats: jest.fn(),
  getAudience: jest.fn(),
};

const mockReportSvc: Record<string, jest.Mock> = {
  getReport: jest.fn(),
  getCompare: jest.fn(),
};

const mockGuard: CanActivate = { canActivate: () => true };

const makeRes = (): any => ({
  setHeader: jest.fn(),
  send: jest.fn(),
  json: jest.fn(),
});

describe("LiveDashboardController", () => {
  let ctrl: LiveDashboardController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [LiveDashboardController],
      providers: [
        { provide: LiveDashboardService, useValue: mockDashboardSvc },
        { provide: LiveReportService, useValue: mockReportSvc },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue(mockGuard)
      .compile();
    ctrl = mod.get(LiveDashboardController);
  });

  beforeEach(() => jest.clearAllMocks());

  it("应被定义", () => expect(ctrl).toBeDefined());

  it("直播实时概览", async () => {
    mockDashboardSvc.getOverview.mockResolvedValue({ online: 150, peak: 300, gmv: 5000 });
    const result: any = await ctrl.getOverview("room1");
    expect(result.online).toBe(150);
  });

  it("实时趋势", async () => {
    mockDashboardSvc.getTrends.mockResolvedValue({ online: [100, 120], orders: [5, 8] });
    const result: any = await ctrl.getTrends("room1");
    expect(result.online).toHaveLength(2);
  });

  it("商品讲解与转化", async () => {
    mockDashboardSvc.getProducts.mockResolvedValue([{ productId: "p1", sales: 50 }]);
    const result: any = await ctrl.getProducts("room1");
    expect(result).toHaveLength(1);
  });

  it("互动与打赏", async () => {
    mockDashboardSvc.getInteractions.mockResolvedValue({ comments: [], donations: [] });
    const result: any = await ctrl.getInteractions("room1");
    expect(result.comments).toHaveLength(0);
  });

  it("主播表现", async () => {
    mockDashboardSvc.getHostStats.mockResolvedValue({ duration: 3600, products: 10 });
    const result: any = await ctrl.getHostStats("room1");
    expect(result.duration).toBe(3600);
  });

  it("观众画像", async () => {
    mockDashboardSvc.getAudience.mockResolvedValue({ gender: { male: 60, female: 40 } });
    const result: any = await ctrl.getAudience("room1");
    expect(result.gender.male).toBe(60);
  });

  it("直播复盘报告", async () => {
    mockReportSvc.getReport.mockResolvedValue({ summary: { gmv: 5000 } });
    const result: any = await ctrl.getReport("room1");
    expect(result.summary.gmv).toBe(5000);
  });

  it("直播对比", async () => {
    mockReportSvc.getCompare.mockResolvedValue({ current: { gmv: 5000 }, previous: { gmv: 3000 } });
    const result: any = await ctrl.getCompare("room1");
    expect(result.current.gmv).toBe(5000);
    expect(result.previous.gmv).toBe(3000);
  });

  it("导出直播报告JSON", async () => {
    const res = makeRes();
    mockReportSvc.getReport.mockResolvedValue({ summary: { gmv: 5000 } });
    await ctrl.exportReport("room1", "json", res);
    expect(res.json).toHaveBeenCalledWith({ summary: { gmv: 5000 } });
  });

  it("导出直播报告CSV", async () => {
    const res = makeRes();
    mockReportSvc.getReport.mockResolvedValue({ summary: { gmv: "5000", viewers: "1000" } });
    await ctrl.exportReport("room1", "csv", res);
    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/csv; charset=utf-8");
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining("gmv,5000"));
  });
});
