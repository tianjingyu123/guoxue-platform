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
          <SidebarMenu :items="auth.menus" />
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
          <el-tag
            v-for="label in auth.roleLabels"
            :key="label"
            size="small"
            effect="plain"
            class="role-tag"
          >
            {{ label }}
          </el-tag>
          <el-badge
            :value="unreadCount"
            :hidden="unreadCount === 0"
            :max="99"
            class="notify-badge"
          >
            <el-button
              text
              class="notify-btn"
              @click="goNotifications"
            >
              🔔
            </el-button>
          </el-badge>
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
      <div class="menu-scroll mobile-menu-scroll">
        <el-menu
          router
          :default-active="route.path"
          background-color="transparent"
          text-color="rgba(255,255,255,0.6)"
          active-text-color="#C9A96E"
        >
          <SidebarMenu :items="auth.menus" />
        </el-menu>
      </div>
    </el-drawer>

    <!-- 全局悬浮运营助手（答疑指导 + 反馈问题） -->
    <AdminAssistant />
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore, type MenuItem } from "@/store/auth";
import SidebarMenu from "@/components/SidebarMenu.vue";
import AdminAssistant from "@/components/AdminAssistant.vue";
import ConnectionStatus from "@/components/ConnectionStatus.vue";
import BrandLogo from "@/components/BrandLogo.vue";
import { api } from "@/api";
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

async function fetchUnread() {
  try {
    const { data } = await api.get("/notifications/unread-count");
    unreadCount.value = data?.count ?? data?.unreadCount ?? 0;
  } catch {}
}

function goNotifications() {
  router.push('/notifications')
}

onMounted(async () => {
  try {
    await auth.fetchProfile();
    await auth.fetchMenus();
    fetchUnread();
    setInterval(fetchUnread, 60000)
  } catch {
    router.push("/login");
  }
});

function logout() {
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
