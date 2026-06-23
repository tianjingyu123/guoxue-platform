<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import BottomNav from '@/components/bottom-nav/bottom-nav.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, toastComingSoon } from '@/utils/router'
import {
  profileApi, getGreeting, roleConfig, quickFunctions,
  allRoleTypes, roleHref, type UserRole,
} from '@/lib/profile-data'

const loading = ref(true)
const error = ref('')
const greeting = getGreeting()

// 从 API 获取的数据（响应式）
const userData = ref({
  name: '',
  avatar: '',
  bio: '',
  isVip: false,
  vipLevel: '',
  vipExpiry: '',
  vipDaysLeft: 0,
  isVerified: false,
  roles: [] as import('@/lib/profile-data').RoleEntry[],
  messages: { system: 0, interaction: 0, transaction: 0 },
  checkIn: { todayChecked: false, continuousDays: 0, totalPoints: 0 },
  stats: { following: 0, followers: 0, likes: 0 },
  coins: 0,
  coupons: 0,
  points: 0,
  orders: { pending: 0, shipped: 0, received: 0, refund: 0 },
  continueLearning: null as { id: number; title: string; progress: number; lastLesson: string } | null,
})
const recList = ref<{ id: number; type: 'course' | 'product'; title: string; price: number; originalPrice: number; tag: string }[]>([])

// totalMessages 基于 API 返回的用户数据动态计算
const totalMessages = computed(() => {
  const m = userData.value.messages
  return m.system + m.interaction + m.transaction
})

// 未开通角色（申请开通引导）
const ownedTypes = computed(() => new Set(userData.value.roles.map((r) => r.type)))
const availableToApply = computed(() => allRoleTypes.filter((r) => !ownedTypes.value.has(r.type)))

// 订单状态
const orderStatus = computed(() => [
  { key: 'pending' as const, label: '待付款', icon: 'wallet', count: userData.value.orders.pending },
  { key: 'shipped' as const, label: '待发货', icon: 'package', count: userData.value.orders.shipped },
  { key: 'received' as const, label: '待收货', icon: 'truck', count: userData.value.orders.received },
  { key: 'refund' as const, label: '售后', icon: 'refresh-cw', count: userData.value.orders.refund },
])

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const data = await profileApi.getProfile()
    userData.value = data
    recList.value = await profileApi.recommendations()
  } catch (e: any) {
    error.value = e?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})

// 身份切换确认弹窗
const pendingRole = ref<{ type: UserRole; name: string; href: string } | null>(null)

function go(href: string) {
  navigateTo(href)
}
function openRole(type: UserRole, name: string, id: number) {
  pendingRole.value = { type, name, href: roleHref(type, id) }
}
function confirmRole() {
  if (!pendingRole.value) return
  const href = pendingRole.value.href
  pendingRole.value = null
  navigateTo(href)
}
function applyRole(type: UserRole) {
  toastComingSoon()
}

// 签到（防重复提交）
const checkInSubmitting = ref(false)
async function handleCheckIn() {
  if (checkInSubmitting.value) return
  checkInSubmitting.value = true
  try {
    const res = await profileApi.checkIn()
    if (res.success) {
      userData.value.checkIn = {
        ...userData.value.checkIn,
        todayChecked: true,
        continuousDays: userData.value.checkIn.continuousDays + 1,
        totalPoints: userData.value.checkIn.totalPoints + res.points,
      }
      uni.showToast({ title: `签到成功 +${res.points}积分`, icon: 'none' })
    }
  } catch {
    uni.showToast({ title: '签到失败，请重试', icon: 'none' })
  } finally {
    checkInSubmitting.value = false
  }
}
</script>

