<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="header">
      <view class="header-inner">
        <view class="header-left">
          <text
            class="back-btn"
            @click="goBack"
          >
            ←
          </text>
          <view class="header-info">
            <text class="header-title">
              {{ panelData?.operatorInfo?.name || '运营商中心' }}
            </text>
            <view class="header-level">
              <text class="header-crown">
                👑
              </text>
              <text class="header-level-text">
                {{ panelData?.operatorInfo?.level || '' }}
              </text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <DataState
      :is-loading="loading"
      :error="loadError"
      :is-empty="!panelData"
      empty-icon="🏢"
      empty-title="暂无数据"
      skeleton-type="card"
      @retry="loadData"
    >
      <view
        v-if="panelData"
        class="content"
      >
        <!-- 数据概览 -->
        <view class="overview-grid">
          <view
            v-for="item in panelData.overview"
            :key="item.key"
            class="overview-card"
            @click="goOverviewDetail(item)"
          >
            <text class="overview-label">
              {{ item.label }}
            </text>
            <text class="overview-value">
              {{ formatValue(item.value, item.unit) }}
            </text>
            <view
              v-if="item.trend !== undefined"
              class="overview-trend"
            >
              <text
                v-if="item.trend > 0"
                class="trend-up"
              >
                ↑
              </text>
              <text
                v-else
                class="trend-down"
              >
                ↓
              </text>
              <text :class="item.trend > 0 ? 'trend-up' : 'trend-down'">
                {{ item.trend > 0 ? '+' : '' }}{{ item.trend }}%
              </text>
              <text
                v-if="item.trendLabel"
                class="trend-label"
              >
                {{ item.trendLabel }}
              </text>
            </view>
          </view>
        </view>

        <!-- 快捷功能 -->
        <view class="quick-section">
          <text class="section-title">
            快捷功能
          </text>
          <view class="quick-grid">
            <view
              v-for="action in panelData.quickActions"
              :key="action.key"
              class="quick-item"
              @click="goQuick(action)"
            >
              <view class="quick-icon-wrap">
                <text class="quick-icon">
                  {{ quickIcon(action.icon) }}
                </text>
                <text
                  v-if="action.badge && action.badge > 0"
                  class="quick-badge"
                >
                  {{ action.badge > 99 ? '99+' : action.badge }}
                </text>
              </view>
              <text class="quick-label">
                {{ action.label }}
              </text>
            </view>
          </view>
        </view>

        <!-- 团队排行 -->
        <view class="rank-section">
          <view class="rank-header">
            <view class="rank-header-left">
              <text class="rank-trophy">
                🏆
              </text>
              <text class="section-title">
                团队排行
              </text>
            </view>
            <view class="rank-tabs">
              <text
                v-for="tab in rankingTabs"
                :key="tab.value"
                class="rank-tab"
                :class="{ active: rankingPeriod === tab.value }"
                @click="switchRankingTab(tab.value)"
              >
                {{ tab.label }}
              </text>
            </view>
          </view>

          <view class="rank-list">
            <view
              v-for="(member, idx) in panelData.teamRanking.slice(0, 5)"
              :key="member.userId"
              class="rank-item"
              :class="{ 'rank-self': member.isSelf }"
            >
              <view
                class="rank-number"
                :class="'rn-' + (idx + 1)"
              >
                {{ member.rank }}
              </view>
              <image
                v-if="member.avatar"
                :src="member.avatar"
                class="rank-avatar"
                mode="aspectFill"
              />
              <view
                v-else
                class="rank-avatar-placeholder"
              >
                <text class="rank-avatar-text">
                  {{ (member.nickname || '?').slice(0, 1) }}
                </text>
              </view>
              <view class="rank-info">
                <view class="rank-name-row">
                  <text class="rank-name">
                    {{ member.nickname }}
                  </text>
                  <text
                    v-if="member.isSelf"
                    class="rank-self-tag"
                  >
                    我
                  </text>
                </view>
                <text
                  v-if="member.change !== undefined"
                  :class="member.change >= 0 ? 'trend-up' : 'trend-down'"
                  class="rank-change"
                >
                  {{ member.change >= 0 ? '+' : '' }}{{ member.change }}%
                </text>
              </view>
              <view class="rank-performance">
                <text class="rank-performance-value">
                  {{ member.performance.toLocaleString() }}
                </text>
                <text class="rank-performance-unit">
                  {{ member.performanceUnit }}
                </text>
              </view>
            </view>
          </view>

          <view
            class="rank-footer"
            @click="goFullRanking"
          >
            <text class="rank-footer-text">
              查看完整排行 →
            </text>
          </view>
        </view>

        <!-- 配额使用 -->
        <view class="quota-section">
          <text class="section-title">
            配额使用
          </text>
          <view class="quota-list">
            <view
              v-for="quota in panelData.quotaUsage"
              :key="quota.key"
              class="quota-item"
            >
              <view class="quota-header">
                <view class="quota-label-row">
                  <text class="quota-label">
                    {{ quota.label }}
                  </text>
                  <text
                    v-if="quota.isLow"
                    class="quota-warn-icon"
                  >
                    ⚠
                  </text>
                </view>
                <text class="quota-value">
                  <text :class="{ 'quota-warn': quota.isLow }">
                    {{ quota.used }}
                  </text>
                  <text class="quota-total">
                    /{{ quota.total }}{{ quota.unit }}
                  </text>
                </text>
              </view>
              <view class="quota-bar-bg">
                <view
                  class="quota-bar-fill"
                  :class="{ 'quota-bar-warn': quota.isLow }"
                  :style="{ width: Math.min(100, (quota.used / quota.total) * 100) + '%' }"
                />
              </view>
              <text
                v-if="quota.expireAt"
                class="quota-expire"
              >
                有效期至 {{ quota.expireAt }}
              </text>
            </view>
          </view>
          <view
            class="quota-upgrade-btn"
            @click="goUpgradeQuota"
          >
            <text class="quota-upgrade-text">
              升级配额
            </text>
          </view>
        </view>
      </view>
    </DataState>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import DataState from '../../components/DataState.vue'

