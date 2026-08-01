<template>
  <view class="result-page">
    <!-- 顶部：搜索栏 + Tab -->
    <view class="result-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="search-bar-row">
        <view class="back-btn" @click="goBack">
          <app-icon name="chevron-left" :size="44" color="var(--text-main)" />
        </view>
        <view class="search-input-wrap">
          <app-icon name="search" :size="32" color="var(--text-soft)" />
          <input
            class="search-input"
            v-model="searchValue"
            placeholder="搜索课程、圈子、商品..."
            placeholder-class="search-input-ph"
            confirm-type="search"
            @confirm="handleSearch"
          />
          <view v-if="searchValue" class="clear-btn" @click="searchValue = ''">
            <app-icon name="x" :size="28" color="var(--text-soft)" />
          </view>
        </view>
        <view class="search-action" @click="handleSearch">
          <text class="search-action-text">搜索</text>
        </view>
      </view>

      <!-- Tab 横滚 -->
      <scroll-view scroll-x class="tabs-scroll" :show-scrollbar="false">
        <view class="tabs-row">
          <view
            v-for="tab in tabs"
            :key="tab.key"
            class="tab-item"
            :class="{ 'tab-item--active': activeTab === tab.key }"
            @click="activeTab = tab.key"
          >
            <text class="tab-label" :class="{ 'tab-label--active': activeTab === tab.key }">{{ tab.label }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <scroll-view scroll-y class="result-body" :lower-threshold="200" @scrolltolower="loadMoreResults">
      <!-- 加载骨架 -->
      <view v-if="loading" class="skeleton-wrap">
        <view v-for="i in 5" :key="i" class="skeleton-card">
          <view class="sk-line sk-line--title" />
          <view class="sk-line sk-line--full" />
          <view class="sk-line sk-line--two-third" />
        </view>
      </view>

      <!-- 错误态 -->
      <view v-else-if="error" class="error-state">
        <view class="empty-icon">
          <app-icon name="alert-circle" :size="56" color="var(--text-soft)" />
        </view>
        <text class="empty-title">{{ error }}</text>
        <view class="retry-btn" @click="loadResults">
          <text class="retry-btn-text">重试</text>
        </view>
      </view>

      <block v-else>
        <!-- AI 智能总结（仅综合Tab，需登录+后端配置，失败静默隐藏）-->
        <view v-if="activeTab === 'all' && aiSummaryText" class="ai-summary-pad">
          <view class="ai-summary-card">
            <view class="ai-summary-head" @click="aiExpanded = !aiExpanded">
              <view class="ai-summary-head-left">
                <view class="ai-summary-icon">
                  <app-icon name="sparkles" :size="28" color="#ffffff" />
                </view>
                <text class="ai-summary-title">AI智能总结</text>
              </view>
              <app-icon :name="aiExpanded ? 'chevron-up' : 'chevron-down'" :size="32" color="var(--text-soft)" />
            </view>

            <view v-if="aiExpanded" class="ai-summary-body">
              <text class="ai-summary-text">{{ aiSummaryText }}</text>
            </view>
          </view>
        </view>

        <view class="results-pad">
          <!-- 内容结果 -->
          <view v-if="(activeTab === 'all' || activeTab === 'content') && results.contents.length" class="result-group">
            <view v-if="activeTab === 'all'" class="group-head">
              <text class="group-title">相关内容</text>
              <text class="group-more" @click="activeTab = 'content'">查看全部</text>
            </view>
            <view
              v-for="item in results.contents"
              :key="item.id"
              class="content-card"
              @click="navigateTo(item.href)"
            >
              <view class="content-main">
                <view class="content-tags">
                  <text v-if="item.kind === 'video'" class="type-tag type-tag--video">视频</text>
                  <text v-else-if="item.kind === 'article'" class="type-tag type-tag--article">文章</text>
                  <text v-else-if="item.kind === 'post'" class="type-tag type-tag--post">帖子</text>
                  <text v-else-if="item.kind === 'classic'" class="type-tag type-tag--article">古籍</text>
                  <text v-else-if="item.kind === 'poem'" class="type-tag type-tag--post">诗词</text>
                </view>
                <rich-text class="content-title" :nodes="highlight(item.title)" />
                <rich-text v-if="item.summary" class="content-summary" :nodes="highlight(item.summary)" />
                <view class="content-foot">
                  <text v-if="item.author" class="content-author">{{ item.author }}</text>
                  <view class="content-stats">
                    <view class="stat">
                      <app-icon name="eye" :size="22" color="var(--text-soft)" />
                      <text class="stat-num">{{ formatNumber(item.viewCount) }}浏览</text>
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </view>

          <!-- 圈子结果 -->
          <view v-if="(activeTab === 'all' || activeTab === 'circle') && results.circles.length" class="result-group">
            <view v-if="activeTab === 'all'" class="group-head">
              <text class="group-title">相关圈子</text>
              <text class="group-more" @click="activeTab = 'circle'">查看全部</text>
            </view>
            <view
              v-for="circle in results.circles"
              :key="circle.id"
              class="circle-card"
              @click="navigateTo(circle.href)"
            >
              <view class="circle-avatar">
                <image lazy-load v-if="circle.cover" :src="circle.cover" class="circle-avatar-img" mode="aspectFill" />
                <app-icon v-else name="users" :size="48" color="#C41E3A" />
              </view>
              <view class="circle-info">
                <rich-text class="circle-name" :nodes="highlight(circle.name)" />
                <text v-if="circle.description" class="circle-desc">{{ circle.description }}</text>
                <view class="circle-stats">
                  <text class="circle-stat">{{ formatNumber(circle.memberCount) }}成员</text>
                </view>
              </view>
              <view class="join-btn">
                <text class="join-btn-text">查看</text>
              </view>
            </view>
          </view>

          <!-- 课程结果 -->
          <view v-if="(activeTab === 'all' || activeTab === 'course') && results.courses.length" class="result-group">
            <view v-if="activeTab === 'all'" class="group-head">
              <text class="group-title">相关课程</text>
              <text class="group-more" @click="activeTab = 'course'">查看全部</text>
            </view>
            <view :class="activeTab === 'course' ? 'course-grid' : 'course-list'">
              <view
                v-for="course in results.courses"
                :key="course.id"
                :class="activeTab === 'course' ? 'course-card-grid' : 'course-card-row'"
                @click="navigateTo(course.href)"
              >
                <view :class="activeTab === 'course' ? 'course-cover-grid' : 'course-cover-row'">
                  <image lazy-load v-if="course.cover" :src="course.cover" class="row-cover-img" mode="aspectFill" />
                  <view v-else class="cover-fallback"><app-icon name="book-open" :size="56" color="#C41E3A" /></view>
                </view>
                <view :class="activeTab === 'course' ? 'course-meta-grid' : 'course-meta-row'">
                  <rich-text class="course-title" :nodes="highlight(course.title)" />
                  <text v-if="course.intro" class="course-teacher">{{ course.intro }}</text>
                  <view class="course-sub">
                    <text class="course-students">{{ formatNumber(course.studentCount) }}人学习</text>
                  </view>
                  <view class="course-price-row">
                    <text class="course-price">¥{{ formatPrice(course.price) }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>

          <!-- 商品结果 -->
          <view v-if="(activeTab === 'all' || activeTab === 'product') && results.products.length" class="result-group">
            <view v-if="activeTab === 'all'" class="group-head">
              <text class="group-title">相关商品</text>
              <text class="group-more" @click="activeTab = 'product'">查看全部</text>
            </view>
            <view class="product-grid">
              <view
                v-for="product in results.products"
                :key="product.id"
                class="product-card"
                @click="navigateTo(product.href)"
              >
                <view class="product-cover">
                  <image lazy-load v-if="product.cover" :src="product.cover" class="product-cover-img" mode="aspectFill" />
                  <view v-else class="cover-fallback"><app-icon name="shopping-bag" :size="56" color="#C41E3A" /></view>
                </view>
                <view class="product-meta">
                  <rich-text class="product-name" :nodes="highlight(product.title)" />
                  <view class="product-foot">
                    <view class="product-price-wrap">
                      <text class="product-price">¥{{ formatPrice(product.price) }}</text>
                    </view>
                    <text class="product-sales">{{ formatNumber(product.salesCount) }}人付款</text>
                  </view>
                </view>
              </view>
            </view>
          </view>

          <!-- 古籍结果 -->
          <view v-if="(activeTab === 'all' || activeTab === 'classic') && results.classics.length" class="result-group">
            <view v-if="activeTab === 'all'" class="group-head">
              <text class="group-title">相关古籍</text>
              <text class="group-more" @click="activeTab = 'classic'">查看全部</text>
            </view>
            <view class="course-list">
              <view
                v-for="classic in results.classics"
                :key="classic.id"
                class="course-card-row"
                @click="navigateTo(classic.href)"
              >
                <view class="course-cover-row">
                  <image lazy-load v-if="classic.cover" :src="classic.cover" class="row-cover-img" mode="aspectFill" />
                  <app-icon v-else name="book-open" :size="56" color="#C41E3A" />
                </view>
                <view class="course-meta-row">
                  <rich-text class="course-title" :nodes="highlight(classic.title)" />
                  <text v-if="classic.dynasty || classic.author" class="course-teacher">
                    <text v-if="classic.dynasty">{{ classic.dynasty }}</text><text v-if="classic.dynasty && classic.author"> · </text><text v-if="classic.author">{{ classic.author }}</text>
                  </text>
                  <view v-if="classic.category" class="course-sub">
                    <text class="meta-tag">{{ classic.category }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>

          <!-- 用户结果 -->
          <view v-if="(activeTab === 'all' || activeTab === 'user') && results.users.length" class="result-group">
            <view v-if="activeTab === 'all'" class="group-head">
              <text class="group-title">相关用户</text>
              <text class="group-more" @click="activeTab = 'user'">查看全部</text>
            </view>
            <view
              v-for="user in results.users"
              :key="user.id"
              class="user-card"
              @click="navigateTo(user.href)"
            >
              <view class="user-avatar">
                <image lazy-load v-if="user.avatar" :src="user.avatar" class="user-avatar-img" mode="aspectFill" />
                <app-icon v-else name="user" :size="44" color="#C41E3A" />
              </view>
              <view class="user-info">
                <rich-text class="user-name" :nodes="highlight(user.name)" />
              </view>
            </view>
          </view>

          <!-- 空态 -->
          <view v-if="isEmpty" class="empty-state">
            <view class="empty-icon">
              <app-icon name="search" :size="56" color="var(--text-soft)" />
            </view>
            <text class="empty-title">没有找到相关内容</text>
            <text class="empty-desc">换个关键词，或试试下面的热门搜索</text>
            <view class="empty-tags">
              <view
                v-for="kw in emptyHotWords"
                :key="kw"
                class="empty-tag"
                @click="goSearch(kw)"
              >
                <text class="empty-tag-text">{{ kw }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 翻页尾巴（仅分类 Tab）：加载中 / 到底 / 可上滑 -->
        <view v-if="showLoadFoot" class="load-foot">
          <text class="load-foot-text">{{ loadingMore ? '加载中…' : noMore ? '已经到底了' : '上滑加载更多' }}</text>
        </view>
      </block>

      <view class="bottom-gap" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, navigateBack } from '@/utils/router'
import { searchApi, SEARCH_PAGE_SIZE, type SearchResults, type SearchTab } from '@/lib/search-data'
import { formatPrice } from '@/utils/format'

const tabs: { key: SearchTab; label: string }[] = [
  { key: 'all', label: '综合' },
  { key: 'content', label: '内容' },
  { key: 'course', label: '课程' },
  { key: 'product', label: '商品' },
  { key: 'circle', label: '圈子' },
  { key: 'classic', label: '古籍' },
  { key: 'user', label: '用户' },
]

// 来源页面 → 默认Tab 映射（从课程页搜索默认落"课程"Tab）
const fromToTab: Record<string, SearchTab> = {
  course: 'course',
  mall: 'product',
  shop: 'product',
  circle: 'circle',
  classics: 'classic',
}

// ===== UI 状态 =====
const statusBarHeight = ref(0)
const keyword = ref('')
const searchValue = ref('')
const activeTab = ref<SearchTab>('all')
const loading = ref(false)
const error = ref('')
const aiExpanded = ref(true)
const aiSummaryText = ref('')

// 空态热门搜索（真连后端 /search/hot，onLoad 拉取；失败保持空数组不露假词）
const emptyHotWords = ref<string[]>([])

// ===== 真连后端：搜索结果 =====
const results = ref<SearchResults>({
  contents: [], courses: [], products: [], circles: [], classics: [], users: [],
})

// 结果缓存：key = `${关键词}||${tab}`。切 Tab 命中缓存直接复用，不再整页骨架+重拉后端。
const resultCache = new Map<string, SearchResults>()
// AI 总结缓存（仅综合 Tab 用，按关键词缓存）
const aiCache = new Map<string, string>()

// ===== 分页（分类 Tab 上滑加载更多；综合 Tab 各类前 5 混排无分页语义，不翻页）=====
const page = ref(1)
const loadingMore = ref(false)
const noMore = ref(false)
// 分页态缓存：与 resultCache 同 key，切回 Tab 恢复已翻到的页码与到底态
const pageCache = new Map<string, { page: number; noMore: boolean }>()

/** 分类 Tab → results 字段映射（'all' 无映射 → 不参与翻页） */
const tabListKey: Partial<Record<SearchTab, keyof SearchResults>> = {
  content: 'contents',
  course: 'courses',
  product: 'products',
  circle: 'circles',
  classic: 'classics',
  user: 'users',
}

// 翻页尾巴可见性：分类 Tab 且当前列表非空
const showLoadFoot = computed(() => {
  const key = tabListKey[activeTab.value]
  if (!key) return false
  return !loading.value && !error.value && (results.value[key] as unknown[]).length > 0
})

const isEmpty = computed(() => {
  const r = results.value
  return !loading.value && !error.value &&
    !r.contents.length && !r.courses.length && !r.products.length &&
    !r.circles.length && !r.classics.length && !r.users.length
})

// 请求序号守卫：快速切 Tab / 改词时，弱网晚到的旧响应不得覆盖新结果。
// 每次 loadResults 发起（含命中缓存的分支）都自增序号，在途旧请求回来发现序号不匹配即整体丢弃。
let reqSeq = 0

/** 拉取搜索结果（关键词/Tab 变化触发） */
async function loadResults() {
  const seq = ++reqSeq // 快照本次序号：切到缓存 Tab 也要作废在途旧请求
  const kw = keyword.value.trim()
  const tab = activeTab.value // 快照发起时的 Tab，响应处理全部用快照值
  if (!kw) {
    results.value = { contents: [], courses: [], products: [], circles: [], classics: [], users: [] }
    aiSummaryText.value = ''
    loading.value = false
    return
  }
  // 命中缓存：切回已搜过的 Tab，直接复用不重拉（无骨架闪烁），并恢复分页态
  const cacheKey = `${kw}||${tab}`
  const cached = resultCache.get(cacheKey)
  if (cached) {
    results.value = cached
    error.value = ''
    loading.value = false
    const pc = pageCache.get(cacheKey)
    page.value = pc ? pc.page : 1
    noMore.value = pc ? pc.noMore : false
    aiSummaryText.value = tab === 'all' ? (aiCache.get(kw) || '') : ''
    return
  }
  loading.value = true
  error.value = ''
  page.value = 1
  noMore.value = false
  try {
    const res = await searchApi.search(kw, tab)
    if (seq !== reqSeq) return // 晚到的旧响应：期间已发起过新请求（或切了缓存 Tab），整体丢弃
    results.value = res
    resultCache.set(cacheKey, res)
    // 分类 Tab：首页不足一页即到底（search 抛错走 catch，这里的空/短返回可信）
    const listKey = tabListKey[tab]
    if (listKey) {
      noMore.value = (res[listKey] as unknown[]).length < SEARCH_PAGE_SIZE
      pageCache.set(cacheKey, { page: 1, noMore: noMore.value })
    }
    searchApi.saveHistory(kw) // 静默保存历史，不阻塞
    const hasAny = res.contents.length || res.courses.length || res.products.length ||
      res.circles.length || res.classics.length || res.users.length
    if (tab === 'all' && hasAny) {
      loadAiSummary(kw)
    } else {
      aiSummaryText.value = ''
    }
  } catch (e) {
    if (seq !== reqSeq) return // 旧请求失败也不许污染新请求的三态
    error.value = '搜索失败，请重试'
  } finally {
    if (seq === reqSeq) loading.value = false
  }
}

/**
 * 上滑翻页（scroll-view @scrolltolower）：仅分类 Tab。
 * 追加当前 Tab 列表并按 id 去重（FTS 权重排序下翻页可能少量重叠）；
 * 失败 toast 保留现状可重试，不误设 noMore。
 */
async function loadMoreResults() {
  const key = tabListKey[activeTab.value]
  if (!key || loading.value || loadingMore.value || noMore.value || error.value) return
  const kw = keyword.value.trim()
  if (!kw) return
  const cacheKey = `${kw}||${activeTab.value}`
  loadingMore.value = true
  try {
    const next = page.value + 1
    const res = await searchApi.search(kw, activeTab.value, next)
    const incoming = res[key] as Array<{ id: string }>
    const cur = results.value[key] as Array<{ id: string }>
    if (incoming.length) {
      const seen = new Set(cur.map((it) => it.id))
      cur.push(...incoming.filter((it) => !seen.has(it.id)))
      page.value = next
      resultCache.set(cacheKey, results.value) // 追加后的整表回写缓存，切 Tab 回来不丢
    }
    if (incoming.length < SEARCH_PAGE_SIZE) noMore.value = true
    pageCache.set(cacheKey, { page: page.value, noMore: noMore.value })
  } catch {
    uni.showToast({ title: '加载失败，请重试', icon: 'none' })
  } finally {
    loadingMore.value = false
  }
}

/** AI 智能总结（需登录+后端配置，失败静默隐藏卡片）。
 *  kw = 发起时的关键词快照：慢响应回来若用户已换词/离开综合 Tab，只写按快照词的缓存，不覆盖当前展示态 */
async function loadAiSummary(kw: string) {
  const r = results.value
  const items = [
    ...r.contents.slice(0, 4).map((c) => ({ title: c.title, content: c.summary || '' })),
    ...r.courses.slice(0, 3).map((c) => ({ title: c.title, content: c.intro || '' })),
  ]
  if (!items.length) { aiSummaryText.value = ''; return }
  try {
    const text = await searchApi.aiSummary(kw, items)
    aiCache.set(kw, text) // 按快照词写缓存，供切回综合Tab复用
    if (keyword.value.trim() === kw && activeTab.value === 'all') {
      aiSummaryText.value = text
    }
  } catch {
    if (keyword.value.trim() === kw && activeTab.value === 'all') {
      aiSummaryText.value = ''
    }
  }
}

/** 安全解码：外部拼的 URL 可能带裸 "%"（如搜「涨50%」被二次转发），
 *  裸 decodeURIComponent 会抛 URIError 中断整个 onLoad 白屏；失败时原样使用 */
function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

onLoad((opt) => {
  try {
    const sys = uni.getSystemInfoSync()
    statusBarHeight.value = sys.statusBarHeight || 0
  } catch (e) {
    statusBarHeight.value = 0
  }
  const kw = opt && opt.keyword ? safeDecode(opt.keyword) : ''
  const tabOpt = opt && opt.tab ? (opt.tab as SearchTab) : ''
  const from = opt && opt.from ? opt.from : ''
  keyword.value = kw
  searchValue.value = kw
  activeTab.value = (tabOpt && tabs.some((t) => t.key === tabOpt) ? tabOpt : fromToTab[from]) || 'all'
  loadResults()
  loadHotWords()
})

/** 空态热门搜索词（真连 /search/hot，失败静默保持空数组） */
async function loadHotWords() {
  try {
    const hot = await searchApi.getHot(6)
    emptyHotWords.value = hot.map((h) => h.keyword)
  } catch {
    /* 静默：拉不到就不展示热词，不编假词 */
  }
}

// 关键词或Tab变化 → 重新加载
watch([keyword, activeTab], loadResults)

function goBack() {
  navigateBack()
}

function handleSearch() {
  const q = searchValue.value.trim()
  if (q && q !== keyword.value) {
    keyword.value = q
  }
}

function goSearch(q: string) {
  navigateTo(`/search/result?keyword=${encodeURIComponent(q)}`)
}

// 关键词高亮：返回 rich-text nodes（红色高亮命中片段）
function highlight(text: string) {
  const kw = keyword.value
  if (!kw) return [{ name: 'span', attrs: { style: 'color:inherit' }, children: [{ type: 'text', text }] }]
  const parts = text.split(new RegExp(`(${escapeReg(kw)})`, 'gi'))
  return parts
    .filter((p) => p !== '')
    .map((part) => {
      const hit = part.toLowerCase() === kw.toLowerCase()
      return {
        name: 'span',
        attrs: { style: hit ? 'color:#C41E3A;font-weight:500' : 'color:inherit' },
        children: [{ type: 'text', text: part }],
      }
    })
}

function escapeReg(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function formatNumber(num: number) {
  if (num >= 10000) return (num / 10000).toFixed(1) + '万'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return String(num)
}
</script>

<style scoped>
.result-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--background);
}

/* 顶部 */
.result-header {
  background: var(--surface);
  border-bottom: 2rpx solid var(--line);
}
.search-bar-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 24rpx;
}
.back-btn {
  width: 88rpx;
  height: 88rpx;
  margin: 0 -18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.search-input-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12rpx;
  height: 72rpx;
  padding: 0 24rpx;
  background: var(--background);
  border-radius: 36rpx;
}
.search-input {
  flex: 1;
  font-size: 28rpx;
  color: var(--text-main);
}
.search-input-ph {
  color: var(--text-soft);
}
.clear-btn {
  width: 36rpx;
  height: 36rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.search-action {
  flex-shrink: 0;
  padding: 0 4rpx;
}
.search-action-text {
  font-size: 28rpx;
  color: var(--brand);
  font-weight: 500;
  white-space: nowrap;
}

/* Tab 横滚 */
.tabs-scroll {
  white-space: nowrap;
  width: 100%;
}
.tabs-row {
  display: inline-flex;
  padding: 0 8rpx;
}
.tab-item {
  flex-shrink: 0;
  padding: 20rpx 28rpx;
  border-bottom: 4rpx solid transparent;
}
.tab-item--active {
  border-bottom-color: var(--brand);
}
.tab-label {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--text-soft);
  white-space: nowrap;
}
.tab-label--active {
  color: var(--brand);
}

/* 主体 */
.result-body {
  flex: 1;
  overflow: hidden;
}

/* 骨架 */
.skeleton-wrap {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}
.skeleton-card {
  background: var(--surface);
  border-radius: 32rpx;
  padding: 32rpx;
}
.sk-line {
  height: 28rpx;
  background: var(--line);
  border-radius: 8rpx;
  margin-bottom: 20rpx;
}
.sk-line--title { width: 75%; height: 32rpx; }
.sk-line--full { width: 100%; }
.sk-line--two-third { width: 66%; margin-bottom: 0; }

/* AI 总结 */
.ai-summary-pad {
  padding: 32rpx;
}
.ai-summary-card {
  background: linear-gradient(135deg, rgba(196, 30, 58, 0.05), rgba(201, 169, 110, 0.1));
  border-radius: 32rpx;
  overflow: hidden;
}
.ai-summary-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
}
.ai-summary-head-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.ai-summary-icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 28rpx;
  background: linear-gradient(135deg, var(--brand), #C9A96E);
  display: flex;
  align-items: center;
  justify-content: center;
}
.ai-summary-title {
  font-size: 30rpx;
  font-weight: 500;
  color: var(--text-main);
}
.ai-summary-body {
  padding: 0 32rpx 32rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.ai-summary-text {
  font-size: 28rpx;
  color: var(--text-soft);
  line-height: 1.6;
}
.ai-block {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.ai-block-label {
  font-size: 24rpx;
  color: var(--text-soft);
}
.ai-points {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.ai-point-chip {
  padding: 8rpx 24rpx;
  background: var(--surface);
  border-radius: 32rpx;
}
.ai-point-text {
  font-size: 24rpx;
  color: var(--text-soft);
}
.ai-questions {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.ai-question {
  font-size: 28rpx;
  color: var(--brand);
}

/* 结果区 */
.results-pad {
  padding: 0 32rpx;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}
.result-group {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.group-title {
  font-size: 30rpx;
  font-weight: 500;
  color: var(--text-main);
}
.group-more {
  font-size: 24rpx;
  color: var(--brand);
}

/* 内容卡片 */
.content-card {
  background: var(--surface);
  border-radius: 32rpx;
  padding: 32rpx;
}
.content-tags {
  display: flex;
  gap: 12rpx;
  margin-bottom: 8rpx;
}
.type-tag {
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
}
.type-tag--video { background: rgba(196, 30, 58, 0.1); color: var(--brand); }
.type-tag--article { background: #dbeafe; color: #2563eb; }
.type-tag--post { background: #dcfce7; color: #16a34a; }
.content-title {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--text-main);
  display: block;
}
.content-summary {
  font-size: 24rpx;
  color: var(--text-soft);
  line-height: 1.5;
  margin-top: 8rpx;
  display: block;
}
.content-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16rpx;
}
.content-author {
  font-size: 24rpx;
  color: var(--text-soft);
}
.content-stats {
  display: flex;
  gap: 24rpx;
}
.stat {
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.stat-num {
  font-size: 24rpx;
  color: var(--text-soft);
}

/* 圈子卡片 */
.circle-card {
  background: var(--surface);
  border-radius: 32rpx;
  padding: 32rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.circle-avatar {
  width: 112rpx;
  height: 112rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, rgba(196, 30, 58, 0.2), rgba(201, 169, 110, 0.2));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.circle-info {
  flex: 1;
  min-width: 0;
}
.circle-name {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--text-main);
  display: block;
}
.circle-desc {
  font-size: 24rpx;
  color: var(--text-soft);
  margin-top: 4rpx;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.circle-stats {
  display: flex;
  gap: 24rpx;
  margin-top: 8rpx;
}
.circle-stat {
  font-size: 24rpx;
  color: var(--text-soft);
}
.join-btn {
  padding: 12rpx 32rpx;
  background: var(--brand);
  border-radius: 32rpx;
  flex-shrink: 0;
}
.join-btn-text {
  font-size: 24rpx;
  color: #ffffff;
}

/* 课程列表/网格 */
.course-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.course-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24rpx;
}
.course-card-row {
  background: var(--surface);
  border-radius: 32rpx;
  padding: 32rpx;
  display: flex;
  gap: 24rpx;
}
.course-card-grid {
  background: var(--surface);
  border-radius: 32rpx;
  overflow: hidden;
}
.course-cover-row {
  width: 192rpx;
  height: 128rpx;
  border-radius: 16rpx;
  background: linear-gradient(135deg, rgba(196, 30, 58, 0.2), rgba(201, 169, 110, 0.2));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative; /* cover-fallback 绝对定位锚点 */
}
.course-cover-grid {
  /* X5 内核不支持 aspect-ratio：4:3 用 padding-top 75% 撑比例，子元素绝对铺满 */
  width: 100%;
  height: 0;
  padding-top: 75%;
  position: relative;
  background: linear-gradient(135deg, rgba(196, 30, 58, 0.2), rgba(201, 169, 110, 0.2));
}
.course-cover-grid .row-cover-img {
  position: absolute;
  top: 0;
  left: 0;
}
.course-meta-row {
  flex: 1;
  min-width: 0;
}
.course-meta-grid {
  padding: 24rpx;
}
.course-title {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--text-main);
  display: block;
}
.course-teacher {
  font-size: 24rpx;
  color: var(--text-soft);
  margin-top: 8rpx;
}
.course-sub {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 8rpx;
}
.course-rating {
  display: flex;
  align-items: center;
  gap: 4rpx;
}
.course-rating-num {
  font-size: 24rpx;
  color: #C9A96E;
}
.course-students {
  font-size: 24rpx;
  color: var(--text-soft);
}
.course-price-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 16rpx;
}
.course-price {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--brand);
}
.course-original {
  font-size: 24rpx;
  color: var(--text-soft);
  text-decoration: line-through;
}

/* 商品网格 */
.product-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24rpx;
}
.product-card {
  background: var(--surface);
  border-radius: 32rpx;
  overflow: hidden;
}
.product-cover {
  /* X5 内核不支持 aspect-ratio：1:1 用 padding-top 100% 撑比例，子元素绝对铺满 */
  width: 100%;
  height: 0;
  padding-top: 100%;
  position: relative;
  background: linear-gradient(135deg, rgba(196, 30, 58, 0.1), rgba(201, 169, 110, 0.1));
}
.product-cover .product-cover-img {
  position: absolute;
  top: 0;
  left: 0;
}
.product-meta {
  padding: 24rpx;
}
.product-name {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--text-main);
  display: block;
}
.product-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16rpx;
}
.product-price-wrap {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.product-price {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--brand);
}
.product-original {
  font-size: 22rpx;
  color: var(--text-soft);
  text-decoration: line-through;
}
.product-sales {
  font-size: 22rpx;
  color: var(--text-soft);
}

