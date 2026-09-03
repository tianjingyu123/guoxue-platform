<template>
  <el-container class="layout">
    <a
      class="skip-link"
      href="#admin-main"
    >跳到主内容</a>
    <ConnectionStatus />
    <el-aside
      :width="isCollapse ? '76px' : '248px'"
      class="aside"
    >
      <!-- 品牌区 -->
      <div class="brand">
        <BrandLogo
          :compact="isCollapse"
          :title="BRAND.name"
          subtitle="管理后台"
        />
      </div>

      <!-- 工作区切换：人工工作区 ⇄ AI 自动化工作区（体验标准第三节·董事长拍板 2026-07-18） -->
      <div class="ws-switch">
        <el-segmented
          v-model="workspace"
          :options="isCollapse ? WS_OPTIONS_COMPACT : WS_OPTIONS_FULL"
          size="small"
          block
          class="ws-segmented"
        />
        <div
          v-if="workspace === 'ai' && !isCollapse"
          class="ws-ai-hint"
        >
          AI 辅助协作 · 关键操作人工审核
        </div>
      </div>

      <!-- 菜单区 -->
      <div class="menu-scroll">
        <el-menu
          router
          :default-active="route.path"
          :collapse="isCollapse"
          background-color="transparent"
          text-color="rgba(255,255,255,0.6)"
          active-text-color="#C9A96E"
        >
          <SidebarMenu :items="visibleMenus" />
        </el-menu>
      </div>

      <!-- 底部收缩 -->
      <button
        type="button"
        class="aside-footer"
        :class="{ 'is-collapsed': isCollapse }"
        :aria-label="isCollapse ? '展开侧边菜单' : '收起侧边菜单'"
        @click="isCollapse = !isCollapse"
      >
        <el-icon class="collapse-icon">
          <Expand v-if="isCollapse" />
          <Fold v-else />
        </el-icon>
        <span
          v-if="!isCollapse"
          class="collapse-text"
        >收起菜单</span>
      </button>
    </el-aside>

    <el-container>
      <!-- 顶栏 -->
      <el-header>
        <div class="header-left">
          <button
            type="button"
            class="mobile-toggle"
            :aria-label="mobileMenuOpen ? '关闭导航菜单' : '打开导航菜单'"
            :aria-expanded="mobileMenuOpen"
            @click="mobileMenuOpen = !mobileMenuOpen"
          >
            <el-icon><Close v-if="mobileMenuOpen" /><Menu v-else /></el-icon>
          </button>
          <el-breadcrumb separator="›">
            <el-breadcrumb-item :to="{ path: '/dashboard' }">
              <span class="breadcrumb-home">首页</span>
            </el-breadcrumb-item>
            <!-- 完整层级：分组 / 子分组 / 当前页（来自菜单树·分组名不可点，当前页高亮） -->
            <template
              v-for="(seg, i) in breadcrumbTrail"
              :key="i"
            >
              <el-breadcrumb-item>
                <span :class="i === breadcrumbTrail.length - 1 ? 'breadcrumb-current' : 'breadcrumb-group'">{{ seg }}</span>
              </el-breadcrumb-item>
            </template>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <button
            type="button"
            class="command-trigger"
            aria-label="搜索后台功能，快捷键 Ctrl K"
            @click="commandOpen = true"
          >
            <el-icon
              class="command-trigger-icon"
              aria-hidden="true"
            >
              <Search />
            </el-icon>
            <span class="command-trigger-label">搜索功能</span>
            <kbd>Ctrl K</kbd>
          </button>
          <!-- 角色标签：同名合并计数（原"圈主"×6 重复铺满顶栏）·最多显 2 枚·其余收进悬浮 -->
          <el-tag
            v-for="t in roleTagsInline"
            :key="t.label"
            size="small"
            effect="plain"
            class="role-tag"
          >
            {{ t.count > 1 ? `${t.label}×${t.count}` : t.label }}
          </el-tag>
          <el-tooltip
            v-if="roleTagsOverflow.length > 0"
            placement="bottom"
          >
            <template #content>
              <div
                v-for="t in roleTagsOverflow"
                :key="t.label"
              >
                {{ t.count > 1 ? `${t.label}×${t.count}` : t.label }}
              </div>
            </template>
            <el-tag
              size="small"
              effect="plain"
              class="role-tag"
            >
              +{{ roleTagsOverflow.length }}
            </el-tag>
          </el-tooltip>
          <!-- 铃铛：下拉显示我的最近通知·单条/全部标已读（原来点击跳"通知管理"群发页·语义错） -->
          <el-popover
            placement="bottom-end"
            :width="340"
            trigger="click"
            popper-class="notify-popper"
            @show="loadNotifications"
          >
            <template #reference>
              <el-badge
                :value="unreadCount"
                :hidden="unreadCount === 0"
                :max="99"
                class="notify-badge"
              >
                <el-button
                  text
                  class="notify-btn"
                  aria-label="打开通知中心"
                >
                  <el-icon><Bell /></el-icon>
                </el-button>
              </el-badge>
            </template>
            <div class="notify-panel">
              <div class="notify-head">
                <span class="notify-head-title">通知</span>
                <el-button
                  v-if="unreadCount > 0"
                  text
                  size="small"
                  type="primary"
                  @click="markAllNotificationsRead"
                >
                  全部已读
                </el-button>
              </div>
              <div
                v-loading="notifyLoading"
                class="notify-list"
              >
                <div
                  v-if="!notifyLoading && notifications.length === 0"
                  class="notify-empty"
                >
                  暂无通知，一切安好
                </div>
                <button
                  v-for="n in notifications"
                  :key="n.id"
                  type="button"
                  class="notify-item"
                  :class="{ 'is-unread': !n.isRead }"
                  @click="readOneNotification(n)"
                >
                  <span class="notify-dot" />
                  <div class="notify-body">
                    <div class="notify-item-title">
                      {{ n.title }}
                    </div>
                    <div
                      v-if="n.content"
                      class="notify-item-content"
                    >
                      {{ n.content }}
                    </div>
                    <div class="notify-item-time">
                      {{ humanTime(n.createdAt) }}
                    </div>
                  </div>
                </button>
              </div>
              <div
                v-if="notifyHasMore"
                class="notify-foot"
              >
                <el-button
                  text
                  size="small"
                  @click="loadMoreNotifications"
                >
                  查看更多
                </el-button>
              </div>
            </div>
          </el-popover>
          <el-dropdown
            trigger="click"
            placement="bottom-end"
          >
            <button
              type="button"
              class="account-trigger"
              aria-label="打开账户菜单"
            >
              <span class="account-avatar">{{ userInitial }}</span>
              <span class="account-copy">
                <b>{{ auth.user?.nickname || "管理员" }}</b>
                <small>在线</small>
              </span>
              <el-icon class="account-chevron">
                <ArrowDown />
              </el-icon>
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item disabled>
                  当前账户 · {{ auth.user?.nickname || "管理员" }}
                </el-dropdown-item>
                <el-dropdown-item
                  divided
                  @click="logout"
                >
                  安全退出
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 主内容区 -->
      <el-main
        id="admin-main"
        ref="mainContentRef"
        tabindex="-1"
        :aria-label="currentPageTitle"
        :class="mainClasses"
        :data-page-kind="pageKind"
        :data-page-domain="pageDomain"
      >
        <router-view v-slot="{ Component }">
          <transition
            name="fade-slide"
            mode="out-in"
          >
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>

    <!-- 移动端抽屉菜单（≤768px 顶栏 ☰ 打开·桌面端开关不可见故永不弹出·路由跳转后自动收起） -->
    <el-drawer
      v-model="mobileMenuOpen"
      direction="ltr"
      size="240px"
      :with-header="false"
      class="mobile-drawer"
    >
      <div class="brand">
        <BrandLogo
          :compact="false"
          :title="BRAND.name"
          subtitle="管理后台"
        />
      </div>
      <!-- 移动端抽屉同样支持工作区切换（切换即整树切换·与桌面共用同一持久化状态） -->
      <div class="ws-switch">
        <el-segmented
          v-model="workspace"
          :options="WS_OPTIONS_FULL"
          size="small"
          block
          class="ws-segmented"
        />
        <div
          v-if="workspace === 'ai'"
          class="ws-ai-hint"
        >
          AI 辅助协作 · 关键操作人工审核
        </div>
      </div>
      <div class="menu-scroll mobile-menu-scroll">
        <el-menu
          router
          :default-active="route.path"
          background-color="transparent"
          text-color="rgba(255,255,255,0.6)"
          active-text-color="#C9A96E"
        >
          <SidebarMenu :items="visibleMenus" />
        </el-menu>
      </div>
    </el-drawer>

    <!-- 全局悬浮运营助手（答疑指导 + 反馈问题） -->
    <AdminAssistant />
    <!-- 200+ 页面统一入口：支持 Ctrl/Cmd+K、最近访问与键盘导航 -->
    <AdminCommandPalette
      v-model="commandOpen"
      :items="commandMenus"
      @navigated="focusMainContent"
    />
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import { useRouter, useRoute } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { ArrowDown, Bell, Close, Expand, Fold, Menu, Search } from "@element-plus/icons-vue";
import { useAuthStore, type MenuItem } from "@/store/auth";
import { filterMenusByWorkspace, pathWorkspace, type Workspace } from "@/lib/menu-structure";
import SidebarMenu from "@/components/SidebarMenu.vue";
import AdminAssistant from "@/components/AdminAssistant.vue";
import AdminCommandPalette from "@/components/AdminCommandPalette.vue";
import ConnectionStatus from "@/components/ConnectionStatus.vue";
import BrandLogo from "@/components/BrandLogo.vue";
import { notificationApi } from "@/api";
import { BRAND } from "@/lib/brand";

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const isCollapse = ref(localStorage.getItem("admin_sidebar_collapsed") === "1");
const unreadCount = ref(0);
const mobileMenuOpen = ref(false);
const commandOpen = ref(false);
const mainContentRef = ref<{ $el?: HTMLElement }>();
const previewMode = computed(() => import.meta.env.DEV && route.meta?.devPreview === true);
const userInitial = computed(() => (auth.user?.nickname || "管").trim().slice(0, 1));
const currentPageTitle = computed(() => String(route.meta.title || "后台主要内容"));

