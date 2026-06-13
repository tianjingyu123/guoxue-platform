<template>
  <view class="search-result-page">
    <!-- 头部搜索栏 -->
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <view class="search-input-wrap">
          <text class="si-icon">🔍</text>
          <input v-model="searchValue" class="search-input" placeholder="搜索课程、圈子、商品..." @confirm="handleSearch" confirm-type="search" />
          <text v-if="searchValue" class="si-clear" @click="searchValue = ''">✕</text>
        </view>
        <text class="search-btn" @click="handleSearch">搜索</text>
      </view>
      <!-- Tabs -->
      <view class="tab-row">
        <view v-for="tab in tabs" :key="tab.key" class="tab-item" :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key">
          <text>{{ tab.label }}</text>
        </view>
      </view>
    </view>

    <!-- 骨架屏 -->
    <template v-if="loading">
      <view v-for="i in 5" :key="i" class="sk-card">
        <view class="sk-line w-75" />
        <view class="sk-line" />
        <view class="sk-line w-66" />
      </view>
    </template>

    <!-- 内容区 -->
    <template v-else>
      <!-- AI总结 -->
      <view v-if="activeTab === 'all'" class="ai-summary">
        <view class="ai-header" @click="aiExpanded = !aiExpanded">
          <view class="ai-header-left">
            <view class="ai-icon-wrap">✨</view>
            <text class="ai-label">AI智能总结</text>
          </view>
          <text class="ai-toggle">{{ aiExpanded ? '▲' : '▼' }}</text>
        </view>
        <view v-if="aiExpanded" class="ai-body">
          <text class="ai-text">{{ aiSummary.summary }}</text>
          <view class="ai-keys">
            <text class="ai-keys-label">核心要点</text>
            <view class="ai-keys-list">
              <text v-for="(point, i) in aiSummary.keyPoints" :key="i" class="ai-key">{{ point }}</text>
            </view>
          </view>
          <view class="ai-related">
            <text class="ai-related-label">相关问题</text>
            <text v-for="(q, i) in aiRelatedQuestions" :key="i" class="ai-related-link" @click="searchValue = q; handleSearch()">{{ q }}</text>
          </view>
        </view>
      </view>

      <view class="results-area">
        <!-- 内容结果 -->
        <template v-if="(activeTab === 'all' || activeTab === 'content') && results.contents.length">
          <view v-if="activeTab === 'all'" class="section-header">
            <text class="sh-title">相关内容</text>
            <text class="sh-more" @click="activeTab = 'content'">查看全部</text>
          </view>
          <view v-for="item in results.contents" :key="item.id" class="result-card" @click="goContentPage(item)">
            <view class="rc-body">
              <view v-if="item.cover" class="rc-cover">
                <text v-if="item.type === 'video'" class="rc-play-icon">▶️</text>
              </view>
              <view class="rc-info">
                <view class="rc-badges">
                  <text v-if="item.type === 'video'" class="rc-badge video">视频</text>
                  <text v-if="item.type === 'article'" class="rc-badge article">文章</text>
                  <text v-if="item.type === 'post'" class="rc-badge post">帖子</text>
                </view>
                <text class="rc-title"><text v-for="(part, i) in highlightParts(item.title)" :key="i" :class="{ highlight: part.highlight }">{{ part.text }}</text></text>
                <text class="rc-summary"><text v-for="(part, i) in highlightParts(item.summary)" :key="i" :class="{ highlight: part.highlight }">{{ part.text }}</text></text>
                <view class="rc-meta">
                  <text>{{ item.author.name }}</text>
                  <text>❤️ {{ item.likes }}</text>
                  <text>💬 {{ item.comments }}</text>
                </view>
              </view>
            </view>
          </view>
        </template>

        <!-- 圈子结果 -->
        <template v-if="(activeTab === 'all' || activeTab === 'circle') && results.circles.length">
          <view v-if="activeTab === 'all'" class="section-header">
            <text class="sh-title">相关圈子</text>
            <text class="sh-more" @click="activeTab = 'circle'">查看全部</text>
          </view>
          <view v-for="circle in results.circles" :key="circle.id" class="circle-card" @click="goPage('/pages/circles/id-detail/home/index?id=' + circle.id)">
            <view class="clc-icon">👥</view>
            <view class="clc-info">
              <text class="clc-name">{{ circle.name }}</text>
              <text class="clc-desc">{{ circle.description }}</text>
              <view class="clc-meta">
                <text>{{ formatNum(circle.memberCount) }}成员</text>
                <text>{{ formatNum(circle.postCount) }}帖子</text>
              </view>
            </view>
            <text class="clc-join">加入</text>
          </view>
        </template>

        <!-- 课程结果 -->
        <template v-if="(activeTab === 'all' || activeTab === 'course') && results.courses.length">
          <view v-if="activeTab === 'all'" class="section-header">
            <text class="sh-title">相关课程</text>
            <text class="sh-more" @click="activeTab = 'course'">查看全部</text>
          </view>
          <view :class="activeTab === 'course' ? 'course-grid' : 'course-list'">
            <view v-for="course in results.courses" :key="course.id" class="course-card" :class="{ grid: activeTab === 'course' }" @click="goPage('/pages/course/id-detail/index?id=' + course.id)">
              <view class="csc-cover" :class="{ grid: activeTab === 'course' }">📚</view>
              <view class="csc-info">
                <text class="csc-title">{{ course.title }}</text>
                <text class="csc-teacher">{{ course.teacher }}</text>
                <view class="csc-rating">
                  <text>⭐ {{ course.rating }}</text>
                  <text>{{ formatNum(course.studentCount) }}人学习</text>
                </view>
                <view class="csc-price-row">
                  <text class="csc-price">¥{{ course.price }}</text>
                  <text v-if="course.originalPrice" class="csc-original">¥{{ course.originalPrice }}</text>
                </view>
              </view>
            </view>
          </view>
        </template>

        <!-- 商品结果 -->
        <template v-if="(activeTab === 'all' || activeTab === 'product') && results.products.length">
          <view v-if="activeTab === 'all'" class="section-header">
            <text class="sh-title">相关商品</text>
            <text class="sh-more" @click="activeTab = 'product'">查看全部</text>
          </view>
          <view class="product-grid">
            <view v-for="product in results.products" :key="product.id" class="product-card" @click="goPage('/pages/shop/products/id-detail/index?id=' + product.id)">
              <view class="pdc-cover">🛍️</view>
              <view class="pdc-info">
                <text class="pdc-name">{{ product.name }}</text>
                <view class="pdc-price-row">
                  <text class="pdc-price">¥{{ product.price }}</text>
                  <text v-if="product.originalPrice" class="pdc-original">¥{{ product.originalPrice }}</text>
                </view>
                <text class="pdc-sales">{{ product.sales }}人购买</text>
              </view>
            </view>
          </view>
        </template>

        <!-- 用户结果 -->
        <template v-if="(activeTab === 'all' || activeTab === 'user') && results.users.length">
          <view v-if="activeTab === 'all'" class="section-header">
            <text class="sh-title">相关用户</text>
            <text class="sh-more" @click="activeTab = 'user'">查看全部</text>
          </view>
          <view v-for="user in results.users" :key="user.id" class="user-card" @click="goPage('/pages/user/id-detail/index?id=' + user.id)">
            <view class="usc-avatar">👤</view>
            <view class="usc-info">
              <text class="usc-name">{{ user.name }}</text>
              <text v-if="user.bio" class="usc-bio">{{ user.bio }}</text>
              <text class="usc-followers">📈 {{ formatNum(user.followers) }}粉丝</text>
            </view>
            <text class="usc-follow-btn" :class="{ followed: user.isFollowed }">{{ user.isFollowed ? '已关注' : '关注' }}</text>
          </view>
        </template>

        <!-- 空状态 -->
        <view v-if="isEmpty" class="empty-state">
          <text class="empty-icon">🔍</text>
          <text class="empty-text">未找到相关结果</text>
          <text class="empty-hint">换个关键词试试</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

