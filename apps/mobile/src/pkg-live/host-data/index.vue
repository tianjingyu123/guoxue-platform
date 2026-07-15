<template>
  <view class="page">
    <!-- 顶部导航(红色渐变) -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-left">
          <view class="nav-btn" @tap="goBack">
            <AppIcon name="chevron-left" :size="48" color="#fff" />
          </view>
          <text class="nav-title">数据中心</text>
        </view>
        <view class="nav-btn" @tap="handleRefresh">
          <AppIcon name="refresh-cw" :size="40" color="#fff" />
        </view>
      </view>
    </view>

    <!-- 骨架屏 -->
    <view v-if="loading">
      <view class="overview">
        <view class="stat-card skeleton-pulse" v-for="i in 4" :key="i">
          <view class="skeleton-stat-head">
            <view class="skeleton-icon" />
            <view class="skeleton-line w-40" />
          </view>
          <view class="skeleton-line w-60" style="height: 48rpx; margin-top: 16rpx;" />
          <view class="skeleton-line w-30" style="margin-top: 8rpx;" />
        </view>
      </view>
      <view class="trend-wrap">
        <view class="trend-card">
          <view class="skeleton-line w-50" style="margin-bottom: 32rpx;" />
          <view class="skeleton-chart" />
        </view>
      </view>
      <view class="records">
        <view class="skeleton-line w-40" style="margin-bottom: 24rpx;" />
        <view class="skeleton-record-card" v-for="i in 3" :key="i">
          <view class="skeleton-record-cover" />
          <view class="skeleton-record-info">
            <view class="skeleton-line w-80" />
            <view class="skeleton-line w-40" />
            <view class="skeleton-line w-60" />
          </view>
        </view>
      </view>
    </view>

    <!-- 错误 -->
    <view v-else-if="error" class="error-state">
      <AppIcon name="alert-circle" :size="96" color="#cbb8a8" />
      <text class="error-text">{{ error }}</text>
      <view class="error-btn" @tap="fetchData">重试</view>
    </view>

    <template v-else>
    <!-- 概览卡片 2x2 -->
    <view class="overview">
      <view class="stat-card">
        <view class="stat-head">
          <AppIcon name="eye" :size="32" color="#666" />
          <text class="stat-label">总观看</text>
        </view>
        <text class="stat-value">{{ formatHostNumber(stats.totalViews) }}</text>
        <view class="stat-trend">
          <AppIcon :name="stats.viewsGrowthRate >= 0 ? 'trending-up' : 'trending-down'" :size="24" :color="stats.viewsGrowthRate >= 0 ? '#22c55e' : '#ef4444'" />
          <text class="trend-rate" :class="stats.viewsGrowthRate >= 0 ? 'up' : 'down'">{{ Math.abs(stats.viewsGrowthRate) }}%</text>
          <text class="trend-note">较上月</text>
        </view>
      </view>

      <view class="stat-card">
        <view class="stat-head">
          <AppIcon name="coins" :size="32" color="#C9A96E" />
          <text class="stat-label">总收益</text>
        </view>
        <text class="stat-value gold">¥{{ formatHostNumber(stats.totalRevenue) }}</text>
        <view class="stat-trend">
          <AppIcon :name="stats.revenueGrowthRate >= 0 ? 'trending-up' : 'trending-down'" :size="24" :color="stats.revenueGrowthRate >= 0 ? '#22c55e' : '#ef4444'" />
          <text class="trend-rate" :class="stats.revenueGrowthRate >= 0 ? 'up' : 'down'">{{ Math.abs(stats.revenueGrowthRate) }}%</text>
          <text class="trend-note">较上月</text>
        </view>
      </view>

      <view class="stat-card">
        <view class="stat-head">
          <AppIcon name="clock" :size="32" color="#666" />
          <text class="stat-label">场均时长</text>
        </view>
        <text class="stat-value">{{ stats.avgDuration }}<text class="stat-unit">分钟</text></text>
        <text class="stat-note">共{{ stats.totalRooms }}场直播</text>
      </view>

      <view class="stat-card">
        <view class="stat-head">
          <AppIcon name="users" :size="32" color="#666" />
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
        <view class="chart-axis" v-if="trend.length">
          <text class="axis-label">{{ trend[0]?.dateLabel }}</text>
          <text class="axis-label">{{ trend[14]?.dateLabel }}</text>
          <text class="axis-label">{{ trend[29]?.dateLabel }}</text>
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
              <image lazy-load class="record-img" :src="room.cover" mode="aspectFill" />
              <view v-if="room.status === 'preview'" class="rc-preview">预告</view>
              <view v-else class="rc-dur">{{ formatHostDuration(room.duration) }}</view>
            </view>
            <view class="record-info">
              <text class="record-title-txt">{{ room.title }}</text>
              <text class="record-date">{{ room.dateText }}</text>
              <view v-if="room.status === 'ended'" class="record-stats">
                <view class="rs-item">
                  <AppIcon name="eye" :size="24" color="#666" />
                  <text class="rs-txt">{{ formatHostNumber(room.views) }}</text>
                </view>
                <view class="rs-item">
                  <AppIcon name="gift" :size="24" color="#C9A96E" />
                  <text class="rs-txt">{{ room.gifts }}</text>
                </view>
                <text class="rs-revenue">¥{{ room.revenue }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import {
  liveApi,
  formatHostNumber,
  formatHostDuration,
  type HostLiveRoom,
  type HostLiveTrend,
} from '@/lib/live-data'

const statusBarHeight = ref(20)
const loading = ref(true)
const error = ref('')

// 模板裸访问大量统计字段，保留 any 避免收敛触发大量报错
const stats = ref<any>({})
const rooms = ref<HostLiveRoom[]>([])
const trend = ref<HostLiveTrend[]>([])
const trendType = ref<'views' | 'revenue'>('views')

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const res = await liveApi.getHostData()
    stats.value = res.stats
    rooms.value = res.rooms
    trend.value = res.trend
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

const maxTrendValue = computed(() =>
  trend.value.length > 0 ? Math.max(...trend.value.map((t) => (trendType.value === 'views' ? t.views : t.revenue))) : 0,
)

function barHeight(t: HostLiveTrend) {
  const value = trendType.value === 'views' ? t.views : t.revenue
  const h = maxTrendValue.value > 0 ? (value / maxTrendValue.value) * 100 : 0
  return Math.max(h, 4)
}

function handleRefresh() { fetchData() }
function openRoom(_room: HostLiveRoom) {}

onMounted(() => { fetchData() })
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #faf8f5;
  padding-bottom: 40rpx;
}

