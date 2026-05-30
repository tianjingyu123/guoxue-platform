import { Test } from "@nestjs/testing";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";
import { EntityDashboardService } from "./entity-dashboard.service";
import { RoleDashboardService } from "./role-dashboard.service";
import { RolesGuard } from "../../common/roles.guard";

const mockSvc: Record<string, jest.Mock> = {
  getStats: jest.fn().mockResolvedValue({ users: 1000, orders: 500, revenue: 50000 } as any),
  getTrends: jest.fn().mockResolvedValue({ daily: [], weekly: [] } as any),
  getCharts: jest.fn().mockResolvedValue({ pie: {}, bar: {} } as any),
  getRevenueOverview: jest.fn().mockResolvedValue({ total: 50000, growth: 0.15 } as any),
  getRealtimeStats: jest.fn().mockResolvedValue({ todayOrders: 10, todayUsers: 5, onlineUsers: 120 } as any),
  getBigScreen: jest.fn().mockResolvedValue({} as any),
  getContentHealth: jest.fn().mockResolvedValue({ lowQualityRate: 0.05 } as any),
  getFunnel: jest.fn().mockResolvedValue({ steps: [] } as any),
  getTodayOverview: jest.fn().mockResolvedValue({ pendingTasks: 3 } as any),
  getAlertList: jest.fn().mockResolvedValue({ items: [], total: 0 } as any),
  getSystemHealth: jest.fn().mockResolvedValue({ redis: "ok", db: "ok" } as any),
  generateDailyReport: jest.fn().mockResolvedValue({ date: "2026-05-10" } as any),
};

const mockEntitySvc: Record<string, jest.Mock> = {
  getCircleDashboard: jest.fn().mockResolvedValue({ members: 100 } as any),
  getCourseDashboard: jest.fn().mockResolvedValue({ students: 50 } as any),
  getLiveDashboard: jest.fn().mockResolvedValue({ viewers: 200 } as any),
  getStationDashboard: jest.fn().mockResolvedValue({ revenue: 3000 } as any),
  getOfflineDashboard: jest.fn().mockResolvedValue({ visitors: 80 } as any),
};

const mockRoleSvc: Record<string, jest.Mock> = {
  getRoleDashboard: jest.fn().mockResolvedValue({} as any),
};

describe("DashboardController", () => {
  let ctrl: DashboardController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        { provide: DashboardService, useValue: mockSvc },
        { provide: EntityDashboardService, useValue: mockEntitySvc },
        { provide: RoleDashboardService, useValue: mockRoleSvc },
      ],
    })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(DashboardController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("GET /dashboard/stats — 统计数据", async () => {
    const result: any = await ctrl.getStats();
    expect(result.users).toBe(1000);
  });

  it("GET /dashboard/trends — 趋势数据", async () => {
    const result: any = await ctrl.getTrends();
    expect(result.daily).toHaveLength(0);
  });

  it("GET /dashboard/charts — 图表数据", async () => {
    const result: any = await ctrl.getCharts();
    expect(result.pie).toBeDefined();
  });

  it("GET /dashboard/revenue — 营收概览", async () => {
    const result: any = await ctrl.getRevenueOverview();
    expect(result.growth).toBe(0.15);
  });

  it("GET /dashboard/realtime — 实时数据", async () => {
    const result: any = await ctrl.getRealtimeStats();
    expect(result.onlineUsers).toBe(120);
  });

  it("GET /dashboard/bigscreen — 大屏数据", async () => {
    const result: any = await ctrl.getBigScreen();
    expect(result).toBeDefined();
  });

  it("GET /dashboard/content-health — 内容健康度", async () => {
    const result: any = await ctrl.getContentHealth();
    expect(result.lowQualityRate).toBe(0.05);
  });

  it("GET /dashboard/funnel — 转化漏斗", async () => {
    const result: any = await ctrl.getFunnel();
    expect(result.steps).toHaveLength(0);
  });

  it("GET /dashboard/today-overview — 今日概览", async () => {
    const result: any = await ctrl.getTodayOverview();
    expect(result.pendingTasks).toBe(3);
  });

  it("GET /dashboard/alerts — 预警列表", async () => {
    const result: any = await ctrl.getAlertList();
    expect(result.items).toHaveLength(0);
  });

  it("GET /dashboard/system-health — 系统健康", async () => {
    const result: any = await ctrl.getSystemHealth();
    expect(result.redis).toBe("ok");
  });

  it("GET /dashboard/circles/:id — 圈子看板", async () => {
    const result: any = await ctrl.getCircleDashboard("c1");
    expect(result.members).toBe(100);
  });

  it("GET /dashboard/courses/:id — 课程看板", async () => {
    const result: any = await ctrl.getCourseDashboard("co1");
    expect(result.students).toBe(50);
  });

  it("GET /dashboard/live/:id — 直播看板", async () => {
    const result: any = await ctrl.getLiveDashboard("l1");
    expect(result.viewers).toBe(200);
  });

  it("GET /dashboard/station/:id — 分站看板", async () => {
    const result: any = await ctrl.getStationDashboard("s1");
    expect(result.revenue).toBe(3000);
  });

  it("GET /dashboard/offline/:id — 驿站看板", async () => {
    const result: any = await ctrl.getOfflineDashboard("off1");
    expect(result.visitors).toBe(80);
  });

  it("POST /dashboard/report/daily — 生成日报", async () => {
    const result: any = await ctrl.generateDailyReport("2026-05-10");
    expect(result.date).toBe("2026-05-10");
  });
});
