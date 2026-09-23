import { Test } from "@nestjs/testing";
import { BotService } from "./bot.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CozeService } from "./coze.service";
import { RecommendationService } from "./recommendation.service";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";
import { BusinessException } from "../../common/business.exception";
import { Observable, of, throwError } from "rxjs";

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
  botChatLog: { count: jest.fn(), create: jest.fn() },
  userBotQuota: { upsert: jest.fn(), update: jest.fn(), updateMany: jest.fn(), findUnique: jest.fn() },
  // 购包扣币与配额发放同事务：透传 tx=mockPrisma，回调内 tx.userBotQuota 即复用上方 mock
  $transaction: jest.fn(async (cb: (tx: unknown) => unknown) => cb(mockPrisma)),
};

const mockCoze = { isOAuthConfigured: jest.fn().mockReturnValue(false), chat: jest.fn(), chatStreamEx: jest.fn() };
const mockReco = {
  build: jest.fn().mockResolvedValue({ content: "", recommendation: null }),
  parseProtocol: jest.fn((content: string) => ({ clean: content.replace(/<!--RECO:[\s\S]*?-->/g, "").trim(), intents: [] })),
};

describe("BotService", () => {
  let svc: BotService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        BotService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CozeService, useValue: mockCoze },
        { provide: RecommendationService, useValue: mockReco },
        { provide: AiGatewayService, useValue: { chatStream: jest.fn() } },
      ],
    }).compile();
    svc = mod.get(BotService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("推荐检索故障时保留已生成的回答并剥离协议标记", async () => {
    mockPrisma.botConfig.findUnique.mockResolvedValue({
      id: "b1", name: "国学助手", botId: "coze-1", apiKey: "enc",
      runtime: "coze", status: "ACTIVE", isFree: true, dailyLimit: 5, pricePer10Coin: 0,
    });
    mockPrisma.botChatLog.count.mockResolvedValue(0);
    mockPrisma.botChatLog.create.mockResolvedValue({ id: "log-1" });
    mockCoze.chat.mockResolvedValue({
      content: '先读原文。<!--RECO:[{"type":"classic","query":"论语"}]-->',
      conversationId: "conv-1", chatId: "chat-1",
    });
    mockReco.build.mockRejectedValueOnce(new Error("检索超时"));

    const result = await svc.chat("b1", "u1", { query: "论语是什么" } as any);
    expect(result.content).toBe("先读原文。");
    expect(result.recommendation).toBeNull();
    expect(mockPrisma.botChatLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ response: "先读原文。" }),
    }));
  });

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
      mockPrisma.userBotQuota.updateMany.mockResolvedValue({ count: 1 });
      expect(await svc.consumeQuota("b1", "u1")).toBe("trial");
      expect(mockPrisma.userBotQuota.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ freeUsed: { lt: 3 } }), data: { freeUsed: { increment: 1 } } }),
      );
    });

    it("试用用完扣追问包（原子条件扣减）", async () => {
      asBot(PAID_BOT);
      asNonMember();
      mockPrisma.userBotQuota.upsert.mockResolvedValue({ id: "q1", freeUsed: 3, paidRemaining: 5 });
      mockPrisma.userBotQuota.updateMany.mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 1 });
      expect(await svc.consumeQuota("b1", "u1")).toBe("paid");
    });

    it("额度耗尽抛出购买/会员引导", async () => {
      asBot(PAID_BOT);
      asNonMember();
      mockPrisma.userBotQuota.upsert.mockResolvedValue({ id: "q1", freeUsed: 3, paidRemaining: 0 });
      mockPrisma.userBotQuota.updateMany.mockResolvedValue({ count: 0 });
      await expect(svc.consumeQuota("b1", "u1")).rejects.toThrow(/追问包|会员/);
    });

    it("并发争用最后一次试用时转入付费额度，不超发试用", async () => {
      asBot(PAID_BOT);
      asNonMember();
      mockPrisma.userBotQuota.upsert.mockResolvedValue({ id: "q1", freeUsed: 2, paidRemaining: 1 });
      mockPrisma.userBotQuota.updateMany.mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 1 });
      expect(await svc.consumeQuota("b1", "u1")).toBe("paid");
      expect(mockPrisma.userBotQuota.updateMany).toHaveBeenNthCalledWith(1,
        expect.objectContaining({ where: expect.objectContaining({ freeUsed: { lt: 3 } }) }),
      );
    });
  });

  describe("模型失败后的额度回退", () => {
    const setup = () => {
      mockPrisma.botConfig.findUnique.mockResolvedValue({
        id: "b1", name: "国学助手", botId: "coze-1", apiKey: "enc", runtime: "coze",
        status: "ACTIVE", isFree: false, dailyLimit: 5, pricePer10Coin: 100, freeUses: 0,
      });
      mockPrisma.user.findUnique.mockResolvedValue({ memberLevel: "NONE", memberExpire: null });
      mockPrisma.userBotQuota.upsert.mockResolvedValue({ id: "q1", freeUsed: 0, paidRemaining: 2 });
      mockPrisma.userBotQuota.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.userBotQuota.update.mockResolvedValue({});
      mockPrisma.botChatLog.count.mockResolvedValue(0);
      mockPrisma.botChatLog.create.mockResolvedValue({ id: "log-1" });
      mockReco.build.mockImplementation(async (content: string) => ({ content, recommendation: null }));
    };

    it("非流式模型报错退还已扣追问次数，且不写成功日志", async () => {
      setup();
      mockCoze.chat.mockRejectedValue(new Error("模型超时"));
      await expect(svc.chat("b1", "u1", { query: "你好" } as any)).rejects.toThrow("模型超时");
      expect(mockPrisma.userBotQuota.update).toHaveBeenCalledWith({
        where: { id: "q1" }, data: { paidRemaining: { increment: 1 } },
      });
      expect(mockPrisma.botChatLog.create).not.toHaveBeenCalled();
    });

    it("非流式空回答退还额度", async () => {
      setup();
      mockCoze.chat.mockResolvedValue({ content: "  ", conversationId: "c1", chatId: "h1" });
      await expect(svc.chat("b1", "u1", { query: "你好" } as any)).rejects.toThrow(/暂未生成回答/);
      expect(mockPrisma.userBotQuota.update).toHaveBeenCalledTimes(1);
    });

    it("试用次数在模型失败后退回试用，不误充付费额度", async () => {
      setup();
      mockPrisma.botConfig.findUnique.mockResolvedValue({
        id: "b1", name: "国学助手", botId: "coze-1", apiKey: "enc", runtime: "coze",
        status: "ACTIVE", isFree: false, dailyLimit: 5, pricePer10Coin: 100, freeUses: 3,
      });
      mockCoze.chat.mockRejectedValue(new Error("模型超时"));
      await expect(svc.chat("b1", "u1", { query: "你好" } as any)).rejects.toThrow("模型超时");
      expect(mockPrisma.userBotQuota.updateMany).toHaveBeenLastCalledWith({
        where: { id: "q1", freeUsed: { gt: 0 } }, data: { freeUsed: { decrement: 1 } },
      });
      expect(mockPrisma.userBotQuota.update).not.toHaveBeenCalled();
    });

    it("流式模型报错退还额度且只退一次", async () => {
      setup();
      mockCoze.chatStreamEx.mockReturnValue(throwError(() => new Error("流中断")));
      const { bot, quotaTicket } = await svc.precheckChat("b1", "u1");
      await new Promise<void>((resolve) => svc.chatStreamRich(bot, "u1", { query: "你好" } as any, quotaTicket)
        .subscribe({ error: () => resolve() }));
      expect(mockPrisma.userBotQuota.update).toHaveBeenCalledTimes(1);
    });

    it("流式空回答退还额度", async () => {
      setup();
      mockCoze.chatStreamEx.mockReturnValue(of({ type: "meta", conversationId: "c1" }));
      const { bot, quotaTicket } = await svc.precheckChat("b1", "u1");
      await new Promise<void>((resolve) => svc.chatStreamRich(bot, "u1", { query: "你好" } as any, quotaTicket)
        .subscribe({ error: () => resolve() }));
      expect(mockPrisma.userBotQuota.update).toHaveBeenCalledTimes(1);
      expect(mockPrisma.botChatLog.create).not.toHaveBeenCalled();
    });

    it("用户在任何文本产出前关闭流，退还额度", async () => {
      setup();
      mockCoze.chatStreamEx.mockReturnValue(new Observable(() => undefined));
      const { bot, quotaTicket } = await svc.precheckChat("b1", "u1");
      const sub = svc.chatStreamRich(bot, "u1", { query: "你好" } as any, quotaTicket).subscribe();
      sub.unsubscribe();
      await new Promise((resolve) => setImmediate(resolve));
      expect(mockPrisma.userBotQuota.update).toHaveBeenCalledTimes(1);
    });

    it("流式已产出文本后用户退出不退额度", async () => {
      setup();
      mockCoze.chatStreamEx.mockReturnValue(new Observable((subscriber) => {
        subscriber.next({ type: "chunk", content: "已回答" });
      }));
      const { bot, quotaTicket } = await svc.precheckChat("b1", "u1");
      const sub = svc.chatStreamRich(bot, "u1", { query: "你好" } as any, quotaTicket).subscribe();
      sub.unsubscribe();
      await new Promise((resolve) => setImmediate(resolve));
      expect(mockPrisma.userBotQuota.update).not.toHaveBeenCalled();
    });

    it("本地模型流取消订阅会向 AI 网关传递中止信号", async () => {
      const gateway = (svc as any).aiGateway;
      gateway.chatStream.mockImplementation(async function* (req: any) {
        yield "已回答";
        await new Promise((resolve) => req.options.signal.addEventListener("abort", resolve));
      });
      const sub = (svc as any).localChatStream({ id: "b1", systemPrompt: "助手" }, "u1", { query: "你好" }).subscribe();
      await new Promise((resolve) => setImmediate(resolve));
      const signal = gateway.chatStream.mock.calls[0][0].options.signal as AbortSignal;
      expect(signal.aborted).toBe(false);
      sub.unsubscribe();
      expect(signal.aborted).toBe(true);
    });
  });

  describe("purchaseUses — 购买追问包", () => {
    it("扣币并充入10次", async () => {
      mockPrisma.botConfig.findUnique.mockResolvedValue({ id: "b1", name: "命理助手", botId: "coze-1", apiKey: "enc", pricePer10Coin: 100, status: "ACTIVE" });
      const mockCoin = { spend: jest.fn().mockResolvedValue({}) };
      (svc as any).coin = mockCoin;
      mockPrisma.userBotQuota.upsert.mockResolvedValue({ id: "q1", paidRemaining: 10 });
      const result = await svc.purchaseUses("b1", "u1");
      // 扣币与充值在同一事务：spend 末参透传 tx
      expect(mockCoin.spend).toHaveBeenCalledWith("u1", expect.objectContaining({ amountCoin: 100, scene: "BOT_CALL" }), expect.anything());
      expect(mockPrisma.$transaction).toHaveBeenCalled();
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

    it("apiKey/botId 传空串或缺省时保留原值（不落库覆盖）", async () => {
      mockPrisma.botConfig.findUnique.mockResolvedValue({ id: "b1", name: "旧名称" });
      mockPrisma.botConfig.update.mockResolvedValue({ id: "b1" });
      await svc.update("b1", { apiKey: "", botId: "", sortOrder: 3 } as any);
      const data = mockPrisma.botConfig.update.mock.calls[0][0].data;
      expect(data).not.toHaveProperty("apiKey");
      expect(data).not.toHaveProperty("botId");
      expect(data.sortOrder).toBe(3);
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
    it("列出所有活跃智能体（凭证真实可用才下发·2026-07-17 拍板占位=下架）", async () => {
      mockPrisma.botConfig.findMany.mockResolvedValue([{ id: "b1", name: "助手", type: "CLASSICS_READING", botId: "734829102938", apiKey: "sk_real_1234" }]);
      const result = await svc.list();
      expect(result).toHaveLength(1);
      expect(result[0]).not.toHaveProperty("apiKey");
    });

    it("local 学习型智能体无需 Coze 凭证即可公开", async () => {
      mockPrisma.botConfig.findMany.mockResolvedValue([
        { id: "b1", name: "古籍句读助手", type: "CLASSICS_READING", runtime: "local", systemPrompt: "讲解古籍", botId: "local_public_01", apiKey: "" },
      ]);
      const result = await svc.list();
      expect(result).toHaveLength(1);
    });

    it("占位凭证（coze_ 前缀 botId / sk_dev_placeholder）在 C 端列表被过滤", async () => {
      mockPrisma.botConfig.findMany.mockResolvedValue([
        { id: "b1", name: "占位", botId: "coze_customer_001", apiKey: "sk_dev_placeholder" },
      ]);
      const result = await svc.list();
      expect(result).toHaveLength(0);
    });

    it("按类型过滤", async () => {
      mockPrisma.botConfig.findMany.mockResolvedValue([]);
      await svc.list("CHAT");
      expect(mockPrisma.botConfig.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: "ACTIVE",
            type: "CHAT",
          },
        }),
      );
    });

    it("仅返回活跃状态的智能体", async () => {
      mockPrisma.botConfig.findMany.mockResolvedValue([]);
      await svc.list();
      expect(mockPrisma.botConfig.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: "ACTIVE",
            type: { notIn: expect.arrayContaining(["FORTUNE_TELLER", "DIVINATION"]) },
          },
        }),
      );
    });
  });

  describe("adminList", () => {
    it("管理端返回全部（含占位）·apiKey 只回掩码 + isConfigured 布尔", async () => {
      mockPrisma.botConfig.findMany.mockResolvedValue([
        { id: "b1", name: "真实", botId: "734829102938", apiKey: "sk_real_1234" },
        { id: "b2", name: "占位", botId: "coze_customer_001", apiKey: "sk_dev_placeholder" },
      ]);
      const result = await svc.adminList();
      expect(result).toHaveLength(2);
      expect(result[0]).not.toHaveProperty("apiKey");
      expect(result[0].apiKeyMask).toBe("sk_***1234");
      expect(result[0].isConfigured).toBe(true);
      expect(result[1].isConfigured).toBe(false);
      // 管理端不按 status=ACTIVE 过滤（下架/占位也要能盘点与换令牌）
      expect(mockPrisma.botConfig.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
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
