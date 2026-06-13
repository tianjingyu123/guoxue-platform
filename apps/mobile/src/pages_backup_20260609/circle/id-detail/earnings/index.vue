<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav-header">
      <view class="nav-left" @click="goBack">
        <text class="nav-back-icon">←</text>
        <text class="nav-title">圈子收益</text>
      </view>
      <text class="nav-link" @click="goPage('/pages/circle/id-detail/earnings/detail/index')">全部明细</text>
    </view>

    <scroll-view scroll-y class="content" :style="{ height: 'calc(100vh - 56px - 140rpx)' }">
      <!-- 收益总览 -->
      <view class="earn-overview">
        <text class="earn-over-label">累计收入</text>
        <text class="earn-over-value">¥{{ earningsData.totalEarnings.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }}</text>
        <view class="earn-over-row">
          <view class="earn-over-col">
            <text class="earn-col-label">本月收入</text>
            <view class="earn-col-value-row">
              <text class="earn-col-value">¥{{ earningsData.monthlyEarnings.toLocaleString() }}</text>
              <text class="earn-col-change" :class="earningsData.monthlyChange >= 0 ? 'up' : 'down'">
                {{ earningsData.monthlyChange >= 0 ? '↑' : '↓' }}{{ Math.abs(earningsData.monthlyChange) }}%
              </text>
            </view>
          </view>
          <view class="earn-over-col">
            <text class="earn-col-label">可提现余额</text>
            <text class="earn-col-value">¥{{ earningsData.withdrawable.toLocaleString() }}</text>
          </view>
        </view>
      </view>

      <!-- 收入来源 -->
      <view class="section-card">
        <text class="section-title">收入来源</text>
        <view class="sources-row">
          <view class="donut-wrap">
            <view class="donut">
              <view class="donut-inner">
                <text class="donut-label">总计</text>
                <text class="donut-value">{{ (earningsData.totalEarnings / 10000).toFixed(1) }}万</text>
              </view>
            </view>
          </view>
          <view class="sources-legend">
            <view v-for="s in earningsData.sources" :key="s.type" class="legend-row">
              <view class="legend-dot" :style="{ backgroundColor: getSourceColor(s.type) }" />
              <text class="legend-name">{{ s.name }}</text>
              <text class="legend-amount">¥{{ s.amount.toLocaleString() }}</text>
              <text class="legend-pct">{{ s.percent }}%</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 收入趋势 -->
      <view class="section-card">
        <view class="section-header">
          <text class="section-title">收入趋势</text>
          <text class="section-sub">📅 近30天</text>
        </view>
        <view class="trend-bars">
          <view v-for="(item, i) in earningsData.trend" :key="i" class="trend-col">
            <view class="trend-bar" :style="{ height: (item.amount / maxTrend) * 100 + '%' }" />
            <text class="trend-label">{{ item.day.split('/')[1] }}</text>
          </view>
        </view>
      </view>

      <!-- 收益明细 -->
      <view class="section-card">
        <view class="section-header">
          <text class="section-title">收益明细</text>
          <text class="filter-btn" @click="showFilter = !showFilter">🔍 筛选</text>
        </view>
        <view v-if="showFilter" class="filter-row">
          <view v-for="ft in filterTypes" :key="ft.id"
            class="filter-chip" :class="{ active: filterType === ft.id }"
            @click="filterType = ft.id"
          >
            <text>{{ ft.name }}</text>
          </view>
        </view>
        <view v-for="detail in filteredDetails" :key="detail.id" class="detail-item">
          <view class="detail-icon" :style="{ backgroundColor: getSourceBg(detail.type) }">
            <text>{{ getSourceEmoji(detail.type) }}</text>
          </view>
          <view class="detail-info">
            <text class="detail-desc">{{ detail.desc }}</text>
            <text class="detail-time">{{ detail.time }}</text>
          </view>
          <text class="detail-amount">+¥{{ detail.amount }}</text>
        </view>
        <view v-if="filteredDetails.length > 0" class="view-all" @click="goPage('/pages/circle/id-detail/earnings/detail/index')">
          <text>查看全部明细 ›</text>
        </view>
        <view v-else class="empty-state">
          <text>暂无相关记录</text>
        </view>
      </view>

      <view style="height: 24rpx;" />
    </scroll-view>

    <!-- 底部提现栏 -->
    <view class="bottom-bar">
      <view v-if="earningsData.withdrawable < earningsData.minWithdraw" class="withdraw-hint">
        <text>满¥{{ earningsData.minWithdraw }}可提现，还差¥{{ (earningsData.minWithdraw - earningsData.withdrawable).toFixed(2) }}</text>
      </view>
      <view class="bottom-bar-row">
        <view class="bottom-balance">
          <text class="bal-label">可提现余额</text>
          <text class="bal-value">¥{{ earningsData.withdrawable.toLocaleString() }}</text>
        </view>
        <view class="withdraw-btn" :class="{ disabled: earningsData.withdrawable < earningsData.minWithdraw }" @click="handleWithdraw">
          <text>💰 申请提现</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const filterType = ref('all')
