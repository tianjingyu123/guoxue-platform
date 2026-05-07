<template>
  <view class="page">
    <!-- 未登录：登录按钮 + 登录弹窗 -->
    <view v-if="!userStore.isLogin" class="user-card unlogin">
      <button class="login-btn" @click="showLogin = true">登录 / 注册</button>
      <text class="login-tip">登录后享受更多国学内容</text>
    </view>

    <!-- 已登录：用户信息 -->
    <view v-if="userStore.isLogin" class="user-card">
      <image
        class="avatar"
        :src="userStore.userAvatar || '/static/default-avatar.png'"
        mode="aspectFill"
      />
      <text class="nickname">{{ userStore.userNickname || '国学爱好者' }}</text>
      <text v-if="userStore.user?.phone" class="phone">{{ userStore.user.phone }}</text>
    </view>

    <!-- 会员信息卡片 -->
    <view v-if="userStore.isLogin" class="vip-card">
      <view class="vip-left">
        <text class="vip-label" :class="{ active: userStore.isVip }">
          {{ userStore.isVip ? 'VIP会员' : '普通用户' }}
        </text>
        <text v-if="userStore.isVip && userStore.user?.vipExpireAt" class="vip-expire">
          到期时间：{{ formatDate(userStore.user.vipExpireAt) }}
        </text>
        <text v-else class="vip-expire">开通会员解锁更多内容</text>
      </view>
      <view v-if="!userStore.isVip" class="vip-right">
        <text class="vip-upgrade" @click="goVip">开通</text>
      </view>
    </view>

    <!-- 功能菜单列表 -->
    <view class="menu">
      <view class="menu-item" @click="goPage('/pages/favorites/favorites')">
        <text class="menu-icon">⭐</text>
        <text class="menu-label">我的收藏</text>
        <text class="arrow">›</text>
      </view>
      <view class="menu-item" @click="goPage('/pages/courses/courses')">
        <text class="menu-icon">📚</text>
        <text class="menu-label">学习记录</text>
        <text class="arrow">›</text>
      </view>
      <view class="menu-item" @click="goPage('/pages/circles/circles')">
        <text class="menu-icon">👥</text>
        <text class="menu-label">我的圈子</text>
        <text class="arrow">›</text>
      </view>
      <view class="menu-item" @click="goPage('/pages/classics/classics')">
        <text class="menu-icon">📜</text>
        <text class="menu-label">阅读记录</text>
        <text class="arrow">›</text>
      </view>
      <view class="menu-item" @click="goPage('/pages/bazi/bazi')">
        <text class="menu-icon">☯</text>
        <text class="menu-label">八字排盘</text>
        <text class="arrow">›</text>
      </view>
      <view class="menu-item" @click="goPage('/pages/notifications/notifications')">
        <text class="menu-icon">🔔</text>
        <text class="menu-label">消息通知</text>
        <text v-if="unreadCount > 0" class="badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</text>
        <text class="arrow">›</text>
      </view>
    </view>

    <!-- 退出登录 -->
    <view v-if="userStore.isLogin" class="logout-btn" @click="handleLogout">退出登录</view>

    <!-- ========== 登录弹窗 ========== -->
    <view v-if="showLogin" class="modal-overlay" @click="showLogin = false">
      <view class="modal-content" @click.stop>
        <text class="modal-title">登录</text>
        <input
          v-model="loginForm.phone"
          class="modal-input"
          placeholder="手机号"
          type="text"
          maxlength="11"
        />
        <input
          v-model="loginForm.password"
          class="modal-input"
          placeholder="密码"
          type="password"
        />
        <view v-if="loginError" class="login-error">{{ loginError }}</view>
        <button
          class="modal-btn"
          :disabled="loginLoading || !loginForm.phone || !loginForm.password"
          :loading="loginLoading"
          @click="handleLogin"
        >登录</button>
        <text class="modal-cancel" @click="showLogin = false">取消</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onShow } from "vue";
import { useUserStore } from "../../store/user";
import { notifyApi } from "../../api";

const userStore = useUserStore();

const showLogin = ref(false);
const loginLoading = ref(false);
const loginError = ref("");
const loginForm = ref({
  phone: "",
  password: "",
});

const unreadCount = ref(0);

onMounted(() => {
  if (userStore.isLogin) {
    userStore.fetchProfile();
    fetchUnreadCount();
  }
});

// onShow 每次页面显示时刷新数据
onShow(() => {
  if (userStore.isLogin) {
    fetchUnreadCount();
  }
});

async function fetchUnreadCount() {
  try {
    const res = await notifyApi.unreadCount();
    unreadCount.value = (res as any).count ?? (res as any) ?? 0;
  } catch {
    unreadCount.value = 0;
  }
}

/* ==================== 登录 ==================== */

