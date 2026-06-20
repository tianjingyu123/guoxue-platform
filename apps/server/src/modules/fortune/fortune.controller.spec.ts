import { Test } from "@nestjs/testing";
import { FortuneController } from "./fortune.controller";
import { FortuneService } from "./fortune.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";

const mockFortuneSvc = {
  subscribe: jest.fn().mockResolvedValue({ id: "s1", type: "daily", channel: "wechat" }),
  listSubscriptions: jest.fn().mockResolvedValue([{ id: "s1", type: "daily" }]),
  unsubscribe: jest.fn().mockResolvedValue({ success: true }),
  getTodayFortune: jest.fn().mockResolvedValue({ type: "love", score: 85 }),
  getFortuneByPeriod: jest.fn().mockResolvedValue({ items: [] }),
  pushAll: jest.fn().mockResolvedValue({ pushed: 100 }),
  adminListRecords: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 }),
  getToolsGrid: jest.fn().mockResolvedValue({ tools: [], recent: [], courses: [], agents: [] }),
  getGuideCard: jest.fn().mockResolvedValue({ title: "今日宜忌", items: [] }),
};

describe("FortuneController", () => {
  let ctrl: FortuneController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [FortuneController],
      providers: [
        { provide: FortuneService, useValue: mockFortuneSvc },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .overrideGuard(StrictRedisThrottleGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(FortuneController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("should be defined", () => {
    expect(ctrl).toBeDefined();
  });

  it("POST /fortune/subscribe — 订阅运势推送", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { type: "daily", channel: "wechat" };
    const result = await ctrl.subscribe(req, dto);
    expect(result).toBeDefined();
    expect(mockFortuneSvc.subscribe).toHaveBeenCalledWith("u1", dto);
  });

  it("GET /fortune/subscriptions — 我的订阅列表", async () => {
    const req: any = { user: { id: "u1" } };
    const result = await ctrl.listSubscriptions(req);
    expect(result).toBeDefined();
    expect(mockFortuneSvc.listSubscriptions).toHaveBeenCalledWith("u1");
  });

  it("DELETE /fortune/subscribe/:type/:channel — 取消订阅", async () => {
    const req: any = { user: { id: "u1" } };
    const result = await ctrl.unsubscribe(req, "daily", "wechat");
    expect(result).toBeDefined();
    expect(mockFortuneSvc.unsubscribe).toHaveBeenCalledWith("u1", "daily", "wechat");
  });

  it("GET /fortune/today — 今日运势", async () => {
    const req: any = { user: { id: "u1" } };
    const result = await ctrl.getToday(req);
    expect(result).toBeDefined();
    expect(mockFortuneSvc.getTodayFortune).toHaveBeenCalledWith("u1");
  });

  it("GET /fortune/:type/:period — 按周期查询运势", async () => {
    const result = await ctrl.getByPeriod("love", "month");
    expect(result).toBeDefined();
    expect(mockFortuneSvc.getFortuneByPeriod).toHaveBeenCalledWith("system", "love", "month");
  });

  it("POST /fortune/admin/push-all — 推送全部运势", async () => {
    const result = await ctrl.pushAll("daily");
    expect(result).toBeDefined();
    expect(mockFortuneSvc.pushAll).toHaveBeenCalledWith("daily");
  });

  it("GET /fortune/admin/records — 运势记录列表", async () => {
    const result = await ctrl.listRecords("1", "20", "daily");
    expect(result).toBeDefined();
    expect(mockFortuneSvc.adminListRecords).toHaveBeenCalledWith(1, 20, "daily");
  });

  it("GET /fortune/tools — 排盘工具首页聚合", async () => {
    const result = await ctrl.getTools();
    expect(result).toBeDefined();
    expect(mockFortuneSvc.getToolsGrid).toHaveBeenCalledWith(undefined);
  });

  it("GET /fortune/guide-card — 排盘引导卡片数据", async () => {
    const req: any = { user: { id: "u1" } };
    const result = await ctrl.getGuideCard(req);
    expect(result).toBeDefined();
    expect(mockFortuneSvc.getGuideCard).toHaveBeenCalledWith("u1");
  });
});
