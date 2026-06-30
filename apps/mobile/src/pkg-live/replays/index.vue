<template>
  <view class="page">
    <!-- 头部 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-btn" @tap="goBack">
          <AppIcon name="chevron-left" :size="44" color="#2c2c2c" />
        </view>
        <text class="nav-title">直播回放</text>
        <view class="nav-btn" @tap="onSearch">
          <AppIcon name="search" :size="40" color="#2c2c2c" />
        </view>
      </view>
    </view>

    <!-- 排序栏 -->
    <view class="sort-bar">
      <text class="sort-count">全部回放 {{ replays.length }} 个</text>
      <view class="sort-trigger" @tap="showSort = true">
        <AppIcon name="sliders-horizontal" :size="28" color="#666" />
        <text class="sort-label">{{ currentSortLabel }}</text>
      </view>
    </view>

    <!-- 加载骨架 -->
    <view v-if="loading" class="skeleton">
      <view v-for="i in 3" :key="i" class="sk-card" />
    </view>

    <!-- 错误状态 -->
    <view v-else-if="error" class="error-state">
      <text class="error-txt">{{ error }}</text>
      <view class="retry-btn" @tap="fetchData"><text class="retry-btn-txt">重新加载</text></view>
    </view>

    <!-- 回放列表(单列横向卡) -->
    <view v-else class="list">
      <view v-for="item in replays" :key="item.id" class="card" @tap="openReplay(item)">
        <view class="card-inner">
          <!-- 封面 -->
          <view class="cover">
            <image lazy-load class="cover-img" :src="item.cover" mode="aspectFill" />
            <view class="replay-tag">
              <AppIcon name="play" :size="20" color="#fff" />
              <text class="replay-txt">回放</text>
            </view>
            <view class="dur-tag">{{ formatLiveDuration(item.duration) }}</view>
          </view>
          <!-- 信息 -->
          <view class="info">
            <text class="title">{{ item.title }}</text>
            <view class="info-bottom">
              <view class="host-row">
                <image lazy-load class="host-avatar" :src="item.hostAvatar" mode="aspectFill" />
                <text class="host-name">{{ item.hostName }}</text>
                <text class="cat-tag">{{ item.category }}</text>
              </view>
              <view class="data-row">
                <view class="data-views">
                  <AppIcon name="eye" :size="24" color="#999" />
                  <text class="data-txt">{{ formatLiveViews(item.viewers) }}次播放</text>
                </view>
                <text class="data-date">{{ item.dateText }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
      <text class="list-end">已显示全部回放</text>
    </view>

    <!-- 排序弹层 -->
    <view v-if="showSort" class="sheet-mask" @tap="showSort = false">
      <view class="sheet" @tap.stop>
        <view class="sheet-header">
          <text class="sheet-title">排序方式</text>
          <view class="sheet-close" @tap="showSort = false">
            <AppIcon name="x" :size="36" color="#999" />
          </view>
        </view>
        <view class="sheet-options">
          <view
            v-for="opt in replaySortOptions"
            :key="opt.value"
            class="sheet-item"
            :class="{ 'sheet-item-active': sortBy === opt.value }"
            @tap="selectSort(opt.value)"
          >
            <text class="sheet-item-label">{{ opt.label }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { liveApi, replaySortOptions, formatLiveDuration, formatLiveViews } from '@/lib/live-data'

const statusBarHeight = ref(20)

// 数据状态
const loading = ref(true)
const error = ref('')
const replays = ref<any[]>([])
const sortBy = ref<string>('latest')
const showSort = ref(false)

const currentSortLabel = computed(
  () => replaySortOptions.find((o) => o.value === sortBy.value)?.label || '最新发布',
)

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    replays.value = await liveApi.getReplays(sortBy.value)
  } catch (e: any) {
    error.value = e?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

function selectSort(v: string) {
  sortBy.value = v
  showSort.value = false
  fetchData()
}

onMounted(() => { fetchData() })

function onSearch() {}
function openReplay(_item: { id: string }) {}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 40rpx;
}

/* 头部 */
.nav {
  position: sticky;
  top: 0;
  z-index: 20;
  background: #fff;
  border-bottom: 1rpx solid #f0f0f0;
}
.nav-bar {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16rpx;
}
.nav-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #2c2c2c;
}

