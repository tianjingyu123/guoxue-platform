<template>
  <view class="dash">
    <!-- 顶部店铺信息 -->
    <view class="dash-hero" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="dash-hero-top">
        <text class="dash-hero-title">商家工作台</text>
        <view class="dash-hero-actions">
          <view class="dash-hero-btn" @tap="go('/merchant/shop-preview')">
            <AppIcon name="eye" :size="20" color="rgba(255,255,255,0.85)" />
          </view>
          <view class="dash-hero-btn" @tap="go('/notifications')">
            <AppIcon name="bell" :size="20" color="rgba(255,255,255,0.85)" />
          </view>
        </view>
      </view>
      <view class="dash-shop">
        <view class="dash-shop-avatar">
          <image lazy-load v-if="profile?.shopLogo" :src="profile.shopLogo" class="dash-shop-logo" mode="aspectFill" />
          <AppIcon v-else name="store" :size="28" color="#fff" />
        </view>
        <view class="dash-shop-info">
          <text class="dash-shop-name">{{ profile?.shopName || '我的店铺' }}</text>
          <view class="dash-shop-status">
            <view class="dash-shop-dot" :style="{ background: statusInfo.dot }" />
            <text class="dash-shop-status-txt">{{ statusInfo.text }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Loading -->
    <view v-if="loading" class="dash-state">
      <text class="dash-state-txt">加载中…</text>
    </view>
    <!-- Error -->
    <view v-else-if="error" class="dash-state">
      <AppIcon name="alert-circle" :size="44" color="#dc2626" />
      <text class="dash-state-txt">{{ error }}</text>
      <view class="dash-retry" @tap="load"><text>重试</text></view>
    </view>

    <template v-else-if="dashboard">
      <!-- 今日数据 -->
      <view class="dash-section dash-overview">
        <view class="dash-card dash-shadow">
          <text class="dash-card-title dash-mb">今日数据</text>
          <view class="dash-main-grid">
            <view class="dash-main-cell">
              <text class="dash-main-label">今日订单</text>
              <text class="dash-main-value">{{ dashboard.todayOrders }}</text>
            </view>
            <view class="dash-main-cell">
              <text class="dash-main-label">今日销售额</text>
              <text class="dash-main-value">¥{{ money(dashboard.todaySales) }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 经营概况 -->
      <view class="dash-section">
        <view class="dash-card">
          <text class="dash-card-title dash-mb">经营概况</text>
          <view class="dash-stat-grid">
            <view class="dash-stat-cell">
              <text class="dash-stat-value">{{ dashboard.totalProducts }}</text>
              <text class="dash-stat-label">商品数</text>
            </view>
            <view class="dash-stat-cell">
              <text class="dash-stat-value">{{ dashboard.totalOrders }}</text>
              <text class="dash-stat-label">累计订单</text>
            </view>
            <view class="dash-stat-cell">
              <text class="dash-stat-value">¥{{ money(dashboard.totalSales) }}</text>
              <text class="dash-stat-label">累计销售额</text>
            </view>
            <view class="dash-stat-cell">
              <text class="dash-stat-value">{{ Number(dashboard.rating).toFixed(1) }}</text>
              <text class="dash-stat-label">店铺评分</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 待处理事项 -->
      <view class="dash-section">
        <view class="dash-card">
          <text class="dash-card-title dash-mb">待处理事项</text>
          <view class="dash-pending-row" @tap="go('/merchant/reviews')">
            <view class="dash-pending-left">
              <view class="dash-pending-icon">
                <AppIcon name="star" :size="22" color="#d97706" />
              </view>
              <text class="dash-pending-label">待回复评价</text>
            </view>
            <view class="dash-pending-right">
              <text class="dash-pending-num" :class="{ active: dashboard.pendingReviews > 0 }">{{ dashboard.pendingReviews }}</text>
              <AppIcon name="chevron-right" :size="16" color="#9ca3af" />
            </view>
          </view>
        </view>
      </view>

      <!-- 常用功能 -->
      <view class="dash-section">
        <view class="dash-card">
          <text class="dash-card-title dash-mb">常用功能</text>
          <view class="dash-action-grid">
            <view v-for="a in actions" :key="a.label" class="dash-action-cell" @tap="go(a.path)">
              <view class="dash-action-icon" :style="{ background: a.bg }">
                <AppIcon :name="a.icon" :size="20" :color="a.color" />
              </view>
              <text class="dash-action-label">{{ a.label }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 平台公告 -->
      <view class="dash-section dash-pb">
        <view class="dash-card">
          <view class="dash-card-head dash-mb">
            <text class="dash-card-title">平台公告</text>
            <text class="dash-more-txt" @tap="go('/merchant/notices')">更多</text>
          </view>
          <view v-if="notices.length" class="dash-notice-list">
            <view v-for="n in notices" :key="n.id" class="dash-notice" @tap="go('/merchant/notices')">
              <text class="dash-notice-type">{{ n.category || n.type }}</text>
              <view class="dash-notice-body">
                <text class="dash-notice-title">{{ n.title }}</text>
                <text class="dash-notice-time">{{ n.time }}</text>
              </view>
              <AppIcon name="chevron-right" :size="16" color="#9ca3af" />
            </view>
          </view>
          <view v-else class="dash-notice-empty">
            <text class="dash-notice-empty-txt">暂无平台公告</text>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import {
  merchantBackendApi,
  type MerchantDashboard,
  type MerchantProfile,
  type MerchantNotice,
  type MerchantStatus,
} from '@/lib/merchant-data'

const statusBarHeight = ref(0)
const loading = ref(true)
const error = ref('')
const dashboard = ref<MerchantDashboard | null>(null)
const profile = ref<MerchantProfile | null>(null)
const notices = ref<MerchantNotice[]>([])

const actions = [
  { label: '商品管理', icon: 'package', color: '#c41e3a', bg: '#fee2e2', path: '/merchant/products' },
  { label: '订单管理', icon: 'shopping-cart', color: '#2563eb', bg: '#dbeafe', path: '/merchant/orders' },
  { label: '评价管理', icon: 'star', color: '#d97706', bg: '#fef3c7', path: '/merchant/reviews' },
  { label: '营收结算', icon: 'credit-card', color: '#16a34a', bg: '#dcfce7', path: '/merchant/revenue' },
  { label: '经营分析', icon: 'trending-up', color: '#9333ea', bg: '#f3e8ff', path: '/merchant/analytics' },
  { label: '发布商品', icon: 'plus', color: '#0891b2', bg: '#cffafe', path: '/merchant/product-edit' },
]

const statusTextMap: Record<MerchantStatus, { text: string; dot: string }> = {
  ACTIVE: { text: '营业中', dot: '#4ade80' },
  SUSPENDED: { text: '已暂停', dot: '#f97316' },
  CLOSED: { text: '已关闭', dot: '#9ca3af' },
  PENDING_REVIEW: { text: '审核中', dot: '#fbbf24' },
  REVIEW_FAILED: { text: '审核未通过', dot: '#ef4444' },
  DEPOSIT_PENDING: { text: '待缴保证金', dot: '#fbbf24' },
  AGREEMENT_PENDING: { text: '待签协议', dot: '#fbbf24' },
}
const statusInfo = computed(() => statusTextMap[profile.value?.status ?? 'ACTIVE'] ?? statusTextMap.ACTIVE)

function money(v: string | number): string {
  return Number(v ?? 0).toFixed(2)
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [d, p] = await Promise.all([
      merchantBackendApi.getDashboard(),
      merchantBackendApi.getProfile(),
    ])
    dashboard.value = d
    profile.value = p
    // 公告为可选展示，失败不阻塞主数据
    try {
      notices.value = await merchantBackendApi.getNotices()
    } catch {
      notices.value = []
    }
  } catch (e: any) {
    error.value = e?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

function go(path: string) {
  navigateTo(path)
}

onMounted(() => {
  uni.getSystemInfo({ success: (e) => { statusBarHeight.value = e.statusBarHeight || 0 } })
  load()
})
</script>

<style scoped>
.dash { min-height: 100vh; background: #f5f5f7; }
.dash-hero { background: linear-gradient(135deg, var(--brand), #a01830); padding-left: 16px; padding-right: 16px; padding-bottom: 64px; }
.dash-hero-top { display: flex; align-items: center; justify-content: space-between; padding-top: 12px; margin-bottom: 16px; }
.dash-hero-title { font-size: 18px; font-weight: 600; color: #fff; }
.dash-hero-actions { display: flex; align-items: center; gap: 8px; }
.dash-hero-btn { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; }
.dash-shop { display: flex; align-items: center; gap: 12px; }
.dash-shop-avatar { width: 56px; height: 56px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; overflow: hidden; }
.dash-shop-logo { width: 56px; height: 56px; border-radius: 50%; }
.dash-shop-name { font-size: 18px; font-weight: 600; color: #fff; }
.dash-shop-status { display: flex; align-items: center; gap: 4px; margin-top: 4px; }
.dash-shop-dot { width: 8px; height: 8px; border-radius: 50%; background: #4ade80; }
.dash-shop-status-txt { font-size: 13px; color: rgba(255,255,255,0.85); }

.dash-section { padding: 0 16px; margin-top: 16px; }
.dash-overview { margin-top: -48px; }
.dash-pb { padding-bottom: 24px; }
.dash-card { background: #fff; border-radius: 12px; padding: 16px; }
.dash-shadow { box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
.dash-card-head { display: flex; align-items: center; justify-content: space-between; }
.dash-card-title { font-size: 14px; font-weight: 600; color: #1a1a1a; }
.dash-mb { margin-bottom: 12px; display: block; }
.dash-more-txt { font-size: 12px; color: var(--brand); }

.dash-main-grid { display: flex; gap: 16px; }
.dash-main-cell { flex: 1; background: #f5f5f7; border-radius: 12px; padding: 14px; }
.dash-main-label { font-size: 12px; color: #6b7280; display: block; margin-bottom: 6px; }
.dash-main-value { font-size: 24px; font-weight: 700; color: #1a1a1a; }

.dash-stat-grid { display: flex; flex-wrap: wrap; }
.dash-stat-cell { width: 50%; display: flex; flex-direction: column; align-items: center; padding: 12px 0; }
.dash-stat-value { font-size: 20px; font-weight: 700; color: #1a1a1a; }
.dash-stat-label { font-size: 12px; color: #6b7280; margin-top: 4px; }

.dash-pending-row { display: flex; align-items: center; justify-content: space-between; }
.dash-pending-left { display: flex; align-items: center; gap: 12px; }
.dash-pending-icon { width: 40px; height: 40px; border-radius: 50%; background: #fef3c7; display: flex; align-items: center; justify-content: center; }
.dash-pending-label { font-size: 14px; color: #1a1a1a; }
.dash-pending-right { display: flex; align-items: center; gap: 6px; }
.dash-pending-num { font-size: 16px; font-weight: 600; color: #9ca3af; }
.dash-pending-num.active { color: var(--brand); }

.dash-action-grid { display: flex; flex-wrap: wrap; }
.dash-action-cell { width: 33.33%; display: flex; flex-direction: column; align-items: center; padding: 12px 0; }
.dash-action-icon { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.dash-action-label { font-size: 12px; color: #1a1a1a; margin-top: 8px; }

.dash-notice-list { display: flex; flex-direction: column; gap: 12px; }
.dash-notice { display: flex; align-items: flex-start; gap: 12px; }
.dash-notice-type { font-size: 10px; color: #6b7280; background: #f3f4f6; padding: 2px 6px; border-radius: 4px; flex-shrink: 0; margin-top: 2px; }
.dash-notice-body { flex: 1; min-width: 0; }
.dash-notice-title { font-size: 14px; color: #1a1a1a; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dash-notice-time { font-size: 12px; color: #9ca3af; margin-top: 2px; }
.dash-notice-empty { padding: 24px 0; display: flex; justify-content: center; }
.dash-notice-empty-txt { font-size: 13px; color: #9ca3af; }

.dash-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 64px 24px; }
.dash-state-txt { font-size: 14px; color: #9ca3af; text-align: center; }
.dash-retry { margin-top: 4px; padding: 8px 24px; border: 1px solid #d1d5db; border-radius: 8px; }
.dash-retry text { font-size: 14px; color: #1a1a1a; }
</style>
