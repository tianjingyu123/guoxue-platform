<template>
  <view class="earn-page">
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <text class="header-title">推广收益</text>
        <view class="header-spacer" />
      </view>
    </view>

    <view class="earn-body">
      <!-- 收益总览卡片 -->
      <view class="overview-card">
        <view class="oc-deco oc-d1" />
        <view class="oc-deco oc-d2" />
        <view class="oc-content">
          <text class="oc-label">累计收益</text>
          <view class="oc-amount-row">
            <text class="oc-yuan">¥</text>
            <text class="oc-amount">{{ totalEarnings.toFixed(2) }}</text>
          </view>
          <view class="oc-bottom">
            <view>
              <text class="oc-sub">可提现余额</text>
              <text class="oc-balance">¥{{ withdrawableBalance.toFixed(2) }}</text>
            </view>
            <view class="oc-withdraw-btn" @click="goPage('/pages/withdraw/index')">提现</view>
          </view>
        </view>
      </view>

      <!-- 收入来源 -->
      <view class="card">
        <view class="card-head">
          <text class="card-title">收入来源</text>
          <text class="card-more" @click="goPage('/pages/earnings/breakdown/index')">详情 ›</text>
        </view>
        <view class="source-content">
          <view class="sc-donut">
            <view class="donut-center">💰</view>
          </view>
          <view class="sc-legend">
            <view v-for="s in incomeSources" :key="s.name" class="sc-item">
              <view class="sc-dot" :style="{ background: s.color }" />
              <text class="sc-name">{{ s.name }}</text>
              <text class="sc-pct">{{ s.percentage }}%</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 收益趋势 -->
      <view class="card">
        <view class="card-head">
          <text class="card-title">近7天收益趋势</text>
          <view class="trend-up">
            <text>📈 +12.5%</text>
          </view>
        </view>
        <view class="bar-chart">
          <view v-for="(item, idx) in trendData" :key="item.day" class="bar-col">
            <text class="bar-val">{{ item.amount >= 1000 ? (item.amount / 1000).toFixed(1) + 'k' : item.amount }}</text>
            <view class="bar-fill" :class="{ accent: idx === trendData.length - 2 }" :style="{ height: (item.amount / maxAmount) * 120 + 'rpx' }" />
            <text class="bar-day">{{ item.day }}</text>
          </view>
        </view>
      </view>

      <!-- 收入明细 -->
      <view>
        <view class="card-head">
          <text class="card-title">收入明细</text>
          <view class="filter-btn" @click="showFilter = !showFilter">
            <text>筛选</text>
          </view>
        </view>

        <scroll-view scroll-x class="filter-chips">
          <text v-for="f in filters" :key="f.id" class="f-chip" :class="{ active: activeFilter === f.id }" @click="activeFilter = f.id">{{ f.label }}</text>
        </scroll-view>

        <view class="records-list">
          <view v-for="r in filteredRecords" :key="r.id" class="record-item">
            <view class="ri-icon" :style="{ background: r.bg, color: r.color }">{{ r.icon }}</view>
            <view class="ri-info">
              <text class="ri-title">{{ r.title }}</text>
              <text class="ri-time">{{ r.time }}</text>
            </view>
            <text class="ri-amount">+¥{{ r.amount.toFixed(2) }}</text>
          </view>
        </view>

        <view class="view-all">查看全部记录</view>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view class="bottom-bar">
      <view class="bb-sec" @click="goPage('/pages/earnings/records/index')">全部明细</view>
      <view class="bb-pri" @click="goPage('/pages/withdraw/index')">💰 申请提现</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const activeFilter = ref('all')
const showFilter = ref(false)

const totalEarnings = 7800.50
const withdrawableBalance = 5280.00

const incomeSources = [
  { name: '课程分成', amount: 3280.50, percentage: 42, color: '#C41E3A' },
  { name: '商品分佣', amount: 1560.00, percentage: 20, color: '#C9A96E' },
  { name: '入圈收入', amount: 980.00, percentage: 13, color: '#52C41A' },
  { name: '推广佣金', amount: 1200.00, percentage: 15, color: '#1677FF' },
  { name: '管理奖励', amount: 780.00, percentage: 10, color: '#722ED1' },
]

