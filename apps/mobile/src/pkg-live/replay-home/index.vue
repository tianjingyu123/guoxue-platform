<template>
  <view class="page">
    <!-- 顶部导航(红色渐变) -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-btn" @tap="goBack">
          <AppIcon name="chevron-left" :size="48" color="#fff" />
        </view>
        <text class="nav-title">直播回放</text>
        <view class="nav-btn" @tap="showSearch = true">
          <AppIcon name="search" :size="40" color="#fff" />
        </view>
      </view>
    </view>

    <view class="body">
      <!-- 加载骨架 -->
      <view v-if="loading" class="skeleton">
        <view v-for="i in 3" :key="i" class="sk-card" />
      </view>

      <!-- 错误状态 -->
      <view v-else-if="error" class="error-state">
        <text class="error-txt">{{ error }}</text>
        <view class="retry-btn" @tap="fetchData"><text class="retry-btn-txt">重新加载</text></view>
      </view>

      <template v-else>
      <!-- 分类横滚（后端回放无分类维度时隐藏，不做假分类） -->
      <scroll-view v-if="categories.length" class="cat-scroll" scroll-x :show-scrollbar="false">
        <view class="cat-row">
          <view
            v-for="cat in categories"
            :key="cat.id"
            class="cat-chip"
            :class="{ 'cat-chip-active': selectedCategory === cat.id }"
            @tap="toggleCategory(cat.id)"
          >
            <text class="cat-icon">{{ cat.icon }}</text>
            <text class="cat-name">{{ cat.name }}</text>
            <text class="cat-count">({{ cat.count }})</text>
          </view>
        </view>
      </scroll-view>

      <!-- 热门回放 -->
      <view v-if="!selectedCategory && hotReplays.length" class="section">
        <view class="section-head">
          <text class="section-title">热门回放</text>
          <view class="more-btn" @tap="goReplays">
            <text class="more-txt">更多</text>
            <AppIcon name="chevron-right" :size="32" color="#C41E3A" />
          </view>
        </view>
        <view class="hot-list">
          <view v-for="(item, idx) in hotReplays" :key="item.id" class="hot-card" @tap="openReplay(item)">
            <view class="hot-cover">
              <!-- plain：大卡自身已有居中播放按钮 + 卡底标题栏，兜底封面只出底纹不出文字，防撞按钮/重复标题 -->
              <smart-cover class="hot-img" :src="item.cover" :title="item.title" type="live" plain />
              <view class="hot-mask" />
              <view class="hot-tag">
                <text class="hot-tag-emoji">🔥</text>
                <text class="hot-tag-txt">热门</text>
              </view>
              <view class="hot-rank">{{ idx + 1 }}</view>
              <view class="hot-play">
                <AppIcon name="play" :size="56" color="#fff" />
              </view>
              <view class="hot-dur">
                <AppIcon name="clock" :size="24" color="#fff" />
                <text class="hot-dur-txt">{{ formatLiveDuration(item.duration) }}</text>
              </view>
              <text class="hot-title">{{ item.title }}</text>
            </view>
            <view class="hot-foot">
              <view class="hot-host">
                <smart-avatar :src="item.hostAvatar" :name="item.hostName" class="hot-avatar" />
                <text class="hot-host-name">{{ item.hostName }}</text>
                <text v-if="item.category" class="hot-cat">{{ item.category }}</text>
              </view>
              <view class="hot-views">
                <AppIcon name="eye" :size="32" color="#999" />
                <text class="hot-views-txt">{{ formatLiveViews(item.views) }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 回放列表 -->
      <view class="section">
        <view class="section-head">
          <text class="section-title">{{ listTitle }}</text>
        </view>
        <view v-if="filteredReplays.length" class="grid">
          <view v-for="item in filteredReplays" :key="item.id" class="grid-card" @tap="openReplay(item)">
            <view class="grid-cover">
              <smart-cover class="grid-img" :src="item.cover" :title="item.title" type="live" />
              <view class="grid-mask" />
              <view class="grid-replay-tag">
                <AppIcon name="play" :size="24" color="#fff" />
                <text class="grid-replay-txt">回放</text>
              </view>
              <view class="grid-dur">{{ formatLiveDuration(item.duration) }}</view>
            </view>
            <view class="grid-info">
              <text class="grid-title">{{ item.title }}</text>
              <view class="grid-meta">
                <view class="grid-host">
                  <smart-avatar :src="item.hostAvatar" :name="item.hostName" class="grid-avatar" />
                  <text class="grid-host-name">{{ item.hostName }}</text>
                </view>
                <view class="grid-views">
                  <AppIcon name="eye" :size="24" color="#bbb" />
                  <text class="grid-views-txt">{{ formatLiveViews(item.views) }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>
        <view v-else class="list-empty">
          <AppIcon name="play-circle" :size="64" color="#c8c0b5" />
          <text class="list-empty__txt">暂时还没有直播回放</text>
        </view>
      </view>

      <view v-if="replayList.length" class="load-more">
        <text class="load-more-txt">已显示当前回放</text>
      </view>
      </template>
    </view>

    <!-- 搜索覆盖层 -->
    <view v-if="showSearch" class="search-overlay">
      <view class="search-head">
        <view class="search-input-wrap">
          <AppIcon name="search" :size="32" color="#999" />
          <input
            v-model="searchQuery"
            class="search-input"
            placeholder="搜索回放..."
            placeholder-class="search-ph"
            :focus="true"
          />
          <view v-if="searchQuery" class="search-clear" @tap="searchQuery = ''">
            <AppIcon name="x" :size="32" color="#999" />
          </view>
        </view>
        <text class="search-cancel" @tap="closeSearch">取消</text>
      </view>
      <view class="search-body">
        <template v-if="!searchQuery.trim()">
          <text class="search-section-title">推荐搜索</text>
          <view class="hot-search-row">
            <text v-for="tag in hotSearches" :key="tag" class="hot-search-tag" @tap="searchQuery = tag">{{ tag }}</text>
          </view>
        </template>
        <template v-else>
          <text class="search-section-title">搜索结果（{{ searchResults.length }}）</text>
          <view v-if="searchResults.length" class="search-results">
            <view v-for="item in searchResults" :key="item.id" class="search-result" @tap="openReplay(item)">
              <smart-cover class="search-result__cover" :src="item.cover" :title="item.title" type="live" plain />
              <view class="search-result__info">
                <text class="search-result__title">{{ item.title }}</text>
                <text class="search-result__meta">{{ item.hostName || '主播' }} · {{ formatLiveViews(item.views) }}</text>
              </view>
              <AppIcon name="chevron-right" :size="30" color="#aaa" />
            </view>
          </view>
          <view v-else class="search-empty">
            <AppIcon name="search" :size="58" color="#c8c0b5" />
            <text class="search-empty__txt">没有找到相关回放，换个关键词试试</text>
          </view>
        </template>
        </view>
      </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import SmartCover from '@/components/common/smart-cover.vue'
import SmartAvatar from '@/components/common/smart-avatar.vue'
import { goBack, navigateTo } from '@/utils/router'
import {
  liveApi,
  formatLiveDuration,
  formatLiveViews,
  type ReplayHomeItem,
} from '@/lib/live-data'

const statusBarHeight = ref(20)

// 数据状态
const loading = ref(true)
const error = ref('')
const categories = ref<any[]>([])
const hotReplays = ref<ReplayHomeItem[]>([])
const replayList = ref<ReplayHomeItem[]>([])
const hotSearches = ref<string[]>([])
const selectedCategory = ref<string | null>(null)
const showSearch = ref(false)
const searchQuery = ref('')

const filteredReplays = computed(() => {
  if (selectedCategory.value && selectedCategory.value !== 'all') {
    const name = categories.value.find((c) => c.id === selectedCategory.value)?.name
    return replayList.value.filter((r) => r.category === name)
  }
  return replayList.value
})
const searchResults = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase()
  if (!keyword) return []
  const merged = new Map<string, ReplayHomeItem>()
  for (const item of [...hotReplays.value, ...replayList.value]) merged.set(item.id, item)
  return [...merged.values()].filter((item) =>
    [item.title, item.hostName, item.category].some((value) => String(value || '').toLowerCase().includes(keyword)),
  )
})


