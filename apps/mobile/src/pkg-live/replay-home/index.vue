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
      <!-- 分类横滚 -->
      <scroll-view class="cat-scroll" scroll-x :show-scrollbar="false">
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
      <view v-if="!selectedCategory" class="section">
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
              <image class="hot-img" :src="item.cover" mode="aspectFill" />
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
                <image class="hot-avatar" :src="item.hostAvatar" mode="aspectFill" />
                <text class="hot-host-name">{{ item.hostName }}</text>
                <text class="hot-cat">{{ item.category }}</text>
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
          <view class="filter-btn">
            <AppIcon name="filter" :size="32" color="#999" />
            <text class="filter-txt">筛选</text>
          </view>
        </view>
        <view class="grid">
          <view v-for="item in filteredReplays" :key="item.id" class="grid-card" @tap="openReplay(item)">
            <view class="grid-cover">
              <image class="grid-img" :src="item.cover" mode="aspectFill" />
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
                  <image class="grid-avatar" :src="item.hostAvatar" mode="aspectFill" />
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
      </view>

      <view class="load-more">
        <text class="load-more-txt">上拉加载更多</text>
      </view>
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
        <text class="search-section-title">热门搜索</text>
        <view class="hot-search-row">
          <text v-for="tag in hotSearches" :key="tag" class="hot-search-tag" @tap="searchQuery = tag">{{ tag }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import {
  replayCategories,
  replayHotItems,
  replayHomeList,
  replayHotSearches,
  formatLiveDuration,
  formatLiveViews,
  type ReplayHomeItem,
} from '@/lib/live-data'

const statusBarHeight = ref(20)

// UI 临时状态
const categories = ref(replayCategories)
const hotReplays = ref(replayHotItems)
const hotSearches = ref(replayHotSearches)
const selectedCategory = ref<string | null>(null)
const showSearch = ref(false)
const searchQuery = ref('')

const filteredReplays = computed(() => {
  if (selectedCategory.value && selectedCategory.value !== 'all') {
    const name = categories.value.find((c) => c.id === selectedCategory.value)?.name
    return replayHomeList.filter((r) => r.category === name)
  }
  return replayHomeList
})

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
function goReplays() {}
function openReplay(_item: ReplayHomeItem) {}
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
  background: linear-gradient(to right, #C41E3A, #D4456A);
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
  background: #C41E3A;
  border-color: #C41E3A;
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
  color: #C41E3A;
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
  background: #C41E3A;
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
  color: #C41E3A;
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
</style>
