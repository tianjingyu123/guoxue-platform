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

      <!-- 履约健康（近7日·独立三态，不阻塞主数据） -->
      <view class="dash-section">
        <view class="dash-card">
          <view class="dash-card-head dash-mb">
            <text class="dash-card-title">履约健康</text>
            <text class="dash-metric-sub">近 7 日</text>
          </view>
          <view v-if="metricsLoading" class="dash-metric-state">
            <text class="dash-metric-state-txt">加载中…</text>
          </view>
          <view v-else-if="metricsError" class="dash-metric-state">
            <text class="dash-metric-state-txt">{{ metricsError }}</text>
            <view class="dash-metric-retry" @tap="loadMetrics"><text>重试</text></view>
          </view>
          <view v-else-if="!metrics || metrics.items.length === 0" class="dash-metric-state">
            <text class="dash-metric-state-txt">暂无履约数据，指标于每日凌晨聚合生成</text>
          </view>
          <view v-else class="dash-metric-grid">
            <view class="dash-metric-cell">
              <text class="dash-metric-value" :class="rateClass(metrics.summary.shipOnTimeRate, 0.9, true)">
                {{ pct(metrics.summary.shipOnTimeRate) }}
              </text>
              <text class="dash-metric-label">按时发货率</text>
            </view>
            <view class="dash-metric-cell">
              <text class="dash-metric-value" :class="rateClass(metrics.summary.refundRate, 0.15, false)">
                {{ pct(metrics.summary.refundRate) }}
              </text>
              <text class="dash-metric-label">退款率</text>
            </view>
            <view class="dash-metric-cell">
              <text class="dash-metric-value">
                {{ metrics.summary.avgRating === null ? '—' : Number(metrics.summary.avgRating).toFixed(1) }}
              </text>
              <text class="dash-metric-label">评价均分</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 信用评级（履-P2·独立三态，不阻塞主数据） -->
      <view class="dash-section">
        <view class="dash-card">
          <view class="dash-card-head dash-mb">
            <text class="dash-card-title">信用评级</text>
            <text v-if="credit && credit.logs.length" class="dash-more-txt" @tap="creditPopupOpen = true">变动明细</text>
          </view>
          <view v-if="creditLoading" class="dash-metric-state">
            <text class="dash-metric-state-txt">加载中…</text>
          </view>
          <view v-else-if="creditError" class="dash-metric-state">
            <text class="dash-metric-state-txt">{{ creditError }}</text>
            <view class="dash-metric-retry" @tap="loadCredit"><text>重试</text></view>
          </view>
          <template v-else-if="credit">
            <view class="dash-credit-row">
              <view class="dash-credit-score-wrap">
                <text class="dash-credit-score">{{ credit.creditScore }}</text>
                <text class="dash-credit-score-unit">分</text>
              </view>
              <view class="dash-credit-grade" :style="{ color: gradeUi.color, background: gradeUi.bg }">
                <text class="dash-credit-grade-txt">{{ gradeUi.label }}</text>
              </view>
            </view>
            <view class="dash-credit-benefits">
              <text class="dash-credit-benefit">结算 T+{{ credit.benefits.settlementCycleDays }}</text>
              <text class="dash-credit-benefit">抽检{{ credit.benefits.qcFrequency }}</text>
              <text v-if="credit.benefits.selectedBadge" class="dash-credit-benefit dash-credit-benefit-hl">严选标</text>
            </view>
            <text v-if="credit.observation" class="dash-credit-obs">新店观察期（开店 30 天内）：正常计分，暂不参与流量加权</text>
            <text v-else-if="!credit.logs.length" class="dash-credit-obs">信用分每周一凌晨按近 30 日履约数据更新</text>
          </template>
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

    <!-- 信用变动明细弹层（周更 log·因子透明可复算） -->
    <view v-if="creditPopupOpen" class="dash-pop-mask" @tap="creditPopupOpen = false">
      <view class="dash-pop" @tap.stop>
        <view class="dash-pop-head">
          <text class="dash-pop-title">信用变动明细</text>
          <view class="dash-pop-close" @tap="creditPopupOpen = false">
            <AppIcon name="x" :size="20" color="#6b7280" />
          </view>
        </view>
        <scroll-view scroll-y class="dash-pop-body">
          <view v-for="log in credit?.logs ?? []" :key="log.id" class="dash-pop-log">
            <view class="dash-pop-log-head">
              <text class="dash-pop-log-week">{{ log.factors?.weekKey || fmtDate(log.createdAt) }} 周评估</text>
              <text class="dash-pop-log-delta" :class="deltaClass(log)">
                {{ log.oldScore }} → {{ log.newScore }}
              </text>
            </view>
            <view v-if="log.factors?.factors" class="dash-pop-factors">
              <view v-for="(fd, key) in log.factors.factors" :key="key" class="dash-pop-factor">
                <text class="dash-pop-factor-name">{{ creditFactorNames[key] || key }}</text>
                <text class="dash-pop-factor-score">{{ fd.score }}/{{ fd.weight }}{{ fd.neutral ? '（中性）' : '' }}</text>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>
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
  type MerchantMetricsResp,
  type MerchantCreditResp,
  type MerchantCreditLogItem,
  creditGradeConfig,
  creditFactorNames,
} from '@/lib/merchant-data'

const statusBarHeight = ref(0)
const loading = ref(true)
const error = ref('')
const dashboard = ref<MerchantDashboard | null>(null)
const profile = ref<MerchantProfile | null>(null)
const notices = ref<MerchantNotice[]>([])

