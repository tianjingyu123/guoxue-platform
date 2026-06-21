<template>
  <view class="bp-page">
    <!-- Header -->
    <view
      class="bp-header"
      :style="{ paddingTop: statusBarHeight + 'px' }"
    >
      <view class="bp-header-row">
        <view class="bp-header-left">
          <view
            class="bp-icon-btn"
            @tap="goBack"
          >
            <app-icon
              name="chevron-left"
              :size="48"
              color="#2c2c2c"
            />
          </view>
          <text class="bp-title">
            悬赏广场
          </text>
        </view>
        <view
          class="bp-publish-btn"
          @tap="toCreate"
        >
          <app-icon
            name="plus"
            :size="32"
            color="#ffffff"
          />
          <text class="bp-publish-text">
            发布悬赏
          </text>
        </view>
      </view>

      <!-- Status Tabs -->
      <scroll-view
        scroll-x
        :show-scrollbar="false"
        class="bp-tabs"
      >
        <view class="bp-tabs-row">
          <view
            v-for="tab in statusTabs"
            :key="tab.key"
            class="bp-tab"
            :class="{ 'bp-tab-active': activeTab === tab.key }"
            @tap="switchTab(tab.key)"
          >
            <text
              class="bp-tab-text"
              :class="{ 'bp-tab-text-active': activeTab === tab.key }"
            >
              {{ tab.label }}
            </text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- List -->
    <view class="bp-list">
      <!-- Skeleton -->
      <template v-if="loading">
        <view
          v-for="i in 3"
          :key="i"
          class="bp-skeleton"
        >
          <view class="bp-sk-row">
            <view class="bp-sk-avatar" />
            <view class="bp-sk-body">
              <view class="bp-sk-line bp-sk-w25" />
              <view class="bp-sk-line bp-sk-w75" />
              <view class="bp-sk-line bp-sk-w100" />
            </view>
          </view>
        </view>
      </template>

      <!-- Empty -->
      <view
        v-else-if="bounties.length === 0"
        class="bp-empty"
      >
        <view class="bp-empty-icon">
          <app-icon
            name="message-square"
            :size="80"
            color="#999999"
          />
        </view>
        <text class="bp-empty-text">
          暂无悬赏问题
        </text>
        <view
          class="bp-empty-btn"
          @tap="toCreate"
        >
          <text class="bp-empty-btn-text">
            发布悬赏
          </text>
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
            <image
              :src="bounty.poster.avatar"
              class="bp-avatar"
              mode="aspectFill"
            />
            <view class="bp-card-meta">
              <view class="bp-card-meta-top">
                <text class="bp-poster-name">
                  {{ bounty.poster.name }}
                </text>
                <text class="bp-time">
                  {{ formatTime(bounty.createdAt) }}
                </text>
              </view>
              <text
                v-if="bounty.category"
                class="bp-category"
              >
                {{ bounty.category }}
              </text>
            </view>
            <view
              class="bp-status"
              :class="'bp-status-' + bounty.status"
            >
              <text
                class="bp-status-text"
                :class="'bp-status-text-' + bounty.status"
              >
                {{ statusConfig[bounty.status].label }}
              </text>
            </view>
          </view>

          <!-- Content -->
          <text class="bp-card-title">
            {{ bounty.title }}
          </text>
          <text class="bp-card-desc">
            {{ bounty.description }}
          </text>

          <!-- Tags -->
          <view
            v-if="bounty.tags && bounty.tags.length"
            class="bp-tags"
          >
            <text
              v-for="tag in bounty.tags"
              :key="tag"
              class="bp-tag"
            >
              #{{ tag }}
            </text>
          </view>

          <!-- Footer -->
          <view class="bp-card-foot">
            <view class="bp-stats">
              <view class="bp-stat">
                <app-icon
                  name="eye"
                  :size="28"
                  color="#999999"
                />
                <text class="bp-stat-text">
                  {{ bounty.viewCount }}
                </text>
              </view>
              <view class="bp-stat">
                <app-icon
                  name="message-square"
                  :size="28"
                  color="#999999"
                />
                <text class="bp-stat-text">
                  {{ bounty.answerCount }}个回答
                </text>
              </view>
              <view
                v-if="bounty.status === 'open'"
                class="bp-stat bp-stat-warn"
              >
                <app-icon
                  name="clock"
                  :size="28"
                  color="#f97316"
                />
                <text class="bp-stat-text bp-stat-text-warn">
                  {{ getRemainingTime(bounty.expireAt) }}
                </text>
              </view>
            </view>
            <view class="bp-amount">
              <app-icon
                name="coins"
                :size="32"
                color="#c41e3a"
              />
              <text class="bp-amount-text">
                ¥{{ bounty.amount }}
              </text>
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

interface Bounty {
  id: string
  title: string
  description: string
  amount: number
  status: 'open' | 'answered' | 'resolved' | 'expired' | 'cancelled'
  poster: { id: string; name: string; avatar: string }
  answerCount: number
  viewCount: number
  category?: string
  tags?: string[]
  createdAt: string
  expireAt: string
  resolvedAt?: string
}

const statusTabs = [
  { key: 'all', label: '全部' },
  { key: 'open', label: '进行中' },
  { key: 'resolved', label: '已解决' },
  { key: 'expired', label: '已过期' },
]

