import { check, sleep, group } from "k6";
import http from "k6/http";
import { Trend, Rate, Counter } from "k6/metrics";
import { PERF_BASELINES, SCENARIOS, BASE_URL } from "./config.js";

// ─── 自定义指标 ───
const baziPreviewDuration = new Trend("bazi_preview_duration", true);
const homeAggregationDuration = new Trend("home_aggregation_duration", true);
const contentListDuration = new Trend("content_list_duration", true);
const ebookListDuration = new Trend("ebook_list_duration", true);
const courseListDuration = new Trend("course_list_duration", true);
const articleListDuration = new Trend("article_list_duration", true);
const productListDuration = new Trend("product_list_duration", true);
const searchDuration = new Trend("search_duration", true);
const recommendDuration = new Trend("recommend_duration", true);
const aiTranslateDuration = new Trend("ai_translate_duration", true);
const dashboardDuration = new Trend("dashboard_duration", true);
const classicDetailDuration = new Trend("classic_detail_duration", true);
const riskControlDuration = new Trend("risk_control_duration", true);
const marketingDuration = new Trend("marketing_duration", true);
const financeDuration = new Trend("finance_duration", true);
const systemConfigDuration = new Trend("system_config_duration", true);
const userProfileDuration = new Trend("user_profile_duration", true);
const aiUsageDuration = new Trend("ai_usage_duration", true);
const errorRate = new Rate("errors");
const cacheHits = new Counter("cache_hits");

// ─── 默认请求头 ───
const TEST_TOKEN = __ENV.TEST_AUTH_TOKEN || "";
const HEADERS = {
  "Content-Type": "application/json",
  "User-Agent": "k6-performance-test/1.0",
};
if (TEST_TOKEN) {
  HEADERS["Authorization"] = `Bearer ${TEST_TOKEN}`;
}

// ─── 工具函数 ───

function get(url, arg2, arg3) {
  const tags = typeof arg2 === "object" ? arg2 : (typeof arg3 === "object" ? arg3 : {});
  const expected = typeof arg2 === "number" ? arg2 : 200;
  const res = http.get(`${BASE_URL}${url}`, { headers: HEADERS, tags });
  const ok = res.status === expected;
  if (!ok) {
    errorRate.add(1);
    console.error(`GET ${url} → ${res.status}: ${res.body?.substring(0, 200)}`);
  }
  check(res, { [`GET ${url} → ${expected}`]: () => res.status === expected });
  sleep(0.1);
  return res;
}

function post(url, body, arg3, arg4) {
  const tags = typeof arg3 === "object" ? arg3 : (typeof arg4 === "object" ? arg4 : {});
  const expected = typeof arg3 === "number" ? arg3 : 200;
  const res = http.post(`${BASE_URL}${url}`, JSON.stringify(body), { headers: HEADERS, tags });
  const ok = res.status === expected;
  if (!ok) {
    errorRate.add(1);
    console.error(`POST ${url} → ${res.status}: ${res.body?.substring(0, 200)}`);
  }
  check(res, { [`POST ${url} → ${expected}`]: () => res.status === expected });
  sleep(0.1);
  return res;
}

// ═══════════════════════════════════════════
// 测试用例
// ═══════════════════════════════════════════

function healthCheck() {
  const res = get("/api/v1/health");
  check(res, {
    "health: status ok": () =>
      res.json("status") === "ok" || res.status === 200,
  });
}

function homeAggregation() {
  const res = get("/api/v1/mini/home", { name: "mini-home" });
  const body = res.json();
  if (body) {
    const fromCache =
      res.headers["X-Cache"] === "HIT" ||
      (res.timings?.duration ?? 0) < 50;
    if (fromCache) cacheHits.add(1);
    homeAggregationDuration.add(res.timings.duration);
  }
}

function contentList() {
  const page = Math.floor(Math.random() * 5) + 1;
  const res = get(
    `/api/v1/mini/contents?page=${page}&pageSize=10`,
    { name: "mini-contents" },
  );
  contentListDuration.add(res.timings.duration);
}

function baziPreview() {
  const genders = ["男", "女"];
  const res = post(
    "/api/v1/paipan/bazi/preview",
    {
      gender: genders[Math.floor(Math.random() * 2)],
      year: 1980 + Math.floor(Math.random() * 40),
      month: Math.floor(Math.random() * 12) + 1,
      day: Math.floor(Math.random() * 28) + 1,
      hour: Math.floor(Math.random() * 24),
    },
    { name: "paipan-bazi-preview" },
  );
  baziPreviewDuration.add(res.timings.duration);
}

function classicBooks() {
  get("/api/v1/classic/books?page=1&pageSize=10", {
    name: "classic-books",
  });
}

