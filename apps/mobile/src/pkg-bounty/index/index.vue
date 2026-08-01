<template>
  <view class="bp-page">
    <!-- Header -->
    <view class="bp-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="bp-header-row">
        <view class="bp-header-left">
          <view class="bp-icon-btn" @tap="goBack">
            <app-icon name="chevron-left" :size="48" color="#2c2c2c" />
          </view>
          <text class="bp-title">悬赏广场</text>
        </view>
        <view class="bp-publish-btn" @tap="toCreate">
          <app-icon name="plus" :size="32" color="#ffffff" />
          <text class="bp-publish-text">发布悬赏</text>
        </view>
      </view>

      <!-- Status Tabs -->
      <scroll-view scroll-x :show-scrollbar="false" class="bp-tabs">
        <view class="bp-tabs-row">
          <view
            v-for="tab in statusTabs"
            :key="tab.key"
            class="bp-tab"
            :class="{ 'bp-tab-active': activeTab === tab.key }"
            @tap="switchTab(tab.key)"
          >
            <text class="bp-tab-text" :class="{ 'bp-tab-text-active': activeTab === tab.key }">{{ tab.label }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- List -->
    <view class="bp-list">
      <!-- Skeleton -->
      <template v-if="loading">
        <view v-for="i in 3" :key="i" class="bp-skeleton">
          <view class="bp-sk-row">
            <view class="bp-sk-body">
              <view class="bp-sk-line bp-sk-w25" />
              <view class="bp-sk-line bp-sk-w75" />
              <view class="bp-sk-line bp-sk-w100" />
            </view>
          </view>
        </view>
      </template>

      <!-- Error -->
      <app-error v-else-if="error" title="悬赏加载失败" desc="网络异常，请稍后重试" @retry="loadBounties" />

      <!-- Empty -->
      <view v-else-if="bounties.length === 0" class="bp-empty">
        <view class="bp-empty-icon">
          <app-icon name="message-square" :size="80" color="#999999" />
        </view>
        <text class="bp-empty-text">暂无悬赏问题</text>
        <view class="bp-empty-btn" @tap="toCreate">
          <text class="bp-empty-btn-text">发布悬赏</text>
        </view>
      </view>

      <!-- Cards -->
      <template v-else>
        <view
          v-for="bounty in bounties"
          :key="bounty.id"
          class="bp-card"
          @tap="toDetail(bounty.id)"
        >
          <!-- Card Header -->
          <view class="bp-card-head">
            <view class="bp-card-meta">
              <text v-if="categoryLabel(bounty.category)" class="bp-category">{{ categoryLabel(bounty.category) }}</text>
              <text class="bp-time">{{ formatBountyTime(bounty.createdAt) }}</text>
            </view>
            <view class="bp-status" :class="'bp-status-' + bounty.status">
              <text class="bp-status-text" :class="'bp-status-text-' + bounty.status">{{ statusLabel(bounty.status) }}</text>
            </view>
          </view>

          <!-- Content -->
          <text class="bp-card-title">{{ bounty.title }}</text>
          <text v-if="bounty.description && bounty.description.trim() !== bounty.title.trim()" class="bp-card-desc">{{ bounty.description }}</text>

          <!-- Footer -->
          <view class="bp-card-foot">
            <view class="bp-stats">
              <view v-if="bounty.status === 'ANSWERED'" class="bp-stat bp-stat-warn">
                <app-icon name="message-square" :size="28" color="#f97316" />
                <text class="bp-stat-text bp-stat-text-warn">已有回答待采纳</text>
              </view>
              <view v-else-if="bounty.status === 'CLAIMED'" class="bp-stat">
                <app-icon name="clock" :size="28" color="#999999" />
                <text class="bp-stat-text">答主答题中</text>
              </view>
            </view>
            <view class="bp-amount">
              <app-icon name="coins" :size="32" color="#c41e3a" />
              <text class="bp-amount-text">{{ bounty.bountyCoin }} 币</text>
            </view>
          </view>
        </view>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { navigateTo, navigateBack } from '@/utils/router'
import {
  bountyApi,
  formatBountyTime,
  BOUNTY_STATUS_LABEL,
  BOUNTY_CATEGORY_LABEL,
  BOUNTY_STATUS_TABS,
  type BountyQuestion,
  type BountyStatus,
} from '@/pkg-bounty/lib/bounty-data'

const statusTabs = BOUNTY_STATUS_TABS

const statusBarHeight = ref(0)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
} catch (e) {}

const activeTab = ref<'' | BountyStatus>('')
const loading = ref(true)
const error = ref(false)
const bounties = ref<BountyQuestion[]>([])

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
    const res = await bountyApi.list({ page: 1, pageSize: 20, status: activeTab.value || undefined })
    bounties.value = res.questions
  } catch (e) {
    error.value = true
  } finally {
    loading.value = false
  }
}

