/**
 * V0 → UniApp Vue3 批量转换脚本 v3
 * 修复: Windows路径兼容 / 完整501路由映射 / JSX模板提取
 */
const fs = require("fs");
const path = require("path");

const V0_APP = "C:/Users/Administrator/Desktop/V0前端完整版6.6日/app";
const VUE_PAGES = "C:/Users/Administrator/Desktop/guoxue-platform/apps/mobile/src/pages";
const PAGES_JSON = "C:/Users/Administrator/Desktop/guoxue-platform/apps/mobile/src/pages.json";

let stats = { ok: 0, skip: 0, fail: 0 };

// ─── 动态路由命名规则 ───
// [id] → 根据父路径推断: circles/[id] → circles/detail
// [orderId] → order-detail, [expertId] → expert-detail
const DYNAMIC_NAMES = {
  "[id]": "detail",
  "[orderId]": "order-detail",
  "[expertId]": "expert-detail",
  "[postId]": "post-detail",
  "[annoId]": "announcement-detail",
  "[activityId]": "activity-detail",
  "[toolId]": "tool-detail",
  "[type]": "type-detail",
};

function safePath(v0Route) {
  // 替换动态路由参数为安全名称
  return v0Route.replace(/\[(\w+)\]/g, (m, name) => {
    return DYNAMIC_NAMES[m] || name + "-detail";
  });
}

// ─── 提取页面标题 ───
const TITLE_MAP = {
  "about": "关于我们", "mall": "商城", "cart": "购物车", "checkout": "结算",
  "profile": "个人中心", "search": "搜索", "courses": "课程", "live": "直播",
  "circles": "圈子", "mine": "我的", "wallet": "钱包", "vip": "会员",
  "orders": "订单", "classics": "古籍", "bots": "AI助手", "discover": "发现",
  "articles": "文章", "qa": "问答", "bounty": "悬赏", "notifications": "通知",
  "same-city": "同城", "offline": "线下", "institute": "研究院", "activity": "活动",
  "address": "地址管理", "coupons": "优惠券", "aftersale": "售后服务",
  "seckill": "秒杀", "group-buy": "拼团", "payment": "支付", "login": "登录",
  "bazi": "八字排盘", "paipan": "排盘工具", "merchant": "商家中心",
  "agents": "AI智能体", "ai": "AI工具", "tools": "排盘工具",
  "favorites": "收藏", "fortune": "运势", "ebook": "电子书", "poetry": "诗词",
  "station": "分站管理", "creator": "创作者中心", "competition": "比赛",
  "teacher": "讲师", "videos": "短视频", "points": "积分中心",
  "invite": "邀请有礼", "withdraw": "提现", "tasks": "日常任务",
  "report": "数据报告", "share": "分享", "help": "帮助中心",
  "legal": "法律条款", "error": "错误页面", "splash": "启动页",
  "welcome": "欢迎页", "manage": "管理", "announcements": "公告",
  "appointment": "预约", "booking": "预约", "appeal": "申诉",
  "become-partner": "成为合作伙伴", "authors": "作者",
  "check-in": "签到", "customer-service": "客服中心",
  "interests-guide": "兴趣引导", "chat": "聊天", "im": "消息",
  "call": "通话", "agreement": "协议", "circle": "圈子",
  "agent": "智能体", "collections": "合集", "topics": "话题",
  "article": "文章详情", "readers": "阅读器", "design": "设计规范",
  "demo": "演示", "auth": "认证", "brand": "品牌",
};

function getTitle(v0Route) {
  const parts = v0Route.split("/");
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    if (p.startsWith("[")) continue;
    if (p === "page") continue;
    if (TITLE_MAP[p]) return TITLE_MAP[p];
  }
  // 最后一段有效路径
  const last = parts.filter(p => !p.startsWith("[")).pop() || "页面";
  return TITLE_MAP[last] || last;
}

// ─── JSX 模板提取 ───
function extractJSXTemplate(code) {
  const lines = code.split("\n");
  let result = [];
  let found = false;
  let depth = 0;
  let startCollecting = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (!found) {
      // 找 return ( 或 return <
      if (trimmed.match(/^return\s*\(/)) {
        found = true;
        startCollecting = true;
        depth = 1;
        const afterParen = trimmed.substring(trimmed.indexOf("(") + 1).trim();
        if (afterParen && afterParen !== ")" && afterParen !== ");") {
          result.push(afterParen);
        }
        continue;
      }
      if (trimmed.match(/^return\s+</)) {
        found = true;
        startCollecting = true;
        depth = 0;
        result.push(trimmed.replace(/^return\s+/, ""));
        continue;
      }
      continue;
    }

    if (startCollecting) {
      // 追踪括号深度
      for (const ch of trimmed) {
        if (ch === "(" || ch === "{" || ch === "[") depth++;
        if (ch === ")" || ch === "}" || ch === "]") depth--;
      }

      if (depth <= 0) {
        // 找到闭合
        const closeMatch = trimmed.match(/^(\s*\)\s*;?\s*)$/);
        if (closeMatch || trimmed === "}" || trimmed === ");") {
          startCollecting = false;
          break;
        }
      }

      if (depth > 0 || trimmed !== "}") {
        result.push(lines[i]);
      }
    }
  }

  return result.join("\n");
}

