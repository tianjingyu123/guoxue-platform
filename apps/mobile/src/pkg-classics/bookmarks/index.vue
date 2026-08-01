<template>
  <view class="bm-page">
    <!-- 顶部导航 -->
    <view class="bm-header">
      <view class="bm-nav">
        <view class="bm-nav-left">
          <view class="bm-back" @tap="goBack">
            <app-icon name="arrow-left" :size="40" color="#6b6355" />
          </view>
          <view class="bm-title-wrap">
            <text class="bm-title">我的书签</text>
            <text v-if="!loading && !isGuest && !error && bookmarks.length" class="bm-title-sub">共 {{ bookmarks.length }} 枚 · 点卡片回到书中位置</text>
          </view>
        </view>
        <view class="bm-nav-right">
          <template v-if="isSelectMode">
            <view class="bm-tbtn" @tap="exitSelect">
              <text class="bm-tbtn-text">取消</text>
            </view>
            <view class="bm-tbtn bm-tbtn--danger" :class="{ 'bm-tbtn--disabled': selectedIds.size === 0 }" @tap="batchDelete">
              <text class="bm-tbtn-text bm-tbtn-text--danger">删除 ({{ selectedIds.size }})</text>
            </view>
          </template>
          <view v-else class="bm-icon-btn" @tap="openManageMenu">
            <app-icon name="more-vertical" :size="32" color="#6b6355" />
          </view>
        </view>
      </view>

      <!-- 搜索和视图切换 -->
      <view class="bm-toolbar">
        <view class="bm-search">
          <app-icon name="search" :size="28" color="#a89e8c" />
          <input v-model="searchValue" class="bm-search-input" placeholder="搜索书签内容…" placeholder-class="bm-ph" />
        </view>
        <view class="bm-toggle">
          <view class="bm-toggle-btn" :class="{ 'bm-toggle-btn--active': viewMode === 'timeline' }" @tap="viewMode = 'timeline'">
            <text class="bm-toggle-text" :class="{ 'bm-toggle-text--active': viewMode === 'timeline' }">时间线</text>
          </view>
          <view class="bm-toggle-btn" :class="{ 'bm-toggle-btn--active': viewMode === 'book' }" @tap="viewMode = 'book'">
            <text class="bm-toggle-text" :class="{ 'bm-toggle-text--active': viewMode === 'book' }">按书籍</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 列表 -->
    <view class="bm-body">
      <!-- 加载态 -->
      <view v-if="loading" class="bm-empty">
        <text class="bm-empty-title">加载中…</text>
      </view>
      <!-- 未登录态 -->
      <view v-else-if="isGuest" class="bm-empty">
        <view class="bm-empty-icon"><app-icon name="bookmark" :size="64" color="#c41e3a" /></view>
        <text class="bm-empty-title">登录后查看书签</text>
        <text class="bm-empty-sub">书签会自动同步到你的账号</text>
        <view class="bm-empty-btn" @tap="goLogin"><text class="bm-empty-btn-text">去登录</text></view>
      </view>
      <!-- 错误态 -->
      <view v-else-if="error" class="bm-empty">
        <text class="bm-empty-title">{{ error }}</text>
        <view class="bm-empty-btn bm-empty-btn--ghost" @tap="fetchData">
          <text class="bm-empty-btn-text bm-empty-btn-text--ghost">重试</text>
        </view>
      </view>
      <!-- 空状态 -->
      <view v-else-if="filtered.length === 0" class="bm-empty">
        <view class="bm-empty-icon">
          <app-icon name="bookmark" :size="64" color="#c41e3a" />
        </view>
        <text class="bm-empty-verse">书签，是留在书页间的驿站</text>
        <text class="bm-empty-sub">阅读时点底部「书签」，读到哪里都能一键回来</text>
        <view class="bm-empty-btn" @tap="goHome">
          <text class="bm-empty-btn-text">去读书</text>
        </view>
      </view>

      <!-- 时间线视图 -->
      <view v-else-if="viewMode === 'timeline'" class="bm-list">
        <view
          v-for="bm in filtered"
          :key="bm.id"
          class="bm-card"
          :class="{ 'bm-card--selected': selectedIds.has(bm.id) }"
          @tap="onCardTap(bm)"
        >
          <!-- 书签丝带（垂带+燕尾·border 三角·X5 安全） -->
          <view class="bm-ribbon" :class="`bm-ribbon--${bm.color}`">
            <view class="bm-ribbon-tail" :class="`bm-ribbon-tail--${bm.color}`" />
          </view>
          <view class="bm-card-main">
            <view class="bm-card-head">
              <text class="bm-card-book">{{ bm.bookTitle }}</text>
              <text v-if="bm.dynasty || bm.bookAuthor" class="bm-card-author">{{ bm.dynasty ? `[${bm.dynasty}] ` : '' }}{{ bm.bookAuthor }}</text>
            </view>
            <view class="bm-card-locrow">
              <view class="bm-chapter-chip"><text class="bm-chapter-chip-text">{{ bm.chapter || '未知章节' }}</text></view>
            </view>
            <view v-if="bm.content" class="bm-quote">
              <text class="bm-quote-text">{{ bm.content }}</text>
            </view>
            <view class="bm-card-foot">
              <view class="bm-card-time">
                <app-icon name="clock" :size="22" color="#a89e8c" />
                <text class="bm-card-time-text">{{ bm.createdAt }}</text>
              </view>
              <view v-if="!isSelectMode" class="bm-goto">
                <text class="bm-goto-text">回到此处</text>
                <app-icon name="chevron-right" :size="24" color="#c41e3a" />
              </view>
            </view>
          </view>
          <view v-if="!isSelectMode" class="bm-icon-btn bm-card-more" @tap.stop="openItemMenu(bm.id)">
            <app-icon name="more-vertical" :size="32" color="#a89e8c" />
          </view>
          <view v-if="isSelectMode && selectedIds.has(bm.id)" class="bm-check">
            <app-icon name="check" :size="24" color="#ffffff" />
          </view>
        </view>
      </view>

      <!-- 按书籍分组视图 -->
      <view v-else class="bm-groups">
        <view v-for="group in grouped" :key="group.bookId" class="bm-group">
          <view class="bm-group-head" @tap="goBook(group.bookId)">
            <view class="bm-group-left">
              <flat-cover
                :title="group.bookTitle"
                :cover-color="coverColorForBook(group.bookTitle)"
                title-size="18rpx"
                class="bm-group-cover"
              />
              <view class="bm-group-info">
                <text class="bm-group-title">《{{ group.bookTitle }}》</text>
                <text class="bm-group-author">{{ group.dynasty ? `[${group.dynasty}] ` : '' }}{{ group.bookAuthor || '佚名' }}</text>
              </view>
            </view>
            <view class="bm-group-right">
              <text class="bm-group-count">{{ group.count }}枚书签</text>
              <app-icon name="chevron-right" :size="28" color="#a89e8c" />
            </view>
          </view>
          <view class="bm-group-items">
            <view
              v-for="bm in group.items"
              :key="bm.id"
              class="bm-subcard"
              :class="[`bm-subcard--${bm.color}`, { 'bm-card--selected': selectedIds.has(bm.id) }]"
              @tap="onCardTap(bm)"
            >
              <view class="bm-subcard-locrow">
                <text class="bm-subcard-loc">{{ bm.chapter || '未知章节' }}</text>
                <text class="bm-subcard-time">{{ bm.createdAt.slice(0, 10) }}</text>
              </view>
              <text v-if="bm.content" class="bm-subcard-content">{{ bm.content }}</text>
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
import FlatCover from '@/components/classics/flat-cover.vue'
import { coverColorForBook } from '@/lib/classics-cover'
import { classicsApi, type BookmarkItem } from '@/lib/classics-data'
import { getToken } from '@/utils/storage'