type TabType = 'all' | 'content' | 'circle' | 'course' | 'product' | 'user'

const keyword = ref('八字')
const searchValue = ref(keyword.value)
const activeTab = ref<TabType>('all')
const loading = ref(false)
const aiExpanded = ref(true)

const tabs = [
  { key: 'all', label: '综合' },
  { key: 'content', label: '内容' },
  { key: 'circle', label: '圈子' },
  { key: 'course', label: '课程' },
  { key: 'product', label: '商品' },
  { key: 'user', label: '用户' },
]

const aiSummary = ref({
  summary: '关于"八字"的搜索结果显示，这是国学领域的重要概念。根据平台内容分析，相关课程和文章主要涵盖基础理论、实践应用和案例分析三个方面。',
  keyPoints: ['基础理论知识体系完整', '实践案例丰富详实', '多位名师深度讲解'],
})
const aiRelatedQuestions = ref(['如何入门学习？', '有哪些经典书籍推荐？', '实际应用场景有哪些？'])

interface ContentItem {
  id: string
  type: 'article' | 'video' | 'post'
  title: string
  summary: string
  cover: string
  author: { id: string; name: string }
  likes: number
  comments: number
}

const results = ref({
  contents: [
    { id: '1', type: 'article' as const, title: '深入解读八字的核心要义', summary: '本文从多个角度深入分析，帮助读者全面理解其内涵与外延...', cover: '', author: { id: '1', name: '张老师' }, likes: 328, comments: 56 },
    { id: '2', type: 'video' as const, title: '八字入门必看教程', summary: '零基础小白也能快速上手，系统学习核心知识点...', cover: '', author: { id: '2', name: '李讲师' }, likes: 892, comments: 124 },
    { id: '3', type: 'post' as const, title: '我学习八字三年的心得体会', summary: '分享我的学习历程和一些实用的学习方法...', cover: '', author: { id: '3', name: '老学员' }, likes: 156, comments: 38 },
  ],
  circles: [
    { id: '1', name: '八字研习社', description: '专注于国学知识的深度探讨与交流', memberCount: 12580, postCount: 3420 },
    { id: '2', name: '八字爱好者', description: '志同道合的朋友一起学习成长', memberCount: 8960, postCount: 2180 },
  ],
  courses: [
    { id: '1', title: '八字系统精讲课', price: 299, originalPrice: 599, teacher: '王教授', studentCount: 5680, rating: 4.9 },
    { id: '2', title: '八字实战应用班', price: 199, originalPrice: 399, teacher: '赵讲师', studentCount: 3240, rating: 4.8 },
    { id: '3', title: '八字高级研修课', price: 499, originalPrice: 999, teacher: '钱大师', studentCount: 1890, rating: 4.9 },
  ],
  products: [
    { id: '1', name: '八字经典教材', price: 68, originalPrice: 98, sales: 2380 },
    { id: '2', name: '八字学习工具套装', price: 128, originalPrice: 198, sales: 1560 },
  ],
  users: [
    { id: '1', name: '国学大师张三', bio: '专注国学研究30年，著有多部畅销书籍', followers: 128000, isFollowed: false },
    { id: '2', name: '李老师讲国学', bio: '每日分享国学智慧，让传统文化走进生活', followers: 86000, isFollowed: true },
  ],
})