const showFilter = ref(false)

const filterTypes = [
  { id: 'all', name: '全部' }, { id: 'join', name: '入圈' },
  { id: 'course', name: '课程' }, { id: 'product', name: '商品' },
  { id: 'live', name: '直播' }, { id: 'qa', name: '问答' },
]

const earningsData = {
  totalEarnings: 128680.50, monthlyEarnings: 12580, monthlyChange: 15.8,
  withdrawable: 45680, minWithdraw: 100,
  sources: [
    { type: 'join', name: '入圈收入', amount: 45800, percent: 35.6 },
    { type: 'course', name: '课程收入', amount: 38600, percent: 30.0 },
    { type: 'product', name: '商品收入', amount: 22400, percent: 17.4 },
    { type: 'live', name: '直播打赏', amount: 12880, percent: 10.0 },
    { type: 'qa', name: '付费问答', amount: 9000, percent: 7.0 },
  ],
  trend: [
    { day: '05/01', amount: 380 }, { day: '05/05', amount: 520 },
    { day: '05/10', amount: 680 }, { day: '05/15', amount: 450 },
    { day: '05/20', amount: 890 }, { day: '05/25', amount: 720 },
    { day: '05/30', amount: 580 },
  ],
  details: [
    { id: 1, type: 'join', desc: '用户「易学新人」加入圈子', amount: 199, time: '今天 14:32' },
    { id: 2, type: 'course', desc: '课程《八字入门》被购买', amount: 299, time: '今天 11:20' },
    { id: 3, type: 'qa', desc: '回答付费问题获得收益', amount: 50, time: '今天 09:15' },
    { id: 4, type: 'live', desc: '直播打赏收入', amount: 88, time: '昨天 21:30' },
    { id: 5, type: 'product', desc: '商品「罗盘」被购买', amount: 168, time: '昨天 16:45' },
    { id: 6, type: 'join', desc: '用户「命理爱好者」加入圈子', amount: 199, time: '昨天 10:20' },
    { id: 7, type: 'course', desc: '课程《紫微斗数》被购买', amount: 399, time: '前天 15:30' },
    { id: 8, type: 'live', desc: '直播打赏收入', amount: 128, time: '前天 22:10' },
  ],
}

const maxTrend = computed(() => Math.max(...earningsData.trend.map(t => t.amount)))

const filteredDetails = computed(() =>
  filterType.value === 'all' ? earningsData.details : earningsData.details.filter(d => d.type === filterType.value)
)

function getSourceColor(type: string) {
  const m: Record<string, string> = { join: '#C41E3A', course: '#C9A96E', product: '#3b82f6', live: '#a855f7', qa: '#22c55e' }
  return m[type] || '#999'
}
function getSourceBg(type: string) {
  const m: Record<string, string> = { join: 'rgba(196,30,58,0.15)', course: 'rgba(201,169,110,0.15)', product: 'rgba(59,130,246,0.15)', live: 'rgba(168,85,247,0.15)', qa: 'rgba(34,197,94,0.15)' }
  return m[type] || '#F5F1EB'
}
function getSourceEmoji(type: string) {
  const m: Record<string, string> = { join: '👥', course: '📚', product: '🛍️', live: '📻', qa: '💬' }
  return m[type] || '💰'
}

function handleWithdraw() {
  if (earningsData.withdrawable >= earningsData.minWithdraw) {
    uni.navigateTo({ url: '/pages/wallet/withdraw/index' })
  }
}

function goBack() { uni.navigateBack() }
function goPage(url: string) { uni.navigateTo({ url }) }

onPullDownRefresh(() => { setTimeout(() => uni.stopPullDownRefresh(), 500) })
</script>

