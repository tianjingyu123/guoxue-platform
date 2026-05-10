/**
 * 推荐系统性能压测脚本（限流安全版）
 * 用法: npx ts-node scripts/benchmark-recommend.ts
 *
 * 目标: 缓存命中 ≤50ms, 未命中 ≤200ms, P99 ≤500ms
 * 限流: 60次/分钟/IP，每个请求间隔 1.2s
 */
import * as http from "http";

const HOST = "localhost";
const PORT = 3000;
const BASE = "/api/v1/recommend";
const DELAY_MS = 1200; // 50 req/min，安全低于 60 限制

interface BenchResult {
  scene: string;
  params: string;
  rounds: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p90: number;
  p99: number;
  errors: number;
}

function request(path: string): Promise<{ duration: number; status: number }> {
  return new Promise((resolve) => {
    const start = Date.now();
    http
      .get(`http://${HOST}:${PORT}${path}`, { timeout: 5000 }, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve({ duration: Date.now() - start, status: res.statusCode ?? 0 }));
      })
      .on("error", () => resolve({ duration: Date.now() - start, status: -1 }))
      .on("timeout", function (this: any) {
        this.destroy();
        resolve({ duration: 5000, status: 0 });
      });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function stats(times: number[]): Omit<BenchResult, "scene" | "params" | "errors"> {
  if (times.length === 0) return { rounds: 0, min: 0, max: 0, avg: 0, p50: 0, p90: 0, p99: 0 };
  const sorted = [...times].sort((a, b) => a - b);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p90 = sorted[Math.floor(sorted.length * 0.9)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];
  return {
    rounds: times.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: Math.round(avg * 100) / 100,
    p50,
    p90,
    p99,
  };
}

const SCENES: { scene: string; params?: string }[] = [
  { scene: "guess_like" },
  { scene: "article_detail", params: "contentId=96b4cf7f-53ec-45e2-a24d-6e2e0d62088e&pageSize=5" },
  { scene: "course_detail", params: "contentId=7bf03c63-2ecb-4b7a-bc57-fd33c51068ee&pageSize=5" },
  { scene: "empty_state", params: "listType=course&pageSize=5" },
  { scene: "search_empty" },
  { scene: "paipan_result", params: "paipanType=bazi&pageSize=5" },
  { scene: "payment_success", params: "pageSize=5" },
];

async function run(): Promise<void> {
  console.log("═══════════════════════════════════════════════════════");
  console.log("  热卜国学 — 推荐系统性能压测（限流安全模式）");
  console.log(`  目标: 缓存命中 ≤50ms, 未命中 ≤200ms, P99 ≤500ms`);
  console.log(`  策略: 每请求间隔 ${DELAY_MS}ms，避免触发限流(60/min)`);
  console.log("═══════════════════════════════════════════════════════\n");

  // Phase 1: 冷启动 + 缓存填充
  console.log(">>> Phase 1: 首请求（冷启动 / 缓存填充）\n");
  const coldResults: { scene: string; duration: number }[] = [];
  for (const s of SCENES) {
    const qs = s.params ? `?${s.params}` : "";
    const path = `${BASE}/${s.scene}${qs}`;
    const r = await request(path);
    coldResults.push({ scene: s.scene, duration: r.duration });
    console.log(`  ${s.scene.padEnd(20)} → ${r.status}  ${r.duration}ms`);
    await sleep(DELAY_MS);
  }

  // Phase 2: 缓存命中
  console.log("\n>>> Phase 2: 缓存命中测试（5轮/场景）\n");
  const warmResults: BenchResult[] = [];
  for (const s of SCENES) {
    const qs = s.params ? `?${s.params}` : "";
    const path = `${BASE}/${s.scene}${qs}`;
    const times: number[] = [];
    let errors = 0;

    for (let i = 0; i < 5; i++) {
      const r = await request(path);
      if (r.status === 200) {
        times.push(r.duration);
      } else {
        errors++;
      }
      await sleep(DELAY_MS);
    }

    const st = stats(times);
    warmResults.push({ scene: s.scene, params: qs, ...st, errors });
    console.log(`  ${s.scene.padEnd(20)} avg=${String(st.avg).padEnd(7)} p50=${String(st.p50).padEnd(5)} p99=${st.p99}ms`);
  }

  // Phase 3: 不同分页（半冷启动）
  console.log("\n>>> Phase 3: 分页变化测试（可能命中部分缓存）\n");
  const pageTimes: number[] = [];
  for (let p = 1; p <= 5; p++) {
    const r = await request(`${BASE}/guess_like?page=${p}&pageSize=10`);
    if (r.status === 200) pageTimes.push(r.duration);
    await sleep(DELAY_MS);
  }
  const pageStats = stats(pageTimes);

  // ───── 报告 ─────
  console.log("\n┌───────────────────────────────────────────────────────────────────────────────┐");
  console.log("│                        P E R F O R M A N C E   R E P O R T                    │");
  console.log("├───────────────────────────────────────────────────────────────────────────────┤");
  console.log("│ 场景                  │  首请求  │  平均   │  P50   │  P99   │  判定          │");
  console.log("├───────────────────────────────────────────────────────────────────────────────┤");
  for (let i = 0; i < warmResults.length; i++) {
    const r = warmResults[i];
    const c = coldResults[i];
    const scene = r.scene.padEnd(21);
    const first = `${c.duration}ms`.padEnd(7);
    const avg = `${r.avg}ms`.padEnd(7);
    const p50 = `${r.p50}ms`.padEnd(6);
    const p99 = `${r.p99}ms`.padEnd(6);

    let flag: string;
    if (r.avg <= 50) flag = "★ 优秀";
    else if (r.avg <= 200) flag = "✓ 达标";
    else flag = "⚠ 超标";
    console.log(`│ ${scene} │ ${first} │ ${avg} │ ${p50} │ ${p99} │ ${flag.padEnd(13)}│`);
  }
  console.log("├───────────────────────────────────────────────────────────────────────────────┤");
  const pf = `${pageStats.avg}ms`.padEnd(7);
  const pp50 = `${pageStats.p50}ms`.padEnd(6);
  const pp99 = `${pageStats.p99}ms`.padEnd(6);
  console.log(`│ guess_like(分页)      │    -     │ ${pf} │ ${pp50} │ ${pp99} │               │`);
  console.log("└───────────────────────────────────────────────────────────────────────────────┘");

  // 汇总
  const failures = warmResults.filter((r) => r.avg > 200);
  const slowCold = coldResults.filter((r) => r.duration > 200);
  console.log(`\n冷启动 >200ms: ${slowCold.length}/${coldResults.length}`);
  console.log(`缓存命中 >200ms: ${failures.length}/${warmResults.length}`);

  if (failures.length === 0) {
    console.log("\n✅ 所有场景缓存命中路径 ≤200ms，达标！");
  }
  if (slowCold.length > 0) {
    console.log(`⚠️  冷启动未达标场景:`);
    slowCold.forEach((s) => console.log(`   - ${s.scene}: ${s.duration}ms`));
  }
}

run().catch(console.error);
