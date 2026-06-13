<template>
  <view class="wd-page">
    <!-- 成功状态 -->
    <template v-if="showSuccess">
      <view class="success-wrap">
        <text class="su-icon">✅</text>
        <text class="su-title">提现申请已提交</text>
        <text class="su-amount">提现金额：¥{{ numAmount.toFixed(2) }}</text>
        <text class="su-desc">预计1-3个工作日内到账，请注意查收</text>
        <view class="su-actions">
          <view class="su-btn sec" @click="goPage('/pages/earnings/index')">返回收益</view>
          <view class="su-btn pri" @click="goPage('/pages/index/index')">返回首页</view>
        </view>
      </view>
    </template>

    <template v-else>
      <view class="header-sticky">
        <view class="header-row">
          <text class="header-back" @click="uni.navigateBack()">‹</text>
          <text class="header-title">申请提现</text>
          <text class="header-action" @click="goPage('/pages/withdraw/records/index')">提现记录</text>
        </view>
      </view>

      <view class="wd-content">
        <!-- 余额 -->
        <view class="balance-card">
          <text class="bal-label">可提现余额</text>
          <text class="bal-amount">¥{{ availableBalance.toLocaleString() }}</text>
          <text class="bal-total">累计已提现 ¥12,580.00</text>
        </view>

        <!-- 金额输入 -->
        <view class="card">
          <view class="card-head">
            <text class="card-label">提现金额</text>
            <text class="card-all" @click="amount = availableBalance + ''">全部提现</text>
          </view>
          <view class="amount-input-row">
            <text class="ai-yuan">¥</text>
            <input v-model="amount" type="digit" class="ai-input" placeholder="请输入提现金额" />
          </view>
          <text class="ai-hint">最低提现金额 ¥{{ minAmount.toFixed(2) }}</text>
          <text v-if="numAmount > 0 && numAmount < minAmount" class="ai-error">提现金额不能低于 ¥{{ minAmount.toFixed(2) }}</text>
          <text v-if="numAmount > availableBalance" class="ai-error">提现金额不能超过可提现余额</text>
        </view>

        <!-- 提现方式 -->
        <view class="card">
          <text class="card-label">提现方式</text>
          <view v-for="m in withdrawMethods" :key="m.id" class="method-item" :class="{ sel: selectedMethod === m.id }" @click="selectedMethod = m.id">
            <text class="method-icon">{{ m.icon }}</text>
            <view class="method-info">
              <text class="method-name">{{ m.name }}</text>
              <text class="method-account">{{ m.bound ? m.account : '点击绑定' }}</text>
            </view>
            <text v-if="selectedMethod === m.id" class="method-check">✅</text>
          </view>
          <view class="method-manage" @click="goPage('/pages/settings/bind-accounts/index')">
            <text>💳 管理收款账户 ›</text>
          </view>
        </view>

        <!-- 费用明细 -->
        <view v-if="numAmount > 0" class="card">
          <text class="card-label">费用明细</text>
          <view class="fee-row">
            <text class="fee-label">提现金额</text>
            <text class="fee-val">¥{{ numAmount.toFixed(2) }}</text>
          </view>
          <view class="fee-row">
            <text class="fee-label">手续费（0.6%）<text class="fee-badge">平台补贴</text></text>
            <text class="fee-val line">-¥{{ serviceFee }}</text>
          </view>
          <view class="fee-row total">
            <text class="fee-label">实际到账</text>
            <text class="fee-val gold">¥{{ numAmount.toFixed(2) }}</text>
          </view>
        </view>

        <!-- 到账说明 -->
        <view class="info-box">
          <text class="info-title">🕐 到账时间说明：</text>
          <text class="info-item">微信零钱：预计T+1个工作日到账</text>
          <text class="info-item">支付宝：预计T+1个工作日到账</text>
          <text class="info-item">银行卡：预计T+1至T+3个工作日到账</text>
        </view>

        <!-- 提现须知 -->
        <view class="notice-box">
          <text class="notice-title">提现须知：</text>
          <text class="notice-item">1. 单笔提现限额：¥100 - ¥50,000</text>
          <text class="notice-item">2. 每日最多可提现3次</text>
          <text class="notice-item">3. 提现申请提交后，预计1-3个工作日内审核完成</text>
          <text class="notice-item">4. 如有疑问，请联系客服</text>
        </view>
      </view>

      <view class="bottom-bar">
        <view class="bb-btn" :class="{ off: !isValidAmount }" @click="handleSubmit">
          <text>{{ numAmount > 0 ? '确认提现 ¥' + numAmount.toFixed(2) : '请输入提现金额' }}</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const amount = ref('')
const selectedMethod = ref('wechat')
const showSuccess = ref(false)

const availableBalance = 3680.50
const minAmount = 100

const numAmount = computed(() => parseFloat(amount.value) || 0)
const isValidAmount = computed(() => numAmount.value >= minAmount && numAmount.value <= availableBalance)
const serviceFee = computed(() => numAmount.value > 0 ? Math.max(numAmount.value * 0.006, 0.1).toFixed(2) : '0.00')

const withdrawMethods = [
  { id: 'wechat', name: '微信零钱', icon: '💚', account: '微信用户_张三', bound: true },
  { id: 'alipay', name: '支付宝', icon: '💙', account: '138****8888', bound: true },
  { id: 'bank', name: '银行卡', icon: '💳', account: '工商银行 尾号8888', bound: true },
]

