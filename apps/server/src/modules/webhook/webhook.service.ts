import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { createHash, createHmac } from "crypto";
import { Prisma } from "@prisma/client";
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
  | "WITHDRAWAL_PAID"
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

  /**
   * 触发事件：先写入事务外发箱，再异步尝试投递。
   * 调用方只需等待外发箱落库，不会被第三方接口的 10 秒超时拖住；
   * 即使服务随后重启，定时任务也会继续补偿。
   */
  async fire(event: WebhookEvent, payload: Record<string, unknown>) {
    const subs = await this.prisma.webhookSubscription.findMany({
      where: { event: event, isActive: true },
    });

    if (subs.length === 0) return;

    // JSON 往返既收窄 Prisma 类型，也剔除 undefined 等数据库 JSON 不支持的值。
    const envelope = JSON.parse(JSON.stringify({
      event,
      timestamp: Date.now(),
      data: payload,
    })) as Prisma.InputJsonValue;
    const eventKey = this.buildEventKey(event, payload);

    // subscriptionId + eventKey 唯一：支付渠道重复回调不会重复通知下游。
    const queued = await Promise.all(
      subs.map(async (sub) => {
        const delivery = await this.prisma.webhookDelivery.upsert({
          where: { subscriptionId_eventKey: { subscriptionId: sub.id, eventKey } },
          update: {},
          create: {
            subscriptionId: sub.id,
            event,
            eventKey,
            payload: envelope,
          },
        });
        return { delivery, subscription: sub };
      }),
    );

    // 不阻塞支付/退款主链路；外发箱已经落库，失败或进程重启后会由 cron 补偿。
    queueMicrotask(() => {
      void Promise.allSettled(
        queued.map(({ delivery, subscription }) => this.attemptDelivery(delivery, subscription)),
      );
    });
  }

  /** 每分钟补偿未成功投递的事件，并回收进程中断后遗留的 PROCESSING 任务。 */
  @Cron(CronExpression.EVERY_MINUTE, { name: "retryPendingWebhookDeliveries" })
  async retryPendingDeliveries(): Promise<void> {
    const now = new Date();
    const processingExpiredAt = new Date(now.getTime() - 5 * 60 * 1000);
    const deliveries = await this.prisma.webhookDelivery.findMany({
      where: {
        subscription: { isActive: true },
        OR: [
          { status: "PENDING", nextAttemptAt: { lte: now } },
          { status: "PROCESSING", lastAttemptAt: { lt: processingExpiredAt } },
        ],
      },
      include: { subscription: true },
      orderBy: { nextAttemptAt: "asc" },
      take: 100,
    });

    if (deliveries.length === 0) return;
    const results = await Promise.allSettled(
      deliveries.map((delivery) => this.attemptDelivery(delivery, delivery.subscription)),
    );
    const failed = results.filter((result) => result.status === "rejected").length;
    if (failed > 0) this.logger.warn(`Webhook 补偿任务异常: ${failed}/${deliveries.length}`);
  }

  /** 管理端重试终态失败投递，保留原始事件体和幂等键。 */
  async retryDelivery(id: string) {
    const delivery = await this.prisma.webhookDelivery.findUnique({
      where: { id },
      include: { subscription: true },
    });
    if (!delivery) {
      throw new BusinessException(ErrorCode.NOT_FOUND, "Webhook 投递记录不存在");
    }
    if (delivery.status !== "FAILED") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "仅终态失败的 Webhook 可人工重试");
    }
    if (!delivery.subscription.isActive) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "请先启用对应的 Webhook 订阅");
    }

    const reset = await this.prisma.webhookDelivery.updateMany({
      where: { id, status: "FAILED" },
      data: {
        status: "PENDING",
        attempts: 0,
        nextAttemptAt: new Date(),
        lastError: null,
      },
    });
    if (reset.count === 0) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "投递状态已变化，请刷新后重试");
    }
    const pendingDelivery = { ...delivery, status: "PENDING", attempts: 0, nextAttemptAt: new Date() };
    queueMicrotask(() => {
      void this.attemptDelivery(pendingDelivery, delivery.subscription);
    });
    return { success: true, id };
  }

  /** 管理端查询逐笔投递审计。 */
  async listDeliveries(params: { subscriptionId?: string; status?: string; take?: number }) {
    const requestedTake = Number(params.take);
    const take = Number.isFinite(requestedTake)
      ? Math.min(Math.max(Math.trunc(requestedTake), 1), 200)
      : 50;
    return this.prisma.webhookDelivery.findMany({
      where: {
        ...(params.subscriptionId ? { subscriptionId: params.subscriptionId } : {}),
        ...(params.status ? { status: params.status } : {}),
      },
      include: {
        subscription: {
          select: { id: true, event: true, url: true, description: true, isActive: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take,
    });
  }

  /** CAS 抢占一笔外发箱任务，保证多实例并行运行时同一事件只由一个实例投递。 */
  private async attemptDelivery(delivery: any, subscription: any): Promise<void> {
    if (delivery.status === "DELIVERED" || subscription?.isActive === false) return;
    const maxAttempts = Math.max(1, Number(subscription.maxRetries ?? 3) + 1);
    if (Number(delivery.attempts || 0) >= maxAttempts) {
      await this.prisma.webhookDelivery.updateMany({
        where: { id: delivery.id, status: { in: ["PENDING", "PROCESSING"] } },
        data: {
          status: "FAILED",
          lastError: delivery.lastError || "已达到最大投递次数",
        },
      });
      return;
    }

    const now = new Date();
    const processingExpiredAt = new Date(now.getTime() - 5 * 60 * 1000);
    const claimed = await this.prisma.webhookDelivery.updateMany({
      where: {
        id: delivery.id,
        attempts: { lt: maxAttempts },
        OR: [
          { status: "PENDING", nextAttemptAt: { lte: now } },
          { status: "PROCESSING", lastAttemptAt: { lt: processingExpiredAt } },
        ],
      },
      data: {
        status: "PROCESSING",
        attempts: { increment: 1 },
        lastAttemptAt: now,
      },
    });
    if (claimed.count === 0) return;

    const attemptNo = Number(delivery.attempts || 0) + 1;
    const result = await this.deliverOnce(
      subscription.url,
      subscription.secret || undefined,
      JSON.stringify(delivery.payload),
    );

    if (result.ok) {
      await this.prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: "DELIVERED",
          deliveredAt: new Date(),
          lastStatus: result.statusCode,
          lastError: null,
        },
      });
      await this.updateStatus(subscription.id, result.statusCode, false);
      return;
    }

    const exhausted = attemptNo >= maxAttempts;
    await this.prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: exhausted ? "FAILED" : "PENDING",
        nextAttemptAt: exhausted ? new Date() : new Date(Date.now() + this.retryDelayMs(attemptNo)),
        lastStatus: result.statusCode,
        lastError: result.error?.slice(0, 1000) || "未知错误",
      },
    });
    await this.updateStatus(subscription.id, result.statusCode, true);
    this.logger.warn(
      `Webhook 投递失败: ${subscription.url} — ${result.error || "未知错误"}`
        + (exhausted ? "（已达最大次数，待人工重试）" : "（已进入补偿队列）"),
    );
  }

  /** 单次网络投递；重试调度由持久化外发箱负责。 */
  private async deliverOnce(
    url: string,
    secret: string | undefined,
    body: string,
  ): Promise<{ ok: boolean; statusCode: number; error?: string }> {
    // 实发前二次校验 URL（防 TOCTOU / DNS-rebinding：注册时校验通过后域名可能被重绑到内网）
    try {
      await validateWebhookUrl(url);
    } catch (err) {
      return { ok: false, statusCode: 0, error: (err as Error).message || "目标地址校验失败" };
    }
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "GuoXue-Webhook/1.0",
    };
    if (secret) {
      const signature = createHmac("sha256", secret).update(body).digest("hex");
      headers["X-Webhook-Signature"] = `sha256=${signature}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers,
        body,
        signal: controller.signal,
        redirect: "manual",
      });
      return resp.ok
        ? { ok: true, statusCode: resp.status }
        : { ok: false, statusCode: resp.status, error: `HTTP ${resp.status}` };
    } catch (err: unknown) {
      return { ok: false, statusCode: 0, error: (err as Error).message || "网络异常" };
    } finally {
      clearTimeout(timeout);
    }
  }

  /** 更新订阅的最后发送状态 */
  private async updateStatus(subId: string, statusCode: number, failed: boolean) {
    try {
      await this.prisma.webhookSubscription.update({
        where: { id: subId },
        data: {
          lastSentAt: new Date(),
          lastStatus: statusCode,
          ...(failed ? { retryCount: { increment: 1 } } : {}),
        },
      });
    } catch (err: any) {
      // 状态更新失败不影响主流程
      this.logger.warn(`Webhook 状态更新失败: ${err.message}`);
    }
  }

  private buildEventKey(event: WebhookEvent, payload: Record<string, unknown>): string {
    const keyByEvent: Partial<Record<WebhookEvent, string[]>> = {
      ORDER_PAID: ["orderId"],
      ORDER_REFUNDED: ["orderId"],
      USER_REGISTERED: ["userId"],
      CONTENT_PUBLISHED: ["contentId", "id"],
      WITHDRAWAL_REQUESTED: ["withdrawalId", "id"],
      WITHDRAWAL_PAID: ["withdrawalId", "id"],
      COURSE_ENROLLED: ["enrollmentId", "id"],
      LIVE_STARTED: ["liveId", "id"],
      LIVE_ENDED: ["liveId", "id"],
    };
    const candidates = keyByEvent[event] || ["id"];
    for (const key of candidates) {
      const value = payload[key];
      if (value !== undefined && value !== null && String(value).trim()) {
        return `${event}:${String(value)}`;
      }
    }
    const canonical = JSON.stringify(
      Object.keys(payload).sort().reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = payload[key];
        return acc;
      }, {}),
    );
    return `${event}:${createHash("sha256").update(canonical).digest("hex")}`;
  }

  private retryDelayMs(attemptNo: number): number {
    const schedule = [15_000, 60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000];
    return schedule[Math.min(Math.max(attemptNo - 1, 0), schedule.length - 1)];
  }

  /** HMAC-SHA256 签名（供接收方验证使用） */
  static sign(payload: string, secret: string): string {
    return createHmac("sha256", secret).update(payload).digest("hex");
  }
}
