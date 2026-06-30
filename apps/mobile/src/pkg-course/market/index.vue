<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import CourseCard from '@/components/cards/course-card.vue'
import SectionHeader from '@/components/courses/section-header.vue'
import HomeBanner from '@/components/home/home-banner.vue'
import { navigateTo, navigateBack } from '@/utils/router'

/** 课程市场页 - 从原型 app/courses/page.tsx 迁移 */

interface Course {
  id: string
  category: string
  title: string
  cover: string
  coverRatio?: string
  teacher: string
  teacherAvatar?: string
  price: number
  originalPrice?: number
  free?: boolean
  students?: number
  lessons?: number
  rating?: number
  tag?: string
  isNew?: boolean
  flashSale?: boolean
}

// 课程首页 Banner
const courseBanners = [
  { id: 'b1', image: '/static/images/banners/banner-1.webp', title: '八字命理系统精讲 · 限时五折', link: '/course/c4' },
  { id: 'b2', image: '/static/images/banners/banner-2.webp', title: '紫微斗数大师直播课 火热报名', link: '/course/c1' },
  { id: 'b3', image: '/static/images/banners/banner-3.webp', title: '新人专享 · 名师好课首单立减', link: '/courses/flash-sale' },
]

// 分类导航（图标式，国学特色）
const categoryNav = [
  { id: 'bazi', label: '八字命理', icon: 'scroll-text', color: '#c0392b' },
  { id: 'ziwei', label: '紫微斗数', icon: 'star', color: '#8e44ad' },
  { id: 'fengshui', label: '风水堪舆', icon: 'compass', color: '#16a085' },
  { id: 'yijing', label: '易经', icon: 'book-marked', color: '#2980b9' },
  { id: 'zhongyi', label: '中医养生', icon: 'stethoscope', color: '#27ae60' },
  { id: 'yangsheng', label: '养生', icon: 'leaf', color: '#7f8c8d' },
  { id: 'shufa', label: '书法', icon: 'pen-tool', color: '#d35400' },
  { id: 'qimen', label: '奇门遁甲', icon: 'mountain', color: '#2c3e50' },
]

