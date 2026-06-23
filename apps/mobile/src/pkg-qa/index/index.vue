<template>
  <view class="qa-page">
    <!-- Header -->
    <view class="qa-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="qa-header-bar">
        <view class="qa-back" @tap="onBack">
          <app-icon name="chevron-left" :size="48" color="#2c2c2c" />
        </view>
        <text class="qa-title">付费问答</text>
        <view class="qa-ask-btn" @tap="goAsk">
          <app-icon name="plus" :size="28" color="#ffffff" />
          <text class="qa-ask-text">提问</text>
        </view>
      </view>
      <!-- Tabs -->
      <view class="qa-tabs">
        <view
          v-for="tab in tabs"
          :key="tab.key"
          class="qa-tab"
          :class="{ 'qa-tab-active': activeTab === tab.key }"
          @tap="activeTab = tab.key"
        >
          <text class="qa-tab-text" :class="{ 'qa-tab-text-active': activeTab === tab.key }">{{ tab.label }}</text>
          <view v-if="activeTab === tab.key" class="qa-tab-line" />
        </view>
      </view>
    </view>

    <!-- List -->
    <view class="qa-list">
      <!-- Skeleton -->
      <template v-if="loading">
        <view v-for="i in 3" :key="i" class="qa-card qa-skeleton">
          <view class="qa-sk-row">
            <view class="qa-sk-avatar" />
            <view class="qa-sk-col">
              <view class="qa-sk-line qa-sk-w24" />
              <view class="qa-sk-line qa-sk-w16" />
            </view>
          </view>
          <view class="qa-sk-line qa-sk-w75" />
          <view class="qa-sk-line qa-sk-full" />
        </view>
      </template>

      <!-- Empty -->
      <view v-else-if="filteredQuestions.length === 0" class="qa-empty">
        <app-icon name="message-circle" :size="128" color="#d1d5db" />
        <text class="qa-empty-text">暂无问答内容</text>
        <view class="qa-empty-btn" @tap="goAsk">
          <text class="qa-empty-btn-text">发起提问</text>
        </view>
      </view>

      <!-- Cards -->
      <template v-else>
        <view
          v-for="q in filteredQuestions"
          :key="q.id"
          class="qa-card"
          @tap="goDetail(q.id)"
        >
          <!-- Asker -->
          <view class="qa-card-head">
            <view class="qa-asker">
              <view class="qa-avatar qa-avatar-red">
                <text class="qa-avatar-text">{{ q.asker.name[0] }}</text>
              </view>
              <view>
                <text class="qa-asker-name">{{ q.asker.name }}</text>
                <text class="qa-asker-time">{{ formatTime(q.createdAt) }}</text>
              </view>
            </view>
            <view class="qa-status" :class="'qa-status-' + q.status">
              <text class="qa-status-text" :class="'qa-status-text-' + q.status">{{ statusLabel(q.status) }}</text>
            </view>
          </view>

          <!-- Title -->
          <text class="qa-card-title">{{ q.title }}</text>

          <!-- Price & circle -->
          <view class="qa-tags">
            <view class="qa-tag-price"><text class="qa-tag-price-text">¥{{ q.price }}</text></view>
            <view v-if="q.circleName" class="qa-tag-circle"><text class="qa-tag-circle-text">{{ q.circleName }}</text></view>
            <view v-if="!q.isPublic" class="qa-tag-private"><text class="qa-tag-private-text">私密</text></view>
          </view>

          <!-- Answerer preview -->
          <view v-if="q.answerer" class="qa-answerer">
            <view class="qa-avatar-sm qa-avatar-gold">
              <text class="qa-avatar-text-sm">{{ q.answerer.name[0] }}</text>
            </view>
            <view class="qa-answerer-body">
              <view class="qa-answerer-row">
                <text class="qa-answerer-name">{{ q.answerer.name }}</text>
                <text v-if="q.answerer.title" class="qa-answerer-title">{{ q.answerer.title }}</text>
              </view>
              <text v-if="q.answerPreview" class="qa-answerer-preview">{{ q.answerPreview }}</text>
            </view>
            <app-icon name="chevron-right" :size="28" color="#999999" />
          </view>

          <!-- Stats -->
          <view class="qa-stats">
            <view class="qa-stats-left">
              <view class="qa-stat"><app-icon name="eye" :size="28" color="#999999" /><text class="qa-stat-text">{{ q.viewCount }}</text></view>
              <view class="qa-stat"><app-icon name="heart" :size="28" color="#999999" /><text class="qa-stat-text">{{ q.likeCount }}</text></view>
            </view>
            <view v-if="q.status === 'pending'" class="qa-stat qa-stat-urgent">
              <app-icon name="clock" :size="28" color="#f97316" />
              <text class="qa-stat-text-urgent">{{ getTimeRemaining(q.expireAt) }}</text>
            </view>
          </view>
        </view>
      </template>
    </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { navigateTo, navigateBack } from '@/utils/router'

