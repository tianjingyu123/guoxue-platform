<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <text class="nav-title">
        我的钱包
      </text>
    </view>

    <DataState
      :is-loading="loading && !hasData"
      :error="error"
      :is-empty="false"
      skeleton-type="card"
      @retry="loadData"
    >
      <!-- ==================== 资产卡片 ==================== -->
      <view class="balance-card">
        <view class="card-bg-deco" />
        <view class="card-content">
          <view class="balance-header">
            <text class="balance-label">
              国学币余额
            </text>
            <text class="balance-sub">
              可用于课程、圈子、打赏等
            </text>
          </view>
          <view class="balance-main">
            <text class="balance-coin">
              {{ balance.toLocaleString() }}
            </text>
            <text class="balance-unit">
              币
            </text>
          </view>
          <text class="balance-yuan">
            ≈ ¥{{ balanceInYuan }}
          </text>

          <!-- 快捷操作 -->
          <view class="quick-actions">
            <view
              class="quick-btn btn-recharge"
              @click="goRecharge"
            >
              <text class="qb-icon">
                +
              </text>
              <text class="qb-label">
                充值
              </text>
            </view>
            <view
              class="quick-btn btn-withdraw"
              @click="goWithdraw"
            >
              <text class="qb-icon">
                ↑
              </text>
              <text class="qb-label">
                提现
              </text>
            </view>
          </view>
        </view>
      </view>

      <!-- ==================== 功能入口 ==================== -->
      <view class="entry-grid">
        <view
          class="entry-item"
          @click="goPage('/pages/mine/points')"
        >
          <text class="entry-icon">
            ⭐
          </text>
          <text class="entry-label">
            积分中心
          </text>
        </view>
        <view
          class="entry-item"
          @click="goPage('/pages/vip/vip')"
        >
          <text class="entry-icon">
            👑
          </text>
          <text class="entry-label">
            会员中心
          </text>
        </view>
        <view
          class="entry-item"
          @click="goCoupons"
        >
          <text class="entry-icon">
            🎫
          </text>
          <text class="entry-label">
            优惠券
          </text>
        </view>
        <view
          class="entry-item"
          @click="goPage('/pages/mine/payment-password')"
        >
          <text class="entry-icon">
            🔒
          </text>
          <text class="entry-label">
            支付密码
          </text>
        </view>
      </view>

      <!-- ==================== 交易记录 ==================== -->
      <view class="section">
        <view
          class="section-header"
          @click="goTransactions"
        >
          <text class="section-title">
            交易记录
          </text>
          <view class="section-more">
            <text>查看全部</text>
            <text class="more-arrow">
              ›
            </text>
          </view>
        </view>

        <LoadingSkeleton
          v-if="loading && transactions.length === 0"
          type="list"
        />
        <EmptyState
          v-else-if="transactions.length === 0"
          icon="💰"
          text="暂无交易记录"
        />

        <view
          v-else
          class="transaction-list"
        >
          <!-- 按月份分组 -->
          <view
            v-for="(group, gIdx) in groupedTransactions"
            :key="gIdx"
            class="tx-group"
          >
            <text class="tx-group-title">
              {{ group.month }}
            </text>
            <view
              v-for="tx in group.list"
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
                  <text class="tx-scene">
                    {{ txSceneLabel(tx.scene) }}
                  </text>
                  <text class="tx-time">
                    {{ formatTime(tx.createdAt) }}
                  </text>
                </view>
              </view>
              <view class="tx-right">
                <text
                  class="tx-amount"
                  :class="txAmountClass(tx.type)"
                >
                  {{ tx.type === 'RECHARGE' || tx.type === 'REFUND' || tx.type === 'BONUS' || tx.type === 'INCOME' ? '+' : '' }}{{ tx.amountCoin }}
                </text>
                <text class="tx-balance">
                  余额 {{ tx.balanceAfter }}
                </text>
              </view>
            </view>
          </view>
        </view>

        <!-- 加载更多 -->
        <view
          v-if="hasMore && !loading"
          class="load-more"
          @click="loadMore"
        >
          <text>加载更多</text>
        </view>
        <view
          v-if="!hasMore && transactions.length > 0"
          class="no-more"
        >
          <text>— 已全部加载 —</text>
        </view>
      </view>
    </DataState>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCoinStore } from '../../store/coinStore'
