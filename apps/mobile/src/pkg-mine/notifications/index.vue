<template>
  <view class="page">
    <!-- 导航栏 -->
    <view class="navbar">
      <view class="nav-left">
        <view class="nav-btn" @click="onBack">
          <app-icon name="arrow-left" :size="20" color="#2c2c2c" />
        </view>
        <text class="nav-title">通知</text>
        <view v-if="unreadTotal > 0" class="unread-badge">
          <text class="unread-badge-text">{{ unreadTotal > 99 ? '99+' : unreadTotal }}</text>
        </view>
      </view>
      <view class="nav-right">
        <view class="nav-btn" @click="handleRefresh">
          <app-icon name="refresh-cw" :size="20" color="#2c2c2c" :class="refreshing ? 'spin' : ''" />
        </view>
        <view class="markall-btn" :class="{ disabled: markAllDisabled }" @click="handleMarkAllRead">
          <app-icon name="check-check" :size="16" :color="markAllDisabled ? '#cccccc' : '#2c2c2c'" />
          <text class="markall-text" :style="{ color: markAllDisabled ? '#cccccc' : '#2c2c2c' }">全部已读</text>
        </view>
      </view>
    </view>

    <!-- 加载骨架屏 -->
    <view v-if="loading" class="skeleton-wrap">
      <view v-for="i in 5" :key="i" class="skel-row">
        <view class="skel-avatar" />
        <view class="skel-content">
          <view class="skel-line w33" />
          <view class="skel-line w100" />
          <view class="skel-line w16" />
        </view>
      </view>
    </view>

    <!-- 空态 -->
    <view v-else-if="notifications.length === 0" class="empty">
      <view class="empty-icon-circle">
        <app-icon name="bell" :size="32" color="#cccccc" />
      </view>
      <text class="empty-text">暂无通知</text>
    </view>

    <!-- 通知列表 -->
    <view v-else class="list">
      <view
        v-for="n in notifications"
        :key="n.id"
        class="notify-item"
        :class="{ unread: !n.isRead }"
        @click="handleMarkRead(n)"
      >
        <view class="notify-icon" :style="{ background: typeColors[n.type].bg }">
          <app-icon :name="getIcon(n.category)" :size="20" :color="typeColors[n.type].color" />
        </view>
        <view class="notify-body">
          <view class="notify-top">
            <view class="notify-title-wrap">
              <text class="notify-title" :style="{ color: n.isRead ? '#999999' : '#2c2c2c' }">{{ n.title }}</text>
              <view v-if="!n.isRead" class="red-dot" />
            </view>
            <text class="notify-time">{{ n.time }}</text>
          </view>
          <text class="notify-content" :style="{ color: n.isRead ? '#999999' : '#2c2c2c' }">{{ n.content }}</text>
          <view class="notify-cat">
            <text class="notify-cat-text">{{ n.category }}</text>
          </view>
        </view>
      </view>

      <!-- 底部提示 -->
      <view class="list-end">
        <text class="list-end-text">已显示全部通知</text>
      </view>
    </view>

    <!-- toast -->
    <view v-if="toastMsg" class="toast">
      <text class="toast-text">{{ toastMsg }}</text>
    </view>
  </view>

  </view>
  </view>
  </view>
  </view>
  </view>
</template>

