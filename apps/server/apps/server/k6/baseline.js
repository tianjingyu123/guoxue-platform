import http from "k6/http";
import { check, sleep, trend, rate } from "k6";

const BASE = __ENV.BASE_URL || "http://localhost:3000/api/v1";
const TOKEN = __ENV.TOKEN || "";

export const options = {
  stages: [
    { duration: "10s", target: 5 },   // 热身
    { duration: "20s", target: 20 },  // 爬坡
    { duration: "30s", target: 20 },  // 保持
    { duration: "10s", target: 0 },   // 冷却
  ],
  thresholds: {
    "http_req_duration{name:health}": ["p95<200"],
    "http_req_duration{name:content-list}": ["p95<500"],
    "http_req_duration{name:search}": ["p95<1000"],
    "http_req_failed": ["rate<0.05"],
  },
};

const headers = TOKEN
  ? { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" }
  : { "Content-Type": "application/json" };

export default function () {
  // 1. 健康检查
  const health = http.get(`${BASE}/system/health`, { headers, tags: { name: "health" } });
  check(health, { "health 200": (r) => r.status === 200 });

  // 2. 内容列表
  const contents = http.get(`${BASE}/contents?page=1&pageSize=10`, { headers, tags: { name: "content-list" } });
  check(contents, { "contents 200": (r) => r.status === 200 });

  // 3. 搜索
  const search = http.get(`${BASE}/search?keyword=论语`, { headers, tags: { name: "search" } });
  check(search, { "search 200": (r) => r.status === 200 });

  // 4. 发现页
  const discover = http.get(`${BASE}/discover?page=1`, { headers, tags: { name: "discover" } });
  check(discover, { "discover 200": (r) => r.status === 200 });

  // 5. 品类统计
  const cats = http.get(`${BASE}/categories/stats`, { headers, tags: { name: "categories" } });
  check(cats, { "categories 200": (r) => r.status === 200 });

  sleep(1);
}