// 履约健康卡（独立三态，失败不阻塞工作台主数据）
const metricsLoading = ref(true)
const metricsError = ref('')
const metrics = ref<MerchantMetricsResp | null>(null)

// 信用评级卡（履-P2·独立三态，失败不阻塞工作台主数据）
const creditLoading = ref(true)
const creditError = ref('')
const credit = ref<MerchantCreditResp | null>(null)
const creditPopupOpen = ref(false)
const gradeUi = computed(() => creditGradeConfig[credit.value?.creditGrade ?? 'B'] ?? creditGradeConfig.B)

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

/** 率 → 百分比展示；null（数据取不到）诚实显示 — */
function pct(v: string | number | null): string {
  if (v === null || v === undefined) return '—'
  return `${(Number(v) * 100).toFixed(1)}%`
}

/** 指标着色：higherBetter=true 时低于阈值标红（如按时发货率）；false 时高于阈值标红（如退款率） */
function rateClass(v: string | number | null, threshold: number, higherBetter: boolean): string {
  if (v === null || v === undefined) return ''
  const n = Number(v)
  const bad = higherBetter ? n < threshold : n > threshold
  return bad ? 'dash-metric-bad' : 'dash-metric-good'
}

function fmtDate(iso: string): string {
  return (iso || '').slice(0, 10)
}

/** 分数变动着色：升绿降红，持平默认 */
function deltaClass(log: MerchantCreditLogItem): string {
  if (log.newScore > log.oldScore) return 'dash-pop-up'
  if (log.newScore < log.oldScore) return 'dash-pop-down'
  return ''
}

async function loadCredit() {
  creditLoading.value = true
  creditError.value = ''
  try {
    credit.value = await merchantBackendApi.getMyCredit()
  } catch (e) {
    creditError.value = (e as Error)?.message || '信用数据加载失败'
  } finally {
    creditLoading.value = false
  }
}

async function loadMetrics() {
  metricsLoading.value = true
  metricsError.value = ''
  try {
    metrics.value = await merchantBackendApi.getMyMetrics(7)
  } catch (e) {
    metricsError.value = (e as Error)?.message || '履约数据加载失败'
  } finally {
    metricsLoading.value = false
  }
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
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
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
  loadMetrics()
  loadCredit()
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

.dash-metric-sub { font-size: 12px; color: #9ca3af; }
.dash-metric-grid { display: flex; }
.dash-metric-cell { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 8px 0; }
.dash-metric-value { font-size: 20px; font-weight: 700; color: #1a1a1a; }
.dash-metric-value.dash-metric-good { color: #16a34a; }
.dash-metric-value.dash-metric-bad { color: #dc2626; }
.dash-metric-label { font-size: 12px; color: #6b7280; margin-top: 4px; }
.dash-metric-state { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 16px 0; }
.dash-metric-state-txt { font-size: 13px; color: #9ca3af; text-align: center; }
.dash-metric-retry { padding: 4px 16px; border: 1px solid #d1d5db; border-radius: 6px; }
.dash-metric-retry text { font-size: 12px; color: #1a1a1a; }

.dash-credit-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.dash-credit-score-wrap { display: flex; align-items: baseline; gap: 4px; }
.dash-credit-score { font-size: 32px; font-weight: 700; color: #1a1a1a; }
.dash-credit-score-unit { font-size: 12px; color: #6b7280; }
.dash-credit-grade { padding: 4px 12px; border-radius: 999px; }
.dash-credit-grade-txt { font-size: 14px; font-weight: 600; color: inherit; }
.dash-credit-benefits { display: flex; flex-wrap: wrap; gap: 8px; }
.dash-credit-benefit { font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 3px 8px; border-radius: 4px; }
.dash-credit-benefit-hl { color: #b45309; background: #fef3c7; font-weight: 600; }
.dash-credit-obs { display: block; font-size: 11px; color: #9ca3af; margin-top: 10px; }

.dash-pop-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 999; display: flex; align-items: flex-end; }
.dash-pop { width: 100%; background: #fff; border-radius: 16px 16px 0 0; padding: 16px; max-height: 70vh; display: flex; flex-direction: column; }
.dash-pop-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.dash-pop-title { font-size: 16px; font-weight: 600; color: #1a1a1a; }
.dash-pop-close { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
.dash-pop-body { flex: 1; overflow: hidden; max-height: 56vh; }
.dash-pop-log { border: 1px solid #f3f4f6; border-radius: 10px; padding: 12px; margin-bottom: 10px; }
.dash-pop-log-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.dash-pop-log-week { font-size: 13px; font-weight: 600; color: #1a1a1a; }
.dash-pop-log-delta { font-size: 13px; font-weight: 600; color: #6b7280; }
.dash-pop-log-delta.dash-pop-up { color: #16a34a; }
.dash-pop-log-delta.dash-pop-down { color: #dc2626; }
.dash-pop-factors { display: flex; flex-direction: column; gap: 4px; }
.dash-pop-factor { display: flex; align-items: center; justify-content: space-between; }
.dash-pop-factor-name { font-size: 12px; color: #6b7280; }
.dash-pop-factor-score { font-size: 12px; color: #1a1a1a; }

.dash-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 64px 24px; }
.dash-state-txt { font-size: 14px; color: #9ca3af; text-align: center; }
.dash-retry { margin-top: 4px; padding: 8px 24px; border: 1px solid #d1d5db; border-radius: 8px; }
.dash-retry text { font-size: 14px; color: #1a1a1a; }
</style>
