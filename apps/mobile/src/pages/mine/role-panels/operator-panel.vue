<template>
  <view class="page">
    <view class="header">
      <text class="title">运营商中心</text>
    </view>

    <view class="menu-grid">
      <view class="menu-item" @click="goPage('/pages/operator/center')">
        <text class="menu-icon">🏢</text>
        <text class="menu-label">运营商中心</text>
      </view>
      <view class="menu-item" @click="goPage('/pages/operator/stations')">
        <text class="menu-icon">🏪</text>
        <text class="menu-label">下级分站</text>
      </view>
      <view class="menu-item" @click="goPage('/pages/operator/earnings')">
        <text class="menu-icon">💰</text>
        <text class="menu-label">收益总览</text>
      </view>
      <view class="menu-item" @click="goPage('/pages/operator/miniapp-config')">
        <text class="menu-icon">📱</text>
        <text class="menu-label">小程序配置</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
function goPage(url: string) {
  uni.navigateTo({ url })
}
</script>

<style scoped>
.page { padding: 12px; background: #F5F0E8; min-height: 100vh; }
.header { margin-bottom: 16px; }
.title { font-size: 20px; font-weight: bold; color: #C41E3A; }
.menu-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.menu-item { background: #fff; border-radius: 12px; padding: 24px 16px; display: flex; flex-direction: column; align-items: center; gap: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.menu-icon { font-size: 32px; }
.menu-label { font-size: 14px; color: #333; font-weight: 500; }
</style>
