/**
 * psql 传输通道（无需任何 npm 依赖）。
 *
 * 为什么不用 pg 驱动：本仓库未安装 `pg`，而本阶段不允许安装依赖或改动 package.json。
 * psql 是 PostgreSQL 官方客户端，用它执行同一批只读 SQL，结果以 JSON 回传。
 *
 * 安全要点：
 *  - 全部语句在**一个会话、一个 `BEGIN READ ONLY` 事务**内执行，末尾 ROLLBACK。
 *  - 参数用 psql 的 `:'name'` 字面量引用（等价于 PQescapeLiteral），不做字符串拼接。
 *  - 口令不进命令行、不进日志：连接串不带密码，认证由集群配置或 PGPASSFILE 决定。
 *  - Windows 上 psql 的 getopt 不做参数重排：**选项必须排在连接串之前**，否则会被
 *    当成多余位置参数静默忽略（项目自带的 bootstrap-empty-database.sh 就踩了这个坑）。
 */

import { spawnSync } from "node:child_process";

const MARKER = "@@ENTAUDIT@@";

/**
 * @param {object} opts
 * @param {string} opts.psqlPath   psql 可执行文件路径
 * @param {string} opts.dsn        连接串（**不得含密码**）
 * @param {number} opts.timeoutMs  statement_timeout
 * @param {Map<string,string>} opts.queries  命名语句（已通过只读门禁）
 * @param {Array<{name:string, params:string[]}>} opts.plan 执行计划
 * @returns {Record<string, any[]>}
 */
export function runReadOnlyBatch({ psqlPath, dsn, timeoutMs, queries, plan }) {
  const lines = [];
  lines.push("\\set ON_ERROR_STOP on");
  lines.push("\\pset pager off");
  lines.push("BEGIN READ ONLY;");
  lines.push(`SET LOCAL statement_timeout = ${Number(timeoutMs)};`);
  lines.push(`SET LOCAL idle_in_transaction_session_timeout = ${Number(timeoutMs)};`);
  lines.push("SET LOCAL default_transaction_read_only = on;");

  for (const step of plan) {
    const sql = queries.get(step.name);
    if (!sql) throw new Error(`未知语句 ${step.name}`);
    // $1..$n → :'pN'（psql 字面量引用，自动转义）
    let bound = sql.replace(/;\s*$/, "");
    step.params.forEach((v, i) => {
      lines.push(`\\set p${i + 1} ${psqlSetValue(v)}`);
      bound = bound.replaceAll(`$${i + 1}`, `:'p${i + 1}'`);
    });
    lines.push(`\\echo ${MARKER}${step.name}`);
    lines.push(`SELECT coalesce(json_agg(t), '[]'::json)::text FROM (${bound}) t;`);
  }
  lines.push("ROLLBACK;");

  const script = lines.join("\n") + "\n";
  const res = spawnSync(
    psqlPath,
    ["-X", "-q", "-A", "-t", "--no-psqlrc", "-f", "-", dsn], // 选项在前，连接串在后
    { input: script, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  if (res.error) throw res.error;
  if (res.status !== 0) {
    throw new Error(`psql 退出码 ${res.status}：${(res.stderr || "").trim().slice(0, 500)}`);
  }

  const out = {};
  let current = null;
  const buf = [];
  const flush = () => {
    if (!current) return;
    const text = buf.join("").trim();
    out[current] = text ? normalizeRows(JSON.parse(text)) : [];
    buf.length = 0;
  };
  for (const raw of (res.stdout || "").split(/\r?\n/)) {
    if (raw.startsWith(MARKER)) {
      flush();
      current = raw.slice(MARKER.length).trim();
      continue;
    }
    if (current) buf.push(raw);
  }
  flush();
  return out;
}

/**
 * 把 Postgres `timestamp without time zone` 的取值标准化为 UTC。
 *
 * 背景（2026-09-18 隔离库验证发现的真实缺陷）：
 * Prisma 的 `DateTime` 映射为 `timestamp without time zone`，**写入时已转成 UTC**。
 * 但 `json_agg` 出来的字符串没有时区后缀（如 "2026-09-17T22:00:00"），
 * `new Date()` 会按**运行机器的本地时区**解析。本机是 UTC-7 时，
 * 一条 UTC 22:00 的支付时间会被读成 UTC 次日 05:00，于是
 * 「已支付 6 小时」被算成「支付发生在未来」，规则直接跳过——漏报。
 *
 * 因此这里显式补 'Z'。这是有依据的断言：库里存的就是 UTC。
 * 若将来某列改成 `timestamptz`，json 会自带偏移量，本函数不会误改（有偏移就不动）。
 */
const NAIVE_TS = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?$/;

function normalizeRows(rows) {
  if (!Array.isArray(rows)) return rows;
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    for (const k of Object.keys(row)) {
      const v = row[k];
      if (typeof v === "string" && NAIVE_TS.test(v)) {
        row[k] = `${v.replace(" ", "T")}Z`;
      }
    }
  }
  return rows;
}

/**
 * psql `\set` 的取值：用单引号包裹并转义。
 *
 * 两处转义缺一不可（2026-09-18 注入测试发现）：
 *  - `'` → `''`：防止提前闭合字面量；
 *  - `\` → `\`：psql 的**元命令参数解析器**会处理单引号内的反斜杠转义
 *    （`
`/`	`/`\`）。不预先加倍的话，数组字面量里的 `\"` 会被 psql 吃掉，
 *    导致合法但含引号的标识符组成的数组变成 malformed array（查询直接失败）。
 */
function psqlSetValue(v) {
  return `'${String(v).replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
}

/** 把字符串数组转成 Postgres 数组字面量（供 `= ANY(:'pN'::text[])` 用） */
export function toPgTextArray(list) {
  if (!list || list.length === 0) return "{}";
  const esc = list.map((x) => `"${String(x).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`);
  return `{${esc.join(",")}}`;
}
