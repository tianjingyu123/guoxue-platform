<script setup lang="ts">
/**
 * 排盘工具主页（V0 排盘工具 7月10日版 v0.5-v0.7 首页重构还原）
 * 结构：顶栏 / 今日时刻Hero / AI智能解盘卡 / 双人合盘卡 / 为你推荐(收藏夹·可管理) /
 *       全部工具(收起3排·展开全部) / 中医工具(已上线能力卡) / AI智能体横滚 / 合规提示 / 底部导航
 * 收藏与频次本地持久化（lib/paipan/tool-prefs），拖拽交互降级为「管理」编辑模式（uni-app 多端稳妥）。
 * R4 合规（微信小程序无占卜类目）：占卜类工具 MP 端隐藏入口，八字类改历法表述——仅展示层，路由/逻辑不变。
 */
import { ref, computed, onMounted } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import AppIcon from "@/components/common/app-icon.vue";
import SmartAvatar from "@/components/common/smart-avatar.vue";
import ToolIcon from "@/components/paipan/tool-icon.vue";
import TodayHero from "@/components/paipan/today-hero.vue";
import BottomNav from "@/components/bottom-nav/bottom-nav.vue";
import { type Tool, type ToolCategory, tools, medicalTools } from "@/lib/tools-data";
import { agentsSquareApi, type SquareBot } from "@/lib/agents-square-data";
import { agentThemeStyle } from "@/lib/agent-experience";
import {
  getFavorites,
  saveFavorites,
  addFavorite,
  removeFavorite,
  recordToolUsage,
} from "@/lib/paipan/tool-prefs";
import { legacyPaipanApi } from "@/lib/legacy-paipan-data";
import { navigateTo } from "@/utils/router";
import { getToken } from "@/utils/storage";
import { setNativeQaSession } from "@/lib/paipan-runtime";

const GRID_COLS = 4;
const COLLAPSED_ROWS = 3;
const COLLAPSED_COUNT = GRID_COLS * COLLAPSED_ROWS; // 收起时显示 3 排

const showAllTools = ref(false);
const editing = ref(false);
const favIds = ref<string[]>([]);
const entryLoading = ref(true);
const entryError = ref("");
const legacyRouting = ref(false);
const allowNative = ref(false);
const qaNotFound = ref(false);
const loginRequired = ref(false);
let entryTarget: "tool" | "account" | "station" = "tool";
let entryStationId = "";
let nativeQaRequested = false;

// ── R4 合规（微信小程序无占卜类目）：仅展示层差异，路由/数据/逻辑不动 ──
let pageTitle = "排盘工具";
let secToolsTitle = "全部工具";
let aiTitle = "AI 智能解盘";
let aiSub = "输入命盘信息，AI 为您深度解析";
let disclaimerText = "平台命理工具仅供传统文化爱好者研究学习，排盘与分析结果不构成任何决策建议。";
let MP_HIDDEN_TOOL_IDS: string[] = [];
let MP_TOOL_RENAME: Record<string, string> = {};
// #ifdef MP-WEIXIN
pageTitle = "民俗文化研究";
secToolsTitle = "传统历法工具";
aiTitle = "AI 文化解读";
aiSub = "输入干支信息，AI 为您做传统文化解读";
disclaimerText = "平台民俗文化工具仅供传统文化爱好者研究学习，结果不构成任何决策建议。";
MP_HIDDEN_TOOL_IDS = [
  "liuyao",
  "meihua",
  "daliuren",
  "xiaoliuren",
  "jinkoujue",
  "zhuge",
  "kongming",
  "taiyi",
  "jinqianke",
  "xiaocheng",
  "yinqimen",
  "mingli-qimen",
  "ziwei",
  "phone-analysis",
  "name-analysis",
  "flying-star",
  "bazhai",
  "feigong",
  "qimen-chuanren",
  "shanxiang-qimen",
  "direction-map",
];
MP_TOOL_RENAME = { bazi: "干支历法", qimen: "奇门研究", yangming: "阳盘研究" };
// #endif

// 分类色点（为你推荐卡片角注）
const CATEGORY_ACCENT: Record<ToolCategory, { color: string; label: string }> = {
  mingli: { color: "#c41e3a", label: "命理" },
  bushi: { color: "#4f5d95", label: "占卜" },
  qimen: { color: "#b8985f", label: "奇门" },
  fengshui: { color: "#2f9d6a", label: "风水" },
  xingming: { color: "#a0522d", label: "姓名" },
  lifa: { color: "#8a8a8a", label: "历法" },
  service: { color: "#8a8a8a", label: "服务" },
};

const byId = new Map(tools.map((t) => [t.id, t]));

/** 已上线与开发中工具都展示；开发中项作为可点击预告入口，状态必须清晰标注。 */
const visibleTools = computed(() =>
  tools
    .filter((t) => !MP_HIDDEN_TOOL_IDS.includes(t.id))
    .map((t) => (MP_TOOL_RENAME[t.id] ? { ...t, name: MP_TOOL_RENAME[t.id] } : t)),
);

const displayTools = computed(() =>
  showAllTools.value ? visibleTools.value : visibleTools.value.slice(0, COLLAPSED_COUNT),
);

const favTools = computed(() =>
  favIds.value
    .map((id) => byId.get(id))
    .filter((t): t is Tool => !!t && !t.comingSoon && !MP_HIDDEN_TOOL_IDS.includes(t.id))
    .map((t) => (MP_TOOL_RENAME[t.id] ? { ...t, name: MP_TOOL_RENAME[t.id] } : t)),
);

const availableMedical = computed(() => medicalTools.filter((t) => !t.comingSoon));
const previewMedical = computed(() => medicalTools.filter((t) => t.comingSoon));
const MEDICAL_DESCRIPTIONS: Record<string, string> = {
  wuyun: "五运六气节律 · 司天在泉 · 主客气推演",
};

