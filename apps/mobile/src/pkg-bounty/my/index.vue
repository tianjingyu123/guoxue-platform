<template>
  <view class="bm-page">
    <!-- Header -->
    <view
      class="bm-header"
      :style="{ paddingTop: statusBarHeight + 'px' }"
    >
      <view class="bm-header-row">
        <view
          class="bm-icon-btn"
          @tap="goBack"
        >
          <app-icon
            name="chevron-left"
            :size="40"
            color="#2c2c2c"
          />
        </view>
        <text class="bm-header-title">
          我的悬赏
        </text>
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
          <text
            class="bm-tab-text"
            :class="{ 'bm-tab-text-active': activeTab === tab.key }"
          >
            {{ tab.label }}
          </text>
          <view
            v-if="activeTab === tab.key"
            class="bm-tab-line"
          />
        </view>
      </view>
    </view>

    <!-- Stats Card -->
    <view
      v-if="!loading && bounties.length"
      class="bm-stats-wrap"
    >
      <view class="bm-stats">
        <view class="bm-stats-head">
          <app-icon
            name="gift"
            :size="32"
            color="#ffffff"
          />
          <text class="bm-stats-title">
            {{ activeTab === 'posted' ? '发布统计' : '回答统计' }}
          </text>
        </view>
        <view class="bm-stats-grid">
          <view class="bm-stat">
            <text class="bm-stat-num">
              {{ stats.total }}
            </text>
            <text class="bm-stat-label">
              总数
            </text>
          </view>
          <view class="bm-stat">
            <text class="bm-stat-num">
              {{ stats.open }}
            </text>
            <text class="bm-stat-label">
              进行中
            </text>
          </view>
          <view class="bm-stat">
            <text class="bm-stat-num">
              {{ stats.resolved }}
            </text>
            <text class="bm-stat-label">
              已解决
            </text>
          </view>
          <view class="bm-stat">
            <text class="bm-stat-num">
              ¥{{ stats.totalAmount }}
            </text>
            <text class="bm-stat-label">
              {{ activeTab === 'posted' ? '总投入' : '总收益' }}
            </text>
          </view>
        </view>
      </view>
    </view>

    <!-- List -->
    <view class="bm-list">
      <!-- Skeleton -->
      <template v-if="loading">
        <view
          v-for="i in 3"
          :key="i"
          class="bm-card bm-sk"
        >
          <view class="bm-sk-row">
            <view class="bm-sk-pill" />
            <view class="bm-sk-line bm-sk-w20" />
          </view>
          <view class="bm-sk-line bm-sk-w75" />
          <view class="bm-sk-line bm-sk-w100" />
        </view>
      </template>

      <!-- Empty -->
      <view
        v-else-if="bounties.length === 0"
        class="bm-empty"
      >
        <view class="bm-empty-icon">
          <app-icon
            name="gift"
            :size="80"
            color="#999999"
          />
        </view>
        <text class="bm-empty-text">
          {{ activeTab === 'posted' ? '还没有发布过悬赏' : '还没有回答过悬赏' }}
        </text>
        <view
          v-if="activeTab === 'posted'"
          class="bm-empty-btn"
          @tap="toCreate"
        >
          <text class="bm-empty-btn-text">
            发布悬赏
          </text>
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
            <view
              class="bm-status"
              :class="'bm-status-' + bounty.status"
            >
              <app-icon
                :name="statusConfig[bounty.status].icon"
                :size="26"
                :color="statusConfig[bounty.status].color"
              />
              <text
                class="bm-status-text"
                :style="{ color: statusConfig[bounty.status].color }"
              >
                {{ statusConfig[bounty.status].label }}
              </text>
            </view>
            <view class="bm-amount">
              <app-icon
                name="gift"
                :size="30"
                color="#d97706"
              />
              <text class="bm-amount-text">
                ¥{{ bounty.amount }}
              </text>
            </view>
          </view>

          <text class="bm-card-title">
            {{ bounty.title }}
          </text>
          <text class="bm-card-desc">
            {{ bounty.description }}
          </text>

          <view class="bm-card-meta">
            <template v-if="activeTab === 'posted'">
              <view class="bm-meta-item">
                <app-icon
                  name="message-square"
                  :size="28"
                  color="#999999"
                />
                <text class="bm-meta-text">
                  {{ bounty.answerCount }}个回答
                </text>
              </view>
              <view
                v-if="bounty.status === 'open'"
                class="bm-meta-item"
              >
                <app-icon
                  name="clock"
                  :size="28"
                  color="#f97316"
                />
                <text class="bm-meta-text bm-meta-warn">
                  {{ getRemainTime(bounty.expireAt) }}
                </text>
              </view>
            </template>
            <template v-else>
              <text class="bm-meta-text">
                {{ formatTimeAgo(bounty.createdAt) }}回答
              </text>
              <view
                v-if="bounty.status === 'resolved'"
                class="bm-meta-item"
              >
                <app-icon
                  name="check-circle"
                  :size="28"
                  color="#16a34a"
                />
                <text class="bm-meta-text bm-meta-green">
                  已被采纳
                </text>
              </view>
            </template>
          </view>

          <!-- Actions -->
          <view
            v-if="activeTab === 'posted'"
            class="bm-actions"
          >
            <view
              v-if="bounty.status === 'answered'"
              class="bm-act-settle"
              @tap.stop="settle(bounty.id)"
            >
              <app-icon
                name="wallet"
                :size="28"
                color="#ffffff"
              />
              <text class="bm-act-settle-text">
                结算悬赏
              </text>
            </view>
            <view
              v-else-if="bounty.status === 'expired' || bounty.status === 'cancelled'"
              class="bm-act-repost"
              @tap.stop="repost(bounty.id)"
            >
              <app-icon
                name="refresh-cw"
                :size="28"
                color="#ffffff"
              />
              <text class="bm-act-repost-text">
                重新发布
              </text>
            </view>
            <text
              v-else-if="bounty.status === 'open' && bounty.answerCount === 0"
              class="bm-act-waiting"
            >
              等待回答中...
            </text>
            <view
              v-else-if="bounty.status === 'open' && bounty.answerCount > 0"
              class="bm-act-view"
              @tap.stop="toDetail(bounty.id)"
            >
              <text class="bm-act-view-text">
                查看回答
              </text>
            </view>
          </view>
        </view>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { navigateTo, navigateBack } from '@/utils/router'

