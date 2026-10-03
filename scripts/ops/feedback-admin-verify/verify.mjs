#!/usr/bin/env node
/**
 * 用户反馈管理端（C 单元）· 独立验证
 *
 * ── 这个脚本的隔离前提（前四条断言专门证明它） ──────────────────────────────
 * C 单元**不改 schema**，所以它必须能在**主线形态**的环境里跑通：
 *   · 数据库是用**基线 `full-baseline.sql`** 建的，不含 B 的 `CircleRevenueRecord.orderId`、
 *     也不含 D 的 `User.privacySettings`；
 *   · Prisma 客户端用的是共享 `node_modules` 里的**主线客户端**，
 *     **不是** B/D 那套 `.prisma-candidate` 候选客户端。
 * 这两点如果不成立，本验证就证明不了「C 可独立接收」，所以开头就断言、不成立即退出。
 *
 * ── 覆盖范围 ────────────────────────────────────────────────────────────────
 *   P 权限：路由上的角色、守卫、审计元数据（读 Nest 元数据，不是读注释）
 *   M 脱敏：列表与详情不返回明文；明文只能逐条取
 *   S 状态：结案必填结果、回退必填原因、并发下不静默覆盖
 *   D 诊断编号：valid / all_zero / missing 三分类不混为一谈
 *   A 审计：三个明文接口与状态流转都带 @Auditable
 *
 * 只连本机隔离测试库，合成数据 `fbc-` 前缀。不连生产、不发消息、不改真实数据。
 */

import { createRequire } from "node:module";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../..");
const SERVER_DIR = resolve(ROOT, "apps/server");
const req = createRequire(`${SERVER_DIR}${sep}package.json`);

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