function medicalDescription(id: string) {
  return MEDICAL_DESCRIPTIONS[id] || "传统中医文化研究工具";
}

const platformAgents = ref<SquareBot[]>([]);
const agentLoading = ref(true);
const agentError = ref("");
const displayAgents = computed(() => platformAgents.value.slice(0, 6));

async function loadPlatformAgents() {
  agentLoading.value = true;
  agentError.value = "";
  try {
    platformAgents.value = await agentsSquareApi.getHotBots();
  } catch (error) {
    platformAgents.value = [];
    agentError.value = (error as Error)?.message || "智能体加载失败";
  } finally {
    agentLoading.value = false;
  }
}

function openPlatformAgent(id: string) {
  navigateTo(`/agent/${id}`);
}

function platformAgentStyle(category: string) {
  return agentThemeStyle(category);
}

function activateOnKeyboard(event: KeyboardEvent, action: () => void | Promise<unknown>) {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  void action();
}

function toolAriaLabel(tool: Tool) {
  if (tool.comingSoon) return `${tool.name}，开发中，查看开放状态`;
  if (editing.value)
    return `${tool.name}，${isFav(tool.id) ? "已加入常用，按下可移除" : "未加入常用，按下可添加"}`;
  return `打开${tool.name}`;
}

function agentAriaLabel(agent: SquareBot) {
  return `${agent.name}，${agent.categoryName || "国学智能体"}，${agent.isFree ? "免费使用" : "按次计费"}，开始学习`;
}

function accentOf(t: Tool) {
  return CATEGORY_ACCENT[t.category ?? "service"];
}

function isFav(id: string) {
  return favIds.value.includes(id);
}

function openTool(t: Tool) {
  if (editing.value) {
    if (t.comingSoon) {
      uni.showToast({ title: "开发中工具暂不支持收藏", icon: "none" });
      return;
    }
    // 编辑态：点全部工具格 = 切换收藏
    favIds.value = isFav(t.id) ? removeFavorite(t.id) : addFavorite(t.id);
    return;
  }
  recordToolUsage(t.id);
  navigateTo(t.href);
}

function openFav(t: Tool) {
  if (editing.value) return;
  recordToolUsage(t.id);
  navigateTo(t.href);
}

function removeFav(id: string) {
  favIds.value = removeFavorite(id);
}

async function loadPaipanEntry() {
  entryLoading.value = true;
  entryError.value = "";
  allowNative.value = false;
  qaNotFound.value = false;
  loginRequired.value = false;
  try {
    if (nativeQaRequested) {
      const access = await legacyPaipanApi.nativeQaAccess();
      if (!access.allowed) throw new Error("页面不存在");
      setNativeQaSession(true);
      allowNative.value = true;
      favIds.value = getFavorites();
      await loadPlatformAgents();
      return;
    }
    if (entryTarget !== "station" && !getToken()) {
      loginRequired.value = true;
      entryError.value = "登录后即可安全进入旧版排盘；首页、圈子、发现等内容仍可直接浏览。";
      return;
    }
    const entry =
      entryTarget === "account"
        ? await legacyPaipanApi.account()
        : entryTarget === "station"
          ? await legacyPaipanApi.stationEntry(entryStationId)
          : await legacyPaipanApi.entry();
    if (entry.mode === "legacy") {
      if (!entry.url || !entry.url.startsWith("https://")) {
        throw new Error("排盘服务地址未正确配置");
      }
      legacyRouting.value = true;
      uni.navigateTo({
        url: "/pkg-common/legacy-paipan/index",
        fail: () => {
          legacyRouting.value = false;
          entryError.value = "旧排盘兼容页暂时无法打开";
        },
      });
      return;
    }
    allowNative.value = true;
    favIds.value = getFavorites();
    await loadPlatformAgents();
  } catch (error) {
    setNativeQaSession(false);
    qaNotFound.value = nativeQaRequested;
    const message = (error as Error)?.message || "排盘服务暂时不可用，请稍后重试";
    loginRequired.value = !nativeQaRequested && /未登录|登录已过期/u.test(message);
    entryError.value = nativeQaRequested
      ? "页面不存在"
      : loginRequired.value
        ? "登录后即可安全进入旧版排盘；首页、圈子、发现等内容仍可直接浏览。"
        : message;
  } finally {
    entryLoading.value = false;
  }
}

function paipanReturnPath() {
  const params: string[] = [];
  if (entryTarget !== "tool") params.push(`target=${entryTarget}`);
  if (entryTarget === "station" && entryStationId) {
    params.push(`stationId=${encodeURIComponent(entryStationId)}`);
  }
  return `/pages/paipan/index${params.length ? `?${params.join("&")}` : ""}`;
}

function openLoginForPaipan() {
  try {
    uni.setStorageSync("login:redirect", paipanReturnPath());
  } catch {
    // 回跳记录失败不影响用户主动登录。
  }
  navigateTo('/login');
}

function browsePublicContent() {
  navigateTo('/pages/index/index');
}

onLoad((query?: Record<string, string>) => {
  entryTarget =
    query?.target === "account"
      ? "account"
      : query?.target === "station"
        ? "station"
        : "tool";
  entryStationId = String(query?.stationId || "");
  nativeQaRequested = query?.nativeQa === "1";
  // #ifdef H5
  if (nativeQaRequested && typeof document !== "undefined") {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex,nofollow,noarchive";
    document.head.appendChild(meta);
  }
  // #endif
});

