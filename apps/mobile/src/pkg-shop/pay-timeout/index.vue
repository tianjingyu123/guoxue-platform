<template>
  <view class="pay-timeout">
    <!-- 顶部导航 -->
    <app-nav-bar title="支付结果" :back-size="44" :title-size="36" :title-weight="500" title-align="left" :bar-height="106" />

    <!-- 橙色渐变背景 -->
    <view class="hero">
      <view class="clock-wrap">
        <view class="clock-bg"><app-icon name="clock" :size="56" color="#FB923C" /></view>
        <view class="clock-ring" />
      </view>
      <text class="hero-title">{{ loading ? '正在核对支付结果' : '支付结果待确认' }}</text>
      <text class="hero-sub">{{ statusHint }}</text>
      <view v-if="!loading && !error" class="hero-amount">
        <text class="amt-label">订单金额</text>
        <text class="amt">¥{{ formatPrice(amount) }}</text>
      </view>
    </view>

    <!-- 内容区 -->
    <view class="content">
      <!-- 下一步 -->
      <view class="card">
        <view class="card-head">
          <app-icon name="alert-circle" :size="34" color="#FB923C" />
          <text class="card-title">下一步</text>
        </view>
        <text class="reason-text">若刚完成付款，请稍后重新核对订单；核对结果仍不一致时，可带订单编号联系客服。</text>
      </view>

      <!-- 订单信息 -->
      <view class="card">
        <text class="card-title block">订单信息</text>
        <view class="oi-row">
          <text class="oi-label">订单编号</text>
          <text class="oi-value mono">{{ orderId }}</text>
        </view>
        <view class="oi-row bordered">
          <text class="oi-label">订单状态</text>
          <text class="oi-value orange">{{ loading ? '核对中' : error ? '暂无法核对' : orderStatusLabel }}</text>
        </view>
      </view>

      <!-- 温馨提示 -->
      <view class="blue-tip">
        <view class="blue-dot"><text>!</text></view>
        <view class="blue-content">
          <text class="blue-title">温馨提示</text>
          <text class="blue-text">此页不代表退款已发起或到账。请以订单及支付渠道记录为准；如有疑问请<text class="blue-link" role="link" tabindex="0" @tap="goService" @keydown.enter="goService" @keydown.space.prevent="goService">联系客服</text>。</text>
        </view>
      </view>
    </view>

    <!-- 底部固定按钮 -->
    <view class="footer">
      <view class="btn primary" role="button" tabindex="0" aria-label="重新核对支付结果" @tap="loadOrder" @keydown.enter="loadOrder" @keydown.space.prevent="loadOrder">
        <app-icon name="refresh-cw" :size="34" color="#fff" />
        <text>重新核对</text>
      </view>
      <!-- 原「换个支付方式」按钮删除：仅微信一个收银渠道，与「重新支付」功能重复 -->
      <view class="btn-row">
        <view class="btn ghost" role="link" tabindex="0" aria-label="查看订单" @tap="goOrder" @keydown.enter="goOrder" @keydown.space.prevent="goOrder">
          <app-icon name="file-text" :size="30" color="#666666" />
          <text>查看订单</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { navigateTo, redirectTo, reLaunch } from '@/utils/router'
import { shopApi } from '@/lib/shop-data'
import { formatPrice } from '@/utils/format'

const orderId = ref('')
const amount = ref(0)
const orderStatus = ref('')
const loading = ref(true)
const error = ref('')
const orderStatusLabel = computed(() => ({ PENDING: '待支付', CANCELLED: '已取消', CLOSED: '已关闭', REFUNDING: '退款处理中', REFUNDED: '平台已退款' })[orderStatus.value] || '请到订单中心核对')
const statusHint = computed(() => loading.value ? '正在读取订单最新状态' : error.value || (orderStatus.value === 'PENDING' ? '订单仍待支付，请先核对是否已扣款' : '请查看订单了解最新状态'))
let checking = false

onLoad((q) => {
  orderId.value = String(q?.orderId || '').trim()
  loadOrder()
})

