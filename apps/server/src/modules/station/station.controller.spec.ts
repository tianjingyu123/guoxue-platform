import { Test } from "@nestjs/testing";
import { StationController } from "./station.controller";
import { StationService } from "./station.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";

const mockStationSvc = {
  getBrandByCode: jest.fn().mockResolvedValue({ name: "国学分站", logo: "https://..." }),
  getBrand: jest.fn().mockResolvedValue({ id: "s1", name: "国学分站" }),
  createStation: jest.fn().mockResolvedValue({ id: "s1", name: "新分站" }),
  listStations: jest.fn().mockResolvedValue([{ id: "s1", name: "国学分站" }]),
  getStation: jest.fn().mockResolvedValue({ id: "s1", name: "国学分站" }),
  updateStation: jest.fn().mockResolvedValue({ id: "s1", name: "更新名称" }),
  getStationEarnings: jest.fn().mockResolvedValue([{ amount: 100 }]),
  createOperator: jest.fn().mockResolvedValue({ id: "op1", name: "运营商A" }),
  listOperators: jest.fn().mockResolvedValue([{ id: "op1", name: "运营商A" }]),
  discoverStations: jest.fn().mockResolvedValue([{ id: "s1", name: "国学分站" }]),
  getRevenueDashboard: jest.fn().mockResolvedValue({ revenue: 10000, orders: 50 }),
  getMiniConfig: jest.fn().mockResolvedValue({ appId: "wx123", jumpList: [] }),
  resolveJumpTarget: jest.fn().mockResolvedValue({ appId: "wx456", path: "/pages/index" }),
  getOperatorPlan: jest.fn().mockResolvedValue({ level: "SILVER", price: 4999, quotaTotal: 6, serviceMonths: 12 }),
  getOperatorInvite: jest.fn().mockResolvedValue({ operatorId: "op1", operatorName: "华夏运营中心", availableQuota: 5 }),
};

describe("StationController", () => {
  let ctrl: StationController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [StationController],
      providers: [{ provide: StationService, useValue: mockStationSvc }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(StationController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("GET /station/brand/:code — 推广码获取品牌配置", async () => {
    const result: any = await ctrl.getBrandByCode("ABC123");
    expect(result.name).toBe("国学分站");
    expect(mockStationSvc.getBrandByCode).toHaveBeenCalledWith("ABC123");
  });

  it("GET /station/operator-plan — 公开返回服务端真实方案", async () => {
    const result: any = await ctrl.getOperatorPlan();
    expect(result.price).toBe(4999);
    expect(result.serviceMonths).toBe(12);
    expect(mockStationSvc.getOperatorPlan).toHaveBeenCalled();
  });

  it("GET /station/operator-invite/:id — 公开校验运营商邀请", async () => {
    const result: any = await ctrl.getOperatorInvite("op1");
    expect(result.operatorName).toBe("华夏运营中心");
    expect(mockStationSvc.getOperatorInvite).toHaveBeenCalledWith("op1");
  });

  it("GET /station/:id/brand — 分站品牌配置", async () => {
    const result: any = await ctrl.getBrand("s1");
    expect(result.id).toBe("s1");
    expect(mockStationSvc.getBrand).toHaveBeenCalledWith("s1");
  });

  it("POST /station — 创建分站", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { name: "新分站", code: "NEW" };
    const result: any = await ctrl.createStation(req, dto);
    expect(result.name).toBe("新分站");
    expect(mockStationSvc.createStation).toHaveBeenCalledWith("u1", dto);
  });

  it("GET /station — 分站列表", async () => {
    const result: any = await ctrl.listStations(1 as any, 20 as any);
    expect(result).toHaveLength(1);
    expect(mockStationSvc.listStations).toHaveBeenCalledWith(1, 20, undefined);
  });

  it("GET /station/:id — 分站详情", async () => {
    const result: any = await ctrl.getStation("s1");
    expect(result.name).toBe("国学分站");
    expect(mockStationSvc.getStation).toHaveBeenCalledWith("s1");
  });

  it("PUT /station/:id — 更新分站", async () => {
    const dto: any = { name: "更新名称" };
    const result: any = await ctrl.updateStation("s1", dto);
    expect(result.name).toBe("更新名称");
    expect(mockStationSvc.updateStation).toHaveBeenCalledWith("s1", dto);
  });

  it("GET /station/:id/earnings — 分站收益明细", async () => {
    const req: any = { user: { id: "u1", roles: ["SUPER_ADMIN"] } };
    const result: any = await ctrl.getEarnings(req, "s1", 1 as any, 20 as any);
    expect(result).toHaveLength(1);
    expect(mockStationSvc.getStationEarnings).toHaveBeenCalledWith("s1", 1, 20);
  });

  it("POST /station/operator — 创建运营商", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { name: "运营商A", phone: "13800138000" };
    const result: any = await ctrl.createOperator(req, dto);
    expect(result.name).toBe("运营商A");
    expect(mockStationSvc.createOperator).toHaveBeenCalledWith("u1", dto);
  });

  it("GET /station/operator/list — 运营商列表", async () => {
    const result: any = await ctrl.listOperators(1 as any, 20 as any);
    expect(result).toHaveLength(1);
    expect(mockStationSvc.listOperators).toHaveBeenCalledWith(1, 20);
  });

  it("GET /station/discover — 分站发现", async () => {
    const result: any = await ctrl.discoverStations("国学", 1 as any, 20 as any);
    expect(result).toHaveLength(1);
    expect(mockStationSvc.discoverStations).toHaveBeenCalled();
  });

  it("GET /station/:id/revenue-dashboard — 收益看板", async () => {
    const req: any = { user: { id: "u1", roles: ["SUPER_ADMIN"] } };
    const result: any = await ctrl.getRevenueDashboard(req, "s1");
    expect(result.revenue).toBe(10000);
    expect(mockStationSvc.getRevenueDashboard).toHaveBeenCalledWith("s1");
  });

  it("GET /station/:id/mini-config — 小程序配置", async () => {
    const result: any = await ctrl.getMiniConfig("s1");
    expect(result.appId).toBe("wx123");
    expect(mockStationSvc.getMiniConfig).toHaveBeenCalledWith("s1");
  });

  it("GET /station/:id/jump-to/:targetPath — 跨小程序跳转", async () => {
    const result: any = await ctrl.resolveJumpTarget("s1", "/pages/index");
    expect(result.appId).toBe("wx456");
    expect(mockStationSvc.resolveJumpTarget).toHaveBeenCalledWith("s1", "/pages/index");
  });
});