function switchTab(key: '' | BountyStatus) {
  if (activeTab.value === key) return
  activeTab.value = key
  loadBounties()
}

function goBack() {
  navigateBack()
}
function toCreate() {
  navigateTo('/bounty/create')
}
function toDetail(id: string) {
  navigateTo(`/bounty/${id}`)
}

loadBounties()
</script>

<style scoped>
.bp-page {
  min-height: 100vh;
  background: #f5f5f4;
  padding-bottom: 40rpx;
}

/* Header */
.bp-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #ffffff;
  border-bottom: 2rpx solid #e8e3db;
}
.bp-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
}
.bp-header-left {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.bp-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52rpx;
  height: 52rpx;
  margin-left: -8rpx;
}
.bp-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.bp-publish-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 24rpx;
  background: var(--brand);
  border-radius: 999rpx;
}
.bp-publish-text {
  font-size: 26rpx;
  font-weight: 500;
  color: #ffffff;
}

/* Tabs */
.bp-tabs {
  white-space: nowrap;
}
.bp-tabs-row {
  display: inline-flex;
  gap: 16rpx;
  padding: 0 32rpx 24rpx;
}
.bp-tab {
  flex-shrink: 0;
  padding: 12rpx 32rpx;
  border-radius: 999rpx;
  background: #f5f5f4;
}
.bp-tab-active {
  background: var(--brand);
}
.bp-tab-text {
  font-size: 26rpx;
  color: #666666;
}
.bp-tab-text-active {
  color: #ffffff;
}

/* List */
.bp-list {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

/* Skeleton */
.bp-skeleton {
  background: #ffffff;
  border-radius: 32rpx;
  padding: 32rpx;
}
.bp-sk-row {
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
}
.bp-sk-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.bp-sk-line {
  height: 32rpx;
  border-radius: 8rpx;
  background: #ececec;
}
.bp-sk-w25 { width: 25%; }
.bp-sk-w75 { width: 75%; }
.bp-sk-w100 { width: 100%; }

/* Empty */
.bp-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
}
.bp-empty-icon {
  width: 160rpx;
  height: 160rpx;
  border-radius: 999rpx;
  background: #ececec;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
}
.bp-empty-text {
  font-size: 28rpx;
  color: #999999;
  margin-bottom: 32rpx;
}
.bp-empty-btn {
  padding: 16rpx 48rpx;
  background: var(--brand);
  border-radius: 999rpx;
}
.bp-empty-btn-text {
  font-size: 26rpx;
  color: #ffffff;
}

/* Card */
.bp-card {
  background: #ffffff;
  border-radius: 32rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.05);
}
.bp-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24rpx;
  margin-bottom: 24rpx;
}
.bp-card-meta {
  display: flex;
  align-items: center;
  gap: 16rpx;
  min-width: 0;
}
.bp-category {
  font-size: 22rpx;
  color: #c41e3a;
  background: rgba(196, 30, 58, 0.08);
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
}
.bp-time {
  font-size: 22rpx;
  color: #999999;
}
.bp-status {
  flex-shrink: 0;
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
}
.bp-status-OPEN { background: #f0fdf4; }
.bp-status-CLAIMED { background: #eff6ff; }
.bp-status-ANSWERED { background: #fff7ed; }
.bp-status-SETTLED { background: #eff6ff; }
.bp-status-REFUNDED { background: #f5f5f4; }
.bp-status-CLOSED { background: #f5f5f4; }
.bp-status-EXPIRED { background: #f5f5f4; }
.bp-status-text {
  font-size: 22rpx;
}
.bp-status-text-OPEN { color: #16a34a; }
.bp-status-text-CLAIMED { color: #2563eb; }
.bp-status-text-ANSWERED { color: #ea580c; }
.bp-status-text-SETTLED { color: #2563eb; }
.bp-status-text-REFUNDED { color: #999999; }
.bp-status-text-CLOSED { color: #999999; }
.bp-status-text-EXPIRED { color: #999999; }

.bp-card-title {
  display: block;
  font-size: 30rpx;
  font-weight: 500;
  color: #2c2c2c;
  margin-bottom: 16rpx;
  line-height: 1.4;
}
.bp-card-desc {
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
.bp-card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 24rpx;
  border-top: 2rpx solid #f0f0ef;
}
.bp-stats {
  display: flex;
  align-items: center;
  gap: 32rpx;
}
.bp-stat {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.bp-stat-text {
  font-size: 22rpx;
  color: #999999;
}
.bp-stat-text-warn {
  color: #f97316;
}
.bp-amount {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.bp-amount-text {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--brand);
}
</style>
