<template>
  <view class="min-h-screen bg-background pb-20" @touchstart="handleTouchStart" @touchmove="handleTouchMove" @touchend="handleTouchEnd">
    <!-- 下拉刷新指示器 -->
    <view v-if="isPulling || isRefreshing" class="flex items-center justify-center bg-background overflow-hidden transition-all" :style="{ height: isRefreshing ? '50px' : pullDistance + 'px' }">
      <text v-if="isRefreshing" class="animate-spin text-primary"></text>
      <text v-else class="text-[12px] text-muted-foreground">{{ pullDistance > 50 ? '松开刷新' : '下拉刷新' }}</text>
    </view>

    <!-- 顶部导航 -->
    <view class="sticky top-0 z-40 bg-background/95 border-b border-border" style="backdrop-filter:blur(4px)">
      <view class="flex items-center gap-3 px-4 h-12">
        <view @click="goBack" class="w-8 h-8 flex items-center justify-center">
          <text class="text-xl text-foreground">←</text>
        </view>
        <view class="flex-1 relative">
          <text class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"></text>
          <input type="text" v-model="searchQuery" placeholder="搜索课程、讲师" class="w-full h-8 pl-9 pr-4 bg-[#F2EFEA] border border-[#E5E0D8] rounded-full text-sm text-foreground placeholder:text-muted-foreground outline-none" />
        </view>
      </view>
      <!-- 分类Tab - 横向滑动 -->
      <scroll-view scroll-x class="flex px-4 py-2 gap-2 whitespace-nowrap" enhanced show-scrollbar="false">
        <view v-for="cat in categories" :key="cat.id" :class="['inline-flex flex-shrink-0 px-3 py-1.5 rounded-full text-[13px] font-medium mr-2 transition-all', activeCategory === cat.id ? 'bg-primary text-white' : 'bg-white text-ink-soft border border-border']" @click="activeCategory = cat.id; loadCourses(true)">
          <text>{{ cat.name }}</text>
        </view>
      </scroll-view>
    </view>

    <!-- 排序筛选栏 -->
    <view class="sticky z-30 bg-background border-b border-border" :style="{ top: isPulling || isRefreshing ? 'calc(92px + ' + (isRefreshing ? 50 : pullDistance) + 'px)' : '92px' }">
      <view class="flex items-center justify-between px-4 py-2">
        <view class="flex items-center gap-4">
          <view class="relative" @click="showSortMenu = !showSortMenu">
            <view class="flex items-center gap-1 text-[13px] font-medium text-foreground">
              <text>{{ sortOptions.find(s => s.id === activeSort)?.name }}</text>
              <text :class="['text-xs transition-transform', showSortMenu ? 'rotate-180' : '']">▾</text>
            </view>
            <view v-if="showSortMenu" class="absolute top-full left-0 mt-2 w-28 bg-white border border-border rounded-lg shadow-lg overflow-hidden z-50">
              <view v-for="option in sortOptions" :key="option.id" :class="['w-full px-3 py-2 text-[13px]', activeSort === option.id ? 'text-primary bg-primary/5' : 'text-ink-soft']" @click="activeSort = option.id; showSortMenu = false; loadCourses(true)">
                <text>{{ option.name }}</text>
              </view>
            </view>
          </view>
          <text :class="['text-[13px]', onlyFree ? 'text-primary font-medium' : 'text-ink-soft']" @click="onlyFree = !onlyFree; loadCourses(true)">免费</text>
        </view>
        <view class="flex items-center gap-1 text-[13px] text-ink-soft" @click="showFilter = true">
          <text>⚙️</text>
          <text>筛选</text>
        </view>
      </view>
    </view>

    <!-- 推荐课程轮播Banner -->
    <view v-if="!isLoading" class="px-4 pt-3">
      <view class="relative rounded-xl overflow-hidden h-32">
        <view v-for="(course, index) in recommendedCourses" :key="course.id" :class="['absolute inset-0 transition-opacity duration-500', index === currentBanner ? 'opacity-100' : 'opacity-0 pointer-events-none']" @click="goDetail(course.id)">
          <view class="absolute inset-0 bg-gradient-to-r from-primary to-primary/70" />
          <view class="relative h-full flex items-center justify-between px-4">
            <view class="text-white">
              <view class="flex items-center gap-2 mb-1">
                <text class="px-2 py-0.5 bg-yellow-400 text-[#8B0000] text-[10px] font-bold rounded">{{ course.tag }}</text>
              </view>
              <text class="text-lg font-bold mb-0.5 block">{{ course.title }}</text>
              <text class="text-white/80 text-xs mb-2 block">{{ course.subtitle }}</text>
              <view class="flex items-baseline gap-2">
                <text class="text-xl font-bold text-yellow-300">¥{{ course.price }}</text>
                <text class="text-xs text-white/60 line-through">¥{{ course.originalPrice }}</text>
              </view>
            </view>
            <view class="w-20 h-20 rounded-lg overflow-hidden shadow-lg bg-white/20 flex items-center justify-center">
              <text class="text-3xl"></text>
            </view>
          </view>
        </view>
        <!-- 轮播指示器 -->
        <view class="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          <view v-for="(_, index) in recommendedCourses" :key="index" :class="['w-1.5 h-1.5 rounded-full transition-all', index === currentBanner ? 'w-4 bg-white' : 'bg-white/50']" @click="currentBanner = index" />
        </view>
      </view>
    </view>

    <!-- 限时秒杀区域 -->
    <view v-if="!isLoading" class="px-4 mt-4">
      <view class="flex items-center justify-between mb-3">
        <view class="flex items-center gap-2">
          <text class="text-lg text-primary">⚡</text>
          <text class="font-bold text-foreground">限时秒杀</text>
          <view class="flex items-center gap-1 ml-2">
            <text class="text-xs text-primary">🕐</text>
            <text class="text-xs text-primary">抢购中</text>
          </view>
        </view>
        <view class="flex items-center text-xs text-muted-foreground" @click="goFlashSale">
          <text>更多</text>
          <text class="text-sm ml-1">›</text>
        </view>
      </view>
      <scroll-view scroll-x class="flex gap-2.5 pb-2 whitespace-nowrap" enhanced show-scrollbar="false">
        <view v-for="course in flashSaleCourses" :key="course.id" class="inline-flex flex-shrink-0 w-28" @click="goDetail(course.id)">
          <view class="bg-white rounded-xl p-2.5 shadow-sm w-full">
            <view class="text-center mb-2">
              <text class="text-lg font-bold text-primary">¥{{ course.price }}</text>
              <text class="text-[10px] text-muted-foreground line-through ml-1">¥{{ course.originalPrice }}</text>
            </view>
            <text class="text-[11px] text-foreground text-center line-clamp-1 mb-2 block">{{ course.title }}</text>
            <view class="flex items-center justify-center gap-0.5">
              <text class="w-5 h-5 bg-foreground text-white text-[10px] rounded flex items-center justify-center font-mono">{{ pad(flashCountdowns[course.id]?.h || 0) }}</text>
              <text class="text-foreground text-xs font-bold">:</text>
              <text class="w-5 h-5 bg-foreground text-white text-[10px] rounded flex items-center justify-center font-mono">{{ pad(flashCountdowns[course.id]?.m || 0) }}</text>
              <text class="text-foreground text-xs font-bold">:</text>
              <text class="w-5 h-5 bg-primary text-white text-[10px] rounded flex items-center justify-center font-mono animate-pulse">{{ pad(flashCountdowns[course.id]?.s || 0) }}</text>
            </view>
            <view class="mt-2 text-center">
              <text class="px-2 py-0.5 bg-[#FFF0F0] text-primary text-[10px] rounded-full">{{ course.discount }}</text>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 课程列表标题 -->
    <view v-if="!isLoading" class="px-4 mt-4 mb-2 flex items-center gap-2">
      <text class="text-base"></text>
      <text class="font-medium text-foreground text-sm">全部课程</text>
    </view>

    <!-- 课程列表 -->
    <view class="px-4 pt-3">
      <template v-if="isLoading">
        <view class="grid grid-cols-2 gap-2.5">
          <view v-for="i in 6" :key="i" class="animate-pulse">
            <view class="bg-white rounded-[10px] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
              <view class="aspect-[3/4] bg-[#F2EFEA]" />
              <view class="p-2.5 space-y-2">
                <view class="h-4 bg-[#F2EFEA] rounded w-full" />
                <view class="h-3 bg-[#F2EFEA] rounded w-2/3" />
                <view class="h-4 bg-[#F2EFEA] rounded w-1/3" />
              </view>
            </view>
          </view>
        </view>
      </template>
      <template v-else-if="filteredCourses.length === 0">
        <view class="flex flex-col items-center justify-center py-20">
          <text class="text-4xl text-[#E8E0D5] mb-4"></text>
          <text class="text-muted-foreground">暂无相关课程</text>
        </view>
      </template>
      <template v-else>
        <view class="grid grid-cols-2 gap-2.5">
          <view v-for="course in filteredCourses" :key="course.id" class="bg-white rounded-[10px] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.06)]" @click="goDetail(course.id)">
            <view class="aspect-[3/4] bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center relative">
              <text class="text-4xl"></text>
              <view v-if="course.tag" class="absolute top-2 left-2 px-2 py-0.5 bg-primary text-white text-[10px] font-bold rounded-full">{{ course.tag }}</view>
              <view v-if="course.isFree" class="absolute top-2 right-2 px-2 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded-full">免费</view>
            </view>
            <view class="p-2.5">
              <text class="text-sm font-medium text-foreground line-clamp-2 block mb-1">{{ course.title }}</text>
              <view class="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <text>{{ course.instructor.name }}</text>
                <text> {{ course.rating }}</text>
              </view>
              <view class="flex items-center justify-between">
                <view class="flex items-baseline gap-1">
                  <text v-if="course.isFree" class="text-sm font-bold text-green-500">免费</text>
                  <template v-else>
                    <text class="text-sm font-bold text-primary">¥{{ course.price }}</text>
                    <text class="text-[10px] text-muted-foreground line-through">¥{{ course.originalPrice }}</text>
                  </template>
                </view>
                <text class="text-[10px] text-muted-foreground">{{ course.students }}人</text>
              </view>
            </view>
          </view>
        </view>
        <!-- 加载更多 -->
        <view v-if="loadingMore" class="flex items-center justify-center py-4">
          <text class="animate-spin text-primary mr-2"></text>
          <text class="text-[13px] text-muted-foreground">加载中...</text>
        </view>
        <view v-if="!hasMore && filteredCourses.length > 0" class="text-center py-4 text-[13px] text-muted-foreground">
          已经到底了
        </view>
      </template>
    </view>

    <!-- 筛选弹窗 -->
    <view v-if="showFilter" class="fixed inset-0 z-50">
      <view class="absolute inset-0 bg-black/50" @click="showFilter = false" />
      <view class="absolute right-0 top-0 bottom-0 w-72 bg-white p-4 shadow-xl">
        <view class="flex items-center justify-between mb-4">
          <text class="font-bold text-foreground">筛选</text>
          <text class="text-muted-foreground" @click="showFilter = false">✕</text>
        </view>
        <view class="space-y-4">
          <view>
            <text class="text-[13px] font-medium text-foreground mb-2 block">价格区间</text>
            <view class="flex flex-wrap gap-2">
              <view v-for="range in priceRanges" :key="range" class="px-3 py-1.5 text-[12px] bg-secondary text-ink-soft rounded-full" @click="applyPriceFilter(range)">{{ range }}</view>
            </view>
          </view>
          <view>
            <text class="text-[13px] font-medium text-foreground mb-2 block">课程时长</text>
            <view class="flex flex-wrap gap-2">
              <view v-for="duration in durationFilters" :key="duration" class="px-3 py-1.5 text-[12px] bg-secondary text-ink-soft rounded-full" @click="applyDurationFilter(duration)">{{ duration }}</view>
            </view>
          </view>
        </view>
        <view class="absolute bottom-4 left-4 right-4 flex gap-3">
          <view class="flex-1 py-2.5 border border-border rounded-full text-[13px] text-ink-soft text-center">重置</view>
          <view class="flex-1 py-2.5 bg-primary text-white rounded-full text-[13px] font-medium text-center" @click="showFilter = false">确定</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