async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const data = await liveApi.getReplayHome()
    categories.value = data.categories
    hotReplays.value = data.hotItems
    replayList.value = data.list
    hotSearches.value = data.hotSearches
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

onMounted(() => { fetchData() })

const listTitle = computed(() => {
  if (selectedCategory.value && selectedCategory.value !== 'all') {
    return (categories.value.find((c) => c.id === selectedCategory.value)?.name || '') + '回放'
  }
  return '最新回放'
})

function toggleCategory(id: string) {
  selectedCategory.value = selectedCategory.value === id ? null : id
}
function closeSearch() {
  showSearch.value = false
  searchQuery.value = ''
}
function goReplays() { navigateTo('/pkg-live/replays/index') }
function openReplay(item: ReplayHomeItem) { navigateTo(`/pkg-live/replay-detail/index?id=${item.id}`) }
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #faf8f5;
}

/* 导航(红色渐变) */
.nav {
  position: sticky;
  top: 0;
  z-index: 20;
  background: linear-gradient(to right, var(--brand), #D4456A);
}
.nav-bar {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16rpx;
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
  font-weight: 600;
  color: #fff;
}

.body {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 40rpx;
}

/* 分类横滚 */
.cat-scroll {
  margin: 0 -32rpx;
  white-space: nowrap;
}
.cat-row {
  display: inline-flex;
  gap: 16rpx;
  padding: 0 32rpx 8rpx;
}
.cat-chip {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 28rpx;
  border-radius: 999rpx;
  background: #fff;
  border: 1rpx solid #e8e3db;
}
.cat-chip-active {
  background: var(--brand);
  border-color: var(--brand);
}
.cat-icon {
  font-size: 26rpx;
}
.cat-name {
  font-size: 26rpx;
  font-weight: 500;
  color: #666;
  white-space: nowrap;
}
.cat-count {
  font-size: 22rpx;
  color: #999;
  white-space: nowrap;
}
.cat-chip-active .cat-name,
.cat-chip-active .cat-count {
  color: #fff;
}

/* 区块 */
.section {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.more-btn {
  display: flex;
  align-items: center;
  gap: 4rpx;
}
.more-txt {
  font-size: 26rpx;
  color: var(--brand);
}
.filter-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.filter-txt {
  font-size: 26rpx;
  color: #999;
}

/* 热门回放大卡 */
.hot-list {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}
.hot-card {
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.hot-cover {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #e8e8e8;
}
.hot-img {
  width: 100%;
  height: 100%;
}
.hot-mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.6), transparent 50%);
}
.hot-tag {
  position: absolute;
  top: 24rpx;
  left: 24rpx;
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 6rpx 16rpx;
  background: var(--brand);
  border-radius: 999rpx;
}
.hot-tag-emoji {
  font-size: 20rpx;
}
.hot-tag-txt {
  font-size: 22rpx;
  color: #fff;
}
.hot-rank {
  position: absolute;
  top: 24rpx;
  right: 24rpx;
  width: 56rpx;
  height: 56rpx;
  background: #C9A96E;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 700;
}
.hot-play {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 112rpx;
  height: 112rpx;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.hot-dur {
  position: absolute;
  bottom: 24rpx;
  right: 24rpx;
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 6rpx 16rpx;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 8rpx;
}
.hot-dur-txt {
  font-size: 22rpx;
  color: #fff;
}
.hot-title {
  position: absolute;
  bottom: 24rpx;
  left: 24rpx;
  right: 160rpx;
  font-size: 28rpx;
  font-weight: 500;
  color: #fff;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.hot-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
}
.hot-host {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.hot-avatar {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #e8e8e8;
}
.hot-host-name {
  font-size: 26rpx;
  color: #555;
}
.hot-cat {
  font-size: 22rpx;
  color: #999;
  padding: 2rpx 12rpx;
  background: #f0f0f0;
  border-radius: 6rpx;
}
.hot-views {
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.hot-views-txt {
  font-size: 26rpx;
  color: #999;
}

/* 2列网格 */
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24rpx;
}
.grid-card {
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.grid-cover {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #e8e8e8;
}
.grid-img {
  width: 100%;
  height: 100%;
}
.grid-mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.4), transparent);
}
.grid-replay-tag {
  position: absolute;
  top: 16rpx;
  left: 16rpx;
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 2rpx 10rpx;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 6rpx;
}
.grid-replay-txt {
  font-size: 20rpx;
  color: #fff;
}
.grid-dur {
  position: absolute;
  bottom: 16rpx;
  right: 16rpx;
  padding: 2rpx 10rpx;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 6rpx;
  font-size: 20rpx;
  color: #fff;
}
.grid-info {
  padding: 20rpx;
}
.grid-title {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  font-size: 26rpx;
  font-weight: 500;
  color: #2c2c2c;
  line-height: 1.3;
}
.grid-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16rpx;
}
.grid-host {
  display: flex;
  align-items: center;
  gap: 12rpx;
  min-width: 0;
}
.grid-avatar {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: #e8e8e8;
  flex-shrink: 0;
}
.grid-host-name {
  font-size: 22rpx;
  color: #999;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.grid-views {
  display: flex;
  align-items: center;
  gap: 4rpx;
  flex-shrink: 0;
}
.grid-views-txt {
  font-size: 22rpx;
  color: #bbb;
}

