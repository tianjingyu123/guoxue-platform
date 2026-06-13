<template>
  <view class="wallet-page">
    <!-- 头部 -->
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <text class="header-title">我的钱包</text>
        <view class="header-spacer" />
      </view>
    </view>

    <view class="page-body">
      <!-- 资产卡片 -->
      <view class="asset-card">
        <view class="ac-bg-icon1">🪙</view>
        <view class="ac-bg-icon2">✨</view>
        <view class="ac-content">
          <!-- 余额展示 -->
          <view class="ac-balance">
            <text class="ac-label">国学币余额</text>
            <view class="ac-balance-row">
              <text class="ac-coin-icon">🪙</text>
              <text class="ac-amount">{{ walletInfo.balance.toLocaleString() }}</text>
              <text class="ac-unit">币</text>
            </view>
            <text class="ac-rmb">≈ ¥{{ walletInfo.rmb.toFixed(2) }}</text>
          </view>

          <!-- 积分和成长值 -->
          <view class="ac-stats">
            <view class="ac-stat-item" @click="goPage('/pages/mine/points/index')">
              <text class="as-icon">⭐</text>
              <text class="as-label">积分</text>
              <text class="as-value">{{ walletInfo.points.toLocaleString() }}</text>
            </view>
            <view class="ac-stat-divider" />
            <view class="ac-stat-item">
              <text class="as-icon">📈</text>
              <text class="as-label">成长值</text>
              <text class="as-value">{{ walletInfo.growthValue.toLocaleString() }}</text>
            </view>
          </view>

          <!-- 等级进度 -->
          <view class="ac-level">
            <view class="al-row">
              <text class="al-lv">LV.{{ walletInfo.level }}</text>
              <text class="al-lv">LV.{{ walletInfo.level + 1 }}</text>
            </view>
            <view class="al-bar">
              <view class="al-fill" :style="{ width: (walletInfo.growthValue / walletInfo.nextLevelGrowth * 100) + '%' }" />
            </view>
            <text class="al-hint">还需 {{ (walletInfo.nextLevelGrowth - walletInfo.growthValue).toLocaleString() }} 成长值升级</text>
          </view>

          <!-- 累计数据 -->
          <view class="ac-totals">
            <view class="at-item">
              <text class="at-label">累计充值</text>
              <text class="at-value">{{ walletInfo.totalRecharge }}币</text>
            </view>
            <view class="at-divider" />
            <view class="at-item">
              <text class="at-label">累计消费</text>
              <text class="at-value">{{ walletInfo.totalSpent }}币</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 快捷操作 -->
      <view class="quick-actions">
        <view class="qa-btn recharge" @click="showRecharge = true">
          <text>💳</text>
          <text>充值</text>
        </view>
        <view class="qa-btn transactions" @click="goPage('/pages/mine/wallet/transactions/index')">
          <text>交易明细</text>
          <text>›</text>
        </view>
      </view>

      <!-- 近期交易 -->
      <view class="card">
        <view class="card-header">
          <text class="card-title">近期交易</text>
          <text class="card-more" @click="goPage('/pages/mine/wallet/transactions/index')">全部记录 ›</text>
        </view>

        <!-- 骨架屏 -->
        <template v-if="loading">
          <view v-for="i in 4" :key="i" class="trans-skeleton">
            <view class="ts-avatar" />
            <view class="ts-info">
              <view class="ts-line short" />
              <view class="ts-line shorter" />
            </view>
            <view class="ts-amount" />
          </view>
        </template>

        <!-- 交易列表 -->
        <template v-else-if="transactions.length > 0">
          <view v-for="item in transactions" :key="item.id" class="trans-item">
            <view class="ti-icon" :class="'type-' + item.type">
              <text>{{ item.type === 'recharge' ? '💳' : item.type === 'spend' ? '🛒' : item.type === 'bonus' ? '🎁' : item.type === 'refund' ? '↩️' : item.type === 'income' ? '💰' : '📤' }}</text>
            </view>
            <view class="ti-info">
              <text class="ti-title">{{ item.title }}</text>
              <text class="ti-time">{{ item.time }}</text>
            </view>
            <text class="ti-amount" :class="{ positive: item.amount > 0 }">{{ item.amount > 0 ? '+' : '' }}{{ item.amount }}币</text>
          </view>
        </template>

        <!-- 空状态 -->
        <view v-else class="trans-empty">
          <text class="te-icon">🪙</text>
          <text class="te-text">暂无交易记录</text>
        </view>
      </view>

      <!-- 充值说明 -->
      <view class="card rules-card">
        <text class="card-title">充值说明</text>
        <view class="rules-list">
          <text class="rule-item">· 1元人民币 = 10国学币</text>
          <text class="rule-item">· 国学币可用于购买课程、商品、加入圈子等</text>
          <text class="rule-item">· 充值后国学币不可提现，请按需充值</text>
          <text class="rule-item">· 大额充值享受额外赠送，详见充值页面</text>
        </view>
      </view>
    </view>

    <!-- 充值弹窗 -->
    <view v-if="showRecharge" class="modal-overlay" @click="closeRecharge">
      <view class="recharge-modal" @click.stop>
        <view class="rm-header">
          <text class="rm-title">充值国学币</text>
          <text class="rm-close" @click="closeRecharge">×</text>
        </view>

        <!-- 充值选项 -->
        <view class="rm-grid">
          <view
            v-for="(opt, index) in rechargeOptions"
            :key="index"
            class="rm-option"
            :class="{ selected: selectedOption === index }"
            @click="selectedOption = index"
          >
            <view v-if="opt.popular" class="rmo-badge"><text>推荐</text></view>
            <view class="rmo-coins">
              <text class="rmo-icon">🪙</text>
              <text class="rmo-num">{{ opt.coins }}</text>
            </view>
            <text class="rmo-price">¥{{ opt.price }}</text>
            <text v-if="opt.bonus > 0" class="rmo-bonus">送{{ opt.bonus }}币</text>
          </view>
        </view>

        <!-- 选中信息 -->
        <view v-if="selectedOption !== null" class="rm-summary">
          <view class="rms-row">
            <text class="rms-label">充值金额</text>
            <text class="rms-value">¥{{ rechargeOptions[selectedOption].price }}</text>
          </view>
          <view class="rms-row">
            <text class="rms-label">获得国学币</text>
            <text class="rms-value coins">
              {{ rechargeOptions[selectedOption].coins + rechargeOptions[selectedOption].bonus }}币
              <text v-if="rechargeOptions[selectedOption].bonus > 0" class="rms-extra">(含赠送{{ rechargeOptions[selectedOption].bonus }})</text>
            </text>
          </view>
        </view>

        <!-- 支付按钮 -->
        <view class="rm-footer">
          <view
            class="rm-pay-btn"
            :class="{ disabled: selectedOption === null || paying }"
            @click="handleRecharge"
          >
            <text v-if="paying">创建订单中...</text>
            <text v-else-if="selectedOption !== null">立即支付 ¥{{ rechargeOptions[selectedOption].price }}</text>
            <text v-else>请选择充值金额</text>
          </view>
          <text class="rm-agreement">支付即表示同意《充值服务协议》</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const loading = ref(true)
