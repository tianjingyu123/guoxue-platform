<script setup lang="ts">
/** 国学课程首页 - 从原型 app/courses/page.tsx 迁移 */
import { ref, computed, onMounted } from 'vue'
import { navigateTo, goBack } from '@/utils/router'
import AppIcon from '@/components/common/app-icon.vue'
import HomeBanner from '@/components/home/home-banner.vue'
import CourseCard from '@/components/cards/course-card.vue'
import SectionHeader from '@/components/courses/section-header.vue'
import { courseApi } from '@/lib/course-data'

const loading = ref(true)
const error = ref('')

// 首页聚合数据对象，下方多个 computed 裸取字段，保留 any 避免 null 链式报错
const homeData = ref<any>(null)

// 通过 computed 保持 template 变量名不变
const courseBanners = computed(() => homeData.value?.banners ?? [])
const categoryNav = computed(() => homeData.value?.categories ?? [])
const allCourses = computed(() => homeData.value?.allCourses ?? [])
const featured = computed(() => homeData.value?.featured ?? [])
const ranking = computed(() => homeData.value?.ranking ?? [])
const flashSaleCourses = computed(() => homeData.value?.flashSale ?? [])
const freeCourses = computed(() => homeData.value?.free ?? [])
const newCourses = computed(() => homeData.value?.newCourses ?? [])
const feedFilters = computed(() => homeData.value?.feedFilters ?? [])

const activeCategory = ref('all')

const selected = computed(() =>
  allCourses.value.filter((c: any) => activeCategory.value === 'all' || c.category === activeCategory.value),
)
// react-masonry-css 按索引轮流填列:偶数→左列,奇数→右列
const colLeft = computed(() => selected.value.filter((_: any, i: number) => i % 2 === 0))
const colRight = computed(() => selected.value.filter((_: any, i: number) => i % 2 === 1))

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const res = await courseApi.getHome()
    homeData.value = res
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})

function openCategory(id: string) { navigateTo(`/courses-list?category=${id}`) }
</script>

<template>
  <!-- Loading -->
  <view v-if="loading" class="loading-wrap">
    <text class="loading-text">加载中...</text>
  </view>
  <!-- Error -->
  <view v-else-if="error" class="error-wrap">
    <text class="error-text">{{ error }}</text>
    <view class="retry-btn" @tap="loadData"><text class="retry-text">重试</text></view>
  </view>
  <!-- Content -->
  <view v-else class="page">
    <!-- 顶部栏 -->
    <view class="hdr">
      <view class="hdr-bar">
        <view class="back-btn" @tap="goBack">
          <app-icon name="chevron-left" :size="44" color="var(--text-strong)" />
        </view>
        <text class="hdr-title">国学课程</text>
      </view>
      <!-- AI 搜索栏 -->
      <view class="search-wrap">
        <search-bar default-tab="course" placeholder="搜索课程、讲师..." />
      </view>
    </view>

    <!-- Banner -->
    <home-banner :banners="courseBanners" />

    <!-- 分类导航 -->
    <view class="cat-grid">
      <view v-for="cat in categoryNav" :key="cat.id" class="cat-item" @tap="openCategory(cat.id)">
        <view class="cat-ico" :style="{ background: cat.color + '1a' }">
          <app-icon :name="cat.icon" :size="48" :color="cat.color" />
        </view>
        <text class="cat-label">{{ cat.label }}</text>
      </view>
    </view>

    <!-- 限时优惠 -->
    <view v-if="flashSaleCourses.length" class="sec sec-flash">
      <section-header icon="clock" title="限时优惠" subtitle="好课五折抢" more-link="/courses/flash-sale" icon-color="#e67e22" />
      <scroll-view class="rail-row" scroll-x :show-scrollbar="false">
        <view class="rail-inner">
          <course-card v-for="c in flashSaleCourses" :key="c.id" :data="c" variant="rail" />
        </view>
      </scroll-view>
    </view>

    <!-- 精选好课 -->
    <view v-if="featured.length" class="sec">
      <section-header icon="award" title="精选好课" subtitle="编辑严选" more-link="/courses-list?sort=recommend" icon-color="#c0392b" />
      <scroll-view class="rail-row" scroll-x :show-scrollbar="false">
        <view class="rail-inner">
          <course-card v-for="c in featured" :key="c.id" :data="c" variant="rail" />
        </view>
      </scroll-view>
    </view>

    <!-- 热门排行 -->
    <view v-if="ranking.length" class="sec">
      <section-header icon="flame" title="热门排行" subtitle="学员都在学" more-link="/courses-list?sort=popular" icon-color="#e74c3c" />
      <view class="rank-card">
        <view v-for="(c, i) in ranking" :key="c.id" class="rank-cell" :class="{ 'rank-div': i > 0 }">
          <course-card :data="c" variant="rank" :rank="i + 1" />
        </view>
      </view>
    </view>

    <!-- 会员免费 -->
    <view v-if="freeCourses.length" class="sec">
      <section-header icon="crown" title="会员免费" subtitle="开通会员畅学" more-link="/courses-list?filter=free" icon-color="#16a085" />
      <scroll-view class="rail-row" scroll-x :show-scrollbar="false">
        <view class="rail-inner">
          <course-card v-for="c in freeCourses" :key="c.id" :data="c" variant="rail" />
        </view>
      </scroll-view>
    </view>

    <!-- 新上架 -->
    <view v-if="newCourses.length" class="sec">
      <section-header icon="sparkles" title="新上架" subtitle="抢先学习" more-link="/courses-list?sort=newest" icon-color="#2980b9" />
      <scroll-view class="rail-row" scroll-x :show-scrollbar="false">
        <view class="rail-inner">
          <course-card v-for="c in newCourses" :key="c.id" :data="c" variant="rail" />
        </view>
      </scroll-view>
    </view>

    <!-- 为你精选 瀑布流 -->
    <view class="sec-feed">
      <view class="feed-hd">
        <text class="feed-title">为你精选</text>
        <text class="feed-more" @tap="navigateTo('/courses-list')">更多课程</text>
      </view>
      <scroll-view class="filter-row" scroll-x :show-scrollbar="false">
        <view class="filter-inner">
          <view
            v-for="f in feedFilters" :key="f.id"
            class="filter-chip" :class="{ on: activeCategory === f.id }"
            @tap="activeCategory = f.id"
          >
            <text class="filter-txt" :class="{ on: activeCategory === f.id }">{{ f.label }}</text>
          </view>
        </view>
      </scroll-view>
      <view v-if="selected.length" class="masonry">
        <view class="masonry-col">
          <course-card v-for="c in colLeft" :key="c.id" :data="c" variant="feed" />
        </view>
        <view class="masonry-col">
          <course-card v-for="c in colRight" :key="c.id" :data="c" variant="feed" />
        </view>
      </view>
      <view v-else class="empty">
        <text class="empty-txt">该分类暂无课程</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg); padding-bottom: 40rpx; }

