import { Test } from "@nestjs/testing";
import { RecommendController } from "./recommend.controller";
import { RecommendScene } from "./recommend.dto";
import { RecommendService } from "./recommend.service";
import { ColdStartService } from "./services/cold-start.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { ThrottleGuard } from "../../common/throttle.guard";
import { FeatureFlagGuard } from "../../common/feature-flag.guard";

const mockRecommendSvc = {
  logInteractions: jest.fn().mockResolvedValue({ success: true }),
  trending: jest.fn().mockResolvedValue([{ id: "a1", score: 95 }]),
  related: jest.fn().mockResolvedValue([{ id: "a2", score: 80 }]),
  personalized: jest.fn().mockResolvedValue([{ id: "a3", score: 90 }]),
  insertContent: jest.fn().mockResolvedValue({ position: 0, contentId: "a1" }),
  removeInsertedContent: jest.fn().mockResolvedValue({ success: true }),
  getRecommendations: jest.fn().mockResolvedValue([{ id: "a1", title: "推荐内容" }]),
};

const mockColdStartSvc = {
  getDefaultInterestTags: jest.fn().mockResolvedValue(["八字", "风水", "易经"]),
  saveUserInterests: jest.fn().mockResolvedValue({ success: true }),
};

describe("RecommendController", () => {
  let ctrl: RecommendController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [RecommendController],
      providers: [
        { provide: RecommendService, useValue: mockRecommendSvc },
        { provide: ColdStartService, useValue: mockColdStartSvc },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .overrideGuard(ThrottleGuard).useValue({ canActivate: () => true })
      .overrideGuard(FeatureFlagGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(RecommendController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("POST /recommend/log — 上报推荐事件", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = {
      recommendId: "rec_12345678",
      interactions: [
        { itemId: "a1", itemType: "ARTICLE", position: 0, action: "CLICK" },
      ],
    };
    const result: any = await ctrl.log(req, dto);
    expect(result.success).toBe(true);
    expect(mockRecommendSvc.logInteractions).toHaveBeenCalledWith(dto, "u1");
  });

  it("GET /recommend/trending — 热门推荐", async () => {
    const result: any = await ctrl.trending();
    expect(result).toHaveLength(1);
  });

  it("GET /recommend/related/:contentId — 相关内容", async () => {
    const result: any = await ctrl.related("a1");
    expect(result).toHaveLength(1);
  });

  it("GET /recommend/personalized — 个性化推荐", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.personalized(req);
    expect(result).toHaveLength(1);
  });

  it("GET /recommend/interests/defaults — 默认兴趣标签", async () => {
    const result: any = await ctrl.getDefaultInterestTags();
    expect(result).toContain("八字");
  });

  it("POST /recommend/interests — 保存兴趣标签", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { tags: ["八字", "风水"] };
    const result: any = await ctrl.saveUserInterests(req, dto);
    expect(result.success).toBe(true);
  });

  it("PUT /recommend/insert — 设置分区强插", async () => {
    const dto: any = { position: 0, contentId: "a1", contentType: "ARTICLE" };
    const result: any = await ctrl.insertContent(dto);
    expect(result.contentId).toBe("a1");
  });

  it("DELETE /recommend/insert/:position — 移除强插", async () => {
    const result: any = await ctrl.removeInsertedContent("0");
    expect(result.success).toBe(true);
  });

  it("GET /recommend/:scene — 场景推荐", async () => {
    const q: any = { page: 1, pageSize: 10 };
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.recommend(RecommendScene.GUESS_LIKE, q, req);
    expect(result).toHaveLength(1);
  });
});
