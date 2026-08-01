<template>
  <view class="bs-page">
    <!-- 顶部导航 -->
    <view class="bs-header" :style="{ paddingTop: statusBarH + 'px' }">
      <view class="bs-nav">
        <view class="bs-nav-left">
          <view class="bs-iconbtn" @tap="goBack">
            <app-icon name="arrow-left" :size="40" color="#6b6b6b" />
          </view>
          <text class="bs-title">我的书房</text>
        </view>
        <view class="bs-nav-right">
          <template v-if="isSelectMode">
            <view class="bs-textbtn" @tap="exitSelect">取消</view>
            <view
              class="bs-textbtn bs-textbtn-danger"
              :class="{ 'bs-textbtn-disabled': selectedIds.length === 0 }"
              @tap="batchRemove"
            >移除 ({{ selectedIds.length }})</view>
          </template>
          <template v-else>
            <view class="bs-iconbtn" @tap="goSearch">
              <app-icon name="search" :size="34" color="#6b6b6b" />
            </view>
            <view class="bs-iconbtn" @tap="toggleMenu">
              <app-icon name="more-vertical" :size="34" color="#6b6b6b" />
            </view>
          </template>
        </view>
      </view>

      <!-- 更多菜单 -->
      <view v-if="menuOpen" class="bs-menu-mask" @tap="menuOpen = false">
        <view class="bs-menu" @tap.stop>
          <view class="bs-menu-item" @tap="enterSelect">批量管理</view>
        </view>
      </view>
    </view>

    <!-- 加载/错误态 -->
    <view v-if="loading" class="bs-loading"><text class="bs-loading-text">书房加载中...</text></view>
    <view v-else-if="isGuest" class="bs-error-wrap">
      <text class="bs-error-text">登录后查看你的书房</text>
      <view class="bs-retry-btn" @tap="goLogin"><text class="bs-retry-text">去登录</text></view>
    </view>
    <view v-else-if="error" class="bs-error-wrap">
      <text class="bs-error-text">{{ error }}</text>
      <view class="bs-retry-btn" @tap="fetchBookshelf()"><text class="bs-retry-text">重试</text></view>
    </view>
    <template v-else>

    <!-- 标签页头 -->
    <view class="bs-tabs">
      <view class="bs-tablist">
        <view
          class="bs-tab"
          :class="{ 'bs-tab-active': activeTab === 'shelf' }"
          @tap="activeTab = 'shelf'"
        >
          <app-icon name="book-open" :size="28" :color="activeTab === 'shelf' ? '#ffffff' : '#8a8074'" />
          <text>书架</text>
        </view>
        <view
          class="bs-tab"
          :class="{ 'bs-tab-active': activeTab === 'history' }"
          @tap="activeTab = 'history'"
        >
          <app-icon name="clock" :size="28" :color="activeTab === 'history' ? '#ffffff' : '#8a8074'" />
          <text>浏览历史</text>
        </view>
      </view>
    </view>

    <!-- 书签/笔记快捷入口（读书痕迹从这里找回） -->
    <view class="bs-marks-row">
      <view class="bs-marks-card" @tap="goBookmarks">
        <view class="bs-marks-icon"><app-icon name="bookmark" :size="34" color="#c41e3a" /></view>
        <view class="bs-marks-info">
          <text class="bs-marks-title">我的书签</text>
          <text class="bs-marks-sub">一键回到书中位置</text>
        </view>
        <app-icon name="chevron-right" :size="28" color="#a89e8c" />
      </view>
      <view class="bs-marks-card" @tap="goNotes">
        <view class="bs-marks-icon"><app-icon name="file-text" :size="34" color="#c41e3a" /></view>
        <view class="bs-marks-info">
          <text class="bs-marks-title">我的笔记</text>
          <text class="bs-marks-sub">读书心得随时回看</text>
        </view>
        <app-icon name="chevron-right" :size="28" color="#a89e8c" />
      </view>
    </view>

    <!-- 书架 Tab -->
    <view v-show="activeTab === 'shelf'">
      <!-- 视图切换 -->
      <view class="bs-viewbar">
        <text class="bs-count">共 <text class="bs-count-num">{{ filteredBooks.length }}</text> 本</text>
        <view class="bs-viewtoggle">
          <view class="bs-vt-btn" :class="{ 'bs-vt-active': viewMode === 'grid' }" @tap="viewMode = 'grid'">
            <app-icon name="grid-3x3" :size="34" color="#4a4a4a" />
          </view>
          <view class="bs-vt-btn" :class="{ 'bs-vt-active': viewMode === 'list' }" @tap="viewMode = 'list'">
            <app-icon name="list" :size="34" color="#4a4a4a" />
          </view>
        </view>
      </view>

      <!-- 书籍区 -->
      <view class="bs-body">
        <!-- 空态 -->
        <view v-if="filteredBooks.length === 0" class="bs-empty">
          <view class="bs-empty-icon">
            <app-icon name="book-open" :size="64" color="#999999" />
          </view>
          <text class="bs-empty-title">书架是空的</text>
          <text class="bs-empty-desc">去古籍馆探索感兴趣的古籍吧</text>
          <view class="bs-empty-btn" @tap="goHome">探索古籍</view>
        </view>

        <!-- 网格视图 -->
        <view v-else-if="viewMode === 'grid'" class="bs-grid">
          <view
            v-for="book in filteredBooks"
            :key="book.id"
            class="bs-grid-item"
            :class="{ 'bs-grid-selected': isSelectMode && selectedIds.includes(book.id) }"
            @tap="onGridTap(book)"
          >
            <view class="bs-cover-wrap">
              <flat-cover
                :title="book.title"
                :label="book.dynasty"
                :cover-color="coverColorForBook(book.title)"
                title-size="32rpx"
                class="bs-cover"
              />
              <text v-if="book.hasAI" class="bs-tag-ai">AI</text>
              <text v-if="book.progress >= 100" class="bs-tag-done">已读完</text>
              <view v-if="isSelectMode && selectedIds.includes(book.id)" class="bs-check">
                <app-icon name="check" :size="24" color="#ffffff" />
              </view>
            </view>
            <text class="bs-book-title">{{ book.title }}</text>
            <!-- 已读完 -->
            <view
              v-if="book.progress >= 100"
              class="bs-summary-btn"
              @tap.stop="goReader(book.id)"
            >
              <app-icon name="check-circle" :size="24" color="#3f8560" />
              <text>已读完 · 重读</text>
            </view>
            <!-- 进度条 -->
            <view v-else-if="book.progress > 0" class="bs-progress">
              <view class="bs-progress-track">
                <view class="bs-progress-fill" :style="{ width: Math.min(book.progress, 100) + '%' }" />
              </view>
              <text class="bs-progress-num">{{ book.progress }}%</text>
            </view>
          </view>

          <!-- 添加更多（padding-top 撑 3:4 比例，与书封精确等高·X5 兼容） -->
          <view class="bs-add" @tap="goHome">
            <view class="bs-add-ratio" />
            <view class="bs-add-inner">
              <app-icon name="plus" :size="48" color="#999999" />
              <text class="bs-add-text">添加</text>
            </view>
          </view>
        </view>

        <!-- 列表视图 -->
        <view v-else class="bs-list">
          <view
            v-for="book in filteredBooks"
            :key="book.id"
            class="bs-list-card"
            :class="{ 'bs-list-selected': isSelectMode && selectedIds.includes(book.id) }"
            @tap="onListTap(book)"
          >
            <flat-cover
              :title="book.title"
              :cover-color="coverColorForBook(book.title)"
              title-size="24rpx"
              class="bs-list-cover"
            />
            <text class="bs-list-title">{{ book.title }}</text>
            <text class="bs-list-meta">{{ book.dynasty ? `[${book.dynasty}] ` : '' }}{{ book.author }}</text>
            <view class="bs-list-progress">
              <view class="bs-progress-track">
                <view class="bs-progress-fill bs-progress-fill-soft" :style="{ width: book.progress + '%' }" />
              </view>
              <text class="bs-progress-num">{{ book.progress }}%</text>
            </view>
            <view v-if="!isSelectMode" class="bs-row-menu" @tap.stop="openRowMenu(book)">
              <app-icon name="more-vertical" :size="34" color="#6b6b6b" />
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 浏览历史 Tab -->
    <view v-show="activeTab === 'history'" class="bs-history">
      <view
        v-for="item in readingHistory"
        :key="item.id"
        class="bs-history-card"
        @tap="goReader(item.id)"
      >
        <flat-cover
          :title="item.title"
          :cover-color="coverColorForBook(item.title)"
          title-size="20rpx"
          class="bs-hist-cover"
        />
        <view class="bs-hist-info">
          <text class="bs-hist-title">{{ item.title }}</text>
          <text class="bs-hist-chapter">{{ item.chapter }}</text>
        </view>
        <view class="bs-history-time">
          <app-icon name="clock" :size="24" color="#999999" />
          <text>{{ item.readAt }}</text>
        </view>
      </view>
      <view v-if="readingHistory.length > 0" class="bs-clear-history" @tap="onClearHistory">清空历史记录</view>
    </view>
  </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import FlatCover from '@/components/classics/flat-cover.vue'
