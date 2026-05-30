<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else>
      <view class="dashboard-grid">
        <view v-for="card in cards" :key="card.label" class="stat-card">
          <text class="stat-value">{{ card.value }}</text>
          <text class="stat-label">{{ card.label }}</text>
        </view>
      </view>
      <view class="section">
        <text class="section-title">热门内容</text>
        <view v-for="c in hotContent" :key="c.id" class="hot-item"><text>{{ c.title }}</text></view>
      </view>
      <view class="section">
        <text class="section-title">最近成员</text>
        <view v-for="m in recentMembers" :key="m.id" class="member-item">
          <text>{{ m.user?.nickname || m.nickname }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import { circleDashboardApi } from '../../api'

const loading = ref(true)
const cards = ref<any[]>([])
const hotContent = ref<any[]>([])
const recentMembers = ref<any[]>([])

onMounted(async () => {
  const query = getCurrentPages().pop()?.options || {}
  const circleId = query.circleId || query.id || ''
  if (!circleId) { loading.value = false; return }
  try {
    const [overview, hot, members] = await Promise.all([
      circleDashboardApi.overview(circleId),
      circleDashboardApi.hotContent(circleId),
      circleDashboardApi.recentMembers(circleId),
    ])
    const d: any = overview || {}
    cards.value = [
      { label: '成员数', value: d.memberCount || 0 },
      { label: '帖子数', value: d.postCount || 0 },
      { label: '今日活跃', value: d.todayActive || 0 },
      { label: '收入', value: '¥' + (d.revenue || 0) },
    ]
    hotContent.value = Array.isArray(hot) ? hot : hot?.data || []
    recentMembers.value = Array.isArray(members) ? members : members?.data || []
  } catch {} finally { loading.value = false }
})
</script>

<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.dashboard-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
.stat-card { background: #fff; border-radius: 12px; padding: 16px; text-align: center; }
.stat-value { font-size: 24px; font-weight: bold; color: #C41E3A; display: block; }
.stat-label { font-size: 12px; color: #999; margin-top: 4px; display: block; }
.section { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
.section-title { font-size: 15px; font-weight: 500; margin-bottom: 10px; display: block; border-bottom: 1px solid #f0f0f0; padding-bottom: 8px; }
.hot-item { padding: 8px 0; border-bottom: 1px solid #f8f8f8; font-size: 14px; }
.member-item { padding: 8px 0; font-size: 14px; }
</style>
