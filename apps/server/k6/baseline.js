import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000/api/v1";

const errorRate = new Rate("errors");
const healthLatency = new Trend("health_latency");
const contentLatency = new Trend("content_latency");
const searchLatency = new Trend("search_latency");

export const options = {
  scenarios: {
    health: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "15s", target: 5 },
        { duration: "30s", target: 20 },
        { duration: "30s", target: 20 },
        { duration: "15s", target: 0 },
      ],
      exec: "healthCheck",
    },
    content_list: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "15s", target: 3 },
        { duration: "30s", target: 10 },
        { duration: "30s", target: 10 },
        { duration: "15s", target: 0 },
      ],
      exec: "contentList",
      startTime: "5s",
    },
    search: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "15s", target: 2 },
        { duration: "30s", target: 8 },
        { duration: "30s", target: 8 },
        { duration: "15s", target: 0 },
      ],
      exec: "searchEndpoint",
      startTime: "10s",
    },
    discover: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "15s", target: 3 },
        { duration: "30s", target: 10 },
        { duration: "30s", target: 10 },
        { duration: "15s", target: 0 },
      ],
      exec: "discoverEndpoint",
      startTime: "5s",
    },
    categories: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "15s", target: 2 },
        { duration: "30s", target: 5 },
        { duration: "30s", target: 5 },
        { duration: "15s", target: 0 },
      ],
      exec: "categoryEndpoint",
      startTime: "8s",
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<2000", "p(99)<5000"],
    errors: ["rate<0.1"],
    health_latency: ["p(95)<500"],
    content_latency: ["p(95)<1500"],
    search_latency: ["p(95)<2000"],
  },
};

export function healthCheck() {
  const res = http.get(`${BASE_URL}/health`);
  healthLatency.add(res.timings.duration);
  const ok = check(res, {
    "health 200": (r) => r.status === 200,
    "health body ok": (r) => {
      try { return JSON.parse(r.body).code === 200; } catch { return false; }
    },
  });
  errorRate.add(!ok);
  sleep(0.5);
}

export function contentList() {
  const res = http.get(`${BASE_URL}/content?page=1&limit=10`);
  contentLatency.add(res.timings.duration);
  const ok = check(res, {
    "content 200": (r) => r.status === 200,
  });
  errorRate.add(!ok);
  sleep(1);
}

export function searchEndpoint() {
  const keywords = ["论语", "道德经", "八字", "五行", "周易", "国学", "儒家"];
  const kw = keywords[Math.floor(Math.random() * keywords.length)];
  const res = http.get(`${BASE_URL}/search?keyword=${encodeURIComponent(kw)}&page=1&limit=10`);
  searchLatency.add(res.timings.duration);
  const ok = check(res, {
    "search 200 or 401": (r) => r.status === 200 || r.status === 401,
  });
  errorRate.add(!ok);
  sleep(1.5);
}

export function discoverEndpoint() {
  const res = http.get(`${BASE_URL}/discover`);
  contentLatency.add(res.timings.duration);
  const ok = check(res, {
    "discover responds": (r) => r.status === 200 || r.status === 404,
  });
  errorRate.add(!ok);
  sleep(1);
}

export function categoryEndpoint() {
  const res = http.get(`${BASE_URL}/categories`);
  contentLatency.add(res.timings.duration);
  const ok = check(res, {
    "categories responds": (r) => r.status === 200 || r.status === 404,
  });
  errorRate.add(!ok);
  sleep(1);
}
