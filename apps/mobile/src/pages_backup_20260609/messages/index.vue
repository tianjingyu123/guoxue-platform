<template>
  <view class="msg-page">
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <text class="header-title">消息中心</text>
        <text class="header-action" @click="markAllRead">全部已读</text>
      </view>
      <view class="tab-row">
        <view v-for="t in tabs" :key="t.id" class="tab-item" :class="{ active: activeTab === t.id }" @click="activeTab = t.id">
          <text class="tab-icon">{{ t.icon }}</text>
          <text>{{ t.label }}</text>
          <text v-if="unreadCounts[t.id] > 0" class="tab-badge" :class="{ 'badge-active': activeTab === t.id }">
            {{ unreadCounts[t.id] > 99 ? '99+' : unreadCounts[t.id] }}
          </text>
        </view>
      </view>
    </view>

    <view class="msg-list">
      <view v-if="loading" v-for="i in 3" :key="'s'+i" class="sk-card">
        <view class="sk-top"><view class="sk-avatar" /><view class="sk-lines"><view class="sk-line w-40" /><view class="sk-line w-70" /></view></view>
      </view>

      <view v-else-if="filteredMessages.length === 0" class="empty-wrap">
        <text class="empty-icon">📭</text>
        <text class="empty-text">暂无消息</text>
      </view>

      <view v-for="msg in filteredMessages" :key="msg.id" class="msg-card" :class="{ unread: !msg.isRead }" @click="handleRead(msg)">
        <view class="mc-left">
          <view v-if="msg.avatar" class="mc-avatar">{{ msg.title[0] }}</view>
          <view v-else class="mc-icon-wrap">
            <text class="mc-icon">{{ getIcon(msg.category) }}</text>
          </view>
          <view v-if="!msg.isRead" class="mc-dot" />
        </view>
        <view class="mc-body">
          <view class="mc-top-row">
            <text class="mc-title" :class="{ dim: msg.isRead }">{{ msg.title }}</text>
            <text class="mc-badge">{{ msg.category }}</text>
            <text class="mc-time">{{ msg.time }}</text>
          </view>
          <text class="mc-content" :class="{ dim: msg.isRead }">{{ msg.content }}</text>
        </view>
        <text v-if="msg.isRead" class="mc-check">✓✓</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

type MsgType = 'interaction' | 'system' | 'income'

const activeTab = ref<MsgType>('interaction')
const loading = ref(false)

const tabs = [
  { id: 'interaction' as MsgType, label: '互动消息', icon: '💬' },
  { id: 'system' as MsgType, label: '系统通知', icon: '🔔' },
  { id: 'income' as MsgType, label: '收益提醒', icon: '💰' },
]

const unreadCounts = ref<Record<MsgType, number>>({ interaction: 5, system: 2, income: 1 })

interface Message {
  id: number
  type: MsgType
  title: string
  content: string
  category: string
  time: string
  avatar: boolean
  isRead: boolean
}

const messages = ref<Message[]>([
  { id: 1, type: 'interaction', title: '张大师', content: '评论了你的帖子："这个八字分析很到位"', category: '评论', time: '刚刚', avatar: true, isRead: false },
  { id: 2, type: 'interaction', title: '李明远', content: '赞了你的文章', category: '点赞', time: '3分钟前', avatar: true, isRead: false },
  { id: 3, type: 'interaction', title: '王晓燕', content: '关注了你', category: '关注', time: '10分钟前', avatar: true, isRead: false },
  { id: 4, type: 'interaction', title: '八字命理研习社', content: '有 3 位新成员加入了圈子', category: '加入圈子', time: '1小时前', avatar: true, isRead: true },
  { id: 5, type: 'interaction', title: '陈风水', content: '回复了你的评论："尖角煞确实需要用八卦镜化解"', category: '评论', time: '2小时前', avatar: true, isRead: false },
  { id: 6, type: 'system', title: '系统通知', content: '你的课程《八字入门》已通过审核，可以在平台发布了', category: '课程上新', time: '今天 09:00', avatar: false, isRead: false },
  { id: 7, type: 'system', title: '直播预告', content: '张道源老师将于今晚20:00直播「八字命理进阶技巧」', category: '直播预告', time: '昨天 18:00', avatar: false, isRead: true },
  { id: 8, type: 'system', title: '会员提醒', content: '你的VIP会员将在7天后到期，请及时续费', category: '会员到期', time: '3天前', avatar: false, isRead: false },
  { id: 9, type: 'income', title: '课程收益', content: '课程《八字入门》销售分佣到账 ¥99.00', category: '课程收益', time: '今天 14:30', avatar: false, isRead: false },
  { id: 10, type: 'income', title: '打赏收入', content: '收到用户「易学爱好者」打赏 ¥18.80', category: '打赏收入', time: '昨天 20:15', avatar: false, isRead: true },
  { id: 11, type: 'income', title: '提现通知', content: '提现申请已处理，¥500.00已转入你的微信零钱', category: '提现通知', time: '3天前', avatar: false, isRead: true },
])