function courseList() {
  get("/api/v1/courses?page=1&pageSize=10", { name: "courses-list" });
}

function circleList() {
  get("/api/v1/circles?page=1&pageSize=10", { name: "circles-list" });
}

function questionList() {
  get("/api/v1/question?page=1&pageSize=10", { name: "question-list" });
}

function contentDetail() {
  const ids = ["c1", "c2", "c3", "c4", "c5"];
  const id = ids[Math.floor(Math.random() * ids.length)];
  get(`/api/v1/mini/content/${id}`, { name: "content-detail" });
}

function coinTiers() {
  get("/api/v1/coin/tiers", { name: "coin-tiers" });
}

// ═══════════════ 新增端点 ═══════════════

function ebookList() {
  const res = get("/api/v1/ebook/books?page=1&pageSize=10", { name: "ebook-list" });
  ebookListDuration.add(res.timings.duration);
}

function ebookCategories() {
  get("/api/v1/ebook/categories", { name: "ebook-categories" });
}

function ebookDetail() {
  const ids = ["e1", "e2", "e3"];
  const id = ids[Math.floor(Math.random() * ids.length)];
  get(`/api/v1/ebook/books/${id}`, { name: "ebook-detail" });
}

function articleList() {
  const res = get("/api/v1/articles?page=1&pageSize=10", { name: "article-list" });
  articleListDuration.add(res.timings.duration);
}

function productList() {
  const res = get("/api/v1/shop/products?page=1&pageSize=10", { name: "product-list" });
  productListDuration.add(res.timings.duration);
}

function classicDetail() {
  const res = get("/api/v1/classic/books/c1/chapters", { name: "classic-detail" });
  classicDetailDuration.add(res.timings.duration);
}

function globalSearch() {
  const keywords = ["八字", "风水", "易经", "道德经", "论语"];
  const kw = keywords[Math.floor(Math.random() * keywords.length)];
  const res = get(`/api/v1/search?keyword=${encodeURIComponent(kw)}`, { name: "search-global" });
  searchDuration.add(res.timings.duration);
}

function recommendGuessLike() {
  const res = get("/api/v1/recommend/guess_like?page=1&pageSize=10", { name: "recommend-guess" });
  recommendDuration.add(res.timings.duration);
}

function recommendTrending() {
  get("/api/v1/recommend/trending", { name: "recommend-trending" });
}

function aiTranslate() {
  const texts = ["天地玄黄，宇宙洪荒", "学而时习之，不亦说乎"];
  const text = texts[Math.floor(Math.random() * texts.length)];
  const res = post("/api/v1/ai/translate", { text, sourceLang: "zh", targetLang: "en" }, { name: "ai-translate" });
  aiTranslateDuration.add(res.timings.duration);
}

function dashboardStats() {
  const res = get("/api/v1/dashboard/stats", { name: "dashboard-stats" });
  dashboardDuration.add(res.timings.duration);
}

function dashboardRealtime() {
  get("/api/v1/dashboard/realtime", { name: "dashboard-realtime" });
}

function liveRooms() {
  get("/api/v1/live/rooms?page=1&pageSize=10", { name: "live-rooms" });
}

function videoList() {
  get("/api/v1/videos?page=1&pageSize=10", { name: "video-list" });
}

function publicBanners() {
  get("/api/v1/system/public/banners", { name: "public-banners" });
}

function homeConfig() {
  get("/api/v1/system/public/home-config", { name: "home-config" });
}

function baziPublic() {
  const res = get(
    `/api/v1/paipan/bazi/public?year=${1980 + Math.floor(Math.random() * 40)}&month=${Math.floor(Math.random() * 12) + 1}&day=${Math.floor(Math.random() * 28) + 1}&hour=${Math.floor(Math.random() * 24)}`,
    { name: "paipan-bazi-public" },
  );
  baziPreviewDuration.add(res.timings.duration);
}

function interactionCount() {
  get("/api/v1/interaction/like/count?targetType=ARTICLE&targetId=a1", { name: "interaction-count" });
}

function commentList() {
  get("/api/v1/comments?targetType=ARTICLE&targetId=a1&page=1&pageSize=10", { name: "comment-list" });
}

function notificationList() {
  get("/api/v1/notifications?page=1&pageSize=10", { name: "notification-list" });
}

function sameCityRecommend() {
  get("/api/v1/recommend/same_city?page=1&pageSize=10", { name: "recommend-same-city" });
}

function contentHealth() {
  const res = get("/api/v1/dashboard/content-health", { name: "content-health" });
  dashboardDuration.add(res.timings.duration);
}