// 页面类型会驱动统一的信息密度与工作流布局，让历史页面也获得合适的交互骨架。
const pageKind = computed(() => {
  const path = route.path.toLowerCase();
  // 开发验收路由统一带 Preview 后缀，剔除后再参与业务类型判断。
  const name = String(route.name || "").toLowerCase().replace(/preview/g, "");
  const source = `${path} ${name}`;

  if (/bigscreen/.test(source)) return "immersive";
  if (/create|edit|editor|generation|micro-page/.test(source)) return "editor";
  if (/audit|review|approval|certification|appeal|dispute|refund/.test(source)) return "review";
  if (/dashboard|overview|analytics|report|revenue|growth|health|perf|funnel|heatmap|stats|usage/.test(source)) return "analytics";
  if (/config|settings|rules|permission|feature-flag|weight|gateway|webhook|brand/.test(source)) return "settings";
  if (route.params.id || /detail/.test(source)) return "detail";
  return "list";
});

const pageDomain = computed(() => {
  const first = route.path.split("/").filter(Boolean)[0] || "dashboard";
  if (["contents", "content", "articles", "classics", "videos", "lives", "courses"].includes(first)) return "content";
  if (["users", "member", "teacher", "creator"].includes(first)) return "people";
  if (["products", "shop", "orders", "coupons", "marketing", "bundles"].includes(first)) return "commerce";
  if (["finance", "revenue", "withdrawals", "commission-config", "platform-fee", "recharges", "gifts"].includes(first)) return "finance";
  if (["system", "system-settings", "audit-logs", "banners"].includes(first)) return "system";
  if (["ai", "knowledge", "content-generation"].includes(first)) return "ai";
  return first;
});
const mainClasses = computed(() => ({
  "is-merchant-workspace": route.path.startsWith("/merchant-backend"),
  "is-focus-workspace": route.path.includes("/edit") || route.path.includes("/create"),
}));

