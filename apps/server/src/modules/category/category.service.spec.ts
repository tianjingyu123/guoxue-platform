import { Test, TestingModule } from "@nestjs/testing";
import { CategoryService } from "./category.service";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";

const mockPrisma = {
  category: {
    count: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  content: {
    groupBy: jest.fn(),
    count: jest.fn(),
  },
};

describe("CategoryService", () => {
  let svc: CategoryService;

  beforeAll(async () => {
    mockPrisma.category.count.mockResolvedValue(1); // 已有数据，跳过 seed
    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    svc = mod.get(CategoryService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("getTree", () => {
    it("返回品类树", async () => {
      mockPrisma.category.findMany.mockResolvedValue([
        { id: "c1", name: "国学经典", level: 1, parentId: null, sortOrder: 0, status: "ACTIVE", icon: null, contentCount: 0 },
        { id: "c2", name: "儒家经典", level: 2, parentId: "c1", sortOrder: 0, status: "ACTIVE", icon: null, contentCount: 0 },
      ]);
      const tree = await svc.getTree();
      expect(tree).toHaveLength(1);
      expect(tree[0].children).toHaveLength(1);
    });
  });

  describe("create", () => {
    it("创建一级品类", async () => {
      mockPrisma.category.findFirst.mockResolvedValue(null);
      mockPrisma.category.create.mockResolvedValue({ id: "c1", name: "新品类", level: 1 });
      const result = await svc.create({ name: "新品类" });
      expect(result.name).toBe("新品类");
    });

    it("重复一级品类抛出异常", async () => {
      mockPrisma.category.findFirst.mockResolvedValue({ id: "c1", name: "国学经典", level: 1 });
      await expect(svc.create({ name: "国学经典" })).rejects.toThrow("一级品类已存在");
    });

    it("不存在的父级抛出异常", async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);
      await expect(svc.create({ name: "子类", parentId: "bad" })).rejects.toThrow("父级品类不存在");
    });
  });

  describe("update", () => {
    it("更新品类名称", async () => {
      mockPrisma.category.findUnique.mockResolvedValue({ id: "c1", name: "国学经典" });
      mockPrisma.category.update.mockResolvedValue({ id: "c1", name: "国学文化" });
      const result = await svc.update("c1", { name: "国学文化" });
      expect(result.name).toBe("国学文化");
    });

    it("更新不存在品类抛出异常", async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);
      await expect(svc.update("bad", { name: "x" })).rejects.toThrow("品类不存在");
    });
  });

  describe("delete", () => {
    it("删除空品类", async () => {
      mockPrisma.category.findUnique.mockResolvedValue({ id: "c2", name: "子类", level: 2 });
      mockPrisma.content.count.mockResolvedValue(0);
      mockPrisma.category.delete.mockResolvedValue({ id: "c2" });
      const result = await svc.delete("c2");
      expect(result.id).toBe("c2");
    });

    it("有子类的一级品类抛出异常", async () => {
      mockPrisma.category.findUnique.mockResolvedValue({ id: "c1", name: "国学经典", level: 1 });
      mockPrisma.category.count.mockResolvedValue(3);
      await expect(svc.delete("c1")).rejects.toThrow("请先删除子分类");
    });

    it("有内容的品类抛出异常", async () => {
      mockPrisma.category.findUnique.mockResolvedValue({ id: "c2", name: "儒家经典", level: 2 });
      mockPrisma.content.count.mockResolvedValue(10);
      await expect(svc.delete("c2")).rejects.toThrow("无法删除");
    });
  });

  describe("getStats", () => {
    it("返回品类统计", async () => {
      mockPrisma.category.findMany.mockResolvedValue([
        { id: "c1", name: "国学经典", level: 1, parentId: null, sortOrder: 0, status: "ACTIVE", icon: null, contentCount: 0 },
        { id: "c2", name: "儒家经典", level: 2, parentId: "c1", sortOrder: 0, status: "ACTIVE", icon: null, contentCount: 0 },
      ]);
      mockPrisma.content.groupBy.mockResolvedValue([
        { categoryLevel1: "国学经典", categoryLevel2: "儒家经典", status: "PUBLISHED", _count: 3 },
        { categoryLevel1: "国学经典", categoryLevel2: "儒家经典", status: "DRAFT", _count: 1 },
      ]);
      const stats = await svc.getStats();
      expect(stats.totalLevel1).toBe(1);
      expect(stats.totalContent).toBe(4);
    });
  });
});
