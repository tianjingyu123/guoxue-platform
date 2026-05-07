<template>
  <view class="page">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input-wrap">
        <text class="search-icon">&#128269;</text>
        <input
          v-model="searchKeyword"
          placeholder="搜索诗词标题或作者..."
          class="search-input"
          confirm-type="search"
          @confirm="onSearch"
          @input="onSearchInput"
        />
        <text v-if="searchKeyword" class="search-clear" @click="clearSearch">&#10005;</text>
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
    <view v-if="loading && poems.length === 0">
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
        hover-class="poem-card-hover"
      >
        <view class="poem-card-top">
          <text class="poem-title">{{ item.title }}</text>
          <view class="poem-meta-row">
            <text class="poem-author">{{ item.author || '佚名' }}</text>
            <text v-if="getDynastyLabel(item)" class="poem-dynasty-tag">{{ getDynastyLabel(item) }}</text>
          </view>
        </view>
        <text class="poem-excerpt">{{ item.excerpt || item.content?.slice(0, 60) || '暂无预览' }}</text>
        <view class="poem-card-bottom">
          <view class="poem-tags" v-if="item.tags?.length">
            <text v-for="t in item.tags.slice(0, 3)" :key="t" class="poem-tag">{{ t }}</text>
          </view>
          <view class="poem-stats">
            <text class="stat-item">&#128214; {{ item.viewCount ?? 0 }}</text>
            <text class="stat-item">&#128077; {{ item.likeCount ?? 0 }}</text>
          </view>
        </view>
      </view>

      <!-- 上拉加载更多 -->
      <view v-if="hasMore" class="load-more">
        <text class="load-more-text" @click="loadMore">{{ loadMoreLoading ? '加载中...' : '点击加载更多' }}</text>
      </view>
      <view v-else class="load-more">
        <text class="load-more-text load-end">已展示全部诗词</text>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-else-if="!loading">
      <EmptyState :text="searchKeyword ? '未找到匹配的诗词' : '暂无诗词数据'" icon="&#128218;">
        <view v-if="searchKeyword" class="empty-action">
          <button class="empty-btn" @click="clearSearch">清除搜索</button>
        </view>
      </EmptyState>
    </view>

    <!-- 错误状态 -->
    <view v-if="errorMsg" class="error-section">
      <EmptyState icon="&#9888;" :text="errorMsg">
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

function selectDynasty(key: string) {
  activeDynasty.value = key
  page.value = 1
  hasMore.value = true
  poems.value = []
  fetchPoems()
}

// 搜索输入（带防抖）
function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    onSearch()
  }, 500)
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

// 获取朝代标签
function getDynastyLabel(item: any): string {
  if (item.dynasty) return item.dynasty
  if (item.tags?.length) {
    const dynastyTags = dynasties
      .filter((d) => d.key)
      .map((d) => d.key)
    for (const t of item.tags) {
      if (dynastyTags.includes(t)) return t
    }
  }
  return ''
}

