import { Injectable, Logger } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CozeService } from "./coze.service";
import { CreateBotDto, UpdateBotDto, BindBotToCircleDto, AddKnowledgeDto, ChatDto } from "./bot.dto";
import { encrypt, decrypt } from "../../common/crypto.util";
import { Cacheable } from "../../common/cache.decorator";
import { safePagination } from "../../common/pagination";
import { RISK_DISCLAIMER } from "../../common/ai-disclaimer";
import { RecommendationService } from "./recommendation.service";

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);

  constructor(
    private prisma: PrismaService,
    private coze: CozeService,
    private reco: RecommendationService,
  ) {}

  // ───────── Bot配置 CRUD ─────────

  async create(dto: CreateBotDto) {
    return this.prisma.botConfig.create({
      data: {
        name: dto.name,
        type: dto.type,
        avatar: dto.avatar,
        intro: dto.intro || "",
        botId: dto.botId,
        apiKey: encrypt(dto.apiKey),
        isFree: dto.isFree ?? true,
        dailyLimit: dto.dailyLimit ?? 5,
        price: dto.price,
        monthlyPrice: dto.monthlyPrice,
        sortOrder: dto.sortOrder ?? 0,
        voiceEnabled: dto.voiceEnabled ?? false,
      },
    });
  }

  async update(id: string, dto: UpdateBotDto) {
    const existing = await this.prisma.botConfig.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "智能体配置不存在");
    const data: Prisma.BotConfigUpdateInput = { ...dto };
    if (dto.apiKey) data.apiKey = encrypt(dto.apiKey);
    return this.prisma.botConfig.update({ where: { id }, data });
  }

  async delete(id: string) {
    const existing = await this.prisma.botConfig.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "智能体配置不存在");
    await this.prisma.botConfig.delete({ where: { id } });
    return { success: true };
  }

  async list(type?: string) {
    const where: Prisma.BotConfigWhereInput = { status: "ACTIVE" };
    if (type) where.type = type;

    const bots = await this.prisma.botConfig.findMany({
      where,
      orderBy: { sortOrder: "asc" },
      take: 100,
    });
    // apiKey 不对外暴露
    return bots.map(({ apiKey: _apiKey, ...rest }) => rest);
  }

  async getDetail(id: string) {
    const bot = await this.prisma.botConfig.findUnique({
      where: { id },
      include: {
        circleBots: { include: { circle: { select: { id: true, name: true } } } },
        knowledgeBases: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!bot) throw new BusinessException(ErrorCode.NOT_FOUND, "智能体不存在");
    const { ...rest } = bot;
    return rest;
  }

  // ───────── 圈子绑定 ─────────

  /** 校验当前用户是该圈子圈主，跨模块只读 circle 表 */
  private async assertCircleOwner(circleId: string, userId: string) {
    const circle = await this.prisma.circle.findUnique({
      where: { id: circleId },
      select: { ownerId: true },
    });
    if (!circle) throw new BusinessException(ErrorCode.NOT_FOUND, "圈子不存在");
    if (circle.ownerId !== userId) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "仅圈主可执行此操作");
    }
  }

  /** 通过 botConfig 反查其绑定的圈子，并校验当前用户为圈主 */
  private async assertBotConfigOwner(botConfigId: string, userId: string) {
    const circleBot = await this.prisma.circleBot.findFirst({
      where: { botConfigId },
      select: { circleId: true },
    });
    if (!circleBot) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "该智能体未绑定圈子，无权操作");
    }
    await this.assertCircleOwner(circleBot.circleId, userId);
  }

  async bindToCircle(botConfigId: string, dto: BindBotToCircleDto, userId: string) {
    // 安全：仅目标圈子的圈主可绑定/换绑智能体
    await this.assertCircleOwner(dto.circleId, userId);
    return this.prisma.circleBot.upsert({
      where: { circleId: dto.circleId },
      create: { botConfigId, circleId: dto.circleId, knowledgeBaseId: dto.knowledgeBaseId },
      update: { botConfigId, knowledgeBaseId: dto.knowledgeBaseId },
    });
  }

  async unbindCircle(circleId: string) {
    await this.prisma.circleBot.deleteMany({ where: { circleId } });
    return { success: true };
  }

  async getCircleBot(circleId: string) {
    const bot = await this.prisma.circleBot.findUnique({
      where: { circleId },
      include: { botConfig: true },
    });
    if (bot?.botConfig) {
      const { ...rest } = bot.botConfig;
      return { ...bot, botConfig: rest };
    }
    return bot;
  }

  // ───────── 知识库 ─────────

  async addKnowledge(botConfigId: string, dto: AddKnowledgeDto, userId: string) {
    // 安全：仅该智能体所绑定圈子的圈主可写入知识库
    await this.assertBotConfigOwner(botConfigId, userId);
    return this.prisma.botKnowledgeBase.create({
      data: {
        botConfigId,
        title: dto.title,
        content: dto.content,
        sourceType: dto.sourceType,
        sourceId: dto.sourceId,
      },
    });
  }

  /** 删除知识库条目（管理端调用，无圈主校验，由 RolesGuard 兜底） */
  async deleteKnowledge(knowledgeId: string) {
    const existing = await this.prisma.botKnowledgeBase.findUnique({ where: { id: knowledgeId } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "知识库条目不存在");
    await this.prisma.botKnowledgeBase.delete({ where: { id: knowledgeId } });
    return { success: true };
  }

  /** 删除知识库条目（圈主端调用，校验当前用户为对应圈子圈主） */
  async deleteKnowledgeAsOwner(knowledgeId: string, userId: string) {
    const item = await this.prisma.botKnowledgeBase.findUnique({
      where: { id: knowledgeId },
      select: { botConfigId: true },
    });
    if (!item) throw new BusinessException(ErrorCode.NOT_FOUND, "知识条目不存在");
    await this.assertBotConfigOwner(item.botConfigId, userId);
    await this.prisma.botKnowledgeBase.delete({ where: { id: knowledgeId } });
    return { success: true };
  }

  // ───────── COZE 对话 ─────────

  /** 获取智能体配置（含API密钥）—— 公开方法，供控制器流式调用 */
  async getBotForChat(id: string) {
    return this.getBotOrThrow(id);
  }

  /** 获取智能体配置（含API密钥），apiKey 使用 toJSON 掩码防止日志泄露 */
  private async getBotOrThrow(id: string) {
    const bot = await this.prisma.botConfig.findUnique({ where: { id } });
    if (!bot) throw new BusinessException(ErrorCode.NOT_FOUND, "智能体不存在");
    if (!bot.apiKey || !bot.botId) throw new BusinessException(ErrorCode.BAD_REQUEST, "智能体未配置API密钥");
    const decrypted = decrypt(bot.apiKey);
    // 返回时掩码 apiKey，防止 JSON 序列化/日志输出泄露
    return {
      ...bot,
      get apiKey() { return decrypted; },
      toJSON() {
        const { ...rest } = this as any;
        return { ...rest, apiKey: "[MASKED]" };
      },
    } as any;
  }

  /** 非流式对话 */
  async chat(botConfigId: string, userId: string, dto: ChatDto) {
    const bot = await this.getBotOrThrow(botConfigId);

    const dailyCount = await this.getUserDailyCount(userId, botConfigId);
    if (!bot.isFree && dailyCount >= bot.dailyLimit) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, `今日对话次数已达上限（${bot.dailyLimit}次）`);
    }

    const result = await this.coze.chat({
      botId: bot.botId,
      apiKey: bot.apiKey,
      userId,
      query: dto.query,
      conversationId: dto.conversationId,
    });

    // 软性导流：解析 Coze 协议意图(优先)/平台兜底 → 匹配真实课程/圈子 → 征求同意推荐
    // content 已剥离协议标记，落库与展示均用净文本
    const { content: cleanContent, recommendation } = await this.reco.build(result.content as string, dto.query);

    await this.prisma.botChatLog.create({
      data: {
        userId,
        botConfigId,
        query: dto.query,
        response: cleanContent,
        conversationId: result.conversationId,
        chatId: result.chatId,
      },
    });

    // 合规：AI 输出统一附带风险免责声明（前端在气泡下方展示）
    return { ...result, content: cleanContent, disclaimer: RISK_DISCLAIMER, recommendation };
  }

  /** 流式对话（返回 Observable，控制器处理为SSE） */
  chatStream(botId: string, apiKey: string, userId: string, query: string, conversationId?: string) {
    return this.coze.chatStream({
      botId,
      apiKey,
      userId,
      query,
      conversationId,
    });
  }

  /** 获取对话历史 */
  async getChatHistory(botConfigId: string, conversationId: string) {
    const logs = await this.prisma.botChatLog.findMany({
      where: { botConfigId, conversationId },
      orderBy: { createdAt: "asc" },
      take: 100,
    });

    return logs.flatMap((l) => [
      { role: "user", content: l.query, time: l.createdAt },
      { role: "assistant", content: l.response, time: l.createdAt },
    ]).sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  }

  /**
   * 我的会话列表 —— 基于 BotChatLog 按 conversationId 聚合（不引入额外会话表）。
   * 每个会话取最新一条作摘要，统计消息轮数，并补齐对应智能体信息。
   */
  async getMyConversations(userId: string, page = 1, pageSize = 20) {
    // 取该用户近期日志（按时间倒序），在内存按 conversationId 归并
    const logs = await this.prisma.botChatLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    type Conv = {
      conversationId: string;
      botConfigId: string;
      lastQuery: string;
      lastResponse: string;
      lastTime: Date;
      messageCount: number;
    };
    const map = new Map<string, Conv>();
    for (const l of logs) {
      const key = l.conversationId || l.id;
      const existing = map.get(key);
      if (!existing) {
        // 首次遇到即最新一条（已按 createdAt desc）
        map.set(key, {
          conversationId: key,
          botConfigId: l.botConfigId,
          lastQuery: l.query,
          lastResponse: l.response,
          lastTime: l.createdAt,
          messageCount: 1,
        });
      } else {
        existing.messageCount += 1;
      }
    }

    const all = [...map.values()].sort((a, b) => b.lastTime.getTime() - a.lastTime.getTime());
    const total = all.length;
    const { skip, pageSize: ps } = safePagination(page, pageSize);
    const pageItems = all.slice(skip, skip + ps);

    // 补齐智能体信息
    const botIds = [...new Set(pageItems.map((c) => c.botConfigId))];
    const bots = botIds.length
      ? await this.prisma.botConfig.findMany({
          where: { id: { in: botIds } },
          select: { id: true, name: true, avatar: true, type: true },
        })
      : [];
    const botMap = new Map(bots.map((b) => [b.id, b]));

    const items = pageItems.map((c) => {
      const bot = botMap.get(c.botConfigId);
      return {
        conversationId: c.conversationId,
        botConfigId: c.botConfigId,
        botName: bot?.name ?? "智能体",
        botAvatar: bot?.avatar ?? "",
        botType: bot?.type ?? "",
        lastQuery: c.lastQuery,
        lastMessage: c.lastResponse,
        lastTime: c.lastTime,
        messageCount: c.messageCount,
      };
    });

    return { items, total, page, pageSize: ps };
  }

  /** 获取用户今日对话次数 */
  private async getUserDailyCount(userId: string, botConfigId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.prisma.botChatLog.count({
      where: {
        userId,
        botConfigId,
        createdAt: { gte: today },
      },
    });
  }

  // ───────── 圈主助理管理 ─────────

  /** 获取待审批的圈主助理开通申请列表 */
  async getBotApprovalList(page: number, pageSize: number) {
    const { skip, page: p, pageSize: ps } = safePagination(page, pageSize);
    this.logger.log(`查询圈主助理审批列表: page=${p}, pageSize=${ps}`);

    const where = { status: { not: "ACTIVE" } };
    const [records, total] = await Promise.all([
      this.prisma.circleBot.findMany({
        where,
        skip,
        take: ps,
        include: {
          circle: { select: { id: true, name: true, intro: true, cover: true, ownerId: true, memberCount: true, createdAt: true } },
          botConfig: { select: { id: true, name: true, type: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.circleBot.count({ where }),
    ]);

    return {
      items: records.map((r) => ({
        id: r.id,
        circleId: r.circleId,
        circleName: r.circle?.name || "",
        circleIntro: r.circle?.intro || "",
        circleCover: r.circle?.cover || "",
        ownerId: r.circle?.ownerId || "",
        memberCount: r.circle?.memberCount || 0,
        botName: r.botConfig?.name || "",
        botType: r.botConfig?.type || "",
        status: r.status,
        appliedAt: r.createdAt,
      })),
      total,
      page: p,
      pageSize: ps,
      totalPages: Math.ceil(total / ps),
    };
  }

  /** 批准圈主助理开通 */
  async approveBot(circleId: string) {
    this.logger.log(`批准圈主助理开通: circleId=${circleId}`);
    const circleBot = await this.prisma.circleBot.findUnique({ where: { circleId } });
    if (!circleBot) {
      return this.prisma.circleBot.create({
        data: { circleId, botConfigId: "", status: "ACTIVE" },
      });
    }
    return this.prisma.circleBot.update({
      where: { circleId },
      data: { status: "ACTIVE" },
    });
  }

  /** 获取圈主助理知识库列表 */
  async getBotKnowledgeList(circleId: string, page: number, pageSize: number) {
    const { skip, page: p, pageSize: ps } = safePagination(page, pageSize);
    this.logger.log(`查询圈主助理知识库: circleId=${circleId}`);

    const circleBot = await this.prisma.circleBot.findUnique({
      where: { circleId },
    });
    if (!circleBot) {
      return { items: [], total: 0, page: p, pageSize: ps, totalPages: 0 };
    }

    const where = { botConfigId: circleBot.botConfigId };
    const [records, total] = await Promise.all([
      this.prisma.botKnowledgeBase.findMany({
        where,
        skip,
        take: ps,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.botKnowledgeBase.count({ where }),
    ]);

    return {
      items: records,
      total,
      page: p,
      pageSize: ps,
      totalPages: Math.ceil(total / ps),
    };
  }

  /** 添加圈主助理知识库条目 */
  async addBotKnowledge(circleId: string, dto: { question: string; answer: string }) {
    this.logger.log(`添加圈主助理知识库: circleId=${circleId}`);

    const circleBot = await this.prisma.circleBot.findUnique({
      where: { circleId },
    });
    if (!circleBot) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "该圈子未开通圈主助理");
    }

    return this.prisma.botKnowledgeBase.create({
      data: {
        botConfigId: circleBot.botConfigId,
        title: dto.question,
        content: dto.answer,
        sourceType: "MANUAL",
      },
    });
  }

  /** 更新圈主助理知识库条目 */
  async updateBotKnowledge(knowledgeId: string, dto: { question?: string; answer?: string }) {
    this.logger.log(`更新圈主助理知识库: knowledgeId=${knowledgeId}`);
    const existing = await this.prisma.botKnowledgeBase.findUnique({ where: { id: knowledgeId } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "知识库条目不存在");
    const data: Prisma.BotKnowledgeBaseUpdateInput = {};
    if (dto.question !== undefined) data.title = dto.question;
    if (dto.answer !== undefined) data.content = dto.answer;

    return this.prisma.botKnowledgeBase.update({
      where: { id: knowledgeId },
      data,
    });
  }

  /** 获取圈主助理使用数据 */
  @Cacheable({ key: (args) => `bot:usage:${args[0]}`, ttl: 60 })
  async getBotUsageData(circleId: string) {
    this.logger.log(`查询圈主助理使用数据: circleId=${circleId}`);

    const circleBot = await this.prisma.circleBot.findUnique({
      where: { circleId },
    });
    if (!circleBot) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "该圈子未开通圈主助理");
    }

    const botConfigId = circleBot.botConfigId;
    const now = new Date();

    const totalCalls = await this.prisma.botChatLog.count({
      where: { botConfigId },
    });

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayCalls = await this.prisma.botChatLog.count({
      where: { botConfigId, createdAt: { gte: todayStart } },
    });

    // 近7天趋势
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekLogs = await this.prisma.botChatLog.findMany({
      where: { botConfigId, createdAt: { gte: weekAgo } },
      orderBy: { createdAt: "asc" },
      take: 5000,
    });

    const trendMap: Record<string, number> = {};
    for (const log of weekLogs) {
      const key = `${(log.createdAt.getMonth() + 1).toString().padStart(2, "0")}-${log.createdAt.getDate().toString().padStart(2, "0")}`;
      trendMap[key] = (trendMap[key] || 0) + 1;
    }
    const trend = Object.entries(trendMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 常见问题 TOP10
    const recentLogs = await this.prisma.botChatLog.findMany({
      where: { botConfigId },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    const queryCountMap: Record<string, { count: number; sampleQuery: string }> = {};
    for (const log of recentLogs) {
      const truncated = log.query.length > 30 ? log.query.slice(0, 30) + "..." : log.query;
      if (!queryCountMap[truncated]) {
        queryCountMap[truncated] = { count: 0, sampleQuery: log.query.slice(0, 50) };
      }
      queryCountMap[truncated].count++;
    }
    const topQueries = Object.entries(queryCountMap)
      .map(([query, data]) => ({ query, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 独立用户数
    const uniqueUsers = await this.prisma.botChatLog.groupBy({
      by: ["userId"],
      where: { botConfigId },
    });

    return {
      circleId,
      totalCalls,
      todayCalls,
      uniqueUsers: uniqueUsers.length,
      trend,
      topQueries,
    };
  }

  // ───────── 语音通话 ─────────

  /** 获取全局 Coze PAT（用于管理类 API） */
  private getGlobalApiKey(): string {
    const key = process.env.COZE_API_KEY;
    if (!key) throw new BusinessException(ErrorCode.BAD_REQUEST, "未配置全局 COZE_API_KEY");
    return key;
  }

  /** 创建语音通话房间 */
  async createVoiceRoom(botConfigId: string, userId: string) {
    const bot = await this.getBotOrThrow(botConfigId);
    if (!bot.voiceEnabled) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "该智能体未开通语音通话");
    }

    const room = await this.coze.createVoiceRoom({
      botId: bot.botId,
      apiKey: bot.apiKey,
    });

    return {
      ...room,
      botName: bot.name,
      userId,
    };
  }

  // ───────── Coze 同步 ─────────

  /** 从 Coze 同步智能体列表，返回我们平台尚未注册的 */
  async syncFromCoze(apiKey?: string) {
    const key = apiKey || this.getGlobalApiKey();
    const result = await this.coze.listBots(key);
    const bots = (result as any)?.space_bots || (result as any)?.items || [];

    // 获取平台已有的 botId 列表
    const existing = await this.prisma.botConfig.findMany({
      select: { botId: true, name: true },
      take: 500,
    });
    const existingIds = new Set(existing.map((e) => e.botId));

    const newBots: Array<Record<string, unknown>> = [];
    const synced: Array<Record<string, unknown>> = [];

    for (const bot of bots) {
      const botId = bot.bot_id as string;
      if (existingIds.has(botId)) {
        synced.push(bot);
      } else {
        newBots.push(bot);
      }
    }

    return {
      total: bots.length,
      synced: synced.length,
      new: newBots.length,
      newBots: newBots.map((b: any) => ({
        botId: b.bot_id,
        name: b.bot_name || b.name,
        description: b.description,
        avatarUrl: b.avatar_url || b.icon_url,
        voiceEnabled: !!b.voice_id,
      })),
      syncedBots: synced.map((b: any) => ({
        botId: b.bot_id,
        name: b.bot_name || b.name,
      })),
    };
  }

  /** 获取 Coze 侧智能体详细信息 */
  async getCozeBotInfo(botConfigId: string) {
    const bot = await this.getBotOrThrow(botConfigId);
    const info = await this.coze.retrieveBot(bot.botId, this.getGlobalApiKey());
    return {
      local: { id: bot.id, name: bot.name, voiceEnabled: bot.voiceEnabled },
      coze: info,
    };
  }

  // ───────── 工作流 ─────────

  /** 执行 Coze 工作流 */
  async runWorkflow(dto: {
    botConfigId?: string;
    workflowId: string;
    parameters?: Record<string, unknown>;
  }) {
    const key = dto.botConfigId
      ? (await this.getBotOrThrow(dto.botConfigId)).apiKey
      : this.getGlobalApiKey();

    return this.coze.runWorkflow({
      workflowId: dto.workflowId,
      apiKey: key,
      parameters: dto.parameters,
    });
  }

  // ───────── 文件上传 ─────────

  /** 单文件上传大小上限（5MB） */
  private static readonly MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

  /** 上传文件到 Coze（多模态对话用） */
  async uploadFile(botConfigId: string, file: Buffer, filename: string) {
    // 安全：限制上传文件大小，防止超大 base64 占用内存/带宽
    if (!file || file.length === 0) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "文件内容不能为空");
    }
    if (file.length > BotService.MAX_UPLOAD_BYTES) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "文件大小超过 5MB 上限");
    }
    const bot = await this.getBotOrThrow(botConfigId);
    return this.coze.uploadFile(file, filename, bot.apiKey);
  }

  /** 智能体热度排行 */
  async getRanking(limit = 20) {
    return this.prisma.botConfig.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, avatar: true, intro: true, type: true },
      orderBy: { sortOrder: "asc" },
      take: limit,
    });
  }

  /** 信息流智能体卡片（含动态背景色） */
  async getFeedCards(limit = 6) {
    const bots = await this.prisma.botConfig.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, avatar: true, intro: true, type: true },
      orderBy: { sortOrder: "asc" },
      take: limit,
    });
    const colors = ["#fef3c7", "#dbeafe", "#d1fae5", "#ede9fe", "#fee2e2", "#e0e7ff"];
    return bots.map((b, i) => ({ ...b, bgColor: colors[i % colors.length] }));
  }
}
