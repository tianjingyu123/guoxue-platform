<template>
  <view class="smp-page">
    <!-- 顶部导航 -->
    <app-nav-bar title="分站管理" :show-back="true" background="#C41E3A" color="#ffffff" :no-border="true">
      <template #right>
        <view class="smp-nav-bell" @tap="goNotices">
          <app-icon name="bell" :size="40" color="#ffffff" />
          <view v-if="unreadNotices > 0" class="smp-nav-dot" />
        </view>
      </template>
    </app-nav-bar>

    <scroll-view scroll-y class="smp-scroll">
      <!-- 三态 -->
      <view v-if="loading" class="state-loading"><text class="state-loading-text">加载中...</text></view>
      <view v-else-if="error" class="state-error">
        <text class="state-error-text">{{ error }}</text>
        <view class="state-retry-btn" @tap="retry"><text>重试</text></view>
      </view>
      <view v-else-if="isEmpty" class="state-empty">
        <text class="state-empty-text">暂无数据</text>
      </view>
      <view v-else-if="notOpened" class="state-empty smp-not-opened">
        <view class="smp-not-opened-icon"><app-icon name="store" :size="64" color="#C41E3A" /></view>
        <text class="smp-not-opened-title">您还未开通分站</text>
        <text class="smp-not-opened-sub">开通分站，打造属于你的国学推广事业</text>
        <view class="smp-not-opened-btn" @tap="navigateTo('/pkg-operator/join-station/index')"><text class="smp-not-opened-btn-txt">立即开通</text></view>
      </view>
      <template v-else>
      <!-- 分站信息卡 -->
      <view class="smp-info">
        <view class="smp-info-top">
          <view class="smp-info-icon"><app-icon name="store" :size="48" color="#ffffff" /></view>
          <view class="smp-info-main">
            <view class="smp-info-name-row">
              <text class="smp-info-name">{{ stationPanelInfo.name }}</text>
              <view v-if="stationPanelInfo.code" class="smp-info-code"><text class="smp-info-code-txt">推广码 {{ stationPanelInfo.code }}</text></view>
            </view>
            <text class="smp-info-meta">创建于 {{ stationPanelInfo.createTime }} · 有效期至 {{ stationPanelInfo.expireTime }}</text>
          </view>
        </view>
        <view class="smp-info-status">
          <view class="smp-status-dot" :class="stationPanelInfo.status" />
          <text class="smp-status-txt">{{ statusLabel }}</text>
          <view class="smp-info-renew" @tap="goRenew"><text class="smp-renew-txt">续费</text></view>
        </view>
      </view>

      <!-- 今日宜忌轻栏（自包含拉取，失败自动隐藏） -->
      <almanac-bar />

      <!-- 数据概览 -->
      <view class="smp-card">
        <text class="smp-card-title">数据概览</text>
        <view class="smp-ov-grid">
          <view v-for="(item, i) in stationPanelOverview" :key="i" class="smp-ov-item">
            <view class="smp-ov-head">
              <app-icon :name="stationOverviewIconMap[item.icon || 'users']" :size="32" color="#C41E3A" />
              <view v-if="item.trendType !== 'flat'" class="smp-ov-trend" :class="item.trendType">
                <app-icon :name="item.trendType === 'up' ? 'trending-up' : 'trending-down'" :size="22" :color="item.trendType === 'up' ? '#16a34a' : '#dc2626'" />
                <text class="smp-ov-trend-txt">{{ Math.abs(item.trend || 0) }}%</text>
              </view>
            </view>
            <text class="smp-ov-value">{{ formatNum(item.value) }}<text class="smp-ov-unit">{{ item.unit }}</text></text>
            <text class="smp-ov-label">{{ item.label }}</text>
          </view>
        </view>
      </view>

      <!-- 经营顾问建议（自包含拉取，空/失败自动隐藏） -->
      <advisor-card role-type="STATION_MASTER" />

      <!-- 近30天推广转化漏斗（自包含拉取，失败或全 0 自动隐藏） -->
      <funnel-card />

      <!-- 收益余额 -->
      <view class="smp-card">
        <view class="smp-balance-head">
          <text class="smp-card-title">收益余额</text>
          <view class="smp-balance-detail" @tap="goEarnings"><text class="smp-balance-detail-txt">明细</text><app-icon name="chevron-right" :size="24" color="#999" /></view>
        </view>
        <view class="smp-balance-grid">
          <view class="smp-bal-item">
            <text class="smp-bal-value primary">¥{{ formatNum(stationPanelBalance.totalEarning) }}</text>
            <text class="smp-bal-label">累计收益</text>
          </view>
          <view class="smp-bal-item">
            <text class="smp-bal-value">¥{{ formatNum(stationPanelBalance.monthEarning) }}</text>
            <text class="smp-bal-label">本月收益</text>
          </view>
          <view class="smp-bal-item">
            <text class="smp-bal-value">¥{{ formatNum(stationPanelBalance.pendingSettlement) }}</text>
            <text class="smp-bal-label">待结算</text>
          </view>
        </view>
        <view v-if="stationPanelBalance.remainingDays >= 0 && stationPanelBalance.nextSettleDate" class="smp-settle-tip">
          <app-icon name="clock" :size="24" color="#C41E3A" />
          <text class="smp-settle-tip-txt">下次结算 {{ stationPanelBalance.nextSettleDate }}（{{ stationPanelBalance.remainingDays }} 天后）</text>
        </view>
        <view class="smp-withdraw-btn" @tap="goWithdraw"><text class="smp-withdraw-txt">佣金提现</text></view>
        <text class="smp-withdraw-note">佣金结算后进入平台钱包，可在钱包提现</text>
      </view>

      <!-- 趋势图 -->
      <view class="smp-card">
        <view class="smp-trend-head">
          <text class="smp-card-title">收益趋势</text>
          <text class="smp-trend-sub">近30天</text>
        </view>
        <view class="smp-trend-summary">
          <text class="smp-trend-total">¥{{ formatNum(activeTrend.total || 0) }}</text>
          <view v-if="activeTrend.data && activeTrend.data.length" class="smp-trend-change" :class="(activeTrend.change || 0) >= 0 ? 'up' : 'down'">
            <app-icon :name="(activeTrend.change || 0) >= 0 ? 'trending-up' : 'trending-down'" :size="22" :color="(activeTrend.change || 0) >= 0 ? '#16a34a' : '#dc2626'" />
            <text class="smp-trend-change-txt">{{ Math.abs(activeTrend.change || 0) }}%</text>
          </view>
        </view>
        <view class="smp-chart">
          <view v-for="(p, i) in activeTrend.data" :key="i" class="smp-bar-col">
            <view class="smp-bar-wrap">
              <view class="smp-bar" :style="{ height: barHeight(p.value) + '%' }" />
            </view>
            <text class="smp-bar-date">{{ p.date }}</text>
          </view>
        </view>
      </view>

      <!-- 快捷功能 -->
      <view class="smp-card">
        <text class="smp-card-title">快捷功能</text>
        <view class="smp-qa-grid">
          <view v-for="qa in stationPanelQuickActions" :key="qa.id" class="smp-qa-item" @tap="goAction(qa)">
            <view class="smp-qa-icon">
              <app-icon :name="stationActionIconMap[qa.icon] || 'help-circle'" :size="40" color="#C41E3A" />
              <view v-if="qa.badge" class="smp-qa-badge"><text class="smp-qa-badge-txt">{{ qa.badge }}</text></view>
            </view>
            <text class="smp-qa-label">{{ qa.label }}</text>
          </view>
        </view>
      </view>

      <!-- 最新通知 -->
      <view v-if="stationPanelNotices.length" class="smp-card">
        <view class="smp-notice-head">
          <text class="smp-card-title">最新通知</text>
          <view class="smp-notice-more" @tap="goNotices"><text class="smp-notice-more-txt">查看全部</text><app-icon name="chevron-right" :size="24" color="#999" /></view>
        </view>
        <view v-for="n in stationPanelNotices" :key="n.id" class="smp-notice-item">
          <view class="smp-notice-icon" :class="n.type">
            <app-icon :name="noticeIcon(n.type)" :size="28" :color="noticeColor(n.type)" />
          </view>
          <view class="smp-notice-body">
            <text class="smp-notice-title">{{ n.title }}</text>
            <text class="smp-notice-time">{{ n.createdAt }}</text>
          </view>
        </view>
      </view>

      <view class="smp-bottom-pad" />
      </template>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppNavBar from '@/components/common/app-nav-bar.vue'
