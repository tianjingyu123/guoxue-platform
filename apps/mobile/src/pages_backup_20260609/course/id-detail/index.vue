<template>
  <view class="co-page">
    <!-- 封面轮播 -->
    <swiper class="cover-swiper" indicator-dots autoplay circular>
      <swiper-item v-for="(img, i) in course.images" :key="i">
        <view class="cover-slide">{{ img }}</view>
      </swiper-item>
    </swiper>

    <!-- 限时优惠倒计时 -->
    <view v-if="!isPurchased" class="countdown-bar">
      <view class="cd-left">
        <text class="cd-icon">⏰</text>
        <text class="cd-title">限时特惠</text>
        <text class="cd-badge">省¥{{ course.originalPrice - course.currentPrice }}</text>
      </view>
      <view class="cd-timer">
        <text class="cd-time">{{ countdown.h }}:{{ countdown.m }}:{{ countdown.s }}</text>
      </view>
    </view>

    <!-- 课程基本信息 -->
    <view class="course-info">
      <text class="ci-title">{{ course.title }}</text>
      <view class="ci-tags">
        <text v-for="tag in course.tags" :key="tag" class="ci-tag">{{ tag }}</text>
      </view>
      <view class="ci-price-row">
        <view class="ci-price">
          <text class="ci-current">¥{{ course.currentPrice }}</text>
          <text class="ci-original">¥{{ course.originalPrice }}</text>
        </view>
        <text class="ci-students">{{ course.studentsCount.toLocaleString() }} 人已学习</text>
      </view>
    </view>

    <!-- 讲师信息 -->
    <view class="instructor-card" @click="goPage('/pages/expert/id-detail/index')">
      <view class="ic-top">
        <view class="ic-avatar">{{ course.instructor.name[0] }}</view>
        <view class="ic-info">
          <view class="ic-name-row">
            <text class="ic-name">{{ course.instructor.name }}</text>
            <text v-if="course.instructor.isVerified" class="ic-verify">V</text>
            <text class="ic-title">{{ course.instructor.title }}</text>
          </view>
          <text class="ic-desc">{{ course.instructor.description }}</text>
          <view class="ic-stats">
            <text>{{ course.instructor.coursesCount }} 门课程</text>
            <text>{{ course.instructor.studentsCount.toLocaleString() }} 学员</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 优惠券领取 -->
    <view v-if="!isPurchased" class="coupon-card">
      <view class="cc-left">
        <text class="cc-amount">¥30</text>
        <view class="cc-info">
          <text class="cc-label">优惠券</text>
          <text class="cc-cond">满¥{{ 199 }}可用</text>
        </view>
      </view>
      <view class="cc-right">
        <text class="cc-btn">立即领取</text>
      </view>
    </view>

    <!-- 课程介绍 -->
    <view class="section">
      <text class="section-title">课程介绍</text>
      <view class="highlights">
        <text v-for="h in course.highlights" :key="h" class="hl-item">✓ {{ h }}</text>
      </view>
      <text class="desc-text">{{ course.description }}</text>
    </view>

    <!-- 课程目录 -->
    <view class="section">
      <text class="section-title">课程目录 ({{ totalChapters }}节)</text>
      <view v-for="section in course.sections" :key="section.id" class="chapter-section">
        <text class="cs-title">{{ section.title }}</text>
        <view v-for="ch in section.chapters" :key="ch.id" class="chapter-item" @click="handlePlayChapter(ch)">
          <view class="ch-left">
            <text class="ch-status">{{ ch.isFree ? '🆓' : '🔒' }}</text>
            <text class="ch-name">{{ ch.title }}</text>
          </view>
          <text class="ch-duration">{{ ch.duration }}</text>
        </view>
      </view>
    </view>

    <!-- 学员评价 -->
    <view class="section">
      <view class="review-header">
        <text class="section-title">学员评价</text>
        <view class="rh-rating">
          <text class="rh-score">⭐ {{ course.averageRating }}</text>
          <text class="rh-count">({{ course.totalReviews }})</text>
        </view>
      </view>
      <view v-for="r in course.reviews" :key="r.id" class="review-item">
        <view class="ri-top">
          <view class="ri-user">
            <text class="ri-avatar">{{ r.userName[0] }}</text>
            <view>
              <text class="ri-name">{{ r.userName }}</text>
              <view class="ri-stars">{{ '⭐'.repeat(r.rating) }}</view>
            </view>
          </view>
          <text class="ri-date">{{ r.date }}</text>
        </view>
        <text class="ri-content">{{ r.content }}</text>
        <text class="ri-likes">{{ r.likes }} 👍</text>
      </view>
    </view>

    <!-- 底部占位 -->
    <view style="height: 140rpx" />

    <!-- 底部操作栏 -->
    <view class="bottom-bar">
      <view class="bb-left">
        <view class="bb-action" @click="isFavorited = !isFavorited">
          <text>{{ isFavorited ? '❤️' : '🤍' }}</text>
          <text class="bb-label">收藏</text>
        </view>
        <view class="bb-action" @click="handleShare">
          <text>📤</text>
          <text class="bb-label">分享</text>
        </view>
      </view>
      <view class="bb-right">
        <template v-if="isPurchased">
          <view class="bb-buy" @click="handleStartLearning"><text>继续学习</text></view>
        </template>
        <template v-else>
          <view class="bb-cart" @click="handleAddToCart"><text>购物车</text></view>
          <view class="bb-buy" @click="handleBuy"><text>立即购买 ¥{{ course.currentPrice }}</text></view>
        </template>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const isPurchased = ref(false)