watch(isCollapse, (value) => {
  localStorage.setItem("admin_sidebar_collapsed", value ? "1" : "0");
});

// 路由跳转后自动收起移动端抽屉（点菜单项即关）
watch(
  () => route.fullPath,
  async () => {
    mobileMenuOpen.value = false;
    await nextTick();
    const main = mainContentRef.value?.$el;
    main?.scrollTo({ top: 0, behavior: "auto" });
  },
);

// SPA 切换到新页面时把读屏与键盘焦点交给主内容；仅查询参数变化时不抢走表单焦点。
watch(
  () => route.path,
  focusMainContent,
);

async function focusMainContent() {
  await nextTick();
  mainContentRef.value?.$el?.focus({ preventScroll: true });
}

// ───────── 工作区切换：人工工作区 ⇄ AI 自动化工作区（体验标准第三节） ─────────
const WS_KEY = "admin_workspace";
const WS_OPTIONS_FULL: Array<{ label: string; value: Workspace }> = [
  { label: "人工工作区", value: "human" },
  { label: "AI 工作区", value: "ai" },
];
// 侧栏收起（64px）时放不下文字，退化为纯图标
const WS_OPTIONS_COMPACT: Array<{ label: string; value: Workspace }> = [
  { label: "人", value: "human" },
  { label: "AI", value: "ai" },
];
const workspace = ref<Workspace>(localStorage.getItem(WS_KEY) === "ai" ? "ai" : "human");