const showRecharge = ref(false)
const selectedOption = ref<number | null>(null)
const paying = ref(false)

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
  popular: boolean
}

interface TransactionItem {
  id: number
  title: string
  time: string
  amount: number
  type: string
}

const walletInfo = ref<WalletInfo>({
  balance: 12860, rmb: 1286, points: 5600, growthValue: 3500,
  level: 5, nextLevelGrowth: 5000, totalRecharge: 50000, totalSpent: 37140
})

const rechargeOptions = ref<RechargeOption[]>([
  { coins: 100, price: 10, bonus: 0, popular: false },
  { coins: 500, price: 50, bonus: 30, popular: false },
  { coins: 1000, price: 100, bonus: 80, popular: true },
  { coins: 2000, price: 200, bonus: 200, popular: false },
  { coins: 5000, price: 500, bonus: 600, popular: false },
  { coins: 10000, price: 1000, bonus: 1500, popular: false }
])

const transactions = ref<TransactionItem[]>([
  { id: 1, title: '充值国学币', time: '2024-06-08 14:30', amount: 1000, type: 'recharge' },
  { id: 2, title: '购买课程-八字命理入门', time: '2024-06-08 10:15', amount: -499, type: 'spend' },
  { id: 3, title: '邀请好友奖励', time: '2024-06-07 16:20', amount: 50, type: 'bonus' },
  { id: 4, title: '课程退款-周易基础', time: '2024-06-06 09:45', amount: 199, type: 'refund' },
  { id: 5, title: '专栏收益提成', time: '2024-06-05 20:10', amount: 300, type: 'income' },
  { id: 6, title: '提现到微信', time: '2024-06-04 12:00', amount: -2000, type: 'withdraw' }
])

onMounted(() => {
  setTimeout(() => { loading.value = false }, 600)
})

