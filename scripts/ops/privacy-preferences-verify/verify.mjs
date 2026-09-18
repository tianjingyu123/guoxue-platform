#!/usr/bin/env node
/**
 * 隐私偏好 · 隔离验证
 *
 * 覆盖专项文档《现有能力与缺口》§四要求的验收点：
 *   V1 开关持久化：写入后重新读取保持，不是本地 ref
 *   V2 部分更新：未传入的键保持原值（客户端新增开关时老版本不会重置未知开关）
 *   V3 fail-closed：读取失败一律按「已关闭」，绝不回落到默认开启
 *   V4 更新时读取失败不写入：避免把用户的开关误关（与 V3 的方向相反，必须分开验）
 *   V5 P3 门控：关闭可选分析后，偏好类埋点在**服务端**被丢弃，诊断类仍收
 *   V6 P2 门控：关闭浏览历史后不再写新搜索历史，已有记录保留
 *   V7 P1 门控：关闭个性化推荐后不出兴趣标签（画像）与 pref_* 标签
 *   V8 回滚不覆盖：模拟「重置配置」不得把用户关掉的偏好改回开启
 *
 * 只对本机隔离测试库运行，合成数据 `prv-` 前缀。不连生产、不动真实用户数据。
 */

import { createRequire } from "node:module";

const SERVER_DIR = process.env.REPRO_SERVER_DIR || "D:/gx-deploy-91/apps/server";
const req = createRequire(`${SERVER_DIR.replace(/\/?$/, "/")}package.json`);
const { PrismaClient } = req("@prisma/client");

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith("--")).map((a) => {
    const [k, ...v] = a.slice(2).split("=");
    return [k, v.join("=") || true];
  }),
);
if (!args.dsn) { console.error("必须提供 --dsn（仅限本机隔离测试库）"); process.exit(64); }
if (/:[^/@]*@/.test(args.dsn)) { console.error("连接串不得包含口令"); process.exit(64); }
if (!["127.0.0.1", "localhost", "::1"].includes(new URL(args.dsn).hostname)) {
  console.error("拒绝连接非本机主机"); process.exit(64);
}

req("ts-node").register({
  transpileOnly: true,
  compilerOptions: { module: "commonjs", target: "es2022", experimentalDecorators: true, emitDecoratorMetadata: true },
});
const ROOT = process.env.REPRO_SRC_ROOT ||
  "D:/gx-deploy-91/.worktrees/entitlement-audit-20260918/apps/server/src";
const { PrivacySettingsService, PRIVACY_DEFAULTS, PRIVACY_FAIL_CLOSED } =
  req(`${ROOT}/modules/user/privacy-settings.service.ts`);
const { TrackService } = req(`${ROOT}/modules/track/track.service.ts`);
const { SearchService } = req(`${ROOT}/modules/search/search.service.ts`);
const { InsightService } = req(`${ROOT}/modules/track/insight.service.ts`);

const prisma = new PrismaClient({ datasources: { db: { url: args.dsn } } });

