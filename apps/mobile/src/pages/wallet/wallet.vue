<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <text class="nav-title">我的钱包</text>
      <view class="nav-placeholder" />
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
            <text class="balance-label">国学币余额</text>
            <text class="balance-sub">可用于课程、圈子、打赏等</text>
          </view>
          <view class="balance-main">
            <text class="balance-coin">{{ walletInfo?.balance.toLocaleString() || '0' }}</text>
            <text class="balance-unit">币</text>
          </view>
          <text class="balance-yuan">≈ ¥{{ rmbAmount }}</text>

          <!-- 积分和成长值 -->
          <view class="balance-extras">
            <view class="be-item" @click="goPoints">
              <text class="be-icon">⭐</text>
              <text class="be-label">积分</text>
              <text class="be-value">{{ walletInfo?.points.toLocaleString() || 0 }}</text>
            </view>
            <view class="be-divider" />
            <view class="be-item">
              <text class="be-icon">📈</text>
              <text class="be-label">成长值</text>
              <text class="be-value">{{ walletInfo?.growthValue.toLocaleString() || 0 }}</text>
            </view>
          </view>

          <!-- 会员等级进度 -->
          <view v-if="walletInfo" class="level-progress">
            <view class="lp-header">
              <text class="lp-text">LV.{{ walletInfo.level }}</text>
              <text class="lp-text">LV.{{ walletInfo.level + 1 }}</text>
            </view>
            <view class="lp-bar">
              <view
                class="lp-fill"
                :style="{ width: levelPercent + '%' }"
              />
            </view>
            <text class="lp-hint">
              还需 {{ (walletInfo.nextLevelGrowth - walletInfo.growthValue).toLocaleString() }} 成长值升级
            </text>
          </view>

          <!-- 快捷操作 -->
          <view class="quick-actions">
            <view class="quick-btn btn-recharge" @click="showRecharge = true">
              <text class="qb-icon">+</text>
              <text class="qb-label">充值</text>
            </view>
            <view class="quick-btn btn-withdraw" @click="goWithdraw">
              <text class="qb-icon">↑</text>
              <text class="qb-label">提现</text>
            </view>
          </view>
        </view>
      </view>

      <!-- ==================== 功能入口 ==================== -->
      <view class="entry-grid">
        <view class="entry-item" @click="goPoints">
          <text class="entry-icon">⭐</text>
          <text class="entry-label">积分中心</text>
        </view>
        <view class="entry-item" @click="goVIP">
          <text class="entry-icon">👑</text>
          <text class="entry-label">会员中心</text>
        </view>
        <view class="entry-item" @click="goCoupons">
          <text class="entry-icon">🎫</text>
          <text class="entry-label">优惠券</text>
        </view>
        <view class="entry-item" @click="goPassword">
          <text class="entry-icon">🔒</text>
          <text class="entry-label">支付密码</text>
        </view>
      </view>

      <!-- ==================== 交易记录 ==================== -->
      <view class="section">
        <view class="section-header" @click="goTransactions">
          <text class="section-title">交易记录</text>
          <view class="section-more">
            <text>查看全部</text>
            <text class="more-arrow">›</text>
          </view>
        </view>

        <LoadingSkeleton v-if="loading && transactions.length === 0" type="list" />
        <EmptyState
          v-else-if="transactions.length === 0"
          icon="💰"
          title="暂无交易记录"
        />

        <view v-else class="transaction-list">
          <view
            v-for="(group, gIdx) in groupedTransactions"
            :key="gIdx"
            class="tx-group"
          >
            <text class="tx-group-title">{{ group.month }}</text>
            <view
              v-for="tx in group.list"
              :key="tx.id"
              class="transaction-item"
            >
              <view class="tx-left">
                <view class="tx-icon" :class="txIconClass(tx.type)">
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
                  {{ tx.type === 'RECHARGE' || tx.type === 'REFUND' || tx.type === 'BONUS' || tx.type === 'INCOME' ? '+' : '' }}{{ tx.amountCoin }}
                </text>
                <text class="tx-balance">余额 {{ tx.balanceAfter }}</text>
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

      <!-- ==================== 充值说明 ==================== -->
      <view class="section info-section">
        <text class="section-title">充值说明</text>
        <view class="info-list">
          <view class="info-item">
            <text class="info-dot">•</text>
            <text class="info-text">1元人民币 = 10国学币</text>
          </view>
          <view class="info-item">
            <text class="info-dot">•</text>
            <text class="info-text">国学币可用于购买课程、商品、加入圈子等</text>
          </view>
          <view class="info-item">
            <text class="info-dot">•</text>
            <text class="info-text">充值后国学币不可提现，请按需充值</text>
          </view>
          <view class="info-item">
            <text class="info-dot">•</text>
            <text class="info-text">大额充值享受额外赠送，详见充值页面</text>
          </view>
        </view>
      </view>
    </DataState>

    <!-- ==================== 充值弹窗 ==================== -->
    <view
      v-if="showRecharge"
      class="modal-overlay"
      @click="closeRecharge"
    >
      <view
        class="modal-sheet"
        @click.stop
      >
        <!-- 弹窗头部 -->
        <view class="modal-header">
          <text class="modal-title">充值国学币</text>
          <text
            class="modal-close"
            @click="closeRecharge"
          >
            ✕
          </text>
        </view>

        <!-- 充值选项 -->
        <view class="recharge-options">
          <view
            v-for="(option, index) in rechargeOptions"
            :key="index"
            class="recharge-option"
            :class="{ selected: selectedOption === index }"
            @click="selectedOption = index"
          >
            <view
              v-if="option.popular"
              class="ro-badge"
            >
              推荐
            </view>
            <view class="ro-coins">
              <text class="ro-coin-icon">🪙</text>
              <text class="ro-coin-val">{{ option.coins }}</text>
            </view>
            <text class="ro-price">¥{{ option.price }}</text>
            <text
              v-if="option.bonus > 0"
              class="ro-bonus"
            >
              送{{ option.bonus }}币
            </text>
          </view>
        </view>

        <!-- 选中信息 -->
        <view
          v-if="selectedOption !== null"
          class="selected-info"
        >
          <view class="si-row">
            <text class="si-label">充值金额</text>
            <text class="si-value">¥{{ rechargeOptions[selectedOption].price }}</text>
          </view>
          <view class="si-row">
            <text class="si-label">获得国学币</text>
            <text class="si-value gold">
              {{ rechargeOptions[selectedOption].coins + rechargeOptions[selectedOption].bonus }}币
              <text
                v-if="rechargeOptions[selectedOption].bonus > 0"
                class="si-bonus"
              >
                (含赠送{{ rechargeOptions[selectedOption].bonus }})
              </text>
            </text>
          </view>
        </view>

        <!-- 支付按钮 -->
        <view class="modal-footer">
          <button
            class="pay-btn"
            :class="{ disabled: selectedOption === null || paying }"
            :disabled="selectedOption === null || paying"
            @click="handleRecharge"
          >
            <text v-if="paying">创建订单中...</text>
            <text v-else-if="selectedOption !== null">立即支付 ¥{{ rechargeOptions[selectedOption].price }}</text>
            <text v-else>请选择充值金额</text>
          </button>
          <text class="pay-agree">支付即表示同意《充值服务协议》</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import DataState from '../../components/DataState.vue'
