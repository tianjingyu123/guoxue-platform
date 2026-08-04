#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const DEFAULT_MAX_LIVE_AGE_HOURS = 24;
const DEFAULT_UPCOMING_GRACE_MINUTES = 10;

function parseDate(value) {
  const timestamp = Date.parse(String(value || ""));
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function auditFeedItems(
  items,
  {
    now = new Date(),
    maxLiveAgeHours = DEFAULT_MAX_LIVE_AGE_HOURS,
    upcomingGraceMinutes = DEFAULT_UPCOMING_GRACE_MINUTES,
  } = {},
) {
  const nowMs = now instanceof Date ? now.getTime() : Date.parse(String(now));
  if (!Number.isFinite(nowMs)) throw new Error("now 不是有效时间");

  const findings = [];
  const feedItems = Array.isArray(items) ? items : [];

  for (const item of feedItems) {
    const type = String(item?.type || "").toLowerCase();
    const id = String(item?.id || "unknown");
    const title = String(item?.title || "未命名内容");

    if (title.trim().toUpperCase().startsWith("QA_")) {
      findings.push({
        severity: "P0",
        code: "QA_FIXTURE_PUBLIC",
        id,
        title,
        message: "发布验收夹具进入公开内容流，必须下架或由公开查询精确排除",
      });
    }

    if (type === "article" && !String(item?.cover || "").trim()) {
      findings.push({
        severity: "P0",
        code: "ARTICLE_COVER_MISSING",
        id,
        title,
        message: "文章缺少首图，不符合文章发布与陈列标准",
      });
    }

    if (type !== "live") continue;

    const status = String(item?.payload?.status || "").toLowerCase();
    const scheduledAt = parseDate(item?.payload?.scheduledTime);
    if (!scheduledAt) {
      findings.push({
        severity: "P0",
        code: "LIVE_TIME_INVALID",
        id,
        title,
        message: "直播内容缺少有效开播时间",
      });
      continue;
    }

    const ageMs = nowMs - scheduledAt;
    if (
      ["upcoming", "waiting", "scheduled"].includes(status) &&
      ageMs > upcomingGraceMinutes * 60 * 1000
    ) {
      findings.push({
        severity: "P0",
        code: "UPCOMING_LIVE_EXPIRED",
        id,
        title,
        scheduledTime: new Date(scheduledAt).toISOString(),
        message: "预约直播的开播时间已过，但仍显示为预约状态",
      });
    }

    if (status === "live" && ageMs > maxLiveAgeHours * 60 * 60 * 1000) {
      findings.push({
        severity: "P0",
        code: "LIVE_STATUS_STALE",
        id,
        title,
        scheduledTime: new Date(scheduledAt).toISOString(),
        message: `直播已持续超过 ${maxLiveAgeHours} 小时，疑似未正常结束或回放化`,
      });
    }
  }

  return {
    checkedAt: new Date(nowMs).toISOString(),
    totalItems: feedItems.length,
    blockers: findings.filter((finding) => finding.severity === "P0").length,
    findings,
  };
}

function valueOf(args, name, fallback = "") {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

async function main() {
  const args = process.argv.slice(2);
  const apiBase = valueOf(
    args,
    "--api-base",
    process.env.PUBLIC_API_BASE_URL || "https://pre-api.rebugx.cn/api/v1",
  ).replace(/\/$/u, "");
  const reportPath = valueOf(args, "--report", process.env.PUBLIC_CONTENT_REPORT || "");
  const now = valueOf(args, "--now", new Date().toISOString());
  const maxLiveAgeHours = Number(
    valueOf(args, "--max-live-age-hours", String(DEFAULT_MAX_LIVE_AGE_HOURS)),
  );
  const upcomingGraceMinutes = Number(
    valueOf(args, "--upcoming-grace-minutes", String(DEFAULT_UPCOMING_GRACE_MINUTES)),
  );

  const target = new URL(
    `${apiBase}/recommend/smart-feed/feed?page=1&pageSize=50&channel=recommend`,
  );
  if (
    target.protocol !== "https:" &&
    !["localhost", "127.0.0.1", "::1"].includes(target.hostname)
  ) {
    throw new Error("非本机内容审计目标必须使用 HTTPS");
  }

  const response = await fetch(target, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`推荐流请求失败：HTTP ${response.status}`);
  const payload = await response.json();
  if (payload?.code !== 200 || !Array.isArray(payload?.data?.items)) {
    throw new Error("推荐流响应信封无效");
  }

  const result = auditFeedItems(payload.data.items, {
    now,
    maxLiveAgeHours,
    upcomingGraceMinutes,
  });
  const report = {
    schemaVersion: 1,
    kind: "guoxue-public-content-freshness",
    target: target.origin,
    generatedAt: new Date().toISOString(),
    ...result,
  };

  if (reportPath) {
    const absoluteReportPath = path.resolve(reportPath);
    fs.mkdirSync(path.dirname(absoluteReportPath), { recursive: true });
    fs.writeFileSync(absoluteReportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }

  console.log(`公开内容新鲜度：检查 ${result.totalItems} 条，发现 ${result.blockers} 个上线阻断项`);
  for (const finding of result.findings) {
    console.log(`[${finding.severity}] ${finding.code} ${finding.title}：${finding.message}`);
  }
  if (result.blockers > 0) process.exitCode = 1;
}

const isCli =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isCli) {
  main().catch((error) => {
    console.error(`公开内容新鲜度审计失败：${error.message}`);
    process.exitCode = 2;
  });
}
