<template>
  <view class="cd-page">
    <!-- 顶部导航 -->
    <view class="cd-header">
      <view class="cd-nav">
        <view class="cd-btn" @tap="goBack">
          <app-icon name="arrow-left" :size="40" color="#2c2c2c" />
        </view>
        <view class="cd-nav-right">
          <view class="cd-btn">
            <app-icon name="share-2" :size="32" color="#2c2c2c" />
          </view>
          <view class="cd-btn">
            <app-icon name="more-vertical" :size="32" color="#2c2c2c" />
          </view>
        </view>
      </view>
    </view>

    <!-- 加载/错误态 -->
    <view v-if="loading" style="text-align:center;padding:128rpx 0;">
      <text style="color:var(--muted-foreground);font-size:28rpx;">加载中...</text>
    </view>
    <view v-else-if="error" style="text-align:center;padding:128rpx 0;">
      <text style="color:#c41e3a;font-size:28rpx;">{{ error }}</text>
      <view style="margin-top:24rpx;" @tap="fetchData(collectionId)">
        <text style="color:var(--muted-foreground);">重试</text>
      </view>
    </view>
    <template v-else-if="collection">
    <!-- 封面区域 -->
    <view class="cd-cover" :class="`cd-cover--${collection.cover}`">
      <view class="cd-cover-badge">
        <text class="cd-cover-badge-text">精选书单</text>
      </view>
      <text class="cd-cover-title">{{ collection.title }}</text>
      <text class="cd-cover-desc">{{ collection.description }}</text>
      <view class="cd-stats">
        <text class="cd-stat">{{ collection.curator }}</text>
        <text class="cd-stat">·</text>
        <text class="cd-stat">{{ collection.bookCount }}本</text>
        <text class="cd-stat">·</text>
        <text class="cd-stat">{{ fmtViews(collection.viewCount) }}</text>
      </view>
      <view class="cd-tags">
        <view v-for="(tag, i) in collection.tags" :key="i" class="cd-tag">
          <text class="cd-tag-text">{{ tag }}</text>
        </view>
      </view>
    </view>

    <!-- 书籍预览 -->
    <view class="cd-preview">
      <view class="cd-stack">
        <view
          v-for="(book, i) in collection.books.slice(0, 5)"
          :key="book.id"
          class="cd-stack-cover"
          :style="{ zIndex: 5 - i }"
        >
          <flat-cover :title="book.title" :cover-color="coverColorForBook(book.title)" title-size="20rpx" />
        </view>
        <view v-if="collection.books.length > 5" class="cd-stack-more">
          <text class="cd-stack-more-text">+{{ collection.books.length - 5 }}</text>
        </view>
      </view>

      <view class="cd-actions">
        <view class="cd-act-primary" @tap="startReading">
          <app-icon name="book-open" :size="32" color="#ffffff" />
          <text class="cd-act-primary-text">开始研读</text>
        </view>
      </view>
    </view>

    <!-- 书籍列表 -->
    <view class="cd-section">
      <view class="cd-section-head">
        <text class="cd-section-title">书单内容</text>
        <text class="cd-section-count">{{ collection.books.length }}本</text>
      </view>
      <view class="cd-books">
        <view v-for="(book, i) in collection.books" :key="book.id" class="cd-book" @tap="goDetail(book.id)">
          <view class="cd-book-num" :class="{ 'cd-book-num--top': i < 3 }">
            <text class="cd-book-num-text" :class="{ 'cd-book-num-text--top': i < 3 }">{{ i + 1 }}</text>
          </view>
          <view class="cd-book-cover">
            <flat-cover :title="book.title" :cover-color="coverColorForBook(book.title)" title-size="20rpx" />
            <view v-if="book.hasAI" class="cd-book-ai">
              <app-icon name="sparkles" :size="16" color="#ffffff" />
            </view>
          </view>
          <view class="cd-book-info">
            <view class="cd-book-titlerow">
              <text class="cd-book-title">{{ book.title }}</text>
              <view v-if="book.hasTranslation" class="cd-book-trans">
                <text class="cd-book-trans-text">译文</text>
              </view>
            </view>
            <text class="cd-book-author">[{{ book.dynasty }}] {{ book.author }}</text>
            <text class="cd-book-desc">{{ book.description }}</text>
          </view>
          <app-icon name="chevron-right" :size="32" color="#999999" />
        </view>
      </view>
    </view>

    <!-- 相关推荐 -->
    <view v-if="relatedCollections.length" class="cd-section cd-section--related">
      <text class="cd-section-title">相关书单</text>
      <scroll-view scroll-x class="cd-related" :show-scrollbar="false">
        <view class="cd-related-row">
          <view
            v-for="col in relatedCollections"
            :key="col.id"
            class="cd-related-card"
            @tap="goCollection(col.id)"
          >
            <view class="cd-related-head" :class="`cd-cover--${col.cover}`">
              <text class="cd-related-title">{{ col.title }}</text>
              <text class="cd-related-desc">{{ col.description }}</text>
            </view>
            <view class="cd-related-foot">
              <text class="cd-related-count">{{ col.bookCount }}本</text>
              <app-icon name="chevron-right" :size="24" color="#999999" />
            </view>
          </view>
        </view>
      </scroll-view>
    </view>
      </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import FlatCover from '@/components/classics/flat-cover.vue'
