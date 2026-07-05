import { Test } from "@nestjs/testing";
import { ApiPerfService, BUCKET_BOUNDS } from "./api-perf.service";
import { RedisService } from "../../redis/redis.service";

/**
 * API 性能聚合单测（T3）：分桶、分位数估算、flush 管线、降级跳过、查询合并。
 */

function makePipeline() {
  const pipe = {
    hincrby: jest.fn().mockReturnThis(),
    hgetall: jest.fn().mockReturnThis(),
    expire: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
  };
  return pipe;
}

const mockClient = { pipeline: jest.fn() };
const mockRedis = { getClient: jest.fn(() => mockClient) };

describe("ApiPerfService", () => {
  let svc: ApiPerfService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await Test.createTestingModule({
      providers: [ApiPerfService, { provide: RedisService, useValue: mockRedis }],
    }).compile();
    svc = mod.get(ApiPerfService);
  });

  it("bucketIndex 边界：10ms 落桶0，11ms 落桶1，超末界落溢出桶", () => {
    expect(svc.bucketIndex(10)).toBe(0);
    expect(svc.bucketIndex(11)).toBe(1);
    expect(svc.bucketIndex(99999)).toBe(BUCKET_BOUNDS.length);
  });

  it("estimatePercentile：全部落 50-100ms 桶时 p95 在区间内线性插值", () => {
    const b = new Array(BUCKET_BOUNDS.length + 1).fill(0);
    b[3] = 100; // (50,100] 桶
    const p95 = svc.estimatePercentile(b, 0.95);
    expect(p95).toBeGreaterThan(90);
    expect(p95).toBeLessThanOrEqual(100);
    expect(svc.estimatePercentile(new Array(10).fill(0), 0.95)).toBe(0);
  });

  it("record 累计同路由：count/err/sum/分桶", async () => {
    svc.record("GET", "/api/v1/x", 20, false);
    svc.record("GET", "/api/v1/x", 600, true);
    const pipe = makePipeline();
    mockClient.pipeline.mockReturnValue(pipe);
    await svc.flush();
    // c=2 一次、e=1 一次、s=620 一次、b1(20ms)与b6(600ms)各一次 + __total
    expect(pipe.hincrby).toHaveBeenCalledWith(expect.stringMatching(/^obs:api:\d{12}$/), "GET /api/v1/x|c", 2);
    expect(pipe.hincrby).toHaveBeenCalledWith(expect.any(String), "GET /api/v1/x|e", 1);
    expect(pipe.hincrby).toHaveBeenCalledWith(expect.any(String), "GET /api/v1/x|s", 620);
    expect(pipe.hincrby).toHaveBeenCalledWith(expect.any(String), "__total|c", 2);
    expect(pipe.expire).toHaveBeenCalled();
  });

  it("flush：Redis 降级（getClient=null）时丢弃缓冲不抛错", async () => {
    svc.record("GET", "/x", 10, false);
    mockRedis.getClient.mockReturnValueOnce(null as unknown as typeof mockClient);
    await expect(svc.flush()).resolves.toBeUndefined();
    // 缓冲已清：再次 flush 无数据直接返回（pipeline 不被调用）
    await svc.flush();
    expect(mockClient.pipeline).not.toHaveBeenCalled();
  });

  it("query：合并多分钟桶并按 count 降序·序列时间正序", async () => {
    const pipe = makePipeline();
    // 每分钟返回相同 hash：路由 A 2次(其中1错)，__total 2/1
    pipe.exec.mockResolvedValue(
      Array.from({ length: 5 }, () => [null, { "GET /a|c": "2", "GET /a|e": "1", "GET /a|s": "100", "GET /a|b1": "2", "__total|c": "2", "__total|e": "1" }]),
    );
    mockClient.pipeline.mockReturnValue(pipe);
    const r = await svc.query(5);
    expect(r.windowMinutes).toBe(5);
    expect(r.totalCount).toBe(10);
    expect(r.routes[0]).toMatchObject({ route: "GET /a", count: 10, errCount: 5, avgMs: 50 });
    expect(r.routes[0].errRate).toBeCloseTo(0.5);
    expect(r.series).toHaveLength(5);
    expect(r.series[0].count).toBe(2);
  });

  it("query：分钟数钳制 5-120", async () => {
    const pipe = makePipeline();
    pipe.exec.mockResolvedValue([]);
    mockClient.pipeline.mockReturnValue(pipe);
    expect((await svc.query(999)).windowMinutes).toBe(120);
    expect((await svc.query(1)).windowMinutes).toBe(5);
  });
});