interface CourseItem {
  id: string; title: string; instructor: { id: string; name: string; avatar: string }
  price: number; originalPrice: number; students: number; rating: number
  chapters: number; category: string; tag?: string; isFree: boolean; cover: string
}

const categories = [
  { id: 'all', name: '全部' }, { id: 'bazi', name: '八字命理' }, { id: 'ziwei', name: '紫微斗数' },
  { id: 'fengshui', name: '风水堪舆' }, { id: 'yijing', name: '易经' },
  { id: 'mianxiang', name: '面相手相' }, { id: 'qimen', name: '奇门遁甲' }, { id: 'liuyao', name: '六爻预测' },
]
const sortOptions = [
  { id: 'recommend', name: '综合推荐' }, { id: 'popular', name: '最受欢迎' },
  { id: 'newest', name: '最新上架' }, { id: 'price-asc', name: '价格最低' },
]
const priceRanges = ['全部', '免费', '0-100', '100-300', '300以上']
const durationFilters = ['全部', '5小时内', '5-10小时', '10小时以上']

const recommendedCourses = [
  { id: 'featured-1', title: '八字命理大师班', subtitle: '零基础到精通', price: 1999, originalPrice: 3999, tag: '限时5折', image: '' },
  { id: 'featured-2', title: '紫微斗数精讲', subtitle: '名师亲授', price: 999, originalPrice: 1999, tag: '即将涨价', image: '' },
  { id: 'featured-3', title: '风水堪舆实战', subtitle: '案例教学', price: 1299, originalPrice: 2599, tag: '新课首发', image: '' },
]
const flashSaleCourses = [
  { id: 'flash-1', title: '六爻预测入门', price: 49, originalPrice: 199, discount: '2.5折', endTime: Date.now() + 5 * 3600 * 1000 },
  { id: 'flash-2', title: '面相识人术', price: 69, originalPrice: 299, discount: '2.3折', endTime: Date.now() + 8 * 3600 * 1000 },
  { id: 'flash-3', title: '姓名学精讲', price: 39, originalPrice: 149, discount: '2.6折', endTime: Date.now() + 12 * 3600 * 1000 },
]

