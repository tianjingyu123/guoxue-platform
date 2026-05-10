import { Injectable, Logger } from "@nestjs/common";
import { createHmac } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";

export type WebhookEvent =
  | "ORDER_PAID"
  | "ORDER_REFUNDED"
  | "USER_REGISTERED"
  | "CONTENT_PUBLISHED"
  | "WITHDRAWAL_REQUESTED"
  | "COURSE_ENROLLED"
  | "LIVE_STARTED"
  | "LIVE_ENDED";

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(private prisma: PrismaService) {}

  /** 注册 Webhook 订阅 */
  async register(params: {
    event: WebhookEvent;
    url: string;
    secret?: string;
    description?: string;
  }) {
    return this.prisma.webhookSubscription.create({
      data: {
        event: params.event as any,
        url: params.url,
        secret: params.secret,
        description: params.description,
      },
    });
  }

  /** 取消订阅 */
  async unregister(id: string) {
    await this.prisma.webhookSubscription.delete({ where: { id } });
    return { success: true };
  }

  /** 查询订阅列表 */
  async list(event?: WebhookEvent) {
    return this.prisma.webhookSubscription.findMany({
      where: event ? { event: event as any } : undefined,
      orderBy: { createdAt: "desc" },
    });
  }

  /** 手动更新订阅状态 */
  async toggleActive(id: string, isActive: boolean) {
    return this.prisma.webhookSubscription.update({
      where: { id },
      data: { isActive },
    });
  }

  /** 触发事件：向所有匹配的活跃订阅发送 Webhook */
  async fire(event: WebhookEvent, payload: Record<string, any>) {
    const subs = await this.prisma.webhookSubscription.findMany({
      where: { event: event as any, isActive: true },
    });

    if (subs.length === 0) return;

    const body = JSON.stringify({
      event,
      timestamp: Date.now(),
      data: payload,
    });

    // 并行分发（每个订阅独立重试，互不影响）
    const results = await Promise.allSettled(
      subs.map((sub) => this.deliver(sub.id, sub.url, sub.secret || undefined, body)),
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    this.logger.log(`Webhook ${event}: ${succeeded}/${subs.length} 发送成功`);
  }

  /** 单次投递 + 重试 */
  private async deliver(
    subId: string,
    url: string,
    secret: string | undefined,
    body: string,
  ): Promise<void> {
    const maxRetries = 3;
    let lastError: Error | null = null;
    let statusCode = 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "User-Agent": "GuoXue-Webhook/1.0",
        };

        // HMAC-SHA256 签名
        if (secret) {
          const signature = createHmac("sha256", secret).update(body).digest("hex");
          headers["X-Webhook-Signature"] = `sha256=${signature}`;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const resp = await fetch(url, {
          method: "POST",
          headers,
          body,
          signal: controller.signal,
        });

        clearTimeout(timeout);
        statusCode = resp.status;

        if (resp.ok) {
          await this.updateStatus(subId, statusCode);
          return;
        }

        lastError = new Error(`HTTP ${resp.status}`);
      } catch (err: any) {
        lastError = err;
        statusCode = 0;
      }

      // 指数退避：1s, 2s, 4s
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
      }
    }

    // 所有重试失败
    await this.updateStatus(subId, statusCode);
    this.logger.warn(`Webhook 投递失败: ${url} — ${lastError?.message}`);
  }

  /** 更新订阅的最后发送状态 */
  private async updateStatus(subId: string, statusCode: number) {
    try {
      await this.prisma.webhookSubscription.update({
        where: { id: subId },
        data: {
          lastSentAt: new Date(),
          lastStatus: statusCode,
          retryCount: { increment: 1 },
        },
      });
    } catch {
      // 状态更新失败不影响主流程
    }
  }

  /** HMAC-SHA256 签名（供接收方验证使用） */
  static sign(payload: string, secret: string): string {
    return createHmac("sha256", secret).update(payload).digest("hex");
  }
}
