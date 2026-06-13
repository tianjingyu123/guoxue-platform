<template>
  <view class="cl-page">
    <!-- 顶部 -->
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <view class="search-box">
          <text class="search-icon">🔍</text>
          <input v-model="searchQuery" class="search-input" placeholder="搜索课程、讲师" />
        </view>
      </view>

      <!-- 分类Tab -->
      <scroll-view scroll-x class="cat-row">
        <text v-for="c in categories" :key="c.id" class="cat-chip" :class="{ active: activeCategory === c.id }" @click="activeCategory = c.id">{{ c.name }}</text>
      </scroll-view>
    </view>

    <!-- 排序筛选栏 -->
    <view class="sort-bar">
      <view class="sort-left">
        <view class="sort-trigger" @click="showSortMenu = !showSortMenu">
          <text>{{ sortLabel }}</text>
          <text class="sort-arrow" :class="{ open: showSortMenu }">▼</text>
        </view>
        <text class="free-toggle" :class="{ active: onlyFree }" @click="onlyFree = !onlyFree">免费</text>
      </view>
      <text class="filter-btn" @click="showFilter = true">筛选</text>

      <!-- 排序下拉 -->
      <view v-if="showSortMenu" class="sort-menu-mask" @click="showSortMenu = false" />
      <view v-if="showSortMenu" class="sort-menu">
        <text v-for="o in sortOptions" :key="o.id" class="sort-item" :class="{ active: activeSort === o.id }" @click="activeSort = o.id; showSortMenu = false">{{ o.name }}</text>
      </view>
    </view>

    <!-- 推荐课程Banner轮播 -->
    <view class="banner-wrap">
      <swiper :current="currentBanner" @change="onBannerChange" :interval="4000" circular class="banner-swiper">
        <swiper-item v-for="c in recommendedCourses" :key="c.id" @click="goPage('/pages/courses/detail/index?id=' + c.id)">
          <view class="banner-slide">
            <view class="bs-text">
              <view class="bs-badges">
                <text class="bs-badge">{{ c.tag }}</text>
              </view>
              <text class="bs-title">{{ c.title }}</text>
              <text class="bs-sub">{{ c.subtitle }}</text>
              <view class="bs-price-row">
                <text class="bs-price">¥{{ c.price }}</text>
                <text class="bs-original">¥{{ c.originalPrice }}</text>
              </view>
            </view>
            <view class="bs-cover" />
          </view>
        </swiper-item>
      </swiper>
      <view class="banner-indicators">
        <view v-for="(c, idx) in recommendedCourses" :key="idx" class="bi-dot" :class="{ active: idx === currentBanner }" />
      </view>
    </view>

    <!-- 限时秒杀 -->
    <view class="flash-section">
      <view class="flash-header">
        <view class="flash-title-row">
          <text class="flash-icon">⚡</text>
          <text class="flash-title">限时秒杀</text>
          <view class="flash-status">
            <text>🕐 抢购中</text>
          </view>
        </view>
        <text class="flash-more" @click="goPage('/pages/courses/flash-sale/index')">更多 ›</text>
      </view>
      <scroll-view scroll-x class="flash-list">
        <view v-for="c in flashSaleCourses" :key="c.id" class="flash-card" @click="goPage('/pages/courses/detail/index?id=' + c.id)">
          <view class="fl-price">
            <text class="fl-price-val">¥{{ c.price }}</text>
            <text class="fl-price-ori">¥{{ c.originalPrice }}</text>
          </view>
          <text class="fl-name">{{ c.title }}</text>
          <!-- 倒计时 -->
          <view class="fl-countdown">
            <text class="fcd-num">{{ pad(flashCountdowns[c.id]?.h ?? 0) }}</text>
            <text>:</text>
            <text class="fcd-num">{{ pad(flashCountdowns[c.id]?.m ?? 0) }}</text>
            <text>:</text>
            <text class="fcd-num sec">{{ pad(flashCountdowns[c.id]?.s ?? 0) }}</text>
          </view>
          <view class="fl-discount">
            <text class="fld-tag">{{ c.discount }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 课程列表标题 -->
    <view class="list-header">
      <text class="lh-icon">🔥</text>
      <text class="lh-title">全部课程</text>
    </view>

    <!-- 课程列表 -->
    <view class="course-list">
      <!-- 骨架屏 -->
      <view v-if="isLoading" class="course-grid">
        <view v-for="i in 6" :key="'s' + i" class="sk-card">
          <view class="sk-cover" />
          <view class="sk-info">
            <view class="sk-line w-80" />
            <view class="sk-line w-50" />
            <view class="sk-line w-30" />
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-else-if="filteredCourses.length === 0" class="empty-wrap">
        <text class="empty-icon">🎓</text>
        <text class="empty-text">暂无相关课程</text>
      </view>

      <!-- 课程卡片 -->
      <view v-else class="course-grid">
        <view v-for="c in filteredCourses" :key="c.id" class="course-card" @click="goPage('/pages/courses/detail/index?id=' + c.id)">
          <view class="cc-cover">
            <text v-if="c.tag" class="cc-tag">{{ c.tag }}</text>
            <text v-if="c.isFree" class="cc-free">免费</text>
          </view>
          <view class="cc-info">
            <text class="cc-title">{{ c.title }}</text>
            <view class="cc-teacher">
              <view class="cct-avatar">{{ c.instructor.name[0] }}</view>
              <text class="cct-name">{{ c.instructor.name }}</text>
            </view>
            <view class="cc-stats">
              <text class="cc-rating">⭐ {{ c.rating }}</text>
              <text class="cc-students">{{ c.students }}人</text>
            </view>
            <view class="cc-price-row">
              <text v-if="c.isFree" class="cc-free-price">免费</text>
              <template v-else>
                <text class="cc-price">¥{{ c.price }}</text>
                <text v-if="c.originalPrice > c.price" class="cc-original">¥{{ c.originalPrice }}</text>
              </template>
            </view>
          </view>
        </view>
      </view>

      <!-- 加载更多 -->
      <view v-if="loadingMore" class="load-more">加载中...</view>
      <view v-if="!hasMore && filteredCourses.length > 0" class="load-end">已经到底了</view>
    </view>

    <!-- 筛选弹窗 -->
    <view v-if="showFilter" class="filter-modal" @click="showFilter = false">
      <view class="fm-panel" @click.stop>
        <view class="fm-head">
          <text class="fm-title">筛选</text>
          <text class="fm-close" @click="showFilter = false">✕</text>
        </view>
        <view class="fm-body">
          <text class="fm-label">价格区间</text>
          <view class="fm-chips">
            <text v-for="r in priceRanges" :key="r" class="fm-chip" :class="{ active: priceRange === r }" @click="priceRange = r">{{ r }}</text>
          </view>
          <text class="fm-label">课程时长</text>
          <view class="fm-chips">
            <text v-for="d in durations" :key="d" class="fm-chip" :class="{ active: duration === d }" @click="duration = d">{{ d }}</text>
          </view>
        </view>
        <view class="fm-foot">
          <view class="fm-reset" @click="priceRange = '全部'; duration = '全部'">重置</view>
          <view class="fm-confirm" @click="showFilter = false">确定</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const searchQuery = ref('')
const activeCategory = ref('all')
const activeSort = ref('recommend')
const showSortMenu = ref(false)
const showFilter = ref(false)
const onlyFree = ref(false)
const priceRange = ref('全部')
const duration = ref('全部')
const currentBanner = ref(0)
const isLoading = ref(true)
const loadingMore = ref(false)
const hasMore = ref(true)
const flashCountdowns = ref<Record<string, { h: number; m: number; s: number }>>({})

const categories = [
  { id: 'all', name: '全部' }, { id: 'bazi', name: '八字命理' }, { id: 'ziwei', name: '紫微斗数' },
  { id: 'fengshui', name: '风水堪舆' }, { id: 'yijing', name: '易经' }, { id: 'mianxiang', name: '面相手相' },
  { id: 'qimen', name: '奇门遁甲' }, { id: 'liuyao', name: '六爻预测' },
]

const sortOptions = [
  { id: 'recommend', name: '综合推荐' }, { id: 'popular', name: '最受欢迎' },
  { id: 'newest', name: '最新上架' }, { id: 'price-asc', name: '价格最低' },
]

const priceRanges = ['全部', '免费', '0-100', '100-300', '300以上']
const durations = ['全部', '5小时内', '5-10小时', '10小时以上']

const recommendedCourses = [
  { id: 'featured-1', title: '八字命理大师班', subtitle: '零基础到精通', price: 1999, originalPrice: 3999, tag: '限时5折' },
  { id: 'featured-2', title: '紫微斗数精讲', subtitle: '名师亲授', price: 999, originalPrice: 1999, tag: '即将涨价' },
  { id: 'featured-3', title: '风水堪舆实战', subtitle: '案例教学', price: 1299, originalPrice: 2599, tag: '新课首发' },
]

const flashSaleCourses = [
  { id: 'flash-1', title: '六爻预测入门', price: 49, originalPrice: 199, discount: '2.5折' },
  { id: 'flash-2', title: '面相识人术', price: 69, originalPrice: 299, discount: '2.3折' },
  { id: 'flash-3', title: '姓名学精讲', price: 39, originalPrice: 149, discount: '2.6折' },
]

interface Course {
  id: string
  title: string
  instructor: { id: string; name: string; avatar: string }
  price: number
  originalPrice: number
  students: number
  rating: number
  chapters: number
  category: string
  tag: string
  isFree: boolean
}

const courses = ref<Course[]>([
  { id: '1', title: '八字入门实战课：从零开始学命理', instructor: { id: '1', name: '周易大师', avatar: '' }, price: 199, originalPrice: 399, students: 2860, rating: 4.9, chapters: 48, category: 'bazi', tag: 'TOP1', isFree: false },
  { id: '2', title: '紫微斗数命盘解读进阶', instructor: { id: '2', name: '张玄风', avatar: '' }, price: 299, originalPrice: 599, students: 1560, rating: 4.8, chapters: 36, category: 'ziwei', tag: '新课', isFree: false },
  { id: '3', title: '风水布局入门精讲', instructor: { id: '1', name: '陈风水', avatar: '' }, price: 0, originalPrice: 99, students: 5280, rating: 4.7, chapters: 12, category: 'fengshui', tag: '', isFree: true },
  { id: '4', title: '姓名学与起名技巧', instructor: { id: '2', name: '李国学', avatar: '' }, price: 149, originalPrice: 199, students: 1280, rating: 4.8, chapters: 18, category: 'bazi', tag: '', isFree: false },
  { id: '5', title: '易经六十四卦精讲', instructor: { id: '1', name: '周易大师', avatar: '' }, price: 399, originalPrice: 599, students: 3560, rating: 4.9, chapters: 64, category: 'yijing', tag: '热门', isFree: false },
  { id: '6', title: '面相入门与识人术', instructor: { id: '2', name: '王相师', avatar: '' }, price: 99, originalPrice: 149, students: 2180, rating: 4.6, chapters: 15, category: 'mianxiang', tag: '', isFree: false },
  { id: '7', title: '奇门遁甲入门班', instructor: { id: '1', name: '玄学居士', avatar: '' }, price: 299, originalPrice: 499, students: 980, rating: 4.8, chapters: 24, category: 'qimen', tag: '高阶', isFree: false },
  { id: '8', title: '六爻预测实战技法', instructor: { id: '2', name: '张玄风', avatar: '' }, price: 199, originalPrice: 299, students: 1520, rating: 4.7, chapters: 20, category: 'liuyao', tag: '', isFree: false },
])

const sortLabel = computed(() => sortOptions.find(s => s.id === activeSort.value)?.name || '综合推荐')

const filteredCourses = computed(() => {
  let list = courses.value.filter(c => {
    if (searchQuery.value && !c.title.includes(searchQuery.value) && !c.instructor.name.includes(searchQuery.value)) return false
    if (activeCategory.value !== 'all' && c.category !== activeCategory.value) return false
    if (onlyFree.value && !c.isFree) return false
    return true
  })
  if (activeSort.value === 'popular') list.sort((a, b) => b.students - a.students)
  else if (activeSort.value === 'newest') list.sort((a, b) => Number(b.id) - Number(a.id))
  else if (activeSort.value === 'price-asc') list.sort((a, b) => a.price - b.price)
  return list
})

function pad(n: number) { return String(n).padStart(2, '0') }

function onBannerChange(e: any) { currentBanner.value = e.detail.current }

function goPage(url: string) { uni.navigateTo({ url }) }

let flashTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  setTimeout(() => { isLoading.value = false }, 600)

  // 秒杀倒计时
  const endTimes: Record<string, number> = {
    'flash-1': Date.now() + 5 * 3600000,
    'flash-2': Date.now() + 8 * 3600000,
    'flash-3': Date.now() + 12 * 3600000,
  }
  const update = () => {
    const now = Date.now()
    const counts: Record<string, { h: number; m: number; s: number }> = {}
    for (const [id, end] of Object.entries(endTimes)) {
      const diff = Math.max(0, end - now)
      counts[id] = {
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      }
    }
    flashCountdowns.value = counts
  }
  update()
  flashTimer = setInterval(update, 1000)
})

