#!/usr/bin/env node
/**
 * 证明「候选验证确实加载的是候选客户端」，而不是靠抢时间窗碰巧对上。
 *
 * 断言顺序是有讲究的：A4 必须在装解析钩子**之前**跑，否则它查的就不是共享目录了。
 *
 *  A4 共享 `node_modules` 里那一份客户端**没有**候选字段 ——
 *     这条证明候选生成没有覆盖主工作区，而不只是证明候选自己是对的。
 *     A4 失败说明又发生了覆盖（不论是谁跑的），此时主工作区与其他窗口都在用错误的客户端。
 *  A1 候选客户端存在，且其 schema sha256 与当前 `schema.prisma` 一致（不是过期产物）；
 *  A2 装钩子后，`require("@prisma/client")` 实际解析到候选目录；
 *  A3 候选客户端的 DMMF 里**有**本候选新增的字段；
 *  A6 从 `apps/server/src` 内部发起的解析同样落到候选目录 ——
 *     被测源码的 `instanceof Prisma.PrismaClientKnownRequestError` 依赖这一点；
 *  A5 候选验证脚本不再直接 `require("@prisma/client")`。
 *
 * 不连数据库，纯文件与模块解析层面的检查。
 */

import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = resolve(HERE, "../../../apps/server");
const ROOT = resolve(HERE, "../../..");

/** 本候选新增、且只应出现在候选客户端里的字段 */
const CANDIDATE_FIELDS = [
  { model: "CircleRevenueRecord", field: "orderId", unit: "B 单元·收益按订单幂等" },
  { model: "User", field: "privacySettings", unit: "D 单元·隐私偏好" },
];

