<template>
  <view class="bm-page">
    <!-- Header -->
    <view class="bm-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="bm-header-row">
        <view class="bm-icon-btn" @tap="goBack">
          <app-icon name="chevron-left" :size="40" color="#2c2c2c" />
        </view>
        <text class="bm-header-title">我的悬赏</text>
        <view class="bm-header-spacer" />
      </view>
      <!-- Tabs -->
      <view class="bm-tabs">
        <view
          v-for="tab in tabs"
          :key="tab.key"
          class="bm-tab"
          @tap="switchTab(tab.key)"
        >
          <text class="bm-tab-text" :class="{ 'bm-tab-text-active': activeTab === tab.key }">{{ tab.label }}</text>
          <view v-if="activeTab === tab.key" class="bm-tab-line" />
        </view>
      </view>
    </view>

    <!-- Stats Card -->
    <view v-if="!loading && !error && bounties.length" class="bm-stats-wrap">
      <view class="bm-stats">
        <view class="bm-stats-head">
          <app-icon name="gift" :size="32" color="#ffffff" />
          <text class="bm-stats-title">{{ activeTab === 'posted' ? '发布统计' : '回答统计' }}</text>
        </view>
        <view class="bm-stats-grid">
          <view class="bm-stat">
            <text class="bm-stat-num">{{ stats.total }}</text>
            <text class="bm-stat-label">总数</text>
          </view>
          <view class="bm-stat">
            <text class="bm-stat-num">{{ stats.ongoing }}</text>
            <text class="bm-stat-label">进行中</text>
          </view>
          <view class="bm-stat">
            <text class="bm-stat-num">{{ stats.settled }}</text>
            <text class="bm-stat-label">已采纳</text>
          </view>
          <view class="bm-stat">
            <text class="bm-stat-num">{{ stats.totalAmount }}</text>
            <text class="bm-stat-label">{{ activeTab === 'posted' ? '总投入(币)' : '总收益(币)' }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- List -->
    <view class="bm-list">
      <!-- Skeleton -->
      <template v-if="loading">
        <view v-for="i in 3" :key="i" class="bm-card bm-sk">
          <view class="bm-sk-row">
            <view class="bm-sk-pill" />
            <view class="bm-sk-line bm-sk-w20" />
          </view>
          <view class="bm-sk-line bm-sk-w75" />
          <view class="bm-sk-line bm-sk-w100" />
        </view>
      </template>

      <!-- Error -->
      <app-error v-else-if="error" title="悬赏加载失败" desc="网络异常，请稍后重试" @retry="loadBounties" />

      <!-- Empty -->
      <view v-else-if="bounties.length === 0" class="bm-empty">
        <view class="bm-empty-icon">
          <app-icon name="gift" :size="80" color="#999999" />
        </view>
        <text class="bm-empty-text">{{ activeTab === 'posted' ? '还没有发布过悬赏' : '还没有回答过悬赏' }}</text>
        <view v-if="activeTab === 'posted'" class="bm-empty-btn" @tap="toCreate">
          <text class="bm-empty-btn-text">发布悬赏</text>
        </view>
      </view>

      <!-- Cards -->
      <template v-else>
        <view
          v-for="bounty in bounties"
          :key="bounty.id"
          class="bm-card"
          @tap="toDetail(bounty.id)"
        >
          <view class="bm-card-top">
            <view class="bm-status" :class="'bm-status-' + bounty.status">
              <text class="bm-status-text" :class="'bm-status-text-' + bounty.status">{{ statusLabel(bounty.status) }}</text>
            </view>
            <view class="bm-amount">
              <app-icon name="gift" :size="30" color="#d97706" />
              <text class="bm-amount-text">{{ bounty.bountyCoin }} 币</text>
            </view>
          </view>

          <text class="bm-card-title">{{ bounty.title }}</text>
          <text class="bm-card-desc">{{ bounty.description }}</text>

          <view class="bm-card-meta">
            <text v-if="categoryLabel(bounty.category)" class="bm-cat">{{ categoryLabel(bounty.category) }}</text>
            <text class="bm-meta-text">{{ formatBountyTime(bounty.createdAt) }}</text>
          </view>

          <!-- Actions（提问者视角） -->
          <view v-if="activeTab === 'posted'" class="bm-actions">
            <view
              v-if="bounty.status === 'ANSWERED'"
              class="bm-act-settle"
              :class="{ 'bm-act-disabled': actioningId === bounty.id }"
              @tap.stop="settle(bounty.id)"
            >
              <app-icon name="award" :size="28" color="#ffffff" />
              <text class="bm-act-settle-text">{{ actioningId === bounty.id ? '处理中...' : '采纳结算' }}</text>
            </view>
            <view
              v-else-if="bounty.status === 'OPEN' || bounty.status === 'CLAIMED'"
              class="bm-act-refund"
              :class="{ 'bm-act-disabled': actioningId === bounty.id }"
              @tap.stop="refund(bounty.id)"
            >
              <app-icon name="rotate-ccw" :size="28" color="#ffffff" />
              <text class="bm-act-refund-text">{{ actioningId === bounty.id ? '处理中...' : '撤销退款' }}</text>
            </view>
          </view>
          <!-- Actions（答主视角） -->
          <view v-else class="bm-actions">
            <text v-if="bounty.status === 'SETTLED'" class="bm-act-earned">已采纳 · 获赏 {{ bounty.bountyCoin }} 币</text>
            <text v-else-if="bounty.status === 'ANSWERED'" class="bm-act-waiting">回答已提交，等待采纳</text>
            <text v-else-if="bounty.status === 'CLAIMED'" class="bm-act-waiting">待作答</text>
          </view>
        </view>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { navigateTo, navigateBack } from '@/utils/router'
import {
  bountyApi,
  formatBountyTime,
  BOUNTY_STATUS_LABEL,
  BOUNTY_CATEGORY_LABEL,
  type BountyQuestion,
  type BountyStatus,
} from '@/pkg-bounty/lib/bounty-data'

const tabs = [
  { key: 'posted' as const, label: '我发布的' },
  { key: 'answered' as const, label: '我回答的' },
]

const statusBarHeight = ref(0)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
} catch (e) {}