/* 用户卡片 */
.user-card {
  background: var(--surface);
  border-radius: 32rpx;
  padding: 32rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.user-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 48rpx;
  background: linear-gradient(135deg, rgba(196, 30, 58, 0.2), rgba(201, 169, 110, 0.2));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.user-info {
  flex: 1;
  min-width: 0;
}
.user-name {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--text-main);
  display: block;
}
.user-bio {
  font-size: 24rpx;
  color: var(--text-soft);
  margin-top: 4rpx;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.user-stat {
  display: flex;
  align-items: center;
  gap: 6rpx;
  margin-top: 8rpx;
}
.user-fans {
  font-size: 24rpx;
  color: var(--text-soft);
}
.follow-btn {
  padding: 12rpx 32rpx;
  background: var(--brand);
  border-radius: 32rpx;
  flex-shrink: 0;
}
.follow-btn--done {
  background: var(--background);
}
.follow-btn-text {
  font-size: 24rpx;
  color: #ffffff;
}
.follow-btn-text--done {
  color: var(--text-soft);
}

/* 空态 */
.empty-state {
  padding: 96rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.empty-icon {
  width: 160rpx;
  height: 160rpx;
  border-radius: 80rpx;
  background: var(--background);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
}
.empty-title {
  font-size: 30rpx;
  font-weight: 500;
  color: var(--text-main);
}
.empty-desc {
  font-size: 26rpx;
  color: var(--text-soft);
  margin-top: 8rpx;
}
.empty-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 16rpx;
  margin-top: 48rpx;
}
.empty-tag {
  padding: 12rpx 24rpx;
  background: var(--background);
  border-radius: 32rpx;
}
.empty-tag-text {
  font-size: 26rpx;
  color: var(--text-main);
  white-space: nowrap;
}

/* 封面图（覆盖各占位容器，圆角继承父级裁剪） */
.circle-avatar-img,
.user-avatar-img,
.row-cover-img,
.product-cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.circle-avatar,
.course-cover-row,
.course-cover-grid,
.product-cover,
.user-avatar {
  overflow: hidden;
}

/* 无封面占位图标：绝对铺满父容器并居中（父容器已 position:relative） */
.cover-fallback {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 翻页尾巴 */
.load-foot {
  display: flex;
  justify-content: center;
  padding: 24rpx 0 8rpx;
}
.load-foot-text {
  font-size: 24rpx;
  color: var(--text-soft);
}

/* 古籍/电子书 分类标签 */
.meta-tag {
  font-size: 22rpx;
  color: var(--text-soft);
  padding: 2rpx 16rpx;
  background: var(--background);
  border-radius: 8rpx;
}

/* 错误态 */
.error-state {
  padding: 128rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.retry-btn {
  margin-top: 40rpx;
  padding: 16rpx 56rpx;
  background: var(--brand);
  border-radius: 40rpx;
}
.retry-btn-text {
  font-size: 28rpx;
  color: #ffffff;
}

.bottom-gap {
  height: 120rpx;
}
</style>