const isFavorited = ref(false)

const course = {
  id: '1',
  title: '八字命理学入门到精通：从基础理论到实战应用',
  images: ['🏔️', '🌅', '🏯'],
  currentPrice: 199,
  originalPrice: 599,
  studentsCount: 3286,
  tags: ['八字入门', '命理学', '实战案例'],
  instructor: {
    name: '李易轩', avatar: '', title: '命理大师',
    description: '20年命理学研究，著有《八字精解》等多部著作',
    coursesCount: 12, studentsCount: 28600, isVerified: true,
  },
  description: `本课程是一套系统的八字命理学习课程，从零基础入门到高级实战，帮助学员全面掌握八字命理的核心知识。\n\n课程内容涵盖：\n• 八字基础理论：天干地支、阴阳五行、十神关系\n• 命局分析方法：格局判断、喜忌分析、大运流年\n• 实战案例解析：婚姻感情、事业财运、健康寿元\n• 高级技法：神煞应用、纳音断命、特殊格局`,
  highlights: ['系统教学', '案例实操', '一对一答疑', '永久回看'],
  sections: [
    { id: 's1', title: '第一章 八字命理基础', chapters: [
      { id: 'c1', title: '1.1 什么是八字命理', duration: '12分钟', isFree: true },
      { id: 'c2', title: '1.2 天干地支详解', duration: '18分钟', isFree: true },
      { id: 'c3', title: '1.3 阴阳五行理论', duration: '25分钟', isFree: false },
      { id: 'c4', title: '1.4 十神关系入门', duration: '22分钟', isFree: false },
    ]},
    { id: 's2', title: '第二章 命局分析方法', chapters: [
      { id: 'c5', title: '2.1 八字格局判断', duration: '28分钟', isFree: false },
      { id: 'c6', title: '2.2 喜用神分析', duration: '32分钟', isFree: false },
      { id: 'c7', title: '2.3 大运流年解读', duration: '35分钟', isFree: false },
    ]},
    { id: 's3', title: '第三章 实战案例解析', chapters: [
      { id: 'c8', title: '3.1 婚姻感情案例', duration: '40分钟', isFree: false },
      { id: 'c9', title: '3.2 事业财运案例', duration: '38分钟', isFree: false },
      { id: 'c10', title: '3.3 健康寿元案例', duration: '30分钟', isFree: false },
    ]},
    { id: 's4', title: '第四章 高级进阶技法', chapters: [
      { id: 'c11', title: '4.1 神煞的实战应用', duration: '45分钟', isFree: false },
      { id: 'c12', title: '4.2 纳音断命法', duration: '35分钟', isFree: false },
      { id: 'c13', title: '4.3 特殊格局详解', duration: '42分钟', isFree: false },
    ]},
  ],
  reviews: [
    { id: 'r1', userName: '易学爱好者', rating: 5, content: '讲得非常清晰，从零基础到能看懂命盘，大概学了一个月。老师的讲解很有耐心，案例分析特别实用。', date: '2024-01-15', likes: 128 },
    { id: 'r2', userName: '命理初学者', rating: 5, content: '一直想系统学习八字，这个课程正好满足需求。内容由浅入深，适合入门学习。', date: '2024-01-10', likes: 86 },
    { id: 'r3', userName: '周易研习', rating: 4, content: '整体不错，就是希望能多一些实战案例。理论部分讲得很透彻，期待出进阶课程。', date: '2024-01-05', likes: 52 },
  ],
  averageRating: 4.8,
  totalReviews: 326,
}

