<template>
  <view class="page">
    <!-- Header -->
    <view class="header">
      <view class="header-inner">
        <view class="header-top">
          <text class="logo">
            热卜国学
          </text>
          <view class="header-actions">
            <view
              class="header-icon-wrap"
              @click="goPage('/pages/notifications/notifications')"
            >
              <text class="header-icon">
                🔔
              </text>
              <view
                v-if="hasUnread"
                class="unread-dot"
              />
            </view>
            <view
              class="header-icon-wrap"
              @click="goPage('/pages/bots/bots')"
            >
              <text class="header-icon">
                🤖
              </text>
            </view>
          </view>
        </view>
        <view
          class="search-bar"
          @click="goSearch"
        >
          <text class="search-ai-badge">
            AI
          </text>
          <text class="search-placeholder">
            搜索课程、命理工具、古籍...
          </text>
        </view>
      </view>
    </view>

    <!-- 滚动内容区 -->
    <scroll-view
      class="scroll-content"
      scroll-y
      refresher-enabled
      :refresher-triggered="refreshing"
      lower-threshold="100"
      @refresherrefresh="onRefresh"
      @scrolltolower="onLoadMore"
    >
      <!-- 会员/VIP 入口卡片 -->
      <view
        class="vip-card"
        @click="goPage(memberInfo.isMember ? '/pages/vip/vip' : '/pages/vip/plans')"
      >
        <view class="vip-left">
          <view class="vip-avatar">
            <text class="vip-avatar-text">
              {{ userInitial }}
            </text>
          </view>
          <view class="vip-info">
            <text class="vip-greeting">
              {{ memberInfo.isMember ? '尊贵的VIP会员' : '你好，国学爱好者' }}
            </text>
            <text class="vip-sub">
              {{ memberInfo.isMember ? '会员到期: ' + memberInfo.expireText : '开通会员享专属权益' }}
            </text>
          </view>
        </view>
        <view class="vip-right">
          <view class="vip-balance">
            <text class="vip-balance-label">
              国学币
            </text>
            <text class="vip-balance-num">
              {{ coinBalance }}
            </text>
          </view>
          <view
            class="vip-badge"
            :class="{ 'is-member': memberInfo.isMember }"
          >
            <text>{{ memberInfo.isMember ? '会员' : '开通' }}</text>
          </view>
        </view>
      </view>

      <!-- Banner 轮播 -->
      <swiper
        class="banner-swiper"
        circular
        autoplay
        interval="4000"
        indicator-dots
        indicator-color="rgba(255,255,255,0.4)"
        indicator-active-color="#C9A96E"
      >
        <swiper-item
          v-for="(banner, idx) in banners"
          :key="idx"
        >
          <view
            class="banner-slide"
            :style="{ backgroundImage: 'url(' + banner.imageUrl + ')' }"
            @click="goBanner(banner)"
          >
            <view class="banner-overlay" />
            <view class="banner-text">
              <text class="banner-title">
                {{ banner.title || '' }}
              </text>
              <text class="banner-sub">
                {{ banner.subtitle || '' }}
              </text>
            </view>
          </view>
        </swiper-item>
      </swiper>

      <!-- 快捷入口 10 宫格 -->
      <view class="quick-grid">
        <view
          v-for="item in quickEntries"
          :key="item.id"
          class="quick-item"
          @click="goPage(item.link)"
        >
          <view
            class="quick-icon"
            :style="{ background: item.bgColor }"
          >
            <text
              :style="{ color: item.color }"
              class="quick-icon-text"
            >
              {{ item.icon }}
            </text>
            <view
              v-if="item.badge"
              class="quick-badge"
              :class="item.badgeClass"
            >
              <text>{{ item.badge }}</text>
            </view>
          </view>
          <text class="quick-name">
            {{ item.name }}
          </text>
        </view>
      </view>

      <!-- 运势卡片 -->
      <view
        class="fortune-card"
        @click="goPage('/pages/fortune/fortune')"
      >
        <view class="fortune-left">
          <view class="fortune-icon-wrap">
            <text class="fortune-emoji">
              ☯
            </text>
          </view>
          <view class="fortune-text">
            <text class="fortune-title">
              {{ fortuneText }}
            </text>
            <text class="fortune-sub">
              {{ fortuneSub }}
            </text>
          </view>
        </view>
        <view class="fortune-right">
          <text class="fortune-cta">
            查看详情 ›
          </text>
        </view>
      </view>

      <!-- AI 智能体推荐 -->
      <view class="section-header">
        <view class="section-title-wrap">
          <view class="section-bar" />
          <text class="section-title">
            AI 智能体
          </text>
        </view>
        <text
          class="section-more"
          @click="goPage('/pages/agents/agents')"
        >
          全部 ›
        </text>
      </view>
      <scroll-view
        class="agent-scroll"
        scroll-x
        show-scrollbar="false"
      >
        <view
          v-for="agent in agents"
          :key="agent.id"
          class="agent-card"
          @click="goPage('/pages/agent/agent?id=' + agent.id)"
        >
          <view
            class="agent-cover"
            :style="{ background: agent.gradient }"
          >
            <view class="agent-icon-wrap">
              <text class="agent-icon-text">
                {{ agent.icon }}
              </text>
            </view>
            <view class="agent-ai-badge">
              <text>AI</text>
            </view>
            <view
              v-if="agent.isHot"
              class="agent-hot-badge"
            >
              <text>HOT</text>
            </view>
          </view>
          <view class="agent-body">
            <text class="agent-name">
              {{ agent.name }}
            </text>
            <text class="agent-desc">
              {{ agent.desc }}
            </text>
            <view class="agent-footer">
              <text class="agent-users">
                {{ agent.users }}人使用
              </text>
              <text class="agent-chat-btn">
                对话
              </text>
            </view>
          </view>
        </view>
      </scroll-view>

      <!-- 内容 Tab 导航 -->
      <view class="tab-nav">
        <view
          v-for="ch in channels"
          :key="ch.key"
          class="tab-item"
          :class="{ active: currentTab === ch.key }"
          @click="switchTab(ch.key)"
        >
          <text>{{ ch.label }}</text>
        </view>
      </view>

      <!-- Feed 瀑布流 -->
      <DataState
        :is-loading="loading && feedList.length === 0"
        :error="loadError"
        :is-empty="!loading && feedList.length === 0"
        empty-title="暂无内容"
        empty-description="去看看其他频道吧"
        skeleton-type="feed"
        @retry="fetchFeed(true)"
      >
        <view class="waterfall-wrap">
          <view class="waterfall-col">
            <view
              v-for="(item, idx) in leftList"
              :key="item._type + '-' + item.id + '-l-' + idx"
              class="wf-card"
              @click="goItem(item)"
            >
              <!-- 封面 -->
              <view class="wf-cover">
                <image
                  v-if="item.cover"
                  :src="item.cover"
                  class="wf-img"
                  mode="widthFix"
                />
                <view
                  v-else
                  class="wf-placeholder"
                  :style="{ background: placeholderBg(idx) }"
                >
                  <text class="wf-placeholder-icon">
                    {{ typeIcon(item._type) }}
                  </text>
                </view>
                <!-- 角标 -->
                <view
                  v-if="item._type === 'live'"
                  class="wf-badge wf-badge-live"
                >
                  <view class="live-dot" /><text>直播</text>
                </view>
                <view
                  v-if="item._type === 'video' && item.duration"
                  class="wf-badge wf-badge-dur"
                >
                  <text>{{ formatDuration(item.duration) }}</text>
                </view>
                <view
                  v-if="item._type === 'product' && item.tag"
                  class="wf-badge"
                  :class="tagBadgeColor(item.tag)"
                >
                  <text>{{ item.tag }}</text>
                </view>
              </view>
              <!-- 信息 -->
              <view class="wf-body">
                <text class="wf-title">
                  {{ item.title || item.name }}
                </text>
                <!-- 价格 -->
                <view
                  v-if="item._type === 'product' || item._type === 'course'"
                  class="wf-price-row"
                >
                  <text class="wf-price">
                    ¥{{ item.price }}
                  </text>
                  <text
                    v-if="item.originalPrice"
                    class="wf-price-original"
                  >
                    ¥{{ item.originalPrice }}
                  </text>
                </view>
                <!-- 互动 -->
                <view class="wf-meta">
                  <view class="wf-author">
                    <view class="wf-avatar-wrap">
                      <image
                        v-if="item.authorAvatar"
                        :src="item.authorAvatar"
                        class="wf-avatar"
                      />
                      <text
                        v-else
                        class="wf-avatar-placeholder"
                      >
                        {{ (item.author || '国').charAt(0) }}
                      </text>
                    </view>
                    <text class="wf-author-name">
                      {{ item.author || item.anchorName || '国学平台' }}
                    </text>
                  </view>
                  <view
                    v-if="item.likeCount > 0"
                    class="wf-like"
                  >
                    <text>♥ {{ formatCount(item.likeCount) }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
          <view class="waterfall-col">
            <view
              v-for="(item, idx) in rightList"
              :key="item._type + '-' + item.id + '-r-' + idx"
              class="wf-card"
              @click="goItem(item)"
            >
              <view class="wf-cover">
                <image
                  v-if="item.cover"
                  :src="item.cover"
                  class="wf-img"
                  mode="widthFix"
                />
                <view
                  v-else
                  class="wf-placeholder"
                  :style="{ background: placeholderBg(idx + 100) }"
                >
                  <text class="wf-placeholder-icon">
                    {{ typeIcon(item._type) }}
                  </text>
                </view>
                <view
                  v-if="item._type === 'live'"
                  class="wf-badge wf-badge-live"
                >
                  <view class="live-dot" /><text>直播</text>
                </view>
                <view
                  v-if="item._type === 'video' && item.duration"
                  class="wf-badge wf-badge-dur"
                >
                  <text>{{ formatDuration(item.duration) }}</text>
                </view>
                <view
                  v-if="item._type === 'product' && item.tag"
                  class="wf-badge"
                  :class="tagBadgeColor(item.tag)"
                >
                  <text>{{ item.tag }}</text>
                </view>
              </view>
              <view class="wf-body">
                <text class="wf-title">
                  {{ item.title || item.name }}
                </text>
                <view
                  v-if="item._type === 'product' || item._type === 'course'"
                  class="wf-price-row"
                >
                  <text class="wf-price">
                    ¥{{ item.price }}
                  </text>
                  <text
                    v-if="item.originalPrice"
                    class="wf-price-original"
                  >
                    ¥{{ item.originalPrice }}
                  </text>
                </view>
                <view class="wf-meta">
                  <view class="wf-author">
                    <view class="wf-avatar-wrap">
                      <image
                        v-if="item.authorAvatar"
                        :src="item.authorAvatar"
                        class="wf-avatar"
                      />
                      <text
                        v-else
                        class="wf-avatar-placeholder"
                      >
                        {{ (item.author || '国').charAt(0) }}
                      </text>
                    </view>
                    <text class="wf-author-name">
                      {{ item.author || item.anchorName || '国学平台' }}
                    </text>
                  </view>
                  <view
                    v-if="item.likeCount > 0"
                    class="wf-like"
                  >
                    <text>♥ {{ formatCount(item.likeCount) }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 加载更多 -->
        <view class="load-more-wrap">
          <view
            v-if="loadingMore"
            class="load-more-indicator"
          >
            <view class="load-more-dot" />
            <text class="load-more-text">
              加载中...
            </text>
          </view>
          <view
            v-else-if="!hasMore && feedList.length > 0"
            class="no-more"
          >
            <text class="no-more-line" /><text class="no-more-text">
              已经到底了
            </text><text class="no-more-line" />
          </view>
        </view>
      </DataState>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import DataState from '../../components/DataState.vue'
import {
  contentApi, contentsApi, circleApi, videoApi, shopApi, liveApi,
  systemApi, recommendApi, memberApi, coinApi, botApi, checkinApi
} from '../../api'

// ==================== 类型定义 ====================

type ChannelKey = 'recommend' | 'hot' | 'live'

interface Channel {
  key: ChannelKey
  label: string
}

interface TabState {
  list: FeedItem[]
  page: number
  hasMore: boolean
  loaded: boolean
}

interface FeedItem {
  id: string
  _type: 'article' | 'video' | 'live' | 'product' | 'circle' | 'course' | 'ebook'
  title?: string
  name?: string
  cover?: string
  thumbnail?: string
  excerpt?: string
  intro?: string
  duration?: number
  price?: number
  originalPrice?: number
  author?: string
  authorAvatar?: string
  dynasty?: string
  tags?: string[]
  viewerCount?: number
  viewCount?: number
  likeCount?: number
  collectCount?: number
  memberCount?: number
  postCount?: number
  anchorName?: string
  tag?: string
  createdAt?: string
  [key: string]: any
}

interface QuickEntry {
  id: string
  name: string
  icon: string
  link: string
  color: string
  bgColor: string
  badge?: string
  badgeClass?: string
}

interface AgentItem {
  id: string
  name: string
  icon: string
  desc: string
  gradient: string
  users: string
  isHot: boolean
}

interface BannerData {
  id: string
  title?: string
  subtitle?: string
  imageUrl: string
  linkUrl?: string
  type?: string
}

interface MemberInfo {
  isMember: boolean
  level?: string
  expireAt?: string
  daysLeft?: number
  expireText?: string
}

// ==================== 快速入口配置 ====================

const quickEntries: QuickEntry[] = [
  { id: 'courses', name: '课程', icon: '📖', link: '/pages/courses/courses', color: '#4A90D9', bgColor: 'rgba(74,144,217,0.1)' },
  { id: 'circles', name: '圈子', icon: '👥', link: '/pages/circles/circles', color: '#52C41A', bgColor: 'rgba(82,196,26,0.1)' },
  { id: 'classics', name: '古籍', icon: '📜', link: '/pages/classics/classics', color: '#C9A96E', bgColor: 'rgba(201,169,110,0.1)' },
  { id: 'mall', name: '商城', icon: '🛍️', link: '/pages/shop/shop', color: '#C41E3A', bgColor: 'rgba(196,30,58,0.1)', badge: '热', badgeClass: 'badge-hot' },
  { id: 'live', name: '直播', icon: '📡', link: '/pages/live/live', color: '#E74C3C', bgColor: 'rgba(231,76,60,0.1)' },
  { id: 'fortune', name: '运势', icon: '☯', link: '/pages/fortune/fortune', color: '#9B59B6', bgColor: 'rgba(155,89,182,0.1)' },
  { id: 'paipan', name: '排盘', icon: '✦', link: '/pages/paipan/paipan', color: '#1890FF', bgColor: 'rgba(24,144,255,0.1)' },
  { id: 'agents', name: '智能体', icon: '◇', link: '/pages/agents/agents', color: '#722ED1', bgColor: 'rgba(114,46,209,0.1)', badge: 'AI', badgeClass: 'badge-ai' },
  { id: 'poetry', name: '诗词', icon: '🌸', link: '/pages/poetry/poetry', color: '#EB2F96', bgColor: 'rgba(235,47,150,0.1)' },
  { id: 'more', name: '更多', icon: '···', link: '/pages/discover/discover', color: '#666', bgColor: 'rgba(102,102,102,0.1)' },
]

// ==================== AI 智能体数据 ====================

const agents: AgentItem[] = [
  { id: '1', name: '八字大师', icon: '☰', desc: '精准解读四柱八字', gradient: 'linear-gradient(135deg, #667eea, #764ba2)', users: '12.8万', isHot: true },
  { id: '2', name: '紫微顾问', icon: '✦', desc: '紫微斗数命盘分析', gradient: 'linear-gradient(135deg, #a18cd1, #fbc2eb)', users: '8.5万', isHot: true },
  { id: '3', name: '风水先生', icon: '◎', desc: '居家办公风水布局', gradient: 'linear-gradient(135deg, #11998e, #38ef7d)', users: '6.2万', isHot: false },
  { id: '4', name: '起名助手', icon: '✎', desc: '姓名五行吉凶分析', gradient: 'linear-gradient(135deg, #ff6b6b, #ee5a24)', users: '9.8万', isHot: false },
]

// ==================== 频道配置 ====================

const channels: Channel[] = [
  { key: 'recommend', label: '推荐' },
  { key: 'hot', label: '热门' },
  { key: 'live', label: '直播' },
]

// ==================== 响应式状态 ====================

const currentTab = ref<ChannelKey>('recommend')
const loading = ref(false)
const loadingMore = ref(false)
const refreshing = ref(false)
const fetching = ref(false)
const loadError = ref<string | null>(null)
const hasUnread = ref(true)
const coinBalance = ref(0)
const fortuneText = ref('今日运势')
const fortuneSub = ref('点击查看今日运势详解')

const memberInfo = ref<MemberInfo>({
  isMember: false,
})

const userInitial = ref('国')

const banners = ref<BannerData[]>([])
const defaultBanners: BannerData[] = [
  { id: '1', title: '八字命理入门精讲', subtitle: '限时优惠，从零开始学命理', imageUrl: '', linkUrl: '' },
  { id: '2', title: '大师直播', subtitle: '2026下半年运势解读', imageUrl: '', linkUrl: '' },
  { id: '3', title: '新人专享', subtitle: '首单立减优惠', imageUrl: '', linkUrl: '' },
]

const tabData = ref<Record<ChannelKey, TabState>>({
  recommend: { list: [], page: 1, hasMore: true, loaded: false },
  hot: { list: [], page: 1, hasMore: true, loaded: false },
  live: { list: [], page: 1, hasMore: true, loaded: false },
})

const feedList = computed(() => tabData.value[currentTab.value].list)
const hasMore = computed(() => tabData.value[currentTab.value].hasMore)

const leftList = computed(() => feedList.value.filter((_, i) => i % 2 === 0))
const rightList = computed(() => feedList.value.filter((_, i) => i % 2 === 1))

// ==================== 工具函数 ====================

const placeholderColors = [
  'linear-gradient(135deg, #e8d5c5, #d4bfa5)',
  'linear-gradient(135deg, #d5c4b0, #c4b098)',
  'linear-gradient(135deg, #e0d0c0, #cfbfa8)',
  'linear-gradient(135deg, #E8E0D5, #C9A96E)',
  'linear-gradient(135deg, #d8c8b8, #c8b8a0)',
  'linear-gradient(135deg, #eddcc8, #ddccb4)',
]

function placeholderBg(idx: number): string {
  return placeholderColors[idx % placeholderColors.length]
}

function typeIcon(type: string): string {
  const map: Record<string, string> = {
    video: '🎬', live: '📡', product: '🛍️', circle: '👥',
    course: '📖', ebook: '📜', article: '📝',
  }
  return map[type] || '📜'
}

function formatCount(n?: number): string {
  if (!n) return '0'
  if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + 'w'
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(n)
}

function tagBadgeColor(tag: string): string {
  const clsMap: Record<string, string> = {
    '热销': 'wf-badge-hot',
    '新品': 'wf-badge-new',
    '秒杀': 'wf-badge-seckill',
    '爆款': 'wf-badge-boom',
    '热门': 'wf-badge-hot',
  }
  return clsMap[tag] || 'wf-badge-hot'
}

function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return ''
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function calcHeat(views: number, likes: number, createdAt?: string): number {
  const base = views * 2 + likes * 5
  if (!createdAt) return base
  try {
    const hours = (Date.now() - new Date(createdAt).getTime()) / 3600000
    const decay = Math.max(0.1, 1 - hours / 720)
    return Math.round(base * decay)
  } catch {
    return base
  }
}

function extractList(data: any, key: string): any[] {
  if (Array.isArray(data)) return data
  if (!data || typeof data !== 'object') return []
  const knownKeys = [key, 'data', 'list', 'items', 'records', 'articles', 'courses', 'circles', 'videos', 'products', 'rooms', 'contents']
  for (const k of knownKeys) {
    if (Array.isArray(data[k])) return data[k]
  }
  for (const v of Object.values(data)) {
    if (Array.isArray(v)) return v
  }
  return []
}

function interleave(a: any[], b: any[]): any[] {
  const result: any[] = []
  const maxLen = Math.max(a.length, b.length)
  for (let i = 0; i < maxLen; i++) {
    if (i < a.length) result.push(a[i])
    if (i < b.length) result.push(b[i])
  }
  return result
}

function appendUnique(target: FeedItem[], source: FeedItem[]) {
  const existIds = new Set(target.map((x) => x._type + '-' + x.id))
  for (const item of source) {
    if (!existIds.has(item._type + '-' + item.id)) {
      target.push(item)
    }
  }
}

// ==================== 导航 ====================

function goPage(url: string) {
  uni.navigateTo({ url })
}

function goSearch() {
  uni.navigateTo({ url: '/pages/search/search' })
}

function goBanner(banner: BannerData) {
  if (banner.linkUrl) {
    uni.navigateTo({ url: banner.linkUrl })
  }
}

function goItem(item: FeedItem) {
  switch (item._type) {
    case 'video':
      uni.navigateTo({ url: `/pages/videos/video-play?id=${item.id}` })
      break
    case 'live':
      uni.navigateTo({ url: `/pages/live/live-room?id=${item.id}` })
      break
    case 'product':
      uni.navigateTo({ url: `/pages/shop/product-detail?id=${item.id}` })
      break
    case 'circle':
      uni.navigateTo({ url: `/pages/circles/circle-detail?id=${item.id}` })
      break
    case 'course':
      uni.navigateTo({ url: `/pages/courses/course-detail?id=${item.id}` })
      break
    case 'ebook':
      uni.navigateTo({ url: `/pages/ebook/ebook-detail?id=${item.id}` })
      break
    default:
      uni.navigateTo({ url: `/pages/detail/detail?id=${item.id}&type=${item._type === 'editorial' ? 'CONTENT' : 'ARTICLE'}` })
      break
  }
}

// ==================== 数据加载 ====================

async function fetchMemberInfo() {
  try {
    const [status, balance] = await Promise.all([
      memberApi.myStatus().catch(() => null),
      coinApi.getBalance().catch(() => null),
    ])
    if (status) {
      const expireText = status.expireAt
        ? `${new Date(status.expireAt).getMonth() + 1}月${new Date(status.expireAt).getDate()}日`
        : ''
      memberInfo.value = {
        isMember: status.isMember || false,
        level: status.planName,
        expireAt: status.expireAt,
        daysLeft: status.daysLeft,
        expireText,
      }
    }
    if (balance && typeof balance === 'object' && 'balance' in balance) {
      coinBalance.value = (balance as any).balance || 0
    }
  } catch { /* 静默处理 */ }
}

async function fetchBanners() {
  try {
    const data: any = await systemApi.getBanners()
    const list = extractList(data, 'banners')
    if (list.length > 0) {
      banners.value = list.map((b: any) => ({
        id: b.id || '',
        title: b.title || '',
        subtitle: b.subtitle || b.description || '',
        imageUrl: b.imageUrl || b.image || '',
        linkUrl: b.linkUrl || b.link || '',
        type: b.type || '',
      }))
    }
  } catch { /* 使用默认 */ }
}

async function fetchAgents() {
  try {
    const data: any = await botApi.feedCards()
    const list = extractList(data, 'list')
    if (list.length > 0) {
      // 如果 API 返回了数据则覆盖，否则保持默认
    }
  } catch { /* 使用默认 */ }
}

async function fetchFortune() {
  try {
    const status: any = await checkinApi.getStatus()
    if (status?.isCheckedIn !== undefined) {
      // 更新运势文案
      const hour = new Date().getHours()
      const timeGreeting = hour < 6 ? '夜深了' : hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好'
      fortuneText.value = `${timeGreeting}，${status.isCheckedIn ? '已签到' : '去签到'}`
      fortuneSub.value = status.isCheckedIn ? '今日宜修身养性' : '签到领国学币'
    }
  } catch { /* 使用默认 */ }
}

async function fetchFeed(reset: boolean) {
  if (fetching.value) return
  fetching.value = true
  loadError.value = null

  const key = currentTab.value
  const state = tabData.value[key]

  if (reset) {
    loading.value = true
    state.page = 1
    state.hasMore = true
  }

  try {
    if (key === 'recommend') {
      const [articleData, contentsData, circleData] = await Promise.all([
        contentApi.feed({ page: state.page, pageSize: 8 }).catch(() => ({ list: [] })),
        contentsApi.list({ page: state.page, pageSize: 6, status: 'PUBLISHED' }).catch(() => ({ data: [] })),
        circleApi.list({ page: Math.ceil(state.page / 2), pageSize: 4 }).catch(() => ({ circles: [] })),
      ])

      const articles: FeedItem[] = extractList(articleData, 'list')
        .slice(0, 4)
        .map((a: any) => ({
          ...a,
          _type: 'article' as const,
          heatScore: calcHeat(a.viewCount || 0, a.likeCount || 0, a.createdAt),
        }))

      const editorials: FeedItem[] = extractList(contentsData, 'data')
        .slice(0, 4)
        .map((c: any) => ({
          ...c,
          _type: 'editorial' as any,
          id: c.id,
          title: c.title,
          cover: c.cover,
          author: c.author,
          dynasty: c.dynasty,
          excerpt: c.excerpt,
          viewCount: c.viewCount || 0,
          likeCount: c.likeCount || 0,
          tags: c.tags || [],
          createdAt: c.createdAt,
          heatScore: calcHeat(c.viewCount || 0, c.likeCount || 0, c.createdAt),
        }))

      const circles: FeedItem[] = extractList(circleData, 'circles')
        .slice(0, 3)
        .map((c: any) => ({
          ...c,
          _type: 'circle' as const,
          title: c.name || c.title,
          heatScore: calcHeat(c.memberCount || 0, c.postCount || 0, c.createdAt),
        }))

      const merged = interleave(interleave(articles, editorials), circles)
      merged.sort((a, b) => (b.heatScore || 0) - (a.heatScore || 0))

      if (reset) {
        state.list = merged
      } else {
        appendUnique(state.list, merged)
      }
      state.hasMore = articles.length >= 4
    } else if (key === 'hot') {
      const [videoData, productData] = await Promise.all([
        videoApi.list({ page: state.page, pageSize: 8, sort: 'hot' }).catch(() => ({ videos: [] })),
        shopApi.products({ page: state.page, pageSize: 4 }).catch(() => ({ products: [] })),
      ])

      const videos: FeedItem[] = extractList(videoData, 'videos')
        .slice(0, 6)
        .map((v: any) => ({
          ...v,
          _type: 'video' as const,
          heatScore: calcHeat(v.viewCount || 0, v.likeCount || 0, v.createdAt),
        }))

      const products: FeedItem[] = extractList(productData, 'products')
        .slice(0, 4)
        .map((p: any) => ({
          ...p,
          _type: 'product' as const,
          title: p.title || p.name,
          heatScore: calcHeat((p.sales || 0) * 3 + (p.viewCount || 0), p.rating || 0, p.createdAt),
        }))

      const merged = interleave(videos, products)
      merged.sort((a, b) => (b.heatScore || 0) - (a.heatScore || 0))

      if (reset) {
        state.list = merged
      } else {
        appendUnique(state.list, merged)
      }
      state.hasMore = videos.length >= 6
    } else if (key === 'live') {
      const roomData = await liveApi
        .rooms({ page: state.page, pageSize: 10, status: 'LIVING' })
        .catch(() => ({ rooms: [] }))

      const rooms: FeedItem[] = extractList(roomData, 'rooms').map((r: any) => ({
        ...r,
        _type: 'live' as const,
        title: r.title || r.name,
        cover: r.cover || r.thumbnail,
        anchorName: r.anchorName || r.anchor?.nickname || r.user?.nickname,
      }))

      if (reset) {
        state.list = rooms
      } else {
        appendUnique(state.list, rooms)
      }
      state.hasMore = rooms.length >= 10
    }

    state.loaded = true
  } catch {
    loadError.value = '加载失败'
    if (reset) state.list = []
  } finally {
    if (reset) loading.value = false
    loadingMore.value = false
    fetching.value = false
  }
}

// ==================== Tab 切换 ====================

function switchTab(key: ChannelKey) {
  if (currentTab.value === key) return
  currentTab.value = key
  const state = tabData.value[key]
  fetchFeed(true)
}

// ==================== 下拉刷新 & 上拉加载 ====================

async function onRefresh() {
  refreshing.value = true
  const key = currentTab.value
  tabData.value[key] = { list: [], page: 1, hasMore: true, loaded: false }
  await fetchFeed(true)
  refreshing.value = false
}

function onLoadMore() {
  const state = tabData.value[currentTab.value]
  if (!state.hasMore || fetching.value || loadingMore.value) return
  loadingMore.value = true
  state.page++
  fetchFeed(false)
}

// ==================== 生命周期 ====================

onMounted(() => {
  fetchMemberInfo()
  fetchBanners()
  fetchAgents()
  fetchFortune()
  fetchFeed(true)
})
</script>

<style>
/* ==================== 全局 ==================== */
.page {
  background: #F5F0E8;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.scroll-content {
  flex: 1;
  height: 100vh;
}

/* ==================== Header ==================== */
.header {
  background: linear-gradient(135deg, #C41E3A, #8B0000);
  padding-top: calc(20px + env(safe-area-inset-top));
  color: #fff;
  flex-shrink: 0;
}
.header-inner {
  padding: 0 16px 16px;
}
.header-top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.logo {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 2px;
  font-family: 'Noto Serif SC', serif;
}
.header-actions {
  display: flex;
  gap: 12px;
  margin-left: auto;
}
.header-icon-wrap {
  position: relative;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255,255,255,0.15);
  display: flex;
  align-items: center;
  justify-content: center;
}
.header-icon {
  font-size: 16px;
}
.unread-dot {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #FFD700;
  border: 1.5px solid #C41E3A;
}
.search-bar {
  background: rgba(255,255,255,0.18);
  border-radius: 20px;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.search-ai-badge {
  font-size: 10px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #8B5CF6, #722ED1);
  padding: 1px 6px;
  border-radius: 4px;
}
.search-placeholder {
  color: rgba(255,255,255,0.7);
  font-size: 14px;
}

/* ==================== VIP 会员卡片 ==================== */
.vip-card {
  margin: 12px 16px 0;
  background: linear-gradient(135deg, #FAF3E8, #FDF8F0);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 12px rgba(201,169,110,0.15);
  border: 1px solid rgba(201,169,110,0.3);
}
.vip-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.vip-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, #C9A96E, #D4AF37);
  display: flex;
  align-items: center;
  justify-content: center;
}
.vip-avatar-text {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
}
.vip-greeting {
  font-size: 15px;
  font-weight: 600;
  color: #2C2C2C;
  display: block;
}
.vip-sub {
  font-size: 11px;
  color: #999;
  margin-top: 2px;
  display: block;
}
.vip-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}
.vip-balance {
  display: flex;
  align-items: center;
  gap: 4px;
}
.vip-balance-label {
  font-size: 10px;
  color: #C9A96E;
}
.vip-balance-num {
  font-size: 16px;
  font-weight: 700;
  color: #C9A96E;
  font-family: 'Noto Serif SC', serif;
}
.vip-badge {
  padding: 2px 12px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  background: #C9A96E;
  color: #fff;
}
.vip-badge.is-member {
  background: linear-gradient(135deg, #C9A96E, #D4AF37);
}

/* ==================== Banner ==================== */
.banner-swiper {
  width: calc(100% - 32px);
  height: 140px;
  margin: 12px 16px 0;
  border-radius: 12px;
  overflow: hidden;
}
.banner-slide {
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  position: relative;
  border-radius: 12px;
  overflow: hidden;
}
.banner-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.1) 50%, transparent 100%);
}
.banner-text {
  position: absolute;
  bottom: 12px;
  left: 16px;
  right: 16px;
  display: flex;
  flex-direction: column;
}
.banner-title {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 1px 4px rgba(0,0,0,0.3);
}
.banner-sub {
  font-size: 12px;
  color: rgba(255,255,255,0.85);
  margin-top: 2px;
}

