<template>
  <view class="page">
    <!-- 顶部搜索栏 -->
    <view class="search-header">
      <view class="search-row">
        <text class="nav-back" @click="goBack">←</text>
        <view class="search-input-wrap">
          <text class="search-input-icon">🔍</text>
          <input v-model="filters.keyword" class="search-input" placeholder="搜索内容..." @confirm="performSearch" />
          <text v-if="filters.keyword" class="search-clear" @click="filters.keyword = ''">✕</text>
        </view>
        <text class="search-action" @click="performSearch">搜索</text>
      </view>

      <!-- 筛选按钮行 -->
      <view class="filter-row">
        <view class="filter-group">
          <text class="filter-label">☰ 筛选</text>
          <text class="filter-tag" :class="{ 'filter-active': filters.timeRange !== 'all' }" @click="toggleFilter('time')">
            🕐 {{ timeLabel }}
            <text class="filter-arrow" :class="{ 'arrow-up': activeFilter === 'time' }">▼</text>
          </text>
          <text class="filter-tag" :class="{ 'filter-active': filters.contentType.length > 0 }" @click="toggleFilter('type')">
            📄 类型{{ filters.contentType.length ? `(${filters.contentType.length})` : '' }}
            <text class="filter-arrow" :class="{ 'arrow-up': activeFilter === 'type' }">▼</text>
          </text>
          <text class="filter-tag" :class="{ 'filter-active': filters.category }" @click="toggleFilter('category')">
            {{ filters.category ? categoryLabel : '分类' }}
            <text class="filter-arrow" :class="{ 'arrow-up': activeFilter === 'category' }">▼</text>
          </text>
          <text class="filter-tag" :class="{ 'filter-active': filters.sortBy !== 'relevance' }" @click="toggleFilter('sort')">
            {{ sortLabel }}
            <text class="filter-arrow" :class="{ 'arrow-up': activeFilter === 'sort' }">▼</text>
          </text>
        </view>
      </view>

      <!-- 筛选下拉面板 -->
      <view v-if="activeFilter" class="filter-dropdown" @click.stop>
        <view v-if="activeFilter === 'time'" class="dropdown-options">
          <text v-for="opt in timeRangeOptions" :key="opt.value" class="dropdown-opt" :class="{ 'opt-active': filters.timeRange === opt.value }" @click="selectTime(opt.value)">{{ opt.label }}</text>
        </view>
        <view v-if="activeFilter === 'type'" class="dropdown-grid">
          <text v-for="opt in contentTypeOptions" :key="opt.value" class="dropdown-grid-opt" :class="{ 'grid-opt-active': filters.contentType.includes(opt.value) }" @click="toggleContentType(opt.value)">
            {{ opt.label }}
            <text v-if="filters.contentType.includes(opt.value)" class="check">✓</text>
          </text>
        </view>
        <view v-if="activeFilter === 'category'" class="dropdown-options">
          <text v-for="opt in categoryOptions" :key="opt.value" class="dropdown-opt" :class="{ 'opt-active': filters.category === opt.value }" @click="selectCategory(opt.value)">{{ opt.label }}</text>
        </view>
        <view v-if="activeFilter === 'sort'" class="dropdown-options">
          <text v-for="opt in sortOptions" :key="opt.value" class="dropdown-opt" :class="{ 'opt-active': filters.sortBy === opt.value }" @click="selectSort(opt.value)">{{ opt.label }}</text>
        </view>
      </view>

      <!-- 已选筛选标签 -->
      <view v-if="activeFilters.length > 0" class="active-filters">
        <text class="af-label">已选:</text>
        <text v-for="(af, idx) in activeFilters" :key="idx" class="af-tag">
          {{ af.label }}
          <text class="af-remove" @click="removeFilter(af.key, af.value)">✕</text>
        </text>
        <text class="af-reset" @click="resetFilters">🔄 重置</text>
      </view>
    </view>

    <!-- 结果区 -->
    <view class="results-section">
      <!-- 加载中 -->
      <view v-if="loading" class="skeleton-list">
        <view v-for="i in 3" :key="i" class="skeleton-item">
          <view class="skeleton-img" />
          <view class="skeleton-texts">
            <view class="skeleton-line w-75" />
            <view class="skeleton-line" />
            <view class="skeleton-line w-50" />
          </view>
        </view>
      </view>

      <!-- 结果列表 -->
      <template v-else-if="results.length > 0">
        <view class="result-count">共找到 <text class="count-num">{{ total }}</text> 条结果</view>
        <view class="result-list">
          <view v-for="item in results" :key="item.id" class="result-item" @click="goResult(item)">
            <image v-if="item.cover" :src="item.cover" mode="aspectFill" class="result-cover" />
            <view class="result-body">
              <view class="result-type-tag">
                <text>{{ getTypeLabel(item.type) }}</text>
              </view>
              <text class="result-title">{{ item.title }}</text>
              <text class="result-summary">{{ item.summary }}</text>
              <view v-if="item.author" class="result-author-row">
                <image :src="item.author.avatar" mode="aspectFill" class="result-author-avatar" />
                <text class="result-author-name">{{ item.author.name }}</text>
                <text class="result-date">{{ item.createdAt }}</text>
                <text v-if="item.stats" class="result-stats">{{ item.stats.views }}阅读 · {{ item.stats.likes }}赞</text>
              </view>
            </view>
          </view>
        </view>
      </template>

      <!-- 无结果 -->
      <view v-else-if="filters.keyword" class="empty-state">
        <view class="empty-icon-wrap">
          <text class="empty-icon">🔍</text>
        </view>
        <text class="empty-title">未找到相关结果</text>
        <text class="empty-desc">试试调整筛选条件或更换关键词</text>
      </view>

      <!-- 初始状态 -->
      <view v-else class="empty-state">
        <view class="empty-icon-wrap">
          <text class="empty-icon">☰</text>
        </view>
        <text class="empty-title">输入关键词开始搜索</text>
        <text class="empty-desc">使用筛选条件精确查找内容</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { searchApi } from '../../api'

