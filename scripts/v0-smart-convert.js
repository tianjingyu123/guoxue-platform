/**
 * V0 → UniApp Vue3 智能转换 v4
 * 策略: 简单页面完整转换 / 复杂页面生成占位符 / 确保编译通过
 */
const fs = require("fs");
const path = require("path");

const V0_APP = "C:/Users/Administrator/Desktop/V0前端完整版6.6日/app";
const VUE_PAGES = "C:/Users/Administrator/Desktop/guoxue-platform/apps/mobile/src/pages";
const PAGES_JSON = "C:/Users/Administrator/Desktop/guoxue-platform/apps/mobile/src/pages.json";

let stats = { full: 0, simple: 0, skip: 0 };

const DYNAMIC_NAMES = {
  "[id]": "detail", "[orderId]": "order-detail", "[expertId]": "expert-detail",
  "[postId]": "post-detail", "[annoId]": "announcement-detail",
  "[toolId]": "tool-detail", "[activityId]": "activity-detail",
};

function safePath(v0Route) {
  return v0Route.replace(/\[(\w+)\]/g, (m, name) => DYNAMIC_NAMES[name] || name + "-detail");
}

const TITLE_MAP = {
  "about": "关于我们", "mall": "商城", "cart": "购物车", "checkout": "结算",
  "profile": "个人中心", "search": "搜索", "courses": "课程", "live": "直播",
  "circles": "圈子", "mine": "我的", "wallet": "钱包", "vip": "会员",
  "orders": "订单", "classics": "古籍", "bots": "AI助手", "discover": "发现",
  "articles": "文章", "qa": "问答", "bounty": "悬赏", "im": "消息",
  "same-city": "同城", "offline": "线下", "institute": "研究院", "activity": "活动",
  "address": "地址", "coupons": "优惠券", "aftersale": "售后",
  "seckill": "秒杀", "group-buy": "拼团", "payment": "支付", "login": "登录",
  "bazi": "八字排盘", "paipan": "排盘工具", "merchant": "商家",
  "agents": "AI智能体", "ai": "AI工具", "tools": "工具",
  "favorites": "收藏", "fortune": "运势", "ebook": "电子书", "poetry": "诗词",
  "station": "分站", "creator": "创作者", "competition": "比赛",
  "teacher": "讲师", "videos": "视频", "points": "积分",
  "invite": "邀请", "withdraw": "提现", "tasks": "任务",
  "report": "报告", "share": "分享", "help": "帮助",
  "legal": "法律", "error": "错误", "splash": "启动页",
  "welcome": "欢迎页", "manage": "管理", "announcements": "公告",
  "appointment": "预约", "booking": "预约", "appeal": "申诉",
  "become-partner": "成为合作伙伴", "authors": "作者",
  "check-in": "签到", "customer-service": "客服",
  "interests-guide": "兴趣引导", "chat": "聊天",
  "call": "通话", "agreement": "协议", "circle": "圈子",
  "agent": "智能体", "collections": "合集", "topics": "话题",
  "article": "文章", "notifications": "通知", "reader": "阅读器",
  "auth": "认证", "design": "设计", "demo": "演示", "brand": "品牌",
  "earnings": "收益", "lottery": "抽奖",
};

function getTitle(v0Route) {
  const parts = v0Route.split("/");
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    if (p.startsWith("[")) continue;
    if (TITLE_MAP[p]) return TITLE_MAP[p];
  }
  const last = parts.filter(p => !p.startsWith("[")).pop() || "页面";
  return TITLE_MAP[last] || last;
}