// 菜单在 Layout 层按工作区过滤（auth.menus 构建链不动·商家后台/兜底菜单缺省归人工区）
const PREVIEW_MENUS: MenuItem[] = [
  { title: "工作台", icon: "Grid", path: "/__qa/admin-shell" },
  { title: "审核中心", icon: "Checked", children: [
    { title: "内容审核", path: "/__qa/admin-shell/workflow/review" },
    { title: "商品审核", path: "/__qa/admin-shell/workflow/review" },
    { title: "商家入驻", path: "/__qa/admin-shell/workflow/review" },
  ] },
  { title: "内容运营", icon: "Document", children: [
    { title: "圈子", path: "/__qa/admin-shell/workflow/list" },
    { title: "课程", path: "/__qa/admin-shell/workflow/editor" },
    { title: "短视频与直播", path: "/__qa/admin-shell/workflow/detail" },
  ] },
  { title: "电商", icon: "ShoppingCart", children: [
    { title: "商品", path: "/__qa/admin-shell/workflow/list" },
    { title: "订单与售后", path: "/__qa/admin-shell/workflow/detail" },
  ] },
  { title: "用户与会员", icon: "User", children: [
    { title: "用户管理", path: "/__qa/admin-shell/workflow/detail" },
    { title: "会员管理", path: "/__qa/admin-shell/workflow/analytics" },
  ] },
  { title: "数据与大屏", icon: "DataAnalysis", children: [
    { title: "管理驾驶舱", path: "/__qa/admin-shell/workflow/analytics" },
    { title: "平台综合大屏", path: "/__qa/platform-bigscreen" },
  ] },
  { title: "系统", icon: "Setting", children: [
    { title: "系统设置", path: "/__qa/admin-shell/workflow/settings" },
    { title: "角色权限", path: "/__qa/admin-shell/workflow/settings" },
  ] },
];
const visibleMenus = computed<MenuItem[]>(() => filterMenusByWorkspace(
  previewMode.value ? PREVIEW_MENUS : auth.menus,
  workspace.value,
));
const commandMenus = computed<MenuItem[]>(() => previewMode.value ? PREVIEW_MENUS : auth.menus);

watch(workspace, (ws) => {
  localStorage.setItem(WS_KEY, ws);
  // 软引导：切到 AI 工作区且当前停在人工首页时，带到 AI 工作总览（不做强制跳转）
  if (ws === "ai" && route.path === "/dashboard") {
    router.push("/ai/overview");
  }
});

// 直达 URL 进入另一工作区的页面时自动切区（菜单树与高亮跟着正确）；
// 菜单外页面（详情页等）pathWorkspace 返回 null·保持当前区不动
watch(
  () => route.path,
  (p) => {
    const ws = pathWorkspace(p);
    if (ws && ws !== workspace.value) workspace.value = ws;
  },
  { immediate: true },
);

// 面包屑完整层级：在菜单树（lib/menu-structure 分组结构·经 buildMenus 生成的 auth.menus）中
// 定位当前路由，收集祖先分组名 → "分组 / 子分组 / 当前页"；首页本身或菜单外页面回退到 meta.title
const breadcrumbTrail = computed<string[]>(() => {
  const path = route.path;
  if (path === "/dashboard") return []; // 首页只显示"首页"，不重复"工作台"
  const find = (nodes: MenuItem[], trail: string[]): string[] | null => {
    for (const n of nodes) {
      if (n.path === path) return [...trail, n.title];
      if (n.children) {
        const hit = find(n.children, [...trail, n.title]);
        if (hit) return hit;
      }
    }
    return null;
  };
  const hit = find(auth.menus, []);
  if (hit) return hit;
  const title = route.meta.title as string | undefined;
  return title && title !== "首页" ? [title] : [];
});

