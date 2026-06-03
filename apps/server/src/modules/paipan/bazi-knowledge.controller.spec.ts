import { Test } from "@nestjs/testing";
import { CanActivate } from "@nestjs/common";
import { BaziKnowledgeController } from "./bazi-knowledge.controller";
import { BaziKnowledgeService } from "./bazi-knowledge.service";
import { BaziKnowledgeSeeder } from "./bazi-knowledge-seeder.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";

const mockService: Record<string, jest.Mock> = {
  stats: jest.fn(),
  search: jest.fn(),
  listByCategory: jest.fn(),
  getById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  vectorizeUnindexed: jest.fn(),
};

const mockSeeder: Record<string, jest.Mock> = {
  seed: jest.fn(),
};

const mockGuard: CanActivate = { canActivate: () => true };

describe("BaziKnowledgeController", () => {
  let ctrl: BaziKnowledgeController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [BaziKnowledgeController],
      providers: [
        { provide: BaziKnowledgeService, useValue: mockService },
        { provide: BaziKnowledgeSeeder, useValue: mockSeeder },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue(mockGuard)
      .overrideGuard(RolesGuard).useValue(mockGuard)
      .compile();
    ctrl = mod.get(BaziKnowledgeController);
  });

  beforeEach(() => jest.clearAllMocks());

  it("应被定义", () => expect(ctrl).toBeDefined());

  it("知识库统计", async () => {
    mockService.stats.mockResolvedValue({ total: 100, byCategory: [] });
    const result: any = await ctrl.getStats();
    expect(result.total).toBe(100);
  });

  it("搜索八字知识", async () => {
    mockService.search.mockResolvedValue([{ id: "k1", title: "五行" }]);
    const result: any = await ctrl.search("五行", "天干地支");
    expect(result).toHaveLength(1);
    expect(mockService.search).toHaveBeenCalledWith("五行", "天干地支");
  });

  it("按分类列出", async () => {
    mockService.listByCategory.mockResolvedValue({ items: [], total: 0 });
    const result: any = await ctrl.listByCategory("十神");
    expect(result.items).toHaveLength(0);
  });

  it("按分类列出——带分页", async () => {
    mockService.listByCategory.mockResolvedValue({ items: [], total: 0 });
    await ctrl.listByCategory("格局", "3" as any, "10" as any);
    expect(mockService.listByCategory).toHaveBeenCalledWith("格局", 3, 10);
  });

  it("获取详情", async () => {
    mockService.getById.mockResolvedValue({ id: "k1", title: "十神详解" });
    const result: any = await ctrl.getById("k1");
    expect(result.title).toBe("十神详解");
  });

  it("创建知识条目", async () => {
    mockService.create.mockResolvedValue({ id: "k1" });
    const result: any = await ctrl.create({ title: "新知识", category: "测试", content: "内容" } as any);
    expect(result.id).toBe("k1");
  });

  it("更新知识条目", async () => {
    mockService.update.mockResolvedValue({ id: "k1", title: "更新后" });
    const result: any = await ctrl.update("k1", { title: "更新后" } as any);
    expect(result.title).toBe("更新后");
  });

  it("删除知识条目", async () => {
    mockService.delete.mockResolvedValue({ id: "k1" });
    await ctrl.delete("k1");
    expect(mockService.delete).toHaveBeenCalledWith("k1");
  });

  it("填充种子数据", async () => {
    mockSeeder.seed.mockResolvedValue({ created: 50 });
    const result: any = await ctrl.seed();
    expect(result.created).toBe(50);
  });

  it("向量化未索引知识", async () => {
    mockService.vectorizeUnindexed.mockResolvedValue(10);
    const result: any = await ctrl.vectorizeUnindexed();
    expect(result).toBe(10);
  });
});
