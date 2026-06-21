<template>
  <view class="ebs-page">
    <!-- 顶栏 -->
    <view class="ebs-header">
      <view class="ebs-bar">
        <view
          class="ebs-iconbtn"
          @tap="goBack"
        >
          <app-icon
            name="arrow-left"
            :size="40"
            color="#1e293b"
          />
        </view>
        <text class="ebs-title">
          我的书架
        </text>
        <view
          class="ebs-iconbtn"
          @tap="goStore"
        >
          <app-icon
            name="book-open"
            :size="40"
            color="#2563eb"
          />
        </view>
      </view>

      <!-- 状态筛选 Tab -->
      <view class="ebs-filters">
        <view
          v-for="f in filters"
          :key="f.id"
          class="ebs-filter"
          :class="{ 'ebs-filter-active': filter === f.id }"
          @tap="filter = f.id"
        >
          <text
            class="ebs-filter-txt"
            :class="{ 'ebs-filter-txt-active': filter === f.id }"
          >
            {{ f.label }}
          </text>
        </view>
      </view>

      <!-- 视图切换 + 计数 -->
      <view class="ebs-toolbar">
        <text class="ebs-count">
          共 {{ sortedBooks.length }} 本
        </text>
        <view class="ebs-vt">
          <view
            class="ebs-vt-btn"
            :class="{ 'ebs-vt-on': viewMode === 'grid' }"
            @tap="viewMode = 'grid'"
          >
            <app-icon
              name="grid-3x3"
              :size="30"
              :color="viewMode === 'grid' ? '#2563eb' : '#64748b'"
            />
          </view>
          <view
            class="ebs-vt-btn"
            :class="{ 'ebs-vt-on': viewMode === 'list' }"
            @tap="viewMode = 'list'"
          >
            <app-icon
              name="list"
              :size="30"
              :color="viewMode === 'list' ? '#2563eb' : '#64748b'"
            />
          </view>
        </view>
      </view>
    </view>

    <!-- 加载态 -->
    <view
      v-if="loading"
      class="ebs-loading"
    >
      <view class="ebs-loading-grid">
        <view
          v-for="i in 6"
          :key="i"
          class="ebs-loading-item"
        >
          <view class="skeleton-cover" />
          <view class="skeleton-line skeleton-line-lg" />
          <view class="skeleton-line skeleton-line-sm" />
        </view>
      </view>
    </view>

    <!-- 错误态 -->
    <view
      v-else-if="error"
      class="error-state"
      @tap="loadData"
    >
      <text class="error-text">
        {{ error }}
      </text>
      <text class="error-retry">
        点击重试
      </text>
    </view>

    <!-- 内容 -->
    <view
      v-else
      class="ebs-main"
    >
      <!-- 空态 -->
      <view
        v-if="sortedBooks.length === 0"
        class="ebs-empty"
      >
        <app-icon
          name="bookmark"
          :size="112"
          color="#e2e8f0"
        />
        <text class="ebs-empty-title">
          书架空空如也
        </text>
        <text class="ebs-empty-sub">
          去买几本好书吧
        </text>
        <view
          class="ebs-empty-btn"
          @tap="goStore"
        >
          <text class="ebs-empty-btn-txt">
            浏览电子书
          </text>
        </view>
      </view>

      <!-- 网格视图 -->
      <view
        v-else-if="viewMode === 'grid'"
        class="ebs-grid"
      >
        <view
          v-for="book in sortedBooks"
          :key="book.id"
          class="ebs-grid-item"
        >
          <view
            class="ebs-cover-wrap"
            @tap="goReader(book)"
          >
            <flat-book-cover
              :color="book.coverColor"
              :title="book.title"
              class="ebs-cover"
            />
            <!-- 进度条 -->
            <view
              v-if="book.progress > 0 && book.progress < 100"
              class="ebs-cover-progress"
            >
              <view
                class="ebs-cover-progress-fill"
                :style="{ width: book.progress + '%' }"
              />
            </view>
            <!-- 已读完标 -->
            <view
              v-if="book.progress === 100"
              class="ebs-done-badge"
            >
              <text class="ebs-done-txt">
                已读完
              </text>
            </view>
            <!-- 已下载标 -->
            <view
              v-if="book.isDownloaded"
              class="ebs-dl-dot"
            >
              <app-icon
                name="download"
                :size="20"
                color="#ffffff"
              />
            </view>
            <!-- 菜单触发 -->
            <view
              class="ebs-grid-menu-btn"
              @tap.stop="toggleMenu(book.id)"
            >
              <app-icon
                name="more-vertical"
                :size="24"
                color="#ffffff"
              />
            </view>
          </view>
          <view class="ebs-grid-info">
            <text class="ebs-grid-title">
              {{ book.title }}
            </text>
            <view class="ebs-grid-meta">
              <text class="ebs-grid-pct">
                {{ progressLabel(book) }}
              </text>
              <view class="ebs-grid-time">
                <app-icon
                  name="clock"
                  :size="20"
                  color="#64748b"
                />
                <text class="ebs-grid-time-txt">
                  {{ book.lastReadAt }}
                </text>
              </view>
            </view>
          </view>
          <!-- 网格菜单 -->
          <view
            v-if="activeMenu === book.id"
            class="ebs-grid-menu"
            @tap.stop
          >
            <view
              class="ebs-menu-row"
              @tap="onDownload(book)"
            >
              <app-icon
                name="download"
                :size="28"
                color="#2563eb"
              />
              <text class="ebs-menu-row-txt">
                {{ book.isDownloaded ? '已下载' : '下载离线' }}
              </text>
            </view>
            <view
              class="ebs-menu-row"
              @tap="onRemove(book)"
            >
              <app-icon
                name="trash-2"
                :size="28"
                color="#ef4444"
              />
              <text class="ebs-menu-row-txt ebs-menu-row-danger">
                移出书架
              </text>
            </view>
          </view>
        </view>
      </view>

      <!-- 列表视图 -->
      <view
        v-else
        class="ebs-list"
      >
        <view
          v-for="book in sortedBooks"
          :key="book.id"
          class="ebs-list-card"
        >
          <view
            class="ebs-list-main"
            @tap="goReader(book)"
          >
            <flat-book-cover
              :color="book.coverColor"
              :title="book.title"
              class="ebs-list-cover"
            />
            <view class="ebs-list-info">
              <view>
                <text class="ebs-list-title">
                  {{ book.title }}
                </text>
                <text class="ebs-list-author">
                  {{ book.author }} · {{ book.category }}
                </text>
                <view class="ebs-list-sub">
                  <app-icon
                    name="clock"
                    :size="24"
                    color="#94a3b8"
                  />
                  <text class="ebs-list-time">
                    {{ book.lastReadAt }}
                  </text>
                  <view
                    v-if="book.isDownloaded"
                    class="ebs-dl-badge"
                  >
                    <app-icon
                      name="download"
                      :size="20"
                      color="#2563eb"
                    />
                    <text class="ebs-dl-badge-txt">
                      已下载
                    </text>
                  </view>
                </view>
              </view>
              <!-- 进度 -->
              <view class="ebs-list-progress">
                <view class="ebs-list-progress-head">
                  <text class="ebs-list-progress-label">
                    {{ listProgressLabel(book) }}
                  </text>
                  <text class="ebs-list-progress-total">
                    {{ book.totalChapters }}章
                  </text>
                </view>
                <view class="ebs-list-track">
                  <view
                    class="ebs-list-fill"
                    :class="{ 'ebs-list-fill-done': book.progress === 100 }"
                    :style="{ width: book.progress + '%' }"
                  />
                </view>
              </view>
            </view>
            <view
              class="ebs-list-menu-btn"
              @tap.stop="toggleMenu(book.id)"
            >
              <app-icon
                name="more-vertical"
                :size="32"
                color="#94a3b8"
              />
            </view>
          </view>
          <!-- 列表展开操作栏 -->
          <view
            v-if="activeMenu === book.id"
            class="ebs-list-actions"
          >
            <view
              class="ebs-action"
              @tap="onDownload(book)"
            >
              <app-icon
                name="download"
                :size="28"
                color="#2563eb"
              />
              <text class="ebs-action-txt ebs-action-primary">
                {{ book.isDownloaded ? '已下载' : '下载' }}
              </text>
            </view>
            <view
              class="ebs-action ebs-action-mid"
              @tap="goDetail(book)"
            >
              <app-icon
                name="book-open"
                :size="28"
                color="#64748b"
              />
              <text class="ebs-action-txt">
                详情
              </text>
            </view>
            <view
              class="ebs-action"
              @tap="onRemove(book)"
            >
              <app-icon
                name="trash-2"
                :size="28"
                color="#ef4444"
              />
              <text class="ebs-action-txt ebs-action-danger">
                移出
              </text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import FlatBookCover from '@/components/ebook/flat-book-cover.vue'
