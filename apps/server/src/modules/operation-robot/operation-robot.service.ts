import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";
import { SystemService } from "../system/system.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { Cron, CronExpression } from "@nestjs/schedule";

/** 机器人定义 */
interface RobotConfig {
  name: string;
  enabled: boolean;
  frequency: "low" | "medium" | "high";
  description: string;
}

/** 机器人角色 */
type RobotRole = "like_bot" | "comment_bot" | "signin_bot" | "question_bot";

export interface ExecutionLog {
  id: string;
  role: RobotRole;
  action: string;
  result: "success" | "error";
  detail: string;
  createdAt: string;
}

const MAX_LOG_SIZE = 200;
const LOG_PERSIST_KEY = "operation_robot_logs";

@Injectable()
export class OperationRobotService implements OnModuleInit {
  private readonly logger = new Logger(OperationRobotService.name);
  private robotConfigs: Map<RobotRole, RobotConfig> = new Map();
  private botUserIds: Map<RobotRole, string> = new Map();
  private initialized = false;
  /** 执行日志环形缓冲 */
  private executionLogs: ExecutionLog[] = [];
  private logSeq = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: AiGatewayService,
    private readonly systemService: SystemService,
  ) {}

  /** 外部调用的初始化入口 */
  async init() {
    this.initialized = false;
    await this.onModuleInit();
  }

  /** 模块初始化：从 config_system 加载机器人配置，恢复历史日志，确保虚拟用户存在 */
  async onModuleInit() {
    if (this.initialized) return;
    this.initialized = true;

    // 恢复启动前的执行日志
    await this.restoreLogsFromDb();

    try {
      const config = await this.prisma.configSystem.findUnique({
        where: { configKey: "operation_robots" },
      });
      if (config?.configValue) {
        const parsed = JSON.parse(config.configValue) as Record<string, RobotConfig>;
        for (const [role, cfg] of Object.entries(parsed)) {
          this.robotConfigs.set(role as RobotRole, cfg);
        }
      }
    } catch (err) {
      // 使用默认配置
      this.logger.warn(`运营机器人配置加载失败，使用默认配置`, err);
    }

    // 默认配置
    const defaults: Record<RobotRole, RobotConfig> = {
      like_bot: { name: "内容点赞助手", enabled: true, frequency: "medium", description: "对新内容自动点赞" },
      comment_bot: { name: "评论互动助手", enabled: true, frequency: "low", description: "对热门内容生成AI评论" },
      signin_bot: { name: "圈子签到助手", enabled: true, frequency: "low", description: "在低活跃度圈子发布话题帖" },
      question_bot: { name: "问题提问助手", enabled: false, frequency: "low", description: "在付费问答板块提出高质量问题" },
    };

    for (const [role, cfg] of Object.entries(defaults)) {
      if (!this.robotConfigs.has(role as RobotRole)) {
        this.robotConfigs.set(role as RobotRole, cfg);
      }
    }

    // 确保每个机器人有一个系统虚拟用户
    for (const [role, cfg] of this.robotConfigs) {
      if (!cfg.enabled) continue;
      const systemUserId = `BOT_${role}`;
      const exists = await this.prisma.user.findUnique({ where: { id: systemUserId } }).catch(() => null);
      if (!exists) {
        try {
          await this.prisma.user.create({
            data: {
              id: systemUserId,
              nickname: `${cfg.name} [AI]`,
              status: "ACTIVE",
            },
          });
        } catch (err) {
          // 可能已存在
          this.logger.warn(`机器人虚拟用户创建失败`, err);
        }
      }
      this.botUserIds.set(role, systemUserId);
    }

    this.logger.log(`虚拟运营机器人初始化完成: ${this.botUserIds.size} 个活跃`);
  }

  // ═══════════════════ 内容点赞机器人 ═══════════════════

  @Cron(CronExpression.EVERY_HOUR)
  async likeBotTask() {
    const cfg = this.robotConfigs.get("like_bot");
    if (!cfg?.enabled) return;

    try {
      // 找到最近1小时新发布的内容
      const recentContents = await this.prisma.content.findMany({
        where: {
          status: "PUBLISHED",
          createdAt: { gte: new Date(Date.now() - 2 * 3600000) },
          likeCount: { lte: 2 }, // 点赞数≤2的冷门内容
        },
        take: 5,
        orderBy: { createdAt: "desc" },
      });

      for (const content of recentContents) {
        const likeCount = Math.ceil(Math.random() * 3); // 1-3个赞
        await this.prisma.content.update({
          where: { id: content.id },
          data: { likeCount: { increment: likeCount } },
        });
        this.logger.log(`点赞机器人: "${content.title}" +${likeCount}赞`);
      }
      this.addLog("like_bot", "定时点赞", "success", `为${recentContents.length}篇内容点赞`);
    } catch (err: any) {
      this.logger.error(`点赞机器人异常: ${err.message}`);
      this.addLog("like_bot", "定时点赞", "error", err.message);
    }
  }

  // ═══════════════════ 评论互动机器人 ═══════════════════

  @Cron(CronExpression.EVERY_2_HOURS)
  async commentBotTask() {
    const cfg = this.robotConfigs.get("comment_bot");
    if (!cfg?.enabled) return;

    try {
      // 找点赞数高但评论数少的热门内容
      const hotContents = await this.prisma.content.findMany({
        where: {
          status: "PUBLISHED",
          likeCount: { gte: 5 },
          createdAt: { gte: new Date(Date.now() - 24 * 3600000) },
        },
        take: 3,
        orderBy: { likeCount: "desc" },
      });

      for (const content of hotContents) {
        const prompt = `请为这篇国学文章写一条50字以内的互动评论，语气像真实读者，表达欣赏或提问。文章标题：${content.title}。文章内容片段：${content.body.slice(0, 300)}。直接输出评论内容，不要多余文字。`;

        const resp = await this.gateway.chat({
          scene: "robot_comment",
          messages: [{ role: "user", content: prompt }],
          options: { temperature: 0.9, maxTokens: 150 },
        });

        const commentText = `[AI互动] ${resp.content.trim()}`;

        // 存入评论（使用 system 评论记录）
        await this.prisma.$executeRawUnsafe(
          `INSERT INTO "Comment" (id, "userId", "targetType", "targetId", content, "createdAt")
           VALUES (gen_random_uuid(), $1, 'CONTENT', $2, $3, NOW())`,
          `BOT_comment_bot`,
          content.id,
          commentText,
        );

        this.logger.log(`评论机器人: "${content.title}" → "${commentText.slice(0, 40)}..."`);
      }
      this.addLog("comment_bot", "定时评论", "success", `为${hotContents.length}篇内容生成评论`);
    } catch (err: any) {
      this.logger.error(`评论机器人异常: ${err.message}`);
      this.addLog("comment_bot", "定时评论", "error", err.message);
    }
  }

  // ═══════════════════ 圈子签到机器人 ═══════════════════

  @Cron(CronExpression.EVERY_12_HOURS)
  async signinBotTask() {
    const cfg = this.robotConfigs.get("signin_bot");
    if (!cfg?.enabled) return;

    try {
      // 找活跃度低的圈子（24小时无新帖）
      const inactiveCircles = await this.prisma.circle.findMany({
        where: {
          status: "ACTIVE",
          posts: { none: { createdAt: { gte: new Date(Date.now() - 24 * 3600000) } } },
        },
        take: 3,
      });

      const topics = [
        "今日话题：分享一个你最近学到的国学知识",
        "每日打卡：今天读了什么好书？来聊聊吧",
        "互动贴：你最喜欢的传统文化是什么？为什么？",
        "话题讨论：如何让年轻人爱上传统文化？",
        "晒一晒：你收藏的最有意义的一件传统物件",
      ];

      for (const circle of inactiveCircles) {
        const topic = topics[Math.floor(Math.random() * topics.length)];
        await this.prisma.post.create({
          data: {
            circleId: circle.id,
            userId: this.botUserIds.get("signin_bot") || "BOT_signin_bot",
            type: "TEXT",
            title: `[AI话题] ${topic}`,
            content: `${topic}\n\n🤖 本话题由AI运营助手自动发布，欢迎圈友踊跃参与讨论。`,
            status: "PUBLISHED",
          },
        });

        this.logger.log(`签到机器人: 圈子"${circle.name}"发布了话题帖`);
      }
      this.addLog("signin_bot", "定时签到", "success", `为${inactiveCircles.length}个圈子发帖`);
    } catch (err: any) {
      this.logger.error(`签到机器人异常: ${err.message}`);
      this.addLog("signin_bot", "定时签到", "error", err.message);
    }
  }

  // ═══════════════════ 提问机器人 ═══════════════════

  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async questionBotTask() {
    const cfg = this.robotConfigs.get("question_bot");
    if (!cfg?.enabled) return;

    try {
      // 找到有开通付费问答的圈子（圈主/嘉宾设置了提问价格）
      const paidMembers = await this.prisma.circleMember.findMany({
        where: {
          role: "OWNER",
          questionPriceCoin: { gt: 0 },
        },
        include: {
          circle: { select: { name: true, categoryLevel1: true } },
        },
        take: 3,
        orderBy: { questionPriceCoin: "desc" },
      });

      if (paidMembers.length === 0) return;

      const botUserId = this.botUserIds.get("question_bot") || "BOT_question_bot";

      // 确保虚拟用户在该圈子中有成员身份
      for (const member of paidMembers) {
        await this.prisma.circleMember.upsert({
          where: { circleId_userId: { circleId: member.circleId, userId: botUserId } },
          create: { circleId: member.circleId, userId: botUserId, role: "MEMBER" },
          update: {},
        }).catch((err: any) => this.logger.warn(`圈子成员注册失败: ${err.message}`));
      }

      for (const member of paidMembers) {
        // 用 AI 生成一个与圈子品类相关的高质量问题
        const topic = member.circle.categoryLevel1 || "国学";
        const prompt = `你是一个热爱${topic}的学习者，请生成一个高质量的专业问题，向老师请教。要求：
1. 问题要具体、有深度，不是泛泛而谈
2. 60字以内
3. 像一个真实用户的提问口吻
4. 只输出问题本身，不要有任何前缀说明`;

        let questionText = "";
        try {
          const resp = await this.gateway.chat({
            scene: "robot_comment",
            messages: [{ role: "user", content: prompt }],
            options: { temperature: 0.9, maxTokens: 120 },
          });
          questionText = resp.content.trim();
        } catch (err: any) {
          // AI生成失败，用预设问题
          this.logger.debug(`AI 问题生成失败: ${err.message}，使用预设问题`);
          const fallbacks = [
            `请问${topic}入门应该从哪些经典开始学习？`,
            `${topic}中最容易被误解的概念是什么？`,
            `能否推荐一本${topic}领域必读的书？`,
          ];
          questionText = fallbacks[Math.floor(Math.random() * fallbacks.length)];
        }

        // 创建付费问答（系统直接写入，不扣费）
        await this.prisma.paidQuestion.create({
          data: {
            circleId: member.circleId,
            askerId: botUserId,
            answererId: member.userId,
            questionTitle: `[AI提问] ${questionText.slice(0, 40)}`,
            question: `${questionText}\n\n🤖 本问题由AI运营助手自动生成，旨在引导高质量知识交流。`,
            priceCoin: member.questionPriceCoin,
            isPublic: true,
            timeoutHours: 72,
            status: "PENDING",
          },
        });

        this.logger.log(`提问机器人: 圈子[${member.circle.name}] → "${questionText.slice(0, 40)}..." (${member.questionPriceCoin}币)`);
      }
      this.addLog("question_bot", "定时提问", "success", `为${paidMembers.length}个圈子生成提问`);
    } catch (err: any) {
      this.logger.error(`提问机器人异常: ${err.message}`);
      this.addLog("question_bot", "定时提问", "error", err.message);
    }
  }

  // ═══════════════════ 管理API ═══════════════════

  /** 获取所有机器人状态 */
  getRobotStatus() {
    const status: Array<{ role: string; name: string; enabled: boolean; frequency: string }> = [];
    for (const [role, cfg] of this.robotConfigs) {
      status.push({ role, name: cfg.name, enabled: cfg.enabled, frequency: cfg.frequency });
    }
    return status;
  }

  // ═══════════════════ 执行日志 ═══════════════════

  private addLog(role: RobotRole, action: string, result: "success" | "error", detail: string) {
    const entry: ExecutionLog = {
      id: `${++this.logSeq}`,
      role,
      action,
      result,
      detail: detail.slice(0, 200),
      createdAt: new Date().toISOString(),
    };
    this.executionLogs.push(entry);
    if (this.executionLogs.length > MAX_LOG_SIZE) {
      this.executionLogs = this.executionLogs.slice(-MAX_LOG_SIZE);
    }
    // 持久化到 DB，重启不丢失
    this.persistLogsToDb().catch((err) => this.logger.warn("日志持久化失败", err));
    this.systemService.logAudit({
      userId: this.botUserIds.get(role) || `BOT_${role}`,
      action: `ROBOT_${action.toUpperCase().replace(/\s/g, "_")}`,
      targetType: "OPERATION_ROBOT",
      targetId: role,
      detail: `[${result}] ${detail.slice(0, 200)}`,
      ip: "127.0.0.1",
    }).catch((err) => this.logger.warn("机器人审计日志写入失败", err));
  }

  /** 持久化执行日志到 DB */
  private async persistLogsToDb() {
    await this.prisma.configSystem.upsert({
      where: { configKey: LOG_PERSIST_KEY },
      create: { configKey: LOG_PERSIST_KEY, configValue: JSON.stringify(this.executionLogs.slice(-MAX_LOG_SIZE)) },
      update: { configValue: JSON.stringify(this.executionLogs.slice(-MAX_LOG_SIZE)) },
    });
  }

  /** 从 DB 恢复执行日志 */
  private async restoreLogsFromDb() {
    try {
      const cfg = await this.prisma.configSystem.findUnique({ where: { configKey: LOG_PERSIST_KEY } });
      if (cfg?.configValue) {
        const restored = JSON.parse(cfg.configValue) as ExecutionLog[];
        this.executionLogs = restored.slice(-MAX_LOG_SIZE);
        this.logSeq = this.executionLogs.length > 0
          ? Math.max(...this.executionLogs.map((l) => parseInt(l.id) || 0))
          : 0;
        this.logger.log(`从DB恢复了 ${this.executionLogs.length} 条机器人执行日志`);
      }
    } catch (err) {
      this.logger.warn("日志恢复失败，从空开始", err);
    }
  }

  /** 获取执行日志 */
  getExecutionLogs(role?: RobotRole, limit = 50) {
    let logs = this.executionLogs;
    if (role) logs = logs.filter((l) => l.role === role);
    return logs.slice(-limit).reverse();
  }

  /** 获取单个机器人详细配置 */
  getRobotConfig(role: RobotRole) {
    const cfg = this.robotConfigs.get(role);
    if (!cfg) return null;
    const prompts: Record<string, string> = {
      like_bot: "对2小时内新发布且点赞≤2的内容，自动点赞1-3个",
      comment_bot: "对24小时内点赞≥5的热门内容，用AI生成50字互动评论",
      signin_bot: "对24小时无新帖的低活跃圈子，自动发布话题签到帖",
      question_bot: "对开通付费问答的圈子，用AI生成高质量问题",
    };
    return {
      role,
      ...cfg,
      prompt: prompts[role] || "无描述",
      userId: this.botUserIds.get(role) || null,
      recentLogs: this.getExecutionLogs(role, 10),
    };
  }

  /** 手动触发指定机器人任务 */
  async triggerRobot(role: RobotRole) {
    const cfg = this.robotConfigs.get(role);
    if (!cfg) return { success: false, error: `未知机器人: ${role}` };
    if (!cfg.enabled) return { success: false, error: `${role} 未启用，请先开启` };

    try {
      switch (role) {
        case "like_bot": await this.likeBotTask(); break;
        case "comment_bot": await this.commentBotTask(); break;
        case "signin_bot": await this.signinBotTask(); break;
        case "question_bot": await this.questionBotTask(); break;
        default: return { success: false, error: `不支持的机器人: ${role}` };
      }
      this.addLog(role, "手动触发", "success", "管理员手动触发执行");
      return { success: true, message: `${role} 手动触发完成` };
    } catch (err: any) {
      this.addLog(role, "手动触发", "error", err.message);
      return { success: false, error: err.message };
    }
  }

  /** 切换机器人开关 */
  async toggleRobot(role: RobotRole, enabled: boolean) {
    const cfg = this.robotConfigs.get(role);
    if (!cfg) throw new BusinessException(ErrorCode.BAD_REQUEST, `未知机器人: ${role}`);

    cfg.enabled = enabled;
    this.robotConfigs.set(role, cfg);

    // 持久化到 config_system
    await this.prisma.configSystem.upsert({
      where: { configKey: "operation_robots" },
      create: {
        configKey: "operation_robots",
        configValue: JSON.stringify(Object.fromEntries(this.robotConfigs)),
      },
      update: {
        configValue: JSON.stringify(Object.fromEntries(this.robotConfigs)),
      },
    });

    this.logger.log(`机器人 [${role}] ${enabled ? "已开启" : "已关闭"}`);
    return { role, enabled };
  }
}
