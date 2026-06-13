<template>
  <view class="notif-page">
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <text class="header-title">通知</text>
        <view v-if="unreadCount > 0" class="unread-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</view>
      </view>
      <view class="header-actions">
        <text class="ha-refresh" :class="{ spin: refreshing }" @click="fetchNotifications">🔄</text>
        <text class="ha-all-read" :class="{ off: unreadCount === 0 }" @click="markAllRead">全部已读</text>
      </view>
    </view>

    <!-- 骨架屏 -->
    <view v-if="loading" class="load-area">
      <view v-for="i in 5" :key="i" class="sk-item">
        <view class="sk-avatar" />
        <view class="sk-content">
          <view class="sk-line w50" />
          <view class="sk-line w80" />
          <view class="sk-line w30" />
        </view>
      </view>
    </view>

    <!-- 空态 -->
    <view v-else-if="notifications.length === 0" class="empty-wrap">
      <text class="empty-icon">🔔</text>
      <text class="empty-title">暂无通知</text>
      <text class="empty-desc">有新的消息时会在这里显示</text>
    </view>

    <!-- 通知列表 -->
    <view v-else class="notif-list">
      <view
        v-for="n in notifications"
        :key="n.id"
        class="notif-card"
        :class="{ unread: !n.isRead }"
        @click="handleClick(n)"
      >
        <view class="nc-avatar" :class="typeColorClass(n.type)">
          <text class="nc-icon">{{ typeIcon(n.category) }}</text>
        </view>
        <view class="nc-body">
          <view class="nc-top">
            <text class="nc-title">{{ n.title }}</text>
            <view v-if="!n.isRead" class="nc-dot" />
          </view>
          <text class="nc-content">{{ n.content }}</text>
          <view class="nc-bottom">
            <text class="nc-category">{{ n.category }}</text>
            <text class="nc-time">{{ n.time }}</text>
          </view>
        </view>
      </view>

      <!-- 底部提示 -->
      <view class="notif-end">
        <text class="end-text">已显示全部通知</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Notification {
  id: number
  type: 'interaction' | 'system' | 'income' | 'transaction' | 'service'
  title: string
  content: string
  category: string
  time: string
  isRead: boolean
  link?: string
}

const loading = ref(false)
const refreshing = ref(false)

const notifications = ref<Notification[]>([
  { id: 1, type: 'interaction', title: '张玄风 赞了你的评论', content: '八字入门课程的评论收到了新的点赞', category: '点赞', time: '5分钟前', isRead: false },
  { id: 2, type: 'system', title: '欢迎加入国学平台', content: '平台全新改版上线，快来体验新功能吧', category: '系统通知', time: '1小时前', isRead: false },
  { id: 3, type: 'interaction', title: '李明远 回复了你的帖子', content: '在"八字命理交流"帖子中回复了你：\"天干五合确实需要...\"', category: '评论', time: '2小时前', isRead: true },
  { id: 4, type: 'transaction', title: '订单已发货', content: '您购买的《渊海子平》精装典藏版已发货，点击查看物流信息', category: '订单', time: '昨天', isRead: true, link: '/pages/orders/logistics/index' },
  { id: 5, type: 'system', title: '签到提醒', content: '您已连续签到7天，快来领取额外奖励积分吧', category: '活动通知', time: '昨天', isRead: true },
  { id: 6, type: 'income', title: '课程收益到账', content: '您的课程"八字入门公开课"本月收益已到账 ¥1,280.00', category: '课程收益', time: '3天前', isRead: true },
  { id: 7, type: 'service', title: '反馈处理完成', content: '您在3月15日提交的反馈问题已处理完成，请查看详情', category: '客服', time: '5天前', isRead: true },
  { id: 8, type: 'interaction', title: '王易山 关注了你', content: '关注了你，你们可以开始交流了', category: '关注', time: '1周前', isRead: true },
])

const unreadCount = computed(() => notifications.value.filter(n => !n.isRead).length)

function typeColorClass(type: string) {
  const m: Record<string, string> = {
    interaction: 'avatar-blue',
    system: 'avatar-amber',
    income: 'avatar-green',
    transaction: 'avatar-purple',
    service: 'avatar-rose',
  }
  return m[type] || 'avatar-amber'
}

