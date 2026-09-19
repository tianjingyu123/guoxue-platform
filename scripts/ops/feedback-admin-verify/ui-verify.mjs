#!/usr/bin/env node
/**
 * 用户反馈管理端（C 单元）· **后台页面实际操作检查**
 *
 * 真的起服务、真的开浏览器点。覆盖 8 组：
 *   列表 / 筛选 / 详情（脱敏 + 查看原文留痕）/ 认领 / 结案必填校验 /
 *   结案成功 / 服务端拒绝时的失败提示 / 无权限跳转。
 *
 * 为什么不用「读组件源码确认调了哪个接口」代替：那只能证明代码写了什么，
 * 证明不了路由守卫、Element Plus 确认框、axios 解包、错误提示这几段真的串起来了。
 * 本轮就是在这一层发现「列表分页信封要靠前端 axios 拦截器还原」这件事的。
 *
 * ── 为什么用构建产物而不是 vite dev ──────────────────────────────────────
 * 第一版用 `vite` 开发服务器 + 浏览器，在这台机器上因按需编译把资源耗尽，
 * 跑了 25 分钟没产出任何一张截图。改为先 `vite build`，再由**同一个 Nest 实例**
 * 直出静态产物：单进程、同源、无代理，负载低得多，也顺带证明该页能进生产构建。
 *
 * 只连本机隔离测试库，合成数据 `fbu-` 前缀。不连生产、不发消息。
 */

import { createRequire } from "node:module";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve, join, sep } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../..");
const SERVER_DIR = join(ROOT, "apps/server");
const DIST = join(ROOT, "apps/admin/dist");
const SHOTS = join(HERE, "ui-shots");
const req = createRequire(`${SERVER_DIR}${sep}package.json`);

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith("--")).map((a) => {
    const [k, ...v] = a.slice(2).split("=");
    return [k, v.join("=") || true];
  }),
);
if (!args.dsn) { console.error("必须提供 --dsn（仅限本机隔离测试库）"); process.exit(64); }
if (!["127.0.0.1", "localhost", "::1"].includes(new URL(args.dsn).hostname)) {
  console.error("拒绝连接非本机主机"); process.exit(64);
}
if (!existsSync(join(DIST, "index.html"))) {
  console.error(`管理端构建产物不存在：${DIST}\n请先在 apps/admin 下执行：npx vite build`);
  process.exit(65);
}
const PORT = Number(args.port || 3011);

process.env.DATABASE_URL = args.dsn;
process.env.JWT_SECRET = "c-receive-verify-only-not-a-real-secret";
process.env.NODE_ENV = "test";

const t0 = Date.now();
const step = (m) => console.log(`[${String(((Date.now() - t0) / 1000).toFixed(1)).padStart(6)}s] ${m}`);

let pass = 0, fail = 0;
const lines = [];
function check(name, ok, detail = "") {
  if (ok) pass += 1; else fail += 1;
  const line = `  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`;
  lines.push(line);
  console.log(line);
}

req("ts-node").register({
  transpileOnly: true,
  compilerOptions: {
    module: "commonjs", target: "es2022",
    experimentalDecorators: true, emitDecoratorMetadata: true, esModuleInterop: true,
  },
});
req("reflect-metadata");

const { Test } = req("@nestjs/testing");
const { PassportModule } = req("@nestjs/passport");
const { APP_INTERCEPTOR } = req("@nestjs/core");
const { ValidationPipe } = req("@nestjs/common");
const express = req("express");
const jwt = req("jsonwebtoken");
const puppeteer = req("puppeteer");