import { coverColorForBook } from '@/lib/classics-cover'
import { classicsApi, type CollectionDetail } from '@/lib/classics-data'

const collectionId = ref('1')
const isAddedToShelf = ref(false)
const collection = ref<CollectionDetail | null>(null)
const relatedCollections = ref<CollectionDetail[]>([])
const loading = ref(true)
const error = ref('')

async function fetchData(id: string) {
  loading.value = true
  error.value = ''
  try {
    const detail = await classicsApi.collectionDetail(id)
    collection.value = detail
    // related not directly available from API, use empty for now
    relatedCollections.value = []
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function fmtViews(value: number) {
  return value >= 10000 ? `${(value / 10000).toFixed(1)}万人看过` : `${value}人看过`
}

onLoad((options) => {
  // 缺少书单 ID（默认 '1' 为 mock 残留）：显式落错误态，避免空内容白屏
  if (!options?.id || options.id === '1') {
    loading.value = false
    error.value = '书单不存在'
    return
  }
  collectionId.value = options.id
  fetchData(collectionId.value)
})

function goBack() {
  uni.navigateBack({ delta: 1, fail: () => uni.navigateTo({ url: '/pkg-classics/home/index' }) })
}
function goDetail(id: string) {
  uni.navigateTo({ url: `/pkg-classics/detail/index?id=${id}` })
}
function goCollection(id: string) {
  uni.navigateTo({ url: `/pkg-classics/collection/index?id=${id}` })
}
function startReading() {
  const first = collection.value?.books?.[0]
  if (first) uni.navigateTo({ url: `/pkg-classics/reader/index?bookId=${first.id}` })
  else uni.showToast({ title: '本书单暂无书目', icon: 'none' })
}
</script>

<style scoped lang="scss">
.cd-page {
  min-height: 100vh;
  background: var(--background);
  padding-bottom: 48rpx;
}
.cd-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(250, 248, 245, 0.8);
  backdrop-filter: blur(8rpx);
}
.cd-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  height: 112rpx;
}
.cd-nav-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.cd-btn {
  width: 72rpx;
  height: 72rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}
