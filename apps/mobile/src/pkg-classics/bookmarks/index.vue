<template>
  <view class="bm-page">
    <!-- 顶部导航 -->
    <view class="bm-header">
      <view class="bm-nav">
        <view class="bm-nav-left">
          <view
            class="bm-back"
            @tap="goBack"
          >
            <app-icon
              name="arrow-left"
              :size="40"
              color="#999999"
            />
          </view>
          <text class="bm-title">
            我的书签
          </text>
        </view>
        <view class="bm-nav-right">
          <template v-if="isSelectMode">
            <view
              class="bm-tbtn"
              @tap="exitSelect"
            >
              <text class="bm-tbtn-text">
                取消
              </text>
            </view>
            <view
              class="bm-tbtn bm-tbtn--danger"
              :class="{ 'bm-tbtn--disabled': selectedIds.size === 0 }"
              @tap="batchDelete"
            >
              <text class="bm-tbtn-text bm-tbtn-text--danger">
                删除 ({{ selectedIds.size }})
              </text>
            </view>
          </template>
          <view
            v-else
            class="bm-icon-btn"
            @tap="openManageMenu"
          >
            <app-icon
              name="more-vertical"
              :size="32"
              color="#999999"
            />
          </view>
        </view>
      </view>

      <!-- 搜索和视图切换 -->
      <view class="bm-toolbar">
        <view class="bm-search">
          <app-icon
            name="search"
            :size="28"
            color="#999999"
          />
          <input
            v-model="searchValue"
            class="bm-search-input"
            placeholder="搜索书签内容..."
            placeholder-class="bm-ph"
          >
        </view>
        <view class="bm-toggle">
          <view
            class="bm-toggle-btn"
            :class="{ 'bm-toggle-btn--active': viewMode === 'timeline' }"
            @tap="viewMode = 'timeline'"
          >
            <text
              class="bm-toggle-text"
              :class="{ 'bm-toggle-text--active': viewMode === 'timeline' }"
            >
              时间线
            </text>
          </view>
          <view
            class="bm-toggle-btn"
            :class="{ 'bm-toggle-btn--active': viewMode === 'book' }"
            @tap="viewMode = 'book'"
          >
            <text
              class="bm-toggle-text"
              :class="{ 'bm-toggle-text--active': viewMode === 'book' }"
            >
              按书籍
            </text>
          </view>
        </view>
      </view>
    </view>

    <!-- 列表 -->
    <view class="bm-body">
      <!-- 空状态 -->
      <view
        v-if="filtered.length === 0"
        class="bm-empty"
      >
        <view class="bm-empty-icon">
          <app-icon
            name="bookmark"
            :size="64"
            color="#999999"
          />
        </view>
        <text class="bm-empty-title">
          暂无书签
        </text>
        <text class="bm-empty-sub">
          阅读时长按文字可添加书签
        </text>
        <view
          class="bm-empty-btn"
          @tap="goHome"
        >
          <text class="bm-empty-btn-text">
            去阅读
          </text>
        </view>
      </view>

      <!-- 时间线视图 -->
      <view
        v-else-if="viewMode === 'timeline'"
        class="bm-list"
      >
        <view
          v-for="bm in filtered"
          :key="bm.id"
          class="bm-card"
          :class="[`bm-card--${bm.color}`, { 'bm-card--selected': selectedIds.has(bm.id) }]"
          @tap="isSelectMode && toggleSelect(bm.id)"
        >
          <view class="bm-card-main">
            <view class="bm-card-head">
              <text class="bm-card-book">
                《{{ bm.bookTitle }}》
              </text>
              <text class="bm-card-loc">
                {{ bm.chapter }} · 第{{ bm.page }}页
              </text>
            </view>
            <text class="bm-card-content">
              {{ bm.content }}
            </text>
            <view class="bm-card-time">
              <app-icon
                name="clock"
                :size="22"
                color="#999999"
              />
              <text class="bm-card-time-text">
                {{ bm.createdAt }}
              </text>
            </view>
          </view>
          <view
            v-if="!isSelectMode"
            class="bm-icon-btn bm-card-more"
            @tap.stop="openItemMenu(bm.id)"
          >
            <app-icon
              name="more-vertical"
              :size="32"
              color="#999999"
            />
          </view>
        </view>
      </view>

      <!-- 按书籍分组视图 -->
      <view
        v-else
        class="bm-groups"
      >
        <view
          v-for="group in grouped"
          :key="group.bookId"
          class="bm-group"
        >
          <view
            class="bm-group-head"
            @tap="goBook(group.bookId)"
          >
            <view class="bm-group-left">
              <view class="bm-group-cover">
                <text class="bm-group-cover-text">
                  {{ group.bookTitle.slice(0, 2) }}
                </text>
              </view>
              <view class="bm-group-info">
                <text class="bm-group-title">
                  《{{ group.bookTitle }}》
                </text>
                <text class="bm-group-author">
                  [{{ group.dynasty }}] {{ group.bookAuthor }}
                </text>
              </view>
            </view>
            <view class="bm-group-right">
              <text class="bm-group-count">
                {{ group.count }}个书签
              </text>
              <app-icon
                name="chevron-right"
                :size="28"
                color="#999999"
              />
            </view>
          </view>
          <view class="bm-group-items">
            <view
              v-for="bm in group.items"
              :key="bm.id"
              class="bm-subcard"
              :class="[`bm-card--${bm.color}`, { 'bm-card--selected': selectedIds.has(bm.id) }]"
              @tap="isSelectMode && toggleSelect(bm.id)"
            >
              <text class="bm-subcard-loc">
                {{ bm.chapter }} · 第{{ bm.page }}页
              </text>
              <text class="bm-subcard-content">
                {{ bm.content }}
              </text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { bookmarksData, type BookmarkItem } from '@/lib/classics-data'

