<template>
  <view class="search-page">
    <!-- 顶部搜索栏 -->
    <view class="search-header">
      <view class="search-row">
        <view class="search-box">
          <text class="search-icon">🔍</text>
          <input
            v-model="keyword"
            class="search-input"
            placeholder="搜索圈子、课程、商品..."
            :focus="true"
            confirm-type="search"
            @confirm="doSearch"
            @input="onInput"
          />
          <text v-if="keyword" class="search-clear" @click="clearInput">✕</text>
        </view>
        <text class="search-action" @click="keyword ? doSearch() : uni.navigateBack()">
          {{ keyword ? '搜索' : '取消' }}
        </text>
      </view>

      <!-- 结果Tab -->
      <view v-if="hasResults" class="result-tabs">
        <scroll-view scroll-x :show-scrollbar="false">
          <view class="tabs-row">
            <view
              v-for="tab in resultTabs"
              :key="tab.id"
              class="tab-chip"
              :class="{ active: activeTab === tab.id }"
              @click="activeTab = tab.id"
            >
              <text>{{ tab.icon }} {{ tab.label }}</text>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 搜索中 -->
    <view v-if="searching" class="searching-area">
      <view class="spinner" />
      <text class="searching-text">搜索中...</text>
    </view>

    <!-- 搜索结果 -->
    <view v-else-if="hasResults" class="results-area">
      <!-- 全部Tab -->
      <template v-if="activeTab === 'all'">
        <view v-if="results.circles?.length" class="result-section">
          <view class="result-header">
            <text class="result-title">圈子</text>
            <text class="result-more" @click="activeTab = 'circles'">查看全部 ›</text>
          </view>
          <view v-for="c in results.circles.slice(0, 2)" :key="c.id" class="circle-card" @click="goPage(`/pages/circle/id-home/index?id=${c.id}`)">
            <view class="circle-info">
              <image v-if="c.cover" :src="c.cover" class="circle-cover" mode="aspectFill" />
              <view v-else class="circle-cover-plain">🏠</view>
              <view class="circle-detail">
                <text class="circle-name">{{ c.name }}</text>
                <text class="circle-desc">{{ c.description }}</text>
                <view class="circle-meta">
                  <text>{{ c.memberCount || c.members || 0 }} 成员</text>
                  <text>⭐ {{ c.rating || '4.5' }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <view v-if="results.courses?.length" class="result-section">
          <view class="result-header">
            <text class="result-title">课程</text>
            <text class="result-more" @click="activeTab = 'courses'">查看全部 ›</text>
          </view>
          <view v-for="c in results.courses.slice(0, 2)" :key="c.id" class="item-card" @click="goPage(`/pages/course/id/index?id=${c.id}`)">
            <view class="item-cover-plain">🎓</view>
            <view class="item-info">
              <text class="item-title">{{ c.title }}</text>
              <text class="item-sub">{{ c.instructor || c.teacher }} · {{ c.studentCount || 0 }}人学习</text>
              <view class="item-price-row">
                <text class="item-price">¥{{ c.price }}</text>
                <text v-if="c.originalPrice" class="item-original">¥{{ c.originalPrice }}</text>
              </view>
            </view>
          </view>
        </view>

        <view v-if="results.products?.length" class="result-section">
          <view class="result-header">
            <text class="result-title">商品</text>
            <text class="result-more" @click="activeTab = 'products'">查看全部 ›</text>
          </view>
          <view v-for="p in results.products.slice(0, 2)" :key="p.id" class="item-card" @click="goPage(`/pages/mall/product/id-detail/index?id=${p.id}`)">
            <view class="item-cover-plain">🛍</view>
            <view class="item-info">
              <text class="item-title">{{ p.name || p.title }}</text>
              <view class="item-price-row">
                <text class="item-price">¥{{ p.price }}</text>
                <text v-if="p.originalPrice" class="item-original">¥{{ p.originalPrice }}</text>
              </view>
              <text class="item-sub">已售 {{ p.sales || p.soldCount || 0 }}</text>
            </view>
          </view>
        </view>
      </template>

      <!-- 分Tab结果 -->
      <template v-else>
        <view v-if="currentTabResults.length === 0" class="no-result">
          <text class="no-result-icon">🔍</text>
          <text class="no-result-text">暂无相关{{ activeTabLabel }}</text>
        </view>
        <view v-else>
          <template v-if="activeTab === 'circles'">
            <view v-for="c in currentTabResults" :key="c.id" class="circle-card" @click="goPage(`/pages/circle/id-home/index?id=${c.id}`)">
              <view class="circle-info">
                <image v-if="c.cover" :src="c.cover" class="circle-cover" mode="aspectFill" />
                <view v-else class="circle-cover-plain">🏠</view>
                <view class="circle-detail">
                  <text class="circle-name">{{ c.name }}</text>
                  <text class="circle-desc">{{ c.description }}</text>
                  <view class="circle-meta">
                    <text>{{ c.memberCount || c.members || 0 }} 成员</text>
                    <text>⭐ {{ c.rating || '4.5' }}</text>
                  </view>
                </view>
              </view>
            </view>
          </template>
          <template v-else>
            <view v-for="item in currentTabResults" :key="item.id" class="item-card" @click="goDetail(item)">
              <view class="item-cover-plain">{{ tabIcon }}</view>
              <view class="item-info">
                <text class="item-title">{{ item.title || item.name }}</text>
                <text v-if="item.instructor" class="item-sub">{{ item.instructor }} · {{ item.studentCount || 0 }}人学习</text>
                <view v-if="item.price !== undefined" class="item-price-row">
                  <text class="item-price">¥{{ item.price }}</text>
                  <text v-if="item.originalPrice" class="item-original">¥{{ item.originalPrice }}</text>
                </view>
              </view>
            </view>
          </template>
        </view>
      </template>
    </view>

    <!-- 未搜索时：历史和热门 -->
    <view v-else-if="!keyword" class="search-default">
      <!-- 搜索历史 -->
      <view v-if="searchHistory.length" class="history-section">
        <view class="history-header">
          <text class="section-title">搜索历史</text>
          <text class="history-clear" @click="clearHistory">🗑</text>
        </view>
        <view class="history-tags">
          <text
            v-for="(item, i) in searchHistory"
            :key="i"
            class="history-tag"
            @click="keyword = item; doSearch(item)"
          >{{ item }}</text>
        </view>
      </view>

      <!-- 热门搜索 -->
      <view class="hot-section">
        <text class="section-title">热门搜索</text>
        <view class="hot-list">
          <view
            v-for="(item, i) in hotSearches"
            :key="i"
            class="hot-item"
            @click="keyword = item.keyword; doSearch(item.keyword)"
          >
            <text class="hot-rank" :class="{ top3: i < 3 }">{{ i + 1 }}</text>
            <text class="hot-kw">{{ item.keyword }}</text>
            <text v-if="item.isHot" class="hot-flame">🔥</text>
          </view>
        </view>
      </view>

      <!-- 猜你想搜 -->
      <view class="guess-section">
        <text class="section-title">猜你想搜</text>
        <view class="guess-grid">
          <view
            v-for="g in guessItems"
            :key="g.label"
            class="guess-card"
            @click="keyword = g.label; doSearch(g.label)"
          >
            <text class="guess-icon">{{ g.icon }}</text>
            <view class="guess-info">
              <text class="guess-label">{{ g.label }}</text>
              <text class="guess-desc">{{ g.desc }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 输入联想 -->
    <view v-else-if="!hasResults && suggestions.length" class="suggestions">
      <view v-for="(s, i) in suggestions" :key="i" class="sug-item" @click="keyword = s.keyword; doSearch(s.keyword)">
        <text class="sug-icon">🔍</text>
        <text class="sug-text"><text class="sug-hl">{{ keyword }}</text>{{ s.keyword.slice(keyword.length) }}</text>
        <text class="sug-count">约{{ (s.count / 1000).toFixed(1) }}k条</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { searchApi } from '../../api'

const resultTabs = [
  { id: 'all', label: '全部', icon: '🔍' },
  { id: 'circles', label: '圈子', icon: '👥' },
  { id: 'courses', label: '课程', icon: '📚' },
  { id: 'products', label: '商品', icon: '🛍' },
  { id: 'articles', label: '文章', icon: '📄' },
  { id: 'users', label: '用户', icon: '👤' },
]

const hotSearches = [
  { keyword: '八字入门', isHot: true },
  { keyword: '紫微斗数', isHot: true },
  { keyword: '风水布局', isHot: false },
  { keyword: '奇门遁甲', isHot: true },
  { keyword: '六爻预测', isHot: false },
  { keyword: '梅花易数', isHot: false },
  { keyword: '姓名学', isHot: false },
  { keyword: '面相手相', isHot: false },
]

const guessItems = [
  { icon: '🤖', label: 'AI八字分析', desc: '智能命盘解读' },
  { icon: '📚', label: '入门必读', desc: '新手推荐课程' },
  { icon: '👥', label: '热门圈子', desc: '万人交流社区' },
  { icon: '📖', label: '经典古籍', desc: '传世典藏好书' },
]

interface ResultSet {
  circles?: any[]; courses?: any[]; products?: any[]; articles?: any[]; users?: any[]
}

const keyword = ref('')
const searching = ref(false)
const hasResults = ref(false)
const activeTab = ref('all')
const suggestions = ref<{ keyword: string; count: number }[]>([])
const results = ref<ResultSet>({})

const searchHistory = ref<string[]>([])

const activeTabLabel = computed(() => {
  const tab = resultTabs.find(t => t.id === activeTab.value)
  return tab?.label || ''
})

const tabIcon = computed(() => {
  const tab = resultTabs.find(t => t.id === activeTab.value)
  return tab?.icon || '📦'
})

const currentTabResults = computed(() => {
  const key = activeTab.value as keyof ResultSet
  return results.value[key] || []
})

function loadHistory() {
  try {
    const stored = uni.getStorageSync('search_history')
    searchHistory.value = stored ? JSON.parse(stored) : []
  } catch { searchHistory.value = [] }
}

function saveHistory() {
  uni.setStorageSync('search_history', JSON.stringify(searchHistory.value.slice(0, 10)))
}

function doSearch(kw?: string) {
  const term = kw || keyword.value
  if (!term.trim()) return
  keyword.value = term

  if (!searchHistory.value.includes(term)) {
    searchHistory.value = [term, ...searchHistory.value].slice(0, 10)
    saveHistory()
  }

  searching.value = true
  hasResults.value = true

  searchApi.search({ q: term })
    .then((data: any) => {
      if (data) {
        results.value = {
          circles: data.circles || [],
          courses: data.courses || [],
          products: data.products || [],
          articles: data.articles || data.posts || [],
          users: data.users || [],
        }
      }
    })
    .catch(() => { /* keep mock empty */ })
    .finally(() => { searching.value = false })
}

function onInput() {
  if (hasResults.value) {
    hasResults.value = false
    results.value = {}
  }
  // 简单联想
  if (keyword.value) {
    suggestions.value = [
      { keyword: keyword.value + '入门', count: 12800 },
      { keyword: keyword.value + '教程', count: 8560 },
      { keyword: keyword.value + '书籍', count: 6280 },
    ].filter(s => s.keyword !== keyword.value)
  } else {
    suggestions.value = []
  }
}

function clearInput() {
  keyword.value = ''
  hasResults.value = false
  results.value = {}
  suggestions.value = []
}

function clearHistory() {
  searchHistory.value = []
  uni.removeStorageSync('search_history')
}

function goPage(url: string) {
  uni.navigateTo({ url })
}

function goDetail(item: any) {
  const tab = activeTab.value
  if (tab === 'courses') uni.navigateTo({ url: `/pages/course/id/index?id=${item.id}` })
  else if (tab === 'products') uni.navigateTo({ url: `/pages/mall/product/id-detail/index?id=${item.id}` })
  else if (tab === 'articles') uni.navigateTo({ url: `/pages/article/detail/index?id=${item.id}` })
  else if (tab === 'users') uni.navigateTo({ url: `/pages/user/id/index?id=${item.id}` })
}

onMounted(() => { loadHistory() })
</script>

<style scoped>
.search-page { min-height: 100vh; background: #FAF8F5; }

.search-header {
  position: sticky; top: 0; z-index: 50;
  background: rgba(250,248,245,0.95); backdrop-filter: blur(12rpx);
  border-bottom: 1px solid #E8E0D5;
}
.search-row {
  display: flex; align-items: center; gap: 16rpx;
  padding: 16rpx 24rpx;
}
.search-box {
  flex: 1; display: flex; align-items: center;
  height: 72rpx; background: #F5F1EB; border-radius: 40rpx; padding: 0 20rpx;
}
.search-icon { font-size: 28rpx; margin-right: 12rpx; color: #999; }
.search-input { flex: 1; font-size: 26rpx; color: #2C2C2C; }
.search-input::placeholder { color: #999; }
.search-clear { font-size: 28rpx; color: #999; padding: 4rpx; }
.search-action { font-size: 26rpx; color: #C41E3A; font-weight: 500; white-space: nowrap; }

.result-tabs { padding: 0 0 12rpx; }
.tabs-row { display: flex; gap: 8rpx; padding: 0 24rpx; }
.tab-chip {
  flex-shrink: 0; padding: 8rpx 20rpx; border-radius: 32rpx;
  font-size: 24rpx; color: #666; background: #F5F1EB;
}
.tab-chip.active { background: #C41E3A; color: #fff; }

/* 搜索中 */
.searching-area {
  display: flex; align-items: center; justify-content: center;
  padding: 120rpx 0;
}
.spinner {
  width: 40rpx; height: 40rpx; border: 4rpx solid #EDE5D5;
  border-top-color: #C41E3A; border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.searching-text { font-size: 26rpx; color: #999; margin-left: 16rpx; }

/* 结果区 */
.results-area { padding: 16rpx 24rpx; }

.result-section { margin-bottom: 32rpx; }
.result-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 16rpx;
}
.result-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.result-more { font-size: 24rpx; color: #C41E3A; }

/* 圈子卡片 */
.circle-card {
  background: #fff; border-radius: 16rpx; padding: 20rpx;
  margin-bottom: 16rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
}
.circle-info { display: flex; gap: 16rpx; }
.circle-cover {
  width: 100rpx; height: 100rpx; border-radius: 16rpx; flex-shrink: 0;
}
.circle-cover-plain {
  width: 100rpx; height: 100rpx; border-radius: 16rpx; flex-shrink: 0;
  background: linear-gradient(135deg, #F5F0E8, #EDE5D5);
  display: flex; align-items: center; justify-content: center;
  font-size: 44rpx;
}
.circle-detail { flex: 1; min-width: 0; }
.circle-name { font-size: 28rpx; font-weight: 600; color: #333; display: block; }
.circle-desc { font-size: 22rpx; color: #888; margin-top: 4rpx; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.circle-meta { display: flex; gap: 24rpx; margin-top: 8rpx; font-size: 20rpx; color: #999; }

/* 通用条目卡片 */
.item-card {
  display: flex; gap: 16rpx; padding: 20rpx;
  background: #fff; border-radius: 16rpx; margin-bottom: 12rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
}
.item-cover-plain {
  width: 100rpx; height: 80rpx; border-radius: 12rpx; flex-shrink: 0;
  background: #F5F1EB; display: flex; align-items: center; justify-content: center;
  font-size: 36rpx;
}
.item-info { flex: 1; min-width: 0; }
.item-title { font-size: 26rpx; font-weight: 500; color: #333; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.item-sub { font-size: 20rpx; color: #999; margin-top: 4rpx; display: block; }
.item-price-row { display: flex; align-items: baseline; gap: 8rpx; margin-top: 6rpx; }
.item-price { font-size: 26rpx; font-weight: 700; color: #C41E3A; }
.item-original { font-size: 20rpx; color: #999; text-decoration: line-through; }

.no-result { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; }
.no-result-icon { font-size: 80rpx; margin-bottom: 16rpx; }
.no-result-text { font-size: 28rpx; color: #999; }

/* 历史 & 热门 */
.search-default { padding: 24rpx; }

.history-section { margin-bottom: 32rpx; }
.history-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 16rpx;
}
.history-clear { font-size: 32rpx; padding: 4rpx; }

.section-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; display: block; margin-bottom: 16rpx; }

.history-tags { display: flex; flex-wrap: wrap; gap: 12rpx; }
.history-tag {
  padding: 8rpx 24rpx; border-radius: 32rpx;
  font-size: 24rpx; color: #555; background: #F5F1EB;
}

.hot-section { margin-bottom: 32rpx; }
.hot-list { }
.hot-item {
  display: flex; align-items: center; gap: 16rpx;
  padding: 16rpx 8rpx;
}
.hot-rank {
  width: 40rpx; height: 40rpx; border-radius: 10rpx;
  font-size: 22rpx; font-weight: 700; color: #999;
  background: #F5F1EB; display: flex; align-items: center; justify-content: center;
}
.hot-rank.top3 { background: #C41E3A; color: #fff; }
.hot-kw { flex: 1; font-size: 26rpx; color: #333; }
.hot-flame { font-size: 24rpx; }

.guess-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx; }
.guess-card {
  display: flex; align-items: center; gap: 16rpx;
  padding: 20rpx; border-radius: 16rpx;
  background: #fff; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
}
.guess-icon { font-size: 40rpx; }
.guess-label { font-size: 26rpx; font-weight: 500; color: #333; display: block; }
.guess-desc { font-size: 20rpx; color: #999; margin-top: 2rpx; }

/* 联想 */
.suggestions { padding: 16rpx 24rpx; }
.sug-item {
  display: flex; align-items: center; gap: 16rpx;
  padding: 20rpx 8rpx;
}
.sug-icon { font-size: 28rpx; }
.sug-text { flex: 1; font-size: 26rpx; color: #333; }
.sug-hl { color: #C41E3A; }
.sug-count { font-size: 20rpx; color: #999; }
</style>
