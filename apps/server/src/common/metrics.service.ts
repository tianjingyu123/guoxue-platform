import { Injectable } from "@nestjs/common";
import { collectDefaultMetrics, Counter, Histogram, Gauge, Registry } from "prom-client";

@Injectable()
export class MetricsService {
  private readonly register: Registry;

  // HTTP 指标
  readonly httpRequestsTotal: Counter<string>;
  readonly httpRequestDuration: Histogram<string>;
  readonly httpRequestsInFlight: Gauge<string>;

  // 支付指标
  readonly paymentCallbackTotal: Counter<string>;
  readonly paymentCallbackFailures: Counter<string>;
  readonly paymentCallbackDelay: Gauge<string>;
  readonly ordersPending: Gauge<string>;

  // 第三方 API 指标
  readonly externalApiTotal: Counter<string>;
  readonly externalApiFailures: Counter<string>;
  readonly externalApiDuration: Histogram<string>;

  // 数据库指标
  readonly slowQueryTotal: Counter<string>;
  readonly dbConnectionPoolUsage: Gauge<string>;

  constructor() {
    this.register = new Registry();
    collectDefaultMetrics({ register: this.register, prefix: "guoxue_" });

    // ── HTTP ──
    this.httpRequestsTotal = new Counter({
      name: "guoxue_http_requests_total",
      help: "HTTP 请求总数",
      labelNames: ["method", "path", "status"],
      registers: [this.register],
    });

    this.httpRequestDuration = new Histogram({
      name: "guoxue_http_request_duration_seconds",
      help: "HTTP 请求延迟 (秒)",
      labelNames: ["method", "path"],
      buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5, 10],
      registers: [this.register],
    });

    this.httpRequestsInFlight = new Gauge({
      name: "guoxue_http_requests_in_flight",
      help: "当前正在处理的请求数",
      registers: [this.register],
    });

    // ── 支付 ──
    this.paymentCallbackTotal = new Counter({
      name: "guoxue_payment_callback_total",
      help: "支付回调总数",
      labelNames: ["provider", "status"],
      registers: [this.register],
    });

    this.paymentCallbackFailures = new Counter({
      name: "guoxue_payment_callback_failures_total",
      help: "支付回调失败数",
      labelNames: ["provider", "reason"],
      registers: [this.register],
    });

    this.paymentCallbackDelay = new Gauge({
      name: "guoxue_payment_callback_delay_seconds",
      help: "支付回调延迟（从支付发起到回调到达的秒数）",
      labelNames: ["orderId", "provider"],
      registers: [this.register],
    });

    this.ordersPending = new Gauge({
      name: "guoxue_orders_pending_count",
      help: "当前待支付订单数",
      registers: [this.register],
    });

    // ── 第三方 API ──
    this.externalApiTotal = new Counter({
      name: "guoxue_external_api_total",
      help: "第三方 API 调用总数",
      labelNames: ["service", "method", "status"],
      registers: [this.register],
    });

    this.externalApiFailures = new Counter({
      name: "guoxue_external_api_failures_total",
      help: "第三方 API 调用失败数",
      labelNames: ["service", "reason"],
      registers: [this.register],
    });

    this.externalApiDuration = new Histogram({
      name: "guoxue_external_api_duration_seconds",
      help: "第三方 API 调用延迟 (秒)",
      labelNames: ["service", "method"],
      buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 30],
      registers: [this.register],
    });

    // ── 数据库 ──
    this.slowQueryTotal = new Counter({
      name: "guoxue_slow_query_total",
      help: "慢查询总数",
      labelNames: ["model"],
      registers: [this.register],
    });

    this.dbConnectionPoolUsage = new Gauge({
      name: "guoxue_db_connection_pool_usage",
      help: "数据库连接池使用率（0-1）",
      registers: [this.register],
    });
  }

  /** 记录第三方 API 调用（含成功/失败和延迟） */
  recordExternalApi(service: string, method: string, ok: boolean, durationMs: number, reason?: string) {
    const status = ok ? "success" : "failure";
    this.externalApiTotal.inc({ service, method, status });
    this.externalApiDuration.observe({ service, method }, durationMs / 1000);
    if (!ok) {
      this.externalApiFailures.inc({ service, reason: reason ?? "unknown" });
    }
  }

  /** 记录支付回调 */
  recordPaymentCallback(provider: string, ok: boolean, reason?: string) {
    const status = ok ? "success" : "failure";
    this.paymentCallbackTotal.inc({ provider, status });
    if (!ok) {
      this.paymentCallbackFailures.inc({ provider, reason: reason ?? "verify_failed" });
    }
  }

  /** 记录慢查询 */
  recordSlowQuery(model: string) {
    this.slowQueryTotal.inc({ model });
  }

  async metrics(): Promise<string> {
    return this.register.metrics();
  }

  contentType(): string {
    return this.register.contentType;
  }
}
