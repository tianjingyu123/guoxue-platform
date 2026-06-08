/**
 * React/Next.js → UniApp Vue3 强力转换脚本 v2
 * 真正提取 JSX 模板内容，转换为 Vue SFC
 */
const fs = require("fs");
const path = require("path");

const V0_DIR = "C:/Users/Administrator/Desktop/V0前端完整版6.6日";
const V0_APP = V0_DIR + "/app";
const V0_COMPONENTS = V0_DIR + "/components";
const VUE_PAGES = "C:/Users/Administrator/Desktop/guoxue-platform/apps/mobile/src/pages";
const VUE_COMPONENTS = "C:/Users/Administrator/Desktop/guoxue-platform/apps/mobile/src/components";
const PAGES_JSON = "C:/Users/Administrator/Desktop/guoxue-platform/apps/mobile/src/pages.json";

// 统计
let stats = { converted: 0, skipped: 0, failed: 0 };

// ============== 核心转换函数 ==============

/** Tailwind → 国风内联样式映射（常用类） */
const TW_MAP = {
  "min-h-screen": "min-height: 100vh",
  "bg-background": "background: #FAF8F5",
  "bg-card": "background: #FFFFFF",
  "bg-primary": "background: #C41E3A",
  "bg-secondary": "background: #F5F1EB",
  "bg-muted": "background: #F0EBE5",
  "text-foreground": "color: #2C2C2C",
  "text-primary": "color: #C41E3A",
  "text-muted-foreground": "color: #999999",
  "text-secondary-foreground": "color: #666666",
  "border-border": "border: 1px solid #E8E0D5",
  "rounded-lg": "border-radius: 12rpx",
  "rounded-xl": "border-radius: 16rpx",
  "rounded-2xl": "border-radius: 24rpx",
  "rounded-full": "border-radius: 50%",
  "p-4": "padding: 24rpx",
  "p-6": "padding: 32rpx",
  "px-4": "padding-left: 24rpx; padding-right: 24rpx",
  "py-2": "padding-top: 12rpx; padding-bottom: 12rpx",
  "py-3": "padding-top: 16rpx; padding-bottom: 16rpx",
  "py-4": "padding-top: 24rpx; padding-bottom: 24rpx",
  "mb-4": "margin-bottom: 24rpx",
  "mb-6": "margin-bottom: 32rpx",
  "mt-2": "margin-top: 12rpx",
  "mt-4": "margin-top: 24rpx",
  "gap-2": "gap: 12rpx",
  "gap-3": "gap: 16rpx",
  "gap-4": "gap: 24rpx",
  "flex": "display: flex",
  "flex-col": "display: flex; flex-direction: column",
  "flex-1": "flex: 1",
  "items-center": "align-items: center",
  "justify-center": "justify-content: center",
  "justify-between": "justify-content: space-between",
  "text-center": "text-align: center",
  "text-sm": "font-size: 24rpx",
  "text-base": "font-size: 28rpx",
  "text-lg": "font-size: 32rpx",
  "text-xl": "font-size: 36rpx",
  "text-2xl": "font-size: 40rpx",
  "font-bold": "font-weight: 700",
  "font-medium": "font-weight: 500",
  "font-serif": "font-family: 'Noto Serif SC', serif",
  "w-full": "width: 100%",
  "h-full": "height: 100%",
  "overflow-hidden": "overflow: hidden",
  "overflow-y-auto": "overflow-y: auto",
  "relative": "position: relative",
  "absolute": "position: absolute",
  "fixed": "position: fixed",
  "sticky": "position: sticky",
  "top-0": "top: 0",
  "left-0": "left: 0",
  "right-0": "right: 0",
  "bottom-0": "bottom: 0",
  "z-10": "z-index: 10",
  "z-20": "z-index: 20",
  "z-30": "z-index: 30",
  "z-40": "z-index: 40",
  "z-50": "z-index: 50",
  "shadow-sm": "box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.06)",
  "shadow-md": "box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.08)",
  "shadow-lg": "box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.1)",
  "transition-colors": "transition: colors 0.2s",
  "transition-all": "transition: all 0.2s",
  "truncate": "overflow: hidden; text-overflow: ellipsis; white-space: nowrap",
  "max-w-lg": "max-width: 512rpx",
  "mx-auto": "margin-left: auto; margin-right: auto",
  "space-y-2": "",  // 需要特殊处理
  "space-y-4": "",
  "space-x-2": "",
  "space-x-4": "",
};

