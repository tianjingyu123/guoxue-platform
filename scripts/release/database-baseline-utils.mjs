import { spawnSync } from "node:child_process";
import { resolvePnpmInvocation } from "./resolve-pnpm-invocation.mjs";

export function normalizeDatabaseBaselineSql(sql) {
  return String(sql)
    .replace(/^\uFEFF/u, "")
    .replace(/\r\n/gu, "\n")
    .trimEnd();
}

export function generateDatabaseBaselineSql({ schemaPath, serverDir }) {
  const pnpm = resolvePnpmInvocation();
  if (!pnpm) {
    throw new Error("找不到可用的 pnpm 或 Corepack 运行入口");
  }

  const result = spawnSync(
    pnpm.command,
    [
      ...pnpm.prefix,
      "exec",
      "prisma",
      "migrate",
      "diff",
      "--from-empty",
      "--to-schema-datamodel",
      schemaPath,
      "--script",
    ],
    {
      cwd: serverDir,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
      shell: false,
    },
  );

  if (result.error) {
    throw new Error(`无法启动 Prisma 空库基线生成：${result.error.message}`);
  }
  if (result.status !== 0) {
    const detail = String(result.stderr || result.stdout || "").trim();
    throw new Error(
      `Prisma 空库基线生成失败（退出码 ${result.status ?? "未知"}）${detail ? `：${detail}` : ""}`,
    );
  }

  return normalizeDatabaseBaselineSql(result.stdout);
}

export function inspectDatabaseBaselineSql(sql) {
  const normalized = normalizeDatabaseBaselineSql(sql);
  const executableSql = normalized.replace(/--[^\n]*/gu, "");
  const destructivePattern =
    /(?:^|;)\s*(?:DROP\s+(?:TABLE|TYPE|INDEX|SCHEMA)\b|TRUNCATE(?:\s+TABLE)?\b|DELETE\s+FROM\b|ALTER\s+TABLE[\s\S]*?\bDROP\s+(?:COLUMN|CONSTRAINT)\b)/iu;
  const destructiveMatch = executableSql.match(destructivePattern);
  const createTables = normalized.match(/\bCREATE\s+TABLE\b/giu) || [];
  const createIndexes = normalized.match(/\bCREATE\s+(?:UNIQUE\s+)?INDEX\b/giu) || [];
  const foreignKeys = normalized.match(/\bFOREIGN\s+KEY\b/giu) || [];

  if (!normalized) {
    throw new Error("Prisma 生成了空 SQL，拒绝更新完整基线");
  }
  if (destructiveMatch) {
    throw new Error(`完整基线包含禁止的破坏性语句：${destructiveMatch[0]}`);
  }
  if (createTables.length === 0) {
    throw new Error("完整基线没有 CREATE TABLE，拒绝更新");
  }

  return {
    sql: `${normalized}\n`,
    tableCount: createTables.length,
    indexCount: createIndexes.length,
    foreignKeyCount: foreignKeys.length,
  };
}