const isEmpty = computed(() => {
  return !loading.value &&
    results.value.contents.length === 0 &&
    results.value.circles.length === 0 &&
    results.value.courses.length === 0 &&
    results.value.products.length === 0 &&
    results.value.users.length === 0
})

function handleSearch() {
  if (searchValue.value.trim() && searchValue.value !== keyword.value) {
    keyword.value = searchValue.value.trim()
    loading.value = true
    setTimeout(() => { loading.value = false }, 800)
  }
}

function highlightParts(text: string) {
  if (!keyword.value) return [{ text, highlight: false }]
  const regex = new RegExp('(' + keyword.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi')
  const parts = text.split(regex)
  return parts.map(part => ({
    text: part,
    highlight: part.toLowerCase() === keyword.value.toLowerCase(),
  }))
}

function goContentPage(item: ContentItem) {
  const url = item.type === 'video' ? '/pages/video/id-detail/index' : '/pages/article/id-detail/index'
  uni.navigateTo({ url: url + '?id=' + item.id })
}

function formatNum(num: number) {
  if (num >= 10000) return (num / 10000).toFixed(1) + '万'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return String(num)
}

function goPage(url: string) {
  uni.navigateTo({ url })
}
</script>

<style scoped>
.search-result-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 40rpx; }

.header-sticky { position: sticky; top: 0; z-index: 30; background: #fff; border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; gap: 16rpx; padding: 16rpx 24rpx; }
.header-back { font-size: 48rpx; color: #333; flex-shrink: 0; }
.search-input-wrap { flex: 1; position: relative; }
.si-icon { position: absolute; left: 20rpx; top: 50%; transform: translateY(-50%); font-size: 28rpx; z-index: 1; }
.search-input { width: 100%; height: 72rpx; padding: 0 72rpx; border-radius: 36rpx; background: #FAF8F5; font-size: 26rpx; box-sizing: border-box; }
.si-clear { position: absolute; right: 20rpx; top: 50%; transform: translateY(-50%); font-size: 28rpx; color: #999; }
.search-btn { font-size: 26rpx; color: #C41E3A; font-weight: 500; flex-shrink: 0; }

.tab-row { display: flex; overflow-x: auto; padding: 0 16rpx; }
.tab-row::-webkit-scrollbar { display: none; }
.tab-item { flex-shrink: 0; padding: 18rpx 24rpx; border-bottom: 4rpx solid transparent; }
.tab-item text { font-size: 26rpx; color: #666; }
.tab-item.active { border-bottom-color: #C41E3A; }
.tab-item.active text { color: #C41E3A; }

.sk-card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin: 16rpx 24rpx; }
.sk-line { height: 24rpx; background: #F0F0F0; border-radius: 6rpx; margin-bottom: 12rpx; }
.sk-line.w-75 { width: 75%; }
.sk-line.w-66 { width: 66%; }

.ai-summary { margin: 16rpx 24rpx; background: linear-gradient(135deg, rgba(196,30,58,0.04), rgba(201,169,110,0.08)); border-radius: 20rpx; overflow: hidden; }
.ai-header { display: flex; justify-content: space-between; align-items: center; padding: 24rpx; }
.ai-header-left { display: flex; align-items: center; gap: 12rpx; }
.ai-icon-wrap { width: 56rpx; height: 56rpx; border-radius: 50%; background: linear-gradient(135deg, #C41E3A, #C9A96E); display: flex; align-items: center; justify-content: center; font-size: 28rpx; }
.ai-label { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.ai-toggle { font-size: 24rpx; color: #999; }
.ai-body { padding: 0 24rpx 24rpx; }
.ai-text { font-size: 24rpx; color: #666; line-height: 1.6; }
.ai-keys { margin-top: 16rpx; }
.ai-keys-label { font-size: 22rpx; color: #999; display: block; margin-bottom: 10rpx; }
.ai-keys-list { display: flex; flex-wrap: wrap; gap: 12rpx; }
.ai-key { padding: 8rpx 20rpx; border-radius: 32rpx; background: #fff; font-size: 22rpx; color: #666; }
.ai-related { margin-top: 16rpx; }
.ai-related-label { font-size: 22rpx; color: #999; display: block; margin-bottom: 8rpx; }
.ai-related-link { font-size: 24rpx; color: #C41E3A; display: block; padding: 6rpx 0; }

.results-area { padding: 0 24rpx; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin: 24rpx 0 16rpx; }
.sh-title { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.sh-more { font-size: 22rpx; color: #C41E3A; }

.result-card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 12rpx; }
.rc-body { display: flex; gap: 16rpx; }
.rc-cover { width: 180rpx; height: 120rpx; border-radius: 12rpx; background: linear-gradient(135deg, rgba(196,30,58,0.15), rgba(201,169,110,0.15)); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.rc-play-icon { font-size: 36rpx; }
.rc-info { flex: 1; min-width: 0; }
.rc-badges { display: flex; gap: 8rpx; margin-bottom: 8rpx; }
.rc-badge { font-size: 18rpx; padding: 2rpx 10rpx; border-radius: 4rpx; }
.rc-badge.video { background: rgba(196,30,58,0.1); color: #C41E3A; }
.rc-badge.article { background: rgba(59,130,246,0.1); color: #3B82F6; }
.rc-badge.post { background: rgba(34,197,94,0.1); color: #22C55E; }
.rc-title { font-size: 26rpx; font-weight: 500; color: #2C2C2C; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
.rc-summary { font-size: 22rpx; color: #999; margin-top: 6rpx; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.rc-meta { display: flex; justify-content: space-between; margin-top: 12rpx; }
.rc-meta text { font-size: 20rpx; color: #999; }
.highlight { color: #C41E3A; font-weight: 500; }

.circle-card { background: #fff; border-radius: 16rpx; padding: 24rpx; display: flex; align-items: center; gap: 20rpx; margin-bottom: 12rpx; }
.clc-icon { width: 96rpx; height: 96rpx; border-radius: 20rpx; background: linear-gradient(135deg, rgba(196,30,58,0.15), rgba(201,169,110,0.15)); display: flex; align-items: center; justify-content: center; font-size: 40rpx; flex-shrink: 0; }
.clc-info { flex: 1; min-width: 0; }
.clc-name { font-size: 28rpx; font-weight: 500; color: #2C2C2C; display: block; }
.clc-desc { font-size: 22rpx; color: #999; margin-top: 4rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
.clc-meta { display: flex; gap: 16rpx; margin-top: 6rpx; }
.clc-meta text { font-size: 20rpx; color: #999; }
.clc-join { padding: 14rpx 28rpx; border-radius: 32rpx; background: #C41E3A; color: #fff; font-size: 22rpx; flex-shrink: 0; }

.course-list { display: flex; flex-direction: column; gap: 12rpx; }
.course-card { background: #fff; border-radius: 16rpx; padding: 24rpx; display: flex; gap: 16rpx; }
.course-card.grid { flex-direction: column; padding: 0; }
.csc-cover { width: 180rpx; height: 120rpx; border-radius: 12rpx; background: linear-gradient(135deg, rgba(196,30,58,0.15), rgba(201,169,110,0.15)); display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 44rpx; }
.csc-cover.grid { width: 100%; aspect-ratio: 4/3; height: auto; }
.csc-info { flex: 1; min-width: 0; }
.course-card.grid .csc-info { padding: 20rpx; }
.csc-title { font-size: 26rpx; font-weight: 500; color: #2C2C2C; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.csc-teacher { font-size: 22rpx; color: #999; margin-top: 6rpx; display: block; }
.csc-rating { display: flex; align-items: center; gap: 8rpx; margin-top: 6rpx; }
.csc-rating text { font-size: 22rpx; color: #C9A96E; }
.csc-price-row { display: flex; align-items: center; gap: 10rpx; margin-top: 12rpx; }
.csc-price { font-size: 28rpx; font-weight: 700; color: #C41E3A; }
.csc-original { font-size: 22rpx; color: #999; text-decoration: line-through; }

.course-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx; }

.product-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx; }
.product-card { background: #fff; border-radius: 16rpx; overflow: hidden; }
.pdc-cover { aspect-ratio: 1; background: linear-gradient(135deg, rgba(196,30,58,0.08), rgba(201,169,110,0.08)); display: flex; align-items: center; justify-content: center; font-size: 64rpx; }
.pdc-info { padding: 20rpx; }
.pdc-name { font-size: 24rpx; color: #2C2C2C; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.pdc-price-row { display: flex; align-items: center; gap: 8rpx; margin-top: 10rpx; }
.pdc-price { font-size: 28rpx; font-weight: 700; color: #C41E3A; }
.pdc-original { font-size: 20rpx; color: #999; text-decoration: line-through; }
.pdc-sales { font-size: 20rpx; color: #999; margin-top: 4rpx; display: block; }

.user-card { background: #fff; border-radius: 16rpx; padding: 24rpx; display: flex; align-items: center; gap: 20rpx; margin-bottom: 12rpx; }
.usc-avatar { width: 80rpx; height: 80rpx; border-radius: 50%; background: linear-gradient(135deg, rgba(196,30,58,0.15), rgba(201,169,110,0.15)); display: flex; align-items: center; justify-content: center; font-size: 36rpx; flex-shrink: 0; }
.usc-info { flex: 1; min-width: 0; }
.usc-name { font-size: 28rpx; font-weight: 500; color: #2C2C2C; display: block; }
.usc-bio { font-size: 22rpx; color: #999; margin-top: 4rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
.usc-followers { font-size: 20rpx; color: #999; margin-top: 4rpx; display: block; }
.usc-follow-btn { padding: 14rpx 28rpx; border-radius: 32rpx; background: #C41E3A; color: #fff; font-size: 22rpx; flex-shrink: 0; }
.usc-follow-btn.followed { background: #F5F1EB; color: #666; }

.empty-state { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; }
.empty-icon { font-size: 80rpx; }
.empty-text { font-size: 26rpx; color: #999; margin-top: 16rpx; }
.empty-hint { font-size: 22rpx; color: #BBB; margin-top: 6rpx; }
</style>