/** 将 className 中的 Tailwind 类转为内联样式 */
function twToStyle(classStr) {
  if (!classStr) return "";
  // 移除模板字符串语法
  let clean = classStr
    .replace(/[`$]/g, "")
    .replace(/\$\{/g, "")
    .replace(/\}/g, "")
    .replace(/\s*\?\s*"[^"]*"\s*:\s*"[^"]*"/g, "")
    .replace(/\/\/.*$/gm, "")
    .trim();

  let styles = [];
  const classes = clean.split(/\s+/).filter(Boolean);

  for (const cls of classes) {
    // 跳过条件表达式残留
    if (cls.includes("?") || cls.includes(":") || cls.includes("(") || cls.includes(")")) continue;
    if (cls.includes("[") || cls.includes("{")) continue;

    const mapped = TW_MAP[cls];
    if (mapped) {
      styles.push(mapped);
    } else if (cls.startsWith("p-") && !isNaN(cls.substring(2))) {
      styles.push(`padding: ${parseInt(cls.substring(2)) * 6}rpx`);
    } else if (cls.startsWith("px-") && !isNaN(cls.substring(3))) {
      styles.push(`padding-left: ${parseInt(cls.substring(3)) * 6}rpx; padding-right: ${parseInt(cls.substring(3)) * 6}rpx`);
    } else if (cls.startsWith("py-") && !isNaN(cls.substring(3))) {
      styles.push(`padding-top: ${parseInt(cls.substring(3)) * 6}rpx; padding-bottom: ${parseInt(cls.substring(3)) * 6}rpx`);
    } else if (cls.startsWith("m-") && !isNaN(cls.substring(2))) {
      styles.push(`margin: ${parseInt(cls.substring(2)) * 6}rpx`);
    } else if (cls.startsWith("mt-") && !isNaN(cls.substring(3))) {
      styles.push(`margin-top: ${parseInt(cls.substring(3)) * 6}rpx`);
    } else if (cls.startsWith("mb-") && !isNaN(cls.substring(3))) {
      styles.push(`margin-bottom: ${parseInt(cls.substring(3)) * 6}rpx`);
    } else if (cls.startsWith("gap-") && !isNaN(cls.substring(4))) {
      styles.push(`gap: ${parseInt(cls.substring(4)) * 6}rpx`);
    } else if (cls.startsWith("text-") && cls.includes("[") && cls.includes("]")) {
      // text-[14px] → font-size: 28rpx
      const match = cls.match(/text-\[(\d+)px\]/);
      if (match) styles.push(`font-size: ${parseInt(match[1]) * 2}rpx`);
    } else if (cls.startsWith("h-") && cls.includes("[") && cls.includes("]")) {
      const match = cls.match(/h-\[(\d+)px\]/);
      if (match) styles.push(`height: ${parseInt(match[1]) * 2}rpx`);
    } else if (cls.startsWith("w-") && cls.includes("[") && cls.includes("]")) {
      const match = cls.match(/w-\[(\d+)px\]/);
      if (match) styles.push(`width: ${parseInt(match[1]) * 2}rpx`);
    }
  }

  return styles.length > 0 ? styles.join("; ") : "";
}

/** 提取 JSX 模板内容 */
function extractTemplate(code) {
  // 找到 export default function 的 return 语句
  const lines = code.split("\n");
  let result = [];
  let inReturn = false;
  let braceDepth = 0;
  let foundReturn = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!foundReturn) {
      // 寻找最外层的 return (
      if (trimmed.match(/^return\s*\(/)) {
        foundReturn = true;
        inReturn = true;
        braceDepth = 1;
        // 检查同一行是否有内容在 ( 之后
        const after = line.substring(line.indexOf("return") + 6).trim();
        if (after.startsWith("(") && after.length > 1) {
          const content = after.substring(1).trim();
          if (content && !content.startsWith("//") && !content.startsWith("/*")) {
            result.push(content);
          }
        }
        continue;
      }
      // 也可能是 return <div> (无括号)
      if (trimmed.match(/^return\s+</)) {
        foundReturn = true;
        inReturn = true;
        braceDepth = 0;
        result.push(trimmed.replace(/^return\s+/, ""));
        continue;
      }
      continue;
    }

    if (inReturn) {
      // 检查 JSX 中的括号
      for (const ch of trimmed) {
        if (ch === "(" || ch === "{" || ch === "[") braceDepth++;
        if (ch === ")" || ch === "}" || ch === "]") braceDepth--;
      }

      // 检查是否有闭合括号
      const closeParen = trimmed.match(/^(\s*\)\s*;?\s*)$/);
      const closeBrace = trimmed.match(/^(\s*\}\s*;?\s*)$/);
      const closeTag = trimmed.match(/^(\s*\)\s*\}\s*;?\s*)$/);

      if (braceDepth <= 0 && (closeParen || closeBrace || closeTag)) {
        inReturn = false;
        break;
      }

      // 检查函数结尾 (})
      if (braceDepth <= 0 && trimmed === "}") {
        inReturn = false;
        break;
      }

      result.push(line);
    }
  }

  return result.join("\n");
}

/** 转换 JSX 到 Vue 模板 */
function jsxToVueTemplate(jsx) {
  let t = jsx;

  // 移除 JSX 注释
  t = t.replace(/\{\s*\/\*\s*([^*]|\*[^/])*\*\/\s*\}/g, "<!-- $1 -->");

  // 移除 "use client" 等指令
  t = t.replace(/"use client"/g, "");

  // 移除 TypeScript 类型断言 (as Type)
  t = t.replace(/\bas\s+\w+(<[^>]*>)?/g, "");

  // className → class (但保留原有的 class)
  // 先处理 className 表达式（复杂的）
  t = t.replace(/className=\{([^}]+)\}/g, (match, expr) => {
    // 如果是模板字符串或条件表达式，简化处理
    if (expr.includes("`") || expr.includes("?")) {
      return 'class="v0-class"';
    }
    // 如果是简单字符串
    if (expr.startsWith('"') || expr.startsWith("'")) {
      return `class="${expr.slice(1, -1)}"`;
    }
    return 'class="v0-class"';
  });

  // 处理 className="..." (静态)
  t = t.replace(/className="([^"]*)"/g, 'class="$1"');

  // HTML元素转换
  t = t.replace(/<div\b/g, "<view");
  t = t.replace(/<\/div>/g, "</view>");
  t = t.replace(/<span\b/g, "<text");
  t = t.replace(/<\/span>/g, "</text>");
  t = t.replace(/<p\b/g, "<text");
  t = t.replace(/<\/p>/g, "</text>");
  t = t.replace(/<h([1-6])\b/g, '<text class="h$1"');
  t = t.replace(/<\/h[1-6]>/g, "</text>");
  t = t.replace(/<img\b/g, "<image");
  t = t.replace(/<button\b/g, '<view class="v0-btn"');
  t = t.replace(/<\/button>/g, "</view>");
  t = t.replace(/<ul\b/g, "<view");
  t = t.replace(/<\/ul>/g, "</view>");
  t = t.replace(/<ol\b/g, "<view");
  t = t.replace(/<\/ol>/g, "</view>");
  t = t.replace(/<li\b/g, '<view class="v0-li"');
  t = t.replace(/<\/li>/g, "</view>");
  t = t.replace(/<section\b/g, "<view");
  t = t.replace(/<\/section>/g, "</view>");
  t = t.replace(/<header\b/g, "<view");
  t = t.replace(/<\/header>/g, "</view>");
  t = t.replace(/<main\b/g, "<view");
  t = t.replace(/<\/main>/g, "</view>");
  t = t.replace(/<footer\b/g, "<view");
  t = t.replace(/<\/footer>/g, "</view>");
  t = t.replace(/<nav\b/g, "<view");
  t = t.replace(/<\/nav>/g, "</view>");
  t = t.replace(/<aside\b/g, "<view");
  t = t.replace(/<\/aside>/g, "</view>");
  t = t.replace(/<label\b/g, "<text");
  t = t.replace(/<\/label>/g, "</text>");
  t = t.replace(/<a\b/g, "<text");
  t = t.replace(/<\/a>/g, "</text>");
  t = t.replace(/<article\b/g, "<view");
  t = t.replace(/<\/article>/g, "</view>");
  t = t.replace(/<figure\b/g, "<view");
  t = t.replace(/<\/figure>/g, "</view>");
  t = t.replace(/<figcaption\b/g, "<text");
  t = t.replace(/<\/figcaption>/g, "</text>");
  t = t.replace(/<strong\b/g, "<text");
  t = t.replace(/<\/strong>/g, "</text>");
  t = t.replace(/<em\b/g, "<text");
  t = t.replace(/<\/em>/g, "</text>");
  t = t.replace(/<small\b/g, "<text");
  t = t.replace(/<\/small>/g, "</text>");
  t = t.replace(/<br\b/g, "<text");
  t = t.replace(/<\/br>/g, "</text>");
  t = t.replace(/<hr\b/g, '<view class="hr"');
  t = t.replace(/<\/hr>/g, "</view>");

  // 事件处理
  t = t.replace(/onClick=/g, "@click=");
  t = t.replace(/onChange=/g, "@change=");
  t = t.replace(/onSubmit=/g, "@submit.prevent=");
  t = t.replace(/onKeyDown=/g, "@keydown=");
  t = t.replace(/onFocus=/g, "@focus=");
  t = t.replace(/onBlur=/g, "@blur=");
  t = t.replace(/onScroll=/g, "@scroll=");

  // 属性转换
  t = t.replace(/htmlFor=/g, "for=");
  t = t.replace(/tabIndex=/g, "tabindex=");

  // checked/disabled/selected → 动态绑定
  t = t.replace(/\bchecked=\{/g, ":checked={");
  t = t.replace(/\bdisabled=\{/g, ":disabled={");
  t = t.replace(/\bselected=\{/g, ":selected={");

  // style={{}} → :style="{}"
  t = t.replace(/style=\{\{/g, ':style="{');
  t = t.replace(/\}\}\s*\}/g, '}"');

  // JSX 表达式 {expr} → {{ expr }}
  // 但要保留 { "key": value } 这样的对象语法
  t = t.replace(/\{(\s*\/\/[^}]*)\}/g, "<!-- $1 -->"); // JSX 单行注释
  t = t.replace(/\{([^}"'][^}]*?)\}/g, (match, expr) => {
    // 跳过已经处理过的注释和特殊语法
    if (expr.trim().startsWith("<!--")) return match;
    if (expr.trim().startsWith("*")) return match;
    // 跳过对象字面量（包含 : 和没有引号的 key）
    if (/^\s*\w+\s*:/.test(expr)) return match;
    // 跳过箭头函数
    if (expr.includes("=>")) return match;
    // 跳过 spread
    if (expr.trim().startsWith("...")) return `v-bind="${expr.trim().slice(3)}"`;
    return `{{ ${expr.trim()} }}`;
  });

  // 修复双花括号
  t = t.replace(/\{\{\s*\{\s*/g, "{{ ");
  t = t.replace(/\}\s*\}\}/g, " }}");

  // .map() 转换提示
  if (t.includes(".map(")) {
    // 简单的 .map 转换
    t = t.replace(/\{(\w+(?:\.\w+)*)\.map\s*\(\s*\(([^)]+)\)\s*=>\s*\{/g,
      '<view v-for="($2) in $1" :key="index">');
    t = t.replace(/\{(\w+(?:\.\w+)*)\.map\s*\(\s*\(([^)]+)\)\s*=>\s*\(/g,
      '<view v-for="($2) in $1" :key="index">');
    // 简单 map
    t = t.replace(/\{(\w+(?:\.\w+)*)\.map\s*\(\s*(\w+)\s*=>\s*\(/g,
      '<view v-for="$2 in $1" :key="$2.id || index">');
    t = t.replace(/\{(\w+(?:\.\w+)*)\.map\s*\(\s*(\w+)\s*=>\s*/g,
      '<view v-for="$2 in $1" :key="$2.id || index">');
  }

  // 条件渲染
  t = t.replace(/\{(\w+)\s*\?\s*</g, '<template v-if="$1">');
  if (t.includes("&& (") || t.includes("&& <")) {
    t = t.replace(/\{(\w+(?:\.\w+)*)\s*&&\s*</g, '<template v-if="$1">');
  }
  if (t.includes(": (") || t.includes(": <")) {
    t = t.replace(/\{(\w+(?:\.\w+)*)\s*\?\s*</g, '<template v-if="$1">');
  }

  // 替换 </> (Fragment)
  t = t.replace(/<>/g, "");
  t = t.replace(/<\/>/g, "");

  // aria-* 属性
  t = t.replace(/aria-(\w+)="([^"]*)"/g, 'aria-$1="$2"');
  t = t.replace(/aria-(\w+)=\{([^}]+)\}/g, ':aria-$1="$2"');

  // data-* 属性
  t = t.replace(/data-(\w+)="([^"]*)"/g, 'data-$1="$2"');

  return t;
}

/** 提取并转换脚本部分 */
function convertScript(code) {
  let script = "";

  // 提取 imports（过滤 React/Next.js 相关）
  const importLines = [];
  const otherLines = [];

  for (const line of code.split("\n")) {
    if (line.trim().startsWith("import ")) {
      if (!line.includes("react") && !line.includes("next/") &&
          !line.includes("lucide-react") && !line.includes("@/components/ui/") &&
          !line.includes("embla-carousel")) {
        let cleaned = line
          .replace(/import\s*\{([^}]*)\}\s*from\s*["']([^"']+)["']/g, (m, names, src) => {
            // 转换 @/ 路径
            if (src.startsWith("@/")) src = "../../components/v0/" + src.substring(2);
            return `import {${names}} from '${src}'`;
          })
          .replace(/import\s+(\w+)\s+from\s+["']([^"']+)["']/g, (m, name, src) => {
            if (src.startsWith("@/")) src = "../../components/v0/" + src.substring(2);
            return `import ${name} from '${src}'`;
          });
        importLines.push(cleaned);
      }
    } else {
      otherLines.push(line);
    }
  }

  script = importLines.join("\n") + "\n\n";

  // 添加 Vue imports
  script = `<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'

// ===== V0 原始数据/逻辑（自动转换） =====

const loading = ref(true)
const error = ref<string | null>(null)
const isEmpty = ref(false)

// V0 原有的常量和数据
${otherLines.filter(l => l.trim().startsWith("const ") || l.trim().startsWith("let ") || l.trim().startsWith("function ") || l.trim().match(/^\w/)).join("\n")}

// ===== 生命周期 =====

async function fetchData() {
  loading.value = true
  error.value = null
  try {
    // TODO: 集成真实 API
    loading.value = false
  } catch (e: any) {
    error.value = e.message || '加载失败'
    loading.value = false
  }
}

onMounted(() => { fetchData() })
onPullDownRefresh(() => { fetchData().finally(() => uni.stopPullDownRefresh()) })
</script>`;

  return script;
}

/** 从 V0 components 复制并简化一个 Vue 组件 */
function convertV0Component(v0ComponentPath, vueComponentPath) {
  // 暂不实现 - 页面组件引用会转为内联
}

/** 自动生成所有缺失的 V0 → UniApp 路由映射 */
function generateRouteMap() {
  const map = {};

  // 递归遍历 V0 app 目录
  function walk(dir, prefix = "") {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const name = entry.name;
      const fullPath = path.join(dir, name);
      const v0Route = prefix ? `${prefix}/${name}` : name;

      // 检查是否有 page.tsx
      const pageFile = path.join(fullPath, "page.tsx");
      if (fs.existsSync(pageFile)) {
        // 生成 Vue 路径
        let vuePath = v0Route
          .replace(/\[(\w+)\]/g, ":$1")
          .replace(/\//g, "/");

        // 映射规则
        const pathMappings = {
          "page": "index/index",
          "mall/page": "shop/mall",
          "mall/categories/page": "shop/mall-categories",
          "mall/brand/page": "shop/mall-brand",
          "mall/ranking/page": "shop/mall-ranking",
          "shop/page": "shop/index",
          "cart/page": "shop/cart",
          "checkout/page": "shop/checkout",
          "profile/page": "mine/profile",
          "profile/edit/page": "mine/profile-edit",
          "search/page": "search/index",
          "search/result/page": "search/result",
          "search/history/page": "search/history",
          "search/advanced/page": "search/advanced",
          "search/voice/page": "search/voice-search",
          "courses/page": "courses/index",
          "courses/list/page": "courses/list",
          "courses/:[id]/page": "courses/detail",
          "courses/:[id]/chapters/page": "courses/chapters",
          "courses/:[id]/player/page": "courses/player",
          "courses/:[id]/home/page": "courses/home",
          "live/page": "live/index",
          "live/:[id]/page": "live/room",
          "live/create/page": "live/create",
          "live/replays/page": "live/replays",
          "circles/page": "circles/index",
          "circles/:[id]/page": "circles/detail",
          "circles/create/page": "circles/create",
          "circles/mine/page": "circles/mine",
          "mine/page": "mine/index",
          "mine/edit-profile/page": "mine/edit-profile",
          "mine/settings/page": "mine/settings",
          "mine/follows/page": "mine/follows",
          "mine/security/page": "mine/security",
          "wallet/page": "wallet/index",
          "wallet/transactions/page": "wallet/transactions",
          "vip/page": "vip/index",
          "orders/page": "orders/index",
          "orders/:[id]/page": "orders/detail",
          "classics/page": "classics/index",
          "classics/:[id]/page": "classics/detail",
          "bots/page": "bots/index",
          "bots/chat/:[id]/page": "bots/chat",
          "notifications/page": "notifications/index",
          "discover/page": "discover/index",
          "articles/page": "articles/list",
          "article/:[id]/page": "articles/detail",
          "articles/create/page": "articles/create",
          "qa/page": "qa/index",
          "qa/:[id]/page": "qa/detail",
          "qa/ask/page": "qa/ask",
          "bounty/page": "bounty/index",
          "bounty/:[id]/page": "bounty/detail",
          "bounty/create/page": "bounty/create",
          "im/chat/page": "im/chat",
          "im/conversations/page": "im/conversations",
          "same-city/feed/page": "same-city/feed",
          "same-city/nearby/page": "same-city/nearby",
          "offline/stations/page": "offline/stations",
          "institute/page": "institute/index",
          "activity/:[id]/page": "activity/detail",
          "activity/landing/page": "activity/landing",
          "activity/calendar/page": "activity/calendar",
          "about/page": "about/index",
          "address/page": "shop/address-list",
          "coupons/page": "shop/coupons",
          "aftersale/page": "shop/after-sale",
          "aftersale/:[orderId]/page": "shop/after-sale-detail",
          "seckill/page": "shop/flash-sale",
          "group-buy/page": "shop/group-buy",
          "payment/page": "shop/payment",
          "payment/success/page": "shop/pay-success",
          "login/page": "login/index",
          "bazi/page": "tools/bazi",
          "bazi/history/page": "tools/bazi-history",
          "bazi/history/celebrities/page": "tools/bazi-celebrities",
          "bazi/history/groups/page": "tools/bazi-history-groups",
          "paipan/page": "tools/paipan",
          "paipan/bazi/page": "tools/bazi-input",
          "paipan/bazi/result/page": "tools/bazi-result",
          "paipan/bazi/history/page": "tools/bazi-history",
          "paipan/bazi/history/groups/page": "tools/bazi-history-groups",
          "paipan/bazi/history/celebrities/page": "tools/bazi-celebrities",
          "paipan/:[toolId]/page": "tools/tool-detail",
          "merchant/page": "merchant/index",
          "merchant/dashboard/page": "merchant/dashboard",
          "merchant/products/page": "merchant/products",
          "merchant/orders/page": "merchant/orders",
          "merchant/revenue/page": "merchant/revenue",
          "merchant/settings/page": "merchant/profile",
          "merchant/apply/page": "merchant/apply",
          "merchant/status/page": "merchant/status",
          "agents/page": "agents/index",
          "agents/history/page": "agents/history",
          "agents/questions/page": "agents/questions",
          "agents/ranking/page": "agents/ranking",
          "ai/chat/page": "ai/chat",
          "ai/cover-generate/page": "ai/cover-generate",
          "tools/page": "tools/index",
          "tools/calculate/page": "tools/calculate",
          "tools/history/page": "tools/history",
          "tools/:[toolId]/page": "tools/tool-detail",
          "announcements/page": "notices/list",
          "announcements/:[id]/page": "notices/detail",
          "appointment/page": "appointment/index",
          "booking/:[expertId]/page": "booking/expert",
          "calls/:[id]/page": "calls/room",
          "check-in/page": "check-in/index",
          "collections/page": "collections/index",
          "competition/page": "competition/index",
          "competition/:[id]/register/page": "competition/register",
          "competition/:[id]/dashboard/page": "competition/dashboard",
          "creator/page": "creator/index",
          "creator/revenue/page": "creator/revenue",
          "customer-service/page": "customer-service/index",
          "ebook/page": "ebook/index",
          "ebook/:[id]/page": "ebook/detail",
          "ebook/:[id]/reader/page": "ebook/reader",
          "error/network/page": "error/network",
          "error/not-found/page": "error/not-found",
          "error/forbidden/page": "error/forbidden",
          "error/maintenance/page": "error/maintenance",
          "favorites/page": "favorites/index",
          "fortune/page": "fortune/index",
          "fortune/daily/page": "fortune/daily",
          "fortune/subscribe/page": "fortune/subscribe",
          "invite/page": "share/invite",
          "invite/rewards/page": "share/rewards",
          "legal/privacy-policy/page": "legal/privacy-policy",
          "legal/user-agreement/page": "legal/user-agreement",
          "legal/child-privacy/page": "legal/child-privacy",
          "legal/teen-mode-intro/page": "legal/teen-mode-intro",
          "legal/third-party-sdk/page": "legal/third-party-sdk",
          "legal/data-collection/page": "legal/data-collection",
          "login/forgot-password/page": "login/forgot",
          "manage/page": "admin/manage",
          "manage/content/page": "admin/content",
          "manage/users/page": "admin/users",
          "points/page": "mine/points-center",
          "points/history/page": "mine/points-history",
          "points/exchange/page": "mine/points-exchange",
          "points/rules/page": "mine/points-rules",
          "poetry/page": "poetry/index",
          "poetry/:[id]/page": "poetry/detail",
          "reader/page": "reader/index",
          "report/page": "report/index",
          "report/result/page": "report/result",
          "share/landing/page": "share/landing",
          "shop/after-sale/page": "shop/after-sale-list",
          "shop/after-sale/:[id]/page": "shop/after-sale-detail-v2",
          "shop/after-sale-rejected/page": "shop/after-sale-rejected",
          "shop/categories/page": "shop/categories",
          "shop/product/:[id]/page": "shop/product-detail",
          "shop/reviews/page": "shop/reviews",
          "station/page": "station/index",
          "station/config/page": "station/config",
          "station/earnings/page": "station/earnings",
          "station/team/page": "station/team",
          "station/materials/page": "station/materials",
          "station/live/page": "station/live",
          "station/assistant/page": "station/assistant",
          "tasks/daily/page": "tasks/daily",
          "teacher/dashboard/page": "teacher/dashboard",
          "teacher/:[id]/page": "teacher/detail",
          "topics/:[id]/page": "topics/detail",
          "user/:[id]/page": "user/profile",
          "videos/page": "videos/index",
          "videos/:[id]/page": "videos/play",
          "videos/publish/page": "videos/publish",
          "withdraw/page": "wallet/withdraw",
          "withdraw/history/page": "wallet/withdraw-history",
          "welcome/page": "index/welcome",
          "splash/page": "index/splash",
          "interests-guide/page": "index/interests-guide",
          "admin/batch-coupon-send/page": "admin/batch-coupon",
          "admin/user-audit/page": "admin/user-audit",
          "become-partner/page": "merchant/partner",
          "appointment/page": "appointment/list",
          "appeal/page": "appeal/index",
          "agents/page": "agents/index",
          "agents/questions/page": "agents/questions",
          "agents/ranking/page": "agents/ranking",
          "agents/history/page": "agents/history",
        };

        const key = v0Route.replace(/\[(\w+)\]/g, ":$1");
        if (pathMappings[key]) {
          map[v0Route] = pathMappings[key];
        } else {
          // 自动生成：app/xxx/yyy/page.tsx → pages/xxx/yyy
          map[v0Route] = vuePath;
        }
      }

      // 递归子目录
      walk(fullPath, v0Route);
    }
  }

  walk(V0_APP);
  return map;
}

/** 提取页面标题（从 V0 页面组件名推断） */
function extractPageTitle(v0Route) {
  const parts = v0Route.split("/");
  const last = parts[parts.length - 1];

  const titleMap = {
    "page": "首页", "mall": "商城", "cart": "购物车", "checkout": "结算",
    "profile": "我的", "search": "搜索", "courses": "课程", "live": "直播",
    "circles": "圈子", "mine": "我的", "wallet": "钱包", "vip": "会员",
    "orders": "订单", "classics": "古籍", "bots": "AI机器人", "discover": "发现",
    "articles": "文章", "qa": "问答", "bounty": "悬赏", "im": "消息",
    "same-city": "同城", "offline": "线下", "institute": "研究院", "activity": "活动",
    "about": "关于", "address": "地址", "coupons": "优惠券", "aftersale": "售后",
    "seckill": "秒杀", "group-buy": "团购", "payment": "支付", "login": "登录",
    "bazi": "八字排盘", "paipan": "排盘工具", "merchant": "商家",
    "agents": "AI智能体", "ai": "AI功能", "tools": "工具", "notifications": "通知",
    "favorites": "收藏", "fortune": "运势", "ebook": "电子书", "poetry": "诗词",
    "station": "分站", "creator": "创作者", "competition": "比赛", "teacher": "讲师",
    "videos": "视频", "points": "积分", "invite": "邀请", "withdraw": "提现",
    "tasks": "任务", "report": "报告", "share": "分享", "help": "帮助",
    "legal": "法律", "error": "错误", "splash": "启动页", "welcome": "欢迎页",
    "manage": "管理", "announcements": "公告", "appointment": "预约", "booking": "预约",
    "appeal": "申诉", "become-partner": "成为合作伙伴",
  };

  // 检查最后一个有意义的部分
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    if (p === "page" || p.startsWith("[")) continue;
    if (titleMap[p]) return titleMap[p];
  }

  return titleMap[last] || last || "页面";
}

/** 生成单个 Vue 页面 */
function convertPage(v0Route, vueRelPath) {
  const v0Path = path.join(V0_APP, ...v0Route.split("/"), "page.tsx");

  if (!fs.existsSync(v0Path)) {
    console.log(`  ⚠️ 跳过(无源文件): ${v0Route}`);
    stats.skipped++;
    return false;
  }

  const vuePath = path.join(VUE_PAGES, vueRelPath + ".vue");
  const dir = path.dirname(vuePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  try {
    const code = fs.readFileSync(v0Path, "utf-8");

    // 提取 JSX 模板
    const jsxTemplate = extractTemplate(code);

    // 转换为 Vue 模板
    let vueTemplate = jsxToVueTemplate(jsxTemplate || "<!-- 自动转换：模板为空 -->");

    // 提取页面标题
    const title = extractPageTitle(v0Route);

    // 构建 Vue SFC
    const vueCode = `<template>
  <view class="page v0-page" data-v0-route="${v0Route}">
${vueTemplate.split("\n").map(l => "    " + l).join("\n")}
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)
const isEmpty = ref(false)

async function fetchData() {
  loading.value = true
  error.value = null
  try {
    // TODO: 集成真实 API - V0 路由: ${v0Route}
    loading.value = false
  } catch (e: any) {
    error.value = e.message || '加载失败'
    loading.value = false
  }
}

onMounted(() => { fetchData() })
onPullDownRefresh(() => { fetchData().finally(() => uni.stopPullDownRefresh()) })
</script>

<style scoped>
.page {
  background: #FAF8F5;
  min-height: 100vh;
}

.v0-page {
  padding: 24rpx;
}

/* 按钮样式 */
.v0-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx 32rpx;
  border-radius: 12rpx;
  background: #C41E3A;
  color: #FFFFFF;
  font-size: 28rpx;
  font-weight: 500;
}

/* 列表项 */
.v0-li {
  padding: 24rpx;
  border-bottom: 1px solid #E8E0D5;
}

/* 分隔线 */
.hr {
  height: 1px;
  background: #E8E0D5;
  margin: 24rpx 0;
}
</style>`;

    fs.writeFileSync(vuePath, vueCode, "utf-8");
    return true;
  } catch (err) {
    console.log(`  ❌ 转换失败 ${v0Route}: ${err.message}`);
    stats.failed++;
    return false;
  }
}

/** 注册路由到 pages.json */
function registerRoute(vueRelPath, title) {
  // 由后续步骤统一处理
  return {
    path: `pages/${vueRelPath}`,
    style: {
      navigationBarTitleText: title,
      navigationBarBackgroundColor: "#FAF8F5",
      navigationBarTextStyle: "black",
    },
  };
}

/** 更新 pages.json */
function updatePagesJson(routes) {
  if (!fs.existsSync(PAGES_JSON)) {
    console.log("⚠️ pages.json 不存在，跳过路由注册");
    return;
  }

  let pagesJson = JSON.parse(fs.readFileSync(PAGES_JSON, "utf-8"));
  const existingPaths = new Set(pagesJson.pages.map(p => p.path));

  let added = 0;
  for (const route of routes) {
    if (!existingPaths.has(route.path)) {
      pagesJson.pages.push(route);
      existingPaths.add(route.path);
      added++;
    }
  }

  fs.writeFileSync(PAGES_JSON, JSON.stringify(pagesJson, null, 2), "utf-8");
  console.log(`✅ 路由注册: +${added} 条 (总计 ${pagesJson.pages.length} 条)`);
}

// ============== 主流程 ==============

console.log("=== React → Vue 自动转换 v2 ===\n");

const routeMap = generateRouteMap();
console.log(`📋 V0 页面总数: ${Object.keys(routeMap).length}\n`);

const routes = [];
const BATCH_SIZE = 50;
let batch = 0;

for (const [v0Route, vueRelPath] of Object.entries(routeMap)) {
  if (!vueRelPath) { stats.skipped++; continue; }

  if (convertPage(v0Route, vueRelPath)) {
    console.log(`  ✅ ${v0Route} → ${vueRelPath}`);
    stats.converted++;
    routes.push(registerRoute(vueRelPath, extractPageTitle(v0Route)));
  }

  batch++;
  if (batch % BATCH_SIZE === 0) {
    console.log(`\n--- 已处理 ${batch}/${Object.keys(routeMap).length} ---\n`);
  }
}

console.log(`\n=== 转换完成 ===`);
console.log(`✅ 成功: ${stats.converted}`);
console.log(`⏭️ 跳过: ${stats.skipped}`);
console.log(`❌ 失败: ${stats.failed}`);

// 更新路由
if (routes.length > 0) {
  updatePagesJson(routes);
}

console.log(`\n📌 下一步: 运行 npx uni build -p mp-weixin 验证编译`);
