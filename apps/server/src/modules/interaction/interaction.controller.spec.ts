import { Test } from "@nestjs/testing";
import { InteractionController } from "./interaction.controller";
import { InteractionService } from "./interaction.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { PrismaService } from "../../prisma/prisma.service";

const mockInteractionSvc = {
  toggleLike: jest.fn().mockResolvedValue({ liked: true }),
  removeLike: jest.fn().mockResolvedValue({ success: true }),
  isLiked: jest.fn().mockResolvedValue({ a1: true, a2: false }),
  getLikeCount: jest.fn().mockResolvedValue(42),
  createComment: jest.fn().mockResolvedValue({ id: "c1", content: "好文" }),
  listComments: jest.fn().mockResolvedValue([{ id: "c1", content: "好文" }]),
  deleteComment: jest.fn().mockResolvedValue({ success: true }),
  hideComment: jest.fn().mockResolvedValue({ hidden: true }),
  toggleCollect: jest.fn().mockResolvedValue({ collected: true }),
  getUserCollects: jest.fn().mockResolvedValue([{ id: "col1", targetType: "article" }]),
  toggleFollow: jest.fn().mockResolvedValue({ following: true }),
  getFollowers: jest.fn().mockResolvedValue([{ id: "u2", name: "粉丝A" }]),
  getFollowing: jest.fn().mockResolvedValue([{ id: "u3", name: "关注的人" }]),
  report: jest.fn().mockResolvedValue({ id: "rpt1", status: "PENDING" }),
  getMyReports: jest.fn().mockResolvedValue({ items: [{ id: "rpt1" }], total: 1 }),
  getMyReport: jest.fn().mockResolvedValue({ id: "rpt1", status: "PENDING" }),
  listReports: jest.fn().mockResolvedValue([{ id: "rpt1", reason: "违规内容" }]),
  processReport: jest.fn().mockResolvedValue({ id: "rpt1", status: "PROCESSED" }),
  dismissReport: jest.fn().mockResolvedValue({ id: "rpt1", status: "DISMISSED" }),
};

const mockPrisma = {
  report: { update: jest.fn().mockResolvedValue({ id: "rpt1", status: "DISMISSED" }) },
};

