<script setup lang="ts">
/** 课程列表页 - 分类/搜索/免费/排序全下沉后端，主列表 useList 分页；轮播/秒杀头部一次性加载 */
import { ref, computed, onUnmounted } from 'vue'
import { onLoad, onReachBottom } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import AppLoadMore from '@/components/common/app-load-more.vue'
import CourseCard from '@/components/cards/course-card.vue'
import BottomNav from '@/components/bottom-nav/bottom-nav.vue'
import { navigateTo, navigateBack } from '@/utils/router'
import { coursesListApi, courseSortOptions } from '@/lib/courses-list-data'
import { useList } from '@/composables/useList'
import type { CourseCardData } from '@/lib/card-utils'

// 头部区块（一次性加载，与主列表分页解耦）
// 分类/推荐/秒杀头部数据，模板裸访问多字段，保留 any 避免连锁报错
const courseListCategories = ref<any[]>([])
const recommendedCourses = ref<any[]>([])
const flashSaleCourses = ref<any[]>([])

// 筛选状态
const searchQuery = ref('')
const activeCategory = ref('all')
const activeSort = ref('recommend')
const onlyFree = ref(false)
const showSortMenu = ref(false)
const showFilter = ref(false)

// 主列表：分类/搜索/免费/排序全部作为查询参数下沉后端，切任一条件即重载第一页
const { list: courses, loading, error, loadStatus, refresh, loadMore } = useList<
  CourseCardData & { category: string; free: boolean },
  { category: string; keyword: string; free: boolean; sort: string }
>({
  fetcher: ({ page, pageSize, category, keyword, free, sort }) =>
    coursesListApi.list({ page, pageSize, category, keyword: keyword || undefined, free, sort }),
  getParams: () => ({ category: activeCategory.value, keyword: searchQuery.value, free: onlyFree.value, sort: activeSort.value }),
})

// 头部轮播/秒杀/分类 tab（失败不阻塞主列表，三态由主列表承载）
async function loadHeader() {
  try {
    const [categories, recommended, flashSale] = await Promise.all([
      coursesListApi.getCategoryTabs(),
      coursesListApi.getRecommended(),
      coursesListApi.getFlashSale(),
    ])
    courseListCategories.value = categories
    recommendedCourses.value = recommended
    flashSaleCourses.value = flashSale
    startTimers()
  } catch { /* 头部失败静默，不阻塞主列表 */ }
}

onLoad((opts?: Record<string, string>) => {
  if (opts?.category) activeCategory.value = opts.category
  if (opts?.sort) activeSort.value = opts.sort
  if (opts?.filter === 'free') onlyFree.value = true
  loadHeader()
  refresh()
})
onReachBottom(() => loadMore())

function retry() { loadHeader(); refresh() }

// 推荐课程轮播
const currentBanner = ref(0)
let bannerTimer: ReturnType<typeof setInterval> | null = null

// 限时秒杀倒计时
interface Countdown { h: string; m: string; s: string }
const flashCountdowns = ref<Record<string, Countdown>>({})
let flashTimer: ReturnType<typeof setInterval> | null = null
const flashEndTimes: Record<string, number> = {}

function updateCountdowns() {
  const now = Date.now()
  const next: Record<string, Countdown> = {}
  flashSaleCourses.value.forEach((c) => {
    const remaining = Math.max(0, flashEndTimes[c.id] - now)
    const h = Math.floor(remaining / (1000 * 60 * 60))
    const m = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
    const s = Math.floor((remaining % (1000 * 60)) / 1000)
    next[c.id] = {
      h: String(h).padStart(2, '0'),
      m: String(m).padStart(2, '0'),
      s: String(s).padStart(2, '0'),
    }
  })
  flashCountdowns.value = next
}

function startTimers() {
  // 初始化秒杀结束时间
  const base = Date.now()
  flashSaleCourses.value.forEach((c) => { flashEndTimes[c.id] = base + c.offsetMs })
  updateCountdowns()
  flashTimer = setInterval(updateCountdowns, 1000)
  if (recommendedCourses.value.length > 0) {
    bannerTimer = setInterval(() => {
      currentBanner.value = (currentBanner.value + 1) % recommendedCourses.value.length
    }, 4000)
  }
}

function stopTimers() {
  if (flashTimer) clearInterval(flashTimer)
  if (bannerTimer) clearInterval(bannerTimer)
}