import EmptyState from '../../components/EmptyState.vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import { coinApi } from '../../api'

interface WalletInfo {
  balance: number
  rmb: number
  points: number
  growthValue: number
  level: number
  nextLevelGrowth: number
  totalRecharge: number
  totalSpent: number
}

interface RechargeOption {
  coins: number
  price: number
  bonus: number
  popular?: boolean
}

interface TransactionItem {
  id: string
  type: string
  scene: string
  amountCoin: number
  balanceAfter: number
  createdAt: string
  description?: string
}

// ====== 数据状态 ======
const loading = ref(true)
const error = ref<string | null>(null)
const walletInfo = ref<WalletInfo | null>(null)
const rechargeOptions = ref<RechargeOption[]>([])
const transactions = ref<TransactionItem[]>([])
const page = ref(1)
const pageSize = 10
const hasMore = ref(true)

// ====== 充值弹窗 ======
const showRecharge = ref(false)
const selectedOption = ref<number | null>(null)
const paying = ref(false)

const hasData = computed(() => !!walletInfo.value)
const rmbAmount = computed(() => walletInfo.value ? walletInfo.value.rmb.toFixed(2) : '0.00')
const levelPercent = computed(() => {
  if (!walletInfo.value) return 0
  return Math.min((walletInfo.value.growthValue / walletInfo.value.nextLevelGrowth) * 100, 100)
})

onShow(() => {
  loadData()
})

