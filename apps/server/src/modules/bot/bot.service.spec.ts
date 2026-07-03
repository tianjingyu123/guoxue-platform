import { Test } from "@nestjs/testing";
import { BotService } from "./bot.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CozeService } from "./coze.service";
import { RecommendationService } from "./recommendation.service";
import { BusinessException } from "../../common/business.exception";

// consumeQuota/purchaseUses 经 getBotOrThrow 解密 apiKey，spec 中用透传 mock 避免真实密文依赖
jest.mock("../../common/crypto.util", () => ({
  ...jest.requireActual("../../common/crypto.util"),
  decrypt: jest.fn((v: string) => v),
  encrypt: jest.fn((v: string) => v),
}));

const mockPrisma = {
  botConfig: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  circleBot: {
    upsert: jest.fn(),
    deleteMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  },
  botKnowledgeBase: {
    create: jest.fn(),
    delete: jest.fn(),
    findUnique: jest.fn(),
  },
  // 归属校验：跨模块只读 circle 表
  circle: {
    findUnique: jest.fn(),
  },
  user: { findUnique: jest.fn() },
  userBotQuota: { upsert: jest.fn(), update: jest.fn(), updateMany: jest.fn(), findUnique: jest.fn() },
};

const mockCoze = {};
const mockReco = { build: jest.fn().mockResolvedValue({ content: "", recommendation: null }) };

