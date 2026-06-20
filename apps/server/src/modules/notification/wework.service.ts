import { Injectable, Logger } from "@nestjs/common";

/**
 * 企业微信机器人 Webhook 服务
 * 用于向管理员群发送实时告警：新订单、违规内容、提现申请等
 */
@Injectable()
export class WeworkService {
  private readonly logger = new Logger(WeworkService.name);
  private readonly webhookUrls: string[] = [];

  constructor() {
    // 支持多个webhook（开发群/运营群/告警群）
    const url1 = process.env.WEWORK_WEBHOOK_URL || "";
    const url2 = process.env.WEWORK_WEBHOOK_ALERT_URL || "";

    if (url1) this.webhookUrls.push(url1);
    if (url2) this.webhookUrls.push(url2);

    if (this.webhookUrls.length === 0) {
      this.logger.warn("企业微信Webhook未配置，机器人通知将不可用");
    }
  }

  /** 发送文本消息 */
  async sendText(content: string, mentionedList?: string[]) {
    const body: Record<string, unknown> = {
      msgtype: "text",
      text: {
        content,
        mentioned_list: mentionedList || [],
      },
    };
    return this.broadcast(body);
  }

  /** 发送Markdown消息 */
  async sendMarkdown(content: string) {
    const body = {
      msgtype: "markdown",
      markdown: { content },
    };
    return this.broadcast(body);
  }

  /** 发送图文消息 */
  async sendNews(articles: Array<{
    title: string;
    description?: string;
    url: string;
    picurl?: string;
  }>) {
    const body = {
      msgtype: "news",
      news: { articles },
    };
    return this.broadcast(body);
  }

  // ───────── 业务快捷通知 ─────────

  /** 新订单通知 */
  async notifyNewOrder(params: {
    orderId: string;
    amount: string;
    product: string;
    user: string;
    adminUrl: string;
  }) {
    const content = `## 🛒 新订单通知\n> 订单编号: ${params.orderId}\n> 商品: ${params.product}\n> 金额: ¥${params.amount}\n> 用户: ${params.user}\n\n[查看订单](${params.adminUrl})`;
    return this.sendMarkdown(content);
  }

  /** 违规内容告警 */
  async notifyViolation(params: {
    type: string;
    id: string;
    reason: string;
    user: string;
    adminUrl: string;
  }) {
    const content = `## 🚨 违规内容告警\n> 类型: ${params.type}\n> ID: ${params.id}\n> 原因: ${params.reason}\n> 用户: ${params.user}\n\n[处理](${params.adminUrl})`;
    return this.sendMarkdown(content).catch((err) => this.logger.warn("企微通知发送失败", err));
  }

  /** 提现申请通知 */
  async notifyWithdraw(params: {
    userId: string;
    userName: string;
    amount: string;
    adminUrl: string;
  }) {
    const content = `## 💰 提现申请\n> 用户: ${params.userName}\n> 金额: ¥${params.amount}\n\n[审核](${params.adminUrl})`;
    return this.sendMarkdown(content);
  }

  /** 系统异常告警 */
  async notifyAlert(title: string, detail: string) {
    const content = `## ⚠️ 系统告警\n**${title}**\n${detail}\n时间: ${new Date().toLocaleString("zh-CN")}`;
    return this.sendMarkdown(content);
  }

  /** 广播到所有配置的webhook */
  private async broadcast(body: Record<string, unknown>) {
    const results: Record<string, unknown>[] = [];
    for (const url of this.webhookUrls) {
      try {
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await resp.json() as Record<string, unknown>;
        results.push(data);
      } catch (err: unknown) {
        this.logger.error("企业微信消息发送失败", (err as Error).message);
      }
    }
    return results;
  }
}