interface OperatorInfo {
  name: string
  level: string
}

interface OverviewItem {
  key: string
  label: string
  value: number
  unit?: string
  trend?: number
  trendLabel?: string
}

interface QuickActionItem {
  key: string
  label: string
  icon: string
  href: string
  badge?: number
}

interface TeamMember {
  userId: string
  nickname: string
  avatar?: string
  rank: number
  performance: number
  performanceUnit: string
  change?: number
  isSelf: boolean
}

interface QuotaItem {
  key: string
  label: string
  used: number
  total: number
  unit?: string
  isLow: boolean
  expireAt?: string
}

interface PanelData {
  operatorInfo: OperatorInfo
  overview: OverviewItem[]
  quickActions: QuickActionItem[]
  teamRanking: TeamMember[]
  quotaUsage: QuotaItem[]
}

const loading = ref(true)
const loadError = ref<string | null>(null)
const panelData = ref<PanelData | null>(null)
const rankingPeriod = ref<'day' | 'week' | 'month'>('month')

const rankingTabs = [
  { label: '日', value: 'day' },
  { label: '周', value: 'week' },
  { label: '月', value: 'month' },
]

function quickIcon(icon: string): string {
  const map: Record<string, string> = { users: '👥', wallet: '💰', megaphone: '📢', 'user-check': '✅', image: '🖼', 'bar-chart': '📊', 'book-open': '📖', 'credit-card': '💳' }
  return map[icon] || '📊'
}

function formatValue(value: number, unit?: string): string {
  if (value >= 10000) {
    return (value / 10000).toFixed(1) + '万' + (unit || '')
  }
  return value.toLocaleString() + (unit || '')
}

function switchRankingTab(val: string) {
  rankingPeriod.value = val as any
}

