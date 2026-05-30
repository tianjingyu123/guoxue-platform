<template>
  <view class="page">
    <view class="page-header">
      <text class="page-title">学习看板</text>
      <text class="page-sub">我的学习数据</text>
    </view>

    <view v-if="loading" class="loading">加载中...</view>

    <template v-else-if="dashboard">
      <!-- 统计卡片 -->
      <view class="stats-grid">
        <view class="stat-card">
          <text class="stat-value">{{ dashboard.enrolledCourses || 0 }}</text>
          <text class="stat-label">已购课程</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">{{ dashboard.completedChapters || 0 }}</text>
          <text class="stat-label">已完成章节</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">{{ dashboard.inProgressChapters || 0 }}</text>
          <text class="stat-label">进行中</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">{{ dashboard.pendingWorks || 0 }}</text>
          <text class="stat-label">待批改作业</text>
        </view>
      </view>

      <!-- 最近学习 -->
      <view v-if="(dashboard.recentProgress || []).length > 0" class="section">
        <view class="section-title">最近学习</view>
        <view class="recent-list">
          <view v-for="rp in dashboard.recentProgress" :key="rp.chapter?.id || rp.chapterId" class="recent-item" @click="goChapter(rp)">
            <view class="r-left">
              <text class="r-course">{{ rp.course?.title || '未知课程' }}</text>
              <text class="r-chapter">{{ rp.chapter?.title || '未知章节' }}</text>
            </view>
            <view class="r-right">
              <view class="r-progress-bar">
                <view class="r-progress-fill" :style="{ width: (rp.progress || 0) + '%' }" />
              </view>
              <text class="r-pct">{{ rp.progress || 0 }}%</text>
            </view>
          </view>
        </view>
      </view>

      <EmptyState v-else icon="📊" text="暂无学习记录" />
    </template>

    <EmptyState v-else-if="!loading" icon="⚠️" text="加载失败" />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { courseApi } from '@/api'
import EmptyState from '@/components/EmptyState.vue'

const dashboard = ref<any>(null)
const loading = ref(false)

onMounted(() => fetchDashboard())

async function fetchDashboard() {
  loading.value = true
  try {
    const res = await courseApi.dashboard()
    dashboard.value = res
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function goChapter(rp: any) {
  const courseId = rp.course?.id || rp.courseId
  if (courseId) {
    uni.navigateTo({ url: `/pages/courses/course-detail?id=${courseId}` })
  }
}
</script>

<style scoped>
.page { padding: 12px; background: #F5F0E8; min-height: 100vh; }
.page-header { margin-bottom: 16px; }
.page-title { font-size: 20px; font-weight: bold; color: #C41E3A; }
.page-sub { font-size: 12px; color: #C9A96E; display: block; margin-top: 4px; }
.loading { text-align: center; padding: 60px 0; color: #C9A96E; }

.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
.stat-card {
  background: #fff; border-radius: 12px; padding: 18px 14px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.05); text-align: center;
}
.stat-value { font-size: 28px; font-weight: bold; color: #C41E3A; display: block; }
.stat-label { font-size: 12px; color: #999; margin-top: 4px; display: block; }

.section { margin-top: 0; }
.section-title { font-size: 15px; font-weight: bold; color: #2C2C2C; padding: 8px 0 8px 8px; border-left: 3px solid #C41E3A; margin-bottom: 8px; }
.recent-list { display: flex; flex-direction: column; gap: 8px; }
.recent-item {
  display: flex; align-items: center; justify-content: space-between;
  background: #fff; border-radius: 10px; padding: 12px 14px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04); gap: 12px;
}
.r-left { flex: 1; min-width: 0; }
.r-course { font-size: 14px; font-weight: 600; color: #2C2C2C; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.r-chapter { font-size: 12px; color: #999; display: block; margin-top: 2px; }
.r-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.r-progress-bar { width: 60px; height: 4px; background: #E8E0D5; border-radius: 2px; overflow: hidden; }
.r-progress-fill { height: 100%; background: #C41E3A; border-radius: 2px; }
.r-pct { font-size: 11px; color: #C41E3A; min-width: 30px; text-align: right; }
</style>
