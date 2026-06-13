<template>
  <view class="pending-page">
    <!-- 头部 -->
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <text class="header-title">待回答问题</text>
        <view class="header-spacer" />
      </view>
    </view>

    <!-- 统计卡片 -->
    <view class="stats-banner">
      <view class="sb-item">
        <text class="sb-num primary">{{ pendingQuestions.length }}</text>
        <text class="sb-label">待回答</text>
      </view>
      <view class="sb-divider" />
      <view class="sb-item">
        <text class="sb-num warning">{{ urgenQuestions.length }}</text>
        <text class="sb-label">即将过期</text>
      </view>
      <view class="sb-divider" />
      <view class="sb-item">
        <text class="sb-num success">¥{{ totalEarnings }}</text>
        <text class="sb-label">待赚取</text>
      </view>
    </view>

    <!-- 骨架屏 -->
    <template v-if="loading">
      <view v-for="i in 3" :key="i" class="skeleton-card">
        <view class="sk-row">
          <view class="sk-avatar" />
          <view class="sk-info">
            <view class="sk-line short" />
            <view class="sk-line shorter" />
          </view>
        </view>
        <view class="sk-line" />
        <view class="sk-line medium" />
      </view>
    </template>

    <!-- 空状态 -->
    <template v-else-if="questions.length === 0">
      <view class="empty-state">
        <text class="empty-icon">💬</text>
        <text class="empty-text">暂无待回答问题</text>
        <text class="empty-hint">设置更合理的价格可获得更多提问</text>
      </view>
    </template>

    <!-- 问答列表 -->
    <template v-else>
      <!-- 待回答问题 -->
      <view v-if="pendingQuestions.length" class="section">
        <text class="section-title">⏱️ 待回答 ({{ pendingQuestions.length }})</text>
        <view class="qa-list">
          <view v-for="q in pendingQuestions" :key="q.id" class="qa-card" :class="{ urgent: getTimeInfo(q.expireAt).isUrgent }" @click="goPage('/pages/qa/id-detail/index?id=' + q.id)">
            <view class="qc-header">
              <view class="qc-asker">
                <view class="qc-avatar">{{ q.asker.name[0] }}</view>
                <view>
                  <text class="qc-name">{{ q.asker.name }}</text>
                  <text class="qc-date">{{ q.createdAt }}</text>
                </view>
              </view>
              <text class="qc-time-remain" :class="{ urgent: getTimeInfo(q.expireAt).isUrgent }">⏱️ 剩余 {{ getTimeInfo(q.expireAt).text }}</text>
            </view>
            <text class="qc-title">{{ q.title }}</text>
            <text class="qc-content">{{ q.content }}</text>
            <view class="qc-footer">
              <view class="qc-left">
                <text class="qc-price">🪙 ¥{{ q.price }}</text>
                <text class="qc-type" :class="q.isPublic ? 'public' : 'private'">{{ q.isPublic ? '公开' : '私密' }}</text>
              </view>
              <text class="qc-action">去回答 ›</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 已过期问题 -->
      <view v-if="expiredQuestions.length" class="section">
        <text class="section-title">⚠️ 已过期 ({{ expiredQuestions.length }})</text>
        <view class="qa-list">
          <view v-for="q in expiredQuestions" :key="q.id" class="qa-card expired">
            <view class="qc-header">
              <view class="qc-asker">
                <view class="qc-avatar expired-avatar">{{ q.asker.name[0] }}</view>
                <view>
                  <text class="qc-name">{{ q.asker.name }}</text>
                  <text class="qc-date">{{ q.createdAt }}</text>
                </view>
              </view>
              <text class="qc-expired-badge">已过期</text>
            </view>
            <text class="qc-title line-1">{{ q.title }}</text>
            <view class="qc-footer">
              <text class="qc-price-line">¥{{ q.price }}</text>
              <text class="qc-mid-dot">·</text>
              <text class="qc-refunded">已退款给提问者</text>
            </view>
          </view>
        </view>
      </view>
    </template>

    <!-- 底部提示 -->
    <view class="tips-card">
      <text class="tips-title">⚠️ 温馨提示</text>
      <view class="tips-list">
        <text>· 请在有效期内回答问题，过期将自动退款</text>
        <text>· 认真回答可获得好评，提升您的曝光度</text>
        <text>· 私密问答仅提问者可见，请放心回答</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const loading = ref(false)
const now = ref(Date.now())

interface Question {
  id: number
  asker: { name: string; avatar: string }
  title: string
  content: string
  price: number
  isPublic: boolean
  expireAt: string
  createdAt: string
}

const questions = ref<Question[]>([
  { id: 1, asker: { name: '张先生', avatar: '' }, title: '八字看财运：日主甲木，生于午月，财星是否得力？', content: '请老师帮忙看看我的八字，主要关注财运方面的发展趋势...', price: 99, isPublic: true, expireAt: new Date(Date.now() + 3600000 * 5).toISOString(), createdAt: '2024-06-08' },
  { id: 2, asker: { name: '李女士', avatar: '' }, title: '问事业运：当前大运走什么方向比较好？', content: '想了解一下未来5年的事业运势，是否有跳槽或创业的时机...', price: 88, isPublic: true, expireAt: new Date(Date.now() + 3600000 * 48).toISOString(), createdAt: '2024-06-07' },
  { id: 3, asker: { name: '匿名用户', avatar: '' }, title: '婚姻感情问题', content: '最近感情不顺，想请老师看看八字中的婚姻信息...', price: 66, isPublic: false, expireAt: new Date(Date.now() - 3600000 * 2).toISOString(), createdAt: '2024-06-01' },
])

