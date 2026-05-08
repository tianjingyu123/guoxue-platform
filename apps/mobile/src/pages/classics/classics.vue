<template>
  <view class="page">
    <!-- 页面标题 -->
    <view class="page-header">
      <text class="page-title">古籍阅读</text>
      <text class="page-subtitle">经史子集 · 涵泳古今</text>
    </view>

    <!-- 分类标签（横向滚动） -->
    <view class="category-section">
      <scroll-view scroll-x class="category-scroll" show-scrollbar="false">
        <view class="category-inner">
          <text
            v-for="cat in categories"
            :key="cat.key"
            :class="['category-tab', { active: curCategory === cat.key }]"
            @click="selectCategory(cat.key)"
          >
            <text class="cat-icon">{{ cat.icon }}</text>
            <text class="cat-label">{{ cat.label }}</text>
          </text>
        </view>
      </scroll-view>
    </view>

    <!-- 加载骨架屏 -->
    <view v-if="loading && books.length === 0" class="books-list">
      <LoadingSkeleton type="card" />
      <LoadingSkeleton type="card" />
      <LoadingSkeleton type="card" />
    </view>

    <!-- 书籍列表 -->
    <view v-else-if="books.length > 0" class="books-list">
      <view
        v-for="book in books"
        :key="book.id"
        class="book-card"
        @click="goReader(book)"
        hover-class="book-card-hover"
      >
        <!-- 封面区域 -->
        <view class="book-cover-wrap">
          <image
            v-if="book.cover"
            :src="book.cover"
            class="book-cover"
            mode="aspectFill"
          />
          <view v-else class="book-cover-placeholder">
            <text class="placeholder-icon">&#128214;</text>
            <text class="placeholder-cat">{{ getCategoryShort(book.category) }}</text>
          </view>
        </view>

        <!-- 书籍信息 -->
        <view class="book-info">
          <text class="book-title">{{ book.title || book.name }}</text>
          <view class="book-meta-row">
            <text class="book-author">{{ book.author || '佚名' }}</text>
            <text v-if="book.dynasty" class="book-dynasty">{{ book.dynasty }}</text>
          </view>
          <view class="book-tags">
            <text v-if="book.category" class="book-cat-tag">{{ getCategoryLabel(book.category) }}</text>
          </view>
          <text class="book-intro">{{ book.intro || book.description || '暂无简介' }}</text>
          <view class="book-stats">
            <text class="stat-item" v-if="book.chapterCount">&#128196; {{ book.chapterCount }}章</text>
            <text class="stat-item" v-if="book.viewCount">&#128065; {{ book.viewCount }}阅读</text>
            <text class="stat-item" v-if="book.chapterCount">&#128214; {{ book.chapterCount }}节</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-else-if="!loading">
      <EmptyState icon="&#128214;" text="暂无古籍数据">
        <view class="empty-action">
          <button class="empty-btn" @click="refreshData">重新加载</button>
        </view>
      </EmptyState>
    </view>

    <!-- 错误状态 -->
    <view v-if="errorMsg">
      <EmptyState icon="&#9888;" :text="errorMsg">
        <view class="empty-action">
          <button class="empty-btn" @click="refreshData">重新加载</button>
        </view>
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

// ========== 分类 ==========
interface CategoryItem {
  key: string
  label: string
  icon: string
}
const categories: CategoryItem[] = [
  { key: '', label: '全部', icon: '&#128218;' },
  { key: '经', label: '经部', icon: '&#128214;' },
  { key: '史', label: '史部', icon: '&#128240;' },
  { key: '子', label: '子部', icon: '&#128300;' },
  { key: '集', label: '集部', icon: '&#127912;' },
  { key: '释', label: '释部', icon: '&#128329;' },
  { key: '道', label: '道部', icon: '&#9775;' },
]

const curCategory = ref('')
const books = ref<any[]>([])
const loading = ref(false)
const errorMsg = ref('')

function selectCategory(key: string) {
  curCategory.value = key
  books.value = []
  errorMsg.value = ''
  fetchBooks()
}