onUnmounted(() => {
  stopTimers()
})

// 当前排序名
const activeSortName = computed(() => courseSortOptions.find((s) => s.id === activeSort.value)?.name ?? '')

// 价格区间 / 时长筛选项(原型为纯展示)
const priceRanges = ['全部', '免费', '0-100', '100-300', '300以上']
const durationRanges = ['全部', '5小时内', '5-10小时', '10小时以上']

function goBack() { navigateBack() }
function selectCategory(id: string) { if (activeCategory.value === id) return; activeCategory.value = id; refresh() }
function selectSort(id: string) { activeSort.value = id; showSortMenu.value = false; refresh() }
function toggleFree() { onlyFree.value = !onlyFree.value; refresh() }
function onSearch() { refresh() }
function openCourse(id: string) { navigateTo(`/course/${id}`) }
</script>

<template>
  <!-- Loading -->
  <view v-if="loading" class="loading-wrap">
    <text class="loading-text">加载中...</text>
  </view>
  <!-- Error -->
  <view v-else-if="error" class="error-wrap">
    <text class="error-text">{{ error }}</text>
    <view class="retry-btn" @tap="retry"><text class="retry-text">重试</text></view>
  </view>
  <!-- Content -->
  <view v-else class="page">
    <!-- 顶部栏 -->
    <view class="hdr">
      <view class="hdr-bar">
        <view class="back-btn" @tap="goBack">
          <app-icon name="chevron-left" :size="44" color="var(--text-strong)" />
        </view>
        <view class="search-box">
          <app-icon name="search" :size="30" color="var(--text-soft)" />
          <input
            v-model="searchQuery"
            class="search-input"
            type="text"
            placeholder="搜索课程、讲师"
            placeholder-class="search-ph"
            confirm-type="search"
            @confirm="onSearch"
          />
        </view>
      </view>

      <!-- 分类Tab - 纯文字横向滑动 -->
      <scroll-view class="cat-row" scroll-x :show-scrollbar="false">
        <view class="cat-inner">
          <view
            v-for="cat in courseListCategories" :key="cat.id"
            class="cat-chip" :class="{ on: activeCategory === cat.id }"
            @tap="selectCategory(cat.id)"
          >
            <text class="cat-txt" :class="{ on: activeCategory === cat.id }">{{ cat.name }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 排序筛选栏 -->
    <view class="sort-bar">
      <view class="sort-left">
        <view class="sort-trigger" @tap="showSortMenu = !showSortMenu">
          <text class="sort-cur">{{ activeSortName }}</text>
          <app-icon name="chevron-down" :size="28" color="var(--text-strong)" :class="{ rotated: showSortMenu }" />
        </view>
        <text class="free-btn" :class="{ on: onlyFree }" @tap="toggleFree">免费</text>
      </view>
      <view class="filter-trigger" @tap="showFilter = true">
        <app-icon name="filter" :size="28" color="var(--text-soft)" />
        <text class="filter-txt">筛选</text>
      </view>
      <!-- 排序下拉 -->
      <view v-if="showSortMenu" class="sort-menu">
        <view
          v-for="opt in courseSortOptions" :key="opt.id"
          class="sort-opt" :class="{ on: activeSort === opt.id }"
          @tap="selectSort(opt.id)"
        >
          <text class="sort-opt-txt" :class="{ on: activeSort === opt.id }">{{ opt.name }}</text>
        </view>
      </view>
    </view>

    <!-- 推荐课程轮播Banner（后端无推荐数据时隐藏） -->
    <view v-if="recommendedCourses.length" class="banner-wrap">
      <view class="banner">
        <view
          v-for="(course, index) in recommendedCourses" :key="course.id"
          class="banner-slide" :class="{ active: index === currentBanner }"
          @tap="openCourse(course.id)"
        >
          <view class="banner-bg" />
          <view class="banner-content">
            <view class="banner-info">
              <view class="banner-tag-row">
                <text class="banner-tag">{{ course.tag }}</text>
              </view>
              <text class="banner-title">{{ course.title }}</text>
              <text class="banner-sub">{{ course.subtitle }}</text>
              <view class="banner-price-row">
                <text class="banner-price">¥{{ course.price }}</text>
                <text class="banner-orig">¥{{ course.originalPrice }}</text>
              </view>
            </view>
            <view class="banner-thumb">
              <image lazy-load class="banner-thumb-img" :src="course.image" mode="aspectFill" />
            </view>
          </view>
        </view>
        <!-- 轮播指示器 -->
        <view class="banner-dots">
          <view
            v-for="(_, index) in recommendedCourses" :key="index"
            class="banner-dot" :class="{ on: index === currentBanner }"
            @tap.stop="currentBanner = index"
          />
        </view>
      </view>
    </view>

    <!-- 限时秒杀区域（后端无限时课时隐藏） -->
    <view v-if="flashSaleCourses.length" class="flash-sec">
      <view class="flash-hd">
        <view class="flash-hd-left">
          <app-icon name="zap" :size="34" color="var(--brand)" />
          <text class="flash-title">限时秒杀</text>
          <view class="flash-tip">
            <app-icon name="clock" :size="24" color="var(--brand)" />
            <text class="flash-tip-txt">抢购中</text>
          </view>
        </view>
        <view class="flash-more" @tap="navigateTo('/courses/flash-sale')">
          <text class="flash-more-txt">更多</text>
          <app-icon name="chevron-right" :size="28" color="var(--text-soft)" />
        </view>
      </view>
      <scroll-view class="flash-row" scroll-x :show-scrollbar="false">
        <view class="flash-inner">
          <view
            v-for="course in flashSaleCourses" :key="course.id"
            class="flash-card" @tap="openCourse(course.id)"
          >
            <view class="flash-price-row">
              <text class="flash-price">¥{{ course.price }}</text>
              <text class="flash-orig">¥{{ course.originalPrice }}</text>
            </view>
            <text class="flash-name">{{ course.title }}</text>
            <view class="flash-cd">
              <text class="cd-cell">{{ flashCountdowns[course.id]?.h ?? '00' }}</text>
              <text class="cd-sep">:</text>
              <text class="cd-cell">{{ flashCountdowns[course.id]?.m ?? '00' }}</text>
              <text class="cd-sep">:</text>
              <text class="cd-cell cd-sec">{{ flashCountdowns[course.id]?.s ?? '00' }}</text>
            </view>
            <view class="flash-discount-row">
              <text class="flash-discount">{{ course.discount }}</text>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 课程列表标题 -->
    <view class="list-hd">
      <app-icon name="flame" :size="28" color="#FF6B35" />
      <text class="list-hd-txt">全部课程</text>
    </view>

    <!-- 课程列表 - 双列瀑布流, 3:4竖版封面 -->
    <view class="list-wrap">
      <view v-if="courses.length === 0" class="empty">
        <app-icon name="graduation-cap" :size="120" color="var(--line)" />
        <text class="empty-txt">暂无相关课程</text>
      </view>
      <view v-else class="grid">
        <view class="grid-cell" v-for="course in courses" :key="course.id">
          <course-card :data="course" variant="feed" />
        </view>
      </view>
      <app-load-more v-if="courses.length" :status="loadStatus" />
    </view>

    <!-- 筛选弹窗 -->
    <view v-if="showFilter" class="filter-mask" @tap="showFilter = false">
      <view class="filter-panel" @tap.stop>
        <view class="filter-panel-hd">
          <text class="filter-panel-title">筛选</text>
          <view @tap="showFilter = false">
            <app-icon name="x" :size="36" color="var(--text-soft)" />
          </view>
        </view>
        <view class="filter-group">
          <text class="filter-group-title">价格区间</text>
          <view class="filter-chips">
            <text v-for="range in priceRanges" :key="range" class="filter-chip-pill">{{ range }}</text>
          </view>
        </view>
        <view class="filter-group">
          <text class="filter-group-title">课程时长</text>
          <view class="filter-chips">
            <text v-for="d in durationRanges" :key="d" class="filter-chip-pill">{{ d }}</text>
          </view>
        </view>
        <view class="filter-foot">
          <view class="filter-reset">重置</view>
          <view class="filter-confirm" @tap="showFilter = false">确定</view>
        </view>
      </view>
    </view>

    <bottom-nav active="discover" />
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg); padding-bottom: 140rpx; }

