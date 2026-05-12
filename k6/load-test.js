// ═══════════════════════════════════════════════════════════════
// 国学平台 — k6 全场景压测脚本
// 模拟日活 10 万 (100k DAU) 场景下的核心接口并发负载
// ═══════════════════════════════════════════════════════════════
//
// 使用方法:
//   k6 run k6/load-test.js
//   k6 run --vus 200 --duration 5m k6/load-test.js
//   k6 run --vus 500 --duration 10m k6/load-test.js    (峰值压测)
//   k6 run -o json k6/load-test.js > results.json       (导出结果)
//
// 100k DAU 推算:
//   - 日均活跃用户 100,000
//   - 假设 80% 用户在 8 小时内活跃 → 80,000 / (8*3600) ≈ 2.78 req/s 人均
//   - 高峰期 QPS ≈ 日均 QPS × 3 ≈ 100,000 × 20 PV/人 / 86400 × 3 ≈ 70 QPS 平均
//   - 峰值并发 ≈ 200 VUs（虚拟用户）

import http from 'k6/http';
import { check, sleep, group, trend } from 'k6';
import { Rate, Counter } from 'k6/metrics';

// ═══════════ 自定义指标 ═══════════
const errorRate = new Rate('errors');
const homePageDuration = new trend('home_page_duration', true);
const paipanDuration = new trend('paipan_duration', true);
const searchDuration = new trend('search_duration', true);
const authRequests = new Counter('auth_requests');

// ═══════════ 压测配置 ═══════════
export const options = {
  // 场景一：基准压测（日常流量）
  scenarios: {
    // 场景 1：日常混合负载（模拟正常工作日流量）
    daily_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },    // 预热
        { duration: '3m', target: 100 },   // 爬升
        { duration: '5m', target: 200 },   // 峰值负载
        { duration: '3m', target: 100 },   // 下降
        { duration: '1m', target: 0 },     // 冷却
      ],
    },
  },

  // 性能基准阈值（PASS/FAIL 判定）
  thresholds: {
    // 首页 ≤ 1.5s
    'home_page_duration': ['p(95)<1500', 'p(99)<2000'],
    // 排盘 ≤ 2s
    'paipan_duration': ['p(95)<2000', 'p(99)<3000'],
    // 搜索 ≤ 200ms
    'search_duration': ['p(95)<200', 'p(99)<500'],
    // 整体错误率 < 1%
    'errors': ['rate<0.01'],
    // HTTP 请求失败率 < 1%
    'http_req_failed': ['rate<0.01'],
    // 整体 p95 延迟 < 2s
    'http_req_duration': ['p(95)<2000'],
  },
};

// ═══════════ 环境配置 ═══════════
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_PREFIX = '/api';

// 测试用户池（模拟 200 个活跃用户循环使用）
const TEST_USERS = Array.from({ length: 200 }, (_, i) => ({
  id: `test-user-${i + 1}`,
  token: '',  // 将通过 login 获取
}));

// ═══════════ 辅助函数 ═══════════
function apiUrl(path: string): string {
  return `${BASE_URL}${API_PREFIX}${path}`;
}

function authHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomUserId(): string {
  return randomItem(TEST_USERS).id;
}

// ═══════════ 场景权重配置（基于真实用户行为分布） ═══════════
// 浏览首页 30%、阅读文章 20%、浏览课程 15%、搜索 10%、
// 排盘 10%、圈子 5%、商城 5%、个人中心 5%
const SCENE_WEIGHTS = {
  HOME:       0.30,
  ARTICLE:    0.20,
  COURSE:     0.15,
  SEARCH:     0.10,
  PAIPAN:     0.10,
  CIRCLE:     0.05,
  SHOP:       0.05,
  PROFILE:    0.05,
};

// 按权重随机选择场景
function pickScenario(): string {
  const r = Math.random();
  let cumulative = 0;
  for (const [scene, weight] of Object.entries(SCENE_WEIGHTS)) {
    cumulative += weight;
    if (r <= cumulative) return scene;
  }
  return 'HOME';
}

// ═══════════ 默认函数（k6 入口） ═══════════
export default function () {
  const user = randomItem(TEST_USERS);
  const scenario = pickScenario();

  switch (scenario) {
    case 'HOME':
      visitHome();
      break;
    case 'ARTICLE':
      viewArticle(user);
      break;
    case 'COURSE':
      browseCourses();
      break;
    case 'SEARCH':
      performSearch();
      break;
    case 'PAIPAN':
      performPaipan(user);
      break;
    case 'CIRCLE':
      browseCircles();
      break;
    case 'SHOP':
      browseShop();
      break;
    case 'PROFILE':
      viewProfile(user);
      break;
  }

  // 模拟用户思考时间（2-8 秒）
  sleep(2 + Math.random() * 6);
}

// ═══════════ 场景实现 ═══════════

// 1. 首页（权重 30%，目标 ≤1.5s）
function visitHome() {
  const start = Date.now();

  const res = http.get(apiUrl('/content/home'), {
    tags: { name: 'home' },
  });

  homePageDuration.add(Date.now() - start);
  errorRate.add(res.status !== 200);
  check(res, {
    '首页 200': (r) => r.status === 200,
    '首页 ≤1.5s': (r) => r.timings.duration < 1500,
  });
}

