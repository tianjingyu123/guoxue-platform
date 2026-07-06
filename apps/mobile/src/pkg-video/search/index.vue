<template>
  <view class="video-search-page">
    <!-- 顶部搜索栏 -->
    <view class="vs-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="vs-header-row">
        <view class="vs-back" @tap="goBack">
          <AppIcon name="arrow-left" :size="36" color="#1A1A1A" />
        </view>
        <view class="vs-input-wrap">
          <AppIcon name="search" :size="28" color="#9CA3AF" />
          <input
            class="vs-input"
            type="text"
            placeholder="搜索视频"
            placeholder-class="vs-input-ph"
            v-model="query"
            :focus="true"
            confirm-type="search"
            @input="onInput"
            @confirm="doSearch(query)"
          />
          <view v-if="query" class="vs-clear" @tap="clearQuery">
            <AppIcon name="x" :size="28" color="#9CA3AF" />
          </view>
        </view>
        <text class="vs-search-btn" @tap="doSearch(query)">搜索</text>
      </view>
    </view>

    <view class="vs-body">
      <!-- 未搜索：历史 + 热门 -->
      <block v-if="!searched">
        <view v-if="history.length > 0" class="vs-section">
          <view class="vs-section-head">
            <text class="vs-section-title">搜索历史</text>
            <view class="vs-clear-history" @tap="clearHistory">
              <AppIcon name="x" :size="22" color="#9CA3AF" />
              <text class="vs-clear-txt">清空</text>
            </view>
          </view>
          <view class="vs-chips">
            <view
              v-for="h in history"
              :key="h"
              class="vs-chip"
              @tap="doSearch(h)"
            >
              <text class="vs-chip-txt">{{ h }}</text>
            </view>
          </view>
        </view>

        <view class="vs-section">
          <view class="vs-hot-head">
            <AppIcon name="trending-up" :size="28" color="#c41e3a" />
            <text class="vs-section-title">热门搜索</text>
          </view>
          <view class="vs-chips">
            <view
              v-for="(kw, i) in hotKeywords"
              :key="kw"
              class="vs-chip"
              :class="{ 'vs-chip-hot': i < 3 }"
              @tap="doSearch(kw)"
            >
              <text v-if="i < 3" class="vs-chip-rank">{{ i + 1 }}</text>
              <text class="vs-chip-txt" :class="{ 'vs-chip-txt-hot': i < 3 }">{{ kw }}</text>
            </view>
          </view>
        </view>
      </block>

      <!-- 已搜索：结果列表（三态） -->
      <block v-else>
        <view v-if="loading" class="vs-empty"><text class="vs-empty-txt">搜索中...</text></view>
        <view v-else-if="error" class="vs-empty">
          <text class="vs-empty-txt">{{ error }}</text>
          <view class="vs-retry" @tap="retry"><text class="vs-retry-txt">重试</text></view>
        </view>
        <template v-else>
        <text class="vs-result-count">找到 {{ results.length }} 个相关视频</text>
        <view v-if="results.length === 0" class="vs-empty">
          <text class="vs-empty-txt">未找到相关视频</text>
        </view>
        <view v-else class="vs-results">
          <view
            v-for="video in results"
            :key="video.id"
            class="vs-result"
            @tap="goDetail(video.id)"
          >
            <view class="vs-result-cover">
              <smart-cover class="vs-result-img" :src="video.cover" :title="video.title" type="video" />
              <text class="vs-result-dur">{{ video.duration }}</text>
              <view class="vs-result-play-wrap">
                <view class="vs-result-play">
                  <AppIcon name="play" :size="32" color="#ffffff" :fill="true" />
                </view>
              </view>
            </view>
            <view class="vs-result-info">
              <image lazy-load class="vs-result-avatar" :src="video.authorAvatar" mode="aspectFill" />
              <view class="vs-result-meta">
                <text class="vs-result-title">{{ video.title }}</text>
                <view class="vs-result-stats">
                  <text class="vs-stat">{{ video.author }}</text>
                  <view class="vs-stat-ic">
                    <AppIcon name="eye" :size="22" color="#9CA3AF" />
                    <text class="vs-stat">{{ (video.views / 1000).toFixed(1) }}k</text>
                  </view>
                  <view class="vs-stat-ic">
                    <AppIcon name="clock" :size="22" color="#9CA3AF" />
                    <text class="vs-stat">{{ video.publishedAt }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
        </template>
      </block>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import SmartCover from '@/components/common/smart-cover.vue'
import { navigateTo } from '@/utils/router'
import { videoApi, videoFallbackKeywords, fetchVideoHotKeywords, type VideoSearchResult } from '@/lib/video-data'

const statusBarHeight = ref(0)
uni.getSystemInfo({ success: (r) => { statusBarHeight.value = r.statusBarHeight || 0 } })

const HISTORY_KEY = 'video_search_history'
const query = ref('')
const searched = ref(false)
const loading = ref(false)
const error = ref('')
const results = ref<VideoSearchResult[]>([])
// 真连 /search/hot（全站真实热搜），失败/空回退视频语境引导词
const hotKeywords = ref<string[]>(videoFallbackKeywords)
onMounted(async () => { hotKeywords.value = await fetchVideoHotKeywords() })

// 搜索历史持久化（uni.storage）
const history = ref<string[]>((() => {
  try { return (uni.getStorageSync(HISTORY_KEY) as string[]) || [] } catch { return [] }
})())
function saveHistory() {
  try { uni.setStorageSync(HISTORY_KEY, history.value) } catch { /* ignore */ }
}

function onInput() {
  searched.value = false
}
function clearQuery() {
  query.value = ''
  searched.value = false
  results.value = []
}
// 真连搜索 GET /videos/search?keyword=（三态）
async function doSearch(q: string) {
  if (!q.trim()) return
  query.value = q
  searched.value = true
  loading.value = true
  error.value = ''
  try {
    results.value = await videoApi.search({ keyword: q.trim() })
  } catch (e) {
    error.value = (e as Error)?.message || '搜索失败，请重试'
    results.value = []
  } finally {
    loading.value = false
  }
  if (!history.value.includes(q)) {
    history.value = [q, ...history.value].slice(0, 10)
    saveHistory()
  }
}
function retry() { if (query.value) doSearch(query.value) }
function clearHistory() {
  history.value = []
  saveHistory()
}
function goBack() {
  uni.navigateBack({ fail: () => navigateTo('/videos') })
}
function goDetail(id: string) {
  // 原型跳 /videos/:id(549版未迁)，改跳已迁的 /video/:id(812版全屏播放，功能等价)
  navigateTo(`/video/${id}`)
}
</script>

<style scoped>
.video-search-page {
  min-height: 100vh;
  background-color: #FFFFFF;
}

/* 顶部搜索栏 */
.vs-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: #FFFFFF;
  border-bottom: 2rpx solid #F0F0F0;
}
.vs-header-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 0 32rpx;
  height: 96rpx;
}
.vs-back { flex-shrink: 0; }
.vs-input-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16rpx;
  height: 72rpx;
  padding: 0 24rpx;
  border-radius: 16rpx;
  background-color: #F3F4F6;
}
.vs-input { flex: 1; font-size: 28rpx; color: #1A1A1A; }
.vs-input-ph { color: #9CA3AF; }
.vs-clear { flex-shrink: 0; }
.vs-search-btn { font-size: 28rpx; font-weight: 500; color: var(--brand); flex-shrink: 0; }

.vs-body { padding: 32rpx 32rpx 160rpx; }

/* section */
.vs-section { margin-bottom: 48rpx; }
.vs-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.vs-hot-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 24rpx;
}
.vs-section-title { font-size: 28rpx; font-weight: 600; color: #1A1A1A; }
.vs-clear-history { display: flex; align-items: center; gap: 4rpx; }
.vs-clear-txt { font-size: 22rpx; color: #9CA3AF; }

.vs-chips { display: flex; flex-wrap: wrap; gap: 16rpx; }
.vs-chip {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  background-color: #F3F4F6;
}
.vs-chip-hot { background-color: rgba(196, 30, 58, 0.1); }
.vs-chip-rank { font-size: 26rpx; font-weight: 700; color: var(--brand); }
.vs-chip-txt { font-size: 28rpx; color: #1A1A1A; }
.vs-chip-txt-hot { color: var(--brand); font-weight: 500; }

/* 结果 */
.vs-result-count { display: block; font-size: 22rpx; color: #9CA3AF; margin-bottom: 32rpx; }
.vs-empty { text-align: center; padding: 128rpx 0; display: flex; flex-direction: column; align-items: center; gap: 24rpx; }
.vs-empty-txt { font-size: 28rpx; color: #9CA3AF; }
.vs-retry { padding: 14rpx 44rpx; background: var(--brand); border-radius: 999rpx; }
.vs-retry-txt { color: #fff; font-size: 26rpx; }

.vs-results { display: flex; flex-direction: column; gap: 32rpx; }
.vs-result-cover {
  position: relative;
  width: 100%;
  height: 352rpx;
  border-radius: 16rpx;
  overflow: hidden;
  margin-bottom: 16rpx;
}
.vs-result-img { width: 100%; height: 100%; background-color: #E5E5E5; }
.vs-result-dur {
  position: absolute;
  bottom: 16rpx;
  right: 16rpx;
  font-size: 22rpx;
  color: #ffffff;
  background-color: rgba(0, 0, 0, 0.7);
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}
.vs-result-play-wrap {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.vs-result-play {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}
.vs-result-info { display: flex; gap: 16rpx; }
.vs-result-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 4rpx;
  background-color: #E5E5E5;
}
.vs-result-meta { flex: 1; min-width: 0; }
.vs-result-title {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  font-size: 28rpx;
  font-weight: 500;
  color: #1A1A1A;
  margin-bottom: 8rpx;
}
.vs-result-stats { display: flex; align-items: center; gap: 16rpx; }
.vs-stat-ic { display: flex; align-items: center; gap: 4rpx; }
.vs-stat { font-size: 22rpx; color: #9CA3AF; }
</style>
