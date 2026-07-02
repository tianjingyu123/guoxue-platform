<script setup lang="ts">
/**
 * 圈子数据看板（真连后端）
 * 健康度分数卡 + 概览KPI卡(成员/活跃/本月新增) + 近30天趋势 + 流失预警 +
 * 待回复提问入口 + 活跃贡献者TOP5 + 热门内容TOP5 + 收益构成
 *
 * 数据来源：
 * - overview / revenue：/circle-backend/*（后端取当前圈主的圈子，不传 circleId）
 * - contributors / hotPosts：/circles/:id/leaderboard、/circles/:id/hot-content（需 circleId）
 * - trends / churn / pendingQuestions：/circles/:id/dashboard/*（需 circleId，圈主鉴权）
 * - 健康度：前端纯函数用 overview 真实字段加权合成（见 computeCircleHealth 注释），无编造数据
 *
 * 说明：KPI 增长率、总帖子数、贡献者点赞数、帖子浏览量后端均无来源 → 一律降级隐藏。
 *      三个 dashboard 扩展接口用 Promise.allSettled 逐项容错，单项失败只隐藏对应区块不拖垮整页。
 */
import { onLoad } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import {
  computeCircleHealth,
  dashboardApi,
  fillTrendDays,
  type DashboardChurnWarning,
  type DashboardContributor,
  type DashboardHotPost,
  type DashboardOverview,
  type DashboardPendingQuestion,
  type DashboardRevenue,
  type DashboardTrendPoint,
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

// 近30天趋势（补齐为连续30天）；null = 接口失败/未加载 → 整块隐藏
const trendDays = ref<DashboardTrendPoint[] | null>(null)
// 趋势图指标切换：新增成员 / 收入
const trendMetric = ref<'newMembers' | 'revenue'>('newMembers')
// 流失预警；null = 接口失败 → 整块隐藏；count=0 → 也隐藏（无预警即无噪音）
const churn = ref<DashboardChurnWarning | null>(null)
// 待回复提问；null = 接口失败 → 入口卡隐藏
const pendingQuestions = ref<DashboardPendingQuestion[] | null>(null)

// 圈子健康度（纯函数合成，权重见 lib 内中文注释）
const health = computed(() => (overview.value ? computeCircleHealth(overview.value) : null))
const HEALTH_COLORS: Record<string, string> = {
  excellent: '#52C41A',
  good: '#4A90D9',
  normal: '#FA8C16',
  warn: '#FF4D4F',
}

// 趋势图：当前指标下各柱高度百分比（纯 view 宽/高实现，不引第三方图表库）
const trendBars = computed(() => {
  const days = trendDays.value || []
  const max = Math.max(...days.map((d) => d[trendMetric.value]), 0)
  return days.map((d) => ({
    date: d.date,
    value: d[trendMetric.value],
    // 有数据的柱至少 4% 高度保证可见；全 0 时高度为 0
    percent: max > 0 ? Math.max(Math.round((d[trendMetric.value] / max) * 100), d[trendMetric.value] > 0 ? 4 : 0) : 0,
  }))
})
// 近30天是否有任何数据（全 0 则展示轻空态）
const trendHasData = computed(() => (trendDays.value || []).some((d) => d.newMembers > 0 || d.revenue > 0))
// 近30天合计（当前指标）
const trendTotal = computed(() =>
  (trendDays.value || []).reduce((sum, d) => sum + d[trendMetric.value], 0),
)
// 横轴首尾日期标签（MM-DD）
const trendAxis = computed(() => {
  const days = trendDays.value || []
  if (!days.length) return { start: '', end: '' }
  return { start: days[0].date.slice(5), end: days[days.length - 1].date.slice(5) }
})

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
      // 趋势/流失预警/待回复提问：allSettled 逐项容错，单项失败仅隐藏对应区块，不拖垮整页
      const [trendRes, churnRes, pqRes] = await Promise.allSettled([
        dashboardApi.trends(circleId.value),
        dashboardApi.churnWarning(circleId.value),
        dashboardApi.pendingQuestions(circleId.value),
      ])
      trendDays.value = trendRes.status === 'fulfilled' ? fillTrendDays(trendRes.value, 30) : null
      churn.value = churnRes.status === 'fulfilled' ? churnRes.value : null
      pendingQuestions.value = pqRes.status === 'fulfilled' ? pqRes.value : null
    } else {
      contributors.value = []
      hotPosts.value = []
      trendDays.value = null
      churn.value = null
      pendingQuestions.value = null
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
// 跳转到提问详情页（圈主可在详情页直接回答/拒答）
function openQuestion(id: string) {
  if (!id) return
  navigateTo(`/pkg-circle/circles/question-detail?id=${id}`)
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
      <!-- 圈子健康度（前端纯函数用 overview 真实数据合成，权重见 lib 注释） -->
      <view v-if="health" class="db-health">
        <view class="db-health-score-wrap">
          <text class="db-health-score" :style="{ color: HEALTH_COLORS[health.level] }">{{ health.score }}</text>
          <text class="db-health-unit">分</text>
        </view>
        <view class="db-health-info">
          <view class="db-health-head">
            <text class="db-health-title">圈子健康度</text>
            <view class="db-health-track">
              <view class="db-health-fill" :style="{ width: health.score + '%', background: HEALTH_COLORS[health.level] }" />
            </view>
          </view>
          <text class="db-health-comment">{{ health.comment }}</text>
        </view>
      </view>

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

      <!-- 近30天趋势（接口失败整块隐藏；有接口但全 0 展示轻空态） -->
      <view v-if="trendDays" class="db-card">
        <view class="db-card-head">
          <text class="db-card-title">近30天趋势</text>
          <view class="db-trend-tabs">
            <view class="db-trend-tab" :class="{ on: trendMetric === 'newMembers' }" @tap="trendMetric = 'newMembers'">
              <text class="db-trend-tab-t" :class="{ on: trendMetric === 'newMembers' }">新增成员</text>
            </view>
            <view class="db-trend-tab" :class="{ on: trendMetric === 'revenue' }" @tap="trendMetric = 'revenue'">
              <text class="db-trend-tab-t" :class="{ on: trendMetric === 'revenue' }">收入</text>
            </view>
          </view>
        </view>
        <template v-if="trendHasData">
          <text class="db-trend-total">
            近30天{{ trendMetric === 'newMembers' ? '新增成员' : '入圈收入' }}合计
            {{ trendMetric === 'newMembers' ? fmtNum(trendTotal) + ' 人' : '¥' + fmtNum(trendTotal) }}
          </text>
          <view class="db-chart">
            <view
              v-for="(b, i) in trendBars"
              :key="b.date"
              class="db-bar"
              :class="{ last: i === trendBars.length - 1 }"
              :style="{ height: b.percent + '%' }"
            />
          </view>
          <view class="db-chart-axis">
            <text class="db-axis-t">{{ trendAxis.start }}</text>
            <text class="db-axis-t">{{ trendAxis.end }}</text>
          </view>
        </template>
        <view v-else class="db-empty"><text class="db-empty-t">近30天暂无新增与收入</text></view>
      </view>

      <!-- 待回复提问入口卡（无待回复则隐藏，避免噪音） -->
      <view v-if="pendingQuestions && pendingQuestions.length" class="db-card">
        <view class="db-card-head">
          <view class="db-pq-head-l">
            <text class="db-card-title">待回复提问</text>
            <view class="db-pq-badge"><text class="db-pq-badge-t">{{ pendingQuestions.length }}</text></view>
          </view>
          <text class="db-pq-tip">及时回复可提升口碑</text>
        </view>
        <view class="db-list">
          <view v-for="q in pendingQuestions" :key="q.id" class="db-pq-item" @tap="openQuestion(q.id)">
            <view class="db-pq-info">
              <text class="db-pq-title">{{ q.title }}</text>
              <text class="db-pq-meta">{{ q.askerName }} · 悬赏 {{ q.priceCoin }} 币</text>
            </view>
            <app-icon name="chevron-right" :size="28" color="#bbbbbb" />
          </view>
        </view>
      </view>

      <!-- 流失预警（近14天不活跃；无预警或接口失败则隐藏） -->
      <view v-if="churn && churn.count > 0" class="db-churn">
        <view class="db-churn-head">
          <app-icon name="alert-triangle" :size="30" color="#FA8C16" />
          <text class="db-churn-title">流失预警</text>
          <view class="db-churn-count"><text class="db-churn-count-t">{{ churn.count }} 人</text></view>
        </view>
        <view class="db-churn-list">
          <view v-for="m in churn.atRisk.slice(0, 5)" :key="m.userId" class="db-churn-item">
            <view class="db-churn-avatar">
              <image v-if="m.avatar" lazy-load class="db-churn-avatar-img" :src="m.avatar" mode="aspectFill" />
              <text v-else class="db-churn-avatar-t">{{ m.name[0] }}</text>
            </view>
            <view class="db-churn-info">
              <text class="db-churn-name">{{ m.name }}</text>
              <text class="db-churn-days">近14天无发帖/评论</text>
            </view>
          </view>
        </view>
        <text v-if="churn.count > 5" class="db-churn-more">另有 {{ churn.count - 5 }} 位成员近期不活跃</text>
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
.db-churn-avatar { width: 56rpx; height: 56rpx; border-radius: 999rpx; background: #faf8f5; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.db-churn-avatar-img { width: 100%; height: 100%; }
.db-churn-avatar-t { font-size: 24rpx; color: #999999; }
.db-churn-more { display: block; margin-top: 12rpx; font-size: 22rpx; color: #d48806; text-align: center; }
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
/* 健康度分数卡 */
.db-health { display: flex; align-items: center; gap: 28rpx; background: #ffffff; border-radius: 24rpx; padding: 28rpx 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); margin-bottom: 24rpx; }
.db-health-score-wrap { display: flex; align-items: baseline; flex-shrink: 0; }
.db-health-score { font-size: 64rpx; font-weight: 700; line-height: 1; }
.db-health-unit { font-size: 22rpx; color: #999999; margin-left: 4rpx; }
.db-health-info { flex: 1; min-width: 0; }
.db-health-head { display: flex; align-items: center; gap: 16rpx; margin-bottom: 10rpx; }
.db-health-title { font-size: 28rpx; font-weight: 600; color: #2c2c2c; flex-shrink: 0; }
.db-health-track { flex: 1; height: 12rpx; background: #f5f5f5; border-radius: 999rpx; overflow: hidden; }
.db-health-fill { height: 100%; border-radius: 999rpx; transition: width 0.4s ease; }
.db-health-comment { display: block; font-size: 22rpx; color: #999999; }
/* 近30天趋势 */
.db-trend-total { display: block; font-size: 22rpx; color: #666666; margin-bottom: 16rpx; }
/* 待回复提问入口卡 */
.db-pq-head-l { display: flex; align-items: center; gap: 12rpx; }
.db-pq-badge { min-width: 36rpx; height: 36rpx; padding: 0 10rpx; border-radius: 999rpx; background: var(--brand); display: flex; align-items: center; justify-content: center; }
.db-pq-badge-t { font-size: 20rpx; font-weight: 600; color: #ffffff; }
.db-pq-tip { font-size: 22rpx; color: #999999; }
.db-pq-item { display: flex; align-items: center; gap: 12rpx; padding: 16rpx; background: #faf8f5; border-radius: 16rpx; }
.db-pq-info { flex: 1; min-width: 0; }
.db-pq-title { display: block; font-size: 26rpx; color: #2c2c2c; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.db-pq-meta { display: block; font-size: 22rpx; color: #999999; margin-top: 4rpx; }
.db-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20rpx; }
.db-state-t { font-size: 26rpx; color: #999999; }
.db-state-btn { margin-top: 8rpx; padding: 14rpx 48rpx; background: var(--brand); border-radius: 999rpx; }
.db-state-btn-t { font-size: 26rpx; color: #ffffff; }
.db-empty { padding: 48rpx 0; display: flex; align-items: center; justify-content: center; }
.db-empty-t { font-size: 24rpx; color: #bbbbbb; }
</style>