interface FilterState {
  keyword: string; timeRange: string; contentType: string[]
  author: string; circle: string; category: string; sortBy: string
}
interface SearchResult {
  id: string; type: string; title: string; summary: string
  cover?: string; author?: { name: string; avatar: string }
  createdAt: string; stats?: { views?: number; likes?: number; comments?: number }
}

const defaultFilters: FilterState = { keyword: '', timeRange: 'all', contentType: [], author: '', circle: '', category: '', sortBy: 'relevance' }

const filters = ref<FilterState>({ ...defaultFilters })
const activeFilter = ref<string | null>(null)
const results = ref<SearchResult[]>([])
const loading = ref(false)
const total = ref(0)

const timeRangeOptions = [
  { value: 'all', label: '全部时间' }, { value: 'today', label: '今天' },
  { value: 'week', label: '最近一周' }, { value: 'month', label: '最近一月' },
  { value: 'year', label: '最近一年' },
]
const contentTypeOptions = [
  { value: 'article', label: '文章' }, { value: 'post', label: '动态' },
  { value: 'course', label: '课程' }, { value: 'product', label: '商品' },
  { value: 'user', label: '用户' }, { value: 'video', label: '视频' },
]
const categoryOptions = [
  { value: '', label: '全部分类' }, { value: 'yijing', label: '易经' },
  { value: 'fengshui', label: '风水' }, { value: 'bazi', label: '八字' },
  { value: 'meihua', label: '梅花' }, { value: 'liuyao', label: '六爻' },
  { value: 'qimen', label: '奇门' },
]
const sortOptions = [
  { value: 'relevance', label: '相关度' }, { value: 'latest', label: '最新发布' },
  { value: 'popular', label: '最热门' }, { value: 'comments', label: '评论最多' },
]

const timeLabel = computed(() => timeRangeOptions.find(o => o.value === filters.value.timeRange)?.label || '时间')
const categoryLabel = computed(() => categoryOptions.find(o => o.value === filters.value.category)?.label || '分类')
const sortLabel = computed(() => sortOptions.find(o => o.value === filters.value.sortBy)?.label || '排序')

const activeFilters = computed(() => {
  const af: { key: string; label: string; value: string }[] = []
  if (filters.value.timeRange !== 'all') {
    af.push({ key: 'timeRange', label: timeLabel.value, value: filters.value.timeRange })
  }
  filters.value.contentType.forEach(t => {
    const o = contentTypeOptions.find(c => c.value === t)
    if (o) af.push({ key: 'contentType', label: o.label, value: t })
  })
  if (filters.value.category) af.push({ key: 'category', label: categoryLabel.value, value: filters.value.category })
  if (filters.value.sortBy !== 'relevance') af.push({ key: 'sortBy', label: `排序: ${sortLabel.value}`, value: filters.value.sortBy })
  return af
})

