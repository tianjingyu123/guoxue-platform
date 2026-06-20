<template>
  <view class="lv-page">
    <!-- 导航栏 (渐变) -->
    <view
      class="lv-header"
      :style="{ paddingTop: statusBarHeight + 'px' }"
    >
      <view class="lv-nav">
        <view
          class="lv-hbtn"
          @tap="goBack"
        >
          <app-icon
            name="arrow-left"
            :size="40"
            color="#ffffff"
          />
        </view>
        <view class="lv-station">
          <image
            class="lv-station-logo"
            :src="stationLogo"
            mode="aspectFill"
          />
          <text class="lv-station-name">
            {{ stationName }} - 直播
          </text>
        </view>
        <view
          class="lv-hbtn"
          @tap="onRefresh"
        >
          <app-icon
            name="refresh-cw"
            :size="40"
            color="#ffffff"
            :class="{ 'lv-spin': refreshing }"
          />
        </view>
      </view>
      <view class="lv-search-wrap">
        <view class="lv-search">
          <app-icon
            name="search"
            :size="28"
            color="#9ca3af"
          />
          <input
            v-model="keyword"
            class="lv-search-input"
            placeholder="搜索直播间"
            placeholder-class="lv-ph"
          >
        </view>
      </view>
    </view>

    <!-- 筛选标签 -->
    <view class="lv-filters">
      <view
        v-for="f in filterOptions"
        :key="f.value"
        class="lv-filter"
        :class="{ active: filter === f.value }"
        @tap="filter = f.value"
      >
        <text class="lv-filter-txt">
          {{ f.label }}{{ f.value === 'live' ? `(${liveCount})` : '' }}
        </text>
      </view>
    </view>

    <!-- 直播列表 -->
    <view class="lv-list">
      <view
        v-for="room in sortedList"
        :key="room.id"
        class="lv-card"
        :class="{ ring: room.status === 'live' }"
        @tap="enterRoom(room.id)"
      >
        <!-- 封面 -->
        <view class="lv-cover">
          <image
            class="lv-cover-img"
            :src="room.cover"
            mode="aspectFill"
          />
          <!-- 状态标签 -->
          <view
            class="lv-status"
            :style="statusStyle(room.status)"
          >
            <view
              v-if="room.status === 'live'"
              class="lv-dot"
            />
            <text
              class="lv-status-txt"
              :style="{ color: statusInfo(room.status).color }"
            >
              {{ statusInfo(room.status).label }}
            </text>
          </view>
          <!-- LIVE 角标 -->
          <view
            v-if="room.status === 'live'"
            class="lv-live-badge"
          >
            <app-icon
              name="radio"
              :size="22"
              color="#ffffff"
            />
            <text class="lv-live-txt">
              LIVE
            </text>
          </view>
          <!-- 回放时长 -->
          <view
            v-if="room.status === 'replay' && room.replayDuration"
            class="lv-duration"
          >
            <text class="lv-duration-txt">
              {{ formatDuration(room.replayDuration) }}
            </text>
          </view>
          <!-- 预告倒计时 -->
          <view
            v-if="room.status === 'preview'"
            class="lv-countdown"
          >
            <app-icon
              name="clock"
              :size="48"
              color="#ffffff"
            />
            <text class="lv-countdown-txt">
              {{ countdownText(room.scheduledTime) }}
            </text>
          </view>
          <!-- 商品数量 -->
          <view
            v-if="room.productCount > 0"
            class="lv-goods"
          >
            <app-icon
              name="shopping-bag"
              :size="22"
              color="#ffffff"
            />
            <text class="lv-goods-txt">
              {{ room.productCount }}件商品
            </text>
          </view>
        </view>

        <!-- 信息 -->
        <view class="lv-info">
          <text class="lv-card-title">
            {{ room.title }}
          </text>
          <view class="lv-anchor">
            <image
              class="lv-anchor-avatar"
              :src="room.anchor.avatar"
              mode="aspectFill"
            />
            <text class="lv-anchor-name">
              {{ room.anchor.nickname }}
            </text>
            <text
              v-if="room.isStationExclusive"
              class="lv-exclusive"
            >
              专属
            </text>
          </view>
          <view class="lv-stats">
            <view class="lv-stat">
              <app-icon
                name="eye"
                :size="26"
                color="#9ca3af"
              /><text class="lv-stat-txt">
                {{ formatViewCount(room.viewCount) }}
              </text>
            </view>
            <view class="lv-stat">
              <app-icon
                name="heart"
                :size="26"
                color="#9ca3af"
              /><text class="lv-stat-txt">
                {{ formatViewCount(room.likeCount) }}
              </text>
            </view>
          </view>
          <view
            v-if="room.tags && room.tags.length"
            class="lv-tags"
          >
            <text
              v-for="(t, i) in room.tags.slice(0, 3)"
              :key="i"
              class="lv-tag"
            >
              {{ t }}
            </text>
          </view>
        </view>
      </view>

      <!-- 空态 (直播中筛选无内容) -->
      <view
        v-if="sortedList.length === 0 && filter === 'live'"
        class="lv-empty"
      >
        <text class="lv-empty-txt">
          暂无正在直播的内容
        </text>
        <view
          class="lv-empty-btn"
          @tap="filter = 'preview'"
        >
          <app-icon
            name="clock"
            :size="28"
            color="#C9A96E"
          />
          <text class="lv-empty-btn-txt">
            查看直播预告
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { navigateTo } from '@/utils/router'
import { operatorApi } from '@/lib/operator-data'

