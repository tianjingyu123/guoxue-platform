<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="header">
      <view class="header-inner">
        <text
          class="back-btn"
          @click="goBack"
        >
          ←
        </text>
        <text class="header-title">
          分站管理
        </text>
        <view
          class="header-notif"
          @click="goNotifications"
        >
          <text class="header-notif-icon">
            🔔
          </text>
        </view>
      </view>
    </view>

    <DataState
      :is-loading="loading"
      :error="loadError"
      :is-empty="!panelData"
      empty-icon="🏪"
      empty-title="暂无数据"
      skeleton-type="card"
      @retry="loadData"
    >
      <view
        v-if="panelData"
        class="content"
      >
        <!-- 分站信息卡片 -->
        <view class="station-card">
          <view class="station-card-top">
            <view class="station-info">
              <view class="station-level-row">
                <text class="station-crown">
                  👑
                </text>
                <text class="station-level-badge">
                  {{ panelData.stationInfo.levelName }}
                </text>
              </view>
              <text class="station-name">
                {{ panelData.stationInfo.name }}
              </text>
              <text class="station-date">
                创建于 {{ panelData.stationInfo.createTime }}
              </text>
            </view>
            <view class="station-status-col">
              <text
                class="station-status-badge"
                :class="'ssb-' + panelData.stationInfo.status"
              >
                {{ statusLabel(panelData.stationInfo.status) }}
              </text>
              <text
                v-if="panelData.stationInfo.expireTime"
                class="station-expire"
              >
                有效期至 {{ panelData.stationInfo.expireTime }}
              </text>
            </view>
          </view>
        </view>

        <!-- 数据概览 -->
        <view class="overview-grid">
          <view
            v-for="(item, idx) in panelData.overview"
            :key="idx"
            class="overview-card"
            @click="goAnalytics"
          >
            <view class="overview-icon-row">
              <text class="overview-mini-icon">
                {{ overviewIcon(item.icon) }}
              </text>
              <text class="overview-label">
                {{ item.label }}
              </text>
            </view>
            <view class="overview-value-row">
              <text class="overview-value">
                {{ formatOverviewValue(item.value) }}
              </text>
              <text
                v-if="item.unit"
                class="overview-unit"
              >
                {{ item.unit }}
              </text>
            </view>
            <view
              v-if="item.trend !== undefined && item.trend !== 0"
              class="overview-trend"
            >
              <text
                v-if="item.trendType === 'up'"
                class="trend-up"
              >
                ↑
              </text>
              <text
                v-else-if="item.trendType === 'down'"
                class="trend-down"
              >
                ↓
              </text>
              <text :class="item.trendType === 'up' ? 'trend-up' : 'trend-down'">
                {{ Math.abs(item.trend) }}%
              </text>
            </view>
          </view>
        </view>

        <!-- 余额信息 -->
        <view class="balance-card">
          <view class="balance-header">
            <text class="balance-title">
              收益余额
            </text>
            <view
              class="balance-withdraw-btn"
              @click="goWithdraw"
            >
              <text class="balance-withdraw-text">
                申请提现
              </text>
            </view>
          </view>
          <view class="balance-grid">
            <view class="balance-item">
              <text class="balance-value balance-value-primary">
                {{ panelData.balance.available.toLocaleString() }}
              </text>
              <text class="balance-label">
                可提现
              </text>
            </view>
            <view class="balance-item">
              <text class="balance-value balance-value-gold">
                {{ panelData.balance.pending.toLocaleString() }}
              </text>
              <text class="balance-label">
                待结算
              </text>
            </view>
            <view class="balance-item">
              <text class="balance-value">
                {{ panelData.balance.withdrawn.toLocaleString() }}
              </text>
              <text class="balance-label">
                已提现
              </text>
            </view>
            <view class="balance-item">
              <text class="balance-value balance-value-muted">
                {{ panelData.balance.frozen.toLocaleString() }}
              </text>
              <text class="balance-label">
                冻结
              </text>
            </view>
          </view>
        </view>

        <!-- 趋势图 -->
        <view class="trend-card">
          <view class="trend-top">
            <view class="trend-tabs">
              <text
                v-for="t in trendTypes"
                :key="t.value"
                class="trend-tab"
                :class="{ active: activeTrend === t.value }"
                @click="switchTrendType(t.value)"
              >
                {{ t.label }}
              </text>
            </view>
            <view class="trend-period-tabs">
              <text
                v-for="p in trendPeriods"
                :key="p.value"
                class="trend-period-tab"
                :class="{ active: trendPeriod === p.value }"
                @click="switchTrendPeriod(p.value)"
              >
                {{ p.label }}
              </text>
            </view>
          </view>

          <view
            v-for="trend in filteredTrends"
            :key="trend.type"
            class="trend-body"
          >
            <view class="trend-total-row">
              <text class="trend-total-value">
                {{ trend.total.toLocaleString() }}
              </text>
              <text class="trend-total-unit">
                {{ activeTrend === 'revenue' ? '元' : '单' }}
              </text>
              <text
                class="trend-change"
                :class="trend.change >= 0 ? 'trend-up' : 'trend-down'"
              >
                {{ trend.change >= 0 ? '+' : '' }}{{ trend.change }}%
              </text>
            </view>
            <view class="chart-area">
              <view
                v-for="(point, pi) in trend.data"
                :key="pi"
                class="chart-bar-col"
              >
                <view class="chart-bar-outer">
                  <view
                    class="chart-bar-inner"
                    :style="{ height: getBarHeight(point.value, trend.data) + '%' }"
                  />
                </view>
                <text class="chart-bar-label">
                  {{ point.date.slice(-2) }}
                </text>
              </view>
            </view>
          </view>
        </view>

        <!-- 快捷入口 -->
        <view class="quick-section">
          <text class="section-title">
            快捷功能
          </text>
          <view class="quick-grid">
            <view
              v-for="action in panelData.quickActions"
              :key="action.id"
              class="quick-item"
              @click="goQuick(action)"
            >
              <view class="quick-icon-wrap">
                <text class="quick-icon">
                  {{ quickActionIcon(action.icon) }}
                </text>
                <text
                  v-if="action.badge && action.badge > 0"
                  class="quick-badge"
                >
                  {{ action.badge }}
                </text>
              </view>
              <text class="quick-label">
                {{ action.label }}
              </text>
            </view>
          </view>
        </view>

        <!-- 成员统计 -->
        <view class="member-card">
          <view class="member-header">
            <text class="section-title">
              团队成员
            </text>
            <view
              class="member-view-all"
              @click="goTeam"
            >
              <text class="member-view-text">
                查看全部
              </text>
              <text class="member-view-arrow">
                →
              </text>
            </view>
          </view>
          <view class="member-summary">
            <view class="member-stat-item">
              <text class="member-stat-value">
                {{ panelData.memberStats.total }}
              </text>
              <text class="member-stat-label">
                总成员
              </text>
            </view>
            <view class="member-stat-item">
              <text class="member-stat-value member-stat-value-gold">
                {{ panelData.memberStats.active }}
              </text>
              <text class="member-stat-label">
                本月活跃
              </text>
            </view>
            <view class="member-stat-item">
              <text class="member-stat-value member-stat-value-green">
                +{{ panelData.memberStats.newThisMonth }}
              </text>
              <text class="member-stat-label">
                本月新增
              </text>
            </view>
          </view>
          <view class="member-level-list">
            <view
              v-for="level in panelData.memberStats.levelDistribution"
              :key="level.level"
              class="member-level-row"
            >
              <text class="member-level-label">
                {{ level.label }}
              </text>
              <view class="member-level-bar-bg">
                <view
                  class="member-level-bar-fill"
                  :style="{ width: (level.count / panelData.memberStats.total * 100) + '%' }"
                />
              </view>
              <text class="member-level-count">
                {{ level.count }}
              </text>
            </view>
          </view>
        </view>

        <!-- 最新通知 -->
        <view
          v-if="panelData.notices.length > 0"
          class="notice-card"
        >
          <view class="notice-header">
            <text class="section-title">
              最新通知
            </text>
            <view
              class="notice-view-all"
              @click="goNotifications"
            >
              <text class="notice-view-text">
                全部
              </text>
              <text class="notice-view-arrow">
                →
              </text>
            </view>
          </view>
          <view class="notice-list">
            <view
              v-for="notice in panelData.notices.slice(0, 3)"
              :key="notice.id"
              class="notice-item"
            >
              <text class="notice-type-icon">
                {{ noticeIcon(notice.type) }}
              </text>
              <view class="notice-info">
                <text class="notice-title">
                  {{ notice.title }}
                </text>
                <text class="notice-time">
                  {{ notice.createdAt }}
                </text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </DataState>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import DataState from '../../components/DataState.vue'