function closeRecharge() {
  showRecharge.value = false
  selectedOption.value = null
}

function handleRecharge() {
  if (selectedOption.value === null || paying.value) return
  paying.value = true
  setTimeout(() => {
    paying.value = false
    showRecharge.value = false
    uni.showToast({ title: '订单创建成功', icon: 'success' })
    selectedOption.value = null
  }, 1000)
}

function goPage(url: string) {
  uni.navigateTo({ url })
}
</script>

<style scoped>
.wallet-page {
  min-height: 100vh;
  background: #FAF8F5;
  padding-bottom: 48rpx;
}

.header-sticky {
  position: sticky;
  top: 0;
  z-index: 30;
  background: #fff;
  border-bottom: 1px solid #E8E0D5;
}
.header-row {
  display: flex;
  align-items: center;
  padding: 10rpx 24rpx;
  height: 80rpx;
}
.header-back { font-size: 48rpx; color: #333; width: 56rpx; }
.header-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; flex: 1; text-align: center; }
.header-spacer { width: 56rpx; }

.page-body {
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

/* 资产卡片 */
.asset-card {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(201,169,110,0.2), rgba(201,169,110,0.1), rgba(196,30,58,0.05));
  border-radius: 24rpx;
  border: 2rpx solid rgba(201,169,110,0.2);
}
.ac-bg-icon1 {
  position: absolute;
  right: -40rpx;
  top: -40rpx;
  font-size: 160rpx;
  opacity: 0.06;
}
.ac-bg-icon2 {
  position: absolute;
  left: -30rpx;
  bottom: -30rpx;
  font-size: 120rpx;
  opacity: 0.06;
}
.ac-content {
  position: relative;
  z-index: 1;
  padding: 48rpx 32rpx;
}