const statusBarHeight = ref(20)
uni.getSystemInfo({ success: (r) => { statusBarHeight.value = r.statusBarHeight || 20 } })

const stationName = '国学智慧分站'
const stationLogo = 'https://picsum.photos/seed/station-live-logo/40/40'

const filter = ref<'all' | 'live' | 'preview' | 'replay'>('all')
const keyword = ref('')
const refreshing = ref(false)
const rooms = ref<any[]>([])
const loading = ref(true)

const filterOptions = [
  { value: 'all', label: '全部' },
  { value: 'live', label: '直播中' },
  { value: 'preview', label: '预告' },
  { value: 'replay', label: '回放' },
] as const

onMounted(async () => {
  try {
    const data = await operatorApi.stationLiveRooms('')
    rooms.value = Array.isArray(data) ? data : []
  } catch (e) { rooms.value = [] }
  loading.value = false
})

const liveCount = computed(() => rooms.value.filter((r: any) => r.status === 'live').length)

const filteredList = computed(() => {
  let list = rooms.value
  if (filter.value !== 'all') list = list.filter((r: any) => r.status === filter.value)
  if (keyword.value) list = list.filter((r: any) => r.title.includes(keyword.value) || r.anchor.nickname.includes(keyword.value))
  return list
})

// 排序：直播中 > 预告 > 回放
const sortedList = computed(() => {
  const order: Record<string, number> = { live: 0, preview: 1, replay: 2 }
  return [...filteredList.value].sort((a: any, b: any) => order[a.status] - order[b.status])
})

function statusInfo(status: string) {
  switch (status) {
    case 'live': return { label: '直播中', color: '#ffffff', bgColor: '#C41E3A' }
    case 'preview': return { label: '预告', color: '#C9A96E', bgColor: 'rgba(201, 169, 110, 0.15)' }
    case 'replay': return { label: '回放', color: '#666666', bgColor: 'rgba(0, 0, 0, 0.08)' }
    default: return { label: '已结束', color: '#999999', bgColor: 'rgba(0, 0, 0, 0.05)' }
  }
}
function statusStyle(status: string) {
  return { background: statusInfo(status).bgColor }
}

