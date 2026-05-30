import { Test } from "@nestjs/testing";
import { OperationRobotService } from "./operation-robot.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";
import { SystemService } from "../system/system.service";

const mockPrisma = {
  configSystem: { findUnique: jest.fn(), upsert: jest.fn() },
  user: { findUnique: jest.fn(), create: jest.fn() },
  content: { findMany: jest.fn(), update: jest.fn() },
  circle: { findMany: jest.fn() },
  post: { create: jest.fn() },
  circleMember: { findMany: jest.fn(), upsert: jest.fn() },
  paidQuestion: { create: jest.fn() },
  $executeRawUnsafe: jest.fn(),
};

const mockGateway = {
  chat: jest.fn(),
};

const mockSystemSvc = {
  logAudit: jest.fn().mockResolvedValue(undefined),
};

describe("OperationRobotService", () => {
  let svc: OperationRobotService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        OperationRobotService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AiGatewayService, useValue: mockGateway },
        { provide: SystemService, useValue: mockSystemSvc },
      ],
    }).compile();
    svc = mod.get(OperationRobotService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  // ═══════════ init ═══════════
  describe("init", () => {
    it("从config加载机器人配置并创建虚拟用户", async () => {
      mockPrisma.configSystem.findUnique.mockResolvedValue({
        configKey: "operation_robots",
        configValue: JSON.stringify({
          like_bot: { name: "点赞助手", enabled: true, frequency: "medium", description: "点赞" },
          comment_bot: { name: "评论助手", enabled: false, frequency: "low", description: "评论" },
        }),
      });
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({});

      await svc.init();

      // 至少创建了like_bot用户（comment_bot disabled不创建）
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ id: "BOT_like_bot" }) }),
      );
    });

    it("无config时使用默认配置", async () => {
      mockPrisma.configSystem.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({});
      await svc.init();

      // 通过getRobotStatus验证默认配置
      const status = svc.getRobotStatus();
      expect(status).toHaveLength(4);
      const likeBot = status.find((s) => s.role === "like_bot");
      expect(likeBot?.enabled).toBe(true);
      const questionBot = status.find((s) => s.role === "question_bot");
      expect(questionBot?.enabled).toBe(false);
    });
  });

  // ═══════════ getRobotStatus ═══════════
  describe("getRobotStatus", () => {
    it("初始化后返回4个机器人状态", async () => {
      mockPrisma.configSystem.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({});
      await svc.init();

      const status = svc.getRobotStatus();
      expect(status).toHaveLength(4);
      expect(status[0]).toHaveProperty("role");
      expect(status[0]).toHaveProperty("enabled");
    });
  });

  // ═══════════ toggleRobot ═══════════
  describe("toggleRobot", () => {
    it("切换开关并持久化", async () => {
      mockPrisma.configSystem.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({});
      await svc.init();
      mockPrisma.configSystem.upsert.mockResolvedValue({});

      const result = await svc.toggleRobot("like_bot", false);
      expect(result.enabled).toBe(false);
      expect(mockPrisma.configSystem.upsert).toHaveBeenCalled();

      const status = svc.getRobotStatus();
      const likeBot = status.find((s) => s.role === "like_bot");
      expect(likeBot?.enabled).toBe(false);
    });

    it("未知机器人抛错", async () => {
      mockPrisma.configSystem.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({});
      await svc.init();

      await expect(svc.toggleRobot("unknown_bot" as any, true)).rejects.toThrow("未知机器人");
    });
  });

  // ═══════════ likeBotTask ═══════════
  describe("likeBotTask", () => {
    it("对冷门新内容随机点赞", async () => {
      mockPrisma.configSystem.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({});
      await svc.init();
      // 确保 like_bot enabled
      mockPrisma.configSystem.upsert.mockResolvedValue({});
      await svc.toggleRobot("like_bot", true);

      mockPrisma.content.findMany.mockResolvedValue([
        { id: "c-1", title: "新文章", likeCount: 1 },
        { id: "c-2", title: "新文章2", likeCount: 0 },
      ]);
      mockPrisma.content.update.mockResolvedValue({});

      await svc.likeBotTask();

      expect(mockPrisma.content.update).toHaveBeenCalledTimes(2);
    });

    it("disabled时跳过", async () => {
      mockPrisma.configSystem.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({});
      await svc.init();
      await svc.toggleRobot("like_bot", false);
      mockPrisma.configSystem.upsert.mockClear();

      await svc.likeBotTask();
      expect(mockPrisma.content.findMany).not.toHaveBeenCalled();
    });
  });

  // ═══════════ commentBotTask ═══════════
  describe("commentBotTask", () => {
    it("对热门内容生成AI评论", async () => {
      mockPrisma.configSystem.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({});
      await svc.init();
      // 确保 comment_bot enabled
      mockPrisma.configSystem.upsert.mockResolvedValue({});
      await svc.toggleRobot("comment_bot", true);

      mockPrisma.content.findMany.mockResolvedValue([
        { id: "c-1", title: "热门文章", likeCount: 20, body: "这是一篇关于论语的深度解读文章..." },
      ]);
      mockGateway.chat.mockResolvedValue({ content: "写得真好，受益匪浅！" });
      mockPrisma.$executeRawUnsafe.mockResolvedValue(undefined);

      await svc.commentBotTask();

      expect(mockGateway.chat).toHaveBeenCalled();
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining("Comment"),
        expect.any(String),
        expect.any(String),
        expect.stringContaining("[AI互动]"),
      );
    });

    it("无热门内容时跳过", async () => {
      mockPrisma.configSystem.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({});
      await svc.init();

      mockPrisma.content.findMany.mockResolvedValue([]);
      await svc.commentBotTask();

      expect(mockGateway.chat).not.toHaveBeenCalled();
    });
  });

  // ═══════════ signinBotTask ═══════════
  describe("signinBotTask", () => {
    it("在低活跃圈子发布话题帖", async () => {
      mockPrisma.configSystem.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({});
      await svc.init();

      mockPrisma.circle.findMany.mockResolvedValue([
        { id: "circle-1", name: "国学兴趣圈" },
      ]);
      mockPrisma.post.create.mockResolvedValue({});

      await svc.signinBotTask();

      expect(mockPrisma.post.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ circleId: "circle-1" }) }),
      );
    });
  });

  // ═══════════ questionBotTask ═══════════
  describe("questionBotTask", () => {
    it("对开通付费问答的圈子提问", async () => {
      mockPrisma.configSystem.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({});
      await svc.init();
      await svc.toggleRobot("question_bot", true);
      mockPrisma.configSystem.upsert.mockClear();

      mockPrisma.circleMember.findMany.mockResolvedValue([
        {
          circleId: "circle-1",
          userId: "owner-1",
          questionPriceCoin: 100,
          circle: { name: "诗词圈", categoryLevel1: "诗词歌赋" },
        },
      ]);
      mockPrisma.circleMember.upsert.mockResolvedValue({});
      mockGateway.chat.mockResolvedValue({ content: "唐诗中的意象运用有什么规律？" });
      mockPrisma.paidQuestion.create.mockResolvedValue({});

      await svc.questionBotTask();

      expect(mockPrisma.paidQuestion.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ circleId: "circle-1" }) }),
      );
    });

    it("disabled时跳过", async () => {
      mockPrisma.configSystem.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({});
      await svc.init();
      // 显式关闭，避免前序测试 toggle 影响
      mockPrisma.configSystem.upsert.mockResolvedValue({});
      await svc.toggleRobot("question_bot", false);

      await svc.questionBotTask();
      expect(mockPrisma.circleMember.findMany).not.toHaveBeenCalled();
    });

    it("无付费问答成员时跳过", async () => {
      mockPrisma.configSystem.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({});
      await svc.init();
      await svc.toggleRobot("question_bot", true);
      mockPrisma.configSystem.upsert.mockClear();

      mockPrisma.circleMember.findMany.mockResolvedValue([]);

      await svc.questionBotTask();
      expect(mockGateway.chat).not.toHaveBeenCalled();
    });
  });
});
