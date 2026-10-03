import { Test } from "@nestjs/testing";
import { ArticleController } from "./article.controller";
import { ArticleService } from "./article.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { FeatureFlagGuard } from "../../common/feature-flag.guard";
import { StationIsolationGuard } from "../../common/station-isolation.guard";

const mockArticleSvc = {
  create: jest.fn().mockResolvedValue({ id: "a1", title: "国学入门" }),
  listArticles: jest.fn().mockResolvedValue([{ id: "a1", title: "国学入门" }]),
  getHomeFeed: jest.fn().mockResolvedValue([{ id: "a1", type: "article" }]),
  getRelated: jest.fn().mockResolvedValue([{ id: "a2", title: "相关文章" }]),
  getDetail: jest.fn().mockResolvedValue({ id: "a1", title: "国学入门", content: "..." }),
  update: jest.fn().mockResolvedValue({ id: "a1", title: "更新后的标题" }),
  delete: jest.fn().mockResolvedValue({ success: true }),
  auditArticle: jest.fn().mockResolvedValue({ id: "a1", auditStatus: "APPROVED" }),
  addRecommend: jest.fn().mockResolvedValue({ id: "rec1" }),
  removeRecommend: jest.fn().mockResolvedValue({ success: true }),
};

describe("ArticleController", () => {
  let ctrl: ArticleController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [ArticleController],
      providers: [{ provide: ArticleService, useValue: mockArticleSvc }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .overrideGuard(FeatureFlagGuard).useValue({ canActivate: () => true })
      .overrideGuard(StationIsolationGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(ArticleController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("POST /articles/circles/:circleId — 创建文章（非管理员 isAdmin=false）", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { title: "国学入门", content: "..." };
    const result: any = await ctrl.create("circle1", req, dto);
    expect(result.id).toBe("a1");
    expect(mockArticleSvc.create).toHaveBeenCalledWith("circle1", "u1", dto, false);
  });

  it("POST /articles/circles/:circleId — 管理员创建传 isAdmin=true（免审）", async () => {
    const req: any = { user: { id: "u1", roles: ["SUPER_ADMIN"] } };
    const dto: any = { title: "官方文章", content: "..." };
    await ctrl.create("circle1", req, dto);
    expect(mockArticleSvc.create).toHaveBeenCalledWith("circle1", "u1", dto, true);
  });

  it("GET /articles — 文章列表", async () => {
    const result: any = await ctrl.list(1 as any, 20 as any);
    expect(result).toHaveLength(1);
    expect(mockArticleSvc.listArticles).toHaveBeenCalled();
  });

  it("GET /articles — 支持 isPushHome 过滤", async () => {
    const result: any = await ctrl.list(1 as any, 20 as any, undefined, undefined, "true");
    expect(result).toHaveLength(1);
    const callArg = mockArticleSvc.listArticles.mock.calls[0][0];
    expect(callArg.isPushHome).toBe(true);
  });

  it("GET /articles/feed — 首页动态", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.getHomeFeed(1 as any, 20 as any, req);
    expect(result).toHaveLength(1);
    expect(mockArticleSvc.getHomeFeed).toHaveBeenCalled();
  });

  it("GET /articles/:id/related — 相关文章", async () => {
    const result: any = await ctrl.getRelated("a1");
    expect(result).toHaveLength(1);
    expect(mockArticleSvc.getRelated).toHaveBeenCalledWith("a1");
  });

  it("GET /articles/:id — 文章详情", async () => {
    const result: any = await ctrl.detail("a1");
    expect(result.title).toBe("国学入门");
    expect(mockArticleSvc.getDetail).toHaveBeenCalledWith("a1");
  });

  it("PUT /articles/:id — 更新文章", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { title: "更新后的标题" };
    const result: any = await ctrl.update("a1", req, dto);
    expect(result.title).toBe("更新后的标题");
    expect(mockArticleSvc.update).toHaveBeenCalledWith("a1", "u1", dto);
  });

  it("DELETE /articles/:id — 删除文章", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.delete("a1", req);
    expect(result.success).toBe(true);
    expect(mockArticleSvc.delete).toHaveBeenCalledWith("a1", "u1");
  });

  it("PUT /articles/:id/audit — 审核文章", async () => {
    const req: any = { user: { id: "admin1", roles: ["OPERATION_ADMIN"] } };
    const result: any = await ctrl.audit("a1", req, "APPROVED");
    expect(result.auditStatus).toBe("APPROVED");
    expect(mockArticleSvc.auditArticle).toHaveBeenCalledWith("a1", "APPROVED", { operatorId: "admin1", reason: undefined });
  });

  it("POST /articles/:id/recommends — 添加推荐", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { type: "course", targetId: "c1" };
    const result: any = await ctrl.addRecommend("a1", req, dto);
    expect(result.id).toBe("rec1");
    expect(mockArticleSvc.addRecommend).toHaveBeenCalledWith("a1", "u1", dto);
  });

  it("DELETE /articles/:id/recommends/:recId — 移除推荐", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.removeRecommend("rec1", req);
    expect(result.success).toBe(true);
    expect(mockArticleSvc.removeRecommend).toHaveBeenCalledWith("rec1", "u1");
  });
});