import { coverColorForBook } from '@/lib/classics-cover'
import { classicsApi, type ShelfBook, type ShelfGroup, type HistoryItem } from '@/lib/classics-data'
import { getToken } from '@/utils/storage'

const statusBarH = ref(0)
try {
  const info = uni.getSystemInfoSync()
  statusBarH.value = info.statusBarHeight || 0
} catch (e) {}

const loading = ref(true)
const error = ref('')
const isGuest = ref(false)
const books = ref<ShelfBook[]>([])
const readingHistory = ref<HistoryItem[]>([])
const groups = ref<ShelfGroup[]>([])

async function fetchBookshelf() {
  if (!getToken()) { isGuest.value = true; loading.value = false; return }
  isGuest.value = false
  loading.value = true
  error.value = ''
  try {
    const data = await classicsApi.bookshelf()
    books.value = data.books || []
    groups.value = data.groups || []
    readingHistory.value = data.history || []
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => { fetchBookshelf() })

const activeTab = ref<'shelf' | 'history'>('shelf')
const viewMode = ref<'grid' | 'list'>('grid')
const activeGroup = ref<string | null>(null)
const isSelectMode = ref(false)
const selectedIds = ref<string[]>([])
const menuOpen = ref(false)
const searchValue = ref('')

const filteredBooks = computed(() =>
  books.value.filter(
    (b) => b.title.includes(searchValue.value) || b.author.includes(searchValue.value)
  )
)

function groupActiveClass(color: string): string {
  return `bs-group-${color}`
}

function goBack() {
  uni.navigateBack({ delta: 1, fail: () => uni.switchTab({ url: '/pages/index/index' }) })
}
function goSearch() {
  uni.navigateTo({ url: '/pkg-classics/search/index' })
}
function goBookmarks() {
  uni.navigateTo({ url: '/pkg-classics/bookmarks/index' })
}
function goNotes() {
  uni.navigateTo({ url: '/pkg-classics/notes/index' })
}
function goHome() {
  uni.navigateTo({ url: '/pkg-classics/home/index' })
}
function goReader(id?: string) {
  if (!id) return
  uni.navigateTo({ url: `/pkg-classics/reader/index?bookId=${id}` })
}
function goLogin() {
  uni.navigateTo({ url: '/pkg-auth/login/index' })
}
function goDetail(id: string) {
  uni.navigateTo({ url: `/pkg-classics/detail/index?id=${id}` })
}

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}
function enterSelect() {
  isSelectMode.value = true
  menuOpen.value = false
  selectedIds.value = []
}
function exitSelect() {
  isSelectMode.value = false
  selectedIds.value = []
}
function toggleSelect(id: string) {
  const i = selectedIds.value.indexOf(id)
  if (i >= 0) selectedIds.value.splice(i, 1)
  else selectedIds.value.push(id)
}
async function batchRemove() {
  if (selectedIds.value.length === 0) return
  const ids = [...selectedIds.value]
  try {
    await Promise.all(ids.map((id) => classicsApi.removeFromShelf(id)))
    books.value = books.value.filter((b) => !ids.includes(b.id))
    selectedIds.value = []
    isSelectMode.value = false
    uni.showToast({ title: '已移出书架', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '操作失败', icon: 'none' })
    fetchBookshelf()
  }
}

