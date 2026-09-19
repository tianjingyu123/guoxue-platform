#!/usr/bin/env node
/**
 * 用户反馈管理端（C 单元）· **真实 HTTP 验证**
 *
 * 与同目录的 `verify.mjs` 分工不同：
 *   · `verify.mjs`   直接调 service / 读路由元数据，验的是**实现与声明**；
 *   · 本脚本         起一个真的 Nest HTTP 服务，带真的 `JwtAuthGuard`、`RolesGuard`、
 *                    `StrictRedisThrottleGuard`、`AuditInterceptor`，用真的 Bearer 令牌发请求，
 *                    验的是**越权到底能不能读到东西**。
 *
 * 元数据断言能证明「装饰器写对了」，但证明不了「守卫链真的把人挡在外面」——
 * 比如守卫顺序不对、全局管道吞掉异常、或者某个路由漏挂了 `RolesGuard`，
 * 元数据层面都看不出来。所以这两套断言都要有。
 *
 * 连的是本机隔离测试库（基线形态，不含 B/D 任何字段），合成数据 `fbh-` 前缀。
 * 不连生产、不发消息、不改真实数据。
 */

import { createRequire } from "node:module";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = resolve(HERE, "../../..", "apps/server");
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

// 必须在加载任何模块之前设好：JwtStrategy 在构造时就读 JWT_SECRET，
// PrismaService 在实例化时读 DATABASE_URL。
process.env.DATABASE_URL = args.dsn;
process.env.JWT_SECRET = "c-receive-verify-only-not-a-real-secret";
process.env.NODE_ENV = "test";

