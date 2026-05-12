import { Test } from "@nestjs/testing";
import { MiniController } from "./mini.controller";
import { MiniService } from "./mini.service";
import { ThrottleGuard } from "../../common/throttle.guard";

const mockMiniSvc = {
  getHome: jest.fn().mockResolvedValue({ banners: [], hotContents: [], circles: [] }),
  getContents: jest.fn().mockResolvedValue([{ id: "c1", title: "内容标题" }]),
  getContentDetail: jest.fn().mockResolvedValue({ id: "c1", title: "内容详情", body: "..." }),
  getShareConfig: jest.fn().mockResolvedValue({ title: "分享标题", imageUrl: "https://..." }),
};

describe("MiniController", () => {
  let ctrl: MiniController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [MiniController],
      providers: [{ provide: MiniService, useValue: mockMiniSvc }],
    })
      .overrideGuard(ThrottleGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(MiniController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("GET /mini/home — 首页聚合", async () => {
    const q: any = { stationId: "s1" };
    const result: any = await ctrl.getHome(q);
    expect(result).toHaveProperty("banners");
    expect(mockMiniSvc.getHome).toHaveBeenCalledWith(q);
  });

  it("GET /mini/contents — 内容流", async () => {
    const q: any = { type: "article", page: 1, pageSize: 10 };
    const result: any = await ctrl.getContents(q);
    expect(result).toHaveLength(1);
    expect(mockMiniSvc.getContents).toHaveBeenCalledWith(q);
  });

  it("GET /mini/content/:id — 内容详情（存在）", async () => {
    const result: any = await ctrl.getContentDetail("c1");
    expect(result.title).toBe("内容详情");
    expect(mockMiniSvc.getContentDetail).toHaveBeenCalledWith("c1");
  });

  it("GET /mini/content/:id — 内容不存在时抛异常", async () => {
    mockMiniSvc.getContentDetail.mockResolvedValueOnce(null);
    await expect(ctrl.getContentDetail("c99")).rejects.toThrow();
  });

  it("GET /mini/share-config — 分享配置", async () => {
    const q: any = { type: "article", id: "a1" };
    const result: any = await ctrl.getShareConfig(q);
    expect(result.title).toBe("分享标题");
    expect(mockMiniSvc.getShareConfig).toHaveBeenCalledWith(q);
  });
});