onMounted(() => {
  void loadPaipanEntry();
});
onShow(() => {
  if (legacyRouting.value) {
    legacyRouting.value = false;
    uni.reLaunch({ url: "/pages/index/index" });
    return;
  }
  favIds.value = getFavorites();
});
</script>

<template>
  <view v-if="entryLoading || legacyRouting" class="entry-gate" role="status" aria-live="polite">
    <view class="entry-gate-spinner" />
    <text class="entry-gate-title">正在进入排盘工具</text>
    <text class="entry-gate-desc">正在安全连接原有排盘记录与服务</text>
  </view>

  <view v-else-if="allowNative" class="paipan">
    <app-network-bar />
    <customer-service-fab />
    <!-- 顶部标题栏 -->
    <view class="header">
      <text class="header-title">{{ pageTitle }}</text>
      <view
        class="header-action"
        role="link"
        tabindex="0"
        aria-label="查看排盘历史记录"
        @tap="navigateTo('/paipan/history?name=%E5%8E%86%E5%8F%B2%E8%AE%B0%E5%BD%95')"
        @keydown="
          activateOnKeyboard($event, () =>
            navigateTo('/paipan/history?name=%E5%8E%86%E5%8F%B2%E8%AE%B0%E5%BD%95'),
          )
        "
      >
        <app-icon name="history" :size="40" color="#999999" />
      </view>
    </view>

    <scroll-view scroll-y class="content" role="main" aria-label="排盘工具与国学服务">
      <!-- 今日时刻 Hero -->
      <view class="section-px hero-wrap">
        <today-hero />
      </view>

      <!-- 从业者工作台入口（对应 V0 workspace-entry.tsx）
           所有登录用户可见，功能分级：免费用排盘/客户/账本/案例 + 3 份报告草稿 -->
      <view class="section-px">
        <view
          class="ws-entry"
          role="link"
          tabindex="0"
          aria-label="进入从业者工作台，排盘、出报告、管理客户"
          @tap="navigateTo('/workspace')"
          @keydown="activateOnKeyboard($event, () => navigateTo('/workspace'))"
        >
          <view class="ws-entry-icon">
            <app-icon name="crown" :size="36" color="#ffffff" />
          </view>
          <view class="ws-entry-body">
            <view class="ws-entry-row">
              <text class="ws-entry-title">从业者工作台</text>
              <text class="ws-entry-tag">专业版</text>
            </view>
            <text class="ws-entry-desc">排盘 · 出报告 · 管客户，执业一站搞定</text>
          </view>
          <app-icon name="chevron-right" :size="32" color="#C41E3A" />
        </view>
      </view>

      <!-- AI 智能解盘入口 -->
      <view class="section-px ai-wrap">
        <view
          class="ai-card"
          role="link"
          tabindex="0"
          :aria-label="`${aiTitle}，${aiSub}`"
          @tap="navigateTo('/paipan/ai?name=AI%E6%99%BA%E8%83%BD%E8%A7%A3%E7%9B%98')"
          @keydown="
            activateOnKeyboard($event, () =>
              navigateTo('/paipan/ai?name=AI%E6%99%BA%E8%83%BD%E8%A7%A3%E7%9B%98'),
            )
          "
        >
          <view class="ai-blob ai-blob-1" />
          <view class="ai-blob ai-blob-2" />
          <view class="ai-row">
            <view class="ai-icon">
              <app-icon name="sparkles" :size="56" color="#ffffff" />
            </view>
            <view class="ai-text">
              <view class="ai-title-row">
                <text class="ai-title">{{ aiTitle }}</text>
                <text class="ai-badge">新功能</text>
              </view>
              <text class="ai-sub">{{ aiSub }}</text>
            </view>
            <app-icon name="chevron-right" :size="40" color="rgba(255,255,255,0.6)" />
          </view>
        </view>
      </view>

      <!-- 统一排盘案例库：同一真实档案供不同术式交叉研习 -->
      <view class="section-px case-wrap">
        <view class="case-hub">
          <view
            class="case-card"
            role="link"
            tabindex="0"
            aria-label="进入统一排盘案例库，跨术式研习真实案例"
            @tap="navigateTo('/paipan/cases')"
            @keydown="activateOnKeyboard($event, () => navigateTo('/paipan/cases'))"
          >
            <view class="case-icon">
              <app-icon name="book-open" :size="44" color="#C41E3A" />
            </view>
            <view class="case-text">
              <text class="case-title">排盘案例库</text>
              <text class="case-sub">一份真实经历 · 八字 / 紫微 / 命理交叉印证</text>
            </view>
            <app-icon name="chevron-right" :size="36" color="#B8AA9A" />
          </view>
          <view class="case-actions">
            <view
              class="case-action tap-press"
              role="link"
              tabindex="0"
              aria-label="投稿真实排盘案例"
              @tap="navigateTo('/paipan/cases/submit')"
              @keydown="activateOnKeyboard($event, () => navigateTo('/paipan/cases/submit'))"
            >
              <app-icon name="edit-3" :size="26" color="#8B6A4A" />
              <text class="case-action-txt">投稿案例</text>
            </view>
            <view
              class="case-action tap-press"
              role="link"
              tabindex="0"
              aria-label="查看我的案例投稿"
              @tap="navigateTo('/mine/submissions')"
              @keydown="activateOnKeyboard($event, () => navigateTo('/mine/submissions'))"
            >
              <app-icon name="clipboard-list" :size="26" color="#8B6A4A" />
              <text class="case-action-txt">我的投稿</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 双人合盘入口（合婚裂变）· R4 合规：小程序端隐藏（页面保留） -->
      <!-- #ifndef MP-WEIXIN -->
      <view class="section-px couple-wrap">
        <view
          class="couple-card"
          role="link"
          tabindex="0"
          aria-label="进入双人合盘，需要对方授权"
          @tap="navigateTo('/pkg-paipan/couple/invite')"
          @keydown="activateOnKeyboard($event, () => navigateTo('/pkg-paipan/couple/invite'))"
        >
          <view class="couple-icon">
            <app-icon name="heart" :size="48" color="#ffffff" />
          </view>
          <view class="couple-text">
            <view class="couple-title-row">
              <text class="couple-title">双人合盘</text>
              <text class="couple-badge">缘分合婚</text>
            </view>
            <text class="couple-sub">邀 TA 授权自己的盘，共测缘分合婚</text>
          </view>
          <app-icon name="chevron-right" :size="40" color="rgba(255,255,255,0.6)" />
        </view>
      </view>
      <!-- #endif -->

      <!-- 为你推荐（收藏夹） -->
      <view class="section-px section-tools" role="region" aria-label="常用工具">
        <view class="sec-head">
          <text class="sec-title">为你推荐</text>
          <view
            class="sec-link"
            role="button"
            tabindex="0"
            :aria-label="editing ? '完成常用工具管理' : '管理常用工具'"
            :aria-pressed="editing"
            @tap="editing = !editing"
            @keydown="
              activateOnKeyboard($event, () => {
                editing = !editing;
              })
            "
          >
            <text class="sec-link-text">{{ editing ? "完成" : "管理" }}</text>
            <app-icon :name="editing ? 'check' : 'settings'" :size="28" color="#c41e3a" />
          </view>
        </view>
        <view v-if="favTools.length" class="fav-grid">
          <view
            v-for="t in favTools"
            :key="t.id"
            class="fav-card"
            :class="{ 'fav-card-editing': editing }"
            role="link"
            tabindex="0"
            :aria-label="editing ? `${t.name}，管理模式` : `打开常用工具${t.name}`"
            @tap="openFav(t)"
            @keydown="activateOnKeyboard($event, () => openFav(t))"
          >
            <view class="fav-icon">
              <tool-icon :icon-id="t.iconId" :size="64" />
            </view>
            <view class="fav-texts">
              <text class="fav-name">{{ t.name }}</text>
              <view class="fav-cat">
                <view class="fav-cat-dot" :style="{ background: accentOf(t).color }" />
                <text class="fav-cat-label" :style="{ color: accentOf(t).color }">{{
                  accentOf(t).label
                }}</text>
              </view>
            </view>
            <view
              v-if="editing"
              class="fav-remove"
              role="button"
              tabindex="0"
              :aria-label="`从常用工具移除${t.name}`"
              @tap.stop="removeFav(t.id)"
              @keydown.enter.stop="removeFav(t.id)"
              @keydown.space.stop.prevent="removeFav(t.id)"
            >
              <app-icon name="x" :size="24" color="#ffffff" />
            </view>
          </view>
        </view>
        <view v-else class="fav-empty" role="status">
          <text class="fav-empty-text">点「管理」后在下方全部工具中选择常用工具</text>
        </view>
      </view>

      <!-- 全部工具（收起 3 排 / 展开全部） -->
      <view class="section-px section-tools" role="region" :aria-label="secToolsTitle">
        <view class="sec-head">
          <text class="sec-title">{{ secToolsTitle }}</text>
          <text v-if="editing" class="sec-hint">点选工具加入/移出推荐</text>
        </view>
        <view class="grid">
          <view
            v-for="tool in displayTools"
            :key="tool.id"
            class="cell"
            :class="{ 'cell-editing': editing && !tool.comingSoon, 'cell-coming': tool.comingSoon }"
            role="button"
            tabindex="0"
            :aria-label="toolAriaLabel(tool)"
            :aria-disabled="false"
            @tap="openTool(tool)"
            @keydown="activateOnKeyboard($event, () => openTool(tool))"
          >
            <view class="cell-icon">
              <tool-icon :icon-id="tool.iconId" :size="88" />
              <view v-if="tool.badge && !editing" class="badge badge-red" />
              <text v-if="tool.comingSoon && !editing" class="coming-stamp">开发中</text>
              <view
                v-if="editing && !tool.comingSoon"
                class="cell-fav-mark"
                :class="{ 'cell-fav-on': isFav(tool.id) }"
              >
                <app-icon :name="isFav(tool.id) ? 'check' : 'plus'" :size="22" color="#ffffff" />
              </view>
            </view>
            <text class="cell-name">{{ tool.name }}</text>
          </view>
        </view>
        <view
          v-if="visibleTools.length > COLLAPSED_COUNT"
          class="toggle"
          role="button"
          tabindex="0"
          :aria-expanded="showAllTools"
          :aria-label="showAllTools ? '收起全部工具' : `展开全部${visibleTools.length}个工具`"
          @tap="showAllTools = !showAllTools"
          @keydown="
            activateOnKeyboard($event, () => {
              showAllTools = !showAllTools;
            })
          "
        >
          <text class="toggle-text">{{
            showAllTools ? "收起" : `展开全部 ${visibleTools.length} 个工具`
          }}</text>
          <app-icon
            :name="showAllTools ? 'chevron-up' : 'chevron-down'"
            :size="32"
            color="#c41e3a"
          />
        </view>
      </view>

      <!-- 中医工具：已上线能力与研发预告分层展示 -->
      <view
        v-if="availableMedical.length || previewMedical.length"
        class="section-px section-mt"
        role="region"
        aria-label="中医工具"
      >
        <view class="sec-head">
          <view class="sec-title-row">
            <app-icon name="stethoscope" :size="32" color="#059669" />
            <text class="sec-title">中医工具</text>
          </view>
          <text class="sec-live">已上线</text>
        </view>
        <view class="medical-list">
          <view
            v-for="tool in availableMedical"
            :key="tool.id"
            class="medical-card tap-press"
            role="link"
            tabindex="0"
            :aria-label="`打开${tool.name}，${medicalDescription(tool.id)}`"
            @tap="navigateTo(tool.href)"
            @keydown="activateOnKeyboard($event, () => navigateTo(tool.href))"
          >
            <view class="medical-icon">
              <tool-icon :icon-id="tool.iconId" :size="72" />
            </view>
            <view class="medical-copy">
              <text class="medical-name">{{ tool.name }}</text>
              <text class="medical-desc">{{ medicalDescription(tool.id) }}</text>
            </view>
            <app-icon name="chevron-right" :size="32" color="#7B9B84" />
          </view>
        </view>
        <view v-if="previewMedical.length" class="medical-preview">
          <view class="medical-preview-head">
            <text class="medical-preview-title">研发预告</text>
            <text class="medical-preview-sub">点击可查看当前开放状态</text>
          </view>
          <view class="medical-preview-grid">
            <view
              v-for="tool in previewMedical"
              :key="tool.id"
              class="medical-preview-cell tap-press"
              role="button"
              tabindex="0"
              :aria-label="`${tool.name}，开发中，查看开放状态`"
              @tap="navigateTo(tool.href)"
              @keydown="activateOnKeyboard($event, () => navigateTo(tool.href))"
            >
              <view class="medical-preview-icon">
                <tool-icon :icon-id="tool.iconId" :size="88" />
                <view class="preview-dot" />
              </view>
              <text class="medical-preview-name">{{ tool.name }}</text>
              <text class="medical-preview-status">开发中</text>
            </view>
          </view>
        </view>
      </view>

      <!-- AI 智能体 -->
      <view class="section-px section-mt" role="region" aria-label="AI 智能体">
        <view class="sec-head">
          <text class="sec-title">AI 智能体</text>
          <view
            class="sec-link"
            role="link"
            tabindex="0"
            aria-label="查看全部智能体"
            @tap="navigateTo('/agents')"
            @keydown="activateOnKeyboard($event, () => navigateTo('/agents'))"
          >
            <text class="sec-link-text">查看全部</text>
            <app-icon name="chevron-right" :size="28" color="#c41e3a" />
          </view>
        </view>
        <view v-if="agentLoading" class="agents-state" role="status" aria-live="polite">
          <view class="agents-loading-dot" />
          <text>正在连接平台智能体…</text>
        </view>
        <view
          v-else-if="agentError"
          class="agents-state agents-state-error"
          role="button"
          tabindex="0"
          aria-label="智能体连接失败，重新加载"
          @tap="loadPlatformAgents"
          @keydown="activateOnKeyboard($event, loadPlatformAgents)"
        >
          <text>连接失败，点击重试</text>
          <app-icon name="refresh-cw" :size="26" color="#C41E3A" />
        </view>
        <scroll-view v-else-if="displayAgents.length" scroll-x class="agents-scroll">
          <view class="agents-row">
            <view
              v-for="agent in displayAgents"
              :key="agent.id"
              class="agent-card"
              :style="platformAgentStyle(agent.category)"
              role="link"
              tabindex="0"
              :aria-label="agentAriaLabel(agent)"
              @tap="openPlatformAgent(agent.id)"
              @keydown="activateOnKeyboard($event, () => openPlatformAgent(agent.id))"
            >
              <view class="agent-visual">
                <view class="agent-grid" />
                <view class="agent-mark">
                  <view class="agent-live-dot" />
                  <text>AI 学伴</text>
                </view>
                <view class="agent-orbit">
                  <view class="agent-orbit-ring" />
                  <view class="agent-avatar">
                    <smart-avatar class="agent-avatar-img" :src="agent.avatar" :name="agent.name" />
                  </view>
                </view>
                <text class="agent-category">{{ agent.categoryName || "国学智能体" }}</text>
              </view>
              <view class="agent-content">
                <text class="agent-name">{{ agent.name }}</text>
                <text class="agent-desc">{{ agent.description || "点击进入，开始智能对话" }}</text>
                <view class="agent-action">
                  <text>{{ agent.isFree ? "随时可用" : "按次计费" }}</text>
                  <view class="agent-action-link">
                    <text>开始学习</text>
                    <app-icon name="arrow-up-right" :size="20" color="var(--agent-ink)" />
                  </view>
                </view>
              </view>
            </view>
          </view>
        </scroll-view>
        <view v-else class="agents-state" role="status">
          <text>暂无可用智能体</text>
        </view>
      </view>

      <!-- 合规提示 -->
      <view class="section-px disclaimer">
        <text class="disclaimer-text">{{ disclaimerText }}</text>
      </view>
    </scroll-view>

    <bottom-nav active="paipan" />
  </view>

  <view v-else class="entry-gate" role="alert" aria-live="assertive">
    <app-icon :name="qaNotFound ? 'file-x' : loginRequired ? 'user' : 'wifi-off'" :size="56" color="#8A6A3F" />
    <text class="entry-gate-title">{{ qaNotFound ? "页面不存在" : loginRequired ? "登录后使用排盘" : "排盘服务暂时不可用" }}</text>
    <text v-if="!qaNotFound" class="entry-gate-desc">{{ entryError }}</text>
    <button v-if="loginRequired" class="degraded-retry degraded-primary" @tap="openLoginForPaipan">登录后进入排盘</button>
    <button v-if="loginRequired" class="degraded-retry" @tap="browsePublicContent">先逛逛</button>
    <button v-else-if="!qaNotFound" class="degraded-retry" @tap="loadPaipanEntry">重新连接</button>
    <button v-if="!qaNotFound && !loginRequired" class="degraded-retry" @tap="browsePublicContent">返回首页</button>
  </view>
