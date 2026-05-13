<template>
  <el-container class="layout">
    <el-aside :width="isCollapse ? '64px' : '220px'" class="aside">
      <div class="logo">
        <span v-if="!isCollapse">🏮 热卜国学</span>
        <span v-else>🏮</span>
      </div>
      <div class="menu-scroll">
        <el-menu
          router
          :default-active="route.path"
          :collapse="isCollapse"
          background-color="#1a1a1a"
          text-color="#bfcbd9"
          active-text-color="#C9A96E"
        >
          <SidebarMenu :items="auth.menus" />
        </el-menu>
      </div>
    </el-aside>

    <el-container>
      <el-header>
        <div class="header-left">
          <el-button text @click="isCollapse = !isCollapse">
            {{ isCollapse ? '☰' : '✕' }}
          </el-button>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/dashboard' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item v-if="route.meta.title">{{ route.meta.title }}</el-breadcrumb-item>
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
          <el-badge :value="unreadCount" :hidden="unreadCount === 0" :max="99">
            <el-button text @click="goNotifications" style="font-size:18px">🔔</el-button>
          </el-badge>
          <span class="nickname">{{ auth.user?.nickname }}</span>
          <el-button text type="danger" @click="logout">退出</el-button>
        </div>
      </el-header>
      <el-main>
        <router-view v-slot="{ Component }">
          <transition name="fade-slide" mode="out-in">
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
.layout { height: 100vh; }
.aside {
  background: #1a1a1a;
  transition: width 0.2s;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.menu-scroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}
.menu-scroll::-webkit-scrollbar { width: 4px; }
.menu-scroll::-webkit-scrollbar-thumb { background: rgba(201, 169, 110, 0.3); border-radius: 2px; }
.logo {
  color: #C9A96E;
  text-align: center;
  padding: 18px 12px;
  font-size: 18px;
  font-weight: bold;
  letter-spacing: 2px;
  border-bottom: 1px solid rgba(201, 169, 110, 0.15);
  white-space: nowrap;
}
.el-header {
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #E8E0D5;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  padding: 0 20px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.nickname {
  color: #333;
  font-size: 14px;
}
.el-main { background: #F5F0E8; }

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.25s ease;
}
.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.el-menu--collapse {
  width: 64px;
}
</style>