interface TrendPoint {
  date: string
  value: number
}

interface TrendData {
  type: string
  total: number
  change: number
  data: TrendPoint[]
}

interface StationInfo {
  name: string
  levelName: string
  status: string
  createTime: string
  expireTime?: string
}

interface OverviewItem {
  icon?: string
  label: string
  value: number
  unit?: string
  trend?: number
  trendType?: 'up' | 'down' | 'flat'
}

interface BalanceInfo {
  available: number
  pending: number
  withdrawn: number
  frozen: number
}

interface QuickActionItem {
  id: string
  label: string
  icon: string
  path: string
  badge?: number
}

interface LevelDistribution {
  level: string
  label: string
  count: number
}

interface MemberStats {
  total: number
  active: number
  newThisMonth: number
  levelDistribution: LevelDistribution[]
}

interface NoticeItem {
  id: string
  type: 'info' | 'warning' | 'success'
  title: string
  createdAt: string
}

interface PanelData {
  stationInfo: StationInfo
  overview: OverviewItem[]
  balance: BalanceInfo
  trends: TrendData[]
  quickActions: QuickActionItem[]
  memberStats: MemberStats
  notices: NoticeItem[]
}

const loading = ref(true)
const loadError = ref<string | null>(null)
const panelData = ref<PanelData | null>(null)
const activeTrend = ref<'revenue' | 'orders'>('revenue')
const trendPeriod = ref<'week' | 'month'>('week')

