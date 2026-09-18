/**
 * 规则自测：用合成数据跑全部规则，断言命中与误报边界。
 * 不连接任何数据库、不访问网络。运行：node scripts/ops/entitlement-audit/selftest.mjs
 */

import { buildSnapshot, EXPECTED_FINDINGS, EXPECTED_CLEAN, EXPECTED_OBSERVATIONS } from "./fixtures.mjs";
import { runRules, maskRef, setRefSalt } from "./rules.mjs";

// 自测固定盐，保证脱敏引用可重复比对（生产运行默认每次随机）
setRefSalt("selftest-fixed-salt");

let pass = 0;
let fail = 0;
const failures = [];

function check(name, ok, detail) {
  if (ok) {
    pass += 1;
  } else {
    fail += 1;
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const snap = buildSnapshot();
const result = runRules(snap, { graceMinutes: 15, maxFindingsPerRule: 50 });

// findings 里只有脱敏 ref，自测时按 maskRef(合成 id) 反查
const hit = new Set(result.findings.map((f) => `${f.rule}|${f.orderRef}`));

console.log("=== 权益异常只读检测 · 规则自测 ===");
console.log(`合成订单 ${snap.orders.length} 笔 / 台账 ${snap.entitlementLedger.length} 条 / 余额 ${snap.entitlementBalance.length} 条`);
console.log("");

// ① 期望命中
for (const e of EXPECTED_FINDINGS) {
  const key = `${e.rule}|${maskRef(e.orderId)}`;
  const found = result.findings.find((f) => `${f.rule}|${f.orderRef}` === key);
  check(
    `应命中 ${e.rule} @ ${e.orderId}`,
    Boolean(found) && found.severity === e.severity,
    found ? `severity=${found.severity} 期望=${e.severity}` : "未命中",
  );
}

// ② 误报边界：这些订单不应出现在任何 finding 中
for (const id of EXPECTED_CLEAN) {
  const ref = maskRef(id);
  const any = result.findings.filter((f) => f.orderRef === ref);
  check(`不应误报 ${id}`, any.length === 0, any.map((f) => f.rule).join(","));
}

// ③ observation
for (const e of EXPECTED_OBSERVATIONS) {
  const o = result.observations.find((x) => x.rule === e.rule && x.aspect === e.aspect);
  check(
    `应产生观察项 ${e.rule}/${e.aspect}`,
    Boolean(o) && (o.count ?? 0) >= e.minCount,
    o ? `count=${o.count}` : "未产生",
  );
}

// ④ 真源未覆盖类型必须如实计数，不能静默当成正常
const lsReview = result.needsReview.find((x) => x.orderType === "LIVESTREAM");
check("真源未覆盖类型计入 needsReview", Boolean(lsReview) && lsReview.count >= 1,
  lsReview ? `count=${lsReview.count}` : "未计数");

// ⑤ 台账缺失必须标注是否影响访问，不能一律说成用户拿不到
const courseLedger = result.findings.find(
  (f) => f.rule === "ledger_inconsistent" && f.orderRef === maskRef("syn-ord-course-noledger"),
);
check("课程台账缺失标注 impactsAccess=false", courseLedger?.impactsAccess === false,
  `impactsAccess=${courseLedger?.impactsAccess}`);

// ⑥ 输出不得包含明文订单号 / 用户号 / 精确金额
const serialized = JSON.stringify(result);
check("输出不含明文合成订单号", !serialized.includes("syn-ord-circle-gap"));
check("输出不含明文合成用户号", !serialized.includes("syn-u4\""));
check("输出不含精确金额字段", !/"amount":/.test(serialized) && !/"payAmount":/.test(serialized));

// ⑦ 发放延迟分桶存在且为桶名而非精确毫秒
check("发放延迟输出为分桶", result.grantDelay.every((d) => typeof d.bucket === "string"));

// ⑧ 脱敏引用必须唯一（早期版本首尾各取 4 位会把多条不同订单撞成同一引用）
const allRefs = result.findings.map((f) => f.orderRef);
const distinctSourceIds = new Set(
  EXPECTED_FINDINGS.map((e) => e.orderId).concat(EXPECTED_CLEAN),
);
const refMap = new Map();
for (const id of distinctSourceIds) {
  const r = maskRef(id);
  refMap.set(r, (refMap.get(r) ?? 0) + 1);
}
check("脱敏引用无碰撞", [...refMap.values()].every((n) => n === 1),
  [...refMap.entries()].filter(([, n]) => n > 1).map(([r]) => r).join(","));

// ⑨ 每条规则的命中数必须与期望完全一致（防止「多报也算通过」）
const expectedCounts = EXPECTED_FINDINGS.reduce((m, e) => {
  m[e.rule] = (m[e.rule] ?? 0) + 1;
  return m;
}, {});
const actualCounts = result.findings.reduce((m, f) => {
  m[f.rule] = (m[f.rule] ?? 0) + 1;
  return m;
}, {});
for (const rule of new Set([...Object.keys(expectedCounts), ...Object.keys(actualCounts)])) {
  check(
    `规则 ${rule} 命中数精确匹配`,
    (expectedCounts[rule] ?? 0) === (actualCounts[rule] ?? 0),
    `期望 ${expectedCounts[rule] ?? 0} 实际 ${actualCounts[rule] ?? 0}`,
  );
}

// ⑩ 同一订单不得被两条以上规则同时高危上报（去重检查）
const highByRef = new Map();
for (const f of result.findings) {
  if (f.severity !== "high") continue;
  highByRef.set(f.orderRef, (highByRef.get(f.orderRef) ?? 0) + 1);
}
check("同一订单不重复高危上报", [...highByRef.values()].every((n) => n === 1));
void allRefs;

// ⑪ SQL 只读门禁：正常语句放行，写语句/多语句一律中止
// 注意：run.mjs 顶层会执行 main()，不能在自测里 import 它（会产生副作用），
// 因此此处内联同一套判定逻辑；两边若出现分歧，以 run.mjs 为准并同步修改本段。
{
  const forbidden =
    /\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|copy|merge|call|do|vacuum|refresh|comment|reindex|lock|set\s+role|security\s+label)\b/i;
  const strip = (s) => s.replace(/--[^\n]*/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ");
  const gate = (sql) => {
    const t = strip(sql);
    if (forbidden.test(t)) return "rejected:keyword";
    if (!/^\s*select\b/i.test(t.trim())) return "rejected:not-select";
    if (/;\s*\S/.test(t.trim().replace(/;\s*$/, ""))) return "rejected:multi";
    return "allowed";
  };
  check("只读门禁放行正常 SELECT", gate('SELECT id FROM "Order" WHERE id = $1;') === "allowed");
  check("只读门禁拒绝 UPDATE", gate('UPDATE "Order" SET status = 1;') === "rejected:keyword");
  check("只读门禁拒绝注释绕过", gate('SELECT 1; -- x\nDELETE FROM "Order";') === "rejected:keyword");
  check("只读门禁拒绝多语句", gate("SELECT 1; SELECT 2;") === "rejected:multi");
  check("只读门禁拒绝非 SELECT 开头", gate("WITH x AS (SELECT 1) SELECT * FROM x;") === "rejected:not-select");
}

console.log("--- 命中汇总 ---");
for (const [k, v] of Object.entries(result.summary).sort()) console.log(`  ${k} = ${v}`);
console.log("");
console.log("--- 发放延迟分布 ---");
for (const d of result.grantDelay) console.log(`  ${d.orderType} ${d.bucket} = ${d.count}`);
console.log("");
console.log("--- 真源未覆盖（needsReview）---");
for (const d of result.needsReview) console.log(`  ${d.orderType} = ${d.count}`);
console.log("");
console.log("--- findings（脱敏）---");
for (const f of result.findings.sort((a, b) => a.rule.localeCompare(b.rule))) {
  console.log(`  [${f.severity}] ${f.rule} ${f.orderType} ${f.orderRef} ${f.reason ?? f.aspect ?? ""}`);
}
console.log("");
console.log(`=== 断言 ${pass} 通过 / ${fail} 失败 ===`);
if (fail > 0) {
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exit(1);
}
process.exit(0);
