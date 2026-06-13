<template>
  <view class="discover-page">
    <!-- 顶部固定区域 -->
    <view class="header-sticky">
      <!-- 搜索栏 -->
      <view class="search-area">
        <SearchBar
          placeholder="搜索商品、课程、智能体..."
          @search="goSearch"
        />
      </view>

      <!-- 热搜词 -->
      <scroll-view scroll-x class="hot-words-scroll" :show-scrollbar="false">
        <view class="hot-words-row">
          <view class="hot-label">
            <text>🔥 热搜</text>
          </view>
          <view
            v-for="word in hotWords"
            :key="word"
            class="hot-word"
            @click="goSearch(word)"
          >
            {{ word }}
          </view>
        </view>
      </scroll-view>

      <!-- 分类入口 4列宫格 -->
      <view class="categories-area">
        <view class="category-grid">
          <view
            v-for="cat in categories"
            :key="cat.id"
            class="category-item"
            @click="goPage(cat.href)"
          >
            <view class="cat-icon">{{ cat.icon }}</view>
            <text class="cat-label">{{ cat.label }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 分隔 -->
    <view class="section-divider" />

    <!-- Loading -->
    <view v-if="loading" class="loading-area">
      <LoadingSkeleton v-for="i in 3" :key="i" type="card" />
    </view>

    <!-- Error -->
    <view v-else-if="error" class="error-area">
      <EmptyState
        icon="📡"
        title="加载失败"
        description="网络不给力，请稍后重试"
        action-text="重新加载"
        @action="fetchData"
      />
    </view>

    <!-- 内容区 — 按区块展示 -->
    <view v-else class="sections-area">
      <view
        v-for="section in sections"
        :key="section.type"
        class="section-block"
      >
        <view class="section-header">
          <text class="section-title">{{ section.title }}</text>
          <text class="section-more" @click="goSectionMore(section.type)">
            更多 ›
          </text>
        </view>

        <scroll-view scroll-x class="section-scroll" :show-scrollbar="false">
          <view class="section-items">
            <view
              v-for="item in section.items"
              :key="item.id"
              class="section-card"
              @click="goDetail(item)"
            >
              <image
                v-if="item.cover"
                :src="item.cover"
                class="card-cover"
                mode="aspectFill"
              />
              <view v-else class="card-cover-plain">
                <text class="cover-emoji">{{ coverEmoji(section.type) }}</text>
              </view>

              <view v-if="item.tags && item.tags[0]" class="card-tag">
                <text class="tag-text">{{ item.tags[0] }}</text>
              </view>

              <view class="card-info">
                <text class="card-title">{{ item.title }}</text>
                <text v-if="item.intro" class="card-intro">{{ item.intro }}</text>

                <view v-if="section.type === 'course' && item.stats" class="card-meta">
                  <text class="meta-price">
                    {{ item.stats.price > 0 ? `¥${item.stats.price}` : '免费' }}
                  </text>
                  <text v-if="item.stats.studentCount" class="meta-sub">
                    {{ item.stats.studentCount }} 人学习
                  </text>
                </view>

                <view v-if="section.type === 'content' && item.stats" class="card-meta">
                  <text class="meta-sub">👁 {{ item.stats.viewCount }}</text>
                  <text class="meta-sub">❤ {{ item.stats.likeCount }}</text>
                </view>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>

      <view class="list-end">
        <text>— 国学智慧，尽在掌握 —</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'
import { discoverApi } from '../../api'
import SearchBar from '../../components/SearchBar.vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'

const categories = [
  { id: 'mall', icon: '🛍', label: '商城', href: '/pages/mall/index' },
  { id: 'course', icon: '📚', label: '课程', href: '/pages/courses/index' },
  { id: 'agent', icon: '🤖', label: '智能体', href: '/pages/agents/index' },
  { id: 'classics', icon: '📜', label: '古籍', href: '/pages/classics/index' },
  { id: 'video', icon: '▶', label: '视频', href: '/pages/videos/index' },
  { id: 'live', icon: '📡', label: '直播', href: '/pages/live/index' },
  { id: 'flash', icon: '⚡', label: '秒杀', href: '/pages/flash-sale/index' },
  { id: 'rank', icon: '🏆', label: '榜单', href: '/pages/rankings/index' },
]

const hotWords = ['八字入门', '紫微斗数', '风水罗盘', '开运水晶', '六爻占卜']

interface SectionItem {
  id: string
  title: string
  cover?: string
  type: string
  intro?: string
  tags?: string[]
  stats?: Record<string, any>
}

interface Section {
  type: string
  title: string
  items: SectionItem[]
}

const loading = ref(true)
const error = ref<string | null>(null)
const sections = ref<Section[]>([])

function coverEmoji(type: string) {
  const map: Record<string, string> = {
    content: '📖', course: '🎓', live: '📡', product: '🛍', agent: '🤖',
  }
  return map[type] || '📦'
}

async function fetchData() {
  loading.value = true
  error.value = null
  try {
    const data = await discoverApi.getDiscover({ page: 1, pageSize: 10 }) as any
    sections.value = Array.isArray(data) ? data : (data?.sections || data?.data || [])
  } catch (e: any) {
    error.value = e.errMsg || '加载失败'
  } finally {
    loading.value = false
  }
}

function goSearch(keyword: string) {
  uni.navigateTo({ url: `/pages/search/index?q=${encodeURIComponent(keyword)}` })
}

function goPage(href: string) {
  uni.navigateTo({ url: href })
}

function goSectionMore(type: string) {
  const routes: Record<string, string> = {
    course: '/pages/courses/index',
    content: '/pages/articles/index',
    live: '/pages/live/index',
    product: '/pages/mall/index',
  }
  uni.navigateTo({ url: routes[type] || '/pages/discover/index' })
}

function goDetail(item: SectionItem) {
  const routes: Record<string, string> = {
    content: `/pages/article/detail?id=${item.id}`,
    course: `/pages/course/detail?id=${item.id}`,
    live: `/pages/live/index?id=${item.id}`,
    product: `/pages/mall/product/detail?id=${item.id}`,
  }
  uni.navigateTo({ url: routes[item.type] || `/pages/article/detail?id=${item.id}` })
}

onMounted(() => { fetchData() })
onPullDownRefresh(() => {
  fetchData().finally(() => setTimeout(() => uni.stopPullDownRefresh(), 500))
})
</script>

<style scoped>
.discover-page {
  min-height: 100vh;
  background: #FAF8F5;
  padding-bottom: 100rpx;
}

.header-sticky {
  position: sticky;
  top: 0;
  z-index: 30;
  background: #FAF8F5;
}

.search-area {
  padding: 24rpx 24rpx 8rpx;
}

/* 热搜词 */
.hot-words-scroll {
  padding: 8rpx 0;
  white-space: nowrap;
}
.hot-words-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 0 24rpx;
}
.hot-label {
  display: flex;
  align-items: center;
  gap: 4rpx;
  font-size: 22rpx;
  color: #999;
  flex-shrink: 0;
}
.hot-word {
  flex-shrink: 0;
  padding: 6rpx 20rpx;
  border-radius: 32rpx;
  font-size: 22rpx;
  color: #555;
  background: #fff;
  border: 1px solid #E8E0D5;
}