interface Bounty {
  id: string
  title: string
  description: string
  amount: number
  status: 'open' | 'answered' | 'resolved' | 'expired' | 'cancelled'
  answerCount: number
  createdAt: string
  expireAt: string
}

const tabs = [
  { key: 'posted' as const, label: '我发布的' },
  { key: 'answered' as const, label: '我回答的' },
]

const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
  open: { label: '进行中', color: '#2563eb', icon: 'clock' },
  answered: { label: '待采纳', color: '#ea580c', icon: 'message-square' },
  resolved: { label: '已解决', color: '#16a34a', icon: 'check-circle' },
  expired: { label: '已过期', color: '#999999', icon: 'x-circle' },
  cancelled: { label: '已取消', color: '#bbbbbb', icon: 'x-circle' },
}

const statusBarHeight = ref(0)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
} catch (e) {}

const activeTab = ref<'posted' | 'answered'>('posted')
const loading = ref(true)
const bounties = ref<Bounty[]>([])

const postedData: Bounty[] = [
  { id: '1', title: '求解八字命盘中的财运分析方法', description: '想了解如何从八字命盘中分析一个人的财运走势...', amount: 50, status: 'answered', answerCount: 3, createdAt: '2024-01-15T10:00:00Z', expireAt: '2024-01-22T10:00:00Z' },
  { id: '2', title: '风水布局中如何化解尖角煞？', description: '家里客厅有一个突出的墙角对着沙发...', amount: 30, status: 'resolved', answerCount: 5, createdAt: '2024-01-10T08:00:00Z', expireAt: '2024-01-17T08:00:00Z' },
  { id: '3', title: '梅花易数起卦时间问题请教', description: '用梅花易数起卦时，如果是别人问事...', amount: 20, status: 'open', answerCount: 0, createdAt: '2024-01-18T15:00:00Z', expireAt: '2024-02-18T15:00:00Z' },
  { id: '4', title: '六爻预测中的用神取用问题', description: '在六爻预测中，如何准确判断用神？', amount: 100, status: 'expired', answerCount: 0, createdAt: '2023-12-20T09:00:00Z', expireAt: '2023-12-27T09:00:00Z' },
]
const answeredData: Bounty[] = [
  { id: '5', title: '紫微斗数命宫主星的判断方法', description: '请教如何快速判断命宫主星...', amount: 60, status: 'resolved', answerCount: 4, createdAt: '2024-01-12T11:00:00Z', expireAt: '2024-01-19T11:00:00Z' },
  { id: '6', title: '奇门遁甲值符值使如何排布？', description: '奇门起局时值符值使的排布规则...', amount: 80, status: 'open', answerCount: 2, createdAt: '2024-01-16T14:00:00Z', expireAt: '2024-02-16T14:00:00Z' },
]

