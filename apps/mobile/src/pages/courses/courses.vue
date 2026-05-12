<template>
  <view class="page">
    <!-- 页面标题 -->
    <view class="page-header">
      <text class="page-title">课程</text>
      <text class="page-sub">发现优质国学课程</text>
    </view>

    <!-- 搜索入口 -->
    <view class="search-entry" @click="goSearch">
      <text class="search-icon">🔍</text>
      <text class="search-text">搜索课程...</text>
    </view>

    <!-- 分类筛选 -->
    <scroll-view class="filter-scroll" scroll-x show-scrollbar="false">
      <view class="filter-list">
        <view
          v-for="tab in categoryTabs"
          :key="tab.key"
          class="filter-item"
          :class="{ active: currentTab === tab.key }"
          @click="switchTab(tab.key)"
        >
          <text>{{ tab.icon }} {{ tab.label }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 下拉刷新 -->
    <view v-if="refreshing" class="refresh-tip">刷新中...</view>

    <!-- 骨架屏 -->
    <view v-if="loading && courses.length === 0" class="course-list">
      <view v-for="i in 4" :key="i" class="course-card-skeleton">
        <view class="sk-cover" />
        <view class="sk-body">
          <view class="sk-line w80" />
          <view class="sk-line w50" />
        </view>
      </view>
    </view>

    <!-- 课程列表 -->
    <view v-else-if="courses.length > 0" class="course-list">
      <view
        v-for="c in courses"
        :key="c.id"
        class="course-card"
        @click="goDetail(c)"
      >
        <!-- 封面 -->
        <view class="card-cover">
          <image v-if="c.cover" :src="c.cover" class="card-cover-img" mode="aspectFill" />
          <view v-else class="card-cover-plc">
            <text class="plc-icon">📚</text>
          </view>
          <!-- 价格标签 -->
          <view class="card-price-tag" :class="{ free: c.price === 0 }">
            <text>{{ c.price > 0 ? '¥' + c.price : '免费' }}</text>
          </view>
          <!-- 类型标签 -->
          <view v-if="c.type" class="card-type-tag">
            <text>{{ typeLabel(c.type) }}</text>
          </view>
        </view>

        <!-- 信息 -->
        <view class="card-body">
          <text class="card-title">{{ c.title }}</text>
          <text class="card-intro">{{ c.intro || c.description || '暂无简介' }}</text>
          <view class="card-footer">
            <text class="card-students">👤 {{ formatNum(c.studentCount || 0) }} 学员</text>
            <text v-if="c.rating" class="card-rating">⭐ {{ c.rating }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <EmptyState v-else-if="!loading && courses.length === 0" icon="📚" text="暂无课程" />

    <!-- 加载更多 -->
    <view v-if="loadingMore" class="load-more">加载中...</view>
    <view v-if="!hasMore && courses.length > 0" class="no-more">— 已全部加载 —</view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { courseApi } from '../../api'

const categoryTabs = [
  { key: '', label: '全部', icon: '📋' },
  { key: 'video', label: '视频', icon: '🎬' },
  { key: 'audio', label: '音频', icon: '🎧' },
  { key: 'text', label: '文本', icon: '📝' },
  { key: 'ebook', label: '电子书', icon: '📖' },
]

const currentTab = ref('')
const courses = ref<any[]>([])
const total = ref(0)
const loading = ref(false)
const loadingMore = ref(false)
const refreshing = ref(false)
const hasMore = ref(true)
const page = ref(1)
const pageSize = 10

function formatNum(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + '万'
  return String(n)
}

function typeLabel(t: string): string {
  const m: Record<string, string> = { video: '视频', audio: '音频', text: '文本', ebook: '电子书' }
  return m[t] || t
}

onMounted(() => {
  fetchCourses(true)
})

function switchTab(key: string) {
  if (currentTab.value === key) return
  currentTab.value = key
  page.value = 1
  hasMore.value = true
  fetchCourses(true)
}

onPullDownRefresh(() => {
  refreshing.value = true
  page.value = 1
  hasMore.value = true
  fetchCourses(true).finally(() => {
    refreshing.value = false
    uni.stopPullDownRefresh()
  })
})

onReachBottom(() => {
  if (!hasMore.value || loadingMore.value) return
  loadingMore.value = true
  page.value++
  fetchCourses(false).finally(() => {
    loadingMore.value = false
  })
})

async function fetchCourses(reset: boolean) {
  if (reset) loading.value = true
  try {
    const params: Record<string, any> = { page: page.value, pageSize }
    if (currentTab.value) params.type = currentTab.value
    const data = await courseApi.list(params)
    const items: any[] = data.list || data.items || data.data || data || []
    const mapped = items
      .filter((c: any) => c && c.id)
      .map((c: any) => ({
        id: c.id,
        title: c.title,
        cover: c.cover,
        intro: c.intro || c.description,
        description: c.description,
        type: c.type,
        price: c.price ?? 0,
        originalPrice: c.originalPrice,
        studentCount: c.studentCount ?? 0,
        rating: c.rating,
      }))
    if (reset) {
      courses.value = mapped
    } else {
      const existIds = new Set(courses.value.map((x) => x.id))
      for (const m of mapped) {
        if (!existIds.has(m.id)) courses.value.push(m)
      }
    }
    total.value = data.total ?? courses.value.length
    hasMore.value = mapped.length >= pageSize
  } catch {
    if (reset) courses.value = []
    hasMore.value = false
  } finally {
    if (reset) loading.value = false
  }
}

function goDetail(c: any) {
  uni.navigateTo({ url: `/pages/courses/course-detail?id=${c.id}` })
}

function goSearch() {
  uni.navigateTo({ url: '/pages/search/search' })
}
</script>

<style>
.page {
  padding: 12px;
  background: #F5F0E8;
  min-height: 100vh;
  padding-bottom: 40px;
}

/* 页面标题 */
.page-header {
  margin-bottom: 12px;
}
.page-title {
  font-size: 24px;
  font-weight: bold;
  color: #C41E3A;
  font-family: 'Noto Serif SC', serif;
  letter-spacing: 2px;
}
.page-sub {
  font-size: 13px;
  color: #C9A96E;
  margin-top: 4px;
  display: block;
}

/* 搜索入口 */
.search-entry {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  border-radius: 22px;
  padding: 10px 16px;
  margin-bottom: 12px;
  border: 1px solid #E8E0D5;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}
.search-icon {
  font-size: 15px;
  opacity: 0.6;
}
.search-text {
  font-size: 14px;
  color: #bbb;
}

/* 分类筛选 */
.filter-scroll {
  margin-bottom: 12px;
  white-space: nowrap;
}
.filter-list {
  display: inline-flex;
  gap: 8px;
}
.filter-item {
  padding: 7px 16px;
  border-radius: 18px;
  font-size: 13px;
  color: #888;
  background: #fff;
  border: 1px solid #E8E0D5;
  flex-shrink: 0;
}
.filter-item.active {
  color: #fff;
  background: linear-gradient(135deg, #C41E3A, #8B0000);
  border-color: #C41E3A;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(196, 30, 58, 0.2);
}

/* 下拉刷新 */
.refresh-tip {
  text-align: center;
  font-size: 12px;
  color: #C9A96E;
  padding: 4px 0;
}

/* 骨架屏 */
.course-card-skeleton {
  display: flex;
  gap: 12px;
  background: #fff;
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 10px;
}
.sk-cover {
  width: 100px;
  height: 70px;
  border-radius: 8px;
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
.w80 { width: 80%; }
.w50 { width: 50%; }

@keyframes shimmer {
  0% { opacity: 0.5; }
  50% { opacity: 1; }
  100% { opacity: 0.5; }
}

/* 课程列表 */
.course-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 课程卡片 */
.course-card {
  display: flex;
  gap: 12px;
  background: #fff;
  border-radius: 10px;
  padding: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  transition: transform 0.15s;
}
.course-card:active {
  transform: scale(0.985);
}

/* 封面 */
.card-cover {
  width: 110px;
  height: 74px;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  flex-shrink: 0;
}
.card-cover-img {
  width: 100%;
  height: 100%;
}
.card-cover-plc {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #E8E0D5, #C9A96E);
  display: flex;
  align-items: center;
  justify-content: center;
}
.plc-icon {
  font-size: 28px;
}
.card-price-tag {
  position: absolute;
  bottom: 4px;
  right: 4px;
  background: #C41E3A;
  color: #fff;
  font-size: 11px;
  font-weight: bold;
  padding: 1px 8px;
  border-radius: 4px;
}
.card-price-tag.free {
  background: #2e7d32;
  font-size: 10px;
}
.card-type-tag {
  position: absolute;
  top: 4px;
  left: 4px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 9px;
  padding: 1px 6px;
  border-radius: 3px;
}

/* 课程信息 */
.card-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #2C2C2C;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.card-intro {
  font-size: 12px;
  color: #999;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
  margin-top: 4px;
}
.card-footer {
  display: flex;
  gap: 14px;
  margin-top: 6px;
}
.card-students {
  font-size: 11px;
  color: #bbb;
}
.card-rating {
  font-size: 11px;
  color: #C9A96E;
}

/* 加载更多 */
.load-more {
  text-align: center;
  color: #C9A96E;
  padding: 16px 0;
  font-size: 13px;
}
.no-more {
  text-align: center;
  color: #ccc;
  padding: 16px 0;
  font-size: 12px;
}
</style>