const searchValue = ref('')
const selectedIds = ref<Set<string>>(new Set())
const isSelectMode = ref(false)
const bookmarks = ref<BookmarkItem[]>([])
const viewMode = ref<'timeline' | 'book'>('timeline')
const loading = ref(true)
const error = ref('')
const isGuest = ref(false)

async function fetchData() {
  if (!getToken()) { isGuest.value = true; loading.value = false; return }
  isGuest.value = false
  loading.value = true
  error.value = ''
  try {
    bookmarks.value = await classicsApi.bookmarks()
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)

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

/** 点卡片：选择模式下切选中，否则回跳到书中位置（章节+段落） */
function onCardTap(bm: BookmarkItem) {
  if (isSelectMode.value) { toggleSelect(bm.id); return }
  goReaderAt(bm)
}
function goReaderAt(bm: BookmarkItem) {
  if (!bm.bookId) { uni.showToast({ title: '书籍信息缺失', icon: 'none' }); return }
  let url = `/pkg-classics/reader/index?bookId=${bm.bookId}`
  if (bm.chapterId) {
    url += `&chapterId=${bm.chapterId}&pos=${bm.position ?? 0}`
  }
  uni.navigateTo({ url })
}

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
async function batchDelete() {
  if (selectedIds.value.size === 0) return
  const ids = [...selectedIds.value]
  try {
    await Promise.all(ids.map((id) => classicsApi.removeBookmark(id)))
    bookmarks.value = bookmarks.value.filter((bm) => !ids.includes(bm.id))
    exitSelect()
    uni.showToast({ title: '已删除', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '删除失败', icon: 'none' })
    fetchData()
  }
}
async function deleteItem(id: string) {
  try {
    await classicsApi.removeBookmark(id)
    bookmarks.value = bookmarks.value.filter((bm) => bm.id !== id)
    uni.showToast({ title: '已删除', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '删除失败', icon: 'none' })
  }
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
  const bm = bookmarks.value.find((b) => b.id === id)
  uni.showActionSheet({
    itemList: ['回到书中位置', '查看本书', '删除'],
    success: (res) => {
      if (res.tapIndex === 0 && bm) goReaderAt(bm)
      else if (res.tapIndex === 1 && bm) goBook(bm.bookId)
      else if (res.tapIndex === 2) deleteItem(id)
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
function goLogin() {
  uni.navigateTo({ url: '/pkg-auth/login/index' })
}
</script>

<style scoped lang="scss">
/* ===== 古籍馆视觉语言：宣纸暖底 + 白卡 + 故宫红点缀 + 衬线标题 ===== */
.bm-page {
  min-height: 100vh;
  background: var(--classics-bg, #f4f2ee);
  padding-bottom: 48rpx;
}
.bm-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--classics-bg, #f4f2ee);
  border-bottom: 1rpx solid rgba(196, 30, 58, 0.08);
}
.bm-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  min-height: 112rpx;
}
.bm-nav-left {
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.bm-back {
  width: 64rpx;
  height: 64rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  &:active { background: rgba(0, 0, 0, 0.04); }
}
.bm-title-wrap {
  display: flex;
  flex-direction: column;
}
.bm-title {
  font-family: var(--font-serif, 'Noto Serif SC', serif);
  font-size: 36rpx;
  font-weight: 700;
  color: #2c2c2c;
  letter-spacing: 2rpx;
}
.bm-title-sub {
  font-size: 20rpx;
  color: #a89e8c;
  margin-top: 2rpx;
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
  padding: 0 24rpx;
  display: flex;
  align-items: center;
  border-radius: 999rpx;
  border: 1rpx solid rgba(0, 0, 0, 0.08);
  background: #ffffff;
}
.bm-tbtn--danger {
  background: var(--brand, #c41e3a);
  border-color: var(--brand, #c41e3a);
}
.bm-tbtn--disabled {
  opacity: 0.5;
}
.bm-tbtn-text {
  font-size: 26rpx;
  color: #2c2c2c;
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
  padding: 0 28rpx;
  border-radius: 999rpx;
  background: #ffffff;
  border: 1rpx solid rgba(0, 0, 0, 0.05);
}
.bm-search-input {
  flex: 1;
  font-size: 28rpx;
  color: #2c2c2c;
}
.bm-ph {
  color: #b8ae9c;
}
.bm-toggle {
  display: flex;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 999rpx;
  padding: 4rpx;
}
.bm-toggle-btn {
  padding: 10rpx 24rpx;
  border-radius: 999rpx;
}
.bm-toggle-btn--active {
  background: #ffffff;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
}
.bm-toggle-text {
  font-size: 24rpx;
  color: #a89e8c;
}
.bm-toggle-text--active {
  color: var(--brand, #c41e3a);
  font-weight: 600;
}
.bm-body {
  padding: 32rpx;
}

/* ===== 时间线卡片：白卡 + 左侧书签丝带 ===== */
.bm-list {
  display: flex;
  flex-direction: column;
  gap: 28rpx;
}
.bm-card {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 8rpx;
  padding: 32rpx 24rpx 28rpx 36rpx;
  border-radius: 24rpx;
  background: #ffffff;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
  overflow: hidden;
  &:active { box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.08); }
}
/* 丝带：从卡片顶垂下的书签绦带 + 燕尾（border 三角·X5 安全） */
.bm-ribbon {
  position: absolute;
  left: 32rpx;
  top: 0;
  width: 28rpx;
  height: 76rpx;
  border-radius: 0 0 2rpx 2rpx;
}
.bm-ribbon-tail {
  position: absolute;
  left: 0;
  top: 100%;
  width: 0;
  height: 0;
  border-left: 14rpx solid transparent;
  border-right: 14rpx solid transparent;
  border-top-width: 14rpx;
  border-top-style: solid;
}
/* 传统色系丝带：藤黄 / 黛蓝 / 竹青 / 朱砂 */
.bm-ribbon--amber { background: #c99b3f; }
.bm-ribbon-tail--amber { border-top-color: #c99b3f; }
.bm-ribbon--blue { background: #3a5f8a; }
.bm-ribbon-tail--blue { border-top-color: #3a5f8a; }
.bm-ribbon--green { background: #3f8560; }
.bm-ribbon-tail--green { border-top-color: #3f8560; }
.bm-ribbon--purple { background: var(--brand, #c41e3a); }
.bm-ribbon-tail--purple { border-top-color: var(--brand, #c41e3a); }
.bm-card--selected {
  box-shadow: 0 0 0 4rpx var(--brand, #c41e3a);
}
.bm-check {
  position: absolute;
  right: 24rpx;
  top: 24rpx;
  width: 44rpx;
  height: 44rpx;
  border-radius: 999rpx;
  background: var(--brand, #c41e3a);
  display: flex;
  align-items: center;
  justify-content: center;
}
.bm-card-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding-left: 52rpx;
}
.bm-card-head {
  display: flex;
  align-items: baseline;
  gap: 16rpx;
  margin-bottom: 14rpx;
}
.bm-card-book {
  font-family: var(--font-serif, 'Noto Serif SC', serif);
  font-size: 32rpx;
  font-weight: 700;
  color: #2c2c2c;
}
.bm-card-author {
  font-size: 22rpx;
  color: #a89e8c;
}
.bm-card-locrow {
  display: flex;
  margin-bottom: 16rpx;
}
.bm-chapter-chip {
  padding: 4rpx 20rpx;
  border-radius: 999rpx;
  background: rgba(196, 30, 58, 0.08);
}
.bm-chapter-chip-text {
  font-size: 22rpx;
  color: var(--brand, #c41e3a);
  font-weight: 500;
}
/* 摘录引文 */
.bm-quote {
  padding: 16rpx 24rpx;
  border-left: 6rpx solid rgba(196, 30, 58, 0.35);
  background: var(--classics-bg, #f4f2ee);
  border-radius: 0 16rpx 16rpx 0;
  margin-bottom: 20rpx;
}
.bm-quote-text {
  font-family: var(--font-serif, 'Noto Serif SC', serif);
  font-size: 28rpx;
  line-height: 1.8;
  color: #4a4136;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.bm-card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.bm-card-time {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.bm-card-time-text {
  font-size: 22rpx;
  color: #a89e8c;
}
.bm-goto {
  display: flex;
  align-items: center;
  gap: 4rpx;
}
.bm-goto-text {
  font-size: 24rpx;
  font-weight: 600;
  color: var(--brand, #c41e3a);
}
.bm-card-more {
  flex-shrink: 0;
  margin-top: -8rpx;
}

/* ===== 按书籍分组 ===== */
.bm-groups {
  display: flex;
  flex-direction: column;
  gap: 40rpx;
}
.bm-group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  background: #ffffff;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
  margin-bottom: 20rpx;
}
.bm-group-left {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
/* 分组头书封：flat-cover 仿真书（只给宽度，高度由组件内部 3:4 撑出） */
.bm-group-cover {
  width: 64rpx;
  flex-shrink: 0;
}
.bm-group-title {
  font-family: var(--font-serif, 'Noto Serif SC', serif);
  font-size: 30rpx;
  font-weight: 700;
  color: #2c2c2c;
}
.bm-group-author {
  font-size: 24rpx;
  color: #a89e8c;
}
.bm-group-right {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.bm-group-count {
  font-size: 24rpx;
  color: var(--brand, #c41e3a);
}
.bm-group-items {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding-left: 32rpx;
  border-left: 4rpx solid rgba(196, 30, 58, 0.12);
  margin-left: 32rpx;
}
.bm-subcard {
  padding: 24rpx 28rpx;
  border-radius: 16rpx;
  background: #ffffff;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);
  border-left-width: 6rpx;
  border-left-style: solid;
  &:active { box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.07); }
}
.bm-subcard--amber { border-left-color: #c99b3f; }
.bm-subcard--blue { border-left-color: #3a5f8a; }
.bm-subcard--green { border-left-color: #3f8560; }
.bm-subcard--purple { border-left-color: var(--brand, #c41e3a); }
.bm-subcard-locrow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}
.bm-subcard-loc {
  font-size: 24rpx;
  font-weight: 600;
  color: var(--brand, #c41e3a);
}
.bm-subcard-time {
  font-size: 20rpx;
  color: #a89e8c;
}
.bm-subcard-content {
  font-size: 28rpx;
  line-height: 1.7;
  color: #4a4136;
  font-family: var(--font-serif, 'Noto Serif SC', serif);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* ===== 空态 / 状态 ===== */
.bm-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 128rpx 48rpx;
  text-align: center;
}
.bm-empty-icon {
  width: 160rpx;
  height: 160rpx;
  border-radius: 999rpx;
  background: rgba(196, 30, 58, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 40rpx;
}
.bm-empty-verse {
  font-family: var(--font-serif, 'Noto Serif SC', serif);
  font-size: 34rpx;
  font-weight: 700;
  color: #2c2c2c;
  letter-spacing: 2rpx;
  margin-bottom: 16rpx;
}
.bm-empty-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #2c2c2c;
  margin-bottom: 8rpx;
}
.bm-empty-sub {
  font-size: 26rpx;
  color: #a89e8c;
  margin-bottom: 40rpx;
  line-height: 1.6;
}
.bm-empty-btn {
  height: 80rpx;
  padding: 0 64rpx;
  border-radius: 999rpx;
  background: var(--brand, #c41e3a);
  box-shadow: 0 4rpx 16rpx rgba(196, 30, 58, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  &:active { opacity: 0.85; }
}
.bm-empty-btn-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #ffffff;
}
.bm-empty-btn--ghost {
  background: #ffffff;
  border: 1rpx solid rgba(0, 0, 0, 0.1);
  box-shadow: none;
}
.bm-empty-btn-text--ghost {
  color: #2c2c2c;
}
</style>
