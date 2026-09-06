import { Test } from "@nestjs/testing";
import { BadRequestException, INestApplication, NotFoundException } from "@nestjs/common";
import request from "supertest";
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
  let app: INestApplication;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [MiniController],
      providers: [{ provide: MiniService, useValue: mockMiniSvc }],
    })
      .overrideGuard(ThrottleGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(MiniController);
    app = mod.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();
  });

  afterAll(async () => { await app.close(); });

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

  it("HTTP 分享配置禁止共享缓存，并保留业务定位参数", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/mini/share-config?targetType=ARTICLE&targetId=a1")
      .expect(200)
      .expect("Cache-Control", "private, no-store");
    expect(mockMiniSvc.getShareConfig).toHaveBeenCalledWith({ targetType: "ARTICLE", targetId: "a1" });
  });

  it("HTTP 不公开内容返回404，而不是分享默认卡片", async () => {
    mockMiniSvc.getShareConfig.mockRejectedValueOnce(new NotFoundException("内容不存在或暂不可分享"));
    const response = await request(app.getHttpServer())
      .get("/api/v1/mini/share-config?targetType=ARTICLE&targetId=hidden")
      .expect(404);
    expect(response.body).not.toHaveProperty("path");
  });

  it("HTTP 未配置的内容类型返回400，不伪装成成功分享", async () => {
    mockMiniSvc.getShareConfig.mockRejectedValueOnce(new BadRequestException("此内容类型暂未配置可分享页面"));
    await request(app.getHttpServer())
      .get("/api/v1/mini/share-config?targetType=CONTENT&targetId=c1")
      .expect(400);
  });

  it("HTTP 内容详情禁缓存，下架内容立即404", async () => {
    await request(app.getHttpServer()).get("/api/v1/mini/content/c1")
      .expect(200).expect("Cache-Control", "private, no-store");
    mockMiniSvc.getContentDetail.mockResolvedValueOnce(null);
    await request(app.getHttpServer()).get("/api/v1/mini/content/c1").expect(404);
  });
});
