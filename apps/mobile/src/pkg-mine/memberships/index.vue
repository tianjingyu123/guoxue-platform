<template>
  <view class="page">
    <!-- 顶部导航 -->
    <app-nav-bar title="我的权益">
      <template #right>
        <view class="nav-bell" @tap="goExpiryNotice">
          <app-icon name="bell" :size="20" color="#1a1a1a" />
          <text v-if="expiringCount > 0" class="bell-badge">{{ expiringCount }}</text>
        </view>
      </template>
    </app-nav-bar>

    <scroll-view scroll-y class="scroll-area">
      <!-- 统计卡片 -->
      <view class="stat-wrap">
        <view class="stat-card">
          <view class="stat-head">
            <text class="stat-title">权益概览</text>
            <view class="stat-link" @tap="goOrders">
              <text class="stat-link-txt">订单记录</text>
              <app-icon name="chevron-right" :size="12" color="#c41e3a" />
            </view>
          </view>
          <view class="stat-grid">
            <view class="stat-item" :class="{ 'stat-item-all': filter === 'all' }" @tap="filter = 'all'">
              <text class="stat-num">{{ stats.total }}</text>
              <text class="stat-label">全部权益</text>
            </view>
            <view class="stat-item" :class="{ 'stat-item-green': filter === 'active' }" @tap="filter = 'active'">
              <text class="stat-num c-green">{{ stats.active }}</text>
              <text class="stat-label">正常</text>
            </view>
            <view class="stat-item" :class="{ 'stat-item-amber': filter === 'expiring' }" @tap="filter = 'expiring'">
              <text class="stat-num c-amber">{{ stats.expiring }}</text>
              <text class="stat-label">即将到期</text>
            </view>
            <view class="stat-item" :class="{ 'stat-item-red': filter === 'expired' }" @tap="filter = 'expired'">
              <text class="stat-num c-red">{{ stats.expired }}</text>
              <text class="stat-label">已过期</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 权益列表 -->
      <view class="list">
        <!-- 空态 -->
        <view v-if="filteredMemberships.length === 0" class="empty">
          <app-icon name="gift" :size="48" color="rgba(0,0,0,0.2)" />
          <text class="empty-txt">暂无权益</text>
          <view class="empty-btn" @tap="goVip">
            <text class="empty-btn-txt">开通会员</text>
          </view>
        </view>

        <!-- 权益卡 -->
        <view
          v-for="m in filteredMemberships"
          :key="m.id"
          class="mcard"
          :class="m.bgClass"
        >
          <!-- 头部 -->
          <view class="mcard-head">
            <view class="mcard-head-left">
              <view class="mcard-icon" :class="m.iconBgClass">
                <app-icon :name="m.icon" :size="16" :color="m.iconColor" />
              </view>
              <view>
                <text class="mcard-name">{{ m.name }}</text>
                <text class="mcard-date">{{ m.startDate }} ~ {{ m.expireDate }}</text>
              </view>
            </view>
            <text class="mcard-status" :class="statusConfig[m.status].cls">{{ statusConfig[m.status].label }}</text>
          </view>

          <!-- 有效期 -->
          <view class="mcard-body">
            <view class="exp-row">
              <view class="exp-left">
                <app-icon name="clock" :size="14" color="rgba(0,0,0,0.4)" />
                <text class="exp-label">剩余有效期</text>
              </view>
              <text class="exp-days" :style="{ color: isExpiring(m) ? '#d97706' : m.iconColor }">
                {{ m.daysLeft > 0 ? m.daysLeft + '天' : '已过期' }}
              </text>
            </view>
            <!-- 进度条 -->
            <view class="bar-track">
              <view
                class="bar-fill"
                :style="{ width: barWidth(m) + '%', background: isExpiring(m) ? '#f59e0b' : m.iconColor }"
              />
            </view>
            <!-- 权益标签 -->
            <view class="benefit-tags">
              <text v-for="(b, i) in m.benefits.slice(0, 4)" :key="i" class="benefit-tag">{{ b }}</text>
            </view>
          </view>

          <!-- 底部操作 -->
          <view class="mcard-foot">
            <view class="renew-switch">
              <switch
                :checked="m.autoRenew"
                color="#c41e3a"
                style="transform: scale(0.7)"
                @change="toggleAutoRenew(m.id)"
              />
              <text class="renew-switch-txt">{{ m.autoRenew ? '自动续费已开启' : '自动续费' }}</text>
            </view>
            <view class="renew-right">
              <view class="renew-price">
                <text class="renew-price-label">续费价格</text>
                <text class="renew-price-num">
                  ¥{{ m.price }}
                  <text v-if="m.originalPrice" class="renew-price-old">¥{{ m.originalPrice }}</text>
                </text>
              </view>
              <view class="renew-btn" :class="{ 'renew-btn-amber': isExpiring(m) }" @tap="goRenew(m)">
                <app-icon name="refresh-cw" :size="14" color="#fff" />
                <text class="renew-btn-txt">{{ isExpiring(m) ? '立即续费' : '续费' }}</text>
              </view>
            </view>
          </view>

          <!-- 即将到期警告 -->
          <view v-if="isExpiring(m)" class="warn">
            <app-icon name="alert-triangle" :size="16" color="#f59e0b" />
            <text class="warn-txt">您的权益将在{{ m.daysLeft }}天后到期，续费可享受连续优惠</text>
          </view>

          <!-- 管理订阅（仅圈子会员，退出入口深藏） -->
          <view v-if="m.type === 'circle'" class="manage">
            <view class="manage-toggle" @tap="toggleManage(m.id)">
              <text class="manage-toggle-txt">管理订阅</text>
              <app-icon
                name="chevron-down"
                :size="12"
                color="rgba(0,0,0,0.4)"
                :style="{ transform: manageOpen === m.id ? 'rotate(180deg)' : 'none' }"
              />
            </view>
            <view v-if="manageOpen === m.id" class="manage-panel">
              <text class="manage-desc">退出后将失去圈内全部权益与内容访问，已用时长按天计费，剩余部分可申请退款。</text>
              <view class="manage-exit" @tap="goExit(m)">
                <app-icon name="log-out" :size="12" color="rgba(0,0,0,0.5)" />
                <text class="manage-exit-txt">申请退出并退款</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppNavBar from '@/components/common/app-nav-bar.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'