function typeIcon(category: string) {
  const m: Record<string, string> = {
    '评论': '💬', '点赞': '❤️', '关注': '👤', '课程上新': '🎁',
    '直播预告': '📢', '会员到期': '⚠️', '活动通知': '🎉',
    '课程收益': '💰', '打赏收入': '🎁', '分销收益': '💵',
    '提现通知': '💳', '订单': '📦', '退款': '💳',
    '客服': '🎧', '工单': '📋', '系统通知': '🔔',
  }
  return m[category] || '🔔'
}

function handleClick(n: Notification) {
  if (!n.isRead) { n.isRead = true }
  if (n.link) { uni.navigateTo({ url: n.link }) }
}

function markAllRead() {
  notifications.value.forEach(n => { n.isRead = true })
  uni.showToast({ title: '已全部标记为已读', icon: 'success' })
}

function fetchNotifications() {
  refreshing.value = true
  setTimeout(() => { refreshing.value = false }, 800)
}
</script>

<style scoped>
.notif-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 60rpx; }
.header-sticky { position: sticky; top: 0; z-index: 30; background: rgba(250,248,245,0.95); backdrop-filter: blur(12rpx); border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; padding: 0 24rpx; height: 88rpx; }
.header-back { font-size: 48rpx; color: #333; width: 64rpx; }
.header-title { font-size: 34rpx; font-weight: 700; color: #2C2C2C; }
.unread-badge { font-size: 20rpx; color: #fff; background: #C41E3A; padding: 2rpx 12rpx; border-radius: 16rpx; margin-left: 12rpx; }
.header-actions { display: flex; justify-content: flex-end; align-items: center; gap: 20rpx; padding: 8rpx 24rpx 12rpx; }
.ha-refresh { font-size: 32rpx; padding: 4rpx; }
.ha-refresh.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.ha-all-read { font-size: 24rpx; color: #C41E3A; }
.ha-all-read.off { color: #CCC; }

.load-area { padding: 24rpx; }
.sk-item { display: flex; gap: 20rpx; padding: 20rpx; background: #fff; border-radius: 16rpx; margin-bottom: 16rpx; }
.sk-avatar { width: 80rpx; height: 80rpx; border-radius: 50%; background: #F2EFEA; flex-shrink: 0; }
.sk-content { flex: 1; display: flex; flex-direction: column; gap: 12rpx; }
.sk-line { height: 28rpx; background: #F2EFEA; border-radius: 6rpx; }
.w50 { width: 50%; }
.w80 { width: 80%; }
.w30 { width: 30%; }

.empty-wrap { display: flex; flex-direction: column; align-items: center; padding: 160rpx 48rpx; }
.empty-icon { font-size: 96rpx; margin-bottom: 24rpx; }
.empty-title { font-size: 32rpx; font-weight: 500; color: #2C2C2C; margin-bottom: 8rpx; }
.empty-desc { font-size: 26rpx; color: #999; }

.notif-list { padding: 8rpx 0; }
.notif-card { display: flex; gap: 16rpx; padding: 20rpx 24rpx; }
.notif-card.unread { background: rgba(196,30,58,0.02); }
.nc-avatar { width: 80rpx; height: 80rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.nc-icon { font-size: 36rpx; }
.avatar-blue { background: rgba(74,144,217,0.1); }
.avatar-amber { background: rgba(201,169,110,0.12); }
.avatar-green { background: rgba(82,196,26,0.1); }
.avatar-purple { background: rgba(114,46,209,0.08); }
.avatar-rose { background: rgba(196,30,58,0.06); }

.nc-body { flex: 1; min-width: 0; }
.nc-top { display: flex; justify-content: space-between; align-items: center; }
.nc-title { font-size: 28rpx; font-weight: 500; color: #333; }
.nc-dot { width: 14rpx; height: 14rpx; border-radius: 50%; background: #C41E3A; flex-shrink: 0; }
.nc-content { font-size: 24rpx; color: #777; margin-top: 8rpx; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.5; }
.nc-bottom { display: flex; justify-content: space-between; align-items: center; margin-top: 12rpx; }
.nc-category { font-size: 20rpx; color: #999; background: #F5F1EB; padding: 2rpx 12rpx; border-radius: 8rpx; }
.nc-time { font-size: 20rpx; color: #999; }

.notif-end { padding: 40rpx 0; text-align: center; }
.end-text { font-size: 24rpx; color: #CCC; }
</style>