async function loadData() {
  loading.value = true
  error.value = null
  page.value = 1
  hasMore.value = true
  try {
    const [walletRes, optionsRes, transRes] = await Promise.all([
      coinApi.getBalance().catch(() => null),
      coinApi.getTiers().catch(() => null),
      coinApi.getTransactions(1, pageSize).catch(() => null),
    ])

    // 钱包余额
    const w: any = walletRes
    if (w) {
      walletInfo.value = {
        balance: w.balance ?? w.coin ?? 0,
        rmb: w.rmb ?? Math.floor((w.balance ?? w.coin ?? 0) / 10),
        points: w.points ?? 0,
        growthValue: w.growthValue ?? 0,
        level: w.level ?? 1,
        nextLevelGrowth: w.nextLevelGrowth ?? 1000,
        totalRecharge: w.totalRecharge ?? 0,
        totalSpent: w.totalSpent ?? 0,
      }
    }

    // 充值档位
    const tiers: any = optionsRes
    if (Array.isArray(tiers)) {
      rechargeOptions.value = tiers.map((t: any) => ({
        coins: t.coins ?? t.amount ?? 0,
        price: t.price ?? (t.coins ?? t.amount ?? 0) / 10,
        bonus: t.bonus ?? 0,
        popular: t.popular ?? false,
      }))
    } else {
      // 默认档位
      rechargeOptions.value = [
        { coins: 100, price: 10, bonus: 0 },
        { coins: 500, price: 50, bonus: 10, popular: true },
        { coins: 1000, price: 100, bonus: 30 },
        { coins: 3000, price: 300, bonus: 120 },
        { coins: 5000, price: 500, bonus: 250 },
        { coins: 10000, price: 1000, bonus: 600 },
      ]
    }

    // 交易记录
    const txData: any = transRes
    if (Array.isArray(txData)) {
      transactions.value = txData.slice(0, pageSize)
      hasMore.value = txData.length >= pageSize
    }
  } catch (e) {
    error.value = '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  if (!hasMore.value || loading.value) return
  page.value++
  try {
    const txData: any = await coinApi.getTransactions(page.value, pageSize)
    const newItems = Array.isArray(txData) ? txData : []
    transactions.value.push(...newItems)
    hasMore.value = newItems.length >= pageSize
  } catch {
    page.value--
  }
}

/** 处理充值 */
async function handleRecharge() {
  if (selectedOption.value === null) return
  paying.value = true
  try {
    const option = rechargeOptions.value[selectedOption.value]
    await coinApi.spend({ amountCoin: option.coins, scene: 'RECHARGE', description: `充值${option.coins}国学币` })
    uni.showToast({ title: '充值成功', icon: 'success' })
    closeRecharge()
    loadData()
  } catch {
    uni.showToast({ title: '充值失败', icon: 'none' })
  } finally {
    paying.value = false
  }
}

function closeRecharge() {
  showRecharge.value = false
  selectedOption.value = null
}

// ====== 交易记录处理 ======
interface TxGroup {
  month: string
  list: TransactionItem[]
}

const groupedTransactions = computed(() => {
  const groups: Record<string, TransactionItem[]> = {}
  for (const tx of transactions.value) {
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
  SPEND: '消费',
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

// ====== 导航 ======
function goWithdraw() {
  uni.navigateTo({ url: '/pages/wallet/withdraw' })
}
function goTransactions() {
  uni.navigateTo({ url: '/pages/wallet/transactions' })
}
function goPoints() {
  uni.navigateTo({ url: '/pages/mine/points' })
}
function goVIP() {
  uni.navigateTo({ url: '/pages/vip/vip' })
}
function goCoupons() {
  uni.navigateTo({ url: '/pages/shop/coupons' })
}
function goPassword() {
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
.nav-placeholder { width: 80rpx; }

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
.balance-header { margin-bottom: 16rpx; }
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

/* 积分和成长值 */
.balance-extras {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
  margin-top: 24rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid rgba(255, 255, 255, 0.15);
}
.be-item {
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.be-icon { font-size: 24rpx; }
.be-label { font-size: 22rpx; color: rgba(255, 255, 255, 0.7); }
.be-value { font-size: 22rpx; color: #fff; font-weight: 500; }
.be-divider {
  width: 1rpx;
  height: 24rpx;
  background: rgba(255, 255, 255, 0.2);
}

/* 等级进度条 */
.level-progress { margin-top: 24rpx; }
.lp-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8rpx;
}
.lp-text { font-size: 20rpx; color: rgba(255, 255, 255, 0.6); }
.lp-bar {
  height: 12rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 6rpx;
  overflow: hidden;
}
.lp-fill {
  height: 100%;
  background: linear-gradient(90deg, #FFE4B5, #FFD700);
  border-radius: 6rpx;
  transition: width 0.3s;
}
.lp-hint {
  display: block;
  text-align: center;
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 8rpx;
}

/* ── 快捷操作 ── */
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
}
.qb-icon { font-size: 32rpx; font-weight: bold; }
.qb-label { font-size: 26rpx; }

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
.entry-item:active { transform: scale(0.95); }
.entry-icon { font-size: 44rpx; }
.entry-label { font-size: 22rpx; color: $text-secondary; }

/* ── 区块 ── */
.section {
  margin: 0 24rpx 20rpx;
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
.more-arrow { font-size: 28rpx; font-weight: bold; }

/* ── 信息列表 ── */
.info-section { margin-top: 0; }
.info-list { display: flex; flex-direction: column; gap: 12rpx; }
.info-item { display: flex; gap: 8rpx; }
.info-dot { color: $gold; font-size: 24rpx; }
.info-text { font-size: 24rpx; color: $text-tertiary; line-height: 1.5; }

/* ── 交易记录 ── */
.tx-group-title {
  font-size: 24rpx;
  color: $text-tertiary;
  display: block;
  padding: 16rpx 0 8rpx;
  font-weight: 500;
}
.transaction-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 0;
  border-bottom: 1rpx solid $border-light;
}
.transaction-item:last-child { border-bottom: none; }
.tx-left { display: flex; align-items: center; gap: 16rpx; }
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
.tx-info { display: flex; flex-direction: column; }
.tx-scene { font-size: 26rpx; color: $text; font-weight: 500; }
.tx-time { font-size: 22rpx; color: $text-tertiary; margin-top: 4rpx; }
.tx-right { display: flex; flex-direction: column; align-items: flex-end; }
.tx-amount { font-size: 28rpx; font-weight: bold; }
.tx-amount.amount-income { color: #27ae60; }
.tx-amount.amount-spend { color: $primary; }
.tx-balance { font-size: 20rpx; color: #ccc; margin-top: 4rpx; }

.load-more {
  text-align: center;
  padding: 20rpx 0 0;
  color: $gold;
  font-size: 24rpx;
}
.load-more:active { opacity: 0.7; }
.no-more {
  text-align: center;
  padding: 20rpx 0 0;
  color: $text-tertiary;
  font-size: 22rpx;
}

/* ── 充值弹窗 ── */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 999;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.modal-sheet {
  width: 100%;
  max-width: 750rpx;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  max-height: 80vh;
  overflow-y: auto;
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid $border;
}
.modal-title { font-size: 32rpx; font-weight: bold; color: $text; }
.modal-close {
  font-size: 36rpx;
  color: $text-tertiary;
  padding: 8rpx;
}
.recharge-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
  padding: 24rpx 32rpx;
}
.recharge-option {
  position: relative;
  padding: 24rpx 16rpx;
  border-radius: 16rpx;
  border: 2rpx solid $border;
  text-align: center;
  transition: all 0.2s;
}
.recharge-option.selected {
  border-color: $gold;
  background: #fdf8ee;
}
.ro-badge {
  position: absolute;
  top: -14rpx;
  right: -8rpx;
  background: linear-gradient(135deg, $gold, $gold-light);
  color: #fff;
  font-size: 18rpx;
  padding: 2rpx 12rpx;
  border-radius: 14rpx;
  font-weight: 500;
}
.ro-coins {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  margin-bottom: 8rpx;
}
.ro-coin-icon { font-size: 28rpx; }
.ro-coin-val { font-size: 36rpx; font-weight: bold; color: $text; }
.ro-price { font-size: 26rpx; color: $gold; font-weight: 500; }
.ro-bonus { font-size: 20rpx; color: #27ae60; margin-top: 4rpx; display: block; }

.selected-info {
  margin: 0 32rpx;
  padding: 20rpx;
  background: $bg;
  border-radius: 12rpx;
}
.si-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}
.si-row:last-child { margin-bottom: 0; }
.si-label { font-size: 24rpx; color: $text-tertiary; }
.si-value { font-size: 26rpx; color: $text; font-weight: 500; }
.si-value.gold { color: $gold; }
.si-bonus { font-size: 20rpx; }

.modal-footer {
  padding: 24rpx 32rpx calc(24rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid $border;
  margin-top: 20rpx;
}
.pay-btn {
  width: 100%;
  height: 88rpx;
  background: linear-gradient(135deg, $gold, $gold-light);
  color: #fff;
  border: none;
  border-radius: 44rpx;
  font-size: 28rpx;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pay-btn.disabled { opacity: 0.4; }
.pay-agree {
  display: block;
  text-align: center;
  font-size: 22rpx;
  color: $text-tertiary;
  margin-top: 16rpx;
}
</style>
