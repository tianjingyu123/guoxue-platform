<template>
  <view class="bm-page">
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <text class="header-title">我的悬赏</text>
        <view class="header-spacer" />
      </view>
      <view class="tab-row">
        <view class="tab-item" :class="{ active: activeTab === 'posted' }" @click="activeTab = 'posted'">
          <text>我发布的</text>
          <view v-if="activeTab === 'posted'" class="tab-line" />
        </view>
        <view class="tab-item" :class="{ active: activeTab === 'answered' }" @click="activeTab = 'answered'">
          <text>我回答的</text>
          <view v-if="activeTab === 'answered'" class="tab-line" />
        </view>
      </view>
    </view>

    <view class="bm-body">
      <view v-if="bounties.length > 0" class="stats-card">
        <view class="stats-top">
          <text class="stats-icon">🎁</text>
          <text class="stats-label">{{ activeTab === 'posted' ? '发布统计' : '回答统计' }}</text>
        </view>
        <view class="stats-grid">
          <view class="stat-item"><text class="stat-num">{{ stats.total }}</text><text class="stat-label">总数</text></view>
          <view class="stat-item"><text class="stat-num">{{ stats.open }}</text><text class="stat-label">进行中</text></view>
          <view class="stat-item"><text class="stat-num">{{ stats.resolved }}</text><text class="stat-label">已解决</text></view>
          <view class="stat-item"><text class="stat-num">¥{{ stats.totalAmount }}</text><text class="stat-label">{{ activeTab === 'posted' ? '总投入' : '总收益' }}</text></view>
        </view>
      </view>

      <template v-if="loading">
        <view v-for="i in 3" :key="i" class="skeleton">
          <view class="sk-status" />
          <view class="sk-title" />
          <view class="sk-desc" />
        </view>
      </template>

      <view v-else-if="bounties.length === 0" class="empty">
        <text class="empty-icon">🎁</text>
        <text class="empty-text">{{ activeTab === 'posted' ? '还没有发布过悬赏' : '还没有回答过悬赏' }}</text>
        <view v-if="activeTab === 'posted'" class="empty-btn" @click="goPage('/pages/bounty/create/index')"><text>发布悬赏</text></view>
      </view>

      <view v-else class="bounty-list">
        <view v-for="b in bounties" :key="b.id" class="bounty-card" @click="goPage('/pages/bounty/id-detail/index?id=' + b.id)">
          <view class="bc-top">
            <view class="bc-status" :style="{ background: statusConfig[b.status]?.bg || '#F5F1EB' }">
              <text :style="{ color: statusConfig[b.status]?.color || '#999' }">{{ statusConfig[b.status]?.label || b.status }}</text>
            </view>
            <text class="bc-amount">🎁 ¥{{ b.amount }}</text>
          </view>
          <text class="bc-title">{{ b.title }}</text>
          <text class="bc-desc">{{ b.description }}</text>
          <view class="bc-meta">
            <template v-if="activeTab === 'posted'">
              <text>💬 {{ b.answerCount }}个回答</text>
              <text v-if="b.status === 'open'" class="bc-time-left">⏰ {{ getRemainingTime(b.expireAt) }}</text>
            </template>
            <template v-else>
              <text>{{ formatTimeAgo(b.createdAt) }}回答</text>
              <text v-if="b.status === 'resolved'" class="bc-accepted">✅ 已被采纳</text>
            </template>
          </view>
          <view v-if="activeTab === 'posted'" class="bc-actions">
            <view v-if="b.status === 'answered'" class="bc-action settle" @click.stop="handleSettle(b.id)"><text>💰 结算悬赏</text></view>
            <view v-else-if="b.status === 'expired' || b.status === 'cancelled'" class="bc-action repost" @click.stop="handleRepost(b.id)"><text>🔄 重新发布</text></view>
            <text v-else-if="b.status === 'open' && b.answerCount === 0" class="bc-waiting">等待回答中...</text>
            <view v-else-if="b.status === 'open' && b.answerCount > 0" class="bc-action view" @click.stop="goPage('/pages/bounty/id-detail/index?id=' + b.id)"><text>查看回答</text></view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const activeTab = ref<'posted' | 'answered'>('posted')
const loading = ref(false)

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: '进行中', color: '#1677FF', bg: 'rgba(22,119,255,0.08)' },
  answered: { label: '待采纳', color: '#FA8C16', bg: 'rgba(250,140,22,0.08)' },
  resolved: { label: '已解决', color: '#52C41A', bg: 'rgba(82,196,26,0.08)' },
  expired: { label: '已过期', color: '#999', bg: '#F5F1EB' },
  cancelled: { label: '已取消', color: '#999', bg: '#F5F1EB' },
}

const bounties = ref([
  { id: '1', title: '求解八字命盘中的财运分析方法', description: '想了解如何从八字命盘中分析一个人的财运走势...', amount: 50, status: 'open', poster: { id: 'u1', name: '易学初学者' }, answerCount: 3, viewCount: 128, createdAt: '2024-01-15T10:00:00Z', expireAt: '2024-01-22T10:00:00Z' },
  { id: '2', title: '风水布局中如何化解尖角煞？', description: '家里客厅有一个突出的墙角对着沙发...', amount: 30, status: 'answered', poster: { id: 'u2', name: '风水爱好者' }, answerCount: 5, viewCount: 256, createdAt: '2024-01-14T08:00:00Z', expireAt: '2024-01-21T08:00:00Z' },
  { id: '3', title: '六爻用神取用详解', description: '在六爻预测中如何准确判断用神...', amount: 100, status: 'expired', poster: { id: 'u3', name: '六爻研究者' }, answerCount: 0, viewCount: 45, createdAt: '2024-01-01T10:00:00Z', expireAt: '2024-01-08T10:00:00Z' },
])

