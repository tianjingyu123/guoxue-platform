<template>
  <view class="profile-page">
    <!-- 顶部个人信息区 -->
    <view class="header-area">
      <view class="header-bg" />
      <view class="header-top">
        <view class="top-left" @click="goPage('/pages/common/scan/index')">
          <text class="top-icon">📷</text>
        </view>
        <view class="top-right">
          <view class="notify-btn" @click="goPage('/pages/messages/index')">
            <text class="top-icon">🔔</text>
            <view v-if="unreadCount > 0" class="notify-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</view>
          </view>
          <view class="settings-btn" @click="goPage('/pages/mine/settings/index')">
            <text class="top-icon">⚙</text>
          </view>
        </view>
      </view>

      <!-- 用户信息 -->
      <view class="user-info">
        <view class="user-avatar" @click="goPage('/pages/mine/edit-profile/index')">
          <image v-if="user.avatar" :src="user.avatar" class="avatar-img" mode="aspectFill" />
          <view v-else class="avatar-placeholder">{{ user.name?.charAt(0) || '👤' }}</view>
        </view>
        <view class="user-detail">
          <text class="greeting">{{ greeting }}，{{ user.name }}</text>
          <view class="name-row">
            <text class="user-name">{{ user.name }}</text>
            <text v-if="user.isVerified" class="verify-icon">🛡</text>
            <view v-if="user.isVip" class="vip-badge">
              <text class="vip-text">👑 {{ user.vipLevel }}</text>
            </view>
          </view>
          <view class="stats-row">
            <text class="stat-item" @click="goPage('/pages/follows/index?tab=following')">
              <text class="stat-num">{{ user.following }}</text> 关注
            </text>
            <text class="stat-divider">|</text>
            <text class="stat-item" @click="goPage('/pages/follows/index?tab=followers')">
              <text class="stat-num">{{ user.followers }}</text> 粉丝
            </text>
            <text class="stat-divider">|</text>
            <text class="stat-item" @click="goPage('/pages/likes/index')">
              <text class="stat-num">{{ user.likes }}</text> 获赞
            </text>
          </view>
          <view class="edit-btn" @click="goPage('/pages/mine/edit-profile/index')">
            <text>✏ 编辑资料</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 资产区 -->
    <view class="asset-card">
      <view class="asset-row">
        <view class="asset-item" @click="goPage('/pages/wallet/index')">
          <text class="asset-icon">🪙</text>
          <text class="asset-num">{{ user.coins }}</text>
          <text class="asset-label">国学币</text>
        </view>
        <view class="asset-item" @click="goPage('/pages/coupons/index')">
          <text class="asset-icon">🎫</text>
          <text class="asset-num">{{ user.coupons }}</text>
          <text class="asset-label">优惠券</text>
        </view>
        <view class="asset-item" @click="goPage('/pages/points/index')">
          <text class="asset-icon">⭐</text>
          <text class="asset-num">{{ user.points }}</text>
          <text class="asset-label">积分</text>
        </view>
      </view>
    </view>

    <!-- Loading / Error -->
    <view v-if="loading" class="load-area">
      <LoadingSkeleton v-for="i in 3" :key="i" type="card" />
    </view>

    <view v-else-if="err" class="err-area">
      <EmptyState icon="📡" title="加载失败" :description="err" action-text="重试" @action="fetchProfile" />
    </view>

    <view v-else>
      <!-- 订单区 -->
      <view class="section-card">
        <view class="card-header">
          <text class="card-title">我的订单</text>
          <text class="card-more" @click="goPage('/pages/orders/index')">查看全部 ›</text>
        </view>
        <view class="order-grid">
          <view v-for="o in orderItems" :key="o.key" class="order-item" @click="goPage(o.href)">
            <text class="order-icon">{{ o.icon }}</text>
            <text class="order-label">{{ o.label }}</text>
            <view v-if="o.count > 0" class="order-badge">{{ o.count }}</view>
          </view>
        </view>
      </view>

      <!-- 常用功能 -->
      <view class="section-card">
        <view class="card-header">
          <text class="card-title">常用功能</text>
        </view>
        <view class="func-grid">
          <view v-for="f in quickFunctions" :key="f.label" class="func-item" @click="goPage(f.href)">
            <view class="func-icon-wrap">
              <text class="func-icon">{{ f.icon }}</text>
            </view>
            <text class="func-label">{{ f.label }}</text>
          </view>
        </view>
      </view>

      <!-- 身份切换 -->
      <view v-if="user.roles?.length" class="section-card">
        <view class="card-header">
          <text class="card-title">身份切换</text>
        </view>
        <view class="role-list">
          <view v-for="role in user.roles" :key="role.type" class="role-item" @click="goPage(role.href)">
            <view class="role-icon-wrap">
              <text>{{ role.icon }}</text>
            </view>
            <view class="role-info">
              <text class="role-label">{{ role.label }}</text>
              <text class="role-name">{{ role.name }}</text>
            </view>
            <text class="role-arrow">›</text>
          </view>
        </view>
      </view>

      <!-- 签到入口 -->
      <view class="checkin-card" @click="goPage('/pages/check-in/index')" v-if="showCheckIn">
        <view class="checkin-icon-wrap">
          <text class="checkin-icon">📅</text>
        </view>
        <view class="checkin-info">
          <view class="checkin-title-row">
            <text class="checkin-title">每日签到</text>
            <view v-if="checkInDone" class="checkin-done">已签到</view>
            <view v-else class="checkin-todo">待签到</view>
          </view>
          <text class="checkin-sub">
            已连续签到 <text class="hl-red">{{ checkInDays }}</text> 天，累计 <text class="hl-gold">{{ checkInPoints }}</text> 积分
          </text>
        </view>
        <text class="checkin-arrow">›</text>
      </view>

      <!-- 继续学习 -->
      <view v-if="continueCourse" class="continue-card" @click="goPage(`/pages/courses/id-learn/index?id=${continueCourse.id}`)">
        <view class="continue-cover">
          <text class="continue-cover-icon">▶</text>
        </view>
        <view class="continue-info">
          <text class="continue-label">继续学习</text>
          <text class="continue-title">{{ continueCourse.title }}</text>
          <text class="continue-lesson">{{ continueCourse.lastLesson }}</text>
        </view>
        <view class="continue-progress">
          <text class="progress-pct">{{ continueCourse.progress }}%</text>
          <view class="progress-bar">
            <view class="progress-fill" :style="{ width: continueCourse.progress + '%' }" />
          </view>
        </view>
      </view>

      <!-- 猜你喜欢 -->
      <view class="section rec-section">
        <view class="rec-header">
          <text class="card-title">猜你喜欢</text>
          <text class="card-more" @click="goPage('/pages/discover/index')">更多 ›</text>
        </view>
        <scroll-view scroll-x class="rec-scroll" :show-scrollbar="false">
          <view class="rec-row">
            <view v-for="item in recommendations" :key="item.id" class="rec-card" @click="goRecDetail(item)">
              <view class="rec-cover">
                <text class="rec-cover-icon">{{ item.type === 'course' ? '🎓' : '🛍' }}</text>
                <view v-if="item.tag" class="rec-tag">{{ item.tag }}</view>
              </view>
              <text class="rec-title">{{ item.title }}</text>
              <view class="rec-price-row">
                <text class="rec-price">¥{{ item.price }}</text>
                <text class="rec-original">¥{{ item.originalPrice }}</text>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- VIP到期提醒 -->
    <view v-if="showVipWarning" class="vip-warning">
      <view class="vip-warn-card">
        <text class="vip-warn-icon">👑</text>
        <text class="vip-warn-text">会员还剩 {{ user.vipDaysLeft }} 天到期</text>
        <text class="vip-warn-btn" @click="goPage('/pages/vip/index')">立即续费</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'