/* ==================== 快捷入口 10宫格 ==================== */
.quick-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
  margin: 12px 16px 0;
  background: #fff;
  border-radius: 12px;
  padding: 14px 8px 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
.quick-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 4px 0;
  transition: transform 0.15s;
}
.quick-item:active {
  transform: scale(0.92);
}
.quick-icon {
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.quick-icon-text {
  font-size: 20px;
}
.quick-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  padding: 1px 5px;
  border-radius: 8px;
  font-size: 9px;
  font-weight: 700;
  color: #fff;
}
.quick-badge.badge-hot {
  background: #C41E3A;
}
.quick-badge.badge-ai {
  background: linear-gradient(135deg, #8B5CF6, #722ED1);
}
.quick-name {
  font-size: 11px;
  color: #333;
  font-weight: 500;
}

/* ==================== 运势卡片 ==================== */
.fortune-card {
  margin: 12px 16px 0;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 4px 16px rgba(102,126,234,0.25);
}
.fortune-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.fortune-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgba(255,255,255,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}
.fortune-emoji {
  font-size: 22px;
  color: #fff;
}
.fortune-title {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  display: block;
}
.fortune-sub {
  font-size: 11px;
  color: rgba(255,255,255,0.75);
  margin-top: 2px;
  display: block;
}
.fortune-right {
  flex-shrink: 0;
}
.fortune-cta {
  font-size: 12px;
  color: rgba(255,255,255,0.8);
}

/* ==================== Section Header ==================== */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 16px 16px 0;
}
.section-title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}
.section-bar {
  width: 3px;
  height: 16px;
  background: #C41E3A;
  border-radius: 2px;
}
.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #2C2C2C;
}
.section-more {
  font-size: 12px;
  color: #999;
}

