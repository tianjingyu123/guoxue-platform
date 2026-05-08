<template>
  <view class="page">
    <!-- 顶部标题 -->
    <view class="title-row">
      <text class="title-text">课程</text>
      <text class="title-sub">{{ total }} 门课程</text>
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
          <text>{{ tab.label }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 下拉刷新提示 -->
    <view v-if="refreshing" class="refresh-tip">刷新中...</view>

    <!-- 骨架屏 -->
    <LoadingSkeleton v-if="loading && courses.length === 0" type="card" />

    <!-- 课程列表 -->
    <view v-else-if="courses.length > 0" class="course-list">
      <CourseCard v-for="c in courses" :key="c.id" :course="c" />
    </view>

    <!-- 空状态 -->
    <EmptyState v-else-if="!loading && courses.length === 0" icon="📚" text="暂无课程，敬请期待" />

    <!-- 加载更多 -->
    <view v-if="loadingMore" class="load-more">加载更多...</view>
    <view v-if="!hasMore && courses.length > 0" class="no-more">— 已全部加载 —</view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import CourseCard from '../../components/CourseCard.vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { courseApi } from '../../api'

/** 分类选项卡 */
const categoryTabs = [
  { key: '', label: '全部' },
  { key: 'video', label: '视频' },
  { key: 'audio', label: '音频' },
  { key: 'text', label: '文本' },
  { key: 'ebook', label: '电子书' },
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

onMounted(() => {
  fetchCourses(true)
})

// 切换分类
function switchTab(key: string) {
  if (currentTab.value === key) return
  currentTab.value = key
  page.value = 1
  hasMore.value = true
  fetchCourses(true)
}

// 下拉刷新
onPullDownRefresh(() => {
  refreshing.value = true
  page.value = 1
  hasMore.value = true
  fetchCourses(true).finally(() => {
    refreshing.value = false
    uni.stopPullDownRefresh()
  })
})

// 上拉加载更多
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
    if (currentTab.value) {
      params.type = currentTab.value
    }
    const data = await courseApi.list(params)
    const items: any[] = data.list || data.items || data.data || data || []
    const mapped = items
      .filter((c: any) => c && c.id)
      .map((c: any) => ({
        id: c.id,
        title: c.title,
        cover: c.cover,
        intro: c.intro || c.description,
        type: c.type,
        price: c.price ?? 0,
        originalPrice: c.originalPrice,
        studentCount: c.studentCount ?? 0,
      }))
    if (reset) {
      courses.value = mapped
    } else {
      const existIds = new Set(courses.value.map((x) => x.id))
      const news = mapped.filter((x) => !existIds.has(x.id))
      courses.value.push(...news)
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
</script>

<style>
.page {
  padding: 12px;
  background: #f5f0e6;
  min-height: 100vh;
}

/* 标题 */
.title-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 2px solid #e0d5c1;
}
.title-text {
  font-size: 20px;
  font-weight: bold;
  color: #8b4513;
}
.title-sub {
  font-size: 13px;
  color: #c4943a;
}

/* ===== 分类筛选 ===== */
.filter-scroll {
  margin: 0 -12px 12px;
  padding: 0 12px;
  white-space: nowrap;
}
.filter-list {
  display: inline-flex;
  gap: 8px;
  padding-bottom: 4px;
}
.filter-item {
  padding: 6px 16px;
  border-radius: 16px;
  font-size: 13px;
  color: #666;
  background: #fff;
  border: 1px solid #e0d5c1;
  flex-shrink: 0;
}
.filter-item.active {
  color: #fff;
  background: #8b4513;
  border-color: #8b4513;
}

/* 下拉刷新 */
.refresh-tip {
  text-align: center;
  font-size: 12px;
  color: #c4943a;
  padding: 6px 0;
}

/* 课程列表 */
.course-list {
  padding-bottom: 4px;
}

/* 加载更多 */
.load-more {
  text-align: center;
  color: #c4943a;
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