async function loadData() {
  loading.value = true
  loadError.value = null
  try {
    await new Promise((r) => setTimeout(r, 600))
    panelData.value = {
      operatorInfo: { name: '华中运营中心', level: '金牌运营商' },
      overview: [
        { key: 'totalStations', label: '分站总数', value: 128, trend: 5.2, trendLabel: '较上月' },
        { key: 'activeStations', label: '活跃分站', value: 96, trend: 3.8, trendLabel: '较上月' },
        { key: 'totalRevenue', label: '总收益', value: 568000, unit: '元', trend: 12.5, trendLabel: '较上月' },
        { key: 'monthRevenue', label: '本月收益', value: 89500, unit: '元', trend: -2.1, trendLabel: '较上月' },
        { key: 'totalUsers', label: '累计用户', value: 25600, trend: 8.7, trendLabel: '较上月' },
        { key: 'newUsers', label: '本月新增', value: 1280, trend: 15.3, trendLabel: '较上月' },
      ],
      quickActions: [
        { key: 'stations', label: '分站管理', icon: 'users', href: '/mine/operator/stations', badge: 0 },
        { key: 'audit', label: '入驻审核', icon: 'user-check', href: '/mine/operator/audit', badge: 8 },
        { key: 'notice', label: '系统通知', icon: 'megaphone', href: '/mine/operator/notice', badge: 3 },
        { key: 'earnings', label: '收益明细', icon: 'wallet', href: '/mine/operator/earnings', badge: 0 },
        { key: 'content', label: '内容管理', icon: 'image', href: '/mine/operator/content', badge: 0 },
        { key: 'stats', label: '数据统计', icon: 'bar-chart', href: '/mine/operator/stats', badge: 0 },
        { key: 'resources', label: '资源库', icon: 'book-open', href: '/mine/operator/resources', badge: 0 },
        { key: 'billing', label: '结算中心', icon: 'credit-card', href: '/mine/operator/billing', badge: 0 },
      ],
      teamRanking: [
        { userId: 'u1', nickname: '北京分站', avatar: '', rank: 1, performance: 128500, performanceUnit: '元', change: 15.3, isSelf: false },
        { userId: 'u2', nickname: '上海分站', avatar: '', rank: 2, performance: 98600, performanceUnit: '元', change: 8.7, isSelf: false },
        { userId: 'u3', nickname: '广州分站', avatar: '', rank: 3, performance: 75200, performanceUnit: '元', change: -2.1, isSelf: false },
        { userId: 'u4', nickname: '华中运营中心', avatar: '', rank: 4, performance: 56800, performanceUnit: '元', change: 12.5, isSelf: true },
        { userId: 'u5', nickname: '成都分站', avatar: '', rank: 5, performance: 42500, performanceUnit: '元', change: 6.8, isSelf: false },
      ],
      quotaUsage: [
        { key: 'station', label: '分站配额', used: 128, total: 200, unit: '个', isLow: false, expireAt: '2026-12-31' },
        { key: 'storage', label: '存储空间', used: 256, total: 500, unit: 'GB', isLow: false, expireAt: '2026-12-31' },
        { key: 'api', label: 'API调用', used: 85000, total: 100000, unit: '次/月', isLow: true, expireAt: '2026-07-01' },
        { key: 'bandwidth', label: '月流量', used: 180, total: 500, unit: 'GB', isLow: false, expireAt: '2026-06-30' },
      ],
    }
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function goOverviewDetail(item: OverviewItem) {
  uni.showToast({ title: '查看：' + item.label, icon: 'none' })
}

function goQuick(action: QuickActionItem) {
  uni.showToast({ title: '打开：' + action.label, icon: 'none' })
}

function goFullRanking() {
  uni.showToast({ title: '查看完整排行', icon: 'none' })
}

function goUpgradeQuota() {
  uni.showToast({ title: '升级配额', icon: 'none' })
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.page { background: #FAF8F5; min-height: 100vh; padding-bottom: 48rpx; }
.header { background: #C41E3A; }
.header-inner { padding: 0 24rpx; height: 160rpx; display: flex; align-items: center; }
.header-left { display: flex; align-items: center; gap: 12rpx; }
.back-btn { font-size: 36rpx; color: #fff; padding: 8rpx; }
.header-info { }
.header-title { font-size: 34rpx; font-weight: 600; color: #fff; display: block; }
.header-level { display: flex; align-items: center; gap: 4rpx; margin-top: 4rpx; }
.header-crown { font-size: 24rpx; color: #C9A96E; }
.header-level-text { font-size: 22rpx; color: rgba(255,255,255,0.8); }

.content { padding: 24rpx; }

/* 数据概览 */
.overview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx; margin-bottom: 24rpx; }
.overview-card { background: #fff; border-radius: 16rpx; padding: 24rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.overview-label { font-size: 20rpx; color: #999; display: block; margin-bottom: 8rpx; }
.overview-value { font-size: 34rpx; font-weight: 700; color: #C41E3A; display: block; }
.overview-trend { display: flex; align-items: center; gap: 4rpx; margin-top: 8rpx; }
.trend-up { font-size: 20rpx; color: #22C55E; }
.trend-down { font-size: 20rpx; color: #EF4444; }
.trend-label { font-size: 18rpx; color: #B8B0A4; }

/* 快捷功能 */
.quick-section { background: #fff; border-radius: 20rpx; padding: 24rpx; margin-bottom: 24rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.section-title { font-size: 26rpx; font-weight: 600; color: #2C2C2C; display: block; margin-bottom: 20rpx; }
.quick-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24rpx; }
.quick-item { display: flex; flex-direction: column; align-items: center; gap: 8rpx; }
.quick-icon-wrap { width: 80rpx; height: 80rpx; border-radius: 16rpx; background: rgba(196, 30, 58, 0.1); display: flex; align-items: center; justify-content: center; position: relative; }
.quick-icon { font-size: 32rpx; color: #C41E3A; }
.quick-badge { position: absolute; top: -4rpx; right: -4rpx; min-width: 28rpx; height: 28rpx; border-radius: 14rpx; background: #EF4444; color: #fff; font-size: 16rpx; display: flex; align-items: center; justify-content: center; padding: 0 4rpx; }
.quick-label { font-size: 20rpx; color: #666; text-align: center; }

/* 团队排行 */
.rank-section { background: #fff; border-radius: 20rpx; overflow: hidden; margin-bottom: 24rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.rank-header { display: flex; align-items: center; justify-content: space-between; padding: 24rpx 24rpx 16rpx; }
.rank-header-left { display: flex; align-items: center; gap: 8rpx; }
.rank-header-left .section-title { margin-bottom: 0; }
.rank-trophy { font-size: 28rpx; }
.rank-tabs { display: flex; gap: 4rpx; background: #F5F0E8; border-radius: 16rpx; padding: 4rpx; }
.rank-tab { padding: 6rpx 20rpx; font-size: 22rpx; color: #999; border-radius: 12rpx; }
.rank-tab.active { background: #fff; color: #C41E3A; font-weight: 500; }
.rank-list { }
.rank-item { display: flex; align-items: center; gap: 16rpx; padding: 20rpx 24rpx; border-top: 1rpx solid #F5F0E8; }
.rank-self { background: rgba(196, 30, 58, 0.03); }
.rank-number { width: 48rpx; height: 48rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22rpx; font-weight: 700; flex-shrink: 0; }
.rn-1 { background: #F59E0B; color: #fff; }
.rn-2 { background: #9CA3AF; color: #fff; }
.rn-3 { background: #B45309; color: #fff; }
.rn-1, .rn-2, .rn-3 { }
.rank-avatar { width: 56rpx; height: 56rpx; border-radius: 50%; flex-shrink: 0; }
.rank-avatar-placeholder { width: 56rpx; height: 56rpx; border-radius: 50%; background: #F5F0E8; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.rank-avatar-text { font-size: 22rpx; color: #C9A96E; font-weight: 500; }
.rank-info { flex: 1; min-width: 0; }
.rank-name-row { display: flex; align-items: center; gap: 8rpx; }
.rank-name { font-size: 24rpx; font-weight: 500; color: #2C2C2C; }
.rank-self-tag { font-size: 16rpx; padding: 2rpx 10rpx; border: 1rpx solid #C41E3A; color: #C41E3A; border-radius: 12rpx; }
.rank-change { font-size: 18rpx; }
.rank-performance { text-align: right; }
.rank-performance-value { font-size: 24rpx; font-weight: 700; color: #C41E3A; display: block; }
.rank-performance-unit { font-size: 18rpx; color: #999; display: block; }
.rank-footer { text-align: center; padding: 20rpx; border-top: 1rpx solid #F5F0E8; }
.rank-footer-text { font-size: 24rpx; color: #C41E3A; }

/* 配额使用 */
.quota-section { background: #fff; border-radius: 20rpx; padding: 24rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.quota-list { }
.quota-item { margin-bottom: 24rpx; }
.quota-item:last-child { margin-bottom: 0; }
.quota-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.quota-label-row { display: flex; align-items: center; gap: 6rpx; }
.quota-label { font-size: 24rpx; color: #2C2C2C; }
.quota-warn-icon { font-size: 24rpx; color: #F59E0B; }
.quota-value { font-size: 24rpx; color: #2C2C2C; }
.quota-warn { color: #F59E0B; font-weight: 500; }
.quota-total { color: #B8B0A4; }
.quota-bar-bg { height: 16rpx; background: #F5F0E8; border-radius: 8rpx; overflow: hidden; }
.quota-bar-fill { height: 100%; background: #C41E3A; border-radius: 8rpx; transition: width 0.3s; }
.quota-bar-warn { background: #F59E0B; }
.quota-expire { font-size: 18rpx; color: #B8B0A4; margin-top: 8rpx; display: block; }
.quota-upgrade-btn { margin-top: 24rpx; height: 80rpx; border-radius: 16rpx; border: 1rpx solid #C41E3A; display: flex; align-items: center; justify-content: center; }
.quota-upgrade-text { font-size: 24rpx; color: #C41E3A; font-weight: 500; }
</style>
