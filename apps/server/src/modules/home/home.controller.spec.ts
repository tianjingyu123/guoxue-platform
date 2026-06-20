import { Test } from "@nestjs/testing";
import { HomeController } from "./home.controller";
import { HomeService } from "./home.service";

describe("HomeController", () => {
  let ctrl: HomeController;
  let svc: jest.Mocked<HomeService>;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [HomeController],
      providers: [{ provide: HomeService, useValue: { getHome: jest.fn() } }],
    }).compile();
    ctrl = mod.get(HomeController);
    svc = mod.get(HomeService) as jest.Mocked<HomeService>;
  });

  beforeEach(() => jest.clearAllMocks());

  const mockHomeData = {
    banners: [{ id: "b1", image: "/img/b1.png", title: "国学经典" }],
    dailyVerse: { id: "dv1", content: "天行健", author: "周易", source: "乾卦" },
    recommendedCircles: [{ id: "c1", name: "书法爱好者", avatar: null }],
    feed: [{ id: "f1", title: "文章标题", type: "content" }],
    total: 1, page: 1, pageSize: 20,
  };

  it("默认分页参数", async () => {
    svc.getHome.mockResolvedValue(mockHomeData as any);
    const result = await ctrl.getHome();
    expect(svc.getHome).toHaveBeenCalledWith({ page: 1, pageSize: 20, userId: undefined });
    expect(result).toEqual(mockHomeData);
  });

  it("自定义分页", async () => {
    svc.getHome.mockResolvedValue({ ...mockHomeData, page: 3, pageSize: 10 } as any);
    const result = await ctrl.getHome(3, 10, undefined);
    expect(svc.getHome).toHaveBeenCalledWith({ page: 3, pageSize: 10, userId: undefined });
    expect(result.page).toBe(3);
  });

  it("已登录用户传入 userId", async () => {
    svc.getHome.mockResolvedValue(mockHomeData as any);
    await ctrl.getHome(1, 20, { user: { id: "u1" } } as any);
    expect(svc.getHome).toHaveBeenCalledWith({ page: 1, pageSize: 20, userId: "u1" });
  });

  it("getHome 中的 page/pageSize 字符串类型强转", async () => {
    svc.getHome.mockResolvedValue(mockHomeData as any);
    await ctrl.getHome("2" as any, "15" as any);
    expect(svc.getHome).toHaveBeenCalledWith({ page: 2, pageSize: 15, userId: undefined });
  });
});
