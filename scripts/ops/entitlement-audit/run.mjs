#!/usr/bin/env node
/**
 * 权益异常只读检测 · 运行器（候选实现，本阶段仅面向隔离测试库）
 *
 * 硬性边界（代码层强制，不靠自觉）：
 *  1) 只执行 SELECT。执行前对每条语句做正则门禁，出现任何写关键字直接中止。
 *  2) 在 `BEGIN READ ONLY` 事务内执行，并设置 statement_timeout 与
 *     idle_in_transaction_session_timeout，超时即中止。
 *  3) 必须显式开启：环境变量 AUDIT_ALLOW_DB=1 且命令行带 --i-understand-read-only。
 *  4) 必须显式白名单主机：--allow-host=<host>，且 DSN 主机须与之完全一致。
 *     DSN 主机命中内置生产特征（api./prod./生产网段等）时一律拒绝，白名单也不放行。
 *  5) 时间窗必填，跨度上限 31 天；分页与总行数均有上限。
 *  6) 默认输出「汇总 + 脱敏引用」。明细字段中不含联系方式、昵称、地址、精确金额。
 *  7) 本阶段不接 Sentinel、不写 ConfigSystem、不产生任何告警。--emit-alerts 被硬禁用。
 *
 * 本阶段未连接任何数据库运行过；规则正确性由 selftest.mjs 用合成数据覆盖。
 */

import { readFileSync } from "node:fs";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runRules } from "./rules.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DAY_MS = 86_400_000;

// ───────────────────────── 参数 ─────────────────────────

function parseArgs(argv) {
  const out = { flags: new Set() };
  for (const a of argv.slice(2)) {
    if (a.startsWith("--") && a.includes("=")) {
      const [k, ...rest] = a.slice(2).split("=");
      out[k] = rest.join("=");
    } else if (a.startsWith("--")) {
      out.flags.add(a.slice(2));
    }
  }
  return out;
}

const LIMITS = Object.freeze({
  maxWindowDays: 31,
  maxPageSize: 1000,
  maxPages: 50,
  maxTotalRows: 20_000,
  defaultTimeoutMs: 15_000,
  maxTimeoutMs: 60_000,
});

/** 生产特征：命中即拒绝，--allow-host 也不放行 */
const PROD_HOST_PATTERNS = [
  /(^|\.)api\./i,
  /(^|\.)prod(uction)?\./i,
  /(^|[-.])prd([-.]|$)/i,
  /rebugx\.cn$/i,
];

function assertReadOnlySql(sql, label) {
  const stripped = sql
    .replace(/--[^\n]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ");
  const forbidden =
    /\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|copy|merge|call|do|vacuum|refresh|comment|reindex|lock|set\s+role|security\s+label)\b/i;
  if (forbidden.test(stripped)) {
    throw new Error(`[只读门禁] ${label} 含非 SELECT 关键字，已中止`);
  }
  if (!/^\s*select\b/i.test(stripped.trim())) {
    throw new Error(`[只读门禁] ${label} 不是以 SELECT 开头，已中止`);
  }
  if (/;\s*\S/.test(stripped.trim().replace(/;\s*$/, ""))) {
    throw new Error(`[只读门禁] ${label} 含多语句，已中止`);
  }
}

/** 从 queries.sql 拆出带 `-- name: x` 标注的语句，并逐条过门禁 */
export function loadQueries(path = resolve(HERE, "queries.sql")) {
  const raw = readFileSync(path, "utf8");
  const parts = raw.split(/^--\s*name:\s*(\w+)\s*$/m);
  const map = new Map();
  for (let i = 1; i < parts.length; i += 2) {
    const name = parts[i];
    const body = parts[i + 1].split(/;\s*$/m)[0] + ";";
    assertReadOnlySql(body, `queries.sql#${name}`);
    map.set(name, body.trim());
  }
  if (map.size === 0) throw new Error("queries.sql 未解析到任何命名语句");
  return map;
}

function parseWindow(args) {
  const from = args.from ? Date.parse(args.from) : NaN;
  const to = args.to ? Date.parse(args.to) : NaN;
  if (!Number.isFinite(from) || !Number.isFinite(to)) {
    throw new Error("--from / --to 必填，格式 ISO8601，例如 --from=2026-09-11T00:00:00+08:00");
  }
  if (to <= from) throw new Error("--to 必须晚于 --from");
  if (to - from > LIMITS.maxWindowDays * DAY_MS) {
    throw new Error(`时间窗跨度上限 ${LIMITS.maxWindowDays} 天，当前 ${Math.round((to - from) / DAY_MS)} 天`);
  }
  return { from: new Date(from), to: new Date(to) };
}

function assertHostAllowed(dsn, allowHost) {
  let host;
  try {
    host = new URL(dsn).hostname;
  } catch {
    throw new Error("--dsn 不是合法连接串");
  }
  for (const p of PROD_HOST_PATTERNS) {
    if (p.test(host)) {
      throw new Error(`[连接门禁] 主机 ${host} 命中生产特征，拒绝连接（本阶段只允许隔离测试库）`);
    }
  }
  if (!allowHost) throw new Error("[连接门禁] 必须显式指定 --allow-host=<hostname>");
  if (host !== allowHost) {
    throw new Error(`[连接门禁] DSN 主机 ${host} 与 --allow-host=${allowHost} 不一致`);
  }
  return host;
}

// ───────────────────────── 主流程 ─────────────────────────

