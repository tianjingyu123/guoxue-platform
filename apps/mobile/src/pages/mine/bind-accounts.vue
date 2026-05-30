<template>
  <view class="page">
    <view class="section">
      <view class="row" v-for="a in accounts" :key="a.type">
        <text class="label">{{ a.label }}</text>
        <text v-if="a.bound" class="bound">已绑定</text>
        <button v-else class="btn-bind" @click="bind(a)">绑定</button>
      </view>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref } from 'vue'
const accounts = ref([
  { type: 'wechat', label: '微信', bound: true },
  { type: 'phone', label: '手机号', bound: true },
  { type: 'apple', label: 'Apple ID', bound: false },
])
function bind(a: any) { uni.showToast({ title: `绑定${a.label}`, icon: 'none' }) }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.section { background: #fff; border-radius: 12px; padding: 16px; }
.row { display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-bottom: 1px solid #f5f5f5; }
.row:last-child { border-bottom: none; }
.label { font-size: 14px; }
.bound { font-size: 13px; color: #4CAF50; }
.btn-bind { padding: 4px 16px; border-radius: 14px; font-size: 12px; background: #C41E3A; color: #fff; border: none; line-height: 28px; }
</style>
