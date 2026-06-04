<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="header">
      <view class="header-inner">
        <view class="header-left">
          <text
            class="back-btn"
            @click="goBack"
          >
            ←
          </text>
          <text class="header-title">
            管理中心
          </text>
        </view>
        <view
          class="header-notif"
          @click="goNotif"
        >
          <text class="header-notif-icon">
            🔔
          </text>
          <text
            v-if="totalPending > 0"
            class="header-notif-dot"
          />
        </view>
      </view>

      <!-- 管理员信息 -->
      <view
        v-if="adminInfo"
        class="admin-info"
      >
        <view class="admin-avatar-wrap">
          <text class="admin-avatar-icon">
            👤
          </text>
        </view>
        <view class="admin-detail">
          <text class="admin-name">
            {{ adminInfo.name }}
          </text>
          <text class="admin-role">
            {{ adminInfo.roleName }}
          </text>
        </view>
      </view>
    </view>

    <DataState
      :is-loading="loading"
      :error="loadError"
      :is-empty="!panelData"
      empty-icon="📊"
      empty-title="暂无数据"
      skeleton-type="card"
      @retry="loadData"
    >
      <view
        v-if="panelData"
        class="content"
      >
        <!-- 数据概览 -->
        <view class="section">
          <text class="section-label">
            数据概览
          </text>
          <view class="overview-grid">
            <view
              v-for="item in panelData.overview"
              :key="item.key"
              class="overview-card"
            >
              <view class="overview-info">
                <text class="overview-label">
                  {{ item.label }}
                </text>
                <text class="overview-value">
                  {{ formatNumber(item.value) }}
                  <text
                    v-if="item.unit"
                    class="overview-unit"
                  >
                    {{ item.unit }}
                  </text>
                </text>
                <view
                  v-if="item.trend"
                  class="overview-trend"
                >
                  <text
                    v-if="item.trend.type === 'up'"
                    class="trend-up"
                  >
                    ↑
                  </text>
                  <text
                    v-else-if="item.trend.type === 'down'"
                    class="trend-down"
                  >
                    ↓
                  </text>
                  <text :class="item.trend.type === 'up' ? 'trend-up' : 'trend-down'">
                    {{ item.trend.value }}%
                  </text>
                  <text class="trend-label">
                    {{ item.trend.label }}
                  </text>
                </view>
              </view>
              <view class="overview-icon-wrap">
                <text class="overview-icon">
                  {{ overviewIcon(item.icon) }}
                </text>
              </view>
            </view>
          </view>
        </view>

        <!-- 快捷功能 -->
        <view class="section">
          <text class="section-label">
            快捷功能
          </text>
          <view class="quick-grid">
            <view
              v-for="action in panelData.quickActions"
              :key="action.id"
              class="quick-item"
              @click="goQuick(action)"
            >
              <view
                class="quick-icon-wrap"
                :style="{ background: action.color + '20' }"
              >
                <text
                  class="quick-icon-text"
                  :style="{ color: action.color }"
                >
                  {{ quickIcon(action.icon) }}
                </text>
                <text
                  v-if="action.badge && action.badge > 0"
                  class="quick-badge"
                >
                  {{ action.badge > 99 ? '99+' : action.badge }}
                </text>
              </view>
              <text class="quick-label">
                {{ action.label }}
              </text>
            </view>
          </view>
        </view>

        <!-- 待处理事项 -->
        <view class="section">
          <view class="section-header">
            <text class="section-label">
              待处理事项
            </text>
            <text
              v-if="totalPending > 0"
              class="section-badge"
            >
              {{ totalPending }}
            </text>
            <text
              class="section-more"
              @click="goPending"
            >
              查看全部 →
            </text>
          </view>

          <view
            v-if="panelData.pendingItems.length > 0"
            class="pending-list"
          >
            <view
              v-for="item in panelData.pendingItems.slice(0, 5)"
              :key="item.id"
              class="pending-card"
              @click="goPendingDetail(item)"
            >
              <view
                class="pending-priority"
                :class="'pp-' + item.priority"
              />
              <view class="pending-info">
                <view class="pending-title-row">
                  <text class="pending-title">
                    {{ item.title }}
                  </text>
                  <text
                    class="pending-priority-tag"
                    :class="'ppt-' + item.priority"
                  >
                    {{ priorityLabel(item.priority) }}
                  </text>
                </view>
                <text class="pending-desc">
                  {{ item.description }}
                </text>
                <view class="pending-meta">
                  <text class="pending-time">
                    {{ item.createdAt }}
                  </text>
                  <text class="pending-type">
                    {{ pendingTypeName(item.type) }}
                  </text>
                </view>
              </view>
              <text class="pending-arrow">
                →
              </text>
            </view>
          </view>

          <view
            v-else
            class="empty-pending"
          >
            <text class="empty-pending-icon">
              ✅
            </text>
            <text class="empty-pending-text">
              暂无待处理事项
            </text>
          </view>
        </view>

        <!-- 分类统计 -->
        <view class="section">
          <text class="section-label">
            分类统计
          </text>
          <view class="stats-grid">
            <view
              v-for="stat in categoryStats"
              :key="stat.key"
              class="stats-cell"
            >
              <text
                class="stats-cell-value"
                :style="{ color: stat.color }"
              >
                {{ stat.count }}
              </text>
              <text class="stats-cell-label">
                {{ stat.label }}
              </text>
            </view>
          </view>
        </view>
      </view>
    </DataState>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import DataState from '../../../components/DataState.vue'

