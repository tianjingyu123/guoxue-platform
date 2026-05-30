<template>
  <view class="page">
    <view class="stats">
      <view class="stat-card"><text class="s-val">{{ stats.students || 0 }}</text><text class="s-label">学生数</text></view>
      <view class="stat-card"><text class="s-val">{{ stats.courses || 0 }}</text><text class="s-label">课程数</text></view>
      <view class="stat-card"><text class="s-val">{{ stats.revenue || 0 }}</text><text class="s-label">收益</text></view>
      <view class="stat-card"><text class="s-val">{{ stats.rating || 0 }}</text><text class="s-label">评分</text></view>
    </view>
    <view class="section"><text class="section-title">最近预约</text>
      <view v-for="b in bookings" :key="b.id" class="booking-item">
        <image :src="b.avatar || ''" class="b-avatar" mode="aspectFill" />
        <view class="b-info"><text class="b-name">{{ b.studentName }}</text><text class="b-time">{{ b.date }} {{ b.timeSlot }}</text></view>
        <text class="b-status">{{ b.status }}</text>
      </view>
      <EmptyState v-if="!bookings.length" text="暂无预约" />
    </view>
    <view class="section"><text class="section-title">今日数据</text>
      <view class="data-row"><text>新学生</text><text class="data-val">{{ stats.newStudents || 0 }}</text></view>
      <view class="data-row"><text>完成课程</text><text class="data-val">{{ stats.completedLessons || 0 }}</text></view>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import EmptyState from '../../components/EmptyState.vue'
const stats = ref({ students: 128, courses: 12, revenue: '¥5,680', rating: 4.9, newStudents: 3, completedLessons: 2 })
const bookings = ref<any[]>([{ id: '1', studentName: '张三', date: '2026-05-21', timeSlot: '14:00', status: '待确认' }])
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 12px; }
.stat-card { background: #fff; border-radius: 10px; padding: 10px; text-align: center; }
.s-val { font-size: 16px; font-weight: bold; color: #C41E3A; display: block; }
.s-label { font-size: 10px; color: #999; display: block; margin-top: 2px; }
.section { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
.section-title { font-size: 15px; font-weight: 500; display: block; margin-bottom: 10px; }
.booking-item { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid #f8f8f8; }
.b-avatar { width: 36px; height: 36px; border-radius: 50%; }
.b-info { flex: 1; }
.b-name { font-size: 13px; display: block; }
.b-time { font-size: 11px; color: #999; }
.b-status { font-size: 12px; color: #C9A96E; }
.data-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f8f8f8; font-size: 13px; }
.data-val { color: #C41E3A; font-weight: 500; }
</style>