type MembershipType = 'vip' | 'circle' | 'station' | 'institute'
type MembershipStatus = 'active' | 'expiring' | 'expired'

interface Membership {
  id: string
  type: MembershipType
  name: string
  icon: string
  iconColor: string
  iconBgClass: string
  bgClass: string
  status: MembershipStatus
  startDate: string
  expireDate: string
  daysLeft: number
  price: number
  originalPrice?: number
  autoRenew: boolean
  benefits: string[]
}

const memberships = ref<Membership[]>([
  {
    id: 'vip-1', type: 'vip', name: '热卜国学VIP会员', icon: 'crown',
    iconColor: '#c8a96a', iconBgClass: 'ibg-gold', bgClass: 'bg-gold',
    status: 'active', startDate: '2024-01-08', expireDate: '2025-01-08', daysLeft: 186,
    price: 365, originalPrice: 588, autoRenew: true,
    benefits: ['排盘工具无限使用', '课程专属折扣', '专属客服', '去广告'],
  },
  {
    id: 'circle-1', type: 'circle', name: '八字命理研习社', icon: 'users',
    iconColor: '#c41e3a', iconBgClass: 'ibg-primary', bgClass: 'bg-primary',
    status: 'expiring', startDate: '2024-01-14', expireDate: '2025-01-14', daysLeft: 28,
    price: 199, autoRenew: false,
    benefits: ['圈内免费内容', '专属直播', '圈内问答', '交流群'],
  },
  {
    id: 'circle-2', type: 'circle', name: '紫微斗数学习班', icon: 'users',
    iconColor: '#c41e3a', iconBgClass: 'ibg-primary', bgClass: 'bg-primary',
    status: 'active', startDate: '2024-03-01', expireDate: '2025-03-01', daysLeft: 268,
    price: 299, autoRenew: true,
    benefits: ['系统课程', '案例分析', '作业点评', '1v1答疑'],
  },
  {
    id: 'station-1', type: 'station', name: '分站站长资格', icon: 'building-2',
    iconColor: '#2d8a4e', iconBgClass: 'ibg-success', bgClass: 'bg-success',
    status: 'active', startDate: '2023-12-20', expireDate: '2024-12-20', daysLeft: 45,
    price: 999, autoRenew: false,
    benefits: ['专属分站页面', '推广分佣', '自购返佣', '品牌展示'],
  },
  {
    id: 'institute-1', type: 'institute', name: '研究院成员', icon: 'graduation-cap',
    iconColor: '#7c3aed', iconBgClass: 'ibg-operator', bgClass: 'bg-operator',
    status: 'active', startDate: '2023-12-15', expireDate: '2024-12-15', daysLeft: 40,
    price: 10000, autoRenew: false,
    benefits: ['内部交流', '线下活动', '资源对接', '保证金可退'],
  },
])