function onGridTap(book: ShelfBook) {
  if (isSelectMode.value) toggleSelect(book.id)
  else goDetail(book.id)
}
function onListTap(book: ShelfBook) {
  if (isSelectMode.value) toggleSelect(book.id)
  else goDetail(book.id)
}
function openRowMenu(book: ShelfBook) {
  uni.showActionSheet({
    itemList: ['继续阅读', '移出书架'],
    success: (res) => {
      if (res.tapIndex === 0) goReader(book.id)
      else if (res.tapIndex === 1) removeFromShelf(book.id)
    },
  })
}
async function removeFromShelf(id: string) {
  try {
    await classicsApi.removeFromShelf(id)
    books.value = books.value.filter((b) => b.id !== id)
    uni.showToast({ title: '已移出书架', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '操作失败', icon: 'none' })
  }
}

function onClearHistory() {
  uni.showModal({
    title: '清空历史记录',
    content: '确定清空全部浏览历史吗？',
    confirmColor: '#C41E3A',
    success: (res) => {
      if (res.confirm) readingHistory.value = []
    },
  })
}
</script>

<style scoped>
.bs-page {
  min-height: 100vh;
  /* 宣纸暖底：与古籍板块家族一致 */
  background: var(--classics-bg);
  padding-bottom: 48rpx;
}