async function main() {
  const args = parseArgs(process.argv);

  if (args.flags.has("emit-alerts")) {
    throw new Error("[阶段门禁] 本阶段不接入告警通道；--emit-alerts 已禁用");
  }

  // 只解析并校验 SQL，不连库：用于 CI / 评审自检
  if (args.flags.has("dry-run") || !args.dsn) {
    const q = loadQueries();
    console.log("[dry-run] 只读门禁通过，已解析命名语句：", [...q.keys()].join(", "));
    console.log("[dry-run] 未连接任何数据库。要对隔离测试库执行，需同时提供：");
    console.log("          AUDIT_ALLOW_DB=1  --dsn=...  --allow-host=...  --i-understand-read-only  --from=...  --to=...");
    return;
  }

  if (process.env.AUDIT_ALLOW_DB !== "1" || !args.flags.has("i-understand-read-only")) {
    throw new Error("[阶段门禁] 需同时设置 AUDIT_ALLOW_DB=1 与 --i-understand-read-only 才允许连库");
  }

  const host = assertHostAllowed(args.dsn, args["allow-host"]);
  const win = parseWindow(args);
  const pageSize = Math.min(Number(args["page-size"] ?? 500), LIMITS.maxPageSize);
  const maxPages = Math.min(Number(args["max-pages"] ?? 20), LIMITS.maxPages);
  const timeoutMs = Math.min(Number(args["timeout-ms"] ?? LIMITS.defaultTimeoutMs), LIMITS.maxTimeoutMs);
  const graceMinutes = Number(args["grace-minutes"] ?? 15);

  let pg;
  try {
    pg = await import("pg");
  } catch {
    throw new Error(
      "未找到 pg 驱动。本脚本不会自行安装依赖；请在隔离环境自行准备后重试（不得改动仓库 package.json）。",
    );
  }

  const client = new pg.default.Client({ connectionString: args.dsn, application_name: "entitlement-audit-readonly" });
  await client.connect();
  const queries = loadQueries();

  try {
    await client.query("BEGIN READ ONLY");
    await client.query(`SET LOCAL statement_timeout = ${Number(timeoutMs)}`);
    await client.query(`SET LOCAL idle_in_transaction_session_timeout = ${Number(timeoutMs)}`);
    await client.query("SET LOCAL default_transaction_read_only = on");

    // 分页取订单
    const orders = [];
    for (let page = 0; page < maxPages; page += 1) {
      const r = await client.query(queries.get("orders"), [win.from, win.to, pageSize, page * pageSize]);
      orders.push(...r.rows);
      if (r.rows.length < pageSize) break;
      if (orders.length >= LIMITS.maxTotalRows) {
        console.warn(`[限流] 订单行数达到上限 ${LIMITS.maxTotalRows}，结果被截断，请缩小时间窗`);
        break;
      }
    }

    const orderIds = orders.map((o) => o.id);
    const userIds = [...new Set(orders.map((o) => o.userId))];
    const bind = [win.from, win.to, pageSize, 0, orderIds.length ? orderIds : [""], userIds.length ? userIds : [""]];

    const q = async (name, params) => (await client.query(queries.get(name), params)).rows;

    const snap = {
      now: Date.now(),
      windowFrom: win.from.getTime(),
      windowTo: win.to.getTime(),
      orders,
      entitlementLedger: await q("entitlementLedger", [win.from, win.to, pageSize, 0, bind[4]]),
      entitlementBalance: await q("entitlementBalance", [win.from, win.to, pageSize, 0, bind[5]]),
      circleMembers: await q("circleMembers", [win.from, win.to, pageSize, 0, bind[5]]),
      memberPurchases: await q("memberPurchases", [win.from, win.to, pageSize, 0, bind[5]]),
      users: await q("users", [win.from, win.to, pageSize, 0, bind[5]]),
      practitionerProfiles: await q("practitionerProfiles", [win.from, win.to, pageSize, 0, bind[5]]),
      stations: await q("stations", [win.from, win.to, pageSize, 0, bind[5]]),
      operators: await q("operators", [win.from, win.to, pageSize, 0, bind[5]]),
    };

    const dupTx = await q("dupPayTransaction", [win.from, win.to]);
    const dupMp = await q("dupMemberPurchase", [win.from, win.to]);

    await client.query("ROLLBACK");

    const result = runRules(snap, { graceMinutes });
    result.crossCheck = {
      dupPayTransactionGroups: dupTx[0]?.dupGroups ?? 0,
      dupMemberPurchaseGroups: dupMp[0]?.dupGroups ?? 0,
    };
    result.scope = {
      host,
      windowFrom: win.from.toISOString(),
      windowTo: win.to.toISOString(),
      graceMinutes,
      orderRows: orders.length,
      truncated: orders.length >= LIMITS.maxTotalRows,
    };

    // 默认只输出汇总；明细需显式 --with-findings（仍为脱敏引用）
    const payload = args.flags.has("with-findings")
      ? result
      : {
          scope: result.scope,
          summary: result.summary,
          observations: result.observations,
          grantDelay: result.grantDelay,
          needsReview: result.needsReview,
          crossCheck: result.crossCheck,
          findingsOmitted: result.findings.length,
        };

    const json = JSON.stringify(payload, null, 2);
    if (args.out) {
      mkdirSync(dirname(resolve(args.out)), { recursive: true });
      writeFileSync(resolve(args.out), json, "utf8");
      console.log(`报告已写入 ${resolve(args.out)}`);
    } else {
      console.log(json);
    }
  } finally {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* 事务可能已结束 */
    }
    await client.end();
  }
}

main().catch((e) => {
  console.error(String(e?.message || e));
  process.exit(1);
});
