<template>
  <el-container class="layout">
    <ConnectionStatus />
    <el-aside
      :width="isCollapse ? '64px' : '220px'"
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
          AI 数字员工车间 · 自动执行 + 人工兜底
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
      <div
        class="aside-footer"
        :class="{ 'is-collapsed': isCollapse }"
        @click="isCollapse = !isCollapse"
      >
        <span class="collapse-icon">{{ isCollapse ? '»' : '«' }}</span>
        <span
          v-if="!isCollapse"
          class="collapse-text"
        >收起菜单</span>
      </div>
    </el-aside>

    <el-container>
      <!-- 顶栏 -->
      <el-header>
        <div class="header-left">
          <div class="mobile-toggle" @click="mobileMenuOpen = !mobileMenuOpen">
            <span v-if="!mobileMenuOpen">☰</span><span v-else>✕</span>
          </div>
          <el-breadcrumb separator="">
            <el-breadcrumb-item :to="{ path: '/dashboard' }">
              <span class="breadcrumb-home">首页</span>
            </el-breadcrumb-item>
            <!-- 完整层级：分组 / 子分组 / 当前页（来自菜单树·分组名不可点，当前页高亮） -->
            <template
              v-for="(seg, i) in breadcrumbTrail"
              :key="i"
            >
              <span class="breadcrumb-sep">/</span>
              <el-breadcrumb-item>
                <span :class="i === breadcrumbTrail.length - 1 ? 'breadcrumb-current' : 'breadcrumb-group'">{{ seg }}</span>
              </el-breadcrumb-item>
            </template>
          </el-breadcrumb>
        </div>
        <div class="header-right">
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
                >
                  🔔
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
                <div
                  v-for="n in notifications"
                  :key="n.id"
                  class="notify-item"
                  :class="{ 'is-unread': !n.isRead }"
                  @click="readOneNotification(n)"
                >
                  <span class="notify-dot" />
                  <div class="notify-body">
                    <div class="notify-item-title">{{ n.title }}</div>
                    <div
                      v-if="n.content"
                      class="notify-item-content"
                    >{{ n.content }}</div>
                    <div class="notify-item-time">{{ humanTime(n.createdAt) }}</div>
                  </div>
                </div>
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
          <span class="nickname">{{ auth.user?.nickname }}</span>
          <el-button
            text
            class="logout-btn"
            @click="logout"
          >
            退出
          </el-button>
        </div>
      </el-header>

      <!-- 主内容区 -->
      <el-main>
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
          AI 数字员工车间 · 自动执行 + 人工兜底
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
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { useAuthStore, type MenuItem } from "@/store/auth";
import { filterMenusByWorkspace, pathWorkspace, type Workspace } from "@/lib/menu-structure";
import SidebarMenu from "@/components/SidebarMenu.vue";
import AdminAssistant from "@/components/AdminAssistant.vue";
import ConnectionStatus from "@/components/ConnectionStatus.vue";
import BrandLogo from "@/components/BrandLogo.vue";
import { notificationApi } from "@/api";
import { BRAND } from "@/lib/brand";

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const isCollapse = ref(false);
const unreadCount = ref(0);
const mobileMenuOpen = ref(false);

// 路由跳转后自动收起移动端抽屉（点菜单项即关）
watch(
  () => route.fullPath,
  () => { mobileMenuOpen.value = false; },
);

// ───────── 工作区切换：人工工作区 ⇄ AI 自动化工作区（体验标准第三节） ─────────
const WS_KEY = "admin_workspace";
const WS_OPTIONS_FULL: Array<{ label: string; value: Workspace }> = [
  { label: "👤 人工工作区", value: "human" },
  { label: "🤖 AI 工作区", value: "ai" },
];
// 侧栏收起（64px）时放不下文字，退化为纯图标
const WS_OPTIONS_COMPACT: Array<{ label: string; value: Workspace }> = [
  { label: "👤", value: "human" },
  { label: "🤖", value: "ai" },
];
const workspace = ref<Workspace>(localStorage.getItem(WS_KEY) === "ai" ? "ai" : "human");

// 菜单在 Layout 层按工作区过滤（auth.menus 构建链不动·商家后台/兜底菜单缺省归人工区）
const visibleMenus = computed<MenuItem[]>(() => filterMenusByWorkspace(auth.menus, workspace.value));

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
    const { data } = await notificationApi.unreadCount();
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
  try {
    await auth.fetchProfile();
    await auth.fetchMenus();
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
}

/* ═══════════════════════ 侧边栏 ═══════════════════════ */
.aside {
  background: var(--gradient-dark);
  transition: width var(--transition-base);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 2px 0 24px rgba(0, 0, 0, 0.15);
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
  height: 2px;
  background: var(--gradient-gold);
  z-index: 1;
}

/* ── 品牌区 ── */
.brand {
  display: flex;
  align-items: center;
  padding: 20px 16px;
  border-bottom: 1px solid rgba(201, 169, 110, 0.1);
  gap: 10px;
  cursor: default;
  user-select: none;
  min-height: 64px;
}

