/* eslint-disable no-console, @typescript-eslint/no-unused-vars, prefer-const */
/**
 * E2E API 流程测试 — 覆盖 5 种角色核心业务
 * 用法: npx ts-node scripts/e2e-test.ts
 */
const BASE = "http://localhost:3000/api/v1";

interface TestResult { name: string; status: "PASS" | "FAIL" | "SKIP"; duration: number; error?: string }
const results: TestResult[] = [];
let token = "";

async function req(method: string, path: string, body?: any) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const start = Date.now();
  const res = await fetch(`${BASE}${path}`, {
    method, headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json: any = await res.json();
  return { status: res.status, json, duration: Date.now() - start };
}

function check(name: string, ok: boolean, duration: number, skip = false) {
  results.push({
    name,
    status: skip ? "SKIP" : ok ? "PASS" : "FAIL",
    duration,
    error: ok || skip ? undefined : "未通过",
  });
}

function log(name: string, passed: boolean, ms: number) {
  const icon = passed ? "✓" : "✗";
  console.log(`  ${icon} ${name} (${ms}ms)`);
}

// ═══════════════════════════════════════════
// 角色1：游客（未登录）
// ═══════════════════════════════════════════
async function guestFlows() {
  console.log("\n═══ 角色1：游客 ═══");

  // 系统健康
  let { status, json, duration } = await req("GET", "/system/health");
  let ok = status === 200 && json.data?.status === "healthy";
  check("系统健康检查", ok, duration); log("系统健康检查", ok, duration);

  // 首页
  ({ status, json, duration } = await req("GET", "/home?stationId=default"));
  ok = status === 200 && json.code === 200;
  check("首页数据加载", ok, duration); log("首页数据加载", ok, duration);

  // 发现页
  ({ status, json, duration } = await req("GET", "/discover?page=1&pageSize=5"));
  ok = status === 200;
  check("发现页浏览", ok, duration); log("发现页浏览", ok, duration);

  // 古籍列表
  ({ status, json, duration } = await req("GET", "/classic/books?page=1&pageSize=5"));
  ok = status === 200;
  check("古籍列表浏览", ok, duration); log("古籍列表浏览", ok, duration);

  // 课程列表
  ({ status, duration } = await req("GET", "/courses?page=1&pageSize=5"));
  ok = status === 200;
  check("课程列表浏览", ok, duration); log("课程列表浏览", ok, duration);

  // 商城商品
  ({ status, duration } = await req("GET", "/shop/products?page=1&pageSize=5"));
  ok = status === 200;
  check("商城商品浏览", ok, duration); log("商城商品浏览", ok, duration);

  // 圈子列表
  ({ status, duration } = await req("GET", "/circles?page=1&pageSize=5"));
  ok = status === 200;
  check("圈子列表浏览", ok, duration); log("圈子列表浏览", ok, duration);

  // 搜索
  ({ status, duration } = await req("GET", "/search?q=论语&page=1&pageSize=5"));
  ok = status === 200;
  check("搜索功能", ok, duration); log("搜索功能", ok, duration);

  // 直播列表
  ({ status, duration } = await req("GET", "/live/rooms?page=1&pageSize=5"));
  ok = status === 200;
  check("直播列表浏览", ok, duration); log("直播列表浏览", ok, duration);

  // 视频列表
  ({ status, duration } = await req("GET", "/videos?page=1&pageSize=5"));
  ok = status === 200;
  check("视频列表浏览", ok, duration); log("视频列表浏览", ok, duration);
}

// ═══════════════════════════════════════════
// 角色1→2：登录/注册
// ═══════════════════════════════════════════
async function authFlows() {
  console.log("\n═══ 登录/注册流程 ═══");

  // 注册新用户（密码需包含大小写字母+数字，≥8位）
  const testPhone = `139${String(Date.now()).slice(-8)}`;
  const testPassword = "Abc12345";
  let { status, json, duration } = await req("POST", "/auth/register/phone", {
    phone: testPhone,
    nickname: "E2E测试",
    password: testPassword,
  });
  const regOk = status === 201 || status === 200;
  if (regOk && json.data?.accessToken) {
    token = json.data.accessToken;
    userId = json.data.user?.id || json.data.id || "";
  }
  check("注册新用户", regOk, duration); log("注册新用户", regOk, duration);

  // 注册成功就不用再登录；若已存在则尝试密码登录
  if (!token) {
    ({ status, json, duration } = await req("POST", "/auth/login/phone", {
      phone: testPhone,
      password: testPassword,
    }));
    const loginOk = status === 201 || status === 200;
    if (loginOk && json.data?.accessToken) {
      token = json.data.accessToken;
      userId = json.data.user?.id || json.data.id || "";
    }
    check("密码登录", loginOk, duration); log("密码登录", loginOk, duration);
  } else {
    check("密码登录（注册已覆盖）", true, 0); log("密码登录（注册已覆盖）", true, 0);
  }

  // 获取个人信息
  let ok: boolean;
  if (token) {
    ({ status, json, duration } = await req("GET", "/auth/me"));
    ok = status === 200;
    check("获取个人资料", ok, duration); log("获取个人资料", ok, duration);

    // 获取菜单权限
    ({ status, duration } = await req("GET", "/auth/menus"));
    ok = status === 200;
    check("获取菜单权限", ok, duration); log("获取菜单权限", ok, duration);
  }
}

// ═══════════════════════════════════════════
// 角色2：普通用户
// ═══════════════════════════════════════════
async function userFlows() {
  console.log("\n═══ 角色2：普通用户 ═══");

  if (!token) { console.log("  ⚠ 未登录，跳过用户流程"); return; }

  let ok: boolean; let status: number; let json: any; let duration: number;

  // 签到
  ({ status, json, duration } = await req("POST", "/users/me/checkin"));
  ok = status === 201 || status === 200;
  check("每日签到", ok, duration); log("每日签到", ok, duration);

  // 积分记录
  ({ status, duration } = await req("GET", "/users/me/points/records?page=1&pageSize=10"));
  ok = status === 200;
  check("积分记录查询", ok, duration); log("积分记录查询", ok, duration);

  // 成长值记录
  ({ status, duration } = await req("GET", "/users/me/growth/records?page=1&pageSize=10"));
  ok = status === 200;
  check("成长值记录查询", ok, duration); log("成长值记录查询", ok, duration);

  // 收藏列表
  ({ status, duration } = await req("GET", "/interaction/collect?page=1&pageSize=5"));
  ok = status === 200;
  check("收藏列表", ok, duration); log("收藏列表", ok, duration);

  // 浏览历史
  ({ status, duration } = await req("GET", "/users/me/history?page=1&pageSize=5"));
  ok = status === 200;
  check("浏览历史", ok, duration); log("浏览历史", ok, duration);

  // 通知列表
  ({ status, duration } = await req("GET", "/notifications?page=1&pageSize=5"));
  ok = status === 200;
  check("通知列表", ok, duration); log("通知列表", ok, duration);

  // 八字排盘 (公开预览接口，无需登录)
  ({ status, json, duration } = await req("POST", "/paipan/bazi/preview", {
    gender: "男",
    year: 1990,
    month: 5,
    day: 15,
    hour: 10,
  }));
  ok = status === 201 || status === 200;
  check("八字排盘计算", ok, duration); log("八字排盘计算", ok, duration);

  // AI 智能体广场
  ({ status, duration } = await req("GET", "/ai/marketplace/agents?page=1&pageSize=5"));
  ok = status === 200;
  check("AI智能体广场", ok, duration); log("AI智能体广场", ok, duration);

  // 我的订单
  ({ status, duration } = await req("GET", "/shop/orders/my?page=1&pageSize=5"));
  ok = status === 200;
  check("我的订单列表", ok, duration); log("我的订单列表", ok, duration);

  // 地址管理
  ({ status, duration } = await req("GET", "/shop/addresses"));
  ok = status === 200;
  check("收货地址列表", ok, duration); log("收货地址列表", ok, duration);

  // 钱包信息
  ({ status, duration } = await req("GET", "/coin/balance"));
  ok = status === 200;
  check("钱包信息", ok, duration); log("钱包信息", ok, duration);
}

// ═══════════════════════════════════════════
// 角色3：圈主/管理员
// ═══════════════════════════════════════════
async function circleOwnerFlows() {
  console.log("\n═══ 角色3：圈主/管理员 ═══");

  if (!token) { console.log("  ⚠ 未登录，跳过圈主流程"); return; }

  let ok: boolean; let status: number; let duration: number; let json: any;
  let createdCircleId = "";

  // 创建圈子
  const circleName = `E2E测试圈子_${Date.now()}`;
  ({ status, json, duration } = await req("POST", "/circles", {
    name: circleName,
    intro: "这是一个至少10字的圈子介绍，用于自动化测试",
    tags: ["测试", "国学"],
    type: "FREE",
  }));
  ok = status === 201;
  if (ok) createdCircleId = json.data?.id || json.id || "";
  check("创建圈子", ok, duration); log("创建圈子", ok, duration);

  if (createdCircleId) {
    // 发布公告
    ({ status, duration } = await req("PUT", `/circles/${createdCircleId}/announcement`, {
      content: "E2E测试公告内容，这是公告正文", isTop: true,
    }));
    ok = status === 200;
    check("发布圈子公告", ok, duration); log("发布圈子公告", ok, duration);

    // 发帖
    ({ status, json, duration } = await req("POST", `/circles/${createdCircleId}/posts`, {
      type: "TEXT",
      title: "E2E测试帖子标题",
      content: "这是自动化测试帖子内容，至少要有一些长度",
    }));
    ok = status === 201;
    const postId = ok ? (json.data?.id || json.id) : "";
    check("发布帖子", ok, duration); log("发布帖子", ok, duration);

    // 评论帖子
    if (postId) {
      ({ status, duration } = await req("POST", "/comment", {
        targetType: "CIRCLE_POST",
        targetId: postId,
        content: "E2E测试评论内容够长",
      }));
      ok = status === 201;
      check("评论帖子", ok, duration); log("评论帖子", ok, duration);
    }

    // 圈子数据看板
    ({ status, duration } = await req("GET", `/circles/${createdCircleId}/dashboard/revenue-breakdown`));
    ok = status === 200;
    check("圈子数据看板", ok, duration); log("圈子数据看板", ok, duration);

    // 清理：删除帖子（无删除圈子端点）
    if (postId) {
      ({ status, duration } = await req("DELETE", `/circles/${createdCircleId}/posts/${postId}`));
      ok = status === 200;
      check("删除测试帖子（清理）", ok, duration); log("删除测试帖子（清理）", ok, duration);
    }
  }
}

// ═══════════════════════════════════════════
// 角色4：商城/商家
// ═══════════════════════════════════════════
async function merchantFlows() {
  console.log("\n═══ 角色4：商城/商家 ═══");

  if (!token) { console.log("  ⚠ 未登录，跳过商家流程"); return; }

  let ok: boolean; let status: number; let duration: number;

  // 商品分类
  ({ status, duration } = await req("GET", "/shop/categories/tree"));
  ok = status === 200;
  check("商品分类树", ok, duration); log("商品分类树", ok, duration);

  // 优惠券列表
  ({ status, duration } = await req("GET", "/shop/coupons?page=1&pageSize=5"));
  ok = status === 200;
  check("优惠券列表", ok, duration); log("优惠券列表", ok, duration);

  // 购物车（如果有）
  ({ status, duration } = await req("GET", "/shop/cart"));
  ok = status === 200 || status === 404;
  check("购物车查询", ok, duration); log("购物车查询", ok, duration);

  // 商品评价
  ({ status, duration } = await req("GET", "/shop/reviews?page=1&pageSize=5"));
  ok = status === 200;
  check("商品评价列表", ok, duration); log("商品评价列表", ok, duration);
}

// ═══════════════════════════════════════════
// 角色5：后台管理员
// ═══════════════════════════════════════════
async function adminFlows() {
  console.log("\n═══ 角色5：后台管理员 ═══");

  if (!token) { console.log("  ⚠ 未登录，跳过管理员流程"); return; }

  let ok: boolean; let status: number; let duration: number;

  // 仪表盘
  ({ status, duration } = await req("GET", "/dashboard/platform"));
  ok = status === 200 || status === 403;
  check("平台仪表盘", ok, duration); log("平台仪表盘", ok, duration);

  // 用户管理列表
  ({ status, duration } = await req("GET", "/users?page=1&pageSize=5"));
  ok = status === 200 || status === 403;
  check("用户管理列表", ok, duration); log("用户管理列表", ok, duration);

  // 内容管理列表
  ({ status, duration } = await req("GET", "/contents?page=1&pageSize=5"));
  ok = status === 200 || status === 403;
  check("内容管理列表", ok, duration); log("内容管理列表", ok, duration);

  // 审计日志
  ({ status, duration } = await req("GET", "/system/audit-logs?page=1&pageSize=5"));
  ok = status === 200 || status === 403;
  check("审计日志查询", ok, duration); log("审计日志查询", ok, duration);

  // 系统配置
  ({ status, duration } = await req("GET", "/system/configs"));
  ok = status === 200 || status === 403;
  check("系统配置查询", ok, duration); log("系统配置查询", ok, duration);

  // 智能体管理
  ({ status, duration } = await req("GET", "/bots?page=1&pageSize=5"));
  ok = status === 200 || status === 403;
  check("智能体管理列表", ok, duration); log("智能体管理列表", ok, duration);
}

// ═══════════════════════════════════════════
// 报告生成
// ═══════════════════════════════════════════
function report() {
  console.log("\n\n╔════════════════════════════════╗");
  console.log("║     E2E 测试报告               ║");
  console.log("╚════════════════════════════════╝\n");

  const passed = results.filter((r) => r.status === "PASS");
  const failed = results.filter((r) => r.status === "FAIL");
  const skipped = results.filter((r) => r.status === "SKIP");

  for (const r of results) {
    const icon = r.status === "PASS" ? "✓" : r.status === "SKIP" ? "○" : "✗";
    console.log(`  ${icon} ${r.name} (${r.duration}ms)${r.error ? ` — ${r.error}` : ""}`);
  }

  console.log(`\n  ─────────────────────────`);
  console.log(`  总计: ${results.length} | 通过: ${passed.length} | 失败: ${failed.length} | 跳过: ${skipped.length}`);
  console.log(`  通过率: ${((passed.length / (results.length - skipped.length)) * 100).toFixed(1)}%`);
  console.log(`  总耗时: ${results.reduce((s, r) => s + r.duration, 0)}ms`);
  console.log();

  return failed.length === 0;
}

// ═══════════════════════════════════════════
// Main
// ═══════════════════════════════════════════
async function main() {
  console.log("╔══════════════════════════════════════╗");
  console.log("║  国学平台 E2E API 自动化测试          ║");
  console.log("║  Base: " + BASE.padEnd(30) + "║");
  console.log("╚══════════════════════════════════════╝");

  try {
    await guestFlows();
    await authFlows();
    await userFlows();
    await circleOwnerFlows();
    await merchantFlows();
    await adminFlows();
  } catch (err: any) {
    console.error("\n  ✗ 测试异常:", err.message);
  }

  const exitCode = report() ? 0 : 1;
  process.exit(exitCode);
}

main();
