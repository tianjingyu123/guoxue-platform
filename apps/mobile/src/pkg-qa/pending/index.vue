<template>
  <view class="qp-page">
    <!-- Header -->
    <view class="qp-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="qp-header-bar">
        <view class="qp-back" @tap="onBack"><app-icon name="chevron-left" :size="40" color="#2c2c2c" /></view>
        <text class="qp-header-title">待回答问题</text>
        <view class="qp-placeholder" />
      </view>
    </view>

    <!-- Stats -->
    <view class="qp-stats-wrap">
      <view class="qp-stats">
        <view class="qp-stat">
          <text class="qp-stat-num qp-num-red">{{ pendingQuestions.length }}</text>
          <text class="qp-stat-label">待回答</text>
        </view>
        <view class="qp-divider" />
        <view class="qp-stat">
          <text class="qp-stat-num qp-num-amber">{{ urgentCount }}</text>
          <text class="qp-stat-label">即将过期</text>
        </view>
        <view class="qp-divider" />
        <view class="qp-stat">
          <text class="qp-stat-num qp-num-green">¥{{ totalEarn }}</text>
          <text class="qp-stat-label">待赚取</text>
        </view>
      </view>
    </view>

    <!-- Empty -->
    <view v-if="questions.length === 0" class="qp-empty">
      <view class="qp-empty-icon"><app-icon name="message-square" :size="80" color="#999999" /></view>
      <text class="qp-empty-title">暂无待回答问题</text>
      <text class="qp-empty-desc">设置更合理的价格可获得更多提问</text>
    </view>

    <!-- List -->
    <view v-else class="qp-list">
      <!-- Pending -->
      <view v-if="pendingQuestions.length">
        <view class="qp-group-title">
          <app-icon name="clock" :size="32" color="#999999" />
          <text class="qp-group-title-tx">待回答 ({{ pendingQuestions.length }})</text>
        </view>
        <view class="qp-group">
          <view
            v-for="q in pendingQuestions"
            :key="q.id"
            class="qp-card"
            :class="{ 'qp-card-urgent': timeInfo(q).isUrgent }"
            @tap="goDetail(q.id)"
          >
            <view class="qp-card-head">
              <view class="qp-asker">
                <view class="qp-avatar"><text class="qp-avatar-tx">{{ q.asker.name[0] }}</text></view>
                <view>
                  <text class="qp-asker-name">{{ q.asker.name }}</text>
                  <text class="qp-asker-date">{{ formatDate(q.createdAt) }}</text>
                </view>
              </view>
              <view class="qp-time" :class="timeInfo(q).isUrgent ? 'qp-time-urgent' : 'qp-time-normal'">
                <app-icon name="clock" :size="24" :color="timeInfo(q).isUrgent ? '#dc2626' : '#d97706'" />
                <text class="qp-time-tx" :style="{ color: timeInfo(q).isUrgent ? '#dc2626' : '#d97706' }">剩余 {{ timeInfo(q).text }}</text>
              </view>
            </view>
            <text class="qp-card-title">{{ q.title }}</text>
            <text class="qp-card-content">{{ q.content }}</text>
            <view class="qp-card-foot">
              <view class="qp-foot-left">
                <view class="qp-coins"><app-icon name="coins" :size="32" color="#c41e3a" /><text class="qp-coins-tx">¥{{ q.price }}</text></view>
                <view v-if="q.isPublic" class="qp-badge-public"><text class="qp-badge-public-tx">公开</text></view>
                <view v-else class="qp-badge-private"><text class="qp-badge-private-tx">私密</text></view>
              </view>
              <view class="qp-go"><text class="qp-go-tx">去回答</text><app-icon name="chevron-right" :size="28" color="#c41e3a" /></view>
            </view>
          </view>
        </view>
      </view>

      <!-- Expired -->
      <view v-if="expiredQuestions.length" class="qp-mt">
        <view class="qp-group-title">
          <app-icon name="alert-circle" :size="32" color="#ef4444" />
          <text class="qp-group-title-tx">已过期 ({{ expiredQuestions.length }})</text>
        </view>
        <view class="qp-group">
          <view v-for="q in expiredQuestions" :key="q.id" class="qp-card qp-card-expired">
            <view class="qp-card-head">
              <view class="qp-asker">
                <view class="qp-avatar qp-avatar-gray"><text class="qp-avatar-tx">{{ q.asker.name[0] }}</text></view>
                <view>
                  <text class="qp-asker-name">{{ q.asker.name }}</text>
                  <text class="qp-asker-date">{{ formatDate(q.createdAt) }}</text>
                </view>
              </view>
              <view class="qp-expired-badge"><text class="qp-expired-badge-tx">已过期</text></view>
            </view>
            <text class="qp-card-title qp-clamp1">{{ q.title }}</text>
            <view class="qp-expired-info">
              <text class="qp-expired-price">¥{{ q.price }}</text>
              <text class="qp-expired-sep">·</text>
              <text class="qp-expired-tx">已退款给提问者</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- Bottom Tips -->
    <view class="qp-tips-wrap">
      <view class="qp-tips">
        <view class="qp-tips-title"><app-icon name="alert-circle" :size="28" color="#92400e" /><text class="qp-tips-title-tx">温馨提示</text></view>
        <view class="qp-tips-list">
          <text class="qp-tips-item">· 请在有效期内回答问题，过期将自动退款</text>
          <text class="qp-tips-item">· 认真回答可获得好评，提升您的曝光度</text>
          <text class="qp-tips-item">· 私密问答仅提问者可见，请放心回答</text>
        </view>
      </view>
    </view>

  </view>
  </view>
  </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { navigateBack, navigateTo } from '@/utils/router'