describe("InteractionController", () => {
  let ctrl: InteractionController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [InteractionController],
      providers: [
        { provide: InteractionService, useValue: mockInteractionSvc },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(InteractionController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("POST /interaction/like — 点赞/取消", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { targetType: "article", targetId: "a1" };
    const result: any = await ctrl.toggleLike(req, dto);
    expect(result.liked).toBe(true);
    expect(mockInteractionSvc.toggleLike).toHaveBeenCalledWith("u1", dto);
  });

  it("DELETE /interaction/like/:id — 确定性取消自己的点赞", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.removeLike(req, "l1");
    expect(result.success).toBe(true);
    expect(mockInteractionSvc.removeLike).toHaveBeenCalledWith("u1", "l1");
  });

  it("GET /interaction/like/check — 检查点赞", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.checkLiked(req, "article", "a1,a2");
    expect(result.a1).toBe(true);
    expect(mockInteractionSvc.isLiked).toHaveBeenCalledWith("u1", "article", ["a1", "a2"]);
  });

  it("GET /interaction/like/count — 点赞数量", async () => {
    const result: any = await ctrl.likeCount("article", "a1");
    expect(result).toBe(42);
    expect(mockInteractionSvc.getLikeCount).toHaveBeenCalledWith("article", "a1");
  });

  it("POST /interaction/comment — 创建评论", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { targetType: "article", targetId: "a1", content: "好文" };
    const result: any = await ctrl.createComment(req, dto);
    expect(result.id).toBe("c1");
    expect(mockInteractionSvc.createComment).toHaveBeenCalledWith("u1", dto);
  });

  it("GET /interaction/comment — 评论列表", async () => {
    const q: any = { targetType: "article", targetId: "a1" };
    const result: any = await ctrl.listComments(q);
    expect(result).toHaveLength(1);
    expect(mockInteractionSvc.listComments).toHaveBeenCalledWith(q);
  });

  it("DELETE /interaction/comment/:id — 删除评论", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.deleteComment("c1", req);
    expect(result.success).toBe(true);
    expect(mockInteractionSvc.deleteComment).toHaveBeenCalledWith("c1", "u1", false);
  });

  it("PUT /interaction/comment/:id/hide — 隐藏评论", async () => {
    const result: any = await ctrl.hideComment("c1");
    expect(result.hidden).toBe(true);
    expect(mockInteractionSvc.hideComment).toHaveBeenCalledWith("c1");
  });

  it("POST /interaction/collect — 收藏/取消", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { targetType: "article", targetId: "a1" };
    const result: any = await ctrl.toggleCollect(req, dto);
    expect(result.collected).toBe(true);
    expect(mockInteractionSvc.toggleCollect).toHaveBeenCalledWith("u1", dto);
  });

  it("GET /interaction/collect — 我的收藏", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.myCollects(req, 1 as any, 20 as any);
    expect(result).toHaveLength(1);
    expect(mockInteractionSvc.getUserCollects).toHaveBeenCalledWith("u1", 1, 20);
  });

  it("POST /interaction/follow — 关注/取消", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { toUserId: "u2" };
    const result: any = await ctrl.toggleFollow(req, dto);
    expect(result.following).toBe(true);
    expect(mockInteractionSvc.toggleFollow).toHaveBeenCalledWith("u1", dto);
  });

  it("GET /interaction/followers/:userId — 粉丝列表", async () => {
    const result: any = await ctrl.getFollowers("u1", 1 as any, 20 as any);
    expect(result).toHaveLength(1);
    expect(mockInteractionSvc.getFollowers).toHaveBeenCalledWith("u1", 1, 20);
  });

  it("GET /interaction/following/:userId — 关注列表", async () => {
    const result: any = await ctrl.getFollowing("u1", 1 as any, 20 as any);
    expect(result).toHaveLength(1);
    expect(mockInteractionSvc.getFollowing).toHaveBeenCalledWith("u1", 1, 20);
  });

  it("POST /interaction/report — 提交举报", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { targetType: "comment", targetId: "c1", reason: "违规" };
    const result: any = await ctrl.report(req, dto);
    expect(result.status).toBe("PENDING");
    expect(mockInteractionSvc.report).toHaveBeenCalledWith("u1", dto);
  });

  it("GET /interaction/report/mine — 我的举报列表", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.getMyReports(req, 1 as any, 20 as any);
    expect(result.total).toBe(1);
    expect(mockInteractionSvc.getMyReports).toHaveBeenCalledWith("u1", 1, 20);
  });

  it("GET /interaction/report/mine/:id — 我的举报详情", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.getMyReport(req, "rpt1");
    expect(result.id).toBe("rpt1");
    expect(mockInteractionSvc.getMyReport).toHaveBeenCalledWith("u1", "rpt1");
  });

  it("GET /interaction/report — 举报列表（管理员）", async () => {
    const q: any = { status: "PENDING", page: 1, pageSize: 20 };
    const result: any = await ctrl.listReports(q);
    expect(result).toHaveLength(1);
    expect(mockInteractionSvc.listReports).toHaveBeenCalledWith(q);
  });

  it("PUT /interaction/report/:id/process — 处理举报", async () => {
    const result: any = await ctrl.processReport("rpt1", "已删除违规内容");
    expect(result.status).toBe("PROCESSED");
    expect(mockInteractionSvc.processReport).toHaveBeenCalledWith("rpt1", "已删除违规内容");
  });

  it("PUT /interaction/report/:id/dismiss — 驳回举报", async () => {
    const result: any = await ctrl.dismissReport("rpt1");
    expect(result.status).toBe("DISMISSED");
    expect(mockInteractionSvc.dismissReport).toHaveBeenCalledWith("rpt1", undefined);
  });
});