onUnmounted(() => {
  if (flashTimer) clearInterval(flashTimer)
})
</script>

<style scoped>
.cl-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 40rpx; }

.header-sticky { position: sticky; top: 0; z-index: 40; background: rgba(250,248,245,0.95); backdrop-filter: blur(12rpx); border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; padding: 10rpx 24rpx; height: 80rpx; gap: 8rpx; }
.header-back { font-size: 48rpx; color: #333; width: 56rpx; }
.search-box { flex: 1; display: flex; align-items: center; height: 64rpx; background: #F2EFEA; border-radius: 32rpx; padding: 0 18rpx; border: 1px solid #E5E0D8; }
.search-icon { font-size: 24rpx; margin-right: 6rpx; }
.search-input { flex: 1; font-size: 24rpx; color: #333; }

.cat-row { display: flex; padding: 6rpx 24rpx 10rpx; white-space: nowrap; }
.cat-chip { font-size: 22rpx; color: #666; background: #fff; border: 1px solid #E8E0D5; padding: 6rpx 18rpx; border-radius: 24rpx; margin-right: 8rpx; display: inline-block; }
.cat-chip.active { background: #C41E3A; color: #fff; border-color: #C41E3A; }

.sort-bar { display: flex; justify-content: space-between; align-items: center; padding: 10rpx 24rpx; background: #FAF8F5; border-bottom: 1px solid #E8E0D5; position: sticky; top: 128rpx; z-index: 30; }
.sort-left { display: flex; align-items: center; gap: 24rpx; }
.sort-trigger { display: flex; align-items: center; gap: 4rpx; font-size: 24rpx; color: #2C2C2C; position: relative; }
.sort-arrow { font-size: 18rpx; color: #999; transition: transform 0.2s; }
.sort-arrow.open { transform: rotate(180deg); }
.free-toggle { font-size: 24rpx; color: #666; }
.free-toggle.active { color: #C41E3A; font-weight: 500; }
.filter-btn { font-size: 22rpx; color: #666; }

.sort-menu-mask { position: fixed; inset: 0; z-index: 10; }
.sort-menu { position: absolute; top: 56rpx; left: 24rpx; z-index: 20; background: #fff; border-radius: 12rpx; box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.1); overflow: hidden; min-width: 200rpx; }
.sort-item { display: block; padding: 16rpx 28rpx; font-size: 24rpx; color: #333; }
.sort-item.active { color: #C41E3A; background: rgba(196,30,58,0.04); }

.banner-wrap { margin: 14rpx 24rpx; position: relative; }
.banner-swiper { height: 220rpx; border-radius: 20rpx; overflow: hidden; }
.banner-slide { height: 100%; background: linear-gradient(135deg, #C41E3A, #8B0000); display: flex; align-items: center; justify-content: space-between; padding: 0 28rpx; }
.bs-text { flex: 1; }
.bs-badges { margin-bottom: 6rpx; }
.bs-badge { font-size: 18rpx; color: #8B0000; background: #FFD700; padding: 2rpx 12rpx; border-radius: 4rpx; font-weight: 700; }
.bs-title { font-size: 32rpx; font-weight: 700; color: #fff; display: block; margin-bottom: 2rpx; }
.bs-sub { font-size: 20rpx; color: rgba(255,255,255,0.75); display: block; margin-bottom: 10rpx; }
.bs-price-row { display: flex; align-items: baseline; gap: 10rpx; }
.bs-price { font-size: 36rpx; font-weight: 700; color: #FFD700; }
.bs-original { font-size: 20rpx; color: rgba(255,255,255,0.5); text-decoration: line-through; }
.bs-cover { width: 140rpx; height: 140rpx; background: rgba(255,255,255,0.15); border-radius: 16rpx; flex-shrink: 0; }
.banner-indicators { position: absolute; bottom: 14rpx; left: 50%; transform: translateX(-50%); display: flex; gap: 10rpx; }
.bi-dot { width: 10rpx; height: 10rpx; border-radius: 50%; background: rgba(255,255,255,0.5); transition: all 0.3s; }
.bi-dot.active { width: 28rpx; background: #fff; border-radius: 10rpx; }

.flash-section { padding: 0 24rpx; margin-bottom: 16rpx; }
.flash-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.flash-title-row { display: flex; align-items: center; gap: 8rpx; }
.flash-icon { font-size: 32rpx; }
.flash-title { font-size: 28rpx; font-weight: 700; color: #2C2C2C; }
.flash-status { display: flex; align-items: center; font-size: 20rpx; color: #C41E3A; }
.flash-more { font-size: 22rpx; color: #999; }

.flash-list { display: flex; gap: 12rpx; white-space: nowrap; }
.flash-card { flex-shrink: 0; width: 200rpx; background: #fff; border-radius: 16rpx; padding: 18rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); text-align: center; }
.fl-price { margin-bottom: 8rpx; }
.fl-price-val { font-size: 34rpx; font-weight: 700; color: #C41E3A; }
.fl-price-ori { font-size: 18rpx; color: #999; text-decoration: line-through; margin-left: 6rpx; }
.fl-name { font-size: 20rpx; color: #2C2C2C; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 10rpx; }
.fl-countdown { display: flex; align-items: center; justify-content: center; gap: 2rpx; font-size: 22rpx; margin-bottom: 10rpx; }
.fcd-num { width: 40rpx; height: 40rpx; background: #2C2C2C; color: #fff; font-size: 20rpx; border-radius: 4rpx; display: flex; align-items: center; justify-content: center; }
.fcd-num.sec { background: #C41E3A; }
.fl-discount { }
.fld-tag { font-size: 18rpx; color: #C41E3A; background: #FFF0F0; padding: 2rpx 12rpx; border-radius: 20rpx; }

.list-header { display: flex; align-items: center; gap: 8rpx; padding: 0 24rpx; margin-bottom: 14rpx; }
.lh-icon { font-size: 28rpx; }
.lh-title { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }

.course-list { padding: 0 24rpx; }
.course-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14rpx; }

.course-card { background: #fff; border-radius: 16rpx; overflow: hidden; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.cc-cover { aspect-ratio: 3/4; background: #F5F1EB; position: relative; }
.cc-tag { position: absolute; top: 10rpx; left: 10rpx; font-size: 18rpx; color: #fff; background: #C41E3A; padding: 2rpx 10rpx; border-radius: 4rpx; }
.cc-free { position: absolute; top: 10rpx; left: 10rpx; font-size: 18rpx; color: #52C41A; background: rgba(82,196,26,0.1); padding: 2rpx 10rpx; border-radius: 4rpx; }

.cc-info { padding: 16rpx; }
.cc-title { font-size: 24rpx; font-weight: 500; color: #2C2C2C; display: block; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; min-height: 64rpx; margin-bottom: 8rpx; }
.cc-teacher { display: flex; align-items: center; gap: 6rpx; margin-bottom: 8rpx; }
.cct-avatar { width: 36rpx; height: 36rpx; border-radius: 50%; background: #F5F1EB; display: flex; align-items: center; justify-content: center; font-size: 18rpx; color: #999; flex-shrink: 0; }
.cct-name { font-size: 20rpx; color: #999; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cc-stats { display: flex; gap: 12rpx; margin-bottom: 8rpx; }
.cc-rating { font-size: 20rpx; color: #C9A96E; }
.cc-students { font-size: 20rpx; color: #BBB; }
.cc-price-row { display: flex; align-items: baseline; gap: 8rpx; }
.cc-price { font-size: 28rpx; font-weight: 700; color: #C41E3A; }
.cc-original { font-size: 20rpx; color: #BBB; text-decoration: line-through; }
.cc-free-price { font-size: 28rpx; font-weight: 700; color: #52C41A; }

.sk-card { background: #fff; border-radius: 16rpx; overflow: hidden; }
.sk-cover { aspect-ratio: 3/4; background: #F2EFEA; }
.sk-info { padding: 16rpx; }
.sk-line { height: 16rpx; background: #F2EFEA; border-radius: 4rpx; margin-bottom: 8rpx; }
.w-30 { width: 100rpx; }
.w-50 { width: 160rpx; }
.w-80 { width: 100%; }
@keyframes pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
.sk-card { animation: pulse 1.5s infinite; }

.empty-wrap { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 16rpx; opacity: 0.3; }
.empty-text { font-size: 28rpx; color: #999; }

.load-more { text-align: center; padding: 20rpx 0; font-size: 24rpx; color: #999; }
.load-end { text-align: center; padding: 20rpx 0; font-size: 24rpx; color: #BBB; }

.filter-modal { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.4); display: flex; align-items: flex-end; }
.fm-panel { width: 100%; background: #fff; border-radius: 24rpx 24rpx 0 0; }
.fm-head { display: flex; justify-content: space-between; align-items: center; padding: 20rpx 24rpx; border-bottom: 1px solid #F0EDE5; }
.fm-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; }
.fm-close { font-size: 36rpx; color: #999; }
.fm-body { padding: 20rpx 24rpx; }
.fm-label { font-size: 24rpx; font-weight: 500; color: #333; display: block; margin-bottom: 12rpx; }
.fm-chips { display: flex; gap: 10rpx; margin-bottom: 24rpx; }
.fm-chip { font-size: 22rpx; color: #666; background: #F5F1EB; padding: 10rpx 24rpx; border-radius: 24rpx; }
.fm-chip.active { background: #C41E3A; color: #fff; }
.fm-foot { display: flex; gap: 16rpx; padding: 16rpx 24rpx 24rpx; border-top: 1px solid #F0EDE5; }
.fm-reset { flex: 1; padding: 16rpx; text-align: center; background: #F5F1EB; border-radius: 20rpx; font-size: 26rpx; color: #666; }
.fm-confirm { flex: 1; padding: 16rpx; text-align: center; background: #C41E3A; border-radius: 20rpx; font-size: 26rpx; color: #fff; }
</style>