import { memberApi } from '../../api'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'

interface RoleItem { type: string; label: string; name: string; icon: string; href: string }

interface UserInfo {
  name: string; avatar?: string; bio?: string; isVip: boolean; vipLevel?: string
  vipDaysLeft: number; isVerified: boolean; roles: RoleItem[]
  following: number; followers: number; likes: number
  coins: number; coupons: number; points: number
  orders: { pending: number; shipped: number; received: number; refund: number }
}

const loading = ref(true)
const err = ref<string | null>(null)

const user = ref<UserInfo>({
  name: '', avatar: '', bio: '', isVip: false, vipLevel: '',
  vipDaysLeft: 0, isVerified: false, roles: [],
  following: 0, followers: 0, likes: 0,
  coins: 0, coupons: 0, points: 0,
  orders: { pending: 0, shipped: 0, received: 0, refund: 0 },
})

const checkInDone = ref(false)
const checkInDays = ref(0)
const checkInPoints = ref(0)
const continueCourse = ref<any>(null)
const recommendations = ref<any[]>([])

const unreadCount = computed(() => 0)

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})

const showCheckIn = computed(() => true)
const showVipWarning = computed(() => user.value.isVip && user.value.vipDaysLeft <= 30 && user.value.vipDaysLeft > 0)

const orderItems = computed(() => [
  { key: 'pending', label: '待付款', icon: '💰', count: user.value.orders.pending, href: '/pages/orders/index?status=pending' },
  { key: 'shipped', label: '待发货', icon: '📦', count: user.value.orders.shipped, href: '/pages/orders/index?status=shipped' },
  { key: 'received', label: '待收货', icon: '🚚', count: user.value.orders.received, href: '/pages/orders/index?status=received' },
  { key: 'refund', label: '售后', icon: '🔄', count: user.value.orders.refund, href: '/pages/orders/index?status=refund' },
])

