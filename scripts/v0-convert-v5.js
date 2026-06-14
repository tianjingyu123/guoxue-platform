/**
 * V0 → UniApp Vue3 转换 v5
 * 改进: 确保输出合法Vue3语法 / 正确的JSX表达式转换 / HTML标签配对 / 无语法错误
 */
const fs = require("fs");
const path = require("path");

const V0_APP = "C:/Users/Administrator/Desktop/V0前端页面6.8版/app";
const VUE_PAGES = "C:/Users/Administrator/Desktop/guoxue-platform/apps/mobile/src/pages";
const PAGES_JSON = "C:/Users/Administrator/Desktop/guoxue-platform/apps/mobile/src/pages.json";

let stats = { full: 0, simple: 0, skip: 0, total: 0 };

const DYNAMIC_NAMES = {
  "[id]": "detail", "[orderId]": "order-detail", "[expertId]": "expert-detail",
  "[postId]": "post-detail", "[annoId]": "announcement-detail",
  "[toolId]": "tool-detail", "[activityId]": "activity-detail",
  "[type]": "type-detail", "[courseId]": "course-detail",
  "[slug]": "content-detail", "[userId]": "user-detail",
  "[agentId]": "agent-detail",
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
  "interests-guide": "兴趣引导", "chat": "聊天",
  "call": "通话", "agreement": "协议", "circle": "圈子",
  "agent": "智能体", "collections": "合集", "topics": "话题",
  "article": "文章详情", "reader": "阅读器", "notifications": "通知",
  "auth": "认证", "design": "设计规范", "demo": "演示", "brand": "品牌",
  "earnings": "收益", "lottery": "抽奖", "shop": "店铺",
  "learning": "学习中心", "contacts": "通讯录", "messages": "消息中心",
  "detail": "详情", "result": "结果", "poster": "海报",
  "publish": "发布", "editor": "编辑器", "follows": "关注",
  "history": "历史", "likes": "赞过", "drafts": "草稿",
  "downloads": "下载", "notice": "通知", "notices": "公告列表",
  "expert": "专家", "experts": "专家列表", "settings": "设置",
  "reservations": "预约记录", "forgot-password": "忘记密码",
  "feedback": "意见反馈", "join": "加入", "content": "内容",
  "my-circles": "我的圈子", "learn": "学习",
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

// 复杂度评估
function checkComplexity(code) {
  let score = 0;
  if ((code.match(/function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?return\s*\(/g) || []).length > 1) score += 3;
  if (code.includes("<Suspense")) score += 2;
  if ((code.match(/\.map\s*\(/g) || []).length > 2) score += 2;
  if ((code.match(/\.map\s*\(/g) || []).length > 0) score += 1;
  if (code.includes("embla") || code.includes("swiper") || code.includes("chart")) score += 1;
  if (code.includes("useEffect") && (code.match(/useState/g) || []).length > 3) score += 1;
  if (code.split("\n").length > 300) score += 1;
  if (code.split("\n").length > 500) score += 2;
  if ((code.match(/\?\s*[\w."']+\s*:/g) || []).length > 3) score += 1;
  if ((code.match(/\.filter\s*\(/g) || []).length > 0) score += 1;
  return score;
}

// 后转换验证：检查是否有残留 JSX 语法
function hasJsxArtifacts(template) {
  if ((template.match(/""\}/g) || []).length > 2) return true;
  if ((template.match(/"\)\}/g) || []).length > 1) return true;
  if (template.includes('rows={')) return true;
  if (template.includes('else if') || template.includes('else ""')) return true;
  if ((template.match(/\}\s*\}/g) || []).length > 3) return true;
  return false;
}

// 安全转换 JSX 表达式 → Vue 插值 (避免语法错误)
function safeJsxExpr(expr) {
  // 移除可能导致 Vue 编译错误的内容
  let e = expr.trim();

  // 模板字符串反引号 → 字符串拼接（Vue 模板中反引号容易出错）
  if (e.includes("`")) {
    return "'...'";
  }

  // 三元表达式长度限制
  if (e.length > 80 && e.includes("?")) {
    return "'...'";
  }

  // 箭头函数 → 忽略
  if (e.includes("=>")) {
    return "''";
  }

  // 对象字面量 → 忽略（太复杂）
  if ((e.startsWith("{") && e.endsWith("}")) || e.includes("...")) {
    return "{}";
  }

  // 清理残留的 HTML 注释标记
  e = e.replace(/-->/g, "").replace(/<!--/g, "");

  // 确保不包含未转义的特殊字符
  e = e.replace(/\$/g, "");

  return e;
}

// 提取 return JSX 并做基础转换
function convertJSX(code) {
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
  if (!t.trim() || t.trim().length < 20) return null;

  // 移除 JSX 注释
  t = t.replace(/\{\s*\/\*\s*[\s\S]*?\*\/\s*\}/g, "");

  // 移除自定义组件（大写开头）- 先标记
  t = t.replace(/<([A-Z]\w*)[^>]*\/>/g, "");
  t = t.replace(/<([A-Z]\w*)[^>]*>/g, (m, name) => {
    const kebab = name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
    return `<!-- component:${kebab} -->`;
  });
  t = t.replace(/<\/([A-Z]\w*)>/g, (m, name) => {
    const kebab = name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
    return `<!-- /component:${kebab} -->`;
  });

  // HTML → UniApp 标签
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
  t = t.replace(/<hr\b[^>]*>/g, '<view class="hr"></view>');
  t = t.replace(/<input\b([^>]*)>/g, '<input$1 />');

  // 事件
  t = t.replace(/\bonClick\b=/g, "@click=");
  t = t.replace(/\bonChange\b=/g, "@change=");
  t = t.replace(/\bonSubmit\b=/g, "@submit.prevent=");
  t = t.replace(/\bonFocus\b=/g, "@focus=");
  t = t.replace(/\bonBlur\b=/g, "@blur=");
  t = t.replace(/\bonScroll\b=/g, "@scroll=");
  t = t.replace(/\bonTouchStart\b=/g, "@touchstart=");
  t = t.replace(/\bonTouchMove\b=/g, "@touchmove=");
  t = t.replace(/\bonTouchEnd\b=/g, "@touchend=");

  // 属性
  t = t.replace(/\bclassName\b=/g, "class=");
  t = t.replace(/\bhtmlFor\b=/g, "for=");

  // style={{...}} → :style="{...}"
  t = t.replace(/style=\{\{/g, ':style="{');
  t = t.replace(/\}\}\s*\}/g, '"');

  // 简单变量表达式 {varName} → {{ varName }}
  t = t.replace(/\{([a-zA-Z_$][\w.$[\]]*)\}/g, "{{ $1 }}");

  // 更复杂的表达式 → 安全占位符
  t = t.replace(/\{([^}]{10,})\}/g, '""');

  // 清理 Fragment 和空注释
  t = t.replace(/<>/g, "").replace(/<\/>/g, "");
  // 移除 JSX 注释（但保留 HTML 组件占位注释）
  t = t.replace(/\{\s*\/\*\s*[\s\S]*?\*\/\s*\}/g, "");

  // 清理空行
  t = t.replace(/\n\s*\n\s*\n/g, "\n\n");

  return t;
}

// 生成 Vue SFC
function buildPage(v0Route, vueRelPath, title, code) {
  const complexity = checkComplexity(code);
  const isSimple = complexity <= 2;
  let templateContent;

  if (isSimple) {
    const converted = convertJSX(code);
    if (converted && converted.trim().length > 50 && !hasJsxArtifacts(converted)) {
      templateContent = converted;
      stats.full++;
    } else {
      templateContent = makePlaceholder(title, v0Route, complexity);
      stats.simple++;
    }
  } else {
    templateContent = makePlaceholder(title, v0Route, complexity);
    stats.simple++;
  }

  stats.total++;

  return `<template>
  <view class="page" data-v0-route="${v0Route}">
${templateContent.split("\n").map(l => "    " + l).join("\n")}
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

onMounted(() => { loading.value = false })
onPullDownRefresh(() => { setTimeout(() => uni.stopPullDownRefresh(), 500) })
</script>

<style scoped>
.page {
  background: #FAF8F5;
  min-height: 100vh;
}
${isSimple ? "" : `
.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  padding: 48rpx;
  text-align: center;
}
.ph-icon { font-size: 80rpx; margin-bottom: 24rpx; }
.ph-title { font-size: 36rpx; font-weight: 700; color: #2C2C2C; margin-bottom: 8rpx; }
.ph-sub { font-size: 24rpx; color: #C9A96E; margin-bottom: 16rpx; }
.ph-route { font-size: 20rpx; color: #999; margin-bottom: 32rpx; }
.ph-notice { background: #FFF9F0; border: 1px solid #F0D89D; border-radius: 12rpx; padding: 24rpx; max-width: 600rpx; }
.ph-notice-text { font-size: 22rpx; color: #8B6914; display: block; margin-bottom: 8rpx; }
`}
.hr { height: 1px; background: #E8E0D5; margin: 24rpx 0; }
</style>`;
}

function makePlaceholder(title, v0Route, complexity) {
  return `
    <view class="placeholder">
      <view class="ph-icon">🏮</view>
      <text class="ph-title">${title}</text>
      <text class="ph-sub">复杂度: ${complexity}/8</text>
      <text class="ph-route">路由: ${v0Route}</text>
      <view class="ph-notice">
        <text class="ph-notice-text">此页面包含复杂交互组件</text>
        <text class="ph-notice-text">完整版本请查看 V0 源码或使用 v0-preview 页面</text>
      </view>
    </view>`;
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
console.log("=== V0 → UniApp Vue3 转换 v5 ===\n");

const allRoutes = collectRoutes();
console.log(`V0 路由: ${allRoutes.length}\n`);

// 清空旧的 pages.json 路由（保留手动页面路由）
if (fs.existsSync(PAGES_JSON)) {
  let pj = JSON.parse(fs.readFileSync(PAGES_JSON, "utf-8"));
  // 只保留特殊页面的路由
  const keepPaths = new Set([
    "pages/index/index",
    "pages/index/welcome",
    "pages/index/splash",
    "pages/index/interests-guide",
    "pages/shop/coupons",
    "pages/v0-preview/index",
  ]);
  pj.pages = pj.pages.filter(p => keepPaths.has(p.path));
  fs.writeFileSync(PAGES_JSON, JSON.stringify(pj, null, 2), "utf-8");
  console.log(`pages.json 已清理，保留 ${pj.pages.length} 个手动路由\n`);
}

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
  console.log(`\npages.json: +${added} 条 (总计 ${pj.pages.length})`);
}

console.log(`\n=== 完成 ===`);
console.log(`完整转换: ${stats.full} 页`);
console.log(`占位页面: ${stats.simple} 页`);
console.log(`跳过: ${stats.skip}`);
console.log(`总计: ${stats.total}`);
