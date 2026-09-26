#!/usr/bin/env node
/**
 * 候选 Prisma 客户端的**独立生成**。
 *
 * ── 为什么需要这个 ──────────────────────────────────────────────────────────
 * 工作树通过 junction 共用主工作区的 `node_modules`，而 `prisma generate` 默认把客户端
 * 写进 `node_modules/.pnpm/@prisma+client@<版本>/node_modules/.prisma/client`。
 * 于是「按候选 schema 生成」这个动作会**覆盖主工作区正在用的那一份客户端**：
 *   · 主工作区的类型检查、测试、以及其他窗口的 dev server 会看到候选 schema 的字段；
 *   · 反过来，其他窗口执行一次 `prisma generate` 就把候选客户端冲掉，
 *     候选侧的验证会在中途报 `Unknown argument orderId`。
 * 本轮之前的做法是「把生成和测试塞进同一条命令里抢时间窗」——那不是隔离，只是缩短竞态窗口。
 *
 * ── 做法 ────────────────────────────────────────────────────────────────────
 * 由真实 schema **派生**一份只改了 `generator.output` 的副本，生成到工作树内的
 * `apps/server/.prisma-candidate/client`，完全不碰 `node_modules`。
 *
 * 派生而不是另存一份，是为了杜绝 schema 漂移：每次生成都从 `schema.prisma` 重新派生，
 * 并把源 schema 的 sha256 写进 `meta.json`，`assert-isolation.mjs` 会核对它与当前
 * schema 一致 —— 客户端与 schema 对不上时验证直接失败，而不是拿旧客户端跑出绿色结果。
 *
 * 输出目录放在 `apps/server/` 下面而不是仓库根：生成的客户端要 `require("@prisma/client/runtime/*")`，
 * 而 `@prisma/client` 只存在于 `apps/server/node_modules`（pnpm 不提升到根）。
 *
 * 不写 `node_modules`、不改仓库既有配置文件、不联网、不连数据库。
 */

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = resolve(HERE, "../../../apps/server");
const SCHEMA = join(SERVER_DIR, "prisma", "schema.prisma");
const DERIVED = join(SERVER_DIR, "prisma", ".schema.candidate.prisma");
const OUT_DIR = join(SERVER_DIR, ".prisma-candidate");
const CLIENT_DIR = join(OUT_DIR, "client");
const META = join(OUT_DIR, "meta.json");

/** generator 块里 output 的相对路径（相对 schema 文件所在目录） */
const REL_OUTPUT = "../.prisma-candidate/client";

const GENERATOR_RE = /generator\s+client\s*\{[^}]*\}/;

function sha256(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function deriveSchema(src) {
  const block = src.match(GENERATOR_RE);
  if (!block) throw new Error("schema.prisma 里找不到 `generator client` 块，无法派生");
  if (/\boutput\s*=/.test(block[0])) {
    // 真实 schema 自己已经指定了 output：说明上游改了生成布局，本脚本的假设不再成立。
    // 这时宁可失败，也不要静默生成到一个可能被别处引用的目录。
    throw new Error("schema.prisma 的 generator 已自带 output，请先确认生成布局后再调整本脚本");
  }
  const patched = block[0].replace(/\}$/, `  output          = "${REL_OUTPUT}"\n}`);
  return src.replace(GENERATOR_RE, patched);
}

function main() {
  if (!existsSync(SCHEMA)) throw new Error(`找不到 schema：${SCHEMA}`);
  const src = readFileSync(SCHEMA, "utf8");
  const hash = sha256(src);

  mkdirSync(OUT_DIR, { recursive: true });
  // 生成物不进版本库：把忽略规则放在新建目录内部，不改动仓库既有的 .gitignore
  writeFileSync(join(OUT_DIR, ".gitignore"), "*\n!.gitignore\n", "utf8");

  writeFileSync(DERIVED, deriveSchema(src), "utf8");
  try {
    rmSync(CLIENT_DIR, { recursive: true, force: true });
    execFileSync("npx", ["prisma", "generate", "--schema", DERIVED], {
      cwd: SERVER_DIR,
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32",
    });
  } finally {
    // 派生 schema 只是生成的中间产物，留着会被误认为第二份真源
    rmSync(DERIVED, { force: true });
  }

  if (!existsSync(join(CLIENT_DIR, "index.js"))) {
    throw new Error(`生成未产出客户端：${CLIENT_DIR}`);
  }
  writeFileSync(
    META,
    JSON.stringify({ schemaSha256: hash, generatedAt: new Date().toISOString(), clientDir: CLIENT_DIR }, null, 2),
    "utf8",
  );
  console.log(`候选客户端已生成：${CLIENT_DIR}`);
  console.log(`源 schema sha256：${hash}`);
  console.log("未写入 node_modules，主工作区客户端不受影响。");
}

main();