const allCourses: Course[] = [
  { id: 'c1', category: 'ziwei', title: '紫微斗数入门到精通', cover: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400&q=80', coverRatio: '1:1', teacher: '林道长', teacherAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&q=80', price: 199, originalPrice: 399, students: 3200, lessons: 36, rating: 4.9, tag: '热销', flashSale: true },
  { id: 'c2', category: 'fengshui', title: '风水堪舆实战班', cover: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80', coverRatio: '1:1', teacher: '王大师', teacherAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80', price: 299, originalPrice: 599, students: 1800, lessons: 48, rating: 4.8, tag: '热销' },
  { id: 'c3', category: 'liuyao', title: '六爻预测从零开始', cover: 'https://images.unsplash.com/photo-1519791883288-dc8bd696e667?w=400&q=80', coverRatio: '3:4', teacher: '陈老师', teacherAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80', price: 128, originalPrice: 299, students: 1300, lessons: 24, rating: 4.7, flashSale: true },
  { id: 'c4', category: 'bazi', title: '八字命理系统精讲', cover: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&q=80', coverRatio: '1:1', teacher: '张师傅', teacherAvatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&q=80', price: 268, originalPrice: 498, students: 4100, lessons: 52, rating: 4.9, tag: '热销' },
  { id: 'c5', category: 'qimen', title: '奇门遁甲实战应用', cover: 'https://images.unsplash.com/photo-1471107340929-a87cd0f5b5f3?w=400&q=80', coverRatio: '3:4', teacher: '赵先生', teacherAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80', price: 388, originalPrice: 688, students: 920, lessons: 40, rating: 4.8 },
  { id: 'c6', category: 'qiming', title: '宝宝起名改名全攻略', cover: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&q=80', coverRatio: '1:1', teacher: '李老师', teacherAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80', price: 99, originalPrice: 199, students: 2700, lessons: 18, rating: 4.7, tag: '新品', isNew: true },
  { id: 'c7', category: 'mianxiang', title: '面相识人快速入门', cover: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=400&q=80', coverRatio: '3:4', teacher: '周老师', teacherAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&q=80', price: 0, free: true, students: 8600, lessons: 12, rating: 4.6 },
  { id: 'c8', category: 'bazi', title: '八字合婚实操课', cover: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=400&q=80', coverRatio: '1:1', teacher: '孙大师', teacherAvatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=100&q=80', price: 0, free: true, students: 1500, lessons: 20, rating: 4.8 },
  { id: 'c9', category: 'ziwei', title: '紫微飞星进阶秘传', cover: 'https://images.unsplash.com/photo-1532074205216-d0e1f4b87368?w=400&q=80', coverRatio: '3:4', teacher: '林道长', teacherAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&q=80', price: 458, originalPrice: 888, students: 680, lessons: 60, rating: 4.9, tag: '新品', isNew: true },
  { id: 'c10', category: 'fengshui', title: '阳宅风水布局详解', cover: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=400&q=80', coverRatio: '1:1', teacher: '王大师', teacherAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80', price: 199, originalPrice: 399, students: 2200, lessons: 32, rating: 4.7, isNew: true },
]

const featured = allCourses.filter((c) => c.tag === '热销').slice(0, 6)
const ranking = [...allCourses].sort((a, b) => (b.students ?? 0) - (a.students ?? 0)).slice(0, 5)
const flashSale = allCourses.filter((c) => c.flashSale)
const freeCourses = allCourses.filter((c) => c.free)
const newCourses = allCourses.filter((c) => c.isNew)

const feedTabs = [
  { id: 'all', label: '全部' },
  { id: 'bazi', label: '八字命理' },
  { id: 'ziwei', label: '紫微斗数' },
  { id: 'fengshui', label: '风水堪舆' },
  { id: 'qimen', label: '奇门遁甲' },
  { id: 'mianxiang', label: '面相手相' },
]

const activeCategory = ref('all')

const selected = computed(() =>
  allCourses.filter((c) => activeCategory.value === 'all' || c.category === activeCategory.value),
)

// 双列瀑布流分配（uni 无 react-masonry-css，按索引奇偶分列）
const feedColumns = computed(() => {
  const cols: Course[][] = [[], []]
  selected.value.forEach((c, i) => cols[i % 2].push(c))
  return cols
})

onLoad(() => {})

function goBack() {
  navigateBack(1)
}
function goCategory(id: string) {
  navigateTo(`/courses-list?category=${id}`)
}
function setCategory(id: string) {
  activeCategory.value = id
}
</script>

<template>
  <view class="page">
    <!-- 顶部栏 -->
    <view class="header">
      <view class="header-bar">
        <view class="back-btn" hover-class="press" @tap="goBack">
          <app-icon name="arrow-left" :size="36" color="var(--text-strong)" />
        </view>
        <text class="header-title">国学课程</text>
      </view>
      <!-- AI 搜索栏 -->
      <view class="search-wrap">
        <search-bar default-tab="course" placeholder="搜索课程、讲师..." />
      </view>
    </view>

    <!-- Banner 轮播 -->
    <home-banner :banners="courseBanners" />

    <!-- 分类导航 -->
    <view class="cat-nav">
      <view v-for="cat in categoryNav" :key="cat.id" class="cat-item" hover-class="press" @tap="goCategory(cat.id)">
        <view class="cat-ico" :style="{ background: cat.color + '1a' }">
          <app-icon :name="cat.icon" :size="44" :color="cat.color" />
        </view>
        <text class="cat-label">{{ cat.label }}</text>
      </view>
    </view>

    <!-- 限时优惠 -->
    <view v-if="flashSale.length" class="section">
      <section-header icon="clock" title="限时优惠" subtitle="好课五折抢" more-href="/courses/flash-sale" icon-color="#e67e22" />
      <scroll-view scroll-x class="rail-scroll" :show-scrollbar="false">
        <view class="rail-row">
          <course-card v-for="c in flashSale" :key="c.id" :data="c" variant="rail" />
        </view>
      </scroll-view>
    </view>

    <!-- 精选好课 -->
    <view v-if="featured.length" class="section">
      <section-header icon="award" title="精选好课" subtitle="编辑严选" more-href="/courses-list?sort=recommend" icon-color="#c0392b" />
      <scroll-view scroll-x class="rail-scroll" :show-scrollbar="false">
        <view class="rail-row">
          <course-card v-for="c in featured" :key="c.id" :data="c" variant="rail" />
        </view>
      </scroll-view>
    </view>

    <!-- 热门排行 -->
    <view v-if="ranking.length" class="section">
      <section-header icon="flame" title="热门排行" subtitle="学员都在学" more-href="/courses-list?sort=popular" icon-color="#e74c3c" />
      <view class="rank-card">
        <course-card v-for="(c, i) in ranking" :key="c.id" :data="c" variant="rank" :rank="i + 1" />
      </view>
    </view>

    <!-- 会员免费 -->
    <view v-if="freeCourses.length" class="section">
      <section-header icon="crown" title="会员免费" subtitle="开通会员畅学" more-href="/courses-list?filter=free" icon-color="#16a085" />
      <scroll-view scroll-x class="rail-scroll" :show-scrollbar="false">
        <view class="rail-row">
          <course-card v-for="c in freeCourses" :key="c.id" :data="c" variant="rail" />
        </view>
      </scroll-view>
    </view>

    <!-- 新上架 -->
    <view v-if="newCourses.length" class="section">
      <section-header icon="sparkles" title="新上架" subtitle="抢先学习" more-href="/courses-list?sort=newest" icon-color="#2980b9" />
      <scroll-view scroll-x class="rail-scroll" :show-scrollbar="false">
        <view class="rail-row">
          <course-card v-for="c in newCourses" :key="c.id" :data="c" variant="rail" />
        </view>
      </scroll-view>
    </view>

    <!-- 为你精选 瀑布流 -->
    <view class="section feed-section">
      <view class="feed-head">
        <text class="feed-title">为你精选</text>
        <text class="feed-more" hover-class="press" @tap="navigateTo('/courses-list')">更多课程</text>
      </view>
      <scroll-view scroll-x class="tab-scroll" :show-scrollbar="false">
        <view class="tab-row">
          <view
            v-for="cat in feedTabs"
            :key="cat.id"
            class="tab-chip"
            :class="{ 'tab-chip--on': activeCategory === cat.id }"
            hover-class="press"
            @tap="setCategory(cat.id)"
          >
            {{ cat.label }}
          </view>
        </view>
      </scroll-view>
      <view v-if="selected.length" class="feed-masonry">
        <view class="feed-col">
          <course-card v-for="c in feedColumns[0]" :key="c.id" :data="c" variant="feed" />
        </view>
        <view class="feed-col">
          <course-card v-for="c in feedColumns[1]" :key="c.id" :data="c" variant="feed" />
        </view>
      </view>
      <view v-else class="empty">
        <text class="empty-text">该分类暂无课程</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: var(--surface-base, #f7f4ef);
  padding-bottom: 40rpx;
}
.press {
  opacity: 0.6;
}

/* 顶部栏 */
.header {
  position: sticky;
  top: 0;
  z-index: 20;
  background: var(--surface-card, #fff);
  border-bottom: 2rpx solid var(--border-soft, #ececec);
}
.header-bar {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 0 24rpx;
  height: 96rpx;
}
.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56rpx;
  height: 56rpx;
}
.header-title {
  font-size: 34rpx;
  font-weight: 600;
  color: var(--text-strong, #1a1a1a);
}
.search-wrap {
  padding: 0 24rpx 20rpx;
}
.search-bar {
  display: flex;
  align-items: center;
  gap: 14rpx;
  height: 72rpx;
  padding: 0 24rpx;
  border-radius: 999rpx;
  background: var(--surface-sunken, #f1ede6);
}
.search-ph {
  flex: 1;
  font-size: 26rpx;
  color: var(--text-soft, #999);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.ai-tag {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  background: color-mix(in srgb, var(--brand, var(--brand)) 15%, transparent);
}
.ai-text {
  font-size: 22rpx;
  font-weight: 500;
  color: var(--brand, var(--brand));
}

/* 分类导航 */
.cat-nav {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  row-gap: 28rpx;
  padding: 24rpx;
}
.cat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}
.cat-ico {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 96rpx;
  height: 96rpx;
  border-radius: 28rpx;
}
.cat-label {
  font-size: 24rpx;
  color: var(--text-strong, #1a1a1a);
}

/* 专栏 */
.section {
  margin-top: 32rpx;
}
.rail-scroll {
  width: 100%;
  white-space: nowrap;
}
.rail-row {
  display: inline-flex;
  gap: 24rpx;
  padding: 0 24rpx 8rpx;
}
.rank-card {
  margin: 0 24rpx;
  border-radius: 28rpx;
  background: var(--surface-card, #fff);
  border: 2rpx solid var(--border-soft, #ececec);
  padding: 0 24rpx;
}
.rank-card :deep(.rank + .rank) {
  border-top: 2rpx solid var(--border-soft, #ececec);
}

/* 为你精选 */
.feed-section {
  margin-top: 40rpx;
}
.feed-head {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 0 24rpx;
  margin-bottom: 20rpx;
}
.feed-title {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--text-strong, #1a1a1a);
}
.feed-more {
  margin-left: auto;
  font-size: 26rpx;
  color: var(--text-soft, #999);
}
.tab-scroll {
  width: 100%;
  white-space: nowrap;
}
.tab-row {
  display: inline-flex;
  gap: 16rpx;
  padding: 0 24rpx 20rpx;
}
.tab-chip {
  flex-shrink: 0;
  padding: 12rpx 28rpx;
  border-radius: 999rpx;
  font-size: 26rpx;
  background: var(--surface-sunken, #f1ede6);
  color: var(--text-soft, #999);
}
.tab-chip--on {
  background: var(--brand, var(--brand));
  color: #fff;
}
.feed-masonry {
  display: flex;
  gap: 24rpx;
  padding: 0 24rpx;
}
.feed-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  min-width: 0;
}
.empty {
  padding: 120rpx 0;
  text-align: center;
}
.empty-text {
  font-size: 26rpx;
  color: var(--text-soft, #999);
}
</style>
