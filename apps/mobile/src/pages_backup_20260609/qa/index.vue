<template>
  <view class="qa-page">
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <text class="header-title">付费问答</text>
        <view class="header-btn" @click="goPage('/pages/publish/index?type=qa')">＋ 提问</view>
      </view>
      <view class="tab-row">
        <text v-for="t in tabs" :key="t.key" class="tab-item" :class="{ active: activeTab === t.key }" @click="activeTab = t.key">
          {{ t.label }}
        </text>
      </view>
    </view>

    <view class="qa-list">
      <view v-if="loading" v-for="i in 3" :key="'s'+i" class="sk-card">
        <view class="sk-top"><view class="sk-avatar" /><view class="sk-lines"><view class="sk-line w-30" /><view class="sk-line w-20" /></view></view>
        <view class="sk-line w-70" /><view class="sk-line w-100" />
      </view>

      <view v-else-if="filteredQuestions.length === 0" class="empty-wrap">
        <text class="empty-icon">💬</text>
        <text class="empty-text">暂无问答内容</text>
        <view class="empty-btn" @click="goPage('/pages/publish/index?type=qa')">发起提问</view>
      </view>

      <view v-for="q in filteredQuestions" :key="q.id" class="qa-card" @click="goPage('/pages/detail/index?id=' + q.id)">
        <view class="qc-top">
          <view class="qc-avatar">{{ q.asker.name[0] }}</view>
          <view class="qc-user">
            <text class="qc-name">{{ q.asker.name }}</text>
            <text class="qc-time">{{ formatTime(q.createdAt) }}</text>
          </view>
          <view class="qc-status" :style="{ background: statusConfig[q.status].bg }">
            <text :style="{ color: statusConfig[q.status].color }">{{ statusConfig[q.status].label }}</text>
          </view>
        </view>

        <text class="qc-title">{{ q.title }}</text>

        <view class="qc-tags">
          <text class="qc-price">¥{{ q.price }}</text>
          <text v-if="q.circleName" class="qc-circle">{{ q.circleName }}</text>
          <text v-if="!q.isPublic" class="qc-private">私密</text>
        </view>

        <view v-if="q.answerer" class="qc-answerer">
          <view class="qa-avatar">{{ q.answerer.name[0] }}</view>
          <view class="qa-info">
            <view class="qa-name-row">
              <text class="qa-name">{{ q.answerer.name }}</text>
              <text v-if="q.answerer.title" class="qa-title">{{ q.answerer.title }}</text>
            </view>
            <text v-if="q.answerPreview" class="qa-preview">{{ q.answerPreview }}</text>
          </view>
          <text class="qa-arrow">›</text>
        </view>

        <view class="qc-footer">
          <text class="qc-stat">👁 {{ q.viewCount }}</text>
          <text class="qc-stat">❤️ {{ q.likeCount }}</text>
          <text v-if="q.status === 'pending'" class="qc-deadline">⏰ {{ getRemaining(q.expireAt) }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const activeTab = ref('all')
const loading = ref(false)
const tabs = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待回答' },
  { key: 'answered', label: '已回答' },
]

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: '待回答', color: '#FA8C16', bg: 'rgba(250,140,22,0.08)' },
  answered: { label: '已回答', color: '#52C41A', bg: 'rgba(82,196,26,0.08)' },
  expired: { label: '已过期', color: '#999', bg: '#F5F1EB' },
  refunded: { label: '已退款', color: '#FF4D4F', bg: 'rgba(255,77,79,0.08)' },
}

const questions = [
  { id: '1', title: '八字中的正官与七杀有什么区别？', price: 50, status: 'answered', asker: { id: 'u1', name: '易学新手' }, answerer: { id: 'a1', name: '张大师', title: '八字命理专家' }, answerPreview: '正官与七杀都是克我者，但性质截然不同...', isPublic: true, circleName: '八字命理研究', viewCount: 1280, likeCount: 89, createdAt: '2024-01-15T10:00:00Z', expireAt: '2024-01-22T10:00:00Z' },
  { id: '2', title: '如何判断流年大运的吉凶？', price: 88, status: 'pending', asker: { id: 'u2', name: '命理爱好者' }, answerer: { id: 'a2', name: '李老师', title: '周易研究员' }, isPublic: true, circleName: '周易预测', viewCount: 356, likeCount: 12, createdAt: '2024-01-16T09:00:00Z', expireAt: '2024-01-23T09:00:00Z' },
  { id: '3', title: '梅花易数起卦的时间问题', price: 30, status: 'answered', asker: { id: 'u3', name: '国学迷' }, answerer: { id: 'a3', name: '王先生', title: '梅花易数传承人' }, answerPreview: '这是一个很好的问题，传统梅花易数中使用的是当地真太阳时...', isPublic: false, viewCount: 520, likeCount: 45, createdAt: '2024-01-14T16:00:00Z', expireAt: '2024-01-21T16:00:00Z' },
]

const filteredQuestions = computed(() => {
  if (activeTab.value === 'all') return questions
  if (activeTab.value === 'pending') return questions.filter(q => q.status === 'pending')
  if (activeTab.value === 'answered') return questions.filter(q => q.status === 'answered')
  return questions
})