function formatViewCount(count: number): string {
  if (count >= 10000) return (count / 10000).toFixed(1) + 'w'
  if (count >= 1000) return (count / 1000).toFixed(1) + 'k'
  return count.toString()
}
function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h}小时${m}分钟` : `${m}分钟`
}
function countdownText(scheduledTime?: string): string {
  if (!scheduledTime) return ''
  const diff = new Date(scheduledTime.replace(/-/g, '/')).getTime() - Date.now()
  if (diff <= 0) return '即将开播'
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  if (days > 0) return `${days}天${hours}小时后开播`
  if (hours > 0) return `${hours}小时${minutes}分钟后开播`
  return `${minutes}分钟后开播`
}

function onRefresh() {
  if (refreshing.value) return
  refreshing.value = true
  setTimeout(() => { refreshing.value = false }, 800)
}
function enterRoom(id: number) { navigateTo(`/pkg-live/watch/index?id=${id}`) }
function goBack() { uni.navigateBack({ fail: () => navigateTo('/pages/index/index') }) }
</script>

<style scoped lang="scss">
.lv-page { min-height: 100vh; background: #FAF8F5; }

.lv-header { position: sticky; top: 0; z-index: 50; background: linear-gradient(90deg, #C41E3A, #A01830); }
.lv-nav { height: 88rpx; display: flex; align-items: center; justify-content: space-between; padding: 0 16rpx; }
.lv-hbtn { width: 64rpx; height: 64rpx; display: flex; align-items: center; justify-content: center; }
.lv-station { display: flex; align-items: center; gap: 12rpx; }
.lv-station-logo { width: 48rpx; height: 48rpx; border-radius: 50%; background: rgba(255,255,255,.2); }
.lv-station-name { font-size: 30rpx; font-weight: 500; color: #fff; }
.lv-search-wrap { padding: 0 32rpx 24rpx; }
.lv-search { display: flex; align-items: center; gap: 12rpx; height: 72rpx; padding: 0 24rpx; background: rgba(255,255,255,.9); border-radius: 999rpx; }
.lv-search-input { flex: 1; font-size: 26rpx; color: #1f2937; }
.lv-ph { color: #9ca3af; }

.lv-filters { position: sticky; z-index: 40; display: flex; gap: 16rpx; padding: 24rpx 32rpx; background: #FAF8F5; border-bottom: 1rpx solid #f0f0f0; overflow-x: auto; }
.lv-filter { padding: 12rpx 32rpx; border-radius: 999rpx; background: #fff; flex-shrink: 0; }
.lv-filter.active { background: #C41E3A; }
.lv-filter-txt { font-size: 26rpx; color: #4b5563; white-space: nowrap; }
.lv-filter.active .lv-filter-txt { color: #fff; }

.lv-list { padding: 32rpx; display: flex; flex-direction: column; gap: 32rpx; }
.lv-card { background: #fff; border-radius: 24rpx; overflow: hidden; box-shadow: 0 2rpx 12rpx rgba(0,0,0,.04); }
.lv-card.ring { box-shadow: 0 0 0 4rpx #C41E3A; }

.lv-cover { position: relative; width: 100%; aspect-ratio: 16/9; background: #f3f4f6; }
.lv-cover-img { width: 100%; height: 100%; }
.lv-status { position: absolute; top: 16rpx; left: 16rpx; display: flex; align-items: center; gap: 8rpx; padding: 4rpx 16rpx; border-radius: 8rpx; }
.lv-dot { width: 12rpx; height: 12rpx; border-radius: 50%; background: #fff; animation: lv-pulse 1.2s infinite; }
.lv-status-txt { font-size: 22rpx; font-weight: 500; }
.lv-live-badge { position: absolute; top: 16rpx; right: 16rpx; display: flex; align-items: center; gap: 4rpx; padding: 4rpx 12rpx; background: #C41E3A; border-radius: 8rpx; }
.lv-live-txt { font-size: 20rpx; font-weight: 700; color: #fff; }
.lv-duration { position: absolute; bottom: 16rpx; right: 16rpx; padding: 4rpx 12rpx; background: rgba(0,0,0,.6); border-radius: 8rpx; }
.lv-duration-txt { font-size: 22rpx; color: #fff; }
.lv-countdown { position: absolute; inset: 0; background: rgba(0,0,0,.4); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8rpx; }
.lv-countdown-txt { font-size: 26rpx; font-weight: 500; color: #fff; }
.lv-goods { position: absolute; bottom: 16rpx; left: 16rpx; display: flex; align-items: center; gap: 4rpx; padding: 4rpx 12rpx; background: #C9A96E; border-radius: 8rpx; }
.lv-goods-txt { font-size: 22rpx; color: #fff; }

.lv-info { padding: 24rpx; }
.lv-card-title { font-size: 28rpx; font-weight: 500; color: #111827; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 16rpx; }
.lv-anchor { display: flex; align-items: center; gap: 12rpx; margin-bottom: 16rpx; }
.lv-anchor-avatar { width: 48rpx; height: 48rpx; border-radius: 50%; background: #f3f4f6; flex-shrink: 0; }
.lv-anchor-name { font-size: 24rpx; color: #4b5563; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lv-exclusive { font-size: 20rpx; padding: 4rpx 12rpx; background: rgba(196,30,58,.1); color: #C41E3A; border-radius: 8rpx; }
.lv-stats { display: flex; align-items: center; gap: 24rpx; }
.lv-stat { display: flex; align-items: center; gap: 6rpx; }
.lv-stat-txt { font-size: 24rpx; color: #6b7280; }
.lv-tags { display: flex; align-items: center; gap: 8rpx; flex-wrap: wrap; margin-top: 16rpx; }
.lv-tag { font-size: 20rpx; padding: 4rpx 12rpx; background: #f3f4f6; color: #4b5563; border-radius: 8rpx; }

.lv-empty { text-align: center; padding: 64rpx 0; display: flex; flex-direction: column; align-items: center; gap: 32rpx; }
.lv-empty-txt { font-size: 26rpx; color: #9ca3af; }
.lv-empty-btn { display: inline-flex; align-items: center; gap: 12rpx; padding: 16rpx 32rpx; border: 1rpx solid #C9A96E; border-radius: 16rpx; }
.lv-empty-btn-txt { font-size: 26rpx; color: #C9A96E; }

.lv-spin { animation: lv-spin 1s linear infinite; }
@keyframes lv-spin { to { transform: rotate(360deg); } }
@keyframes lv-pulse { 0%,100% { opacity: 1; } 50% { opacity: .3; } }
</style>