import {
  ebookApi,
  type EbookFilterType,
  type EbookShelfBook,
} from '@/lib/ebook-data'

const filter = ref<EbookFilterType>('all')
const viewMode = ref<'grid' | 'list'>('grid')
const activeMenu = ref<string | null>(null)
const books = ref<EbookShelfBook[]>([])
const filters = ref<{ id: EbookFilterType; label: string }[]>([])
const loading = ref(true)
const error = ref('')

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const res = await ebookApi.bookshelf()
    books.value = res.shelfBooks
    filters.value = res.filters
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => { loadData() })

const filteredBooks = computed(() =>
  books.value.filter((b) => {
    if (filter.value === 'reading') return b.progress > 0 && b.progress < 100
    if (filter.value === 'finished') return b.progress === 100
    if (filter.value === 'unread') return b.progress === 0
    return true
  })
)

// 排序：有进度的在前，未读在后
const sortedBooks = computed(() =>
  [...filteredBooks.value].sort((a, b) => {
    if (a.progress > 0 && b.progress === 0) return -1
    if (a.progress === 0 && b.progress > 0) return 1
    return 0
  })
)

function progressLabel(book: EbookShelfBook) {
  if (book.progress === 0) return '未读'
  if (book.progress === 100) return '已读完'
  return `${book.progress}%`
}

