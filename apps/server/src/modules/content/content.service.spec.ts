import { Test } from "@nestjs/testing";
import { ContentService } from "./content.service";
import { PrismaService } from "../../prisma/prisma.service";
import { NotFoundException } from "@nestjs/common";
import { ContentType } from "./content.dto";

const mockPrisma = {
  content: { create: jest.fn(), findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
};

describe("ContentService", () => {
  let svc: ContentService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [ContentService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    svc = mod.get(ContentService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

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
  });

  describe("detail", () => {
    it("返回内容详情（并发放大浏览数）", async () => {
      mockPrisma.content.findUnique.mockResolvedValue({ id: "c1", title: "论语", viewCount: 10 });
      mockPrisma.content.update.mockResolvedValue({});
      const result = await svc.detail("c1");
      expect(result.title).toBe("论语");
    });
    it("不存在抛出 NotFoundException", async () => {
      mockPrisma.content.findUnique.mockResolvedValue(null);
      await expect(svc.detail("invalid")).rejects.toThrow(NotFoundException);
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
      await expect(svc.update("invalid", {})).rejects.toThrow(NotFoundException);
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
      await expect(svc.remove("invalid")).rejects.toThrow(NotFoundException);
    });
  });
});