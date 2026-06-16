<template>
  <view class="page">
    <app-nav-bar title="数据中心" background="linear-gradient(to right, #C41E3A, #E85A70)" color="#fff" :back-size="40">
      <template #right>
        <view class="nav-refresh" @tap="handleRefresh">
          <AppIcon name="refresh-cw" :size="20" color="#fff" />
        </view>
      </template>
    </app-nav-bar>

    <view v-if="loading" class="hd-skeleton">
      <view v-for="i in 4" :key="i" class="sk-card" />
    </view>
    <app-error v-else-if="error" :desc="error" @retry="loadData" />
    <view v-else>
    <!-- 概览卡片 2x2 -->
    <view class="overview">
      <view class="stat-card">
        <view class="stat-head">
          <AppIcon name="eye" :size="16" color="#666" />
          <text class="stat-label">总观看</text>
        </view>
        <text class="stat-value">{{ formatHostNumber(stats.totalViews) }}</text>
        <view class="stat-trend">
          <AppIcon :name="stats.viewsGrowthRate >= 0 ? 'trending-up' : 'trending-down'" :size="12" :color="stats.viewsGrowthRate >= 0 ? '#22c55e' : '#ef4444'" />
          <text class="trend-rate" :class="stats.viewsGrowthRate >= 0 ? 'up' : 'down'">{{ Math.abs(stats.viewsGrowthRate) }}%</text>
          <text class="trend-note">较上月</text>
        </view>
      </view>

      <view class="stat-card">
        <view class="stat-head">
          <AppIcon name="coins" :size="16" color="#C9A96E" />
          <text class="stat-label">总收益</text>
        </view>
        <text class="stat-value gold">¥{{ formatHostNumber(stats.totalRevenue) }}</text>
        <view class="stat-trend">
          <AppIcon :name="stats.revenueGrowthRate >= 0 ? 'trending-up' : 'trending-down'" :size="12" :color="stats.revenueGrowthRate >= 0 ? '#22c55e' : '#ef4444'" />
          <text class="trend-rate" :class="stats.revenueGrowthRate >= 0 ? 'up' : 'down'">{{ Math.abs(stats.revenueGrowthRate) }}%</text>
          <text class="trend-note">较上月</text>
        </view>
      </view>

      <view class="stat-card">
        <view class="stat-head">
          <AppIcon name="clock" :size="16" color="#666" />
          <text class="stat-label">场均时长</text>
        </view>
        <text class="stat-value">{{ stats.avgDuration }}<text class="stat-unit">分钟</text></text>
        <text class="stat-note">共{{ stats.totalRooms }}场直播</text>
      </view>

      <view class="stat-card">
        <view class="stat-head">
          <AppIcon name="users" :size="16" color="#666" />
          <text class="stat-label">粉丝增长</text>
        </view>
        <text class="stat-value red">+{{ formatHostNumber(stats.fansGrowth) }}</text>
        <text class="stat-note">本月新增</text>
      </view>
    </view>

    <!-- 趋势图 -->
    <view class="trend-wrap">
      <view class="trend-card">
        <view class="trend-head">
          <text class="trend-title">近30天趋势</text>
          <view class="trend-tabs">
            <view class="trend-tab" :class="{ 'trend-tab-active': trendType === 'views' }" @tap="trendType = 'views'">观看</view>
            <view class="trend-tab" :class="{ 'trend-tab-active': trendType === 'revenue' }" @tap="trendType = 'revenue'">收益</view>
          </view>
        </view>
        <view class="chart">
          <view
            v-for="(t, i) in trend"
            :key="i"
            class="bar"
            :style="{ height: barHeight(t) + '%' }"
          />
        </view>
        <view class="chart-axis">
          <text class="axis-label">{{ trend[0].dateLabel }}</text>
          <text class="axis-label">{{ trend[14].dateLabel }}</text>
          <text class="axis-label">{{ trend[29].dateLabel }}</text>
        </view>
      </view>
    </view>

    <!-- 直播记录 -->
    <view class="records">
      <view class="records-head">
        <text class="records-title">直播记录</text>
        <text class="records-count">共{{ rooms.length }}场</text>
      </view>
      <view class="record-list">
        <view v-for="room in rooms" :key="room.id" class="record-card" @tap="openRoom(room)">
          <view class="record-inner">
            <view class="record-cover">
              <image class="record-img" :src="room.cover" mode="aspectFill" />
              <view v-if="room.status === 'preview'" class="rc-preview">预告</view>
              <view v-else class="rc-dur">{{ formatHostDuration(room.duration) }}</view>
            </view>
            <view class="record-info">
              <text class="record-title-txt">{{ room.title }}</text>
              <text class="record-date">{{ room.dateText }}</text>
              <view v-if="room.status === 'ended'" class="record-stats">
                <view class="rs-item">
                  <AppIcon name="eye" :size="12" color="#666" />
                  <text class="rs-txt">{{ formatHostNumber(room.views) }}</text>
                </view>
                <view class="rs-item">
                  <AppIcon name="gift" :size="12" color="#C9A96E" />
                  <text class="rs-txt">{{ room.gifts }}</text>
                </view>
                <text class="rs-revenue">¥{{ room.revenue }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import AppNavBar from '@/components/common/app-nav-bar.vue'
import AppError from '@/components/common/app-error.vue'
import {
  hostLiveStats,
  hostLiveRooms,
  hostLiveTrend,
  formatHostNumber,
  formatHostDuration,
  type HostLiveRoom,
  type HostLiveTrend,
} from '@/lib/live-data'

const loading = ref(true)
const error = ref('')

// UI 临时状态
const stats = ref(hostLiveStats)
const rooms = ref(hostLiveRooms)
const trend = ref(hostLiveTrend)

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    await new Promise(r => setTimeout(r, 300))
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => loadData())
const trendType = ref<'views' | 'revenue'>('views')