async function handleLogin() {
  if (!loginForm.value.phone.trim() || !loginForm.value.password.trim()) return;
  loginLoading.value = true;
  loginError.value = "";
  try {
    await userStore.login(loginForm.value.phone.trim(), loginForm.value.password);
    showLogin.value = false;
    loginForm.value = { phone: "", password: "" };
    fetchUnreadCount();
    uni.showToast({ title: "登录成功", icon: "success" });
  } catch (e: any) {
    loginError.value = e.errMsg || e.message || "登录失败，请重试";
  } finally {
    loginLoading.value = false;
  }
}

/* ==================== 退出登录 ==================== */

async function handleLogout() {
  uni.showModal({
    title: "提示",
    content: "确定要退出登录吗？",
    success: (res) => {
      if (res.confirm) {
        userStore.logout();
      }
    },
  });
}

/* ==================== 导航 ==================== */

function goPage(url: string) {
  if (!userStore.isLogin) {
    showLogin.value = true;
    return;
  }
  uni.navigateTo({ url });
}

function goVip() {
  uni.navigateTo({ url: "/pages/vip/vip" });
}

/* ==================== 工具 ==================== */

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
</script>

<style>
.page { padding: 12px; background: #f5f0e6; min-height: 100vh; padding-bottom: 40px; }

/* ========== 用户卡片 ========== */
.user-card {
  background: linear-gradient(135deg, #8b4513, #c4943a);
  border-radius: 12px; padding: 28px; text-align: center; margin-bottom: 12px;
}
.user-card.unlogin { padding: 36px 28px; }
.avatar {
  width: 72px; height: 72px; border-radius: 50%;
  background: rgba(255,255,255,0.3); border: 2px solid rgba(255,255,255,0.5);
}
.nickname { color: #fff; font-size: 20px; margin-top: 10px; display: block; font-weight: 500; }
.phone { color: rgba(255,255,255,0.7); font-size: 13px; display: block; margin-top: 4px; }
.login-btn {
  background: rgba(255,255,255,0.2); color: #fff; font-size: 17px;
  border: 1px solid rgba(255,255,255,0.5); border-radius: 24px;
  padding: 10px 32px; display: inline-block;
}
.login-tip { color: rgba(255,255,255,0.6); font-size: 13px; display: block; margin-top: 12px; }

/* ========== 会员卡片 ========== */
.vip-card {
  background: #fff; border-radius: 8px; padding: 16px;
  margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;
}
.vip-left { flex: 1; }
.vip-label {
  font-size: 16px; font-weight: bold; color: #999;
  padding: 2px 12px; border-radius: 12px; background: #f5f0e6;
}
.vip-label.active { color: #8b4513; background: #f5e6d0; }
.vip-expire { font-size: 12px; color: #bbb; display: block; margin-top: 6px; }
.vip-upgrade {
  font-size: 14px; color: #8b4513; font-weight: 500;
  padding: 6px 16px; border: 1px solid #8b4513; border-radius: 16px;
}

/* ========== 菜单 ========== */
.menu { background: #fff; border-radius: 8px; overflow: hidden; }
.menu-item {
  display: flex; align-items: center; padding: 14px 16px;
  border-bottom: 1px solid #f5f0e6; font-size: 15px;
}
.menu-item:last-child { border-bottom: none; }
.menu-icon { font-size: 18px; margin-right: 12px; width: 24px; text-align: center; }
.menu-label { flex: 1; color: #333; }
.arrow { color: #ccc; font-size: 20px; font-weight: bold; }
.badge {
  background: #e74c3c; color: #fff; font-size: 11px;
  padding: 2px 7px; border-radius: 10px; margin-right: 4px; min-width: 20px; text-align: center;
}

/* ========== 退出登录 ========== */
.logout-btn {
  text-align: center; background: #fff; border-radius: 8px;
  padding: 14px; margin-top: 24px; color: #e74c3c; font-size: 15px; cursor: pointer;
}

/* ========== 登录弹窗 ========== */
.modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5); z-index: 999; display: flex;
  align-items: center; justify-content: center;
}
.modal-content {
  background: #fff; border-radius: 12px; padding: 28px 24px;
  width: 80%; max-width: 340px;
}
.modal-title { font-size: 20px; font-weight: bold; color: #333; text-align: center; margin-bottom: 20px; display: block; }
.modal-input {
  background: #f5f0e6; border-radius: 8px; padding: 12px 14px;
  font-size: 15px; margin-bottom: 12px; border: 1px solid #e0d5c1;
}
.login-error { color: #e74c3c; font-size: 13px; margin-bottom: 12px; }
.modal-btn {
  background: #8b4513; color: #fff; border-radius: 8px;
  font-size: 16px; padding: 12px; width: 100%; border: none; margin-top: 4px;
}
.modal-btn[disabled] { opacity: 0.5; }
.modal-cancel {
  display: block; text-align: center; color: #999; font-size: 14px;
  margin-top: 16px; cursor: pointer;
}
</style>