const trendData = [
  { day: '周一', amount: 320 },
  { day: '周二', amount: 580 },
  { day: '周三', amount: 420 },
  { day: '周四', amount: 890 },
  { day: '周五', amount: 650 },
  { day: '周六', amount: 1200 },
  { day: '周日', amount: 980 },
]

const maxAmount = Math.max(...trendData.map(d => d.amount))

const incomeRecords = [
  { id: 1, type: 'course', title: '课程《八字入门》销售分佣', amount: 29.90, time: '今天 14:30', icon: '📖', color: '#C41E3A', bg: 'rgba(196,30,58,0.08)' },
  { id: 2, type: 'product', title: '商品「开运手串」销售分佣', amount: 15.00, time: '今天 11:20', icon: '🛍️', color: '#C9A96E', bg: 'rgba(201,169,110,0.1)' },
  { id: 3, type: 'circle', title: '用户加入「命理研习社」', amount: 9.90, time: '昨天 18:45', icon: '👥', color: '#52C41A', bg: 'rgba(82,196,26,0.08)' },
  { id: 4, type: 'promote', title: '推广用户购买会员', amount: 50.00, time: '昨天 15:30', icon: '📤', color: '#1677FF', bg: 'rgba(22,119,255,0.08)' },
  { id: 5, type: 'course', title: '课程《紫微斗数精讲》销售分佣', amount: 99.00, time: '昨天 10:15', icon: '📖', color: '#C41E3A', bg: 'rgba(196,30,58,0.08)' },
  { id: 6, type: 'award', title: '本周管理奖励结算', amount: 200.00, time: '3天前', icon: '🏆', color: '#722ED1', bg: 'rgba(114,46,209,0.08)' },
  { id: 7, type: 'product', title: '商品「风水罗盘」销售分佣', amount: 45.00, time: '3天前', icon: '🛍️', color: '#C9A96E', bg: 'rgba(201,169,110,0.1)' },
  { id: 8, type: 'circle', title: '用户加入「风水实战班」', amount: 199.00, time: '4天前', icon: '👥', color: '#52C41A', bg: 'rgba(82,196,26,0.08)' },
]

const filters = [
  { id: 'all', label: '全部' },
  { id: 'course', label: '课程' },
  { id: 'product', label: '商品' },
  { id: 'circle', label: '圈子' },
  { id: 'promote', label: '推广' },
]

const filteredRecords = computed(() => {
  if (activeFilter.value === 'all') return incomeRecords
  return incomeRecords.filter(r => r.type === activeFilter.value)
})

function goPage(url: string) { uni.navigateTo({ url }) }
</script>