// ───────── 顶栏角色标签：同名合并计数 ─────────
// MERCHANT 等 store/auth.ts ROLE_LABELS 缺失的英文生肉在此兜底翻译；
// 映射真源在 store/auth.ts（本组件不改它·缺项已报主进程回填）
const EXTRA_ROLE_LABELS: Record<string, string> = {
  MERCHANT: "商家",
};
const roleTagsAll = computed<Array<{ label: string; count: number }>>(() => {
  const counts = new Map<string, number>();
  for (const raw of auth.roleLabels) {
    const label = EXTRA_ROLE_LABELS[raw] || raw;
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  return [...counts.entries()].map(([label, count]) => ({ label, count }));
});
const roleTagsInline = computed(() => roleTagsAll.value.slice(0, 2));
const roleTagsOverflow = computed(() => roleTagsAll.value.slice(2));

// ───────── 铃铛通知：我的通知下拉（GET /notifications + 已读端点） ─────────
interface NotifyItem {
  id: string;
  title: string;
  content?: string;
  isRead: boolean;
  createdAt: string;
}
const notifications = ref<NotifyItem[]>([]);
const notifyLoading = ref(false);
const notifyPage = ref(1);
const notifyTotal = ref(0);
const notifyHasMore = computed(() => notifications.value.length < notifyTotal.value);

async function fetchUnread() {
  try {
    const { data } = await notificationApi.unreadCount({ silentError: true });
    unreadCount.value = data?.unreadCount ?? data?.count ?? 0;
  } catch {
    // 顶栏轮询静默失败：不打扰工作流·下个周期自动重试
  }
}

async function fetchNotifyPage(page: number) {
  notifyLoading.value = true;
  try {
    const { data } = await notificationApi.list({ page, pageSize: 10 });
    const list: NotifyItem[] = data?.notifications ?? [];
    notifications.value = page === 1 ? list : [...notifications.value, ...list];
    notifyTotal.value = data?.total ?? list.length;
    if (typeof data?.unreadCount === "number") unreadCount.value = data.unreadCount;
    notifyPage.value = page;
  } catch {
    ElMessage.error("通知加载失败，请重试");
  } finally {
    notifyLoading.value = false;
  }
}

function loadNotifications() {
  fetchNotifyPage(1);
}

function loadMoreNotifications() {
  fetchNotifyPage(notifyPage.value + 1);
}

async function readOneNotification(n: NotifyItem) {
  if (n.isRead) return;
  try {
    await notificationApi.markRead(n.id);
    n.isRead = true;
    unreadCount.value = Math.max(0, unreadCount.value - 1);
  } catch {
    ElMessage.error("标记已读失败，请重试");
  }
}

async function markAllNotificationsRead() {
  try {
    await notificationApi.markAllRead();
    notifications.value.forEach((n) => { n.isRead = true; });
    unreadCount.value = 0;
    ElMessage.success("已全部标为已读");
  } catch {
    ElMessage.error("操作失败，请重试");
  }
}

/** 24h 内相对时间·更早显示 MM-DD HH:mm（悬浮不另做·列表场景够用） */
function humanTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return "刚刚";
  if (diffMin < 60) return `${diffMin}分钟前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}小时前`;
  const p = (x: number) => String(x).padStart(2, "0");
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

let unreadTimer: ReturnType<typeof setInterval> | null = null;

onMounted(async () => {
  if (previewMode.value) return;
  try {
    if (!auth.user) await auth.fetchProfile();
    if (auth.menus.length === 0) await auth.fetchMenus();
    fetchUnread();
    unreadTimer = setInterval(fetchUnread, 60000);
  } catch {
    router.push("/login");
  }
});

onUnmounted(() => {
  if (unreadTimer) clearInterval(unreadTimer);
  unreadTimer = null;
});

async function logout() {
  // 二次确认：后台一键退出会丢当前工作现场·误触成本高（体验标准第七节 L1）
  try {
    await ElMessageBox.confirm("确定要退出登录吗？", "退出登录", {
      confirmButtonText: "退出",
      cancelButtonText: "取消",
      type: "warning",
    });
  } catch {
    return; // 用户取消
  }
  auth.logout();
  // 硬跳转整页重载到登录页：彻底清空内存态（避免 router.push 在某些状态下不生效导致"退不干净"）
  window.location.href = import.meta.env.BASE_URL + "login";
}
</script>

<style scoped>
.layout {
  height: 100vh;
  background: var(--color-bg-page);
  color: var(--color-text-body);
}
.skip-link {
  position: fixed;
  top: 10px;
  left: 12px;
  z-index: 4000;
  padding: 9px 14px;
  border-radius: var(--radius-md);
  background: #fff;
  color: var(--color-primary);
  box-shadow: var(--shadow-lg);
  font-weight: 600;
  transform: translateY(calc(-100% - 18px));
  transition: transform var(--transition-fast);
}
.skip-link:focus-visible { transform: translateY(0); }

/* ═══════════════════════ 侧边栏 ═══════════════════════ */
.aside {
  background: var(--gradient-dark);
  transition: width var(--transition-base);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 8px 0 32px rgba(8, 24, 40, 0.12);
  position: relative;
  z-index: 20;
}
/* 侧边栏顶部金线 */
.aside::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  width: 72px;
  height: 2px;
  right: auto;
  background: linear-gradient(90deg, #d6b36e, rgba(214, 179, 110, 0));
  z-index: 1;
}

/* ── 品牌区 ── */
.brand {
  display: flex;
  align-items: center;
  padding: 22px 18px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  gap: 10px;
  cursor: default;
  user-select: none;
  min-height: 72px;
}

/* ── 工作区切换（人工 ⇄ AI·暗色侧栏适配） ── */
.ws-switch {
  padding: 12px 14px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.065);
}
.ws-segmented {
  --el-segmented-bg-color: rgba(3, 13, 24, 0.42);
  --el-segmented-item-selected-bg-color: rgba(255, 255, 255, 0.14);
  --el-segmented-item-selected-color: #fff;
  --el-segmented-color: rgba(235, 241, 247, 0.62);
  --el-segmented-item-hover-color: #fff;
  --el-segmented-item-hover-bg-color: rgba(255, 255, 255, 0.08);
  --el-segmented-item-active-bg-color: rgba(255, 255, 255, 0.12);
  --el-border-radius-base: var(--radius-md);
}
.ws-segmented :deep(.el-segmented__item-label) {
  font-size: 12px;
  white-space: nowrap;
}
/* AI 工作区可感知标识：数字员工车间提示条 */
.ws-ai-hint {
  margin-top: 8px;
  padding: 4px 8px;
  border-radius: var(--radius-md);
  background: linear-gradient(90deg, rgba(67, 178, 255, 0.13), rgba(67, 178, 255, 0.035));
  border: 1px solid rgba(95, 190, 255, 0.18);
  color: #9ed8ff;
  font-size: 11px;
  line-height: 1.6;
  text-align: center;
  user-select: none;
}

