<script setup lang="ts">
/**
 * 课程分类浏览：左侧固定分类、右侧课程列表。
 * “全部课程 / 热门排行 / 首页分类图标”统一进入此页，避免首页重复承担检索职责。
 */
import { computed, ref } from 'vue'
import { onLoad, onReachBottom, onPullDownRefresh } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import AppLoadMore from '@/components/common/app-load-more.vue'
import LearningCourseCard from '@/components/courses/learning-course-card.vue'
import { goBack } from '@/utils/router'
import { coursesListApi, courseSortOptions } from '@/lib/courses-list-data'
import { useList } from '@/composables/useList'
import type { CourseCardData } from '@/lib/card-utils'

const statusBarHeight = ref(0)
const categories = ref<{ id: string; name: string }[]>([])
const activeCategory = ref('all')
const activeSort = ref('recommend')
const keyword = ref('')
const showSort = ref(false)

const activeCategoryName = computed(() =>
  categories.value.find((item) => item.id === activeCategory.value)?.name || '全部课程',
)
const activeSortName = computed(() =>
  courseSortOptions.find((item) => item.id === activeSort.value)?.name || '综合推荐',
)

const { list, loading, error, loadStatus, refresh, loadMore } = useList<
  CourseCardData & { category: string; free: boolean },
  { category: string; sort: string; keyword: string }
>({
  fetcher: ({ page, pageSize, category, sort, keyword: searchKeyword }) =>
    coursesListApi.list({
      page,
      pageSize,
      category,
      sort,
      keyword: searchKeyword || undefined,
    }),
  getParams: () => ({
    category: activeCategory.value,
    sort: activeSort.value,
    keyword: keyword.value.trim(),
  }),
})

async function loadCategories() {
  const result = await coursesListApi.getCategoryTabs()
  categories.value = result.length ? result : [{ id: 'all', name: '全部' }]
  if (!categories.value.some((item) => item.id === activeCategory.value)) {
    activeCategory.value = 'all'
  }
}

onLoad((options?: Record<string, string>) => {
  uni.getSystemInfo({
    success: (info) => { statusBarHeight.value = info.statusBarHeight || 0 },
  })
  if (options?.category) activeCategory.value = decodeURIComponent(options.category)
  if (options?.sort) activeSort.value = options.sort
  loadCategories().catch(() => {
    categories.value = [{ id: 'all', name: '全部' }]
  })
  refresh()
})

onReachBottom(() => loadMore())

onPullDownRefresh(async () => {
  try {
    await Promise.all([loadCategories(), refresh()])
  } finally {
    uni.stopPullDownRefresh()
  }
})

function categoryLabel(name: string) {
  return name.length > 6 ? `${name.slice(0, 5)}…` : name
}

function selectCategory(id: string) {
  if (activeCategory.value === id) return
  activeCategory.value = id
  refresh()
}

function selectSort(id: string) {
  activeSort.value = id
  showSort.value = false
  refresh()
}
</script>