let pass = 0, fail = 0;
const lines = [];
function check(name, ok, detail = "") {
  if (ok) pass += 1; else fail += 1;
  lines.push(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

// ── 隔离前提：必须是共享主线客户端，且不含 B/D 字段 ──
const prismaPath = req.resolve("@prisma/client");
check("H0 用的是共享主线 Prisma 客户端（非 B/D 候选客户端）",
  !prismaPath.includes(".prisma-candidate"), prismaPath);
const { Prisma } = req("@prisma/client");
const userFields = Prisma.dmmf?.datamodel?.models?.find((m) => m.name === "User")?.fields?.map((f) => f.name) ?? [];
check("H0 客户端不含 D 的 User.privacySettings", !userFields.includes("privacySettings"), "主线形态");

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
const jwt = req("jsonwebtoken");

const SRC = `${SERVER_DIR}/src`;
const { FeedbackController } = req(`${SRC}/modules/user/feedback.controller.ts`);
const { FeedbackService } = req(`${SRC}/modules/user/feedback.service.ts`);
const { PrismaService } = req(`${SRC}/prisma/prisma.service.ts`);
const { JwtStrategy } = req(`${SRC}/common/jwt.strategy.ts`);
const { RedisService } = req(`${SRC}/redis/redis.service.ts`);
const { AuditService } = req(`${SRC}/modules/audit/audit.service.ts`);
// AuditService 还依赖三个内容审核服务，但 `log()` 只用到 prisma。
// 用空对象占位而不是整个替换 AuditService —— 要测的就是它真实的写入实现。
const { ModerationService } = req(`${SRC}/modules/audit/moderation.service.ts`);
const { ModerationAiService } = req(`${SRC}/modules/audit/moderation-ai.service.ts`);
const { SensitiveWordService } = req(`${SRC}/modules/audit/sensitive-word.service.ts`);
const { AuditInterceptor } = req(`${SRC}/common/audit.interceptor.ts`);
// 线上响应统一被 ResponseInterceptor 包成 {code, data, ...}。
// 不挂它，测到的就不是真实的响应形状，「不泄露受保护字段」这类断言也就验错了对象。
const { ResponseInterceptor } = req(`${SRC}/common/response.interceptor.ts`);
const { ValidationPipe } = req("@nestjs/common");
const { AllExceptionsFilter } = req(`${SRC}/common/http-exception.filter.ts`);
const { PrismaExceptionFilter } = req(`${SRC}/common/prisma-exception.filter.ts`);
const { SanitizePipe } = req(`${SRC}/common/sanitize.pipe.ts`);
const { chineseValidationExceptionFactory } = req(`${SRC}/common/validation-chinese.ts`);

/**
 * Redis 桩：**不是为了绕过限流**，而是给限流守卫一个进程内的计数后端，
 * 让它的真实逻辑照跑（`StrictRedisThrottleGuard` = 10 次 / 60 秒 / 按用户计数）。
 * 换成「永远放行」的桩就测不出 H7 了。
 */
const counters = new Map();
const redisStub = {
  async get() { return null; },                       // JwtStrategy 查会话撤销
  async set() {},
  async getJson() { return null; },                   // 限流白名单
  async setJson() {},
  async del() {},
  async incrWithTtl(key, ttl) {
    const cur = (counters.get(key) ?? 0) + 1;
    counters.set(key, cur);
    return { count: cur, ttl };
  },
  async runExclusive(_k, _t, fn) { return fn(); },
  getClient() { return null; },
};

const moduleRef = await Test.createTestingModule({
  imports: [PassportModule.register({ defaultStrategy: "jwt" })],
  controllers: [FeedbackController],
  providers: [
    FeedbackService,
    PrismaService,
    JwtStrategy,
    AuditService,
    { provide: RedisService, useValue: redisStub },
    { provide: ModerationService, useValue: {} },
    { provide: ModerationAiService, useValue: {} },
    { provide: SensitiveWordService, useValue: {} },
    // 顺序与 main.ts 一致：Response 在外、Audit 在内
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
}).compile();

const app = moduleRef.createNestApplication();
// 与 main.ts 保持同一套全局装配。少了 ValidationPipe，DTO 上的 @IsIn 就形同虚设，
// 测出来的「通过」并不代表线上也通过。
app.useGlobalFilters(new PrismaExceptionFilter(), new AllExceptionsFilter());
app.useGlobalPipes(
  new SanitizePipe(),
  new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: false,
    exceptionFactory: chineseValidationExceptionFactory,
  }),
);
// main.ts:71 是 app.set("trust proxy", 1)，照搬。没有它，X-Forwarded-For 不生效，
// 也就没法在本机复现「来自非白名单 IP 的请求」。
app.getHttpAdapter().getInstance().set("trust proxy", 1);
await app.init();
await app.listen(0, "127.0.0.1");
const base = (await app.getUrl()).replace("[::1]", "127.0.0.1");
const prisma = app.get(PrismaService);

// ── 夹具 ──
const RUN = `fbh-${Date.now().toString(36)}`;
async function cleanup() {
  await prisma.auditLog.deleteMany({ where: { userId: { startsWith: "fbh-" } } });
  await prisma.feedback.deleteMany({ where: { userId: { startsWith: "fbh-" } } });
  await prisma.userRole.deleteMany({ where: { userId: { startsWith: "fbh-" } } });
  await prisma.user.deleteMany({ where: { id: { startsWith: "fbh-" } } });
}
async function mkUser(tag, roles = []) {
  const id = `${RUN}-${tag}`;
  await prisma.user.create({ data: { id, nickname: tag } });
  for (const roleType of roles) await prisma.userRole.create({ data: { userId: id, roleType } });
  return { id, token: jwt.sign({ sub: id, sessionIssuedAt: Date.now() }, process.env.JWT_SECRET, { expiresIn: "1h" }) };
}
const call = async (method, path, token, body, headers = {}) => {
  const r = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let json = null;
  try { json = await r.json(); } catch { /* 空响应体 */ }
  // 按**管理端 axios 拦截器的真实解包逻辑**还原（apps/admin/src/api/index.ts:43-59）：
  //   · 分页响应 {code, data:[...], pagination:{...}} → {items: data, ...pagination}
  //   · 其余     {code, data}                        → data
  // 照抄这段而不是自己写一个简化版，这样断言验的就是「前端真正拿到的东西」。
  let payload = json;
  if (json && typeof json === "object" && "code" in json && json.code === 200 && "data" in json) {
    payload = json.pagination ? { items: json.data, ...json.pagination } : json.data;
  }
  return { status: r.status, body: payload, raw: json };
};

try {
  await cleanup();

  const anon = { id: null, token: null };
  const normal = await mkUser("normal");                       // 无任何角色
  const lecturer = await mkUser("lecturer", ["LECTURER"]);     // 有角色但不是管理角色
  const cs = await mkUser("cs", ["CUSTOMER_SERVICE"]);
  const ops = await mkUser("ops", ["OPERATION_ADMIN"]);
  const sadmin = await mkUser("sadmin", ["SUPER_ADMIN"]);

  const RAW = "联系我 13812345678，邮箱 lisi@example.com";
  const fb = await prisma.feedback.create({
    data: {
      userId: normal.id, type: "bug", content: RAW,
      contact: "13812345678", images: ["https://x/a.png"], status: "pending",
    },
  });

  const READ_ROUTES = [
    ["GET", "/users/admin/feedback"],
    ["GET", "/users/admin/feedback/stats"],
    ["GET", `/users/admin/feedback/${fb.id}`],
  ];
  const REVEAL_ROUTES = [
    ["POST", `/users/admin/feedback/${fb.id}/reveal-contact`],
    ["POST", `/users/admin/feedback/${fb.id}/reveal-content`],
    ["POST", `/users/admin/feedback/${fb.id}/reveal-images`],
  ];
  const WRITE_ROUTE = ["PUT", `/users/admin/feedback/${fb.id}/status`];
  const ALL_ADMIN = [...READ_ROUTES, ...REVEAL_ROUTES, WRITE_ROUTE];

  // ── H1 未登录：全部 401 ──
  {
    const bad = [];
    for (const [m, p] of ALL_ADMIN) {
      const r = await call(m, p, anon.token, m === "PUT" ? { status: "processing" } : undefined);
      if (r.status !== 401) bad.push(`${m} ${p}→${r.status}`);
    }
    check(`H1 未登录访问 ${ALL_ADMIN.length} 个管理端接口全部 401`, bad.length === 0,
      bad.length ? bad.join("; ") : "7/7 = 401");
  }

  // ── H2 普通用户 / 非管理角色：全部 403 ──
  for (const [who, actor] of [["普通用户", normal], ["非管理角色(LECTURER)", lecturer]]) {
    const bad = [];
    for (const [m, p] of ALL_ADMIN) {
      const r = await call(m, p, actor.token, m === "PUT" ? { status: "processing" } : undefined);
      if (r.status !== 403) bad.push(`${m} ${p}→${r.status}`);
    }
    check(`H2 ${who}访问 ${ALL_ADMIN.length} 个管理端接口全部 403`, bad.length === 0,
      bad.length ? bad.join("; ") : "7/7 = 403");
  }

  // ── H3 越权确实读不到内容（不只是状态码对） ──
  {
    const r = await call("POST", `/users/admin/feedback/${fb.id}/reveal-contact`, normal.token);
    const text = JSON.stringify(r.body ?? {});
    check("H3 普通用户调明文接口：响应体里拿不到手机号",
      !text.includes("13812345678"), `status=${r.status} body=${text.slice(0, 120)}`);
    const r2 = await call("POST", `/users/admin/feedback/${fb.id}/reveal-content`, normal.token);
    check("H3 普通用户调正文原文接口：响应体里拿不到原文",
      !JSON.stringify(r2.body ?? {}).includes("lisi@example.com"), `status=${r2.status}`);
    const r3 = await call("POST", `/users/admin/feedback/${fb.id}/reveal-images`, normal.token);
    check("H3 普通用户调截图接口：响应体里拿不到链接",
      !JSON.stringify(r3.body ?? {}).includes("https://x/a.png"), `status=${r3.status}`);
    const before = await prisma.feedback.findUnique({ where: { id: fb.id }, select: { status: true } });
    await call("PUT", `/users/admin/feedback/${fb.id}/status`, normal.token, { status: "resolved", result: "越权结案" });
    const after = await prisma.feedback.findUnique({ where: { id: fb.id }, select: { status: true } });
    check("H3 普通用户改状态：数据库里的状态没有被改动",
      before.status === after.status && after.status === "pending", `${before.status} → ${after.status}`);
  }

  // ── H4 三个管理角色都能进，且列表/详情不泄露受保护字段 ──
  const LEAK_FIELDS = ["content", "contact", "images", "userId"];
  for (const [who, actor] of [["CUSTOMER_SERVICE", cs], ["OPERATION_ADMIN", ops], ["SUPER_ADMIN", sadmin]]) {
    const list = await call("GET", "/users/admin/feedback", actor.token);
    const row = (list.body?.items ?? list.body?.list ?? []).find((x) => x.id === fb.id);
    check(`H4 ${who} 能访问列表且取到该条`, list.status === 200 && !!row,
      `status=${list.status}`);
    check(`H4 ${who} 的列表走分页信封，且解包后正好是页面期望的 {items,total}`,
      !!list.raw?.pagination && Array.isArray(list.raw?.data) && typeof list.body?.total === "number",
      `pagination=${JSON.stringify(list.raw?.pagination)}`);
    if (row) {
      const leaked = LEAK_FIELDS.filter((f) => f in row);
      check(`H4 ${who} 的列表响应不含受保护字段`, leaked.length === 0,
        leaked.length ? `泄露：${leaked.join("、")}` : Object.keys(row).join(","));
      const raw = JSON.stringify(row);
      check(`H4 ${who} 的列表响应里没有手机号明文`, !raw.includes("13812345678"), row.contactMasked);
    }
    const detail = await call("GET", `/users/admin/feedback/${fb.id}`, actor.token);
    const dLeak = LEAK_FIELDS.filter((f) => detail.body && f in detail.body);
    check(`H4 ${who} 的详情响应不含受保护字段`, detail.status === 200 && dLeak.length === 0,
      dLeak.length ? `泄露：${dLeak.join("、")}` : `status=${detail.status}`);
  }

  // ── H5 管理角色取明文：拿得到，且这正是 H3 的反证 ──
  {
    const r = await call("POST", `/users/admin/feedback/${fb.id}/reveal-contact`, ops.token);
    // Nest 里 POST 成功默认 201，不是 200
    check("H5 管理角色取明文能拿到真实值（说明 H3 拿不到不是因为接口本身没数据）",
      [200, 201].includes(r.status) && r.body?.contact === "13812345678",
      `status=${r.status} ${JSON.stringify(r.body)}`);
  }

  // ── H6 审计：敏感操作留痕，只读查看不留痕 ──
  {
    // AuditInterceptor 是 fire-and-forget（`this.audit.log(...).catch(...)`，不 await），
    // 响应返回时写入可能还没提交。轮询而不是直接断言，否则测的是时序不是行为。
    const waitForLogs = async (ms = 5000) => {
      const until = Date.now() + ms;
      for (;;) {
        const n = await prisma.auditLog.count({ where: { targetType: "FEEDBACK", targetId: fb.id } });
        if (n > 0 || Date.now() > until) return n;
        await new Promise((r) => setTimeout(r, 100));
      }
    };
    const settled = await waitForLogs();
    check("H6 审计写入在响应后最终落库（轮询 ≤5s）", settled > 0, `条数=${settled}`);

    const logs = await prisma.auditLog.findMany({
      where: { targetType: "FEEDBACK", targetId: fb.id },
      orderBy: { createdAt: "asc" },
      select: { userId: true, action: true, targetType: true, targetId: true, detail: true, ip: true },
    });
    const reveal = logs.filter((l) => l.action.includes("查看"));
    check("H6 管理角色的明文查看写进了 AuditLog", reveal.length >= 1,
      `条数=${reveal.length} action=${[...new Set(logs.map((l) => l.action))].join("/")}`);
    const mine = reveal.find((l) => l.userId === ops.id);
    check("H6 审计记录里操作人是发起请求的管理员本人", !!mine, `userId=${mine?.userId}`);
    check("H6 审计记录带 targetType=FEEDBACK 与 targetId", !!mine && mine.targetType === "FEEDBACK" && mine.targetId === fb.id,
      `${mine?.targetType}/${mine?.targetId}`);
    check("H6 审计 detail 只记方法与路径，不落请求体",
      !!mine && /^(GET|POST|PUT) \/users\/admin\/feedback\//.test(mine.detail ?? "") && !mine.detail.includes("13812345678"),
      mine?.detail);
    // 越权者不应留下成功操作的审计（守卫在拦截器之后才轮到？—— 这里实测）
    const byNormal = logs.filter((l) => l.userId === normal.id);
    check("H6 被拒绝的越权请求没有写入成功操作的审计", byNormal.length === 0,
      byNormal.length ? JSON.stringify(byNormal) : "0 条");

    const listLogs = await prisma.auditLog.findMany({
      where: { targetType: "FEEDBACK", action: { contains: "列表" } },
    });
    check("H6 只读列表查看不写审计（避免噪声淹没明文访问记录）", listLogs.length === 0,
      `条数=${listLogs.length}`);
  }

  // ── H7 明文接口的独立限流真的生效 ──
  {
    // H7a 来自环回地址：**按平台既有设计豁免限流**。
    // `common/rate-limit-whitelist.ts` 把 127.0.0.1 / ::1 / 192.168.* 列为白名单，
    // 守卫在计数之前就 return true。这是既有平台行为，不是 C 的缺陷，
    // 但它意味着「本机/内网发起的明文查看不受 10 次/分钟限制」。
    counters.clear();
    const loopback = [];
    for (let i = 0; i < 13; i += 1) {
      const r = await call("POST", `/users/admin/feedback/${fb.id}/reveal-content`, sadmin.token);
      loopback.push(r.status);
    }
    check("H7a 环回地址按既有白名单豁免限流（如实记录，非 C 缺陷）",
      loopback.every((x) => x === 200 || x === 201),
      `状态序列=${loopback.join(",")}；白名单见 common/rate-limit-whitelist.ts`);

    // H7b 换成非白名单来源：守卫本身必须生效。
    // main.ts 开了 trust proxy，所以 X-Forwarded-For 决定 request.ip —— 与线上同一条判定路径。
    counters.clear();
    const outside = [];
    for (let i = 0; i < 13; i += 1) {
      const r = await call("POST", `/users/admin/feedback/${fb.id}/reveal-content`, sadmin.token,
        undefined, { "X-Forwarded-For": "203.0.113.9" });
      outside.push(r.status);
    }
    const okCount = outside.filter((x) => x === 200 || x === 201).length;
    const blocked = outside.filter((x) => x === 429).length;
    check("H7b 非白名单来源：第 11 次起被 429 挡下（10 次/分钟·按用户计数）",
      okCount === 10 && blocked === 3, `状态序列=${outside.join(",")}`);
  }

  // ── H8 状态流转：校验与并发 ──
  {
    const g = await prisma.feedback.create({
      data: { userId: normal.id, type: "bug", content: "状态用例", status: "pending" },
    });
    const noResult = await call("PUT", `/users/admin/feedback/${g.id}/status`, ops.token, { status: "resolved" });
    check("H8 结案不填处理结果被拒（HTTP 层）", noResult.status >= 400,
      `status=${noResult.status} ${JSON.stringify(noResult.body).slice(0, 80)}`);

    const okMove = await call("PUT", `/users/admin/feedback/${g.id}/status`, ops.token, { status: "processing" });
    check("H8 正常流转 pending → processing", okMove.status === 200 && okMove.body?.status === "processing",
      `status=${okMove.status}`);

    // 服务端 adminUpdateStatus 自身**不校验状态取值**，唯一的防线是 DTO 的 @IsIn +
    // 全局 ValidationPipe。所以这条断言同时在验「全局管道确实装上了」。
    const bad = await call("PUT", `/users/admin/feedback/${g.id}/status`, ops.token, { status: "不存在的状态" });
    check("H8 非法状态值被 DTO 校验拦下（唯一防线，服务端不另做枚举校验）",
      bad.status >= 400, `status=${bad.status} body=${JSON.stringify(bad.body).slice(0, 120)}`);
    const gAfter = await prisma.feedback.findUnique({ where: { id: g.id }, select: { status: true } });
    check("H8 非法状态值没有落库", gAfter.status !== "不存在的状态", gAfter.status);

    // 并发：两个管理员同时改
    const h = await prisma.feedback.create({
      data: { userId: normal.id, type: "bug", content: "并发用例", status: "pending" },
    });
    const [a, b] = await Promise.all([
      call("PUT", `/users/admin/feedback/${h.id}/status`, ops.token, { status: "processing" }),
      call("PUT", `/users/admin/feedback/${h.id}/status`, sadmin.token, { status: "resolved", result: "另一人直接结案" }),
    ]);
    const okN = [a, b].filter((r) => r.status === 200).length;
    check("H8 并发流转恰好一个成功（HTTP 层）", okN === 1, `a=${a.status} b=${b.status}`);
    const loser = [a, b].find((r) => r.status !== 200);
    check("H8 失败方收到明确错误而不是静默覆盖", !!loser && loser.status >= 400,
      // 整合复验加固：两个请求若未真正并发（冷启动时会完全串行，
      // 此时 pending→processing→resolved 两步都是合法流转，双方都 200），
      // loser 为 undefined，原写法在 JSON.stringify(undefined).slice() 处抛 TypeError，
      // 会让整轮 41 项的结果一起丢失。这里只加固消息拼接，判定条件一字未改。
      `status=${loser?.status ?? "无"} msg=${loser ? JSON.stringify(loser.body).slice(0, 100) : "两个请求都返回 200（本次未真正并发，见交接说明）"}`);
    const fin = await prisma.feedback.findUnique({ where: { id: h.id }, select: { status: true } });
    check("H8 最终状态是成功那一方写入的，没有被覆盖",
      ["processing", "resolved"].includes(fin.status), fin.status);
  }

  await cleanup();
} finally {
  try { await app.close(); } catch { /* 关闭失败不影响结论 */ }
}

console.log("=== 用户反馈管理端（C 单元）· 真实 HTTP 验证 ===");
console.log(lines.join("\n"));
console.log(`=== ${pass} 通过 / ${fail} 失败 ===`);
process.exitCode = fail > 0 ? 1 : 0;
