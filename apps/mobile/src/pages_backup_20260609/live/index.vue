<template>
  <view class="live-page">
    <!-- 顶部固定 -->
    <view class="header-fixed">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <text class="header-title">直播广场</text>
        <text class="header-search" @click="goSearch">🔍</text>
      </view>
      <!-- 分类Tab -->
      <scroll-view scroll-x class="tab-scroll" :show-scrollbar="false">
        <view class="tab-row">
          <view
            v-for="tab in tabs"
            :key="tab"
            class="tab-item"
            :class="{ active: activeTab === tab }"
            @click="activeTab = tab"
          >
            {{ tab }}
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- Loading -->
    <view v-if="loading" class="load-area">
      <LoadingSkeleton v-for="i in 4" :key="i" type="card" />
    </view>

    <!-- Error -->
    <view v-else-if="err" class="err-area">
      <EmptyState icon="📡" title="加载失败" :description="err" action-text="重试" @action="fetchLives" />
    </view>

    <!-- 内容 -->
    <view v-else class="live-content">
      <!-- 正在直播 -->
      <view v-if="livesNow.length" class="live-section">
        <view class="section-header">
          <view class="section-title-row">
            <text class="live-dot">🔴</text>
            <text class="section-title">正在直播</text>
            <text class="section-count">({{ livesNow.length }})</text>
          </view>
        </view>
        <view class="live-grid">
          <view
            v-for="live in livesNow"
            :key="live.id"
            class="live-card"
            :class="{ 'live-card-h': live.orientation === 'horizontal' }"
            @click="goLive(live.id)"
          >
            <view class="live-cover" :class="{ 'live-cover-h': live.orientation === 'horizontal' }">
              <image v-if="live.cover" :src="live.cover" class="cover-img" mode="aspectFill" />
              <view v-else class="cover-plain">
                <text class="cover-icon">📡</text>
              </view>
              <view class="live-badge">直播中</view>
              <view class="live-viewers">{{ fmtN(live.viewerCount || 0) }} 观看</view>
            </view>
            <text class="live-title">{{ live.title }}</text>
            <view class="live-host-row">
              <image v-if="live.hostAvatar" :src="live.hostAvatar" class="host-avatar" mode="aspectFill" />
              <view v-else class="host-avatar-plain">{{ live.hostName?.charAt(0) }}</view>
              <text class="host-name">{{ live.hostName }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 直播预告 -->
      <view v-if="livesUpcoming.length" class="live-section">
        <view class="section-header">
          <view class="section-title-row">
            <text class="section-title">直播预告</text>
            <text class="section-count">({{ livesUpcoming.length }})</text>
          </view>
        </view>
        <view class="live-grid">
          <view
            v-for="live in livesUpcoming"
            :key="live.id"
            class="live-card"
            :class="{ 'live-card-h': live.orientation === 'horizontal' }"
            @click="goLive(live.id)"
          >
            <view class="live-cover" :class="{ 'live-cover-h': live.orientation === 'horizontal' }">
              <image v-if="live.cover" :src="live.cover" class="cover-img" mode="aspectFill" />
              <view v-else class="cover-plain">
                <text class="cover-icon">📡</text>
              </view>
              <view class="live-badge upcoming">预约</view>
            </view>
            <text class="live-title">{{ live.title }}</text>
            <view class="live-host-row">
              <image v-if="live.hostAvatar" :src="live.hostAvatar" class="host-avatar" mode="aspectFill" />
              <view v-else class="host-avatar-plain">{{ live.hostName?.charAt(0) }}</view>
              <text class="host-name">{{ live.hostName }}</text>
            </view>
            <text v-if="live.scheduledTime" class="live-time">{{ live.scheduledTime }}</text>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="filteredLives.length === 0" class="empty">
        <text class="empty-icon">📡</text>
        <text class="empty-text">暂无相关直播</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'
import { liveApi } from '../../api'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'

const tabs = ['全部', '知识授课', '电商带货', '关注的']

interface LiveItem {
  id: string; title: string; cover?: string
  hostName: string; hostAvatar?: string
  viewerCount: number; type: string; status: string
  orientation: string; scheduledTime?: string
}

const activeTab = ref('全部')
const loading = ref(true)
const err = ref<string | null>(null)
const rawLives = ref<LiveItem[]>([])

const filteredLives = computed(() => {
  return rawLives.value.filter(live => {
    if (activeTab.value === '全部') return true
    if (activeTab.value === '知识授课') return live.type === 'knowledge'
    if (activeTab.value === '电商带货') return live.type === 'commerce'
    if (activeTab.value === '关注的') return false
    return true
  })
})

const livesNow = computed(() => filteredLives.value.filter(l => l.status === 'live'))
const livesUpcoming = computed(() => filteredLives.value.filter(l => l.status === 'upcoming'))

function fmtN(n: number) {
  if (n >= 10000) return (n / 10000).toFixed(1) + '万'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

async function fetchLives() {
  loading.value = true; err.value = null
  try {
    const data = await liveApi.list({ page: 1, pageSize: 20 }) as any
    const list = Array.isArray(data) ? data : (data?.lives || data?.data || [])
    rawLives.value = list.map((l: any) => ({
      id: l.id,
      title: l.title,
      cover: l.cover || l.image,
      hostName: l.hostName || l.host || '',
      hostAvatar: l.hostAvatar,
      viewerCount: l.viewerCount || l.viewers || 0,
      type: l.type || 'knowledge',
      status: l.status || 'live',
      orientation: l.orientation || 'vertical',
      scheduledTime: l.scheduledTime || l.time,
    }))
  } catch (e: any) { err.value = e.errMsg || '加载失败' }
  finally { loading.value = false }
}

function goSearch() { uni.navigateTo({ url: '/pages/search/index' }) }
function goLive(id: string) { uni.navigateTo({ url: `/pages/live/id/index?id=${id}` }) }

onMounted(() => { fetchLives() })
onPullDownRefresh(() => {
  fetchLives().finally(() => setTimeout(() => uni.stopPullDownRefresh(), 500))
})
</script>

<style scoped>
.live-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 100rpx; }

/* Header */
.header-fixed {
  position: fixed; top: 0; left: 0; right: 0; z-index: 50;
  background: rgba(250,248,245,0.95); backdrop-filter: blur(12rpx);
  border-bottom: 1px solid #E8E0D5;
}
.header-row {
  display: flex; align-items: center; padding: 0 24rpx; height: 88rpx;
}
.header-back { font-size: 48rpx; color: #333; width: 64rpx; }
.header-title { flex: 1; font-size: 34rpx; font-weight: 700; color: #2C2C2C; }
.header-search { font-size: 36rpx; padding: 12rpx; }

.tab-scroll { padding-bottom: 12rpx; white-space: nowrap; }
.tab-row { display: flex; gap: 40rpx; padding: 0 24rpx; }
.tab-item {
  font-size: 26rpx; color: #999; padding-bottom: 8rpx;
  position: relative; white-space: nowrap;
}
.tab-item.active { color: #C41E3A; font-weight: 600; }
.tab-item.active::after {
  content: ''; position: absolute; bottom: 0; left: 0; right: 0;
  height: 4rpx; background: #C41E3A; border-radius: 2rpx;
}

/* Content */
.live-content { padding-top: 156rpx; }

.load-area { padding: 24rpx; padding-top: 156rpx; }
.err-area { padding: 80rpx 24rpx; padding-top: 156rpx; }

.live-section { padding: 24rpx; }
.section-header { margin-bottom: 16rpx; }
.section-title-row { display: flex; align-items: center; gap: 8rpx; }
.live-dot { font-size: 16rpx; }
.section-title { font-size: 30rpx; font-weight: 700; color: #2C2C2C; }
.section-count { font-size: 22rpx; color: #999; }

/* Live Grid */
.live-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12rpx; }

.live-card { }
.live-card-h { grid-column: span 2; }

.live-cover {
  width: 100%; aspect-ratio: 3/4; border-radius: 16rpx;
  overflow: hidden; position: relative; background: #2C2C2C;
}
.live-cover-h { aspect-ratio: 16/9; }

.cover-img { width: 100%; height: 100%; display: block; }
.cover-plain {
  width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #333, #555);
}
.cover-icon { font-size: 56rpx; }

.live-badge {
  position: absolute; top: 12rpx; left: 12rpx;
  font-size: 20rpx; color: #fff; background: #C41E3A;
  padding: 2rpx 12rpx; border-radius: 8rpx;
}
.live-badge.upcoming { background: #C9A96E; }

.live-viewers {
  position: absolute; bottom: 12rpx; right: 12rpx;
  font-size: 20rpx; color: #fff; background: rgba(0,0,0,0.5);
  padding: 2rpx 10rpx; border-radius: 8rpx;
}

.live-title {
  font-size: 26rpx; font-weight: 500; color: #333; margin-top: 10rpx;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden; line-height: 1.4;
}

.live-host-row {
  display: flex; align-items: center; gap: 8rpx; margin-top: 8rpx;
}
.host-avatar {
  width: 36rpx; height: 36rpx; border-radius: 50%;
}
.host-avatar-plain {
  width: 36rpx; height: 36rpx; border-radius: 50%;
  background: #C9A96E; display: flex; align-items: center; justify-content: center;
  font-size: 20rpx; color: #fff;
}
.host-name { font-size: 20rpx; color: #888; }

.live-time { font-size: 20rpx; color: #C9A96E; margin-top: 4rpx; display: block; }

/* 空状态 */
.empty { display: flex; flex-direction: column; align-items: center; padding: 120rpx 24rpx; }
.empty-icon { font-size: 80rpx; margin-bottom: 16rpx; }
.empty-text { font-size: 28rpx; color: #999; }
</style>
