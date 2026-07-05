import { Test } from "@nestjs/testing";
import { NginxLogService, NginxWindowStat } from "./nginx-log.service";
import { RedisService } from "../../redis/redis.service";

/**
 * nginx 日志分析单测（T3）：combined 行解析、路径归一化、聚合统计。
 * 文件增量读取逻辑依赖生产文件系统，此处只测纯函数（部署冒烟覆盖端到端）。
 */

const mockRedis = {
  runExclusive: jest.fn((_n: string, _t: number, fn: () => Promise<unknown>) => fn()),
  getJson: jest.fn(),
  setJson: jest.fn(),
};

const SAMPLE = [
  '1.2.3.4 - - [05/Jul/2026:12:19:50 +0800] "GET /h5/assets/x.js HTTP/2.0" 200 584 "-" "UA"',
  '1.2.3.4 - - [05/Jul/2026:12:19:51 +0800] "GET /api/v1/orders/123456?x=1 HTTP/2.0" 500 10 "-" "UA"',
  '1.2.3.4 - - [05/Jul/2026:12:19:52 +0800] "POST /api/v1/orders/56caa8c7-1d3d-4c2b-8f95-fee68d8a8c5e/pay HTTP/1.1" 502 0 "-" "UA"',
  '1.2.3.4 - - [05/Jul/2026:12:19:53 +0800] "GET /api/v1/health HTTP/1.1" 404 0 "-" "UA"',
  "malformed line without request",
].join("\n");

describe("NginxLogService", () => {
  let svc: NginxLogService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await Test.createTestingModule({
      providers: [NginxLogService, { provide: RedisService, useValue: mockRedis }],
    }).compile();
    svc = mod.get(NginxLogService);
  });

  it("normalizePath：去 query·数值段与 uuid 段归一为 :id", () => {
    expect(svc.normalizePath("/api/v1/orders/123456?x=1")).toBe("/api/v1/orders/:id");
    expect(svc.normalizePath("/api/v1/orders/56caa8c7-1d3d-4c2b-8f95-fee68d8a8c5e/pay")).toBe("/api/v1/orders/:id/pay");
    expect(svc.normalizePath("/h5/assets/x.js")).toBe("/h5/assets/x.js");
  });

  it("aggregate：统计 total/4xx/5xx/率/top 路由，坏行跳过", () => {
    const out: NginxWindowStat = {
      at: "", windowSec: 300, total: 0, s4xx: 0, s5xx: 0, rate5xx: 0, truncated: false, topPaths: [], top5xxPaths: [],
    };
    svc.aggregate(SAMPLE, out);
    expect(out.total).toBe(4);
    expect(out.s5xx).toBe(2);
    expect(out.s4xx).toBe(1);
    expect(out.rate5xx).toBeCloseTo(0.5);
    expect(out.top5xxPaths).toHaveLength(2);
    expect(out.top5xxPaths.map((p) => p.path)).toContain("/api/v1/orders/:id");
    expect(out.topPaths[0].count).toBeGreaterThanOrEqual(1);
  });

  it("cron 非 linux 平台直接跳过（本测试环境即如此）", async () => {
    await svc.cron();
    expect(mockRedis.runExclusive).not.toHaveBeenCalled();
  });
});