/* ── 菜单区 ── */
.menu-scroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 10px 4px;
}
.menu-scroll::-webkit-scrollbar { width: 3px; }
.menu-scroll::-webkit-scrollbar-thumb {
  background: rgba(201, 169, 110, 0.15);
  border-radius: var(--radius-full);
}

/* 深层定制 el-menu 无背景 */
.menu-scroll :deep(.el-menu) {
  background: transparent !important;
}
.menu-scroll :deep(.el-menu-item) {
  margin: 3px 8px;
  border-radius: 10px;
  height: 42px;
  line-height: 42px;
  font-size: var(--font-size-body);
  transition: all var(--transition-base);
}
.menu-scroll :deep(.el-menu-item:hover) {
  background: rgba(255, 255, 255, 0.065) !important;
  color: #fff !important;
}
.menu-scroll :deep(.el-menu-item.is-active) {
  background: linear-gradient(100deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.065) 100%) !important;
  color: #fff !important;
  font-weight: 600;
  border-right: 0 !important;
  box-shadow: inset 2px 0 0 #d2ad67, 0 8px 22px rgba(0, 0, 0, 0.08);
}
.menu-scroll :deep(.el-sub-menu__title) {
  margin: 2px 8px;
  border-radius: 10px;
  height: 42px;
  line-height: 42px;
  font-size: var(--font-size-body);
  transition: all var(--transition-base);
}
.menu-scroll :deep(.el-sub-menu__title:hover) {
  background: rgba(255, 255, 255, 0.055) !important;
  color: #fff !important;
}
/* 子菜单展开区域 */
.menu-scroll :deep(.el-menu--inline) {
  background: rgba(2, 12, 23, 0.2) !important;
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
  margin-left: 8px;
}
.menu-scroll :deep(.el-menu--inline .el-menu-item) {
  padding-left: 56px !important;
  font-size: var(--font-size-caption);
  height: 38px;
  line-height: 38px;
}

/* ── 底部收缩钮 ── */
.aside-footer {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 14px;
  border-right: 0;
  border-bottom: 0;
  border-left: 0;
  background: transparent;
  border-top: 1px solid rgba(255, 255, 255, 0.065);
  cursor: pointer;
  color: rgba(255, 255, 255, 0.35);
  font-size: var(--font-size-caption);
  font-family: var(--font-family);
  transition: all var(--transition-base);
  user-select: none;
}
.aside-footer:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.045);
}
.collapse-icon {
  font-size: 16px;
  transition: transform var(--transition-base);
}
/* hover 时箭头朝动作方向微移：展开态(«)向左示意收起·收起态(»)向右示意展开
   （原来把 JS 三元写进了 CSS 值·整条规则无效·改为 .is-collapsed class 绑定） */