const mockCourses: CourseItem[] = [
  { id: '1', title: '八字入门实战课：从零开始学命理', instructor: { id: '1', name: '周易大师', avatar: '' }, price: 199, originalPrice: 399, students: 2860, rating: 4.9, chapters: 48, category: 'bazi', tag: 'TOP1', isFree: false, cover: '' },
  { id: '2', title: '紫微斗数命盘解读进阶', instructor: { id: '2', name: '张玄风', avatar: '' }, price: 299, originalPrice: 599, students: 1560, rating: 4.8, chapters: 36, category: 'ziwei', tag: '新课', isFree: false, cover: '' },
  { id: '3', title: '风水布局入门精讲', instructor: { id: '1', name: '陈风水', avatar: '' }, price: 0, originalPrice: 99, students: 5280, rating: 4.7, chapters: 12, category: 'fengshui', tag: '免费', isFree: true, cover: '' },
  { id: '4', title: '姓名学与起名技巧', instructor: { id: '2', name: '李国学', avatar: '' }, price: 149, originalPrice: 199, students: 1280, rating: 4.8, chapters: 18, category: 'bazi', isFree: false, cover: '' },
  { id: '5', title: '易经六十四卦精讲', instructor: { id: '1', name: '周易大师', avatar: '' }, price: 399, originalPrice: 599, students: 3560, rating: 4.9, chapters: 64, category: 'yijing', tag: '热门', isFree: false, cover: '' },
  { id: '6', title: '面相入门与识人术', instructor: { id: '2', name: '王相师', avatar: '' }, price: 99, originalPrice: 149, students: 2180, rating: 4.6, chapters: 15, category: 'mianxiang', isFree: false, cover: '' },
  { id: '7', title: '奇门遁甲入门班', instructor: { id: '1', name: '玄学居士', avatar: '' }, price: 299, originalPrice: 499, students: 980, rating: 4.8, chapters: 24, category: 'qimen', tag: '高阶', isFree: false, cover: '' },
  { id: '8', title: '六爻预测实战技法', instructor: { id: '2', name: '张玄风', avatar: '' }, price: 199, originalPrice: 299, students: 1520, rating: 4.7, chapters: 20, category: 'liuyao', isFree: false, cover: '' },
]

