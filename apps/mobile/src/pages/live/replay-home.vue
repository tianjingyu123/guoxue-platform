<template>
  <view class="page">
    <!-- 加载态 -->
    <view v-if="loading" class="loading-wrap">
      <view class="skeleton-header" />
      <view class="skeleton-body">
        <view class="skeleton-tags">
          <view v-for="i in 5" :key="i" class="skeleton-tag" />
        </view>
        <view class="skeleton-banner" />
        <view class="skeleton-grid">
          <view v-for="i in 4" :key="i" class="skeleton-card-half" />
        </view>
      </view>
    </view>

    <!-- 错误态 -->
    <view v-else-if="loadError" class="error-wrap">
      <view class="error-inner">
        <text class="error-icon">⚠️</text>
        <text class="error-text">{{ loadError }}</text>
        <view class="error-retry" @click="fetchReplays">重新加载</view>
      </view>
    </view>

    <template v-else>
      <!-- 顶部导航 -->
      <view class="nav-header">
        <view class="nav-inner">
          <view class="nav-left">
            <text class="nav-back" @click="goBack">←</text>
            <text class="nav-title">直播回放</text>
          </view>
          <text class="nav-search-btn" @click="showSearch = true">🔍</text>
        </view>
      </view>

      <!-- 搜索覆盖层 -->
      <view v-if="showSearch" class="search-overlay">
        <view class="search-header-row">
          <view class="search-input-wrap">
            <text class="search-icon">🔍</text>
            <input v-model="searchQuery" class="search-input" placeholder="搜索回放..." @confirm="doSearch" />
            <text v-if="searchQuery" class="search-clear" @click="searchQuery = ''">✕</text>
          </view>
          <text class="search-cancel" @click="closeSearch">取消</text>
        </view>
        <view class="search-body">
          <!-- 搜索结果 -->
          <view v-if="searchQuery" class="search-results">
            <view
              v-for="item in searchedReplays"
              :key="item.id"
              class="search-result-item"
              @click="goPlay(item.id)"
            >
              <view class="search-result-cover-wrap">
                <image :src="item.cover" mode="aspectFill" class="search-result-cover" />
              </view>
              <view class="search-result-info">
                <text class="search-result-title">{{ item.title }}</text>
                <text class="search-result-host">{{ item.host.name }}</text>
              </view>
            </view>
          </view>
          <!-- 热门搜索 -->
          <view v-else class="hot-searches">
            <text class="hs-title">热门搜索</text>
            <view class="hs-tags">
              <text v-for="tag in hotTags" :key="tag" class="hs-tag" @click="searchQuery = tag">{{ tag }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 分类导航 -->
      <view class="category-bar">
        <scroll-view scroll-x class="category-scroll" show-scrollbar="false">
          <view class="category-inner">
            <text
              v-for="cat in categories"
              :key="cat.id"
              :class="['category-tag', selectedCategory === cat.id ? 'cat-active' : '']"
              @click="selectCategory(cat.id)"
            >
              {{ cat.icon }} {{ cat.name }}
              <text class="cat-count">({{ cat.count }})</text>
            </text>
          </view>
        </scroll-view>
      </view>

      <view class="content-area">
        <!-- 热门回放 -->
        <view v-if="!selectedCategory" class="hot-section">
          <view class="section-header">
            <text class="section-title">热门回放</text>
            <view class="section-more" @click="goReplays">
              <text class="more-text">更多</text>
              <text class="more-arrow">›</text>
            </view>
          </view>
          <view class="hot-list">
            <view
              v-for="(replay, index) in hotReplays"
              :key="replay.id"
              class="hot-card"
              @click="goPlay(replay.id)"
            >
              <view class="hot-cover-wrap">
                <image :src="replay.cover" mode="aspectFill" class="hot-cover" />
                <view class="hot-cover-gradient" />
                <view class="hot-badge">🔥 热门</view>
                <view class="hot-rank">{{ index + 1 }}</view>
                <view class="hot-play-btn">▶</view>
                <view class="hot-duration">⏱️ {{ formatDuration(replay.duration) }}</view>
                <text class="hot-title">{{ replay.title }}</text>
              </view>
              <view class="hot-footer">
                <view class="hot-host">
                  <image :src="replay.host.avatar" mode="aspectFill" class="hot-host-avatar" />
                  <text class="hot-host-name">{{ replay.host.name }}</text>
                  <text class="hot-category">{{ replay.category }}</text>
                </view>
                <view class="hot-views">
                  <text>👁️</text>
                  <text>{{ formatViews(replay.views) }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 回放列表 -->
        <view class="replay-section">
          <view class="section-header">
            <text class="section-title">
              {{ selectedCategory && selectedCategory !== 'all' ? (categories.find(c => c.id === selectedCategory)?.name || '') + '回放' : '最新回放' }}
            </text>
          </view>
          <view class="replay-grid">
            <view
              v-for="replay in filteredReplays"
              :key="replay.id"
              class="replay-card"
              @click="goPlay(replay.id)"
            >
              <view class="replay-card-cover-wrap">
                <image :src="replay.cover" mode="aspectFill" class="replay-card-cover" />
                <view class="replay-card-overlay" />
                <view class="replay-card-tag">▶ 回放</view>
                <view class="replay-card-duration">{{ formatDuration(replay.duration) }}</view>
              </view>
              <view class="replay-card-body">
                <text class="replay-card-title">{{ replay.title }}</text>
                <view class="replay-card-footer">
                  <view class="replay-card-host">
                    <image :src="replay.host.avatar" mode="aspectFill" class="rc-host-avatar" />
                    <text class="rc-host-name">{{ replay.host.name }}</text>
                  </view>
                  <view class="rc-views">👁️ {{ formatViews(replay.views) }}</view>
                </view>
              </view>
            </view>
          </view>
        </view>

        <view class="load-more">
          <text class="load-more-text">上拉加载更多</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { liveApi } from '../../api'

interface ReplayItem {
  id: string; title: string; cover: string
  host: { id: string; name: string; avatar: string }
  duration: number; views: number; category: string
  createdAt: string; isHot?: boolean
}

const searchQuery = ref('')
const showSearch = ref(false)
const selectedCategory = ref<string | null>(null)
const loading = ref(true)

const categories = [
  { id: 'all', name: '全部', icon: '📚', count: 128 },
  { id: 'yijing', name: '易经', icon: '☯️', count: 35 },
  { id: 'fengshui', name: '风水', icon: '🏠', count: 28 },
  { id: 'bazi', name: '八字', icon: '📅', count: 24 },
  { id: 'meihua', name: '梅花', icon: '🌸', count: 18 },
  { id: 'liuyao', name: '六爻', icon: '⚊', count: 15 },
  { id: 'qimen', name: '奇门', icon: '🚪', count: 8 },
]

const allReplays = ref<ReplayItem[]>([])
const hotReplays = ref<ReplayItem[]>([])
const loadError = ref<string | null>(null)
const hotTags = ['易经入门', '风水布局', '八字排盘', '梅花易数', '运势解析']

const filteredReplays = computed(() => {
  if (!selectedCategory.value || selectedCategory.value === 'all') return allReplays.value
  const catName = categories.find(c => c.id === selectedCategory.value)?.name
  return allReplays.value.filter(r => r.category === catName)
})

const searchedReplays = computed(() => {
  if (!searchQuery.value) return []
  return allReplays.value.filter(r => r.title.includes(searchQuery.value) || r.host.name.includes(searchQuery.value))
})

onMounted(() => {
  fetchReplays()
})

async function fetchReplays() {
  loading.value = true
  loadError.value = null
  try {
    const res = await liveApi.rooms({ status: 'REPLAY', pageSize: 50 })
    const rawList = res?.list || res?.items || res?.rooms || (Array.isArray(res) ? res : [])
    allReplays.value = rawList.map(mapReplayItem)
    // 按观看量排序取前2作为热门
    const sorted = [...allReplays.value].sort((a, b) => b.views - a.views)
    hotReplays.value = sorted.slice(0, 2)
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || '加载失败'
    console.error(e)
  } finally {
    loading.value = false
  }
}

function mapReplayItem(raw: any): ReplayItem {
  return {
    id: raw.id || '',
    title: raw.title || '',
    cover: raw.cover || '',
    host: {
      id: raw.hostId || raw.userId || raw.host?.id || '',
      name: raw.hostName || raw.host?.name || raw.user?.nickname || '',
      avatar: raw.hostAvatar || raw.host?.avatar || raw.user?.avatar || '',
    },
    duration: raw.duration || 0,
    views: raw.viewCount || raw.views || 0,
    category: raw.category || '',
    createdAt: raw.startAt || raw.startTime || raw.createdAt || '',
  }
}

function selectCategory(id: string) {
  selectedCategory.value = selectedCategory.value === id ? null : id
}

function closeSearch() { showSearch.value = false; searchQuery.value = '' }
function doSearch() { /* 搜索逻辑 - v-model handles input */ }

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h}小时${m}分钟` : `${m}分钟`
}

function formatViews(num: number) {
  if (num >= 10000) return `${(num / 10000).toFixed(1)}万`
  return num.toString()
}

function goBack() { uni.navigateBack() }
function goPlay(id: string) { uni.navigateTo({ url: `/pages/live/replay-player?id=${id}` }) }
function goReplays() { uni.navigateTo({ url: '/pages/live/replays' }) }
</script>

<style scoped>
.page { background: #FAF8F5; min-height: 100vh; }

/* 错误态 */
.error-wrap { display: flex; align-items: center; justify-content: center; min-height: 70vh; padding: 48rpx; }
.error-inner { text-align: center; }
.error-icon { font-size: 72rpx; display: block; margin-bottom: 16rpx; }
.error-text { font-size: 26rpx; color: #999; margin-bottom: 24rpx; display: block; }
.error-retry { display: inline-block; padding: 16rpx 48rpx; background: #C41E3A; color: #fff; border-radius: 40rpx; font-size: 26rpx; }

/* 骨架 */
.loading-wrap { }
.skeleton-header { height: 88rpx; background: #E8E3DB; }
.skeleton-body { padding: 24rpx; display: flex; flex-direction: column; gap: 20rpx; }
.skeleton-tags { display: flex; gap: 16rpx; }
.skeleton-tag { width: 120rpx; height: 64rpx; background: #E8E3DB; border-radius: 40rpx; }
.skeleton-banner { height: 288rpx; background: #E8E3DB; border-radius: 24rpx; }
.skeleton-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx; }
.skeleton-card-half { aspect-ratio: 16/9; background: #E8E3DB; border-radius: 16rpx; }

/* 导航 */
.nav-header { position: sticky; top: 0; z-index: 20; background: linear-gradient(135deg, #C41E3A, #D4456A); color: #fff; }
.nav-inner { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 24rpx; }
.nav-left { display: flex; align-items: center; gap: 12rpx; }
.nav-back { font-size: 36rpx; padding: 4rpx; }
.nav-title { font-size: 32rpx; font-weight: 600; }
.nav-search-btn { font-size: 28rpx; padding: 8rpx; }

/* 搜索覆盖层 */
.search-overlay { position: fixed; inset: 0; z-index: 50; background: #fff; }
.search-header-row { display: flex; align-items: center; gap: 16rpx; padding: 20rpx 24rpx; border-bottom: 1rpx solid #E8E3DB; }
.search-input-wrap { flex: 1; display: flex; align-items: center; gap: 12rpx; background: #FAF8F5; border-radius: 40rpx; padding: 0 20rpx; }
.search-icon { font-size: 24rpx; color: #999; }
.search-input { flex: 1; height: 64rpx; font-size: 26rpx; color: #2C2C2C; background: transparent; }
.search-clear { font-size: 24rpx; color: #999; padding: 4rpx; }
.search-cancel { font-size: 26rpx; color: #C41E3A; }
.search-body { padding: 24rpx; }
.search-results { display: flex; flex-direction: column; gap: 16rpx; }
.search-result-item { display: flex; gap: 12rpx; padding: 12rpx; background: #fff; border-radius: 16rpx; }
.search-result-cover-wrap { width: 144rpx; height: 80rpx; border-radius: 12rpx; overflow: hidden; flex-shrink: 0; background: #E8E3DB; }
.search-result-cover { width: 100%; height: 100%; }
.search-result-info { flex: 1; min-width: 0; }
.search-result-title { display: block; font-size: 24rpx; font-weight: 500; color: #2C2C2C; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.search-result-host { display: block; font-size: 22rpx; color: #999; margin-top: 8rpx; }
.hot-searches { }
.hs-title { display: block; font-size: 24rpx; font-weight: 500; color: #2C2C2C; margin-bottom: 16rpx; }
.hs-tags { display: flex; flex-wrap: wrap; gap: 12rpx; }
.hs-tag { padding: 12rpx 24rpx; background: #FAF8F5; border-radius: 32rpx; font-size: 24rpx; color: #666; }

/* 分类导航 */
.category-bar { padding: 0 24rpx 12rpx; }
.category-scroll { white-space: nowrap; }
.category-inner { display: inline-flex; gap: 12rpx; padding: 16rpx 0; }
.category-tag { display: inline-flex; align-items: center; gap: 4rpx; padding: 12rpx 24rpx; border-radius: 40rpx; font-size: 24rpx; background: #fff; color: #666; border: 1rpx solid #E8E3DB; }
.cat-active { background: #C41E3A; color: #fff; border-color: #C41E3A; }
.cat-count { font-size: 20rpx; opacity: 0.7; }

/* 内容区 */
.content-area { padding: 0 24rpx 30rpx; display: flex; flex-direction: column; gap: 32rpx; }
.section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.section-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.section-more { display: flex; align-items: center; gap: 4rpx; }
.more-text { font-size: 24rpx; color: #C41E3A; }
.more-arrow { font-size: 28rpx; color: #C41E3A; }

/* 热门回放 */
.hot-list { display: flex; flex-direction: column; gap: 20rpx; }
.hot-card { background: #fff; border-radius: 24rpx; overflow: hidden; }
.hot-cover-wrap { position: relative; aspect-ratio: 16/9; }
.hot-cover { width: 100%; height: 100%; background: #E8E3DB; }
.hot-cover-gradient { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 50%, rgba(0,0,0,0.6) 100%); }
.hot-badge { position: absolute; top: 16rpx; left: 16rpx; display: flex; align-items: center; gap: 4rpx; background: #C41E3A; color: #fff; font-size: 20rpx; padding: 6rpx 16rpx; border-radius: 32rpx; }
.hot-rank { position: absolute; top: 16rpx; right: 16rpx; width: 48rpx; height: 48rpx; background: #C9A96E; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 24rpx; }
.hot-play-btn { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 56rpx; color: rgba(255,255,255,0.8); }
.hot-duration { position: absolute; bottom: 16rpx; right: 16rpx; background: rgba(0,0,0,0.5); color: #fff; font-size: 20rpx; padding: 6rpx 12rpx; border-radius: 8rpx; }
.hot-title { position: absolute; bottom: 16rpx; left: 16rpx; right: 120rpx; font-size: 26rpx; font-weight: 500; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hot-footer { display: flex; align-items: center; justify-content: space-between; padding: 16rpx; }
.hot-host { display: flex; align-items: center; gap: 8rpx; }
.hot-host-avatar { width: 48rpx; height: 48rpx; border-radius: 50%; background: #E8E3DB; }
.hot-host-name { font-size: 24rpx; color: #666; }
.hot-category { font-size: 20rpx; color: #999; padding: 2rpx 12rpx; background: #FAF8F5; border-radius: 8rpx; }
.hot-views { display: flex; align-items: center; gap: 4rpx; font-size: 22rpx; color: #999; }

/* 回放列表网格 */
.replay-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx; }
.replay-card { background: #fff; border-radius: 16rpx; overflow: hidden; }
.replay-card-cover-wrap { position: relative; aspect-ratio: 16/9; }
.replay-card-cover { width: 100%; height: 100%; background: #E8E3DB; }
.replay-card-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.4) 0%, transparent 100%); }
.replay-card-tag { position: absolute; top: 8rpx; left: 8rpx; display: flex; align-items: center; gap: 4rpx; background: rgba(0,0,0,0.5); color: #fff; font-size: 20rpx; padding: 4rpx 8rpx; border-radius: 6rpx; }
.replay-card-duration { position: absolute; bottom: 8rpx; right: 8rpx; background: rgba(0,0,0,0.5); color: #fff; font-size: 20rpx; padding: 4rpx 8rpx; border-radius: 6rpx; }
.replay-card-body { padding: 16rpx; }
.replay-card-title { display: block; font-size: 24rpx; font-weight: 500; color: #2C2C2C; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-height: 1.3; }
.replay-card-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 12rpx; }
.replay-card-host { display: flex; align-items: center; gap: 6rpx; }
.rc-host-avatar { width: 32rpx; height: 32rpx; border-radius: 50%; background: #E8E3DB; }
.rc-host-name { font-size: 20rpx; color: #999; }
.rc-views { font-size: 20rpx; color: #999; display: flex; align-items: center; gap: 2rpx; }

.load-more { text-align: center; padding: 24rpx; }
.load-more-text { font-size: 24rpx; color: #ccc; }
</style>
