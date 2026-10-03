import { OfflineStationService } from "./offline-station.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { OfflineSharedService } from "./offline-shared.service";
import { ResponseInterceptor } from "../../../common/response.interceptor";
import { of, firstValueFrom } from "rxjs";

describe("公开驿站目录的筛选与分页", () => {
  const findMany = jest.fn(), count = jest.fn();
  const service = new OfflineStationService({ stationOffline: { findMany, count } } as unknown as PrismaService, {} as OfflineSharedService);
  beforeEach(() => { jest.clearAllMocks(); findMany.mockResolvedValue([{ id: "s21" }]); count.mockResolvedValue(121); });

  it("第二页与总数使用同一启用/城市/类型/地区搜索条件，不把前100家当全量", async () => {
    const result = await service.discoverStations({ city: "保定市", type: "academy", keyword: " 莲池 ", page: 2, pageSize: 20 });
    const input = findMany.mock.calls[0][0];
    expect(input.where).toEqual({ status: "ACTIVE", city: "保定市", type: "academy", OR: [
      { name: { contains: "莲池" } }, { address: { contains: "莲池" } }, { city: { contains: "莲池" } },
    ] });
    expect(count).toHaveBeenCalledWith({ where: input.where });
    expect(input).toMatchObject({ skip: 20, take: 20, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
    expect(input.select._count.select).toEqual({ courses: { where: { auditStatus: "APPROVED", status: "PUBLISHED" } }, products: { where: { status: "ACTIVE" } } });
    expect(result).toEqual({ stations: [{ id: "s21" }], total: 121, page: 2, pageSize: 20 });
  });

  it("未知类型不降级成全部查询，也不访问数据库", async () => {
    await expect(service.discoverStations({ type: "unknown" })).rejects.toThrow("驿站类型无效");
    expect(findMany).not.toHaveBeenCalled(); expect(count).not.toHaveBeenCalled();
  });

  it("清空筛选仍只公开启用驿站，不带空OR", async () => {
    await service.discoverStations({ keyword: "  " });
    expect(findMany.mock.calls[0][0].where).toEqual({ status: "ACTIVE" });
  });

  it("当前响应拦截器保留stations和总数，前端目录对象契约不被拆成数组", async () => {
    const raw = await service.discoverStations({ page: 2 });
    const context = { switchToHttp: () => ({ getRequest: () => ({ path: "/offline/stations/discover" }) }) };
    const result = await firstValueFrom(new ResponseInterceptor().intercept(context as never, { handle: () => of(raw) }));
    expect(result).toEqual({ code: 200, data: raw, message: "ok" });
  });

  it("数据库故障仍暴露错误，不返回假空目录", async () => {
    count.mockRejectedValueOnce(new Error("合成目录故障"));
    await expect(service.discoverStations({})).rejects.toThrow("合成目录故障");
  });
});