<style scoped>
.page { background: #FAF8F5; min-height: 100vh; }
.nav-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 24rpx; height: 56px; background: rgba(250,248,245,0.95);
  backdrop-filter: blur(10px); border-bottom: 1px solid #E8E0D5;
  position: sticky; top: 0; z-index: 40;
}
.nav-left { display: flex; align-items: center; gap: 12rpx; }
.nav-back-icon { font-size: 36rpx; color: #2C2C2C; }
.nav-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.nav-link { font-size: 26rpx; color: #C41E3A; }

.earn-overview {
  margin: 24rpx; padding: 36rpx; border-radius: 24rpx;
  background: linear-gradient(135deg, #C9A96E, #C41E3A); color: #FFFFFF;
}
.earn-over-label { font-size: 24rpx; opacity: 0.8; }
.earn-over-value { font-size: 52rpx; font-weight: 700; display: block; margin: 8rpx 0 24rpx; }
.earn-over-row { display: flex; gap: 32rpx; }
.earn-over-col { flex: 1; }
.earn-col-label { font-size: 22rpx; opacity: 0.7; }
.earn-col-value-row { display: flex; align-items: center; gap: 8rpx; }
.earn-col-value { font-size: 32rpx; font-weight: 600; }
.earn-col-change { font-size: 20rpx; padding: 4rpx 10rpx; border-radius: 8rpx; }
.earn-col-change.up { background: rgba(34,197,94,0.3); }
.earn-col-change.down { background: rgba(239,68,68,0.3); }

.section-card { background: #FFFFFF; border-radius: 20rpx; padding: 28rpx; margin: 0 24rpx 20rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.section-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; margin-bottom: 20rpx; display: block; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx; }
.section-header .section-title { margin-bottom: 0; }
.section-sub { font-size: 22rpx; color: #999; }

.sources-row { display: flex; gap: 40rpx; align-items: center; }
.donut-wrap { width: 160rpx; height: 160rpx; flex-shrink: 0; }
.donut {
  width: 100%; height: 100%; border-radius: 50%;
  background: conic-gradient(#C41E3A 0% 35.6%, #C9A96E 35.6% 65.6%, #3b82f6 65.6% 83%, #a855f7 83% 93%, #22c55e 93% 100%);
  display: flex; align-items: center; justify-content: center;
}
.donut-inner { width: 70%; height: 70%; border-radius: 50%; background: #FFFFFF; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.donut-label { font-size: 20rpx; color: #999; }
.donut-value { font-size: 24rpx; font-weight: 600; color: #2C2C2C; }
.sources-legend { flex: 1; }
.legend-row { display: flex; align-items: center; gap: 10rpx; margin-bottom: 12rpx; }
.legend-dot { width: 16rpx; height: 16rpx; border-radius: 50%; }
.legend-name { font-size: 22rpx; color: #999; flex: 1; }
.legend-amount { font-size: 22rpx; color: #2C2C2C; font-weight: 500; }
.legend-pct { font-size: 20rpx; color: #999; min-width: 64rpx; text-align: right; }

.trend-bars { display: flex; align-items: flex-end; justify-content: space-between; gap: 12rpx; height: 180rpx; }
.trend-col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 6rpx; }
.trend-bar { width: 100%; background: linear-gradient(to top, #C9A96E, rgba(201,169,110,0.4)); border-radius: 6rpx 6rpx 0 0; }
.trend-label { font-size: 18rpx; color: #999; }

.filter-btn { font-size: 22rpx; color: #999; }
.filter-row { display: flex; gap: 12rpx; margin-bottom: 16rpx; flex-wrap: wrap; }
.filter-chip { padding: 10rpx 24rpx; border-radius: 40rpx; background: #F5F1EB; font-size: 22rpx; color: #999; }
.filter-chip.active { background: #C41E3A; color: #FFFFFF; }

.detail-item { display: flex; align-items: center; gap: 16rpx; padding: 16rpx 0; border-bottom: 1px solid #F5F1EB; }
.detail-icon { width: 64rpx; height: 64rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28rpx; flex-shrink: 0; }
.detail-info { flex: 1; min-width: 0; }
.detail-desc { font-size: 26rpx; color: #2C2C2C; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
.detail-time { font-size: 20rpx; color: #999; margin-top: 4rpx; }
.detail-amount { font-size: 26rpx; color: #22c55e; font-weight: 500; }
.view-all { text-align: center; padding-top: 16rpx; font-size: 26rpx; color: #999; }
.empty-state { text-align: center; padding: 60rpx 0; font-size: 26rpx; color: #999; }

.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); border-top: 1px solid #E8E0D5; padding: 12rpx 24rpx; z-index: 50; }
.withdraw-hint { text-align: center; font-size: 20rpx; color: #999; margin-bottom: 8rpx; }
.bottom-bar-row { display: flex; align-items: center; gap: 24rpx; }
.bottom-balance { flex: 1; }
.bal-label { font-size: 22rpx; color: #999; display: block; }
.bal-value { font-size: 36rpx; font-weight: 700; color: #2C2C2C; }
.withdraw-btn { background: #C41E3A; color: #FFFFFF; padding: 22rpx 48rpx; border-radius: 24rpx; font-size: 28rpx; font-weight: 500; }
.withdraw-btn.disabled { background: #D9D9D9; color: #999; }
</style>
