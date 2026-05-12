import { Test } from "@nestjs/testing";
import { MapController } from "./map.controller";
import { MapService } from "./map.service";
import { ThrottleGuard } from "../../common/throttle.guard";

const mockMapSvc = {
  geocode: jest.fn().mockResolvedValue({ lat: 39.9, lng: 116.4 }),
  reverseGeocode: jest.fn().mockResolvedValue({ address: "北京市东城区" }),
  placeSearch: jest.fn().mockResolvedValue([{ name: "故宫", address: "..." }]),
  distanceMatrix: jest.fn().mockResolvedValue({ distance: 5000 }),
  drivingRoute: jest.fn().mockResolvedValue({ distance: 8000, duration: 1200 }),
  districtList: jest.fn().mockResolvedValue([{ name: "北京市", id: "110000" }]),
  ipLocation: jest.fn().mockResolvedValue({ city: "北京", lat: 39.9, lng: 116.4 }),
};

describe("MapController", () => {
  let ctrl: MapController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [MapController],
      providers: [{ provide: MapService, useValue: mockMapSvc }],
    })
      .overrideGuard(ThrottleGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(MapController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("GET /map/geocode — 地址解析", async () => {
    const result: any = await ctrl.geocode("北京市东城区", "北京");
    expect(result.lat).toBe(39.9);
    expect(mockMapSvc.geocode).toHaveBeenCalledWith("北京市东城区", "北京");
  });

  it("GET /map/reverse — 逆地址解析", async () => {
    const result: any = await ctrl.reverseGeocode(39.9 as any, 116.4 as any);
    expect(result.address).toBe("北京市东城区");
    expect(mockMapSvc.reverseGeocode).toHaveBeenCalledWith(39.9, 116.4);
  });

  it("GET /map/search — 地点搜索", async () => {
    const result: any = await ctrl.placeSearch("故宫", "北京", 1 as any);
    expect(result).toHaveLength(1);
    expect(mockMapSvc.placeSearch).toHaveBeenCalled();
  });

  it("GET /map/distance — 距离计算", async () => {
    const result: any = await ctrl.distanceMatrix(39.9 as any, 116.4 as any, 40.0 as any, 116.5 as any);
    expect(result.distance).toBe(5000);
    expect(mockMapSvc.distanceMatrix).toHaveBeenCalled();
  });

  it("GET /map/route — 驾车路线", async () => {
    const result: any = await ctrl.drivingRoute(39.9 as any, 116.4 as any, 40.0 as any, 116.5 as any);
    expect(result.distance).toBe(8000);
    expect(mockMapSvc.drivingRoute).toHaveBeenCalled();
  });

  it("GET /map/districts — 行政区划", async () => {
    const result: any = await ctrl.districts("110000");
    expect(result).toHaveLength(1);
    expect(mockMapSvc.districtList).toHaveBeenCalledWith("110000");
  });

  it("GET /map/ip — IP定位", async () => {
    const result: any = await ctrl.ipLocation("8.8.8.8");
    expect(result.city).toBe("北京");
    expect(mockMapSvc.ipLocation).toHaveBeenCalledWith("8.8.8.8");
  });
});
