<template>
  <view class="page">
    <!-- 页面标题 -->
    <view class="page-header">
      <text class="page-title">诗词赏析</text>
      <text class="page-subtitle">唐诗宋词 · 千年风雅</text>
    </view>

    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input-wrap">
        <text class="search-icon">🔍</text>
        <input
          v-model="searchKeyword"
          placeholder="搜索诗词标题或作者..."
          class="search-input"
          confirm-type="search"
          @confirm="onSearch"
          @input="onSearchInput"
        />
        <text v-if="searchKeyword" class="search-clear" @click="clearSearch">✕</text>
      </view>
    </view>

    <!-- 朝代分类标签 -->
    <view class="filter-section">
      <scroll-view scroll-x class="filter-scroll" show-scrollbar="false">
        <view class="filter-inner">
          <text
            v-for="d in dynasties"
            :key="d.key"
            :class="['filter-tab', { active: activeDynasty === d.key }]"
            @click="selectDynasty(d.key)"
          >
            {{ d.label }}
          </text>
        </view>
      </scroll-view>
    </view>

    <!-- 加载骨架屏 -->
    <view v-if="loading && poems.length === 0" class="poem-list">
      <LoadingSkeleton type="card" />
      <LoadingSkeleton type="card" />
      <LoadingSkeleton type="card" />
    </view>

    <!-- 诗词列表 -->
    <view v-else-if="poems.length > 0" class="poem-list">
      <view
        v-for="item in poems"
        :key="item.id"
        class="poem-card"
        @click="goDetail(item)"
      >
        <!-- 竖线装饰 -->
        <view class="poem-decor" />

        <view class="poem-main">
          <!-- 标题行 -->
          <view class="poem-top">
            <text class="poem-title">{{ item.title }}</text>
            <text class="poem-dynasty">{{ getDynastyLabel(item) }}</text>
          </view>

          <!-- 作者 -->
          <text class="poem-author">— {{ item.author || '佚名' }}</text>

          <!-- 诗句预览 -->
          <text class="poem-text">{{ item.excerpt || item.content?.slice(0, 80) || '暂无预览' }}</text>

          <!-- 底部信息 -->
          <view class="poem-bottom">
            <view v-if="item.tags?.length" class="poem-tags">
              <text v-for="t in item.tags.slice(0, 3)" :key="t" class="poem-tag">{{ t }}</text>
            </view>
            <view class="poem-stats">
              <text class="poem-stat">👁 {{ formatNum(item.viewCount ?? 0) }}</text>
              <text class="poem-stat">♥ {{ formatNum(item.likeCount ?? 0) }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 加载更多 -->
      <view v-if="hasMore" class="load-more" @click="loadMore">
        <text class="load-more-text">{{ loadMoreLoading ? '加载中...' : '— 查看更多 —' }}</text>
      </view>
      <view v-else-if="poems.length > 0" class="load-more">
        <text class="load-end">— 已展示全部 —</text>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-else-if="!loading">
      <EmptyState
        :text="searchKeyword ? '未找到匹配的诗词' : '暂无诗词数据'"
        icon="📜"
      >
        <view v-if="searchKeyword" class="empty-action">
          <button class="empty-btn" @click="clearSearch">清除搜索</button>
        </view>
        <view v-else class="empty-action">
          <button class="empty-btn" @click="refreshData">重新加载</button>
        </view>
      </EmptyState>
    </view>

    <!-- 错误状态 -->
    <view v-if="errorMsg" class="error-section">
      <EmptyState icon="⚠️" :text="errorMsg">
        <button class="empty-btn" @click="refreshData">重新加载</button>
      </EmptyState>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import { contentsApi } from '../../api'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'

// ========== 朝代筛选 ==========
interface DynastyItem {
  key: string
  label: string
}
const dynasties: DynastyItem[] = [
  { key: '', label: '全部' },
  { key: '先秦', label: '先秦' },
  { key: '两汉', label: '两汉' },
  { key: '唐', label: '唐' },
  { key: '宋', label: '宋' },
  { key: '元', label: '元' },
  { key: '明', label: '明' },
  { key: '清', label: '清' },
]

const activeDynasty = ref('')
const searchKeyword = ref('')
const poems = ref<any[]>([])
const loading = ref(false)
const loadMoreLoading = ref(false)
const errorMsg = ref('')
const page = ref(1)
const pageSize = ref(20)
const hasMore = ref(true)
let searchTimer: ReturnType<typeof setTimeout> | null = null

function formatNum(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + 'w'
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(n)
}

function selectDynasty(key: string) {
  activeDynasty.value = key
  page.value = 1
  hasMore.value = true
  poems.value = []
  fetchPoems()
}

function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    onSearch()
  }, 400)
}

