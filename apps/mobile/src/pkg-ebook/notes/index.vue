<template>
  <view v-if="isLoading" class="page">
    <view style="padding: 24rpx;">
      <AppSkeleton width="100%" height="80rpx" radius="16rpx" mb="24rpx" />
      <AppSkeleton width="100%" height="60rpx" radius="16rpx" mb="24rpx" />
      <AppSkeleton width="100%" height="200rpx" radius="24rpx" mb="24rpx" />
      <AppSkeleton width="100%" height="200rpx" radius="24rpx" />
    </view>
  </view>
  <AppError v-else-if="loadError" :desc="loadError" @retry="reload" />
  <AppEmpty v-else-if="isEmpty" title="暂无笔记" />
  <view v-else class="page">
    <!-- Header -->
    <view class="hd">
      <view class="hd-bar">
        <view
          class="icon-btn"
          @tap="goBack"
        >
          <AppIcon
            name="arrow-left"
            :size="40"
            :color="C.text"
          />
        </view>
        <text class="hd-title">
          笔记 & 划线
        </text>
        <view class="icon-btn">
          <AppIcon
            name="download"
            :size="40"
            :color="C.primary"
          />
        </view>
      </view>

      <!-- 统计 -->
      <view class="summary">
        <view class="summary-item">
          <AppIcon
            name="pen-line"
            :size="32"
            :color="C.primary"
          />
          <text class="summary-tx">
            {{ totalNotes }} 条笔记
          </text>
        </view>
        <view class="summary-item">
          <AppIcon
            name="highlighter"
            :size="32"
            :color="C.amber"
          />
          <text class="summary-tx">
            {{ totalHighlights }} 处划线
          </text>
        </view>
      </view>

      <!-- 搜索 -->
      <view class="hd-search">
        <view class="search-box">
          <AppIcon
            name="search"
            :size="32"
            :color="C.slate400"
            class="search-icon"
          />
          <input
            v-model="search"
            class="search-input"
            placeholder="搜索笔记内容..."
            placeholder-class="ph"
          >
        </view>
      </view>

      <!-- 筛选 -->
      <view class="filters">
        <view
          v-for="f in filterTabs"
          :key="f.id"
          class="filter-chip"
          :class="{ active: filter === f.id }"
          @tap="filter = f.id"
        >
          <text
            class="filter-tx"
            :class="{ 'active-tx': filter === f.id }"
          >
            {{ f.label }}
          </text>
        </view>
      </view>
    </view>

    <scroll-view
      scroll-y
      class="body"
    >
      <!-- 空状态 -->
      <view
        v-if="groupedKeys.length === 0"
        class="empty"
      >
        <AppIcon
          name="message-square"
          :size="96"
          :color="C.slate200"
        />
        <text class="empty-title">
          暂无笔记
        </text>
        <text class="empty-sub">
          在阅读时选中文字，可以划线或添加笔记
        </text>
        <view
          class="empty-btn"
          @tap="goShelf"
        >
          <text class="empty-btn-tx">
            去阅读
          </text>
        </view>
      </view>

      <!-- 按书分组 -->
      <view
        v-for="g in grouped"
        :key="g.bookId"
        class="group"
      >
        <view class="book-hd">
          <view
            class="book-cover"
            :style="{ background: g.book.bookCoverColor }"
          >
            <view class="cover-spine" />
          </view>
          <view class="book-meta">
            <text class="book-title">
              {{ g.book.bookTitle }}
            </text>
            <text class="book-sub">
              {{ g.list.length }} 条记录
            </text>
          </view>
          <view
            class="continue"
            @tap="goReader(g.bookId)"
          >
            <text class="continue-tx">
              继续读
            </text>
            <AppIcon
              name="chevron-right"
              :size="28"
              :color="C.primary"
            />
          </view>
        </view>

        <view class="card">
          <view
            v-for="(note, idx) in g.list"
            :key="note.id"
            class="note-item"
            :class="{ 'no-border': idx === 0 }"
          >
            <view class="note-top">
              <view class="note-type">
                <AppIcon
                  :name="note.type === 'highlight' ? 'highlighter' : 'pen-line'"
                  :size="28"
                  :color="note.type === 'highlight' ? C.amber : C.primary"
                />
                <text class="note-chapter">
                  {{ note.chapterTitle }}
                </text>
              </view>
              <view class="note-actions">
                <view class="act-btn">
                  <AppIcon
                    name="share-2"
                    :size="24"
                    :color="C.slate400"
                  />
                </view>
                <view
                  class="act-btn"
                  @tap="del(note.id)"
                >
                  <AppIcon
                    name="trash-2"
                    :size="24"
                    :color="C.red400"
                  />
                </view>
              </view>
            </view>

            <!-- 选中文字（带划线色） -->
            <view
              class="sel-text"
              :style="{
                background: note.highlightColor ? note.highlightColor + '40' : '#eff6ff',
                borderLeftColor: note.highlightColor || C.primary,
              }"
            >
              <text class="sel-tx">
                {{ note.selectedText }}
              </text>
            </view>

            <!-- 笔记内容 -->
            <view
              v-if="note.noteContent"
              class="note-content"
            >
              <view class="note-content-label">
                <AppIcon
                  name="pen-line"
                  :size="24"
                  :color="C.textSoft"
                />
                <text class="note-content-label-tx">
                  笔记
                </text>
              </view>
              <text class="note-content-tx">
                {{ note.noteContent }}
              </text>
            </view>

            <text class="note-time">
              {{ note.createdAt }}
            </text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import AppSkeleton from '@/components/common/app-skeleton.vue'