.cd-cover {
  margin: 0 32rpx;
  border-radius: 32rpx;
  padding: 48rpx;
  display: flex;
  flex-direction: column;
}
.cd-cover--amber {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
}
.cd-cover--purple {
  background: linear-gradient(135deg, #f3e8ff, #e9d5ff);
}
.cd-cover-badge {
  align-self: flex-start;
  padding: 6rpx 16rpx;
  border-radius: 12rpx;
  background: rgba(255, 255, 255, 0.6);
  margin-bottom: 24rpx;
}
.cd-cover-badge-text {
  font-size: 20rpx;
  color: #2c2c2c;
}
.cd-cover-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #2c2c2c;
  margin-bottom: 16rpx;
}
.cd-cover-desc {
  font-size: 28rpx;
  line-height: 1.6;
  color: rgba(44, 44, 44, 0.65);
  margin-bottom: 32rpx;
}
.cd-stats {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 32rpx;
}
.cd-stat {
  font-size: 24rpx;
  color: rgba(44, 44, 44, 0.6);
}
.cd-tags {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.cd-tag {
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
  border: 1rpx solid rgba(44, 44, 44, 0.2);
  background: rgba(255, 255, 255, 0.5);
}
.cd-tag-text {
  font-size: 20rpx;
  color: #2c2c2c;
}
.cd-preview {
  padding: 32rpx;
  margin-top: -32rpx;
}
.cd-stack {
  display: flex;
  margin-bottom: 32rpx;
}
/* 堆叠书封：flat-cover 仿真书（只给宽度，高度由组件内部 3:4 撑出） */
.cd-stack-cover {
  width: 80rpx;
  border-radius: 12rpx;
  border: 4rpx solid var(--card);
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.12);
  margin-left: -16rpx;
}
.cd-stack-cover:first-child {
  margin-left: 0;
}
.cd-stack-more {
  width: 80rpx;
  /* 高度随 flex 行 stretch 与书封等高（X5 兼容） */
  border-radius: 6rpx;
  background: var(--secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 4rpx solid var(--card);
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.12);
  margin-left: -16rpx;
}
.cd-stack-more-text {
  font-size: 24rpx;
  color: #999999;
}
.cd-actions {
  display: flex;
  gap: 24rpx;
}
.cd-act-primary {
  flex: 1;
  height: 80rpx;
  border-radius: 999rpx;
  background: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
}
.cd-act-primary--added {
  background: var(--secondary);
}
.cd-act-primary-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #ffffff;
}
.cd-act-primary-text--added {
  color: #2c2c2c;
}
.cd-act-outline {
  flex: 1;
  height: 80rpx;
  border-radius: 999rpx;
  border: 1rpx solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}
.cd-act-outline-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.cd-section {
  padding: 8rpx 32rpx 0;
}
.cd-section--related {
  padding-top: 48rpx;
}
.cd-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32rpx;
}
.cd-section-title {
  font-size: 32rpx;
  font-weight: 500;
  color: var(--foreground);
}
.cd-section-count {
  font-size: 24rpx;
  color: #999999;
}
.cd-books {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.cd-book {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx;
  background: var(--card);
  border-radius: 24rpx;
  border: 1rpx solid var(--border);
}
.cd-book-num {
  width: 48rpx;
  height: 48rpx;
  border-radius: 999rpx;
  background: var(--secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.cd-book-num--top {
  background: #c9a96e;
}
.cd-book-num-text {
  font-size: 24rpx;
  font-weight: 500;
  color: #999999;
}
.cd-book-num-text--top {
  color: #ffffff;
}
/* 书目行书封：flat-cover 仿真书（只给宽度，高度由组件内部 3:4 撑出） */
.cd-book-cover {
  width: 80rpx;
  position: relative;
  flex-shrink: 0;
}
.cd-book-ai {
  position: absolute;
  top: 4rpx;
  right: 4rpx;
  width: 24rpx;
  height: 24rpx;
  border-radius: 999rpx;
  background: #a855f7;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cd-book-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.cd-book-titlerow {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 4rpx;
}
.cd-book-title {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--foreground);
}
.cd-book-trans {
  padding: 0 8rpx;
  height: 32rpx;
  border-radius: 6rpx;
  background: #fef3c7;
  display: flex;
  align-items: center;
}
.cd-book-trans-text {
  font-size: 18rpx;
  color: #b45309;
}
.cd-book-author {
  font-size: 24rpx;
  color: #999999;
}
.cd-book-desc {
  font-size: 24rpx;
  color: rgba(153, 153, 153, 0.7);
  margin-top: 4rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cd-related {
  width: 100%;
  white-space: nowrap;
}
.cd-related-row {
  display: inline-flex;
  gap: 24rpx;
}
.cd-related-card {
  width: 384rpx;
  border-radius: 24rpx;
  border: 1rpx solid var(--border);
  overflow: hidden;
  background: var(--card);
}
.cd-related-head {
  height: 160rpx;
  padding: 24rpx;
  display: flex;
  flex-direction: column;
}
.cd-related-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.cd-related-desc {
  font-size: 20rpx;
  color: rgba(44, 44, 44, 0.6);
  margin-top: 4rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cd-related-foot {
  padding: 16rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.cd-related-count {
  font-size: 20rpx;
  color: #999999;
}
</style>
