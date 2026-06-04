<template>
  <el-container class="layout">
    <ConnectionStatus />
    <el-aside
      :width="isCollapse ? '64px' : '220px'"
      class="aside"
    >
      <div class="logo">
        <span
          v-if="!isCollapse"
          class="logo-full"
        >🏮 热卜国学</span>
        <span
          v-else
          class="logo-icon"
        >🏮</span>
      </div>
      <div class="menu-scroll">
        <el-menu
          router
          :default-active="route.path"
          :collapse="isCollapse"
          background-color="#1A1A2E"
          text-color="rgba(255,255,255,0.65)"
          active-text-color="#C9A96E"
        >
          <SidebarMenu :items="auth.menus" />
        </el-menu>
      </div>
    </el-aside>

    <el-container>
      <el-header>
        <div class="header-left">
          <el-button
            text
            @click="isCollapse = !isCollapse"
          >
            {{ isCollapse ? '☰' : '✕' }}
          </el-button>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/dashboard' }">
              首页
            </el-breadcrumb-item>
            <el-breadcrumb-item v-if="route.meta.title">
              {{ route.meta.title }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-tag
            v-for="label in auth.roleLabels"
            :key="label"
            size="small"
            effect="plain"
            style="margin-right: 6px;"
          >
            {{ label }}
          </el-tag>
          <el-badge
            :value="unreadCount"
            :hidden="unreadCount === 0"
            :max="99"
          >
            <el-button
              text
              style="font-size:18px"
              @click="goNotifications"
            >
              🔔
            </el-button>
          </el-badge>
          <span class="nickname">{{ auth.user?.nickname }}</span>
          <el-button
            text
            type="danger"
            @click="logout"
          >
            退出
          </el-button>
        </div>
      </el-header>
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
  </el-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "@/store/auth";
import SidebarMenu from "@/components/SidebarMenu.vue";
import ConnectionStatus from "@/components/ConnectionStatus.vue";
import { api } from "@/api";

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const isCollapse = ref(false);
const unreadCount = ref(0);

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
    // 每 60s 轮询未读通知数
    setInterval(fetchUnread, 60000)
  } catch {
    router.push("/login");
  }
});

function logout() {
  auth.logout();
  router.push("/login");
}
</script>

<style scoped>
.layout {
  height: 100vh;
  background: var(--color-bg-page);
}

/* ── 侧边栏 ── */
.aside {
  background: var(--color-bg-dark);
  transition: width 0.2s ease;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 2px 0 16px rgba(0, 0, 0, 0.08);
}

.logo {
  color: var(--color-gold);
  text-align: center;
  padding: 18px 12px;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 2px;
  border-bottom: 1px solid rgba(201, 169, 110, 0.12);
  white-space: nowrap;
  user-select: none;
}
.logo-icon { font-size: 20px; }

.menu-scroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: var(--spacing-sm) 0;
}
.menu-scroll::-webkit-scrollbar { width: 4px; }
.menu-scroll::-webkit-scrollbar-thumb {
  background: rgba(201, 169, 110, 0.2);
  border-radius: var(--radius-full);
}

/* ── 顶栏 ── */
.el-header {
  height: var(--header-height) !important;
  background: var(--color-bg-card);
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--color-divider);
  box-shadow: var(--shadow-sm);
  padding: 0 var(--spacing-xl);
  z-index: 10;
}
.header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}
.header-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}
.nickname {
  color: var(--color-text-title);
  font-size: var(--font-size-body);
  font-weight: 500;
}

/* ── 主内容 ── */
.el-main {
  background: var(--color-bg-page);
  padding: var(--spacing-xl);
  min-height: 0;
}

.el-menu--collapse { width: var(--sidebar-collapsed-width); }

/* ── 页面过渡已移入 global.css ── */
</style>