/* 顶栏 */
.bs-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--classics-bg);
}
.bs-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  height: 112rpx;
}
.bs-nav-left {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.bs-iconbtn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.bs-title {
  font-size: 32rpx;
  font-weight: 500;
  color: var(--foreground);
}
.bs-nav-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.bs-textbtn {
  font-size: 28rpx;
  padding: 8rpx 20rpx;
  border-radius: 12rpx;
  color: var(--foreground);
}
.bs-textbtn-danger {
  background: var(--brand);
  color: #fff;
}
.bs-textbtn-disabled {
  opacity: 0.5;
}

/* 更多菜单 */
.bs-menu-mask {
  position: fixed;
  inset: 0;
  z-index: 60;
}
.bs-menu {
  position: absolute;
  top: 100rpx;
  right: 32rpx;
  background: var(--card);
  border-radius: 16rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.12);
  border: 1rpx solid var(--border);
  padding: 8rpx;
  min-width: 240rpx;
}
.bs-menu-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  color: var(--foreground);
  border-radius: 12rpx;
}

/* Tabs：古籍家族分段控件（同榜单页 rk-tabs 语言：白卡药丸底 + 故宫红实底白字选中态） */
.bs-tabs {
  padding: 24rpx 32rpx 16rpx;
}
.bs-tablist {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  background: var(--card);
  border-radius: 999rpx;
  padding: 6rpx;
  box-shadow:
    inset 0 0 0 1rpx rgba(0, 0, 0, 0.04),
    0 2rpx 8rpx rgba(62, 40, 18, 0.06);
}
.bs-tab {
  display: flex;
  align-items: center;
  gap: 10rpx;
  height: 64rpx;
  padding: 0 36rpx;
  border-radius: 999rpx;
  font-size: 26rpx;
  font-weight: 500;
  color: var(--muted-foreground);
}
.bs-tab-active {
  background: var(--brand);
  color: #ffffff;
  font-weight: 600;
  box-shadow: 0 4rpx 12rpx rgba(196, 30, 58, 0.25);
}

