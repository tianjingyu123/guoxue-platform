/**
 * 候选 Prisma 客户端的**唯一加载入口**。
 *
 * 所有候选验证脚本都必须从这里拿 `PrismaClient`，不要再写 `require("@prisma/client")` ——
 * 那会解析到 junction 背后主工作区那一份，形态由「最后一次谁跑了 prisma generate」决定，
 * 结果就是验证时绿时红、且绿的那次未必是在验证候选代码。
 *
 * ── 为什么光换脚本里的导入还不够 ──────────────────────────────────────────
 * 被验证的**源码自己**也 `import { Prisma } from "@prisma/client"`，而且不止用作类型：
 * `common/prisma-errors.ts` 的 `isUniqueConstraintError` 是
 * `e instanceof Prisma.PrismaClientKnownRequestError`。
 * 如果脚本用候选客户端建连接、源码却拿共享客户端的类去做 `instanceof`，
 * 两个类来自不同模块实例，判断恒为 false —— 「撞唯一键」会被误判成「记账失败」，
 * 而测试仍然是绿的（行数对得上）。这种失效不会报错，只会悄悄把结论变软。
 *
 * 所以 `installCandidateResolution()` 直接接管 `require("@prisma/client")` 的解析，
 * 让**进程内所有**模块（脚本、ts-node 加载的源码、间接依赖）拿到同一份候选客户端。
 *
 * 加载前会核对 `meta.json` 里的 schema sha256 与当前 `schema.prisma` 一致：
 * 客户端过期时**直接失败**，而不是拿旧客户端跑出一个看起来通过的结果。
 */

import { createHash } from "node:crypto";
import Module from "node:module";
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = resolve(HERE, "../../../apps/server");
const OUT_DIR = join(SERVER_DIR, ".prisma-candidate");
export const CANDIDATE_CLIENT_DIR = join(OUT_DIR, "client");

const HINT = "请先运行：node scripts/ops/prisma-candidate/generate.mjs";
const PRISMA_SPECIFIERS = new Set(["@prisma/client", ".prisma/client", ".prisma/client/default"]);

/** 校验候选客户端存在且与当前 schema 一致；不一致直接抛错，不降级 */
export function assertFresh() {
  if (!existsSync(join(CANDIDATE_CLIENT_DIR, "index.js"))) {
    throw new Error(`候选 Prisma 客户端不存在：${CANDIDATE_CLIENT_DIR}\n${HINT}`);
  }
  const metaPath = join(OUT_DIR, "meta.json");
  if (!existsSync(metaPath)) throw new Error(`缺少 meta.json：${metaPath}\n${HINT}`);
  const meta = JSON.parse(readFileSync(metaPath, "utf8"));
  const schema = readFileSync(join(SERVER_DIR, "prisma", "schema.prisma"), "utf8");
  const actual = createHash("sha256").update(schema, "utf8").digest("hex");
  if (actual !== meta.schemaSha256) {
    throw new Error(
      `候选客户端与当前 schema 不一致（客户端基于 ${meta.schemaSha256.slice(0, 12)}…，` +
        `当前 schema 为 ${actual.slice(0, 12)}…）。${HINT}`,
    );
  }
  return meta;
}

let installed = false;

/**
 * 接管进程内 `@prisma/client` 的模块解析，全部指向候选客户端。
 * 必须在 require 任何被测源码**之前**调用。幂等。
 */
export function installCandidateResolution() {
  const meta = assertFresh();
  if (installed) return { CANDIDATE_CLIENT_DIR, meta, alreadyInstalled: true };

  const original = Module._resolveFilename;
  Module._resolveFilename = function (request, ...rest) {
    if (PRISMA_SPECIFIERS.has(request)) {
      return original.call(this, CANDIDATE_CLIENT_DIR, ...rest);
    }
    return original.call(this, request, ...rest);
  };
  installed = true;
  return { CANDIDATE_CLIENT_DIR, meta, alreadyInstalled: false };
}

/** 接管解析并返回候选客户端（脚本入口用这一个就够） */
export function loadCandidatePrisma() {
  const { meta } = installCandidateResolution();
  const req = createRequire(join(HERE, "client.mjs"));
  const resolved = req.resolve("@prisma/client"); // 走上面的钩子，顺带证明钩子生效
  const mod = req("@prisma/client");
  if (!mod?.PrismaClient) throw new Error(`候选客户端未导出 PrismaClient：${resolved}`);
  return { PrismaClient: mod.PrismaClient, Prisma: mod.Prisma, resolved, meta };
}
