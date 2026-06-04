<template>
  <view class="page">
    <!-- 页面头部 -->
    <view class="page-header">
      <text class="page-title">课程</text>
      <text class="page-sub">发现优质国学课程</text>
    </view>

    <!-- 搜索入口 -->
    <view class="search-entry" @click="goSearch">
      <text class="search-icon">🔍</text>
      <text class="search-text">搜索课程...</text>
    </view>

    <!-- 分类 Tab -->
    <scroll-view scroll-x class="tab-scroll" show-scrollbar="false" enhanced>
      <view class="tab-list">
        <view
          v-for="cat in categories"
          :key="cat.id"
          class="tab-item"
          :class="{ active: activeCategory === cat.id }"
          @click="switchCategory(cat.id)"
        >
          <text class="tab-text">{{ cat.name }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 排序选项 -->
    <view class="sort-bar">
      <view
        v-for="s in sortOptions"
        :key="s.id"
        class="sort-item"
        :class="{ active: activeSort === s.id }"
        @click="switchSort(s.id)"
      >
        <text class="sort-text">{{ s.name }}</text>
      </view>
    </view>

    <!-- 课程列表 -->
    <DataState
      :is-loading="loading"
      :error="error"
      :is-empty="!loading && !error && courses.length === 0"
      empty-title="暂无课程"
      empty-description="该分类下还没有课程"
      skeleton-type="card"
      @retry="initLoad"
    >
      <view class="course-grid">
        <view
          v-for="c in courses"
          :key="c.id"
          class="course-card"
          @click="goDetail(c.id)"
        >
          <!-- 封面 -->
          <view class="card-cover">
            <image
              :src="c.cover"
              class="card-cover-img"
              mode="aspectFill"
              lazy-load
            />
            <!-- 价格标签 -->
            <view class="card-price-tag" :class="{ free: c.isFree || c.price === 0 }">
              <text>{{ c.isFree || c.price === 0 ? '免费' : '¥' + toYuan(c.price) }}</text>
            </view>
            <!-- 难度标签 -->
            <view v-if="c.difficulty" class="card-diff-tag">{{ diffLabel(c.difficulty) }}</view>
          </view>
          <!-- 信息 -->
          <view class="card-body">
            <text class="card-title">{{ c.title }}</text>
            <text v-if="c.instructor" class="card-instructor">{{ c.instructor }}</text>
            <view class="card-meta">
              <text class="card-students">👤 {{ formatSales(c.studentCount || 0) }}</text>
              <text v-if="c.rating" class="card-rating">★ {{ c.rating }}</text>
            </view>
            <view class="card-price-row">
              <text class="card-price" :class="{ free: c.isFree || c.price === 0 }">
                {{ c.isFree || c.price === 0 ? '免费' : '¥' + toYuan(c.price) }}
              </text>
              <text v-if="c.originalPrice && c.originalPrice > (c.price || 0)" class="card-original">
                ¥{{ toYuan(c.originalPrice) }}
              </text>
            </view>
          </view>
        </view>
      </view>

      <!-- 加载更多 -->
      <view v-if="loadingMore" class="load-more-bar">
        <text>加载中...</text>
      </view>
      <view v-if="!hasMore && courses.length > 0" class="load-more-bar">
        <text class="no-more">— 已经到底了 —</text>
      </view>
    </DataState>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import { courseApi } from '../../api'
import DataState from '../../components/DataState.vue'
import type { CourseItem, CourseCategory } from '../../types'

interface SortOption {
  id: string
  name: string
}

const categories = ref<{ id: string; name: string }[]>([{ id: '', name: '全部' }])
const activeCategory = ref('')
const sortOptions: SortOption[] = [
  { id: 'recommend', name: '综合推荐' },
  { id: 'popular', name: '最受欢迎' },
  { id: 'newest', name: '最新上架' },
  { id: 'price-asc', name: '价格最低' },
]
const activeSort = ref('recommend')
const courses = ref<CourseItem[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const loadingMore = ref(false)
const hasMore = ref(true)
const page = ref(1)
const PAGE_SIZE = 12

onMounted(() => {
  initLoad()
})

async function initLoad() {
  page.value = 1
  hasMore.value = true
  await Promise.all([fetchCategories(), fetchCourses()])
}

onPullDownRefresh(() => {
  page.value = 1
  hasMore.value = true
  fetchCourses().finally(() => {
    uni.stopPullDownRefresh()
  })
})

onReachBottom(() => {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  page.value++
  fetchCourses(true).finally(() => {
    loadingMore.value = false
  })
})

async function fetchCategories() {
  try {
    const data = await courseApi.getCategories()
    if (Array.isArray(data) && data.length > 0) {
      const list: { id: string; name: string }[] = [{ id: '', name: '全部' }]
      data.forEach((cat: CourseCategory) => {
        if (cat.id) list.push({ id: cat.id, name: cat.name })
      })
      categories.value = list
    }
  } catch {
    // 使用默认分类
  }
}

async function fetchCourses(append = false) {
  if (!append) {
    loading.value = true
    error.value = null
  }
  try {
    const params: Record<string, any> = { page: page.value, pageSize: PAGE_SIZE, sort: activeSort.value }
    if (activeCategory.value) {
      params.categoryId = activeCategory.value
    }
    const data = await courseApi.list(params)
    const list: CourseItem[] = Array.isArray(data) ? data : (data.list || data.items || data.data || [])
    if (append) {
      courses.value.push(...list)
    } else {
      courses.value = list
    }
    hasMore.value = list.length >= PAGE_SIZE
  } catch (e: any) {
    error.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function switchCategory(id: string) {
  if (activeCategory.value === id) return
  activeCategory.value = id
  page.value = 1
  hasMore.value = true
  courses.value = []
  fetchCourses()
}

function switchSort(id: string) {
  if (activeSort.value === id) return
  activeSort.value = id
  page.value = 1
  hasMore.value = true
  courses.value = []
  fetchCourses()
}

function toYuan(fen: number): string {
  return (fen / 100).toFixed(2)
}

function formatSales(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + '万'
  return String(n)
}

function diffLabel(d: string): string {
  const m: Record<string, string> = { beginner: '入门', intermediate: '进阶', advanced: '高级' }
  return m[d] || d
}

function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/courses/course-detail?id=${id}` })
}

function goSearch() {
  uni.navigateTo({ url: '/pages/search/search' })
}
</script>

<style scoped>
.page {
  background: #F5F0E8;
  min-height: 100vh;
  padding: 20rpx 20rpx 40rpx;
}

/* ===== 页面头部 ===== */
.page-header {
  margin-bottom: 16rpx;
}
.page-title {
  font-size: 44rpx;
  font-weight: bold;
  color: #C41E3A;
  font-family: 'Noto Serif SC', serif;
  letter-spacing: 4rpx;
}
.page-sub {
  font-size: 24rpx;
  color: #C9A96E;
  margin-top: 8rpx;
  display: block;
}

/* ===== 搜索入口 ===== */
.search-entry {
  display: flex;
  align-items: center;
  gap: 12rpx;
  background: #fff;
  border-radius: 40rpx;
  padding: 18rpx 28rpx;
  margin-bottom: 16rpx;
  border: 1rpx solid #E8E0D5;
}
.search-icon {
  font-size: 28rpx;
  opacity: 0.6;
}
.search-text {
  font-size: 26rpx;
  color: #bbb;
}

/* ===== 分类 Tab ===== */
.tab-scroll {
  white-space: nowrap;
  margin-bottom: 16rpx;
}
.tab-list {
  display: inline-flex;
  gap: 12rpx;
}
.tab-item {
  display: inline-flex;
  align-items: center;
  padding: 14rpx 32rpx;
  border-radius: 32rpx;
  background: #fff;
  border: 1rpx solid #E8E0D5;
  flex-shrink: 0;
}
.tab-item.active {
  background: linear-gradient(135deg, #C41E3A, #A01830);
  border-color: #C41E3A;
  box-shadow: 0 4rpx 12rpx rgba(196, 30, 58, 0.2);
}
.tab-text {
  font-size: 24rpx;
  color: #888;
  font-weight: 500;
  line-height: 1.2;
}
.tab-item.active .tab-text {
  color: #fff;
}

/* ===== 排序栏 ===== */
.sort-bar {
  display: flex;
  gap: 8rpx;
  margin-bottom: 16rpx;
  overflow-x: auto;
}
.sort-item {
  padding: 10rpx 24rpx;
  border-radius: 24rpx;
  font-size: 22rpx;
  color: #999;
  background: transparent;
  flex-shrink: 0;
}
.sort-item.active {
  background: #F5F0E8;
  color: #C41E3A;
  font-weight: 500;
}
.sort-text {
  line-height: 1.2;
}

/* ===== 课程网格 ===== */
.course-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.course-card {
  width: calc(50% - 8rpx);
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
  transition: transform 0.15s;
}
.course-card:active {
  transform: scale(0.97);
}

/* ===== 封面 ===== */
.card-cover {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  background: linear-gradient(135deg, #E8E0D5, #C9A96E);
  overflow: hidden;
}
.card-cover-img {
  width: 100%;
  height: 100%;
}
.card-price-tag {
  position: absolute;
  bottom: 10rpx;
  right: 10rpx;
  background: #C41E3A;
  color: #fff;
  font-size: 22rpx;
  font-weight: bold;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
}
.card-price-tag.free {
  background: #2e7d32;
}
.card-diff-tag {
  position: absolute;
  top: 10rpx;
  left: 10rpx;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 18rpx;
  padding: 4rpx 14rpx;
  border-radius: 6rpx;
}

/* ===== 信息 ===== */
.card-body {
  padding: 16rpx 16rpx 20rpx;
}
.card-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #2C2C2C;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  line-height: 1.4;
}
.card-instructor {
  font-size: 22rpx;
  color: #bbb;
  margin-top: 8rpx;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.card-meta {
  display: flex;
  gap: 20rpx;
  margin-top: 10rpx;
}
.card-students {
  font-size: 20rpx;
  color: #bbb;
}
.card-rating {
  font-size: 20rpx;
  color: #C9A96E;
}
.card-price-row {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
  margin-top: 10rpx;
}
.card-price {
  font-size: 30rpx;
  font-weight: bold;
  color: #C41E3A;
}
.card-price.free {
  color: #2e7d32;
  font-size: 26rpx;
}
.card-original {
  font-size: 22rpx;
  color: #bbb;
  text-decoration: line-through;
}

/* ===== 加载更多 ===== */
.load-more-bar {
  text-align: center;
  padding: 32rpx 0 40rpx;
  font-size: 24rpx;
  color: #C9A96E;
}
.load-more-bar .no-more {
  color: #ccc;
}
</style>
