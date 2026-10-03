import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = (__ENV.BASE_URL || "https://pre-api.rebugx.cn").replace(/\/+$/, "");
const VUS = Number(__ENV.VUS || 2);
const DURATION = __ENV.DURATION || "30s";
const MODE = (__ENV.MODE || "sustained").toLowerCase();
const ITERATIONS = Number(__ENV.ITERATIONS || 20);

// 只覆盖公开、只读或纯计算接口，避免压测向生产库写入测试数据。
const ENDPOINTS = [
  // 容量测试只检查服务与核心依赖是否就绪，避免高频探测外部 AI、COS 等完整健康项。
  { name: "health-ready", path: "/api/v1/health/ready" },
  { name: "mini-home", path: "/api/v1/mini/home" },
  { name: "contents", path: "/api/v1/contents?page=1&pageSize=10" },
  { name: "discover", path: "/api/v1/discover" },
  { name: "classic-books", path: "/api/v1/classic/books?page=1&pageSize=10" },
  { name: "courses", path: "/api/v1/courses?page=1&pageSize=10" },
  { name: "products", path: "/api/v1/shop/products?page=1&pageSize=10" },
  { name: "search-hot", path: "/api/v1/search/hot" },
  { name: "tools-directory", path: "/api/v1/tools/directory" },
  {
    name: "bazi-public",
    path: "/api/v1/paipan/bazi/public?year=1990&month=6&day=15&hour=12&minute=0&gender=male",
  },
];

// 通过公网 CLB 验证链路时，不主动绕过按客户端 IP 生效的业务限流。
const ACTIVE_ENDPOINTS =
  (__ENV.EXCLUDE_RATE_LIMITED || "").toLowerCase() === "true"
    ? ENDPOINTS.filter(({ name }) => !["search-hot", "bazi-public"].includes(name))
    : ENDPOINTS;

const scenario =
  MODE === "burst"
    ? {
        executor: "shared-iterations",
        vus: VUS,
        iterations: ITERATIONS,
        maxDuration: DURATION,
      }
    : {
        executor: "constant-vus",
        vus: VUS,
        duration: DURATION,
        gracefulStop: "10s",
      };

export const options = {
  scenarios: { launch_readiness: scenario },
  thresholds: {
    checks: ["rate>0.99"],
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<800", "p(99)<1500"],
  },
  summaryTrendStats: ["avg", "min", "med", "p(90)", "p(95)", "p(99)", "max"],
};

export default function () {
  const endpoint = ACTIVE_ENDPOINTS[(__VU + __ITER) % ACTIVE_ENDPOINTS.length];
  const response = http.get(`${BASE_URL}${endpoint.path}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "rebugx-launch-readiness/1.0",
    },
    tags: { endpoint: endpoint.name },
    timeout: "10s",
  });

  check(response, {
    [`${endpoint.name}: HTTP 200`]: (res) => res.status === 200,
    [`${endpoint.name}: 响应体非空`]: (res) => Boolean(res.body && res.body.length > 2),
  });

  // 加入用户阅读间隔，避免制造不符合真实业务的紧密循环。
  sleep(0.2 + Math.random() * 0.3);
}