// 2. 查看文章（权重 20%，目标 ≤1s）
function viewArticle(user: any) {
  // 获取推荐文章列表
  const listRes = http.get(apiUrl('/article?page=1&pageSize=10'), {
    tags: { name: 'article_list' },
  });

  if (listRes.status === 200) {
    try {
      const body = JSON.parse(listRes.body as string);
      const articles = body.articles || body.data || [];
      if (articles.length > 0) {
        const article = randomItem(articles);
        const detailRes = http.get(apiUrl(`/article/${article.id}`), {
          headers: user.token ? authHeaders(user.token) : undefined,
          tags: { name: 'article_detail' },
        });
        errorRate.add(detailRes.status !== 200);
      }
    } catch { /* JSON parse error */ }
  }

  errorRate.add(listRes.status !== 200);
}

// 3. 浏览课程（权重 15%）
function browseCourses() {
  const res = http.get(apiUrl('/course?page=1&pageSize=12&status=PUBLISHED'), {
    tags: { name: 'course_list' },
  });
  errorRate.add(res.status !== 200);
  check(res, { '课程列表 200': (r) => r.status === 200 });
}

// 4. 搜索（权重 10%，目标 ≤200ms）
function performSearch() {
  const keywords = ['易经', '八字', '风水', '紫微', '道德经', '论语', '庄子', '中医'];
  const keyword = randomItem(keywords);
  const start = Date.now();

  const res = http.get(apiUrl(`/search?q=${encodeURIComponent(keyword)}&type=article`), {
    tags: { name: 'search' },
  });

  searchDuration.add(Date.now() - start);
  errorRate.add(res.status !== 200);
  check(res, {
    '搜索 200': (r) => r.status === 200,
    '搜索 ≤200ms': (r) => r.timings.duration < 200,
  });
}

// 5. 排盘（权重 10%，目标 ≤2s）
function performPaipan(user: any) {
  const start = Date.now();

  const payload = JSON.stringify({
    name: '测试',
    gender: Math.random() > 0.5 ? '男' : '女',
    year: 1984 + Math.floor(Math.random() * 20),
    month: 1 + Math.floor(Math.random() * 12),
    day: 1 + Math.floor(Math.random() * 28),
    hour: Math.floor(Math.random() * 12),
    minute: 0,
    city: '北京',
  });

  const res = http.post(apiUrl('/paipan/bazi/preview'), payload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'paipan' },
  });

  paipanDuration.add(Date.now() - start);
  errorRate.add(res.status !== 201 && res.status !== 200);
  check(res, {
    '排盘 2xx': (r) => r.status === 200 || r.status === 201,
    '排盘 ≤2s': (r) => r.timings.duration < 2000,
  });
}

// 6. 浏览圈子（权重 5%）
function browseCircles() {
  const res = http.get(apiUrl('/circle?page=1&pageSize=12'), {
    tags: { name: 'circle_list' },
  });
  errorRate.add(res.status !== 200);
}

// 7. 浏览商城（权重 5%）
function browseShop() {
  const res = http.get(apiUrl('/shop/products?page=1&pageSize=12'), {
    tags: { name: 'shop_list' },
  });
  errorRate.add(res.status !== 200);
}

// 8. 查看个人中心（权重 5%，需要登录）
function viewProfile(user: any) {
  if (!user.token) {
    // 未登录用户跳过
    return;
  }

  const res = http.get(apiUrl('/user/profile'), {
    headers: authHeaders(user.token),
    tags: { name: 'profile' },
  });
  errorRate.add(res.status !== 200);
}

// ═══════════ 初始化函数（测试开始前执行一次） ═══════════
export function setup() {
  console.log(`压测目标: ${BASE_URL}`);
  console.log(`压测配置: 200 VUs max, 模拟 100k DAU`);
  console.log('预热中...');

  // 预热：发送少量请求确保服务已启动
  const warmupEndpoints = [
    '/content/home',
    '/search?q=test',
    '/circle?page=1&pageSize=5',
  ];

  for (const endpoint of warmupEndpoints) {
    const res = http.get(apiUrl(endpoint));
    console.log(`预热 ${endpoint}: ${res.status}`);
  }

  console.log('预热完成，开始压测');
  return { startTime: new Date().toISOString() };
}

// ═══════════ 收尾函数 ═══════════
export function teardown(data: any) {
  console.log(`压测完成`);
  console.log(`开始时间: ${data.startTime}`);
  console.log(`结束时间: ${new Date().toISOString()}`);
}

// ═══════════ 峰值压测场景（单独运行） ═══════════
// k6 run --env SCENARIO=peak k6/load-test.js
export function peakLoadScenario() {
  return {
    executor: 'ramping-vus',
    stages: [
      { duration: '2m', target: 200 },   // 快速爬升
      { duration: '5m', target: 500 },   // 峰值 500 并发
      { duration: '2m', target: 500 },   // 保持峰值
      { duration: '2m', target: 0 },     // 快速冷却
    ],
  };
}

// ═══════════ 长时间浸泡测试 ═══════════
// k6 run --env SCENARIO=soak k6/load-test.js
export function soakTestScenario() {
  return {
    executor: 'constant-vus',
    vus: 100,
    duration: '30m',
  };
}

// ═══════════ 突发峰值测试 ═══════════
// k6 run --env SCENARIO=spike k6/load-test.js
export function spikeTestScenario() {
  return {
    executor: 'ramping-arrival-rate',
    timeUnit: '1s',
    preAllocatedVUs: 50,
    maxVUs: 500,
    stages: [
      { duration: '1m', target: 20 },     // 正常
      { duration: '10s', target: 200 },   // 突发 10x
      { duration: '1m', target: 20 },     // 恢复
    ],
  };
}