const SRC = `${SERVER_DIR}/src`;
const { FeedbackController } = req(`${SRC}/modules/user/feedback.controller.ts`);
const { FeedbackService } = req(`${SRC}/modules/user/feedback.service.ts`);
const { PrismaService } = req(`${SRC}/prisma/prisma.service.ts`);
const { JwtStrategy } = req(`${SRC}/common/jwt.strategy.ts`);
const { RedisService } = req(`${SRC}/redis/redis.service.ts`);
const { AuditService } = req(`${SRC}/modules/audit/audit.service.ts`);
const { ModerationService } = req(`${SRC}/modules/audit/moderation.service.ts`);
const { ModerationAiService } = req(`${SRC}/modules/audit/moderation-ai.service.ts`);
const { SensitiveWordService } = req(`${SRC}/modules/audit/sensitive-word.service.ts`);
const { AuditInterceptor } = req(`${SRC}/common/audit.interceptor.ts`);
const { ResponseInterceptor } = req(`${SRC}/common/response.interceptor.ts`);
const { AllExceptionsFilter } = req(`${SRC}/common/http-exception.filter.ts`);
const { PrismaExceptionFilter } = req(`${SRC}/common/prisma-exception.filter.ts`);
const { SanitizePipe } = req(`${SRC}/common/sanitize.pipe.ts`);
const { chineseValidationExceptionFactory } = req(`${SRC}/common/validation-chinese.ts`);

step("模块已加载");

const counters = new Map();
const redisStub = {
  async get() { return null; }, async set() {}, async getJson() { return null; },
  async setJson() {}, async del() {},
  async incrWithTtl(k, ttl) { const c = (counters.get(k) ?? 0) + 1; counters.set(k, c); return { count: c, ttl }; },
  async runExclusive(_k, _t, fn) { return fn(); }, getClient() { return null; },
};

const moduleRef = await Test.createTestingModule({
  imports: [PassportModule.register({ defaultStrategy: "jwt" })],
  controllers: [FeedbackController],
  providers: [
    FeedbackService, PrismaService, JwtStrategy, AuditService,
    { provide: RedisService, useValue: redisStub },
    { provide: ModerationService, useValue: {} },
    { provide: ModerationAiService, useValue: {} },
    { provide: SensitiveWordService, useValue: {} },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
}).compile();

const app = moduleRef.createNestApplication();

/**
 * 管理端外壳（Layout.vue）挂载时会调 /auth/me 与 /auth/menus，拿不到就 logout() 跳登录页。
 * 这里只给这两个**外壳依赖**打桩；被测的反馈接口全部是真的。
 */
const shellRoles = { value: ["SUPER_ADMIN"] };
app.use((rq, rs, nx) => {
  const p = String(rq.url || "").split("?")[0];
  if (p === "/api/v1/auth/me") {
    return rs.json({
      code: 200, message: "ok",
      data: { id: "ui-admin", nickname: "验收管理员", roles: shellRoles.value.map((roleType) => ({ roleType })) },
    });
  }
  if (p === "/api/v1/auth/menus") return rs.json({ code: 200, message: "ok", data: [] });
  return nx();
});
// 静态产物 + SPA 回退（history 模式）。/api/v1/* 交给 Nest 路由。
//
// 注意 base 路径：apps/admin/vite.config.ts 里 build 时 base = "/admin/"，
// 产物里的资源引用是 /admin/assets/xxx.js。只把 DIST 挂在根路径会让入口 JS 404，
// 页面能打开但一片空白、等不到任何组件 —— 第一版就是卡在这里。
app.use("/admin", express.static(DIST));
app.use(express.static(DIST));
app.use((rq, rs, nx) => {
  const p = String(rq.url || "").split("?")[0];
  if (rq.method === "GET" && !p.startsWith("/api/") && !/\.[a-z0-9]+$/i.test(p)) {
    return rs.sendFile(join(DIST, "index.html"));
  }
  return nx();
});

app.setGlobalPrefix("api/v1");
app.getHttpAdapter().getInstance().set("trust proxy", 1);
app.useGlobalFilters(new PrismaExceptionFilter(), new AllExceptionsFilter());
app.useGlobalPipes(
  new SanitizePipe(),
  new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false, exceptionFactory: chineseValidationExceptionFactory }),
);
await app.init();
await app.listen(PORT, "127.0.0.1");
const base = `http://127.0.0.1:${PORT}`;
const prisma = app.get(PrismaService);
step(`服务已就绪 ${base}（同源直出管理端构建产物）`);