<script>
const MOCK_MESSAGES = [
  { id: 1, type: 'interaction', category: '评论', title: '张三清', content: '回复了你的文章《八字入门：如何看懂自己的命盘》：写得太好了，受益匪浅！', time: '5分钟前', isRead: false, link: '/article/1' },
  { id: 2, type: 'interaction', category: '点赞', title: '李易道', content: '赞了你的文章《八字入门：如何看懂自己的命盘》', time: '15分钟前', isRead: false, link: '/article/1' },
  { id: 3, type: 'interaction', category: '关注', title: '王玄机', content: '关注了你', time: '1小时前', isRead: true, link: '/profile/123' },
  { id: 4, type: 'interaction', category: '评论', title: '赵明远', content: '在你的直播间留言：老师讲得很细致，期待下次直播！', time: '2小时前', isRead: true, link: '/live/1' },
  { id: 5, type: 'interaction', category: '加入圈子', title: '陈国学', content: '加入了你的圈子「八字命理研习社」', time: '3小时前', isRead: true, link: '/circle/1' },
  { id: 6, type: 'system', category: '课程上新', title: '新课程上线', content: '您关注的讲师「易学大师」发布了新课程《紫微斗数进阶实战》', time: '30分钟前', isRead: false, link: '/course/2' },
  { id: 7, type: 'system', category: '直播预告', title: '直播即将开始', content: '您预约的直播「八字看财运专题」将在30分钟后开始', time: '1小时前', isRead: false, link: '/live/3' },
  { id: 8, type: 'system', category: '会员到期', title: '会员即将到期', content: '您的VIP会员将于3天后到期，续费可享8折优惠', time: '1天前', isRead: true, link: '/profile' },
  { id: 9, type: 'system', category: '活动通知', title: '限时活动', content: '双十一大促：全场课程5折起，古籍电子书买一送一', time: '2天前', isRead: true, link: '/discover' },
  { id: 10, type: 'income', category: '课程收益', title: '课程销售收入', content: '您的课程《八字入门精讲》被购买，获得收益 ¥89.00', time: '10分钟前', isRead: false, link: '/manage/income' },
  { id: 11, type: 'income', category: '打赏收入', title: '直播打赏', content: '用户「张三清」在直播间打赏了您 66 国学币', time: '2小时前', isRead: false, link: '/manage/income' },
  { id: 12, type: 'income', category: '分销收益', title: '推广佣金到账', content: '您推广的课程产生订单，获得佣金 ¥12.50', time: '5小时前', isRead: true, link: '/manage/income' },
  { id: 13, type: 'income', category: '提现通知', title: '提现成功', content: '您申请的提现 ¥500.00 已到账，请查收', time: '1天前', isRead: true, link: '/profile' },
  { id: 14, type: 'transaction', category: '订单', title: '订单支付成功', content: '您已成功购买课程《八字命理精讲》，订单号：2026060312345', time: '20分钟前', isRead: false, link: '/orders/12345' },
  { id: 15, type: 'transaction', category: '订单', title: '订单已发货', content: '您购买的《周易全解》已发货，物流单号：SF1234567890', time: '2小时前', isRead: false, link: '/orders/12346' },
  { id: 16, type: 'transaction', category: '退款', title: '退款成功', content: '您申请的退款已处理完成，¥99.00已原路退回', time: '1天前', isRead: true, link: '/orders/12340' },
  { id: 17, type: 'service', category: '客服', title: '客服回复', content: '您咨询的问题已得到回复，请查看详情', time: '10分钟前', isRead: false, link: '/customer-service' },
  { id: 18, type: 'service', category: '工单', title: '工单处理中', content: '您提交的工单【#2026060001】正在处理中，预计24小时内回复', time: '3小时前', isRead: true, link: '/feedback/detail/2026060001' },
]

const ICON_MAP = {
  '评论': 'message-circle',
  '点赞': 'heart',
  '关注': 'user-plus',
  '加入圈子': 'user-plus',
  '课程上新': 'gift',
  '直播预告': 'megaphone',
  '会员到期': 'alert-circle',
  '活动通知': 'gift',
  '课程收益': 'credit-card',
  '打赏收入': 'gift',
  '分销收益': 'credit-card',
  '提现通知': 'credit-card',
  '订单': 'shopping-bag',
  '退款': 'credit-card',
  '客服': 'headphones',
  '工单': 'headphones',
}

import { goBack, navigateTo } from '@/utils/router'