/* 顶部栏 */
.hdr { position: sticky; top: 0; z-index: 40; background: var(--surface); border-bottom: 2rpx solid var(--line); }
.hdr-bar { display: flex; align-items: center; gap: 20rpx; padding: 0 28rpx; height: 88rpx; }
.back-btn { display: flex; align-items: center; justify-content: center; width: 56rpx; height: 56rpx; margin-left: -12rpx; flex-shrink: 0; }
.search-box { flex: 1; display: flex; align-items: center; gap: 12rpx; height: 60rpx; padding: 0 24rpx; border-radius: 999rpx; background: var(--surface-sunken); border: 2rpx solid var(--line); }
.search-input { flex: 1; font-size: 26rpx; color: var(--text-strong); }
.search-ph { color: var(--text-soft); }

/* 分类Tab */
.cat-row { white-space: nowrap; }
.cat-inner { display: inline-flex; gap: 16rpx; padding: 16rpx 28rpx; }
.cat-chip { flex-shrink: 0; padding: 10rpx 24rpx; border-radius: 999rpx; background: var(--surface); border: 2rpx solid var(--line); }
.cat-chip.on { background: var(--brand); border-color: var(--brand); }
.cat-txt { font-size: 26rpx; font-weight: 500; color: var(--text); white-space: nowrap; }
.cat-txt.on { color: #fff; }

/* 排序筛选栏 */
.sort-bar { position: relative; display: flex; align-items: center; justify-content: space-between; padding: 16rpx 28rpx; background: var(--bg); border-bottom: 2rpx solid var(--line); }
.sort-left { display: flex; align-items: center; gap: 32rpx; }
.sort-trigger { display: flex; align-items: center; gap: 6rpx; }
.sort-cur { font-size: 26rpx; font-weight: 500; color: var(--text-strong); }
.rotated { transform: rotate(180deg); }
.free-btn { font-size: 26rpx; color: var(--text); }
.free-btn.on { color: var(--brand); font-weight: 500; }
.filter-trigger { display: flex; align-items: center; gap: 6rpx; }
.filter-txt { font-size: 26rpx; color: var(--text); }
.sort-menu { position: absolute; top: 100%; left: 28rpx; margin-top: 8rpx; width: 220rpx; background: var(--surface); border: 2rpx solid var(--line); border-radius: 16rpx; box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.12); overflow: hidden; z-index: 50; }
.sort-opt { padding: 18rpx 24rpx; }
.sort-opt.on { background: rgba(196,30,58,0.05); }
.sort-opt-txt { font-size: 26rpx; color: var(--text-strong); }
.sort-opt-txt.on { color: var(--brand); }