.aside-footer:hover .collapse-icon {
  transform: translateX(-4px);
}
.aside-footer.is-collapsed:hover .collapse-icon {
  transform: translateX(4px);
}

/* ═══════════════════════ 顶栏 ═══════════════════════ */
.el-header {
  height: var(--header-height) !important;
  background: rgba(255, 255, 255, 0.82);
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(216, 222, 231, 0.86);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.8);
  padding: 0 28px;
  z-index: 10;
  position: relative;
  backdrop-filter: saturate(150%) blur(18px);
}

.header-left {
  display: flex;
  align-items: center;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* 移动端菜单开关：桌面端隐藏——此前无任何样式，桌面顶栏面包屑前裸渲染一个"☰"（2026-07-15 走查修） */
.mobile-toggle {
  display: none;
  font-size: 20px;
  line-height: 1;
  margin-right: var(--spacing-sm);
  cursor: pointer;
  color: var(--color-text-secondary);
  width: 40px;
  height: 40px;
  padding: 0;
  border: 0;
  border-radius: var(--radius-md);
  background: transparent;
}
@media (max-width: 768px) {
  .mobile-toggle { display: block; }
  /* 移动端隐藏固定侧栏（220px 会挤没内容区）·菜单改走 ☰ 抽屉·桌面布局零变化 */
  .aside { display: none; }
}

/* ── 移动端抽屉菜单（复用侧栏暗色视觉·未 append-to-body 故 :deep 可达）
   兼容 class 落在抽屉面板或 overlay 两种版本行为 ── */
:deep(.el-drawer.mobile-drawer),
:deep(.mobile-drawer .el-drawer) {
  background: var(--gradient-dark);
}
:deep(.mobile-drawer .el-drawer__body) {
  padding: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.mobile-menu-scroll {
  flex: 1;
  overflow-y: auto;
}

/* 面包屑 */
.breadcrumb-home {
  color: var(--color-text-secondary);
  font-size: var(--font-size-caption);
  transition: color var(--transition-fast);
}
.breadcrumb-home:hover {
  color: var(--color-primary);
}
.breadcrumb-group {
  color: var(--color-text-secondary);
  font-size: var(--font-size-caption);
  cursor: default;
}
.breadcrumb-current {
  color: var(--color-text-title);
  font-size: var(--font-size-caption);
  font-weight: 650;
}
:deep(.el-breadcrumb__separator) {
  margin: 0 9px;
  color: #b0b8c3;
  font-weight: 400;
}
/* 面包屑项间距 */
:deep(.el-breadcrumb__item) {
  display: inline-flex;
  align-items: center;
}

/* 角色标签 */
.role-tag {
  border-color: rgba(184, 137, 63, 0.22);
  color: #765321;
  background: rgba(184, 137, 63, 0.075);
  font-weight: 500;
}

/* 全局目录索引：大后台的主导航捷径 */
.command-trigger {
  height: 38px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-width: 178px;
  padding: 0 8px 0 12px;
  border: 1px solid #dfe4eb;
  border-radius: 11px;
  background: rgba(245, 247, 249, 0.9);
  color: var(--color-text-secondary);
  font: 12px/1 var(--font-family);
  cursor: pointer;
  transition: border-color var(--transition-fast), background var(--transition-fast), color var(--transition-fast);
}
.command-trigger:hover {
  border-color: #bec8d4;
  background: #fff;
  color: var(--color-text-title);
}
.command-trigger-icon { color: #66788d; font-size: 16px; }
.command-trigger kbd {
  padding: 2px 5px;
  border: 1px solid var(--color-divider);
  border-bottom-width: 2px;
  border-radius: 4px;
  background: rgba(255,255,255,.8);
  color: var(--color-text-secondary);
  font: 10px/1.4 var(--font-family);
}
@media (max-width: 1080px) {
  .command-trigger-label,
  .command-trigger kbd { display: none; }
  .command-trigger { width: 34px; justify-content: center; padding: 0; }
}

/* 通知 */
.notify-btn {
  width: 38px;
  height: 38px;
  padding: 0;
  border-radius: 11px;
  color: #647184;
  font-size: 17px;
  background: #f5f7f9;
}
.notify-badge :deep(.el-badge__content) {
  background: var(--color-primary);
  border: none;
}

.account-trigger {
  display: grid;
  grid-template-columns: 32px minmax(0, auto) 14px;
  align-items: center;
  gap: 9px;
  min-height: 42px;
  padding: 4px 8px 4px 5px;
  border: 0;
  border-radius: 12px;
  color: var(--color-text-title);
  background: transparent;
  cursor: pointer;
  transition: background var(--transition-fast);
}
.account-trigger:hover { background: #f1f3f6; }
.account-avatar {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 10px;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  background: linear-gradient(145deg, #294e70, #12243a);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.14);
}
.account-copy { display: flex; flex-direction: column; align-items: flex-start; min-width: 0; }
.account-copy b { max-width: 92px; overflow: hidden; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.account-copy small { margin-top: 1px; color: #7d8998; font-size: 10px; }
.account-copy small::before { display: inline-block; width: 5px; height: 5px; margin-right: 4px; border-radius: 50%; background: #22a06b; content: ""; }
.account-chevron { color: #9aa3af; font-size: 11px; }

/* ═══════════════════════ 主内容区 ═══════════════════════ */
.el-main {
  background:
    radial-gradient(circle at 10% 0%, rgba(43, 86, 129, 0.045), transparent 27%),
    linear-gradient(180deg, #f3f5f8 0, #f7f8fa 100%);
  --workspace-gutter: clamp(20px, 2.2vw, 36px);
  padding: 28px var(--workspace-gutter) 40px;
  min-height: 0;
  scroll-behavior: smooth;
}
.el-main.is-merchant-workspace { padding: 0; }
.el-main.is-focus-workspace { background: #eef1f5; }

.el-menu--collapse { width: var(--sidebar-collapsed-width); }

/* 折叠时品牌居中 */
.aside:has(.el-menu--collapse) .brand {
  justify-content: center;
  padding: 20px 12px;
}

@media (max-width: 1100px) {
  .role-tag { display: none; }
  .account-copy, .account-chevron { display: none; }
  .account-trigger { grid-template-columns: 32px; padding: 4px; }
}

@media (max-width: 768px) {
  .el-header { padding: 0 14px; }
  .el-main { --workspace-gutter: 14px; padding: 18px var(--workspace-gutter) 30px; }
  .command-trigger { min-width: 38px; }
  .breadcrumb-group, .breadcrumb-sep { display: none; }
}
</style>

<!-- 铃铛通知下拉：popover 内容 teleport 到 body·scoped 样式够不到，故用全局块 + popper-class 圈定 -->
<style>
.notify-popper .notify-panel {
  margin: -4px 0;
}
.notify-popper .notify-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 4px 8px;
  border-bottom: 1px solid var(--color-divider, #ebeef5);
}
.notify-popper .notify-head-title {
  font-weight: 600;
  font-size: 14px;
  color: var(--color-text-title, #303133);
}
.notify-popper .notify-list {
  max-height: 360px;
  overflow-y: auto;
  min-height: 60px;
}
.notify-popper .notify-empty {
  padding: 28px 0;
  text-align: center;
  color: var(--color-text-secondary, #909399);
  font-size: 13px;
}
.notify-popper .notify-item {
  width: 100%;
  display: flex;
  gap: 8px;
  padding: 10px 4px;
  cursor: pointer;
  border-top: 0;
  border-right: 0;
  border-left: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  border-bottom: 1px solid var(--color-divider, #f2f3f5);
  transition: background 0.15s;
}
.notify-popper .notify-item:last-child {
  border-bottom: none;
}
.notify-popper .notify-item:hover {
  background: rgba(201, 169, 110, 0.06);
}
.notify-popper .notify-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 6px;
  background: transparent;
}
.notify-popper .notify-item.is-unread .notify-dot {
  background: var(--color-primary, #c41e3a);
}
.notify-popper .notify-body {
  flex: 1;
  min-width: 0;
}
.notify-popper .notify-item-title {
  font-size: 13px;
  color: var(--color-text-title, #303133);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.notify-popper .notify-item.is-unread .notify-item-title {
  font-weight: 600;
}
.notify-popper .notify-item-content {
  font-size: 12px;
  color: var(--color-text-secondary, #909399);
  margin-top: 2px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.notify-popper .notify-item-time {
  font-size: 11px;
  color: var(--color-text-secondary, #c0c4cc);
  margin-top: 4px;
}
.notify-popper .notify-foot {
  text-align: center;
  padding-top: 6px;
  border-top: 1px solid var(--color-divider, #ebeef5);
}
</style>
