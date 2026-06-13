<template>
  <view class="wallet-page">
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <text class="header-title">我的钱包</text>
      </view>
    </view>

    <!-- 资产卡片 -->
    <view class="asset-card">
      <view class="ac-bg-icon">🪙</view>
      <view class="ac-content">
        <text class="ac-label">国学币余额</text>
        <view class="ac-balance-row">
          <text class="ac-balance">{{ wallet.balance.toLocaleString() }}</text>
          <text class="ac-unit">币</text>
        </view>
        <text class="ac-rmb">≈ ¥{{ wallet.rmb.toFixed(2) }}</text>

        <view class="ac-extras">
          <view class="ace-item" @click="goPage('/pages/points/index')">
            <text class="ace-icon">⭐</text>
            <text class="ace-label">积分</text>
            <text class="ace-val">{{ wallet.points.toLocaleString() }}</text>
          </view>
          <view class="ace-divider" />
          <view class="ace-item">
            <text class="ace-icon">📈</text>
            <text class="ace-label">成长值</text>
            <text class="ace-val">{{ wallet.growthValue.toLocaleString() }}</text>
          </view>
        </view>

        <!-- 等级进度 -->
        <view class="level-bar-section">
          <view class="lb-labels">
            <text class="lb-label">LV.{{ wallet.level }}</text>
            <text class="lb-label">LV.{{ wallet.level + 1 }}</text>
          </view>
          <view class="lb-track">
            <view class="lb-fill" :style="{ width: (wallet.growthValue / wallet.nextLevelGrowth * 100) + '%' }" />
          </view>
          <text class="lb-hint">还需 {{ (wallet.nextLevelGrowth - wallet.growthValue).toLocaleString() }} 成长值升级</text>
        </view>

        <view class="ac-stats">
          <view class="ac-stat">
            <text class="acs-label">累计充值</text>
            <text class="acs-val">{{ wallet.totalRecharge }}币</text>
          </view>
          <view class="ac-stat">
            <text class="acs-label">累计消费</text>
            <text class="acs-val">{{ wallet.totalSpent }}币</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 快捷操作 -->
    <view class="action-row">
      <view class="ar-btn recharge" @click="showRecharge = true">
        <text class="ar-icon">💳</text>
        <text>充值</text>
      </view>
      <view class="ar-btn" @click="goPage('/pages/wallet/transactions/index')">
        <text>交易明细 ›</text>
      </view>
    </view>

    <!-- 近期交易 -->
    <view class="section-card">
      <view class="sc-head">
        <text class="sc-title">近期交易</text>
        <text class="sc-more" @click="goPage('/pages/wallet/transactions/index')">全部记录 ›</text>
      </view>
      <view v-if="transactions.length === 0" class="empty-mini">
        <text class="em-icon">🪙</text>
        <text class="em-text">暂无交易记录</text>
      </view>
      <view v-else>
        <view v-for="t in transactions" :key="t.id" class="tx-item">
          <view class="tx-icon" :class="'tx-' + t.type">{{ txIcon(t.type) }}</view>
          <view class="tx-info">
            <text class="tx-title">{{ t.title }}</text>
            <text class="tx-time">{{ t.time }}</text>
          </view>
          <text class="tx-amount" :class="{ plus: t.amount > 0 }">{{ t.amount > 0 ? '+' : '' }}{{ t.amount }}币</text>
        </view>
      </view>
    </view>

    <!-- 充值说明 -->
    <view class="section-card">
      <text class="sc-title" style="margin-bottom: 16rpx;">充值说明</text>
      <view class="info-list">
        <text class="info-item"><text class="info-dot">•</text>1元人民币 = 10国学币</text>
        <text class="info-item"><text class="info-dot">•</text>国学币可用于购买课程、商品、加入圈子等</text>
        <text class="info-item"><text class="info-dot">•</text>充值后国学币不可提现，请按需充值</text>
        <text class="info-item"><text class="info-dot">•</text>大额充值享受额外赠送，详见充值页面</text>
      </view>
    </view>

    <!-- 充值弹窗 -->
    <view v-if="showRecharge" class="modal-mask" @click="closeRecharge">
      <view class="recharge-sheet" @click.stop>
        <view class="rs-head">
          <text class="rs-title">充值国学币</text>
          <text class="rs-close" @click="closeRecharge">✕</text>
        </view>
        <view class="rs-grid">
          <view
            v-for="(opt, i) in rechargeOptions"
            :key="i"
            class="rs-option"
            :class="{ sel: selectedOption === i }"
            @click="selectedOption = i"
          >
            <view v-if="opt.popular" class="rso-tag">推荐</view>
            <view class="rso-coins">
              <text class="rso-icon">🪙</text>
              <text class="rso-num">{{ opt.coins }}</text>
            </view>
            <text class="rso-price">¥{{ opt.price }}</text>
            <text v-if="opt.bonus > 0" class="rso-bonus">送{{ opt.bonus }}币</text>
          </view>
        </view>

        <view v-if="selectedOption !== null" class="rs-selected">
          <view class="rss-row">
            <text class="rss-label">充值金额</text>
            <text class="rss-val">¥{{ rechargeOptions[selectedOption].price }}</text>
          </view>
          <view class="rss-row">
            <text class="rss-label">获得国学币</text>
            <text class="rss-val gold">
              {{ rechargeOptions[selectedOption].coins + rechargeOptions[selectedOption].bonus }}币
              <text v-if="rechargeOptions[selectedOption].bonus > 0" class="rss-bonus-hint">(含赠送{{ rechargeOptions[selectedOption].bonus }})</text>
            </text>
          </view>
        </view>

        <view class="rs-pay-btn" :class="{ off: selectedOption === null || paying }" @click="handlePay">
          <text>{{ paying ? '创建订单中...' : selectedOption !== null ? `立即支付 ¥${rechargeOptions[selectedOption].price}` : '请选择充值金额' }}</text>
        </view>
        <text class="rs-agreement">支付即表示同意《充值服务协议》</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'

