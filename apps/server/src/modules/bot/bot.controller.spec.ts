import { Test } from "@nestjs/testing";
import { BotController } from "./bot.controller";
import { BotService } from "./bot.service";
import { CozeService } from "./coze.service";
import { StreamUnifierService } from "../ai-gateway/stream-unifier.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";

const mockSSE = {} as any;
const mockCozeSvc = { createBot: jest.fn(), listBots: jest.fn(), getBot: jest.fn(), updateBot: jest.fn(), deleteBot: jest.fn() };

const mockBotSvc = {
  create: jest.fn().mockResolvedValue({ id: "bot1", name: "国学助手" }),
  list: jest.fn().mockResolvedValue([{ id: "bot1", name: "国学助手" }]),
  getDetail: jest.fn().mockResolvedValue({ id: "bot1", name: "国学助手", prompt: "..." }),
  update: jest.fn().mockResolvedValue({ id: "bot1", name: "更新名称" }),
  delete: jest.fn().mockResolvedValue({ success: true }),
  bindToCircle: jest.fn().mockResolvedValue({ botId: "bot1", circleId: "c1" }),
  getCircleBot: jest.fn().mockResolvedValue({ id: "bot1", name: "圈主助理" }),
  addKnowledge: jest.fn().mockResolvedValue({ id: "k1", title: "知识条目" }),
  deleteKnowledge: jest.fn().mockResolvedValue({ success: true }),
  chat: jest.fn().mockResolvedValue({ reply: "你好！有什么可以帮你的？" }),
  getBotForChat: jest.fn().mockResolvedValue({ botId: "bot1", apiKey: "key123" }),
  chatStream: jest.fn().mockReturnValue(jest.fn()),
  getChatHistory: jest.fn().mockResolvedValue([{ role: "user", content: "你好" }]),
  getBotApprovalList: jest.fn().mockResolvedValue([{ circleId: "c1", status: "PENDING" }]),
  approveBot: jest.fn().mockResolvedValue({ circleId: "c1", approved: true }),
  getBotKnowledgeList: jest.fn().mockResolvedValue([{ id: "k1", title: "知识" }]),
  addBotKnowledge: jest.fn().mockResolvedValue({ id: "k1", title: "新知识" }),
  updateBotKnowledge: jest.fn().mockResolvedValue({ id: "k1", title: "更新知识" }),
  getBotUsageData: jest.fn().mockResolvedValue({ totalChats: 100, activeUsers: 20 }),
};

