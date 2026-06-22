import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { PromotionService } from "./promotion.service";
import { PrismaService } from "../../prisma/prisma.service";

const mockPrisma = {
  station: { findUnique: jest.fn() },
  promotionMaterial: { findMany: jest.fn(), create: jest.fn(), delete: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
};

// 调用方传入的当前用户（分站主）
const UID = "u1";
// 该用户名下的分站
const STATION_ID = "s1";

describe("PromotionService", () => {
  let svc: PromotionService;

  beforeEach(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      providers: [PromotionService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    svc = mod.get(PromotionService);
    jest.clearAllMocks();
    // 默认：据 userId 反查名下分站，归属校验通过
    mockPrisma.station.findUnique.mockResolvedValue({ id: STATION_ID });
  });

  it("应被定义", () => expect(svc).toBeDefined());

  describe("listMaterials", () => {
    it("按站点和可选类型过滤", async () => {
      mockPrisma.promotionMaterial.findMany.mockResolvedValue([{ id: "m1", title: "海报" }]);
      const result = await svc.listMaterials(STATION_ID, UID, "image");
      expect(result).toHaveLength(1);
    });

    it("访问非名下分站抛出 ForbiddenException", async () => {
      // 当前用户名下分站是 s1，但请求的是 s2
      await expect(svc.listMaterials("s2", UID, "image")).rejects.toThrow(ForbiddenException);
    });

    it("非分站主抛出 ForbiddenException", async () => {
      mockPrisma.station.findUnique.mockResolvedValue(null);
      await expect(svc.listMaterials(STATION_ID, "stranger")).rejects.toThrow(ForbiddenException);
    });
  });

  describe("create", () => {
    it("创建推广素材（stationId 据当前用户反查，忽略入参）", async () => {
      mockPrisma.promotionMaterial.create.mockResolvedValue({ id: "m1", title: "新海报" });
      const result = await svc.create(UID, { type: "image", title: "新海报" });
      expect(result.title).toBe("新海报");
      // 校验落库的 stationId 来自反查结果，而非外部输入
      expect(mockPrisma.promotionMaterial.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ stationId: STATION_ID }) }),
      );
    });

    it("非分站主创建抛出 ForbiddenException", async () => {
      mockPrisma.station.findUnique.mockResolvedValue(null);
      await expect(svc.create("stranger", { type: "image", title: "新海报" })).rejects.toThrow(ForbiddenException);
    });
  });

  describe("delete", () => {
    it("删除素材", async () => {
      mockPrisma.promotionMaterial.findUnique.mockResolvedValue({ id: "m1", stationId: STATION_ID });
      mockPrisma.promotionMaterial.delete.mockResolvedValue({ id: "m1" });
      const result = await svc.delete("m1", UID);
      expect(result.id).toBe("m1");
    });

    it("删除他人素材抛出 ForbiddenException", async () => {
      mockPrisma.promotionMaterial.findUnique.mockResolvedValue({ id: "m1", stationId: "other-station" });
      await expect(svc.delete("m1", UID)).rejects.toThrow(ForbiddenException);
    });

    it("素材不存在抛出 NotFoundException", async () => {
      mockPrisma.promotionMaterial.findUnique.mockResolvedValue(null);
      await expect(svc.delete("bad", UID)).rejects.toThrow(NotFoundException);
    });
  });

  describe("getDetail", () => {
    it("返回归属于当前用户的素材", async () => {
      mockPrisma.promotionMaterial.findUnique.mockResolvedValue({ id: "m1", stationId: STATION_ID, title: "海报" });
      const result = await svc.getDetail("m1", UID);
      expect(result.id).toBe("m1");
    });
  });

  describe("recordUse", () => {
    it("递增使用计数", async () => {
      mockPrisma.promotionMaterial.findUnique.mockResolvedValue({ id: "m1", stationId: STATION_ID });
      mockPrisma.promotionMaterial.update.mockResolvedValue({ id: "m1", usageCount: 5 });
      const result = await svc.recordUse("m1", UID);
      expect(result.usageCount).toBe(5);
      expect(mockPrisma.promotionMaterial.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { usageCount: { increment: 1 } } }),
      );
    });

    it("操作他人素材抛出 ForbiddenException", async () => {
      mockPrisma.promotionMaterial.findUnique.mockResolvedValue({ id: "m1", stationId: "other-station" });
      await expect(svc.recordUse("m1", UID)).rejects.toThrow(ForbiddenException);
    });
  });
});
