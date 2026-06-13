<template>
  <view class="page">
    <!-- 搜索栏 (V0设计：Search + Bell + Avatar) -->
    <view class="search-bar">
      <view class="search-input" @click="goSearch">
        <text class="search-icon">🔍</text>
        <text class="search-placeholder">搜索课程、圈子、文章...</text>
      </view>
      <view class="search-actions">
        <view class="bell-wrap" @click="goNotifications">
          <text>🔔</text>
          <view v-if="hasUnread" class="bell-dot" />
        </view>
        <view class="avatar-wrap" @click="goProfile">
          <text>👤</text>
        </view>
      </view>
    </view>

    <!-- Banner 轮播 (V0: HomeBanner) -->
    <swiper class="banner" indicator-dots autoplay circular interval="4000">
      <swiper-item v-for="b in banners" :key="b.id">
        <view class="banner-slide" :style="{ background: b.color }" @click="goPage(b.link)">
          <text class="banner-title">{{  b.title }}</text>
          <text class="banner-sub">{{  b.subtitle }}</text>
        </view>
      </swiper-item>
    </swiper>

    <!-- 10宫格快捷入口 (V0: QuickEntryGrid) -->
    <view class="quick-grid">
      <view v-for="item in quickEntries" :key="item.label" class="quick-item" @click="goPage(item.link)">
        <view class="quick-icon-box" :style="{ background: item.bg }">
          <text class="quick-icon">{{  item.icon }}</text>
        </view>
        <text class="quick-label">{{  item.label }}</text>
      </view>
    </view>

    <!-- 内容 Feed 流 (V0: HomeFeed) -->
    <view class="feed-header">
      <text class="feed-title">推荐内容</text>
      <view class="feed-tabs">
        <text v-for="t in tabs" :key="t" class="feed-tab" :class="{ active: activeTab === t }" @click="activeTab = t">{{  t }}</text>
      </view>
    </view>

    <!-- 加载态 -->
    <view v-if="loading" class="feed-list">
      <view v-for="i in 3" :key="'sk'+i" class="feed-card skeleton">
        <view class="feed-cover sk-bg" />
        <view class="feed-body">
          <view class="sk-line sk-title" />
          <view class="sk-line sk-desc" />
          <view class="sk-line sk-meta" />
        </view>
      </view>
    </view>

    <!-- Feed 列表 -->
    <view v-else class="feed-list">
      <view v-for="item in feedItems" :key="item.id" class="feed-card" @click="goPage(item.link)">
        <image v-if="item.cover" :src="item.cover" class="feed-cover" mode="aspectFill" lazy-load />
        <view class="feed-body">
          <text class="feed-item-title">{{  item.title }}</text>
          <text class="feed-desc">{{  item.desc }}</text>
          <view class="feed-meta">
            <view class="feed-tag" :style="{ background: item.tagBg, color: item.tagColor }">{{  item.tag }}</view>
            <text class="feed-stats">{{  item.views }} 浏览 · {{  item.likes }} 赞</text>
          </view>
        </view>
      </view>
      <view v-if="!feedItems.length" class="empty-feed">
        <text>暂无推荐内容</text>
      </view>
    </view>

    <!-- 浮动 AI 助手 (V0: FloatingAssistant) -->
    <view class="float-ai" @click="goPage('/pages/bots/bots')">
      <text class="float-ai-icon">🤖</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { systemApi, recommendApi, notifyApi } from '@/api'

const hasUnread = ref(false)
const activeTab = ref('推荐')
const loading = ref(true)
const refreshing = ref(false)
const tabs = ['推荐', '课程', '文章', '圈子']

// 默认兜底数据
const defaultBanners = [
  { id: 1, title: '易经入门', subtitle: '从零开始学易经', color: 'linear-gradient(135deg, #C41E3A, #8B0000)', link: '/pages/courses/courses' },
  { id: 2, title: '八字排盘', subtitle: '探索命运密码', color: 'linear-gradient(135deg, #8B4513, #2C1810)', link: '/pages/tools/index' },
  { id: 3, title: 'AI智能体', subtitle: 'AI智慧解读命盘', color: 'linear-gradient(135deg, #4A90D9, #1a3a5c)', link: '/pages/agents/index' },
]

const banners = ref<any[]>([])