function getTimeInfo(expireAt: string) {
  const diff = new Date(expireAt).getTime() - now.value
  if (diff <= 0) return { text: '已过期', isUrgent: true, isExpired: true }
  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  if (hours < 1) return { text: minutes + '分钟', isUrgent: true, isExpired: false }
  if (hours < 24) return { text: hours + '小时' + minutes + '分钟', isUrgent: true, isExpired: false }
  const days = Math.floor(hours / 24)
  return { text: days + '天' + (hours % 24) + '小时', isUrgent: false, isExpired: false }
}

const pendingQuestions = computed(() => questions.value.filter(q => new Date(q.expireAt).getTime() - now.value > 0))
const expiredQuestions = computed(() => questions.value.filter(q => new Date(q.expireAt).getTime() - now.value <= 0))
const urgenQuestions = computed(() => pendingQuestions.value.filter(q => getTimeInfo(q.expireAt).isUrgent))
const totalEarnings = computed(() => pendingQuestions.value.reduce((sum, q) => sum + q.price, 0))

function goPage(url: string) {
  uni.navigateTo({ url })
}
</script>

<style scoped>
.pending-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 60rpx; }

.header-sticky { position: sticky; top: 0; z-index: 30; background: #fff; border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; padding: 10rpx 24rpx; height: 80rpx; }
.header-back { font-size: 48rpx; color: #333; width: 56rpx; }
.header-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; flex: 1; text-align: center; }
.header-spacer { width: 56rpx; }

.stats-banner { margin: 24rpx; background: linear-gradient(135deg, rgba(196,30,58,0.08), rgba(196,30,58,0.03)); border-radius: 20rpx; padding: 28rpx; display: flex; align-items: center; }
.sb-item { flex: 1; text-align: center; }
.sb-num { font-size: 40rpx; font-weight: 700; display: block; }
.sb-num.primary { color: #C41E3A; }
.sb-num.warning { color: #F59E0B; }
.sb-num.success { color: #22C55E; }
.sb-label { font-size: 22rpx; color: #999; margin-top: 6rpx; display: block; }
.sb-divider { width: 2rpx; height: 60rpx; background: #E8E0D5; }

.skeleton-card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin: 0 24rpx 16rpx; }
.sk-row { display: flex; align-items: center; gap: 16rpx; margin-bottom: 16rpx; }
.sk-avatar { width: 72rpx; height: 72rpx; border-radius: 50%; background: #F0F0F0; }
.sk-line { height: 24rpx; background: #F0F0F0; border-radius: 6rpx; margin-bottom: 12rpx; }
.sk-line.short { width: 60%; }
.sk-line.shorter { width: 40%; }
.sk-line.medium { width: 80%; }

.empty-state { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; }
.empty-icon { font-size: 80rpx; }
.empty-text { font-size: 26rpx; color: #999; margin-top: 16rpx; }
.empty-hint { font-size: 22rpx; color: #BBB; margin-top: 6rpx; }

.section { margin-bottom: 24rpx; }
.section-title { font-size: 26rpx; font-weight: 500; color: #999; padding: 0 24rpx 16rpx; display: block; }

.qa-list { padding: 0 24rpx; display: flex; flex-direction: column; gap: 16rpx; }

.qa-card { background: #fff; border-radius: 16rpx; padding: 24rpx; border: 2rpx solid transparent; }
.qa-card.urgent { border-color: rgba(196,30,58,0.2); background: rgba(196,30,58,0.02); }
.qa-card.expired { opacity: 0.6; }
.qc-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.qc-asker { display: flex; align-items: center; gap: 12rpx; }
.qc-avatar { width: 72rpx; height: 72rpx; border-radius: 50%; background: #F5F1EB; display: flex; align-items: center; justify-content: center; font-size: 28rpx; color: #333; }
.qc-avatar.expired-avatar { filter: grayscale(1); }
.qc-name { font-size: 26rpx; font-weight: 500; color: #333; display: block; }
.qc-date { font-size: 20rpx; color: #999; }
.qc-time-remain { font-size: 20rpx; padding: 6rpx 14rpx; border-radius: 20rpx; background: rgba(245,158,11,0.1); color: #D97706; }
.qc-time-remain.urgent { background: rgba(196,30,58,0.08); color: #C41E3A; }
.qc-expired-badge { font-size: 20rpx; padding: 6rpx 14rpx; border-radius: 20rpx; background: rgba(196,30,58,0.08); color: #C41E3A; }
.qc-title { font-size: 28rpx; font-weight: 500; color: #333; margin-bottom: 10rpx; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.qc-title.line-1 { -webkit-line-clamp: 1; }
.qc-content { font-size: 24rpx; color: #999; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; margin-bottom: 16rpx; }
.qc-footer { display: flex; justify-content: space-between; align-items: center; }
.qc-left { display: flex; align-items: center; gap: 16rpx; }
.qc-price { font-size: 24rpx; font-weight: 600; color: #C41E3A; }
.qc-type { font-size: 20rpx; padding: 4rpx 12rpx; border-radius: 4rpx; }
.qc-type.public { background: #F5F1EB; color: #999; }
.qc-type.private { background: rgba(245,158,11,0.1); color: #D97706; }
.qc-action { font-size: 24rpx; color: #C41E3A; }
.qc-price-line { font-size: 24rpx; color: #999; text-decoration: line-through; }
.qc-mid-dot { color: #BBB; }
.qc-refunded { font-size: 24rpx; color: #999; }

.tips-card { margin: 0 24rpx; background: rgba(245,158,11,0.05); border-radius: 16rpx; padding: 24rpx; }
.tips-title { font-size: 26rpx; font-weight: 600; color: #8B7355; display: block; margin-bottom: 12rpx; }
.tips-list { display: flex; flex-direction: column; gap: 8rpx; }
.tips-list text { font-size: 22rpx; color: #8B7355; line-height: 1.6; }
</style>