import AppIcon from '@/components/common/app-icon.vue'
import AdvisorCard from '@/components/workbench/advisor-card.vue'
import FunnelCard from '@/components/workbench/funnel-card.vue'
import AlmanacBar from '@/components/workbench/almanac-bar.vue'
import { navigateTo } from '@/utils/router'
import {
  operatorApi,
  type StationOverviewItem,
  type StationTrendData,
  type StationNotice,
  type StationPanelQuickAction,
} from '@/lib/operator-data'

const loading = ref(true)
const error = ref('')
const isEmpty = ref(false)
const notOpened = ref(false)

// 各个数据 ref
// 分站信息对象，模板裸访问多字段，保留 any
const stationPanelInfo = ref<any>({})
const stationPanelOverview = ref<StationOverviewItem[]>([])
const stationOverviewIconMap = ref<Record<string, string>>({})
const stationPanelTrends = ref<StationTrendData[]>([])
// 余额对象，模板裸访问多字段，保留 any
const stationPanelBalance = ref<any>({})
const stationPanelQuickActions = ref<StationPanelQuickAction[]>([])
const stationActionIconMap = ref<Record<string, string>>({})
const stationPanelNotices = ref<StationNotice[]>([])

onMounted(async () => {
  await loadData()
})

async function loadData() {
  loading.value = true
  error.value = ''
  notOpened.value = false
  try {
    const [info, overview, iconMap, trends, balance, quickActions, actionIcons, notices] = await Promise.all([
      operatorApi.getStationPanelInfo(),
      operatorApi.getStationPanelOverview(),
      operatorApi.getStationOverviewIconMap(),
      operatorApi.getStationPanelTrends(),
      operatorApi.getStationPanelBalance(),
      operatorApi.getStationPanelQuickActions(),
      operatorApi.getStationActionIconMap(),
      operatorApi.getStationPanelNotices(),
    ])
    stationPanelInfo.value = info
    stationPanelOverview.value = Array.isArray(overview) ? overview : []
    stationOverviewIconMap.value = iconMap || {}
    stationPanelTrends.value = Array.isArray(trends) ? trends : []
    stationPanelBalance.value = balance
    stationPanelQuickActions.value = Array.isArray(quickActions) ? quickActions : []
    stationActionIconMap.value = actionIcons || {}
    stationPanelNotices.value = Array.isArray(notices) ? notices : []
    isEmpty.value = !info || Object.keys(info).length === 0
  } catch (e) {
    const msg = (e as Error)?.message || ''
    // 后端未开通分站时抛错（404/未找到）→ 走友好引导态，不当作错误
    if (msg.includes('开通') || msg.includes('未找到') || msg.includes('不存在')) {
      notOpened.value = true
    } else {
      error.value = msg || '加载失败'
    }
  } finally {
    loading.value = false
  }
}