const searchValue = ref('')
const selectedIds = ref<Set<string>>(new Set())
const isSelectMode = ref(false)
const bookmarks = ref<BookmarkItem[]>([...bookmarksData])
const viewMode = ref<'timeline' | 'book'>('timeline')

const filtered = computed(() =>
  bookmarks.value.filter(
    (bm) => bm.content.includes(searchValue.value) || bm.bookTitle.includes(searchValue.value) || bm.chapter.includes(searchValue.value),
  ),
)

const grouped = computed(() => {
  const groups: Record<string, BookmarkItem[]> = {}
  filtered.value.forEach((bm) => {
    if (!groups[bm.bookId]) groups[bm.bookId] = []
    groups[bm.bookId].push(bm)
  })
  return Object.entries(groups).map(([bookId, items]) => ({
    bookId,
    bookTitle: items[0].bookTitle,
    bookAuthor: items[0].bookAuthor,
    dynasty: items[0].dynasty,
    count: items.length,
    items,
  }))
})

function toggleSelect(id: string) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
}
function exitSelect() {
  isSelectMode.value = false
  selectedIds.value = new Set()
}
function batchDelete() {
  if (selectedIds.value.size === 0) return
  bookmarks.value = bookmarks.value.filter((bm) => !selectedIds.value.has(bm.id))
  exitSelect()
}
function deleteItem(id: string) {
  bookmarks.value = bookmarks.value.filter((bm) => bm.id !== id)
}
function openManageMenu() {
  uni.showActionSheet({
    itemList: ['批量管理'],
    success: () => {
      isSelectMode.value = true
    },
  })
}
function openItemMenu(id: string) {
  uni.showActionSheet({
    itemList: ['分享', '跳转阅读', '删除'],
    success: (res) => {
      if (res.tapIndex === 2) deleteItem(id)
    },
  })
}
function goBack() {
  uni.navigateBack({ delta: 1, fail: () => uni.navigateTo({ url: '/pkg-classics/home/index' }) })
}
function goBook(id: string) {
  uni.navigateTo({ url: `/pkg-classics/detail/index?id=${id}` })
}
function goHome() {
  uni.navigateTo({ url: '/pkg-classics/home/index' })
}
</script>