const stats = computed(() => ({
  total: bounties.value.length,
  open: bounties.value.filter(b => b.status === 'open').length,
  resolved: bounties.value.filter(b => b.status === 'resolved').length,
  totalAmount: bounties.value.reduce((s, b) => s + b.amount, 0),
}))

function formatTimeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const days = Math.floor(diff / 86400000)
  if (days > 30) return `${Math.floor(days / 30)}个月前`
  if (days > 0) return `${days}天前`
  const hours = Math.floor(diff / 3600000)
  if (hours > 0) return `${hours}小时前`
  return '刚刚'
}

function getRemainingTime(exp: string) {
  const diff = new Date(exp).getTime() - Date.now()
  if (diff <= 0) return '已过期'
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  if (days > 0) return `剩余${days}天${hours}小时`
  return `剩余${hours}小时`
}

function handleSettle(id: string) { uni.showToast({ title: '结算成功', icon: 'success' }) }
function handleRepost(id: string) { uni.navigateTo({ url: '/pages/bounty/create/index?repost=' + id }) }
function goPage(url: string) { uni.navigateTo({ url }) }
</script>

<style scoped>
.bm-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 40rpx; }
.header-sticky { position: sticky; top: 0; z-index: 30; background: #fff; border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; padding: 10rpx 24rpx; height: 80rpx; }
.header-back { font-size: 48rpx; color: #333; width: 56rpx; }
.header-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; flex: 1; text-align: center; }
.header-spacer { width: 56rpx; }
.tab-row { display: flex; border-bottom: 1px solid #E8E0D5; }
.tab-item { flex: 1; text-align: center; padding: 18rpx 0; position: relative; }
.tab-item text { font-size: 26rpx; color: #999; }
.tab-item.active text { color: #C41E3A; }
.tab-line { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 60rpx; height: 4rpx; background: #C41E3A; border-radius: 2rpx; }

.bm-body { padding: 24rpx; }

.stats-card { background: linear-gradient(135deg, #F0A030, #E89020); border-radius: 16rpx; padding: 20rpx; margin-bottom: 24rpx; }
.stats-top { display: flex; align-items: center; gap: 10rpx; margin-bottom: 18rpx; }
.stats-icon { font-size: 28rpx; }
.stats-label { font-size: 26rpx; font-weight: 500; color: #fff; }
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10rpx; }
.stat-item { text-align: center; }
.stat-num { font-size: 32rpx; font-weight: 700; color: #fff; display: block; }
.stat-label { font-size: 20rpx; color: rgba(255,255,255,0.75); display: block; }

.skeleton { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.sk-status { width: 100rpx; height: 28rpx; background: #f0f0f0; border-radius: 14rpx; margin-bottom: 14rpx; }
.sk-title { width: 70%; height: 22rpx; background: #f0f0f0; border-radius: 4rpx; margin-bottom: 10rpx; }
.sk-desc { width: 100%; height: 18rpx; background: #f0f0f0; border-radius: 4rpx; }

.empty { display: flex; flex-direction: column; align-items: center; padding: 100rpx 0; }
.empty-icon { font-size: 100rpx; opacity: 0.2; margin-bottom: 20rpx; }
.empty-text { font-size: 28rpx; color: #999; margin-bottom: 24rpx; }
.empty-btn { padding: 14rpx 36rpx; background: #C41E3A; border-radius: 28rpx; }
.empty-btn text { font-size: 24rpx; color: #fff; }

.bounty-card { background: #fff; border-radius: 16rpx; padding: 20rpx; margin-bottom: 16rpx; border: 1px solid #F5F1EB; }
.bc-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14rpx; }
.bc-status { padding: 4rpx 14rpx; border-radius: 20rpx; }
.bc-status text { font-size: 20rpx; }
.bc-amount { font-size: 28rpx; font-weight: 700; color: #C9A96E; }
.bc-title { font-size: 28rpx; font-weight: 500; color: #333; display: block; margin-bottom: 8rpx; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.bc-desc { font-size: 24rpx; color: #666; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; margin-bottom: 14rpx; }
.bc-meta { display: flex; gap: 16rpx; margin-bottom: 16rpx; }
.bc-meta text { font-size: 20rpx; color: #BBB; }
.bc-time-left { color: #FA8C16 !important; }
.bc-accepted { color: #52C41A !important; }

.bc-actions { display: flex; justify-content: flex-end; gap: 12rpx; padding-top: 14rpx; border-top: 1px solid #F5F1EB; }
.bc-action { padding: 10rpx 20rpx; border-radius: 12rpx; }
.bc-action.settle { background: #52C41A; }
.bc-action.settle text { font-size: 22rpx; color: #fff; }
.bc-action.repost { background: #C41E3A; }
.bc-action.repost text { font-size: 22rpx; color: #fff; }
.bc-action.view { background: #F0A030; }
.bc-action.view text { font-size: 22rpx; color: #fff; }
.bc-waiting { font-size: 22rpx; color: #BBB; }
</style>
