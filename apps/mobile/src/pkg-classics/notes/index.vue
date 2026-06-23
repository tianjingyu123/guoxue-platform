<template>
  <view class="nt-page">
    <!-- 顶部导航 -->
    <view class="nt-header">
      <view class="nt-nav">
        <view class="nt-nav-left">
          <view class="nt-back" @tap="goBack">
            <app-icon name="arrow-left" :size="40" color="#999999" />
          </view>
          <text class="nt-title">我的笔记</text>
        </view>
        <view class="nt-nav-right">
          <template v-if="isSelectMode">
            <view class="nt-tbtn" @tap="exitSelect">
              <text class="nt-tbtn-text">取消</text>
            </view>
            <view class="nt-tbtn nt-tbtn--danger" :class="{ 'nt-tbtn--disabled': selectedIds.size === 0 }" @tap="batchDelete">
              <text class="nt-tbtn-text nt-tbtn-text--danger">删除 ({{ selectedIds.size }})</text>
            </view>
          </template>
          <view v-else class="nt-icon-btn" @tap="openManageMenu">
            <app-icon name="more-vertical" :size="32" color="#999999" />
          </view>
        </view>
      </view>

      <!-- 搜索和视图切换 -->
      <view class="nt-toolbar">
        <view class="nt-search">
          <app-icon name="search" :size="28" color="#999999" />
          <input v-model="searchValue" class="nt-search-input" placeholder="搜索笔记内容..." placeholder-class="nt-ph" />
        </view>
        <view class="nt-toggle">
          <view class="nt-toggle-btn" :class="{ 'nt-toggle-btn--active': viewMode === 'timeline' }" @tap="viewMode = 'timeline'">
            <text class="nt-toggle-text" :class="{ 'nt-toggle-text--active': viewMode === 'timeline' }">时间线</text>
          </view>
          <view class="nt-toggle-btn" :class="{ 'nt-toggle-btn--active': viewMode === 'book' }" @tap="viewMode = 'book'">
            <text class="nt-toggle-text" :class="{ 'nt-toggle-text--active': viewMode === 'book' }">按书籍</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 列表 -->
    <view class="nt-body">
      <!-- 加载态 -->
      <view v-if="loading" class="nt-empty">
        <text class="nt-empty-title">加载中...</text>
      </view>
      <!-- 错误态 -->
      <view v-else-if="error" class="nt-empty">
        <text class="nt-empty-title">{{ error }}</text>
        <view class="nt-empty-btn" @tap="fetchData">
          <text class="nt-empty-btn-text">重试</text>
        </view>
      </view>
      <!-- 空状态 -->
      <view v-else-if="filtered.length === 0" class="nt-empty">
        <view class="nt-empty-icon">
          <app-icon name="file-text" :size="64" color="#999999" />
        </view>
        <text class="nt-empty-title">暂无笔记</text>
        <text class="nt-empty-sub">阅读时选中文字可添加笔记</text>
        <view class="nt-empty-btn" @tap="goHome">
          <text class="nt-empty-btn-text">去阅读</text>
        </view>
      </view>

      <!-- 时间线视图 -->
      <view v-else-if="viewMode === 'timeline'" class="nt-list">
        <view
          v-for="note in filtered"
          :key="note.id"
          class="nt-card"
          :class="{ 'nt-card--selected': selectedIds.has(note.id) }"
          @tap="isSelectMode && toggleSelect(note.id)"
        >
          <view class="nt-card-head">
            <view class="nt-card-book">
              <text class="nt-card-book-title">《{{ note.bookTitle }}》</text>
              <text class="nt-card-loc">{{ note.chapter }} · 第{{ note.page }}页</text>
            </view>
            <view v-if="!isSelectMode" class="nt-icon-btn" @tap.stop="openItemMenu(note.id)">
              <app-icon name="more-vertical" :size="32" color="#999999" />
            </view>
          </view>

          <!-- 原文引用 -->
          <view class="nt-quote">
            <text class="nt-quote-text">{{ note.originalText }}</text>
          </view>

          <!-- 笔记内容 -->
          <text class="nt-content">{{ note.noteContent }}</text>

          <!-- 标签和时间 -->
          <view class="nt-meta">
            <view class="nt-tags">
              <app-icon name="tag" :size="22" color="#999999" />
              <view v-for="(tag, i) in note.tags" :key="i" class="nt-tag">
                <text class="nt-tag-text">{{ tag }}</text>
              </view>
            </view>
            <view class="nt-time">
              <app-icon name="clock" :size="22" color="#999999" />
              <text class="nt-time-text">{{ note.updatedAt }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 按书籍分组视图 -->
      <view v-else class="nt-groups">
        <view v-for="group in grouped" :key="group.bookId" class="nt-group">
          <view class="nt-group-head" @tap="goBook(group.bookId)">
            <view class="nt-group-left">
              <view class="nt-group-cover">
                <text class="nt-group-cover-text">{{ group.bookTitle.slice(0, 2) }}</text>
              </view>
              <view class="nt-group-info">
                <text class="nt-group-title">《{{ group.bookTitle }}》</text>
                <text class="nt-group-author">[{{ group.dynasty }}] {{ group.bookAuthor }}</text>
              </view>
            </view>
            <view class="nt-group-right">
              <text class="nt-group-count">{{ group.count }}条笔记</text>
              <app-icon name="chevron-right" :size="28" color="#999999" />
            </view>
          </view>
          <view class="nt-group-items">
            <view
              v-for="note in group.items"
              :key="note.id"
              class="nt-subcard"
              :class="{ 'nt-card--selected': selectedIds.has(note.id) }"
              @tap="isSelectMode && toggleSelect(note.id)"
            >
              <text class="nt-subcard-loc">{{ note.chapter }} · 第{{ note.page }}页</text>
              <text class="nt-subcard-quote">{{ note.originalText }}</text>
              <text class="nt-subcard-content">{{ note.noteContent }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { classicsApi, type NoteItem } from '@/lib/classics-data'

const searchValue = ref('')
const selectedIds = ref<Set<string>>(new Set())
const isSelectMode = ref(false)
const notes = ref<NoteItem[]>([])
const viewMode = ref<'timeline' | 'book'>('timeline')
const loading = ref(true)
const error = ref('')

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    notes.value = await classicsApi.notes()
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)

const filtered = computed(() =>
  notes.value.filter(
    (note) =>
      note.noteContent.includes(searchValue.value) ||
      note.originalText.includes(searchValue.value) ||
      note.bookTitle.includes(searchValue.value) ||
      note.tags.some((t) => t.includes(searchValue.value)),
  ),
)

const grouped = computed(() => {
  const groups: Record<string, NoteItem[]> = {}
  filtered.value.forEach((note) => {
    if (!groups[note.bookId]) groups[note.bookId] = []
    groups[note.bookId].push(note)
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
  notes.value = notes.value.filter((note) => !selectedIds.value.has(note.id))
  exitSelect()
}
function deleteItem(id: string) {
  notes.value = notes.value.filter((note) => note.id !== id)
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
    itemList: ['编辑', '分享', '跳转阅读', '删除'],
    success: (res) => {
      if (res.tapIndex === 3) deleteItem(id)
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
.nt-page {
  min-height: 100vh;
  background: var(--background);
  padding-bottom: 48rpx;
}
.nt-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--background);
  border-bottom: 1rpx solid rgba(232, 224, 213, 0.6);
}
.nt-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  height: 112rpx;
}
.nt-nav-left {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.nt-back {
  width: 64rpx;
  height: 64rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nt-title {
  font-size: 32rpx;
  font-weight: 500;
  color: var(--foreground);
}
.nt-nav-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.nt-icon-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nt-tbtn {
  height: 56rpx;
  padding: 0 20rpx;
  display: flex;
  align-items: center;
  border-radius: 12rpx;
}
.nt-tbtn--danger {
  background: #c41e3a;
}
.nt-tbtn--disabled {
  opacity: 0.5;
}
.nt-tbtn-text {
  font-size: 26rpx;
  color: var(--foreground);
}
.nt-tbtn-text--danger {
  color: #ffffff;
}
.nt-toolbar {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 0 32rpx 24rpx;
}
.nt-search {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16rpx;
  height: 72rpx;
  padding: 0 24rpx;
  border-radius: 999rpx;
  background: var(--secondary);
}
.nt-search-input {
  flex: 1;
  font-size: 28rpx;
  color: var(--foreground);
}
.nt-ph {
  color: #999999;
}
.nt-toggle {
  display: flex;
  background: var(--secondary);
  border-radius: 16rpx;
  padding: 4rpx;
}
.nt-toggle-btn {
  padding: 8rpx 24rpx;
  border-radius: 12rpx;
}
.nt-toggle-btn--active {
  background: var(--background);
  box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.06);
}
.nt-toggle-text {
  font-size: 24rpx;
  color: #999999;
}
.nt-toggle-text--active {
  color: var(--foreground);
}
.nt-body {
  padding: 32rpx;
}
.nt-list {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}
.nt-card {
  padding: 32rpx;
  border-radius: 24rpx;
  background: var(--card);
  border: 1rpx solid var(--border);
}
.nt-card--selected {
  box-shadow: 0 0 0 4rpx #c41e3a;
}
.nt-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.nt-card-book {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.nt-card-book-title {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--foreground);
}
.nt-card-loc {
  font-size: 24rpx;
  color: #999999;
}
.nt-quote {
  padding: 16rpx 24rpx;
  border-left: 4rpx solid #fbbf24;
  background: rgba(254, 243, 199, 0.5);
  border-radius: 0 16rpx 16rpx 0;
  margin-bottom: 24rpx;
}
.nt-quote-text {
  font-size: 28rpx;
  color: #92400e;
  font-family: 'Noto Serif SC', serif;
}
.nt-content {
  font-size: 28rpx;
  line-height: 1.6;
  color: #999999;
  margin-bottom: 24rpx;
  display: block;
}
.nt-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.nt-tags {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.nt-tag {
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  background: var(--secondary);
}
.nt-tag-text {
  font-size: 20rpx;
  color: var(--foreground);
}
.nt-time {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.nt-time-text {
  font-size: 22rpx;
  color: #999999;
}
.nt-groups {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}
.nt-group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  background: var(--secondary);
  border-radius: 16rpx;
  margin-bottom: 16rpx;
}
.nt-group-left {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.nt-group-cover {
  width: 64rpx;
  height: 88rpx;
  border-radius: 8rpx;
  background: linear-gradient(to bottom, #fef3c7, #fffbeb);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.06);
}
.nt-group-cover-text {
  writing-mode: vertical-rl;
  font-size: 22rpx;
  font-weight: 700;
  color: #92400e;
  font-family: 'Noto Serif SC', serif;
}
.nt-group-title {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--foreground);
}
.nt-group-author {
  font-size: 24rpx;
  color: #999999;
}
.nt-group-right {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.nt-group-count {
  font-size: 24rpx;
  color: #999999;
}
.nt-group-items {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding-left: 32rpx;
  border-left: 4rpx solid rgba(232, 224, 213, 0.6);
  margin-left: 32rpx;
}
.nt-subcard {
  padding: 24rpx;
  border-radius: 16rpx;
  background: var(--card);
  border: 1rpx solid var(--border);
}
.nt-subcard-loc {
  font-size: 22rpx;
  color: #999999;
  margin-bottom: 8rpx;
  display: block;
}
.nt-subcard-quote {
  font-size: 28rpx;
  color: #b45309;
  font-family: 'Noto Serif SC', serif;
  margin-bottom: 16rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}
.nt-subcard-content {
  font-size: 28rpx;
  color: #999999;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.nt-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 128rpx 0;
  text-align: center;
}
.nt-empty-icon {
  width: 160rpx;
  height: 160rpx;
  border-radius: 999rpx;
  background: var(--secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
}
.nt-empty-title {
  font-size: 30rpx;
  font-weight: 500;
  color: var(--foreground);
  margin-bottom: 8rpx;
}
.nt-empty-sub {
  font-size: 28rpx;
  color: #999999;
  margin-bottom: 32rpx;
}
.nt-empty-btn {
  height: 80rpx;
  padding: 0 48rpx;
  border-radius: 999rpx;
  border: 1rpx solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
}
.nt-empty-btn-text {
  font-size: 28rpx;
  color: var(--foreground);
}
</style>