function handleSubmit() {
  if (isValidAmount.value) { showSuccess.value = true }
}

function goPage(url: string) { uni.navigateTo({ url }) }
</script>

<style scoped>
.wd-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 140rpx; }
.header-sticky { position: sticky; top: 0; z-index: 30; background: rgba(250,248,245,0.95); backdrop-filter: blur(12rpx); border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; padding: 0 24rpx; height: 88rpx; }
.header-back { font-size: 48rpx; color: #333; width: 64rpx; }
.header-title { font-size: 34rpx; font-weight: 700; color: #2C2C2C; flex: 1; }
.header-action { font-size: 24rpx; color: #C41E3A; }

.wd-content { padding: 16rpx 24rpx; }

.balance-card { background: linear-gradient(135deg, rgba(201,169,110,0.15), rgba(201,169,110,0.05)); border: 1px solid rgba(201,169,110,0.2); border-radius: 20rpx; padding: 28rpx; margin-bottom: 16rpx; }
.bal-label { font-size: 24rpx; color: #999; display: block; }
.bal-amount { font-size: 56rpx; font-weight: 700; color: #C9A96E; display: block; margin: 8rpx 0; }
.bal-total { font-size: 22rpx; color: #BBB; display: block; }

.card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.card-label { font-size: 26rpx; font-weight: 500; color: #333; }
.card-all { font-size: 24rpx; color: #C41E3A; }

.amount-input-row { display: flex; align-items: center; padding-bottom: 16rpx; border-bottom: 1px solid #F0EDE5; }
.ai-yuan { font-size: 40rpx; font-weight: 600; color: #333; margin-right: 8rpx; }
.ai-input { flex: 1; font-size: 40rpx; font-weight: 600; color: #333; }
.ai-hint { font-size: 20rpx; color: #BBB; margin-top: 10rpx; display: flex; align-items: center; gap: 4rpx; }
.ai-error { font-size: 20rpx; color: #FF4D4F; margin-top: 6rpx; }

.method-item { display: flex; align-items: center; gap: 14rpx; padding: 16rpx 14rpx; border-radius: 14rpx; border: 2rpx solid #F0EDE5; margin-bottom: 10rpx; }
.method-item.sel { border-color: #C41E3A; background: rgba(196,30,58,0.02); }
.method-icon { font-size: 40rpx; }
.method-info { flex: 1; }
.method-name { font-size: 26rpx; font-weight: 500; color: #333; display: block; }
.method-account { font-size: 22rpx; color: #999; margin-top: 2rpx; display: block; }
.method-check { font-size: 28rpx; }
.method-manage { text-align: center; padding: 10rpx 0; font-size: 24rpx; color: #C41E3A; }

.fee-row { display: flex; justify-content: space-between; padding: 10rpx 0; }
.fee-label { font-size: 24rpx; color: #666; }
.fee-badge { font-size: 16rpx; color: #C41E3A; background: rgba(196,30,58,0.06); padding: 2rpx 8rpx; border-radius: 6rpx; margin-left: 6rpx; }
.fee-val { font-size: 24rpx; color: #333; }
.fee-val.line { text-decoration: line-through; color: #BBB; }
.fee-val.gold { color: #C9A96E; font-weight: 600; font-size: 30rpx; }
.fee-row.total { border-top: 1px solid #F0EDE5; margin-top: 8rpx; padding-top: 14rpx; }

.info-box { padding: 18rpx 20rpx; background: rgba(201,169,110,0.06); border-radius: 14rpx; margin-bottom: 16rpx; }
.info-title { font-size: 22rpx; color: #666; display: block; margin-bottom: 6rpx; }
.info-item { font-size: 20rpx; color: #999; display: block; margin-bottom: 4rpx; padding-left: 14rpx; }

.notice-box { margin-bottom: 20rpx; }
.notice-title { font-size: 22rpx; color: #666; display: block; margin-bottom: 8rpx; }
.notice-item { font-size: 20rpx; color: #BBB; display: block; margin-bottom: 4rpx; }

.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; padding: 16rpx 24rpx 24rpx; background: rgba(255,255,255,0.95); backdrop-filter: blur(12rpx); border-top: 1px solid #E8E0D5; }
.bb-btn { width: 100%; height: 88rpx; border-radius: 20rpx; background: #C41E3A; color: #fff; font-size: 28rpx; font-weight: 500; display: flex; align-items: center; justify-content: center; }
.bb-btn.off { background: #DDD; color: #999; }

.success-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 80vh; padding: 48rpx; }
.su-icon { font-size: 96rpx; margin-bottom: 24rpx; }
.su-title { font-size: 36rpx; font-weight: 600; color: #2C2C2C; margin-bottom: 8rpx; }
.su-amount { font-size: 28rpx; color: #666; margin-bottom: 4rpx; }
.su-desc { font-size: 24rpx; color: #999; margin-bottom: 40rpx; }
.su-actions { display: flex; gap: 20rpx; }
.su-btn { padding: 18rpx 44rpx; border-radius: 16rpx; font-size: 26rpx; }
.su-btn.sec { background: #F5F1EB; color: #666; }
.su-btn.pri { background: #C41E3A; color: #fff; }
</style>