function listProgressLabel(book: EbookShelfBook) {
  if (book.progress === 0) return '未读'
  if (book.progress === 100) return '已读完'
  return `已读 ${book.progress}% · 第${book.currentChapter}章`
}

function toggleMenu(id: string) {
  activeMenu.value = activeMenu.value === id ? null : id
}

function goBack() {
  uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/mine/index', fail: () => {} }) })
}
function goStore() {
  uni.showToast({ title: '电子书城即将上线', icon: 'none' })
}
function goReader(book: EbookShelfBook) {
  uni.showToast({ title: `阅读《${book.title}》即将上线`, icon: 'none' })
}
function goDetail(book: EbookShelfBook) {
  uni.showToast({ title: `《${book.title}》详情即将上线`, icon: 'none' })
  activeMenu.value = null
}
function onDownload(book: EbookShelfBook) {
  uni.showToast({ title: book.isDownloaded ? '已离线下载' : `开始下载《${book.title}》`, icon: 'none' })
  activeMenu.value = null
}
function onRemove(book: EbookShelfBook) {
  uni.showModal({
    title: '移出书架',
    content: `确定将《${book.title}》移出书架？`,
    success: (res) => {
      if (res.confirm) {
        books.value = books.value.filter((b) => b.id !== book.id)
        activeMenu.value = null
        uni.showToast({ title: '已移出', icon: 'none' })
      }
    },
  })
}
</script>

<style scoped>
.ebs-page {
  min-height: 100vh;
  background: var(--ebook-bg);
}

/* 顶栏 */
.ebs-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: color-mix(in srgb, #ffffff 95%, transparent);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  border-bottom: 1rpx solid var(--ebook-border);
}
.ebs-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  height: 112rpx;
}
.ebs-iconbtn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56rpx;
  height: 56rpx;
  border-radius: 16rpx;
}
.ebs-title {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--ebook-text);
}

/* 状态筛选 */
.ebs-filters {
  display: flex;
  border-bottom: 1rpx solid var(--ebook-border);
}
.ebs-filter {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24rpx 0;
  border-bottom: 4rpx solid transparent;
}
.ebs-filter-active {
  border-bottom-color: var(--ebook-primary);
}
.ebs-filter-txt {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--ebook-text-soft);
}
.ebs-filter-txt-active {
  color: var(--ebook-primary);
}

/* 视图工具栏 */
.ebs-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 32rpx;
}
.ebs-count {
  font-size: 24rpx;
  color: var(--ebook-text-soft);
}
.ebs-vt {
  display: flex;
  gap: 4rpx;
  padding: 4rpx;
  background: #f1f5f9;
  border-radius: 16rpx;
}
.ebs-vt-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52rpx;
  height: 52rpx;
  border-radius: 12rpx;
}
.ebs-vt-on {
  background: #ffffff;
  box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.08);
}

/* 内容区 */
.ebs-main {
  padding: 24rpx 32rpx 64rpx;
}

/* 空态 */
.ebs-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 160rpx 0;
}
.ebs-empty-title {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--ebook-text-soft);
  margin-top: 32rpx;
}
.ebs-empty-sub {
  font-size: 26rpx;
  color: #94a3b8;
  margin-top: 8rpx;
}
.ebs-empty-btn {
  margin-top: 32rpx;
  background: var(--ebook-primary);
  border-radius: 16rpx;
  padding: 20rpx 48rpx;
}
.ebs-empty-btn-txt {
  font-size: 28rpx;
  color: #ffffff;
}

