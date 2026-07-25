<script setup lang="ts">
/**
 * 课程首页：承担“发现值得学的课”，不再同时承担完整分类检索。
 * - 顶部图标进入左侧分类浏览页
 * - 热门排行收进图标入口，避免长榜单挤占首页
 * - 课程卡统一使用真实 intro / category / lessons / teacher 等发布字段
 */
import { computed, ref } from 'vue'
import { onLoad, onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import AppLoadMore from '@/components/common/app-load-more.vue'
import LearningCourseCard from '@/components/courses/learning-course-card.vue'
import SectionHeader from '@/components/courses/section-header.vue'
import StationPinnedRail from '@/components/station/station-pinned-rail.vue'
import { navigateTo } from '@/utils/router'
import { courseApi } from '@/lib/course-data'
import { coursesListApi, courseSortOptions } from '@/lib/courses-list-data'
import { useList } from '@/composables/useList'
import type { CourseCardData } from '@/lib/card-utils'

const statusBarHeight = ref(0)
const categoryTabs = ref<{ id: string; name: string }[]>([])
const newCourses = ref<CourseCardData[]>([])
const showSortSheet = ref(false)
const activeSort = ref('recommend')
const activeSortName = computed(() =>
  courseSortOptions.find((item) => item.id === activeSort.value)?.name || '综合推荐',
)

const CATEGORY_KEYWORD: Array<{ keyword: string; icon: string }> = [
  { keyword: '风水', icon: 'compass' },
  { keyword: '八字', icon: 'scroll-text' },
  { keyword: '紫微', icon: 'star' },
  { keyword: '易', icon: 'compass' },
  { keyword: '中医', icon: 'stethoscope' },
  { keyword: '养生', icon: 'leaf' },
  { keyword: '书法', icon: 'pen-tool' },
  { keyword: '绘画', icon: 'pen-tool' },
  { keyword: '国学', icon: 'landmark' },
]

type QuickEntry = { id: string; name: string; icon: string; category?: string; sort?: string }

const quickEntries = computed<QuickEntry[]>(() => {
  const realCategories = categoryTabs.value
    .filter((item) => item.id !== 'all')
    .slice(0, 3)
    .map((item) => ({
      id: item.id,
      name: item.name,
      icon: CATEGORY_KEYWORD.find((entry) => item.name.includes(entry.keyword))?.icon || 'graduation-cap',
      category: item.id,
    }))
  return [
    { id: 'all', name: '全部课程', icon: 'layout-grid' },
    { id: 'popular', name: '热门排行', icon: 'flame', sort: 'popular' },
    ...realCategories,
  ]
})

const { list: courses, loading, error, loadStatus, refresh, loadMore } = useList<
  CourseCardData & { category: string; free: boolean },
  { sort: string }
>({
  fetcher: ({ page, pageSize, sort }) =>
    coursesListApi.list({ page, pageSize, sort }),
  getParams: () => ({ sort: activeSort.value }),
})

function entryLabel(name: string) {
  return name.length > 6 ? `${name.slice(0, 5)}…` : name
}

async function loadHeader() {
  const [home, tabs] = await Promise.all([
    courseApi.getHome(),
    coursesListApi.getCategoryTabs(),
  ])
  newCourses.value = (home.newCourses || []).slice(0, 4)
  categoryTabs.value = tabs.length ? tabs : [{ id: 'all', name: '全部' }]
}

onLoad(() => {
  uni.getSystemInfo({
    success: (info) => { statusBarHeight.value = info.statusBarHeight || 0 },
  })
  loadHeader().catch(() => {
    categoryTabs.value = [{ id: 'all', name: '全部' }]
  })
  refresh()
})

onReachBottom(() => loadMore())

onPullDownRefresh(async () => {
  try {
    await Promise.all([loadHeader(), refresh()])
  } finally {
    uni.stopPullDownRefresh()
  }
})

function openCatalog(entry: QuickEntry) {
  const params: string[] = []
  if (entry.category) params.push(`category=${encodeURIComponent(entry.category)}`)
  if (entry.sort) params.push(`sort=${entry.sort}`)
  navigateTo(`/courses/catalog${params.length ? `?${params.join('&')}` : ''}`)
}

function selectSort(id: string) {
  activeSort.value = id
  showSortSheet.value = false
  refresh()
}

function openSearch() { navigateTo('/search') }
function openMyLearning() { navigateTo('/courses/my-learning') }
</script>

<template>
  <view class="page">
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view>
        <text class="nav-title serif">课程</text>
        <text class="nav-subtitle">找到适合自己的学习主线</text>
      </view>
      <view class="nav-icons">
        <view class="nav-btn" hover-class="btn-press" @tap="openSearch">
          <app-icon name="search" :size="38" color="#2B2723" />
        </view>
        <view class="nav-btn" hover-class="btn-press" @tap="openMyLearning">
          <app-icon name="book-open" :size="38" color="#2B2723" />
        </view>
      </view>
    </view>

    <view v-if="error" class="state-wrap">
      <app-icon name="alert-circle" :size="56" color="#C41E3A" />
      <text class="state-text">{{ error }}</text>
      <view class="retry-btn" @tap="refresh"><text class="retry-text">重新加载</text></view>
    </view>

    <view v-else-if="loading" class="body">
      <view class="quick-skeleton">
        <view v-for="n in 5" :key="n" class="quick-skeleton-item">
          <view class="skeleton skeleton-icon" />
          <view class="skeleton skeleton-label" />
        </view>
      </view>
      <view v-for="n in 2" :key="`card-${n}`" class="card-skeleton">
        <view class="skeleton skeleton-cover" />
        <view class="skeleton skeleton-line" />
        <view class="skeleton skeleton-line short" />
      </view>
    </view>

    <view v-else class="body">
      <view class="quick-shell">
        <view class="quick-head">
          <view>
            <text class="quick-title serif">从这里开始学</text>
            <text class="quick-sub">按主题浏览，也可以直接看全站热门</text>
          </view>
          <view class="quick-mark"><app-icon name="sparkles" :size="26" color="#B88A44" /></view>
        </view>
        <view class="quick-grid">
          <view
            v-for="entry in quickEntries"
            :key="entry.id"
            class="quick-item"
            hover-class="btn-press"
            @tap="openCatalog(entry)"
          >
            <view class="quick-icon" :class="{ hot: entry.id === 'popular' }">
              <app-icon :name="entry.icon" :size="40" :color="entry.id === 'popular' ? '#C41E3A' : '#2D7C6F'" />
            </view>
            <text class="quick-label" :aria-label="entry.name">{{ entryLabel(entry.name) }}</text>
          </view>
        </view>
      </view>

      <view v-if="newCourses.length" class="section">
        <view class="section-heading">
          <section-header icon="sparkles" title="新上架" subtitle="新内容 · 新方法" icon-color="#2D7C6F" />
          <view class="section-more" @tap="openCatalog({ id: 'newest', name: '新上架', icon: 'sparkles', sort: 'newest' })">
            <text>查看全部</text><app-icon name="arrow-right" :size="22" color="#8B7B64" />
          </view>
        </view>
        <view class="new-grid">
          <learning-course-card
            v-for="course in newCourses"
            :key="course.id"
            :data="course"
            variant="grid"
          />
        </view>
      </view>

      <station-pinned-rail board="course" :inset="false" />

      <view class="section all-section">
        <view class="all-heading">
          <view>
            <text class="all-title serif">全部课程</text>
            <text class="all-subtitle">按自己的节奏，选一门真正学完</text>
          </view>
          <view class="sort-button" hover-class="btn-press" @tap="showSortSheet = true">
            <text>{{ activeSortName }}</text>
            <app-icon name="chevron-down" :size="23" color="#6C6257" />
          </view>
        </view>

        <view v-if="!courses.length" class="empty">
          <app-icon name="book-open" :size="58" color="#B88A44" />
          <text class="empty-title serif">暂时没有可展示的课程</text>
          <text class="empty-desc">新课程正在整理，稍后再来看看</text>
        </view>

        <view v-else class="course-list">
          <learning-course-card
            v-for="course in courses"
            :key="course.id"
            :data="course"
            variant="list"
          />
          <app-load-more :status="loadStatus" />
        </view>
      </view>
    </view>

    <view v-if="showSortSheet" class="sheet-mask" @tap="showSortSheet = false">
      <view class="sheet" @tap.stop>
        <view class="sheet-head">
          <text class="sheet-title serif">选择课程排序</text>
          <view class="sheet-close" @tap="showSortSheet = false">
            <app-icon name="x" :size="30" color="#8B7B64" />
          </view>
        </view>
        <view
          v-for="option in courseSortOptions"
          :key="option.id"
          class="sheet-option"
          :class="{ active: activeSort === option.id }"
          @tap="selectSort(option.id)"
        >
          <text>{{ option.name }}</text>
          <app-icon v-if="activeSort === option.id" name="check" :size="28" color="#C41E3A" />
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; padding-bottom: 48rpx; background: #faf8f4; }
.serif { font-family: "Songti SC", "STSong", "SimSun", serif; }
.btn-press { transform: scale(.97); opacity: .85; }
.nav {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22rpx 36rpx 18rpx;
  border-bottom: 1rpx solid rgba(139, 107, 72, .08);
  background: rgba(250, 248, 244, .96);
  backdrop-filter: blur(18px);
}
.nav-title { display: block; color: #24211f; font-size: 43rpx; font-weight: 800; letter-spacing: 2rpx; }
.nav-subtitle { display: block; margin-top: 3rpx; color: #8c8278; font-size: 21rpx; }
.nav-icons { display: flex; align-items: center; gap: 16rpx; }
.nav-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid rgba(137, 103, 63, .12);
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 6rpx 18rpx rgba(62, 42, 25, .05);
}
.body { padding: 24rpx 32rpx 48rpx; display: flex; flex-direction: column; gap: 38rpx; }
.quick-shell {
  overflow: hidden;
  padding: 26rpx 22rpx 22rpx;
  border: 1rpx solid rgba(184, 138, 68, .16);
  border-radius: 28rpx;
  background:
    radial-gradient(circle at 100% 0, rgba(184, 138, 68, .13), transparent 35%),
    linear-gradient(145deg, #fffefb, #f8f2e9);
  box-shadow: 0 10rpx 28rpx rgba(62, 42, 25, .05);
}
.quick-head { display: flex; align-items: flex-start; justify-content: space-between; padding: 0 6rpx 22rpx; }
.quick-title { display: block; color: #2b2723; font-size: 31rpx; font-weight: 800; }
.quick-sub { display: block; margin-top: 5rpx; color: #948a7e; font-size: 21rpx; }
.quick-mark {
  width: 48rpx; height: 48rpx; display: flex; align-items: center; justify-content: center;
  border-radius: 50%; background: rgba(184, 138, 68, .1);
}
.quick-grid { display: flex; align-items: flex-start; }
.quick-item { width: 20%; display: flex; flex-direction: column; align-items: center; gap: 10rpx; }
.quick-icon {
  width: 78rpx; height: 78rpx; display: flex; align-items: center; justify-content: center;
  border: 1rpx solid rgba(45, 124, 111, .16); border-radius: 23rpx;
  background: linear-gradient(145deg, #fff, #eef7f3);
  box-shadow: 0 5rpx 14rpx rgba(45, 124, 111, .07);
}
.quick-icon.hot {
  border-color: rgba(196, 30, 58, .15);
  background: linear-gradient(145deg, #fff, #fff0f2);
  box-shadow: 0 5rpx 14rpx rgba(196, 30, 58, .07);
}
.quick-label {
  width: 100%; overflow: hidden; white-space: nowrap; text-align: center; text-overflow: ellipsis;
  color: #5f574e; font-size: 21rpx;
}
.section { display: flex; flex-direction: column; gap: 20rpx; }
.section-heading { display: flex; align-items: center; justify-content: space-between; }
.section-more { display: flex; align-items: center; gap: 4rpx; color: #8b7b64; font-size: 21rpx; }
.new-grid { display: flex; flex-wrap: wrap; gap: 18rpx; }
.new-grid :deep(.learning-card) { width: calc(50% - 9rpx); box-sizing: border-box; }
.all-section { padding-top: 4rpx; }
.all-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 18rpx; }
.all-title { display: block; color: #24211f; font-size: 34rpx; font-weight: 800; }
.all-subtitle { display: block; margin-top: 5rpx; color: #948a7e; font-size: 21rpx; }
.sort-button {
  flex-shrink: 0; display: flex; align-items: center; gap: 6rpx;
  padding: 12rpx 18rpx; border: 1rpx solid rgba(137, 103, 63, .12); border-radius: 999rpx;
  background: #fff; color: #6c6257; font-size: 22rpx;
}
.course-list { display: flex; flex-direction: column; gap: 20rpx; }
.empty { min-height: 360rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14rpx; }
.empty-title { color: #3c3630; font-size: 29rpx; font-weight: 700; }
.empty-desc { color: #999087; font-size: 23rpx; }
.state-wrap { min-height: 65vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18rpx; padding: 40rpx; }
.state-text { color: #7f756b; font-size: 25rpx; text-align: center; }
.retry-btn { padding: 14rpx 32rpx; border-radius: 999rpx; background: #c41e3a; }
.retry-text { color: #fff; font-size: 24rpx; }
.sheet-mask { position: fixed; inset: 0; z-index: 80; display: flex; align-items: flex-end; background: rgba(30, 25, 22, .42); }
.sheet {
  width: 100%; padding: 30rpx 34rpx calc(34rpx + env(safe-area-inset-bottom)); box-sizing: border-box;
  border-radius: 34rpx 34rpx 0 0; background: #fffdfa;
}
.sheet-head { display: flex; align-items: center; justify-content: space-between; padding-bottom: 18rpx; }
.sheet-title { color: #292522; font-size: 31rpx; font-weight: 700; }
.sheet-close { width: 60rpx; height: 60rpx; display: flex; align-items: center; justify-content: center; }
.sheet-option {
  min-height: 86rpx; display: flex; align-items: center; justify-content: space-between;
  border-top: 1rpx solid rgba(143, 108, 66, .12); color: #60574e; font-size: 27rpx;
}
.sheet-option.active { color: #c41e3a; font-weight: 700; }
.skeleton { position: relative; overflow: hidden; border-radius: 12rpx; background: #eee8df; }
.skeleton::after {
  content: ""; position: absolute; inset: 0; transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.75), transparent);
  animation: shimmer 1.35s infinite;
}
@keyframes shimmer { to { transform: translateX(100%); } }
.quick-skeleton { display: flex; justify-content: space-between; padding: 24rpx; }
.quick-skeleton-item { width: 19%; display: flex; flex-direction: column; align-items: center; gap: 12rpx; }
.skeleton-icon { width: 78rpx; height: 78rpx; border-radius: 22rpx; }
.skeleton-label { width: 80%; height: 20rpx; }
.card-skeleton { overflow: hidden; padding-bottom: 24rpx; border-radius: 26rpx; background: #fff; }
.skeleton-cover { width: 100%; padding-top: 40%; border-radius: 0; }
.skeleton-line { width: 80%; height: 28rpx; margin: 22rpx 24rpx 0; }
.skeleton-line.short { width: 48%; }
</style>