interface TrendInfo {
  type: 'up' | 'down' | 'flat'
  value: number
  label: string
}

interface OverviewItem {
  key: string
  label: string
  value: number
  unit?: string
  icon: string
  trend?: TrendInfo
}

interface QuickAction {
  id: string
  label: string
  icon: string
  color: string
  href: string
  badge?: number
}

interface PendingItem {
  id: string
  title: string
  description: string
  type: string
  priority: 'high' | 'medium' | 'low'
  createdAt: string
  href: string
}

interface PendingCounts {
  contentReview: number
  userReport: number
  orderRefund: number
  withdraw: number
  certification: number
  feedback: number
}

interface PanelData {
  overview: OverviewItem[]
  quickActions: QuickAction[]
  pendingItems: PendingItem[]
  pendingCounts: PendingCounts
}

interface AdminInfo {
  name: string
  roleName: string
}

const loading = ref(true)
const loadError = ref<string | null>(null)
const panelData = ref<PanelData | null>(null)
const adminInfo = ref<AdminInfo | null>(null)

const categoryStats = computed(() => {
  if (!panelData.value) return []
  const pc = panelData.value.pendingCounts
  return [
    { key: 'contentReview', label: '内容审核', count: pc.contentReview, color: '#C41E3A' },
    { key: 'userReport', label: '用户举报', count: pc.userReport, color: '#DC143C' },
    { key: 'orderRefund', label: '退款申请', count: pc.orderRefund, color: '#C9A96E' },
    { key: 'withdraw', label: '提现审核', count: pc.withdraw, color: '#8B4513' },
    { key: 'certification', label: '认证审核', count: pc.certification, color: '#9370DB' },
    { key: 'feedback', label: '用户反馈', count: pc.feedback, color: '#708090' },
  ]
})

const totalPending = computed(() => {
  if (!panelData.value) return 0
  const pc = panelData.value.pendingCounts
  return Object.values(pc).reduce((a, b) => a + b, 0)
})

function formatNumber(n: number): string {
  return n.toLocaleString()
}

function overviewIcon(icon: string): string {
  const map: Record<string, string> = { users: '👥', 'shopping-bag': '🛍', 'dollar-sign': '💰', activity: '📊', 'file-check': '✅', 'bar-chart-2': '📈', award: '🏆', 'alert-triangle': '⚠', settings: '⚙' }
  return map[icon] || '📊'
}

function quickIcon(icon: string): string {
  const map: Record<string, string> = { users: '👥', 'shopping-bag': '🛍', 'dollar-sign': '💰', activity: '📊', 'file-check': '✅', 'bar-chart-2': '📈', award: '🏆', 'alert-triangle': '⚠', settings: '⚙' }
  return map[icon] || '📊'
}

function priorityLabel(priority: string): string {
  const map: Record<string, string> = { high: '紧急', medium: '普通', low: '低优先' }
  return map[priority] || priority
}

function pendingTypeName(type: string): string {
  const map: Record<string, string> = { contentReview: '内容审核', userReport: '用户举报', orderRefund: '退款申请', withdraw: '提现审核', certification: '认证审核', feedback: '用户反馈' }
  return map[type] || type
}

