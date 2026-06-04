<template>
  <view class="page">
    <!-- 顶部搜索栏 -->
    <view class="header">
      <view
        class="search-bar"
        @click="goSearch"
      >
        <text class="search-icon">
          🔍
        </text>
        <text class="search-placeholder">
          搜索课程、商品、古籍...
        </text>
        <view class="search-ai-tag">
          <text class="search-ai-text">
            AI
          </text>
        </view>
      </view>
      <view
        class="ai-search-btn"
        @click="openAISearch"
      >
        <text class="ai-search-icon">
          ✨
        </text>
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
      <!-- 快捷分类入口 -->
      <view class="cat-grid">
        <view
          v-for="cat in topCategories"
          :key="cat.id"
          class="cat-item"
          @click="goCategory(cat)"
        >
          <view
            class="cat-icon"
            :style="{ background: cat.bgColor }"
          >
            <text
              :style="{ color: cat.color }"
              class="cat-icon-text"
            >
              {{ cat.icon }}
            </text>
          </view>
          <text class="cat-name">
            {{ cat.name }}
          </text>
        </view>
      </view>

      <!-- AI 搜索弹窗 -->
      <view
        v-if="showAISearch"
        class="ai-modal-overlay"
        @click="closeAISearch"
      >
        <view
          class="ai-modal"
          @click.stop
        >
          <view class="ai-modal-header">
            <text class="ai-modal-title">
              AI 智能搜索
            </text>
            <view
              class="ai-modal-close"
              @click="closeAISearch"
            >
              <text>✕</text>
            </view>
          </view>
          <view class="ai-modal-body">
            <view class="ai-input-wrap">
              <input
                v-model="aiQuery"
                class="ai-input"
                placeholder="输入你的问题，AI 帮你找..."
                confirm-type="search"
                @confirm="doAISearch"
              >
              <view
                class="ai-input-btn"
                @click="doAISearch"
              >
                <text>搜索</text>
              </view>
            </view>
            <view
              v-if="aiResult"
              class="ai-result"
            >
              <text class="ai-result-text">
                {{ aiResult }}
              </text>
            </view>
            <view
              v-else
              class="ai-suggestions"
            >
              <text class="ai-suggest-title">
                试试这样问：
              </text>
              <view class="ai-suggest-tags">
                <view
                  v-for="(q, i) in suggestQuestions"
                  :key="i"
                  class="ai-suggest-tag"
                  @click="aiQuery = q"
                >
                  <text>{{ q }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 内容分类 Tab -->
      <view class="section-header">
        <view class="section-title-wrap">
          <view class="section-bar" />
          <text class="section-title">
            为你推荐
          </text>
        </view>
        <view class="section-tag">
          <text class="section-tag-text">
            智能推荐
          </text>
        </view>
      </view>

      <scroll-view
        class="cat-tab-scroll"
        scroll-x
        show-scrollbar="false"
      >
        <view
          v-for="cat in categories"
          :key="cat.id"
          class="cat-tab"
          :class="{ active: activeCat === cat.id }"
          @click="switchCat(cat.id)"
        >
          <text>{{ cat.name }}</text>
        </view>
      </scroll-view>

      <!-- 内容瀑布流 -->
      <DataState
        :is-loading="loading"
        :error="loadError"
        :is-empty="!loading && items.length === 0"
        empty-title="暂无内容"
        empty-description="换个分类看看吧"
        skeleton-type="feed"
        @retry="fetchItems"
      >
        <view class="waterfall-wrap">
          <view class="waterfall-col">
            <view
              v-for="(item, idx) in leftItems"
              :key="item.id + '-l-' + idx"
              class="wf-card"
              @click="goDetail(item)"
            >
              <!-- 封面 -->
              <view
                v-if="item.type === 'ebook'"
                class="wf-cover wf-cover-ebook"
                @click="goDetail(item)"
              >
                <view class="ebook-deco-left" />
                <view class="ebook-text-wrap">
                  <text class="ebook-text-title">
                    {{ item.title }}
                  </text>
                </view>
                <view class="wf-badge wf-badge-ebook">
                  <text>免费阅读</text>
                </view>
              </view>
              <view
                v-else
                class="wf-cover"
              >
                <image
                  v-if="item.cover || item.image"
                  :src="item.cover || item.image"
                  class="wf-img"
                  mode="widthFix"
                />
                <view
                  v-else
                  class="wf-placeholder"
                  :style="{ background: placeholderBg(idx) }"
                >
                  <text class="wf-placeholder-icon">
                    {{ typeIcon(item.type) }}
                  </text>
                </view>
                <!-- 类型角标 -->
                <view
                  v-if="item.type === 'live'"
                  class="wf-badge wf-badge-live"
                >
                  <view class="live-dot" /><text>{{ item.isLive ? '直播' : '预约' }}</text>
                </view>
                <view
                  v-if="item.tag"
                  class="wf-badge"
                  :class="tagBadgeClass(item.tag)"
                >
                  <text>{{ item.tag }}</text>
                </view>
                <view
                  v-if="item.type === 'video' && item.duration"
                  class="wf-badge wf-badge-dur"
                >
                  <text>{{ item.duration }}</text>
                </view>
                <!-- 评分 -->
                <view
                  v-if="item.rating"
                  class="wf-rating"
                >
                  <text class="wf-rating-star">
                    ★
                  </text>
                  <text class="wf-rating-num">
                    {{ item.rating }}
                  </text>
                </view>
              </view>
              <!-- 信息 -->
              <view class="wf-body">
                <text class="wf-title">
                  {{ item.title || item.name }}
                </text>
                <!-- 价格 -->
                <view
                  v-if="item.type === 'product' || item.type === 'course'"
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
                <!-- 作者/信息 -->
                <view
                  v-if="item.type === 'course'"
                  class="wf-meta"
                >
                  <view class="wf-author">
                    <view class="wf-avatar-wrap">
                      <text class="wf-avatar-placeholder">
                        {{ (item.author || '').charAt(0) || '师' }}
                      </text>
                    </view>
                    <text class="wf-author-name">
                      {{ item.author || '讲师' }}
                    </text>
                  </view>
                </view>
                <view
                  v-else-if="item.type === 'ebook'"
                  class="wf-meta"
                >
                  <text class="wf-ebook-author">
                    {{ item.author }}
                  </text>
                  <view class="wf-ebook-stats">
                    <text class="wf-ebook-stat">
                      {{ formatCount(item.readers) }}人读过
                    </text>
                    <text class="wf-ebook-stat">
                      {{ item.chapters }}章
                    </text>
                  </view>
                </view>
                <view
                  v-else-if="item.type === 'product'"
                  class="wf-meta"
                >
                  <text class="wf-sales">
                    已售{{ formatCount(item.sales) }}
                  </text>
                </view>
                <view
                  v-else-if="item.type === 'live'"
                  class="wf-meta"
                >
                  <view class="wf-author">
                    <view class="wf-avatar-wrap">
                      <text class="wf-avatar-placeholder">
                        {{ (item.author || '').charAt(0) || '主' }}
                      </text>
                    </view>
                    <text class="wf-author-name">
                      {{ item.author || '主播' }}
                    </text>
                  </view>
                  <text
                    v-if="item.viewers"
                    class="wf-viewers"
                  >
                    ♥ {{ item.viewers }}
                  </text>
                  <text
                    v-else-if="item.reservations"
                    class="wf-viewers"
                  >
                    🔔 {{ item.reservations }}
                  </text>
                </view>
                <view
                  v-else-if="item.type === 'agent'"
                  class="wf-meta"
                >
                  <text class="wf-agent-users">
                    {{ item.users }}人使用
                  </text>
                  <text class="wf-agent-btn">
                    对话
                  </text>
                </view>
              </view>
            </view>
          </view>
          <view class="waterfall-col">
            <view
              v-for="(item, idx) in rightItems"
              :key="item.id + '-r-' + idx"
              class="wf-card"
              @click="goDetail(item)"
            >
              <view
                v-if="item.type === 'ebook'"
                class="wf-cover wf-cover-ebook"
              >
                <view class="ebook-deco-left" />
                <view class="ebook-text-wrap">
                  <text class="ebook-text-title">
                    {{ item.title }}
                  </text>
                </view>
                <view class="wf-badge wf-badge-ebook">
                  <text>免费阅读</text>
                </view>
              </view>
              <view
                v-else
                class="wf-cover"
              >
                <image
                  v-if="item.cover || item.image"
                  :src="item.cover || item.image"
                  class="wf-img"
                  mode="widthFix"
                />
                <view
                  v-else
                  class="wf-placeholder"
                  :style="{ background: placeholderBg(idx + 100) }"
                >
                  <text class="wf-placeholder-icon">
                    {{ typeIcon(item.type) }}
                  </text>
                </view>
                <view
                  v-if="item.type === 'live'"
                  class="wf-badge wf-badge-live"
                >
                  <view class="live-dot" /><text>{{ item.isLive ? '直播' : '预约' }}</text>
                </view>
                <view
                  v-if="item.tag"
                  class="wf-badge"
                  :class="tagBadgeClass(item.tag)"
                >
                  <text>{{ item.tag }}</text>
                </view>
                <view
                  v-if="item.type === 'video' && item.duration"
                  class="wf-badge wf-badge-dur"
                >
                  <text>{{ item.duration }}</text>
                </view>
                <view
                  v-if="item.rating"
                  class="wf-rating"
                >
                  <text class="wf-rating-star">
                    ★
                  </text>
                  <text class="wf-rating-num">
                    {{ item.rating }}
                  </text>
                </view>
              </view>
              <view class="wf-body">
                <text class="wf-title">
                  {{ item.title || item.name }}
                </text>
                <view
                  v-if="item.type === 'product' || item.type === 'course'"
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
                <view
                  v-if="item.type === 'course'"
                  class="wf-meta"
                >
                  <view class="wf-author">
                    <view class="wf-avatar-wrap">
                      <text class="wf-avatar-placeholder">
                        {{ (item.author || '').charAt(0) || '师' }}
                      </text>
                    </view>
                    <text class="wf-author-name">
                      {{ item.author || '讲师' }}
                    </text>
                  </view>
                </view>
                <view
                  v-else-if="item.type === 'ebook'"
                  class="wf-meta"
                >
                  <text class="wf-ebook-author">
                    {{ item.author }}
                  </text>
                  <view class="wf-ebook-stats">
                    <text class="wf-ebook-stat">
                      {{ formatCount(item.readers) }}人读过
                    </text>
                    <text class="wf-ebook-stat">
                      {{ item.chapters }}章
                    </text>
                  </view>
                </view>
                <view
                  v-else-if="item.type === 'product'"
                  class="wf-meta"
                >
                  <text class="wf-sales">
                    已售{{ formatCount(item.sales) }}
                  </text>
                </view>
                <view
                  v-else-if="item.type === 'live'"
                  class="wf-meta"
                >
                  <view class="wf-author">
                    <view class="wf-avatar-wrap">
                      <text class="wf-avatar-placeholder">
                        {{ (item.author || '').charAt(0) || '主' }}
                      </text>
                    </view>
                    <text class="wf-author-name">
                      {{ item.author || '主播' }}
                    </text>
                  </view>
                  <text
                    v-if="item.viewers"
                    class="wf-viewers"
                  >
                    ♥ {{ item.viewers }}
                  </text>
                  <text
                    v-else-if="item.reservations"
                    class="wf-viewers"
                  >
                    🔔 {{ item.reservations }}
                  </text>
                </view>
                <view
                  v-else-if="item.type === 'agent'"
                  class="wf-meta"
                >
                  <text class="wf-agent-users">
                    {{ item.users }}人使用
                  </text>
                  <text class="wf-agent-btn">
                    对话
                  </text>
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
            v-else-if="!hasMore && items.length > 0"
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
import DataState from '../../components/DataState.vue'
import { discoverApi, aiApi } from '../../api'

// ==================== 类型 ====================

interface CategoryItem {
  id: string
  name: string
}

interface TopCategory {
  id: string
  name: string
  icon: string
  color: string
  bgColor: string
  link: string
}

interface DiscoverItem {
  id: string
  type: string
  title?: string
  name?: string
  cover?: string
  image?: string
  price?: number
  originalPrice?: number
  author?: string
  tag?: string
  rating?: number
  sales?: number
  viewers?: number
  reservations?: number
  isLive?: boolean
  duration?: string
  users?: string
  readers?: number
  chapters?: number
  [key: string]: any
}

// ==================== 顶部分类 ====================

const topCategories: TopCategory[] = [
  { id: 'mall', name: '商城', icon: '🛍️', link: '/pages/shop/shop', color: '#C41E3A', bgColor: 'rgba(196,30,58,0.1)' },
  { id: 'courses', name: '课程', icon: '📖', link: '/pages/courses/courses', color: '#4A90D9', bgColor: 'rgba(74,144,217,0.1)' },
  { id: 'classics', name: '古籍', icon: '📜', link: '/pages/classics/classics', color: '#C9A96E', bgColor: 'rgba(201,169,110,0.1)' },
  { id: 'agents', name: '智能体', icon: '◇', link: '/pages/agents/agents', color: '#9B59B6', bgColor: 'rgba(155,89,182,0.1)' },
  { id: 'live', name: '直播', icon: '📡', link: '/pages/live/live', color: '#E74C3C', bgColor: 'rgba(231,76,60,0.1)' },
]

// ==================== AI 搜索 ====================

const showAISearch = ref(false)
const aiQuery = ref('')
const aiResult = ref('')
const suggestQuestions = [
  '推荐几个八字入门课程',
  '最近有什么风水古籍上新？',
  '紫微斗数和八字哪个更适合我？',
]

function openAISearch() {
  showAISearch.value = true
  aiQuery.value = ''
  aiResult.value = ''
}

function closeAISearch() {
  showAISearch.value = false
}

async function doAISearch() {
  if (!aiQuery.value.trim()) return
  aiResult.value = 'AI正在为你搜索...'
  try {
    const res: any = await aiApi.aiSearch(aiQuery.value)
    aiResult.value = res?.summary || res?.result || res?.answer || '未找到相关结果，请换个关键词试试'
  } catch {
    aiResult.value = 'AI 搜索暂时不可用，请稍后重试'
  }
}

// ==================== 状态 ====================

const loading = ref(true)
const loadingMore = ref(false)
const refreshing = ref(false)
const loadError = ref<string | null>(null)
const activeCat = ref('')
const categories = ref<CategoryItem[]>([])
const items = ref<DiscoverItem[]>([])
const page = ref(1)
const hasMore = ref(true)
const pageSize = 20
const fetching = ref(false)

// 双列拆分
const leftItems = computed(() => items.value.filter((_, i) => i % 2 === 0))
const rightItems = computed(() => items.value.filter((_, i) => i % 2 === 1))

// ==================== 工具 ====================

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
    product: '🛍️', course: '📖', ebook: '📜', agent: '◇',
    live: '📡', video: '🎬', article: '📝', circle: '👥',
  }
  return map[type] || '📜'
}

