<template>
  <view class="rv-page">
    <!-- 顶部导航 -->
    <view class="rv-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="rv-header-inner">
        <view class="rv-back" @tap="go('/merchant/dashboard')">
          <AppIcon name="arrow-left" :size="20" color="#1a1a1a" />
        </view>
        <text class="rv-title">收入管理</text>
        <view class="rv-cal" />
      </view>
    </view>

    <scroll-view scroll-y class="rv-scroll" :style="{ paddingTop: statusBarHeight + 44 + 'px' }">
      <!-- Loading -->
      <view v-if="loading" class="rv-state">
        <text class="rv-state-txt">加载中…</text>
      </view>
      <!-- Error -->
      <view v-else-if="error" class="rv-state">
        <AppIcon name="alert-circle" :size="48" color="#dc2626" />
        <text class="rv-state-title">加载失败</text>
        <text class="rv-state-txt">{{ error }}</text>
        <view class="rv-retry" @tap="load"><text>重试</text></view>
      </view>

      <template v-else>
        <!-- 分成概览卡片 -->
        <view class="rv-balance">
          <view class="rv-balance-top">
            <view>
              <text class="rv-balance-label">商家分成累计(元)</text>
              <text class="rv-balance-val">{{ money(revenue.merchantShare) }}</text>
            </view>
            <view class="rv-withdraw-btn rv-withdraw-disabled" @tap="onWithdraw">
              <AppIcon name="wallet" :size="16" color="#bbbbbb" />
              <text>提现·即将开放</text>
            </view>
          </view>
          <view class="rv-balance-sub">
            <view>
              <text class="rv-sub-label">累计销售额</text>
              <text class="rv-sub-val">¥{{ money(revenue.totalSales) }}</text>
            </view>
            <view>
              <text class="rv-sub-label">平台抽成</text>
              <text class="rv-sub-val">¥{{ money(revenue.platformShare) }}</text>
            </view>
          </view>
        </view>

        <!-- 数据概览 -->
        <view class="rv-overview-wrap">
          <view class="rv-overview">
            <view class="rv-ov-cell">
              <text class="rv-ov-val">{{ revenue.totalOrders }}</text>
              <text class="rv-ov-label">累计订单</text>
            </view>
            <view class="rv-ov-cell rv-ov-bordered">
              <text class="rv-ov-val">¥{{ money(revenue.merchantShare) }}</text>
              <text class="rv-ov-label">商家分成</text>
            </view>
            <view class="rv-ov-cell">
              <text class="rv-ov-val">{{ commissionPct }}</text>
              <text class="rv-ov-label">平台抽成比例</text>
            </view>
          </view>
        </view>

        <!-- 结算单 -->
        <view class="rv-section">
          <view class="rv-section-head">
            <text class="rv-section-title">结算单</text>
          </view>
          <view class="rv-tabs">
            <view
              v-for="t in tabs"
              :key="t.key"
              class="rv-tab"
              :class="{ active: activeTab === t.key }"
              @tap="activeTab = t.key"
            >
              {{ t.label }}
            </view>
          </view>

          <view v-if="filteredSettlements.length" class="rv-list">
            <view v-for="s in filteredSettlements" :key="s.id" class="rv-tx">
              <view class="rv-tx-info">
                <view class="rv-tx-top">
                  <text class="rv-tx-title">{{ periodText(s) }}</text>
                  <text class="rv-tx-status" :style="{ color: stCfg(s.status).color, background: stCfg(s.status).bg }">
                    {{ stCfg(s.status).label }}
                  </text>
                </view>
                <text class="rv-tx-sub">{{ s.orderCount }} 单 · 营收 ¥{{ money(s.totalRevenue) }} · 抽成 ¥{{ money(s.commission) }}</text>
              </view>
              <view class="rv-tx-right">
                <text class="rv-tx-amount income">+{{ money(s.settlementAmount) }}</text>
                <text class="rv-tx-time">{{ s.paidAt ? dt(s.paidAt) : dt(s.createdAt) }}</text>
              </view>
            </view>
          </view>
          <view v-else class="rv-empty">
            <AppIcon name="file-text" :size="40" color="#cccccc" />
            <text class="rv-empty-txt">暂无结算单</text>
          </view>
        </view>

        <!-- 结算说明 -->
        <view class="rv-section">
          <view class="rv-settle">
            <AppIcon name="clock" :size="16" color="#d97706" />
            <view>
              <text class="rv-settle-title">结算说明</text>
              <text class="rv-settle-desc">订单完成后平台按周期生成结算单，商家分成 = 销售额 − 平台抽成。提现功能即将开放。</text>
            </view>
          </view>
        </view>
        <view style="height: 24px" />
      </template>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import {
  merchantBackendApi,
  settlementStatusConfig,
  type RevenueOverview,
  type MerchantSettlement,
} from '@/lib/merchant-data'

const statusBarHeight = ref(0)
const loading = ref(true)
const error = ref('')

const revenue = ref<RevenueOverview>({ totalSales: 0, totalOrders: 0, merchantShare: 0, platformShare: 0, commissionRate: 0 })
const settlements = ref<MerchantSettlement[]>([])
const activeTab = ref('all')

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'PENDING', label: '待结算' },
  { key: 'PAID', label: '已结算' },
  { key: 'CANCELLED', label: '已取消' },
]

const filteredSettlements = computed(() =>
  activeTab.value === 'all' ? settlements.value : settlements.value.filter((s) => s.status === activeTab.value),
)

