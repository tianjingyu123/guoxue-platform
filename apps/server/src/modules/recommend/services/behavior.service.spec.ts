import { Test } from "@nestjs/testing";
import { BehaviorService } from "./behavior.service";
import { PrismaService } from "../../../prisma/prisma.service";

const mockPrisma = { userBehavior: { create: jest.fn().mockResolvedValue({}) } };

describe("BehaviorService", () => {
  let svc: BehaviorService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [BehaviorService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    svc = mod.get(BehaviorService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("record", () => {
    it("记录 LIKE 行为，默认权重 1", async () => {
      await svc.record({ userId: "u1", targetType: "ARTICLE", targetId: "a1", behavior: "LIKE" });
      expect(mockPrisma.userBehavior.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: "u1", behavior: "LIKE", weight: 1 }) }),
      );
    });

    it("记录 COLLECT 行为，默认权重 2", async () => {
      await svc.record({ userId: "u1", targetType: "COURSE", targetId: "c1", behavior: "COLLECT" });
      expect(mockPrisma.userBehavior.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ weight: 2 }) }),
      );
    });

    it("记录 PURCHASE 行为，默认权重 5", async () => {
      await svc.record({ userId: "u1", targetType: "PRODUCT", targetId: "p1", behavior: "PURCHASE" });
      expect(mockPrisma.userBehavior.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ weight: 5 }) }),
      );
    });

    it("记录 LEARN 行为，默认权重 3", async () => {
      await svc.record({ userId: "u1", targetType: "COURSE", targetId: "c1", behavior: "LEARN" });
      expect(mockPrisma.userBehavior.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ weight: 3 }) }),
      );
    });

    it("自定义权重覆盖默认值", async () => {
      await svc.record({ userId: "u1", targetType: "ARTICLE", targetId: "a1", behavior: "VIEW", weight: 0.8 });
      expect(mockPrisma.userBehavior.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ weight: 0.8 }) }),
      );
    });

    it("UNKNOWN 行为使用默认权重 1", async () => {
      await svc.record({ userId: "u1", targetType: "ARTICLE", targetId: "a1", behavior: "UNKNOWN" });
      expect(mockPrisma.userBehavior.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ weight: 1 }) }),
      );
    });

    it("Prisma 写入失败时不抛异常（fire-and-forget）", async () => {
      mockPrisma.userBehavior.create.mockRejectedValue(new Error("DB down"));
      // 不应抛出异常
      await expect(svc.record({ userId: "u1", targetType: "ARTICLE", targetId: "a1", behavior: "LIKE" })).resolves.toBeUndefined();
    });
  });
});