// ─── JSX → Vue 模板转换 ───
function jsxToVue(jsx) {
  let t = jsx;

  // 注释
  t = t.replace(/\{\s*\/\*\s*([^*]|\*[^/])*\*\/\s*\}/g, "<!-- $1 -->");
  t = t.replace(/"use client"/g, "");

  // HTML标签转换
  const htmlToView = ["div","span","p","h1","h2","h3","h4","h5","h6",
    "section","header","footer","nav","aside","main","article",
    "figure","figcaption","label","a","ul","ol","li","strong","em","small"];

  for (const tag of htmlToView) {
    const replacement = ["h1","h2","h3","h4","h5","h6","p","span","a","strong","em","small","label","figcaption"].includes(tag) ? "text" : "view";
    t = t.replace(new RegExp(`<${tag}\\b`, "g"), `<${replacement}`);
    t = t.replace(new RegExp(`</${tag}>`, "g"), `</${replacement}>`);
  }

  t = t.replace(/<img\b/g, "<image");
  t = t.replace(/<br\b/g, "<text>\n</text>");
  t = t.replace(/<hr\b/g, '<view class="v0-hr"');
  t = t.replace(/<button\b/g, '<view class="v0-btn"');
  t = t.replace(/<\/button>/g, "</view>");
  t = t.replace(/<input\b/g, "<input");

  // 事件
  t = t.replace(/onClick=/g, "@click=");
  t = t.replace(/onChange=/g, "@change=");
  t = t.replace(/onSubmit=/g, "@submit.prevent=");
  t = t.replace(/onFocus=/g, "@focus=");
  t = t.replace(/onBlur=/g, "@blur=");

  // 属性
  t = t.replace(/className=/g, "class=");
  t = t.replace(/htmlFor=/g, "for=");
  t = t.replace(/checked=\{/g, ":checked={");
  t = t.replace(/disabled=\{/g, ":disabled={");
  t = t.replace(/selected=\{/g, ":selected={");
  t = t.replace(/style=\{\{/g, ':style="');
  t = t.replace(/\}\}\s*\}/g, '"');

  // JSX表达式 {x} → {{ x }}
  // 但保留对象字面量、箭头函数、字符串模板
  t = t.replace(/\{([^}"']+?)\}/g, (m, inner) => {
    const s = inner.trim();
    if (!s || s.startsWith("//") || s.startsWith("/*")) return m;
    if (s.includes("=>") || s.includes(":") || s.includes("`")) return m;
    if (s.startsWith("...")) return m;
    return `{{ ${s} }}`;
  });

  // 修复双花括号中的花括号
  t = t.replace(/\{\{\s*\{\s*/g, "{{ ");
  t = t.replace(/\}\s*\}\}/g, " }}");

  // map → v-for (简化处理)
  t = t.replace(/\{(\w+)\.map\s*\(\s*\(?(\w+),?\s*(\w+)?\)?\s*=>/g,
    (m, arr, item, idx) => {
      const key = idx || "index";
      return `\n<view v-for="(${item}, ${key}) in ${arr}" :key="${key}">`;
    });

  // 条件渲染简化
  t = t.replace(/\{(\w+)\s*\?\s*</g, '<template v-if="$1">\n');
  t = t.replace(/\{(\w+)\s*&&\s*</g, '<template v-if="$1">\n');

  // Fragment
  t = t.replace(/<>/g, "").replace(/<\/>/g, "");

  // aria-* 等保留
  return t;
}

// ─── 生成单个 Vue SFC ───
function buildVueSFC(v0Route, vueRelPath, title) {
  const v0File = path.join(V0_APP, ...v0Route.split("/"), "page.tsx");
  if (!fs.existsSync(v0File)) return null;

  let code;
  try { code = fs.readFileSync(v0File, "utf-8"); } catch { return null; }

  // 提取和转换JSX
  const jsx = extractJSXTemplate(code);
  let template = jsx ? jsxToVue(jsx) : "<!-- 模板提取失败，请手动完善 -->";

  // 提取mock数据常量（const xxx = [...] 或 {...})
  const mockData = [];
  const lines = code.split("\n");
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith("const ") && (t.includes("= [") || t.includes("= {") || t.includes('= "'))) {
      if (!t.includes("function") && !t.includes("=>")) {
        mockData.push(line);
      }
    }
  }

  const vueCode = `<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">${title}</text>
      <text class="v0-route">V0: ${v0Route}</text>
    </view>
${template.split("\n").map(l => "    " + l).join("\n")}
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
${mockData.slice(0, 10).join("\n")}

async function fetchData() {
  loading.value = true
  try { loading.value = false } catch (e: any) { error.value = e.message }
}

onMounted(() => fetchData())
onPullDownRefresh(() => fetchData().finally(() => uni.stopPullDownRefresh()))
</script>

<style scoped>
.page {
  background: #FAF8F5;
  min-height: 100vh;
}
.v0-header {
  padding: 24rpx 32rpx;
  background: linear-gradient(135deg, #C41E3A, #8B0000);
  margin-bottom: 24rpx;
}
.v0-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #FFFFFF;
  display: block;
}
.v0-route {
  font-size: 20rpx;
  color: rgba(255,255,255,0.6);
  margin-top: 4rpx;
  display: block;
}
.v0-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx 32rpx;
  border-radius: 12rpx;
  background: #C41E3A;
  color: #FFFFFF;
  font-size: 28rpx;
}
.v0-hr {
  height: 1px;
  background: #E8E0D5;
  margin: 24rpx 0;
}
</style>`;

  return vueCode;
}

// ─── 收集所有V0路由 ───
function collectAllRoutes() {
  const routes = [];
  function walk(dir, prefix) {
    const entries = fs.readdirSync(dir, {withFileTypes: true});
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const full = path.join(dir, e.name);
      const route = prefix ? prefix + "/" + e.name : e.name;
      if (fs.existsSync(path.join(full, "page.tsx"))) {
        routes.push(route);
      }
      walk(full, route);
    }
  }
  walk(V0_APP, "");
  return routes;
}

// ─── 注册路由到 pages.json ───
function updatePagesJson(newPages) {
  if (!fs.existsSync(PAGES_JSON)) return;
  let pj = JSON.parse(fs.readFileSync(PAGES_JSON, "utf-8"));
  const existing = new Set(pj.pages.map(p => p.path));
  let added = 0;

  for (const p of newPages) {
    if (!existing.has(p.path)) {
      pj.pages.push(p);
      existing.add(p.path);
      added++;
    }
  }

  fs.writeFileSync(PAGES_JSON, JSON.stringify(pj, null, 2), "utf-8");
  return added;
}

// ─── Main ───
console.log("=== V0 → UniApp Vue3 批量转换 v3 ===\n");

const allRoutes = collectAllRoutes();
console.log(`📋 V0 路由总数: ${allRoutes.length}\n`);

const newPages = [];
const BATCH = 50;

for (let i = 0; i < allRoutes.length; i++) {
  const v0Route = allRoutes[i];
  const vuePath = safePath(v0Route); // Windows-safe
  const title = getTitle(v0Route);
  const fullPath = "pages/" + vuePath + "/index";

  const v0File = path.join(V0_APP, ...v0Route.split("/"), "page.tsx");
  if (!fs.existsSync(v0File)) {
    stats.skip++;
    continue;
  }

  const sfc = buildVueSFC(v0Route, vuePath, title);
  if (!sfc) { stats.fail++; continue; }

  // 写入文件
  const outDir = path.join(VUE_PAGES, vuePath);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  try {
    fs.writeFileSync(path.join(outDir, "index.vue"), sfc, "utf-8");
    stats.ok++;

    newPages.push({
      path: fullPath,
      style: {
        navigationBarTitleText: title,
        navigationBarBackgroundColor: "#FAF8F5",
        navigationBarTextStyle: "black",
      },
    });

    const label = v0Route.length > 45 ? "..." + v0Route.slice(-42) : v0Route.padEnd(45);
    console.log(`  ✅ ${label} → ${vuePath}`);
  } catch (err) {
    stats.fail++;
    console.log(`  ❌ ${v0Route}: ${err.message}`);
  }

  if ((i + 1) % BATCH === 0) {
    console.log(`\n--- ${i + 1}/${allRoutes.length} ---\n`);
  }
}

console.log(`\n=== 转换完成 ===`);
console.log(`✅ 成功: ${stats.ok}  ⏭️ 跳过: ${stats.skip}  ❌ 失败: ${stats.fail}`);

// 更新路由
if (newPages.length > 0) {
  const added = updatePagesJson(newPages);
  console.log(`📄 pages.json: +${added || newPages.length} 条路由`);
}