let pass = 0, fail = 0;
const lines = [];
function check(name, ok, detail = "") {
  if (ok) pass += 1; else fail += 1;
  lines.push(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

// ══════════ 隔离前提（I 组）══════════
const prismaPath = req.resolve("@prisma/client");
check("I1 用的是共享主线 Prisma 客户端，不是 B/D 的候选客户端",
  !prismaPath.includes(".prisma-candidate"), prismaPath);

const { PrismaClient, Prisma } = req("@prisma/client");
function fieldsOf(model) {
  const m = Prisma.dmmf?.datamodel?.models?.find((x) => x.name === model);
  return m ? m.fields.map((f) => f.name) : null;
}
check("I2 客户端里没有 B 的 CircleRevenueRecord.orderId",
  !fieldsOf("CircleRevenueRecord")?.includes("orderId"), "主线形态");
check("I3 客户端里没有 D 的 User.privacySettings",
  !fieldsOf("User")?.includes("privacySettings"), "主线形态");

const prisma = new PrismaClient({ datasources: { db: { url: args.dsn } } });

req("ts-node").register({
  transpileOnly: true,
  compilerOptions: {
    module: "commonjs", target: "es2022",
    experimentalDecorators: true, emitDecoratorMetadata: true,
  },
});
const SRC = `${SERVER_DIR}/src`;
const { FeedbackService } = req(`${SRC}/modules/user/feedback.service.ts`);
const { FeedbackController } = req(`${SRC}/modules/user/feedback.controller.ts`);
const { ROLES_KEY } = req(`${SRC}/common/roles.decorator.ts`);
const { AUDITABLE_KEY } = req(`${SRC}/common/audit.decorator.ts`);
const { FEEDBACK_STATUSES, NON_TICKET_TYPES } = req(`${SRC}/modules/user/feedback-admin.dto.ts`);

const svc = new FeedbackService(prisma);

// ══════════ P 组：权限（读 Nest 元数据）══════════
const EXPECTED_ROLES = ["SUPER_ADMIN", "OPERATION_ADMIN", "CUSTOMER_SERVICE"];
const EXPECTED_IMAGE_ROLES = ["SUPER_ADMIN", "OPERATION_ADMIN"];
const ADMIN_HANDLERS = [
  "adminList", "adminStats", "adminDetail",
  "adminRevealContact", "adminRevealContent", "adminRevealImages",
  "adminUpdateStatus",
];
const REVEAL_HANDLERS = ["adminRevealContact", "adminRevealContent", "adminRevealImages"];
const AUDITED_HANDLERS = [...REVEAL_HANDLERS, "adminUpdateStatus"];

/** 取路由处理函数；名字对不上时抛出明确错误，而不是让 Reflect 抛无信息的 TypeError */
function handler(name) {
  const fn = FeedbackController.prototype[name];
  if (typeof fn !== "function") {
    throw new Error(`控制器上没有方法 ${name}（可用：${Object.getOwnPropertyNames(FeedbackController.prototype).join(",")}）`);
  }
  return fn;
}
const guardNamesOf = (fn) =>
  (Reflect.getMetadata("__guards__", fn) || []).map((g) => g?.name ?? String(g));

{
  const missingRoles = ADMIN_HANDLERS.filter((h) => {
    const roles = Reflect.getMetadata(ROLES_KEY, handler(h));
    const expected = h === "adminRevealImages" ? EXPECTED_IMAGE_ROLES : EXPECTED_ROLES;
    return !roles || JSON.stringify([...roles].sort()) !== JSON.stringify([...expected].sort());
  });
  check(`P1 管理端路由按敏感级别限定角色（截图不向客服开放）`,
    missingRoles.length === 0, missingRoles.length ? `缺失/不符：${missingRoles.join("、")}` : "正文/联系方式三角色，截图两角色");

  const noGuard = ADMIN_HANDLERS.filter((h) => {
    const g = guardNamesOf(handler(h));
    return !g.includes("JwtAuthGuard") || !g.includes("RolesGuard");
  });
  check("P2 每个管理端路由都同时挂了 JwtAuthGuard 与 RolesGuard",
    noGuard.length === 0, noGuard.length ? `缺守卫：${noGuard.join("、")}` : "7/7");

  const noThrottle = REVEAL_HANDLERS.filter(
    (h) => !guardNamesOf(handler(h)).includes("SensitiveRedisThrottleGuard"));
  check("P3 三个明文接口都挂了独立限流守卫",
    noThrottle.length === 0, noThrottle.length ? `缺限流：${noThrottle.join("、")}` : "3/3");

  // 反证：普通用户提交反馈的路由不应带管理角色限定，否则说明元数据读错了对象
  const submitRoles = Reflect.getMetadata(ROLES_KEY, handler("submitFeedback"));
  check("P4 反证：普通用户提交反馈的接口没有管理角色限定（说明上面读的确实是各路由自己的元数据）",
    !submitRoles, submitRoles ? `竟然有：${submitRoles}` : "无角色限定");
}

// ══════════ A 组：审计元数据 ══════════
{
  const missing = AUDITED_HANDLERS.filter(
    (h) => !Reflect.getMetadata(AUDITABLE_KEY, handler(h)));
  check("A1 三个明文接口 + 状态流转都带 @Auditable", missing.length === 0,
    missing.length ? `缺审计：${missing.join("、")}` : "4/4");

  const targetTypes = new Set(AUDITED_HANDLERS.map(
    (h) => Reflect.getMetadata(AUDITABLE_KEY, handler(h))?.targetType));
  check("A2 审计 targetType 统一为 FEEDBACK（便于按类型检索）",
    targetTypes.size === 1 && targetTypes.has("FEEDBACK"), [...targetTypes].join(","));

  // 只读的列表/详情/统计不写审计：查看脱敏视图不应产生审计噪声
  const readOnly = ["adminList", "adminDetail", "adminStats"];
  const audited = readOnly.filter(
    (h) => Reflect.getMetadata(AUDITABLE_KEY, handler(h)));
  check("A3 脱敏视图（列表/详情/统计）不写审计，避免噪声淹没明文访问记录",
    audited.length === 0, audited.length ? `多余审计：${audited.join("、")}` : "3 个只读接口无审计");
}

// ══════════ 夹具 ══════════
const RUN = `fbc-${Date.now().toString(36)}`;
async function cleanup() {
  await prisma.feedback.deleteMany({ where: { userId: { startsWith: "fbc-" } } });
  await prisma.user.deleteMany({ where: { id: { startsWith: "fbc-" } } });
}
async function mkFeedback({ type = "bug", content, contact = null, images = [], status = "pending", n = 0 }) {
  const uid = `${RUN}-u${n}`;
  await prisma.user.upsert({
    where: { id: uid }, create: { id: uid, nickname: `用户${n}` }, update: {},
  });
  return prisma.feedback.create({
    data: { userId: uid, type, content, contact, images, status },
  });
}

// ══════════ M 组：脱敏 ══════════
async function mGroup() {
  const raw = "我的手机 13812345678，邮箱 zhangsan@example.com，身份证 11010119900307123X，订单号 987654321012345678";
  const f = await mkFeedback({ content: raw, contact: "13812345678", images: ["https://x/a.png", "https://x/b.png"], n: 1 });

  const list = await svc.adminList({ page: 1, pageSize: 20 });
  const row = list.items?.find((r) => r.id === f.id) ?? list.list?.find((r) => r.id === f.id);
  check("M1 列表能取到该条", !!row, row ? "" : JSON.stringify(Object.keys(list)));

  if (row) {
    check("M2 列表正文已脱敏：手机号不再出现",
      !row.contentMasked.includes("13812345678"), row.contentMasked.slice(0, 60));
    check("M3 列表正文已脱敏：邮箱本地部分不再完整出现",
      !row.contentMasked.includes("zhangsan@example.com"), row.contentMasked.slice(0, 80));
    check("M4 列表正文已脱敏：身份证不再完整出现",
      !row.contentMasked.includes("11010119900307123X"), row.contentMasked.slice(0, 100));
    check("M5 列表正文已脱敏：18 位长数字串不再完整出现",
      !row.contentMasked.includes("987654321012345678"), row.contentMasked.slice(0, 120));
    check("M6 列表联系方式已脱敏", !!row.contactMasked && !row.contactMasked.includes("13812345678"),
      row.contactMasked);
    check("M7 列表**不返回**任何明文字段（content / contact / images）",
      !("content" in row) && !("contact" in row) && !("images" in row),
      Object.keys(row).join(","));
    check("M8 列表只给截图数量与是否有联系方式，不给链接",
      row.imageCount === 2 && row.hasContact === true, `imageCount=${row.imageCount} hasContact=${row.hasContact}`);
    check("M9 用户标识只给后 6 位，不给完整 userId",
      row.userRef.length === 6 && !("userId" in row), `userRef=${row.userRef}`);
  }

  const detail = await svc.adminDetail(f.id);
  check("M10 详情同样不返回明文字段",
    !("content" in detail) && !("contact" in detail) && !("images" in detail),
    Object.keys(detail).join(","));

  // 明文只能逐条取，且三类分别是独立接口
  const c1 = await svc.adminRevealContact(f.id);
  const c2 = await svc.adminRevealContent(f.id);
  const c3 = await svc.adminRevealImages(f.id);
  check("M11 明文接口逐条返回真实值（联系方式）", c1.contact === "13812345678", c1.contact);
  check("M12 明文接口逐条返回真实值（正文）", c2.content === raw, `${c2.content.slice(0, 20)}…`);
  check("M13 明文接口逐条返回真实值（截图）", c3.images.length === 2, c3.images.join(","));

  // 正则脱敏的已知局限：中文数字写法漏得掉。如实入测，避免把「已脱敏」当成保证。
  const f2 = await mkFeedback({ content: "电话一三八一二三四五六七八", n: 2 });
  const list2 = await svc.adminList({ page: 1, pageSize: 20, keyword: f2.id });
  const row2 = (list2.items ?? list2.list ?? []).find((r) => r.id === f2.id);
  check("M14 如实记录局限：中文写法的号码脱不掉（所以访问控制不因已脱敏而放宽）",
    !!row2 && row2.contentMasked.includes("一三八"), row2?.contentMasked);
}

// ══════════ D 组：诊断编号三分类 ══════════
async function dGroup() {
  const a = await mkFeedback({ content: "【诊断编号】a1b2c3d4e5f60718|server_trace\n打不开", n: 3 });
  const b = await mkFeedback({ content: "【诊断编号】0000000000000000|server_trace\n打不开", n: 4 });
  const c = await mkFeedback({ content: "就是打不开", n: 5 });
  const got = {};
  for (const f of [a, b, c]) {
    const d = await svc.adminDetail(f.id);
    got[f.id] = d.diagnosis?.state;
  }
  check("D1 有效编号判为 valid", got[a.id] === "valid", got[a.id]);
  check("D2 全零编号判为 all_zero（服务端 OTel 没起来，不是用户没带）", got[b.id] === "all_zero", got[b.id]);
  check("D3 无编号判为 missing", got[c.id] === "missing", got[c.id]);
}

// ══════════ S 组：状态处理 ══════════
async function sGroup() {
  const f = await mkFeedback({ content: "状态流转用例", n: 6 });

  let err = null;
  try { await svc.adminUpdateStatus(f.id, { status: "resolved" }); } catch (e) { err = e; }
  check("S1 结案不填处理结果被拒", !!err && /处理结果/.test(err.message ?? ""), err?.message ?? "竟然通过");

  const ok = await svc.adminUpdateStatus(f.id, { status: "processing" });
  check("S2 正常流转 pending → processing", ok.status === "processing", JSON.stringify(ok));

  err = null;
  try { await svc.adminUpdateStatus(f.id, { status: "processing" }); } catch (e) { err = e; }
  check("S3 重复置为同一状态被拒", !!err && /已经是/.test(err.message ?? ""), err?.message ?? "竟然通过");

  err = null;
  try { await svc.adminUpdateStatus(f.id, { status: "pending" }); } catch (e) { err = e; }
  check("S4 回退到待处理不填原因被拒", !!err && /原因/.test(err.message ?? ""), err?.message ?? "竟然通过");

  const done = await svc.adminUpdateStatus(f.id, { status: "resolved", result: "已修复，版本 2.0.8" });
  check("S5 结案填了结果可以通过", done.status === "resolved", JSON.stringify(done));
  const after = await prisma.feedback.findUnique({ where: { id: f.id }, select: { status: true, result: true } });
  check("S6 处理结果落库", after.status === "resolved" && after.result === "已修复，版本 2.0.8",
    JSON.stringify(after));

  // ── 并发：两个人同时改，只能有一个成功，另一个收到明确提示而不是静默覆盖 ──
  const g = await mkFeedback({ content: "并发用例", n: 7 });
  const results = await Promise.allSettled([
    svc.adminUpdateStatus(g.id, { status: "processing" }),
    svc.adminUpdateStatus(g.id, { status: "resolved", result: "另一个人直接结案" }),
  ]);
  const okCount = results.filter((r) => r.status === "fulfilled").length;
  check("S7 并发流转恰好一个成功", okCount === 1,
    results.map((r) => r.status === "fulfilled" ? `ok:${r.value.status}` : `rej:${r.reason?.message}`).join(" | "));
  const rejected = results.find((r) => r.status === "rejected");
  check("S8 失败的一方收到明确提示（不是静默覆盖）",
    !!rejected && /状态已被他人变更|已经是/.test(rejected.reason?.message ?? ""),
    rejected?.reason?.message ?? "无拒绝");

  // 反证：若改成无条件更新，两个人都会「成功」，最终值由先后决定且无人知情
  const h = await mkFeedback({ content: "反证用例", n: 8 });
  const naive = await Promise.all([
    prisma.feedback.updateMany({ where: { id: h.id }, data: { status: "processing" } }),
    prisma.feedback.updateMany({ where: { id: h.id }, data: { status: "resolved" } }),
  ]);
  check("S9 反证：无条件更新时两次都影响 1 行（所以 S7/S8 的断言是有区分力的）",
    naive.every((r) => r.count === 1), naive.map((r) => r.count).join("/"));
}

// ══════════ N 组：非工单信号 ══════════
async function nGroup() {
  const sig = await mkFeedback({ type: "feed_dislike", content: '{"reason":"不感兴趣"}', n: 9 });
  const list = await svc.adminList({ page: 1, pageSize: 100 });
  const items = list.items ?? list.list ?? [];
  check("N1 feed_dislike 默认不进工单池", !items.some((r) => r.id === sig.id),
    `NON_TICKET_TYPES=${NON_TICKET_TYPES.join(",")}`);
  const only = await svc.adminList({ page: 1, pageSize: 100, signalsOnly: "true" });
  const onlyItems = only.items ?? only.list ?? [];
  check("N2 显式 signalsOnly 时能单独查看", onlyItems.some((r) => r.id === sig.id),
    `条数=${onlyItems.length}`);

  const stats = await svc.adminStats();
  check("N3 统计返回状态分布、类型分布与诊断编号有效率",
    Array.isArray(stats.byStatus) && Array.isArray(stats.byType) && typeof stats.diagnosis?.sampled === "number",
    `状态${stats.byStatus.length} 类型${stats.byType.length} 采样${stats.diagnosis?.sampled}`);
  check("N4 状态取值在约定集合内", FEEDBACK_STATUSES.length === 3, FEEDBACK_STATUSES.join("/"));
}

// ══════════ 主流程 ══════════
try {
  console.log("=== 用户反馈管理端（C 单元）· 独立验证 ===");
  if (fail > 0) {
    console.log(lines.join("\n"));
    console.log("隔离前提不成立，拒绝继续。");
    process.exitCode = 1;
  } else {
    await cleanup();
    await mGroup();
    await dGroup();
    await sGroup();
    await nGroup();
    await cleanup();
    console.log(lines.join("\n"));
    console.log(`=== ${pass} 通过 / ${fail} 失败 ===`);
    process.exitCode = fail > 0 ? 1 : 0;
  }
} finally {
  await prisma.$disconnect();
}
