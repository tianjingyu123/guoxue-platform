<template>
  <view class="bounty-page">
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <text class="header-title">悬赏广场</text>
        <view class="header-btn" @click="goPage('/pages/publish/index?type=bounty')">
          <text>＋ 发布悬赏</text>
        </view>
      </view>
      <scroll-view scroll-x class="tab-scroll">
        <view class="tab-row">
          <text v-for="t in tabs" :key="t.key" class="tab-chip" :class="{ active: activeTab === t.key }" @click="activeTab = t.key">
            {{ t.label }}
          </text>
        </view>
      </scroll-view>
    </view>

    <view class="bounty-list">
      <view v-if="loading" v-for="i in 3" :key="'s'+i" class="sk-card">
        <view class="sk-top">
          <view class="sk-avatar" />
          <view class="sk-lines">
            <view class="sk-line w-30" />
            <view class="sk-line w-20" />
          </view>
        </view>
        <view class="sk-line w-70" />
        <view class="sk-line w-100" />
      </view>

      <view v-else-if="filteredBounties.length === 0" class="empty-wrap">
        <text class="empty-icon">📝</text>
        <text class="empty-text">暂无悬赏问题</text>
        <view class="empty-btn" @click="goPage('/pages/publish/index?type=bounty')">发布悬赏</view>
      </view>

      <view v-for="b in filteredBounties" :key="b.id" class="bounty-card" @click="goPage('/pages/detail/index?id=' + b.id)">
        <view class="bc-top">
          <view class="bc-avatar">{{ b.poster.name[0] }}</view>
          <view class="bc-user">
            <text class="bc-name">{{ b.poster.name }}</text>
            <text class="bc-time">{{ formatTime(b.createdAt) }}</text>
          </view>
          <view class="bc-status" :style="{ background: statusConfig[b.status].bg }">
            <text :style="{ color: statusConfig[b.status].color }">{{ statusConfig[b.status].label }}</text>
          </view>
        </view>

        <text class="bc-title">{{ b.title }}</text>
        <text class="bc-desc">{{ b.description }}</text>

        <view v-if="b.tags.length" class="bc-tags">
          <text v-for="t in b.tags" :key="t" class="bc-tag">#{{ t }}</text>
        </view>

        <view class="bc-footer">
          <view class="bc-stats">
            <text class="bc-stat">👁 {{ b.viewCount }}</text>
            <text class="bc-stat">💬 {{ b.answerCount }}个回答</text>
            <text v-if="b.status === 'open'" class="bc-deadline">⏰ {{ getRemaining(b.expireAt) }}</text>
          </view>
          <view class="bc-amount">💰 ¥{{ b.amount }}</view>
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
  { key: 'open', label: '进行中' },
  { key: 'resolved', label: '已解决' },
  { key: 'expired', label: '已过期' },
]

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: '进行中', color: '#52C41A', bg: 'rgba(82,196,26,0.08)' },
  answered: { label: '待采纳', color: '#FA8C16', bg: 'rgba(250,140,22,0.08)' },
  resolved: { label: '已解决', color: '#1677FF', bg: 'rgba(22,119,255,0.08)' },
  expired: { label: '已过期', color: '#999', bg: '#F5F1EB' },
  cancelled: { label: '已取消', color: '#999', bg: '#F5F1EB' },
}

