import { Test, TestingModule } from "@nestjs/testing";
import { ProductCategoryService } from "./product-category.service";
import { PrismaService } from "../../prisma/prisma.service";

const mockPrisma = {
  productCategory: {
    findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(),
    count: jest.fn().mockResolvedValue(10), // 已有数据，跳过 seed
  },
  product: { findMany: jest.fn(), count: jest.fn() },
};

describe("ProductCategoryService", () => {
  let svc: ProductCategoryService;

  beforeEach(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        ProductCategoryService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    svc = mod.get(ProductCategoryService);
    jest.clearAllMocks();
  });

  it("应被定义", () => expect(svc).toBeDefined());

  describe("getTree", () => {
    it("构建分类树结构", async () => {
      mockPrisma.productCategory.findMany.mockResolvedValue([
        { id: "c1", name: "书籍", parentId: null, level: 1, sortOrder: 0, status: "ACTIVE" },
        { id: "c2", name: "国学经典", parentId: "c1", level: 2, sortOrder: 0, status: "ACTIVE" },
        { id: "c3", name: "茶具", parentId: null, level: 1, sortOrder: 1, status: "ACTIVE" },
      ]);

      const result = await svc.getTree();
      expect(result).toHaveLength(2);
      expect(result[0].children).toHaveLength(1);
    });
  });

  describe("getProducts", () => {
    it("返回分类下商品列表", async () => {
      mockPrisma.product.findMany.mockResolvedValue([{ id: "p1", title: "论语", price: 39 }]);
      mockPrisma.product.count.mockResolvedValue(1);

      const result = await svc.getProducts("c1", 1, 20);
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe("adminUpdate", () => {
    it("更新分类信息", async () => {
      mockPrisma.productCategory.findUnique.mockResolvedValue({ id: "c1", name: "书籍" });
      mockPrisma.productCategory.update.mockResolvedValue({ id: "c1", name: "国学书籍" });

      const result = await svc.adminUpdate("c1", { name: "国学书籍" });
      expect(result.name).toBe("国学书籍");
    });

    it("分类不存在抛出异常", async () => {
      mockPrisma.productCategory.findUnique.mockResolvedValue(null);
      await expect(svc.adminUpdate("no-cat", { name: "X" })).rejects.toThrow("不存在");
    });
  });

  describe("adminDelete", () => {
    it("分类下有商品时拒绝删除", async () => {
      mockPrisma.productCategory.findUnique.mockResolvedValue({ id: "c1", name: "书籍" });
      mockPrisma.product.count.mockResolvedValue(5);
      await expect(svc.adminDelete("c1")).rejects.toThrow("无法删除");
    });

    it("分类下无商品时成功删除", async () => {
      mockPrisma.productCategory.findUnique.mockResolvedValue({ id: "c1", name: "书籍" });
      mockPrisma.product.count.mockResolvedValue(0);
      mockPrisma.productCategory.delete.mockResolvedValue({ id: "c1" });

      const result = await svc.adminDelete("c1");
      expect(result).toEqual({ id: "c1" });
    });

    it("分类不存在抛出异常", async () => {
      mockPrisma.productCategory.findUnique.mockResolvedValue(null);
      await expect(svc.adminDelete("no-cat")).rejects.toThrow("不存在");
    });
  });
});
