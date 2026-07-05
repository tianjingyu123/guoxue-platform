import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { RedisService } from "../../redis/redis.service";

/**
 * 服务端 API 性能聚合（T3 可观测·路由级 p95/p99/错误率）
 *
 * cluster×4 下 prom-client histogram 是每实例独立的，admin 看不到全局视图。
 * 本服务按任务包设计：内存缓冲（每实例）→ 每分钟 HINCRBY 刷进 Redis 分钟桶（跨实例累加）
 * → 查询时聚合近 N 分钟桶，分桶线性插值估算 p95/p99。
 *
 * 注意：flush 用 setInterval 而非 @Cron+runExclusive——这里刷的是"本实例"的缓冲，
 * 4 个实例都必须各自执行，互斥反而丢数据（与 cron 纪律的场景不同，勿"修复"）。
 * Redis 不可用（降级内存模式）时跳过 flush 丢弃当分钟数据：可观测性是尽力而为，不能反噬业务。
 */

interface RouteBucket {
  c: number; // 请求数
  e: number; // 5xx 数
  s: number; // 耗时总和 ms
  b: number[]; // 分桶计数（BUCKET_BOUNDS.length+1，末桶为溢出）
}

/** 分桶上界（ms）·与业务延迟特征匹配：本机 5-25ms 优秀，>1s 即差 */
export const BUCKET_BOUNDS = [10, 25, 50, 100, 200, 500, 1000, 3000, 10000];
const FIELD_SEP = "|";
const TOTAL_KEY = "__total";
const KEY_TTL_SEC = 25 * 3600; // 保留 25h，够看板看近 2h 且跨日对比