describe("BotController", () => {
  let ctrl: BotController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [BotController],
      providers: [
        { provide: StreamUnifierService, useValue: mockSSE },
        { provide: BotService, useValue: mockBotSvc },
        { provide: CozeService, useValue: mockCozeSvc },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .overrideGuard(StrictRedisThrottleGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(BotController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("POST /bots — 创建智能体", async () => {
    const dto: any = { name: "国学助手", type: "ASSISTANT" };
    const result: any = await ctrl.create(dto);
    expect(result.name).toBe("国学助手");
    expect(mockBotSvc.create).toHaveBeenCalledWith(dto);
  });

  it("GET /bots — 智能体列表", async () => {
    const result: any = await ctrl.list("ASSISTANT");
    expect(result).toHaveLength(1);
    expect(mockBotSvc.list).toHaveBeenCalledWith("ASSISTANT");
  });

  it("GET /bots/:id — 智能体详情", async () => {
    const result: any = await ctrl.detail("bot1");
    expect(result.name).toBe("国学助手");
    expect(mockBotSvc.getDetail).toHaveBeenCalledWith("bot1");
  });

  it("PUT /bots/:id — 更新智能体", async () => {
    const dto: any = { name: "更新名称" };
    const result: any = await ctrl.update("bot1", dto);
    expect(result.name).toBe("更新名称");
    expect(mockBotSvc.update).toHaveBeenCalledWith("bot1", dto);
  });

  it("DELETE /bots/:id — 删除智能体", async () => {
    const result: any = await ctrl.delete("bot1");
    expect(result.success).toBe(true);
    expect(mockBotSvc.delete).toHaveBeenCalledWith("bot1");
  });

  it("POST /bots/:id/bind-circle — 绑定圈子", async () => {
    const dto: any = { circleId: "c1" };
    const result: any = await ctrl.bindToCircle("bot1", dto);
    expect(result.circleId).toBe("c1");
    expect(mockBotSvc.bindToCircle).toHaveBeenCalledWith("bot1", dto);
  });

  it("GET /bots/circle/:circleId — 圈子绑定的智能体", async () => {
    const result: any = await ctrl.getCircleBot("c1");
    expect(result.name).toBe("圈主助理");
    expect(mockBotSvc.getCircleBot).toHaveBeenCalledWith("c1");
  });

  it("POST /bots/:id/knowledge — 添加知识库", async () => {
    const dto: any = { title: "知识条目", content: "..." };
    const result: any = await ctrl.addKnowledge("bot1", dto);
    expect(result.title).toBe("知识条目");
    expect(mockBotSvc.addKnowledge).toHaveBeenCalledWith("bot1", dto);
  });

  it("DELETE /bots/knowledge/:knowledgeId — 删除知识库", async () => {
    const result: any = await ctrl.deleteKnowledge("k1");
    expect(result.success).toBe(true);
    expect(mockBotSvc.deleteKnowledge).toHaveBeenCalledWith("k1");
  });

  it("POST /bots/:id/chat — 非流式对话", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { query: "你好" };
    const result: any = await ctrl.chat(req, "bot1", dto);
    expect(result.reply).toContain("你好");
    expect(mockBotSvc.chat).toHaveBeenCalledWith("bot1", "u1", dto);
  });

  it("GET /bots/:id/chat-history/:conversationId — 对话历史", async () => {
    const result: any = await ctrl.getChatHistory("bot1", "conv1");
    expect(result).toHaveLength(1);
    expect(mockBotSvc.getChatHistory).toHaveBeenCalledWith("bot1", "conv1");
  });

  it("GET /bots/manage/approvals — 审批列表", async () => {
    const result: any = await ctrl.getBotApprovalList("1" as any, "20" as any);
    expect(result).toHaveLength(1);
    expect(mockBotSvc.getBotApprovalList).toHaveBeenCalledWith(1, 20);
  });

  it("POST /bots/manage/approvals/:circleId/approve — 批准开通", async () => {
    const result: any = await ctrl.approveBot("c1");
    expect(result.approved).toBe(true);
    expect(mockBotSvc.approveBot).toHaveBeenCalledWith("c1");
  });

  it("GET /bots/manage/knowledge/:circleId — 知识库列表", async () => {
    const result: any = await ctrl.getBotKnowledgeList("c1", "1" as any, "20" as any);
    expect(result).toHaveLength(1);
    expect(mockBotSvc.getBotKnowledgeList).toHaveBeenCalledWith("c1", 1, 20);
  });

  it("POST /bots/manage/knowledge/:circleId — 添加知识库条目", async () => {
    const dto: any = { title: "新知识", content: "..." };
    const result: any = await ctrl.addBotKnowledge("c1", dto);
    expect(result.title).toBe("新知识");
    expect(mockBotSvc.addBotKnowledge).toHaveBeenCalledWith("c1", dto);
  });

  it("PUT /bots/manage/knowledge/:knowledgeId — 更新知识库条目", async () => {
    const dto: any = { title: "更新知识", content: "..." };
    const result: any = await ctrl.updateBotKnowledge("k1", dto);
    expect(result.title).toBe("更新知识");
    expect(mockBotSvc.updateBotKnowledge).toHaveBeenCalledWith("k1", dto);
  });

  it("DELETE /bots/manage/knowledge/:knowledgeId — 删除知识库条目", async () => {
    const result: any = await ctrl.deleteBotKnowledge("k1");
    expect(result.success).toBe(true);
    expect(mockBotSvc.deleteKnowledge).toHaveBeenCalledWith("k1");
  });

  it("GET /bots/manage/usage/:circleId — 使用数据", async () => {
    const result: any = await ctrl.getBotUsageData("c1");
    expect(result.totalChats).toBe(100);
    expect(mockBotSvc.getBotUsageData).toHaveBeenCalledWith("c1");
  });
});