interface Question {
  id: string
  title: string
  content: string
  price: number
  asker: { name: string; avatar: string }
  isPublic: boolean
  createdAt: string
  expireAt: string
}

const statusBarHeight = ref(0)
const now = ref(Date.now())
const questions = ref<Question[]>([])

const timeInfo = (q: Question) => {
  const diff = new Date(q.expireAt).getTime() - now.value
  if (diff <= 0) return { text: '已过期', isUrgent: true, isExpired: true }
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  if (hours < 1) return { text: `${minutes}分钟`, isUrgent: true, isExpired: false }
  if (hours < 24) return { text: `${hours}小时${minutes}分钟`, isUrgent: true, isExpired: false }
  const days = Math.floor(hours / 24)
  return { text: `${days}天${hours % 24}小时`, isUrgent: false, isExpired: false }
}

const pendingQuestions = computed(() => questions.value.filter((q) => new Date(q.expireAt).getTime() - now.value > 0))
const expiredQuestions = computed(() => questions.value.filter((q) => new Date(q.expireAt).getTime() - now.value <= 0))
const urgentCount = computed(() => pendingQuestions.value.filter((q) => timeInfo(q).isUrgent).length)
const totalEarn = computed(() => pendingQuestions.value.reduce((s, q) => s + q.price, 0))