<style scoped lang="scss">
.bm-page {
  min-height: 100vh;
  background: var(--background);
  padding-bottom: 48rpx;
}
.bm-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--background);
  border-bottom: 1rpx solid rgba(232, 224, 213, 0.6);
}
.bm-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  height: 112rpx;
}
.bm-nav-left {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.bm-back {
  width: 64rpx;
  height: 64rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.bm-title {
  font-size: 32rpx;
  font-weight: 500;
  color: var(--foreground);
}
.bm-nav-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.bm-icon-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.bm-tbtn {
  height: 56rpx;
  padding: 0 20rpx;
  display: flex;
  align-items: center;
  border-radius: 12rpx;
}
.bm-tbtn--danger {
  background: #c41e3a;
}
.bm-tbtn--disabled {
  opacity: 0.5;
}
.bm-tbtn-text {
  font-size: 26rpx;
  color: var(--foreground);
}
.bm-tbtn-text--danger {
  color: #ffffff;
}
.bm-toolbar {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 0 32rpx 24rpx;
}
.bm-search {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16rpx;
  height: 72rpx;
  padding: 0 24rpx;
  border-radius: 999rpx;
  background: var(--secondary);
}
.bm-search-input {
  flex: 1;
  font-size: 28rpx;
  color: var(--foreground);
}
.bm-ph {
  color: #999999;
}
.bm-toggle {
  display: flex;
  background: var(--secondary);
  border-radius: 16rpx;
  padding: 4rpx;
}
.bm-toggle-btn {
  padding: 8rpx 24rpx;
  border-radius: 12rpx;
}
.bm-toggle-btn--active {
  background: var(--background);
  box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.06);
}
.bm-toggle-text {
  font-size: 24rpx;
  color: #999999;
}
.bm-toggle-text--active {
  color: var(--foreground);
}
.bm-body {
  padding: 32rpx;
}
.bm-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.bm-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24rpx;
  padding: 32rpx;
  border-radius: 24rpx;
  border-left-width: 8rpx;
  border-left-style: solid;
}
.bm-card--amber {
  background: #fef3c7;
  border-left-color: #fcd34d;
}
.bm-card--blue {
  background: #dbeafe;
  border-left-color: #93c5fd;
}
.bm-card--green {
  background: #dcfce7;
  border-left-color: #86efac;
}
.bm-card--purple {
  background: #f3e8ff;
  border-left-color: #d8b4fe;
}
.bm-card--selected {
  box-shadow: 0 0 0 4rpx #c41e3a;
}
.bm-card-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.bm-card-head {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
}
.bm-card-book {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.bm-card-loc {
  font-size: 24rpx;
  color: rgba(44, 44, 44, 0.55);
}
.bm-card-content {
  font-size: 28rpx;
  line-height: 1.6;
  color: #2c2c2c;
  margin-bottom: 16rpx;
  font-family: 'Noto Serif SC', serif;
}
.bm-card-time {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.bm-card-time-text {
  font-size: 22rpx;
  color: rgba(44, 44, 44, 0.55);
}
.bm-card-more {
  flex-shrink: 0;
}
.bm-groups {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}
.bm-group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  background: var(--secondary);
  border-radius: 16rpx;
  margin-bottom: 16rpx;
}
.bm-group-left {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.bm-group-cover {
  width: 64rpx;
  height: 88rpx;
  border-radius: 8rpx;
  background: linear-gradient(to bottom, #fef3c7, #fffbeb);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.06);
}
.bm-group-cover-text {
  writing-mode: vertical-rl;
  font-size: 22rpx;
  font-weight: 700;
  color: #92400e;
  font-family: 'Noto Serif SC', serif;
}
.bm-group-title {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--foreground);
}
.bm-group-author {
  font-size: 24rpx;
  color: #999999;
}
.bm-group-right {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.bm-group-count {
  font-size: 24rpx;
  color: #999999;
}
.bm-group-items {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding-left: 32rpx;
  border-left: 4rpx solid rgba(232, 224, 213, 0.6);
  margin-left: 32rpx;
}
.bm-subcard {
  padding: 24rpx;
  border-radius: 16rpx;
  border-left-width: 4rpx;
  border-left-style: solid;
}
.bm-subcard-loc {
  font-size: 22rpx;
  color: rgba(44, 44, 44, 0.55);
  margin-bottom: 8rpx;
  display: block;
}
.bm-subcard-content {
  font-size: 28rpx;
  color: #2c2c2c;
  font-family: 'Noto Serif SC', serif;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.bm-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 128rpx 0;
  text-align: center;
}
.bm-empty-icon {
  width: 160rpx;
  height: 160rpx;
  border-radius: 999rpx;
  background: var(--secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
}
.bm-empty-title {
  font-size: 30rpx;
  font-weight: 500;
  color: var(--foreground);
  margin-bottom: 8rpx;
}
.bm-empty-sub {
  font-size: 28rpx;
  color: #999999;
  margin-bottom: 32rpx;
}
.bm-empty-btn {
  height: 80rpx;
  padding: 0 48rpx;
  border-radius: 999rpx;
  border: 1rpx solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
}
.bm-empty-btn-text {
  font-size: 28rpx;
  color: var(--foreground);
}
</style>