/* 分类入口 */
.categories-area {
  padding: 20rpx 24rpx 24rpx;
}
.category-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx 8rpx;
}
.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
}
.cat-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 24rpx;
  background: rgba(201, 169, 110, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 44rpx;
}
.cat-label {
  font-size: 22rpx;
  color: #333;
  font-weight: 500;
}

.section-divider {
  height: 16rpx;
  background: #F0EDE5;
}

/* Loading / Error */
.loading-area {
  padding: 24rpx;
}
.error-area {
  padding: 80rpx 24rpx;
}

/* 区块 */
.sections-area {
  padding: 24rpx 0;
}
.section-block {
  margin-bottom: 32rpx;
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24rpx 16rpx;
}
.section-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #2C2C2C;
}
.section-more {
  font-size: 24rpx;
  color: #C9A96E;
}

/* 横向滚动卡片 */
.section-scroll {
  white-space: nowrap;
}
.section-items {
  display: flex;
  gap: 16rpx;
  padding: 0 24rpx;
}
.section-card {
  width: 280rpx;
  flex-shrink: 0;
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06);
  position: relative;
}
.card-cover {
  width: 280rpx;
  height: 200rpx;
  display: block;
}
.card-cover-plain {
  width: 280rpx;
  height: 200rpx;
  background: linear-gradient(135deg, #F5F0E8, #EDE5D5);
  display: flex;
  align-items: center;
  justify-content: center;
}
.cover-emoji {
  font-size: 64rpx;
}
.card-tag {
  position: absolute;
  top: 0;
  left: 0;
  margin: 12rpx;
}
.tag-text {
  font-size: 20rpx;
  color: #fff;
  background: rgba(196,30,58,0.85);
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
}
.card-info {
  padding: 16rpx;
}
.card-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #333;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: normal;
}
.card-intro {
  font-size: 22rpx;
  color: #888;
  line-height: 1.5;
  margin-top: 6rpx;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: normal;
}
.card-meta {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 12rpx;
}
.meta-price {
  font-size: 26rpx;
  font-weight: 700;
  color: #C41E3A;
}
.meta-sub {
  font-size: 20rpx;
  color: #999;
}
.list-end {
  text-align: center;
  padding: 32rpx;
  font-size: 22rpx;
  color: #CCC;
}
</style>