<template>
  <view class="page">
    <view class="header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="header-row">
        <view class="back" @tap="goBack"><app-icon name="arrow-left" :size="42" color="#292522" /></view>
        <view class="header-copy">
          <text class="header-title serif">课程分类</text>
          <text class="header-subtitle">按主题找到一条学习主线</text>
        </view>
      </view>
      <view class="search">
        <app-icon name="search" :size="30" color="#978D82" />
        <input
          v-model="keyword"
          class="search-input"
          confirm-type="search"
          placeholder="搜索课程名称或内容"
          placeholder-class="search-placeholder"
          @confirm="refresh"
        >
        <view v-if="keyword" class="search-clear" @tap="keyword = ''; refresh()">
          <app-icon name="x" :size="24" color="#978D82" />
        </view>
      </view>
    </view>

    <view class="catalog-body" :style="{ top: `calc(${statusBarHeight}px + 180rpx)` }">
      <scroll-view class="sidebar" scroll-y :show-scrollbar="false">
        <view class="sidebar-label"><text>课程主题</text></view>
        <view
          v-for="category in categories"
          :key="category.id"
          class="category"
          :class="{ active: activeCategory === category.id }"
          @tap="selectCategory(category.id)"
        >
          <view v-if="activeCategory === category.id" class="category-line" />
          <text class="category-text" :aria-label="category.name">
            {{ category.id === 'all' ? '全部课程' : categoryLabel(category.name) }}
          </text>
        </view>
      </scroll-view>

      <view class="main">
        <view class="toolbar">
          <view>
            <text class="toolbar-title serif">{{ activeCategoryName === '全部' ? '全部课程' : activeCategoryName }}</text>
            <text class="toolbar-subtitle">循序学习，慢慢积累</text>
          </view>
          <view class="sort-trigger" @tap="showSort = !showSort">
            <text>{{ activeSortName }}</text>
            <app-icon name="chevron-down" :size="22" color="#70665C" />
          </view>
        </view>

        <view v-if="showSort" class="sort-popover">
          <view
            v-for="option in courseSortOptions"
            :key="option.id"
            class="sort-option"
            :class="{ active: activeSort === option.id }"
            @tap="selectSort(option.id)"
          >
            <text>{{ option.name }}</text>
            <app-icon v-if="activeSort === option.id" name="check" :size="23" color="#C41E3A" />
          </view>
        </view>

        <view v-if="loading" class="loading">
          <view v-for="n in 3" :key="n" class="loading-card">
            <view class="loading-cover shimmer" />
            <view class="loading-copy">
              <view class="loading-line shimmer" />
              <view class="loading-line short shimmer" />
            </view>
          </view>
        </view>

        <view v-else-if="error" class="state">
          <app-icon name="alert-circle" :size="52" color="#C41E3A" />
          <text class="state-title">课程加载失败</text>
          <text class="state-action" @tap="refresh">点击重试</text>
        </view>

        <view v-else-if="!list.length" class="state">
          <app-icon name="book-open" :size="56" color="#B88A44" />
          <text class="state-title">这里暂时还没有课程</text>
          <text class="state-desc">换个分类或关键词再看看</text>
        </view>

        <view v-else class="course-list">
          <learning-course-card
            v-for="course in list"
            :key="course.id"
            :data="course"
            variant="list"
          />
          <app-load-more :status="loadStatus" />
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: #f7f4ef; }
.serif { font-family: "Songti SC", "STSong", "SimSun", serif; }
.header {
  position: sticky; top: 0; z-index: 40; box-sizing: border-box;
  border-bottom: 1rpx solid rgba(139, 107, 72, .1);
  background: rgba(252, 250, 246, .97); backdrop-filter: blur(18px);
}
.header-row { height: 92rpx; display: flex; align-items: center; padding: 0 28rpx; }
.back { width: 72rpx; height: 72rpx; margin-left: -12rpx; display: flex; align-items: center; justify-content: center; }
.header-copy { display: flex; flex-direction: column; }
.header-title { color: #282421; font-size: 34rpx; font-weight: 800; }
.header-subtitle { margin-top: 2rpx; color: #9a9187; font-size: 19rpx; }
.search {
  height: 64rpx; margin: 0 28rpx 20rpx; padding: 0 20rpx; display: flex; align-items: center; gap: 12rpx;
  border: 1rpx solid rgba(139, 107, 72, .1); border-radius: 999rpx; background: #f0ece6;
}
.search-input { min-width: 0; flex: 1; color: #3c3732; font-size: 24rpx; }
.search-placeholder { color: #aaa096; }
.search-clear { width: 42rpx; height: 42rpx; display: flex; align-items: center; justify-content: center; }
.catalog-body { display: flex; align-items: flex-start; }
.sidebar {
  position: sticky; top: 180rpx; width: 174rpx; height: calc(100vh - 180rpx);
  flex-shrink: 0; box-sizing: border-box; padding: 12rpx 10rpx 40rpx;
  border-right: 1rpx solid rgba(139, 107, 72, .1);
  background: linear-gradient(180deg, #efeae2, #f5f1eb);
}
.sidebar-label {
  height: 64rpx; display: flex; align-items: center; justify-content: center;
  color: #9a8e80; font-size: 18rpx; letter-spacing: 2rpx;
}
.category {
  position: relative; min-height: 94rpx; margin-bottom: 8rpx; padding: 14rpx 10rpx;
  box-sizing: border-box; display: flex; align-items: center; justify-content: center;
  border: 1rpx solid transparent; border-radius: 18rpx;
}
.category.active {
  border-color: rgba(196, 30, 58, .12);
  background: rgba(255, 255, 255, .86);
  box-shadow: 0 6rpx 18rpx rgba(75, 48, 29, .05);
}
.category-line {
  position: absolute; left: -10rpx; top: 24rpx; bottom: 24rpx; width: 5rpx;
  border-radius: 5rpx; background: #c41e3a;
}
.category-text { color: #62594f; font-size: 22rpx; line-height: 1.35; text-align: center; }
.category.active .category-text { color: #c41e3a; font-weight: 700; }
.main { position: relative; min-width: 0; flex: 1; padding: 18rpx 18rpx 50rpx; box-sizing: border-box; }
.toolbar { min-height: 88rpx; display: flex; align-items: center; justify-content: space-between; gap: 12rpx; }
.toolbar-title {
  display: block; max-width: 320rpx; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
  color: #2c2824; font-size: 29rpx; font-weight: 800;
}
.toolbar-subtitle { display: block; margin-top: 3rpx; color: #9c9288; font-size: 18rpx; }
.sort-trigger {
  flex-shrink: 0; display: flex; align-items: center; gap: 4rpx; padding: 10rpx 13rpx;
  border: 1rpx solid rgba(139, 107, 72, .12); border-radius: 999rpx; background: #fff;
  color: #70665c; font-size: 19rpx;
}
.sort-popover {
  position: absolute; right: 18rpx; top: 90rpx; z-index: 20; width: 240rpx;
  overflow: hidden; border: 1rpx solid rgba(139, 107, 72, .14); border-radius: 18rpx;
  background: #fff; box-shadow: 0 14rpx 32rpx rgba(61, 40, 23, .13);
}
.sort-option {
  min-height: 72rpx; padding: 0 20rpx; display: flex; align-items: center; justify-content: space-between;
  border-bottom: 1rpx solid rgba(139, 107, 72, .09); color: #5e554d; font-size: 22rpx;
}
.sort-option:last-child { border-bottom: 0; }
.sort-option.active { color: #c41e3a; font-weight: 700; }
.course-list { display: flex; flex-direction: column; gap: 16rpx; }
.course-list :deep(.learning-card--list) { min-height: 240rpx; }
.course-list :deep(.learning-card--list .cover) { width: 205rpx; }
.course-list :deep(.learning-card--list .content) { padding: 20rpx 16rpx 16rpx 32rpx; gap: 8rpx; }
.course-list :deep(.learning-card--list .title) { font-size: 26rpx; }
.course-list :deep(.learning-card--list .outcome-text) { font-size: 20rpx; }
.course-list :deep(.learning-card--list .course-meta) { display: none; }
.course-list :deep(.learning-card--list .original-price) { display: none; }
.state { min-height: 540rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 13rpx; text-align: center; }
.state-title { color: #4b443d; font-size: 25rpx; font-weight: 600; }
.state-desc { color: #9c9288; font-size: 21rpx; }
.state-action { margin-top: 6rpx; padding: 10rpx 24rpx; border-radius: 999rpx; background: rgba(196, 30, 58, .08); color: #c41e3a; font-size: 22rpx; }
.loading { display: flex; flex-direction: column; gap: 16rpx; }
.loading-card { height: 240rpx; display: flex; overflow: hidden; border-radius: 24rpx; background: #fff; }
.loading-cover { width: 205rpx; flex-shrink: 0; }
.loading-copy { flex: 1; padding: 28rpx 20rpx; }
.loading-line { width: 90%; height: 28rpx; margin-bottom: 20rpx; border-radius: 8rpx; }
.loading-line.short { width: 62%; }
.shimmer { position: relative; overflow: hidden; background: #eae4dc; }
.shimmer::after {
  content: ""; position: absolute; inset: 0; transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.72), transparent);
  animation: shimmer 1.35s infinite;
}
@keyframes shimmer { to { transform: translateX(100%); } }
</style>
