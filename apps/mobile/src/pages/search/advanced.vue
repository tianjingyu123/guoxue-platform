<template>
  <view class="page">
    <!-- Header -->
    <view class="header">
      <view class="header-inner">
        <text
          class="back-btn"
          @click="goBack"
        >
          ‹
        </text>
        <view class="search-input-wrap">
          <text class="search-icon">
            🔍
          </text>
          <input
            v-model="keyword"
            class="search-input"
            placeholder="搜索内容..."
            @confirm="doSearch"
          >
          <text
            v-if="keyword"
            class="clear-btn"
            @click="keyword = ''"
          >
            ✕
          </text>
        </view>
        <text
          class="search-action"
          @click="doSearch"
        >
          搜索
        </text>
      </view>
    </view>

    <!-- 筛选栏 -->
    <view class="filter-bar">
      <scroll-view
        scroll-x
        class="filter-scroll"
        show-scrollbar="false"
      >
        <view class="filter-tag-row">
          <text class="filter-section-label">
            筛选
          </text>
          <!-- 时间 -->
          <view class="filter-tag-wrap">
            <text
              class="filter-tag"
              :class="{ active: filters.timeRange !== 'all' }"
              @click="toggleFilter('time')"
            >
              🕐 {{ timeLabel }}
              <text
                class="filter-arrow"
                :class="{ open: activeFilter === 'time' }"
              >
                ▼
              </text>
            </text>
          </view>
          <!-- 类型 -->
          <view class="filter-tag-wrap">
            <text
              class="filter-tag"
              :class="{ active: filters.contentType.length > 0 }"
              @click="toggleFilter('type')"
            >
              📄 类型{{ filters.contentType.length ? `(${filters.contentType.length})` : '' }}
              <text
                class="filter-arrow"
                :class="{ open: activeFilter === 'type' }"
              >
                ▼
              </text>
            </text>
          </view>
          <!-- 分类 -->
          <view class="filter-tag-wrap">
            <text
              class="filter-tag"
              :class="{ active: filters.category }"
              @click="toggleFilter('category')"
            >
              {{ filters.category ? categoryLabel : '分类' }}
              <text
                class="filter-arrow"
                :class="{ open: activeFilter === 'category' }"
              >
                ▼
              </text>
            </text>
          </view>
          <!-- 排序 -->
          <view class="filter-tag-wrap">
            <text
              class="filter-tag"
              :class="{ active: filters.sortBy !== 'relevance' }"
              @click="toggleFilter('sort')"
            >
              {{ sortLabel }}
              <text
                class="filter-arrow"
                :class="{ open: activeFilter === 'sort' }"
              >
                ▼
              </text>
            </text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 筛选下拉 -->
    <view
      v-if="activeFilter"
      class="filter-dropdown"
    >
      <!-- 时间 -->
      <view
        v-if="activeFilter === 'time'"
        class="fd-options"
      >
        <text
          v-for="opt in timeOptions"
          :key="opt.value"
          class="fd-option"
          :class="{ active: filters.timeRange === opt.value }"
          @click="selectFilter('timeRange', opt.value)"
        >
          {{ opt.label }}
        </text>
      </view>
      <!-- 类型 -->
      <view
        v-if="activeFilter === 'type'"
        class="fd-grid"
      >
        <text
          v-for="opt in typeOptions"
          :key="opt.value"
          class="fd-grid-item"
          :class="{ active: filters.contentType.includes(opt.value) }"
          @click="toggleContentType(opt.value)"
        >
          {{ opt.icon }} {{ opt.label }}
        </text>
      </view>
      <!-- 分类 -->
      <view
        v-if="activeFilter === 'category'"
        class="fd-options"
      >
        <text
          v-for="opt in categoryOptions"
          :key="opt.value"
          class="fd-option"
          :class="{ active: filters.category === opt.value }"
          @click="selectFilter('category', opt.value)"
        >
          {{ opt.label }}
        </text>
      </view>
      <!-- 排序 -->
      <view
        v-if="activeFilter === 'sort'"
        class="fd-options"
      >
        <text
          v-for="opt in sortOptions"
          :key="opt.value"
          class="fd-option"
          :class="{ active: filters.sortBy === opt.value }"
          @click="selectFilter('sortBy', opt.value)"
        >
          {{ opt.label }}
        </text>
      </view>
    </view>

    <!-- 已选标签 -->
    <view
      v-if="activeFilterTags.length"
      class="active-tags"
    >
      <text class="at-label">
        已选:
      </text>
      <view
        v-for="(tag, idx) in activeFilterTags"
        :key="idx"
        class="at-tag"
      >
        <text>{{ tag.label }}</text>
        <text
          class="at-remove"
          @click="removeFilter(tag)"
        >
          ✕
        </text>
      </view>
      <text
        class="at-reset"
        @click="resetFilters"
      >
        ↺ 重置
      </text>
    </view>

    <!-- 搜索结果 -->
    <view class="results-wrap">
      <view
        v-if="loading"
        class="loading-state"
      >
        <view
          v-for="i in 3"
          :key="i"
          class="skeleton-card"
        />
      </view>

      <view
        v-else-if="results.length"
        class="results-list"
      >
        <view class="result-count">
          共找到 <text class="count-num">
            {{ total }}
          </text> 条结果
        </view>
        <view
          v-for="item in results"
          :key="item.id"
          class="result-card"
          @click="goResult(item)"
        >
          <view
            v-if="item.cover"
            class="rc-thumb"
          >
            <image
              :src="item.cover"
              mode="aspectFill"
              class="rc-thumb-img"
            />
          </view>
          <view class="rc-info">
            <view class="rc-type-tag">
              <text>{{ typeIcon(item.type) }} {{ typeLabel(item.type) }}</text>
            </view>
            <text class="rc-title">
              {{ item.title }}
            </text>
            <text class="rc-summary">
              {{ item.summary }}
            </text>
            <view
              v-if="item.author"
              class="rc-meta"
            >
              <text class="rc-author">
                {{ item.author }}
              </text>
              <text class="rc-date">
                {{ item.createdAt }}
              </text>
            </view>
          </view>
        </view>
      </view>

      <view
        v-else-if="keyword"
        class="empty-result"
      >
        <text class="er-icon">
          🔍
        </text>
        <text class="er-text">
          未找到相关结果
        </text>
        <text class="er-sub">
          试试调整筛选条件或更换关键词
        </text>
      </view>

      <view
        v-else
        class="empty-result"
      >
        <text class="er-icon">
          🔎
        </text>
        <text class="er-text">
          输入关键词开始搜索
        </text>
        <text class="er-sub">
          使用筛选条件精确查找内容
        </text>
      </view>
    </view>

    <!-- 遮罩 -->
    <view
      v-if="activeFilter"
      class="filter-mask"
      @click="activeFilter = null"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { searchApi } from '../../api'