const bounties = [
  { id: '1', title: '求解八字命盘中的财运分析方法', description: '想了解如何从八字命盘中分析一个人的财运走势...', amount: 50, status: 'open', poster: { id: 'u1', name: '易学初学者' }, answerCount: 3, viewCount: 128, tags: ['财运', '命盘分析'], createdAt: '2024-01-15T10:00:00Z', expireAt: '2024-01-22T10:00:00Z' },
  { id: '2', title: '风水布局中如何化解尖角煞？', description: '家里客厅有一个突出的墙角对着沙发...', amount: 30, status: 'resolved', poster: { id: 'u2', name: '风水爱好者' }, answerCount: 5, viewCount: 256, tags: ['家居风水', '化煞'], createdAt: '2024-01-14T08:00:00Z', expireAt: '2024-01-21T08:00:00Z' },
  { id: '3', title: '梅花易数起卦时间问题请教', description: '用梅花易数起卦时，别人问事应该用问卦人的时间还是起卦人的时间？', amount: 20, status: 'answered', poster: { id: 'u3', name: '梅花学徒' }, answerCount: 2, viewCount: 89, tags: ['起卦', '时间'], createdAt: '2024-01-13T15:00:00Z', expireAt: '2024-01-20T15:00:00Z' },
  { id: '4', title: '六爻预测中的用神取用问题', description: '在六爻预测中，如何准确判断用神？特别是测事业和财运时的用神取法...', amount: 100, status: 'open', poster: { id: 'u4', name: '六爻研究者' }, answerCount: 1, viewCount: 312, tags: ['用神', '预测技巧'], createdAt: '2024-01-12T09:00:00Z', expireAt: '2024-01-19T09:00:00Z' },
  { id: '5', title: '奇门遁甲中的三奇六仪如何理解？', description: '刚开始学习奇门遁甲，对三奇六仪的概念比较模糊...', amount: 40, status: 'expired', poster: { id: 'u5', name: '奇门新手' }, answerCount: 0, viewCount: 45, tags: ['基础概念', '入门'], createdAt: '2024-01-01T10:00:00Z', expireAt: '2024-01-08T10:00:00Z' },
]

const filteredBounties = computed(() => {
  if (activeTab.value === 'all') return bounties
  return bounties.filter(b => b.status === activeTab.value)
})

function formatTime(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return days + '天前'
  return new Date(d).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
}

function getRemaining(d: string) {
  const diff = new Date(d).getTime() - Date.now()
  if (diff <= 0) return '已过期'
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  if (days > 0) return '剩余' + days + '天'
  return '剩余' + hours + '小时'
}

function goPage(url: string) { uni.navigateTo({ url }) }
</script>

<style scoped>
.bounty-page { min-height: 100vh; background: #FAF8F5; }
.header-sticky { position: sticky; top: 0; z-index: 30; background: rgba(250,248,245,0.95); backdrop-filter: blur(12rpx); border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; padding: 0 24rpx; height: 88rpx; }
.header-back { font-size: 48rpx; color: #333; width: 64rpx; }
.header-title { font-size: 34rpx; font-weight: 700; color: #2C2C2C; flex: 1; }
.header-btn { padding: 8rpx 16rpx; background: #C41E3A; color: #fff; border-radius: 32rpx; font-size: 22rpx; }

.tab-scroll { white-space: nowrap; }
.tab-row { display: flex; gap: 12rpx; padding: 14rpx 24rpx; }
.tab-chip { font-size: 24rpx; color: #666; background: #F5F1EB; padding: 8rpx 22rpx; border-radius: 32rpx; display: inline-block; }
.tab-chip.active { background: #C41E3A; color: #fff; }

.bounty-list { padding: 12rpx 24rpx; }
.bounty-card { background: #fff; border-radius: 16rpx; padding: 20rpx 24rpx; margin-bottom: 14rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }

.bc-top { display: flex; align-items: center; gap: 12rpx; margin-bottom: 14rpx; }
.bc-avatar { width: 64rpx; height: 64rpx; border-radius: 50%; background: #F5F1EB; display: flex; align-items: center; justify-content: center; font-size: 24rpx; color: #999; flex-shrink: 0; }
.bc-user { flex: 1; }
.bc-name { font-size: 24rpx; font-weight: 500; color: #333; display: block; }
.bc-time { font-size: 20rpx; color: #BBB; }
.bc-status { padding: 4rpx 14rpx; border-radius: 20rpx; }
.bc-status text { font-size: 20rpx; }

.bc-title { font-size: 28rpx; font-weight: 500; color: #2C2C2C; display: block; margin-bottom: 8rpx; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.bc-desc { font-size: 22rpx; color: #999; display: block; margin-bottom: 12rpx; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }

.bc-tags { display: flex; flex-wrap: wrap; gap: 8rpx; margin-bottom: 14rpx; }
.bc-tag { font-size: 18rpx; color: #999; background: #F5F1EB; padding: 2rpx 12rpx; border-radius: 6rpx; }

.bc-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 14rpx; border-top: 1px solid #F5F1EB; }
.bc-stats { display: flex; gap: 16rpx; }
.bc-stat { font-size: 20rpx; color: #BBB; }
.bc-deadline { color: #FA8C16; }
.bc-amount { font-size: 24rpx; font-weight: 700; color: #C41E3A; }

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