import AppError from '@/components/common/app-error.vue'
import AppEmpty from '@/components/common/app-empty.vue'
import { ebookNotes, type EbookNote, type EbookNoteType } from '@/lib/ebook-data'

const C = {
  text: '#1e293b', textSoft: '#64748b', primary: '#2563eb', amber: '#f59e0b',
  slate400: '#94a3b8', slate200: '#e2e8f0', red400: '#f87171',
}

type FilterType = 'all' | 'note' | 'highlight'
const filterTabs: { id: FilterType; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'note', label: '笔记' },
  { id: 'highlight', label: '划线' },
]

const isLoading = ref(false)
const loadError = ref<string | null>(null)
const isEmpty = computed(() => items.value.length === 0)
function reload() {
  loadError.value = null
}

const search = ref('')
const filter = ref<FilterType>('all')
const items = ref<EbookNote[]>([...ebookNotes])

const filtered = computed(() =>
  items.value.filter((n) => {
    const matchSearch = !search.value || n.selectedText.includes(search.value) || (n.noteContent || '').includes(search.value)
    const matchFilter = filter.value === 'all' || (n.type as EbookNoteType) === filter.value
    return matchSearch && matchFilter
  }),
)
const grouped = computed(() => {
  const map: Record<string, EbookNote[]> = {}
  filtered.value.forEach((n) => {
    if (!map[n.bookId]) map[n.bookId] = []
    map[n.bookId].push(n)
  })
  return Object.keys(map).map((bookId) => ({ bookId, book: map[bookId][0], list: map[bookId] }))
})
const groupedKeys = computed(() => grouped.value.map((g) => g.bookId))
const totalNotes = computed(() => items.value.filter((n) => n.type === 'note').length)
const totalHighlights = computed(() => items.value.filter((n) => n.type === 'highlight').length)

function del(id: string) {
  items.value = items.value.filter((n) => n.id !== id)
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
  border-radius: 16rpx;
}
.hd-title {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--ebook-text);
}
.summary {
  display: flex;
  align-items: center;
  gap: 32rpx;
  padding: 0 32rpx 24rpx;
}
.summary-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.summary-tx {
  font-size: 28rpx;
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
.filters {
  display: flex;
  gap: 16rpx;
  padding: 0 32rpx 24rpx;
}
.filter-chip {
  padding: 12rpx 28rpx;
  border-radius: 999rpx;
  background: #fff;
  border: 2rpx solid var(--ebook-border);
}
.filter-chip.active {
  background: var(--ebook-primary);
  border-color: var(--ebook-primary);
}
.filter-tx {
  font-size: 24rpx;
  font-weight: 500;
  color: var(--ebook-text-soft);
}
.filter-tx.active-tx {
  color: #fff;
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
.note-item {
  padding: 32rpx;
  border-top: 2rpx solid var(--ebook-border);
}
.note-item.no-border {
  border-top: none;
}
.note-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 16rpx;
}
.note-type {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.note-chapter {
  font-size: 24rpx;
  color: var(--ebook-text-soft);
}
.note-actions {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.act-btn {
  padding: 8rpx;
  border-radius: 8rpx;
}
.sel-text {
  padding: 16rpx 24rpx;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
  border-left: 8rpx solid;
}
.sel-tx {
  font-size: 28rpx;
  color: var(--ebook-text);
  line-height: 1.6;
}
.note-content {
  background: #f8fafc;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
}
.note-content-label {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 8rpx;
}
.note-content-label-tx {
  font-size: 24rpx;
  color: var(--ebook-text-soft);
}
.note-content-tx {
  font-size: 28rpx;
  color: var(--ebook-text);
  line-height: 1.6;
}
.note-time {
  display: block;
  font-size: 20rpx;
  color: #94a3b8;
  margin-top: 16rpx;
}
</style>