const maxTrendValue = computed(() =>
  Math.max(...trend.value.map((t) => (trendType.value === 'views' ? t.views : t.revenue))),
)

function barHeight(t: HostLiveTrend) {
  const value = trendType.value === 'views' ? t.views : t.revenue
  const h = maxTrendValue.value > 0 ? (value / maxTrendValue.value) * 100 : 0
  return Math.max(h, 4)
}

function handleRefresh() {}
function openRoom(_room: HostLiveRoom) {}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #faf8f5;
  padding-bottom: 40rpx;
}

/* 骨架 */
.hd-skeleton { padding: 24rpx; display: flex; flex-direction: column; gap: 24rpx; padding-top: 120rpx; }
.sk-card { height: 200rpx; border-radius: 20rpx; background: #f0ebe3; animation: sk-pulse 1.5s infinite; }
@keyframes sk-pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.6; } }

.nav-refresh { display: flex; align-items: center; justify-content: center; width: 56rpx; height: 56rpx; margin-right: -8rpx; }

/* 概览卡片 */
.overview {
  padding: 32rpx;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24rpx;
}
.stat-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.stat-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
}
.stat-label {
  font-size: 26rpx;
  color: #666;
}
.stat-value {
  font-size: 48rpx;
  font-weight: 700;
  color: #2c2c2c;
  line-height: 1.1;
}
.stat-value.gold {
  color: #C9A96E;
}
.stat-value.red {
  color: #C41E3A;
}
.stat-unit {
  font-size: 26rpx;
  font-weight: 400;
  margin-left: 8rpx;
}
.stat-trend {
  display: flex;
  align-items: center;
  gap: 6rpx;
  margin-top: 8rpx;
}
.trend-rate {
  font-size: 22rpx;
}
.trend-rate.up {
  color: #22c55e;
}
.trend-rate.down {
  color: #ef4444;
}
.trend-note {
  font-size: 22rpx;
  color: #999;
}
.stat-note {
  display: block;
  font-size: 22rpx;
  color: #999;
  margin-top: 8rpx;
}

/* 趋势图 */
.trend-wrap {
  padding: 0 32rpx;
  margin-bottom: 32rpx;
}
.trend-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.trend-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32rpx;
}
.trend-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.trend-tabs {
  display: flex;
  background: #faf8f5;
  border-radius: 12rpx;
  padding: 6rpx;
}
.trend-tab {
  padding: 8rpx 24rpx;
  font-size: 26rpx;
  color: #666;
  border-radius: 10rpx;
}
.trend-tab-active {
  background: #fff;
  color: #C41E3A;
  box-shadow: 0 1rpx 4rpx rgba(0, 0, 0, 0.08);
}
.chart {
  height: 256rpx;
  display: flex;
  align-items: flex-end;
  gap: 4rpx;
}
.bar {
  flex: 1;
  background: linear-gradient(to top, rgba(196, 30, 58, 0.2), rgba(196, 30, 58, 0.6));
  border-radius: 6rpx 6rpx 0 0;
}
.chart-axis {
  display: flex;
  justify-content: space-between;
  margin-top: 16rpx;
}
.axis-label {
  font-size: 22rpx;
  color: #999;
}

/* 直播记录 */
.records {
  padding: 0 32rpx;
}
.records-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.records-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.records-count {
  font-size: 26rpx;
  color: #999;
}
.record-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.record-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.record-inner {
  display: flex;
  gap: 24rpx;
}
.record-cover {
  position: relative;
  width: 192rpx;
  height: 128rpx;
  flex-shrink: 0;
  border-radius: 12rpx;
  overflow: hidden;
  background: #f0f0f0;
}
.record-img {
  width: 100%;
  height: 100%;
}
.rc-preview {
  position: absolute;
  top: 8rpx;
  left: 8rpx;
  background: #f97316;
  color: #fff;
  font-size: 20rpx;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
}
.rc-dur {
  position: absolute;
  bottom: 8rpx;
  right: 8rpx;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 20rpx;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
}
.record-info {
  flex: 1;
  min-width: 0;
}
.record-title-txt {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.record-date {
  display: block;
  font-size: 22rpx;
  color: #999;
  margin-top: 8rpx;
}
.record-stats {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-top: 16rpx;
}
.rs-item {
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.rs-txt {
  font-size: 22rpx;
  color: #666;
}
.rs-revenue {
  font-size: 22rpx;
  font-weight: 500;
  color: #C9A96E;
}
</style>