const trendTypes = [
  { label: '收益', value: 'revenue' },
  { label: '订单', value: 'orders' },
]

const trendPeriods = [
  { label: '本周', value: 'week' },
  { label: '本月', value: 'month' },
]

const filteredTrends = computed(() => {
  if (!panelData.value) return []
  return panelData.value.trends.filter((t) => t.type === activeTrend.value)
})

function statusLabel(status: string): string {
  const map: Record<string, string> = { active: '正常运营', expired: '已过期', suspended: '已暂停' }
  return map[status] || status
}

function overviewIcon(icon?: string): string {
  const map: Record<string, string> = { users: '👥', revenue: '💰', orders: '🛍', total: '💳', visits: '👁', conversion: '🎯' }
  return map[icon || ''] || '📊'
}

function quickActionIcon(icon: string): string {
  const map: Record<string, string> = { users: '👥', image: '🖼', settings: '⚙', wallet: '💰', list: '📋', chart: '📊', money: '💳', help: '❓' }
  return map[icon] || '📊'
}

function noticeIcon(type: string): string {
  const map: Record<string, string> = { info: 'ℹ', warning: '⚠', success: '✅' }
  return map[type] || 'ℹ'
}

function formatOverviewValue(val: number): string {
  if (val >= 10000) return (val / 10000).toFixed(1) + '万'
  return val.toLocaleString()
}

function getBarHeight(value: number, data: TrendPoint[]): number {
  const maxVal = Math.max(...data.map((d) => d.value), 1)
  return (value / maxVal) * 100
}

function switchTrendType(val: string) {
  activeTrend.value = val as any
}

function switchTrendPeriod(val: string) {
  trendPeriod.value = val as any
}