async function retry() { await loadData() }

// 后端趋势仅单一粒度（近30天收益），始终取第 0 项
const activeTrend = computed(() => stationPanelTrends.value[0] || ({} as StationTrendData))
const unreadNotices = computed(() => stationPanelNotices.value.filter((n) => n.type === 'warning').length)

const statusLabel = computed(() => {
  const map: Record<string, string> = { active: '运营中', pending: '审核中', expired: '已过期', paused: '已暂停' }
  return map[stationPanelInfo.value.status] || '运营中'
})

const maxTrendValue = computed(() => {
  if (!activeTrend.value.data) return 0
  return Math.max(...activeTrend.value.data.map((p) => p.value))
})
function barHeight(v: number) {
  if (maxTrendValue.value === 0) return 4
  return Math.max(8, Math.round((v / maxTrendValue.value) * 100))
}

function formatNum(v: number | string) {
  if (typeof v === 'string') return v
  return v.toLocaleString('zh-CN')
}

function noticeIcon(type: string) {
  const map: Record<string, string> = { success: 'check-circle', warning: 'alert-triangle', info: 'info' }
  return map[type] || 'info'
}
function noticeColor(type: string) {
  const map: Record<string, string> = { success: '#16a34a', warning: '#f59e0b', info: '#2563eb' }
  return map[type] || '#2563eb'
}

function goAction(qa: StationPanelQuickAction) { navigateTo(qa.path) }
function goNotices() { navigateTo('/station/notices') }
function goRenew() { navigateTo('/pkg-operator/join-station/index') }
function goEarnings() { navigateTo('/station/earnings') }
// 站长佣金结算后进入平台钱包，提现在钱包内完成
function goWithdraw() { navigateTo('/pkg-mine/wallet/index') }
</script>