.ac-balance {
  text-align: center;
  margin-bottom: 32rpx;
}
.ac-label { font-size: 26rpx; color: #999; display: block; margin-bottom: 12rpx; }
.ac-balance-row { display: flex; align-items: baseline; justify-content: center; gap: 8rpx; }
.ac-coin-icon { font-size: 44rpx; }
.ac-amount { font-size: 72rpx; font-weight: 700; color: #C9A96E; }
.ac-unit { font-size: 32rpx; color: rgba(201,169,110,0.8); }
.ac-rmb { font-size: 26rpx; color: #999; margin-top: 8rpx; display: block; }

.ac-stats { display: flex; align-items: center; justify-content: center; gap: 32rpx; margin-bottom: 28rpx; }
.ac-stat-item { display: flex; align-items: center; gap: 10rpx; }
.as-icon { font-size: 28rpx; }
.as-label { font-size: 24rpx; color: #999; }
.as-value { font-size: 26rpx; font-weight: 500; color: #2C2C2C; }
.ac-stat-divider { width: 2rpx; height: 32rpx; background: #E8E0D5; }

.ac-level { margin-bottom: 28rpx; }
.al-row { display: flex; justify-content: space-between; margin-bottom: 8rpx; }
.al-lv { font-size: 20rpx; color: #999; }
.al-bar { height: 10rpx; background: rgba(232,224,213,0.5); border-radius: 5rpx; overflow: hidden; }
.al-fill { height: 100%; background: linear-gradient(to right, #C9A96E, #C41E3A); border-radius: 5rpx; transition: width 0.3s; }
.al-hint { font-size: 20rpx; color: #999; text-align: center; display: block; margin-top: 8rpx; }

.ac-totals {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 48rpx;
  padding-top: 24rpx;
  border-top: 1px solid rgba(232,224,213,0.5);
}
.at-item { text-align: center; }
.at-label { font-size: 22rpx; color: #999; display: block; }
.at-value { font-size: 26rpx; font-weight: 500; color: #2C2C2C; margin-top: 6rpx; }
.at-divider { width: 2rpx; height: 48rpx; background: rgba(232,224,213,0.5); }

/* 快捷操作 */
.quick-actions { display: flex; gap: 20rpx; }
.qa-btn {
  flex: 1;
  height: 96rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 500;
  gap: 12rpx;
}
.qa-btn.recharge { background: #C41E3A; color: #fff; }
.qa-btn.transactions { background: #fff; color: #2C2C2C; border: 2rpx solid #E8E0D5; }

/* 交易卡片 */
.card { background: #fff; border-radius: 20rpx; padding: 24rpx; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24rpx; }
.card-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.card-more { font-size: 24rpx; color: #C41E3A; }

.trans-skeleton { display: flex; align-items: center; gap: 16rpx; padding: 16rpx 0; }
.ts-avatar { width: 72rpx; height: 72rpx; border-radius: 50%; background: #F0F0F0; }
.ts-line { height: 24rpx; background: #F0F0F0; border-radius: 6rpx; margin-bottom: 8rpx; }
.ts-line.short { width: 160rpx; }
.ts-line.shorter { width: 100rpx; }
.ts-amount { width: 80rpx; height: 28rpx; background: #F0F0F0; border-radius: 6rpx; }

.trans-item { display: flex; align-items: center; gap: 20rpx; padding: 16rpx 0; border-bottom: 1px solid #F5F1EB; }
.trans-item:last-child { border-bottom: none; }
.ti-icon {
  width: 72rpx; height: 72rpx; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; font-size: 32rpx;
}
.ti-icon.type-recharge { background: rgba(34,197,94,0.1); }
.ti-icon.type-spend { background: rgba(196,30,58,0.1); }
.ti-icon.type-bonus { background: rgba(201,169,110,0.1); }
.ti-icon.type-refund { background: rgba(59,130,246,0.1); }
.ti-icon.type-income { background: rgba(34,197,94,0.1); }
.ti-icon.type-withdraw { background: rgba(245,158,11,0.1); }
.ti-info { flex: 1; min-width: 0; }
.ti-title { font-size: 26rpx; font-weight: 500; color: #2C2C2C; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ti-time { font-size: 20rpx; color: #999; display: block; margin-top: 4rpx; }
.ti-amount { font-size: 26rpx; font-weight: 600; color: #C41E3A; }
.ti-amount.positive { color: #22C55E; }

.trans-empty { padding: 48rpx 0; text-align: center; }
.te-icon { font-size: 72rpx; opacity: 0.3; display: block; }
.te-text { font-size: 26rpx; color: #999; margin-top: 16rpx; }

/* 充值说明 */
.rules-card { padding: 24rpx; }
.rules-list { display: flex; flex-direction: column; gap: 16rpx; margin-top: 20rpx; }
.rule-item { font-size: 24rpx; color: #999; line-height: 1.5; }

/* 充值弹窗 */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.recharge-modal {
  width: 100%;
  max-width: 750rpx;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  padding-bottom: env(safe-area-inset-bottom);
}
.rm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
  border-bottom: 1px solid #E8E0D5;
}
.rm-title { font-size: 34rpx; font-weight: 600; color: #2C2C2C; }
.rm-close { font-size: 48rpx; color: #999; padding: 0 8rpx; }

.rm-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20rpx;
  padding: 32rpx;
}
.rm-option {
  position: relative;
  padding: 24rpx 16rpx;
  border-radius: 20rpx;
  border: 3rpx solid #E8E0D5;
  text-align: center;
}
.rm-option.selected { border-color: #C41E3A; background: rgba(196,30,58,0.03); }
.rmo-badge {
  position: absolute;
  top: -12rpx;
  right: -12rpx;
  background: #C41E3A;
  color: #fff;
  font-size: 18rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}
.rmo-coins { display: flex; align-items: center; justify-content: center; gap: 4rpx; margin-bottom: 8rpx; }
.rmo-icon { font-size: 28rpx; }
.rmo-num { font-size: 32rpx; font-weight: 700; color: #2C2C2C; }
.rmo-price { font-size: 26rpx; color: #C41E3A; font-weight: 500; display: block; }
.rmo-bonus { font-size: 20rpx; color: #C9A96E; margin-top: 6rpx; display: block; }

.rm-summary {
  margin: 0 32rpx;
  padding: 20rpx;
  background: #F5F1EB;
  border-radius: 16rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.rms-row { display: flex; justify-content: space-between; align-items: center; }
.rms-label { font-size: 24rpx; color: #999; }
.rms-value { font-size: 26rpx; color: #2C2C2C; font-weight: 500; }
.rms-value.coins { color: #C9A96E; }
.rms-extra { font-size: 20rpx; font-weight: 400; }

.rm-footer { padding: 32rpx; }
.rm-pay-btn {
  width: 100%;
  padding: 28rpx;
  border-radius: 20rpx;
  background: #C41E3A;
  color: #fff;
  font-size: 30rpx;
  font-weight: 500;
  text-align: center;
}
.rm-pay-btn.disabled { background: #CCC; }
.rm-agreement { font-size: 22rpx; color: #BBB; text-align: center; margin-top: 16rpx; display: block; }
</style>
