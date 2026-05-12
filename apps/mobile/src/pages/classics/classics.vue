<template>
  <view class="page">
    <!-- 页面标题 -->
    <view class="page-header">
      <text class="page-title">古籍阅读</text>
      <text class="page-subtitle">经史子集 · 涵泳古今</text>
    </view>

    <!-- 分类 + 排序 -->
    <view class="toolbar">
      <scroll-view scroll-x class="category-scroll" show-scrollbar="false">
        <view class="category-inner">
          <text
            v-for="cat in categories"
            :key="cat.key"
            :class="['category-tab', { active: curCategory === cat.key }]"
            @click="selectCategory(cat.key)"
          >
            <text class="cat-label">{{ cat.icon }} {{ cat.label }}</text>
            <text v-if="cat.count != null" class="cat-count">{{ cat.count }}</text>
          </text>
        </view>
      </scroll-view>
    </view>

    <!-- 加载骨架 -->
    <view v-if="loading && books.length === 0" class="books-list">
      <view v-for="i in 4" :key="i" class="book-card-skeleton">
        <view class="sk-cover" />
        <view class="sk-body">
          <view class="sk-line w80" />
          <view class="sk-line w50" />
          <view class="sk-line w90" />
        </view>
      </view>
    </view>

    <!-- 书籍列表 -->
    <view v-else-if="books.length > 0" class="books-list">
      <view
        v-for="book in books"
        :key="book.id"
        class="book-card"
        @click="goReader(book)"
      >
        <!-- 封面 -->
        <view class="book-cover-wrap">
          <image
            v-if="book.cover"
            :src="book.cover"
            class="book-cover"
            mode="aspectFill"
          />
          <view v-else class="book-cover-placeholder" :style="{ background: placeholderBg(book.id) }">
            <text class="plc-cat">{{ getCategoryShort(book.category) }}</text>
            <text class="plc-name">{{ (book.title || book.name || '经').charAt(0) }}</text>
          </view>
        </view>

        <!-- 信息 -->
        <view class="book-body">
          <view class="book-top">
            <text class="book-title">{{ book.title || book.name }}</text>
            <text v-if="book.category" class="book-cat-tag">{{ getCategoryLabel(book.category) }}</text>
          </view>
          <view class="book-meta">
            <text class="book-author">{{ book.author || '佚名' }}</text>
            <text v-if="book.dynasty" class="book-dynasty">{{ book.dynasty }}</text>
          </view>
          <text class="book-intro">{{ book.intro || book.description || '暂无简介' }}</text>
          <view class="book-stats">
            <text v-if="book.chapterCount" class="bstat">📖 {{ book.chapterCount }} 章</text>
            <text v-if="book.viewCount" class="bstat">👁 {{ formatNum(book.viewCount) }}</text>
          </view>

          <!-- 阅读进度 -->
          <view v-if="book.progress" class="book-progress">
            <view class="bp-bar-bg">
              <view class="bp-bar-fill" :style="{ width: book.progress + '%' }" />
            </view>
            <text class="bp-text">已读 {{ book.progress }}%</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-else-if="!loading">
      <EmptyState icon="📜" text="暂无古籍数据">
        <button class="empty-btn" @click="refreshData">重新加载</button>
      </EmptyState>
    </view>

    <!-- 错误状态 -->
    <view v-if="errorMsg">
      <EmptyState icon="⚠️" :text="errorMsg">
        <button class="empty-btn" @click="refreshData">重新加载</button>
      </EmptyState>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'
import { classicApi } from '../../api'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'

interface CategoryItem {
  key: string
  label: string
  icon: string
  count?: number
}
const categories: CategoryItem[] = [
  { key: '', label: '全部', icon: '📚' },
  { key: '经', label: '经部', icon: '📖' },
  { key: '史', label: '史部', icon: '📰' },
  { key: '子', label: '子部', icon: '🔬' },
  { key: '集', label: '集部', icon: '🎨' },
  { key: '释', label: '释部', icon: '🕯️' },
  { key: '道', label: '道部', icon: '☯️' },
]

