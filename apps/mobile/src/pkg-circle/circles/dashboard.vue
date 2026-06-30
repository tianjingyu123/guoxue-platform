<script setup lang="ts">
/**
 * 圈子数据看板（真连后端）
 * 概览KPI卡(成员/活跃/本月新增) + 活跃贡献者TOP5 + 热门内容TOP5 + 收益构成
 *
 * 数据来源：
 * - overview / revenue：/circle-backend/*（后端取当前圈主的圈子，不传 circleId）
 * - contributors / hotPosts：/circles/:id/leaderboard、/circles/:id/hot-content（需 circleId）
 *
 * 说明：后端无「近30天趋势」「流失预警」端点，且无任何随机/真实趋势统计来源 →
 *      原型这两块整块删除（禁止用随机数/假数据填充）。
 *      KPI 增长率、总帖子数、总收益、贡献者点赞数、帖子浏览量后端均无来源 → 一律降级隐藏。
 */
import { onLoad } from '@dcloudio/uni-app'
import { ref } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import {
  dashboardApi,
  type DashboardOverview,
  type DashboardRevenue,
  type DashboardContributor,
  type DashboardHotPost,
} from '@/lib/circle-dashboard-data'

const circleId = ref('')

// 三态
const loading = ref(true)
const error = ref('')
const refreshing = ref(false)

// 真实数据
const overview = ref<DashboardOverview | null>(null)
const revenue = ref<DashboardRevenue | null>(null)
const contributors = ref<DashboardContributor[]>([])
const hotPosts = ref<DashboardHotPost[]>([])

// KPI 卡：仅后端真实可得三项（无增长率来源，故不展示 growth）
const KPI_META = [
  { key: 'memberCount', icon: 'users', label: '总成员', color: '#C41E3A' },
  { key: 'activeMembers', icon: 'activity', label: '活跃成员', color: '#4A90D9' },
  { key: 'monthNewMembers', icon: 'user-plus', label: '本月新增', color: '#C9A96E' },
] as const

// 收益构成：后端无分项明细 → 用 revenue 真实三项（总流水/嘉宾分账/圈主净收益）构成
const revenueItems = ref<{ name: string; value: number; percent: number; color: string }[]>([])

function buildRevenueItems(r: DashboardRevenue) {
  const base = [
    { name: '总流水', value: r.totalAmount, color: '#C41E3A' },
    { name: '嘉宾分账', value: r.totalGuestPayouts, color: '#C9A96E' },
    { name: '圈主净收益', value: r.ownerRevenue, color: '#52C41A' },
  ]
  const max = Math.max(...base.map((b) => b.value), 0)
  revenueItems.value = base.map((b) => ({
    ...b,
    percent: max > 0 ? Math.round((b.value / max) * 1000) / 10 : 0,
  }))
}