import { storeToRefs } from 'pinia'
import DataState from '../../components/DataState.vue'
import EmptyState from '../../components/EmptyState.vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'

const coinStore = useCoinStore()
const { balance, transactions, loading, error } = storeToRefs(coinStore)
const page = ref(1)
const pageSize = 20
const hasMore = ref(true)
const allTransactions = ref<any[]>([])

const hasData = computed(() => balance.value > 0 || allTransactions.value.length > 0)

const balanceInYuan = computed(() => (balance.value / 100).toFixed(2))

onShow(() => {
  loadData()
})

async function loadData() {
  page.value = 1
  hasMore.value = true
  await Promise.all([
    coinStore.fetchBalance(),
    fetchTransactions(),
  ])
}

async function fetchTransactions() {
  const res: any = await coinStore.fetchTransactions(page.value, pageSize)
  allTransactions.value = Array.isArray(res) ? res : []
  hasMore.value = allTransactions.value.length >= pageSize
}

async function loadMore() {
  if (!hasMore.value || loading.value) return
  page.value++
  const res: any = await coinStore.fetchTransactions(page.value, pageSize)
  const newItems = Array.isArray(res) ? res : []
  allTransactions.value.push(...newItems)
  hasMore.value = newItems.length >= pageSize
}

/** 交易记录按月分组 */
interface TxGroup {
  month: string
  list: any[]
}

const groupedTransactions = computed(() => {
  const groups: Record<string, any[]> = {}
  for (const tx of allTransactions.value) {
    const month = tx.createdAt ? tx.createdAt.slice(0, 7) : '未知'
    if (!groups[month]) groups[month] = []
    groups[month].push(tx)
  }
  const result: TxGroup[] = []
  const sortedMonths = Object.keys(groups).sort((a, b) => b.localeCompare(a))
  for (const month of sortedMonths) {
    result.push({ month, list: groups[month] })
  }
  return result
})

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
  BONUS: '奖励',
  INCOME: '收入',
}

function txSceneLabel(scene: string): string {
  return sceneMap[scene] || scene || '未知'
}

function txIconText(type: string): string {
  switch (type) {
    case 'RECHARGE': return '充'
    case 'REFUND': return '退'
    case 'BONUS':
    case 'INCOME': return '奖'
    case 'WITHDRAW': return '提'
    case 'SPEND': return '支'
    default: return '币'
  }
}

function txIconClass(type: string): string {
  switch (type) {
    case 'RECHARGE': return 'icon-recharge'
    case 'REFUND': return 'icon-refund'
    case 'BONUS':
    case 'INCOME': return 'icon-bonus'
    case 'WITHDRAW': return 'icon-withdraw'
    case 'SPEND': return 'icon-spend'
    default: return 'icon-default'
  }
}

function txAmountClass(type: string): string {
  switch (type) {
    case 'RECHARGE':
    case 'REFUND':
    case 'BONUS':
    case 'INCOME': return 'amount-income'
    case 'SPEND':
    case 'WITHDRAW': return 'amount-spend'
    default: return ''
  }
}

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

/** 导航 */
function goRecharge() {
  uni.navigateTo({ url: '/pages/wallet/recharge' })
}
function goWithdraw() {
  uni.navigateTo({ url: '/pages/wallet/withdraw' })
}
function goTransactions() {
  uni.navigateTo({ url: '/pages/wallet/transactions' })
}
function goPage(url: string) {
  uni.navigateTo({ url })
}
function goCoupons() {
  uni.showToast({ title: '即将上线', icon: 'none' })
}
</script>

<style scoped>
.page {
  background: $bg;
  min-height: 100vh;
  padding-bottom: 40rpx;
}

/* ── 导航栏 ── */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  padding: 0 30rpx;
  background: #fff;
  position: relative;
}
.nav-title {
  font-size: 32rpx;
  font-weight: bold;
  color: $text;
}