<style scoped>
.smp-page { min-height: 100vh; background: #f5f5f5; }
.smp-scroll { height: calc(100vh - var(--nav-bar-height, 88rpx)); }
.smp-nav-bell { position: relative; width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; }
.smp-nav-dot { position: absolute; top: 8rpx; right: 8rpx; width: 14rpx; height: 14rpx; border-radius: 50%; background: #fbbf24; }

/* 分站信息卡 */
.smp-info { margin: 24rpx; padding: 32rpx; border-radius: 24rpx; background: linear-gradient(135deg, var(--brand) 0%, #e85d75 100%); }
.smp-info-top { display: flex; align-items: center; gap: 24rpx; }
.smp-info-icon { width: 88rpx; height: 88rpx; border-radius: 20rpx; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.smp-info-main { flex: 1; min-width: 0; }
.smp-info-name-row { display: flex; align-items: center; gap: 16rpx; }
.smp-info-name { font-size: 34rpx; font-weight: 700; color: #ffffff; }
.smp-info-code { display: flex; align-items: center; padding: 4rpx 16rpx; border-radius: 999rpx; background: rgba(255,255,255,0.25); }
.smp-info-code-txt { font-size: 22rpx; font-weight: 600; color: #ffffff; }
.smp-info-meta { display: block; margin-top: 10rpx; font-size: 22rpx; color: rgba(255,255,255,0.85); }
.smp-info-status { display: flex; align-items: center; gap: 12rpx; margin-top: 24rpx; padding-top: 24rpx; border-top: 1rpx solid rgba(255,255,255,0.2); }
.smp-status-dot { width: 16rpx; height: 16rpx; border-radius: 50%; }
.smp-status-dot.active { background: #4ade80; }
.smp-status-dot.expired { background: #d1d5db; }
.smp-status-dot.paused { background: #fbbf24; }
.smp-status-txt { font-size: 24rpx; color: #ffffff; }
.smp-info-renew { margin-left: auto; padding: 8rpx 28rpx; border-radius: 999rpx; background: #ffffff; }
.smp-renew-txt { font-size: 24rpx; font-weight: 600; color: var(--brand); }

/* 通用卡片 */
.smp-card { margin: 0 24rpx 24rpx; padding: 28rpx; border-radius: 24rpx; background: #ffffff; }
.smp-card-title { font-size: 30rpx; font-weight: 700; color: #1a1a1a; }

/* 数据概览 */
.smp-ov-grid { display: flex; flex-wrap: wrap; margin-top: 16rpx; }
.smp-ov-item { width: 33.33%; padding: 16rpx 8rpx; box-sizing: border-box; }
.smp-ov-head { display: flex; align-items: center; justify-content: space-between; }
.smp-ov-trend { display: flex; align-items: center; gap: 2rpx; }
.smp-ov-trend-txt { font-size: 20rpx; }
.smp-ov-trend.up .smp-ov-trend-txt { color: #16a34a; }
.smp-ov-trend.down .smp-ov-trend-txt { color: #dc2626; }
.smp-ov-value { display: block; margin-top: 12rpx; font-size: 36rpx; font-weight: 700; color: #1a1a1a; }
.smp-ov-unit { font-size: 22rpx; font-weight: 400; color: #999; margin-left: 4rpx; }
.smp-ov-label { display: block; margin-top: 4rpx; font-size: 22rpx; color: #999; }

/* 收益余额 */
.smp-balance-head { display: flex; align-items: center; justify-content: space-between; }
.smp-balance-detail { display: flex; align-items: center; }
.smp-balance-detail-txt { font-size: 24rpx; color: #999; }
.smp-balance-grid { display: flex; margin-top: 20rpx; }
.smp-bal-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8rpx; }
.smp-bal-value { font-size: 30rpx; font-weight: 700; color: #1a1a1a; }
.smp-bal-value.primary { color: var(--brand); }
.smp-bal-label { font-size: 22rpx; color: #999; }
.smp-settle-tip { display: flex; align-items: center; gap: 8rpx; margin-top: 20rpx; padding: 16rpx 20rpx; border-radius: 12rpx; background: #fdecef; }
.smp-settle-tip-txt { font-size: 24rpx; color: var(--brand); }
.smp-withdraw-btn { margin-top: 24rpx; height: 80rpx; border-radius: 16rpx; background: var(--brand); display: flex; align-items: center; justify-content: center; }
.smp-withdraw-txt { font-size: 28rpx; font-weight: 600; color: #ffffff; }
.smp-withdraw-note { display: block; margin-top: 12rpx; text-align: center; font-size: 20rpx; color: #999; }

/* 趋势图 */
.smp-trend-head { display: flex; align-items: baseline; justify-content: space-between; }
.smp-trend-sub { font-size: 22rpx; color: #999; }
.smp-trend-summary { display: flex; align-items: baseline; gap: 16rpx; margin-top: 20rpx; }
.smp-trend-total { font-size: 44rpx; font-weight: 700; color: #1a1a1a; }
.smp-trend-change { display: flex; align-items: center; gap: 2rpx; }
.smp-trend-change-txt { font-size: 24rpx; }
.smp-trend-change.up .smp-trend-change-txt { color: #16a34a; }
.smp-trend-change.down .smp-trend-change-txt { color: #dc2626; }
.smp-chart { display: flex; align-items: flex-end; justify-content: space-between; height: 280rpx; margin-top: 24rpx; padding-top: 16rpx; }
.smp-bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; }
.smp-bar-wrap { flex: 1; width: 100%; display: flex; align-items: flex-end; justify-content: center; }
.smp-bar { width: 32rpx; border-radius: 8rpx 8rpx 0 0; background: linear-gradient(180deg, var(--brand) 0%, #e85d75 100%); transition: height 0.3s; }
.smp-bar-date { margin-top: 12rpx; font-size: 18rpx; color: #999; }

/* 快捷功能 */
.smp-qa-grid { display: flex; flex-wrap: wrap; margin-top: 16rpx; }
.smp-qa-item { width: 25%; display: flex; flex-direction: column; align-items: center; gap: 12rpx; padding: 20rpx 0; }
.smp-qa-icon { position: relative; width: 88rpx; height: 88rpx; border-radius: 24rpx; background: #fdecef; display: flex; align-items: center; justify-content: center; }
.smp-qa-badge { position: absolute; top: -6rpx; right: -6rpx; min-width: 32rpx; height: 32rpx; padding: 0 8rpx; border-radius: 999rpx; background: var(--brand); display: flex; align-items: center; justify-content: center; box-sizing: border-box; }
.smp-qa-badge-txt { font-size: 20rpx; color: #ffffff; }
.smp-qa-label { font-size: 24rpx; color: #333; }

/* 最新通知 */
.smp-notice-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8rpx; }
.smp-notice-more { display: flex; align-items: center; }
.smp-notice-more-txt { font-size: 24rpx; color: #999; }
.smp-notice-item { display: flex; align-items: center; gap: 20rpx; padding: 20rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.smp-notice-item:last-child { border-bottom: none; }
.smp-notice-icon { width: 64rpx; height: 64rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.smp-notice-icon.success { background: #dcfce7; }
.smp-notice-icon.warning { background: #fef3c7; }
.smp-notice-icon.info { background: #dbeafe; }
.smp-notice-body { flex: 1; min-width: 0; }
.smp-notice-title { display: block; font-size: 26rpx; color: #1a1a1a; }
.smp-notice-time { display: block; margin-top: 6rpx; font-size: 22rpx; color: #999; }
.smp-bottom-pad { height: 40rpx; }

/* 三态 */
.state-loading, .state-error, .state-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 120rpx 32rpx; }
.state-loading-text { font-size: 28rpx; color: #999; }
.state-error-text { font-size: 28rpx; color: #ef4444; text-align: center; margin-bottom: 24rpx; }
.state-empty-text { font-size: 28rpx; color: #999; }
.state-retry-btn { padding: 16rpx 48rpx; background: #7c3aed; border-radius: 12rpx; }
.state-retry-btn text { font-size: 26rpx; color: #fff; }

/* 未开通引导态 */
.smp-not-opened-icon { width: 128rpx; height: 128rpx; border-radius: 32rpx; background: #fdecef; display: flex; align-items: center; justify-content: center; margin-bottom: 28rpx; }
.smp-not-opened-title { font-size: 32rpx; font-weight: 700; color: #1a1a1a; }
.smp-not-opened-sub { margin-top: 12rpx; font-size: 24rpx; color: #999; text-align: center; }
.smp-not-opened-btn { margin-top: 36rpx; padding: 18rpx 64rpx; border-radius: 999rpx; background: var(--brand); }
.smp-not-opened-btn-txt { font-size: 28rpx; font-weight: 600; color: #ffffff; }
</style>
