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
        <!-- 加载态 -->
        <view v-if="loading" class="empty">
          <text class="empty-txt">加载中...</text>
        </view>
        <!-- 错误态 -->
        <view v-else-if="error" class="empty">
          <app-icon name="alert-circle" :size="48" color="rgba(0,0,0,0.2)" />
          <text class="empty-txt">{{ error }}</text>
          <view class="empty-btn" @tap="fetchData">
            <text class="empty-btn-txt">重试</text>
          </view>
        </view>
        <!-- 空态 -->
        <view v-else-if="filteredMemberships.length === 0" class="empty">
          <app-icon name="gift" :size="48" color="rgba(0,0,0,0.2)" />
          <text class="empty-txt">暂无权益</text>
          <view class="empty-btn" @tap="goVip">
            <text class="empty-btn-txt">开通会员</text>
          </view>
        </view>

        <!-- 权益卡 -->
        <view
          v-for="m in (loading || error ? [] : filteredMemberships)"
          :key="m.id"
          class="mcard bg-gold"
        >
          <!-- 头部 -->
          <view class="mcard-head">
            <view class="mcard-head-left">
              <view class="mcard-icon ibg-gold">
                <app-icon name="crown" :size="16" color="#c8a96a" />
              </view>
              <view>
                <text class="mcard-name">{{ m.name }}</text>
                <text class="mcard-date">{{ m.isLifetime ? '永久有效' : (m.expireDate ? '有效期至 ' + m.expireDate : '') }}</text>
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
              <text class="exp-days" :style="{ color: isExpiring(m) ? '#d97706' : '#c8a96a' }">
                {{ m.isLifetime ? '永久' : (m.daysLeft > 0 ? m.daysLeft + '天' : '已过期') }}
              </text>
            </view>
            <!-- 进度条 -->
            <view class="bar-track">
              <view
                class="bar-fill"
                :style="{ width: barWidth(m) + '%', background: isExpiring(m) ? '#f59e0b' : '#c8a96a' }"
              />
            </view>
            <!-- 权益标签 -->
            <view v-if="m.benefits.length > 0" class="benefit-tags">
              <text v-for="(b, i) in m.benefits.slice(0, 4)" :key="i" class="benefit-tag">{{ b }}</text>
            </view>
          </view>

          <!-- 底部操作 -->
          <view class="mcard-foot">
            <view class="renew-right">
              <view v-if="m.price > 0" class="renew-price">
                <text class="renew-price-label">续费价格</text>
                <text class="renew-price-num">¥{{ m.price }}</text>
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
            <text class="warn-txt">您的权益将在{{ m.daysLeft }}天后到期，续费可继续享受会员特权</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppNavBar from '@/components/common/app-nav-bar.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { mineApi, type MembershipItem } from '@/lib/mine-data'

type MembershipStatus = 'active' | 'expiring' | 'expired'

const memberships = ref<MembershipItem[]>([])
const loading = ref(true)
const error = ref('')

const statusConfig: Record<MembershipStatus, { label: string; cls: string }> = {
  active: { label: '正常', cls: 'st-active' },
  expiring: { label: '即将到期', cls: 'st-expiring' },
  expired: { label: '已过期', cls: 'st-expired' },
}

const filter = ref<'all' | MembershipStatus>('all')

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    memberships.value = await mineApi.getMemberships()
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)

const stats = computed(() => ({
  total: memberships.value.length,
  active: memberships.value.filter((m) => m.status === 'active').length,
  expiring: memberships.value.filter((m) => m.status === 'expiring').length,
  expired: memberships.value.filter((m) => m.status === 'expired').length,
}))

const filteredMemberships = computed(() =>
  filter.value === 'all' ? memberships.value : memberships.value.filter((m) => m.status === filter.value),
)

const expiringCount = computed(() => memberships.value.filter((m) => !m.isLifetime && m.daysLeft <= 30 && m.daysLeft > 0).length)

function isExpiring(m: MembershipItem) {
  return !m.isLifetime && m.daysLeft <= 30 && m.daysLeft > 0
}
function barWidth(m: MembershipItem) {
  if (m.isLifetime) return 100
  return Math.min(100, Math.max(0, (m.daysLeft / 365) * 100))
}
function goExpiryNotice() {
  navigateTo('/notifications')
}
function goOrders() {
  navigateTo('/orders/center')
}
function goVip() {
  navigateTo('/vip')
}
function goRenew(_m: MembershipItem) {
  navigateTo('/vip')
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
  color: var(--brand);
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
  border: 1rpx solid var(--brand);
  border-radius: 999rpx;
}
.empty-btn-txt {
  font-size: 24rpx;
  color: var(--brand);
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
  color: var(--brand);
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
  background: var(--brand);
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