// 分成比例：后端可能返回小数(0.05)或百分数(5)，统一归一为百分比展示
const commissionPct = computed(() => {
  const rate = Number(revenue.value.commissionRate) || 0
  const pct = rate <= 1 ? rate * 100 : rate
  return `${Number(pct.toFixed(2))}%`
})

function money(v: number | string | null | undefined) {
  return (Number(v) || 0).toFixed(2)
}
function dt(v?: string | null) {
  return v ? String(v).slice(0, 10) : ''
}
function periodText(s: MerchantSettlement) {
  return `${dt(s.periodStart)} ~ ${dt(s.periodEnd)}`
}
function stCfg(status: string) {
  return settlementStatusConfig[status] || { label: status, color: '#4b5563', bg: '#f3f4f6' }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [rev, settle] = await Promise.all([
      merchantBackendApi.getRevenue(),
      merchantBackendApi.getSettlements({ pageSize: 50 }),
    ])
    revenue.value = rev
    settlements.value = settle.items
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function onWithdraw() {
  uni.showToast({ title: '提现功能即将开放', icon: 'none' })
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
.rv-page { min-height: 100vh; background: #f5f5f7; }
.rv-header { position: fixed; top: 0; left: 0; right: 0; z-index: 50; background: #fff; border-bottom: 1px solid #ededed; }
.rv-header-inner { height: 44px; display: flex; align-items: center; padding: 0 16px; }
.rv-back { width: 32px; display: flex; align-items: center; }
.rv-title { font-size: 18px; font-weight: 600; color: #1a1a1a; flex: 1; }
.rv-cal { width: 32px; }
.rv-scroll { height: 100vh; box-sizing: border-box; }

.rv-balance { background: linear-gradient(135deg, var(--brand), #a01830); padding: 16px; padding-bottom: 64px; }
.rv-balance-top { display: flex; align-items: center; justify-content: space-between; }
.rv-balance-label { font-size: 13px; color: rgba(255,255,255,0.8); display: block; }
.rv-balance-val { font-size: 30px; font-weight: 700; color: #fff; margin-top: 4px; display: block; }
.rv-withdraw-btn { display: flex; align-items: center; gap: 6px; background: #fff; color: var(--brand); font-size: 14px; padding: 8px 16px; border-radius: 8px; }
.rv-withdraw-disabled { background: rgba(255,255,255,0.6); color: #999; }
.rv-balance-sub { display: flex; gap: 24px; margin-top: 16px; }
.rv-sub-label { font-size: 13px; color: rgba(255,255,255,0.7); display: block; }
.rv-sub-val { font-size: 14px; font-weight: 500; color: #fff; margin-top: 2px; display: block; }

.rv-overview-wrap { padding: 0 16px; margin-top: -48px; }
.rv-overview { background: #fff; border-radius: 12px; padding: 16px; display: flex; box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
.rv-ov-cell { flex: 1; display: flex; flex-direction: column; align-items: center; }
.rv-ov-bordered { border-left: 1px solid #f3f4f6; border-right: 1px solid #f3f4f6; }
.rv-ov-val { font-size: 18px; font-weight: 700; color: #1a1a1a; }
.rv-ov-label { font-size: 12px; color: #9ca3af; margin-top: 2px; }

.rv-section { padding: 0 16px; margin-top: 16px; }
.rv-section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.rv-section-title { font-size: 15px; font-weight: 500; color: #1a1a1a; }
.rv-tabs { display: flex; background: #ececef; border-radius: 8px; padding: 3px; margin-bottom: 12px; }
.rv-tab { flex: 1; text-align: center; font-size: 12px; color: #6b7280; padding: 6px 0; border-radius: 6px; }
.rv-tab.active { background: #fff; color: #1a1a1a; font-weight: 500; }

.rv-list { display: flex; flex-direction: column; gap: 8px; }
.rv-tx { background: #fff; border-radius: 12px; padding: 12px; display: flex; align-items: center; gap: 12px; }
.rv-tx-info { flex: 1; min-width: 0; }
.rv-tx-top { display: flex; align-items: center; gap: 8px; }
.rv-tx-title { font-size: 14px; font-weight: 500; color: #1a1a1a; }
.rv-tx-status { font-size: 10px; padding: 2px 6px; border-radius: 4px; }
.rv-tx-sub { font-size: 12px; color: #9ca3af; margin-top: 2px; display: block; }
.rv-tx-right { text-align: right; flex-shrink: 0; }
.rv-tx-amount { font-size: 14px; font-weight: 500; color: #1a1a1a; }
.rv-tx-amount.income { color: #16a34a; }
.rv-tx-time { font-size: 12px; color: #9ca3af; margin-top: 2px; display: block; }

.rv-settle { background: #fffbeb; border: 1px solid rgba(245,158,11,0.3); border-radius: 12px; padding: 16px; display: flex; align-items: flex-start; gap: 8px; }
.rv-settle-title { font-size: 14px; font-weight: 500; color: #1a1a1a; display: block; }
.rv-settle-desc { font-size: 12px; color: #6b7280; margin-top: 4px; display: block; line-height: 1.5; }

/* 三态 */
.rv-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 24px; gap: 12px; }
.rv-state-title { font-size: 16px; font-weight: 600; color: #1a1a1a; }
.rv-state-txt { font-size: 14px; color: #9ca3af; text-align: center; }
.rv-retry { margin-top: 8px; padding: 10px 32px; border: 1px solid var(--brand); border-radius: 8px; }
.rv-retry text { font-size: 14px; color: var(--brand); }
.rv-empty { display: flex; flex-direction: column; align-items: center; padding: 48px 0; gap: 12px; }
.rv-empty-txt { font-size: 14px; color: #9ca3af; }
</style>
