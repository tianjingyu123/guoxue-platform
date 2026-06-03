import { Test } from "@nestjs/testing";
import { CanActivate } from "@nestjs/common";
import { ProductCategoryController } from "./category.controller";
import { ProductCategoryService } from "./product-category.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";

const mockService: Record<string, jest.Mock> = {
  getTree: jest.fn(),
  getProducts: jest.fn(),
  adminCreate: jest.fn(),
  adminUpdate: jest.fn(),
  adminDelete: jest.fn(),
};

const mockGuard: CanActivate = { canActivate: () => true };

describe("ProductCategoryController", () => {
  let ctrl: ProductCategoryController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [ProductCategoryController],
      providers: [{ provide: ProductCategoryService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard).useValue(mockGuard)
      .overrideGuard(RolesGuard).useValue(mockGuard)
      .compile();
    ctrl = mod.get(ProductCategoryController);
  });

  beforeEach(() => jest.clearAllMocks());

  it("应被定义", () => expect(ctrl).toBeDefined());

  describe("公开接口", () => {
    it("获取分类树", async () => {
      mockService.getTree.mockResolvedValue([{ id: "c1", name: "国学经典", children: [] }]);
      const result: any = await ctrl.getTree();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("国学经典");
    });

    it("按分类获取商品——默认分页", async () => {
      mockService.getProducts.mockResolvedValue({ items: [], total: 0 });
      const result: any = await ctrl.getProducts("c1");
      expect(mockService.getProducts).toHaveBeenCalledWith("c1", 1, 20);
      expect(result.items).toHaveLength(0);
    });

    it("按分类获取商品——自定义分页", async () => {
      mockService.getProducts.mockResolvedValue({ items: [], total: 0 });
      await ctrl.getProducts("c1", "3" as any, "10" as any);
      expect(mockService.getProducts).toHaveBeenCalledWith("c1", 3, 10);
    });
  });

  describe("管理接口", () => {
    it("新增商品分类", async () => {
      mockService.adminCreate.mockResolvedValue({ id: "c1", name: "书法用品" });
      const result: any = await ctrl.adminCreate({ name: "书法用品", parentId: "p1" });
      expect(result.name).toBe("书法用品");
      expect(mockService.adminCreate).toHaveBeenCalledWith({ name: "书法用品", parentId: "p1" });
    });

    it("编辑商品分类", async () => {
      mockService.adminUpdate.mockResolvedValue({ id: "c1", name: "文房四宝" });
      const result: any = await ctrl.adminUpdate("c1", { name: "文房四宝" });
      expect(result.name).toBe("文房四宝");
    });

    it("删除商品分类", async () => {
      mockService.adminDelete.mockResolvedValue({ id: "c1" });
      await ctrl.adminDelete("c1");
      expect(mockService.adminDelete).toHaveBeenCalledWith("c1");
    });
  });
});