<template>
  <view class="page">
    <!-- 骨架屏 -->
    <view v-if="loading" class="skeleton">
      <view class="skeleton-hero" />
      <view class="skeleton-sec" />
      <view class="skeleton-sec" />
      <view class="skeleton-sec" />
      <text class="skeleton-text">加载中...</text>
    </view>
    <!-- 错误态 -->
    <view v-else-if="error" class="error-state">
      <text class="error-text">{{ error }}</text>
      <view class="retry-btn" @tap="fetchData">
        <text>重试</text>
      </view>
    </view>
    <template v-else>
    <!-- ===== 第一层：个人信息区 ===== -->
    <view class="hero">
      <view class="hero-bg" />

      <!-- 顶部操作栏 -->
      <view class="topbar">
        <view class="round-btn" @tap="toastComingSoon"><AppIcon name="qr-code" :size="38" color="#2c2c2c" /></view>
        <view class="topbar-right">
          <view class="round-btn msg-btn" @tap="go('/pkg-im/im/conversations')">
            <AppIcon name="bell" :size="38" color="#2c2c2c" />
            <text v-if="totalMessages > 0" class="msg-badge">{{ totalMessages }}</text>
          </view>
          <view class="round-btn" @tap="toastComingSoon"><AppIcon name="settings" :size="38" color="#2c2c2c" /></view>
        </view>
      </view>

      <!-- 用户信息 -->
      <view class="user-row">
        <view class="avatar" @tap="go('/pages/profile/edit')">
          <image v-if="userData.avatar" class="avatar-img" :src="userData.avatar" mode="aspectFill" />
          <text v-else class="avatar-fallback">{{ userData.name[0] }}</text>
        </view>
        <view class="user-info">
          <text class="greeting">{{ greeting }}，{{ userData.name }}</text>
          <view class="name-row">
            <text class="uname">{{ userData.name }}</text>
            <AppIcon v-if="userData.isVerified" name="shield" :size="28" color="#4A90D9" />
            <view v-if="userData.isVip" class="vip-badge">
              <AppIcon name="crown" :size="22" color="#ffffff" />
              <text class="vip-txt">{{ userData.vipLevel }}</text>
            </view>
          </view>
          <view class="stat-row">
            <view class="stat-item" @tap="toastComingSoon">
              <text class="stat-num">{{ userData.stats.following }}</text><text class="stat-label">关注</text>
            </view>
            <view class="stat-div" />
            <view class="stat-item" @tap="toastComingSoon">
              <text class="stat-num">{{ userData.stats.followers }}</text><text class="stat-label">粉丝</text>
            </view>
            <view class="stat-div" />
            <view class="stat-item" @tap="toastComingSoon">
              <text class="stat-num">{{ userData.stats.likes }}</text><text class="stat-label">获赞</text>
            </view>
          </view>
          <view class="edit-btn" @tap="go('/pages/profile/edit')">
            <AppIcon name="edit" :size="24" color="#2c2c2c" /><text class="edit-txt">编辑资料</text>
          </view>
        </view>
      </view>
    </view>

    <!-- ===== 第二层：资产核心区 ===== -->
    <view class="sec">
      <view class="asset-card">
        <view class="asset-grid">
          <view class="asset-item" @tap="toastComingSoon">
            <view class="asset-val"><AppIcon name="coins" :size="38" color="#C9A96E" /><text class="coin-num">{{ userData.coins }}</text></view>
            <text class="coin-label">国学币</text>
          </view>
          <view class="asset-item asset-bd" @tap="toastComingSoon">
            <view class="asset-val"><AppIcon name="ticket" :size="30" color="#999999" /><text class="asset-num">{{ userData.coupons }}</text></view>
            <text class="asset-label">优惠券</text>
          </view>
          <view class="asset-item asset-bd" @tap="toastComingSoon">
            <view class="asset-val"><AppIcon name="star" :size="30" color="#999999" /><text class="asset-num">{{ userData.points }}</text></view>
            <text class="asset-label">积分</text>
          </view>
        </view>
      </view>
    </view>

    <!-- ===== 第三层：订单与售后区 ===== -->
    <view class="sec">
      <view class="card">
        <view class="card-head">
          <text class="card-title">我的订单</text>
          <view class="card-more" @tap="toastComingSoon"><text class="more-txt">查看全部订单</text><AppIcon name="chevron-right" :size="28" color="#999999" /></view>
        </view>
        <view class="order-grid">
          <view v-for="item in orderStatus" :key="item.key" class="order-item" @tap="toastComingSoon">
            <view class="order-icon"><AppIcon :name="item.icon" :size="36" color="#999999" /></view>
            <text class="order-label">{{ item.label }}</text>
            <text v-if="item.count > 0" class="order-badge">{{ item.count }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- ===== 第四层：常用功能区 ===== -->
    <view class="sec">
      <view class="card">
        <view class="card-head"><text class="card-title">常用功能</text></view>
        <view class="fn-grid">
          <view v-for="item in quickFunctions" :key="item.label" class="fn-item" @tap="go(item.href)">
            <view class="fn-icon"><AppIcon :name="item.icon" :size="36" :color="item.color" /></view>
            <text class="fn-label">{{ item.label }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- ===== 第五层：身份切换区 ===== -->
    <view v-if="userData.roles.length > 0" class="sec">
      <view class="card">
        <view class="card-head">
          <text class="card-title">身份切换</text>
          <text class="card-hint">点击进入对应管理后台</text>
        </view>
        <view class="role-grid">
          <view
            v-for="role in userData.roles"
            :key="`${role.type}-${role.id}`"
            class="role-item"
            @tap="openRole(role.type, role.name, role.id)"
          >
            <view class="role-icon" :style="{ background: roleConfig[role.type].bgColor }">
              <AppIcon :name="roleConfig[role.type].icon" :size="36" :color="roleConfig[role.type].color" />
            </view>
            <view class="role-info">
              <text class="role-label">{{ roleConfig[role.type].label }}</text>
              <text class="role-name">{{ role.name }}</text>
            </view>
            <AppIcon name="chevron-right" :size="28" color="#999999" />
          </view>
        </view>

        <view v-if="availableToApply.length > 0" class="apply-wrap">
          <text class="apply-title">开通更多身份</text>
          <scroll-view scroll-x class="apply-scroll" :show-scrollbar="false">
            <view class="apply-row">
              <view v-for="r in availableToApply" :key="r.type" class="apply-chip" @tap="applyRole(r.type)">
                <AppIcon :name="roleConfig[r.type].icon" :size="28" :color="roleConfig[r.type].color" />
                <text class="apply-txt">申请{{ roleConfig[r.type].label.replace('后台', '').replace('中心', '') }}</text>
              </view>
            </view>
          </scroll-view>
        </view>
      </view>
    </view>

    <!-- ===== 签到入口 ===== -->
    <view class="sec">
      <view class="checkin-card" :class="{ 'checkin-submitting': checkInSubmitting }" @tap="handleCheckIn">
        <view class="checkin-left">
          <view class="checkin-icon"><AppIcon name="calendar-check" :size="36" color="#ffffff" /></view>
          <view>
            <view class="checkin-title-row">
              <text class="checkin-title">每日签到</text>
              <text v-if="userData.checkIn.todayChecked" class="checkin-done">已签到</text>
              <text v-else class="checkin-todo">待签到</text>
            </view>
            <text class="checkin-sub">已连续签到 <text class="hl-red">{{ userData.checkIn.continuousDays }}</text> 天，累计 <text class="hl-gold">{{ userData.checkIn.totalPoints }}</text> 积分</text>
          </view>
        </view>
        <AppIcon name="chevron-right" :size="36" color="#999999" />
      </view>
    </view>

    <!-- ===== 继续学习卡片 ===== -->
    <view v-if="userData.continueLearning" class="sec">
      <view class="learn-card" @tap="toastComingSoon">
        <view class="learn-cover"><AppIcon name="play" :size="44" color="#C41E3A" /></view>
        <view class="learn-info">
          <text class="learn-tag">继续学习</text>
          <text class="learn-title">{{ userData.continueLearning.title }}</text>
          <text class="learn-lesson">{{ userData.continueLearning.lastLesson }}</text>
        </view>
        <view class="learn-prog">
          <text class="learn-pct">{{ userData.continueLearning.progress }}%</text>
          <view class="learn-bar"><view class="learn-bar-fill" :style="{ width: userData.continueLearning.progress + '%' }" /></view>
        </view>
      </view>
    </view>

    <!-- ===== 猜你喜欢 ===== -->
    <view class="sec sec-rec">
      <view class="rec-head">
        <text class="card-title">猜你喜欢</text>
        <view class="card-more" @tap="go('/pages/discover/index')"><text class="more-txt">更多</text><AppIcon name="chevron-right" :size="28" color="#999999" /></view>
      </view>
      <scroll-view scroll-x class="rec-scroll" :show-scrollbar="false">
        <view class="rec-row">
          <view v-for="item in recList" :key="item.id" class="rec-item" @tap="toastComingSoon">
            <view class="rec-cover">
              <AppIcon :name="item.type === 'course' ? 'book-open' : 'package'" :size="56" :color="item.type === 'course' ? 'rgba(196,30,58,0.3)' : 'rgba(201,169,110,0.3)'" />
              <text v-if="item.tag" class="rec-tag">{{ item.tag }}</text>
            </view>
            <text class="rec-title">{{ item.title }}</text>
            <view class="rec-price-row">
              <text class="rec-price">¥{{ item.price }}</text>
              <text class="rec-origin">¥{{ item.originalPrice }}</text>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- ===== 会员到期提醒（剩余<=30天）===== -->
    <view v-if="userData.isVip && userData.vipDaysLeft <= 30" class="vip-remind">
      <view class="vip-remind-card">
        <view class="vip-remind-left"><AppIcon name="crown" :size="36" color="#ffffff" /><text class="vip-remind-txt">会员还剩 {{ userData.vipDaysLeft }} 天到期</text></view>
        <view class="vip-renew" @tap="toastComingSoon"><text class="vip-renew-txt">立即续费</text></view>
      </view>
    </view>

    <!-- ===== 身份切换确认弹窗 ===== -->
    <view v-if="pendingRole" class="modal-mask" @tap="pendingRole = null">
      <view class="modal" @tap.stop>
        <view class="modal-body">
          <view class="modal-icon" :style="{ background: roleConfig[pendingRole.type].bgColor }">
            <AppIcon :name="roleConfig[pendingRole.type].icon" :size="44" :color="roleConfig[pendingRole.type].color" />
          </view>
          <text class="modal-title">切换到「{{ roleConfig[pendingRole.type].label }}」</text>
          <text class="modal-name">{{ pendingRole.name }}</text>
          <text class="modal-desc">将进入对应管理后台，确认切换？</text>
        </view>
        <view class="modal-actions">
          <view class="modal-cancel" @tap="pendingRole = null"><text class="modal-cancel-txt">取消</text></view>
          <view class="modal-confirm" @tap="confirmRole"><text class="modal-confirm-txt">确认切换</text></view>
        </view>
      </view>
    </view>

    </template>
    <bottom-nav active="profile" />
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: #FAF8F5; padding-bottom: 160rpx; }

/* 第一层 hero */
.hero { position: relative; }
.hero-bg { position: absolute; top: 0; left: 0; right: 0; height: 384rpx; background: linear-gradient(to bottom, #F5F1EB, #FAF8F5 60%, #FAF8F5); }
.topbar { position: relative; display: flex; align-items: center; justify-content: space-between; padding: 96rpx 32rpx 16rpx; }
.topbar-right { display: flex; align-items: center; gap: 16rpx; }
.round-btn { position: relative; width: 72rpx; height: 72rpx; border-radius: 50%; background: rgba(255,255,255,0.6); display: flex; align-items: center; justify-content: center; }
.msg-badge { position: absolute; top: -4rpx; right: -4rpx; min-width: 32rpx; height: 32rpx; padding: 0 6rpx; background: #C41E3A; color: #fff; font-size: 18rpx; font-weight: 700; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; }

.user-row { position: relative; display: flex; align-items: flex-start; gap: 32rpx; padding: 0 32rpx 32rpx; }
.avatar { width: 160rpx; height: 160rpx; border-radius: 50%; background: #C41E3A; display: flex; align-items: center; justify-content: center; border: 8rpx solid #fff; box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.12); flex-shrink: 0; overflow: hidden; }
.avatar-img { width: 100%; height: 100%; }
.avatar-fallback { font-family: var(--font-serif); font-size: 56rpx; font-weight: 700; color: #fff; }
.user-info { flex: 1; padding-top: 8rpx; min-width: 0; }
.greeting { display: block; font-size: 22rpx; color: #999; margin-bottom: 8rpx; }
.name-row { display: flex; align-items: center; gap: 12rpx; }
.uname { font-family: var(--font-serif); font-size: 40rpx; font-weight: 700; color: #2c2c2c; }
.vip-badge { display: flex; align-items: center; gap: 4rpx; padding: 2rpx 12rpx; border-radius: 999rpx; background: linear-gradient(to right, #C9A96E, #D4B87D); }
.vip-txt { font-size: 20rpx; color: #fff; }
.stat-row { display: flex; align-items: center; gap: 28rpx; margin-top: 16rpx; }
.stat-item { display: flex; align-items: baseline; gap: 6rpx; }
.stat-num { font-size: 32rpx; font-weight: 700; color: #2c2c2c; }
.stat-label { font-size: 22rpx; color: #999; }
.stat-div { width: 2rpx; height: 24rpx; background: #e8e0d5; }
.edit-btn { display: inline-flex; align-items: center; gap: 6rpx; margin-top: 24rpx; height: 56rpx; padding: 0 24rpx; border-radius: 999rpx; border: 2rpx solid #e8e0d5; background: #fff; align-self: flex-start; }
.edit-txt { font-size: 22rpx; color: #2c2c2c; }

/* 通用 section / card */
.sec { padding: 0 32rpx; margin-top: 32rpx; }
.card { background: #fff; border-radius: 24rpx; overflow: hidden; box-shadow: 0 2rpx 16rpx rgba(0,0,0,0.05); }
.card-head { display: flex; align-items: center; justify-content: space-between; padding: 24rpx 32rpx; border-bottom: 2rpx solid #f0ece4; }
.card-title { font-size: 30rpx; font-weight: 500; color: #2c2c2c; }
.card-hint { font-size: 20rpx; color: #999; }
.card-more { display: flex; align-items: center; }
.more-txt { font-size: 22rpx; color: #999; }

/* 第二层 资产 */
.asset-card { background: linear-gradient(to right, #FAF8F5, #F8F4EC); border: 2rpx solid rgba(201,169,110,0.2); border-radius: 24rpx; box-shadow: 0 2rpx 16rpx rgba(0,0,0,0.05); padding: 32rpx; }
.asset-grid { display: flex; }
.asset-item { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 8rpx 0; }
.asset-bd { border-left: 2rpx solid rgba(201,169,110,0.2); }
.asset-val { display: flex; align-items: center; gap: 8rpx; }
.coin-num { font-size: 60rpx; font-weight: 700; color: #C9A96E; line-height: 1; }
.coin-label { font-size: 22rpx; color: rgba(201,169,110,0.9); font-weight: 500; margin-top: 12rpx; }
.asset-num { font-size: 40rpx; font-weight: 700; color: #2c2c2c; line-height: 1; }
.asset-label { font-size: 22rpx; color: #999; margin-top: 12rpx; }

/* 第三层 订单 */
.order-grid { display: flex; padding: 32rpx 0; }
.order-item { flex: 1; position: relative; display: flex; flex-direction: column; align-items: center; gap: 12rpx; }
.order-icon { width: 80rpx; height: 80rpx; border-radius: 50%; background: rgba(240,236,228,0.5); display: flex; align-items: center; justify-content: center; }
.order-label { font-size: 22rpx; color: #2c2c2c; }
.order-badge { position: absolute; top: 0; right: 25%; min-width: 32rpx; height: 32rpx; padding: 0 6rpx; background: #C41E3A; color: #fff; font-size: 18rpx; font-weight: 700; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; }

/* 第四层 常用功能 */
.fn-grid { display: flex; flex-wrap: wrap; padding: 32rpx 0; }
.fn-item { width: 25%; display: flex; flex-direction: column; align-items: center; gap: 12rpx; margin-bottom: 32rpx; }
.fn-icon { width: 80rpx; height: 80rpx; border-radius: 20rpx; background: rgba(240,236,228,0.5); display: flex; align-items: center; justify-content: center; }
.fn-label { font-size: 22rpx; color: #2c2c2c; }

/* 第五层 身份切换 */
.role-grid { display: flex; flex-wrap: wrap; padding: 24rpx; gap: 16rpx; }
.role-item { width: calc(50% - 8rpx); display: flex; align-items: center; gap: 20rpx; padding: 24rpx; border-radius: 20rpx; border: 2rpx solid #f0ece4; }
.role-icon { width: 72rpx; height: 72rpx; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.role-info { flex: 1; min-width: 0; }
.role-label { display: block; font-size: 26rpx; font-weight: 500; color: #2c2c2c; }
.role-name { display: block; font-size: 20rpx; color: #999; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.apply-wrap { padding: 0 24rpx 24rpx; }
.apply-title { display: block; font-size: 20rpx; color: #999; margin-bottom: 16rpx; padding-left: 8rpx; }
.apply-scroll { width: 100%; white-space: nowrap; }
.apply-row { display: inline-flex; gap: 16rpx; }
.apply-chip { display: inline-flex; align-items: center; gap: 12rpx; padding: 16rpx 24rpx; border-radius: 999rpx; border: 2rpx dashed #e8e0d5; }
.apply-txt { font-size: 22rpx; color: #999; white-space: nowrap; }

/* 签到 */
.checkin-card { display: flex; align-items: center; justify-content: space-between; padding: 24rpx; background: linear-gradient(to right, rgba(196,30,58,0.05), rgba(201,169,110,0.05)); border: 2rpx solid rgba(196,30,58,0.2); border-radius: 24rpx; box-shadow: 0 2rpx 16rpx rgba(0,0,0,0.05); }
.checkin-left { display: flex; align-items: center; gap: 24rpx; }
.checkin-icon { width: 80rpx; height: 80rpx; border-radius: 20rpx; background: linear-gradient(135deg, #C41E3A, #C9A96E); display: flex; align-items: center; justify-content: center; }
.checkin-title-row { display: flex; align-items: center; gap: 16rpx; }
.checkin-title { font-size: 28rpx; font-weight: 500; color: #2c2c2c; }
.checkin-done { font-size: 20rpx; color: #52C41A; background: rgba(82,196,26,0.1); padding: 2rpx 12rpx; border-radius: 8rpx; }
.checkin-todo { font-size: 20rpx; color: #fff; background: #C41E3A; padding: 2rpx 12rpx; border-radius: 8rpx; }
.checkin-sub { display: block; font-size: 22rpx; color: #999; margin-top: 4rpx; }
.hl-red { color: #C41E3A; font-weight: 500; }
.hl-gold { color: #C9A96E; font-weight: 500; }

/* 继续学习 */
.learn-card { display: flex; align-items: center; gap: 24rpx; padding: 24rpx; background: #fff; border-radius: 24rpx; box-shadow: 0 2rpx 16rpx rgba(0,0,0,0.05); }
.learn-cover { width: 128rpx; height: 96rpx; border-radius: 16rpx; background: linear-gradient(135deg, rgba(196,30,58,0.1), rgba(201,169,110,0.1)); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.learn-info { flex: 1; min-width: 0; }
.learn-tag { display: block; font-size: 22rpx; color: #999; }
.learn-title { display: block; font-size: 28rpx; font-weight: 500; color: #2c2c2c; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.learn-lesson { display: block; font-size: 20rpx; color: #999; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.learn-prog { display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0; }
.learn-pct { font-size: 28rpx; font-weight: 700; color: #C41E3A; }
.learn-bar { width: 96rpx; height: 8rpx; background: #f0ece4; border-radius: 999rpx; margin-top: 8rpx; overflow: hidden; }
.learn-bar-fill { height: 100%; background: #C41E3A; border-radius: 999rpx; }

/* 猜你喜欢 */
.sec-rec { margin-bottom: 24rpx; }
.rec-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.rec-scroll { width: 100%; white-space: nowrap; }
.rec-row { display: inline-flex; gap: 24rpx; padding-bottom: 8rpx; }
.rec-item { display: inline-block; width: 256rpx; vertical-align: top; }
.rec-cover { position: relative; width: 256rpx; height: 341rpx; border-radius: 16rpx; background: linear-gradient(135deg, rgba(196,30,58,0.05), rgba(201,169,110,0.05)); display: flex; align-items: center; justify-content: center; box-shadow: 0 2rpx 16rpx rgba(0,0,0,0.05); }
.rec-tag { position: absolute; top: 12rpx; left: 12rpx; font-size: 18rpx; padding: 2rpx 12rpx; background: #C41E3A; color: #fff; border-radius: 8rpx; }
.rec-title { display: block; font-size: 22rpx; font-weight: 500; color: #2c2c2c; margin-top: 16rpx; line-height: 1.5; white-space: normal; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.rec-price-row { display: flex; align-items: baseline; gap: 8rpx; margin-top: 8rpx; }
.rec-price { font-size: 28rpx; font-weight: 700; color: #C41E3A; }
.rec-origin { font-size: 20rpx; color: #999; text-decoration: line-through; }

/* 会员提醒 */
.vip-remind { position: fixed; bottom: 160rpx; left: 32rpx; right: 32rpx; z-index: 40; }
.vip-remind-card { display: flex; align-items: center; justify-content: space-between; padding: 24rpx; background: linear-gradient(to right, #C9A96E, #D4B87D); border-radius: 20rpx; box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.15); }
.vip-remind-left { display: flex; align-items: center; gap: 16rpx; }
.vip-remind-txt { font-size: 26rpx; color: #fff; }
.vip-renew { padding: 8rpx 24rpx; background: #fff; border-radius: 999rpx; }
.vip-renew-txt { font-size: 22rpx; font-weight: 500; color: #C9A96E; }

/* 弹窗 */
.modal-mask { position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.4); padding: 0 64rpx; }
.modal { width: 100%; max-width: 560rpx; background: #fff; border-radius: 32rpx; overflow: hidden; box-shadow: 0 8rpx 40rpx rgba(0,0,0,0.2); }
.modal-body { padding: 40rpx; text-align: center; }
.modal-icon { width: 96rpx; height: 96rpx; border-radius: 24rpx; margin: 0 auto 24rpx; display: flex; align-items: center; justify-content: center; }
.modal-title { display: block; font-size: 30rpx; font-weight: 500; color: #2c2c2c; }
.modal-name { display: block; font-size: 22rpx; color: #999; margin-top: 12rpx; }
.modal-desc { display: block; font-size: 22rpx; color: #999; margin-top: 16rpx; }
.modal-actions { display: flex; border-top: 2rpx solid #f0ece4; }
.modal-cancel { flex: 1; padding: 28rpx 0; text-align: center; }
.modal-cancel-txt { font-size: 28rpx; color: #999; }
.modal-confirm { flex: 1; padding: 28rpx 0; text-align: center; background: #C41E3A; border-left: 2rpx solid #f0ece4; }
.modal-confirm-txt { font-size: 28rpx; font-weight: 500; color: #fff; }

/* 三态：骨架屏 / 错误态 */
.skeleton { padding-top: 120rpx; display: flex; flex-direction: column; align-items: center; gap: 32rpx; }
.skeleton-hero { width: 686rpx; height: 320rpx; border-radius: 24rpx; background: linear-gradient(90deg, #f0ece4 25%, #e8e0d5 50%, #f0ece4 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
.skeleton-sec { width: 686rpx; height: 160rpx; border-radius: 24rpx; background: linear-gradient(90deg, #f0ece4 25%, #e8e0d5 50%, #f0ece4 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
.skeleton-text { font-size: 28rpx; color: #999; margin-top: 16rpx; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.error-state { padding: 200rpx 64rpx 0; display: flex; flex-direction: column; align-items: center; gap: 32rpx; }
.error-text { font-size: 28rpx; color: #999; text-align: center; }
.retry-btn { padding: 16rpx 48rpx; border-radius: 999rpx; border: 2rpx solid #C41E3A; }
.retry-btn text { font-size: 28rpx; color: #C41E3A; }

/* 签到提交中 */
.checkin-submitting { opacity: 0.6; pointer-events: none; }
</style>