const statusConfig: Record<MembershipStatus, { label: string; cls: string }> = {
  active: { label: '正常', cls: 'st-active' },
  expiring: { label: '即将到期', cls: 'st-expiring' },
  expired: { label: '已过期', cls: 'st-expired' },
}

const filter = ref<'all' | MembershipStatus>('all')
const manageOpen = ref<string | null>(null)

const stats = computed(() => ({
  total: memberships.value.length,
  active: memberships.value.filter((m) => m.status === 'active').length,
  expiring: memberships.value.filter((m) => m.status === 'expiring').length,
  expired: memberships.value.filter((m) => m.status === 'expired').length,
}))

const filteredMemberships = computed(() =>
  filter.value === 'all' ? memberships.value : memberships.value.filter((m) => m.status === filter.value),
)

const expiringCount = computed(() => memberships.value.filter((m) => m.daysLeft <= 30 && m.daysLeft > 0).length)

function isExpiring(m: Membership) {
  return m.daysLeft <= 30 && m.daysLeft > 0
}
function barWidth(m: Membership) {
  return Math.min(100, Math.max(0, (m.daysLeft / 365) * 100))
}
function toggleAutoRenew(id: string) {
  const m = memberships.value.find((x) => x.id === id)
  if (m) m.autoRenew = !m.autoRenew
}
function toggleManage(id: string) {
  manageOpen.value = manageOpen.value === id ? null : id
}
function goExpiryNotice() {
  navigateTo('/notifications?type=expiry')
}
function goOrders() {
  navigateTo('/orders/center')
}
function goVip() {
  navigateTo('/vip')
}
function goRenew(m: Membership) {
  navigateTo(`/renew?type=${m.type}&id=${m.id}`)
}
function goExit(m: Membership) {
  navigateTo(`/circles/${m.id.replace('circle-', '')}/exit`)
}
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: #faf8f5;
}
.nav-bell {
  position: relative;
  padding: 8rpx;
}
.bell-badge {
  position: absolute;
  top: 0;
  right: 0;
  min-width: 28rpx;
  height: 28rpx;
  padding: 0 4rpx;
  border-radius: 14rpx;
  background: #ef4444;
  color: #fff;
  font-size: 18rpx;
  line-height: 28rpx;
  text-align: center;
}
.scroll-area {
  height: calc(100vh - 88rpx);
}

/* 统计卡 */
.stat-wrap {
  padding: 24rpx;
}
.stat-card {
  background: linear-gradient(135deg, rgba(196, 30, 58, 0.1), rgba(196, 30, 58, 0.04));
  border: 1rpx solid rgba(196, 30, 58, 0.2);
  border-radius: 20rpx;
  padding: 24rpx;
}
.stat-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.stat-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #1a1a1a;
}
.stat-link {
  display: flex;
  align-items: center;
  gap: 4rpx;
}
.stat-link-txt {
  font-size: 22rpx;
  color: #c41e3a;
}
.stat-grid {
  display: flex;
  gap: 12rpx;
}
.stat-item {
  flex: 1;
  padding: 16rpx 0;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
}
.stat-item-all {
  background: rgba(196, 30, 58, 0.2);
}
.stat-item-green {
  background: #dcfce7;
}
.stat-item-amber {
  background: #fef3c7;
}
.stat-item-red {
  background: #fee2e2;
}
.stat-num {
  font-size: 36rpx;
  font-weight: 700;
  color: #1a1a1a;
}
.stat-num.c-green {
  color: #16a34a;
}
.stat-num.c-amber {
  color: #d97706;
}
.stat-num.c-red {
  color: #dc2626;
}
.stat-label {
  font-size: 20rpx;
  color: rgba(0, 0, 0, 0.45);
}

/* 列表 */
.list {
  padding: 0 24rpx 160rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

/* 空态 */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
  gap: 12rpx;
}
.empty-txt {
  font-size: 26rpx;
  color: rgba(0, 0, 0, 0.4);
}
.empty-btn {
  margin-top: 16rpx;
  padding: 12rpx 32rpx;
  border: 1rpx solid #c41e3a;
  border-radius: 999rpx;
}
.empty-btn-txt {
  font-size: 24rpx;
  color: #c41e3a;
}