const placeholderGradients = [
  'linear-gradient(135deg, #E8E0D5, #C9A96E)',
  'linear-gradient(135deg, #d8cdc0, #c8bca8)',
  'linear-gradient(135deg, #eddcc8, #daccb0)',
  'linear-gradient(135deg, #e0cfb8, #d0bfa5)',
  'linear-gradient(135deg, #e5d5c0, #d5c5b0)',
]
function placeholderBg(id: string): string {
  let hash = 0
  for (let i = 0; i < (id || '0').length; i++) {
    hash = (hash * 31 + (id || '0').charCodeAt(i)) & 0xffff
  }
  return placeholderGradients[hash % placeholderGradients.length]
}

const curCategory = ref('')
const books = ref<any[]>([])
const loading = ref(false)
const errorMsg = ref('')

function formatNum(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + 'w'
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(n)
}

function selectCategory(key: string) {
  curCategory.value = key
  books.value = []
  errorMsg.value = ''
  fetchBooks()
}

function getCategoryLabel(cat: string): string {
  const map: Record<string, string> = {
    '经': '经部', '史': '史部', '子': '子部',
    '集': '集部', '释': '释部', '道': '道部',
  }
  return map[cat] || cat
}

function getCategoryShort(cat: string): string {
  return cat || '典'
}

function extractList(data: any, key: string): any[] {
  if (Array.isArray(data)) return data
  if (data?.[key] && Array.isArray(data[key])) return data[key]
  if (data?.data && Array.isArray(data.data)) return data.data
  if (data?.list && Array.isArray(data.list)) return data.list
  if (data?.items && Array.isArray(data.items)) return data.items
  return []
}

async function fetchBooks() {
  loading.value = true
  errorMsg.value = ''
  try {
    const params: Record<string, any> = {}
    if (curCategory.value) params.category = curCategory.value

    const [booksData, progressData] = await Promise.all([
      classicApi.books(params).catch(() => []),
      // 尝试获取阅读进度（如果登录了）
      classicApi.myProgress?.().catch(() => ({})) || Promise.resolve({}),
    ])

    const rawBooks = extractList(booksData, 'books')
    const progressMap: Record<string, number> = {}
    if (progressData?.progresses) {
      for (const p of progressData.progresses) {
        progressMap[p.bookId || p.classicId] = p.progress || 0
      }
    }

    books.value = rawBooks.map((b: any) => ({
      id: b.id,
      title: b.title || b.name,
      name: b.name || b.title,
      cover: b.cover,
      author: b.author,
      dynasty: b.dynasty,
      category: b.category,
      intro: b.intro || b.description,
      description: b.description,
      chapterCount: b.chapterCount,
      viewCount: b.viewCount,
      progress: progressMap[b.id] || 0,
    }))

    // 更新分类计数
    if (!curCategory.value && rawBooks.length > 0) {
      const catCounts: Record<string, number> = {}
      for (const b of rawBooks) {
        if (b.category) {
          catCounts[b.category] = (catCounts[b.category] || 0) + 1
        }
      }
      for (const cat of categories) {
        if (cat.key) cat.count = catCounts[cat.key] || 0
      }
    }
  } catch (e: any) {
    errorMsg.value = e.errMsg || '加载失败，请检查网络连接'
  } finally {
    loading.value = false
  }
}

function refreshData() {
  books.value = []
  errorMsg.value = ''
  fetchBooks()
}

function goReader(book: any) {
  uni.navigateTo({
    url: `/pages/reader/reader?bookId=${book.id}`,
  })
}

onMounted(() => {
  fetchBooks()
})

onPullDownRefresh(() => {
  errorMsg.value = ''
  fetchBooks().finally(() => uni.stopPullDownRefresh())
})
</script>

<style>
.page {
  padding: 0;
  background: #F5F0E8;
  min-height: 100vh;
  padding-bottom: 40px;
}

/* ===== 页头 ===== */
.page-header {
  text-align: center;
  padding: 20px 0 10px;
}
.page-title {
  font-size: 24px;
  font-weight: bold;
  color: #C41E3A;
  display: block;
  font-family: 'Noto Serif SC', serif;
  letter-spacing: 4px;
}
.page-subtitle {
  font-size: 13px;
  color: #C9A96E;
  margin-top: 6px;
  display: block;
  letter-spacing: 2px;
}

