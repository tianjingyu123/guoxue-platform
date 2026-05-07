import { Test } from "@nestjs/testing";
import { BotService } from "./bot.service";
import { PrismaService } from "../../prisma/prisma.service";
import { NotFoundException } from "@nestjs/common";

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
  },
  botKnowledgeBase: {
    create: jest.fn(),
    delete: jest.fn(),
  },
};

describe("BotService", () => {
  let svc: BotService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        BotService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    svc = mod.get(BotService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

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
      mockPrisma.botConfig.update.mockResolvedValue({ id: "b1", name: "新名称" });
      const result = await svc.update("b1", { name: "新名称" });
      expect(result.name).toBe("新名称");
    });
  });

  describe("delete", () => {
    it("删除智能体成功", async () => {
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
      await expect(svc.getDetail("invalid")).rejects.toThrow(NotFoundException);
    });
  });

  describe("bindToCircle", () => {
    it("绑定智能体到圈子成功（新建）", async () => {
      mockPrisma.circleBot.upsert.mockResolvedValue({ botConfigId: "b1", circleId: "c1" });
      const result = await svc.bindToCircle("b1", { circleId: "c1" });
      expect(result.circleId).toBe("c1");
    });

    it("绑定智能体到圈子带 knowledgeBaseId", async () => {
      mockPrisma.circleBot.upsert.mockResolvedValue({ botConfigId: "b1", circleId: "c1", knowledgeBaseId: "kb-1" });
      const result = await svc.bindToCircle("b1", { circleId: "c1", knowledgeBaseId: "kb-1" });
      expect(result.knowledgeBaseId).toBe("kb-1");
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
    it("添加知识库条目成功", async () => {
      mockPrisma.botKnowledgeBase.create.mockResolvedValue({ id: "k1", title: "论语", content: "学而时习之" });
      const result = await svc.addKnowledge("b1", { title: "论语", content: "学而时习之" });
      expect(result.id).toBe("k1");
    });
  });

  describe("deleteKnowledge", () => {
    it("删除知识库条目成功", async () => {
      mockPrisma.botKnowledgeBase.delete.mockResolvedValue({});
      const result = await svc.deleteKnowledge("k1");
      expect(result.success).toBe(true);
    });
  });
});