const activeTab = ref<'posted' | 'answered'>('posted')
const loading = ref(true)
const error = ref(false)
const bounties = ref<BountyQuestion[]>([])
const actioningId = ref('')

function statusLabel(s: string): string {
  return BOUNTY_STATUS_LABEL[s as BountyStatus] || s
}
function categoryLabel(c: string): string {
  return BOUNTY_CATEGORY_LABEL[c as keyof typeof BOUNTY_CATEGORY_LABEL] || ''
}

async function loadBounties() {
  loading.value = true
  error.value = false
  try {
    bounties.value = await bountyApi.mine(activeTab.value)
  } catch (e) {
    error.value = true
  } finally {
    loading.value = false
  }
}

function switchTab(key: 'posted' | 'answered') {
  if (activeTab.value === key) return
  activeTab.value = key
  loadBounties()
}

const stats = computed(() => {
  const list = bounties.value
  const settled = list.filter((b) => b.status === 'SETTLED')
  return {
    total: list.length,
    ongoing: list.filter((b) => b.status === 'OPEN' || b.status === 'CLAIMED' || b.status === 'ANSWERED').length,
    settled: settled.length,
    // 提问者=已采纳的总投入；答主=已采纳的总收益
    totalAmount: settled.reduce((sum, b) => sum + b.bountyCoin, 0),
  }
})

async function settle(id: string) {
  if (actioningId.value) return
  const ok = await new Promise<boolean>((resolve) => {
    uni.showModal({
      title: '采纳并解付赏金',
      content: '采纳后赏金将解付给答主，此操作不可撤销。',
      confirmText: '确认采纳',
      success: (r) => resolve(!!r.confirm),
      fail: () => resolve(false),
    })
  })
  if (!ok) return
  actioningId.value = id
  try {
    await bountyApi.settle(id)
    uni.showToast({ title: '已采纳', icon: 'success' })
    await loadBounties()
  } catch (e: any) {
    uni.showToast({ title: e?.message || '采纳失败', icon: 'none' })
  } finally {
    actioningId.value = ''
  }
}

async function refund(id: string) {
  if (actioningId.value) return
  const ok = await new Promise<boolean>((resolve) => {
    uni.showModal({
      title: '撤销悬赏',
      content: '撤销后冻结的赏金将退回你的钱包。',
      confirmText: '确认撤销',
      success: (r) => resolve(!!r.confirm),
      fail: () => resolve(false),
    })
  })
  if (!ok) return
  actioningId.value = id
  try {
    await bountyApi.refund(id)
    uni.showToast({ title: '已撤销，赏金已退回', icon: 'success' })
    await loadBounties()
  } catch (e: any) {
    uni.showToast({ title: e?.message || '退款失败', icon: 'none' })
  } finally {
    actioningId.value = ''
  }
}

function toDetail(id: string) {
  navigateTo(`/bounty/${id}`)
}
function toCreate() {
  navigateTo('/bounty/create')
}
function goBack() {
  navigateBack()
}

loadBounties()
</script>

<style scoped>
.bm-page {
  min-height: 100vh;
  background: #f5f5f4;
}