function getCategoryLabel(cat: string): string {
  const map: Record<string, string> = {
    '经': '经部',
    '史': '史部',
    '子': '子部',
    '集': '集部',
    '释': '释部',
    '道': '道部',
  }
  return map[cat] || cat
}

function getCategoryShort(cat: string): string {
  return cat || '典'
}

/** 从 API 响应中提取数组（兼容多种返回格式） */
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
    if (curCategory.value) {
      params.category = curCategory.value
    }
    const data = await classicApi.books(params)
    books.value = extractList(data, 'books')
  } catch (e: any) {
    errorMsg.value = e.errMsg || '加载失败，请检查网络连接'
    books.value = []
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

// ========== 页面生命周期 ==========
onMounted(() => {
  fetchBooks()
})

onPullDownRefresh(() => {
  errorMsg.value = ''
  fetchBooks().finally(() => {
    uni.stopPullDownRefresh()
  })
})
</script>

<style scoped>
/* ========== 页面整体 ========== */
.page {
  padding: 12px;
  background: #f5f0e6;
  min-height: 100vh;
  padding-bottom: 40px;
}

/* ========== 页头 ========== */
.page-header {
  text-align: center;
  padding: 10px 0 14px;
}
.page-title {
  font-size: 20px;
  font-weight: bold;
  color: #8b4513;
  display: block;
}
.page-subtitle {
  font-size: 12px;
  color: #b87c4b;
  margin-top: 4px;
  display: block;
}

/* ========== 分类切换 ========== */
.category-section {
  margin-bottom: 14px;
}
.category-scroll {
  width: 100%;
}
.category-inner {
  display: inline-flex;
  gap: 8px;
  padding: 2px 0;
}
.category-tab {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  background: #fff;
  border-radius: 20px;
  border: 1px solid #ede6d8;
  transition: all 0.2s;
  flex-shrink: 0;
}
.category-tab.active {
  background: linear-gradient(135deg, #8b4513, #a0522d);
  border-color: #8b4513;
}
.category-tab.active .cat-label {
  color: #fff;
  font-weight: bold;
}
.cat-icon {
  font-size: 14px;
}
.cat-label {
  font-size: 13px;
  color: #666;
}

/* ========== 书籍列表 ========== */
.books-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ========== 书籍卡片 ========== */
.book-card {
  display: flex;
  gap: 12px;
  background: #fff;
  border-radius: 12px;
  padding: 14px;
  box-shadow: 0 2px 8px rgba(139, 69, 19, 0.06);
  transition: transform 0.15s;
}
.book-card-hover {
  transform: scale(0.98);
  opacity: 0.9;
}

/* 封面 */
.book-cover-wrap {
  width: 80px;
  height: 110px;
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
  background: linear-gradient(135deg, #f5ede2, #e8ddd0);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
.placeholder-icon {
  font-size: 28px;
}
.placeholder-cat {
  font-size: 11px;
  color: #8b4513;
  font-weight: bold;
}

/* 书籍信息 */
.book-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.book-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.book-meta-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.book-author {
  font-size: 12px;
  color: #888;
}
.book-dynasty {
  font-size: 11px;
  color: #8b4513;
  background: #f5ead6;
  padding: 0 6px;
  border-radius: 4px;
}
.book-tags {
  display: flex;
  gap: 4px;
}
.book-cat-tag {
  font-size: 10px;
  color: #8b4513;
  background: #f5f0e6;
  padding: 1px 8px;
  border-radius: 8px;
  border: 1px solid #e8d5b8;
}
.book-intro {
  font-size: 12px;
  color: #999;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-top: 2px;
}
.book-stats {
  display: flex;
  gap: 10px;
  margin-top: auto;
  padding-top: 6px;
}
.stat-item {
  font-size: 11px;
  color: #bbb;
}

/* ========== 空操作 ========== */
.empty-action {
  margin-top: 12px;
  display: flex;
  justify-content: center;
}
.empty-btn {
  background: #8b4513;
  color: #fff;
  border-radius: 20px;
  padding: 8px 24px;
  font-size: 14px;
  border: none;
}
</style>
