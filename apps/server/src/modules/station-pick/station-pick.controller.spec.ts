import { Test } from "@nestjs/testing";
import { StationPickController } from "./station-pick.controller";
import { StationPickService } from "./station-pick.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { StationMasterGuard } from "../../common/station-master.guard";

const mockStationPickSvc = {
  getItems: jest.fn().mockResolvedValue([{ id: "p1", title: "精选1" }]),
  addPick: jest.fn().mockResolvedValue({ id: "p1", title: "新精选" }),
  removePick: jest.fn().mockResolvedValue({ success: true }),
  reorderPicks: jest.fn().mockResolvedValue({ success: true }),
  getQuota: jest.fn().mockResolvedValue({ used: 3, limit: 10 }),
  adminGetPicks: jest.fn().mockResolvedValue([{ id: "p1", title: "精选1" }]),
  adminRemovePick: jest.fn().mockResolvedValue({ success: true }),
  adminSetConfig: jest.fn().mockResolvedValue({ success: true }),
};

describe("StationPickController", () => {
  let ctrl: StationPickController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [StationPickController],
      providers: [
        { provide: StationPickService, useValue: mockStationPickSvc },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .overrideGuard(StationMasterGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(StationPickController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("should be defined", () => {
    expect(ctrl).toBeDefined();
  });

  it("GET /station-pick/:stationId/items — 获取分站精选内容列表", async () => {
    const result = await ctrl.getItems("s1");
    expect(result).toBeDefined();
    expect(mockStationPickSvc.getItems).toHaveBeenCalledWith("s1");
  });

  it("POST /station-pick/:stationId/items — 添加精选内容", async () => {
    const dto: any = { contentType: "article", contentId: "a1" };
    const result = await ctrl.addPick("s1", dto);
    expect(result).toBeDefined();
    expect(mockStationPickSvc.addPick).toHaveBeenCalledWith("s1", dto);
  });

  it("DELETE /station-pick/:stationId/items/:pickId — 移除精选内容", async () => {
    const result = await ctrl.removePick("s1", "p1");
    expect(result).toBeDefined();
    expect(mockStationPickSvc.removePick).toHaveBeenCalledWith("s1", "p1");
  });

  it("PUT /station-pick/:stationId/items/reorder — 批量调整排序", async () => {
    const dto: any = { items: ["p1", "p2"] };
    const result = await ctrl.reorderPicks("s1", dto);
    expect(result).toBeDefined();
    expect(mockStationPickSvc.reorderPicks).toHaveBeenCalledWith("s1", ["p1", "p2"]);
  });

  it("GET /station-pick/:stationId/quota — 查看配额使用情况", async () => {
    const result = await ctrl.getQuota("s1");
    expect(result).toBeDefined();
    expect(mockStationPickSvc.getQuota).toHaveBeenCalledWith("s1");
  });

  it("GET /station-pick/admin/:stationId — 管理员查看分站精选", async () => {
    const result = await ctrl.adminGetPicks("s1");
    expect(result).toBeDefined();
    expect(mockStationPickSvc.adminGetPicks).toHaveBeenCalledWith("s1");
  });

  it("DELETE /station-pick/admin/:stationId/items/:pickId — 管理员强制删除精选", async () => {
    const result = await ctrl.adminRemovePick("p1");
    expect(result).toBeDefined();
    expect(mockStationPickSvc.adminRemovePick).toHaveBeenCalledWith("p1");
  });

  it("PUT /station-pick/admin/:stationId/config — 管理员修改精选配置", async () => {
    const config: any = { maxPicks: 20 };
    const result = await ctrl.adminSetConfig("s1", config);
    expect(result).toBeDefined();
    expect(mockStationPickSvc.adminSetConfig).toHaveBeenCalledWith("s1", config);
  });
});
