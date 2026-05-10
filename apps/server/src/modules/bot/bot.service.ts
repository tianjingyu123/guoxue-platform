import { Injectable, NotFoundException, Logger, BadRequestException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CozeService } from "./coze.service";
import { CreateBotDto, UpdateBotDto, BindBotToCircleDto, AddKnowledgeDto, ChatDto } from "./bot.dto";

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);

  constructor(
    private prisma: PrismaService,
    private coze: CozeService,
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
        apiKey: dto.apiKey,
        isFree: dto.isFree ?? true,
        dailyLimit: dto.dailyLimit ?? 5,
        price: dto.price,
        monthlyPrice: dto.monthlyPrice,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async update(id: string, dto: UpdateBotDto) {
    return this.prisma.botConfig.update({ where: { id }, data: dto as Prisma.BotConfigUpdateInput });
  }

  async delete(id: string) {
    await this.prisma.botConfig.delete({ where: { id } });
    return { success: true };
  }

  async list(type?: string) {
    const where: Prisma.BotConfigWhereInput = { status: "ACTIVE" };
    if (type) where.type = type;

    return this.prisma.botConfig.findMany({
      where,
      orderBy: { sortOrder: "asc" },
    });
  }

  async getDetail(id: string) {
    const bot = await this.prisma.botConfig.findUnique({
      where: { id },
      include: {
        circleBots: { include: { circle: { select: { id: true, name: true } } } },
        knowledgeBases: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!bot) throw new NotFoundException("智能体不存在");
    return bot;
  }

  // ───────── 圈子绑定 ─────────

  async bindToCircle(botConfigId: string, dto: BindBotToCircleDto) {
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
    return this.prisma.circleBot.findUnique({
      where: { circleId },
      include: { botConfig: true },
    });
  }

  // ───────── 知识库 ─────────

  async addKnowledge(botConfigId: string, dto: AddKnowledgeDto) {
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

  async deleteKnowledge(knowledgeId: string) {
    await this.prisma.botKnowledgeBase.delete({ where: { id: knowledgeId } });
    return { success: true };
  }

  // ───────── COZE 对话 ─────────

  /** 获取智能体配置（含API密钥）—— 公开方法，供控制器流式调用 */
  async getBotForChat(id: string) {
    return this.getBotOrThrow(id);
  }

  /** 获取智能体配置（含API密钥） */
  private async getBotOrThrow(id: string) {
    const bot = await this.prisma.botConfig.findUnique({ where: { id } });
    if (!bot) throw new NotFoundException("智能体不存在");
    if (!bot.apiKey || !bot.botId) throw new BadRequestException("智能体未配置API密钥");
    return bot;
  }

  /** 非流式对话 */
  async chat(botConfigId: string, userId: string, dto: ChatDto) {
    const bot = await this.getBotOrThrow(botConfigId);

    const dailyCount = await this.getUserDailyCount(userId, botConfigId);
    if (!bot.isFree && dailyCount >= bot.dailyLimit) {
      throw new BadRequestException(`今日对话次数已达上限（${bot.dailyLimit}次）`);
    }

    const result = await this.coze.chat({
      botId: bot.botId,
      apiKey: bot.apiKey,
      userId,
      query: dto.query,
      conversationId: dto.conversationId,
    });

    await this.prisma.botChatLog.create({
      data: {
        userId,
        botConfigId,
        query: dto.query,
        response: result.content as string,
        conversationId: result.conversationId,
        chatId: result.chatId,
      },
    });

    return result;
  }

  /** 流式对话（返回 Observable，控制器处理为SSE） */
  chatStream(botConfigId: string, userId: string, dto: ChatDto) {
    // 需在控制器层异步获取bot配置后传递
    return this.coze.chatStream;
  }

  /** 获取对话历史 */
  async getChatHistory(botConfigId: string, conversationId: string) {
    const bot = await this.getBotOrThrow(botConfigId);

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
    this.logger.log(`查询圈主助理审批列表: page=${page}, pageSize=${pageSize}`);

    const where = { status: { not: "ACTIVE" } };
    const [records, total] = await Promise.all([
      this.prisma.circleBot.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
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
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
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
    this.logger.log(`查询圈主助理知识库: circleId=${circleId}`);

    const circleBot = await this.prisma.circleBot.findUnique({
      where: { circleId },
    });
    if (!circleBot) {
      return { items: [], total: 0, page, pageSize, totalPages: 0 };
    }

    const where = { botConfigId: circleBot.botConfigId };
    const [records, total] = await Promise.all([
      this.prisma.botKnowledgeBase.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.botKnowledgeBase.count({ where }),
    ]);

    return {
      items: records,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /** 添加圈主助理知识库条目 */
  async addBotKnowledge(circleId: string, dto: { question: string; answer: string }) {
    this.logger.log(`添加圈主助理知识库: circleId=${circleId}`);

    const circleBot = await this.prisma.circleBot.findUnique({
      where: { circleId },
    });
    if (!circleBot) {
      throw new BadRequestException("该圈子未开通圈主助理");
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
    const data: Prisma.BotKnowledgeBaseUpdateInput = {};
    if (dto.question !== undefined) data.title = dto.question;
    if (dto.answer !== undefined) data.content = dto.answer;

    return this.prisma.botKnowledgeBase.update({
      where: { id: knowledgeId },
      data,
    });
  }

  /** 获取圈主助理使用数据 */
  async getBotUsageData(circleId: string) {
    this.logger.log(`查询圈主助理使用数据: circleId=${circleId}`);

    const circleBot = await this.prisma.circleBot.findUnique({
      where: { circleId },
    });
    if (!circleBot) {
      throw new BadRequestException("该圈子未开通圈主助理");
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
}