/* 排序栏 */
.sort-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 24rpx;
}
.sort-count {
  font-size: 26rpx;
  color: #666;
}
.sort-trigger {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 10rpx 20rpx;
  background: #fff;
  border-radius: 999rpx;
}
.sort-label {
  font-size: 26rpx;
  color: #666;
  white-space: nowrap;
}

/* 单列横向卡列表 */
.list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  padding: 0 24rpx;
}
.card {
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.card-inner {
  display: flex;
  gap: 24rpx;
  padding: 24rpx;
}
/* 封面 144x80 */
.cover {
  position: relative;
  width: 288rpx;
  height: 160rpx;
  flex-shrink: 0;
  border-radius: 16rpx;
  overflow: hidden;
  background: #f0f0f0;
}
.cover-img {
  width: 100%;
  height: 100%;
}
.replay-tag {
  position: absolute;
  top: 12rpx;
  left: 12rpx;
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 2rpx 10rpx;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 6rpx;
}
.replay-txt {
  font-size: 20rpx;
  color: #fff;
}
.dur-tag {
  position: absolute;
  right: 12rpx;
  bottom: 12rpx;
  padding: 2rpx 10rpx;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 6rpx;
  font-size: 20rpx;
  color: #fff;
}
/* 信息区 */
.info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 4rpx 0;
}
.title {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
  line-height: 1.375;
}
.info-bottom {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.host-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.host-avatar {
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  background: #e8e8e8;
  flex-shrink: 0;
}
.host-name {
  font-size: 24rpx;
  color: #666;
  flex-shrink: 0;
}
.cat-tag {
  padding: 2rpx 12rpx;
  background: #f5f5f5;
  color: #999;
  font-size: 20rpx;
  border-radius: 6rpx;
  white-space: nowrap;
}
.data-row {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.data-views {
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.data-txt {
  font-size: 24rpx;
  color: #999;
}
.data-date {
  font-size: 24rpx;
  color: #999;
}
.list-end {
  display: block;
  text-align: center;
  font-size: 22rpx;
  color: #ccc;
  padding: 16rpx 0;
}

/* 骨架屏 */
.skeleton { display: flex; flex-direction: column; gap: 24rpx; padding: 0 24rpx; }
.sk-card { height: 208rpx; border-radius: 24rpx; background: linear-gradient(90deg, #e8e4dc 25%, #f0ece5 50%, #e8e4dc 75%); animation: shimmer 1.5s infinite; background-size: 200% 100%; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* 错误状态 */
.error-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 160rpx 0; }
.error-txt { font-size: 28rpx; color: #999; margin-bottom: 32rpx; }
.retry-btn { padding: 16rpx 48rpx; background: var(--brand); border-radius: 999rpx; }
.retry-btn-txt { font-size: 28rpx; color: #fff; font-weight: 500; }

/* 排序弹层 */
.sheet-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 100;
  display: flex;
  align-items: flex-end;
}
.sheet {
  width: 100%;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 24rpx 32rpx calc(40rpx + env(safe-area-inset-bottom));
}
.sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}
.sheet-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.sheet-close {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sheet-options {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.sheet-item {
  width: 100%;
  padding: 24rpx 0;
  border-radius: 16rpx;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sheet-item-label {
  font-size: 28rpx;
  color: #666;
}
.sheet-item-active {
  background: rgba(196, 30, 58, 0.1);
}
.sheet-item-active .sheet-item-label {
  color: var(--brand);
  font-weight: 500;
}
</style>