async function loadData() {
  loading.value = true
  loadError.value = null
  try {
    await new Promise((r) => setTimeout(r, 600))
    panelData.value = {
      stationInfo: {
        name: '国学文化分站·北京',
        levelName: '金牌分站',
        status: 'active',
        createTime: '2024-01-15',
        expireTime: '2026-12-31',
      },
      overview: [
        { icon: 'users', label: '总用户', value: 12560 },
        { icon: 'revenue', label: '本月收入', value: 89500, unit: '元', trend: 12.5, trendType: 'up' },
        { icon: 'orders', label: '今日订单', value: 128, trend: 8.3, trendType: 'up' },
        { icon: 'visits', label: '今日访问', value: 2340, trend: -3.2, trendType: 'down' },
        { icon: 'conversion', label: '转化率', value: 3.6, unit: '%', trend: 1.2, trendType: 'up' },
        { icon: 'total', label: '累计收益', value: 568000, unit: '元' },
      ],
      balance: {
        available: 28500,
        pending: 12500,
        withdrawn: 526000,
        frozen: 3000,
      },
      trends: [
        {
          type: 'revenue', total: 568000, change: 12.5,
          data: [
            { date: '06-01', value: 12000 }, { date: '06-02', value: 15000 },
            { date: '06-03', value: 11000 }, { date: '06-04', value: 18000 },
            { date: '06-05', value: 22000 }, { date: '06-06', value: 16000 },
            { date: '06-07', value: 25000 },
          ],
        },
        {
          type: 'orders', total: 856, change: -2.1,
          data: [
            { date: '06-01', value: 120 }, { date: '06-02', value: 135 },
            { date: '06-03', value: 98 }, { date: '06-04', value: 145 },
            { date: '06-05', value: 160 }, { date: '06-06', value: 108 },
            { date: '06-07', value: 90 },
          ],
        },
      ],
      quickActions: [
        { id: 'qa1', label: '用户管理', icon: 'users', path: '/mine/station/users', badge: 0 },
        { id: 'qa2', label: '内容管理', icon: 'image', path: '/mine/station/content', badge: 0 },
        { id: 'qa3', label: '分站配置', icon: 'settings', path: '/mine/station/config', badge: 0 },
        { id: 'qa4', label: '收益提现', icon: 'wallet', path: '/mine/station/withdraw', badge: 0 },
        { id: 'qa5', label: '订单管理', icon: 'list', path: '/mine/station/orders', badge: 5 },
        { id: 'qa6', label: '数据统计', icon: 'chart', path: '/mine/station/stats', badge: 0 },
        { id: 'qa7', label: '财务明细', icon: 'money', path: '/mine/station/finance', badge: 0 },
        { id: 'qa8', label: '帮助中心', icon: 'help', path: '/mine/station/help', badge: 0 },
      ],
      memberStats: {
        total: 36,
        active: 28,
        newThisMonth: 5,
        levelDistribution: [
          { level: 'admin', label: '管理员', count: 2 },
          { level: 'editor', label: '编辑', count: 8 },
          { level: 'teacher', label: '讲师', count: 15 },
          { level: 'assistant', label: '助教', count: 11 },
        ],
      },
      notices: [
        { id: 'n1', type: 'info', title: '平台内容审核新规将于7月1日起实施', createdAt: '2026-06-03' },
        { id: 'n2', type: 'warning', title: '您的分站存储空间即将用尽，请及时扩容', createdAt: '2026-06-02' },
        { id: 'n3', type: 'success', title: '6月收益已结算，共89,500元', createdAt: '2026-06-01' },
      ],
    }
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function goAnalytics() {
  uni.showToast({ title: '查看数据分析', icon: 'none' })
}

function goWithdraw() {
  uni.showToast({ title: '申请提现', icon: 'none' })
}

function goQuick(action: QuickActionItem) {
  uni.showToast({ title: '打开：' + action.label, icon: 'none' })
}

function goTeam() {
  uni.showToast({ title: '查看全部团队成员', icon: 'none' })
}

function goNotifications() {
  uni.showToast({ title: '消息通知列表', icon: 'none' })
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.page { background: #FAF8F5; min-height: 100vh; padding-bottom: 48rpx; }
.header { background: #C41E3A; }
.header-inner { display: flex; align-items: center; justify-content: space-between; height: 88rpx; padding: 0 24rpx; }
.back-btn { font-size: 36rpx; color: #fff; padding: 8rpx; }
.header-title { font-size: 34rpx; font-weight: 600; color: #fff; }
.header-notif { padding: 8rpx; }
.header-notif-icon { font-size: 36rpx; color: #fff; }

.content { padding: 24rpx; }

/* 分站信息卡片 */
.station-card { background: linear-gradient(135deg, #C41E3A, #E85A5A); border-radius: 24rpx; padding: 32rpx 28rpx; margin-bottom: 24rpx; }
.station-card-top { display: flex; justify-content: space-between; }
.station-info { }
.station-level-row { display: flex; align-items: center; gap: 8rpx; }
.station-crown { font-size: 28rpx; color: #C9A96E; }
.station-level-badge { font-size: 20rpx; padding: 4rpx 16rpx; background: #C9A96E; color: #fff; border-radius: 16rpx; }
.station-name { font-size: 34rpx; font-weight: 700; color: #fff; display: block; margin-top: 12rpx; }
.station-date { font-size: 22rpx; color: rgba(255,255,255,0.7); display: block; margin-top: 8rpx; }
.station-status-col { text-align: right; }
.station-status-badge { font-size: 20rpx; padding: 6rpx 20rpx; border-radius: 16rpx; display: inline-block; }
.ssb-active { background: #22C55E; color: #fff; }
.ssb-expired { background: #9CA3AF; color: #fff; }
.ssb-suspended { background: #F59E0B; color: #fff; }
.station-expire { font-size: 20rpx; color: rgba(255,255,255,0.7); display: block; margin-top: 8rpx; }

/* 数据概览 */
.overview-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16rpx; margin-bottom: 24rpx; }
.overview-card { background: #fff; border-radius: 16rpx; padding: 20rpx 16rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.overview-icon-row { display: flex; align-items: center; gap: 6rpx; margin-bottom: 8rpx; }
.overview-mini-icon { font-size: 20rpx; }
.overview-label { font-size: 18rpx; color: #999; }
.overview-value-row { display: flex; align-items: baseline; gap: 4rpx; }
.overview-value { font-size: 32rpx; font-weight: 700; color: #2C2C2C; }
.overview-unit { font-size: 20rpx; color: #999; }
.overview-trend { margin-top: 4rpx; }
.trend-up { font-size: 18rpx; color: #22C55E; }
.trend-down { font-size: 18rpx; color: #EF4444; }

/* 余额信息 */
.balance-card { background: #fff; border-radius: 20rpx; padding: 24rpx; margin-bottom: 24rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.balance-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24rpx; }
.balance-title { font-size: 26rpx; font-weight: 600; color: #2C2C2C; }
.balance-withdraw-btn { padding: 10rpx 24rpx; border-radius: 16rpx; border: 1rpx solid #C41E3A; }
.balance-withdraw-text { font-size: 22rpx; color: #C41E3A; }
.balance-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8rpx; text-align: center; }
.balance-value { font-size: 32rpx; font-weight: 700; color: #2C2C2C; display: block; }
.balance-value-primary { color: #C41E3A; }
.balance-value-gold { color: #C9A96E; }
.balance-value-muted { color: #B8B0A4; }
.balance-label { font-size: 18rpx; color: #999; margin-top: 4rpx; display: block; }

/* 趋势图 */
.trend-card { background: #fff; border-radius: 20rpx; padding: 24rpx; margin-bottom: 24rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.trend-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24rpx; }
.trend-tabs { display: flex; gap: 4rpx; background: #F5F0E8; border-radius: 12rpx; padding: 4rpx; }
.trend-tab { padding: 6rpx 20rpx; font-size: 22rpx; color: #999; border-radius: 8rpx; }
.trend-tab.active { background: #fff; color: #C41E3A; font-weight: 500; }
.trend-period-tabs { display: flex; gap: 4rpx; background: #F5F0E8; border-radius: 12rpx; padding: 4rpx; }
.trend-period-tab { padding: 6rpx 20rpx; font-size: 22rpx; color: #999; border-radius: 8rpx; }
.trend-period-tab.active { background: #fff; color: #C41E3A; font-weight: 500; }
.trend-body { }
.trend-total-row { display: flex; align-items: baseline; gap: 8rpx; margin-bottom: 24rpx; }
.trend-total-value { font-size: 40rpx; font-weight: 700; color: #2C2C2C; }
.trend-total-unit { font-size: 22rpx; color: #999; }
.trend-change { font-size: 24rpx; }

/* 简易柱状图 */
.chart-area { display: flex; align-items: flex-end; gap: 8rpx; height: 180rpx; }
.chart-bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8rpx; height: 100%; }
.chart-bar-outer { width: 100%; flex: 1; display: flex; align-items: flex-end; border-radius: 8rpx 8rpx 0 0; background: rgba(196,30,58,0.08); }
.chart-bar-inner { width: 100%; background: #C41E3A; border-radius: 8rpx 8rpx 0 0; min-height: 4rpx; transition: height 0.3s; }
.chart-bar-label { font-size: 18rpx; color: #999; }

/* 快捷入口 */
.quick-section { background: #fff; border-radius: 20rpx; padding: 24rpx; margin-bottom: 24rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.section-title { font-size: 26rpx; font-weight: 600; color: #2C2C2C; display: block; margin-bottom: 20rpx; }
.quick-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24rpx; }
.quick-item { display: flex; flex-direction: column; align-items: center; gap: 8rpx; }
.quick-icon-wrap { width: 80rpx; height: 80rpx; border-radius: 16rpx; background: #FAF8F5; display: flex; align-items: center; justify-content: center; position: relative; }
.quick-icon { font-size: 32rpx; color: #C41E3A; }
.quick-badge { position: absolute; top: -4rpx; right: -4rpx; min-width: 28rpx; height: 28rpx; border-radius: 14rpx; background: #C41E3A; color: #fff; font-size: 16rpx; display: flex; align-items: center; justify-content: center; padding: 0 4rpx; }
.quick-label { font-size: 20rpx; color: #666; text-align: center; }

/* 成员统计 */
.member-card { background: #fff; border-radius: 20rpx; padding: 24rpx; margin-bottom: 24rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.member-header { display: flex; justify-content: space-between; align-items: center; }
.member-header .section-title { margin-bottom: 0; }
.member-view-all { display: flex; align-items: center; gap: 4rpx; }
.member-view-text { font-size: 22rpx; color: #C41E3A; }
.member-view-arrow { font-size: 24rpx; color: #C41E3A; }
.member-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16rpx; margin-top: 20rpx; margin-bottom: 24rpx; }
.member-stat-item { background: #FAF8F5; border-radius: 16rpx; padding: 20rpx 12rpx; text-align: center; }
.member-stat-value { font-size: 36rpx; font-weight: 700; color: #C41E3A; display: block; }
.member-stat-value-gold { color: #C9A96E; }
.member-stat-value-green { color: #22C55E; }
.member-stat-label { font-size: 20rpx; color: #999; display: block; margin-top: 4rpx; }
.member-level-list { }
.member-level-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 12rpx; }
.member-level-label { font-size: 22rpx; color: #666; width: 80rpx; }
.member-level-bar-bg { flex: 1; height: 16rpx; background: #F5F0E8; border-radius: 8rpx; overflow: hidden; }
.member-level-bar-fill { height: 100%; background: #C41E3A; border-radius: 8rpx; transition: width 0.3s; }
.member-level-count { font-size: 22rpx; color: #2C2C2C; font-weight: 500; width: 40rpx; text-align: right; }

/* 通知 */
.notice-card { background: #fff; border-radius: 20rpx; padding: 24rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.notice-header { display: flex; justify-content: space-between; align-items: center; }
.notice-header .section-title { margin-bottom: 0; }
.notice-view-all { display: flex; align-items: center; gap: 4rpx; }
.notice-view-text { font-size: 22rpx; color: #C41E3A; }
.notice-view-arrow { font-size: 24rpx; color: #C41E3A; }
.notice-list { margin-top: 20rpx; }
.notice-item { display: flex; align-items: flex-start; gap: 12rpx; padding: 16rpx; background: #FAF8F5; border-radius: 16rpx; margin-bottom: 12rpx; }
.notice-type-icon { font-size: 24rpx; margin-top: 2rpx; }
.notice-info { flex: 1; }
.notice-title { font-size: 24rpx; color: #2C2C2C; display: block; }
.notice-time { font-size: 18rpx; color: #B8B0A4; display: block; margin-top: 4rpx; }
</style>
