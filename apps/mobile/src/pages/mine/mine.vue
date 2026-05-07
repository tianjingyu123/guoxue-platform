<template>
  <view class="page">
    <view class="user-card" v-if="user">
      <image class="avatar" :src="user.avatar || '/static/default-avatar.png'" />
      <view class="nickname">{{ user.nickname }}</view>
    </view>
    <view class="user-card" v-else>
      <view class="login-btn" @click="handleLogin">登录 / 注册</view>
    </view>
    <view class="menu">
      <view class="menu-item">我的收藏</view>
      <view class="menu-item">设置</view>
      <view class="menu-item">关于</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from "vue";

const user = ref<any>(null);

function handleLogin() {
  // TODO: 跳转登录页
}
</script>

<style>
.page { padding: 12px; }
.user-card { background: #409eff; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 16px; }
.avatar { width: 64px; height: 64px; border-radius: 50%; background: #fff; }
.nickname { color: #fff; font-size: 18px; margin-top: 8px; }
.login-btn { color: #fff; font-size: 16px; }
.menu { background: #fff; border-radius: 8px; }
.menu-item { padding: 14px; border-bottom: 1px solid #f5f5f5; font-size: 15px; }
</style>
