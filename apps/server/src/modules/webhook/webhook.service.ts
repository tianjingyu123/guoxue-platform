import { Injectable, Logger } from "@nestjs/common";
import { createHmac } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";

/** 内网/私有 IP 段，防 SSRF */
const BLOCKED_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^0\./,
  /^169\.254\./,
  /^fc00:/i,
  /^fe80:/i,
  /^::1$/,
];

/** 验证 Webhook URL 合法性，防 SSRF */
async function validateWebhookUrl(url: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new BusinessException(ErrorCode.BAD_REQUEST, "URL 格式不合法");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new BusinessException(ErrorCode.BAD_REQUEST, "仅支持 http/https 协议");
  }

  const hostname = parsed.hostname.toLowerCase();
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "0.0.0.0") {
    throw new BusinessException(ErrorCode.BAD_REQUEST, "不允许使用本地回环地址");
  }

  // 测试环境跳过真实 DNS 解析（单测不应依赖网络）；协议/回环/格式校验仍生效
  if (process.env.NODE_ENV === "test") return;

  try {
    const lookupResult = await import("dns/promises").then((dns) =>
      dns.lookup(parsed.hostname!, { family: 4 }),
    ).catch(() => null);

    // DNS 解析失败：fail-closed 拒绝（原先 lookupResult 为 null 时跳过校验=放行，存在 SSRF 风险）
    if (!lookupResult) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "无法解析 Webhook 目标地址");
    }
    const resolved = lookupResult.address;
    for (const pattern of BLOCKED_IP_PATTERNS) {
      if (pattern.test(resolved)) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "不允许使用内网地址");
      }
    }
  } catch (err) {
    if (err instanceof BusinessException) throw err;
    throw new BusinessException(ErrorCode.BAD_REQUEST, "无法解析 Webhook 目标地址");
  }
}

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
    await validateWebhookUrl(params.url);
    return this.prisma.webhookSubscription.create({
      data: {
        event: params.event,
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
      where: event ? { event: event } : undefined,
      orderBy: { createdAt: "desc" },
    });
  }

  /** 编辑订阅配置 */
  async update(id: string, params: { url?: string; secret?: string; description?: string }) {
    if (params.url) await validateWebhookUrl(params.url);
    const data: Record<string, unknown> = {};
    if (params.url !== undefined) data.url = params.url;
    if (params.secret !== undefined) data.secret = params.secret;
    if (params.description !== undefined) data.description = params.description;

    return this.prisma.webhookSubscription.update({ where: { id }, data });
  }

  /** 手动更新订阅状态 */
  async toggleActive(id: string, isActive: boolean) {
    return this.prisma.webhookSubscription.update({
      where: { id },
      data: { isActive },
    });
  }

  /** 触发事件：向所有匹配的活跃订阅发送 Webhook */
  async fire(event: WebhookEvent, payload: Record<string, unknown>) {
    const subs = await this.prisma.webhookSubscription.findMany({
      where: { event: event, isActive: true },
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
    // 实发前二次校验 URL（防 TOCTOU / DNS-rebinding：注册时校验通过后域名可能被重绑到内网）
    try {
      await validateWebhookUrl(url);
    } catch {
      await this.updateStatus(subId, 0);
      this.logger.warn(`Webhook 目标地址校验失败，跳过投递: ${url}`);
      return;
    }
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
          redirect: "manual", // 禁止跟随重定向，防 302 跳转到内网/云元数据绕过 SSRF 校验
        });

        clearTimeout(timeout);
        statusCode = resp.status;

        if (resp.ok) {
          await this.updateStatus(subId, statusCode);
          return;
        }

        lastError = new Error(`HTTP ${resp.status}`);
      } catch (err: unknown) {
        lastError = err as Error;
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
    } catch (err: any) {
      // 状态更新失败不影响主流程
      this.logger.warn(`Webhook 状态更新失败: ${err.message}`);
    }
  }

  /** HMAC-SHA256 签名（供接收方验证使用） */
  static sign(payload: string, secret: string): string {
    return createHmac("sha256", secret).update(payload).digest("hex");
  }
}