const quickFunctions = [
  { icon: '🧭', label: '排盘记录', href: '/pages/paipan/history/index' },
  { icon: '📚', label: '我的课程', href: '/pages/learning/index' },
  { icon: '👥', label: '我的圈子', href: '/pages/my-circles/index' },
  { icon: '📝', label: '我的笔记', href: '/pages/notes/index' },
  { icon: '❤️', label: '我的收藏', href: '/pages/favorites/index' },
  { icon: '📖', label: '我的电子书', href: '/pages/downloads/index' },
  { icon: '🕐', label: '浏览历史', href: '/pages/history/index' },
  { icon: '❓', label: '帮助中心', href: '/pages/help/index' },
]

async function fetchProfile() {
  loading.value = true; err.value = null
  try {
    // @ts-ignore
    const data = await memberApi.profile() as any
    if (data) {
      user.value = {
        name: data.name || data.nickname || '',
        avatar: data.avatar,
        bio: data.bio || '',
        isVip: data.isVip || false,
        vipLevel: data.vipLevel || '会员',
        vipDaysLeft: data.vipDaysLeft || 0,
        isVerified: data.isVerified || false,
        roles: (data.roles || []).map((r: any) => ({
          type: r.type,
          label: r.label || r.name,
          name: r.name || '',
          icon: roleIcon(r.type),
          href: roleHref(r.type, r.id),
        })),
        following: data.following || data.stats?.following || 0,
        followers: data.followers || data.stats?.followers || 0,
        likes: data.likes || data.stats?.likes || 0,
        coins: data.coins || 0,
        coupons: data.coupons || 0,
        points: data.points || 0,
        orders: {
          pending: data.ordersPending || data.orders?.pending || 0,
          shipped: data.ordersShipped || data.orders?.shipped || 0,
          received: data.ordersReceived || data.orders?.received || 0,
          refund: data.ordersRefund || data.orders?.refund || 0,
        },
      }
      checkInDone.value = data.checkInDone || false
      checkInDays.value = data.checkInDays || 0
      checkInPoints.value = data.checkInPoints || 0
      continueCourse.value = data.continueCourse || null
      recommendations.value = data.recommendations || []
    }
  } catch (e: any) { err.value = e.errMsg || '加载失败' }
  finally { loading.value = false }
}

function roleIcon(type: string) {
  const map: Record<string, string> = { circle_owner: '👑', teacher: '🎓', station_owner: '🏆', streamer: '📡', creator: '🎬' }
  return map[type] || '👤'
}

function roleHref(type: string, id: number) {
  const map: Record<string, string> = {
    circle_owner: `/pages/circle/id-settings/index?id=${id}`,
    teacher: '/pages/manage/my-courses/index',
    streamer: '/pages/creator/live/console/index',
    creator: '/pages/videos/creator/index',
  }
  return map[type] || '/pages/profile/index'
}

function goPage(url: string) { uni.navigateTo({ url }) }
function goRecDetail(item: any) {
  if (item.type === 'course') {
    uni.navigateTo({ url: `/pages/course/id/index?id=${item.id}` })
  } else {
    uni.navigateTo({ url: `/pages/mall/product/id-detail/index?id=${item.id}` })
  }
}

onMounted(() => { fetchProfile() })
onPullDownRefresh(() => {
  fetchProfile().finally(() => setTimeout(() => uni.stopPullDownRefresh(), 500))
})
</script>

<style scoped>
.profile-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 140rpx; }