const wallet = reactive({
  balance: 520, rmb: 52.00, points: 1280, growthValue: 2850, level: 3, nextLevelGrowth: 5000,
  totalRecharge: 1280, totalSpent: 760,
})

const transactions = ref([
  { id: 1, type: 'recharge', title: '国学币充值', time: '2026-06-08 14:30', amount: 100 },
  { id: 2, type: 'spend', title: '购买八字入门课', time: '2026-06-07 10:15', amount: -199 },
  { id: 3, type: 'bonus', title: '签到奖励', time: '2026-06-07 08:00', amount: 5 },
  { id: 4, type: 'refund', title: '课程退款', time: '2026-06-05 16:20', amount: 99 },
  { id: 5, type: 'spend', title: '购买《渊海子平》', time: '2026-06-03 11:00', amount: -128 },
  { id: 6, type: 'income', title: '课程分销收益', time: '2026-06-01 09:00', amount: 50 },
])

const showRecharge = ref(false)
const selectedOption = ref<number | null>(null)
const paying = ref(false)

const rechargeOptions = [
  { coins: 60, price: 6, bonus: 0, popular: false },
  { coins: 300, price: 30, bonus: 15, popular: false },
  { coins: 680, price: 68, bonus: 40, popular: false },
  { coins: 1280, price: 128, bonus: 100, popular: true },
  { coins: 3280, price: 328, bonus: 300, popular: false },
  { coins: 6480, price: 648, bonus: 800, popular: false },
]

function txIcon(type: string) {
  const m: Record<string, string> = { recharge: '↗', spend: '↘', bonus: '🎁', refund: '↩', income: '↗', withdraw: '↘' }
  return m[type] || '•'
}

function closeRecharge() {
  showRecharge.value = false
  selectedOption.value = null
}

function handlePay() {
  if (selectedOption.value === null || paying.value) return
  paying.value = true
  setTimeout(() => {
    paying.value = false
    showRecharge.value = false
    selectedOption.value = null
    uni.showToast({ title: '充值成功！', icon: 'success' })
  }, 1500)
}

function goPage(url: string) { uni.navigateTo({ url }) }
</script>