async function loadOrder() {
  if (checking) return
  error.value = ''
  if (!orderId.value) {
    loading.value = false
    error.value = '缺少订单编号，请从订单中心进入'
    return
  }
  checking = true
  loading.value = true
  try {
    const summary = await shopApi.getOrderSummary(orderId.value)
    if (summary.paid) {
      redirectTo(`/shop/pay-success?orderId=${encodeURIComponent(orderId.value)}`)
      return
    }
    amount.value = summary.amount
    orderStatus.value = summary.status
  } catch (e) {
    error.value = (e as Error)?.message || '暂时无法核对订单状态'
  } finally {
    loading.value = false
    checking = false
  }
}
// P1-5：结算页不认 orderId（原跳法=死路"没有可结算的商品"）；收银页 /shop/paying 认 orderId 且按环境走可用支付渠道
// 真别名是 /orders/:id（原来写的 /shop/orders/:id 没登记 → 支付超时后点「查看订单」没反应）
function goOrder() { reLaunch(orderId.value ? `/orders/${encodeURIComponent(orderId.value)}?paymentReturn=1` : '/orders') }
function goService() { navigateTo('/customer-service') }
</script>

<style lang="scss" scoped>
.pay-timeout { min-height: 100vh; background: #FAF8F5; padding-bottom: calc(320rpx + env(safe-area-inset-bottom)); }
.hero {
  background: linear-gradient(180deg, #FB923C 0%, #F97316 100%);
  padding: 64rpx 32rpx 160rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.clock-wrap { position: relative; width: 160rpx; height: 160rpx; margin-bottom: 48rpx; }
.clock-bg {
  width: 160rpx;
  height: 160rpx;
  background: #FFFFFF;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 32rpx rgba(0,0,0,0.12);
}
.clock-ring {
  position: absolute;
  inset: 0;
  border: 8rpx solid transparent;
  border-top-color: rgba(255,255,255,0.5);
  border-radius: 50%;
  animation: spin 2s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.hero-title { font-size: 44rpx; font-weight: bold; color: #FFFFFF; margin-bottom: 16rpx; }
.hero-sub { font-size: 26rpx; color: rgba(255,255,255,0.9); margin-bottom: 32rpx; }
.hero-amount { display: flex; align-items: baseline; gap: 16rpx; }
.amt-label { font-size: 26rpx; color: rgba(255,255,255,0.8); }
.amt { font-size: 60rpx; font-weight: bold; color: #FFFFFF; }
.content { padding: 0 32rpx; margin-top: -96rpx; display: flex; flex-direction: column; gap: 32rpx; }
.card { background: #FFFFFF; border-radius: 24rpx; padding: 32rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.card-head { display: flex; align-items: center; gap: 12rpx; margin-bottom: 28rpx; }
.card-title { font-size: 30rpx; font-weight: 500; color: #2C2C2C; }
.card-title.block { display: block; margin-bottom: 24rpx; }
.reasons { display: flex; flex-direction: column; gap: 20rpx; }
.reason-item { display: flex; align-items: flex-start; gap: 16rpx; padding: 20rpx; background: #FFF7ED; border-radius: 16rpx; }
.reason-icon { width: 56rpx; height: 56rpx; background: #FFEDD5; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.reason-text { font-size: 26rpx; color: #666666; line-height: 1.5; flex: 1; }
.oi-row { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 0; }
.oi-row.bordered { border-top: 1rpx solid #E8E3DB; }
.oi-label { font-size: 26rpx; color: #999999; }
.oi-value { font-size: 26rpx; color: #2C2C2C; }
.oi-value.orange { color: #F97316; font-weight: 500; }
.mono { font-family: monospace; }
.blue-tip { background: #EFF6FF; border: 1rpx solid #DBEAFE; border-radius: 20rpx; padding: 28rpx; display: flex; gap: 16rpx; }
.blue-dot { width: 36rpx; height: 36rpx; background: #3B82F6; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.blue-dot text { color: #FFFFFF; font-size: 24rpx; font-weight: bold; }
.blue-content { flex: 1; display: flex; flex-direction: column; gap: 8rpx; }
.blue-title { font-size: 26rpx; font-weight: 500; color: #1D4ED8; }
.blue-text { font-size: 24rpx; color: #1D4ED8; line-height: 1.6; }
.blue-link { font-size: 24rpx; color: #1D4ED8; font-weight: 600; text-decoration: underline; }
.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #FFFFFF;
  border-top: 1rpx solid #E8E3DB;
  padding: 24rpx 32rpx calc(24rpx + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.btn {
  height: 88rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  font-size: 28rpx;
  font-weight: 500;
  &.primary { background: linear-gradient(90deg, var(--brand), #E53935); color: #FFFFFF; }
  &.ghost { flex: 1; border: 1rpx solid #E8E3DB; color: #666666; }
}
.btn-row { display: flex; gap: 24rpx; }
</style>
