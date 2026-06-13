<template>
  <view class="min-h-screen bg-background pb-6">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-50 bg-primary">
      <view class="flex items-center justify-between px-4 h-11">
        <view @click="goBack" class="flex items-center">
          <text class="text-white text-lg">&#8592;</text>
        </view>
        <text class="font-medium text-white">数据看板</text>
        <view @click="handleRefresh" class="flex items-center">
          <text class="text-white text-lg" :class="isRefreshing ? 'animate-spin' : ''" style="display:inline-block"></text>
        </view>
      </view>
    </view>

    <!-- 赛事信息 -->
    <view class="bg-primary px-4 pb-4 pt-2">
      <text class="text-white/80 text-sm block mb-1">{{ dashboardData.competitionTitle }}</text>
      <view class="flex items-center gap-2">
        <text class="px-2 py-0.5 rounded text-xs text-white" style="background:rgba(255,255,255,0.2)">{{ dashboardData.currentRound }}</text>
        <text class="px-2 py-0.5 rounded text-xs text-white" style="background:#22C55E">进行中</text>
      </view>
    </view>

    <!-- 核心数据卡片 -->
    <view class="px-4 -mt-2">
      <view class="p-4 rounded-xl border border-border bg-white">
        <view class="grid grid-cols-4 gap-3 text-center">
          <view>
            <text class="text-2xl font-bold text-primary block">{{ dashboardData.overview.totalRegistrations }}</text>
            <text class="text-xs text-muted-foreground">报名人数</text>
          </view>
          <view>
            <text class="text-2xl font-bold text-foreground block">{{ dashboardData.overview.totalParticipants }}</text>
            <text class="text-xs text-muted-foreground">参赛人数</text>
          </view>
          <view>
            <text class="text-2xl font-bold block" style="color:#16A34A">{{ dashboardData.overview.completedRate }}%</text>
            <text class="text-xs text-muted-foreground">完赛率</text>
          </view>
          <view>
            <text class="text-2xl font-bold block" style="color:#D97706">{{ dashboardData.overview.avgScore }}</text>
            <text class="text-xs text-muted-foreground">平均分</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Tab切换 -->
    <view class="px-4 mt-4">
      <!-- Tab Bar -->
      <view class="flex w-full h-9 rounded-lg bg-secondary p-0.5">
        <view
          v-for="tab in tabItems"
          :key="tab.key"
          @click="activeTab = tab.key"
          :class="activeTab === tab.key ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground'"
          class="flex-1 flex items-center justify-center text-xs rounded-md font-medium"
        >
          <text>{{ tab.label }}</text>
        </view>
      </view>

      <!-- 数据概览 -->
      <view v-if="activeTab === 'overview'" class="mt-4 space-y-4">
        <!-- 报名趋势 -->
        <view class="p-4 rounded-xl border border-border bg-white">
          <view class="flex items-center justify-between mb-4">
            <text class="font-medium text-foreground">📈 报名趋势</text>
            <text class="text-xs text-muted-foreground">最近7天</text>
          </view>
          <view class="flex items-end gap-2" style="height:128px">
            <view v-for="(item, index) in dashboardData.registrationTrend" :key="index" class="flex-1 flex flex-col items-center gap-1">
              <view class="w-full rounded-t bg-primary/80" :style="{ height: (item.count / maxTrendCount) * 100 + '%' }" />
              <text class="text-[10px] text-muted-foreground">{{ item.date.slice(3) }}</text>
            </view>
          </view>
        </view>

        <!-- 组别分布 -->
        <view class="p-4 rounded-xl border border-border bg-white">
          <text class="font-medium mb-4 block text-foreground">📊 组别分布</text>
          <view class="space-y-3">
            <view v-for="group in dashboardData.groupDistribution" :key="group.name">
              <view class="flex items-center justify-between text-sm mb-1">
                <text class="text-foreground">{{ group.name }}</text>
                <text class="text-muted-foreground">{{ group.count }}人 ({{ group.percentage }}%)</text>
              </view>
              <view class="h-2 bg-secondary rounded-full overflow-hidden">
                <view class="h-full rounded-full" :style="{ width: group.percentage + '%', background: group.color === 'bg-blue-500' ? '#3B82F6' : group.color === 'bg-green-500' ? '#22C55E' : '#F59E0B' }" />
              </view>
            </view>
          </view>
        </view>

        <!-- 分数分布 -->
        <view class="p-4 rounded-xl border border-border bg-white">
          <text class="font-medium mb-4 block text-foreground">📊 分数分布</text>
          <view class="space-y-2">
            <view v-for="item in dashboardData.scoreDistribution" :key="item.range" class="flex items-center gap-3">
              <text class="text-sm w-16 text-muted-foreground">{{ item.range }}</text>
              <view class="flex-1 h-6 bg-secondary rounded overflow-hidden">
                <view class="h-full rounded flex items-center justify-end px-2 text-xs text-white font-medium" :style="{ width: Math.max(item.percentage, 5) + '%', background: getScoreColor(item.range) }">
                  <text>{{ item.count }}</text>
                </view>
              </view>
              <text class="text-xs text-muted-foreground w-12 text-right">{{ item.percentage }}%</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 赛程统计 -->
      <view v-if="activeTab === 'rounds'" class="mt-4 space-y-4">
        <view v-for="round in dashboardData.roundsStatus" :key="round.name" class="p-4 rounded-xl border border-border bg-white">
          <view class="flex items-center justify-between mb-3">
            <view class="flex items-center gap-2">
              <text class="font-medium text-foreground">{{ round.name }}</text>
              <text :class="round.status === 'ongoing' ? 'bg-primary text-white' : round.status === 'ended' ? 'bg-secondary text-foreground' : 'border border-border text-muted-foreground'" class="px-2 py-0.5 rounded text-xs">
                {{ round.status === 'ongoing' ? '进行中' : round.status === 'ended' ? '已结束' : '未开始' }}
              </text>
            </view>
            <text class="text-xs text-muted-foreground">{{ round.startTime }} - {{ round.endTime }}</text>
          </view>
          <view v-if="round.status !== 'upcoming'" class="grid grid-cols-4 gap-3 text-center">
            <view><text class="text-lg font-bold text-foreground block">{{ round.participants }}</text><text class="text-xs text-muted-foreground">参赛</text></view>
            <view><text class="text-lg font-bold text-foreground block">{{ round.completed }}</text><text class="text-xs text-muted-foreground">完成</text></view>
            <view><text class="text-lg font-bold text-foreground block">{{ round.avgScore }}</text><text class="text-xs text-muted-foreground">均分</text></view>
            <view><text class="text-lg font-bold block" style="color:#16A34A">{{ round.passCount }}</text><text class="text-xs text-muted-foreground">晋级</text></view>
          </view>
          <view v-else>
            <text class="text-sm text-muted-foreground text-center block py-4">比赛尚未开始</text>
          </view>
        </view>
      </view>

      <!-- 实时进度 -->
      <view v-if="activeTab === 'live'" class="mt-4 space-y-4">
        <view class="p-4 rounded-xl border border-border bg-white">
          <text class="font-medium mb-4 block text-foreground">⏱️ 实时答题进度</text>
          <view class="space-y-4">
            <view>
              <view class="flex items-center justify-between text-sm mb-1">
                <text><text class="w-2 h-2 rounded-full inline-block" style="background:#22C55E" /> 已完成</text>
                <text class="text-foreground">{{ dashboardData.liveProgress.completed }}</text>
              </view>
              <view class="h-2 bg-secondary rounded-full overflow-hidden">
                <view class="h-full rounded-full" style="background:#22C55E" :style="{ width: (dashboardData.liveProgress.completed / dashboardData.liveProgress.total) * 100 + '%' }" />
              </view>
            </view>
            <view>
              <view class="flex items-center justify-between text-sm mb-1">
                <text><text class="w-2 h-2 rounded-full inline-block" style="background:#F59E0B" /> 答题中</text>
                <text class="text-foreground">{{ dashboardData.liveProgress.inProgress }}</text>
              </view>
              <view class="h-2 bg-secondary rounded-full overflow-hidden">
                <view class="h-full rounded-full" style="background:#F59E0B" :style="{ width: (dashboardData.liveProgress.inProgress / dashboardData.liveProgress.total) * 100 + '%' }" />
              </view>
            </view>
            <view>
              <view class="flex items-center justify-between text-sm mb-1">
                <text><text class="w-2 h-2 rounded-full inline-block" style="background:#D1D5DB" /> 未开始</text>
                <text class="text-foreground">{{ dashboardData.liveProgress.notStarted }}</text>
              </view>
              <view class="h-2 bg-secondary rounded-full overflow-hidden">
                <view class="h-full rounded-full" style="background:#D1D5DB" :style="{ width: (dashboardData.liveProgress.notStarted / dashboardData.liveProgress.total) * 100 + '%' }" />
              </view>
            </view>
          </view>
          <view class="mt-4 pt-4 border-t border-border">
            <text class="text-sm text-muted-foreground text-center block">完成率: {{ Math.round((dashboardData.liveProgress.completed / dashboardData.liveProgress.total) * 100) }}%</text>
          </view>
        </view>

        <!-- 操作按钮 -->
        <view class="flex gap-3">
          <view @click="goResult" class="flex-1 py-2.5 rounded-lg border border-border text-center text-sm font-medium text-foreground">
            <text class="mr-1">️</text>查看排行榜
          </view>
          <view @click="handleExport" class="flex-1 py-2.5 rounded-lg border border-border text-center text-sm font-medium text-foreground">
            <text class="mr-1">⬇️</text>导出数据
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const dashboardData = ref({
  competitionId: '1', competitionTitle: '2024热卜杯·八字命理大赛',
  status: 'ongoing', currentRound: '初赛',
  overview: { totalRegistrations: 1286, totalParticipants: 1156, promotedCount: 500, completedRate: 89.7, avgScore: 72.5 },
  registrationTrend: [
    { date: '03-18', count: 45 }, { date: '03-19', count: 68 }, { date: '03-20', count: 92 },
    { date: '03-21', count: 156 }, { date: '03-22', count: 234 }, { date: '03-23', count: 312 }, { date: '03-24', count: 379 },
  ],
  groupDistribution: [
    { name: '新手组', count: 456, percentage: 35.5, color: 'bg-blue-500' },
    { name: '进阶组', count: 512, percentage: 39.8, color: 'bg-green-500' },
    { name: '高手组', count: 318, percentage: 24.7, color: 'bg-amber-500' },
  ],
  roundsStatus: [
    { name: '初赛', status: 'ongoing', startTime: '2024-04-01', endTime: '2024-04-07', participants: 1156, completed: 892, avgScore: 72.5, passLine: 70, passCount: 586 },
    { name: '复赛', status: 'upcoming', startTime: '2024-04-15', endTime: '2024-04-20', participants: 0, completed: 0, avgScore: 0, passLine: 80, passCount: 0 },
    { name: '决赛', status: 'upcoming', startTime: '2024-04-28', endTime: '2024-04-28', participants: 0, completed: 0, avgScore: 0, passLine: 0, passCount: 0 },
  ],
  liveProgress: { total: 1156, inProgress: 124, completed: 892, notStarted: 140 },
  scoreDistribution: [
    { range: '90-100', count: 45, percentage: 5 },
    { range: '80-89', count: 156, percentage: 17.5 },
    { range: '70-79', count: 385, percentage: 43.2 },
    { range: '60-69', count: 198, percentage: 22.2 },
    { range: '0-59', count: 108, percentage: 12.1 },
  ],
})

const activeTab = ref('overview')
const isRefreshing = ref(false)

const tabItems = [
  { key: 'overview', label: '数据概览' },
  { key: 'rounds', label: '赛程统计' },
  { key: 'live', label: '实时进度' },
]

const maxTrendCount = computed(() => Math.max(...dashboardData.value.registrationTrend.map(t => t.count)))

function goBack() { uni.navigateBack() }

function goResult() {
  uni.navigateTo({ url: `/pages/competition/id-detail/result/index?id=${dashboardData.value.competitionId}` })
}

function handleRefresh() {
  isRefreshing.value = true
  setTimeout(() => { isRefreshing.value = false }, 1000)
  uni.showToast({ title: '刷新中...', icon: 'loading' })
}

function handleExport() {
  uni.showToast({ title: '数据导出中...', icon: 'loading' })
  setTimeout(() => {
    uni.showToast({ title: '导出成功', icon: 'success' })
  }, 1500)
}

function getScoreColor(range: string): string {
  if (range.startsWith('9')) return '#22C55E'
  if (range.startsWith('8')) return '#3B82F6'
  if (range.startsWith('7')) return '#C41E3A'
  if (range.startsWith('6')) return '#F59E0B'
  return '#F87171'
}
</script>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