// 检查 V0 页面复杂度
function checkComplexity(code) {
  let score = 0;
  // 有自定义子组件 (function XXX() { return ... })
  if ((code.match(/function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?return\s*\(/g) || []).length > 1) score += 3;
  // 有 Suspense
  if (code.includes("<Suspense")) score += 2;
  // 有复杂map嵌套
  if ((code.match(/\.map\s*\(/g) || []).length > 2) score += 1;
  // 有第三方组件库引用
  if (code.includes("embla") || code.includes("swiper") || code.includes("chart")) score += 1;
  // 文件很大 (>500行)
  if (code.split("\n").length > 500) score += 1;

  return score;
}

// 提取并转换简单模板
function convertSimpleTemplate(code) {
  // 找到 return 语句
  const lines = code.split("\n");
  let jsxLines = [];
  let inReturn = false;
  let depth = 0;

  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!inReturn) {
      if (t.match(/^return\s*\(/)) {
        inReturn = true;
        depth = 1;
        const after = t.substring(t.indexOf("(") + 1).trim();
        if (after && after !== ")" && after !== ");") jsxLines.push(after);
        continue;
      }
      if (t.match(/^return\s+</)) {
        inReturn = true;
        jsxLines.push(t.replace(/^return\s+/, ""));
        continue;
      }
      continue;
    }
    for (const ch of t) {
      if (ch === "(" || ch === "{" || ch === "[") depth++;
      if (ch === ")" || ch === "}" || ch === "]") depth--;
    }
    if (depth <= 0 && (t === "}" || t === ");" || t.match(/^\s*\)\s*;?\s*$/))) break;
    jsxLines.push(lines[i]);
  }

  let t = jsxLines.join("\n");
  if (!t.trim()) return null;

  // 移除JSX注释
  t = t.replace(/\{\s*\/\*\s*[\s\S]*?\*\/\s*\}/g, "");

  // HTML标签转换
  const toView = "div|section|header|footer|nav|aside|main|article|figure|ul|ol|li|button|form|table|tbody|thead|tr|td|th|select|option|textarea|dialog|details|summary|fieldset|legend|blockquote|pre|code|dl|dt|dd|address|time|mark|meter|progress|output|canvas|iframe|embed|object|param|video|audio|source|track|map|area".split("|");
  const toText = "span|p|h1|h2|h3|h4|h5|h6|a|label|strong|em|small|figcaption|caption|b|i|u|s|sub|sup|abbr|cite|dfn|kbd|q|samp|var|wbr".split("|");

  for (const tag of toView) {
    t = t.replace(new RegExp(`<${tag}\\b`, "g"), "<view");
    t = t.replace(new RegExp(`</${tag}>`, "g"), "</view>");
  }
  for (const tag of toText) {
    t = t.replace(new RegExp(`<${tag}\\b`, "g"), "<text");
    t = t.replace(new RegExp(`</${tag}>`, "g"), "</text>");
  }

  t = t.replace(/<img\b/g, "<image");
  t = t.replace(/<br\s*\/?>/g, "");
  t = t.replace(/<hr\b[^>]*>/g, '<view class="v0-hr"></view>');

  // 事件
  t = t.replace(/onClick=/g, "@click=");
  t = t.replace(/onChange=/g, "@change=");
  t = t.replace(/onSubmit=/g, "@submit.prevent=");
  t = t.replace(/onFocus=/g, "@focus=");
  t = t.replace(/onBlur=/g, "@blur=");

  // 属性
  t = t.replace(/className=/g, "class=");
  t = t.replace(/htmlFor=/g, "for=");
  t = t.replace(/\bchecked=\{/g, ":checked={");
  t = t.replace(/\bdisabled=\{/g, ":disabled={");

  // style={{} → :style=""
  t = t.replace(/style=\{\{/g, ':style="{');
  t = t.replace(/\}\}\s*\}/g, '"');

  // 简单JSX表达式 {x} → {{ x }}
  // 只处理明显是变量的情况
  t = t.replace(/\{(\w+(?:\.\w+)*)\}/g, "{{ $1 }}");

  // 移除 <> </> Fragment
  t = t.replace(/<>/g, "").replace(/<\/>/g, "");

  // 移除自定义组件(大写开头)
  t = t.replace(/<([A-Z]\w*)[^>]*\/>/g, "");
  t = t.replace(/<([A-Z]\w*)[^>]*>/g, "");
  t = t.replace(/<\/([A-Z]\w*)>/g, "");

  // 清理空行
  t = t.replace(/\n\s*\n\s*\n/g, "\n\n");

  return t;
}

// 生成 Vue SFC
function buildPage(v0Route, vueRelPath, title, code) {
  const complexity = checkComplexity(code);
  let isSimple = complexity <= 2;

  let templateContent;
  if (isSimple) {
    const converted = convertSimpleTemplate(code);
    if (converted && converted.trim().length > 50) {
      templateContent = converted;
      stats.full++;
    } else {
      isSimple = false;
    }
  }

  if (!isSimple) {
    templateContent = `
    <view class="v0-placeholder">
      <view class="v0-ph-icon">🏮</view>
      <text class="v0-ph-title">${title}</text>
      <text class="v0-ph-sub">V0 页面 · 复杂度: ${complexity}/8</text>
      <text class="v0-ph-route">路由: ${v0Route}</text>
      <view class="v0-ph-notice">
        <text class="v0-ph-notice-text">此页面包含复杂交互组件，完整版本请查看 V0 源码</text>
        <text class="v0-ph-notice-link">C:/Users/Administrator/Desktop/V0前端完整版6.6日/app/${v0Route}/page.tsx</text>
      </view>
    </view>`;
    stats.simple++;
  }

  // 提取mock数据
  const mockData = [];
  const lines = code.split("\n");
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith("const ") && !t.includes("=>") && !t.includes("function")) {
      if (t.includes("= [") || t.includes("= {") || t.includes('= "') || t.includes("= '")) {
        mockData.push(line);
      }
    }
  }

  return `<template>
  <view class="page">${templateContent}
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)

// V0 原始数据常量
${mockData.slice(0, 8).join("\n")}

onMounted(() => { loading.value = false })
onPullDownRefresh(() => { setTimeout(() => uni.stopPullDownRefresh(), 500) })
</script>

<style scoped>
.page {
  background: #FAF8F5;
  min-height: 100vh;
}
.v0-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  padding: 48rpx;
  text-align: center;
}
.v0-ph-icon { font-size: 80rpx; margin-bottom: 24rpx; }
.v0-ph-title { font-size: 36rpx; font-weight: 700; color: #2C2C2C; margin-bottom: 8rpx; }
.v0-ph-sub { font-size: 24rpx; color: #C9A96E; margin-bottom: 16rpx; }
.v0-ph-route { font-size: 20rpx; color: #999; margin-bottom: 32rpx; }
.v0-ph-notice { background: #FFF9F0; border: 1px solid #F0D89D; border-radius: 12rpx; padding: 24rpx; max-width: 600rpx; }
.v0-ph-notice-text { font-size: 22rpx; color: #8B6914; display: block; margin-bottom: 8rpx; }
.v0-ph-notice-link { font-size: 18rpx; color: #C9A96E; display: block; word-break: break-all; }
.v0-hr { height: 1px; background: #E8E0D5; margin: 24rpx 0; }
</style>`;
}