/* ── 资产卡片 ── */
.balance-card {
  margin: 24rpx 24rpx 20rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #D4AF37, #C9A96E, #B8860B);
  position: relative;
  overflow: hidden;
}
.card-bg-deco {
  position: absolute;
  top: -60rpx;
  right: -60rpx;
  width: 300rpx;
  height: 300rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
}
.card-bg-deco::after {
  content: '';
  position: absolute;
  bottom: -40rpx;
  left: -80rpx;
  width: 240rpx;
  height: 240rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
}
.card-content {
  position: relative;
  z-index: 1;
  padding: 40rpx 32rpx 30rpx;
}
.balance-header {
  margin-bottom: 16rpx;
}
.balance-label {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
}
.balance-sub {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.6);
  display: block;
  margin-top: 4rpx;
}
.balance-main {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}
.balance-coin {
  font-size: 80rpx;
  font-weight: bold;
  color: #fff;
}
.balance-unit {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
}
.balance-yuan {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.7);
  display: block;
  margin-top: 8rpx;
}

.quick-actions {
  display: flex;
  gap: 24rpx;
  margin-top: 32rpx;
}
.quick-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  padding: 20rpx 0;
  border-radius: 16rpx;
  font-size: 26rpx;
  color: #8B4513;
  background: rgba(255, 255, 255, 0.9);
  font-weight: 500;
}
.quick-btn:active {
  transform: scale(0.97);
  background: #fff;
}
.qb-icon {
  font-size: 32rpx;
  font-weight: bold;
}
.qb-label {
  font-size: 26rpx;
}

/* ── 功能入口 ── */
.entry-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
  margin: 0 24rpx 20rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx 16rpx;
}
.entry-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
}
.entry-item:active {
  transform: scale(0.95);
}
.entry-icon {
  font-size: 44rpx;
}
.entry-label {
  font-size: 22rpx;
  color: $text-secondary;
}

/* ── 区块 ── */
.section {
  margin: 0 24rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
}
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
  padding-bottom: 16rpx;
  border-bottom: 2rpx solid $border;
}
.section-title {
  font-size: 28rpx;
  font-weight: bold;
  color: $text;
  padding-left: 12rpx;
  border-left: 4rpx solid $gold;
}
.section-more {
  display: flex;
  align-items: center;
  gap: 4rpx;
  font-size: 24rpx;
  color: $text-tertiary;
}
.more-arrow {
  font-size: 28rpx;
  font-weight: bold;
}

/* ── 按月分组 ── */
.tx-group-title {
  font-size: 24rpx;
  color: $text-tertiary;
  display: block;
  padding: 16rpx 0 8rpx;
  font-weight: 500;
}

/* ── 交易记录 ── */
.transaction-list {
  display: flex;
  flex-direction: column;
}
.transaction-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 0;
  border-bottom: 1rpx solid $border-light;
}
.transaction-item:last-child {
  border-bottom: none;
}
.tx-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.tx-icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  color: #fff;
  flex-shrink: 0;
}
.tx-icon.icon-recharge { background: #27ae60; }
.tx-icon.icon-spend { background: $primary; }
.tx-icon.icon-refund { background: #3498db; }
.tx-icon.icon-bonus { background: #f39c12; }
.tx-icon.icon-withdraw { background: #95a5a6; }
.tx-icon.icon-default { background: #95a5a6; }

.tx-info {
  display: flex;
  flex-direction: column;
}
.tx-scene {
  font-size: 26rpx;
  color: $text;
  font-weight: 500;
}
.tx-time {
  font-size: 22rpx;
  color: $text-tertiary;
  margin-top: 4rpx;
}
.tx-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
.tx-amount {
  font-size: 28rpx;
  font-weight: bold;
}
.tx-amount.amount-income { color: #27ae60; }
.tx-amount.amount-spend { color: $primary; }
.tx-balance {
  font-size: 20rpx;
  color: #ccc;
  margin-top: 4rpx;
}

/* ── 加载更多 ── */
.load-more {
  text-align: center;
  padding: 20rpx 0 0;
  color: $gold;
  font-size: 24rpx;
}
.load-more:active {
  opacity: 0.7;
}
.no-more {
  text-align: center;
  padding: 20rpx 0 0;
  color: $text-tertiary;
  font-size: 22rpx;
}
</style>