let pass = 0, fail = 0;
const lines = [];
function check(name, ok, detail = "") {
  if (ok) pass += 1; else fail += 1;
  lines.push(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

const privacy = new PrivacySettingsService(prisma);
const track = new TrackService(prisma, privacy);
const search = new SearchService(prisma, { del: async () => {}, getJson: async () => null }, undefined, privacy);
const insight = new InsightService(prisma, privacy);

const RUN = `prv-${Date.now().toString(36)}`;
let seq = 0;
async function cleanup() {
  await prisma.trackEvent.deleteMany({ where: { userId: { startsWith: "prv-" } } });
  await prisma.searchHistory.deleteMany({ where: { userId: { startsWith: "prv-" } } });
  await prisma.userTag.deleteMany({ where: { userId: { startsWith: "prv-" } } });
  await prisma.user.deleteMany({ where: { id: { startsWith: "prv-" } } });
}
async function mkUser(settings) {
  const id = `${RUN}-u${++seq}`;
  await prisma.user.create({
    data: { id, nickname: `隐私用户${seq}`, ...(settings === undefined ? {} : { privacySettings: settings }) },
  });
  return id;
}

// ─────────────────────────── 场景 ───────────────────────────

async function v1v2() {
  const u = await mkUser(undefined);
  const initial = await privacy.get(u);
  check("V1 未设置过时返回默认值", JSON.stringify(initial) === JSON.stringify(PRIVACY_DEFAULTS),
    JSON.stringify(initial));

  await privacy.update(u, { optionalAnalytics: false });
  const afterWrite = await privacy.get(u);
  check("V1 写入后重新读取保持（真持久化）", afterWrite.optionalAnalytics === false,
    JSON.stringify(afterWrite));

  // 新实例模拟进程重启后再读
  const fresh = new PrivacySettingsService(prisma);
  const afterRestart = await fresh.get(u);
  check("V1 换实例读取仍为关闭", afterRestart.optionalAnalytics === false, JSON.stringify(afterRestart));

  await privacy.update(u, { browseHistory: false });
  const partial = await privacy.get(u);
  check("V2 部分更新不重置未传入的键",
    partial.optionalAnalytics === false && partial.browseHistory === false &&
    partial.personalizedRecommend === true,
    JSON.stringify(partial));
  return u;
}

async function v3() {
  // 用户不存在
  const ghost = await privacy.get(`${RUN}-nobody`);
  check("V3 用户不存在按已关闭", JSON.stringify(ghost) === JSON.stringify(PRIVACY_FAIL_CLOSED),
    JSON.stringify(ghost));
  // 匿名
  const anon = await privacy.get(null);
  check("V3 匿名按已关闭", JSON.stringify(anon) === JSON.stringify(PRIVACY_FAIL_CLOSED));
  // 数据库异常
  const broken = new PrivacySettingsService({
    user: { findUnique: async () => { throw new Error("模拟数据库故障"); } },
  });
  const onError = await broken.get("whoever");
  check("V3 数据库异常按已关闭（不回落到默认开启）",
    JSON.stringify(onError) === JSON.stringify(PRIVACY_FAIL_CLOSED), JSON.stringify(onError));
  // 字段损坏
  const u = await mkUser("not-an-object");
  const corrupt = await privacy.get(u);
  check("V3 字段损坏时按默认值归一（不抛出）", typeof corrupt.optionalAnalytics === "boolean",
    JSON.stringify(corrupt));
}

async function v4() {
  const u = await mkUser({ personalizedRecommend: false, browseHistory: false, optionalAnalytics: false, experienceSurvey: false });
  // 更新时读取失败：必须整体失败且不写入，而不是拿 fail-closed 的全关去覆盖
  const broken = new PrivacySettingsService({
    user: {
      findUnique: async () => { throw new Error("模拟读取故障"); },
      update: async () => { throw new Error("不应该走到写入"); },
    },
  });
  let threw = false;
  try { await broken.update(u, { optionalAnalytics: true }); } catch { threw = true; }
  check("V4 更新时读取失败则整体失败、不写入", threw, threw ? "已抛出" : "竟然写入了");
  const after = await privacy.get(u);
  check("V4 失败后原有偏好未被改动", after.personalizedRecommend === false && after.optionalAnalytics === false,
    JSON.stringify(after));
}

async function v5() {
  const on = await mkUser({ optionalAnalytics: true });
  const off = await mkUser({ optionalAnalytics: false });
  const events = [
    { action: "page_view", path: "/x", ts: Date.now() },
    { action: "search", path: "/s", ts: Date.now() },
    { action: "error", path: "/x", payload: { msg: "boom" }, ts: Date.now() },
    { action: "api_error", path: "/x", payload: { status: 500 }, ts: Date.now() },
  ];
  const rOn = await track.recordBatch(on, events);
  const rOff = await track.recordBatch(off, events);
  const [cOn, cOff] = await Promise.all([
    prisma.trackEvent.findMany({ where: { userId: on }, select: { action: true } }),
    prisma.trackEvent.findMany({ where: { userId: off }, select: { action: true } }),
  ]);
  check("V5 开启可选分析：四条全收", cOn.length === 4 && rOn.dropped === undefined, `${cOn.length} r=${JSON.stringify(rOn)}`);
  check("V5 关闭可选分析：偏好类被服务端丢弃",
    cOff.length === 2 && cOff.every((e) => ["error", "api_error"].includes(e.action)),
    `收到 ${cOff.map((e) => e.action).join(",")} r=${JSON.stringify(rOff)}`);
  check("V5 丢弃数量如实返回", rOff.dropped === 2, JSON.stringify(rOff));

  // 匿名上报不受影响（拿不到身份就没有偏好可读，维持原行为）
  const rAnon = await track.recordBatch(undefined, events);
  check("V5 匿名上报维持原行为（不误伤）", rAnon.count === 4, JSON.stringify(rAnon));
}

async function v6() {
  const on = await mkUser({ browseHistory: true });
  const off = await mkUser({ browseHistory: false });
  await prisma.searchHistory.create({ data: { userId: off, keyword: "关闭前的旧记录" } });
  await search.saveHistory(on, "紫微斗数");
  await search.saveHistory(off, "紫微斗数");
  const [cOn, cOff] = await Promise.all([
    prisma.searchHistory.count({ where: { userId: on } }),
    prisma.searchHistory.findMany({ where: { userId: off }, select: { keyword: true } }),
  ]);
  check("V6 开启时写入搜索历史", cOn === 1, String(cOn));
  check("V6 关闭后不再写新记录，但已有记录保留",
    cOff.length === 1 && cOff[0].keyword === "关闭前的旧记录",
    cOff.map((r) => r.keyword).join(","));
}

async function v7() {
  const on = await mkUser({ personalizedRecommend: true });
  const off = await mkUser({ personalizedRecommend: false });
  const now = new Date();
  for (const uid of [on, off]) {
    await prisma.trackEvent.createMany({
      data: [
        { userId: uid, action: "page_view", path: "/pkg-course/detail/1", occurredAt: now },
        { userId: uid, action: "page_view", path: "/pkg-circle/circles/1", occurredAt: now },
      ],
    });
  }
  const profiles = await insight.buildCustomerProfiles([
    { userId: on, boundAt: now },
    { userId: off, boundAt: now },
  ]);
  const pOn = profiles.find((p) => p.userId === on);
  const pOff = profiles.find((p) => p.userId === off);
  check("V7 开启个性化：出兴趣标签", (pOn?.interests?.length ?? 0) > 0, JSON.stringify(pOn?.interests));
  check("V7 关闭个性化：不出兴趣标签", (pOff?.interests?.length ?? 0) === 0, JSON.stringify(pOff?.interests));
  check("V7 关闭个性化：经营必需字段照常给",
    pOff != null && typeof pOff.events30d === "number" && typeof pOff.totalSpent === "number",
    JSON.stringify({ events30d: pOff?.events30d, totalSpent: pOff?.totalSpent }));
}

async function v8() {
  const u = await mkUser({ personalizedRecommend: false, optionalAnalytics: false });
  // 模拟「重置配置 / 版本回滚」：任何以默认值覆盖的写法都不该出现在生产代码里。
  // 这里验证的是：走正规更新接口时，不传的键不会被默认值覆盖。
  await privacy.update(u, { experienceSurvey: true });
  const after = await privacy.get(u);
  check("V8 更新其他键不会把已关闭的偏好改回开启",
    after.personalizedRecommend === false && after.optionalAnalytics === false && after.experienceSurvey === true,
    JSON.stringify(after));
  // 直接核对库里的 JSON，确认存的是用户的取值而不是默认值
  const raw = await prisma.user.findUnique({ where: { id: u }, select: { privacySettings: true } });
  check("V8 库中持久化的是用户取值",
    raw.privacySettings.personalizedRecommend === false && raw.privacySettings.optionalAnalytics === false,
    JSON.stringify(raw.privacySettings));
}

// ─────────────────────────── 主流程 ───────────────────────────
try {
  console.log("=== 隐私偏好 · 隔离验证 ===");
  await cleanup();
  await v1v2();
  await v3();
  await v4();
  await v5();
  await v6();
  await v7();
  await v8();
  await cleanup();
  console.log(lines.join("\n"));
  console.log(`=== ${pass} 通过 / ${fail} 失败 ===`);
  process.exitCode = fail > 0 ? 1 : 0;
} finally {
  await prisma.$disconnect();
}