/* ── 工作区切换（人工 ⇄ AI·暗色侧栏适配） ── */
.ws-switch {
  padding: 10px 12px 8px;
  border-bottom: 1px solid rgba(201, 169, 110, 0.1);
}
.ws-segmented {
  --el-segmented-bg-color: rgba(0, 0, 0, 0.28);
  --el-segmented-item-selected-bg-color: rgba(201, 169, 110, 0.85);
  --el-segmented-item-selected-color: #1a1a1a;
  --el-segmented-color: rgba(255, 255, 255, 0.65);
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
  background: linear-gradient(90deg, rgba(201, 169, 110, 0.18), rgba(201, 169, 110, 0.04));
  border: 1px solid rgba(201, 169, 110, 0.25);
  color: var(--color-gold);
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
  padding: var(--spacing-sm) 0;
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
  margin: 2px 8px;
  border-radius: var(--radius-md);
  height: 44px;
  line-height: 44px;
  font-size: var(--font-size-body);
  transition: all var(--transition-base);
}
.menu-scroll :deep(.el-menu-item:hover) {
  background: rgba(201, 169, 110, 0.08) !important;
  color: var(--color-gold) !important;
}
.menu-scroll :deep(.el-menu-item.is-active) {
  background: linear-gradient(90deg, rgba(201, 169, 110, 0.18) 0%, rgba(201, 169, 110, 0.02) 100%) !important;
  color: var(--color-gold) !important;
  font-weight: 600;
  border-right: 3px solid var(--color-gold);
}
.menu-scroll :deep(.el-sub-menu__title) {
  margin: 2px 8px;
  border-radius: var(--radius-md);
  height: 44px;
  line-height: 44px;
  font-size: var(--font-size-body);
  transition: all var(--transition-base);
}
.menu-scroll :deep(.el-sub-menu__title:hover) {
  background: rgba(201, 169, 110, 0.06) !important;
  color: var(--color-gold) !important;
}
/* 子菜单展开区域 */
.menu-scroll :deep(.el-menu--inline) {
  background: rgba(0, 0, 0, 0.15) !important;
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
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 14px;
  border-top: 1px solid rgba(201, 169, 110, 0.08);
  cursor: pointer;
  color: rgba(255, 255, 255, 0.35);
  font-size: var(--font-size-caption);
  transition: all var(--transition-base);
  user-select: none;
}
.aside-footer:hover {
  color: var(--color-gold);
  background: rgba(201, 169, 110, 0.04);
}
.collapse-icon {
  font-size: 14px;
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
  background: var(--color-bg-card);
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--color-divider);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
  padding: 0 var(--spacing-xl);
  z-index: 10;
  position: relative;
}

.header-left {
  display: flex;
  align-items: center;
}
.header-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

/* 移动端菜单开关：桌面端隐藏——此前无任何样式，桌面顶栏面包屑前裸渲染一个"☰"（2026-07-15 走查修） */
.mobile-toggle {
  display: none;
  font-size: 20px;
  line-height: 1;
  margin-right: var(--spacing-sm);
  cursor: pointer;
  color: var(--color-text-secondary);
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
.breadcrumb-sep {
  margin: 0 8px;
  color: var(--color-divider);
  font-size: var(--font-size-small);
}
.breadcrumb-group {
  color: var(--color-text-secondary);
  font-size: var(--font-size-caption);
  cursor: default;
}
.breadcrumb-current {
  color: var(--color-text-title);
  font-size: var(--font-size-caption);
  font-weight: 500;
}
/* 去除默认分隔符 */
:deep(.el-breadcrumb__separator) {
  display: none;
}
/* 面包屑项间距 */
:deep(.el-breadcrumb__item) {
  display: inline-flex;
  align-items: center;
}

/* 角色标签 */
.role-tag {
  border-color: var(--color-gold);
  color: var(--color-gold-dark);
  background: var(--color-gold-lighter);
  font-weight: 500;
}

/* 通知 */
.notify-btn {
  font-size: 18px;
  padding: 4px;
}
.notify-badge :deep(.el-badge__content) {
  background: var(--color-primary);
  border: none;
}

/* 用户昵称 */
.nickname {
  color: var(--color-text-title);
  font-size: var(--font-size-body);
  font-weight: 500;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 退出按钮 */
.logout-btn {
  color: var(--color-text-secondary);
  font-size: var(--font-size-caption);
}
.logout-btn:hover {
  color: var(--color-primary);
}

/* ═══════════════════════ 主内容区 ═══════════════════════ */
.el-main {
  background:
    var(--paper-texture),
    var(--color-bg-page);
  padding: var(--spacing-xl);
  min-height: 0;
}

.el-menu--collapse { width: var(--sidebar-collapsed-width); }

/* 折叠时品牌居中 */
.aside:has(.el-menu--collapse) .brand {
  justify-content: center;
  padding: 20px 12px;
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
  display: flex;
  gap: 8px;
  padding: 10px 4px;
  cursor: pointer;
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
