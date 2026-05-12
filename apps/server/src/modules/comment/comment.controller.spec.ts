import { Test } from "@nestjs/testing";
import { CommentController } from "./comment.controller";
import { CommentService } from "./comment.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";

const mockCommentSvc = {
  create: jest.fn().mockResolvedValue({ id: "c1", content: "好文章" }),
  findByTarget: jest.fn().mockResolvedValue([{ id: "c1", content: "好文章" }]),
  findReplies: jest.fn().mockResolvedValue([{ id: "r1", content: "回复" }]),
  like: jest.fn().mockResolvedValue({ liked: true }),
  delete: jest.fn().mockResolvedValue({ success: true }),
  hide: jest.fn().mockResolvedValue({ hidden: true }),
  getCommentCount: jest.fn().mockResolvedValue(5),
  getModerationList: jest.fn().mockResolvedValue([{ id: "c1", status: "PENDING" }]),
  batchHide: jest.fn().mockResolvedValue({ count: 3 }),
  getUserComments: jest.fn().mockResolvedValue([{ id: "c1", content: "我的评论" }]),
};

describe("CommentController", () => {
  let ctrl: CommentController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [CommentController],
      providers: [{ provide: CommentService, useValue: mockCommentSvc }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(CommentController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("POST /comment — 创建评论", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { targetType: "article", targetId: "a1", content: "好文章" };
    const result: any = await ctrl.create(req, dto);
    expect(result.id).toBe("c1");
    expect(mockCommentSvc.create).toHaveBeenCalledWith("u1", dto);
  });

  it("GET /comment — 获取评论列表", async () => {
    const dto: any = { targetType: "article", targetId: "a1" };
    const result: any = await ctrl.findAll(dto);
    expect(result).toHaveLength(1);
    expect(mockCommentSvc.findByTarget).toHaveBeenCalledWith(dto);
  });

  it("GET /comment/:id/replies — 获取回复", async () => {
    const result: any = await ctrl.findReplies("c1");
    expect(result).toHaveLength(1);
    expect(mockCommentSvc.findReplies).toHaveBeenCalledWith("c1");
  });

  it("POST /comment/:id/like — 点赞评论", async () => {
    const result: any = await ctrl.like("c1");
    expect(result.liked).toBe(true);
    expect(mockCommentSvc.like).toHaveBeenCalledWith("c1");
  });

  it("DELETE /comment/:id — 删除评论", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.delete(req, "c1");
    expect(result.success).toBe(true);
    expect(mockCommentSvc.delete).toHaveBeenCalledWith("u1", "c1");
  });

  it("PUT /comment/:id/hide — 隐藏评论", async () => {
    const result: any = await ctrl.hide("c1");
    expect(result.hidden).toBe(true);
    expect(mockCommentSvc.hide).toHaveBeenCalledWith("c1");
  });

  it("GET /comment/count — 评论数量", async () => {
    const result: any = await ctrl.count("article", "a1");
    expect(result).toBe(5);
    expect(mockCommentSvc.getCommentCount).toHaveBeenCalledWith("article", "a1");
  });

  it("GET /comment/moderation/list — 审核列表", async () => {
    const result: any = await ctrl.moderationList("PENDING", undefined, 1 as any, 20 as any);
    expect(result).toHaveLength(1);
    expect(mockCommentSvc.getModerationList).toHaveBeenCalled();
  });

  it("PUT /comment/moderation/batch-hide — 批量隐藏", async () => {
    const result: any = await ctrl.batchHide({ ids: ["c1", "c2", "c3"] });
    expect(result.count).toBe(3);
    expect(mockCommentSvc.batchHide).toHaveBeenCalledWith(["c1", "c2", "c3"]);
  });

  it("GET /comment/user/history — 我的评论历史", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.getUserComments(req, 1 as any, 20 as any);
    expect(result).toHaveLength(1);
    expect(mockCommentSvc.getUserComments).toHaveBeenCalledWith("u1", 1, 20);
  });
});
