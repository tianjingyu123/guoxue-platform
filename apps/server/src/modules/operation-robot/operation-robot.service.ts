import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";
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

@Injectable()
export class OperationRobotService {
  private readonly logger = new Logger(OperationRobotService.name);
  private robotConfigs: Map<RobotRole, RobotConfig> = new Map();
  private botUserIds: Map<RobotRole, string> = new Map();
  private initialized = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: AiGatewayService,
  ) {}

  /** 初始化：从 config_system 加载机器人配置，确保虚拟用户存在 */
  async init() {
    if (this.initialized) return;
    this.initialized = true;

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
    } catch {
      // 使用默认配置
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
        } catch {
          // 可能已存在
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
          data: { likeCount: content.likeCount + likeCount },
        });
        this.logger.log(`点赞机器人: "${content.title}" +${likeCount}赞`);
      }
    } catch (err: any) {
      this.logger.error(`点赞机器人异常: ${err.message}`);
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
    } catch (err: any) {
      this.logger.error(`评论机器人异常: ${err.message}`);
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
    } catch (err: any) {
      this.logger.error(`签到机器人异常: ${err.message}`);
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
        }).catch(() => {});
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
        } catch {
          // AI生成失败，用预设问题
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
    } catch (err: any) {
      this.logger.error(`提问机器人异常: ${err.message}`);
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

  /** 切换机器人开关 */
  async toggleRobot(role: RobotRole, enabled: boolean) {
    const cfg = this.robotConfigs.get(role);
    if (!cfg) throw new Error(`未知机器人: ${role}`);

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