function tagBadgeClass(tag: string): string {
  const clsMap: Record<string, string> = {
    '热销': 'wf-badge-hot',
    '新品': 'wf-badge-new',
    '秒杀': 'wf-badge-seckill',
    '爆款': 'wf-badge-boom',
    'TOP1': 'wf-badge-top1',
    '新课': 'wf-badge-new',
    '热门': 'wf-badge-hot',
  }
  return clsMap[tag] || 'wf-badge-hot'
}

function formatCount(n?: number): string {
  if (!n) return '0'
  if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + 'w'
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(n)
}

function extractList(data: any): any[] {
  if (Array.isArray(data)) return data
  if (!data || typeof data !== 'object') return []
  const knownKeys = ['data', 'list', 'items', 'records', 'contents']
  for (const k of knownKeys) {
    if (Array.isArray(data[k])) return data[k]
  }
  for (const v of Object.values(data)) {
    if (Array.isArray(v)) return v
  }
  return []
}

// ==================== 导航 ====================

function goSearch() {
  uni.navigateTo({ url: '/pages/search/search' })
}

function goCategory(cat: TopCategory) {
  uni.navigateTo({ url: cat.link })
}

function goDetail(item: DiscoverItem) {
  const type = item.type || 'content'
  const routes: Record<string, string> = {
    product: `/pages/shop/product-detail?id=${item.id}`,
    course: `/pages/courses/course-detail?id=${item.id}`,
    ebook: `/pages/ebook/ebook-detail?id=${item.id}`,
    agent: `/pages/agent/agent?id=${item.id}`,
    live: `/pages/live/live-room?id=${item.id}`,
    video: `/pages/videos/video-play?id=${item.id}`,
    article: `/pages/detail/detail?id=${item.id}&type=ARTICLE`,
    circle: `/pages/circles/circle-detail?id=${item.id}`,
  }
  uni.navigateTo({ url: routes[type] || `/pages/detail/detail?id=${item.id}&type=CONTENT` })
}