function onSearch() {
  page.value = 1
  hasMore.value = true
  poems.value = []
  fetchPoems()
}

function clearSearch() {
  searchKeyword.value = ''
  page.value = 1
  hasMore.value = true
  poems.value = []
  fetchPoems()
}

function getDynastyLabel(item: any): string {
  if (item.dynasty) return item.dynasty
  if (item.tags?.length) {
    const dynastyTags = dynasties.filter((d) => d.key).map((d) => d.key)
    for (const t of item.tags) {
      if (dynastyTags.includes(t)) return t
    }
  }
  return ''
}

async function fetchPoems() {
  loading.value = true
  errorMsg.value = ''
  try {
    const params: Record<string, any> = {
      type: 'POEM',
      status: 'PUBLISHED',
      pageSize: pageSize.value,
      page: page.value,
    }
    if (activeDynasty.value) params.tag = activeDynasty.value
    if (searchKeyword.value.trim()) params.keyword = searchKeyword.value.trim()

    const res = await contentsApi.list(params)
    const items = res.data || res.list || res || []
    if (Array.isArray(items)) {
      poems.value = page.value === 1 ? items : [...poems.value, ...items]
      hasMore.value = items.length >= pageSize.value
    } else {
      if (page.value === 1) poems.value = []
      hasMore.value = false
    }
  } catch (e: any) {
    errorMsg.value = '加载失败，请检查网络连接'
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  if (loadMoreLoading.value || !hasMore.value) return
  loadMoreLoading.value = true
  page.value++
  try {
    const params: Record<string, any> = {
      type: 'POEM',
      status: 'PUBLISHED',
      pageSize: pageSize.value,
      page: page.value,
    }
    if (activeDynasty.value) params.tag = activeDynasty.value
    if (searchKeyword.value.trim()) params.keyword = searchKeyword.value.trim()
    const res = await contentsApi.list(params)
    const items = res.data || res.list || res || []
    if (Array.isArray(items)) {
      poems.value = [...poems.value, ...items]
      hasMore.value = items.length >= pageSize.value
    } else {
      hasMore.value = false
    }
  } catch {
    page.value--
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loadMoreLoading.value = false
  }
}

function refreshData() {
  page.value = 1
  hasMore.value = true
  poems.value = []
  errorMsg.value = ''
  fetchPoems()
}

function goDetail(item: any) {
  uni.navigateTo({
    url: `/pages/detail/detail?id=${item.id}&type=CONTENT`,
  })
}

onMounted(() => {
  fetchPoems()
})

onPullDownRefresh(() => {
  page.value = 1
  hasMore.value = true
  errorMsg.value = ''
  fetchPoems().finally(() => uni.stopPullDownRefresh())
})

onReachBottom(() => {
  loadMore()
})
</script>

<style>
.page {
  padding: 0;
  background: #F5F0E8;
  min-height: 100vh;
  padding-bottom: 40px;
}

/* ===== 页头 ===== */
.page-header {
  text-align: center;
  padding: 20px 0 10px;
}
.page-title {
  font-size: 24px;
  font-weight: bold;
  color: #C41E3A;
  display: block;
  font-family: 'Noto Serif SC', serif;
  letter-spacing: 4px;
}
.page-subtitle {
  font-size: 13px;
  color: #C9A96E;
  margin-top: 6px;
  display: block;
  letter-spacing: 2px;
}

/* ===== 搜索栏 ===== */
.search-bar {
  padding: 0 12px;
  margin-bottom: 10px;
}
.search-input-wrap {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 22px;
  padding: 0 14px;
  height: 42px;
  border: 1px solid #E8E0D5;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}
.search-icon {
  font-size: 15px;
  margin-right: 8px;
  flex-shrink: 0;
  opacity: 0.6;
}
.search-input {
  flex: 1;
  font-size: 14px;
  color: #333;
  height: 36px;
}
.search-clear {
  font-size: 14px;
  color: #bbb;
  padding: 4px 6px;
  flex-shrink: 0;
}

/* ===== 朝代筛选 ===== */
.filter-section {
  padding: 0 0 12px;
}
.filter-scroll {
  width: 100%;
}
.filter-inner {
  display: inline-flex;
  gap: 8px;
  padding: 2px 12px;
}
.filter-tab {
  font-size: 13px;
  padding: 6px 16px;
  background: #fff;
  border-radius: 16px;
  color: #888;
  border: 1px solid #E8E0D5;
  transition: all 0.2s;
  flex-shrink: 0;
}
.filter-tab.active {
  background: linear-gradient(135deg, #C41E3A, #8B0000);
  color: #fff;
  border-color: #C41E3A;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(196, 30, 58, 0.2);
}

/* ===== 诗词列表 ===== */
.poem-list {
  padding: 0 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* ===== 诗词卡片 ===== */
.poem-card {
  display: flex;
  gap: 0;
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  transition: transform 0.15s;
}
.poem-card:active {
  transform: scale(0.985);
}

/* 左侧竖线装饰 */
.poem-decor {
  width: 4px;
  flex-shrink: 0;
  background: linear-gradient(180deg, #C41E3A, #C9A96E);
  border-radius: 2px;
  margin: 14px 0 14px 12px;
}

.poem-main {
  flex: 1;
  padding: 14px 14px 14px 12px;
  min-width: 0;
}

/* 标题行 */
.poem-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}
.poem-title {
  font-size: 18px;
  font-weight: bold;
  color: #2C2C2C;
  font-family: 'Noto Serif SC', serif;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.poem-dynasty {
  font-size: 11px;
  color: #C9A96E;
  background: rgba(201, 169, 110, 0.08);
  padding: 1px 10px;
  border-radius: 8px;
  flex-shrink: 0;
  font-weight: 500;
}

/* 作者 */
.poem-author {
  font-size: 13px;
  color: #888;
  display: block;
  margin-bottom: 8px;
}

/* 诗句预览 */
.poem-text {
  font-size: 15px;
  color: #555;
  line-height: 1.9;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-family: 'Noto Serif SC', 'STSong', serif;
  margin-bottom: 8px;
}

/* 底部 */
.poem-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.poem-tags {
  display: flex;
  gap: 4px;
  flex: 1;
  flex-wrap: wrap;
}
.poem-tag {
  font-size: 10px;
  color: #C41E3A;
  background: #F5F0E8;
  padding: 1px 8px;
  border-radius: 8px;
}
.poem-stats {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}
.poem-stat {
  font-size: 11px;
  color: #bbb;
}

/* ===== 加载更多 ===== */
.load-more {
  text-align: center;
  padding: 16px 0;
}
.load-more-text {
  font-size: 13px;
  color: #C9A96E;
}
.load-end {
  font-size: 12px;
  color: #ccc;
}

/* ===== 空操作 ===== */
.empty-action {
  margin-top: 12px;
  display: flex;
  justify-content: center;
}
.empty-btn {
  background: #C41E3A;
  color: #fff;
  border-radius: 20px;
  padding: 8px 24px;
  font-size: 14px;
  border: none;
}

/* ===== 错误 ===== */
.error-section {
  padding: 20px 0;
}
</style>
