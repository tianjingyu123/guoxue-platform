<template>
  <view class="page">
    <view class="menu-list">
      <view v-for="item in menuItems" :key="item.label" class="menu-item" @click="goPage(item.url)">
        <text class="menu-label">{{ item.label }}</text><text class="menu-arrow">▸</text>
      </view>
    </view>
    <button class="btn-logout" @click="logout">退出登录</button>
  </view>
</template>
<script setup lang="ts">
import { ref } from 'vue'
const menuItems = ref([
  { label: '账号安全', url: '/pages/mine/security' },
  { label: '通知设置', url: '' },
  { label: '隐私设置', url: '/pages/mine/privacy-authorization' },
  { label: '青少年模式', url: '/pages/mine/teen-mode' },
  { label: '清除缓存', url: '' },
  { label: '关于我们', url: '' },
])
function goPage(url: string) {
  if (url) { uni.navigateTo({ url }) }
  else { uni.showToast({ title: '即将上线', icon: 'none' }) }
}
function logout() {
  uni.removeStorageSync('token')
  uni.reLaunch({ url: '/pages/login/login' })
}
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.menu-list { background: #fff; border-radius: 12px; overflow: hidden; margin-bottom: 12px; }
.menu-item { display: flex; justify-content: space-between; padding: 16px; border-bottom: 1px solid #f5f5f5; }
.menu-item:last-child { border-bottom: none; }
.menu-label { font-size: 14px; }
.menu-arrow { color: #ccc; }
.btn-logout { width: 100%; height: 44px; background: #fff; color: #C41E3A; border-radius: 22px; font-size: 15px; border: 1px solid #C41E3A; text-align: center; line-height: 44px; }
</style>