// ─── 收集路由 ───
function collectRoutes() {
  const routes = [];
  function walk(dir, prefix) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const full = path.join(dir, e.name);
      const route = prefix ? prefix + "/" + e.name : e.name;
      if (fs.existsSync(path.join(full, "page.tsx"))) routes.push(route);
      walk(full, route);
    }
  }
  walk(V0_APP, "");
  return routes;
}

// ─── Main ───
console.log("=== V0 → UniApp Vue3 智能转换 v4 ===\n");

const allRoutes = collectRoutes();
console.log(`📋 V0 路由: ${allRoutes.length}\n`);

const newPages = [];

for (let i = 0; i < allRoutes.length; i++) {
  const v0Route = allRoutes[i];
  const vuePath = safePath(v0Route);
  const title = getTitle(v0Route);

  const v0File = path.join(V0_APP, ...v0Route.split("/"), "page.tsx");
  if (!fs.existsSync(v0File)) { stats.skip++; continue; }

  const code = fs.readFileSync(v0File, "utf-8");
  const vueCode = buildPage(v0Route, vuePath, title, code);

  const outDir = path.join(VUE_PAGES, vuePath);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(path.join(outDir, "index.vue"), vueCode, "utf-8");

  newPages.push({
    path: "pages/" + vuePath + "/index",
    style: {
      navigationBarTitleText: title,
      navigationBarBackgroundColor: "#FAF8F5",
      navigationBarTextStyle: "black",
    },
  });

  // 简洁输出
  const icon = stats.full > (i > 0 ? stats.full : 0) ? "✅" : "📄";
  // (简单统计用，逻辑不精确，仅展示)

  if ((i + 1) % 100 === 0) console.log(`  进度: ${i + 1}/${allRoutes.length}`);
}

// 更新 pages.json
if (fs.existsSync(PAGES_JSON)) {
  let pj = JSON.parse(fs.readFileSync(PAGES_JSON, "utf-8"));
  const existing = new Set(pj.pages.map(p => p.path));
  let added = 0;
  for (const p of newPages) {
    if (!existing.has(p.path)) { pj.pages.push(p); existing.add(p.path); added++; }
  }
  fs.writeFileSync(PAGES_JSON, JSON.stringify(pj, null, 2), "utf-8");
  console.log(`📄 pages.json: +${added} 条 (总计 ${pj.pages.length})`);
}

console.log(`\n=== 完成 ===`);
console.log(`✅ 完整转换: ${stats.full} 页`);
console.log(`📄 占位页面: ${stats.simple} 页`);
console.log(`⏭️ 跳过: ${stats.skip}`);