function loadBounties() {
  loading.value = true
  setTimeout(() => {
    bounties.value = activeTab.value === 'posted' ? postedData : answeredData
    loading.value = false
  }, 400)
}

function switchTab(key: 'posted' | 'answered') {
  if (activeTab.value === key) return
  activeTab.value = key
  loadBounties()
}

const stats = computed(() => ({
  total: bounties.value.length,
  open: bounties.value.filter(b => b.status === 'open').length,
  resolved: bounties.value.filter(b => b.status === 'resolved').length,
  totalAmount: bounties.value.reduce((sum, b) => sum + b.amount, 0),
}))

function settle(id: string) {
  uni.showToast({ title: '结算成功', icon: 'success' })
}
function repost(id: string) {
  navigateTo(`/bounty/create?repost=${id}`)
}
function toDetail(id: string) {
  navigateTo(`/bounty/${id}`)
}
function toCreate() {
  navigateTo('/bounty/create')
}

function formatTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days > 30) return `${Math.floor(days / 30)}个月前`
  if (days > 0) return `${days}天前`
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours > 0) return `${hours}小时前`
  return '刚刚'
}
function getRemainTime(expireAt: string) {
  const diff = new Date(expireAt).getTime() - Date.now()
  if (diff <= 0) return '已过期'
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  if (days > 0) return `剩余${days}天${hours}小时`
  return `剩余${hours}小时`
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
  color: #c41e3a;
}
.bm-tab-line {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 48rpx;
  height: 4rpx;
  background: #c41e3a;
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
.bm-status-open { background: #eff6ff; }
.bm-status-answered { background: #fff7ed; }
.bm-status-resolved { background: #f0fdf4; }
.bm-status-expired { background: #f3f4f6; }
.bm-status-cancelled { background: #f9fafb; }
.bm-status-text {
  font-size: 22rpx;
  font-weight: 500;
}
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
}
.bm-card-meta {
  display: flex;
  align-items: center;
  gap: 32rpx;
  margin-bottom: 24rpx;
}
.bm-meta-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.bm-meta-text {
  font-size: 22rpx;
  color: #999999;
}
.bm-meta-warn { color: #f97316; }
.bm-meta-green { color: #16a34a; }

/* Actions */
.bm-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16rpx;
  padding-top: 24rpx;
  border-top: 2rpx solid rgba(240, 240, 239, 0.8);
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
.bm-act-repost {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 32rpx;
  background: #c41e3a;
  border-radius: 16rpx;
}
.bm-act-repost-text {
  font-size: 26rpx;
  font-weight: 500;
  color: #ffffff;
}
.bm-act-waiting {
  font-size: 22rpx;
  color: #999999;
}
.bm-act-view {
  padding: 16rpx 32rpx;
  background: #f59e0b;
  border-radius: 16rpx;
}
.bm-act-view-text {
  font-size: 26rpx;
  font-weight: 500;
  color: #ffffff;
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
  background: #c41e3a;
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
