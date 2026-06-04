<template>
  <view class="page">
    <!-- 加载态 -->
    <view
      v-if="loading"
      class="loading-wrap"
    >
      <view class="skeleton-header">
        <view class="skeleton-circle" />
        <view class="skeleton-line w-40" />
      </view>
      <view class="skeleton-body">
        <view class="skeleton-grid">
          <view
            v-for="i in 4"
            :key="i"
            class="skeleton-card"
          />
        </view>
        <view class="skeleton-card h-48" />
        <view class="skeleton-card-list">
          <view
            v-for="i in 3"
            :key="i"
            class="skeleton-card h-24"
          />
        </view>
      </view>
    </view>

    <!-- 错误态 -->
    <view
      v-else-if="loadError"
      class="error-wrap"
    >
      <view class="error-inner">
        <text class="error-icon">
          ⚠️
        </text>
        <text class="error-text">
          {{ loadError }}
        </text>
        <view
          class="error-retry"
          @click="handleRefresh"
        >
          重新加载
        </view>
      </view>
    </view>

    <!-- 主要内容 -->
    <template v-else>
      <!-- 顶部导航 -->
      <view class="nav-header">
        <view class="nav-inner">
          <view class="nav-left">
            <text
              class="nav-back"
              @click="goBack"
            >
              ←
            </text>
            <text class="nav-title">
              数据中心
            </text>
          </view>
          <text
            :class="['nav-refresh', refreshing ? 'spinning' : '']"
            @click="handleRefresh"
          >
            🔄
          </text>
        </view>
      </view>

      <!-- 概览卡片 -->
      <view class="stats-grid">
        <view class="stat-card">
          <view class="stat-header">
            <text class="stat-icon">
              👁️
            </text>
            <text class="stat-label">
              总观看
            </text>
          </view>
          <text class="stat-value">
            {{ formatNumber(stats?.totalViews || 0) }}
          </text>
          <view class="stat-trend">
            <text :class="['trend-icon', (stats?.viewsGrowthRate || 0) >= 0 ? 'trend-up' : 'trend-down']">
              {{ (stats?.viewsGrowthRate || 0) >= 0 ? '↑' : '↓' }}
            </text>
            <text :class="['trend-value', (stats?.viewsGrowthRate || 0) >= 0 ? 'trend-up' : 'trend-down']">
              {{ Math.abs(stats?.viewsGrowthRate || 0) }}%
            </text>
            <text class="trend-label">
              较上月
            </text>
          </view>
        </view>
        <view class="stat-card">
          <view class="stat-header">
            <text class="stat-icon gold">
              🪙
            </text>
            <text class="stat-label">
              总收益
            </text>
          </view>
          <text class="stat-value gold">
            ¥{{ formatNumber(stats?.totalRevenue || 0) }}
          </text>
          <view class="stat-trend">
            <text :class="['trend-icon', (stats?.revenueGrowthRate || 0) >= 0 ? 'trend-up' : 'trend-down']">
              {{ (stats?.revenueGrowthRate || 0) >= 0 ? '↑' : '↓' }}
            </text>
            <text :class="['trend-value', (stats?.revenueGrowthRate || 0) >= 0 ? 'trend-up' : 'trend-down']">
              {{ Math.abs(stats?.revenueGrowthRate || 0) }}%
            </text>
            <text class="trend-label">
              较上月
            </text>
          </view>
        </view>
        <view class="stat-card">
          <view class="stat-header">
            <text class="stat-icon">
              ⏱️
            </text>
            <text class="stat-label">
              场均时长
            </text>
          </view>
          <text class="stat-value">
            {{ stats?.avgDuration || 0 }}<text class="stat-unit">
              分钟
            </text>
          </text>
          <text class="stat-sub">
            共{{ stats?.totalRooms || 0 }}场直播
          </text>
        </view>
        <view class="stat-card">
          <view class="stat-header">
            <text class="stat-icon">
              👥
            </text>
            <text class="stat-label">
              粉丝增长
            </text>
          </view>
          <text class="stat-value accent">
            +{{ formatNumber(stats?.fansGrowth || 0) }}
          </text>
          <text class="stat-sub">
            本月新增
          </text>
        </view>
      </view>

      <!-- 趋势图 -->
      <view class="chart-section">
        <view class="chart-header">
          <text class="chart-title">
            近30天趋势
          </text>
          <view class="chart-tabs">
            <text
              :class="['chart-tab', trendType === 'views' ? 'chart-tab-active' : '']"
              @click="trendType = 'views'"
            >
              观看
            </text>
            <text
              :class="['chart-tab', trendType === 'revenue' ? 'chart-tab-active' : '']"
              @click="trendType = 'revenue'"
            >
              收益
            </text>
          </view>
        </view>
        <!-- 柱状图 -->
        <view class="chart-bars">
          <view
            v-for="(t, i) in trend"
            :key="i"
            class="chart-bar"
            :style="{ height: `${Math.max((trendType === 'views' ? t.views : t.revenue) / maxTrendValue * 100, 4)}%` }"
          />
        </view>
        <view class="chart-labels">
          <text class="chart-label">
            {{ trend[0]?.date?.slice(5) }}
          </text>
          <text class="chart-label">
            {{ trend[14]?.date?.slice(5) }}
          </text>
          <text class="chart-label">
            {{ trend[29]?.date?.slice(5) }}
          </text>
        </view>
      </view>

      <!-- 直播场次列表 -->
      <view class="room-section">
        <view class="room-section-header">
          <text class="room-section-title">
            直播记录
          </text>
          <text class="room-section-count">
            共{{ rooms.length }}场
          </text>
        </view>
        <view
          v-if="rooms.length > 0"
          class="room-list"
        >
          <view
            v-for="room in rooms"
            :key="room.id"
            class="room-card"
            @click="goRoom(room)"
          >
            <view class="room-cover-wrap">
              <image
                :src="room.cover || '/placeholder.svg'"
                mode="aspectFill"
                class="room-cover"
              />
              <text
                v-if="room.status === 'preview'"
                class="room-badge preview"
              >
                预告
              </text>
              <text
                v-else
                class="room-badge duration"
              >
                {{ formatDuration(room.duration) }}
              </text>
            </view>
            <view class="room-info">
              <text class="room-title">
                {{ room.title }}
              </text>
              <text class="room-time">
                {{ formatTime(room.startTime) }}
              </text>
              <view
                v-if="room.status === 'ended'"
                class="room-stats-row"
              >
                <text class="room-stat">
                  👁️ {{ formatNumber(room.views) }}
                </text>
                <text class="room-stat gold">
                  🎁 {{ room.gifts }}
                </text>
                <text class="room-stat gold">
                  ¥{{ room.revenue }}
                </text>
              </view>
            </view>
          </view>
        </view>
        <view
          v-else
          class="room-empty"
        >
          <text class="room-empty-icon">
            🎬
          </text>
          <text class="room-empty-text">
            暂无直播记录
          </text>
          <text
            class="room-empty-btn"
            @click="createLive"
          >
            创建直播
          </text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { liveApi } from '../../api'