// ==================== 数据加载 ====================

async function fetchCategories() {
  try {
    const data: any = await discoverApi.getCategories()
    const list = extractList(data)
    if (list.length > 0) {
      categories.value = list.map((c: any) => ({
        id: c.id || c.key || c.name,
        name: c.name || c.label || '',
      }))
    }
  } catch { /* 使用默认 */ }
}

async function fetchItems(reset = false) {
  if (fetching.value) return
  fetching.value = true
  loadError.value = null

  if (reset) {
    loading.value = true
    page.value = 1
    hasMore.value = true
  }

  try {
    const params: any = { page: page.value, pageSize }
    if (activeCat.value) params.categoryLevel1 = activeCat.value
    const data: any = await discoverApi.getDiscover(params)
    const list = extractList(data)

    if (reset) {
      items.value = list
    } else {
      const existIds = new Set(items.value.map((x) => x.id))
      for (const item of list) {
        if (!existIds.has(item.id)) items.value.push(item)
      }
    }

    hasMore.value = list.length >= pageSize
    if (reset) loading.value = false
  } catch {
    loadError.value = '加载失败'
    if (reset) { items.value = [] }
  } finally {
    if (reset) loading.value = false
    loadingMore.value = false
    fetching.value = false
  }
}

function switchCat(id: string) {
  if (activeCat.value === id) return
  activeCat.value = id
  fetchItems(true)
}