</template>

<style scoped lang="scss">
.paipan {
  min-height: 100vh;
}
.entry-gate {
  min-height: 100vh;
  padding: 0 56rpx 150rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18rpx;
  box-sizing: border-box;
  background: #faf8f5;
}
.entry-gate-spinner {
  width: 52rpx;
  height: 52rpx;
  border: 5rpx solid rgba(196, 30, 58, 0.16);
  border-top-color: var(--brand, #c41e3a);
  border-radius: 50%;
  animation: entry-spin 0.8s linear infinite;
}
.entry-gate-title {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--text-ink, #2c2723);
}
.entry-gate-desc {
  max-width: 560rpx;
  font-size: 25rpx;
  line-height: 1.6;
  color: var(--text-soft, #777);
}


@keyframes entry-spin {
  to {
    transform: rotate(360deg);
  }
}

/* 顶栏 */
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 40;
  height: calc(88rpx + var(--status-bar-height));
  padding: var(--status-bar-height) 32rpx 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-paper, #faf8f5);
  border-bottom: 2rpx solid var(--line, #e8e0d5);
}
.header-title {
  font-size: 36rpx;
  font-weight: 700;
  color: var(--text-ink, #2c2c2c);
}
.header-action {
  padding: 16rpx;
  margin-right: -16rpx;
}

.content {
  position: absolute;
  top: calc(88rpx + var(--status-bar-height));
  bottom: 112rpx;
  left: 0;
  right: 0;
}
.section-px {
  padding-left: 32rpx;
  padding-right: 32rpx;
}

.degraded-retry {
  height: 54rpx;
  margin: 0;
  padding: 0 18rpx;
  border: 0;
  border-radius: 27rpx;
  background: #fff;
  color: #9a6b12;
  font-size: 22rpx;
  line-height: 54rpx;
}
.degraded-retry::after {
  border: 0;
}
.degraded-primary {
  background: var(--brand, #c41e3a);
  color: #fff;
}

/* 今日时刻 */
/* 从业者工作台入口 */
.ws-entry {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-top: 24rpx;
  padding: 24rpx;
  border: 1rpx solid rgba(196, 30, 58, 0.28);
  border-radius: 20rpx;
  background: linear-gradient(135deg, rgba(196, 30, 58, 0.06), #ffffff 60%);
}

.ws-entry-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 88rpx;
  height: 88rpx;
  flex-shrink: 0;
  border-radius: 20rpx;
  background: #c41e3a;
}

.ws-entry-body {
  flex: 1;
  min-width: 0;
}

.ws-entry-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.ws-entry-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #3a2a1e;
}

.ws-entry-tag {
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
  background: rgba(196, 30, 58, 0.1);
  font-size: 20rpx;
  color: #c41e3a;
}

.ws-entry-desc {
  display: block;
  margin-top: 6rpx;
  font-size: 23rpx;
  color: #9a8c7e;
}

.hero-wrap {
  padding-top: 32rpx;
}

/* AI 解盘卡 */
.ai-wrap {
  padding-top: 24rpx;
}
.ai-card {
  position: relative;
  overflow: hidden;
  border-radius: 32rpx;
  padding: 32rpx;
  background: linear-gradient(
    to right,
    var(--brand),
    rgba(196, 30, 58, 0.9),
    rgba(196, 30, 58, 0.8)
  );
}
.ai-blob {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
}
.ai-blob-1 {
  right: 0;
  top: 0;
  width: 256rpx;
  height: 256rpx;
  transform: translate(25%, -50%);
}
.ai-blob-2 {
  right: 64rpx;
  bottom: 0;
  width: 160rpx;
  height: 160rpx;
  transform: translateY(50%);
}
.ai-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 32rpx;
}
.ai-icon {
  width: 112rpx;
  height: 112rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}
.ai-text {
  flex: 1;
}
.ai-title-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.ai-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #fff;
}
.ai-badge {
  padding: 2rpx 16rpx;
  font-size: 20rpx;
  color: #fff;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 999rpx;
}
.ai-sub {
  display: block;
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 4rpx;
}

/* 双人合盘入口 */
/* 案例库入口：低调横条，不跟 AI 卡抢视觉 */
.case-wrap {
  padding-top: 24rpx;
}
.case-hub {
  overflow: hidden;
  border: 1rpx solid rgba(58, 42, 30, 0.08);
  border-radius: 20rpx;
  background: #fff;
}
.case-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
}
.case-icon {
  width: 84rpx;
  height: 84rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14rpx;
  background: rgba(196, 30, 58, 0.08);
}
.case-text {
  flex: 1;
  min-width: 0;
}
.case-title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: #3a2a1e;
}
.case-sub {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #9a8c7e;
}
.case-actions {
  display: flex;
  border-top: 1rpx solid rgba(58, 42, 30, 0.08);
  background: #fcfaf7;
}
.case-action {
  box-sizing: border-box;
  flex: 1;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
}
.case-action + .case-action {
  border-left: 1rpx solid rgba(58, 42, 30, 0.08);
}
.case-action-txt {
  font-size: 23rpx;
  font-weight: 600;
  color: #6f5139;
}

