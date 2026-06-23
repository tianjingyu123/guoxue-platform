<template>
  <view class="rv-page">
    <!-- 顶部导航 -->
    <view class="rv-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="rv-header-inner">
        <view class="rv-back" @tap="go('/merchant/dashboard')">
          <AppIcon name="arrow-left" :size="20" color="#1a1a1a" />
        </view>
        <text class="rv-title">收入管理</text>
        <view class="rv-cal" @tap="toast">
          <AppIcon name="calendar" :size="20" color="#1a1a1a" />
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="rv-scroll" :style="{ paddingTop: statusBarHeight + 44 + 'px' }">
      <!-- 余额卡片 -->
      <view class="rv-balance">
        <view class="rv-balance-top">
          <view>
            <text class="rv-balance-label">可提现余额(元)</text>
            <text class="rv-balance-val">{{ r.balance.toFixed(2) }}</text>
          </view>
          <view class="rv-withdraw-btn" @tap="toast">
            <AppIcon name="wallet" :size="16" color="#c41e3a" />
            <text>提现</text>
          </view>
        </view>
        <view class="rv-balance-sub">
          <view>
            <text class="rv-sub-label">待结算</text>
            <text class="rv-sub-val">¥{{ r.pendingSettle.toFixed(2) }}</text>
          </view>
          <view>
            <text class="rv-sub-label">冻结中</text>
            <text class="rv-sub-val">¥{{ r.frozen.toFixed(2) }}</text>
          </view>
        </view>
      </view>

      <!-- 数据概览 -->
      <view class="rv-overview-wrap">
        <view class="rv-overview">
          <view class="rv-ov-cell">
            <text class="rv-ov-val">¥{{ (r.totalIncome / 1000).toFixed(1) }}k</text>
            <text class="rv-ov-label">累计收入</text>
          </view>
          <view class="rv-ov-cell rv-ov-bordered">
            <text class="rv-ov-val">¥{{ r.monthIncome.toFixed(0) }}</text>
            <text class="rv-ov-label">本月收入</text>
          </view>
          <view class="rv-ov-cell">
            <view class="rv-ov-trend">
              <AppIcon name="trending-up" :size="16" color="#16a34a" />
              <text class="rv-ov-trend-val">+{{ r.monthCompare }}%</text>
            </view>
            <text class="rv-ov-label">环比上月</text>
          </view>
        </view>
      </view>

      <!-- 收支明细 -->
      <view class="rv-section">
        <view class="rv-section-head">
          <text class="rv-section-title">收支明细</text>
          <view class="rv-export" @tap="toast">
            <AppIcon name="download" :size="16" color="#c41e3a" />
            <text>导出</text>
          </view>
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

        <view class="rv-list">
          <view v-for="item in filteredTransactions" :key="item.id" class="rv-tx">
            <view class="rv-tx-icon" :style="{ color: typeCfg[item.type].color }">
              <AppIcon :name="typeCfg[item.type].icon" :size="20" :color="typeCfg[item.type].color" />
            </view>
            <view class="rv-tx-info">
              <view class="rv-tx-top">
                <text class="rv-tx-title">{{ item.title }}</text>
                <text class="rv-tx-status" :style="{ color: statusCfg[item.status].color, background: statusCfg[item.status].bg }">
                  {{ statusCfg[item.status].label }}
                </text>
              </view>
              <text class="rv-tx-sub">{{ item.orderNo ? '订单: ' + item.orderNo : item.bankCard }}</text>
            </view>
            <view class="rv-tx-right">
              <text class="rv-tx-amount" :class="{ income: item.amount > 0 }">
                {{ item.amount > 0 ? '+' : '' }}{{ item.amount.toFixed(2) }}
              </text>
              <text class="rv-tx-time">{{ item.createdAt }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 结算说明 -->
      <view class="rv-section">
        <view class="rv-settle">
          <AppIcon name="clock" :size="16" color="#d97706" />
          <view>
            <text class="rv-settle-title">结算说明</text>
            <text class="rv-settle-desc">订单完成后7天自动结算到可提现余额，提现到银行卡1-3个工作日到账。</text>
          </view>
        </view>
      </view>
      <view style="height: 24px" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { merchantRevenue, revenueTransactions, revenueTypeConfig, revenueStatusConfig } from '@/lib/merchant-data'

const statusBarHeight = ref(0)
uni.getSystemInfo({ success: (e) => { statusBarHeight.value = e.statusBarHeight || 0 } })

const r = merchantRevenue
const typeCfg = revenueTypeConfig
const statusCfg = revenueStatusConfig
const activeTab = ref('all')

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'income', label: '收入' },
  { key: 'withdraw', label: '提现' },
  { key: 'refund', label: '支出' },
]