.load-more {
  text-align: center;
  padding: 16rpx 0;
}
.load-more-txt {
  font-size: 26rpx;
  color: #999;
}

/* 搜索覆盖层 */
.search-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: #fff;
}
.search-head {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx 32rpx;
  border-bottom: 1rpx solid #e8e3db;
}
.search-input-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12rpx;
  background: #faf8f5;
  border-radius: 999rpx;
  padding: 16rpx 28rpx;
}
.search-input {
  flex: 1;
  font-size: 28rpx;
  color: #2c2c2c;
}
.search-ph {
  color: #999;
}
.search-clear {
  width: 32rpx;
  height: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.search-cancel {
  font-size: 28rpx;
  color: var(--brand);
}
.search-body {
  padding: 32rpx;
}
.search-section-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
  margin-bottom: 24rpx;
  display: block;
}
.hot-search-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.hot-search-tag {
  padding: 12rpx 24rpx;
  background: #faf8f5;
  border-radius: 999rpx;
  font-size: 28rpx;
  color: #666;
}

/* 骨架屏 */
.skeleton { display: flex; flex-direction: column; gap: 24rpx; }
.sk-card { height: 320rpx; border-radius: 24rpx; background: linear-gradient(90deg, #e8e4dc 25%, #f0ece5 50%, #e8e4dc 75%); animation: shimmer 1.5s infinite; background-size: 200% 100%; }
.search-results { display: flex; flex-direction: column; gap: 18rpx; }
.search-result { display: flex; align-items: center; gap: 20rpx; padding: 18rpx; background: #faf8f5; border-radius: 18rpx; }
.search-result__cover { width: 168rpx; height: 96rpx; border-radius: 12rpx; flex-shrink: 0; overflow: hidden; }
.search-result__info { flex: 1; min-width: 0; }
.search-result__title { display: block; font-size: 28rpx; font-weight: 600; color: #2c2c2c; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.search-result__meta { display: block; margin-top: 12rpx; font-size: 24rpx; color: #999; }
.search-empty, .list-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 24rpx;
  text-align: center;
}
.search-empty__txt, .list-empty__txt { margin-top: 20rpx; font-size: 26rpx; line-height: 1.6; color: #999; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* 错误状态 */
.error-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 160rpx 0; }
.error-txt { font-size: 28rpx; color: #999; margin-bottom: 32rpx; }
.retry-btn { padding: 16rpx 48rpx; background: var(--brand); border-radius: 999rpx; }
.retry-btn-txt { font-size: 28rpx; color: #fff; font-weight: 500; }
</style>
