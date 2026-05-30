import { Test } from "@nestjs/testing";
import { CircleController } from "./circle.controller";
import { CircleService } from "./circle.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { StationIsolationGuard } from "../../common/station-isolation.guard";

const mockCircleSvc = {
  create: jest.fn().mockResolvedValue({ id: "c1", name: "国学研究圈" }),
  listCircles: jest.fn().mockResolvedValue([{ id: "c1", name: "国学研究圈" }]),
  getMyCircles: jest.fn().mockResolvedValue([{ id: "c1", role: "OWNER" }]),
  getDetail: jest.fn().mockResolvedValue({ id: "c1", name: "国学研究圈", memberCount: 100 }),
  update: jest.fn().mockResolvedValue({ id: "c1", name: "更新名称" }),
  getAnnouncement: jest.fn().mockResolvedValue({ content: "欢迎加入" }),
  setAnnouncement: jest.fn().mockResolvedValue({ content: "新公告" }),
  join: jest.fn().mockResolvedValue({ memberId: "m1", circleId: "c1" }),
  leave: jest.fn().mockResolvedValue({ success: true }),
  listMembers: jest.fn().mockResolvedValue([{ userId: "u1", role: "OWNER" }]),
  updateMemberRole: jest.fn().mockResolvedValue({ userId: "u2", role: "ADMIN" }),
  removeMember: jest.fn().mockResolvedValue({ success: true }),
  createPost: jest.fn().mockResolvedValue({ id: "p1", title: "新帖子" }),
  getPosts: jest.fn().mockResolvedValue([{ id: "p1", title: "帖子标题" }]),
  getPostDetail: jest.fn().mockResolvedValue({ id: "p1", title: "帖子详情", content: "..." }),
  updatePost: jest.fn().mockResolvedValue({ id: "p1", title: "更新帖子" }),
  deletePost: jest.fn().mockResolvedValue({ success: true }),
  getMyDrafts: jest.fn().mockResolvedValue([]),
  publishPost: jest.fn().mockResolvedValue({ id: "p1", status: "PUBLISHED" }),
  toggleEssence: jest.fn().mockResolvedValue({ id: "p1", isEssence: true }),
  toggleTop: jest.fn().mockResolvedValue({ id: "p1", isTop: true }),
  setExpertConfig: jest.fn().mockResolvedValue({ askPrice: 50, callPrice: 100 }),
  getExpertConfig: jest.fn().mockResolvedValue({ askPrice: 50, callPrice: 100 }),
  listCircleExperts: jest.fn().mockResolvedValue([{ userId: "u1", askPrice: 50 }]),
  getCircleRanking: jest.fn().mockResolvedValue([{ id: "c1", memberCount: 500 }]),
  getMemberLeaderboard: jest.fn().mockResolvedValue([{ userId: "u1", postCount: 30 }]),
  getHotContentRanking: jest.fn().mockResolvedValue([{ id: "p1", likes: 100 }]),
};