const quickEntries = [
  { label: '排盘', icon: '🔮', bg: 'rgba(196,30,58,.1)', link: '/pages/tools/index' },
  { label: '课程', icon: '📖', bg: 'rgba(74,144,217,.1)', link: '/pages/courses/courses' },
  { label: '圈子', icon: '👥', bg: 'rgba(201,169,110,.1)', link: '/pages/circles/circles' },
  { label: '直播', icon: '📡', bg: 'rgba(231,76,60,.1)', link: '/pages/live/live' },
  { label: '商城', icon: '🛍', bg: 'rgba(82,196,26,.1)', link: '/pages/shop/shop' },
  { label: '古籍', icon: '📜', bg: 'rgba(114,46,209,.1)', link: '/pages/classics/classics' },
  { label: '问答', icon: '💬', bg: 'rgba(250,140,22,.1)', link: '/pages/qa/questions' },
  { label: '运势', icon: '⭐', bg: 'rgba(255,77,79,.1)', link: '/pages/fortune/daily' },
  { label: 'AI智能体', icon: '🤖', bg: 'rgba(19,194,194,.1)', link: '/pages/agents/index' },
  { label: '更多', icon: '⋯', bg: 'rgba(102,102,102,.1)', link: '/pages/tools/index' },
]

const defaultFeed = [
  { id: 1, title: '道德经智慧：老子的处世哲学', desc: '李清玄教授 · 已更新至第15章', tag: '课程', tagBg: 'rgba(74,144,217,.1)', tagColor: '#4A90D9', views: 3280, likes: 156, cover: '', link: '/pages/courses/course-detail' },
  { id: 2, title: '命理研习堂——八字入门交流', desc: '王清音老师 · 8.2k成员', tag: '圈子', tagBg: 'rgba(201,169,110,.1)', tagColor: '#C9A96E', views: 8920, likes: 423, cover: '', link: '/pages/circles/circle-detail' },
  { id: 3, title: '今晚8点：家居风水布局实操', desc: '实战派风水师李玄明', tag: '直播', tagBg: 'rgba(231,76,60,.1)', tagColor: '#E74C3C', views: 15600, likes: 892, cover: '', link: '/pages/live/live-room' },
  { id: 4, title: '唐诗宋词赏析三十讲', desc: '每日一诗，品味千年文化', tag: '课程', tagBg: 'rgba(74,144,217,.1)', tagColor: '#4A90D9', views: 2450, likes: 321, cover: '', link: '/pages/courses/course-detail' },
  { id: 5, title: '开光铜葫芦摆件——镇宅辟邪', desc: '道长亲制 · 限时优惠', tag: '商品', tagBg: 'rgba(82,196,26,.1)', tagColor: '#52C41A', views: 5670, likes: 234, cover: '', link: '/pages/shop/product-detail' },
]

const feedItems = ref<any[]>([])

onMounted(() => { fetchHomeData() })

async function fetchHomeData() {
  loading.value = true
  await Promise.allSettled([fetchBanners(), fetchFeed(), checkUnread()])
  loading.value = false
  if (!banners.value.length) banners.value = defaultBanners
  if (!feedItems.value.length) feedItems.value = defaultFeed
}

async function fetchBanners() {
  try {
    const res = await systemApi.getBanners()
    const list = Array.isArray(res) ? res : res?.list || res?.banners || []
    if (list.length) {
      banners.value = list.map((b: any) => ({
        id: b.id,
        title: b.title,
        subtitle: b.subtitle || b.description || '',
        color: b.bgColor || b.color || 'linear-gradient(135deg, #C41E3A, #8B0000)',
        link: b.link || b.url || '',
      }))
    }
  } catch { /* 使用兜底数据 */ }
}

async function fetchFeed() {
  try {
    const res = await recommendApi.personalized({ page: 1, pageSize: 10 })
    const list = Array.isArray(res) ? res : res?.list || res?.items || []
    if (list.length) {
      feedItems.value = list.map((item: any) => ({
        id: item.id,
        title: item.title,
        desc: item.description || item.subtitle || '',
        tag: item.type || item.tag || '推荐',
        tagBg: 'rgba(196,30,58,.1)',
        tagColor: '#C41E3A',
        views: item.viewCount || item.views || 0,
        likes: item.likeCount || item.likes || 0,
        cover: item.cover || item.image || '',
        link: item.link || item.url || '',
      }))
    }
  } catch { /* 使用兜底数据 */ }
}

async function checkUnread() {
  try {
    const res = await notifyApi.unreadCount()
    hasUnread.value = (res?.count || res?.unreadCount || 0) > 0
  } catch { hasUnread.value = false }
}

async function onRefresh() {
  refreshing.value = true
  await fetchHomeData()
  refreshing.value = false
}