.couple-wrap {
  padding-top: 24rpx;
}
.couple-card {
  position: relative;
  overflow: hidden;
  border-radius: 32rpx;
  padding: 28rpx 32rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
  background: linear-gradient(135deg, #d1477a, #c41e3a);
}
.couple-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.couple-text {
  flex: 1;
  min-width: 0;
}
.couple-title-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.couple-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #fff;
}
.couple-badge {
  padding: 2rpx 16rpx;
  font-size: 20rpx;
  color: #fff;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 999rpx;
}
.couple-sub {
  display: block;
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.85);
  margin-top: 6rpx;
}

/* 分区标题 */
.section-tools {
  padding-top: 48rpx;
}
.section-mt {
  padding-top: 32rpx;
}
.sec-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.sec-title {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--text-ink, #2c2c2c);
}
.sec-title-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.sec-link {
  display: flex;
  align-items: center;
  gap: 4rpx;
}
.sec-link-text {
  font-size: 24rpx;
  color: var(--brand);
}
.sec-hint {
  font-size: 22rpx;
  color: var(--text-soft, #999);
}
.sec-live {
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(5, 150, 105, 0.1);
  font-size: 20rpx;
  font-weight: 600;
  color: #047857;
}

/* 中医工具：已上线能力用完整信息卡呈现，避免单个工具留在四列网格里显得残缺 */
.medical-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.medical-card {
  min-height: 120rpx;
  display: flex;
  align-items: center;
  gap: 22rpx;
  padding: 22rpx 24rpx;
  border: 2rpx solid rgba(5, 150, 105, 0.16);
  border-radius: 26rpx;
  background: linear-gradient(135deg, rgba(236, 253, 245, 0.92), rgba(255, 255, 255, 0.98));
  box-shadow: 0 6rpx 20rpx rgba(5, 100, 75, 0.06);
}
.medical-icon {
  width: 92rpx;
  height: 92rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 24rpx;
  background: rgba(5, 150, 105, 0.08);
}
.medical-copy {
  min-width: 0;
  flex: 1;
}
.medical-name {
  display: block;
  font-size: 29rpx;
  font-weight: 700;
  color: #214b3a;
}
.medical-desc {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  line-height: 1.45;
  color: #6d8779;
}
.medical-preview {
  margin-top: 18rpx;
  padding: 22rpx 16rpx 18rpx;
  border: 1rpx solid rgba(184, 152, 95, 0.2);
  border-radius: 24rpx;
  background: linear-gradient(145deg, rgba(255, 252, 245, 0.96), rgba(255, 255, 255, 0.98));
}
.medical-preview-head {
  padding: 0 8rpx 18rpx;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.medical-preview-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #665235;
}
.medical-preview-sub {
  font-size: 22rpx;
  color: #8f7c60;
}
.medical-preview-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  row-gap: 12rpx;
}
.medical-preview-cell {
  min-width: 0;
  min-height: 178rpx;
  padding: 14rpx 0 10rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.medical-preview-icon {
  position: relative;
  width: 98rpx;
  height: 98rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid rgba(184, 152, 95, 0.22);
  border-radius: 22rpx;
  background: rgba(184, 152, 95, 0.06);
}
.preview-dot {
  position: absolute;
  right: -2rpx;
  top: -2rpx;
  width: 14rpx;
  height: 14rpx;
  border: 3rpx solid #fff;
  border-radius: 50%;
  background: #c9a96e;
}
.medical-preview-name {
  min-height: 58rpx;
  max-width: 100%;
  margin-top: 10rpx;
  padding: 0 3rpx;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  font-size: 24rpx;
  line-height: 1.2;
  text-align: center;
  color: #4b4439;
}
.medical-preview-status {
  margin-top: 3rpx;
  padding: 2rpx 10rpx;
  border-radius: 999rpx;
  background: rgba(184, 152, 95, 0.1);
  font-size: 20rpx;
  line-height: 1.35;
  color: #967542;
}

/* 为你推荐（收藏夹）：2 列横卡 */
.fav-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}
.fav-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
  border-radius: 24rpx;
  background: var(--card, #fff);
  border: 2rpx solid var(--line, #e8e0d5);
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.fav-card-editing {
  animation: fav-wiggle 0.35s ease-in-out infinite;
}
@keyframes fav-wiggle {
  0%,
  100% {
    transform: rotate(-0.6deg);
  }
  50% {
    transform: rotate(0.6deg);
  }
}
.fav-icon {
  width: 80rpx;
  height: 80rpx;
  flex-shrink: 0;
  border-radius: 20rpx;
  background: rgba(0, 0, 0, 0.03);
  display: flex;
  align-items: center;
  justify-content: center;
}
.fav-texts {
  min-width: 0;
  flex: 1;
}
.fav-name {
  display: block;
  font-family: Georgia, "Songti SC", serif;
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-ink, #2c2c2c);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fav-cat {
  margin-top: 6rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.fav-cat-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
}
.fav-cat-label {
  font-size: 22rpx;
}
.fav-remove {
  position: absolute;
  right: -10rpx;
  top: -10rpx;
  z-index: 5;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: var(--brand);
  border: 4rpx solid var(--card, #fff);
  display: flex;
  align-items: center;
  justify-content: center;
}
.fav-empty {
  padding: 48rpx 0;
  text-align: center;
  border: 2rpx dashed var(--line, #e8e0d5);
  border-radius: 24rpx;
}
.fav-empty-text {
  font-size: 24rpx;
  color: var(--text-soft, #999);
}

/* 工具网格 4 列 */
.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  row-gap: 24rpx;
}
.cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 0;
}
.cell-editing {
  animation: fav-wiggle 0.35s ease-in-out infinite;
}
.cell-icon {
  position: relative;
}
.cell-coming .cell-icon {
  padding: 5rpx;
  border: 1rpx solid rgba(184, 152, 95, 0.2);
  border-radius: 26rpx;
  background: rgba(184, 152, 95, 0.05);
}
.cell-coming .cell-name {
  color: #655946;
}
.coming-stamp {
  position: absolute;
  right: -12rpx;
  top: -10rpx;
  padding: 3rpx 9rpx;
  border: 2rpx solid #fff;
  border-radius: 999rpx;
  background: #c9a96e;
  box-shadow: 0 4rpx 12rpx rgba(128, 96, 43, 0.18);
  font-size: 16rpx;
  line-height: 1.3;
  color: #fff;
  white-space: nowrap;
}
.badge {
  position: absolute;
  top: -4rpx;
  right: -4rpx;
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
}
.badge-red {
  background: var(--brand);
}
.cell-fav-mark {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.35);
  border: 3rpx solid var(--card, #fff);
  display: flex;
  align-items: center;
  justify-content: center;
}
.cell-fav-on {
  background: #2f9d6a;
}
.cell-name {
  min-height: 58rpx;
  padding: 0 4rpx;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  font-size: 24rpx;
  color: var(--text-ink, #2c2c2c);
  text-align: center;
  line-height: 1.2;
}

/* 展开/收起 */
.toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  margin-top: 20rpx;
  padding: 20rpx 0;
  border: 2rpx solid rgba(196, 30, 58, 0.3);
  border-radius: 999rpx;
  background: rgba(196, 30, 58, 0.05);
}
.toggle-text {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--brand);
}

/* 智能体横滚：数据、类别主题与对话入口和智能体广场保持一致 */
.agents-state {
  min-height: 150rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  border: 1rpx solid rgba(93, 111, 159, 0.12);
  border-radius: 22rpx;
  background: #fff;
  font-size: 24rpx;
  color: #8b91a0;
}
.agents-state-error {
  color: #c41e3a;
}
.agents-loading-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: #6c63e8;
  box-shadow: 0 0 0 8rpx rgba(108, 99, 232, 0.1);
  animation: agent-loading 1.6s ease-in-out infinite;
}
.agents-scroll {
  width: 100%;
  white-space: nowrap;
}
.agents-row {
  display: inline-flex;
  gap: 24rpx;
  padding-bottom: 16rpx;
}
.agent-card {
  display: inline-flex;
  flex-direction: column;
  width: 304rpx;
  overflow: hidden;
  border: 1rpx solid rgba(93, 111, 159, 0.13);
  border-radius: 24rpx;
  background: #fff;
  box-shadow: 0 8rpx 24rpx rgba(54, 68, 105, 0.08);
}
.agent-visual {
  position: relative;
  height: 170rpx;
  overflow: hidden;
  background:
    radial-gradient(circle at 82% 16%, var(--agent-glow), transparent 42%),
    linear-gradient(145deg, var(--agent-deep), var(--agent-accent));
}
.agent-grid {
  position: absolute;
  inset: 0;
  opacity: 0.38;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.09) 1rpx, transparent 1rpx),
    linear-gradient(90deg, rgba(255, 255, 255, 0.09) 1rpx, transparent 1rpx);
  background-size: 28rpx 28rpx;
}
.agent-mark {
  position: absolute;
  top: 12rpx;
  left: 12rpx;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 5rpx 10rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.28);
  border-radius: 999rpx;
  background: rgba(10, 20, 52, 0.26);
  font-size: 17rpx;
  font-weight: 700;
  color: #fff;
}
.agent-live-dot {
  width: 7rpx;
  height: 7rpx;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 12rpx var(--agent-glow);
  animation: agent-loading 2.4s ease-in-out infinite;
}
.agent-orbit {
  position: absolute;
  top: 18rpx;
  left: 50%;
  width: 126rpx;
  height: 126rpx;
  transform: translateX(-50%);
}
.agent-orbit-ring {
  position: absolute;
  inset: 0;
  border: 1rpx dashed rgba(255, 255, 255, 0.52);
  border-radius: 50%;
  animation: agent-orbit 14s linear infinite;
}
.agent-avatar {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 78rpx;
  height: 78rpx;
  overflow: hidden;
  transform: translate(-50%, -50%);
  border: 4rpx solid rgba(255, 255, 255, 0.92);
  border-radius: 24rpx;
  box-shadow:
    0 10rpx 24rpx rgba(12, 19, 55, 0.24),
    0 0 26rpx var(--agent-glow);
}
.agent-avatar-img {
  width: 100%;
  height: 100%;
}
.agent-category {
  position: absolute;
  right: 14rpx;
  bottom: 12rpx;
  font-size: 18rpx;
  color: rgba(255, 255, 255, 0.88);
}
.agent-content {
  min-height: 172rpx;
  padding: 18rpx;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  background: linear-gradient(180deg, #fff, var(--agent-wash));
}
.agent-name {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 27rpx;
  font-weight: 700;
  color: #273047;
}
.agent-desc {
  min-height: 58rpx;
  margin-top: 6rpx;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  white-space: normal;
  font-size: 21rpx;
  line-height: 1.4;
  color: #6b7488;
}
.agent-action {
  margin-top: auto;
  padding-top: 11rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8rpx;
  border-top: 1rpx solid rgba(91, 108, 154, 0.1);
  font-size: 19rpx;
  color: #969dae;
}
.agent-action-link {
  display: flex;
  align-items: center;
  gap: 3rpx;
  padding: 5rpx 9rpx;
  border-radius: 999rpx;
  background: var(--agent-soft);
  font-weight: 600;
  color: var(--agent-ink);
}
@keyframes agent-loading {
  0%,
  100% {
    opacity: 0.65;
    transform: scale(0.88);
  }
  50% {
    opacity: 1;
    transform: scale(1.15);
  }
}
@keyframes agent-orbit {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .agent-live-dot,
  .agent-orbit-ring,
  .agents-loading-dot {
    animation: none;
  }
}

/* 合规提示 */
.disclaimer {
  padding-top: 16rpx;
  padding-bottom: 32rpx;
}
.disclaimer-text {
  font-size: 22rpx;
  color: var(--text-soft, #999);
  line-height: 1.5;
  text-align: center;
}
</style>