// 获取诗词列表
async function fetchPoems() {
  loading.value = true
  errorMsg.value = ''
  try {
    const params: Record<string, any> = { type: 'POEM', status: 'PUBLISHED', pageSize: pageSize.value, page: page.value }
    if (activeDynasty.value) {
      params.tag = activeDynasty.value
    }
    if (searchKeyword.value.trim()) {
      params.keyword = searchKeyword.value.trim()
    }
    const res = await contentsApi.list(params)
    const items = res.data || res.list || res || []
    if (Array.isArray(items)) {
      if (page.value === 1) {
        poems.value = items
      } else {
        poems.value = poems.value.concat(items)
      }
      hasMore.value = items.length >= pageSize.value
    } else {
      poems.value = []
      hasMore.value = false
    }
  } catch (e: any) {
    errorMsg.value = '加载失败，请检查网络连接'
    poems.value = []
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  if (loadMoreLoading.value || !hasMore.value) return
  loadMoreLoading.value = true
  page.value++
  try {
    const params: Record<string, any> = { type: 'POEM', status: 'PUBLISHED', pageSize: pageSize.value, page: page.value }
    if (activeDynasty.value) params.tag = activeDynasty.value
    if (searchKeyword.value.trim()) params.keyword = searchKeyword.value.trim()
    const res = await contentsApi.list(params)
    const items = res.data || res.list || res || []
    if (Array.isArray(items)) {
      poems.value = poems.value.concat(items)
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

// ========== 页面生命周期 ==========
onMounted(() => {
  fetchPoems()
})

onPullDownRefresh(() => {
  page.value = 1
  hasMore.value = true
  errorMsg.value = ''
  fetchPoems().finally(() => {
    uni.stopPullDownRefresh()
  })
})

onReachBottom(() => {
  loadMore()
})
</script>

<style scoped>
/* ========== 页面整体 ========== */
.page {
  padding: 10px 12px;
  background: #f5f0e6;
  min-height: 100vh;
  padding-bottom: 40px;
}

/* ========== 搜索栏 ========== */
.search-bar {
  margin-bottom: 10px;
}
.search-input-wrap {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 22px;
  padding: 0 14px;
  height: 40px;
  border: 1px solid #ede6d8;
  box-shadow: 0 2px 6px rgba(139, 69, 19, 0.06);
}
.search-icon {
  font-size: 16px;
  margin-right: 8px;
  flex-shrink: 0;
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

/* ========== 筛选栏 ========== */
.filter-section {
  margin-bottom: 12px;
}
.filter-scroll {
  width: 100%;
}
.filter-inner {
  display: inline-flex;
  gap: 8px;
  padding: 2px 0;
}
.filter-tab {
  font-size: 13px;
  padding: 6px 16px;
  background: #fff;
  border-radius: 16px;
  color: #666;
  border: 1px solid #ede6d8;
  transition: all 0.2s;
  flex-shrink: 0;
}
.filter-tab.active {
  background: linear-gradient(135deg, #8b4513, #c4943a);
  color: #fff;
  border-color: #8b4513;
  font-weight: bold;
}

/* ========== 诗词卡片 ========== */
.poem-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.poem-card {
  background: #fff;
  border-radius: 12px;
  padding: 14px 16px;
  box-shadow: 0 2px 8px rgba(139, 69, 19, 0.06);
  transition: transform 0.15s;
}
.poem-card-hover {
  transform: scale(0.98);
  opacity: 0.9;
}
.poem-card-top {
  margin-bottom: 8px;
}
.poem-title {
  font-size: 17px;
  font-weight: bold;
  color: #333;
  display: block;
  line-height: 1.4;
}
.poem-meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}
.poem-author {
  font-size: 13px;
  color: #888;
}
.poem-dynasty-tag {
  font-size: 11px;
  padding: 1px 8px;
  background: #f5ead6;
  color: #8b4513;
  border-radius: 8px;
  border: 1px solid #e8d5b8;
}
.poem-excerpt {
  font-size: 14px;
  color: #888;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  display: block;
  margin-bottom: 8px;
}
.poem-card-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
  border-top: 1px solid #f0ece4;
}
.poem-tags {
  display: flex;
  gap: 4px;
  flex: 1;
  flex-wrap: wrap;
}
.poem-tag {
  font-size: 10px;
  color: #8b4513;
  background: #f5f0e6;
  padding: 1px 8px;
  border-radius: 8px;
}
.poem-stats {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}
.stat-item {
  font-size: 12px;
  color: #bbb;
}

/* ========== 加载更多 ========== */
.load-more {
  text-align: center;
  padding: 16px 0;
}
.load-more-text {
  font-size: 13px;
  color: #8b4513;
}
.load-end {
  color: #ccc;
}

/* ========== 空操作 ========== */
.empty-action {
  margin-top: 12px;
  display: flex;
  justify-content: center;
}
.empty-btn {
  background: #8b4513;
  color: #fff;
  border-radius: 20px;
  padding: 8px 24px;
  font-size: 14px;
  border: none;
}

/* ========== 错误 ========== */
.error-section {
  padding: 20px 0;
}
</style>
