<template>
  <view class="page">
    <view class="header">
      <text
        class="back-btn"
        @click="goBack"
      >
        ‹
      </text>
      <text class="header-title">
        我的投稿
      </text>
      <text
        class="header-action"
        @click="goCreate"
      >
        + 投稿
      </text>
    </view>

    <!-- 状态筛选 -->
    <scroll-view
      scroll-x
      class="tabs-scroll"
      show-scrollbar="false"
    >
      <view class="tabs-inner">
        <text
          v-for="t in tabs"
          :key="t.value"
          class="tab"
          :class="{ active: activeTab === t.value }"
          @click="switchTab(t.value)"
        >
          {{ t.label }}
        </text>
      </view>
    </scroll-view>

    <LoadingSkeleton v-if="loading" />
    <view
      v-else-if="list.length"
      class="list"
    >
      <view
        v-for="item in list"
        :key="item.id"
        class="sub-item"
        @click="goDetail(item)"
      >
        <view class="sub-header">
          <view class="sub-title-wrap">
            <text class="sub-title">
              {{ item.title || '无标题' }}
            </text>
            <text class="sub-type-tag">
              {{ typeLabel(item.type) }}
            </text>
          </view>
          <text
            class="sub-status"
            :class="item.status"
          >
            {{ statusLabel(item.status) }}
          </text>
        </view>
        <text
          v-if="item.summary"
          class="sub-summary"
        >
          {{ item.summary }}
        </text>
        <view class="sub-meta">
          <text class="sub-time">
            {{ formatTime(item.createdAt) }}
          </text>
          <text class="sub-views">
            👁 {{ item.viewCount || 0 }}
          </text>
          <text class="sub-likes">
            ❤ {{ item.likeCount || 0 }}
          </text>
        </view>
      </view>

      <view
        v-if="hasMore"
        class="load-more"
        @click="loadMore"
      >
        <text>{{ loadingMore ? '加载中...' : '点击加载更多' }}</text>
      </view>
    </view>
    <EmptyState
      v-else
      text="暂无投稿"
    />

    <!-- 各状态统计 -->
    <view class="stats-bar">
      <view
        v-for="t in tabs"
        :key="t.value"
        class="stat-item"
        @click="switchTab(t.value)"
      >
        <text class="stat-num">
          {{ stats[t.value] || 0 }}
        </text>
        <text class="stat-label">
          {{ t.label }}
        </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { contentApi } from '../../api'

const loading = ref(true)
const loadingMore = ref(false)
const list = ref<any[]>([])
const page = ref(1)
const hasMore = ref(false)
const activeTab = ref('all')

const tabs = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '审核中' },
  { value: 'approved', label: '已通过' },
  { value: 'rejected', label: '未通过' },
  { value: 'draft', label: '草稿' },
]

const stats = ref<Record<string, number>>({ all: 0, pending: 0, approved: 0, rejected: 0, draft: 0 })

onMounted(async () => {
  try {
    const [listRes, statsRes] = await Promise.all([
      (contentApi as any).getMySubmissions?.({ page: 1 }),
      (contentApi as any).getSubmissionStats?.()
    ])
    list.value = Array.isArray(listRes) ? listRes : listRes?.data || listRes?.list || []
    hasMore.value = (listRes?.total || list.value.length) > list.value.length
    stats.value = statsRes || {}
  } catch {} finally { loading.value = false }
})

function switchTab(v: string) { activeTab.value = v; loadData(true) }
async function loadData(reset = false) {
  if (reset) { loading.value = true; page.value = 1 }
  try {
    const res: any = await (contentApi as any).getMySubmissions?.({ page: page.value, status: activeTab.value === 'all' ? undefined : activeTab.value })
    const items = Array.isArray(res) ? res : res?.data || res?.list || []
    if (reset) list.value = items; else list.value.push(...items)
    hasMore.value = items.length >= 10
    page.value++
  } catch {} finally { loading.value = false; loadingMore.value = false }
}
async function loadMore() { loadingMore.value = true; await loadData() }

function statusLabel(s: string) {
  const m: Record<string, string> = { pending: '审核中', approved: '已通过', rejected: '未通过', draft: '草稿' }
  return m[s] || s
}
function typeLabel(s?: string) {
  const m: Record<string, string> = { article: '文章', video: '视频', image: '图文', audio: '音频' }
  return m[s || ''] || '文章'
}
function formatTime(t?: string) {
  if (!t) return ''
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function goDetail(item: any) { uni.navigateTo({ url: `/pages/mine/submissions?id=${item.id}` }) }
function goCreate() { uni.showToast({ title: '创建投稿', icon: 'none' }) }
function goBack() { uni.navigateBack() }
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; padding-bottom: 120rpx; }
.header { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 24rpx; background: #fff; border-bottom: 1rpx solid #E5E1DB; }
.back-btn { font-size: 36rpx; color: #2C2C2C; font-weight: bold; }
.header-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.header-action { font-size: 26rpx; color: #C41E3A; }
.tabs-scroll { background: #fff; padding: 0 24rpx 16rpx; white-space: nowrap; }
.tabs-inner { display: inline-flex; gap: 12rpx; }
.tab { display: inline-block; padding: 8rpx 24rpx; border-radius: 28rpx; font-size: 24rpx; background: #f5f0e8; color: #666; }
.tab.active { background: #C41E3A; color: #fff; }
.list { background: #fff; margin: 16rpx 24rpx; border-radius: 16rpx; overflow: hidden; }
.sub-item { padding: 24rpx; border-bottom: 1rpx solid #f5f5f5; }
.sub-header { display: flex; justify-content: space-between; align-items: flex-start; }
.sub-title-wrap { flex: 1; min-width: 0; display: flex; align-items: center; gap: 8rpx; }
.sub-title { font-size: 28rpx; font-weight: 500; color: #2C2C2C; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sub-type-tag { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 8rpx; background: #f5f0e8; color: #C9A96E; flex-shrink: 0; }
.sub-status { font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 16rpx; background: #FFF3E0; color: #FF9800; flex-shrink: 0; }
.sub-status.approved { background: #E8F5E9; color: #4CAF50; }
.sub-status.rejected { background: #FFF0F0; color: #C41E3A; }
.sub-status.draft { background: #f5f5f5; color: #999; }
.sub-summary { font-size: 24rpx; color: #666; display: block; margin-top: 8rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sub-meta { display: flex; gap: 20rpx; margin-top: 12rpx; font-size: 22rpx; color: #999; }
.sub-time { color: #ccc; }
.load-more { text-align: center; padding: 24rpx; font-size: 26rpx; color: #999; }
.stats-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; display: flex; padding: 16rpx 24rpx; padding-bottom: calc(16rpx + env(safe-area-inset-bottom)); box-shadow: 0 -4rpx 20rpx rgba(0,0,0,0.08); }
.stat-item { flex: 1; text-align: center; }
.stat-num { font-size: 28rpx; font-weight: bold; color: #2C2C2C; display: block; }
.stat-label { font-size: 20rpx; color: #999; display: block; margin-top: 4rpx; }
</style>