interface HostLiveStats {
  totalViews: number; totalRevenue: number; avgDuration: number
  fansGrowth: number; totalRooms: number; totalGifts: number
  viewsGrowthRate: number; revenueGrowthRate: number
}

interface HostLiveRoom {
  id: string; title: string; cover: string; status: string
  startTime: string; endTime?: string; duration: number
  views: number; peakViewers: number; likes: number; gifts: number; revenue: number
}

interface HostLiveTrend { date: string; views: number; revenue: number; duration: number }

const loading = ref(true)
const refreshing = ref(false)
const loadError = ref<string | null>(null)
const stats = ref<HostLiveStats | null>(null)
const rooms = ref<HostLiveRoom[]>([])
const trend = ref<HostLiveTrend[]>([])
const trendType = ref<'views' | 'revenue'>('views')

const maxTrendValue = computed(() => Math.max(...trend.value.map(t => trendType.value === 'views' ? t.views : t.revenue)))

onMounted(() => { loadData() })

async function loadData() {
  try {
    const res = await liveApi.rooms({ hostOnly: true, pageSize: 100 })
    const rawList = res?.list || res?.items || res?.rooms || (Array.isArray(res) ? res : [])
    const roomList = rawList.map(mapRoom)
    rooms.value = roomList

    const totalRooms = roomList.length
    const totalViews = roomList.reduce((s, r) => s + r.views, 0)
    const totalRevenue = roomList.reduce((s, r) => s + r.revenue, 0)
    const totalGifts = roomList.reduce((s, r) => s + r.gifts, 0)
    const totalDuration = roomList.reduce((s, r) => s + r.duration, 0)

    stats.value = {
      totalViews,
      totalRevenue,
      avgDuration: totalRooms > 0 ? Math.round(totalDuration / totalRooms) : 0,
      fansGrowth: 0,
      totalRooms,
      totalGifts,
      viewsGrowthRate: 0,
      revenueGrowthRate: 0,
    }

    trend.value = buildTrend(roomList)
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || '加载失败'
    console.error(e)
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

function handleRefresh() {
  refreshing.value = true
  loadData()
}

function formatNumber(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + '万'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return num.toString()
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60); const m = minutes % 60
  return h > 0 ? `${h}小时${m}分钟` : `${m}分钟`
}

function formatTime(t: string): string {
  if (!t) return ''
  const d = new Date(t)
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function goBack() { uni.navigateBack() }
function goRoom(room: HostLiveRoom) { uni.navigateTo({ url: `/pages/live/live-room?id=${room.id}` }) }
function createLive() { uni.navigateTo({ url: '/pages/live/create' }) }

function mapRoom(raw: any): HostLiveRoom {
  return {
    id: raw.id || '',
    title: raw.title || '',
    cover: raw.cover || '',
    status: raw.status === 'LIVING' ? 'live' : (raw.status === 'REPLAY' || raw.status === 'ENDED') ? 'ended' : 'preview',
    startTime: raw.startAt || raw.startTime || '',
    endTime: raw.endAt || raw.endTime || '',
    duration: raw.duration || 0,
    views: raw.viewCount || raw.views || 0,
    peakViewers: raw.peakViewers || 0,
    likes: raw.likeCount || raw.likes || 0,
    gifts: raw.giftCount || raw.gifts || 0,
    revenue: raw.revenue || 0,
  }
}

function buildTrend(roomList: HostLiveRoom[]): HostLiveTrend[] {
  const dayMap: Record<string, { views: number; revenue: number; duration: number }> = {}
  for (const r of roomList) {
    if (!r.startTime) continue
    const key = r.startTime.slice(0, 10)
    if (!dayMap[key]) dayMap[key] = { views: 0, revenue: 0, duration: 0 }
    dayMap[key].views += r.views
    dayMap[key].revenue += r.revenue
    dayMap[key].duration += r.duration
  }
  const arr: HostLiveTrend[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    const key = d.toISOString().split('T')[0]
    arr.push({
      date: key,
      views: dayMap[key]?.views || 0,
      revenue: dayMap[key]?.revenue || 0,
      duration: dayMap[key]?.duration || 0,
    })
  }
  return arr
}
</script>

<style scoped>
.page { background: #FAF8F5; min-height: 100vh; padding-bottom: 30rpx; }

/* 骨架 */
.loading-wrap { padding: 0 24rpx; }
.skeleton-header { display: flex; align-items: center; gap: 12rpx; padding: 20rpx 0; }
.skeleton-circle { width: 48rpx; height: 48rpx; border-radius: 50%; background: #E8E3DB; }
.skeleton-line { height: 24rpx; background: #E8E3DB; border-radius: 6rpx; }
.w-40 { width: 160rpx; }
.skeleton-body { display: flex; flex-direction: column; gap: 20rpx; }
.skeleton-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx; }
.skeleton-card { background: #E8E3DB; border-radius: 16rpx; height: 96rpx; }
.h-48 { height: 192rpx; }
.h-24 { height: 96rpx; }
.skeleton-card-list { display: flex; flex-direction: column; gap: 12rpx; }

/* 导航 */
.nav-header { position: sticky; top: 0; z-index: 10; background: linear-gradient(135deg, #C41E3A, #E85A70); color: #fff; }
.nav-inner { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 24rpx; }
.nav-left { display: flex; align-items: center; gap: 12rpx; }
.nav-back { font-size: 36rpx; padding: 4rpx; }
.nav-title { font-size: 32rpx; font-weight: 500; }
.nav-refresh { font-size: 28rpx; padding: 8rpx; }
.spinning { animation: spin 1s linear infinite; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

/* 概览统计 */
.stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx; padding: 24rpx; }
.stat-card { background: #fff; border-radius: 24rpx; padding: 24rpx; }
.stat-header { display: flex; align-items: center; gap: 8rpx; margin-bottom: 12rpx; }
.stat-icon { font-size: 28rpx; color: #666; }
.stat-icon.gold { color: #C9A96E; }
.stat-label { font-size: 24rpx; color: #666; }
.stat-value { font-size: 40rpx; font-weight: bold; color: #2C2C2C; }
.stat-value.gold { color: #C9A96E; }
.stat-value.accent { color: #C41E3A; }
.stat-unit { font-size: 24rpx; font-weight: normal; margin-left: 4rpx; }
.stat-trend { display: flex; align-items: center; gap: 4rpx; margin-top: 8rpx; }
.trend-icon { font-size: 20rpx; }
.trend-up { color: #52c41a; }
.trend-down { color: #ff4d4f; }
.trend-value { font-size: 22rpx; }
.trend-label { font-size: 22rpx; color: #999; }
.stat-sub { font-size: 22rpx; color: #999; margin-top: 8rpx; }

/* 趋势图 */
.chart-section { background: #fff; border-radius: 24rpx; margin: 0 24rpx 24rpx; padding: 24rpx; }
.chart-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.chart-title { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.chart-tabs { display: flex; background: #FAF8F5; border-radius: 12rpx; padding: 4rpx; }
.chart-tab { padding: 8rpx 20rpx; font-size: 24rpx; color: #666; border-radius: 8rpx; }
.chart-tab-active { background: #fff; color: #C41E3A; }
.chart-bars { display: flex; align-items: flex-end; gap: 4rpx; height: 160rpx; }
.chart-bar { flex: 1; background: linear-gradient(to top, rgba(196,30,58,0.2), rgba(196,30,58,0.6)); border-radius: 4rpx 4rpx 0 0; min-height: 8rpx; }
.chart-labels { display: flex; justify-content: space-between; margin-top: 12rpx; }
.chart-label { font-size: 22rpx; color: #999; }

/* 直播场次列表 */
.room-section { padding: 0 24rpx; }
.room-section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.room-section-title { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.room-section-count { font-size: 24rpx; color: #999; }
.room-list { display: flex; flex-direction: column; gap: 16rpx; }
.room-card { display: flex; gap: 16rpx; padding: 24rpx; background: #fff; border-radius: 24rpx; }
.room-cover-wrap { position: relative; width: 144rpx; height: 96rpx; border-radius: 12rpx; overflow: hidden; flex-shrink: 0; }
.room-cover { width: 100%; height: 100%; background: #E8E3DB; }
.room-badge { position: absolute; font-size: 20rpx; padding: 2rpx 8rpx; border-radius: 4rpx; color: #fff; }
.room-badge.preview { top: 4rpx; left: 4rpx; background: #f59e0b; }
.room-badge.duration { bottom: 4rpx; right: 4rpx; background: rgba(0,0,0,0.6); }
.room-info { flex: 1; min-width: 0; }
.room-title { display: block; font-size: 26rpx; font-weight: 500; color: #2C2C2C; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.room-time { display: block; font-size: 22rpx; color: #999; margin-top: 8rpx; }
.room-stats-row { display: flex; align-items: center; gap: 16rpx; margin-top: 12rpx; }
.room-stat { font-size: 22rpx; color: #666; }
.room-stat.gold { color: #C9A96E; }

/* 空状态 */
.room-empty { display: flex; flex-direction: column; align-items: center; padding: 80rpx 0; }
.room-empty-icon { font-size: 72rpx; color: #E8E3DB; margin-bottom: 16rpx; }
.room-empty-text { font-size: 26rpx; color: #999; margin-bottom: 24rpx; }
.room-empty-btn { padding: 16rpx 48rpx; background: #C41E3A; color: #fff; border-radius: 40rpx; font-size: 26rpx; }

/* 错误态 */
.error-wrap { display: flex; align-items: center; justify-content: center; min-height: 70vh; padding: 48rpx; }
.error-inner { text-align: center; }
.error-icon { font-size: 72rpx; display: block; margin-bottom: 16rpx; }
.error-text { font-size: 26rpx; color: #999; margin-bottom: 24rpx; display: block; }
.error-retry { display: inline-block; padding: 16rpx 48rpx; background: #C41E3A; color: #fff; border-radius: 40rpx; font-size: 26rpx; }
</style>