const keyword = ref(''); const loading = ref(false); const results = ref<any[]>([]); const total = ref(0)
const activeFilter = ref<string | null>(null)

const filters = ref({ timeRange: 'all', contentType: [] as string[], category: '', sortBy: 'relevance' })
const timeOptions = [{ value: 'all', label: '全部时间' }, { value: 'today', label: '今天' }, { value: 'week', label: '最近一周' }, { value: 'month', label: '最近一月' }, { value: 'year', label: '最近一年' }]
const typeOptions = [{ value: 'article', label: '文章', icon: '📄' }, { value: 'course', label: '课程', icon: '📖' }, { value: 'post', label: '动态', icon: '👥' }, { value: 'product', label: '商品', icon: '🛍' }, { value: 'user', label: '用户', icon: '👤' }, { value: 'video', label: '视频', icon: '🎬' }]
const categoryOptions = [{ value: '', label: '全部分类' }, { value: 'yijing', label: '易经' }, { value: 'fengshui', label: '风水' }, { value: 'bazi', label: '八字' }, { value: 'meihua', label: '梅花' }, { value: 'liuyao', label: '六爻' }]
const sortOptions = [{ value: 'relevance', label: '相关度' }, { value: 'latest', label: '最新发布' }, { value: 'popular', label: '最热门' }, { value: 'comments', label: '评论最多' }]