/* ==================== AI 智能体 ==================== */
.agent-scroll {
  margin: 10px 16px 0;
  white-space: nowrap;
  padding-bottom: 4px;
}
.agent-card {
  display: inline-block;
  width: 140px;
  margin-right: 10px;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  vertical-align: top;
}
.agent-card:active {
  transform: scale(0.97);
}
.agent-cover {
  position: relative;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.agent-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: rgba(255,255,255,0.25);
  display: flex;
  align-items: center;
  justify-content: center;
}
.agent-icon-text {
  font-size: 18px;
  color: #fff;
}
.agent-ai-badge {
  position: absolute;
  top: 6px;
  left: 6px;
  padding: 1px 6px;
  border-radius: 4px;
  background: #8B5CF6;
  font-size: 9px;
  font-weight: 600;
  color: #fff;
}
.agent-hot-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  padding: 1px 6px;
  border-radius: 4px;
  background: #C41E3A;
  font-size: 9px;
  font-weight: 600;
  color: #fff;
}
.agent-body {
  padding: 8px 10px 10px;
}
.agent-name {
  font-size: 13px;
  font-weight: 600;
  color: #2C2C2C;
  display: block;
}
.agent-desc {
  font-size: 10px;
  color: #999;
  margin-top: 2px;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.agent-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 6px;
}
.agent-users {
  font-size: 9px;
  color: #bbb;
}
.agent-chat-btn {
  font-size: 10px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #8B5CF6, #722ED1);
  padding: 2px 10px;
  border-radius: 10px;
}