<style scoped>
.wallet-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 80rpx; }
.header-sticky { position: sticky; top: 0; z-index: 30; background: rgba(250,248,245,0.95); backdrop-filter: blur(12rpx); border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; padding: 0 24rpx; height: 88rpx; }
.header-back { font-size: 48rpx; color: #333; width: 64rpx; }
.header-title { font-size: 34rpx; font-weight: 700; color: #2C2C2C; }

/* 资产卡片 */
.asset-card { margin: 16rpx 24rpx; background: linear-gradient(135deg, rgba(201,169,110,0.15), rgba(201,169,110,0.05), rgba(196,30,58,0.03)); border-radius: 24rpx; border: 1px solid rgba(201,169,110,0.2); overflow: hidden; position: relative; }
.ac-bg-icon { position: absolute; right: -30rpx; top: 20rpx; font-size: 200rpx; opacity: 0.05; }
.ac-content { position: relative; padding: 32rpx; }
.ac-label { font-size: 24rpx; color: #999; display: block; }
.ac-balance-row { display: flex; align-items: baseline; gap: 4rpx; margin-top: 8rpx; }
.ac-balance { font-size: 60rpx; font-weight: 700; color: #C9A96E; }
.ac-unit { font-size: 30rpx; color: rgba(201,169,110,0.7); }
.ac-rmb { font-size: 24rpx; color: #BBB; margin-top: 4rpx; display: block; }

.ac-extras { display: flex; align-items: center; justify-content: center; gap: 40rpx; margin: 24rpx 0; }
.ace-item { display: flex; align-items: center; gap: 8rpx; }
.ace-icon { font-size: 32rpx; }
.ace-label { font-size: 24rpx; color: #999; }
.ace-val { font-size: 26rpx; font-weight: 500; color: #333; }
.ace-divider { width: 2rpx; height: 28rpx; background: #DDD; }

.level-bar-section { margin-bottom: 24rpx; }
.lb-labels { display: flex; justify-content: space-between; }
.lb-label { font-size: 20rpx; color: #999; }
.lb-track { height: 8rpx; background: #EEE; border-radius: 4rpx; margin: 6rpx 0; overflow: hidden; }
.lb-fill { height: 100%; background: linear-gradient(90deg, #C9A96E, #C41E3A); border-radius: 4rpx; transition: width 0.5s; }
.lb-hint { font-size: 20rpx; color: #AAA; text-align: center; display: block; }

.ac-stats { display: flex; justify-content: center; gap: 60rpx; padding-top: 20rpx; border-top: 1px solid rgba(201,169,110,0.15); }
.ac-stat { text-align: center; }
.acs-label { font-size: 20rpx; color: #999; display: block; }
.acs-val { font-size: 26rpx; font-weight: 500; color: #333; margin-top: 4rpx; display: block; }

/* 操作按钮 */
.action-row { display: flex; gap: 16rpx; margin: 24rpx; }
.ar-btn { flex: 1; padding: 24rpx 0; border-radius: 16rpx; background: #fff; font-size: 28rpx; color: #333; text-align: center; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); display: flex; align-items: center; justify-content: center; gap: 8rpx; }
.ar-btn.recharge { background: #C41E3A; color: #fff; }

/* 交易记录 */
.section-card { margin: 0 24rpx 24rpx; background: #fff; border-radius: 16rpx; padding: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.sc-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.sc-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.sc-more { font-size: 24rpx; color: #C41E3A; }

.tx-item { display: flex; align-items: center; gap: 16rpx; padding: 16rpx 0; }
.tx-item + .tx-item { border-top: 1px solid #F5F1EB; }
.tx-icon { width: 72rpx; height: 72rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28rpx; flex-shrink: 0; }
.tx-recharge { background: rgba(82,196,26,0.08); color: #52C41A; }
.tx-spend { background: rgba(196,30,58,0.06); color: #C41E3A; }
.tx-bonus { background: rgba(201,169,110,0.1); color: #C9A96E; }
.tx-refund { background: rgba(22,119,255,0.08); color: #1677FF; }
.tx-income { background: rgba(82,196,26,0.08); color: #52C41A; }
.tx-withdraw { background: rgba(250,140,22,0.08); color: #FA8C16; }
.tx-info { flex: 1; min-width: 0; }
.tx-title { font-size: 26rpx; font-weight: 500; color: #333; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tx-time { font-size: 22rpx; color: #BBB; margin-top: 4rpx; display: block; }
.tx-amount { font-size: 28rpx; font-weight: 600; color: #C41E3A; white-space: nowrap; }
.tx-amount.plus { color: #52C41A; }

.empty-mini { display: flex; flex-direction: column; align-items: center; padding: 48rpx 0; }
.em-icon { font-size: 64rpx; opacity: 0.3; margin-bottom: 12rpx; }
.em-text { font-size: 26rpx; color: #CCC; }

.info-list { }
.info-item { font-size: 24rpx; color: #888; display: block; margin-bottom: 12rpx; line-height: 1.5; }
.info-dot { color: #C9A96E; margin-right: 8rpx; }

/* 充值弹窗 */
.modal-mask { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; }
.recharge-sheet { width: 100%; background: #fff; border-radius: 32rpx 32rpx 0 0; padding: 28rpx 32rpx 40rpx; max-height: 85vh; overflow-y: auto; }
.rs-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24rpx; }
.rs-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.rs-close { font-size: 36rpx; color: #999; padding: 8rpx; }
.rs-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12rpx; }
.rs-option { padding: 20rpx 8rpx; border-radius: 16rpx; border: 2rpx solid #F0EDE5; text-align: center; position: relative; }
.rs-option.sel { border-color: #C41E3A; background: rgba(196,30,58,0.02); }
.rso-tag { position: absolute; top: -4rpx; right: -6rpx; font-size: 18rpx; color: #fff; background: #C41E3A; padding: 2rpx 10rpx; border-radius: 12rpx; }
.rso-coins { display: flex; align-items: center; justify-content: center; gap: 4rpx; margin-bottom: 6rpx; }
.rso-icon { font-size: 28rpx; }
.rso-num { font-size: 28rpx; font-weight: 700; color: #333; }
.rso-price { font-size: 26rpx; color: #C41E3A; font-weight: 500; }
.rso-bonus { font-size: 20rpx; color: #C9A96E; margin-top: 4rpx; display: block; }

.rs-selected { margin-top: 20rpx; padding: 16rpx 20rpx; background: #F5F1EB; border-radius: 14rpx; }
.rss-row { display: flex; justify-content: space-between; align-items: center; padding: 8rpx 0; }
.rss-label { font-size: 24rpx; color: #999; }
.rss-val { font-size: 26rpx; font-weight: 500; color: #333; }
.rss-val.gold { color: #C9A96E; }
.rss-bonus-hint { font-size: 20rpx; color: #999; }

.rs-pay-btn { width: 100%; padding: 24rpx 0; border-radius: 48rpx; background: #C41E3A; color: #fff; font-size: 30rpx; font-weight: 500; text-align: center; margin-top: 24rpx; }
.rs-pay-btn.off { opacity: 0.5; }
.rs-agreement { font-size: 22rpx; color: #BBB; text-align: center; margin-top: 16rpx; display: block; }
</style>
