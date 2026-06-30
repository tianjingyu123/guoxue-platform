<template>
  <view class="page">
    <!-- Header -->
    <view class="hd">
      <view class="hd-bar">
        <view class="icon-btn" @tap="goBack"><AppIcon name="arrow-left" :size="40" :color="C.text" /></view>
        <text class="hd-title">书签管理</text>
        <text class="hd-count">{{ items.length }} 个</text>
      </view>
      <view class="hd-search">
        <view class="search-box">
          <AppIcon name="search" :size="32" :color="C.slate400" class="search-icon" />
          <input v-model="search" class="search-input" placeholder="搜索书签..." placeholder-class="ph" />
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="body">
      <!-- 未登录态 -->
      <view v-if="notLoggedIn" class="empty">
        <AppIcon name="bookmark" :size="96" :color="C.slate200" />
        <text class="empty-title">登录后查看书签</text>
        <text class="empty-sub">登录即可同步你的阅读书签</text>
        <view class="empty-btn" @tap="goLogin"><text class="empty-btn-tx">去登录</text></view>
      </view>
      <!-- 加载态 -->
      <view v-else-if="loading" class="empty">
        <text class="empty-title">加载中...</text>
      </view>
      <!-- 错误态 -->
      <view v-else-if="error" class="empty">
        <text class="empty-title">{{ error }}</text>
        <text class="empty-sub" @tap="fetchData()" style="text-decoration:underline">点击重试</text>
      </view>
      <!-- 空状态 -->
      <view v-else-if="groupedKeys.length === 0" class="empty">
        <AppIcon name="bookmark" :size="96" :color="C.slate200" />
        <text class="empty-title">暂无书签</text>
        <text class="empty-sub">在阅读时点击书签按钮保存位置</text>
        <view class="empty-btn" @tap="goShelf"><text class="empty-btn-tx">去阅读</text></view>
      </view>

      <!-- 按书分组 -->
      <view v-for="g in grouped" :key="g.bookId" class="group">
        <view class="book-hd">
          <view class="book-cover" :style="{ background: g.book.bookCoverColor }">
            <view class="cover-spine" />
          </view>
          <view class="book-meta">
            <text class="book-title">{{ g.book.bookTitle }}</text>
            <text class="book-sub">{{ g.list.length }} 个书签</text>
          </view>
          <view class="continue" @tap="goReader(g.bookId)">
            <text class="continue-tx">继续读</text>
            <AppIcon name="chevron-right" :size="28" :color="C.primary" />
          </view>
        </view>

        <view class="card">
          <view v-for="(bm, idx) in g.list" :key="bm.id" class="bm-item" :class="{ 'no-border': idx === 0 }" @tap="goReaderChapter(bm)">
            <AppIcon name="bookmark" :size="32" :color="C.primary" class="bm-icon" />
            <view class="bm-body">
              <text class="bm-chapter">{{ bm.chapterTitle }} · 第{{ bm.pageNum }}页</text>
              <text class="bm-text">{{ bm.text }}</text>
              <text class="bm-time">{{ bm.createdAt }}</text>
            </view>
            <view class="del-btn" @tap.stop="del(bm.id)"><AppIcon name="trash-2" :size="28" :color="C.slate400" /></view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { ebookApi, type EbookBookmark } from '@/lib/ebook-data'
import { getToken } from '@/utils/storage'

const C = {
  text: '#1e293b', primary: '#2563eb', slate400: '#94a3b8', slate200: '#e2e8f0',
}

const loading = ref(true)
const error = ref('')
const notLoggedIn = ref(false)
const search = ref('')
const items = ref<EbookBookmark[]>([])
const deletingId = ref('')