/* ===== 分类标签 ===== */
.toolbar {
  padding: 0 12px;
  margin-bottom: 12px;
}
.category-scroll {
  width: 100%;
}
.category-inner {
  display: inline-flex;
  gap: 6px;
  padding: 2px 0;
}
.category-tab {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 7px 14px;
  background: #fff;
  border-radius: 18px;
  border: 1px solid #E8E0D5;
  transition: all 0.2s;
  flex-shrink: 0;
  font-size: 13px;
}
.category-tab.active {
  background: linear-gradient(135deg, #C41E3A, #8B0000);
  border-color: #C41E3A;
  box-shadow: 0 2px 8px rgba(196, 30, 58, 0.2);
}
.category-tab.active .cat-label {
  color: #fff;
  font-weight: 600;
}
.category-tab.active .cat-count {
  color: rgba(255, 255, 255, 0.7);
}
.cat-label {
  color: #666;
}
.cat-count {
  font-size: 10px;
  color: #bbb;
  background: rgba(0, 0, 0, 0.05);
  padding: 1px 6px;
  border-radius: 8px;
}

/* ===== 书籍列表 ===== */
.books-list {
  padding: 0 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* ===== 骨架屏 ===== */
.book-card-skeleton {
  display: flex;
  gap: 12px;
  background: #fff;
  border-radius: 10px;
  padding: 14px;
}
.sk-cover {
  width: 72px;
  height: 96px;
  border-radius: 6px;
  background: #E8E0D5;
  flex-shrink: 0;
  animation: shimmer 1.5s infinite;
}
.sk-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 4px;
}
.sk-line {
  height: 14px;
  border-radius: 4px;
  background: #E8E0D5;
  animation: shimmer 1.5s infinite;
}
.sk-line.w80 { width: 80%; }
.sk-line.w50 { width: 50%; }
.sk-line.w90 { width: 90%; }

@keyframes shimmer {
  0% { opacity: 0.5; }
  50% { opacity: 1; }
  100% { opacity: 0.5; }
}

/* ===== 书籍卡片 ===== */
.book-card {
  display: flex;
  gap: 12px;
  background: #fff;
  border-radius: 10px;
  padding: 14px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  transition: transform 0.15s;
}
.book-card:active {
  transform: scale(0.985);
}

/* 封面 */
.book-cover-wrap {
  width: 72px;
  height: 96px;
  flex-shrink: 0;
  border-radius: 6px;
  overflow: hidden;
}
.book-cover {
  width: 100%;
  height: 100%;
}
.book-cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}
.plc-cat {
  font-size: 18px;
}
.plc-name {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.4);
  font-weight: bold;
}

/* 信息 */
.book-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.book-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.book-title {
  font-size: 16px;
  font-weight: bold;
  color: #2C2C2C;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.book-cat-tag {
  font-size: 10px;
  color: #C9A96E;
  background: rgba(201, 169, 110, 0.08);
  padding: 1px 8px;
  border-radius: 8px;
  flex-shrink: 0;
  font-weight: 500;
}
.book-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.book-author {
  font-size: 12px;
  color: #888;
}
.book-dynasty {
  font-size: 11px;
  color: #C41E3A;
  background: #F5F0E8;
  padding: 0 6px;
  border-radius: 3px;
}
.book-intro {
  font-size: 12px;
  color: #999;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}
.book-stats {
  display: flex;
  gap: 12px;
  margin-top: 6px;
}
.bstat {
  font-size: 11px;
  color: #bbb;
}

/* 阅读进度 */
.book-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}
.bp-bar-bg {
  flex: 1;
  height: 4px;
  background: #E8E0D5;
  border-radius: 2px;
  overflow: hidden;
}
.bp-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #C9A96E, #C41E3A);
  border-radius: 2px;
}
.bp-text {
  font-size: 10px;
  color: #C9A96E;
  flex-shrink: 0;
}

/* ===== 空操作 ===== */
.empty-btn {
  background: #C41E3A;
  color: #fff;
  border-radius: 20px;
  padding: 8px 24px;
  font-size: 14px;
  border: none;
  margin-top: 12px;
}
</style>
