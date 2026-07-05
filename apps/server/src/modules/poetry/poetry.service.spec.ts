import { Test } from "@nestjs/testing";
import { NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { PoetryService } from "./poetry.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";

describe("PoetryService（阶段二增强）", () => {
  let service: PoetryService;
  let prisma: any;
  let gateway: any;

  beforeEach(async () => {
    prisma = {
      poetry: { findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn(), count: jest.fn() },
      like: { findUnique: jest.fn(), create: jest.fn(), delete: jest.fn(), findMany: jest.fn() },
      collect: { findUnique: jest.fn(), create: jest.fn(), delete: jest.fn() },
      comment: { findUnique: jest.fn(), create: jest.fn(), delete: jest.fn(), deleteMany: jest.fn(), findMany: jest.fn(), update: jest.fn() },
      // 事务按数组顺序解析（与真实 prisma 行为一致）
      $transaction: jest.fn((ops: any[]) => Promise.all(ops)),
    };
    gateway = { chat: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PoetryService,
        { provide: PrismaService, useValue: prisma },
        { provide: AiGatewayService, useValue: gateway },
      ],
    }).compile();
    service = moduleRef.get(PoetryService);
  });

  describe("search", () => {
    it("空关键词直接返回空，不查库", async () => {
      expect(await service.search("   ")).toEqual([]);
      expect(prisma.poetry.findMany).not.toHaveBeenCalled();
    });

    it("命中后映射为列表项（含预览句）", async () => {
      prisma.poetry.findMany.mockResolvedValue([
        { id: "1", title: "静夜思", author: "李白", dynasty: "唐", form: "五言绝句", content: "床前明月光，\n疑是地上霜。", likes: 100 },
      ]);
      const r = await service.search("月");
      expect(r[0]).toMatchObject({ id: "1", title: "静夜思", author: "李白", preview: "床前明月光" });
    });
  });

  describe("getPoet", () => {
    it("无作品抛 NotFound", async () => {
      prisma.poetry.findMany.mockResolvedValue([]);
      await expect(service.getPoet("查无此人")).rejects.toThrow(NotFoundException);
    });

    it("按作者聚合小传与作品、累计获赞", async () => {
      prisma.poetry.findMany.mockResolvedValue([
        { id: "1", title: "A", author: "李白", dynasty: "唐", form: "", content: "句一", likes: 10, authorYears: "701-762", authorTitle: "诗仙", authorIntro: "字太白" },
        { id: "2", title: "B", author: "李白", dynasty: "唐", form: "", content: "句二", likes: 5, authorYears: "701-762", authorTitle: "诗仙", authorIntro: "字太白" },
      ]);
      const r = await service.getPoet("李白");
      expect(r.poet).toMatchObject({ name: "李白", title: "诗仙", poemCount: 2, totalLikes: 15 });
      expect(r.poems).toHaveLength(2);
    });
  });

  describe("toggleLike", () => {
    it("诗词不存在抛 NotFound", async () => {
      prisma.poetry.findFirst.mockResolvedValue(null);
      await expect(service.toggleLike("u1", "p1")).rejects.toThrow(NotFoundException);
    });

    it("首次点赞：建 Like 记录并同步 likes+1", async () => {
      prisma.poetry.findFirst.mockResolvedValue({ id: "p1" });
      prisma.like.findUnique.mockResolvedValue(null);
      prisma.like.create.mockResolvedValue({ id: "l1" });
      prisma.poetry.update.mockResolvedValue({ likes: 11 });
      const r = await service.toggleLike("u1", "p1");
      expect(r).toEqual({ liked: true, likes: 11 });
      expect(prisma.like.create).toHaveBeenCalled();
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it("再次点赞：删记录并同步 likes-1", async () => {
      prisma.poetry.findFirst.mockResolvedValue({ id: "p1" });
      prisma.like.findUnique.mockResolvedValue({ id: "l1" });
      prisma.like.delete.mockResolvedValue({ id: "l1" });
      prisma.poetry.update.mockResolvedValue({ likes: 9 });
      const r = await service.toggleLike("u1", "p1");
      expect(r).toEqual({ liked: false, likes: 9 });
    });
  });

  describe("toggleCollect", () => {
    it("首次收藏：建 Collect 记录并同步 collectCount+1", async () => {
      prisma.poetry.findFirst.mockResolvedValue({ id: "p1" });
      prisma.collect.findUnique.mockResolvedValue(null);
      prisma.collect.create.mockResolvedValue({ id: "c1" });
      prisma.poetry.update.mockResolvedValue({ collectCount: 3 });
      const r = await service.toggleCollect("u1", "p1");
      expect(r).toEqual({ collected: true, collectCount: 3 });
    });
  });

  describe("createComment", () => {
    it("空内容抛 BadRequest", async () => {
      await expect(service.createComment("u1", "p1", "   ")).rejects.toThrow(BadRequestException);
    });

    it("正常创建：返回本人评论卡", async () => {
      prisma.poetry.findFirst.mockResolvedValue({ id: "p1" });
      prisma.comment.create.mockResolvedValue({
        id: "cm1", content: "好诗", createdAt: new Date(), user: { id: "u1", nickname: "诗友", avatar: "" },
      });
      const r = await service.createComment("u1", "p1", "好诗");
      expect(r).toMatchObject({ id: "cm1", content: "好诗", mine: true, likeCount: 0 });
    });
  });

  describe("deleteComment", () => {
    it("非本人删除抛 Forbidden", async () => {
      prisma.comment.findUnique.mockResolvedValue({ id: "cm1", userId: "other" });
      await expect(service.deleteComment("u1", "cm1")).rejects.toThrow(ForbiddenException);
    });
  });

  describe("appreciate", () => {
    it("调用 AI 网关返回赏析（poetry_appreciation 场景）", async () => {
      prisma.poetry.findFirst.mockResolvedValue({ id: "p1", title: "静夜思", dynasty: "唐", author: "李白", content: "床前明月光" });
      gateway.chat.mockResolvedValue({ content: "这是一首脍炙人口的思乡名作……" });
      const r = await service.appreciate("p1");
      expect(r.appreciation).toContain("这是一首");
      expect(gateway.chat).toHaveBeenCalledWith(expect.objectContaining({ scene: "poetry_appreciation" }));
    });
  });

  describe("分页入参加固（P2-4）", () => {
    it("adminListPoems 非法 page 不产生 NaN skip", async () => {
      prisma.poetry.findMany.mockResolvedValue([]);
      prisma.poetry.count.mockResolvedValue(0);
      await service.adminListPoems({ page: "abc" as any });
      const arg = prisma.poetry.findMany.mock.calls[0][0];
      expect(Number.isNaN(arg.skip)).toBe(false);
    });
  });
});