async function onRefresh() {
  refreshing.value = true
  await fetchItems(true)
  refreshing.value = false
}

function onLoadMore() {
  if (!hasMore.value || fetching.value || loadingMore.value) return
  loadingMore.value = true
  page.value++
  fetchItems(false)
}

// ==================== 生命周期 ====================

onMounted(async () => {
  await fetchCategories()
  if (categories.value.length > 0) {
    activeCat.value = categories.value[0].id
  }
  await fetchItems(true)
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
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  padding-top: calc(12px + env(safe-area-inset-top));
  background: #FFFAF5;
  border-bottom: 1px solid #E8E0D5;
  flex-shrink: 0;
}
.search-bar {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 14px;
  background: #F5F0E8;
  border-radius: 20px;
}
.search-icon {
  font-size: 14px;
  opacity: 0.6;
}
.search-placeholder {
  flex: 1;
  font-size: 13px;
  color: #999;
}
.search-ai-tag {
  padding: 2px 8px;
  background: rgba(155,89,182,0.1);
  border-radius: 4px;
}
.search-ai-text {
  font-size: 10px;
  font-weight: 600;
  color: #9B59B6;
}
.ai-search-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #8B5CF6, #722ED1);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 3px 12px rgba(114,46,209,0.25);
  flex-shrink: 0;
}
.ai-search-icon {
  font-size: 18px;
}