async function fetchData() {
  if (!getToken()) { notLoggedIn.value = true; loading.value = false; return }
  notLoggedIn.value = false
  loading.value = true
  error.value = ''
  try {
    items.value = await ebookApi.bookmarks()
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onLoad(() => { fetchData() })

const filtered = computed(() =>
  items.value.filter(
    (b) => !search.value || b.bookTitle.includes(search.value) || b.text.includes(search.value) || b.chapterTitle.includes(search.value),
  ),
)
const grouped = computed(() => {
  const map: Record<string, EbookBookmark[]> = {}
  filtered.value.forEach((b) => {
    if (!map[b.bookId]) map[b.bookId] = []
    map[b.bookId].push(b)
  })
  return Object.keys(map).map((bookId) => ({ bookId, book: map[bookId][0], list: map[bookId] }))
})
const groupedKeys = computed(() => grouped.value.map((g) => g.bookId))

async function del(id: string) {
  if (deletingId.value) return
  deletingId.value = id
  try {
    await ebookApi.removeBookmark(id)
    items.value = items.value.filter((b) => b.id !== id)
    uni.showToast({ title: '已删除', icon: 'none' })
  } catch (e: any) {
    uni.showToast({ title: e?.message || '删除失败', icon: 'none' })
  } finally {
    deletingId.value = ''
  }
}
function goLogin() {
  uni.navigateTo({ url: '/pkg-auth/login/index' })
}
function goBack() {
  uni.navigateBack()
}
function goShelf() {
  uni.navigateTo({ url: '/pkg-ebook/bookshelf/index' })
}
function goReader(bookId: string) {
  uni.navigateTo({ url: `/pkg-ebook/reader/index?id=${bookId}` })
}
function goReaderChapter(bm: EbookBookmark) {
  uni.navigateTo({ url: `/pkg-ebook/reader/index?id=${bm.bookId}&chapter=${bm.chapterId}` })
}
</script>

<style scoped lang="scss">
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--ebook-bg);
}
.hd {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(255, 255, 255, 0.95);
  border-bottom: 2rpx solid var(--ebook-border);
}
.hd-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  height: 112rpx;
}
.icon-btn {
  padding: 12rpx;
  margin-left: -12rpx;
  border-radius: 16rpx;
}
.hd-title {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--ebook-text);
}
.hd-count {
  font-size: 24rpx;
  color: var(--ebook-text-soft);
}
.hd-search {
  padding: 0 32rpx 24rpx;
}
.search-box {
  position: relative;
  display: flex;
  align-items: center;
}
.search-icon {
  position: absolute;
  left: 24rpx;
  z-index: 1;
}
.search-input {
  width: 100%;
  height: 72rpx;
  padding: 0 32rpx 0 72rpx;
  background: #f1f5f9;
  border-radius: 999rpx;
  font-size: 28rpx;
  color: var(--ebook-text);
  box-sizing: border-box;
}
.ph {
  color: #94a3b8;
}
.body {
  flex: 1;
  padding: 24rpx 32rpx 64rpx;
  box-sizing: border-box;
}
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 128rpx 0;
}
.empty-title {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--ebook-text-soft);
  margin: 24rpx 0 8rpx;
}
.empty-sub {
  font-size: 26rpx;
  color: #94a3b8;
  margin-bottom: 32rpx;
}
.empty-btn {
  padding: 18rpx 48rpx;
  background: var(--ebook-primary);
  border-radius: 16rpx;
}
.empty-btn-tx {
  color: #fff;
  font-size: 28rpx;
  font-weight: 500;
}
.group {
  margin-bottom: 40rpx;
}
.book-hd {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-bottom: 16rpx;
}
.book-cover {
  width: 64rpx;
  height: 92rpx;
  border-radius: 8rpx;
  box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
}
.cover-spine {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4rpx;
  background: rgba(255, 255, 255, 0.2);
}
.book-meta {
  flex: 1;
  min-width: 0;
}
.book-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: var(--ebook-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.book-sub {
  font-size: 24rpx;
  color: var(--ebook-text-soft);
}
.continue {
  display: flex;
  align-items: center;
  gap: 2rpx;
}
.continue-tx {
  font-size: 24rpx;
  color: var(--ebook-primary);
}
.card {
  background: #fff;
  border-radius: 24rpx;
  border: 2rpx solid var(--ebook-border);
  overflow: hidden;
}
.bm-item {
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
  padding: 28rpx 32rpx;
  border-top: 2rpx solid var(--ebook-border);
}
.bm-item.no-border {
  border-top: none;
}
.bm-icon {
  flex-shrink: 0;
  margin-top: 4rpx;
}
.bm-body {
  flex: 1;
  min-width: 0;
}
.bm-chapter {
  display: block;
  font-size: 24rpx;
  color: var(--ebook-text-soft);
  margin-bottom: 8rpx;
}
.bm-text {
  display: block;
  font-size: 28rpx;
  color: var(--ebook-text);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.bm-time {
  display: block;
  font-size: 20rpx;
  color: #94a3b8;
  margin-top: 8rpx;
}
.del-btn {
  padding: 8rpx;
  flex-shrink: 0;
}
</style>