/* 推荐轮播Banner */
.banner-wrap { padding: 24rpx 28rpx 0; }
.banner { position: relative; height: 256rpx; border-radius: 24rpx; overflow: hidden; }
.banner-slide { position: absolute; inset: 0; opacity: 0; transition: opacity 0.5s; pointer-events: none; }
.banner-slide.active { opacity: 1; pointer-events: auto; }
.banner-bg { position: absolute; inset: 0; background: linear-gradient(to right, var(--brand), #8B0000); }
.banner-content { position: relative; height: 100%; display: flex; align-items: center; justify-content: space-between; padding: 0 32rpx; }
.banner-info { display: flex; flex-direction: column; }
.banner-tag-row { margin-bottom: 8rpx; }
.banner-tag { display: inline-block; padding: 2rpx 16rpx; background: #FFD43B; color: #8B0000; font-size: 20rpx; font-weight: 700; border-radius: 8rpx; }
.banner-title { font-size: 36rpx; font-weight: 700; color: #fff; margin-bottom: 4rpx; }
.banner-sub { font-size: 24rpx; color: rgba(255,255,255,0.8); margin-bottom: 16rpx; }
.banner-price-row { display: flex; align-items: baseline; gap: 16rpx; }
.banner-price { font-size: 40rpx; font-weight: 700; color: #FFE066; }
.banner-orig { font-size: 24rpx; color: rgba(255,255,255,0.6); text-decoration: line-through; }
.banner-thumb { width: 160rpx; height: 160rpx; border-radius: 16rpx; overflow: hidden; box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.3); }
.banner-thumb-img { width: 100%; height: 100%; }
.banner-dots { position: absolute; bottom: 16rpx; left: 50%; transform: translateX(-50%); display: flex; gap: 12rpx; }
.banner-dot { width: 12rpx; height: 12rpx; border-radius: 999rpx; background: rgba(255,255,255,0.5); transition: all 0.3s; }
.banner-dot.on { width: 32rpx; background: #fff; }

/* 限时秒杀 */
.flash-sec { padding: 32rpx 28rpx 0; }
.flash-hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.flash-hd-left { display: flex; align-items: center; gap: 16rpx; }
.flash-title { font-size: 30rpx; font-weight: 700; color: var(--text-strong); }
.flash-tip { display: flex; align-items: center; gap: 6rpx; }
.flash-tip-txt { font-size: 22rpx; color: var(--brand); }
.flash-more { display: flex; align-items: center; }
.flash-more-txt { font-size: 22rpx; color: var(--text-soft); }
.flash-row { white-space: nowrap; }
.flash-inner { display: inline-flex; gap: 20rpx; padding-bottom: 16rpx; }
.flash-card { flex-shrink: 0; width: 224rpx; padding: 20rpx; background: var(--surface); border-radius: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.05); }
.flash-price-row { display: flex; align-items: baseline; justify-content: center; gap: 8rpx; margin-bottom: 16rpx; }
.flash-price { font-size: 36rpx; font-weight: 700; color: var(--brand); }
.flash-orig { font-size: 20rpx; color: var(--text-soft); text-decoration: line-through; }
.flash-name { display: block; text-align: center; font-size: 22rpx; color: var(--text-strong); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 16rpx; }
.flash-cd { display: flex; align-items: center; justify-content: center; gap: 4rpx; }
.cd-cell { width: 38rpx; height: 38rpx; background: var(--text-strong); color: #fff; font-size: 20rpx; border-radius: 8rpx; display: flex; align-items: center; justify-content: center; font-family: monospace; }
.cd-sec { background: var(--brand); }
.cd-sep { color: var(--text-strong); font-size: 24rpx; font-weight: 700; }
.flash-discount-row { margin-top: 16rpx; text-align: center; }
.flash-discount { display: inline-block; padding: 2rpx 16rpx; background: rgba(196,30,58,0.08); color: var(--brand); font-size: 20rpx; border-radius: 999rpx; }

/* 列表标题 */
.list-hd { display: flex; align-items: center; gap: 12rpx; padding: 32rpx 28rpx 16rpx; }
.list-hd-txt { font-size: 28rpx; font-weight: 500; color: var(--text-strong); }

/* 课程网格 */
.list-wrap { padding: 0 28rpx; }
.grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20rpx; }
.grid-cell { min-width: 0; }
.empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 160rpx 0; gap: 24rpx; }
.empty-txt { font-size: 28rpx; color: var(--text-soft); }

/* 筛选弹窗 */
.filter-mask { position: fixed; inset: 0; z-index: 60; background: rgba(0,0,0,0.5); }
.filter-panel { position: absolute; top: 0; right: 0; bottom: 0; width: 560rpx; background: var(--surface); padding: 32rpx; box-shadow: -8rpx 0 24rpx rgba(0,0,0,0.15); }
.filter-panel-hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32rpx; }
.filter-panel-title { font-size: 32rpx; font-weight: 700; color: var(--text-strong); }
.filter-group { margin-bottom: 32rpx; }
.filter-group-title { display: block; font-size: 26rpx; font-weight: 500; color: var(--text-strong); margin-bottom: 16rpx; }
.filter-chips { display: flex; flex-wrap: wrap; gap: 16rpx; }
.filter-chip-pill { padding: 12rpx 24rpx; font-size: 24rpx; background: var(--surface-sunken); color: var(--text); border-radius: 999rpx; }
.filter-foot { position: absolute; left: 32rpx; right: 32rpx; bottom: 32rpx; display: flex; gap: 24rpx; }
.filter-reset { flex: 1; height: 80rpx; display: flex; align-items: center; justify-content: center; border: 2rpx solid var(--line); border-radius: 999rpx; font-size: 26rpx; color: var(--text); }
.filter-confirm { flex: 1; height: 80rpx; display: flex; align-items: center; justify-content: center; background: var(--brand); border-radius: 999rpx; font-size: 26rpx; font-weight: 500; color: #fff; }

/* 加载 / 错误 */
.loading-wrap, .error-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 24rpx; }
.loading-text, .error-text { font-size: 28rpx; color: var(--text-soft); }
.retry-btn { padding: 16rpx 48rpx; background: var(--brand); border-radius: 999rpx; }
.retry-text { font-size: 28rpx; color: #fff; }
</style>