/* 权益卡 */
.mcard {
  border-radius: 20rpx;
  overflow: hidden;
}
.bg-gold {
  background: linear-gradient(90deg, rgba(200, 169, 106, 0.2), rgba(200, 169, 106, 0.05));
}
.bg-primary {
  background: linear-gradient(90deg, rgba(196, 30, 58, 0.2), rgba(196, 30, 58, 0.05));
}
.bg-success {
  background: linear-gradient(90deg, rgba(45, 138, 78, 0.2), rgba(45, 138, 78, 0.05));
}
.bg-operator {
  background: linear-gradient(90deg, rgba(124, 58, 237, 0.2), rgba(124, 58, 237, 0.05));
}
.mcard-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.06);
}
.mcard-head-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.mcard-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ibg-gold {
  background: rgba(200, 169, 106, 0.2);
}
.ibg-primary {
  background: rgba(196, 30, 58, 0.2);
}
.ibg-success {
  background: rgba(45, 138, 78, 0.2);
}
.ibg-operator {
  background: rgba(124, 58, 237, 0.2);
}
.mcard-name {
  display: block;
  font-size: 26rpx;
  font-weight: 500;
  color: #1a1a1a;
}
.mcard-date {
  display: block;
  font-size: 20rpx;
  color: rgba(0, 0, 0, 0.45);
  margin-top: 4rpx;
}
.mcard-status {
  font-size: 20rpx;
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
}
.st-active {
  background: #dcfce7;
  color: #16a34a;
}
.st-expiring {
  background: #fef3c7;
  color: #d97706;
}
.st-expired {
  background: #fee2e2;
  color: #dc2626;
}
.mcard-body {
  padding: 24rpx;
}
.exp-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}
.exp-left {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.exp-label {
  font-size: 22rpx;
  color: rgba(0, 0, 0, 0.45);
}
.exp-days {
  font-size: 28rpx;
  font-weight: 700;
}
.bar-track {
  height: 12rpx;
  background: #f0ece6;
  border-radius: 999rpx;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  border-radius: 999rpx;
  transition: width 0.3s;
}
.benefit-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 24rpx;
}
.benefit-tag {
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.6);
  font-size: 20rpx;
  color: rgba(0, 0, 0, 0.45);
}
.mcard-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  border-top: 1rpx solid rgba(0, 0, 0, 0.06);
  background: rgba(255, 255, 255, 0.3);
}
.renew-switch {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.renew-switch-txt {
  font-size: 22rpx;
  color: rgba(0, 0, 0, 0.45);
}
.renew-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.renew-price {
  text-align: right;
}
.renew-price-label {
  display: block;
  font-size: 20rpx;
  color: rgba(0, 0, 0, 0.45);
}
.renew-price-num {
  font-size: 28rpx;
  font-weight: 700;
  color: #c41e3a;
}
.renew-price-old {
  font-size: 20rpx;
  color: rgba(0, 0, 0, 0.4);
  text-decoration: line-through;
  margin-left: 4rpx;
}
.renew-btn {
  display: flex;
  align-items: center;
  gap: 4rpx;
  height: 56rpx;
  padding: 0 24rpx;
  border-radius: 12rpx;
  background: #c41e3a;
}
.renew-btn-amber {
  background: #f59e0b;
}
.renew-btn-txt {
  font-size: 24rpx;
  color: #fff;
}
.warn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 24rpx;
  background: #fffbeb;
  border-top: 1rpx solid #fef3c7;
}
.warn-txt {
  font-size: 22rpx;
  color: #d97706;
  flex: 1;
}
.manage {
  border-top: 1rpx solid rgba(0, 0, 0, 0.04);
  background: rgba(255, 255, 255, 0.2);
}
.manage-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  padding: 16rpx 0;
}
.manage-toggle-txt {
  font-size: 22rpx;
  color: rgba(0, 0, 0, 0.4);
}
.manage-panel {
  padding: 8rpx 24rpx 24rpx;
}
.manage-desc {
  display: block;
  font-size: 22rpx;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.6;
  margin-bottom: 16rpx;
}
.manage-exit {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
}
.manage-exit-txt {
  font-size: 22rpx;
  color: rgba(0, 0, 0, 0.5);
  text-decoration: underline;
}
</style>
