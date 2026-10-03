/**
 * 金样核对子进程（由 paipan-engine-golden.spec.ts 调起）。
 *
 * 为什么不在 jest 里直接跑：jest 给测试的 process.env 是沙箱副本，
 * 赋值 TZ 不会触发 Node 真实的时区钩子 —— 时区锁在 jest 里测不出来，必须真进程。
 *
 * 用法：ts-node --transpile-only golden-runner.ts <tool> <年份逗号分隔|all>
 * 输出：一行 JSON { tzInside, tzAfter, tzBefore, byYear, calls, jsonSafe }
 */
import "reflect-metadata";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { PaipanEngineService } from "../../../src/modules/paipan/engine/paipan-engine.service";
import { withEngineTz } from "../../../src/modules/paipan/engine/engine-tz";

import { CASES } from "./cases";

const [tool, pickArg] = process.argv.slice(2);
const g = JSON.parse(fs.readFileSync(path.join(__dirname, `${tool}.golden.json`), "utf8"));

function assertJsonSafe(v: unknown, p = "$"): void {
  if (v === null || typeof v === "string" || typeof v === "boolean") return;
  if (typeof v === "number") {
    if (!Number.isFinite(v)) throw new Error(`非有限数 ${p}=${v}`);
    return;
  }
  if (Array.isArray(v)) return v.forEach((x, i) => assertJsonSafe(x, `${p}[${i}]`));
  if (typeof v === "object" && Object.getPrototypeOf(v) === Object.prototype) {
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      // 对象字段为 undefined 允许：过 HTTP 后键消失，JS 读取仍是 undefined（数组里的 undefined 会变 null，仍拒绝）
      if (x === undefined) continue;
      assertJsonSafe(x, `${p}.${k}`);
    }
    return;
  }
  throw new Error(`非纯 JSON 值 ${p}（${Object.prototype.toString.call(v)}）`);
}

const probe = () => new Date(Date.UTC(2026, 0, 1)).getTimezoneOffset();
const tzBefore = probe();
const tzInside = withEngineTz(probe);
const svc = new PaipanEngineService();
let calls = 0;

/** 分组模式（cases.ts）：只算选中的分组，其余用例跳过不执行 */
if (g.mode === "groups") {
  const pick = pickArg === "all" ? null : new Set(pickArg.split(","));
  const hashes = new Map<string, crypto.Hash>();
  const ctx = {
    kangxi: JSON.parse(fs.readFileSync(path.join(__dirname, "../../../../../packages/shared/src/paipan/data/kangxi-strokes.json"), "utf8")),
  };
  for (const [group, body] of CASES[tool](ctx)) {
    if (pick && !pick.has(group)) continue;
    let h = hashes.get(group);
    if (!h) { h = crypto.createHash("sha256"); hashes.set(group, h); }
    // 引擎/入参报错以 { error: 原文 } 计入指纹（服务层已把引擎的普通 Error 转成带原文的 400）
    let r: unknown;
    try { r = svc.run(tool, body); } catch (e) { r = { error: String((e as Error)?.message ?? e) }; }
    assertJsonSafe(r);
    h.update(JSON.stringify(JSON.parse(JSON.stringify(r))));
    h.update("\n");
    calls++;
  }
  const byGroup = Object.fromEntries([...hashes].map(([k, h]) => [k, h.digest("hex").slice(0, 16)]));
  process.stdout.write(JSON.stringify({ tzBefore, tzInside, tzAfter: probe(), byGroup, calls, jsonSafe: true }) + "\n");
  process.exit(0);
}

const years: number[] = pickArg === "all" ? Object.keys(g.byYear).map(Number) : pickArg.split(",").map(Number);
const byYear: Record<number, string> = {};
for (const y of years) {
  const h = crypto.createHash("sha256");
  for (let m = 1; m <= 12; m++) {
    const dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
    for (let d = 1; d <= dim; d++) {
      for (const [panShi, hours] of Object.entries(g.spec.byPanShi as Record<string, number[]>)) {
        for (const hour of hours) {
          for (const suanFa of g.spec.suanFa as string[]) {
            const r = svc.run(tool, { year: y, month: m, day: d, hour, minute: 0, panShi, suanFa });
            assertJsonSafe(r);
            h.update(JSON.stringify(JSON.parse(JSON.stringify(r))));
            h.update("\n");
            calls++;
          }
        }
      }
    }
  }
  byYear[y] = h.digest("hex").slice(0, 16);
}
process.stdout.write(JSON.stringify({ tzBefore, tzInside, tzAfter: probe(), byYear, calls, jsonSafe: true }) + "\n");