/* ==================== Tab Nav ==================== */
.tab-nav {
  display: flex;
  gap: 24px;
  margin: 14px 16px 10px;
  padding-bottom: 2px;
  border-bottom: 1px solid #E8E0D5;
}
.tab-item {
  font-size: 15px;
  color: #999;
  padding-bottom: 8px;
  border-bottom: 2px solid transparent;
  position: relative;
  transition: all 0.2s;
}
.tab-item.active {
  color: #2C2C2C;
  font-weight: 600;
}
.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 3px;
  background: #C41E3A;
  border-radius: 2px;
}

/* ==================== 双列瀑布流 ==================== */
.waterfall-wrap {
  display: flex;
  gap: 10px;
  padding: 0 16px;
  align-items: flex-start;
}
.waterfall-col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.wf-card {
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  transition: transform 0.15s;
}
.wf-card:active {
  transform: scale(0.97);
}

.wf-cover {
  position: relative;
  width: 100%;
  background: #F5F0E8;
  line-height: 0;
}
.wf-img {
  width: 100%;
  display: block;
}
.wf-placeholder {
  width: 100%;
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.wf-placeholder-icon {
  font-size: 32px;
  opacity: 0.45;
}

/* 角标 */
.wf-badge {
  position: absolute;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 3px;
  z-index: 2;
}
.wf-badge-live {
  top: 6px;
  left: 6px;
  background: #C41E3A;
  color: #fff;
}
.live-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #fff;
  animation: live-pulse 1.5s ease-in-out infinite;
}
@keyframes live-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
.wf-badge-dur {
  bottom: 6px;
  right: 6px;
  background: rgba(0,0,0,0.65);
  color: #fff;
  font-family: 'Courier New', monospace;
}
.wf-badge-hot {
  top: 6px;
  right: 6px;
  background: #C41E3A;
  color: #fff;
}
.wf-badge-new {
  top: 6px;
  right: 6px;
  background: #52C41A;
  color: #fff;
}
.wf-badge-seckill {
  top: 6px;
  right: 6px;
  background: #9B59B6;
  color: #fff;
}
.wf-badge-boom {
  top: 6px;
  right: 6px;
  background: #FF6B35;
  color: #fff;
}