async function loadAll() {
  loading.value = true
  error.value = ''
  try {
    const [ov, rev] = await Promise.all([dashboardApi.overview(), dashboardApi.revenue()])
    overview.value = ov
    revenue.value = rev
    buildRevenueItems(rev)
    // 贡献者/热门内容依赖 circleId，缺失则降级为空列表
    if (circleId.value) {
      const [contrib, hot] = await Promise.all([
        dashboardApi.contributors(circleId.value, 5),
        dashboardApi.hotContent(circleId.value, 5),
      ])
      contributors.value = contrib
      hotPosts.value = hot
    } else {
      contributors.value = []
      hotPosts.value = []
    }
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function fmtNum(n: number) {
  if (n >= 10000) return (n / 10000).toFixed(1) + '万'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}
function rankColor(i: number) { return ['#FFD700', '#C0C0C0', '#CD7F32'][i] || '' }
function hotBg(i: number) { return ['#FFD70020', '#C0C0C020', '#CD7F3220'][i] || '#F5F5F5' }
function hotColor(i: number) { return ['#B8860B', '#808080', '#8B4513'][i] || '#999999' }

async function refresh() {
  if (refreshing.value || loading.value) return
  refreshing.value = true
  try {
    await loadAll()
    uni.showToast({ title: '已刷新', icon: 'success' })
  } finally {
    refreshing.value = false
  }
}
function openPost(id: string) {
  if (!id) return
  navigateTo(`/pkg-circle/circles/post?id=${id}&circleId=${circleId.value}`)
}

onLoad((query) => {
  circleId.value = (query?.id as string) || ''
  loadAll()
})
</script>

<template>
  <view class="db">
    <!-- 顶栏 -->
    <view class="db-hdr">
      <view class="db-hdr-l">
        <view class="db-hdr-btn" @tap="goBack"><app-icon name="arrow-left" :size="34" color="#2C2C2C" /></view>
        <text class="db-hdr-title">数据看板</text>
      </view>
      <view class="db-hdr-btn" @tap="refresh">
        <app-icon name="refresh-cw" :size="34" color="#666666" :class="{ spin: refreshing }" />
      </view>
    </view>

    <!-- 首屏加载 -->
    <view v-if="loading" class="db-state">
      <app-icon name="loader" :size="48" color="#c41e3a" class="spin" />
      <text class="db-state-t">加载中…</text>
    </view>

    <!-- 错误态 -->
    <view v-else-if="error" class="db-state">
      <app-icon name="alert-circle" :size="48" color="#FF4D4F" />
      <text class="db-state-t">{{ error }}</text>
      <view class="db-state-btn" @tap="loadAll"><text class="db-state-btn-t">重试</text></view>
    </view>

    <scroll-view v-else scroll-y class="db-body">
      <!-- 概览卡片 -->
      <view class="db-kpis">
        <view v-for="k in KPI_META" :key="k.key" class="db-kpi">
          <view class="db-kpi-top">
            <view class="db-kpi-icon" :style="{ background: k.color + '15' }"><app-icon :name="k.icon" :size="26" :color="k.color" /></view>
            <text class="db-kpi-label">{{ k.label }}</text>
          </view>
          <view class="db-kpi-bot">
            <text class="db-kpi-value">{{ fmtNum(overview?.[k.key] || 0) }}</text>
          </view>
        </view>
      </view>

      <!-- 活跃贡献者 -->
      <view class="db-card">
        <text class="db-card-title">活跃贡献者 TOP5</text>
        <view v-if="contributors.length" class="db-list">
          <view v-for="(c, i) in contributors" :key="c.userId" class="db-contrib">
            <view class="db-contrib-avatar-wrap">
              <view class="db-contrib-avatar"><text class="db-contrib-avatar-t">{{ c.name[0] }}</text></view>
              <view v-if="i < 3" class="db-contrib-rank" :style="{ background: rankColor(i) }"><text class="db-contrib-rank-t">{{ i + 1 }}</text></view>
            </view>
            <view class="db-contrib-info">
              <text class="db-contrib-name">{{ c.name }}</text>
              <text class="db-contrib-posts">{{ c.postCount }}篇帖子</text>
            </view>
          </view>
        </view>
        <view v-else class="db-empty"><text class="db-empty-t">暂无贡献数据</text></view>
      </view>

      <!-- 热门内容 -->
      <view class="db-card">
        <text class="db-card-title">热门内容 TOP5</text>
        <view v-if="hotPosts.length" class="db-list">
          <view v-for="(p, i) in hotPosts" :key="p.id" class="db-hot" @tap="openPost(p.id)">
            <view class="db-hot-rank" :style="{ background: hotBg(i), color: hotColor(i) }"><text class="db-hot-rank-t" :style="{ color: hotColor(i) }">{{ i + 1 }}</text></view>
            <view class="db-hot-info">
              <text class="db-hot-title">{{ p.title }}</text>
              <view class="db-hot-meta">
                <view class="db-hot-stat"><app-icon name="heart" :size="20" color="#999999" /><text class="db-hot-stat-t">{{ fmtNum(p.likeCount) }}</text></view>
                <view class="db-hot-stat"><app-icon name="message-circle" :size="20" color="#999999" /><text class="db-hot-stat-t">{{ p.commentCount }}</text></view>
              </view>
            </view>
          </view>
        </view>
        <view v-else class="db-empty"><text class="db-empty-t">暂无热门内容</text></view>
      </view>

      <!-- 收益构成 -->
      <view class="db-card">
        <view class="db-card-head">
          <text class="db-card-title">收益概览</text>
          <text class="db-revenue-total">¥{{ fmtNum(revenue?.totalAmount || 0) }}</text>
        </view>
        <view v-if="revenueItems.length" class="db-revenue-list">
          <view v-for="(item, i) in revenueItems" :key="i" class="db-revenue-item">
            <view class="db-revenue-row">
              <view class="db-revenue-name-wrap">
                <view class="db-revenue-dot" :style="{ background: item.color }" />
                <text class="db-revenue-name">{{ item.name }}</text>
              </view>
              <text class="db-revenue-value">¥{{ fmtNum(item.value) }}</text>
            </view>
            <view class="db-revenue-track">
              <view class="db-revenue-fill" :style="{ width: item.percent + '%', background: item.color }" />
            </view>
          </view>
        </view>
        <view v-else class="db-empty"><text class="db-empty-t">暂无收益数据</text></view>
      </view>
      <view class="db-spacer" />
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.db { display: flex; flex-direction: column; height: 100vh; background: #faf8f5; }
.db-hdr { display: flex; align-items: center; justify-content: space-between; height: 88rpx; padding: 0 16rpx; background: #ffffff; border-bottom: 2rpx solid #e8e3db; padding-top: var(--status-bar-height, 0); flex-shrink: 0; }
.db-hdr-l { display: flex; align-items: center; gap: 12rpx; }
.db-hdr-btn { width: 56rpx; height: 56rpx; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; }
.db-hdr-title { font-size: 32rpx; font-weight: 600; color: #2c2c2c; }
.spin { animation: db-spin 1s linear infinite; }
@keyframes db-spin { to { transform: rotate(360deg); } }
.db-body { flex: 1; overflow: hidden; padding: 24rpx; }
.db-kpis { display: grid; grid-template-columns: 1fr 1fr; gap: 18rpx; margin-bottom: 24rpx; }
.db-kpi { background: #ffffff; border-radius: 24rpx; padding: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.db-kpi-top { display: flex; align-items: center; gap: 12rpx; margin-bottom: 16rpx; }
.db-kpi-icon { width: 52rpx; height: 52rpx; border-radius: 14rpx; display: flex; align-items: center; justify-content: center; }
.db-kpi-label { font-size: 22rpx; color: #999999; }
.db-kpi-bot { display: flex; align-items: flex-end; justify-content: space-between; }
.db-kpi-value { font-size: 38rpx; font-weight: 700; color: #2c2c2c; }
.db-kpi-growth { display: flex; align-items: center; gap: 2rpx; }
.db-kpi-growth-t { font-size: 22rpx; }
.db-card { background: #ffffff; border-radius: 24rpx; padding: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); margin-bottom: 24rpx; }
.db-card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.db-card-title { font-size: 30rpx; font-weight: 600; color: #2c2c2c; }
.db-trend-tabs { display: flex; gap: 8rpx; }
.db-trend-tab { padding: 8rpx 18rpx; border-radius: 999rpx; background: #faf8f5; }
.db-trend-tab.on { background: var(--brand); }
.db-trend-tab-t { font-size: 22rpx; color: #666666; }
.db-trend-tab-t.on { color: #ffffff; }
.db-chart { height: 200rpx; display: flex; align-items: flex-end; gap: 4rpx; }
.db-bar { flex: 1; border-radius: 6rpx 6rpx 0 0; background: linear-gradient(180deg, #e8e3db 0%, #f5f0e8 100%); }
.db-bar.last { background: linear-gradient(180deg, var(--brand) 0%, #e85a71 100%); }
.db-chart-axis { display: flex; justify-content: space-between; margin-top: 12rpx; }
.db-axis-t { font-size: 22rpx; color: #999999; }
.db-list { display: flex; flex-direction: column; gap: 24rpx; }
.db-contrib { display: flex; align-items: center; gap: 18rpx; }
.db-contrib-avatar-wrap { position: relative; }
.db-contrib-avatar { width: 72rpx; height: 72rpx; border-radius: 999rpx; background: linear-gradient(135deg, #c9a96e, #e8d5b7); display: flex; align-items: center; justify-content: center; }
.db-contrib-avatar-t { font-size: 26rpx; color: #ffffff; font-weight: 500; }
.db-contrib-rank { position: absolute; top: -6rpx; right: -6rpx; width: 30rpx; height: 30rpx; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; }
.db-contrib-rank-t { font-size: 18rpx; font-weight: 700; color: #ffffff; }
.db-contrib-info { flex: 1; min-width: 0; }
.db-contrib-name { display: block; font-size: 26rpx; font-weight: 500; color: #2c2c2c; }
.db-contrib-posts { display: block; font-size: 22rpx; color: #999999; margin-top: 2rpx; }
.db-contrib-likes { display: flex; align-items: center; gap: 4rpx; }
.db-contrib-likes-t { font-size: 22rpx; color: var(--brand); }
.db-hot { display: flex; align-items: flex-start; gap: 16rpx; padding: 12rpx; border-radius: 16rpx; }
.db-hot-rank { width: 40rpx; height: 40rpx; border-radius: 10rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.db-hot-rank-t { font-size: 22rpx; font-weight: 700; }
.db-hot-info { flex: 1; min-width: 0; }
.db-hot-title { display: block; font-size: 26rpx; color: #2c2c2c; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.db-hot-meta { display: flex; align-items: center; gap: 20rpx; margin-top: 8rpx; }
.db-hot-stat { display: flex; align-items: center; gap: 4rpx; }
.db-hot-stat-t { font-size: 20rpx; color: #999999; }
.db-churn { background: linear-gradient(90deg, #fff7e6, #fff1d6); border-radius: 24rpx; padding: 24rpx; border: 2rpx solid #ffd591; margin-bottom: 24rpx; }
.db-churn-head { display: flex; align-items: center; gap: 8rpx; margin-bottom: 18rpx; }
.db-churn-title { font-size: 30rpx; font-weight: 600; color: #2c2c2c; }
.db-churn-count { margin-left: auto; padding: 2rpx 14rpx; background: #fa8c16; border-radius: 999rpx; }
.db-churn-count-t { font-size: 20rpx; color: #ffffff; }
.db-churn-list { display: flex; flex-direction: column; gap: 12rpx; }
.db-churn-item { display: flex; align-items: center; gap: 16rpx; padding: 16rpx; background: rgba(255,255,255,0.6); border-radius: 16rpx; }
.db-churn-avatar { width: 56rpx; height: 56rpx; border-radius: 999rpx; background: #faf8f5; display: flex; align-items: center; justify-content: center; }
.db-churn-avatar-t { font-size: 24rpx; color: #999999; }
.db-churn-info { flex: 1; }
.db-churn-name { display: block; font-size: 26rpx; color: #2c2c2c; }
.db-churn-days { display: block; font-size: 22rpx; color: #999999; margin-top: 2rpx; }
.db-churn-wake { font-size: 22rpx; color: #fa8c16; }
.db-revenue-total { font-size: 34rpx; font-weight: 700; color: var(--brand); }
.db-revenue-list { display: flex; flex-direction: column; gap: 24rpx; }
.db-revenue-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8rpx; }
.db-revenue-name-wrap { display: flex; align-items: center; gap: 12rpx; }
.db-revenue-dot { width: 16rpx; height: 16rpx; border-radius: 999rpx; }
.db-revenue-name { font-size: 26rpx; color: #666666; }
.db-revenue-value { font-size: 26rpx; font-weight: 500; color: #2c2c2c; }
.db-revenue-track { height: 16rpx; background: #f5f5f5; border-radius: 999rpx; overflow: hidden; }
.db-revenue-fill { height: 100%; border-radius: 999rpx; }
.db-spacer { height: 40rpx; }
.db-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20rpx; }
.db-state-t { font-size: 26rpx; color: #999999; }
.db-state-btn { margin-top: 8rpx; padding: 14rpx 48rpx; background: var(--brand); border-radius: 999rpx; }
.db-state-btn-t { font-size: 26rpx; color: #ffffff; }
.db-empty { padding: 48rpx 0; display: flex; align-items: center; justify-content: center; }
.db-empty-t { font-size: 24rpx; color: #bbbbbb; }
</style>