/* Header */
.bm-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #ffffff;
  border-bottom: 2rpx solid #e8e3db;
}
.bm-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 96rpx;
  padding: 0 24rpx;
}
.bm-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56rpx;
  height: 56rpx;
}
.bm-header-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.bm-header-spacer {
  width: 56rpx;
}
.bm-tabs {
  display: flex;
  border-top: 2rpx solid #f0f0ef;
}
.bm-tab {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
}
.bm-tab-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #999999;
}
.bm-tab-text-active {
  color: var(--brand);
}
.bm-tab-line {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 48rpx;
  height: 4rpx;
  background: var(--brand);
  border-radius: 999rpx;
}

/* Stats */
.bm-stats-wrap {
  padding: 32rpx 32rpx 0;
}
.bm-stats {
  background: linear-gradient(90deg, #f59e0b, #f97316);
  border-radius: 32rpx;
  padding: 32rpx;
}
.bm-stats-head {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 24rpx;
}
.bm-stats-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #ffffff;
}
.bm-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
}
.bm-stat {
  text-align: center;
}
.bm-stat-num {
  display: block;
  font-size: 44rpx;
  font-weight: 700;
  color: #ffffff;
}
.bm-stat-label {
  display: block;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 4rpx;
}

/* List */
.bm-list {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}
.bm-card {
  background: #ffffff;
  border-radius: 32rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
  border: 2rpx solid rgba(232, 227, 219, 0.5);
}
.bm-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.bm-status {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
}
.bm-status-OPEN { background: #f0fdf4; }
.bm-status-CLAIMED { background: #eff6ff; }
.bm-status-ANSWERED { background: #fff7ed; }
.bm-status-SETTLED { background: #eff6ff; }
.bm-status-REFUNDED { background: #f3f4f6; }
.bm-status-CLOSED { background: #f9fafb; }
.bm-status-EXPIRED { background: #f3f4f6; }
.bm-status-text {
  font-size: 22rpx;
  font-weight: 500;
}
.bm-status-text-OPEN { color: #16a34a; }
.bm-status-text-CLAIMED { color: #2563eb; }
.bm-status-text-ANSWERED { color: #ea580c; }
.bm-status-text-SETTLED { color: #2563eb; }
.bm-status-text-REFUNDED { color: #999999; }
.bm-status-text-CLOSED { color: #999999; }
.bm-status-text-EXPIRED { color: #999999; }
.bm-amount {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.bm-amount-text {
  font-size: 30rpx;
  font-weight: 700;
  color: #d97706;
}
.bm-card-title {
  display: block;
  font-size: 30rpx;
  font-weight: 500;
  color: #2c2c2c;
  margin-bottom: 16rpx;
  line-height: 1.4;
}
.bm-card-desc {
  display: block;
  font-size: 26rpx;
  color: #999999;
  line-height: 1.5;
  margin-bottom: 24rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.bm-card-meta {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 24rpx;
}
.bm-cat {
  font-size: 22rpx;
  color: var(--brand);
  background: rgba(196, 30, 58, 0.08);
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
}
.bm-meta-text {
  font-size: 22rpx;
  color: #999999;
}

/* Actions */
.bm-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16rpx;
  padding-top: 24rpx;
  border-top: 2rpx solid rgba(240, 240, 239, 0.8);
}
.bm-act-disabled {
  opacity: 0.6;
}
.bm-act-settle {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 32rpx;
  background: #22c55e;
  border-radius: 16rpx;
}
.bm-act-settle-text {
  font-size: 26rpx;
  font-weight: 500;
  color: #ffffff;
}
.bm-act-refund {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 32rpx;
  background: #f59e0b;
  border-radius: 16rpx;
}
.bm-act-refund-text {
  font-size: 26rpx;
  font-weight: 500;
  color: #ffffff;
}
.bm-act-waiting {
  font-size: 22rpx;
  color: #999999;
}
.bm-act-earned {
  font-size: 24rpx;
  font-weight: 500;
  color: #16a34a;
}

/* Empty */
.bm-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
}
.bm-empty-icon {
  width: 160rpx;
  height: 160rpx;
  border-radius: 999rpx;
  background: #ececec;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
}
.bm-empty-text {
  font-size: 28rpx;
  color: #999999;
  margin-bottom: 32rpx;
}
.bm-empty-btn {
  padding: 20rpx 48rpx;
  background: var(--brand);
  border-radius: 999rpx;
}
.bm-empty-btn-text {
  font-size: 26rpx;
  font-weight: 500;
  color: #ffffff;
}

/* Skeleton */
.bm-sk {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.bm-sk-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.bm-sk-pill {
  width: 120rpx;
  height: 36rpx;
  border-radius: 999rpx;
  background: #ececec;
}
.bm-sk-line {
  height: 32rpx;
  border-radius: 8rpx;
  background: #ececec;
}
.bm-sk-w20 { width: 20%; }
.bm-sk-w75 { width: 75%; }
.bm-sk-w100 { width: 100%; }
</style>