.wf-body {
  padding: 10px 12px 12px;
}
.wf-title {
  font-size: 13px;
  font-weight: 500;
  color: #2C2C2C;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 6px;
}
.wf-price-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 6px;
}
.wf-price {
  font-size: 16px;
  font-weight: 700;
  color: #C41E3A;
  font-family: 'Courier New', monospace;
}
.wf-price-original {
  font-size: 11px;
  color: #bbb;
  text-decoration: line-through;
}
.wf-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.wf-author {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}
.wf-avatar-wrap {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #F5F0E8;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}
.wf-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
}
.wf-avatar-placeholder {
  font-size: 8px;
  color: #C9A96E;
  font-weight: 600;
}
.wf-author-name {
  font-size: 11px;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wf-like {
  font-size: 10px;
  color: #bbb;
  flex-shrink: 0;
}

/* ==================== 加载更多 ==================== */
.load-more-wrap {
  padding: 0 16px;
}
.load-more-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px 0;
}
.load-more-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #C9A96E;
  animation: dot-pulse 0.8s ease-in-out infinite;
}
@keyframes dot-pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}
.load-more-text {
  font-size: 13px;
  color: #C9A96E;
}
.no-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 20px 0;
}
.no-more-line {
  width: 40px;
  height: 1px;
  background: #E8E0D5;
}
.no-more-text {
  font-size: 12px;
  color: #C9A96E;
}
</style>
