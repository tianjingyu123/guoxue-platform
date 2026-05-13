import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";
import { PushService } from "./push.service";

interface SmartPushDecision {
  shouldPush: boolean;
  timing: string;
  title: string;
  content: string;
  reason: string;
}

/**
 * AI 智能 Push 系统
 *
 * AI 选择最佳推送时间、生成个性化文案、控制推送频次。
 * 在现有 PushService 基础上增加 AI 决策层。
 */
@Injectable()
export class SmartPushService {
  private readonly logger = new Logger(SmartPushService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: AiGatewayService,
    private readonly push: PushService,
  ) {}

  /** AI 决策是否推送 + 生成文案 */
  async decidePush(
    userId: string,
    pushType: "daily_remind" | "new_content" | "course_update" | "event_notice",
    context?: Record<string, string>,
  ): Promise<SmartPushDecision> {
    const profile = await this.getUserPushProfile(userId);

    // 频次控制
    const lastPush = await this.prisma.notification.findFirst({
      where: { userId, type: "SYSTEM", createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      orderBy: { createdAt: "desc" },
    });

    if (lastPush) {
      const hoursSinceLastPush = (Date.now() - lastPush.createdAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastPush < 4) {
        return { shouldPush: false, timing: "", title: "", content: "", reason: `距上次推送仅${hoursSinceLastPush.toFixed(1)}小时` };
      }
    }

    // AI 决策
    try {
      const result = await this.gateway.chat({
        scene: "smart_push",
        userId,
        messages: [
          {
            role: "system",
            content: `你是推送决策助手。根据用户画像决定是否推送、何时推送、推送什么文案。
用户画像: 活跃时段=${profile.activeHours}, 兴趣=${profile.interests}, 推送类型=${pushType}
规则: 1) 避免深夜推送(23:00-07:00) 2) 每条推送≤30字 3) 个性化文案 4) 每天最多2条
请以JSON格式回复: {"shouldPush": true/false, "timing": "建议时间段", "title": "标题", "content": "文案", "reason": "决策理由"}`,
          },
          { role: "user", content: JSON.stringify({ pushType, context }) },
        ],
        options: { temperature: 0.5, maxTokens: 256 },
      });

      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as SmartPushDecision;
      }
    } catch (err) {
      this.logger.warn("AI推送决策失败，使用默认策略", err);
    }

    return {
      shouldPush: true,
      timing: profile.activeHours || "10:00-12:00",
      title: this.defaultTitle(pushType),
      content: this.defaultContent(pushType, context),
      reason: "默认推送策略",
    };
  }

  /** 为用户生成个性化的每日推送 */
  async generateDailyPush(userId: string): Promise<{ sent: boolean; error?: string }> {
    const auth = await this.prisma.auth.findFirst({
      where: { userId, provider: "WECHAT", openId: { not: null } },
      select: { openId: true },
    });
    if (!auth?.openId) return { sent: false, error: "无openid" };

    const decision = await this.decidePush(userId, "daily_remind");
    if (!decision.shouldPush) return { sent: false, error: "频控限制" };

    try {
      await this.push.sendMiniSubscribeMsg({
        touser: auth.openId,
        templateId: "daily_remind_template",
        data: {
          thing1: { value: decision.title.slice(0, 20) },
          thing2: { value: decision.content.slice(0, 20) },
        },
      });
      this.logger.log(`智能Push发送成功: userId=${userId}`);
      return { sent: true };
    } catch (err: any) {
      this.logger.error(`智能Push发送失败: ${err.message}`);
      return { sent: false, error: err.message };
    }
  }

  // ─── 私有方法 ───

  private async getUserPushProfile(userId: string): Promise<{ activeHours: string; interests: string }> {
    const interests = await this.prisma.userInterest.findMany({
      where: { userId },
      orderBy: { score: "desc" },
      take: 5,
    });

    const recentActivity = await this.prisma.aiAnalysisRecord.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    const hour = recentActivity ? recentActivity.createdAt.getHours() : 10;
    const activeHours = `${String(Math.max(0, hour - 1)).padStart(2, "0")}:00-${String(Math.min(23, hour + 1)).padStart(2, "0")}:00`;

    return {
      activeHours,
      interests: interests.map((i) => i.tag).join(",") || "国学",
    };
  }

  private defaultTitle(type: string): string {
    const titles: Record<string, string> = {
      daily_remind: "今日国学经典",
      new_content: "新内容推荐",
      course_update: "课程更新提醒",
      event_notice: "活动通知",
    };
    return titles[type] || "热卜国学";
  }

  private defaultContent(type: string, _context?: Record<string, string>): string {
    const contents: Record<string, string> = {
      daily_remind: "点击查看今日国学精选",
      new_content: "你关注的圈子有新内容",
      course_update: "你学习的课程有更新",
      event_notice: "有新活动等你参与",
    };
    return contents[type] || "点击查看详情";
  }
}