/* 顶部栏 */
.hdr { position: sticky; top: 0; z-index: 20; background: var(--surface); border-bottom: 2rpx solid var(--line); }
.hdr-bar { display: flex; align-items: center; gap: 16rpx; padding: 0 24rpx; height: 88rpx; }
.back-btn { display: flex; align-items: center; justify-content: center; width: 56rpx; height: 56rpx; margin-left: -12rpx; }
.hdr-title { font-size: 36rpx; font-weight: 600; color: var(--text-strong); }
.search-wrap { padding: 0 32rpx 20rpx; }
.search-bar { display: flex; align-items: center; gap: 14rpx; height: 72rpx; padding: 0 24rpx; border-radius: 999rpx; background: var(--surface-sunken); }
.search-ph { flex: 1; font-size: 28rpx; color: var(--text-soft); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.ai-tag { flex-shrink: 0; display: flex; align-items: center; gap: 6rpx; padding: 4rpx 16rpx; border-radius: 999rpx; background: rgba(196,30,58,0.12); }
.ai-txt { font-size: 22rpx; font-weight: 500; color: var(--brand); }

/* 分类导航 */
.cat-grid { display: grid; grid-template-columns: repeat(4, 1fr); row-gap: 32rpx; padding: 24rpx 32rpx; }
.cat-item { display: flex; flex-direction: column; align-items: center; gap: 12rpx; }
.cat-ico { display: flex; align-items: center; justify-content: center; width: 96rpx; height: 96rpx; border-radius: 32rpx; }
.cat-label { font-size: 24rpx; color: var(--text-strong); }

/* 专栏 */
.sec { margin-top: 40rpx; }
.sec-flash { margin-top: 16rpx; }
.rail-row { white-space: nowrap; }
.rail-inner { display: inline-flex; gap: 24rpx; padding: 0 32rpx 8rpx; }

/* 排行榜卡 */
.rank-card { margin: 0 32rpx; padding: 0 24rpx; border-radius: 32rpx; background: var(--surface); border: 2rpx solid var(--line); }
.rank-div { border-top: 2rpx solid var(--line); }

/* 为你精选 */
.sec-feed { margin-top: 48rpx; }
.feed-hd { display: flex; align-items: center; padding: 0 32rpx; margin-bottom: 24rpx; }
.feed-title { font-size: 34rpx; font-weight: 700; letter-spacing: -0.5rpx; color: var(--text-strong); }
.feed-more { margin-left: auto; font-size: 26rpx; color: var(--text-soft); }
.filter-row { white-space: nowrap; }
.filter-inner { display: inline-flex; gap: 16rpx; padding: 0 32rpx 24rpx; }
.filter-chip { flex-shrink: 0; padding: 12rpx 28rpx; border-radius: 999rpx; background: var(--surface-sunken); }
.filter-chip.on { background: var(--brand); }
.filter-txt { font-size: 28rpx; color: var(--text-soft); white-space: nowrap; }
.filter-txt.on { color: #fff; }
.masonry { display: flex; gap: 24rpx; padding: 0 32rpx; }
.masonry-col { flex: 1; display: flex; flex-direction: column; gap: 24rpx; min-width: 0; }
.empty { padding: 128rpx 0; text-align: center; }
.empty-txt { font-size: 28rpx; color: var(--text-soft); }

/* 加载 / 错误 */
.loading-wrap, .error-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 24rpx; }
.loading-text, .error-text { font-size: 28rpx; color: var(--text-soft); }
.retry-btn { padding: 16rpx 48rpx; background: var(--brand); border-radius: 999rpx; }
.retry-text { font-size: 28rpx; color: #fff; }
</style>