.header-area { position: relative; }
.header-bg {
  position: absolute; inset: 0; height: 320rpx;
  background: linear-gradient(180deg, #F5F1EB, #FAF8F5);
}
.header-top {
  position: relative; display: flex; justify-content: space-between;
  padding: 64rpx 24rpx 0;
}
.top-left, .top-right { display: flex; gap: 16rpx; }
.notify-btn { position: relative; }
.top-icon { font-size: 36rpx; padding: 12rpx; }
.notify-badge {
  position: absolute; top: 2rpx; right: 2rpx;
  min-width: 32rpx; height: 32rpx; border-radius: 16rpx;
  background: #C41E3A; color: #fff; font-size: 18rpx;
  display: flex; align-items: center; justify-content: center;
}

.user-info {
  position: relative; display: flex; gap: 24rpx;
  padding: 24rpx 24rpx 20rpx;
}
.user-avatar { position: relative; flex-shrink: 0; }
.avatar-img {
  width: 140rpx; height: 140rpx; border-radius: 50%;
  border: 4rpx solid #fff; box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.1);
}
.avatar-placeholder {
  width: 140rpx; height: 140rpx; border-radius: 50%;
  border: 4rpx solid #fff; box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.1);
  background: linear-gradient(135deg, #C41E3A, #A01830);
  display: flex; align-items: center; justify-content: center;
  font-size: 56rpx; color: #fff;
}

.user-detail { flex: 1; padding-top: 4rpx; }
.greeting { font-size: 22rpx; color: #999; }
.name-row { display: flex; align-items: center; gap: 8rpx; margin-top: 4rpx; }
.user-name { font-size: 36rpx; font-weight: 700; color: #2C2C2C; }
.verify-icon { font-size: 28rpx; }
.vip-badge {
  background: linear-gradient(135deg, #C9A96E, #D4B87D);
  border-radius: 12rpx; padding: 2rpx 10rpx;
}
.vip-text { font-size: 18rpx; color: #fff; }

.stats-row { display: flex; align-items: center; gap: 16rpx; margin-top: 10rpx; }
.stat-item { font-size: 22rpx; color: #999; }
.stat-num { font-size: 28rpx; font-weight: 700; color: #2C2C2C; }
.stat-divider { color: #DDD; font-size: 20rpx; }

.edit-btn {
  margin-top: 12rpx; display: inline-flex; align-items: center;
  padding: 6rpx 20rpx; border-radius: 24rpx; border: 1px solid #DDD;
  background: #fff; font-size: 22rpx; color: #666;
}

/* 资产卡片 */
.asset-card {
  margin: 0 24rpx; background: linear-gradient(135deg, #FAF8F5, #F8F4EC);
  border: 1px solid rgba(201,169,110,0.2); border-radius: 20rpx; padding: 28rpx 0;
}
.asset-row { display: grid; grid-template-columns: repeat(3, 1fr); }
.asset-item { display: flex; flex-direction: column; align-items: center; }
.asset-icon { font-size: 36rpx; }
.asset-num { font-size: 40rpx; font-weight: 700; color: #C9A96E; margin: 4rpx 0; }
.asset-label { font-size: 22rpx; color: #999; }

/* 区块卡片 */
.section-card {
  margin: 24rpx; background: #fff; border-radius: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); overflow: hidden;
}
.card-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 24rpx 24rpx 0;
}
.card-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.card-more { font-size: 22rpx; color: #C9A96E; }

.order-grid { display: grid; grid-template-columns: repeat(4, 1fr); padding: 20rpx 0; }
.order-item { display: flex; flex-direction: column; align-items: center; gap: 8rpx; position: relative; }
.order-icon { font-size: 36rpx; }
.order-label { font-size: 22rpx; color: #333; }
.order-badge {
  position: absolute; top: 0; right: 32rpx;
  min-width: 32rpx; height: 32rpx; border-radius: 16rpx;
  background: #C41E3A; color: #fff; font-size: 18rpx;
  display: flex; align-items: center; justify-content: center;
}

.func-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24rpx 0; padding: 24rpx 0; }
.func-item { display: flex; flex-direction: column; align-items: center; gap: 10rpx; }
.func-icon-wrap {
  width: 80rpx; height: 80rpx; border-radius: 20rpx;
  background: #F5F1EB; display: flex; align-items: center; justify-content: center;
}
.func-icon { font-size: 36rpx; }
.func-label { font-size: 22rpx; color: #333; }

/* 身份切换 */
.role-list { padding: 16rpx 24rpx 24rpx; }
.role-item {
  display: flex; align-items: center; gap: 16rpx;
  padding: 16rpx; border-radius: 16rpx; border: 1px solid #F0EDE5;
  margin-bottom: 12rpx;
}
.role-icon-wrap { font-size: 32rpx; width: 64rpx; text-align: center; }
.role-info { flex: 1; min-width: 0; }
.role-label { font-size: 26rpx; font-weight: 500; color: #333; display: block; }
.role-name { font-size: 20rpx; color: #999; }
.role-arrow { font-size: 36rpx; color: #CCC; }

/* 签到 */
.checkin-card {
  margin: 24rpx; display: flex; align-items: center; gap: 16rpx;
  padding: 24rpx; border-radius: 20rpx;
  background: linear-gradient(135deg, rgba(196,30,58,0.05), rgba(201,169,110,0.05));
  border: 1px solid rgba(196,30,58,0.15);
}
.checkin-icon-wrap {
  width: 80rpx; height: 80rpx; border-radius: 20rpx;
  background: linear-gradient(135deg, #C41E3A, #C9A96E);
  display: flex; align-items: center; justify-content: center;
}
.checkin-icon { font-size: 36rpx; }
.checkin-info { flex: 1; }
.checkin-title-row { display: flex; align-items: center; gap: 12rpx; }
.checkin-title { font-size: 28rpx; font-weight: 500; color: #333; }
.checkin-done {
  font-size: 18rpx; color: #52C41A; background: rgba(82,196,26,0.1);
  padding: 2rpx 12rpx; border-radius: 8rpx;
}
.checkin-todo {
  font-size: 18rpx; color: #fff; background: #C41E3A;
  padding: 2rpx 12rpx; border-radius: 8rpx;
}
.checkin-sub { font-size: 22rpx; color: #999; margin-top: 4rpx; }
.hl-red { color: #C41E3A; font-weight: 600; }
.hl-gold { color: #C9A96E; font-weight: 600; }
.checkin-arrow { font-size: 40rpx; color: #CCC; }

/* 继续学习 */
.continue-card {
  margin: 0 24rpx 24rpx; display: flex; align-items: center; gap: 16rpx;
  padding: 24rpx; border-radius: 20rpx; background: #fff;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04);
}
.continue-cover {
  width: 120rpx; height: 90rpx; border-radius: 16rpx;
  background: linear-gradient(135deg, rgba(196,30,58,0.1), rgba(201,169,110,0.1));
  display: flex; align-items: center; justify-content: center;
}
.continue-cover-icon { font-size: 36rpx; color: #C41E3A; }
.continue-info { flex: 1; min-width: 0; }
.continue-label { font-size: 20rpx; color: #999; }
.continue-title { font-size: 26rpx; font-weight: 500; color: #333; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.continue-lesson { font-size: 20rpx; color: #999; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.continue-progress { text-align: right; }
.progress-pct { font-size: 28rpx; font-weight: 700; color: #C41E3A; }
.progress-bar { width: 96rpx; height: 6rpx; background: #EEE; border-radius: 3rpx; margin-top: 6rpx; overflow: hidden; }
.progress-fill { height: 100%; background: #C41E3A; border-radius: 3rpx; }

/* 猜你喜欢 */
.rec-section { padding: 0 0 8rpx; }
.rec-header { display: flex; justify-content: space-between; align-items: center; padding: 0 24rpx 16rpx; }
.rec-scroll { white-space: nowrap; }
.rec-row { display: flex; gap: 16rpx; padding: 0 24rpx; }
.rec-card { flex-shrink: 0; width: 224rpx; }
.rec-cover {
  width: 224rpx; aspect-ratio: 3/4; border-radius: 16rpx;
  background: linear-gradient(135deg, #F5F0E8, #EDE5D5);
  display: flex; align-items: center; justify-content: center;
  position: relative; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.06);
}
.rec-cover-icon { font-size: 48rpx; opacity: 0.4; }
.rec-tag {
  position: absolute; top: 10rpx; left: 10rpx;
  font-size: 18rpx; color: #fff; background: #C41E3A;
  padding: 2rpx 10rpx; border-radius: 8rpx;
}
.rec-title {
  font-size: 24rpx; color: #333; margin-top: 10rpx;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden; white-space: normal; line-height: 1.4;
}
.rec-price-row { display: flex; align-items: baseline; gap: 8rpx; margin-top: 6rpx; }
.rec-price { font-size: 26rpx; font-weight: 700; color: #C41E3A; }
.rec-original { font-size: 20rpx; color: #999; text-decoration: line-through; }

/* VIP 到期提醒 */
.vip-warning { position: fixed; bottom: 140rpx; left: 24rpx; right: 24rpx; z-index: 50; }
.vip-warn-card {
  display: flex; align-items: center; gap: 12rpx;
  padding: 20rpx 24rpx; border-radius: 20rpx;
  background: linear-gradient(135deg, #C9A96E, #D4B87D);
  box-shadow: 0 8rpx 24rpx rgba(201,169,110,0.4);
}
.vip-warn-icon { font-size: 32rpx; }
.vip-warn-text { flex: 1; font-size: 24rpx; color: #fff; }
.vip-warn-btn {
  font-size: 22rpx; color: #C9A96E; background: #fff;
  padding: 6rpx 20rpx; border-radius: 24rpx; font-weight: 500;
}

.load-area { padding: 24rpx; }
.err-area { padding: 80rpx 24rpx; }
</style>