/* 网格视图 */
.ebs-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32rpx;
}
.ebs-grid-item {
  position: relative;
}
.ebs-cover-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 2 / 3;
}
.ebs-cover {
  width: 100%;
  height: 100%;
}
.ebs-cover-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 6rpx;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 0 0 8rpx 8rpx;
  overflow: hidden;
}
.ebs-cover-progress-fill {
  height: 100%;
  background: var(--ebook-primary);
}
.ebs-done-badge {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  background: var(--ebook-free);
  border-radius: 6rpx;
  padding: 4rpx 10rpx;
}
.ebs-done-txt {
  font-size: 18rpx;
  font-weight: 700;
  color: #ffffff;
}
.ebs-dl-dot {
  position: absolute;
  bottom: 12rpx;
  right: 12rpx;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 999rpx;
  padding: 6rpx;
  display: flex;
}
.ebs-grid-menu-btn {
  position: absolute;
  top: 12rpx;
  left: 12rpx;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 999rpx;
  padding: 6rpx;
  display: flex;
}
.ebs-grid-info {
  margin-top: 16rpx;
}
.ebs-grid-title {
  display: block;
  font-size: 24rpx;
  font-weight: 500;
  color: var(--ebook-text);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.ebs-grid-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4rpx;
}
.ebs-grid-pct {
  font-size: 20rpx;
  color: var(--ebook-text-soft);
}
.ebs-grid-time {
  display: flex;
  align-items: center;
  gap: 4rpx;
}
.ebs-grid-time-txt {
  font-size: 20rpx;
  color: var(--ebook-text-soft);
}
.ebs-grid-menu {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  background: #ffffff;
  border-radius: 16rpx;
  border: 1rpx solid var(--ebook-border);
  box-shadow: 0 12rpx 32rpx rgba(0, 0, 0, 0.16);
  padding: 8rpx;
}
.ebs-menu-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 20rpx;
  border-radius: 12rpx;
}
.ebs-menu-row-txt {
  font-size: 24rpx;
  color: var(--ebook-text);
}
.ebs-menu-row-danger {
  color: #ef4444;
}

/* 骨架屏 */
.ebs-loading { padding: 32rpx; }
.ebs-loading-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32rpx;
}
.ebs-loading-item { width: 100%; }
.skeleton-cover {
  width: 100%;
  aspect-ratio: 2 / 3;
  background: #f1f5f9;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
}
.skeleton-line {
  height: 24rpx;
  background: #f1f5f9;
  border-radius: 8rpx;
  margin-bottom: 8rpx;
}
.skeleton-line-lg { width: 60%; }
.skeleton-line-sm { width: 40%; }

/* 错误态 */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 32rpx;
}
.error-text { font-size: 28rpx; color: #8a8178; margin-bottom: 24rpx; }
.error-retry { font-size: 26rpx; color: #c41e3a; }

/* 列表视图 */
.ebs-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.ebs-list-card {
  background: #ffffff;
  border: 1rpx solid var(--ebook-border);
  border-radius: 24rpx;
  overflow: hidden;
}
.ebs-list-main {
  display: flex;
  gap: 24rpx;
  padding: 24rpx;
}
.ebs-list-cover {
  width: 112rpx;
  height: 168rpx;
  flex-shrink: 0;
}
.ebs-list-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 4rpx 0;
}
.ebs-list-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: var(--ebook-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ebs-list-author {
  display: block;
  font-size: 24rpx;
  color: var(--ebook-text-soft);
  margin-top: 4rpx;
}
.ebs-list-sub {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 12rpx;
}
.ebs-list-time {
  font-size: 24rpx;
  color: #94a3b8;
}
.ebs-dl-badge {
  display: flex;
  align-items: center;
  gap: 4rpx;
  background: var(--ebook-primary-soft);
  border-radius: 8rpx;
  padding: 2rpx 8rpx;
}
.ebs-dl-badge-txt {
  font-size: 18rpx;
  color: var(--ebook-primary);
}
.ebs-list-progress {
  margin-top: 16rpx;
}
.ebs-list-progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}
.ebs-list-progress-label {
  font-size: 20rpx;
  color: var(--ebook-text-soft);
}
.ebs-list-progress-total {
  font-size: 20rpx;
  color: var(--ebook-text-soft);
}
.ebs-list-track {
  height: 10rpx;
  background: #f1f5f9;
  border-radius: 999rpx;
  overflow: hidden;
}
.ebs-list-fill {
  height: 100%;
  background: var(--ebook-primary);
  border-radius: 999rpx;
}
.ebs-list-fill-done {
  background: var(--ebook-free);
}
.ebs-list-menu-btn {
  align-self: flex-start;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48rpx;
  height: 48rpx;
}
.ebs-list-actions {
  display: flex;
  border-top: 1rpx solid var(--ebook-border);
}
.ebs-action {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 20rpx 0;
}
.ebs-action-mid {
  border-left: 1rpx solid var(--ebook-border);
  border-right: 1rpx solid var(--ebook-border);
}
.ebs-action-txt {
  font-size: 24rpx;
  color: var(--ebook-text-soft);
}
.ebs-action-primary {
  color: var(--ebook-primary);
}
.ebs-action-danger {
  color: #ef4444;
}
</style>