async function loadData() {
  loading.value = true
  loadError.value = null
  try {
    await new Promise((r) => setTimeout(r, 600))
    adminInfo.value = { name: '张三丰', roleName: '超级管理员' }
    panelData.value = {
      overview: [
        { key: 'users', label: '总用户数', value: 128560, icon: 'users', trend: { type: 'up', value: 12.5, label: '较上月' } },
        { key: 'orders', label: '今日订单', value: 368, icon: 'shopping-bag', trend: { type: 'up', value: 8.3, label: '较昨日' } },
        { key: 'revenue', label: '本月收入', value: 89500, unit: '元', icon: 'dollar-sign', trend: { type: 'up', value: 15.2, label: '较上月' } },
        { key: 'active', label: '活跃用户', value: 12856, icon: 'activity', trend: { type: 'down', value: 3.1, label: '较昨日' } },
      ],
      quickActions: [
        { id: 'q1', label: '用户管理', icon: 'users', color: '#3B82F6', href: '/pages/admin/users', badge: 0 },
        { id: 'q2', label: '内容审核', icon: 'file-check', color: '#22C55E', href: '/pages/admin/content-review', badge: 23 },
        { id: 'q3', label: '订单管理', icon: 'shopping-bag', color: '#F59E0B', href: '/pages/admin/orders', badge: 5 },
        { id: 'q4', label: '数据报表', icon: 'bar-chart-2', color: '#8B5CF6', href: '/pages/admin/reports', badge: 0 },
        { id: 'q5', label: '系统设置', icon: 'settings', color: '#6B7280', href: '/pages/admin/settings', badge: 0 },
        { id: 'q6', label: '提现审核', icon: 'dollar-sign', color: '#C41E3A', href: '/pages/admin/withdraw', badge: 8 },
        { id: 'q7', label: '举报处理', icon: 'alert-triangle', color: '#EF4444', href: '/pages/admin/reports', badge: 3 },
        { id: 'q8', label: '认证审核', icon: 'award', color: '#C9A96E', href: '/pages/admin/certification', badge: 12 },
      ],
      pendingItems: [
        { id: 'p1', title: '用户举报：不良内容', description: '用户举报ID:12345发布的内容涉嫌违规，请尽快处理', type: 'contentReview', priority: 'high', createdAt: '2026-06-04 09:30', href: '/pages/admin/pending/1' },
        { id: 'p2', title: '提现申请审核', description: '用户「国学传承人」申请提现5,000元，需审核', type: 'withdraw', priority: 'medium', createdAt: '2026-06-04 08:15', href: '/pages/admin/pending/2' },
        { id: 'p3', title: '退款申请处理', description: '订单#OD20260603128 申请退款299元，等待处理', type: 'orderRefund', priority: 'high', createdAt: '2026-06-03 16:20', href: '/pages/admin/pending/3' },
      ],
      pendingCounts: { contentReview: 23, userReport: 3, orderRefund: 5, withdraw: 8, certification: 12, feedback: 6 },
    }
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function goQuick(action: QuickAction) {
  uni.showToast({ title: '打开：' + action.label, icon: 'none' })
}

function goPending() {
  uni.showToast({ title: '查看全部待处理', icon: 'none' })
}

function goPendingDetail(item: PendingItem) {
  uni.showToast({ title: '处理：' + item.title, icon: 'none' })
}

function goNotif() {
  uni.showToast({ title: '消息通知', icon: 'none' })
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.page { background: #FAF8F5; min-height: 100vh; }
.header { background: linear-gradient(135deg, #C41E3A, #A01830); color: #fff; }
.header-inner { display: flex; align-items: center; justify-content: space-between; height: 88rpx; padding: 0 24rpx; }
.header-left { display: flex; align-items: center; gap: 12rpx; }
.back-btn { font-size: 36rpx; color: #fff; padding: 8rpx; }
.header-title { font-size: 34rpx; font-weight: 600; color: #fff; }
.header-notif { position: relative; padding: 8rpx; }
.header-notif-icon { font-size: 36rpx; color: #fff; }
.header-notif-dot { width: 14rpx; height: 14rpx; background: #FFD700; border-radius: 50%; position: absolute; top: 4rpx; right: 4rpx; }

.admin-info { display: flex; align-items: center; gap: 16rpx; padding: 0 24rpx 24rpx; }
.admin-avatar-wrap { width: 80rpx; height: 80rpx; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; }
.admin-avatar-icon { font-size: 36rpx; color: #fff; }
.admin-detail { }
.admin-name { font-size: 28rpx; font-weight: 500; color: #fff; display: block; }
.admin-role { font-size: 22rpx; color: rgba(255,255,255,0.7); display: block; margin-top: 4rpx; }

.content { padding: 24rpx; padding-bottom: 48rpx; }
.section { margin-bottom: 32rpx; }
.section-label { font-size: 22rpx; color: #999; display: block; margin-bottom: 16rpx; }
.section-header { display: flex; align-items: center; gap: 8rpx; margin-bottom: 16rpx; }
.section-header .section-label { margin-bottom: 0; flex: 1; }
.section-badge { font-size: 18rpx; padding: 2rpx 12rpx; background: #C41E3A; color: #fff; border-radius: 16rpx; }
.section-more { font-size: 22rpx; color: #C9A96E; }

/* 数据概览 */
.overview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx; }
.overview-card { background: #fff; border-radius: 16rpx; padding: 24rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); display: flex; justify-content: space-between; }
.overview-info { flex: 1; }
.overview-label { font-size: 20rpx; color: #999; display: block; margin-bottom: 8rpx; }
.overview-value { font-size: 36rpx; font-weight: 700; color: #2C2C2C; display: block; }
.overview-unit { font-size: 22rpx; font-weight: 400; color: #999; }
.overview-trend { display: flex; align-items: center; gap: 4rpx; margin-top: 8rpx; }
.trend-up { font-size: 20rpx; color: #22C55E; }
.trend-down { font-size: 20rpx; color: #EF4444; }
.trend-label { font-size: 18rpx; color: #B8B0A4; }
.overview-icon-wrap { width: 72rpx; height: 72rpx; border-radius: 50%; background: #FFF8F0; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.overview-icon { font-size: 32rpx; }

/* 快捷功能 */
.quick-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16rpx; }
.quick-item { display: flex; flex-direction: column; align-items: center; gap: 8rpx; padding: 16rpx 8rpx; background: #fff; border-radius: 16rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); position: relative; }
.quick-icon-wrap { width: 80rpx; height: 80rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; position: relative; }
.quick-icon-text { font-size: 32rpx; }
.quick-badge { position: absolute; top: -4rpx; right: -4rpx; min-width: 32rpx; height: 32rpx; border-radius: 16rpx; background: #C41E3A; color: #fff; font-size: 18rpx; display: flex; align-items: center; justify-content: center; padding: 0 6rpx; }
.quick-label { font-size: 20rpx; color: #666; }

/* 待处理事项 */
.pending-list { display: flex; flex-direction: column; gap: 12rpx; }
.pending-card { display: flex; gap: 12rpx; background: #fff; border-radius: 16rpx; padding: 20rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.pending-priority { width: 6rpx; min-height: 80rpx; border-radius: 3rpx; flex-shrink: 0; }
.pp-high { background: #C41E3A; }
.pp-medium { background: #C9A96E; }
.pp-low { background: #D0C8B8; }
.pending-info { flex: 1; min-width: 0; }
.pending-title-row { display: flex; align-items: center; justify-content: space-between; gap: 8rpx; }
.pending-title { font-size: 26rpx; font-weight: 500; color: #2C2C2C; flex: 1; }
.pending-priority-tag { font-size: 18rpx; padding: 2rpx 12rpx; border-radius: 12rpx; }
.ppt-high { background: #FDE8E8; color: #C41E3A; }
.ppt-medium { background: #FFF8E1; color: #C9A96E; }
.ppt-low { background: #F5F5F5; color: #999; }
.pending-desc { font-size: 22rpx; color: #999; margin-top: 6rpx; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pending-meta { display: flex; align-items: center; gap: 8rpx; margin-top: 8rpx; }
.pending-time { font-size: 18rpx; color: #B8B0A4; }
.pending-type { font-size: 18rpx; color: #C9A96E; }
.pending-arrow { font-size: 28rpx; color: #B8B0A4; align-self: center; }

.empty-pending { background: #fff; border-radius: 16rpx; padding: 48rpx; text-align: center; }
.empty-pending-icon { font-size: 56rpx; display: block; }
.empty-pending-text { font-size: 24rpx; color: #999; margin-top: 12rpx; display: block; }

/* 分类统计 */
.stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16rpx; background: #fff; border-radius: 16rpx; padding: 24rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.stats-cell { text-align: center; }
.stats-cell-value { font-size: 36rpx; font-weight: 700; display: block; }
.stats-cell-label { font-size: 20rpx; color: #999; margin-top: 4rpx; display: block; }
</style>