describe("BotService", () => {
  let svc: BotService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        BotService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CozeService, useValue: mockCoze },
        { provide: RecommendationService, useValue: mockReco },
      ],
    }).compile();
    svc = mod.get(BotService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("consumeQuota — AI 计费（会员免费/试用/追问包）", () => {
    const PAID_BOT = { id: "b1", name: "命理助手", botId: "coze-1", apiKey: "enc", pricePer10Coin: 100, freeUses: 3, status: "ACTIVE" };
    const asBot = (b: object) => mockPrisma.botConfig.findUnique.mockResolvedValue(b);
    const asNonMember = () => mockPrisma.user.findUnique.mockResolvedValue({ memberLevel: "NONE", memberExpire: null });

    it("免费智能体（pricePer10Coin=0）直接放行", async () => {
      asBot({ ...PAID_BOT, pricePer10Coin: 0 });
      expect(await svc.consumeQuota("b1", "u1")).toBe("free_bot");
      expect(mockPrisma.userBotQuota.upsert).not.toHaveBeenCalled();
    });

    it("有效会员免费（终身会员 memberExpire 为空）", async () => {
      asBot(PAID_BOT);
      mockPrisma.user.findUnique.mockResolvedValue({ memberLevel: "LIFETIME", memberExpire: null });
      expect(await svc.consumeQuota("b1", "u1")).toBe("member");
    });

    it("非会员试用期内消耗免费次数", async () => {
      asBot(PAID_BOT);
      asNonMember();
      mockPrisma.userBotQuota.upsert.mockResolvedValue({ id: "q1", freeUsed: 1, paidRemaining: 0 });
      expect(await svc.consumeQuota("b1", "u1")).toBe("trial");
      expect(mockPrisma.userBotQuota.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { freeUsed: { increment: 1 } } }),
      );
    });

    it("试用用完扣追问包（原子条件扣减）", async () => {
      asBot(PAID_BOT);
      asNonMember();
      mockPrisma.userBotQuota.upsert.mockResolvedValue({ id: "q1", freeUsed: 3, paidRemaining: 5 });
      mockPrisma.userBotQuota.updateMany.mockResolvedValue({ count: 1 });
      expect(await svc.consumeQuota("b1", "u1")).toBe("paid");
    });

    it("额度耗尽抛出购买/会员引导", async () => {
      asBot(PAID_BOT);
      asNonMember();
      mockPrisma.userBotQuota.upsert.mockResolvedValue({ id: "q1", freeUsed: 3, paidRemaining: 0 });
      mockPrisma.userBotQuota.updateMany.mockResolvedValue({ count: 0 });
      await expect(svc.consumeQuota("b1", "u1")).rejects.toThrow(/追问包|会员/);
    });
  });

  describe("purchaseUses — 购买追问包", () => {
    it("扣币并充入10次", async () => {
      mockPrisma.botConfig.findUnique.mockResolvedValue({ id: "b1", name: "命理助手", botId: "coze-1", apiKey: "enc", pricePer10Coin: 100, status: "ACTIVE" });
      const mockCoin = { spend: jest.fn().mockResolvedValue({}) };
      (svc as any).coin = mockCoin;
      mockPrisma.userBotQuota.upsert.mockResolvedValue({ id: "q1", paidRemaining: 10 });
      const result = await svc.purchaseUses("b1", "u1");
      expect(mockCoin.spend).toHaveBeenCalledWith("u1", expect.objectContaining({ amountCoin: 100, scene: "BOT_CALL" }));
      expect(result).toEqual({ purchased: 10, paidRemaining: 10 });
    });

    it("免费智能体不可购买", async () => {
      mockPrisma.botConfig.findUnique.mockResolvedValue({ id: "b1", name: "x", botId: "coze-1", apiKey: "enc", pricePer10Coin: 0, status: "ACTIVE" });
      await expect(svc.purchaseUses("b1", "u1")).rejects.toThrow(/免费/);
    });
  });

  describe("create", () => {
    it("创建智能体成功", async () => {
      mockPrisma.botConfig.create.mockResolvedValue({ id: "b1", name: "国学助手" });
      const result = await svc.create({
        name: "国学助手", type: "CHAT", botId: "bot-001", apiKey: "sk-xxx",
      });
      expect(result.id).toBe("b1");
    });

    it("创建智能体使用默认值", async () => {
      mockPrisma.botConfig.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: "b1", ...data }),
      );
      const result = await svc.create({
        name: "助手", type: "CHAT", botId: "bot-001", apiKey: "sk-xxx",
      });
      expect(result.isFree).toBe(true);
      expect(result.dailyLimit).toBe(5);
      expect(result.sortOrder).toBe(0);
      expect(result.intro).toBe("");
    });
  });

  describe("update", () => {
    it("更新智能体成功", async () => {
      mockPrisma.botConfig.findUnique.mockResolvedValue({ id: "b1", name: "旧名称" });
      mockPrisma.botConfig.update.mockResolvedValue({ id: "b1", name: "新名称" });
      const result = await svc.update("b1", { name: "新名称" });
      expect(result.name).toBe("新名称");
    });
  });

  describe("delete", () => {
    it("删除智能体成功", async () => {
      mockPrisma.botConfig.findUnique.mockResolvedValue({ id: "b1", name: "助手" });
      mockPrisma.botConfig.delete.mockResolvedValue({});
      const result = await svc.delete("b1");
      expect(result.success).toBe(true);
    });
  });

  describe("list", () => {
    it("列出所有活跃智能体", async () => {
      mockPrisma.botConfig.findMany.mockResolvedValue([{ id: "b1", name: "助手" }]);
      const result = await svc.list();
      expect(result).toHaveLength(1);
    });

    it("按类型过滤", async () => {
      mockPrisma.botConfig.findMany.mockResolvedValue([]);
      await svc.list("CHAT");
      expect(mockPrisma.botConfig.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: "ACTIVE", type: "CHAT" } }),
      );
    });

    it("仅返回活跃状态的智能体", async () => {
      mockPrisma.botConfig.findMany.mockResolvedValue([]);
      await svc.list();
      expect(mockPrisma.botConfig.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: "ACTIVE" } }),
      );
    });
  });

  describe("getDetail", () => {
    it("获取智能体详情成功", async () => {
      mockPrisma.botConfig.findUnique.mockResolvedValue({
        id: "b1", name: "助手", circleBots: [], knowledgeBases: [],
      });
      const result = await svc.getDetail("b1");
      expect(result.id).toBe("b1");
    });

    it("智能体不存在抛出 NotFoundException", async () => {
      mockPrisma.botConfig.findUnique.mockResolvedValue(null);
      await expect(svc.getDetail("invalid")).rejects.toThrow(BusinessException);
    });
  });

  describe("bindToCircle", () => {
    it("绑定智能体到圈子成功（新建，圈主操作）", async () => {
      mockPrisma.circle.findUnique.mockResolvedValue({ ownerId: "u1" });
      mockPrisma.circleBot.upsert.mockResolvedValue({ botConfigId: "b1", circleId: "c1" });
      const result = await svc.bindToCircle("b1", { circleId: "c1" }, "u1");
      expect(result.circleId).toBe("c1");
      expect(mockPrisma.circle.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "c1" } }),
      );
    });

    it("绑定智能体到圈子带 knowledgeBaseId", async () => {
      mockPrisma.circle.findUnique.mockResolvedValue({ ownerId: "u1" });
      mockPrisma.circleBot.upsert.mockResolvedValue({ botConfigId: "b1", circleId: "c1", knowledgeBaseId: "kb-1" });
      const result = await svc.bindToCircle("b1", { circleId: "c1", knowledgeBaseId: "kb-1" }, "u1");
      expect(result.knowledgeBaseId).toBe("kb-1");
    });

    it("非圈主绑定时抛出异常", async () => {
      mockPrisma.circle.findUnique.mockResolvedValue({ ownerId: "owner" });
      await expect(
        svc.bindToCircle("b1", { circleId: "c1" }, "intruder"),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe("unbindCircle", () => {
    it("解绑圈子成功", async () => {
      mockPrisma.circleBot.deleteMany.mockResolvedValue({ count: 1 });
      const result = await svc.unbindCircle("c1");
      expect(result.success).toBe(true);
    });

    it("解绑不存在的圈子也成功", async () => {
      mockPrisma.circleBot.deleteMany.mockResolvedValue({ count: 0 });
      const result = await svc.unbindCircle("c1");
      expect(result.success).toBe(true);
    });
  });

  describe("getCircleBot", () => {
    it("获取圈子绑定的智能体", async () => {
      mockPrisma.circleBot.findUnique.mockResolvedValue({ circleId: "c1", botConfig: { id: "b1" } });
      const result = await svc.getCircleBot("c1");
      expect(result).not.toBeNull();
      expect(result!.botConfig.id).toBe("b1");
    });

    it("圈子未绑定智能体返回 null", async () => {
      mockPrisma.circleBot.findUnique.mockResolvedValue(null);
      const result = await svc.getCircleBot("c1");
      expect(result).toBeNull();
    });
  });

  describe("addKnowledge", () => {
    it("添加知识库条目成功（圈主操作）", async () => {
      // assertBotConfigOwner：先反查绑定圈子，再校验圈主
      mockPrisma.circleBot.findFirst.mockResolvedValue({ circleId: "c1" });
      mockPrisma.circle.findUnique.mockResolvedValue({ ownerId: "u1" });
      mockPrisma.botKnowledgeBase.create.mockResolvedValue({ id: "k1", title: "论语", content: "学而时习之" });
      const result = await svc.addKnowledge("b1", { title: "论语", content: "学而时习之" }, "u1");
      expect(result.id).toBe("k1");
    });

    it("智能体未绑定圈子时抛出异常", async () => {
      mockPrisma.circleBot.findFirst.mockResolvedValue(null);
      await expect(
        svc.addKnowledge("b1", { title: "论语", content: "学而时习之" }, "u1"),
      ).rejects.toThrow(BusinessException);
    });

    it("非圈主添加时抛出异常", async () => {
      mockPrisma.circleBot.findFirst.mockResolvedValue({ circleId: "c1" });
      mockPrisma.circle.findUnique.mockResolvedValue({ ownerId: "owner" });
      await expect(
        svc.addKnowledge("b1", { title: "论语", content: "学而时习之" }, "intruder"),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe("deleteKnowledge", () => {
    it("删除知识库条目成功（管理端，无圈主校验）", async () => {
      mockPrisma.botKnowledgeBase.findUnique.mockResolvedValue({ id: "k1" });
      mockPrisma.botKnowledgeBase.delete.mockResolvedValue({});
      const result = await svc.deleteKnowledge("k1");
      expect(result.success).toBe(true);
    });
  });

  describe("deleteKnowledgeAsOwner", () => {
    it("圈主删除知识库条目成功", async () => {
      mockPrisma.botKnowledgeBase.findUnique.mockResolvedValue({ botConfigId: "b1" });
      mockPrisma.circleBot.findFirst.mockResolvedValue({ circleId: "c1" });
      mockPrisma.circle.findUnique.mockResolvedValue({ ownerId: "u1" });
      mockPrisma.botKnowledgeBase.delete.mockResolvedValue({});
      const result = await svc.deleteKnowledgeAsOwner("k1", "u1");
      expect(result.success).toBe(true);
    });

    it("知识条目不存在时抛出异常", async () => {
      mockPrisma.botKnowledgeBase.findUnique.mockResolvedValue(null);
      await expect(
        svc.deleteKnowledgeAsOwner("k1", "u1"),
      ).rejects.toThrow(BusinessException);
    });

    it("非圈主删除时抛出异常", async () => {
      mockPrisma.botKnowledgeBase.findUnique.mockResolvedValue({ botConfigId: "b1" });
      mockPrisma.circleBot.findFirst.mockResolvedValue({ circleId: "c1" });
      mockPrisma.circle.findUnique.mockResolvedValue({ ownerId: "owner" });
      await expect(
        svc.deleteKnowledgeAsOwner("k1", "intruder"),
      ).rejects.toThrow(BusinessException);
    });
  });
});