const formatDate = (s: string) => {
  const d = new Date(s)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

const onBack = () => navigateBack()
const goDetail = (id: string) => navigateTo(`/qa/${id}`)

onMounted(() => {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
  const t = Date.now()
  questions.value = [
    {
      id: '1',
      title: '如何判断流年大运的吉凶？',
      content: '请教一下，在八字排盘后，如何分析流年和大运对命局的影响？希望能结合实例讲解。',
      price: 88,
      asker: { name: '命理爱好者', avatar: '' },
      isPublic: true,
      createdAt: '2024-01-16T09:00:00Z',
      expireAt: new Date(t + 3 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '2',
      title: '紫微斗数命宫无主星怎么看？',
      content: '我的命宫没有主星，听说要借对宫，具体应该怎么分析？',
      price: 66,
      asker: { name: '国学迷', avatar: '' },
      isPublic: false,
      createdAt: '2024-01-15T18:00:00Z',
      expireAt: new Date(t + 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '3',
      title: '六爻起卦后如何定世应？',
      content: '六爻装卦后，世爻和应爻的确定规则是什么？',
      price: 30,
      asker: { name: '易学新手', avatar: '' },
      isPublic: true,
      createdAt: '2024-01-10T10:00:00Z',
      expireAt: new Date(t - 24 * 60 * 60 * 1000).toISOString(),
    },
  ]
  setInterval(() => (now.value = Date.now()), 60000)
})
</script>

<style scoped>
.qp-page {
  min-height: 100vh;
  background-color: #faf8f5;
}
.qp-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: #faf8f5;
  border-bottom: 1rpx solid #e8e3db;
}
.qp-header-bar {
  display: flex;
  align-items: center;
  height: 112rpx;
  padding: 0 32rpx;
}
.qp-back { padding: 16rpx; margin-left: -16rpx; }
.qp-header-title { flex: 1; text-align: center; font-size: 30rpx; font-weight: 600; color: #2c2c2c; }
.qp-placeholder { width: 72rpx; }
.qp-stats-wrap { padding: 32rpx; }
.qp-stats {
  background: linear-gradient(90deg, rgba(196, 30, 58, 0.1), rgba(196, 30, 58, 0.05));
  border-radius: 32rpx;
  padding: 32rpx;
  display: flex;
  align-items: center;
  gap: 48rpx;
}
.qp-stat { text-align: center; }
.qp-stat-num { font-size: 48rpx; font-weight: 700; display: block; }
.qp-num-red { color: #c41e3a; }
.qp-num-amber { color: #f59e0b; }
.qp-num-green { color: #16a34a; }
.qp-stat-label { font-size: 22rpx; color: #999999; margin-top: 8rpx; display: block; }
.qp-divider { width: 1rpx; height: 80rpx; background-color: #e8e3db; }
.qp-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 160rpx 0;
}
.qp-empty-icon {
  width: 160rpx;
  height: 160rpx;
  background-color: #f5f5f5;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
}
.qp-empty-title { font-size: 28rpx; color: #999999; margin-bottom: 16rpx; }
.qp-empty-desc { font-size: 26rpx; color: #999999; }
.qp-list { padding: 0 32rpx; }
.qp-mt { margin-top: 48rpx; }
.qp-group-title { display: flex; align-items: center; gap: 16rpx; margin-bottom: 24rpx; }
.qp-group-title-tx { font-size: 26rpx; font-weight: 500; color: #999999; }
.qp-group { display: flex; flex-direction: column; gap: 24rpx; }
.qp-card {
  background-color: #ffffff;
  border-radius: 32rpx;
  padding: 32rpx;
  border: 1rpx solid transparent;
}
.qp-card-urgent { border-color: #fecaca; background-color: rgba(254, 242, 242, 0.5); }
.qp-card-expired { opacity: 0.6; }
.qp-card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.qp-asker { display: flex; align-items: center; gap: 24rpx; }
.qp-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #c41e3a, #e85a6b);
  display: flex;
  align-items: center;
  justify-content: center;
}
.qp-avatar-gray { background: #d1d5db; }
.qp-avatar-tx { font-size: 30rpx; font-weight: 500; color: #ffffff; }
.qp-asker-name { font-size: 28rpx; font-weight: 500; color: #2c2c2c; display: block; }
.qp-asker-date { font-size: 22rpx; color: #999999; }
.qp-time { display: flex; align-items: center; gap: 8rpx; padding: 8rpx 16rpx; border-radius: 999rpx; }
.qp-time-urgent { background-color: #fee2e2; }
.qp-time-normal { background-color: #fef3c7; }
.qp-time-tx { font-size: 22rpx; }
.qp-card-title { font-size: 30rpx; font-weight: 500; color: #2c2c2c; margin-bottom: 16rpx; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
.qp-clamp1 { -webkit-line-clamp: 1; }
.qp-card-content { font-size: 26rpx; color: #999999; margin-bottom: 24rpx; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
.qp-card-foot { display: flex; align-items: center; justify-content: space-between; }
.qp-foot-left { display: flex; align-items: center; gap: 24rpx; }
.qp-coins { display: flex; align-items: center; gap: 8rpx; }
.qp-coins-tx { font-size: 28rpx; font-weight: 600; color: #c41e3a; }
.qp-badge-public { padding: 2rpx 16rpx; background-color: #f5f5f5; border-radius: 8rpx; }
.qp-badge-public-tx { font-size: 22rpx; color: #999999; }
.qp-badge-private { padding: 2rpx 16rpx; background-color: #fffbeb; border-radius: 8rpx; }
.qp-badge-private-tx { font-size: 22rpx; color: #d97706; }
.qp-go { display: flex; align-items: center; gap: 8rpx; }
.qp-go-tx { font-size: 26rpx; color: #c41e3a; }
.qp-expired-badge { padding: 8rpx 16rpx; background-color: #fef2f2; border-radius: 999rpx; }
.qp-expired-badge-tx { font-size: 22rpx; color: #ef4444; }
.qp-expired-info { display: flex; align-items: center; gap: 16rpx; }
.qp-expired-price { font-size: 26rpx; color: #999999; text-decoration: line-through; }
.qp-expired-sep { font-size: 26rpx; color: #999999; }
.qp-expired-tx { font-size: 26rpx; color: #999999; }
.qp-tips-wrap { padding: 32rpx; padding-bottom: 160rpx; }
.qp-tips { background-color: #fffbeb; border-radius: 24rpx; padding: 32rpx; }
.qp-tips-title { display: flex; align-items: center; gap: 16rpx; margin-bottom: 16rpx; }
.qp-tips-title-tx { font-size: 28rpx; font-weight: 500; color: #92400e; }
.qp-tips-list { display: flex; flex-direction: column; gap: 8rpx; }
.qp-tips-item { font-size: 26rpx; color: #b45309; line-height: 1.5; }
</style>