const totalChapters = computed(() => course.sections.reduce((s, sec) => s + sec.chapters.length, 0))

const countdown = ref({ h: '02', m: '35', s: '00' })
let cdTimer: any = null

onMounted(() => {
  let remaining = 2 * 3600 + 35 * 60
  cdTimer = setInterval(() => {
    if (remaining <= 0) { clearInterval(cdTimer); return }
    remaining--
    const h = Math.floor(remaining / 3600)
    const m = Math.floor((remaining % 3600) / 60)
    const s = remaining % 60
    countdown.value = { h: String(h).padStart(2, '0'), m: String(m).padStart(2, '0'), s: String(s).padStart(2, '0') }
  }, 1000)
})

onUnmounted(() => { if (cdTimer) clearInterval(cdTimer) })

function handlePlayChapter(ch: any) {
  uni.showToast({ title: `播放: ${ch.title}`, icon: 'none' })
}

function handleShare() { uni.showToast({ title: '分享功能', icon: 'none' }) }
function handleAddToCart() { uni.showToast({ title: '已加入购物车', icon: 'success' }) }
function handleBuy() { uni.showToast({ title: '跳转结算页', icon: 'none' }) }
function handleStartLearning() { uni.showToast({ title: '继续学习', icon: 'none' }) }
function goPage(url: string) { uni.navigateTo({ url }) }
</script>