@Injectable()
export class ApiPerfService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ApiPerfService.name);
  private buffer = new Map<string, RouteBucket>();
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly redis: RedisService) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.flush(), 60_000);
    // unref：不阻止进程退出（测试/优雅关闭）
    if (typeof this.timer.unref === "function") this.timer.unref();
  }

  async onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    await this.flush();
  }

  /** 拦截器每请求调用（内存操作，零 IO） */
  record(method: string, route: string, ms: number, isError: boolean) {
    const key = `${method} ${route}`;
    let rb = this.buffer.get(key);
    if (!rb) {
      rb = { c: 0, e: 0, s: 0, b: new Array(BUCKET_BOUNDS.length + 1).fill(0) };
      this.buffer.set(key, rb);
    }
    rb.c++;
    rb.s += ms;
    if (isError) rb.e++;
    rb.b[this.bucketIndex(ms)]++;
  }

  bucketIndex(ms: number): number {
    for (let i = 0; i < BUCKET_BOUNDS.length; i++) {
      if (ms <= BUCKET_BOUNDS[i]) return i;
    }
    return BUCKET_BOUNDS.length;
  }

  /** UTC 分钟键：obs:api:202607051205 */
  minuteKey(date = new Date()): string {
    const p = (n: number) => String(n).padStart(2, "0");
    return `obs:api:${date.getUTCFullYear()}${p(date.getUTCMonth() + 1)}${p(date.getUTCDate())}${p(date.getUTCHours())}${p(date.getUTCMinutes())}`;
  }

  /** 本实例缓冲 → Redis 分钟桶（HINCRBY 跨实例天然累加） */
  async flush(): Promise<void> {
    if (this.buffer.size === 0) return;
    // 防御 typeof：e2e/单测常用精简 RedisService mock（无 getClient），观测不能让 teardown 抛错
    const client = typeof this.redis.getClient === "function" ? this.redis.getClient() : null;
    if (!client) {
      this.buffer.clear(); // 降级模式：丢弃，观测不反噬业务
      return;
    }
    const snapshot = this.buffer;
    this.buffer = new Map();
    const key = this.minuteKey();
    try {
      const pipe = client.pipeline();
      let totalC = 0;
      let totalE = 0;
      for (const [route, rb] of snapshot) {
        totalC += rb.c;
        totalE += rb.e;
        pipe.hincrby(key, `${route}${FIELD_SEP}c`, rb.c);
        if (rb.e) pipe.hincrby(key, `${route}${FIELD_SEP}e`, rb.e);
        pipe.hincrby(key, `${route}${FIELD_SEP}s`, Math.round(rb.s));
        rb.b.forEach((n, i) => {
          if (n) pipe.hincrby(key, `${route}${FIELD_SEP}b${i}`, n);
        });
      }
      pipe.hincrby(key, `${TOTAL_KEY}${FIELD_SEP}c`, totalC);
      if (totalE) pipe.hincrby(key, `${TOTAL_KEY}${FIELD_SEP}e`, totalE);
      pipe.expire(key, KEY_TTL_SEC);
      await pipe.exec();
    } catch (e) {
      this.logger.warn("API 性能指标 flush 失败（本分钟数据丢弃）", e as Error);
    }
  }

  /** 聚合近 N 分钟：每路由 count/错误率/avg/p95/p99 + 每分钟总量序列 */
  async query(minutes = 60) {
    const n = Math.min(Math.max(5, minutes), 120);
    const client = typeof this.redis.getClient === "function" ? this.redis.getClient() : null;
    if (!client) return { windowMinutes: n, degraded: true, routes: [], series: [], totalCount: 0, totalErrCount: 0 };

    const now = Date.now();
    const keys: Array<{ key: string; minute: string }> = [];
    for (let i = 0; i < n; i++) {
      const d = new Date(now - i * 60_000);
      keys.push({ key: this.minuteKey(d), minute: d.toISOString().slice(0, 16) });
    }
    const pipe = client.pipeline();
    keys.forEach((k) => pipe.hgetall(k.key));
    const results = (await pipe.exec()) ?? [];

    const merged = new Map<string, RouteBucket>();
    const series: Array<{ minute: string; count: number; errCount: number }> = [];
    for (let i = 0; i < keys.length; i++) {
      const hash = (results[i]?.[1] ?? {}) as Record<string, string>;
      let minuteTotal = 0;
      let minuteErr = 0;
      for (const [field, raw] of Object.entries(hash)) {
        const sep = field.lastIndexOf(FIELD_SEP);
        if (sep < 0) continue;
        const route = field.slice(0, sep);
        const kind = field.slice(sep + 1);
        const val = Number(raw) || 0;
        if (route === TOTAL_KEY) {
          if (kind === "c") minuteTotal = val;
          if (kind === "e") minuteErr = val;
          continue;
        }
        let rb = merged.get(route);
        if (!rb) {
          rb = { c: 0, e: 0, s: 0, b: new Array(BUCKET_BOUNDS.length + 1).fill(0) };
          merged.set(route, rb);
        }
        if (kind === "c") rb.c += val;
        else if (kind === "e") rb.e += val;
        else if (kind === "s") rb.s += val;
        else if (kind.startsWith("b")) {
          const bi = Number(kind.slice(1));
          if (bi >= 0 && bi < rb.b.length) rb.b[bi] += val;
        }
      }
      series.push({ minute: keys[i].minute, count: minuteTotal, errCount: minuteErr });
    }
    series.reverse(); // 时间正序

    const routes = Array.from(merged.entries()).map(([route, rb]) => ({
      route,
      count: rb.c,
      errCount: rb.e,
      errRate: rb.c > 0 ? rb.e / rb.c : 0,
      avgMs: rb.c > 0 ? Math.round(rb.s / rb.c) : 0,
      p95Ms: this.estimatePercentile(rb.b, 0.95),
      p99Ms: this.estimatePercentile(rb.b, 0.99),
    }));
    routes.sort((a, b) => b.count - a.count);
    const totalCount = routes.reduce((acc, r) => acc + r.count, 0);
    const totalErrCount = routes.reduce((acc, r) => acc + r.errCount, 0);
    return { windowMinutes: n, degraded: false, totalCount, totalErrCount, routes: routes.slice(0, 100), series };
  }

  /** 分桶线性插值估算分位数（ms）·样本落在末溢出桶时返回末界值 */
  estimatePercentile(buckets: number[], q: number): number {
    const total = buckets.reduce((a, b) => a + b, 0);
    if (total === 0) return 0;
    const target = total * q;
    let cum = 0;
    for (let i = 0; i < buckets.length; i++) {
      if (buckets[i] === 0) continue;
      const prevCum = cum;
      cum += buckets[i];
      if (cum >= target) {
        const lo = i === 0 ? 0 : BUCKET_BOUNDS[i - 1];
        const hi = i < BUCKET_BOUNDS.length ? BUCKET_BOUNDS[i] : BUCKET_BOUNDS[BUCKET_BOUNDS.length - 1];
        const frac = (target - prevCum) / buckets[i];
        return Math.round(lo + (hi - lo) * frac);
      }
    }
    return BUCKET_BOUNDS[BUCKET_BOUNDS.length - 1];
  }
}