// 自检：静态产物与 SPA 回退是否真的可用。浏览器卡住时先排除服务端。
{
  const r1 = await fetch(`${base}/admin/login`);
  const h1 = await r1.text();
  step(`自检 GET /login → ${r1.status}，${h1.length} 字节，含 <div id="app">=${h1.includes('id="app"')}`);
  const m = h1.match(/src="([^"]+\.js)"/);
  if (m) {
    const r2 = await fetch(`${base}${m[1]}`);
    const buf = await r2.arrayBuffer();
    step(`自检 GET ${m[1]} → ${r2.status}，${buf.byteLength} 字节`);
  } else {
    step("自检：index.html 里没找到入口 js（构建产物可能不完整）");
  }
}

const RUN = `fbu-${Date.now().toString(36)}`;
async function cleanup() {
  await prisma.auditLog.deleteMany({ where: { userId: { startsWith: "fbu-" } } });
  await prisma.feedback.deleteMany({ where: { userId: { startsWith: "fbu-" } } });
  await prisma.userRole.deleteMany({ where: { userId: { startsWith: "fbu-" } } });
  await prisma.user.deleteMany({ where: { id: { startsWith: "fbu-" } } });
}

let browser;
try {
  await cleanup();
  mkdirSync(SHOTS, { recursive: true });

  const adminId = `${RUN}-admin`;
  await prisma.user.create({ data: { id: adminId, nickname: "验收管理员" } });
  await prisma.userRole.create({ data: { userId: adminId, roleType: "SUPER_ADMIN" } });
  const token = jwt.sign({ sub: adminId, sessionIssuedAt: Date.now() }, process.env.JWT_SECRET, { expiresIn: "2h" });

  const reporter = `${RUN}-reporter`;
  await prisma.user.create({ data: { id: reporter, nickname: "提交用户" } });
  const mk = (type, content, status, extra = {}) =>
    prisma.feedback.create({ data: { userId: reporter, type, content, status, ...extra } });

  const bug = await mk("bug", "登录后一直转圈。联系我 13812345678", "pending",
    { contact: "13812345678", images: ["https://example.invalid/a.png"] });
  await mk("suggestion", "希望能加夜间模式", "pending");
  await mk("complaint", "客服态度不好", "processing");
  await mk("bug", "【诊断编号】0000000000000000|server_trace\n打不开", "resolved");
  await mk("feed_dislike", '{"reason":"不感兴趣"}', "pending");
  step("夹具已写入（5 条反馈）");

  // puppeteer 期望的 Chrome 版本本机没有装全，但缓存里有可用的旧版本。
  // 本脚本**不联网下载浏览器**（受本专项「不安装依赖」约束），
  // 改为显式指定已存在的可执行文件；版本以实际用到的为准并记录在交付里。
  const chromePath = args.chrome || process.env.PUPPETEER_EXECUTABLE_PATH || (() => {
    const { readdirSync, existsSync: ex } = req("node:fs");
    const home = process.env.USERPROFILE || process.env.HOME;
    const root = join(home, ".cache", "puppeteer", "chrome");
    if (!ex(root)) return null;
    const dirs = readdirSync(root).filter((d) => d.startsWith("win64-")).sort().reverse();
    for (const d of dirs) {
      const exe = join(root, d, "chrome-win64", "chrome.exe");
      if (ex(exe)) return exe;
    }
    return null;
  })();
  check("U0 找到可用的浏览器可执行文件（不联网下载）", !!chromePath, chromePath || "未找到");
  if (!chromePath) throw new Error("本机没有可用的 Chrome，无法进行页面实际操作检查");
  browser = await puppeteer.launch({
    headless: true,
    executablePath: chromePath,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(20_000);
  page.setDefaultNavigationTimeout(25_000);
  page.on("pageerror", (e) => step(`[页面错误] ${String(e.message).slice(0, 160)}`));
  page.on("requestfailed", (r) => step(`[请求失败] ${r.url().slice(0, 100)} ${r.failure()?.errorText}`));
  page.on("console", (m) => { if (m.type() === "error") step(`[控制台] ${m.text().slice(0, 160)}`); });
  await page.setViewport({ width: 1600, height: 1000 });
  step("浏览器已启动");

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const txt = () => page.evaluate(() => document.body.innerText);
  const rowCount = () => page.evaluate(() =>
    document.querySelectorAll(".el-table__body-wrapper tbody tr").length);
  const clickByText = async (text, sel = "button") => page.evaluate((t, s) => {
    const el = [...document.querySelectorAll(s)].find((b) => b.innerText.trim().startsWith(t));
    if (!el) return false;
    el.click(); return true;
  }, text, sel);
  const clickDialogConfirm = () => page.evaluate(() => {
    const b = [...document.querySelectorAll(".el-dialog__footer button")]
      .find((x) => x.innerText.trim() === "确认");
    if (!b) return false; b.click(); return true;
  });
  /**
   * 容错导航。本机 puppeteer 版本与可用的 Chrome 121 不完全匹配，
   * 对这个 SPA 的二次导航 `goto` 不会 resolve（页面其实已经在加载，
   * 控制台还在持续输出）。超时不当作失败，交给后面的 waitForSelector 判定。
   */
  const safeGoto = async (url) => {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 8000 });
    } catch {
      step(`goto 未 resolve（已知环境限制），继续等待页面就绪：${url}`);
    }
  };

  const seed = async (roles) => {
    shellRoles.value = roles;
    step(`seed: 打开 /admin/login`);
    await safeGoto(`${base}/admin/login`);
    step(`seed: 已打开，写入 localStorage`);
    await page.evaluate((tk, rs) => {
      localStorage.setItem("token", tk);
      localStorage.setItem("user_roles", JSON.stringify(rs));
    }, token, roles);
    step(`seed: 完成 roles=${roles.join(",")}`);
  };
  const openList = async () => {
    step("openList: 导航");
    await safeGoto(`${base}/admin/system/user-feedback`);
    step(`openList: 导航返回 url=${page.url()}`);
    try {
      await page.waitForSelector(".el-table", { timeout: 25_000 });
    } catch (e) {
      const dump = await page.evaluate(() => document.body.innerText.slice(0, 300)).catch(() => "(取不到)");
      step(`openList: 等不到 .el-table，页面文本=${JSON.stringify(dump)}`);
      throw e;
    }
    step("openList: 表格已出现");
    await wait(1200);
  };

  // ── U1 列表 ──
  await seed(["SUPER_ADMIN"]);
  await openList();
  const n1 = await rowCount();
  await page.screenshot({ path: join(SHOTS, "01-list.png") });
  const body1 = await txt();
  check("U1 列表渲染出数据行", n1 >= 4, `行数=${n1}`);
  check("U1 列表显示脱敏正文（页面上看不到完整手机号）",
    body1.includes("138****5678") && !body1.includes("13812345678"), "含 138****5678");
  check("U1 「不感兴趣」信号默认不进工单列表", !body1.includes("不感兴趣信号"), "默认排除");
  check("U1 顶部统计卡片渲染", /待处理/.test(body1) && /诊断编号/.test(body1), "");
  step("U1 完成");

  // ── U2 筛选 ──
  await page.evaluate(() => {
    const el = document.querySelectorAll(".filter-row .el-select")[0]?.querySelector("input");
    el?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    el?.click();
  });
  await wait(600);
  const picked = await page.evaluate(() => {
    const opt = [...document.querySelectorAll(".el-select-dropdown__item")]
      .find((o) => o.innerText.trim() === "处理中");
    if (!opt) return false; opt.click(); return true;
  });
  await wait(1500);
  const n2 = await rowCount();
  await page.screenshot({ path: join(SHOTS, "02-filter.png") });
  const body2 = await txt();
  check("U2 按状态筛选「处理中」生效", picked && n2 === 1 && n2 < n1, `筛选前=${n1} 筛选后=${n2}`);
  check("U2 筛选结果只剩处理中那条", body2.includes("客服态度不好"), "");
  step("U2 完成");

  // ── U3 详情：行内脱敏 + 查看原文（留痕确认）──
  await openList();
  const opened = await clickByText("查看原文");
  await wait(800);
  const confirmText = await txt();
  await page.screenshot({ path: join(SHOTS, "03-reveal-confirm.png") });
  check("U3 点「查看原文」先弹留痕确认框", opened && /会记入审计日志/.test(confirmText), "");
  await page.evaluate(() => {
    const b = [...document.querySelectorAll(".el-message-box__btns button")]
      .find((x) => x.innerText.trim() === "确认查看");
    b?.click();
  });
  await wait(1800);
  const body3 = await txt();
  await page.screenshot({ path: join(SHOTS, "04-revealed.png") });
  const logCount = await prisma.auditLog.count({
    where: { targetType: "FEEDBACK", action: { contains: "查看" } },
  });
  check("U3 该次查看写进审计日志（服务端确实被调用了）", logCount >= 1, `条数=${logCount}`);
  check("U3 确认后页面出现正文原文", body3.includes("13812345678"),
    body3.includes("138****5678") ? "页面仍显示脱敏串，原文没渲染出来" : "未找到任何联系串");

  // 区分「没取到」和「取到了但没渲染」：再点一次同一行的查看原文。
  // 第二次走的是 `revealed[row.id]` 已存在的分支，若这次能渲染出来，
  // 说明数据早就拿到了，问题出在第一次赋值的响应式上。
  if (!body3.includes("13812345678")) {
    // 在页面上下文里直接打同一个接口，看浏览器实际收到的 JSON 是什么形状。
    // 这能把「服务端没返」和「前端没渲染」分开。
    const wire = await page.evaluate(async (id, tk) => {
      const r = await fetch(`/api/v1/users/admin/feedback/${id}/reveal-content`, {
        method: "POST", headers: { Authorization: `Bearer ${tk}` },
      });
      return { status: r.status, body: (await r.text()).slice(0, 300) };
    }, bug.id, token);
    step(`U3 诊断：浏览器侧直接调接口 → ${wire.status} ${wire.body}`);
    check("U3 诊断：接口本身返回了原文", wire.body.includes("13812345678"),
      `HTTP ${wire.status}`);
    const toast = await page.evaluate(() =>
      [...document.querySelectorAll(".el-message")].map((e) => e.innerText.trim()).join(" | "));
    step(`U3 诊断：页面当前的提示条 = ${JSON.stringify(toast)}`);

    await clickByText("查看原文");
    await wait(600);
    await page.evaluate(() => {
      const b = [...document.querySelectorAll(".el-message-box__btns button")]
        .find((x) => x.innerText.trim() === "确认查看");
      b?.click();
    });
    await wait(1800);
    const body3b = await txt();
    await page.screenshot({ path: join(SHOTS, "04b-reveal-second-click.png") });
    const logCount2 = await prisma.auditLog.count({
      where: { targetType: "FEEDBACK", action: { contains: "查看" } },
    });
    check("U3 诊断：第二次点击能否渲染出原文",
      body3b.includes("13812345678"),
      `第二次点击后 ${body3b.includes("13812345678") ? "渲染出来了" : "仍未渲染"}；审计累计=${logCount2} 条`);

    // 决定性诊断：不重新挂载组件，只触发一次重渲染（改筛选会调 fetchList 换掉 rows）。
    // 如果这时原文出来了，说明数据早就在组件里，缺的只是那次赋值没触发响应式更新。
    await page.evaluate(() => {
      const el = document.querySelectorAll(".filter-row .el-select")[1]?.querySelector("input");
      el?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      el?.click();
    });
    await wait(600);
    await page.evaluate(() => {
      const opt = [...document.querySelectorAll(".el-select-dropdown__item")]
        .find((o) => o.innerText.trim() === "问题反馈");
      opt?.click();
    });
    await wait(1800);
    const body3c = await txt();
    await page.screenshot({ path: join(SHOTS, "04c-after-rerender.png") });
    check("U3 诊断：触发一次重渲染后原文是否出现",
      body3c.includes("13812345678"),
      body3c.includes("13812345678")
        ? "出现了 → 数据早已取到并保存在组件里，缺的是那次赋值的响应式触发"
        : "仍未出现 → 数据没有被保存下来");
  }
  step("U3 完成");

  // ── U4 认领 ──
  await openList();
  const claimBtn = await clickByText("认领");
  await wait(800);
  await page.screenshot({ path: join(SHOTS, "05-claim-dialog.png") });
  await clickDialogConfirm();
  await wait(2000);
  const afterClaim = await txt();
  const claimed = await prisma.feedback.count({ where: { userId: reporter, status: "processing" } });
  await page.screenshot({ path: join(SHOTS, "06-claimed.png") });
  check("U4 认领后出现成功提示", claimBtn && /已更新/.test(afterClaim), "");
  check("U4 认领后库里多一条处理中", claimed >= 2, `处理中条数=${claimed}`);
  step("U4 完成");

  // ── U5 结案必填校验（前端拦截）──
  await openList();
  await clickByText("结案");
  await wait(800);
  await clickDialogConfirm();
  await wait(1000);
  const warnText = await txt();
  await page.screenshot({ path: join(SHOTS, "07-resolve-required.png") });
  check("U5 结案不填处理结果给出失败提示", /结案必须填写处理结果/.test(warnText), "");
  step("U5 完成");

  // ── U6 结案成功 ──
  await page.evaluate(() => {
    const ta = document.querySelector(".el-dialog textarea");
    if (!ta) return;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
    setter.call(ta, "已在 2.0.9 修复并回访用户");
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await wait(400);
  await clickDialogConfirm();
  await wait(2000);
  const resolved = await prisma.feedback.findFirst({
    where: { userId: reporter, result: "已在 2.0.9 修复并回访用户" },
    select: { status: true, result: true },
  });
  await page.screenshot({ path: join(SHOTS, "08-resolved.png") });
  check("U6 填了处理结果后结案成功且结果落库", resolved?.status === "resolved", JSON.stringify(resolved));
  step("U6 完成");

  // ── U7 服务端拒绝时的失败提示 ──
  // 让列表里**只有一条** pending，否则 clickByText("认领") 点到的未必是被我改掉状态的那条，
  // 断言就会变成「随机点一条，碰巧成功了」。
  await prisma.feedback.updateMany({
    where: { userId: reporter, status: "pending" }, data: { status: "processing" },
  });
  const target = await mk("other", "U7 并发冲突用例", "pending");
  await openList();
  const pendingRows = await page.evaluate(() =>
    [...document.querySelectorAll(".el-table__body-wrapper tbody tr")]
      .filter((tr) => tr.innerText.includes("待处理")).length);
  check("U7 前置：列表里恰好一条待处理（保证点到的就是目标行）", pendingRows === 1, `待处理行数=${pendingRows}`);
  if (target) {
    // 页面背后把状态改掉，模拟另一个人先动了手
    await prisma.feedback.update({ where: { id: target.id }, data: { status: "processing" } });
    const hasClaim = await clickByText("认领");
    check("U7 前置：页面上找得到「认领」按钮", hasClaim, hasClaim ? "" : "列表里没有待处理行，断言无从谈起");
    await wait(800);
    const dialogOk = await clickDialogConfirm();
    check("U7 前置：弹窗的「确认」按钮可点", dialogOk, "");
    await wait(2500);
    const errText = await txt();
    await page.screenshot({ path: join(SHOTS, "09-stale-conflict.png") });
    check("U7 服务端拒绝时页面给出明确失败提示（不是静默成功）",
      /已经是|状态已被他人变更/.test(errText),
      (errText.split("\n").find((l) => /已经是|变更/.test(l)) || "").slice(0, 60));
  } else {
    check("U7 服务端拒绝时页面给出明确失败提示", false, "没有可用的 pending 夹具");
  }
  step("U7 完成");

  // ── U8 无权限 ──
  await seed(["LECTURER"]);
  await safeGoto(`${base}/admin/system/user-feedback`);
  await wait(3000);
  const url = page.url();
  await page.screenshot({ path: join(SHOTS, "10-forbidden.png") });
  check("U8 非管理角色访问该页被路由守卫挡到 403", /\/403/.test(url), `落地 URL=${url}`);
  step("U8 完成");

  await cleanup();
} catch (e) {
  check("执行异常", false, (e?.message ?? String(e)).slice(0, 200));
} finally {
  try { if (browser) await browser.close(); } catch { /* ignore */ }
  try { await app.close(); } catch { /* ignore */ }
}

console.log("=== 用户反馈管理端（C 单元）· 后台页面实际操作检查 ===");
console.log(lines.join("\n"));
console.log(`截图证据：${SHOTS}`);
console.log(`=== ${pass} 通过 / ${fail} 失败 ===`);
process.exitCode = fail > 0 ? 1 : 0;