function funnel() {
  get("/api/v1/dashboard/funnel", { name: "dashboard-funnel" });
}

function operationLogs() {
  get("/api/v1/audit/operation-logs?page=1&pageSize=10", { name: "operation-logs" });
}

function ebookTranslate() {
  post("/api/v1/ebook/translate", { text: "道可道，非常道", sourceLang: "zh", targetLang: "en" }, { name: "ebook-translate" });
}

function flashSaleList() {
  const res = get("/api/v1/marketing/flash-sales?status=ACTIVE&page=1&pageSize=10", { name: "flash-sale-list" });
  marketingDuration.add(res.timings.duration);
}

function couponList() {
  const res = get("/api/v1/marketing/coupons?page=1&pageSize=10", { name: "coupon-list" });
  marketingDuration.add(res.timings.duration);
}

function groupBuyList() {
  get("/api/v1/marketing/group-buys?page=1&pageSize=10", { name: "group-buy-list" });
}

function riskAlertList() {
  const res = get("/api/v1/risk-control/alerts?status=OPEN&page=1&pageSize=10", { name: "risk-alert-list" });
  riskControlDuration.add(res.timings.duration);
}

function todayOverview() {
  const res = get("/api/v1/dashboard/today-overview", { name: "today-overview" });
  dashboardDuration.add(res.timings.duration);
}

function userProfile() {
  const ids = ["u1", "u2", "u3", "u4", "u5"];
  const id = ids[Math.floor(Math.random() * ids.length)];
  const res = get(`/api/v1/users/${id}/profile`, { name: "user-profile" });
  userProfileDuration.add(res.timings.duration);
}

function siteNotices() {
  const res = get("/api/v1/system/site-notices?page=1&pageSize=10", { name: "site-notices" });
  systemConfigDuration.add(res.timings.duration);
}

function memberConfigs() {
  const res = get("/api/v1/system/member-configs", { name: "member-configs" });
  systemConfigDuration.add(res.timings.duration);
}

function pageContent() {
  get("/api/v1/system/page-content?pageRoute=/", { name: "page-content" });
}

function aiUsageStats() {
  const periods = ["day", "week", "month"];
  const period = periods[Math.floor(Math.random() * periods.length)];
  const res = get(`/api/v1/ai/usage-stats?period=${period}`, { name: "ai-usage-stats" });
  aiUsageDuration.add(res.timings.duration);
}

function settlementList() {
  const res = get("/api/v1/finance/settlements?page=1&pageSize=10", { name: "settlement-list" });
  financeDuration.add(res.timings.duration);
}

function reconciliationList() {
  get("/api/v1/finance/reconciliation?page=1&pageSize=10", { name: "reconciliation-list" });
}

function circleDashboard() {
  const ids = ["c1", "c2", "c3"];
  const id = ids[Math.floor(Math.random() * ids.length)];
  const res = get(`/api/v1/dashboard/circles/${id}`, { name: "circle-dashboard" });
  dashboardDuration.add(res.timings.duration);
}

function courseDashboard() {
  const ids = ["c1", "c2", "c3"];
  const id = ids[Math.floor(Math.random() * ids.length)];
  get(`/api/v1/dashboard/courses/${id}`, { name: "course-dashboard" });
}

function dailyReport() {
  post("/api/v1/dashboard/report/daily", {}, { name: "daily-report" });
}

function discountList() {
  get("/api/v1/marketing/discounts?page=1&pageSize=10", { name: "discount-list" });
}

function marketingPageList() {
  get("/api/v1/marketing/pages?page=1&pageSize=10", { name: "marketing-page-list" });
}

// ═══════════════════════════════════════════
// 主入口
// ═══════════════════════════════════════════

