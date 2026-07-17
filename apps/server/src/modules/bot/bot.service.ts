import { Injectable, Logger, Optional } from "@nestjs/common";
import { Observable } from "rxjs";
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
import { CoinService } from "../coin/coin.service";

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);

  constructor(
    private prisma: PrismaService,
    private coze: CozeService,
    private reco: RecommendationService,
    @Optional() private coin?: CoinService,
  ) {}

  // ───────── AI 计费（2026-07-03 拍板）：会员免费；非会员 freeUses 次试用 → pricePer10Coin 币购追问包（10次/包）─────────

  /** 是否有效会员（终身会员 memberExpire 为空；到期视为失效） */
  private async isActiveMember(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { memberLevel: true, memberExpire: true },
    });
    if (!user?.memberLevel || user.memberLevel === "NONE") return false;
    return !user.memberExpire || user.memberExpire > new Date();
  }

  /** 追问额度检查与消耗（chat 与 chat/stream 共用）；耗尽抛出购买/开通会员引导 */
  async consumeQuota(botConfigId: string, userId: string): Promise<"free_bot" | "member" | "trial" | "paid"> {
    const bot = await this.getBotOrThrow(botConfigId);
    if (!bot.pricePer10Coin || bot.pricePer10Coin <= 0) return "free_bot"; // 免费智能体（仍受既有 dailyLimit 约束）
    if (await this.isActiveMember(userId)) return "member"; // 会员权益：全部智能体免费

    const quota = await this.prisma.userBotQuota.upsert({
      where: { userId_botConfigId: { userId, botConfigId } },
      create: { userId, botConfigId },
      update: {},
    });
    if (quota.freeUsed < (bot.freeUses ?? 0)) {
      await this.prisma.userBotQuota.update({ where: { id: quota.id }, data: { freeUsed: { increment: 1 } } });
      return "trial";
    }
    // 原子条件扣减，防并发透支
    const consumed = await this.prisma.userBotQuota.updateMany({
      where: { id: quota.id, paidRemaining: { gt: 0 } },
      data: { paidRemaining: { decrement: 1 } },
    });
    if (consumed.count > 0) return "paid";
    throw new BusinessException(
      ErrorCode.BAD_REQUEST,
      `免费追问次数已用完：可购买追问包（${bot.pricePer10Coin}币/10次），或开通会员畅享全部智能体`,
    );
  }

  /** 我的追问额度（对话页展示余量与定价） */
  async getQuota(botConfigId: string, userId: string) {
    const bot = await this.getBotOrThrow(botConfigId);
    const [memberFree, quota] = await Promise.all([
      this.isActiveMember(userId),
      this.prisma.userBotQuota.findUnique({ where: { userId_botConfigId: { userId, botConfigId } } }),
    ]);
    return {
      memberFree,
      pricePer10Coin: bot.pricePer10Coin ?? 0,
      freeUses: bot.freeUses ?? 0,
      freeUsed: quota?.freeUsed ?? 0,
      paidRemaining: quota?.paidRemaining ?? 0,
    };
  }

  /** 购买追问包（10 次/包·扣国学币，CoinService 原子扣减余额不足自抛） */
  async purchaseUses(botConfigId: string, userId: string) {
    const bot = await this.getBotOrThrow(botConfigId);
    if (!bot.pricePer10Coin || bot.pricePer10Coin <= 0) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "该智能体免费使用，无需购买");
    }
    if (!this.coin) throw new BusinessException(ErrorCode.BAD_REQUEST, "计费服务不可用");
    // 扣币与配额发放原子化（同一事务）：扣币成功后崩溃则回滚，杜绝「钱扣包未到」
    const quota = await this.prisma.$transaction(async (tx) => {
      await this.coin!.spend(
        userId,
        {
          // scene 必须是 CoinScene 枚举合法值（曾误写 BOT_USES 致真实落库被 DB 拒绝、购包 500）
          amountCoin: bot.pricePer10Coin!,
          scene: "BOT_CALL",
          refId: botConfigId,
          description: `购买「${bot.name}」追问包(10次)`,
        },
        tx,
      );
      return tx.userBotQuota.upsert({
        where: { userId_botConfigId: { userId, botConfigId } },
        create: { userId, botConfigId, paidRemaining: 10 },
        update: { paidRemaining: { increment: 10 } },
      });
    });
    return { purchased: 10, paidRemaining: quota.paidRemaining };
  }

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

  /** Coze 凭证是否真实可用：种子占位（botId "coze_xx_001"、apiKey "sk_dev_placeholder"）
   *  能过非空校验但一对话必失败——广场不陈列坏品（董事长 2026-07-17 拍板下架不能用的） */
  private isConfigured(bot: { botId: string; apiKey: string }): boolean {
    if (!bot.botId || !bot.apiKey) return false;
    if (bot.apiKey === "sk_dev_placeholder") return false;
    // 真实 Coze bot_id 是纯数字长串；种子占位是 "coze_customer_001" 一类
    if (/^coze_/i.test(bot.botId)) return false;
    return true;
  }

  async list(type?: string) {
    const where: Prisma.BotConfigWhereInput = { status: "ACTIVE" };
    if (type) where.type = type;

    const bots = await this.prisma.botConfig.findMany({
      where,
      orderBy: { sortOrder: "asc" },
      take: 100,
    });
    // C 端只下发真实可对话的智能体（占位凭证=下架）；apiKey 不对外暴露
    return bots
      .filter((b) => this.isConfigured(b))
      .map(({ apiKey: _apiKey, ...rest }) => rest);
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

    // AI 计费（2026-07-03 拍板）：会员免费/试用/追问包，额度耗尽在此拦截
    await this.consumeQuota(botConfigId, userId);

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

  /** 流式对话前置校验（与非流式 chat 同一套门控：每日限次 + AI 计费额度），先于 SSE 头执行 */
  async precheckChat(botConfigId: string, userId: string) {
    const bot = await this.getBotOrThrow(botConfigId);
    const dailyCount = await this.getUserDailyCount(userId, botConfigId);
    if (!bot.isFree && dailyCount >= bot.dailyLimit) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, `今日对话次数已达上限（${bot.dailyLimit}次）`);
    }
    await this.consumeQuota(botConfigId, userId);
    return bot;
  }

  /**
   * 流式对话（富事件版）：与非流式 chat 同一套审计/导流/免责闭环。
   * - chunk：文本增量（尾部滞留过滤 `<!--RECO:...-->` 软性导流协议标记，不让协议漏上屏）
   * - meta：流末下发 conversationId（续聊）+ disclaimer + recommendation（软性导流）
   * - 审计：完整净文本落 BotChatLog（与非流式同表同结构）
   */
  chatStreamRich(
    bot: { id: string; botId: string; apiKey: string },
    userId: string,
    dto: ChatDto,
  ): Observable<{ type: "chunk" | "meta"; content?: string; conversationId?: string; disclaimer?: string; recommendation?: unknown }> {
    return new Observable((subscriber) => {
      let full = ""; // 完整原始回复（含协议标记，用于导流解析与审计）
      let held = ""; // 尾部滞留缓冲：疑似 `<!--` 协议标记开头后暂停外发
      let conversationId = dto.conversationId || "";
      let chatId: string | undefined;

      /** 输出安全前缀：可外发部分立即 emit，协议标记起点及其后滞留 */
      const emitSafe = (s: string) => {
        const idx = s.indexOf("<!--");
        if (idx >= 0) {
          // 命中协议标记起点：之前的照发，标记及其后全部滞留（协议约定标记在回复末尾）
          if (idx > 0) subscriber.next({ type: "chunk", content: s.slice(0, idx) });
          held = s.slice(idx);
          return;
        }
        // 尾部可能是 "<"、"<!"、"<!-" 的半截标记：滞留等下一块拼上再判
        let cut = s.length;
        for (let k = Math.min(3, s.length); k >= 1; k--) {
          if ("<!--".startsWith(s.slice(s.length - k))) {
            cut = s.length - k;
            break;
          }
        }
        if (cut > 0) subscriber.next({ type: "chunk", content: s.slice(0, cut) });
        held = s.slice(cut);
      };

      const sub = this.coze
        .chatStreamEx({ botId: bot.botId, apiKey: bot.apiKey, userId, query: dto.query, conversationId: dto.conversationId })
        .subscribe({
          next: (ev) => {
            if (ev.type === "meta") {
              if (ev.conversationId) conversationId = ev.conversationId;
              chatId = ev.chatId;
              return;
            }
            if (ev.type === "chunk" && ev.content) {
              full += ev.content;
              emitSafe(held + ev.content);
            }
          },
          error: (err) => subscriber.error(err),
          complete: () => {
            void (async () => {
              try {
                // 软性导流解析（剥离协议标记）+ 审计落库 —— 与非流式 chat 同一闭环
                const { content: cleanContent, recommendation } = await this.reco.build(full, dto.query);
                // 滞留尾巴若非协议标记（真实内容含 <!--），净文本比已发的长 → 把缺发部分补发
                const alreadySent = full.length - held.length;
                if (cleanContent.length > alreadySent) {
                  subscriber.next({ type: "chunk", content: cleanContent.slice(alreadySent) });
                }
                await this.prisma.botChatLog.create({
                  data: {
                    userId,
                    botConfigId: bot.id,
                    query: dto.query,
                    response: cleanContent,
                    conversationId: conversationId || undefined,
                    chatId: chatId || undefined,
                  },
                });
                subscriber.next({
                  type: "meta",
                  conversationId: conversationId || undefined,
                  disclaimer: RISK_DISCLAIMER,
                  recommendation: recommendation || undefined,
                });
              } catch (err) {
                this.logger.warn(`流式对话收尾处理失败（不影响已下发内容）: ${(err as Error).message}`);
              } finally {
                subscriber.complete();
              }
            })();
          },
        });
      return () => sub.unsubscribe();
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

    const where = { status: { notIn: ["ACTIVE", "REJECTED"] } };
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

  /** 驳回圈主助理开通申请（驳回原因仅记审计日志，CircleBot 不落 reason 列） */
  async rejectBot(circleId: string, reason?: string) {
    this.logger.log(`驳回圈主助理开通: circleId=${circleId} reason=${reason || "-"}`);
    const circleBot = await this.prisma.circleBot.findUnique({ where: { circleId } });
    if (!circleBot) {
      throw new BusinessException(ErrorCode.NOT_FOUND, "该圈子暂无助理开通申请");
    }
    return this.prisma.circleBot.update({
      where: { circleId },
      data: { status: "REJECTED" },
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
    const bots = await this.prisma.botConfig.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, avatar: true, intro: true, type: true },
      orderBy: { sortOrder: "asc" },
      take: limit,
    });
    // 真实热度：按对话日志聚合（chatCount 对话次数 / userCount 使用人数），热度优先、同热度按后台权重
    const [byChats, byUsers] = await Promise.all([
      this.prisma.botChatLog.groupBy({
        by: ["botConfigId"],
        _count: { _all: true },
        where: { botConfigId: { in: bots.map((b) => b.id) } },
      }),
      this.prisma.botChatLog.groupBy({
        by: ["botConfigId", "userId"],
        where: { botConfigId: { in: bots.map((b) => b.id) } },
      }),
    ]);
    const chatMap = new Map(byChats.map((g) => [g.botConfigId, g._count._all]));
    const userMap = new Map<string, number>();
    for (const g of byUsers) userMap.set(g.botConfigId, (userMap.get(g.botConfigId) || 0) + 1);
    return bots
      .map((b) => ({ ...b, chatCount: chatMap.get(b.id) || 0, userCount: userMap.get(b.id) || 0 }))
      .sort((a, b) => b.chatCount - a.chatCount);
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
