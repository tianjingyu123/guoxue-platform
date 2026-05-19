// ═══════════════════════════════════════════
// k6 性能压测 — 配置文件
// ═══════════════════════════════════════════

// 目标服务地址（可通过环境变量覆盖）
export const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

// ═══════════════════════════════════════════
// 性能基线 (SLO)
// ═══════════════════════════════════════════
export const PERF_BASELINES = {
  // 通用 HTTP 延迟 (ms)
  http_req_duration_p95: 500,
  http_req_duration_p99: 1000,

  // 失败率上限
  http_req_failed_rate: 0.01, // 1%

  // 业务端点 P95 延迟 (ms)
  bazi_preview_p95: 2000,       // 计算密集，允许较高延迟
  home_aggregation_p95: 800,    // 聚合查询
  content_list_p95: 400,        // 简单分页
  ebook_list_p95: 400,          // 电子书列表
  course_list_p95: 400,         // 课程列表
  article_list_p95: 400,        // 文章列表
  product_list_p95: 500,        // 商品列表
  search_p95: 600,              // 全文搜索
  recommend_p95: 800,           // 推荐引擎
  ai_translate_p95: 3000,       // AI翻译（第三方API）
  dashboard_p95: 1000,          // 仪表盘聚合
  classic_detail_p95: 500,      // 古籍详情
  risk_control_p95: 600,        // 风控查询
  marketing_p95: 500,           // 营销活动查询
  finance_p95: 600,             // 财务聚合查询
  system_config_p95: 300,       // 系统配置查询
  user_profile_p95: 800,        // 用户画像聚合
  ai_usage_p95: 600,            // AI用量统计

  // AI 端点 P95 延迟 (ms)
  ai_chat_p95: 5000,              // AI网关对话（第三方API）
  ai_chat_stream_p95: 8000,       // AI流式对话（首字节时间）
  customer_service_p95: 4000,     // 智能客服
  circle_assistant_p95: 6000,     // 圈主助理（含RAG检索）
  classic_qa_p95: 5000,           // 古籍问答
  bot_chat_p95: 5000,             // 智能体对话（Coze API）
  ai_search_p95: 4000,            // AI搜索
  smart_feed_p95: 1500,           // 智能信息流
  discover_p95: 800,              // 发现页聚合
  marketplace_p95: 500,           // 智能体广场
  quality_score_p95: 4000,        // 质量评分
  media_tts_p95: 5000,            // TTS语音合成
  knowledge_sync_p95: 3000,       // 知识同步
  content_generation_p95: 5000,   // AI内容生成
  operation_engine_p95: 2000,     // 运营引擎
  ws_connect_p95: 300,            // WebSocket连接建立
  ws_message_p95: 100,            // WebSocket消息往返

  // 错误率
  error_rate: 0.02, // 2%
};

// ═══════════════════════════════════════════
// 压测场景
// ═══════════════════════════════════════════

/**
 * 场景类型：
 * - smoke:  冒烟测试，1 VU 跑 1 分钟，验证基本可用
 * - load:   负载测试，逐步增加到目标并发，验证性能基线
 * - stress: 压力测试，持续增加并发直到超过容量，找瓶颈
 * - soak:   浸泡测试，中等并发长时间运行，检测内存泄漏
 * - spike:  尖峰测试，突发流量冲击，验证自动扩容
 */
export const SCENARIOS = {
  // ─── 冒烟测试 ───
  smoke: {
    smoke: {
      executor: "constant-vus",
      vus: 1,
      duration: "1m",
      tags: { scenario: "smoke" },
    },
  },

  // ─── 负载测试（默认） ───
  load: {
    load: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "1m", target: 20 },   // 预热
        { duration: "3m", target: 50 },   // 增加到目标负载
        { duration: "5m", target: 50 },   // 稳定负载
        { duration: "1m", target: 0 },    // 冷却
      ],
      tags: { scenario: "load" },
    },
  },

  // ─── 压力测试 ───
  stress: {
    stress: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "2m", target: 50 },   // 预热
        { duration: "3m", target: 100 },  // 增加到生产负载
        { duration: "5m", target: 100 },  // 稳定在 100 VU
        { duration: "3m", target: 200 },  // 继续增加到压力
        { duration: "2m", target: 200 },  // 稳定在 200 VU
        { duration: "2m", target: 0 },    // 冷却
      ],
      tags: { scenario: "stress" },
    },
  },

  // ─── 浸泡测试 ───
  soak: {
    soak: {
      executor: "constant-vus",
      vus: 50,
      duration: "30m",
      tags: { scenario: "soak" },
    },
  },

  // ─── 尖峰测试 ───
  spike: {
    spike: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "10s", target: 10 },    // 基线
        { duration: "10s", target: 200 },   // 瞬时尖峰
        { duration: "30s", target: 200 },   // 持续尖峰
        { duration: "30s", target: 10 },    // 恢复
        { duration: "10s", target: 200 },   // 第二次尖峰
        { duration: "30s", target: 200 },
        { duration: "30s", target: 0 },
      ],
      tags: { scenario: "spike" },
    },
  },
};

// ═══════════════════════════════════════════
// k6 输出配置
// ═══════════════════════════════════════════

/** 生成 HTML 报告的 summary-export JSON 路径 */
export const SUMMARY_EXPORT = __ENV.SUMMARY_EXPORT || "results/performance-summary.json";

/** 是否输出详细日志 */
export const VERBOSE = __ENV.VERBOSE === "true";