function toggleFilter(key: string) {
  activeFilter.value = activeFilter.value === key ? null : key
}

function selectTime(v: string) { filters.value.timeRange = v; activeFilter.value = null; performSearch() }
function toggleContentType(v: string) {
  const idx = filters.value.contentType.indexOf(v)
  if (idx >= 0) filters.value.contentType.splice(idx, 1)
  else filters.value.contentType.push(v)
  activeFilter.value = null
  performSearch()
}
function selectCategory(v: string) { filters.value.category = v; activeFilter.value = null; performSearch() }
function selectSort(v: string) { filters.value.sortBy = v; activeFilter.value = null; performSearch() }

function removeFilter(key: string, value?: string) {
  if (key === 'contentType') {
    const idx = filters.value.contentType.indexOf(value!)
    if (idx >= 0) filters.value.contentType.splice(idx, 1)
  } else if (key === 'timeRange') filters.value.timeRange = 'all'
  else if (key === 'sortBy') filters.value.sortBy = 'relevance'
  else (filters as any).value[key] = ''
  performSearch()
}

function resetFilters() {
  const kw = filters.value.keyword
  filters.value = { ...defaultFilters, keyword: kw }
  performSearch()
}

async function performSearch() {
  if (!filters.value.keyword.trim()) return
  loading.value = true
  try {
    const extra: Record<string, any> = {}
    if (filters.value.timeRange !== 'all') extra.timeRange = filters.value.timeRange
    if (filters.value.contentType.length > 0) extra.contentType = filters.value.contentType.join(',')
    if (filters.value.category) extra.category = filters.value.category
    if (filters.value.sortBy !== 'relevance') extra.sortBy = filters.value.sortBy

    const res = await searchApi.search(filters.value.keyword, undefined, extra)
    const data: any = res || {}
    const list = data.list || data.records || data.data || (Array.isArray(data) ? data : [])
    results.value = list
    total.value = data.total || data.totalCount || list.length
  } catch {
    results.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function getTypeLabel(type: string): string {
  const map: Record<string, string> = { article: '文章', post: '动态', course: '课程', product: '商品', user: '用户', video: '视频' }
  return map[type] || type
}

function goResult(item: SearchResult) {
  const routes: Record<string, string> = { article: '/pages/article/detail', course: '/pages/course/detail', product: '/pages/mall/product', user: '/pages/user/profile', post: '/pages/circle/post', video: '/pages/video/detail' }
  const base = routes[item.type] || '/pages/article/detail'
  uni.navigateTo({ url: `${base}?id=${item.id}` })
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
.page { background: #FAF8F5; min-height: 100vh; }

/* 搜索头 */
.search-header { position: sticky; top: 0; z-index: 20; background: #fff; border-bottom: 1rpx solid #E8E3DB; }
.search-row { display: flex; align-items: center; gap: 16rpx; padding: 20rpx 24rpx; }
.nav-back { font-size: 36rpx; color: #2C2C2C; padding: 4rpx; }
.search-input-wrap { flex: 1; display: flex; align-items: center; gap: 12rpx; background: #FAF8F5; border-radius: 32rpx; padding: 0 20rpx; }
.search-input-icon { font-size: 28rpx; color: #999; }
.search-input { flex: 1; height: 64rpx; font-size: 26rpx; color: #2C2C2C; background: transparent; }
.search-clear { font-size: 24rpx; color: #999; padding: 4rpx; }
.search-action { font-size: 26rpx; color: #C41E3A; font-weight: 500; }

/* 筛选行 */
.filter-row { padding: 0 24rpx 12rpx; }
.filter-group { display: flex; gap: 12rpx; overflow-x: auto; white-space: nowrap; }
.filter-label { font-size: 24rpx; color: #C41E3A; font-weight: 500; display: flex; align-items: center; gap: 4rpx; }
.filter-tag { display: inline-flex; align-items: center; gap: 6rpx; padding: 8rpx 20rpx; border-radius: 32rpx; font-size: 24rpx; background: #FAF8F5; color: #666; border: 1rpx solid transparent; }
.filter-active { background: rgba(196,30,58,0.1); border-color: #C41E3A; color: #C41E3A; }
.filter-arrow { font-size: 16rpx; transition: transform 0.2s; }
.arrow-up { transform: rotate(180deg); }

/* 筛选下拉 */
.filter-dropdown { padding: 16rpx 24rpx; border-top: 1rpx solid #E8E3DB; background: #FAF8F5; }
.dropdown-options { display: flex; flex-wrap: wrap; gap: 12rpx; }
.dropdown-opt { padding: 12rpx 24rpx; border-radius: 12rpx; font-size: 24rpx; background: #fff; color: #666; border: 1rpx solid #E8E3DB; }
.opt-active { background: #C41E3A; color: #fff; border-color: #C41E3A; }
.dropdown-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12rpx; }
.dropdown-grid-opt { display: flex; align-items: center; justify-content: center; gap: 8rpx; padding: 16rpx; border-radius: 12rpx; font-size: 24rpx; background: #fff; color: #666; border: 1rpx solid #E8E3DB; }
.grid-opt-active { background: #C41E3A; color: #fff; border-color: #C41E3A; }
.check { font-size: 20rpx; }

/* 已选筛选 */
.active-filters { display: flex; align-items: center; flex-wrap: wrap; gap: 8rpx; padding: 8rpx 24rpx 12rpx; }
.af-label { font-size: 22rpx; color: #999; }
.af-tag { display: flex; align-items: center; gap: 4rpx; padding: 4rpx 12rpx; background: rgba(196,30,58,0.1); color: #C41E3A; border-radius: 6rpx; font-size: 22rpx; }
.af-remove { font-size: 18rpx; padding: 2rpx; }
.af-reset { font-size: 22rpx; color: #999; display: flex; align-items: center; gap: 4rpx; }

/* 结果区 */
.results-section { padding: 24rpx; }

/* 骨架 */
.skeleton-list { display: flex; flex-direction: column; gap: 20rpx; }
.skeleton-item { display: flex; gap: 16rpx; padding: 24rpx; background: #fff; border-radius: 16rpx; }
.skeleton-img { width: 160rpx; height: 112rpx; background: #E8E3DB; border-radius: 12rpx; flex-shrink: 0; }
.skeleton-texts { flex: 1; display: flex; flex-direction: column; gap: 12rpx; }
.skeleton-line { height: 24rpx; background: #E8E3DB; border-radius: 6rpx; }
.w-75 { width: 75%; }
.w-50 { width: 50%; }

/* 结果数 */
.result-count { font-size: 24rpx; color: #666; margin-bottom: 20rpx; }
.count-num { color: #C41E3A; font-weight: 500; }

/* 结果列表 */
.result-list { display: flex; flex-direction: column; gap: 16rpx; }
.result-item { display: flex; gap: 16rpx; padding: 24rpx; background: #fff; border-radius: 24rpx; }
.result-cover { width: 192rpx; height: 128rpx; border-radius: 12rpx; flex-shrink: 0; }
.result-body { flex: 1; min-width: 0; }
.result-type-tag { display: inline-block; padding: 4rpx 12rpx; background: rgba(196,30,58,0.1); color: #C41E3A; border-radius: 6rpx; font-size: 20rpx; margin-bottom: 8rpx; }
.result-title { display: block; font-size: 28rpx; font-weight: 500; color: #2C2C2C; margin-bottom: 8rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.result-summary { display: block; font-size: 24rpx; color: #666; margin-bottom: 12rpx; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.result-author-row { display: flex; align-items: center; gap: 12rpx; }
.result-author-avatar { width: 36rpx; height: 36rpx; border-radius: 50%; flex-shrink: 0; }
.result-author-name { font-size: 22rpx; color: #999; }
.result-date { font-size: 22rpx; color: #999; }
.result-stats { font-size: 22rpx; color: #999; margin-left: auto; }

/* 空状态 */
.empty-state { display: flex; flex-direction: column; align-items: center; padding: 160rpx 0; }
.empty-icon-wrap { width: 192rpx; height: 192rpx; border-radius: 50%; background: #E8E3DB; display: flex; align-items: center; justify-content: center; margin-bottom: 24rpx; }
.empty-icon { font-size: 72rpx; color: #999; }
.empty-title { display: block; font-size: 28rpx; color: #666; margin-bottom: 8rpx; }
.empty-desc { display: block; font-size: 24rpx; color: #999; }
</style>
