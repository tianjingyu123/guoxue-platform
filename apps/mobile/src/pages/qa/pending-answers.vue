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
        待回答问题
      </text>
      <text
        v-if="list.length"
        class="header-count"
      >
        共 {{ list.length }} 条
      </text>
    </view>

    <!-- 筛选 -->
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
          @click="activeTab = t.value"
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
        v-for="q in filteredList"
        :key="q.id"
        class="q-card"
        @click="goAnswer(q)"
      >
        <view class="q-top">
          <view class="q-user">
            <text class="q-avatar">
              {{ (q.user?.nickname || '?')[0] }}
            </text>
            <text class="q-name">
              {{ q.user?.nickname || '匿名用户' }}
            </text>
          </view>
          <text class="q-category">
            {{ q.category || '未分类' }}
          </text>
        </view>
        <text class="q-title">
          {{ q.title }}
        </text>
        <text class="q-content">
          {{ q.content }}
        </text>
        <view class="q-meta">
          <text
            v-if="q.reward"
            class="q-reward"
          >
            🎁 ¥{{ q.reward }}
          </text>
          <text class="q-answers">
            💬 {{ q.answerCount || 0 }} 个回答
          </text>
          <text class="q-time">
            {{ formatTime(q.createdAt) }}
          </text>
        </view>
        <view
          v-if="q.tags?.length"
          class="q-tags"
        >
          <text
            v-for="tag in q.tags"
            :key="tag"
            class="q-tag"
          >
            {{ tag }}
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
      text="暂无待回答的问题"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { questionApi } from '../../api'

const loading = ref(true)
const loadingMore = ref(false)
const list = ref<any[]>([])
const page = ref(1)
const hasMore = ref(false)
const activeTab = ref('all')

const tabs = [
  { value: 'all', label: '全部' },
  { value: 'unanswered', label: '未回答' },
  { value: 'reward', label: '有悬赏' },
  { value: 'urgent', label: '紧急' },
]

const filteredList = computed(() => {
  if (activeTab.value === 'all') return list.value
  if (activeTab.value === 'unanswered') return list.value.filter(q => !q.answerCount || q.answerCount === 0)
  if (activeTab.value === 'reward') return list.value.filter(q => q.reward > 0)
  if (activeTab.value === 'urgent') return list.value.filter(q => q.isUrgent)
  return list.value
})

onMounted(async () => {
  try {
    const res: any = await questionApi.getPendingAnswers({ page: 1 })
    list.value = Array.isArray(res) ? res : res?.data || res?.list || []
    hasMore.value = list.value.length >= 10
  } catch {} finally { loading.value = false }
})

async function loadMore() {
  loadingMore.value = true; page.value++
  try {
    const res: any = await questionApi.getPendingAnswers({ page: page.value })
    const items = Array.isArray(res) ? res : res?.data || res?.list || []
    list.value.push(...items)
    hasMore.value = items.length >= 10
  } catch {} finally { loadingMore.value = false }
}

function formatTime(t?: string) {
  if (!t) return ''
  const d = new Date(t); const now = new Date(); const diff = now.getTime() - d.getTime()
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

function goAnswer(q: any) { uni.navigateTo({ url: `/pages/qa/question-detail?id=${q.id}` }) }
function goBack() { uni.navigateBack() }
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; }
.header { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 24rpx; background: #fff; border-bottom: 1rpx solid #E5E1DB; }
.back-btn { font-size: 36rpx; color: #2C2C2C; font-weight: bold; }
.header-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.header-count { font-size: 22rpx; color: #999; }
.tabs-scroll { background: #fff; padding: 0 24rpx 16rpx; white-space: nowrap; }
.tabs-inner { display: inline-flex; gap: 12rpx; }
.tab { display: inline-block; padding: 8rpx 24rpx; border-radius: 28rpx; font-size: 24rpx; background: #f5f0e8; color: #666; }
.tab.active { background: #C41E3A; color: #fff; }
.list { padding: 16rpx 24rpx; }
.q-card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.q-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.q-user { display: flex; align-items: center; gap: 8rpx; }
.q-avatar { width: 40rpx; height: 40rpx; border-radius: 50%; background: #f5f0e8; display: flex; align-items: center; justify-content: center; font-size: 20rpx; color: #C9A96E; }
.q-name { font-size: 22rpx; color: #999; }
.q-category { font-size: 20rpx; padding: 2rpx 12rpx; background: #fef0f0; color: #C41E3A; border-radius: 12rpx; }
.q-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; display: block; margin-bottom: 8rpx; }
.q-content { font-size: 26rpx; color: #666; display: block; line-height: 1.6; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.q-meta { display: flex; align-items: center; gap: 16rpx; margin-top: 12rpx; font-size: 22rpx; color: #999; }
.q-reward { color: #C41E3A; font-weight: 500; }
.q-time { color: #ccc; margin-left: auto; }
.q-tags { display: flex; flex-wrap: wrap; gap: 8rpx; margin-top: 12rpx; }
.q-tag { padding: 4rpx 14rpx; background: #f5f0e8; color: #C9A96E; border-radius: 12rpx; font-size: 20rpx; }
.load-more { text-align: center; padding: 24rpx; font-size: 26rpx; color: #999; }
</style>
