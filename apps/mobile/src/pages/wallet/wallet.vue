<template>
  <view class="page">
    <!-- ==================== 余额卡片 ==================== -->
    <view class="balance-card">
      <text class="balance-label">我的虚拟币</text>
      <view class="balance-row">
        <text class="balance-coin">{{ coinStore.balance }}</text>
        <text class="balance-unit">币</text>
      </view>
      <text class="balance-yuan">≈ ¥{{ coinStore.balanceInYuan }}</text>
      <view class="balance-actions">
        <view class="action-btn recharge-btn" @click="goRecharge">
          <text class="action-icon">+</text>
          <text>充值</text>
        </view>
      </view>
    </view>

    <!-- ==================== 交易记录 ==================== -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">交易记录</text>
      </view>

      <!-- 加载中骨架 -->
      <LoadingSkeleton v-if="loading && transactions.length === 0" type="list" />

      <!-- 空状态 -->
      <EmptyState v-else-if="transactions.length === 0" icon="💰" text="暂无交易记录" />

      <!-- 交易列表 -->
      <view v-else class="transaction-list">
        <view
          v-for="tx in transactions"
          :key="tx.id"
          class="transaction-item"
        >
          <view class="tx-left">
            <view
              class="tx-icon"
              :class="txIconClass(tx.type)"
            >
              <text>{{ txIconText(tx.type) }}</text>
            </view>
            <view class="tx-info">
              <text class="tx-scene">{{ txSceneLabel(tx.scene) }}</text>
              <text class="tx-time">{{ formatTime(tx.createdAt) }}</text>
            </view>
          </view>
          <view class="tx-right">
            <text
              class="tx-amount"
              :class="txAmountClass(tx.type)"
            >
              {{ tx.type === 'RECHARGE' || tx.type === 'REFUND' ? '+' : '-' }}{{ tx.amountCoin }}
            </text>
            <text class="tx-balance">余额 {{ tx.balanceAfter }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onShow } from 'vue'
import { useCoinStore } from '../../store/coinStore'
import { storeToRefs } from 'pinia'
import EmptyState from '../../components/EmptyState.vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'

const coinStore = useCoinStore()
const { balance, transactions, loading } = storeToRefs(coinStore)
const page = ref(1)
const pageSize = 20

onShow(() => {
  loadData()
})

async function loadData() {
  await Promise.all([
    coinStore.fetchBalance(),
    coinStore.fetchTransactions(page.value, pageSize),
  ])
}

/** 跳转充值页 */
function goRecharge() {
  uni.navigateTo({ url: '/pages/wallet/recharge' })
}

/** 场景中文映射 */
const sceneMap: Record<string, string> = {
  RECHARGE: '充值',
  CIRCLE_JOIN: '付费入圈',
  COURSE_PURCHASE: '购买课程',
  VIP_PURCHASE: '会员续费',
  VIP_RENEW: '会员续费',
  REWARD: '打赏',
  REFUND: '退款',
  WITHDRAW: '提现',
  GIFT: '赠送',
  SYSTEM: '系统发放',
}

function txSceneLabel(scene: string): string {
  return sceneMap[scene] || scene || '未知'
}

/** 交易类型图标 */
function txIconText(type: string): string {
  switch (type) {
    case 'RECHARGE': return '充'
    case 'REFUND': return '退'
    case 'SPEND': return '支'
    default: return '币'
  }
}

/** 交易图标样式类 */
function txIconClass(type: string): string {
  switch (type) {
    case 'RECHARGE': return 'icon-recharge'
    case 'REFUND': return 'icon-refund'
    case 'SPEND': return 'icon-spend'
    default: return ''
  }
}

/** 金额样式类 */
function txAmountClass(type: string): string {
  switch (type) {
    case 'RECHARGE': return 'amount-recharge'
    case 'REFUND': return 'amount-refund'
    case 'SPEND': return 'amount-spend'
    default: return ''
  }
}

/** 友好时间 */
function formatTime(timeStr?: string): string {
  if (!timeStr) return ''
  try {
    const date = new Date(timeStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return '刚刚'
    if (minutes < 60) return minutes + '分钟前'
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return hours + '小时前'
    const days = Math.floor(hours / 24)
    if (days < 7) return days + '天前'
    return timeStr.slice(0, 10)
  } catch {
    return timeStr.slice(0, 10)
  }
}
</script>

<style>
.page { padding: 12px; background: #f5f0e6; min-height: 100vh; padding-bottom: 40px; }

/* ============================
   余额卡片
   ============================ */
.balance-card {
  background: linear-gradient(135deg, #8b4513, #c4943a);
  border-radius: 12px;
  padding: 32px 24px 24px;
  text-align: center;
  margin-bottom: 12px;
}
.balance-label {
  color: rgba(255,255,255,0.8);
  font-size: 14px;
  display: block;
}
.balance-row {
  display: flex;
  align-items: baseline;
  justify-content: center;
  margin-top: 12px;
}
.balance-coin {
  color: #fff;
  font-size: 40px;
  font-weight: bold;
}
.balance-unit {
  color: rgba(255,255,255,0.8);
  font-size: 16px;
  margin-left: 4px;
}
.balance-yuan {
  color: rgba(255,255,255,0.7);
  font-size: 13px;
  display: block;
  margin-top: 6px;
}
.balance-actions {
  margin-top: 20px;
}
.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px 28px;
  border-radius: 20px;
  font-size: 14px;
  color: #8b4513;
  background: #fff;
}
.action-icon {
  font-size: 18px;
  font-weight: bold;
}

/* ============================
   区块标题
   ============================ */
.section {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
}
.section-header {
  margin-bottom: 12px;
}
.section-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
}

/* ============================
   交易列表
   ============================ */
.transaction-list {
  display: flex;
  flex-direction: column;
}
.transaction-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  border-bottom: 1px solid #f5f0e6;
}
.transaction-item:last-child {
  border-bottom: none;
}
.tx-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.tx-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #fff;
  flex-shrink: 0;
}
.tx-icon.icon-recharge {
  background: #27ae60;
}
.tx-icon.icon-spend {
  background: #e74c3c;
}
.tx-icon.icon-refund {
  background: #3498db;
}
.tx-icon:not(.icon-recharge):not(.icon-spend):not(.icon-refund) {
  background: #95a5a6;
}
.tx-info {
  display: flex;
  flex-direction: column;
}
.tx-scene {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}
.tx-time {
  font-size: 12px;
  color: #bbb;
  margin-top: 2px;
}
.tx-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
.tx-amount {
  font-size: 16px;
  font-weight: bold;
}
.tx-amount.amount-recharge {
  color: #27ae60;
}
.tx-amount.amount-spend {
  color: #e74c3c;
}
.tx-amount.amount-refund {
  color: #3498db;
}
.tx-balance {
  font-size: 11px;
  color: #ccc;
  margin-top: 2px;
}
</style>