const timeLabel = computed(() => timeOptions.find(o => o.value === filters.value.timeRange)?.label || '时间')
const sortLabel = computed(() => sortOptions.find(o => o.value === filters.value.sortBy)?.label || '排序')
const categoryLabel = computed(() => categoryOptions.find(o => o.value === filters.value.category)?.label || '分类')

const activeFilterTags = computed(() => {
  const tags: { key: string; label: string; value: string }[] = []
  if (filters.value.timeRange !== 'all') tags.push({ key: 'timeRange', label: timeLabel.value, value: filters.value.timeRange })
  filters.value.contentType.forEach(t => { const o = typeOptions.find(x => x.value === t); if (o) tags.push({ key: 'contentType', label: o.label, value: t }) })
  if (filters.value.category) tags.push({ key: 'category', label: categoryLabel.value, value: filters.value.category })
  if (filters.value.sortBy !== 'relevance') tags.push({ key: 'sortBy', label: `排序: ${sortLabel.value}`, value: filters.value.sortBy })
  return tags
})

onMounted(() => { keyword.value = (getCurrentPages().pop()?.options || {}).q || '' })

function toggleFilter(f: string) { activeFilter.value = activeFilter.value === f ? null : f }
function selectFilter(key: string, value: string) { (filters.value as any)[key] = value; activeFilter.value = null }
function toggleContentType(type: string) {
  const idx = filters.value.contentType.indexOf(type)
  void (idx >= 0 ? filters.value.contentType.splice(idx, 1) : filters.value.contentType.push(type))
}
function removeFilter(tag: any) {
  if (tag.key === 'timeRange') filters.value.timeRange = 'all'
  else if (tag.key === 'contentType') { const idx = filters.value.contentType.indexOf(tag.value); if (idx >= 0) filters.value.contentType.splice(idx, 1) }
  else if (tag.key === 'category') filters.value.category = ''
  else if (tag.key === 'sortBy') filters.value.sortBy = 'relevance'
}
function resetFilters() { filters.value = { timeRange: 'all', contentType: [], category: '', sortBy: 'relevance' } }

function typeIcon(type: string): string { const m: Record<string, string> = { article: '📄', course: '📖', post: '👥', product: '🛍', user: '👤', video: '🎬' }; return m[type] || '📄' }
function typeLabel(type: string): string { const m: Record<string, string> = { article: '文章', course: '课程', post: '动态', product: '商品', user: '用户', video: '视频' }; return m[type] || type }

async function doSearch() {
  if (!keyword.value.trim()) return
  loading.value = true; activeFilter.value = null
  try {
    const res = await searchApi.advanced({ keyword: keyword.value, ...filters.value }) as any
    const list = Array.isArray(res) ? res : res?.data || res?.list || []
    results.value = list; total.value = list.length
  } catch { results.value = []; total.value = 0 }
  loading.value = false
}