/* ==================== 分类入口 ==================== */
.cat-grid {
  display: flex;
  justify-content: space-between;
  padding: 16px 16px 0;
}
.cat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.cat-item:active {
  opacity: 0.7;
}
.cat-icon {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 4px rgba(0,0,0,0.03);
}
.cat-icon-text {
  font-size: 22px;
}
.cat-name {
  font-size: 11px;
  font-weight: 500;
  color: #333;
}

/* ==================== AI 搜索弹窗 ==================== */
.ai-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ai-modal {
  width: 85%;
  max-width: 360px;
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
}
.ai-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px 12px;
  border-bottom: 1px solid #F5F0E8;
}
.ai-modal-title {
  font-size: 16px;
  font-weight: 600;
  color: #2C2C2C;
}
.ai-modal-close {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #F5F0E8;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ai-modal-close text {
  font-size: 14px;
  color: #999;
}
.ai-modal-body {
  padding: 16px 18px 20px;
}
.ai-input-wrap {
  display: flex;
  gap: 8px;
}
.ai-input {
  flex: 1;
  height: 40px;
  border: 1px solid #E8E0D5;
  border-radius: 20px;
  padding: 0 16px;
  font-size: 14px;
  color: #2C2C2C;
  background: #FAFAFA;
}
.ai-input-btn {
  height: 40px;
  padding: 0 20px;
  border-radius: 20px;
  background: linear-gradient(135deg, #8B5CF6, #722ED1);
  display: flex;
  align-items: center;
  justify-content: center;
}
.ai-input-btn text {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
}
.ai-result {
  margin-top: 14px;
  padding: 12px 14px;
  background: #F8F4FF;
  border-radius: 10px;
}
.ai-result-text {
  font-size: 13px;
  color: #555;
  line-height: 1.7;
}
.ai-suggestions {
  margin-top: 14px;
}
.ai-suggest-title {
  font-size: 12px;
  color: #999;
  display: block;
  margin-bottom: 8px;
}
.ai-suggest-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.ai-suggest-tag {
  padding: 6px 14px;
  background: #F5F0E8;
  border-radius: 16px;
}
.ai-suggest-tag text {
  font-size: 12px;
  color: #666;
}

/* ==================== Section ==================== */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 18px 16px 0;
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
.section-tag {
  padding: 2px 10px;
  background: rgba(155,89,182,0.08);
  border-radius: 10px;
}
.section-tag-text {
  font-size: 11px;
  color: #9B59B6;
}

/* ==================== 分类 Tab ==================== */
.cat-tab-scroll {
  margin: 10px 16px 0;
  white-space: nowrap;
  padding-bottom: 4px;
}
.cat-tab {
  display: inline-block;
  padding: 6px 16px;
  margin-right: 8px;
  border-radius: 16px;
  font-size: 13px;
  background: #fff;
  color: #666;
  border: 1px solid #E8E0D5;
}
.cat-tab.active {
  background: #C41E3A;
  color: #fff;
  border-color: #C41E3A;
}

/* ==================== 瀑布流 ==================== */
.waterfall-wrap {
  display: flex;
  gap: 10px;
  padding: 12px 16px 0;
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

/* 古籍封面特殊样式 */
.wf-cover-ebook {
  background: linear-gradient(135deg, #D4C4A8, #E8DCC8, #D4C4A8);
  min-height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.ebook-deco-left {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: linear-gradient(to bottom, rgba(139,115,85,0.4), transparent);
}
.ebook-text-wrap {
  padding: 20px;
  text-align: center;
}
.ebook-text-title {
  font-size: 16px;
  font-weight: 700;
  color: #5C4A32;
  font-family: 'Noto Serif SC', serif;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  letter-spacing: 2px;
  line-height: 1.6;
  max-height: 140px;
  overflow: hidden;
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
}
.wf-badge-ebook {
  bottom: 8px;
  left: 8px;
  background: rgba(146,113,90,0.9);
  color: #fff;
}
.wf-badge-hot { top: 6px; right: 6px; background: #C41E3A; color: #fff; }
.wf-badge-new { top: 6px; right: 6px; background: #52C41A; color: #fff; }
.wf-badge-seckill { top: 6px; right: 6px; background: #9B59B6; color: #fff; }
.wf-badge-boom { top: 6px; right: 6px; background: #FF6B35; color: #fff; }
.wf-badge-top1 { top: 6px; left: 6px; background: linear-gradient(135deg, #FFD700, #FFA500); color: #fff; }

.wf-rating {
  position: absolute;
  bottom: 6px;
  right: 6px;
  background: rgba(0,0,0,0.55);
  border-radius: 4px;
  padding: 1px 6px;
  display: flex;
  align-items: center;
  gap: 2px;
}
.wf-rating-star {
  font-size: 10px;
  color: #FFD700;
}
.wf-rating-num {
  font-size: 10px;
  color: #fff;
  font-weight: 500;
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
  margin-bottom: 4px;
}
.wf-price {
  font-size: 16px;
  font-weight: 700;
  color: #C41E3A;
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
  margin-top: 4px;
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
.wf-sales {
  font-size: 11px;
  color: #999;
}
.wf-viewers {
  font-size: 10px;
  color: #bbb;
  flex-shrink: 0;
}
.wf-ebook-author {
  font-size: 11px;
  color: #92715A;
  font-weight: 500;
}
.wf-ebook-stats {
  display: flex;
  gap: 8px;
}
.wf-ebook-stat {
  font-size: 10px;
  color: #999;
}
.wf-agent-users {
  font-size: 10px;
  color: #999;
}
.wf-agent-btn {
  font-size: 10px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #8B5CF6, #722ED1);
  padding: 2px 10px;
  border-radius: 10px;
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