let pass = 0;
let fail = 0;
const lines = [];
function check(name, ok, detail = "") {
  if (ok) pass += 1;
  else fail += 1;
  lines.push(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

/** 从一份已加载的客户端里取模型字段名（走 DMMF，比读 .d.ts 文本可靠） */
function fieldsOf(PrismaNs, model) {
  const dmmf = PrismaNs?.dmmf ?? PrismaNs?.Prisma?.dmmf;
  const m = dmmf?.datamodel?.models?.find((x) => x.name === model);
  return m ? m.fields.map((f) => f.name) : null;
}

// ══ A4：先查共享客户端（必须在装钩子之前）══
const sharedReq = createRequire(join(SERVER_DIR, "package.json"));
let sharedResolved = null;
try {
  sharedResolved = sharedReq.resolve("@prisma/client");
} catch {
  /* 共享客户端不可解析（例如依赖链接未建） */
}
if (!sharedResolved) {
  check("A4 共享 node_modules 客户端未被候选字段污染", true, "共享客户端当前不可解析（依赖链接未建），无覆盖风险");
} else {
  const shared = sharedReq("@prisma/client");
  const dirty = [];
  for (const { model, field } of CANDIDATE_FIELDS) {
    const fields = fieldsOf(shared.Prisma, model);
    if (fields?.includes(field)) dirty.push(`${model}.${field}`);
  }
  check(
    "A4 共享 node_modules 客户端未被候选字段污染",
    dirty.length === 0,
    dirty.length
      ? `已被污染：${dirty.join("、")} → 有人把候选 schema 生成进了共享目录，主工作区与其他窗口正在用错误的客户端`
      : "共享客户端形态=主线",
  );
}

// ══ A1 / A2 / A3：装钩子并检查候选客户端 ══
const { loadCandidatePrisma, CANDIDATE_CLIENT_DIR } = await import("./client.mjs");
let candidate = null;
try {
  candidate = loadCandidatePrisma();
  check("A1 候选客户端存在且与当前 schema 一致", true, `schema=${candidate.meta.schemaSha256.slice(0, 12)}…`);
} catch (e) {
  check("A1 候选客户端存在且与当前 schema 一致", false, e.message.split("\n")[0]);
}

if (candidate) {
  check("A2 装钩子后 require(\"@prisma/client\") 解析到候选目录",
    candidate.resolved.startsWith(CANDIDATE_CLIENT_DIR + sep), candidate.resolved);

  for (const { model, field, unit } of CANDIDATE_FIELDS) {
    const fields = fieldsOf(candidate.Prisma, model);
    check(`A3 候选客户端含 ${model}.${field}（${unit}）`, !!fields?.includes(field),
      fields ? `字段数=${fields.length}` : "模型未找到");
  }

  // ══ A6：源码目录内部发起的解析同样落到候选 ══
  const fromSrc = createRequire(join(SERVER_DIR, "src", "common", "__resolve_probe__.js"));
  let srcResolved = "";
  try {
    srcResolved = fromSrc.resolve("@prisma/client");
  } catch (e) {
    srcResolved = `解析失败：${e.message}`;
  }
  check("A6 apps/server/src 内部的解析也落到候选目录（instanceof 才成立）",
    srcResolved.startsWith(CANDIDATE_CLIENT_DIR + sep), srcResolved);

  // 同一份模块实例：源码与脚本拿到的 Prisma 必须是同一个对象，否则 instanceof 仍会失效
  check("A6 源码与脚本拿到同一个模块实例", fromSrc("@prisma/client") === candidate.Prisma.__proto__ ||
    fromSrc("@prisma/client").Prisma === candidate.Prisma,
    "require 缓存命中同一路径");
}

// ══ A5：候选验证脚本不得再直接 require("@prisma/client") ══
const GUARDED = [
  "scripts/ops/circle-fulfillment-repro/repro.mjs",
  "scripts/ops/circle-fulfillment-repro/concurrency.mjs",
  "scripts/ops/circle-fulfillment-repro/integration.mjs",
  "scripts/ops/circle-fulfillment-repro/revenue.mjs",
  "scripts/ops/circle-fulfillment-repro/legacy-fulfillment.mjs",
  "scripts/ops/privacy-preferences-verify/verify.mjs",
];
const offenders = GUARDED.filter((rel) => {
  const p = join(ROOT, rel);
  if (!existsSync(p)) return false;
  return /req\(\s*["']@prisma\/client["']\s*\)/.test(readFileSync(p, "utf8"));
});
check("A5 候选验证脚本不再直接 require(\"@prisma/client\")", offenders.length === 0,
  offenders.length ? offenders.join("、") : `已检查 ${GUARDED.length} 个脚本`);

// ══ A7：候选 jest 配置确实把 @prisma/client 映射到候选目录 ══
{
  const cfgPath = join(HERE, "jest.candidate.config.cjs");
  let mapped = null;
  try {
    const cfg = createRequire(join(HERE, "assert-isolation.mjs"))(cfgPath);
    mapped = cfg?.moduleNameMapper?.["^@prisma/client$"] ?? null;
  } catch (e) {
    mapped = `加载失败：${e.message}`;
  }
  check("A7 候选 jest 配置把 @prisma/client 映射到候选目录", mapped === CANDIDATE_CLIENT_DIR,
    String(mapped));
}

// ══ A8：基础 tsconfig 不含该映射（否则上面的反证没有意义）══
{
  const base = readFileSync(join(SERVER_DIR, "tsconfig.json"), "utf8");
  const cand = readFileSync(join(HERE, "tsconfig.candidate.json"), "utf8");
  check("A8 基础 tsconfig 未映射 @prisma/client（反证成立的前提）",
    !/"@prisma\/client"/.test(base), "apps/server/tsconfig.json 保持原样");
  check("A8 候选 tsconfig 映射到候选客户端",
    /\.prisma-candidate\/client/.test(cand), "tsconfig.candidate.json");
}

console.log("=== 候选 Prisma 客户端隔离断言 ===");
console.log(lines.join("\n"));
console.log(`=== ${pass} 通过 / ${fail} 失败 ===`);
process.exitCode = fail > 0 ? 1 : 0;