const filteredTransactions = computed(() =>
  revenueTransactions.filter((t) => {
    if (activeTab.value === 'income') return t.type === 'income'
    if (activeTab.value === 'withdraw') return t.type === 'withdraw'
    if (activeTab.value === 'refund') return t.type === 'refund' || t.type === 'fee'
    return true
  }),
)

function toast() {
  uni.showToast({ title: '演示功能', icon: 'none' })
}
function go(path: string) {
  navigateTo(path)
}
</script>

<style scoped>
.rv-page { min-height: 100vh; background: #f5f5f7; }
.rv-header { position: fixed; top: 0; left: 0; right: 0; z-index: 50; background: #fff; border-bottom: 1px solid #ededed; }
.rv-header-inner { height: 44px; display: flex; align-items: center; padding: 0 16px; }
.rv-back { width: 32px; display: flex; align-items: center; }
.rv-title { font-size: 18px; font-weight: 600; color: #1a1a1a; flex: 1; }
.rv-cal { width: 32px; display: flex; align-items: center; justify-content: flex-end; }
.rv-scroll { height: 100vh; box-sizing: border-box; }

.rv-balance { background: linear-gradient(135deg, #c41e3a, #a01830); padding: 16px; padding-bottom: 64px; }
.rv-balance-top { display: flex; align-items: center; justify-content: space-between; }
.rv-balance-label { font-size: 13px; color: rgba(255,255,255,0.8); display: block; }
.rv-balance-val { font-size: 30px; font-weight: 700; color: #fff; margin-top: 4px; display: block; }
.rv-withdraw-btn { display: flex; align-items: center; gap: 6px; background: #fff; color: #c41e3a; font-size: 14px; padding: 8px 16px; border-radius: 8px; }
.rv-balance-sub { display: flex; gap: 24px; margin-top: 16px; }
.rv-sub-label { font-size: 13px; color: rgba(255,255,255,0.7); display: block; }
.rv-sub-val { font-size: 14px; font-weight: 500; color: #fff; margin-top: 2px; display: block; }

.rv-overview-wrap { padding: 0 16px; margin-top: -48px; }
.rv-overview { background: #fff; border-radius: 12px; padding: 16px; display: flex; box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
.rv-ov-cell { flex: 1; display: flex; flex-direction: column; align-items: center; }
.rv-ov-bordered { border-left: 1px solid #f3f4f6; border-right: 1px solid #f3f4f6; }
.rv-ov-val { font-size: 18px; font-weight: 700; color: #1a1a1a; }
.rv-ov-label { font-size: 12px; color: #9ca3af; margin-top: 2px; }
.rv-ov-trend { display: flex; align-items: center; gap: 4px; }
.rv-ov-trend-val { font-size: 18px; font-weight: 700; color: #16a34a; }

.rv-section { padding: 0 16px; margin-top: 16px; }
.rv-section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.rv-section-title { font-size: 15px; font-weight: 500; color: #1a1a1a; }
.rv-export { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #c41e3a; }
.rv-tabs { display: flex; background: #ececef; border-radius: 8px; padding: 3px; margin-bottom: 12px; }
.rv-tab { flex: 1; text-align: center; font-size: 12px; color: #6b7280; padding: 6px 0; border-radius: 6px; }
.rv-tab.active { background: #fff; color: #1a1a1a; font-weight: 500; }

.rv-list { display: flex; flex-direction: column; gap: 8px; }
.rv-tx { background: #fff; border-radius: 12px; padding: 12px; display: flex; align-items: center; gap: 12px; }
.rv-tx-icon { width: 40px; height: 40px; border-radius: 50%; background: #f5f5f7; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
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
</style>