const searchQuery = ref('')
const activeCategory = ref('all')
const activeSort = ref('recommend')
const showSortMenu = ref(false)
const showFilter = ref(false)
const onlyFree = ref(false)
const currentBanner = ref(0)
const flashCountdowns = ref<{ [key: string]: { h: number; m: number; s: number } }>({})
const courses = ref<CourseItem[]>([])
const isLoading = ref(true)
const isRefreshing = ref(false)
const loadingMore = ref(false)
const hasMore = ref(true)
const page = ref(1)
const pageSize = 10
const isPulling = ref(false)
const pullDistance = ref(0)
const startY = ref(0)
let bannerTimer: ReturnType<typeof setInterval> | null = null
let countdownTimer: ReturnType<typeof setInterval> | null = null

// 推荐课程轮播自动切换
onMounted(() => {
  bannerTimer = setInterval(() => {
    currentBanner.value = (currentBanner.value + 1) % recommendedCourses.length
  }, 4000)
  updateFlashCountdowns()
  countdownTimer = setInterval(updateFlashCountdowns, 1000)
  loadCourses(true)
})

onUnmounted(() => {
  if (bannerTimer) clearInterval(bannerTimer)
  if (countdownTimer) clearInterval(countdownTimer)
})

function updateFlashCountdowns() {
  const now = Date.now()
  const newCountdowns: { [key: string]: { h: number; m: number; s: number } } = {}
  flashSaleCourses.forEach(course => {
    const remaining = Math.max(0, course.endTime - now)
    newCountdowns[course.id] = {
      h: Math.floor(remaining / (1000 * 60 * 60)),
      m: Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60)),
      s: Math.floor((remaining % (1000 * 60)) / 1000),
    }
  })
  flashCountdowns.value = newCountdowns
}

