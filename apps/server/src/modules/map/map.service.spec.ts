import { Test, TestingModule } from "@nestjs/testing";
import { MapService } from "./map.service";

describe("MapService", () => {
  let svc: MapService;

  beforeEach(async () => {
    process.env.TENCENT_MAP_KEY = "test-map-key";
    const mod: TestingModule = await Test.createTestingModule({
      providers: [MapService],
    }).compile();
    svc = mod.get(MapService);
  });

  it("应被定义", () => expect(svc).toBeDefined());

  it("无API Key时不应抛出", () => {
    delete process.env.TENCENT_MAP_KEY;
    expect(() => Test.createTestingModule({
      providers: [MapService],
    }).compile()).not.toThrow();
  });

  describe("Haversine距离计算", () => {
    it("同一点距离为0", () => {
      const dist = MapService.haversineDistance(39.9, 116.4, 39.9, 116.4);
      expect(dist).toBe(0);
    });

    it("北京到上海约1000km", () => {
      const dist = MapService.haversineDistance(39.9, 116.4, 31.2, 121.5);
      expect(dist).toBeGreaterThan(1000 * 1000);
      expect(dist).toBeLessThan(1100 * 1000);
    });

    it("赤道相距1度为约111km", () => {
      const dist = MapService.haversineDistance(0, 0, 0, 1);
      expect(dist).toBeGreaterThan(110 * 1000);
      expect(dist).toBeLessThan(112 * 1000);
    });
  });
});