type QuestionStatus = 'pending' | 'answered' | 'expired' | 'refunded'

interface Question {
  id: string
  title: string
  content: string
  price: number
  status: QuestionStatus
  asker: { id: string; name: string; avatar: string }
  answerer?: { id: string; name: string; avatar: string; title?: string }
  answerPreview?: string
  isPublic: boolean
  isPaid: boolean
  viewCount: number
  likeCount: number
  circleName?: string
  createdAt: string
  answeredAt?: string
  expireAt: string
}

const statusBarHeight = ref(0)
const activeTab = ref<'all' | 'pending' | 'answered'>('all')
const loading = ref(true)
const questions = ref<Question[]>([])

const tabs = [
  { key: 'all' as const, label: '全部' },
  { key: 'pending' as const, label: '待回答' },
  { key: 'answered' as const, label: '已回答' },
]

const statusLabel = (s: QuestionStatus) =>
  ({ pending: '待回答', answered: '已回答', expired: '已过期', refunded: '已退款' })[s]

const filteredQuestions = computed(() =>
  questions.value.filter((q) => {
    if (activeTab.value === 'all') return true
    if (activeTab.value === 'pending') return q.status === 'pending'
    if (activeTab.value === 'answered') return q.status === 'answered'
    return true
  }),
)

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}天前`
  return `${date.getMonth() + 1}/${date.getDate()}`
}

const getTimeRemaining = (expireAt: string) => {
  const expire = new Date(expireAt)
  const now = new Date()
  const diff = expire.getTime() - now.getTime()
  if (diff <= 0) return '已过期'
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 24) return `${hours}小时后过期`
  const days = Math.floor(hours / 24)
  return `${days}天后过期`
}

const onBack = () => navigateBack()
const goAsk = () => navigateTo('/qa/ask')
const goDetail = (id: string) => navigateTo(`/qa/${id}`)

onMounted(() => {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
  setTimeout(() => {
    questions.value = [
      {
        id: '1',
        title: '八字中的正官与七杀有什么区别？',
        content: '我在学习八字命理时，对正官和七杀的区别不太理解，请问它们在命局中分别代表什么？',
        price: 50,
        status: 'answered',
        asker: { id: 'u1', name: '易学新手', avatar: '' },
        answerer: { id: 'a1', name: '张大师', avatar: '', title: '八字命理专家' },
        answerPreview: '正官与七杀都是克我者，但性质截然不同。正官是异性相克，代表正当的约束、规范...',
        isPublic: true,
        isPaid: true,
        viewCount: 1280,
        likeCount: 89,
        circleName: '八字命理研究',
        createdAt: '2024-01-15T10:00:00Z',
        answeredAt: '2024-01-15T14:30:00Z',
        expireAt: '2024-01-22T10:00:00Z',
      },
      {
        id: '2',
        title: '如何判断流年大运的吉凶？',
        content: '请教一下，在八字排盘后，如何分析流年和大运对命局的影响？',
        price: 88,
        status: 'pending',
        asker: { id: 'u2', name: '命理爱好者', avatar: '' },
        answerer: { id: 'a2', name: '李老师', avatar: '', title: '周易研究员' },
        isPublic: true,
        isPaid: true,
        viewCount: 356,
        likeCount: 12,
        circleName: '周易预测',
        createdAt: '2024-01-16T09:00:00Z',
        expireAt: '2024-01-23T09:00:00Z',
      },
      {
        id: '3',
        title: '梅花易数起卦的时间问题',
        content: '梅花易数起卦时，是用北京时间还是当地真太阳时？',
        price: 30,
        status: 'answered',
        asker: { id: 'u3', name: '国学迷', avatar: '' },
        answerer: { id: 'a3', name: '王先生', avatar: '', title: '梅花易数传承人' },
        answerPreview: '这是一个很好的问题。在传统梅花易数中，起卦使用的是当地真太阳时...',
        isPublic: false,
        isPaid: false,
        viewCount: 520,
        likeCount: 45,
        createdAt: '2024-01-14T16:00:00Z',
        answeredAt: '2024-01-14T20:00:00Z',
        expireAt: '2024-01-21T16:00:00Z',
      },
    ]
    loading.value = false
  }, 300)
})
</script>

<style scoped>
.qa-page {
  min-height: 100vh;
  background-color: #faf8f5;
}
.qa-header {
  position: sticky;
  top: 0;
  z-index: 20;
  background-color: #ffffff;
  border-bottom: 1rpx solid #e8e3db;
}
.qa-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
}
.qa-back {
  margin-left: -8rpx;
  padding: 8rpx;
}
.qa-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.qa-ask-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 24rpx;
  background-color: #c41e3a;
  border-radius: 999rpx;
}
.qa-ask-text {
  font-size: 26rpx;
  font-weight: 500;
  color: #ffffff;
}
.qa-tabs {
  display: flex;
  gap: 48rpx;
  padding: 0 32rpx;
}
.qa-tab {
  position: relative;
  padding-bottom: 24rpx;
}
.qa-tab-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #999999;
}
.qa-tab-text-active {
  color: #c41e3a;
}
.qa-tab-line {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 4rpx;
  background-color: #c41e3a;
}
.qa-list {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.qa-card {
  background-color: #ffffff;
  border-radius: 32rpx;
  padding: 32rpx;
}
.qa-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.qa-asker {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.qa-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.qa-avatar-red {
  background: linear-gradient(135deg, #c41e3a, #e85a6b);
}
.qa-avatar-gold {
  background: linear-gradient(135deg, #c9a96e, #dfc296);
}
.qa-avatar-text {
  font-size: 30rpx;
  font-weight: 500;
  color: #ffffff;
}
.qa-asker-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
  display: block;
}
.qa-asker-time {
  font-size: 22rpx;
  color: #999999;
}
.qa-status {
  padding: 2rpx 16rpx;
  border-radius: 8rpx;
}
.qa-status-pending { background-color: #fff7ed; }
.qa-status-answered { background-color: #ecfdf5; }
.qa-status-expired { background-color: #f3f4f6; }
.qa-status-refunded { background-color: #fef2f2; }
.qa-status-text {
  font-size: 22rpx;
  font-weight: 500;
}
.qa-status-text-pending { color: #ea580c; }
.qa-status-text-answered { color: #16a34a; }
.qa-status-text-expired { color: #6b7280; }
.qa-status-text-refunded { color: #dc2626; }
.qa-card-title {
  font-size: 32rpx;
  font-weight: 500;
  color: #2c2c2c;
  margin-bottom: 16rpx;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}
.qa-tags {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 24rpx;
}
.qa-tag-price {
  padding: 2rpx 16rpx;
  background-color: #fff4e5;
  border-radius: 8rpx;
}
.qa-tag-price-text {
  font-size: 22rpx;
  font-weight: 500;
  color: #c9a96e;
}
.qa-tag-circle {
  padding: 2rpx 16rpx;
  background-color: #f5f5f5;
  border-radius: 8rpx;
}
.qa-tag-circle-text {
  font-size: 22rpx;
  color: #666666;
}
.qa-tag-private {
  padding: 2rpx 16rpx;
  background-color: #f3f4f6;
  border-radius: 8rpx;
}
.qa-tag-private-text {
  font-size: 22rpx;
  color: #999999;
}
.qa-answerer {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx;
  background-color: #faf8f5;
  border-radius: 24rpx;
  margin-bottom: 24rpx;
}
.qa-avatar-sm {
  width: 64rpx;
  height: 64rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.qa-avatar-text-sm {
  font-size: 26rpx;
  font-weight: 500;
  color: #ffffff;
}
.qa-answerer-body {
  flex: 1;
  min-width: 0;
}
.qa-answerer-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.qa-answerer-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.qa-answerer-title {
  font-size: 22rpx;
  color: #c9a96e;
}
.qa-answerer-preview {
  font-size: 22rpx;
  color: #666666;
  margin-top: 4rpx;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  overflow: hidden;
}
.qa-stats {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.qa-stats-left {
  display: flex;
  align-items: center;
  gap: 32rpx;
}
.qa-stat {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.qa-stat-text {
  font-size: 22rpx;
  color: #999999;
}
.qa-stat-text-urgent {
  font-size: 22rpx;
  color: #f97316;
}
.qa-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 160rpx 0;
}
.qa-empty-text {
  font-size: 28rpx;
  color: #999999;
  margin-top: 32rpx;
}
.qa-empty-btn {
  margin-top: 32rpx;
  padding: 16rpx 48rpx;
  background-color: #c41e3a;
  border-radius: 999rpx;
}
.qa-empty-btn-text {
  font-size: 26rpx;
  font-weight: 500;
  color: #ffffff;
}
.qa-skeleton .qa-sk-row {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-bottom: 24rpx;
}
.qa-sk-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 999rpx;
  background-color: #e5e7eb;
}
.qa-sk-col {
  flex: 1;
}
.qa-sk-line {
  height: 28rpx;
  background-color: #e5e7eb;
  border-radius: 8rpx;
  margin-bottom: 12rpx;
}
.qa-sk-w24 { width: 180rpx; }
.qa-sk-w16 { width: 120rpx; height: 22rpx; background-color: #f3f4f6; }
.qa-sk-w75 { width: 75%; height: 36rpx; }
.qa-sk-full { width: 100%; background-color: #f3f4f6; }
</style>
