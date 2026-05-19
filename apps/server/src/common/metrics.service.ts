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

  // AI 数据飞轮指标（P10）
  readonly aiCallTotal: Counter<string>;          // AI 调用总数（按 scene/model）
  readonly aiCallDuration: Histogram<string>;     // AI 调用延迟
  readonly aiSemanticCacheHits: Counter<string>;  // 语义缓存命中数
  readonly aiRagRecallTotal: Counter<string>;     // RAG 知识召回数
  readonly aiContentAutoTagged: Counter<string>;  // AI 自动打标数
  readonly aiContentAutoApproved: Counter<string>;// AI 自动审核通过数
  readonly aiUserFeedback: Counter<string>;       // 用户满意度反馈
  readonly recommendCTR: Gauge<string>;           // 推荐点击率

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

    // ── AI 数据飞轮指标 ──
    this.aiCallTotal = new Counter({
      name: "guoxue_ai_call_total",
      help: "AI 调用总数",
      labelNames: ["scene", "model", "status"],
      registers: [this.register],
    });

    this.aiCallDuration = new Histogram({
      name: "guoxue_ai_call_duration_seconds",
      help: "AI 调用延迟 (秒)",
      labelNames: ["scene", "model"],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 20, 30, 60],
      registers: [this.register],
    });

    this.aiSemanticCacheHits = new Counter({
      name: "guoxue_ai_semantic_cache_hits_total",
      help: "语义缓存命中数",
      labelNames: ["scene"],
      registers: [this.register],
    });

    this.aiRagRecallTotal = new Counter({
      name: "guoxue_ai_rag_recall_total",
      help: "RAG 知识召回数",
      labelNames: ["scene"],
      registers: [this.register],
    });

    this.aiContentAutoTagged = new Counter({
      name: "guoxue_ai_content_auto_tagged_total",
      help: "AI 自动打标内容数",
      labelNames: ["type"],
      registers: [this.register],
    });

    this.aiContentAutoApproved = new Counter({
      name: "guoxue_ai_content_auto_approved_total",
      help: "AI 自动审核通过数",
      labelNames: ["type"],
      registers: [this.register],
    });

    this.aiUserFeedback = new Counter({
      name: "guoxue_ai_user_feedback_total",
      help: "用户 AI 满意度反馈",
      labelNames: ["scene", "rating"],
      registers: [this.register],
    });

    this.recommendCTR = new Gauge({
      name: "guoxue_recommend_ctr",
      help: "推荐点击率（点击/曝光）",
      labelNames: ["scene"],
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

  /** 记录 AI 调用 */
  recordAiCall(scene: string, model: string, ok: boolean, durationMs: number) {
    const status = ok ? "success" : "error";
    this.aiCallTotal.inc({ scene, model, status });
    this.aiCallDuration.observe({ scene, model }, durationMs / 1000);
  }

  /** 记录语义缓存命中 */
  recordSemanticCacheHit(scene: string) {
    this.aiSemanticCacheHits.inc({ scene });
  }

  /** 记录 RAG 知识召回 */
  recordRagRecall(scene: string) {
    this.aiRagRecallTotal.inc({ scene });
  }

  /** 记录 AI 自动打标 */
  recordContentAutoTagged(type: string) {
    this.aiContentAutoTagged.inc({ type });
  }

  /** 记录 AI 自动审核通过 */
  recordContentAutoApproved(type: string) {
    this.aiContentAutoApproved.inc({ type });
  }

  /** 记录用户 AI 满意度反馈 */
  recordAiFeedback(scene: string, rating: "positive" | "negative") {
    this.aiUserFeedback.inc({ scene, rating });
  }

  /** 更新推荐点击率 */
  setRecommendCTR(scene: string, ctr: number) {
    this.recommendCTR.set({ scene }, ctr);
  }

  async metrics(): Promise<string> {
    return this.register.metrics();
  }

  contentType(): string {
    return this.register.contentType;
  }
}
