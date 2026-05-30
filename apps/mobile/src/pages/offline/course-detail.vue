<template>
  <view class="page">
    <image :src="course.cover || ''" class="cover" mode="aspectFill" />
    <view class="section">
      <text class="title">{{ course.title }}</text>
      <text class="teacher">讲师：{{ course.teacherName }}</text>
      <text class="time">时间：{{ course.schedule || '' }}</text>
      <text class="addr">地点：{{ course.address || '' }}</text>
      <text class="desc">{{ course.description || '' }}</text>
    </view>
    <view class="section"><text class="section-title">课程大纲</text>
      <view v-for="(ch, idx) in chapters" :key="idx" class="ch-item"><text>{{ idx + 1 }}. {{ ch.title || ch }}</text></view>
    </view>
    <view class="bottom-bar">
      <text class="price">¥{{ course.price || 0 }}</text>
      <button class="btn-buy" @click="buy">立即报名</button>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { offlineApi } from '../../api'
const course = ref<any>({}); const chapters = ref<any[]>([])
onMounted(async () => {
  const pages = getCurrentPages(); const id = (pages[pages.length - 1] as any)?.options?.id
  try { const res: any = await offlineApi.getCourseDetail(id); course.value = res || {}; chapters.value = res?.chapters || [] } catch {}
})
function buy() { uni.navigateTo({ url: `/pages/orders/confirm?type=offline&id=${course.value.id}` }) }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding-bottom: 70px; }
.cover { width: 100%; height: 200px; }
.section { background: #fff; padding: 16px; margin-top: 10px; }
.title { font-size: 18px; font-weight: 600; display: block; }
.teacher, .time, .addr { font-size: 13px; color: #666; display: block; margin-top: 6px; }
.desc { font-size: 13px; color: #666; line-height: 1.6; display: block; margin-top: 10px; }
.section-title { font-size: 15px; font-weight: 500; display: block; margin-bottom: 10px; }
.ch-item { padding: 8px 0; font-size: 13px; border-bottom: 1px solid #f8f8f8; }
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; display: flex; align-items: center; padding: 12px 16px; border-top: 1px solid #eee; }
.price { font-size: 20px; color: #C41E3A; font-weight: bold; flex: 1; }
.btn-buy { background: #C41E3A; color: #fff; border: none; border-radius: 8px; padding: 10px 24px; font-size: 15px; }
</style>
