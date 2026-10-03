import { OfflineStationService } from "./offline-station.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { OfflineSharedService } from "./offline-shared.service";

describe("公开驿站城市目录", () => {
  const groupBy = jest.fn();
  const service = new OfflineStationService(
    { stationOffline: { groupBy } } as unknown as PrismaService,
    {} as OfflineSharedService,
  );
  beforeEach(() => groupBy.mockReset());

  it("目录基于全部ACTIVE驿站分组，不受第一页或当前城市过滤影响", async () => {
    groupBy.mockResolvedValue([{ city: "保定市" }, { city: "北京市" }]);
    expect(await service.discoverStationCities()).toEqual({ cities: ["保定市", "北京市"] });
    expect(groupBy).toHaveBeenCalledWith({
      by: ["city"], where: { status: "ACTIVE", city: { not: "" } }, orderBy: { city: "asc" },
    });
  });
  it("不返回不能与实际同城精确匹配的脏城市及非法值", async () => {
    groupBy.mockResolvedValue([{ city: " 北京市 " }, { city: "" }, { city: "<script>" }, { city: "甲".repeat(65) }, { city: "保定市" }]);
    expect(await service.discoverStationCities()).toEqual({ cities: ["保定市"] });
  });
  it("无已开通城市为真实空目录", async () => {
    groupBy.mockResolvedValue([]);
    expect(await service.discoverStationCities()).toEqual({ cities: [] });
  });
  it("数据库故障继续抛出，不能返回假空目录", async () => {
    groupBy.mockRejectedValue(new Error("合成查询失败"));
    await expect(service.discoverStationCities()).rejects.toThrow("合成查询失败");
  });
});