export default {
  data() {
    return {
      notifications: [],
      loading: true,
      refreshing: false,
      markingAllRead: false,
      toastMsg: '',
      typeColors: {
        interaction: { bg: '#dbeafe', color: '#2563eb' },
        system: { bg: '#fef3c7', color: '#d97706' },
        income: { bg: '#dcfce7', color: '#16a34a' },
        transaction: { bg: '#f3e8ff', color: '#9333ea' },
        service: { bg: '#ffe4e6', color: '#e11d48' },
      },
    }
  },
  computed: {
    unreadTotal() {
      return this.notifications.filter((n) => !n.isRead).length
    },
    markAllDisabled() {
      return this.markingAllRead || this.unreadTotal === 0
    },
  },
  onLoad() {
    this.fetchNotifications()
  },
  methods: {
    fetchNotifications(showRefreshing) {
      if (showRefreshing) this.refreshing = true
      else this.loading = true
      setTimeout(() => {
        this.notifications = JSON.parse(JSON.stringify(MOCK_MESSAGES))
        this.loading = false
        this.refreshing = false
      }, 500)
    },
    getIcon(category) {
      return ICON_MAP[category] || 'bell'
    },
    handleMarkRead(n) {
      if (!n.isRead) {
        n.isRead = true
      }
      if (n.link) {
        navigateTo(n.link)
      }
    },
    handleMarkAllRead() {
      if (this.markAllDisabled) return
      this.markingAllRead = true
      setTimeout(() => {
        this.notifications.forEach((n) => { n.isRead = true })
        this.markingAllRead = false
        this.showToast('已全部标记为已读')
      }, 300)
    },
    handleRefresh() {
      if (this.refreshing) return
      this.fetchNotifications(true)
    },
    showToast(msg) {
      this.toastMsg = msg
      setTimeout(() => { this.toastMsg = '' }, 2000)
    },
    onBack() {
      goBack()
    },
  },
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #faf8f5;
}

/* 导航栏 */
.navbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 112rpx;
  padding: 0 16rpx 0 8rpx;
  background: #faf8f5;
  border-bottom: 1rpx solid #e8e3db;
}
.nav-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.nav-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.unread-badge {
  min-width: 36rpx;
  height: 36rpx;
  padding: 0 10rpx;
  border-radius: 999rpx;
  background: #ff4d4f;
  display: flex;
  align-items: center;
  justify-content: center;
}
.unread-badge-text {
  font-size: 22rpx;
  color: #ffffff;
  line-height: 1;
}
.nav-right {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.markall-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 10rpx 14rpx;
}
.markall-text {
  font-size: 26rpx;
}
.markall-btn.disabled {
  opacity: 0.6;
}
.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 骨架屏 */
.skeleton-wrap {
  padding: 16rpx;
}
.skel-row {
  display: flex;
  gap: 24rpx;
  margin-bottom: 32rpx;
}
.skel-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: #ece7df;
  flex-shrink: 0;
}
.skel-content {
  flex: 1;
}
.skel-line {
  height: 28rpx;
  border-radius: 8rpx;
  background: #ece7df;
  margin-bottom: 16rpx;
}
.skel-line.w33 { width: 33%; }
.skel-line.w100 { width: 100%; }
.skel-line.w16 { width: 120rpx; }

/* 空态 */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 200rpx;
}
.empty-icon-circle {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  background: #f5f1eb;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
}
.empty-text {
  font-size: 28rpx;
  color: #999999;
}

/* 列表 */
.list {
  display: flex;
  flex-direction: column;
}
.notify-item {
  display: flex;
  gap: 24rpx;
  padding: 32rpx;
  border-bottom: 1rpx solid #e8e3db;
}
.notify-item.unread {
  background: rgba(196, 30, 58, 0.05);
}
.notify-icon {
  flex-shrink: 0;
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.notify-body {
  flex: 1;
  min-width: 0;
}
.notify-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}
.notify-title-wrap {
  display: flex;
  align-items: center;
  gap: 12rpx;
  min-width: 0;
}
.notify-title {
  font-size: 28rpx;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.red-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: #ff4d4f;
  flex-shrink: 0;
}
.notify-time {
  font-size: 22rpx;
  color: #999999;
  flex-shrink: 0;
}
.notify-content {
  font-size: 26rpx;
  line-height: 1.5;
  margin-top: 6rpx;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.notify-cat {
  display: inline-flex;
  align-self: flex-start;
  margin-top: 16rpx;
  padding: 4rpx 12rpx;
  background: #f5f1eb;
  border-radius: 8rpx;
}
.notify-cat-text {
  font-size: 22rpx;
  color: #666666;
}
.list-end {
  padding: 64rpx 0;
  text-align: center;
}
.list-end-text {
  font-size: 26rpx;
  color: #999999;
}

/* toast */
.toast {
  position: fixed;
  bottom: 120rpx;
  left: 50%;
  transform: translateX(-50%);
  padding: 20rpx 40rpx;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 12rpx;
  z-index: 100;
}
.toast-text {
  font-size: 26rpx;
  color: #ffffff;
}
</style>