const statusConfig: Record<string, { label: string }> = {
  open: { label: '进行中' },
  answered: { label: '待采纳' },
  resolved: { label: '已解决' },
  expired: { label: '已过期' },
  cancelled: { label: '已取消' },
}

const statusBarHeight = ref(0)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
} catch (e) {}

const activeTab = ref('all')
const loading = ref(true)
const bounties = ref<Bounty[]>([])

const allBounties: Bounty[] = [
  {
    id: '1',
    title: '求解八字命盘中的财运分析方法',
    description: '想了解如何从八字命盘中分析一个人的财运走势，包括正财、偏财的判断方法...',
    amount: 50,
    status: 'open',
    poster: { id: 'u1', name: '易学初学者', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=u1' },
    answerCount: 3,
    viewCount: 128,
    category: '八字',
    tags: ['财运', '命盘分析'],
    createdAt: '2024-01-15T10:00:00Z',
    expireAt: '2024-01-22T10:00:00Z',
  },
  {
    id: '2',
    title: '风水布局中如何化解尖角煞？',
    description: '家里客厅有一个突出的墙角对着沙发，听说这是尖角煞，请问有什么化解方法？',
    amount: 30,
    status: 'resolved',
    poster: { id: 'u2', name: '风水爱好者', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=u2' },
    answerCount: 5,
    viewCount: 256,
    category: '风水',
    tags: ['家居风水', '化煞'],
    createdAt: '2024-01-14T08:00:00Z',
    expireAt: '2024-01-21T08:00:00Z',
    resolvedAt: '2024-01-16T14:00:00Z',
  },
  {
    id: '3',
    title: '梅花易数起卦时间问题请教',
    description: '用梅花易数起卦时，如果是别人问事，应该用问卦人的时间还是起卦人的时间？',
    amount: 20,
    status: 'answered',
    poster: { id: 'u3', name: '梅花学徒', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=u3' },
    answerCount: 2,
    viewCount: 89,
    category: '梅花易数',
    tags: ['起卦', '时间'],
    createdAt: '2024-01-13T15:00:00Z',
    expireAt: '2024-01-20T15:00:00Z',
  },
  {
    id: '4',
    title: '六爻预测中的用神取用问题',
    description: '在六爻预测中，如何准确判断用神？特别是测事业和财运时的用神取法...',
    amount: 100,
    status: 'open',
    poster: { id: 'u4', name: '六爻研究者', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=u4' },
    answerCount: 1,
    viewCount: 312,
    category: '六爻',
    tags: ['用神', '预测技巧'],
    createdAt: '2024-01-12T09:00:00Z',
    expireAt: '2024-01-19T09:00:00Z',
  },
  {
    id: '5',
    title: '奇门遁甲中的三奇六仪如何理解？',
    description: '刚开始学习奇门遁甲，对三奇六仪的概念比较模糊，希望能有详细的解释...',
    amount: 40,
    status: 'expired',
    poster: { id: 'u5', name: '奇门新手', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=u5' },
    answerCount: 0,
    viewCount: 45,
    category: '奇门遁甲',
    tags: ['基础概念', '入门'],
    createdAt: '2024-01-01T10:00:00Z',
    expireAt: '2024-01-08T10:00:00Z',
  },
]

function loadBounties() {
  loading.value = true
  const filtered = activeTab.value === 'all'
    ? allBounties
    : allBounties.filter(b => b.status === activeTab.value)
  setTimeout(() => {
    bounties.value = filtered
    loading.value = false
  }, 400)
}

function switchTab(key: string) {
  if (activeTab.value === key) return
  activeTab.value = key
  loadBounties()
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`
  return `${date.getMonth() + 1}/${date.getDate()}`
}

function getRemainingTime(expireAt: string) {
  const expire = new Date(expireAt)
  const now = new Date()
  const diff = expire.getTime() - now.getTime()
  if (diff <= 0) return '已过期'
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  if (days > 0) return `剩余${days}天`
  return `剩余${hours}小时`
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
  background: #c41e3a;
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
  background: #c41e3a;
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
.bp-sk-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 999rpx;
  background: #ececec;
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
  background: #c41e3a;
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
  align-items: flex-start;
  gap: 24rpx;
  margin-bottom: 24rpx;
}
.bp-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 999rpx;
  flex-shrink: 0;
  background: #ececec;
}
.bp-card-meta {
  flex: 1;
  min-width: 0;
}
.bp-card-meta-top {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.bp-poster-name {
  font-size: 26rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.bp-time {
  font-size: 22rpx;
  color: #999999;
}
.bp-category {
  font-size: 22rpx;
  color: #999999;
}
.bp-status {
  flex-shrink: 0;
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
}
.bp-status-open { background: #f0fdf4; }
.bp-status-answered { background: #fff7ed; }
.bp-status-resolved { background: #eff6ff; }
.bp-status-expired { background: #f5f5f4; }
.bp-status-cancelled { background: #f5f5f4; }
.bp-status-text {
  font-size: 22rpx;
}
.bp-status-text-open { color: #16a34a; }
.bp-status-text-answered { color: #ea580c; }
.bp-status-text-resolved { color: #2563eb; }
.bp-status-text-expired { color: #999999; }
.bp-status-text-cancelled { color: #999999; }

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
}
.bp-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-bottom: 24rpx;
}
.bp-tag {
  padding: 4rpx 16rpx;
  background: #f5f5f4;
  border-radius: 8rpx;
  font-size: 22rpx;
  color: #999999;
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
  color: #c41e3a;
}
</style>