function formatTime(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 24) return hours + '小时前'
  const days = Math.floor(hours / 24)
  if (days < 7) return days + '天前'
  return new Date(d).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
}

function getRemaining(d: string) {
  const diff = new Date(d).getTime() - Date.now()
  if (diff <= 0) return '已过期'
  const hours = Math.floor(diff / 3600000)
  if (hours < 24) return hours + '小时后过期'
  return Math.floor(hours / 24) + '天后过期'
}

function goPage(url: string) { uni.navigateTo({ url }) }
</script>

<style scoped>
.qa-page { min-height: 100vh; background: #FAF8F5; }
.header-sticky { position: sticky; top: 0; z-index: 30; background: rgba(250,248,245,0.95); backdrop-filter: blur(12rpx); border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; padding: 0 24rpx; height: 88rpx; }
.header-back { font-size: 48rpx; color: #333; width: 64rpx; }
.header-title { font-size: 34rpx; font-weight: 700; color: #2C2C2C; flex: 1; }
.header-btn { padding: 8rpx 16rpx; background: #C41E3A; color: #fff; border-radius: 32rpx; font-size: 22rpx; }

.tab-row { display: flex; gap: 32rpx; padding: 0 24rpx 14rpx; }
.tab-item { font-size: 24rpx; color: #999; padding-bottom: 8rpx; border-bottom: 2px solid transparent; }
.tab-item.active { color: #C41E3A; border-bottom-color: #C41E3A; font-weight: 500; }

.qa-list { padding: 12rpx 24rpx; }
.qa-card { background: #fff; border-radius: 16rpx; padding: 20rpx 24rpx; margin-bottom: 14rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }

.qc-top { display: flex; align-items: center; gap: 12rpx; margin-bottom: 12rpx; }
.qc-avatar { width: 64rpx; height: 64rpx; border-radius: 50%; background: linear-gradient(135deg, #C41E3A, #E85A6B); display: flex; align-items: center; justify-content: center; font-size: 24rpx; color: #fff; flex-shrink: 0; }
.qc-user { flex: 1; }
.qc-name { font-size: 24rpx; font-weight: 500; color: #333; display: block; }
.qc-time { font-size: 20rpx; color: #BBB; }
.qc-status { padding: 4rpx 14rpx; border-radius: 20rpx; }
.qc-status text { font-size: 20rpx; }

.qc-title { font-size: 28rpx; font-weight: 500; color: #2C2C2C; display: block; margin-bottom: 10rpx; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }

.qc-tags { display: flex; gap: 8rpx; margin-bottom: 12rpx; }
.qc-price { font-size: 20rpx; color: #C9A96E; background: rgba(201,169,110,0.1); padding: 2rpx 12rpx; border-radius: 6rpx; }
.qc-circle { font-size: 20rpx; color: #666; background: #F5F1EB; padding: 2rpx 12rpx; border-radius: 6rpx; }
.qc-private { font-size: 20rpx; color: #999; background: #F0EDE5; padding: 2rpx 12rpx; border-radius: 6rpx; }

.qc-answerer { display: flex; align-items: center; gap: 10rpx; padding: 12rpx 14rpx; background: #FAF8F5; border-radius: 12rpx; margin-bottom: 12rpx; }
.qa-avatar { width: 52rpx; height: 52rpx; border-radius: 50%; background: linear-gradient(135deg, #C9A96E, #DFC296); display: flex; align-items: center; justify-content: center; font-size: 20rpx; color: #fff; flex-shrink: 0; }
.qa-info { flex: 1; min-width: 0; }
.qa-name-row { display: flex; align-items: center; gap: 8rpx; }
.qa-name { font-size: 22rpx; font-weight: 500; color: #2C2C2C; }
.qa-title { font-size: 18rpx; color: #C9A96E; }
.qa-preview { font-size: 20rpx; color: #666; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
.qa-arrow { font-size: 28rpx; color: #BBB; }

.qc-footer { display: flex; gap: 20rpx; }
.qc-stat { font-size: 20rpx; color: #BBB; }
.qc-deadline { font-size: 20rpx; color: #FA8C16; }

.sk-card { background: #fff; border-radius: 16rpx; padding: 20rpx 24rpx; margin-bottom: 14rpx; }
.sk-top { display: flex; align-items: center; gap: 12rpx; margin-bottom: 16rpx; }
.sk-avatar { width: 64rpx; height: 64rpx; border-radius: 50%; background: #F0EDE5; }
.sk-lines { flex: 1; }
.sk-line { height: 14rpx; background: #F0EDE5; border-radius: 4rpx; margin-bottom: 8rpx; }
.w-30 { width: 30%; } .w-20 { width: 20%; } .w-70 { width: 70%; } .w-100 { width: 100%; }

.empty-wrap { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 16rpx; }
.empty-text { font-size: 28rpx; color: #999; margin-bottom: 20rpx; }
.empty-btn { padding: 12rpx 36rpx; background: #C41E3A; color: #fff; border-radius: 32rpx; font-size: 24rpx; }
</style>