<style scoped>
.earn-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 140rpx; }
.header-sticky { position: sticky; top: 0; z-index: 30; background: rgba(250,248,245,0.95); backdrop-filter: blur(12rpx); border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; padding: 0 24rpx; height: 88rpx; }
.header-back { font-size: 48rpx; color: #333; width: 64rpx; }
.header-title { font-size: 34rpx; font-weight: 700; color: #2C2C2C; }
.header-spacer { width: 64rpx; }

.earn-body { padding: 16rpx 24rpx; }

.overview-card { background: linear-gradient(135deg, #C9A96E, #C41E3A); border-radius: 20rpx; padding: 32rpx; position: relative; overflow: hidden; margin-bottom: 16rpx; }
.oc-deco { position: absolute; border-radius: 50%; background: rgba(255,255,255,0.08); }
.oc-d1 { width: 200rpx; height: 200rpx; top: -60rpx; right: -40rpx; }
.oc-d2 { width: 140rpx; height: 140rpx; bottom: -30rpx; right: -20rpx; background: rgba(255,255,255,0.05); }
.oc-content { position: relative; z-index: 1; }
.oc-label { font-size: 24rpx; color: rgba(255,255,255,0.75); }
.oc-amount-row { display: flex; align-items: baseline; gap: 4rpx; margin: 8rpx 0; }
.oc-yuan { font-size: 28rpx; color: #fff; }
.oc-amount { font-size: 64rpx; font-weight: 700; color: #fff; }
.oc-bottom { display: flex; justify-content: space-between; align-items: center; padding-top: 18rpx; border-top: 1px solid rgba(255,255,255,0.2); margin-top: 6rpx; }
.oc-sub { font-size: 20rpx; color: rgba(255,255,255,0.7); display: block; }
.oc-balance { font-size: 32rpx; font-weight: 600; color: #fff; }
.oc-withdraw-btn { padding: 10rpx 32rpx; background: #fff; color: #C41E3A; border-radius: 32rpx; font-size: 24rpx; font-weight: 500; }

.card { background: #fff; border-radius: 16rpx; padding: 20rpx 24rpx; margin-bottom: 14rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14rpx; }
.card-title { font-size: 26rpx; font-weight: 600; color: #2C2C2C; }
.card-more { font-size: 22rpx; color: #BBB; }

.source-content { display: flex; align-items: center; gap: 32rpx; }
.sc-donut { width: 140rpx; height: 140rpx; border-radius: 50%; background: conic-gradient(#C41E3A 0% 42%, #C9A96E 42% 62%, #52C41A 62% 75%, #1677FF 75% 90%, #722ED1 90% 100%); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.donut-center { width: 80rpx; height: 80rpx; border-radius: 50%; background: #fff; display: flex; align-items: center; justify-content: center; font-size: 28rpx; }
.sc-legend { flex: 1; }
.sc-item { display: flex; align-items: center; gap: 8rpx; margin-bottom: 8rpx; }
.sc-dot { width: 14rpx; height: 14rpx; border-radius: 50%; flex-shrink: 0; }
.sc-name { font-size: 20rpx; color: #666; flex: 1; }
.sc-pct { font-size: 20rpx; font-weight: 500; color: #333; }

.trend-up { font-size: 20rpx; color: #52C41A; }
.bar-chart { display: flex; align-items: flex-end; justify-content: space-between; gap: 8rpx; height: 200rpx; }
.bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; }
.bar-val { font-size: 16rpx; color: #BBB; margin-bottom: 4rpx; }
.bar-fill { width: 100%; background: rgba(196,30,58,0.4); border-radius: 6rpx 6rpx 0 0; min-height: 4rpx; }
.bar-fill.accent { background: #C9A96E; }
.bar-day { font-size: 16rpx; color: #BBB; margin-top: 6rpx; }

.filter-btn { font-size: 20rpx; color: #999; }
.filter-chips { display: flex; gap: 10rpx; padding-bottom: 14rpx; white-space: nowrap; margin-bottom: 8rpx; }
.f-chip { font-size: 22rpx; color: #999; background: #F5F1EB; padding: 6rpx 20rpx; border-radius: 24rpx; display: inline-block; }
.f-chip.active { background: #C41E3A; color: #fff; }

.records-list { }
.record-item { display: flex; align-items: center; gap: 12rpx; padding: 14rpx 0; border-bottom: 1px solid #F5F1EB; }
.ri-icon { width: 64rpx; height: 64rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; font-size: 28rpx; flex-shrink: 0; }
.ri-info { flex: 1; min-width: 0; }
.ri-title { font-size: 24rpx; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
.ri-time { font-size: 20rpx; color: #BBB; margin-top: 2rpx; display: block; }
.ri-amount { font-size: 26rpx; font-weight: 600; color: #52C41A; flex-shrink: 0; }

.view-all { text-align: center; padding: 14rpx 0; font-size: 24rpx; color: #BBB; }

.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; padding: 16rpx 24rpx 24rpx; background: rgba(255,255,255,0.95); backdrop-filter: blur(12rpx); border-top: 1px solid #E8E0D5; display: flex; gap: 16rpx; }
.bb-sec { flex: 1; height: 80rpx; border-radius: 20rpx; background: #F5F1EB; display: flex; align-items: center; justify-content: center; font-size: 24rpx; color: #666; }
.bb-pri { flex: 1; height: 80rpx; border-radius: 20rpx; background: #C41E3A; display: flex; align-items: center; justify-content: center; font-size: 24rpx; color: #fff; font-weight: 500; }
</style>