export default function () {
  healthCheck();
  sleep(0.05);

  const vuId = __VU;
  const iterId = __ITER;

  // 30% 流量：首页浏览
  group("首页浏览", () => {
    homeAggregation();
    contentList();
    if (iterId % 3 === 0) contentDetail();
  });

  // 15% 流量：内容消费
  if (vuId % 7 < 1) {
    group("内容消费", () => {
      articleList();
      classicBooks();
      ebookList();
      if (iterId % 2 === 0) { classicDetail(); ebookDetail(); }
    });
  }

  // 15% 流量：电商浏览
  if (vuId % 7 < 2) {
    group("电商浏览", () => {
      courseList();
      productList();
      circleList();
      liveRooms();
    });
  }

  // 10% 流量：八字排盘
  if (vuId % 10 < 1) {
    group("八字排盘", () => {
      baziPreview();
      if (iterId % 2 === 0) baziPublic();
    });
  }

  // 10% 流量：搜索+推荐
  if (vuId % 10 < 2) {
    group("搜索推荐", () => {
      globalSearch();
      recommendTrending();
      if (iterId % 2 === 0) { recommendGuessLike(); sameCityRecommend(); }
    });
  }

  // 8% 流量：AI能力
  if (vuId % 12 < 1) {
    group("AI能力", () => {
      aiTranslate();
      if (iterId % 3 === 0) ebookTranslate();
    });
  }

  // 5% 流量：互动
  if (vuId % 20 < 1) {
    group("互动", () => {
      questionList();
      commentList();
      interactionCount();
    });
  }

  // 5% 流量：仪表盘
  if (vuId % 20 < 2) {
    group("仪表盘", () => {
      dashboardStats();
      dashboardRealtime();
      todayOverview();
      if (iterId % 2 === 0) { contentHealth(); funnel(); operationLogs(); }
      if (iterId % 3 === 0) { circleDashboard(); courseDashboard(); dailyReport(); }
    });
  }

  // 5% 流量：营销活动
  if (vuId % 20 < 3 && vuId % 20 >= 2) {
    group("营销活动", () => {
      flashSaleList();
      couponList();
      if (iterId % 2 === 0) { groupBuyList(); discountList(); marketingPageList(); }
    });
  }

  // 3% 流量：系统配置+风控
  if (vuId % 33 < 1) {
    group("系统风控", () => {
      siteNotices();
      memberConfigs();
      pageContent();
      riskAlertList();
      if (iterId % 2 === 0) { userProfile(); settlementList(); reconciliationList(); }
    });
  }

  // 2% 流量：AI管理
  if (vuId % 50 < 1) {
    group("AI管理", () => {
      aiUsageStats();
    });
  }

  // 2% 流量：公开配置
  if (vuId % 50 < 2) {
    group("公开配置", () => {
      publicBanners();
      homeConfig();
      coinTiers();
      ebookCategories();
    });
  }

  sleep(1 + Math.random() * 2);
}

// ═══════════════════════════════════════════
// 场景配置
// ═══════════════════════════════════════════

export const options = {
  scenarios: SCENARIOS[__ENV.SCENARIO || "load"],

  thresholds: {
    http_req_duration: [
      `p(95)<${PERF_BASELINES.http_req_duration_p95}`,
      `p(99)<${PERF_BASELINES.http_req_duration_p99}`,
    ],
    http_req_failed: [
      `rate<${PERF_BASELINES.http_req_failed_rate}`,
    ],

    bazi_preview_duration: [
      `p(95)<${PERF_BASELINES.bazi_preview_p95}`,
    ],
    home_aggregation_duration: [
      `p(95)<${PERF_BASELINES.home_aggregation_p95}`,
    ],
    content_list_duration: [
      `p(95)<${PERF_BASELINES.content_list_p95}`,
    ],
    ebook_list_duration: [
      `p(95)<${PERF_BASELINES.ebook_list_p95}`,
    ],
    course_list_duration: [
      `p(95)<${PERF_BASELINES.course_list_p95}`,
    ],
    article_list_duration: [
      `p(95)<${PERF_BASELINES.article_list_p95}`,
    ],
    product_list_duration: [
      `p(95)<${PERF_BASELINES.product_list_p95}`,
    ],
    search_duration: [
      `p(95)<${PERF_BASELINES.search_p95}`,
    ],
    recommend_duration: [
      `p(95)<${PERF_BASELINES.recommend_p95}`,
    ],
    ai_translate_duration: [
      `p(95)<${PERF_BASELINES.ai_translate_p95}`,
    ],
    dashboard_duration: [
      `p(95)<${PERF_BASELINES.dashboard_p95}`,
    ],
    classic_detail_duration: [
      `p(95)<${PERF_BASELINES.classic_detail_p95}`,
    ],
    risk_control_duration: [
      `p(95)<${PERF_BASELINES.risk_control_p95}`,
    ],
    marketing_duration: [
      `p(95)<${PERF_BASELINES.marketing_p95}`,
    ],
    finance_duration: [
      `p(95)<${PERF_BASELINES.finance_p95}`,
    ],
    system_config_duration: [
      `p(95)<${PERF_BASELINES.system_config_p95}`,
    ],
    user_profile_duration: [
      `p(95)<${PERF_BASELINES.user_profile_p95}`,
    ],
    ai_usage_duration: [
      `p(95)<${PERF_BASELINES.ai_usage_p95}`,
    ],

    errors: [
      `rate<${PERF_BASELINES.error_rate}`,
    ],
  },

  summaryTrendStats: ["avg", "min", "med", "p(90)", "p(95)", "p(99)", "max"],
};
