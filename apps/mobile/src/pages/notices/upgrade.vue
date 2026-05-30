<template>
  <view class="page">
    <view class="card">
      <text class="icon">🚀</text>
      <text class="title">版本升级通知</text>
      <text class="version">{{ version }}</text>
      <view class="features">
        <view v-for="f in features" :key="f" class="feature"><text>• {{ f }}</text></view>
      </view>
      <text class="size">大小：{{ size }}</text>
      <button class="btn-update" @click="update">立即更新</button>
      <text class="skip" @click="skip">暂不更新</text>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref } from 'vue'
const version = ref('v2.3.0'); const size = ref('12.5MB')
const features = ref(['新增AI助手功能', '优化排盘工具性能', '修复已知问题', '界面体验优化'])
function update() { uni.showToast({ title: '开始更新', icon: 'none' }) }
function skip() { uni.navigateBack() }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
.card { background: #fff; border-radius: 16px; padding: 30px 24px; text-align: center; width: 100%; }
.icon { font-size: 48px; display: block; margin-bottom: 12px; }
.title { font-size: 18px; font-weight: 600; display: block; }
.version { font-size: 24px; font-weight: bold; color: #C41E3A; display: block; margin: 8px 0; }
.features { text-align: left; margin: 16px 0; }
.feature { font-size: 13px; color: #666; padding: 4px 0; }
.size { font-size: 12px; color: #999; display: block; margin-bottom: 16px; }
.btn-update { width: 100%; background: #C41E3A; color: #fff; border: none; border-radius: 8px; padding: 12px; font-size: 15px; }
.skip { font-size: 12px; color: #999; display: block; margin-top: 12px; }
</style>
