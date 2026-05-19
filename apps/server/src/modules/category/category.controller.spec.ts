import { Test } from "@nestjs/testing";
import { CategoryController } from "./category.controller";
import { CategoryService } from "./category.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";

const mockCategorySvc = {
  getTree: jest.fn().mockResolvedValue([{ id: "c1", name: "经部", children: [] }]),
  create: jest.fn().mockResolvedValue({ id: "c1", name: "新品类" }),
  update: jest.fn().mockResolvedValue({ id: "c1", name: "更新品类" }),
  delete: jest.fn().mockResolvedValue({ success: true }),
  getStats: jest.fn().mockResolvedValue({ total: 10, byCategory: [] }),
  syncContentCounts: jest.fn().mockResolvedValue({ synced: 10 }),
};

describe("CategoryController", () => {
  let ctrl: CategoryController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [CategoryController],
      providers: [
        { provide: CategoryService, useValue: mockCategorySvc },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(CategoryController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("should be defined", () => {
    expect(ctrl).toBeDefined();
  });

  it("GET /admin/categories/tree — 获取品类标签树", async () => {
    const result = await ctrl.getTree();
    expect(result).toBeDefined();
    expect(mockCategorySvc.getTree).toHaveBeenCalled();
  });

  it("POST /admin/categories — 新增品类", async () => {
    const dto: any = { name: "新品类", parentId: null };
    const result = await ctrl.create(dto);
    expect(result).toBeDefined();
    expect(mockCategorySvc.create).toHaveBeenCalledWith(dto);
  });

  it("PUT /admin/categories/:id — 编辑品类", async () => {
    const dto: any = { name: "更新品类" };
    const result = await ctrl.update("c1", dto);
    expect(result).toBeDefined();
    expect(mockCategorySvc.update).toHaveBeenCalledWith("c1", dto);
  });

  it("DELETE /admin/categories/:id — 删除品类", async () => {
    const result = await ctrl.delete("c1");
    expect(result).toBeDefined();
    expect(mockCategorySvc.delete).toHaveBeenCalledWith("c1");
  });

  it("GET /admin/categories/stats — 品类内容统计", async () => {
    const result = await ctrl.getStats();
    expect(result).toBeDefined();
    expect(mockCategorySvc.getStats).toHaveBeenCalled();
  });

  it("POST /admin/categories/sync-counts — 同步品类内容计数", async () => {
    const result = await ctrl.syncCounts();
    expect(result).toBeDefined();
    expect(mockCategorySvc.syncContentCounts).toHaveBeenCalled();
  });
});
