import { Test, TestingModule } from "@nestjs/testing";
import { PromotionService } from "./promotion.service";
import { PrismaService } from "../../prisma/prisma.service";

const mockPrisma = {
  promotionMaterial: { findMany: jest.fn(), create: jest.fn(), delete: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
};

describe("PromotionService", () => {
  let svc: PromotionService;

  beforeEach(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      providers: [PromotionService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    svc = mod.get(PromotionService);
    jest.clearAllMocks();
  });

  it("应被定义", () => expect(svc).toBeDefined());

  describe("listMaterials", () => {
    it("按站点和可选类型过滤", async () => {
      mockPrisma.promotionMaterial.findMany.mockResolvedValue([{ id: "m1", title: "海报" }]);
      const result = await svc.listMaterials("s1", "image");
      expect(result).toHaveLength(1);
    });
  });

  describe("create", () => {
    it("创建推广素材", async () => {
      mockPrisma.promotionMaterial.create.mockResolvedValue({ id: "m1", title: "新海报" });
      const result = await svc.create({ stationId: "s1", type: "image", title: "新海报" });
      expect(result.title).toBe("新海报");
    });
  });

  describe("delete", () => {
    it("删除素材", async () => {
      mockPrisma.promotionMaterial.delete.mockResolvedValue({ id: "m1" });
      const result = await svc.delete("m1");
      expect(result.id).toBe("m1");
    });
  });

  describe("recordUse", () => {
    it("递增使用计数", async () => {
      mockPrisma.promotionMaterial.update.mockResolvedValue({ id: "m1", usageCount: 5 });
      const result = await svc.recordUse("m1");
      expect(result.usageCount).toBe(5);
      expect(mockPrisma.promotionMaterial.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { usageCount: { increment: 1 } } }),
      );
    });
  });
});