// 加载课程数据
function loadCourses(refresh = false) {
  if (refresh) {
    isRefreshing.value = true
    page.value = 1
    hasMore.value = true
  }
  setTimeout(() => {
    if (refresh) {
      courses.value = mockCourses
    } else {
      // 模拟分页：追加更多mock数据
      courses.value = [...courses.value, ...mockCourses.map(c => ({ ...c, id: c.id + '-' + page.value }))]
    }
    hasMore.value = page.value < 3
    isLoading.value = false
    isRefreshing.value = false
    loadingMore.value = false
  }, 500)
}

// 无限滚动
function onScrollToBottom() {
  if (loadingMore.value || !hasMore.value || isLoading.value) return
  loadingMore.value = true
  page.value++
  loadCourses(false)
}

// 下拉刷新手势
function handleTouchStart(e: TouchEvent) {
  // 只在页面顶部时启用下拉刷新
  const scrollView = e.currentTarget as HTMLElement | null
  if (scrollView && scrollView.scrollTop === 0) {
    startY.value = e.touches[0].clientY
  }
}

function handleTouchMove(e: TouchEvent) {
  if (isRefreshing.value) return
  const currentY = e.touches[0].clientY
  const distance = currentY - startY.value
  if (distance > 0) {
    isPulling.value = true
    pullDistance.value = Math.min(distance * 0.5, 80)
  }
}

function handleTouchEnd() {
  if (pullDistance.value > 50 && !isRefreshing.value) {
    loadCourses(true)
  }
  isPulling.value = false
  pullDistance.value = 0
}

const filteredCourses = computed(() => {
  return courses.value.filter(course => {
    const matchSearch = searchQuery.value === '' || course.title.includes(searchQuery.value) || course.instructor.name.includes(searchQuery.value)
    const matchCategory = activeCategory.value === 'all' || course.category === activeCategory.value
    const matchFree = !onlyFree.value || course.isFree
    return matchSearch && matchCategory && matchFree
  })
})

function pad(n: number) { return String(n).padStart(2, '0') }
function goBack() { uni.navigateBack() }
function goDetail(id: string) { uni.navigateTo({ url: `/pages/courses/id-detail/index?id=${id}` }) }
function goFlashSale() { uni.navigateTo({ url: '/pages/courses/flash-sale/index' }) }
function applyPriceFilter(range: string) {
  uni.showToast({ title: `已选择: ${range}`, icon: 'none' })
}
function applyDurationFilter(duration: string) {
  uni.showToast({ title: `已选择: ${duration}`, icon: 'none' })
}
</script>

<style scoped>
.animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
</style>