const filteredMessages = computed(() => messages.value.filter(m => m.type === activeTab.value))

function getIcon(cat: string) {
  const map: Record<string, string> = { '评论': '💬', '点赞': '❤️', '关注': '➕', '加入圈子': '👥', '课程上新': '📖', '直播预告': '📡', '会员到期': '🔔', '活动通知': '🎁', '课程收益': '💰', '打赏收入': '🎁', '分销收益': '🛍️', '提现通知': '✅' }
  return map[cat] || '🔔'
}

function handleRead(msg: Message) {
  if (!msg.isRead) {
    msg.isRead = true
    unreadCounts.value[msg.type] = Math.max(0, unreadCounts.value[msg.type] - 1)
  }
  uni.navigateTo({ url: '/pages/detail/index?id=' + msg.id })
}

function markAllRead() {
  messages.value.forEach(m => { if (m.type === activeTab.value) m.isRead = true })
  unreadCounts.value[activeTab.value] = 0
}
</script>

<style scoped>
.msg-page { min-height: 100vh; background: #FAF8F5; }
.header-sticky { position: sticky; top: 0; z-index: 30; background: rgba(250,248,245,0.95); backdrop-filter: blur(12rpx); border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; padding: 0 24rpx; height: 88rpx; }
.header-back { font-size: 48rpx; color: #333; width: 64rpx; }
.header-title { font-size: 34rpx; font-weight: 700; color: #2C2C2C; flex: 1; }
.header-action { font-size: 24rpx; color: #C41E3A; }

.tab-row { display: flex; gap: 8rpx; padding: 0 24rpx 14rpx; }
.tab-item { position: relative; flex: 1; display: flex; align-items: center; justify-content: center; gap: 4rpx; padding: 12rpx 0; border-radius: 12rpx; font-size: 22rpx; color: #999; background: #F5F1EB; }
.tab-item.active { background: #C41E3A; color: #fff; }
.tab-icon { font-size: 22rpx; }
.tab-badge { position: absolute; top: -6rpx; right: -6rpx; min-width: 32rpx; height: 32rpx; border-radius: 16rpx; background: #C41E3A; color: #fff; font-size: 18rpx; display: flex; align-items: center; justify-content: center; padding: 0 6rpx; }
.tab-badge.badge-active { background: #fff; color: #C41E3A; }

.msg-list { padding: 12rpx 24rpx; }
.msg-card { display: flex; gap: 14rpx; padding: 18rpx 20rpx; background: #fff; border-radius: 16rpx; margin-bottom: 8rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.msg-card.unread { background: rgba(196,30,58,0.02); border: 1px solid rgba(196,30,58,0.1); }

.mc-left { position: relative; flex-shrink: 0; }
.mc-avatar { width: 72rpx; height: 72rpx; border-radius: 50%; background: #F5F1EB; display: flex; align-items: center; justify-content: center; font-size: 26rpx; color: #999; }
.mc-icon-wrap { width: 72rpx; height: 72rpx; border-radius: 50%; background: #F5F1EB; display: flex; align-items: center; justify-content: center; }
.mc-icon { font-size: 32rpx; }
.mc-dot { position: absolute; top: -2rpx; right: -2rpx; width: 16rpx; height: 16rpx; border-radius: 50%; background: #C41E3A; border: 3rpx solid #fff; }

.mc-body { flex: 1; min-width: 0; }
.mc-top-row { display: flex; align-items: center; gap: 8rpx; }
.mc-title { font-size: 24rpx; font-weight: 500; color: #2C2C2C; }
.mc-title.dim { color: #999; }
.mc-badge { font-size: 16rpx; color: #BBB; padding: 1rpx 8rpx; border: 1px solid #E8E0D5; border-radius: 4rpx; flex-shrink: 0; }
.mc-time { font-size: 18rpx; color: #BBB; margin-left: auto; flex-shrink: 0; }
.mc-content { font-size: 22rpx; color: #666; margin-top: 6rpx; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.mc-content.dim { color: #BBB; }
.mc-check { font-size: 20rpx; color: #DDD; flex-shrink: 0; align-self: center; }

.sk-card { background: #fff; border-radius: 16rpx; padding: 20rpx; margin-bottom: 8rpx; }
.sk-top { display: flex; align-items: center; gap: 14rpx; }
.sk-avatar { width: 72rpx; height: 72rpx; border-radius: 50%; background: #F0EDE5; }
.sk-lines { flex: 1; }
.sk-line { height: 14rpx; background: #F0EDE5; border-radius: 4rpx; margin-bottom: 8rpx; }
.w-40 { width: 40%; } .w-70 { width: 70%; }

.empty-wrap { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 16rpx; }
.empty-text { font-size: 28rpx; color: #999; }
</style>
