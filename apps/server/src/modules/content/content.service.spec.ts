import { Test } from "@nestjs/testing";
import { ContentService } from "./content.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { WebhookService } from "../webhook/webhook.service";
import { BusinessException } from "../../common/business.exception";
import { ContentType } from "./content.dto";

const mockPrisma = {
  content: { create: jest.fn(), findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn(), delete: jest.fn() },
};
const mockRedis = {
  getJson: jest.fn(),
  setJson: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
  delByPattern: jest.fn().mockResolvedValue(undefined),
};
const mockWebhook = { fire: jest.fn().mockResolvedValue(undefined) };

describe("ContentService", () => {
  let svc: ContentService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        ContentService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: WebhookService, useValue: mockWebhook },
      ],
    }).compile();
    svc = mod.get(ContentService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedis.getJson.mockResolvedValue(null); // 默认缓存未命中
  });

  describe("create", () => {
    it("创建内容成功", async () => {
      const dto = { title: "论语", type: ContentType.CLASSIC, body: "学而时习之", tags: ["儒家"] };
      mockPrisma.content.create.mockResolvedValue({ id: "c1", ...dto });
      const result = await svc.create(dto as any);
      expect(result.id).toBe("c1");
      expect(mockPrisma.content.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ title: "论语" }),
      }));
    });
  });

  describe("list", () => {
    it("无条件分页查询", async () => {
      mockPrisma.content.findMany.mockResolvedValue([{ id: "c1", title: "内容" }]);
      mockPrisma.content.count.mockResolvedValue(1);
      const result = await svc.list({});
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockPrisma.content.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ status: "PUBLISHED", stationId: null, deletedAt: null }),
      }));
      expect(mockRedis.getJson).not.toHaveBeenCalled();
    });
    it("按 type 过滤", async () => {
      mockPrisma.content.findMany.mockResolvedValue([]);
      mockPrisma.content.count.mockResolvedValue(0);
      const result = await svc.list({ type: ContentType.POEM });
      expect(result.total).toBe(0);
    });
    it("按 keyword 搜索标题和作者", async () => {
      mockPrisma.content.findMany.mockResolvedValue([]);
      mockPrisma.content.count.mockResolvedValue(0);
      const result = await svc.list({ keyword: "论语" });
      expect(result.total).toBe(0);
    });
    it("page='abc' 时 skip 不为 NaN（归一化回归）", async () => {
      mockPrisma.content.findMany.mockResolvedValue([]);
      mockPrisma.content.count.mockResolvedValue(0);
      await svc.list({ page: "abc" as any, pageSize: 20 });
      const findManyArg = mockPrisma.content.findMany.mock.calls[0][0];
      expect(Number.isNaN(findManyArg.skip)).toBe(false);
    });
  });

  describe("detail", () => {
    it("返回内容详情（并发放大浏览数）", async () => {
      mockPrisma.content.findFirst.mockResolvedValue({ id: "c1", title: "论语", viewCount: 10 });
      mockPrisma.content.update.mockResolvedValue({});
      const result = await svc.detail("c1");
      expect(result.title).toBe("论语");
      expect(mockPrisma.content.findFirst).toHaveBeenCalledWith({ where: expect.objectContaining({
        id: "c1", status: "PUBLISHED", deletedAt: null, stationId: null,
      }) });
      expect(mockRedis.getJson).not.toHaveBeenCalled();
    });
    it("不存在抛出 NotFoundException", async () => {
      mockPrisma.content.findFirst.mockResolvedValue(null);
      await expect(svc.detail("invalid")).rejects.toThrow(BusinessException);
    });
    it("匿名不能借 status/stationId 查询草稿和分站内容，后台可以", async () => {
      mockPrisma.content.findMany.mockResolvedValue([]);
      mockPrisma.content.count.mockResolvedValue(0);
      await svc.list({ status: "DRAFT", stationId: "s1" }, false);
      expect(mockPrisma.content.findMany.mock.calls[0][0].where).toMatchObject({
        status: "PUBLISHED", stationId: null, deletedAt: null,
      });
      await svc.list({ status: "DRAFT", stationId: "s1" }, true);
      expect(mockPrisma.content.findMany.mock.calls[1][0].where).toMatchObject({
        status: "DRAFT", stationId: "s1",
      });
    });
    it("仅后台审核身份可查看未发布内容，且不复用公开缓存", async () => {
      mockPrisma.content.findUnique.mockResolvedValue({ id: "draft", status: "DRAFT", title: "草稿" });
      expect((await svc.detail("draft", true)).title).toBe("草稿");
      expect(mockPrisma.content.findUnique).toHaveBeenCalledWith({ where: { id: "draft" } });
      expect(mockRedis.setJson).not.toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("更新成功", async () => {
      mockPrisma.content.findUnique.mockResolvedValue({ id: "c1" });
      mockPrisma.content.update.mockResolvedValue({ id: "c1", title: "新标题" });
      const result = await svc.update("c1", { title: "新标题" });
      expect(result.title).toBe("新标题");
    });
    it("不存在抛出 NotFoundException", async () => {
      mockPrisma.content.findUnique.mockResolvedValue(null);
      await expect(svc.update("invalid", {})).rejects.toThrow(BusinessException);
    });
  });

  describe("remove", () => {
    it("删除成功", async () => {
      mockPrisma.content.findUnique.mockResolvedValue({ id: "c1" });
      mockPrisma.content.delete.mockResolvedValue({});
      const result = await svc.remove("c1");
      expect(result.success).toBe(true);
    });
    it("不存在抛出 NotFoundException", async () => {
      mockPrisma.content.findUnique.mockResolvedValue(null);
      await expect(svc.remove("invalid")).rejects.toThrow(BusinessException);
    });
  });
});
