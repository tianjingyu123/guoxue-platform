<template>
  <view class="page">
    <view class="header">
      <text class="title">{{ data.title || '国学精彩内容' }}</text>
      <text class="subtitle">{{ data.subtitle || '来自国学传统文化平台' }}</text>
    </view>
    <image v-if="data.cover" :src="data.cover" class="cover" mode="aspectFill" />
    <view class="desc"><text>{{ data.description || '' }}</text></view>
    <view class="actions">
      <button class="btn-download" @click="download">下载APP查看完整内容</button>
      <button class="btn-open" @click="openApp">打开APP</button>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { shareApi } from '../../api'
const data = ref<any>({})
onMounted(() => {
  const pages = getCurrentPages(); const opts = (pages[pages.length - 1] as any)?.options || {}
  data.value = { id: opts.id, title: opts.title, subtitle: opts.subtitle, cover: opts.cover, description: opts.description }
})
function download() { uni.showToast({ title: '跳转下载页', icon: 'none' }) }
function openApp() { uni.showToast({ title: '打开APP', icon: 'none' }) }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 40px 20px; }
.header { text-align: center; margin-bottom: 20px; }
.title { font-size: 20px; font-weight: bold; display: block; }
.subtitle { font-size: 13px; color: #999; display: block; margin-top: 6px; }
.cover { width: 100%; height: 200px; border-radius: 12px; margin-bottom: 16px; }
.desc { font-size: 14px; color: #666; line-height: 1.6; margin-bottom: 30px; }
.actions { width: 100%; }
.btn-download { width: 100%; background: #C41E3A; color: #fff; border: none; border-radius: 8px; padding: 14px; font-size: 15px; margin-bottom: 12px; }
.btn-open { width: 100%; background: #fff; color: #C41E3A; border: 1px solid #C41E3A; border-radius: 8px; padding: 14px; font-size: 15px; }
</style>
