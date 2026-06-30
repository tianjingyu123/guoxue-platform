import { Test } from "@nestjs/testing";
import { MarketplaceController } from "./marketplace.controller";
import { MarketplaceService } from "./marketplace.service";
import { PrismaService } from "../../prisma/prisma.service";

describe("MarketplaceController", () => {
  let ctrl: MarketplaceController;
  let svc: jest.Mocked<MarketplaceService>;

  const mockPrisma = {
    botConfig: { findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn() },
    circleBot: { findMany: jest.fn(), count: jest.fn() },
  } as any;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [MarketplaceController],
      providers: [MarketplaceService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    ctrl = mod.get(MarketplaceController);
    svc = mod.get(MarketplaceService) as jest.Mocked<MarketplaceService>;
  });

  beforeEach(() => { jest.clearAllMocks(); });

  const botRow = {
    id: "b1", name: "国学助手", avatar: "a.png", intro: "国学AI", type: "education",
    isFree: true, price: null, monthlyPrice: null, dailyLimit: 100, sortOrder: 1, botId: "bot1", voiceEnabled: true,
  };

  describe("list", () => {
    it("从 botConfig + circleBot 聚合返回 agent 列表", async () => {
      mockPrisma.botConfig.findMany.mockResolvedValue([botRow]);
      mockPrisma.botConfig.count.mockResolvedValue(1);
      mockPrisma.circleBot.findMany.mockResolvedValue([]);

      const result = await ctrl.list();
      expect(result.items.length).toBe(1);
      expect(result.items[0].name).toBe("国学助手");
      expect(result.items[0].source).toBe("coze_bot");
    });

    it("按关键词过滤 (name contains)", async () => {
      await ctrl.list("国学");
      expect(mockPrisma.botConfig.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ name: { contains: "国学" } }) }),
      );
    });

    it("按分类过滤 (type)", async () => {
      await ctrl.list(undefined, "education");
      expect(mockPrisma.botConfig.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ type: "education" }) }),
      );
    });
  });

  describe("getDetail", () => {
    it("返回 agent 详情含扩展字段", async () => {
      mockPrisma.botConfig.findUnique.mockResolvedValue(botRow);
      const result = await ctrl.getDetail("b1");
      expect(result).toBeTruthy();
      expect(result!.id).toBe("b1");
      expect(result!.extra.botId).toBe("bot1");
    });

    it("未知 ID 返回 null", async () => {
      mockPrisma.botConfig.findUnique.mockResolvedValue(null);
      const result = await ctrl.getDetail("nonexistent");
      expect(result).toBeNull();
    });
  });
});
