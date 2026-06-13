<template>
  <view class="courses-page">
    <!-- 顶部栏 -->
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <text class="header-title">国学课程</text>
        <text class="header-search" @click="goSearch">🔍</text>
      </view>

      <!-- 分类筛选 -->
      <scroll-view scroll-x class="cat-scroll" :show-scrollbar="false">
        <view class="cat-row">
          <view
            v-for="cat in categories"
            :key="cat.id"
            class="cat-chip"
            :class="{ active: activeCat === cat.id }"
            @click="activeCat = cat.id; fetchCourses()"
          >
            {{ cat.label }}
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 排序栏 -->
    <view class="sort-bar">
      <view class="sort-options">
        <text
          v-for="opt in sortOptions"
          :key="opt.id"
          class="sort-item"
          :class="{ active: activeSort === opt.id }"
          @click="activeSort = opt.id; sortCourses()"
        >
          {{ opt.label }}
        </text>
      </view>
      <text class="sort-count">共 {{ totalCount }} 门课程</text>
    </view>

    <!-- Loading -->
    <view v-if="loading" class="load-area">
      <LoadingSkeleton v-for="i in 4" :key="i" type="card" />
    </view>

    <!-- Error -->
    <view v-else-if="err" class="err-area">
      <EmptyState icon="📡" title="加载失败" :description="err" action-text="重试" @action="fetchCourses" />
    </view>

    <!-- 空 -->
    <view v-else-if="courses.length === 0" class="empty-area">
      <text class="empty-icon">🎓</text>
      <text class="empty-text">该分类暂无课程</text>
    </view>

    <!-- 2列课程网格 -->
    <view v-else class="courses-grid">
      <CourseCard
        v-for="c in courses"
        :key="c.id"
        :course="c"
      />
    </view>

    <view v-if="more && !loading" class="more-btn" @click="loadMore">
      <text>加载更多</text>
    </view>
    <view class="end-line"><text>— 共 {{ totalCount }} 门课程 —</text></view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'
import { courseApi } from '../../api'
import CourseCard from '../../components/CourseCard.vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'

const categories = [
  { id: 'all', label: '全部' },
  { id: 'bazi', label: '八字命理' },
  { id: 'ziwei', label: '紫微斗数' },
  { id: 'fengshui', label: '风水堪舆' },
  { id: 'liuyao', label: '六爻预测' },
  { id: 'qimen', label: '奇门遁甲' },
  { id: 'mianxiang', label: '面相手相' },
  { id: 'qiming', label: '起名改名' },
]

const sortOptions = [
  { id: 'hot', label: '最热' },
  { id: 'new', label: '最新' },
  { id: 'price', label: '价格' },
]

interface CourseItem {
  id: string; title: string; cover?: string; intro?: string
  type?: string; price?: number; originalPrice?: number
  studentCount?: number; teacher?: string; teacherAvatar?: string
}

const activeCat = ref('all')
const activeSort = ref('hot')
const loading = ref(true)
const err = ref<string | null>(null)
const courses = ref<CourseItem[]>([])
const totalCount = ref(0)
const page = ref(1)
const more = ref(false)

function goSearch() {
  uni.navigateTo({ url: '/pages/search/index?type=course' })
}

async function fetchCourses() {
  loading.value = true; err.value = null
  try {
    const params: Record<string, any> = { page: 1, pageSize: 20 }
    if (activeCat.value !== 'all') params.category = activeCat.value
    const data = await courseApi.list(params) as any
    courses.value = Array.isArray(data) ? data : (data?.courses || data?.data || [])
    totalCount.value = data?.total || courses.value.length
    page.value = 1
    more.value = courses.value.length >= 20
    sortCourses()
  } catch (e: any) { err.value = e.errMsg || '加载失败' }
  finally { loading.value = false }
}

function sortCourses() {
  const arr = [...courses.value]
  if (activeSort.value === 'price') {
    arr.sort((a, b) => (a.price || 0) - (b.price || 0))
  } else if (activeSort.value === 'new') {
    arr.reverse()
  } else {
    arr.sort((a, b) => (b.studentCount || 0) - (a.studentCount || 0))
  }
  courses.value = arr
}

async function loadMore() {
  if (!more.value) return
  try {
    const np = page.value + 1
    const params: Record<string, any> = { page: np, pageSize: 20 }
    if (activeCat.value !== 'all') params.category = activeCat.value
    const data = await courseApi.list(params) as any
    const nb = Array.isArray(data) ? data : (data?.courses || data?.data || [])
    courses.value.push(...nb)
    page.value = np
    more.value = nb.length >= 20
    sortCourses()
  } catch { /* skip */ }
}

onMounted(() => { fetchCourses() })
onPullDownRefresh(() => {
  fetchCourses().finally(() => setTimeout(() => uni.stopPullDownRefresh(), 500))
})
</script>

<style scoped>
.courses-page {
  min-height: 100vh;
  background: #FAF8F5;
  padding-bottom: 100rpx;
}

.header-sticky {
  position: sticky;
  top: 0;
  z-index: 20;
  background: rgba(250,248,245,0.95);
  backdrop-filter: blur(12rpx);
  border-bottom: 1px solid #E8E0D5;
}
.header-row {
  display: flex;
  align-items: center;
  padding: 0 24rpx;
  height: 88rpx;
}
.header-back {
  font-size: 48rpx;
  color: #333;
  width: 64rpx;
}
.header-title {
  flex: 1;
  font-size: 34rpx;
  font-weight: 700;
  color: #2C2C2C;
}
.header-search {
  font-size: 36rpx;
  padding: 12rpx;
}

.cat-scroll {
  padding: 0 0 16rpx;
  white-space: nowrap;
}
.cat-row {
  display: flex;
  gap: 12rpx;
  padding: 0 24rpx;
}
.cat-chip {
  flex-shrink: 0;
  padding: 8rpx 24rpx;
  border-radius: 32rpx;
  font-size: 24rpx;
  color: #666;
  background: #fff;
  border: 1px solid #E8E0D5;
}
.cat-chip.active {
  background: #C41E3A;
  color: #fff;
  border-color: #C41E3A;
}

.sort-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 24rpx;
}
.sort-options {
  display: flex;
  gap: 24rpx;
}
.sort-item {
  font-size: 26rpx;
  color: #888;
}
.sort-item.active {
  color: #C41E3A;
  font-weight: 600;
}
.sort-count {
  font-size: 22rpx;
  color: #999;
}

.load-area {
  padding: 24rpx;
}
.err-area {
  padding: 80rpx 24rpx;
}
.empty-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 24rpx;
}
.empty-icon {
  font-size: 80rpx;
  margin-bottom: 16rpx;
}
.empty-text {
  font-size: 28rpx;
  color: #999;
}

.courses-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
  padding: 0 24rpx;
}

.more-btn {
  text-align: center;
  padding: 24rpx;
  font-size: 24rpx;
  color: #C9A96E;
}
.end-line {
  text-align: center;
  padding: 32rpx;
  font-size: 22rpx;
  color: #CCC;
}
</style>
