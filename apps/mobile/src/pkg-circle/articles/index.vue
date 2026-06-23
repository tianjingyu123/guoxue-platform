<template>
  <view class="page">
    <!-- AI 搜索弹窗 -->
    <AiSearchModal :is-open="aiOpen" context="文章" @close="aiOpen = false" />

    <!-- 顶部导航 -->
    <view class="header">
      <view class="nav-bar">
        <view class="nav-btn" @tap="goBack">
          <AppIcon name="arrow-left" :size="20" color="#2C2C2C" />
        </view>
        <text class="nav-title">文章</text>
        <view class="flex-1" />
        <view class="ai-btn" @tap="aiOpen = true">
          <AppIcon name="sparkles" :size="18" color="#C41E3A" />
          <text class="ai-btn-text">AI搜索</text>
        </view>
      </view>

      <!-- 搜索框 -->
      <view class="search-wrap">
        <view class="search-box">
          <AppIcon name="search" :size="16" color="#999" />
          <input
            v-model="searchQuery"
            class="search-input"
            placeholder="搜索文章标题或内容"
            placeholder-class="search-ph"
          />
          <view v-if="searchQuery" class="search-clear" @tap="searchQuery = ''">
            <AppIcon name="x" :size="16" color="#999" />
          </view>
        </view>
      </view>

      <!-- 分类 Tab -->
      <scroll-view scroll-x class="cat-scroll">
        <view class="cat-row">
          <view
            v-for="cat in categories"
            :key="cat.id"
            class="cat-chip"
            :class="{ active: activeCategory === cat.id }"
            @tap="activeCategory = cat.id"
          >
            <text class="cat-label" :class="{ active: activeCategory === cat.id }">{{ cat.name }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 排序栏 -->
    <view class="sort-bar">
      <text class="sort-count">共 {{ filteredArticles.length }} 篇文章</text>
      <view class="sort-wrap">
        <view class="sort-trigger" @tap="showSortMenu = !showSortMenu">
          <text class="sort-text">{{ sortBy === 'latest' ? '最新发布' : '最受欢迎' }}</text>
          <AppIcon name="chevron-down" :size="16" color="#2C2C2C" :class="{ flip: showSortMenu }" />
        </view>
        <view v-if="showSortMenu" class="sort-menu">
          <view class="sort-option" :class="{ active: sortBy === 'latest' }" @tap="selectSort('latest')">最新发布</view>
          <view class="sort-option" :class="{ active: sortBy === 'popular' }" @tap="selectSort('popular')">最受欢迎</view>
        </view>
      </view>
    </view>

    <!-- 文章列表 -->
    <scroll-view scroll-y class="list-scroll">
      <view class="list">
        <template v-if="filteredArticles.length > 0">
          <view
            v-for="article in filteredArticles"
            :key="article.id"
            class="article-card"
            @tap="navigateTo(`/articles/${article.id}`)"
          >
            <view class="article-cover" :style="{ background: coverColor(article.title) }">
              <text class="article-cover-text">{{ article.title.slice(0, 1) }}</text>
            </view>
            <view class="article-body">
              <view class="article-title-row">
                <text v-if="article.isTop" class="top-badge">置顶</text>
                <text class="article-title">{{ article.title }}</text>
              </view>
              <text class="article-excerpt">{{ article.excerpt }}</text>
              <view class="article-foot">
                <view class="article-author">
                  <view class="author-avatar" :style="{ background: coverColor(article.author.name) }">
                    <text class="author-avatar-text">{{ article.author.name[0] }}</text>
                  </view>
                  <text class="author-name">{{ article.author.name }}</text>
                  <text v-if="article.author.isVerified" class="verified">V</text>
                </view>
                <view class="article-stats">
                  <view class="stat">
                    <AppIcon name="heart" :size="14" color="#999" />
                    <text class="stat-text">{{ article.likes }}</text>
                  </view>
                  <view class="stat">
                    <AppIcon name="message-circle" :size="14" color="#999" />
                    <text class="stat-text">{{ article.comments }}</text>
                  </view>
                  <text class="stat-text">{{ formatDate(article.createdAt) }}</text>
                </view>
              </view>
            </view>
          </view>

          <view class="load-more">
            <text class="load-more-text">点击加载更多</text>
          </view>
        </template>

        <view v-else class="empty">
          <view class="empty-icon">
            <AppIcon name="file-text" :size="32" color="#999" />
          </view>
          <text class="empty-text">暂无相关文章</text>
          <text class="empty-tip">换个关键词试试</text>
        </view>
      </view>
      <view class="bottom-safe" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import AiSearchModal from '@/components/common/ai-search-modal.vue'
import { goBack, navigateTo } from '@/utils/router'

const searchQuery = ref('')
const activeCategory = ref('all')
const sortBy = ref<'latest' | 'popular'>('latest')
const showSortMenu = ref(false)
const aiOpen = ref(false)

const categories = [
  { id: 'all', name: '全部' },
  { id: 'mingli', name: '命理研究' },
  { id: 'fengshui', name: '风水案例' },
  { id: 'guoxue', name: '国学经典' },
  { id: 'yangsheng', name: '养生文化' },
]

const articlesData = [
  { id: 1, title: '八字命理入门：如何看懂自己的四柱八字', excerpt: '八字命理是中国传统命理学的核心，通过分析一个人出生的年、月、日、时四柱，来推断其命运走向...', author: { name: '周易大师', isVerified: true }, category: 'mingli', likes: 1280, comments: 156, createdAt: '2024-01-15', isTop: true },
  { id: 2, title: '家居风水布局：客厅沙发摆放的五大禁忌', excerpt: '客厅是家庭的核心区域，沙发的摆放位置直接影响家庭的运势和健康。本文详细解析沙发摆放的风水要点...', author: { name: '陈风水', isVerified: true }, category: 'fengshui', likes: 856, comments: 98, createdAt: '2024-01-14', isTop: false },
  { id: 3, title: '《易经》乾卦详解：自强不息的人生智慧', excerpt: '乾卦是易经六十四卦之首，象征天道运行，刚健有力。乾卦的核心精神是自强不息，这对现代人的启示...', author: { name: '张玄风', isVerified: true }, category: 'guoxue', likes: 2156, comments: 234, createdAt: '2024-01-13', isTop: false },
  { id: 4, title: '中医养生：春季养肝的十个小妙招', excerpt: '春季是养肝的最佳时节，肝属木，与春季相应。本文从饮食、起居、情志等方面，分享十个实用的养肝方法...', author: { name: '李易安', isVerified: false }, category: 'yangsheng', likes: 568, comments: 67, createdAt: '2024-01-12', isTop: false },
  { id: 5, title: '紫微斗数：命宫主星的性格特征分析', excerpt: '命宫是紫微斗数中最重要的宫位，命宫主星决定了一个人的基本性格特征。本文逐一分析十四主星的性格...', author: { name: '周易大师', isVerified: true }, category: 'mingli', likes: 1024, comments: 128, createdAt: '2024-01-11', isTop: false },
  { id: 6, title: '办公室风水：提升事业运的桌面布局', excerpt: '办公桌的布局对事业运势有着重要影响。本文从方位、物品摆放、色彩搭配等角度，教你打造旺运办公环境...', author: { name: '陈风水', isVerified: true }, category: 'fengshui', likes: 756, comments: 89, createdAt: '2024-01-10', isTop: false },
]

const filteredArticles = computed(() =>
  articlesData
    .filter((a) => {
      const matchesSearch = a.title.includes(searchQuery.value) || a.excerpt.includes(searchQuery.value)
      const matchesCategory = activeCategory.value === 'all' || a.category === activeCategory.value
      return matchesSearch && matchesCategory
    })
    .sort((a, b) => {
      if (sortBy.value === 'popular') return b.likes - a.likes
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
)

function selectSort(s: 'latest' | 'popular') {
  sortBy.value = s
  showSortMenu.value = false
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '昨天'
  if (diffDays < 7) return `${diffDays}天前`
  return `${date.getMonth() + 1}-${date.getDate()}`
}

const coverPalette = ['#C41E3A', '#B8860B', '#2E7D5B', '#1F6FB2', '#8B5A2B', '#9A3B5C']
function coverColor(name: string) {
  let sum = 0
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i)
  return coverPalette[sum % coverPalette.length]
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #faf8f5;
  display: flex;
  flex-direction: column;
}
.flex-1 {
  flex: 1;
}
.header {
  position: sticky;
  top: 0;
  z-index: 40;
  background: rgba(250, 248, 245, 0.96);
  border-bottom: 2rpx solid #ece7df;
}
.nav-bar {
  display: flex;
  align-items: center;
  gap: 16rpx;
  height: 96rpx;
  padding: 0 24rpx;
}
.nav-btn {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.ai-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 10rpx 20rpx;
  border-radius: 999rpx;
  background: rgba(196, 30, 58, 0.08);
}
.ai-btn-text {
  font-size: 24rpx;
  color: #c41e3a;
}
.search-wrap {
  padding: 0 24rpx 16rpx;
}
.search-box {
  display: flex;
  align-items: center;
  gap: 12rpx;
  height: 72rpx;
  padding: 0 24rpx;
  background: #f0ebe2;
  border-radius: 999rpx;
}
.search-input {
  flex: 1;
  font-size: 26rpx;
  color: #2c2c2c;
}
.search-ph {
  color: #999;
}
.search-clear {
  width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cat-scroll {
  white-space: nowrap;
  padding: 0 24rpx 16rpx;
}
.cat-row {
  display: inline-flex;
  gap: 8rpx;
}
.cat-chip {
  padding: 12rpx 28rpx;
  border-radius: 999rpx;
  background: #f0ebe2;
}
.cat-chip.active {
  background: #c41e3a;
}
.cat-label {
  font-size: 26rpx;
  font-weight: 500;
  color: #999;
}
.cat-label.active {
  color: #fff;
}
.sort-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  border-bottom: 2rpx solid #ece7df;
}
.sort-count {
  font-size: 26rpx;
  color: #999;
}
.sort-wrap {
  position: relative;
}
.sort-trigger {
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.sort-text {
  font-size: 26rpx;
  color: #2c2c2c;
}
.flip {
  transform: rotate(180deg);
}
.sort-menu {
  position: absolute;
  right: 0;
  top: 100%;
  margin-top: 8rpx;
  width: 200rpx;
  background: #fff;
  border-radius: 16rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.12);
  border: 2rpx solid #ece7df;
  overflow: hidden;
  z-index: 50;
}
.sort-option {
  padding: 24rpx 28rpx;
  font-size: 26rpx;
  color: #2c2c2c;
}
.sort-option.active {
  color: #c41e3a;
  font-weight: 500;
}
.list-scroll {
  flex: 1;
  height: 0;
}
.list {
  padding: 24rpx;
}
.article-card {
  display: flex;
  gap: 24rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
}
.article-cover {
  width: 200rpx;
  height: 144rpx;
  border-radius: 16rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.article-cover-text {
  font-size: 72rpx;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}
.article-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.article-title-row {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
}
.top-badge {
  flex-shrink: 0;
  font-size: 20rpx;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  background: rgba(196, 30, 58, 0.1);
  color: #c41e3a;
  margin-top: 4rpx;
}
.article-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #2c2c2c;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.article-excerpt {
  font-size: 22rpx;
  color: #666;
  margin-top: 8rpx;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.article-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 16rpx;
}
.article-author {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.author-avatar {
  width: 36rpx;
  height: 36rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.author-avatar-text {
  font-size: 18rpx;
  color: #fff;
}
.author-name {
  font-size: 22rpx;
  color: #666;
}
.verified {
  font-size: 16rpx;
  padding: 0 6rpx;
  border-radius: 4rpx;
  background: rgba(201, 169, 110, 0.2);
  color: #c9a96e;
}
.article-stats {
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.stat {
  display: flex;
  align-items: center;
  gap: 4rpx;
}
.stat-text {
  font-size: 22rpx;
  color: #999;
}
.load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx 0;
}
.load-more-text {
  font-size: 26rpx;
  color: #999;
}
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
}
.empty-icon {
  width: 128rpx;
  height: 128rpx;
  border-radius: 999rpx;
  background: #f0ebe2;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
}
.empty-text {
  font-size: 28rpx;
  color: #999;
}
.empty-tip {
  font-size: 24rpx;
  color: #bbb;
  margin-top: 8rpx;
}
.bottom-safe {
  height: 48rpx;
}
</style>
