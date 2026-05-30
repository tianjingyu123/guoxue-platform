<template>
  <view class="page">
    <view class="menu-list">
      <view v-for="item in items" :key="item.label" class="item" @click="goPage(item.url)">
        <text class="item-label">{{ item.label }}</text><text class="item-value">{{ item.value }}</text><text class="arrow">▸</text>
      </view>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref } from 'vue'
const items = ref([
  { label: '修改密码', value: '', url: '/pages/mine/change-password' },
  { label: '修改手机号', value: '', url: '/pages/mine/change-phone' },
  { label: '支付密码', value: '', url: '/pages/mine/payment-password' },
  { label: '实名认证', value: '未认证', url: '/pages/mine/identity-verify' },
  { label: '注销账号', value: '', url: '/pages/mine/delete-account' },
])
function goPage(url: string) { uni.navigateTo({ url }) }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.menu-list { background: #fff; border-radius: 12px; overflow: hidden; }
.item { display: flex; align-items: center; padding: 16px; border-bottom: 1px solid #f5f5f5; }
.item:last-child { border-bottom: none; }
.item-label { font-size: 14px; flex: 1; }
.item-value { font-size: 12px; color: #999; margin-right: 8px; }
.arrow { color: #ccc; }
</style>
