<template>
  <view class="page">
    <view class="user-card" v-if="user">
      <image class="avatar" :src="user.avatar || '/static/default-avatar.png'" mode="aspectFill" />
      <text class="nickname">{{ user.nickname }}</text>
      <text class="phone" v-if="user.phone">{{ user.phone }}</text>
    </view>
    <view class="user-card" v-else>
      <button class="login-btn" @click="handleLogin">登录 / 注册</button>
    </view>

    <view class="stats" v-if="user">
      <view class="stat-item">
        <text class="stat-num">{{ user.followingCount || 0 }}</text>
        <text class="stat-label">关注</text>
      </view>
      <view class="stat-item">
        <text class="stat-num">{{ user.followerCount || 0 }}</text>
        <text class="stat-label">粉丝</text>
      </view>
      <view class="stat-item">
        <text class="stat-num">{{ user.likeCount || 0 }}</text>
        <text class="stat-label">获赞</text>
      </view>
    </view>

    <view class="menu">
      <view class="menu-item" @click="goPage('/pages/favorites/favorites')">
        <text>我的收藏</text>
        <text class="arrow">></text>
      </view>
      <view class="menu-item" @click="goPage('/pages/bots/bots')">
        <text>智能体广场</text>
        <text class="arrow">></text>
      </view>
      <view class="menu-item" @click="goPage('/pages/shop/shop')">
        <text>商城</text>
        <text class="arrow">></text>
      </view>
      <view class="menu-item" @click="goPage('/pages/videos/videos')">
        <text>短视频</text>
        <text class="arrow">></text>
      </view>
      <view class="menu-item" @click="goPage('/pages/live/live')">
        <text>直播</text>
        <text class="arrow">></text>
      </view>
      <view class="menu-item" @click="goBaziHistory">
        <text>八字排盘记录</text>
        <text class="arrow">></text>
      </view>
      <view class="menu-item" @click="goPage('/pages/notifications/notifications')">
        <text>消息通知</text>
        <text v-if="unreadCount > 0" class="badge">{{ unreadCount }}</text>
        <text class="arrow">></text>
      </view>
      <view class="menu-item">
        <text>设置</text>
        <text class="arrow">></text>
      </view>
    </view>

    <view v-if="user" class="logout-btn" @click="handleLogout">退出登录</view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { authApi, notifyApi } from "../../api";

const user = ref<any>(null);
const unreadCount = ref(0);

onMounted(async () => {
  try {
    user.value = await authApi.getProfile();
  } catch { /* 未登录 */ }
  try {
    const data = await notifyApi.unreadCount();
    unreadCount.value = data.count ?? 0;
  } catch { /* */ }
});

function handleLogin() {
  uni.navigateTo({ url: "/pages/login/login" });
}

async function handleLogout() {
  uni.removeStorageSync("token");
  user.value = null;
  uni.showToast({ title: "已退出" });
}

function goPage(url: string) {
  uni.navigateTo({ url });
}

function goBaziHistory() {
  uni.navigateTo({ url: "/pages/bazi/bazi" });
}
</script>

<style>
.page { padding: 12px; background: #f5f0e6; min-height: 100vh; }
.user-card {
  background: linear-gradient(135deg, #8b4513, #c4943a);
  border-radius: 12px; padding: 28px; text-align: center; margin-bottom: 12px;
}
.avatar { width: 72px; height: 72px; border-radius: 50%; background: rgba(255,255,255,0.3); }
.nickname { color: #fff; font-size: 20px; margin-top: 8px; display: block; }
.phone { color: rgba(255,255,255,0.7); font-size: 13px; }
.login-btn { background: transparent; color: #fff; font-size: 17px; border: none; }

.stats { display: flex; justify-content: space-around; background: #fff; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
.stat-item { display: flex; flex-direction: column; align-items: center; }
.stat-num { font-size: 20px; font-weight: bold; color: #333; }
.stat-label { font-size: 12px; color: #999; margin-top: 2px; }

.menu { background: #fff; border-radius: 8px; overflow: hidden; }
.menu-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; border-bottom: 1px solid #f5f0e6; font-size: 15px;
}
.arrow { color: #ccc; font-size: 16px; }
.badge { background: #e74c3c; color: #fff; font-size: 11px; padding: 2px 7px; border-radius: 10px; }

.logout-btn { text-align: center; background: #fff; border-radius: 8px; padding: 14px; margin-top: 24px; color: #e74c3c; font-size: 15px; }
</style>