describe("CircleController", () => {
  let ctrl: CircleController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [CircleController],
      providers: [{ provide: CircleService, useValue: mockCircleSvc }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(StationIsolationGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(CircleController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("POST /circles — 创建圈子", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { name: "国学研究圈" };
    const result: any = await ctrl.create(req, dto);
    expect(result.name).toBe("国学研究圈");
  });

  it("GET /circles — 圈子列表", async () => {
    const result: any = await ctrl.list(1 as any, 20 as any);
    expect(result).toHaveLength(1);
  });

  it("GET /circles/my — 我的圈子", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.getMyCircles(req);
    expect(result).toHaveLength(1);
  });

  it("GET /circles/:id — 圈子详情", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.detail("c1", req);
    expect(result.memberCount).toBe(100);
  });

  it("PUT /circles/:id — 更新圈子", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { name: "更新名称" };
    const result: any = await ctrl.update("c1", req, dto);
    expect(result.name).toBe("更新名称");
  });

  it("GET /circles/:id/announcement — 公告", async () => {
    const result: any = await ctrl.getAnnouncement("c1");
    expect(result.content).toBe("欢迎加入");
  });

  it("PUT /circles/:id/announcement — 设置公告", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.setAnnouncement("c1", req, "新公告");
    expect(result.content).toBe("新公告");
  });

  it("POST /circles/:id/join — 加入圈子", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.join("c1", req);
    expect(result.circleId).toBe("c1");
  });

  it("POST /circles/:id/leave — 退出圈子", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.leave("c1", req);
    expect(result.success).toBe(true);
  });

  it("GET /circles/:id/members — 成员列表", async () => {
    const result: any = await ctrl.members("c1", 1 as any, 20 as any);
    expect(result).toHaveLength(1);
  });

  it("PUT /circles/:id/members/:userId/role — 更新角色", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { role: "ADMIN" };
    const result: any = await ctrl.updateMemberRole("c1", "u2", req, dto);
    expect(result.role).toBe("ADMIN");
  });

  it("DELETE /circles/:id/members/:userId — 移除成员", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.removeMember("c1", "u2", req);
    expect(result.success).toBe(true);
  });

  it("POST /circles/:id/posts — 发帖", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { title: "新帖子", content: "..." };
    const result: any = await ctrl.createPost("c1", req, dto);
    expect(result.title).toBe("新帖子");
  });

  it("GET /circles/:id/posts — 帖子列表", async () => {
    const result: any = await ctrl.getPosts("c1", undefined, undefined, 1 as any, 20 as any);
    expect(result).toHaveLength(1);
  });

  it("GET /circles/:id/posts/:postId — 帖子详情", async () => {
    const result: any = await ctrl.getPostDetail("p1");
    expect(result.title).toBe("帖子详情");
  });

  it("PUT /circles/:id/posts/:postId — 更新帖子", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { title: "更新帖子" };
    const result: any = await ctrl.updatePost("p1", req, dto);
    expect(result.title).toBe("更新帖子");
  });

  it("DELETE /circles/:id/posts/:postId — 删除帖子", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.deletePost("c1", "p1", req);
    expect(result.success).toBe(true);
  });

  it("GET /circles/drafts — 我的草稿", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.getMyDrafts(req, 1 as any, 20 as any);
    expect(result).toEqual([]);
  });

  it("POST /circles/:id/posts/:postId/publish — 发布草稿", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.publishPost("c1", "p1", req);
    expect(result.status).toBe("PUBLISHED");
  });

  it("POST /circles/:id/posts/:postId/essence — 切换精华", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.toggleEssence("c1", "p1", req);
    expect(result.isEssence).toBe(true);
  });

  it("POST /circles/:id/posts/:postId/top — 切换置顶", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.toggleTop("c1", "p1", req);
    expect(result.isTop).toBe(true);
  });

  it("POST /circles/:id/expert/config — 达人配置", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { askPrice: 50, callPrice: 100 };
    const result: any = await ctrl.setExpertConfig("c1", req, dto);
    expect(result.askPrice).toBe(50);
  });

  it("GET /circles/:id/expert/:userId — 达人咨询配置", async () => {
    const result: any = await ctrl.getExpertConfig("c1", "u1");
    expect(result.askPrice).toBe(50);
  });

  it("GET /circles/:id/experts — 圈子达人", async () => {
    const result: any = await ctrl.listExperts("c1");
    expect(result).toHaveLength(1);
  });

  it("GET /circles/ranking — 圈子排行", async () => {
    const result: any = await ctrl.getCircleRanking(1 as any, 20 as any, "memberCount");
    expect(result).toHaveLength(1);
  });

  it("GET /circles/:id/leaderboard — 成员贡献榜", async () => {
    const result: any = await ctrl.getMemberLeaderboard("c1", 1 as any, 20 as any, "week");
    expect(result).toHaveLength(1);
  });

  it("GET /circles/:id/hot-content — 内容热度榜", async () => {
    const result: any = await ctrl.getHotContentRanking("c1", 10 as any);
    expect(result).toHaveLength(1);
  });
});