function goResult(item: any) { uni.navigateTo({ url: `/pages/search/result?q=${encodeURIComponent(keyword.value)}` }) }
function goBack() { uni.navigateBack() }
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; }
.header { position: sticky; top: 0; z-index: 20; background: #fff; border-bottom: 1rpx solid #E5E1DB; }
.header-inner { display: flex; align-items: center; gap: 12rpx; padding: 16rpx 24rpx; }
.back-btn { font-size: 36rpx; color: #2C2C2C; font-weight: bold; }
.search-input-wrap { flex: 1; display: flex; align-items: center; background: #F5F0E8; border-radius: 28rpx; padding: 0 16rpx; }
.search-icon { font-size: 24rpx; }
.search-input { flex: 1; padding: 14rpx 8rpx; font-size: 26rpx; background: transparent; }
.clear-btn { font-size: 24rpx; color: #999; padding: 8rpx; }
.search-action { font-size: 26rpx; color: #C41E3A; font-weight: 500; }
.filter-bar { background: #fff; border-bottom: 1rpx solid #E5E1DB; position: sticky; top: 100rpx; z-index: 20; }
.filter-scroll { padding: 12rpx 24rpx; white-space: nowrap; }
.filter-tag-row { display: inline-flex; align-items: center; gap: 8rpx; }
.filter-section-label { font-size: 24rpx; color: #C41E3A; font-weight: 500; margin-right: 8rpx; }
.filter-tag-wrap { display: inline-block; }
.filter-tag { display: inline-flex; align-items: center; gap: 4rpx; padding: 8rpx 16rpx; border-radius: 20rpx; font-size: 22rpx; background: #F5F0E8; color: #666; }
.filter-tag.active { background: #fef0f0; color: #C41E3A; border: 1rpx solid #C41E3A; }
.filter-arrow { font-size: 16rpx; transition: transform 0.2s; }
.filter-arrow.open { transform: rotate(180deg); }
.filter-dropdown { background: #faf8f5; border-bottom: 1rpx solid #E5E1DB; padding: 16rpx 24rpx; position: relative; z-index: 19; }
.fd-options { display: flex; flex-wrap: wrap; gap: 12rpx; }
.fd-option { padding: 10rpx 24rpx; background: #fff; border: 1rpx solid #E5E1DB; border-radius: 12rpx; font-size: 24rpx; color: #666; }
.fd-option.active { background: #C41E3A; color: #fff; border-color: #C41E3A; }
.fd-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12rpx; }
.fd-grid-item { text-align: center; padding: 16rpx; background: #fff; border: 1rpx solid #E5E1DB; border-radius: 12rpx; font-size: 24rpx; color: #666; }
.fd-grid-item.active { background: #C41E3A; color: #fff; border-color: #C41E3A; }
.filter-mask { position: fixed; inset: 0; z-index: 18; background: rgba(0,0,0,0.3); }
.active-tags { display: flex; align-items: center; gap: 8rpx; padding: 8rpx 24rpx; background: #fff; flex-wrap: wrap; border-bottom: 1rpx solid #E5E1DB; }
.at-label { font-size: 20rpx; color: #999; }
.at-tag { display: flex; align-items: center; gap: 4rpx; padding: 4rpx 12rpx; background: #fef0f0; color: #C41E3A; border-radius: 16rpx; font-size: 20rpx; }
.at-remove { font-size: 16rpx; }
.at-reset { font-size: 20rpx; color: #999; }
.results-wrap { padding: 16rpx 24rpx; }
.loading-state { display: flex; flex-direction: column; gap: 12rpx; }
.skeleton-card { height: 160rpx; background: #e8e3db; border-radius: 16rpx; }
.result-count { font-size: 24rpx; color: #666; margin-bottom: 12rpx; }
.count-num { color: #C41E3A; font-weight: 500; }
.result-card { display: flex; gap: 12rpx; background: #fff; border-radius: 16rpx; padding: 16rpx; margin-bottom: 12rpx; }
.rc-thumb { width: 160rpx; height: 100rpx; border-radius: 8rpx; overflow: hidden; flex-shrink: 0; }
.rc-thumb-img { width: 100%; height: 100%; }
.rc-info { flex: 1; min-width: 0; }
.rc-type-tag { font-size: 20rpx; color: #C41E3A; display: inline-block; }
.rc-title { font-size: 26rpx; font-weight: 500; color: #2C2C2C; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rc-summary { font-size: 22rpx; color: #666; display: block; margin-top: 4rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rc-meta { display: flex; gap: 12rpx; margin-top: 6rpx; }
.rc-author, .rc-date { font-size: 20rpx; color: #999; }
.empty-result { display: flex; flex-direction: column; align-items: center; padding: 80rpx 0; }
.er-icon { font-size: 80rpx; margin-bottom: 16rpx; }
.er-text { font-size: 28rpx; color: #666; margin-bottom: 8rpx; }
.er-sub { font-size: 24rpx; color: #999; }
</style>