<style scoped>
.co-page { min-height: 100vh; background: #FAF8F5; }

.cover-swiper { width: 100%; height: 400rpx; }
.cover-slide { width: 100%; height: 100%; background: linear-gradient(135deg, #F5F1EB, #E8E0D5); display: flex; align-items: center; justify-content: center; font-size: 80rpx; }

.countdown-bar { margin: 16rpx 24rpx; padding: 16rpx 20rpx; background: linear-gradient(90deg, #C41E3A, #E8544E); border-radius: 14rpx; display: flex; justify-content: space-between; align-items: center; }
.cd-left { display: flex; align-items: center; gap: 8rpx; }
.cd-icon { font-size: 28rpx; }
.cd-title { font-size: 24rpx; color: #fff; font-weight: 500; }
.cd-badge { font-size: 20rpx; padding: 4rpx 10rpx; border-radius: 8rpx; background: rgba(255,255,255,0.2); color: #fff; }
.cd-time { font-size: 28rpx; color: #fff; font-weight: 700; font-variant-numeric: tabular-nums; }

.course-info { padding: 20rpx 24rpx; background: #fff; margin-bottom: 16rpx; }
.ci-title { font-size: 30rpx; font-weight: 700; color: #2C2C2C; display: block; margin-bottom: 12rpx; }
.ci-tags { display: flex; flex-wrap: wrap; gap: 10rpx; margin-bottom: 16rpx; }
.ci-tag { font-size: 20rpx; padding: 4rpx 14rpx; border-radius: 8rpx; background: rgba(196,30,58,0.06); color: #C41E3A; }
.ci-price-row { display: flex; justify-content: space-between; align-items: baseline; }
.ci-price { display: flex; align-items: baseline; gap: 10rpx; }
.ci-current { font-size: 36rpx; font-weight: 700; color: #C41E3A; }
.ci-original { font-size: 24rpx; color: #BBB; text-decoration: line-through; }
.ci-students { font-size: 22rpx; color: #999; }

.instructor-card { padding: 20rpx 24rpx; background: #fff; margin-bottom: 16rpx; }
.ic-top { display: flex; gap: 16rpx; }
.ic-avatar { width: 80rpx; height: 80rpx; border-radius: 50%; background: rgba(196,30,58,0.08); display: flex; align-items: center; justify-content: center; font-size: 32rpx; color: #C41E3A; flex-shrink: 0; }
.ic-info { flex: 1; min-width: 0; }
.ic-name-row { display: flex; align-items: center; gap: 8rpx; margin-bottom: 4rpx; }
.ic-name { font-size: 26rpx; font-weight: 600; color: #333; }
.ic-verify { font-size: 18rpx; padding: 2rpx 6rpx; border-radius: 4rpx; background: rgba(240,160,48,0.15); color: #F0A030; }
.ic-title { font-size: 20rpx; color: #999; }
.ic-desc { font-size: 22rpx; color: #666; display: block; margin: 6rpx 0; line-height: 1.5; }
.ic-stats { display: flex; gap: 20rpx; }
.ic-stats text { font-size: 20rpx; color: #BBB; }

.coupon-card { margin: 0 24rpx 16rpx; padding: 20rpx; background: #fff; border-radius: 14rpx; display: flex; justify-content: space-between; align-items: center; border: 2rpx dashed #F0A030; }
.cc-left { display: flex; align-items: center; gap: 14rpx; }
.cc-amount { font-size: 40rpx; font-weight: 700; color: #F0A030; }
.cc-label { font-size: 24rpx; color: #333; font-weight: 500; display: block; }
.cc-cond { font-size: 20rpx; color: #BBB; }
.cc-btn { font-size: 24rpx; padding: 12rpx 24rpx; border-radius: 24rpx; background: #F0A030; color: #fff; }

.section { padding: 24rpx; background: #fff; margin-bottom: 16rpx; }
.section-title { font-size: 28rpx; font-weight: 600; color: #333; display: block; margin-bottom: 16rpx; }
.highlights { display: flex; flex-wrap: wrap; gap: 12rpx; margin-bottom: 16rpx; }
.hl-item { font-size: 22rpx; color: #52C41A; padding: 6rpx 14rpx; background: rgba(82,196,26,0.06); border-radius: 8rpx; }
.desc-text { font-size: 24rpx; color: #666; line-height: 1.8; white-space: pre-wrap; }

.chapter-section { margin-bottom: 20rpx; }
.cs-title { font-size: 24rpx; font-weight: 500; color: #333; display: block; margin-bottom: 10rpx; }
.chapter-item { display: flex; justify-content: space-between; align-items: center; padding: 14rpx 12rpx; border-radius: 10rpx; background: #FAF8F5; margin-bottom: 6rpx; }
.ch-left { display: flex; align-items: center; gap: 10rpx; }
.ch-status { font-size: 24rpx; }
.ch-name { font-size: 22rpx; color: #555; }
.ch-duration { font-size: 20rpx; color: #BBB; }

.review-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.rh-rating { display: flex; align-items: center; gap: 6rpx; }
.rh-score { font-size: 24rpx; font-weight: 600; color: #333; }
.rh-count { font-size: 22rpx; color: #BBB; }
.review-item { padding: 16rpx 0; border-bottom: 1px solid #F5F1EB; }
.review-item:last-child { border-bottom: none; }
.ri-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10rpx; }
.ri-user { display: flex; align-items: center; gap: 12rpx; }
.ri-avatar { width: 52rpx; height: 52rpx; border-radius: 50%; background: rgba(196,30,58,0.08); display: flex; align-items: center; justify-content: center; font-size: 20rpx; color: #C41E3A; }
.ri-name { font-size: 24rpx; color: #333; }
.ri-stars { font-size: 18rpx; }
.ri-date { font-size: 20rpx; color: #CCC; }
.ri-content { font-size: 24rpx; color: #555; line-height: 1.6; display: block; margin-bottom: 8rpx; }
.ri-likes { font-size: 20rpx; color: #BBB; }

.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1px solid #E8E0D5; padding: 16rpx 24rpx; padding-bottom: calc(16rpx + env(safe-area-inset-bottom)); display: flex; justify-content: space-between; align-items: center; z-index: 30; }
.bb-left { display: flex; gap: 12rpx; }
.bb-action { display: flex; flex-direction: column; align-items: center; gap: 2rpx; }
.bb-action text { font-size: 28rpx; }
.bb-label { font-size: 18rpx !important; color: #999; }
.bb-right { display: flex; gap: 12rpx; }
.bb-cart { padding: 16rpx 28rpx; border-radius: 28rpx; background: rgba(201,169,110,0.15); }
.bb-cart text { font-size: 24rpx; color: #C9A96E; font-weight: 500; }
.bb-buy { padding: 16rpx 28rpx; border-radius: 28rpx; background: #C41E3A; }
.bb-buy text { font-size: 24rpx; color: #fff; font-weight: 500; }
</style>