/* 导航(红色渐变) */
.nav {
  position: sticky;
  top: 0;
  z-index: 10;
  background: linear-gradient(to right, var(--brand), #E85A70);
}
.nav-bar {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16rpx;
}
.nav-left {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.nav-btn {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-title {
  font-size: 34rpx;
  font-weight: 500;
  color: #fff;
}

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
  color: var(--brand);
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
  color: var(--brand);
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

/* 骨架屏 */
.skeleton-pulse { animation: skeleton-pulse 1.5s ease-in-out infinite; }
@keyframes skeleton-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.skeleton-stat-head { display: flex; align-items: center; gap: 12rpx; margin-bottom: 16rpx; }
.skeleton-icon { width: 32rpx; height: 32rpx; background: #e8e4dc; border-radius: 8rpx; }
.skeleton-line { height: 24rpx; background: #e8e4dc; border-radius: 8rpx; }
.skeleton-line.w-80 { width: 80%; }
.skeleton-line.w-60 { width: 60%; }
.skeleton-line.w-40 { width: 40%; }
.skeleton-line.w-50 { width: 50%; }
.skeleton-line.w-30 { width: 30%; }
.skeleton-chart { height: 256rpx; background: #e8e4dc; border-radius: 16rpx; }
.skeleton-record-card { background: #fff; border-radius: 24rpx; padding: 32rpx; display: flex; gap: 24rpx; margin-bottom: 24rpx; }
.skeleton-record-cover { width: 192rpx; height: 128rpx; background: #e8e4dc; border-radius: 12rpx; flex-shrink: 0; }
.skeleton-record-info { flex: 1; display: flex; flex-direction: column; gap: 8rpx; }

/* 错误态 */
.error-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 128rpx 0; }
.error-text { font-size: 26rpx; color: #999; margin-top: 24rpx; }
.error-btn { margin-top: 32rpx; padding: 16rpx 48rpx; font-size: 26rpx; color: #fff; background: var(--brand); border-radius: 999rpx; }
</style>