function goSearch() { uni.navigateTo({ url: '/pages/search/search' }) }
function goNotifications() { uni.navigateTo({ url: '/pages/notifications/notifications' }) }
function goProfile() { uni.navigateTo({ url: '/pages/mine/mine' }) }
function goPage(link: string) { if (link) uni.navigateTo({ url: link }) }
</script>

<style scoped>
.page { background: #FAF8F5; min-height: 100vh; padding-bottom: 100rpx; }

/* ── 搜索栏 ── */
.search-bar { display: flex; align-items: center; gap: 16rpx; padding: 20rpx 24rpx; background: #fff; position: sticky; top: 0; z-index: 100; }
.search-input { flex: 1; display: flex; align-items: center; gap: 12rpx; height: 72rpx; background: #F5F1EB; border-radius: 36rpx; padding: 0 20rpx; }
.search-icon { font-size: 28rpx; }
.search-placeholder { font-size: 26rpx; color: #999; }
.search-actions { display: flex; gap: 20rpx; }
.bell-wrap { position: relative; font-size: 36rpx; }
.bell-dot { position: absolute; top: 2rpx; right: 2rpx; width: 12rpx; height: 12rpx; border-radius: 6rpx; background: #C41E3A; }
.avatar-wrap { font-size: 36rpx; }

/* ── Banner ── */
.banner { width: 100%; height: 300rpx; margin: 0 0 20rpx; }
.banner-slide { height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; border-radius: 24rpx; margin: 16rpx 24rpx; }
.banner-title { font-size: 40rpx; font-weight: 700; color: #fff; font-family: 'Noto Serif SC', serif; }
.banner-sub { font-size: 26rpx; color: rgba(255,255,255,.8); margin-top: 8rpx; }

/* ── 10宫格 ── */
.quick-grid { display: flex; flex-wrap: wrap; padding: 0 16rpx; }
.quick-item { width: 20%; display: flex; flex-direction: column; align-items: center; padding: 16rpx 0; }
.quick-icon-box { width: 96rpx; height: 96rpx; border-radius: 24rpx; display: flex; align-items: center; justify-content: center; margin-bottom: 8rpx; }
.quick-icon { font-size: 40rpx; }
.quick-label { font-size: 22rpx; color: #666; }

/* ── Feed 流 ── */
.feed-header { display: flex; align-items: center; justify-content: space-between; padding: 24rpx 24rpx 16rpx; }
.feed-title { font-size: 32rpx; font-weight: 700; color: #2C2C2C; }
.feed-tabs { display: flex; gap: 24rpx; }
.feed-tab { font-size: 26rpx; color: #999; padding: 4rpx 0; }
.feed-tab.active { color: #C41E3A; border-bottom: 3rpx solid #C41E3A; }

.feed-list { padding: 0 24rpx; }
.feed-card { background: #fff; border-radius: 16rpx; overflow: hidden; margin-bottom: 20rpx; box-shadow: 0 2rpx 12rpx rgba(139,69,19,.06); display: flex; }
.feed-cover { width: 200rpx; height: 200rpx; background: #F5F1EB; flex-shrink: 0; }
.feed-body { flex: 1; padding: 20rpx; display: flex; flex-direction: column; }
.feed-item-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; line-height: 1.4; }
.feed-desc { font-size: 24rpx; color: #999; margin-top: 8rpx; flex:1; }
.feed-meta { display: flex; align-items: center; gap: 12rpx; margin-top: 12rpx; }
.feed-tag { font-size: 20rpx; padding: 2rpx 10rpx; border-radius: 6rpx; }
.feed-stats { font-size: 20rpx; color: #CCC; }

/* ── 骨架屏 ── */
.skeleton .feed-cover { background: #e8e0d5; }
.sk-line { height: 24rpx; background: #e8e0d5; border-radius: 6rpx; margin-bottom: 12rpx; animation: shimmer 1.5s infinite; }
.sk-title { width: 70%; height: 32rpx; }
.sk-desc { width: 90%; }
.sk-meta { width: 40%; }
@keyframes shimmer { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }

.empty-feed { text-align: center; padding: 80rpx 0; }
.empty-feed text { font-size: 26rpx; color: #ccc; }

/* ── 浮动助手 ── */
.float-ai { position: fixed; bottom: 140rpx; right: 32rpx; z-index: 200; }
.float-ai-icon { font-size: 96rpx; animation: breathe 2s ease-in-out infinite; display: block; }
@keyframes breathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.1); } }
</style>
