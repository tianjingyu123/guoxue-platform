import { Test } from "@nestjs/testing";
import { SearchWeightService } from "./search-weight.service";
import { PrismaService } from "../../prisma/prisma.service";

const mockPrisma = {
  searchWeight: {
    findMany: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
  },
};

describe("SearchWeightService", () => {
  let svc: SearchWeightService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        SearchWeightService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    svc = mod.get(SearchWeightService);
  });

  beforeEach(() => jest.clearAllMocks());

  it("应被定义", () => expect(svc).toBeDefined());

  describe("list", () => {
    it("列出所有权重", async () => {
      mockPrisma.searchWeight.findMany.mockResolvedValue([{ id: "w1", entityType: "article", fieldName: "title", weight: 2.0 }]);
      const result = await svc.list();
      expect(result).toHaveLength(1);
    });

    it("按实体类型过滤", async () => {
      mockPrisma.searchWeight.findMany.mockResolvedValue([]);
      await svc.list("article");
      expect(mockPrisma.searchWeight.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { entityType: "article" } }),
      );
    });
  });

  describe("upsert", () => {
    it("新增权重", async () => {
      mockPrisma.searchWeight.upsert.mockResolvedValue({ id: "w1", entityType: "article", fieldName: "title", weight: 3.0 });
      const result = await svc.upsert({ entityType: "article", fieldName: "title", weight: 3.0 });
      expect(result.weight).toBe(3.0);
    });

    it("更新已有权重", async () => {
      mockPrisma.searchWeight.upsert.mockResolvedValue({ id: "w1", entityType: "course", fieldName: "title", weight: 2.5, enabled: false });
      const result = await svc.upsert({ entityType: "course", fieldName: "title", weight: 2.5, enabled: false });
      expect(result.enabled).toBe(false);
    });
  });

  describe("delete", () => {
    it("删除权重", async () => {
      mockPrisma.searchWeight.delete.mockResolvedValue({ id: "w1" });
      const result = await svc.delete("w1");
      expect(result.id).toBe("w1");
    });
  });

  describe("getWeightMap", () => {
    it("获取权重映射", async () => {
      mockPrisma.searchWeight.findMany.mockResolvedValue([
        { entityType: "article", fieldName: "title", weight: 2.0 },
        { entityType: "article", fieldName: "excerpt", weight: 1.0 },
      ]);
      const map = await svc.getWeightMap();
      expect(map.get("article:title")).toBe(2.0);
      expect(map.get("article:excerpt")).toBe(1.0);
    });

    it("无权重时返回空Map", async () => {
      mockPrisma.searchWeight.findMany.mockResolvedValue([]);
      const map = await svc.getWeightMap();
      expect(map.size).toBe(0);
    });
  });

  describe("seedDefaults", () => {
    it("初始化默认权重", async () => {
      mockPrisma.searchWeight.upsert.mockResolvedValue({});
      const result = await svc.seedDefaults();
      expect(result.seeded).toBe(16);
      expect(mockPrisma.searchWeight.upsert).toHaveBeenCalledTimes(16);
    });
  });
});