/* 分组筛选 */
.bs-groups {
  white-space: nowrap;
  padding: 24rpx 0;
}
.bs-groups-row {
  display: inline-flex;
  align-items: center;
  gap: 16rpx;
  padding: 0 32rpx;
}
.bs-group {
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  white-space: nowrap;
}
.bs-group-flex {
  display: flex;
  align-items: center;
  gap: 8rpx;
  white-space: nowrap;
}
.bs-group text {
  white-space: nowrap;
}
.bs-group-idle {
  background: rgba(0, 0, 0, 0.05);
  color: var(--muted-foreground);
}
.bs-group-all-active {
  background: var(--brand);
  color: #fff;
}
.bs-group-amber {
  background: #fef3c7;
  color: #b45309;
}
.bs-group-emerald {
  background: #d1fae5;
  color: #047857;
}
.bs-group-blue {
  background: #dbeafe;
  color: #1d4ed8;
}
.bs-group-badge {
  font-size: 18rpx;
  padding: 0 8rpx;
  height: 28rpx;
  line-height: 28rpx;
  border-radius: 8rpx;
  background: rgba(0, 0, 0, 0.06);
}
.bs-group-plus {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* 视图栏 */
/* 书签/笔记快捷入口 */
.bs-marks-row {
  display: flex;
  gap: 20rpx;
  padding: 8rpx 32rpx 24rpx;
}
.bs-marks-card {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 20rpx;
  border-radius: 20rpx;
  background: #ffffff;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.bs-marks-card:active {
  box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.08);
}
.bs-marks-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 999rpx;
  background: rgba(196, 30, 58, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.bs-marks-info {
  flex: 1;
  min-width: 0;
}
.bs-marks-title {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.bs-marks-sub {
  display: block;
  font-size: 20rpx;
  color: #a89e8c;
  margin-top: 2rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bs-viewbar {
  padding: 0 32rpx 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.bs-count {
  font-size: 24rpx;
  color: var(--muted-foreground);
}
.bs-count-num {
  color: var(--foreground);
  font-weight: 500;
}
.bs-viewtoggle {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.bs-vt-btn {
  padding: 12rpx;
  border-radius: 10rpx;
}
.bs-vt-active {
  background: rgba(0, 0, 0, 0.06);
}

/* 书籍区 */
.bs-body {
  padding: 0 32rpx;
}

/* 空态 */
.bs-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 128rpx 0;
  text-align: center;
}
.bs-empty-icon {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
}
.bs-empty-title {
  font-size: 30rpx;
  font-weight: 500;
  color: var(--foreground);
  margin-bottom: 8rpx;
}
.bs-empty-desc {
  font-size: 26rpx;
  color: var(--muted-foreground);
  margin-bottom: 32rpx;
}
.bs-empty-btn {
  padding: 18rpx 48rpx;
  border-radius: 999rpx;
  background: var(--brand);
  color: #fff;
  font-size: 28rpx;
}

/* 网格 */
.bs-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24rpx;
}
.bs-grid-item {
  position: relative;
}
.bs-grid-selected {
  outline: 4rpx solid var(--brand);
  border-radius: 16rpx;
}
.bs-cover-wrap {
  position: relative;
}
.bs-cover {
  width: 100%;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.12);
}
.bs-tag-ai {
  position: absolute;
  top: 12rpx;
  left: 12rpx;
  font-size: 18rpx;
  font-weight: 500;
  padding: 2rpx 10rpx;
  border-radius: 8rpx;
  background: rgba(0, 0, 0, 0.3);
  color: #fff;
}
.bs-tag-done {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  font-size: 18rpx;
  font-weight: 500;
  padding: 2rpx 10rpx;
  border-radius: 8rpx;
  background: var(--brand);
  color: #fff;
}
.bs-check {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.2);
}
.bs-book-title {
  display: block;
  margin-top: 12rpx;
  font-size: 26rpx;
  font-weight: 500;
  color: var(--foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bs-summary-btn {
  margin-top: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 8rpx 0;
  border-radius: 10rpx;
  font-size: 22rpx;
  font-weight: 500;
  background: rgba(201, 169, 110, 0.12);
  color: #8a6d2f;
}
.bs-progress {
  margin-top: 8rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.bs-progress-track {
  flex: 1;
  height: 8rpx;
  border-radius: 999rpx;
  background: rgba(0, 0, 0, 0.08);
  overflow: hidden;
}
.bs-progress-fill {
  height: 100%;
  border-radius: 999rpx;
  background: var(--brand);
}
.bs-progress-fill-soft {
  background: rgba(196, 30, 58, 0.7);
}
.bs-progress-num {
  font-size: 20rpx;
  color: var(--muted-foreground);
  font-variant-numeric: tabular-nums;
}
.bs-add {
  position: relative;
  /* 防 grid cell stretch：高度只由内部 3:4 比例撑出，与书封精确等高 */
  align-self: start;
  border-radius: 24rpx;
  background: rgba(0, 0, 0, 0.04);
}
/* 3:4 比例撑高（padding-top 方案·替代 aspect-ratio·X5 兼容） */
.bs-add-ratio {
  padding-top: 133.34%;
}
.bs-add-inner {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}
.bs-add-text {
  font-size: 24rpx;
  color: var(--muted-foreground);
}

/* 列表 */
.bs-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.bs-list-card {
  position: relative;
  background: var(--card);
  border: 1rpx solid var(--border);
  border-radius: 24rpx;
  padding: 32rpx 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}
.bs-list-selected {
  outline: 4rpx solid var(--brand);
}
.bs-row-menu {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 56rpx;
  margin-top: 4rpx;
}
/* 列表视图书封：统一用 flat-cover 仿真书（只给宽度，高度由组件内部 3:4 撑出） */
.bs-list-cover {
  width: 120rpx;
  flex-shrink: 0;
}
.bs-list-info {
  flex: 1;
  min-width: 0;
}
.bs-list-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: var(--foreground);
  text-align: center;
  margin-top: 8rpx;
}
.bs-list-meta {
  display: block;
  font-size: 22rpx;
  color: var(--muted-foreground);
  text-align: center;
}
.bs-list-progress {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 8rpx;
  width: 60%;
}

/* 浏览历史 */
.bs-history {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.bs-history-card {
  background: var(--card);
  border: 1rpx solid var(--border);
  border-radius: 24rpx;
  padding: 24rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
}
/* 浏览历史书封：与古籍板块 flat-cover 仿真书样式统一 */
.bs-hist-cover {
  width: 88rpx;
  flex-shrink: 0;
}
.bs-hist-info {
  flex: 1;
  min-width: 0;
}
.bs-hist-title {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: var(--foreground);
}
.bs-hist-chapter {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 22rpx;
  color: var(--muted-foreground);
  margin-top: 2rpx;
}
.bs-history-time {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 22rpx;
  color: var(--muted-foreground);
  flex-shrink: 0;
}
.bs-clear-history {
  text-align: center;
  padding: 20rpx;
  font-size: 22rpx;
  color: var(--muted-foreground);
}
/* 加载/错误态 */
.bs-loading { display: flex; align-items: center; justify-content: center; padding: 120rpx 48rpx; }
.bs-loading-text { font-size: 28rpx; color: #999; }
.bs-error-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 120rpx 48rpx; gap: 24rpx; }
.bs-error-text { font-size: 28rpx; color: #e74c3c; text-align: center; }
.bs-retry-btn { padding: 16rpx 48rpx; background: var(--brand); border-radius: 24rpx; }
.bs-retry-text { font-size: 28rpx; color: #fff; }
</style>
